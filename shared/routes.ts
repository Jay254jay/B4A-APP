import { z } from 'zod';
import { insertUserSchema, insertTransactionSchema, users, transactions, shifts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/users/login',
      input: z.object({ username: z.string(), pin: z.string().optional() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    suspend: {
      method: 'POST' as const,
      path: '/api/users/:id/suspend',
      input: z.object({ byAdminId: z.number() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        403: z.object({ message: z.string() }),
      },
    },
    recall: {
      method: 'POST' as const,
      path: '/api/users/:id/recall',
      input: z.object({ byAdminId: z.number() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        403: z.object({ message: z.string() }),
      },
    },
  },
  shifts: {
    clockIn: {
      method: 'POST' as const,
      path: '/api/shifts/clock-in',
      input: z.object({ userId: z.number() }),
      responses: {
        200: z.custom<typeof shifts.$inferSelect>(),
        201: z.custom<typeof shifts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    active: {
      method: 'GET' as const,
      path: '/api/shifts/active/:userId',
      responses: {
        200: z.custom<typeof shifts.$inferSelect>().nullable(),
      },
    },
    clockOut: {
      method: 'POST' as const,
      path: '/api/shifts/clock-out',
      input: z.object({ shiftId: z.number(), byUserId: z.number() }),
      responses: {
        200: z.custom<typeof shifts.$inferSelect>(),
        403: errorSchemas.notFound, 
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/shifts',
      responses: {
        200: z.array(z.custom<typeof shifts.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/shifts/:id',
      input: z.object({ clockIn: z.string().optional(), clockOut: z.string().optional() }), // Receive as strings, parse to Date
      responses: {
        200: z.custom<typeof shifts.$inferSelect>(),
      },
    },
  },
  transactions: {
    create: {
      method: 'POST' as const,
      path: '/api/transactions',
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect & { user?: typeof users.$inferSelect }>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id',
      input: insertTransactionSchema.partial(),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id',
      responses: {
        200: z.object({ deleted: z.boolean(), id: z.number() }),
        403: errorSchemas.notFound,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/transactions/stats',
      responses: {
        200: z.object({
          totalCash: z.number(),
          totalMpesa: z.number(),
          totalWithdrawal: z.number(),
          liquidCash: z.number(),
        }),
      },
    },
    leaderboard: {
      method: 'GET' as const,
      path: '/api/transactions/leaderboard',
      responses: {
        200: z.array(z.object({
          userId: z.number(),
          name: z.string(),
          totalMpesa: z.number(),
        })),
      },
    },
  },
  clientsServed: {
    list: {
      method: 'GET' as const,
      path: '/api/clients-served',
      responses: {
        200: z.array(z.object({
          createdAt: z.number(), // timestamp
          clientName: z.string().nullable(),
          servedBy: z.string(),
          groomedBy: z.string(),
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LoginRequest = z.infer<typeof api.users.login.input>;
export type CreateTransactionRequest = z.infer<typeof api.transactions.create.input>;
export type StatsResponse = z.infer<typeof api.transactions.stats.responses[200]>;
export type LeaderboardResponse = z.infer<typeof api.transactions.leaderboard.responses[200]>;
