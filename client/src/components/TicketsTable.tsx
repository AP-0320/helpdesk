import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus, TicketCategory } from "@helpdesk/core";
import { STATUS_VARIANT, CATEGORY_LABEL } from "@/lib/ticket-display";

export interface Ticket {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
}

interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "ellipsis")[] = [1];
  if (current > 3) items.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    items.push(i);
  }
  if (current < total - 2) items.push("ellipsis");
  items.push(total);
  return items;
}

const STATUS_OPTIONS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: TicketStatus.OPEN },
  { label: "Resolved", value: TicketStatus.RESOLVED },
  { label: "Closed", value: TicketStatus.CLOSED },
];

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium max-w-xs truncate block hover:underline"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    accessorKey: "fromName",
    header: "From",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{row.original.fromName}</span>
        <span className="text-xs text-muted-foreground">{row.original.fromEmail}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<TicketStatus>();
      return (
        <Badge variant={STATUS_VARIANT[status]}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) =>
      row.original.category ? (
        <Badge variant="secondary">{CATEGORY_LABEL[row.original.category]}</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "createdAt",
    header: "Received",
    cell: ({ getValue }) =>
      new Date(getValue<string>()).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
];

export default function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [category, setCategory] = useState<TicketCategory | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useQuery<TicketsResponse>({
    queryKey: ["tickets", { sortBy, sortOrder, status, category, search, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        sortBy,
        sortOrder,
        page,
        pageSize: PAGE_SIZE,
      };
      if (status) params.status = status;
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await axios.get<TicketsResponse>("/api/tickets", {
        params,
        withCredentials: true,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const tickets = response?.tickets ?? [];
  const total = response?.total ?? 0;
  const pageCount = response?.pageCount ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  if (error) {
    return (
      <p className="px-4 py-10 text-center text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map(({ label, value }) => (
            <Button
              key={value}
              size="sm"
              variant={status === (value === "all" ? undefined : value) ? "secondary" : "ghost"}
              onClick={() => {
                setStatus(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <Select
          value={category ?? "all"}
          onValueChange={(v) => {
            setCategory(v === "all" ? undefined : (v as TicketCategory));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value={TicketCategory.GENERAL_QUESTION}>General Question</SelectItem>
            <SelectItem value={TicketCategory.TECHNICAL_ISSUE}>Technical Issue</SelectItem>
            <SelectItem value={TicketCategory.REFUND_REQUEST}>Refund Request</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search tickets…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className={isFetching && !isLoading ? "opacity-60 transition-opacity duration-150" : "transition-opacity duration-150"}>
        <Table>
          <TableHeader>
            <TableRow>
              {table.getFlatHeaders().map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : "none"
                  }
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && (
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {header.column.getIsSorted() === "desc" && (
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {!header.column.getIsSorted() && (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-3.5 w-48" /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No tickets yet.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage((p) => p - 1); }}
                    aria-disabled={page === 1}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {getPageRange(page, pageCount).map((item, i) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        isActive={page === item}
                        onClick={(e) => { e.preventDefault(); setPage(item); }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => { e.preventDefault(); if (page < pageCount) setPage((p) => p + 1); }}
                    aria-disabled={page >= pageCount}
                    className={page >= pageCount ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
