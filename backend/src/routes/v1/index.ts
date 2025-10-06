import express from 'express';
import portfolioRoutes from './portfolio.js';
import marketRoutes from './market.js';
import tradesRoutes from './trades.js';
import monitoringRoutes from './monitoring.js';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import leaderboardRoutes from './leaderboard.js';

const router = express.Router();

// Mount consolidated v1 routes
router.use('/portfolio', portfolioRoutes);
router.use('/market', marketRoutes);
router.use('/trades', tradesRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;