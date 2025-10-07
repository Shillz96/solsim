import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pnl-tracker.db');
const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signature TEXT NOT NULL,
      block_time INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT')),
      token_mint TEXT NOT NULL,
      token_symbol TEXT,
      amount REAL NOT NULL,
      price_usd REAL,
      value_usd REAL,
      fee_sol REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(signature, token_mint)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_token_mint ON transactions(token_mint);
    CREATE INDEX IF NOT EXISTS idx_block_time ON transactions(block_time);
    CREATE INDEX IF NOT EXISTS idx_type ON transactions(type);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS token_positions (
      token_mint TEXT PRIMARY KEY,
      token_symbol TEXT,
      total_amount REAL NOT NULL,
      avg_cost_basis REAL NOT NULL,
      total_invested_usd REAL NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS price_cache (
      token_mint TEXT PRIMARY KEY,
      price_usd REAL NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized at:', dbPath);
}

export default db;
