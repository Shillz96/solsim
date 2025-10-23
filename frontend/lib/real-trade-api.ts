/**
 * Real Trading API Client
 * Client functions for interacting with real trading endpoints
 */

export interface ExecuteRealTradeRequest {
  userId: string;
  mint: string;
  side: 'BUY' | 'SELL';
  amountSol?: number;
  amountTokens?: number;
  fundingSource: 'DEPOSITED' | 'WALLET';
  slippageBps?: number;
}

export interface ExecuteRealTradeResponse {
  success: boolean;
  trade?: {
    id: string;
    signature: string;
    mint: string;
    side: 'BUY' | 'SELL';
    amountSol: number;
    amountTokens: number;
    pricePerToken: number;
    totalCost: number;
    pumpPortalFee: number;
    networkFee: number;
    timestamp: string;
  };
  error?: string;
}

export interface BuildWalletTransactionRequest {
  userId: string;
  mint: string;
  side: 'BUY' | 'SELL';
  amountSol?: number;
  amountTokens?: number;
  slippageBps?: number;
}

export interface BuildWalletTransactionResponse {
  success: boolean;
  transaction?: string; // Base64 encoded unsigned transaction
  estimatedFee: number;
  estimatedAmountOut: number;
  error?: string;
}

export interface SubmitSignedTransactionRequest {
  userId: string;
  mint: string;
  side: 'BUY' | 'SELL';
  signedTransaction: string; // Base64 encoded signed transaction
  amountSol?: number;
  amountTokens?: number;
}

export interface SubmitSignedTransactionResponse {
  success: boolean;
  trade?: {
    id: string;
    signature: string;
    mint: string;
    side: 'BUY' | 'SELL';
    amountSol: number;
    amountTokens: number;
    pricePerToken: number;
    totalCost: number;
    pumpPortalFee: number;
    networkFee: number;
    timestamp: string;
  };
  error?: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  status?: 'PENDING' | 'CONFIRMED' | 'FAILED';
  signature?: string;
  blockTime?: number;
  confirmations?: number;
  error?: string;
}

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Execute a real trade using deposited balance (Lightning API)
 */
export async function executeRealTrade(
  request: ExecuteRealTradeRequest
): Promise<ExecuteRealTradeResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/real-trade/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to execute trade',
      };
    }

    return data;
  } catch (error) {
    console.error('Error executing real trade:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build unsigned transaction for wallet trading (Local Transaction API)
 */
export async function buildWalletTransaction(
  request: BuildWalletTransactionRequest
): Promise<BuildWalletTransactionResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/real-trade/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        estimatedFee: 0,
        estimatedAmountOut: 0,
        error: data.error || data.message || 'Failed to build transaction',
      };
    }

    return data;
  } catch (error) {
    console.error('Error building wallet transaction:', error);
    return {
      success: false,
      estimatedFee: 0,
      estimatedAmountOut: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Submit signed transaction for wallet trading
 */
export async function submitSignedTransaction(
  request: SubmitSignedTransactionRequest
): Promise<SubmitSignedTransactionResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/real-trade/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to submit transaction',
      };
    }

    return data;
  } catch (error) {
    console.error('Error submitting signed transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  signature: string
): Promise<TransactionStatusResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/real-trade/status/${signature}`);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to get transaction status',
      };
    }

    return data;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user balances
 */
export async function getUserBalances(userId: string) {
  try {
    const response = await fetch(`${getApiUrl()}/api/user-profile/${userId}/balances`);

    if (!response.ok) {
      throw new Error('Failed to fetch user balances');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user balances:', error);
    throw error;
  }
}

/**
 * Switch trading mode
 */
export async function switchTradingMode(userId: string, mode: 'PAPER' | 'REAL') {
  try {
    const response = await fetch(`${getApiUrl()}/api/user-profile/${userId}/trading-mode`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradingMode: mode }),
    });

    if (!response.ok) {
      throw new Error('Failed to switch trading mode');
    }

    return await response.json();
  } catch (error) {
    console.error('Error switching trading mode:', error);
    throw error;
  }
}
