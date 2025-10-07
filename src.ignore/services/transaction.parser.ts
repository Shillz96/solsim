import logger from '../utils/logger';

export interface ParsedTransaction {
  signature: string;
  blockTime: number;
  type: 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  tokenMint: string;
  tokenSymbol: string | null;
  amount: number;
  priceSol: number | null; // Price per token in SOL
  valueSol: number | null; // Total value in SOL
  feeSol: number; // Transaction fee in SOL
}

class TransactionParser {
  parseTransaction(tx: any, walletAddress: string): ParsedTransaction[] {
    const parsed: ParsedTransaction[] = [];

    try {
      if (!tx || !tx.transaction) return [];

      const signature = tx.transaction.signatures?.[0] || 'unknown';
      const blockTime = tx.blockTime || 0;
      const feeSol = (tx.meta?.fee || 0) / 1_000_000_000;

      // Check if this transaction creates a new token account
      const createsNewAccount = this.detectNewTokenAccount(tx, walletAddress);
      const ACCOUNT_RENT = 0.00203928; // Standard Solana token account rent

      // First, try to parse innerInstructions for accurate swap amounts
      if (tx.meta?.innerInstructions) {
        this.parseInnerInstructions(tx, walletAddress, signature, blockTime, feeSol, parsed);
      }

      // Parse SPL token balance changes
      if (tx.meta?.preTokenBalances && tx.meta?.postTokenBalances) {
        this.parseTokenBalanceChanges(tx, walletAddress, signature, blockTime, feeSol, parsed);
      }

      // If no inner instructions found, fall back to SOL balance changes
      if (parsed.length === 0 || !parsed.some(p => p.tokenSymbol === 'SOL')) {
        if (tx.meta?.preBalances && tx.meta?.postBalances && tx.transaction?.message?.accountKeys) {
          this.parseSOLBalanceChanges(tx, walletAddress, signature, blockTime, feeSol, parsed);
        }
      }

      // If account creation detected, subtract rent from SOL TRANSFER_OUT/SELL
      if (createsNewAccount) {
        const solTransfer = parsed.find(p => p.tokenSymbol === 'SOL' && p.amount > ACCOUNT_RENT);
        if (solTransfer) {
          logger.debug(`Subtracting account rent (${ACCOUNT_RENT} SOL) from transaction ${signature.slice(0, 8)}`);
          solTransfer.amount -= ACCOUNT_RENT;
        }
      }

      // If we got balance changes, classify as swap if both IN and OUT exist
      if (parsed.length > 0) {
        const hasIn = parsed.some(p => p.type === 'TRANSFER_IN');
        const hasOut = parsed.some(p => p.type === 'TRANSFER_OUT');

        if (hasIn && hasOut) {
          // This is a swap - mark appropriately
          // IMPORTANT: Only the FIRST transaction should carry the fee (avoid double counting)
          for (let i = 0; i < parsed.length; i++) {
            const p = parsed[i];
            if (p.type === 'TRANSFER_IN') p.type = 'BUY';
            if (p.type === 'TRANSFER_OUT') p.type = 'SELL';

            // Only the first transaction in the swap carries the fee
            if (i > 0) {
              p.feeSol = 0;
            }
          }
        }
      }

    } catch (error: any) {
      logger.warning(`Error parsing transaction ${tx?.transaction?.signatures?.[0]}: ${error.message}`);
    }

    return parsed;
  }

  private detectNewTokenAccount(tx: any, walletAddress: string): boolean {
    const pre = tx.meta?.preTokenBalances || [];
    const post = tx.meta?.postTokenBalances || [];

    // Get token accounts owned by wallet in pre and post
    const preAccounts = new Set(
      pre
        .filter((b: any) => b.owner === walletAddress)
        .map((b: any) => `${b.accountIndex}-${b.mint}`)
    );

    const postAccounts = new Set(
      post
        .filter((b: any) => b.owner === walletAddress)
        .map((b: any) => `${b.accountIndex}-${b.mint}`)
    );

    // If there's an account in post that wasn't in pre, it's newly created
    for (const account of postAccounts) {
      if (!preAccounts.has(account)) {
        return true;
      }
    }

    return false;
  }

