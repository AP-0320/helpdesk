CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_tickets           INT,
  open_tickets            INT,
  ai_resolved_tickets     INT,
  ai_resolved_percent     FLOAT,
  avg_resolution_time_ms  FLOAT,
  tickets_per_day         JSONB
)
LANGUAGE sql
STABLE
AS $$
  WITH
    totals AS (
      SELECT
        COUNT(*)::int AS total_tickets,
        COUNT(*) FILTER (WHERE status IN ('NEW', 'OPEN', 'PROCESSING'))::int AS open_tickets,
        COUNT(*) FILTER (
          WHERE status = 'RESOLVED'
            AND EXISTS (
              SELECT 1 FROM reply r
              WHERE r."ticketId" = ticket.id
                AND r."userType" = 'AGENT'
                AND r."userId"   IS NULL
            )
        )::int AS ai_resolved_tickets,
        (EXTRACT(EPOCH FROM AVG("updatedAt" - "createdAt")
          FILTER (WHERE status = 'RESOLVED'))::float * 1000
        ) AS avg_resolution_time_ms
      FROM ticket
    ),
    daily AS (
      SELECT
        DATE_TRUNC('day', "createdAt")::date AS day,
        COUNT(*)::int                         AS cnt
      FROM ticket
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY 1
    ),
    series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      )::date AS day
    ),
    per_day AS (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date',  to_char(s.day, 'YYYY-MM-DD'),
          'count', COALESCE(d.cnt, 0)
        )
        ORDER BY s.day
      ) AS tickets_per_day
      FROM series s
      LEFT JOIN daily d ON d.day = s.day
    )
  SELECT
    t.total_tickets,
    t.open_tickets,
    t.ai_resolved_tickets,
    CASE
      WHEN t.total_tickets = 0 THEN 0::float
      ELSE ROUND(t.ai_resolved_tickets::numeric / t.total_tickets * 100, 1)::float
    END AS ai_resolved_percent,
    t.avg_resolution_time_ms,
    p.tickets_per_day
  FROM totals t, per_day p;
$$;
