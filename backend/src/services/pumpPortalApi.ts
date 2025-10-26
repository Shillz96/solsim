/*
 * PumpPortal TypeScript SDK (Unofficial)
 * --------------------------------------
 * Endpoints covered:
 * - WebSocket realtime feed: wss://pumpportal.fun/api/data
 * - Local trading API:       POST https://pumpportal.fun/api/trade-local
 * - Lightning trading API:   POST https://pumpportal.fun/api/trade?api-key=<KEY>
 * - Token creation via action: "create" (supported by both trade-local and trade)
 *
 * Notes:
 * - Bring your own fetch (Node 18+/Next 13+ has global fetch). Optionally pass a custom fetch in the client ctor.
 * - This SDK is designed for server-side usage. If you use it in the browser, ensure CORS and key security.
 * - The API is community-documented and can change; handle errors defensively.
 */

// ========================
// Types
// ========================

export type PoolOption =
  | 'pump'
  | 'raydium'
  | 'pump-amm'
  | 'launchlab'
  | 'raydium-cpmm'
  | 'bonk'
  | 'auto';

export type TradeAction = 'buy' | 'sell' | 'create';

export interface BaseTradeFields {
  /** Token mint address */
  mint: string;
  /** 'true' if amount is in SOL, 'false' if in tokens */
  denominatedInSol: 'true' | 'false';
  /** Percent slippage tolerance (e.g., 10) */
  slippage: number;
  /** Priority fee value (e.g., 0.0005) */
  priorityFee?: number;
  /** Execution pool preference. Default: 'pump' */
  pool?: PoolOption;
}

export interface LocalTradeRequest extends BaseTradeFields {
  /** Your wallet public key (base58) */
  publicKey: string;
  /** 'buy' | 'sell' | 'create' */
  action: TradeAction;
  /** Amount of SOL or tokens; for sell can be '100%'*/
  amount: number | string;
}

export interface LightningTradeRequest extends BaseTradeFields {
  /** 'buy' | 'sell' | 'create' */
  action: TradeAction;
  /** Amount of SOL or tokens; for sell can be '100%'*/
  amount: number | string;
  /** Skip preflight simulation (default 'true') */
  skipPreflight?: 'true' | 'false';
  /** Send only via Jito bundle relays */
  jitoOnly?: 'true' | 'false';
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string; // points to metadata JSON (e.g., IPFS)
}

export interface CreateTokenFields {
  tokenMetadata: TokenMetadata;
}

// --- WebSocket payloads (minimal shape; extend per your use case) ---
export type WSMethod = 'subscribeNewToken' | 'subscribeTokenTrade' | 'subscribeAccountTrade';

export interface WSSubscribeBase {
  method: WSMethod;
}
export interface WSSubscribeWithKeys extends WSSubscribeBase {
  keys: string[]; // mints or account pubkeys depending on method
}

export type WSOutgoing = WSSubscribeBase | WSSubscribeWithKeys;

export interface WSEvent<T = unknown> {
  type?: string;
  data?: T;
  // raw message retained for debugging
  raw?: unknown;
}

// --- REST responses (narrowed minimal shapes) ---
export interface LocalTradeResponse {
  /** base64 or wire-encoded transaction to be signed & sent client-side */
  transaction?: string;
  /** optional human-friendly message */
  message?: string;
  /** anything else the API returns */
  [k: string]: unknown;
}

export interface LightningTradeResponse {
  /** signature / transaction id after submission */
  signature?: string;
  /** optional receipt-like fields */
  tx?: string;
  message?: string;
  [k: string]: unknown;
}

// ========================
// Utilities
// ========================

const DEFAULT_WS_URL = 'wss://pumpportal.fun/api/data';
const TRADE_LOCAL_URL = 'https://pumpportal.fun/api/trade-local';
const TRADE_LIGHTNING_URL = 'https://pumpportal.fun/api/trade';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Simple exponential backoff strategy */
async function backoff(retry: number, baseMs = 500, jitter = true) {
  const cap = 10_000;
  const exp = Math.min(cap, baseMs * 2 ** retry);
  const wait = jitter ? Math.floor(exp * (0.5 + Math.random())) : exp;
  await sleep(wait);
}

// ========================
// PumpPortalClient
// ========================

