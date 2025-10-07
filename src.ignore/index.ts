import config from './config/env';
import { initDatabase } from './config/database';
import heliusService from './services/helius.service';
import balanceService from './services/balance.service';
import transactionParser from './services/transaction.parser';
import transactionModel from './models/transaction.model';
import positionModel from './models/position.model';
import costBasisCalculator from './calculators/cost-basis.calculator';
import pnlCalculator from './calculators/pnl.calculator';
import jupiterService from './services/jupiter.service';
import tokenMetadataService from './services/token-metadata.service';
import tradingEngineService from './services/trading-engine.service';
import tradingRuleModel from './models/trading-rule.model';
import tradeHistoryModel from './models/trade-history.model';
import balanceVerifierService from './services/balance-verifier.service';
import logger from './utils/logger';
import { formatUSD, formatPercent, formatNumber } from './utils/helpers';
import { table } from 'table';
import chalk from 'chalk';

async function initializeBot(): Promise<void> {
  logger.step(1, 'Fetching current wallet balances');
  const balances = await balanceService.getBalancesWithPrices(config.WALLET_ADDRESS);

  if (balances.length === 0) {
    logger.warning('No tokens found in wallet');
    return;
  }

  logger.step(2, 'Initializing positions with current balances');

  for (const balance of balances) {
    const position = {
      tokenMint: balance.mint,
      tokenSymbol: balance.symbol,
      totalAmount: balance.uiAmount,
      avgCostBasis: balance.priceSol || 0,
      totalInvestedSol: balance.valueSol
    };

    positionModel.upsert(position);

    // Display token name/symbol nicely
    const displayName = balance.name
      ? `${balance.symbol} (${balance.name})`
      : balance.symbol || balance.mint.slice(0, 8);

    const price = balance.priceSol ? `${balance.priceSol.toFixed(6)} SOL` : 'N/A';
    const value = `${balance.valueSol.toFixed(6)} SOL`;
    logger.success(`${displayName}: ${balance.uiAmount.toFixed(6)} @ ${price} = ${value}`);
  }

  const totalValue = balances.reduce((sum, b) => sum + b.valueSol, 0);
  logger.separator();
  logger.success(`Portfolio initialized with ${balances.length} token(s)`);
  logger.success(`Total Portfolio Value: ${totalValue.toFixed(6)} SOL`);
  logger.separator();
  logger.info('Bot is ready! Use "npm run sync" to update with recent trades');
}

async function syncRecentTransactions(): Promise<void> {
  logger.step(1, 'Fetching recent transactions (last 100)');
  const rawTransactions = await heliusService.getRecentTransactions(config.WALLET_ADDRESS, 100);

  if (rawTransactions.length === 0) {
    logger.info('No new transactions found');
    return;
  }

  logger.step(2, 'Parsing transactions');
  const parsedTransactions = transactionParser.parseTransactions(rawTransactions, config.WALLET_ADDRESS);

  if (parsedTransactions.length === 0) {
    logger.info('No swaps or transfers found');
    return;
  }

  logger.step(3, 'Enriching transactions with USD values');
  await enrichTransactionsWithPrices(parsedTransactions);

  logger.step(4, 'Storing transactions in database');
  transactionModel.insertMany(parsedTransactions);

  logger.step(5, 'Recalculating cost basis');
  const positions = await costBasisCalculator.calculateForAllTokens();

  logger.step(6, 'Updating positions');
  positionModel.upsertMany(positions);

  logger.step(7, 'Syncing SOL balance from wallet');
  // SOL is the base currency - sync it directly from wallet (not from tx history)
  // This avoids discrepancies from fees, rent, and operational costs
  const solBalance = await balanceService.getSOLBalance(config.WALLET_ADDRESS);
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  positionModel.upsert({
    tokenMint: SOL_MINT,
    tokenSymbol: 'SOL',
    totalAmount: solBalance,
    avgCostBasis: 1.0, // 1 SOL = 1 SOL
    totalInvestedSol: solBalance,
  });
  logger.success(`SOL position synced: ${solBalance.toFixed(6)} SOL`);

  logger.step(8, 'Verifying wallet balances');
  await balanceVerifierService.displayDiscrepancies();

  logger.success(`Sync complete! Processed ${parsedTransactions.length} transfers`);
}

