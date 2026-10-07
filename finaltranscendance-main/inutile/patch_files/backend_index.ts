import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import apiRouter from './routes/index.js';
import { initWebSocket } from './ws.js';

const app = express();
const prisma = new PrismaClient();

const port = Number(process.env.PORT ?? 3001);

// https://localhost is the app behind the nginx reverse proxy (HTTPS).
// localhost:5173 is kept for local dev without Docker (npm run dev).
const allowedOrigins = [
  'https://localhost',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serves uploaded files (avatars).
app.use('/uploads', express.static('uploads'));

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
