import type { Request, Response } from 'express';
import { appRouter } from '../routers/index.js';
import { createContext } from './trpc.js';

type CallerContext = Awaited<ReturnType<typeof createContext>>;
type Caller = ReturnType<(typeof appRouter)['createCaller']>;

export async function getCaller(req: Request, res: Response): Promise<{ ctx: CallerContext; caller: Caller }> {
  const ctx = await createContext({ req, res } as any);
  return {
    ctx,
    caller: appRouter.createCaller(ctx),
  };
}