async function enrichTransactionsWithPrices(transactions: any[]): Promise<void> {
  // Group transactions by signature to find swap pairs
  const txBySignature = new Map<string, any[]>();
  for (const tx of transactions) {
    if (!txBySignature.has(tx.signature)) {
      txBySignature.set(tx.signature, []);
    }
    txBySignature.get(tx.signature)!.push(tx);
  }

  // Fetch token metadata for all non-SOL tokens
  const uniqueMints = new Set<string>();
  for (const tx of transactions) {
    if (tx.tokenMint !== 'So11111111111111111111111111111111111111112' && !tx.tokenSymbol) {
      uniqueMints.add(tx.tokenMint);
    }
  }

  // Fetch metadata in parallel
  const metadataPromises = Array.from(uniqueMints).map(async (mint) => {
    const metadata = await tokenMetadataService.getMetadata(mint);
    return { mint, metadata };
  });

  const metadataResults = await Promise.all(metadataPromises);
  const metadataMap = new Map(metadataResults.map(r => [r.mint, r.metadata]));

  // Process each transaction - calculate values in SOL
  for (const tx of transactions) {
    // Add token symbol if we fetched metadata
    if (!tx.tokenSymbol && tx.tokenMint !== 'So11111111111111111111111111111111111111112') {
      const metadata = metadataMap.get(tx.tokenMint);
      if (metadata) {
        tx.tokenSymbol = metadata.symbol?.trim() || null;
      }
    }

    // For SOL transactions, value is just the amount (1 SOL = 1 SOL)
    if (tx.tokenMint === 'So11111111111111111111111111111111111111112') {
      tx.priceSol = 1.0;
      tx.valueSol = tx.amount;
    } else {
      // For token transactions, calculate from swap pair
      const txsInSwap = txBySignature.get(tx.signature) || [];
      const solTx = txsInSwap.find(t => t.tokenMint === 'So11111111111111111111111111111111111111112');

      if (solTx && solTx.type === 'SELL') {
        // This is a token BUY with SOL - use the SOL amount as value (fee separate)
        tx.valueSol = solTx.amount;
        tx.priceSol = solTx.amount / tx.amount;
      } else if (solTx && solTx.type === 'BUY') {
        // This is a token SELL for SOL - use the SOL amount as value (fee separate)
        tx.valueSol = solTx.amount;
        tx.priceSol = solTx.amount / tx.amount;
      }
    }
  }
}

async function showPnL(): Promise<void> {
  logger.step(1, 'Loading positions from database');
  const positions = positionModel.getAll();

  if (positions.length === 0) {
    logger.warning('No positions found. Run "npm run sync" first.');
    return;
  }

  logger.step(2, 'Fetching current prices (fresh data)');
  const pnlResults = await pnlCalculator.calculatePortfolioPnL(true);

  // Filter out SOL from PnL display (SOL is base currency)
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const tradingTokens = pnlResults.filter(pnl => pnl.tokenMint !== SOL_MINT);

  if (tradingTokens.length === 0) {
    logger.info('No trading positions found (only SOL)');
    return;
  }

  logger.step(3, 'Calculating portfolio totals');
  const totals = pnlCalculator.calculateTotalPortfolioPnL(tradingTokens);

  logger.separator();
  console.log(chalk.bold.cyan('\n📊 TRADING PnL (SOL-based)\n'));

  const tableData = [
    ['Token', 'Amount', 'Avg Cost', 'Invested', 'Current Price', 'Current Value', 'PnL', 'PnL %'],
    ...tradingTokens.map(pnl => [
      pnl.tokenSymbol || (pnl.tokenMint ? pnl.tokenMint.slice(0, 8) + '...' : 'Unknown'),
      formatNumber(pnl.totalAmount, 4),
      `${pnl.avgCostBasis.toFixed(8)} SOL`,
      `${pnl.totalInvestedSol.toFixed(6)} SOL`,
      pnl.currentPriceSol ? `${pnl.currentPriceSol.toFixed(8)} SOL` : 'N/A',
      `${pnl.currentValueSol.toFixed(6)} SOL`,
      chalk[pnl.unrealizedPnL >= 0 ? 'green' : 'red'](`${pnl.unrealizedPnL >= 0 ? '+' : ''}${pnl.unrealizedPnL.toFixed(6)} SOL`),
      chalk[pnl.unrealizedPnLPercent >= 0 ? 'green' : 'red'](formatPercent(pnl.unrealizedPnLPercent)),
    ]),
  ];

  console.log(table(tableData));

  console.log(chalk.bold.white('\n💰 TOTAL TRADING PnL:'));
  console.log(`   Total Invested:  ${chalk.cyan(`${totals.totalInvested.toFixed(6)} SOL`)}`);
  console.log(`   Current Value:   ${chalk.cyan(`${totals.totalValue.toFixed(6)} SOL`)}`);
  console.log(`   Trading PnL:     ${chalk[totals.totalPnL >= 0 ? 'green' : 'red'](`${totals.totalPnL >= 0 ? '+' : ''}${totals.totalPnL.toFixed(6)} SOL`)} (${chalk[totals.totalPnLPercent >= 0 ? 'green' : 'red'](formatPercent(totals.totalPnLPercent))})`);
  logger.separator();
}

