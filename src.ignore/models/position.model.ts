import db from '../config/database';
import logger from '../utils/logger';

export interface TokenPosition {
  tokenMint: string;
  tokenSymbol: string | null;
  totalAmount: number;
  avgCostBasis: number; // Cost per token in SOL
  totalInvestedSol: number; // Total SOL invested (including fees & rent)
  lastUpdated?: string;
}

class PositionModel {
  upsert(position: TokenPosition): void {
    const stmt = db.prepare(`
      INSERT INTO token_positions (
        token_mint, token_symbol, total_amount, avg_cost_basis, total_invested_usd
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(token_mint) DO UPDATE SET
        token_symbol = excluded.token_symbol,
        total_amount = excluded.total_amount,
        avg_cost_basis = excluded.avg_cost_basis,
        total_invested_usd = excluded.total_invested_usd,
        last_updated = CURRENT_TIMESTAMP
    `);

    stmt.run(
      position.tokenMint,
      position.tokenSymbol,
      position.totalAmount,
      position.avgCostBasis,
      position.totalInvestedSol
    );
  }

  upsertMany(positions: TokenPosition[]): void {
    const upsert = db.prepare(`
      INSERT INTO token_positions (
        token_mint, token_symbol, total_amount, avg_cost_basis, total_invested_usd
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(token_mint) DO UPDATE SET
        token_symbol = excluded.token_symbol,
        total_amount = excluded.total_amount,
        avg_cost_basis = excluded.avg_cost_basis,
        total_invested_usd = excluded.total_invested_usd,
        last_updated = CURRENT_TIMESTAMP
    `);

    const upsertMany = db.transaction((positions: TokenPosition[]) => {
      for (const pos of positions) {
        upsert.run(
          pos.tokenMint,
          pos.tokenSymbol,
          pos.totalAmount,
          pos.avgCostBasis,
          pos.totalInvestedSol
        );
      }
    });

    upsertMany(positions);
    logger.success(`Updated ${positions.length} token positions in database`);
  }

  getAll(): TokenPosition[] {
    const stmt = db.prepare('SELECT * FROM token_positions WHERE total_amount > 0 ORDER BY total_invested_usd DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToPosition(row));
  }

  getByToken(tokenMint: string): TokenPosition | null {
    const stmt = db.prepare('SELECT * FROM token_positions WHERE token_mint = ?');
    const row = stmt.get(tokenMint) as any;
    return row ? this.mapRowToPosition(row) : null;
  }

  private mapRowToPosition(row: any): TokenPosition {
    return {
      tokenMint: row.token_mint,
      tokenSymbol: row.token_symbol,
      totalAmount: row.total_amount,
      avgCostBasis: row.avg_cost_basis,
      totalInvestedSol: row.total_invested_usd, // DB column name unchanged, but semantics = SOL
      lastUpdated: row.last_updated
    };
  }

  deleteByToken(tokenMint: string): void {
    const stmt = db.prepare('DELETE FROM token_positions WHERE token_mint = ?');
    stmt.run(tokenMint);
  }

  deleteAll(): void {
    db.prepare('DELETE FROM token_positions').run();
    logger.info('Cleared all token positions');
  }
}

export default new PositionModel();
