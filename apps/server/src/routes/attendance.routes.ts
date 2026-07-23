import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/v1/attendance — list
router.get('/', async (_req: Request, res: Response) => {
  res.json({ data: [], message: 'not implemented' });
});

// POST /api/v1/attendance — check in
router.post('/', async (req: Request, res: Response) => {
  res.json({ message: 'check-in ok', data: req.body });
});

// POST /api/v1/attendance/check-out
router.post('/check-out', async (req: Request, res: Response) => {
  res.json({ message: 'check-out ok' });
});

export default router;