async function watchMode(): Promise<void> {
  logger.info('Starting real-time monitoring...');
  logger.info('Checking for new transactions every 10 seconds');
  logger.info('Press Ctrl+C to stop\n');

  let lastCheck = Date.now();

  while (true) {
    try {
      await syncRecentTransactions();
      await showPnL();

      logger.separator();
      logger.debug(`Waiting 10 seconds... (Last check: ${new Date(lastCheck).toLocaleTimeString()})`);

      await new Promise(resolve => setTimeout(resolve, 10000));
      lastCheck = Date.now();
    } catch (error: any) {
      logger.error(`Error in watch mode: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

async function startTrading(options?: { dryRun?: boolean }): Promise<void> {
  console.log(chalk.cyan('ℹ Initializing trading engine...'));

  // Initial sync before starting
  console.log(chalk.cyan('ℹ Syncing wallet positions...'));
  await syncRecentTransactions();
  console.log(chalk.green('✅ Initial sync complete\n'));

  // Sync state tracking (for debouncing)
  let lastSyncTime = Date.now();
  let isSyncing = false;
  const MIN_SYNC_INTERVAL = 30000; // 30 seconds minimum between syncs

  // Debounced sync function
  const debouncedSync = async () => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;

    // Skip if already syncing or too soon
    if (isSyncing) {
      console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`) + chalk.yellow(' [Auto-Sync] Skipping - sync already in progress'));
      return;
    }

    if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
      console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`) + chalk.yellow(` [Auto-Sync] Skipping - too soon (${Math.round((MIN_SYNC_INTERVAL - timeSinceLastSync) / 1000)}s left)`));
      return;
    }

    try {
      isSyncing = true;
      console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`) + chalk.cyan(' [Auto-Sync] Checking for new transactions...'));
      await syncRecentTransactions();
      lastSyncTime = Date.now();
    } catch (error: any) {
      console.log(chalk.red(`[Auto-Sync] Error: ${error.message}`));
    } finally {
      isSyncing = false;
    }
  };

  // Start background sync loop (every 30 seconds)
  const syncInterval = setInterval(debouncedSync, 30000);

  // Cleanup on exit
  process.on('SIGINT', () => {
    clearInterval(syncInterval);
    process.exit(0);
  });

  // Start trading engine
  await tradingEngineService.start({
    dryRun: options?.dryRun,
    onTradeExecuted: debouncedSync, // Use debounced sync after trades
  });
}

