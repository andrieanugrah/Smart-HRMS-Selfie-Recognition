import { Router } from 'express';
import attendanceRoutes from './attendance.routes';
import leaveRoutes from './leave.routes';
import overtimeRoutes from './overtime.routes';

const router = Router();

router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/overtime', overtimeRoutes);

export default router;
