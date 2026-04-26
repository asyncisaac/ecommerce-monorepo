declare global {
  namespace Express {
    interface Request {
      trpc?: {
        ctx: Awaited<ReturnType<typeof import('../lib/trpc.js').createContext>>;
        caller: ReturnType<typeof import('../routers/index.js').appRouter.createCaller>;
      };
    }
  }
}

export {};