export interface PumpPortalClientOptions {
  /** PumpPortal API key for Lightning trades */
  apiKey?: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch;
  /** Optional default pool */
  defaultPool?: PoolOption;
  /** Optional ws url override */
  wsUrl?: string;
  /** Optional console-like logger */
  logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
}

export class PumpPortalClient {
  private apiKey?: string;
  private fetchImpl: typeof fetch;
  private defaultPool: PoolOption;
  private wsUrl: string;
  private logger: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

  constructor(opts: PumpPortalClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? (globalThis as any).fetch;
    if (!this.fetchImpl) throw new Error('No fetch available. Pass fetchImpl in PumpPortalClientOptions.');
    this.defaultPool = opts.defaultPool ?? 'pump';
    this.wsUrl = opts.wsUrl ?? DEFAULT_WS_URL;
    this.logger = opts.logger ?? console;
  }

  // ------------- WebSocket realtime -------------

  /**
   * Opens a resilient WebSocket connection and subscribes using the provided message(s).
   * Returns an unsubscribe function that will close the socket.
   */
  subscribe(
    messages: WSOutgoing | WSOutgoing[],
    onEvent: (evt: WSEvent) => void,
    onStatus?: (status: 'connecting' | 'open' | 'closed' | 'reconnecting' | 'error') => void,
  ): () => void {
    const subs = Array.isArray(messages) ? messages : [messages];
    let ws: WebSocket | null = null;
    let closedByUser = false;
    let retries = 0;
    let heartbeat: any;

    const connect = () => {
      onStatus?.('connecting');
      ws = new WebSocket(this.wsUrl);

      ws.onopen = () => {
        retries = 0;
        onStatus?.('open');
        // send subscriptions
        subs.forEach((m) => ws?.send(JSON.stringify(m)));
        // heartbeat ping (some infra closes idle sockets)
        heartbeat = setInterval(() => {
          try { ws?.send?.('{"ping":true}'); } catch {}
        }, 25_000);
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data as string);
          const evt: WSEvent = { raw: parsed, type: parsed?.type, data: parsed?.data ?? parsed };
          onEvent(evt);
        } catch (e) {
          // Forward raw text if JSON parse fails
          onEvent({ raw: msg.data });
        }
      };

      ws.onerror = () => {
        onStatus?.('error');
      };

