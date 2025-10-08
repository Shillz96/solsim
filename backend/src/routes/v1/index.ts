import express from 'express';
import portfolioRoutes from './portfolio.js';
import marketRoutes from './market.js';
import tradesRoutes from './trades.js';
import monitoringRoutes from './monitoring.js';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import leaderboardRoutes from './leaderboard.js';
// import walletRoutes from './wallet.js'; // Temporarily disabled - needs refactoring

const router = express.Router();

// Mount consolidated v1 routes
router.use('/portfolio', portfolioRoutes);
router.use('/market', marketRoutes);
router.use('/trades', tradesRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/leaderboard', leaderboardRoutes);
// router.use('/wallet', walletRoutes); // Temporarily disabled - needs refactoring

// Alias /trending to /market/trending for backwards compatibility
router.use('/trending', marketRoutes);

export default router;