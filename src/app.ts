import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './lib/trpc.js';
import { loadEnv } from './config/env.js';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createProductRouter } from './routes/product.routes.js';
import { createCartRouter } from './routes/cart.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createOrderRouter, createStripeWebhookRouter } from './routes/order.routes.js';

export function createApp() {
  loadEnv();

  const app = express();

  app.use(corsMiddleware());
  app.use(helmet());
  app.use((pinoHttp as any)({
    autoLogging: true,
    genReqId(req: any) {
      const hdr = req.headers?.['x-request-id'];
      return (typeof hdr === 'string' && hdr.trim().length > 0) ? hdr.trim() : randomUUID();
    },
  }));
  app.use((req, res, next) => {
    const id = (req as any).id ?? (req.headers['x-request-id'] as string | undefined);
    if (id) res.setHeader('x-request-id', String(id));
    next();
  });

  app.use('/api', createStripeWebhookRouter());

  app.use(express.json());
  app.use(cookieParser());

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Backend tRPC está rodando',
      trpcEndpoint: '/trpc',
      docs: 'Use um cliente tRPC (frontend) ou ferramentas como curl/Postman para chamar os procedimentos em /trpc',
    });
  });
  app.get('/healthz', (req, res) => res.send('ok'));

  app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

  app.use('/api', createAuthRouter());
  app.use('/api', createProductRouter());
  app.use('/api', createCartRouter());
  app.use('/api', createOrderRouter());
  app.use('/api', createAdminRouter());

  app.use(errorHandler);

  return app;
}