      ws.onclose = async () => {
        clearInterval(heartbeat);
        onStatus?.('closed');
        if (!closedByUser) {
          onStatus?.('reconnecting');
          await backoff(retries++);
          connect();
        }
      };
    };

    connect();

    return () => {
      closedByUser = true;
      try { clearInterval(heartbeat); } catch {}
      try { ws?.close(); } catch {}
    };
  }

  /** Convenience helpers */
  subscribeNewToken(onEvent: (evt: WSEvent) => void, onStatus?: (s: any) => void) {
    return this.subscribe({ method: 'subscribeNewToken' }, onEvent, onStatus);
  }

  subscribeTokenTrade(mints: string[], onEvent: (evt: WSEvent) => void, onStatus?: (s: any) => void) {
    return this.subscribe({ method: 'subscribeTokenTrade', keys: mints }, onEvent, onStatus);
  }

  subscribeAccountTrade(accounts: string[], onEvent: (evt: WSEvent) => void, onStatus?: (s: any) => void) {
    return this.subscribe({ method: 'subscribeAccountTrade', keys: accounts }, onEvent, onStatus);
  }

  // ------------- Trading (REST) -------------

  /** Calls the Local Trading API and returns a transaction blob to sign & submit yourself. */
  async tradeLocal(req: LocalTradeRequest & Partial<CreateTokenFields>): Promise<LocalTradeResponse> {
    const body: Record<string, unknown> = {
      publicKey: req.publicKey,
      action: req.action,
      mint: req.mint,
      amount: req.amount,
      denominatedInSol: req.denominatedInSol,
      slippage: req.slippage,
      priorityFee: req.priorityFee,
      pool: req.pool ?? this.defaultPool,
    };

    if (req.action === 'create') {
      const createFields = req as LocalTradeRequest & CreateTokenFields;
      if (!createFields.tokenMetadata) throw new Error('tokenMetadata is required for action=create');
      (body as any).tokenMetadata = createFields.tokenMetadata;
    }

    const res = await this.fetchImpl(TRADE_LOCAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`trade-local failed: ${res.status} ${res.statusText} — ${text}`);
    }

    const json = (await res.json()) as LocalTradeResponse;
    return json;
  }

  /** Calls the Lightning Trading API (service builds/signs/sends). Requires apiKey. */
  async trade(req: LightningTradeRequest & Partial<CreateTokenFields>): Promise<LightningTradeResponse> {
    if (!this.apiKey) throw new Error('apiKey required for Lightning trade');

    const url = `${TRADE_LIGHTNING_URL}?api-key=${encodeURIComponent(this.apiKey)}`;

    const body: Record<string, unknown> = {
      action: req.action,
      mint: req.mint,
      amount: req.amount,
      denominatedInSol: req.denominatedInSol,
      slippage: req.slippage,
      priorityFee: req.priorityFee,
      pool: req.pool ?? this.defaultPool,
      skipPreflight: req.skipPreflight ?? 'true',
      jitoOnly: req.jitoOnly ?? 'false',
    };

    if (req.action === 'create') {
      const createFields = req as LightningTradeRequest & CreateTokenFields;
      if (!createFields.tokenMetadata) throw new Error('tokenMetadata is required for action=create');
      (body as any).tokenMetadata = createFields.tokenMetadata;
    }

    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`trade (lightning) failed: ${res.status} ${res.statusText} — ${text}`);
    }

    const json = (await res.json()) as LightningTradeResponse;
    return json;
  }

  // ------------- Helpers for common tasks -------------

  /** One-liner for buying via Lightning API */
  buyLightning(params: Omit<LightningTradeRequest, 'action'> & Partial<CreateTokenFields>) {
    return this.trade({ ...params, action: 'buy' });
  }

  /** One-liner for selling via Lightning API */
  sellLightning(params: Omit<LightningTradeRequest, 'action'> & Partial<CreateTokenFields>) {
    return this.trade({ ...params, action: 'sell' });
  }

  /** Create token via Lightning API */
  createLightning(params: Omit<LightningTradeRequest, 'action'> & CreateTokenFields) {
    return this.trade({ ...params, action: 'create' });
  }

  /** Buy via Local API (returns tx to sign+send yourself) */
  buyLocal(params: Omit<LocalTradeRequest, 'action'> & Partial<CreateTokenFields>) {
    return this.tradeLocal({ ...params, action: 'buy' });
  }

  /** Sell via Local API (returns tx to sign+send yourself) */
  sellLocal(params: Omit<LocalTradeRequest, 'action'> & Partial<CreateTokenFields>) {
    return this.tradeLocal({ ...params, action: 'sell' });
  }

  /** Create token via Local API (returns tx to sign+send yourself) */
  createLocal(params: Omit<LocalTradeRequest, 'action'> & CreateTokenFields) {
    return this.tradeLocal({ ...params, action: 'create' });
  }
}

// ========================
// Example usage (remove or adapt in your codebase)
// ========================

/**
 * Example: subscribe to a token's trades and log them.
 *
 * const client = new PumpPortalClient();
 * const unsubscribe = client.subscribeTokenTrade(
 *   ['G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump'],
 *   (evt) => console.log('trade event', evt),
 *   (status) => console.log('ws status', status)
 * );
 *
 * // later: unsubscribe();
 */

/**
 * Example: lightning BUY 0.1 SOL worth of VAMP
 *
 * const client = new PumpPortalClient({ apiKey: process.env.PUMPPORTAL_API_KEY! });
 * const resp = await client.buyLightning({
 *   mint: 'G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump',
 *   amount: 0.1,
 *   denominatedInSol: 'true',
 *   slippage: 10,
 *   priorityFee: 0.0005,
 *   pool: 'pump', // optional
 *   // skipPreflight: 'false',
 *   // jitoOnly: 'true',
 * });
 * console.log('lightning trade result', resp);
 */

/**
 * Example: local SELL 100% of tokens (you sign+send the returned txn)
 *
 * const client = new PumpPortalClient();
 * const { transaction } = await client.sellLocal({
 *   publicKey: '<YOUR_WALLET_PUBKEY>',
 *   mint: 'G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump',
 *   amount: '100%',
 *   denominatedInSol: 'false',
 *   slippage: 10,
 *   priorityFee: 0.0005,
 * });
 * // sign & send `transaction` with your wallet + RPC
 */
