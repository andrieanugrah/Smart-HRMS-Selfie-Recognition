import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  res.json({ data: [] });
});

router.post('/', async (req: Request, res: Response) => {
  res.json({ message: 'overtime created', data: req.body });
});

router.patch('/:id/approve', async (req: Request, res: Response) => {
  res.json({ message: 'approved', id: req.params.id });
});

router.patch('/:id/reject', async (req: Request, res: Response) => {
  res.json({ message: 'rejected', id: req.params.id, reason: req.body.reason });
});

export default router;
