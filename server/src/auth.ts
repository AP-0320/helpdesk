import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [process.env.CLIENT_URL!],
  emailAndPassword: { enabled: true, disableSignUp: true },
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    window: 60,
    max: 10,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'AGENT',
        input: false,
      },
    },
  },
});