async function showTradingStatus(): Promise<void> {
  logger.separator();
  console.log(chalk.bold.cyan('\n📊 AUTO-TRADING STATUS\n'));

  const stats = tradingEngineService.getStats();
  const rules = tradingRuleModel.getAll();

  // Get wallet balance and total PnL
  const solBalance = await balanceService.getSOLBalance(config.WALLET_ADDRESS);
  const pnlStats = tradeHistoryModel.getTotalPnL();

  console.log(chalk.white('Wallet:'));
  console.log(`   Balance: ${chalk.cyan(`${solBalance.toFixed(6)} SOL`)}`);

  if (pnlStats.totalTrades > 0) {
    const pnlColor = pnlStats.totalPnlSol >= 0 ? 'green' : 'red';
    const pnlSign = pnlStats.totalPnlSol >= 0 ? '+' : '';
    console.log(`   Total PnL: ${chalk[pnlColor](`${pnlSign}${pnlStats.totalPnlSol.toFixed(6)} SOL`)} ${chalk.gray(`(${pnlStats.wins}W/${pnlStats.losses}L)`)}`);
  }
  console.log('');

  console.log(chalk.white('Engine Status:'));
  console.log(`   Running: ${stats.running ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`   Active Rules: ${chalk.cyan(stats.activeRules.toString())}`);
  console.log(`   Trades (Last Hour): ${chalk.cyan(stats.tradesLastHour.toString())}`);
  console.log(`   Total Trades: ${chalk.cyan(stats.totalTrades.toString())}\n`);

  if (rules.length > 0) {
    console.log(chalk.white('Active Trading Rules:\n'));

    const tableData = [
      ['Token', 'Strategy', 'Take Profit', 'Stop Loss', 'Sell %', 'Status'],
      ...rules.map(rule => [
        rule.tokenSymbol || rule.tokenMint.slice(0, 8),
        rule.strategy,
        chalk.green(`+${rule.takeProfit}%`),
        chalk.red(`${rule.stopLoss}%`),
        `${rule.sellPercentage}%`,
        rule.enabled ? chalk.green('✓') : chalk.gray('✗'),
      ]),
    ];

    console.log(table(tableData));
  } else {
    console.log(chalk.yellow('No trading rules configured\n'));
  }

  // Show recent trades
  const recentTrades = tradeHistoryModel.getRecent(5);
  if (recentTrades.length > 0) {
    console.log(chalk.white('Recent Trades:\n'));

    const tradesTableData = [
      ['Date', 'Token', 'Trigger', 'PnL %', 'PnL SOL', 'Mode'],
      ...recentTrades.map(trade => [
        new Date(trade.executedAt!).toLocaleString(),
        trade.tokenSymbol || trade.tokenMint.slice(0, 8),
        trade.triggerType,
        chalk[trade.pnlPercent >= 0 ? 'green' : 'red'](`${trade.pnlPercent.toFixed(2)}%`),
        chalk[trade.pnlSol >= 0 ? 'green' : 'red'](`${trade.pnlSol.toFixed(6)} SOL`),
        trade.dryRun ? chalk.yellow('DRY') : chalk.green('LIVE'),
      ]),
    ];

    console.log(table(tradesTableData));
  }

  logger.separator();
}

async function main(): Promise<void> {
  try {
    console.log(chalk.bold.magenta('\n🚀 Jupiter-Style PnL Tracker\n'));

    initDatabase();

    const command = process.argv[2] || 'help';

    switch (command) {
      case 'init':
        await initializeBot();
        break;

      case 'sync':
        await syncRecentTransactions();
        break;

      case 'pnl':
        await showPnL();
        break;

      case 'watch':
        await watchMode();
        break;

      case 'trade':
        await startTrading();
        break;

      case 'trade:dry':
        await startTrading({ dryRun: true });
        break;

      case 'trade:status':
        await showTradingStatus();
        break;

      case 'help':
      default:
        console.log(chalk.cyan('\n📊 Available commands:\n'));
        console.log(chalk.white('  npm run init         ') + chalk.gray('- Initialize bot with current wallet balance'));
        console.log(chalk.white('  npm run sync         ') + chalk.gray('- Sync recent transactions (last 100)'));
        console.log(chalk.white('  npm run pnl          ') + chalk.gray('- Show current PnL'));
        console.log(chalk.white('  npm run watch        ') + chalk.gray('- Real-time monitoring (24/7 mode)'));
        console.log(chalk.cyan('\n🤖 Auto-Trading commands:\n'));
        console.log(chalk.white('  npm run trade        ') + chalk.gray('- Start auto-trading (from config)'));
        console.log(chalk.white('  npm run trade:dry    ') + chalk.gray('- Start auto-trading (dry-run mode)'));
        console.log(chalk.white('  npm run trade:status ') + chalk.gray('- Show trading status & rules'));
        console.log(chalk.cyan('\n💡 Quick start:'));
        console.log(chalk.gray('  1. npm run init        - Start fresh with current balance'));
        console.log(chalk.gray('  2. npm run watch       - Monitor for new trades'));
        console.log(chalk.gray('  3. npm run trade:dry   - Test auto-trading (no real trades)\n'));
        break;
    }
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