  private parseInnerInstructions(
    tx: any,
    walletAddress: string,
    signature: string,
    blockTime: number,
    feeSol: number,
    parsed: ParsedTransaction[]
  ): void {
    const innerInstructions = tx.meta.innerInstructions;
    if (!innerInstructions) return;

    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const RENT_THRESHOLD = 0.0025; // Account creation rent is typically ~0.002 SOL

    // First pass: collect all SOL transfers
    const solTransfersOut: number[] = [];
    const solTransfersIn: number[] = [];

    for (const inner of innerInstructions) {
      for (const inst of inner.instructions) {
        // Look for SOL transfers in parsed instructions
        if (inst.parsed && inst.parsed.type === 'transfer' && inst.parsed.info) {
          const info = inst.parsed.info;
          const amount = (info.lamports || 0) / 1_000_000_000;

          if (info.source === walletAddress) {
            solTransfersOut.push(amount);
          } else if (info.destination === walletAddress) {
            solTransfersIn.push(amount);
          }
        }
      }
    }

    // Second pass: Filter out account creation rent (small amounts ~0.002 SOL)
    // If we have multiple transfers out, exclude the one that looks like rent
    const filteredTransfersOut = solTransfersOut.filter(amount => {
      // If this is the only transfer, keep it (even if it's rent-sized)
      if (solTransfersOut.length === 1) return true;

      // If we have multiple transfers, exclude rent-sized amounts
      // Rent is typically 0.00203928 SOL, so we filter anything < 0.0025 SOL
      return amount >= RENT_THRESHOLD;
    });

    // Add filtered transfers to parsed results
    for (const amount of filteredTransfersOut) {
      parsed.push({
        signature,
        blockTime,
        type: 'TRANSFER_OUT',
        tokenMint: SOL_MINT,
        tokenSymbol: 'SOL',
        amount,
        priceSol: null,
        valueSol: null,
        feeSol,
      });
    }

    for (const amount of solTransfersIn) {
      parsed.push({
        signature,
        blockTime,
        type: 'TRANSFER_IN',
        tokenMint: SOL_MINT,
        tokenSymbol: 'SOL',
        amount,
        priceSol: null,
        valueSol: null,
        feeSol,
      });
    }
  }

  private parseSOLBalanceChanges(
    tx: any,
    walletAddress: string,
    signature: string,
    blockTime: number,
    feeSol: number,
    parsed: ParsedTransaction[]
  ): void {
    const accountKeys = tx.transaction.message.accountKeys;
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    // Find wallet's account index
    let walletIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      const pubkey = typeof accountKeys[i] === 'string'
        ? accountKeys[i]
        : accountKeys[i].pubkey;

      if (pubkey === walletAddress) {
        walletIndex = i;
        break;
      }
    }

    if (walletIndex === -1) {
      logger.debug(`Wallet not found in account keys for ${signature}`);
      return;
    }

    const preBal = preBalances[walletIndex] / 1_000_000_000;
    const postBal = postBalances[walletIndex] / 1_000_000_000;

    // Calculate net change (excluding fees)
    const diff = postBal - preBal + feeSol;

    // Only track significant changes (> 0.0001 SOL to filter out rent/fees)
    if (Math.abs(diff) > 0.0001) {
      const SOL_MINT = 'So11111111111111111111111111111111111111112';

      // Check if SOL already parsed
      const alreadyParsed = parsed.some(p => p.tokenMint === SOL_MINT);
      if (!alreadyParsed) {
        parsed.push({
          signature,
          blockTime,
          type: diff > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT',
          tokenMint: SOL_MINT,
          tokenSymbol: 'SOL',
          amount: Math.abs(diff),
          priceSol: null,
          valueSol: null,
          feeSol,
        });
      }
    }
  }

  private parseTokenBalanceChanges(
    tx: any,
    walletAddress: string,
    signature: string,
    blockTime: number,
    feeSol: number,
    parsed: ParsedTransaction[]
  ): void {
    const pre = tx.meta.preTokenBalances || [];
    const post = tx.meta.postTokenBalances || [];

    const balanceMap = new Map<string, { pre: number; post: number; mint: string }>();

    for (const balance of pre) {
      if (balance.owner === walletAddress) {
        const key = `${balance.accountIndex}-${balance.mint}`;
        balanceMap.set(key, {
          pre: balance.uiTokenAmount?.uiAmount || 0,
          post: 0,
          mint: balance.mint
        });
      }
    }

    for (const balance of post) {
      if (balance.owner === walletAddress) {
        const key = `${balance.accountIndex}-${balance.mint}`;
        const existing = balanceMap.get(key);
        if (existing) {
          existing.post = balance.uiTokenAmount?.uiAmount || 0;
        } else {
          balanceMap.set(key, {
            pre: 0,
            post: balance.uiTokenAmount?.uiAmount || 0,
            mint: balance.mint
          });
        }
      }
    }

    for (const [_, data] of balanceMap) {
      const diff = data.post - data.pre;
      if (diff !== 0) {
        // Check if already parsed
        const alreadyParsed = parsed.some(p => p.tokenMint === data.mint);
        if (!alreadyParsed) {
          parsed.push({
            signature,
            blockTime,
            type: diff > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT',
            tokenMint: data.mint,
            tokenSymbol: null,
            amount: Math.abs(diff),
            priceSol: null,
            valueSol: null,
            feeSol,
          });
        }
      }
    }
  }

  parseTransactions(transactions: any[], walletAddress: string): ParsedTransaction[] {
    const allParsed: ParsedTransaction[] = [];
    for (const tx of transactions) {
      const parsed = this.parseTransaction(tx, walletAddress);
      allParsed.push(...parsed);
    }
    logger.info(`Parsed ${allParsed.length} token transfers from ${transactions.length} transactions`);
    return allParsed;
  }
}

export default new TransactionParser();
