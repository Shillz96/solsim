import db from '../config/database';
import logger from '../utils/logger';

export interface TradeHistory {
  id?: number;
  tokenMint: string;
  tokenSymbol: string | null;
  strategy: string;
  triggerType: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL';
  pnlPercent: number;
  pnlSol: number;
  amountSold: number;
  solReceived: number;
  signature: string | null;
  dryRun: boolean;
  executedAt?: string;
}

class TradeHistoryModel {
  constructor() {
    this.initTable();
  }

  private initTable(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trade_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_mint TEXT NOT NULL,
        token_symbol TEXT,
        strategy TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        pnl_percent REAL,
        pnl_sol REAL,
        amount_sold REAL NOT NULL,
        sol_received REAL NOT NULL,
        signature TEXT,
        dry_run INTEGER NOT NULL DEFAULT 0,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  insert(trade: TradeHistory): void {
    const stmt = db.prepare(`
      INSERT INTO trade_history (
        token_mint, token_symbol, strategy, trigger_type,
        pnl_percent, pnl_sol, amount_sold, sol_received,
        signature, dry_run
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trade.tokenMint,
      trade.tokenSymbol,
      trade.strategy,
      trade.triggerType,
      trade.pnlPercent,
      trade.pnlSol,
      trade.amountSold,
      trade.solReceived,
      trade.signature,
      trade.dryRun ? 1 : 0
    );
  }

  getRecent(limit: number = 10): TradeHistory[] {
    const stmt = db.prepare(`
      SELECT * FROM trade_history
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.mapRow(row));
  }

  getByToken(tokenMint: string): TradeHistory[] {
    const stmt = db.prepare(`
      SELECT * FROM trade_history
      WHERE token_mint = ?
      ORDER BY executed_at DESC
    `);
    const rows = stmt.all(tokenMint) as any[];
    return rows.map(row => this.mapRow(row));
  }

  getCount(since?: Date): number {
    let query = 'SELECT COUNT(*) as count FROM trade_history';
    if (since) {
      const timestamp = Math.floor(since.getTime() / 1000);
      query += ` WHERE executed_at >= datetime(${timestamp}, 'unixepoch')`;
    }
    const result = db.prepare(query).get() as { count: number };
    return result.count;
  }

  getTotalPnL(): { totalPnlSol: number; totalTrades: number; wins: number; losses: number } {
    const result = db.prepare(`
      SELECT
        COALESCE(SUM(pnl_sol), 0) as total_pnl,
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl_sol > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN pnl_sol < 0 THEN 1 ELSE 0 END) as losses
      FROM trade_history
      WHERE dry_run = 0
    `).get() as any;

    return {
      totalPnlSol: result.total_pnl || 0,
      totalTrades: result.total_trades || 0,
      wins: result.wins || 0,
      losses: result.losses || 0,
    };
  }

  deleteAll(): void {
    db.prepare('DELETE FROM trade_history').run();
    logger.info('Cleared all trade history');
  }

  private mapRow(row: any): TradeHistory {
    return {
      id: row.id,
      tokenMint: row.token_mint,
      tokenSymbol: row.token_symbol,
      strategy: row.strategy,
      triggerType: row.trigger_type,
      pnlPercent: row.pnl_percent,
      pnlSol: row.pnl_sol,
      amountSold: row.amount_sold,
      solReceived: row.sol_received,
      signature: row.signature,
      dryRun: row.dry_run === 1,
      executedAt: row.executed_at,
    };
  }
}

export default new TradeHistoryModel();
