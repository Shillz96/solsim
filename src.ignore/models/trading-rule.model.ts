import db from '../config/database';
import logger from '../utils/logger';

export interface TradingRule {
  id?: number;
  tokenMint: string;
  tokenSymbol: string | null;
  strategy: 'TP_SL';  // Später: 'DCA', 'GRID', etc.
  takeProfit: number;
  stopLoss: number;
  sellPercentage: number;
  enabled: boolean;
  createdAt?: string;
}

class TradingRuleModel {
  constructor() {
    this.initTable();
  }

  private initTable(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trading_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_mint TEXT NOT NULL,
        token_symbol TEXT,
        strategy TEXT NOT NULL,
        take_profit REAL NOT NULL,
        stop_loss REAL NOT NULL,
        sell_percentage REAL NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(token_mint, strategy)
      )
    `);
  }

  upsert(rule: TradingRule): void {
    const stmt = db.prepare(`
      INSERT INTO trading_rules (
        token_mint, token_symbol, strategy, take_profit, stop_loss, sell_percentage, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(token_mint, strategy) DO UPDATE SET
        token_symbol = excluded.token_symbol,
        take_profit = excluded.take_profit,
        stop_loss = excluded.stop_loss,
        sell_percentage = excluded.sell_percentage,
        enabled = excluded.enabled
    `);

    stmt.run(
      rule.tokenMint,
      rule.tokenSymbol,
      rule.strategy,
      rule.takeProfit,
      rule.stopLoss,
      rule.sellPercentage,
      rule.enabled ? 1 : 0
    );
  }

  getByToken(tokenMint: string, strategy: string = 'TP_SL'): TradingRule | null {
    const stmt = db.prepare(`
      SELECT * FROM trading_rules
      WHERE token_mint = ? AND strategy = ? AND enabled = 1
    `);
    const row = stmt.get(tokenMint, strategy) as any;
    return row ? this.mapRow(row) : null;
  }

  getAll(strategy?: string): TradingRule[] {
    let query = 'SELECT * FROM trading_rules WHERE enabled = 1';
    if (strategy) {
      query += ` AND strategy = '${strategy}'`;
    }
    const stmt = db.prepare(query);
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRow(row));
  }

  disable(tokenMint: string, strategy: string = 'TP_SL'): void {
    const stmt = db.prepare(`
      UPDATE trading_rules SET enabled = 0
      WHERE token_mint = ? AND strategy = ?
    `);
    stmt.run(tokenMint, strategy);
  }

  deleteAll(): void {
    db.prepare('DELETE FROM trading_rules').run();
    logger.info('Cleared all trading rules');
  }

  private mapRow(row: any): TradingRule {
    return {
      id: row.id,
      tokenMint: row.token_mint,
      tokenSymbol: row.token_symbol,
      strategy: row.strategy,
      takeProfit: row.take_profit,
      stopLoss: row.stop_loss,
      sellPercentage: row.sell_percentage,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
    };
  }
}

export default new TradingRuleModel();
