import 'dotenv/config';
// Must be imported before routes: forwards rejected promises of async route
// handlers to the error middleware instead of crashing the Node process.
import 'express-async-errors';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { prisma } from './lib/prisma.js';
import apiRouter from './routes/index.js';
import { initWebSocket } from './ws.js';
import { ensureSuperAdmin } from './seed.js';

const app = express();

const port = Number(process.env.PORT ?? 3001);

// FRONTEND_URL is the public URL behind the nginx reverse proxy (HTTPS).
// localhost:5173 is kept for local dev without Docker (npm run dev).
const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, 'https://localhost', 'http://localhost:5173'].filter(
    (o): o is string => !!o
  )
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100kb' }));

// Serves uploaded files (avatars). nosniff prevents the browser from
// interpreting an uploaded file as HTML/JS.
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  },
}));

app.get('/health', async (_req, res) => {
  let databaseStatus = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'up';
  } catch {
    databaseStatus = 'down';
  }

  res.json({
    ok: true,
    service: 'fibre-backend',
    database: databaseStatus,
  });
});

app.get('/api/version', (_req, res) => {
  res.json({
    ok: true,
    name: 'fibre-backend',
    version: '0.1.0',
  });
});

app.use('/api', apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler: every error ends as a JSON response, never a crash.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'JSON invalide' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Données invalides' });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Ressource introuvable' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Conflit : ressource déjà existante' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Référence invalide' });
  }
  if (err instanceof Error && err.message.startsWith('Unsupported format')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Erreur interne du serveur' });
});

ensureSuperAdmin().catch((error) => {
  console.error('Super admin seed failed:', error);
});

const server = app.listen(port, () => {
  console.log(`fibre-backend listening on http://localhost:${port}`);
});

initWebSocket(server);

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
