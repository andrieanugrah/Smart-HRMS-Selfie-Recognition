import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Internal emit endpoint (used by Next.js Server Actions)
app.post('/emit/:namespace', (req, res) => {
  const internalSecret = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_SOCKET_SECRET || 'smart-hrms-internal-secret';
  if (internalSecret !== expectedSecret) {
    return res.status(401).json({ error: 'unauthorized: invalid internal secret' });
  }

  const { namespace } = req.params;
  const { target, event, payload } = req.body ?? {};

  if (namespace !== 'hrd' && namespace !== 'user') {
    return res.status(400).json({ error: 'invalid namespace' });
  }
  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'invalid event' });
  }

  const nsp = io.of(`/${namespace}`);
  if (namespace === 'user') {
    if (!target) return res.status(400).json({ error: 'target required for /user namespace' });
    nsp.to(`user:${target}`).emit(event, payload);
  } else {
    nsp.emit(event, payload);
  }
  return res.json({ ok: true });
});

// API v1 routes
app.use('/api/v1', routes);

// Socket.io namespaces
const hrdNamespace = io.of('/hrd');
const userNamespace = io.of('/user');

hrdNamespace.on('connection', (socket) => {
  console.log(`[socket] HRD connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[socket] HRD disconnected: ${socket.id}`));
});

userNamespace.on('connection', (socket) => {
  const queryUserId = socket.handshake.query.userId as string | undefined;
  console.log(`[socket] User connected: ${socket.id} (query user: ${queryUserId ?? 'none'})`);

  socket.on('join', (userId: string) => {
    if (queryUserId && queryUserId !== userId) {
      console.warn(`[socket] Unauthorized room join attempt: socket ${socket.id} (auth: ${queryUserId}) tried joining user:${userId}`);
      return;
    }
    socket.join(`user:${userId}`);
    console.log(`[socket] User ${userId} joined room`);
  });
  socket.on('disconnect', () => console.log(`[socket] User disconnected: ${socket.id}`));
});

httpServer.listen(env.port, () => {
  console.log(`[server] Smart HRMS running on port ${env.port}`);
  console.log(`[server] CORS origin: ${env.corsOrigin}`);
});
