import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import interventionsRouter from './interventions.js';
import organizationsRouter from './organizations.js';
import messagesRouter from './messages.js';
import friendsRouter from './friends.js';
import notificationsRouter from './notifications.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/interventions', interventionsRouter);
router.use('/organizations', organizationsRouter);
router.use('/messages', messagesRouter);
router.use('/friends', friendsRouter);
router.use('/notifications', notificationsRouter);

export default router;
