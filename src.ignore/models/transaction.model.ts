import db from '../config/database';
import { ParsedTransaction } from '../services/transaction.parser';
import logger from '../utils/logger';

export interface Transaction {
  id?: number;
  signature: string;
  blockTime: number;
  type: 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  tokenMint: string;
  tokenSymbol: string | null;
  amount: number;
  priceSol: number | null; // Price per token in SOL
  valueSol: number | null; // Total value in SOL
  feeSol: number; // Transaction fee in SOL
  createdAt?: string;
}

class TransactionModel {
  insert(tx: ParsedTransaction): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO transactions (
        signature, block_time, type, token_mint, token_symbol,
        amount, price_usd, value_usd, fee_sol
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tx.signature,
      tx.blockTime,
      tx.type,
      tx.tokenMint,
      tx.tokenSymbol,
      tx.amount,
      tx.priceSol,
      tx.valueSol,
      tx.feeSol
    );
  }

  insertMany(transactions: ParsedTransaction[]): number {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO transactions (
        signature, block_time, type, token_mint, token_symbol,
        amount, price_usd, value_usd, fee_sol
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((txs: ParsedTransaction[]) => {
      for (const tx of txs) {
        insert.run(
          tx.signature,
          tx.blockTime,
          tx.type,
          tx.tokenMint,
          tx.tokenSymbol,
          tx.amount,
          tx.priceSol,
          tx.valueSol,
          tx.feeSol
        );
      }
    });

    insertMany(transactions);
    const inserted = db.prepare('SELECT changes()').get() as { 'changes()': number };
    logger.success(`Inserted ${inserted['changes()']} new transactions into database`);
    return inserted['changes()'];
  }

  private mapRow(row: any): Transaction {
    return {
      id: row.id,
      signature: row.signature,
      blockTime: row.block_time,
      type: row.type,
      tokenMint: row.token_mint,
      tokenSymbol: row.token_symbol,
      amount: row.amount,
      priceSol: row.price_usd, // DB column name unchanged, but semantics = SOL
      valueSol: row.value_usd, // DB column name unchanged, but semantics = SOL
      feeSol: row.fee_sol,
      createdAt: row.created_at
    };
  }

  getAllByToken(tokenMint: string): Transaction[] {
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE token_mint = ?
      ORDER BY block_time ASC
    `);
    const rows = stmt.all(tokenMint);
    return rows.map(row => this.mapRow(row));
  }

  getAll(): Transaction[] {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY block_time DESC');
    const rows = stmt.all();
    return rows.map(row => this.mapRow(row));
  }

  getUniqueTokens(): string[] {
    const stmt = db.prepare('SELECT DISTINCT token_mint FROM transactions');
    const rows = stmt.all() as { token_mint: string }[];
    return rows.map(row => row.token_mint);
  }

  getCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    return result.count;
  }
}

export default new TransactionModel();
