/*
 * Helius TypeScript SDK (Unofficial, lightweight)
 * -----------------------------------------------
 * Covers common Helius endpoints & patterns:
 * - RPC (HTTP JSON-RPC): getBalance, getTokenAccountsByOwner, etc.
 * - WebSocket subscriptions: logs/account/program/signature/slot
 * - DAS (Digital Asset Standard) API: getAsset, getAssetsByOwner, searchAssets
 * - Enhanced Transactions API: parse & fetch address txs
 * - Webhooks CRUD
 *
 * Design goals:
 * - Minimal deps (uses global fetch & WebSocket)
 * - Safe defaults, typed inputs
 * - Works server-side (Node 18+/Next 13+) — if used client-side, mind key exposure
 *
 * Docs: https://www.helius.dev/docs
 */

// ========================
// Types
// ========================

export type HeliusCluster = 'mainnet' | 'devnet';

export interface HeliusClientOptions {
  apiKey: string;
  cluster?: HeliusCluster; // default: mainnet
  fetchImpl?: typeof fetch;
  wsUrlOverride?: string;
  rpcUrlOverride?: string;
  logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
}

// ---- RPC ----
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any[] | Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

// ---- DAS ----
export interface DASGetAssetRequest { id: string; }
export interface DASAsset {
  id: string;
  content?: any;
  authorities?: any[];
  ownership?: any;
  token_info?: any;
  // ...extend as needed
}

// ---- Enhanced Transactions ----
export interface EnhancedTx {
  signature: string;
  timestamp?: number;
  type?: string;
  description?: string;
  events?: any;
  // ...extend as needed
}

export interface AddressTxQuery {
  before?: string; // signature cursor
  until?: string; // signature cursor
  source?: string; // program/source filter
  type?: string; // e.g., SWAP, TRANSFER
  page?: number;
  limit?: number; // default server-side limit
}

// ---- Webhooks ----
export interface CreateWebhookBody {
  accountAddresses?: string[];
  webhookURL: string;
  transactionTypes?: string[]; // e.g., ['SWAP', 'TRANSFER']
  webhookType?: 'ENHANCED' | 'RAW' | 'NFT_ACTIVITY' | 'TOKEN_BALANCE';
  authHeader?: string; // for your server validation
  txnStatus?: ('ANY' | 'CONFIRMED' | 'FINALIZED');
  encoding?: string;
  // ...other fields per docs
}
export interface Webhook extends CreateWebhookBody { webhookID: string; }

// ========================
// Constants & utils
// ========================

const WS_MAINNET = 'wss://mainnet.helius-rpc.com/';
const WS_DEVNET = 'wss://devnet.helius-rpc.com/';
const RPC_MAINNET = 'https://mainnet.helius-rpc.com/';
const RPC_DEVNET = 'https://devnet.helius-rpc.com/';
const API_BASE = 'https://api.helius.xyz'; // for DAS, tx, webhooks

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function backoff(attempt: number, base = 500, cap = 10_000) {
  const t = Math.min(cap, base * 2 ** attempt);
  const wait = Math.floor(t * (0.5 + Math.random()));
  await sleep(wait);
}

// ========================
// HeliusClient
// ========================

export class HeliusClient {
  readonly apiKey: string;
  readonly cluster: HeliusCluster;
  private fetchImpl: typeof fetch;
  private wsUrlOverride?: string;
  private rpcUrlOverride?: string;
  private logger: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

  constructor(opts: HeliusClientOptions) {
    if (!opts?.apiKey) throw new Error('HeliusClient: apiKey is required');
    this.apiKey = opts.apiKey;
    this.cluster = opts.cluster ?? 'mainnet';
    this.fetchImpl = opts.fetchImpl ?? (globalThis as any).fetch;
    if (!this.fetchImpl) throw new Error('No global fetch found. Pass fetchImpl.');
    this.wsUrlOverride = opts.wsUrlOverride;
    this.rpcUrlOverride = opts.rpcUrlOverride;
    this.logger = opts.logger ?? console;
  }

  // ---- URL helpers ----
  get rpcUrl() {
    if (this.rpcUrlOverride) return this.appendKey(this.rpcUrlOverride);
    const base = this.cluster === 'devnet' ? RPC_DEVNET : RPC_MAINNET;
    return this.appendKey(base);
  }
  get wsUrl() {
    if (this.wsUrlOverride) return this.appendKey(this.wsUrlOverride);
    const base = this.cluster === 'devnet' ? WS_DEVNET : WS_MAINNET;
    return this.appendKey(base);
  }
  private appendKey(url: string) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}api-key=${encodeURIComponent(this.apiKey)}`;
  }

  // ========================
  // RPC (HTTP JSON-RPC)
  // ========================

  async rpc<T = unknown>(method: string, params?: any, id: number | string = 1): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: Array.isArray(params) || params === undefined ? params : [params],
    };

    const res = await this.fetchImpl(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RPC ${method} failed: ${res.status} ${res.statusText} — ${text}`);
    }

    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) {
      throw new Error(`RPC ${method} error: ${json.error.code} ${json.error.message}`);
    }
    return json.result as T;
  }

  // Convenience wrappers (add more as needed)
  getSlot(commitment: 'processed' | 'confirmed' | 'finalized' = 'finalized') {
    return this.rpc<number>('getSlot', [{ commitment }]);
  }

  getBalance(pubkey: string, commitment: 'processed' | 'confirmed' | 'finalized' = 'finalized') {
    return this.rpc<{ value: number }>('getBalance', [pubkey, { commitment }]);
  }

  getTokenAccountsByOwner(owner: string, mint?: string) {
    if (mint) {
      return this.rpc('getTokenAccountsByOwner', [owner, { mint }]);
    }
    return this.rpc('getTokenAccountsByOwner', [owner, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }]);
  }

  // ========================
  // WebSocket subscriptions
  // ========================

  subscribe(
    rpcSubscribeMethod: string, // e.g., 'logsSubscribe', 'accountSubscribe', 'programSubscribe', 'signatureSubscribe', 'slotSubscribe'
    params: any[],
    onMessage: (msg: any) => void,
    onStatus?: (s: 'connecting' | 'open' | 'closed' | 'reconnecting' | 'error') => void,
  ): () => void {
    let ws: WebSocket | null = null;
    let closedByUser = false;
    let attempt = 0;
    let subId: number | null = null;

    const connect = () => {
      onStatus?.('connecting');
      ws = new WebSocket(this.wsUrl);

      ws.onopen = () => {
        attempt = 0;
        onStatus?.('open');
        const req = { jsonrpc: '2.0', id: 1, method: rpcSubscribeMethod, params };
        ws?.send(JSON.stringify(req));
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string);
          if (data?.result && typeof data.result === 'number') {
            subId = data.result;
          }
          onMessage(data);
        } catch (e) {
          onMessage(ev.data);
        }
      };

      ws.onerror = () => onStatus?.('error');

      ws.onclose = async () => {
        onStatus?.('closed');
        if (!closedByUser) {
          onStatus?.('reconnecting');
          await backoff(attempt++);
          connect();
        }
      };
    };

    connect();

    return () => {
      closedByUser = true;
      try {
        if (ws && subId !== null) {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'unsubscribe', params: [subId] }));
        }
      } catch {}
      try { ws?.close(); } catch {}
    };
  }

  // Helpers for common subs
  logsSubscribe(filter: { mentions?: string[]; filter?: { programId?: string } }, onMessage: (m: any) => void, onStatus?: (s: any) => void) {
    // RPC params typically: [filter, { commitment: 'finalized' }]
    const params = [
      filter.mentions?.length ? { mentions: filter.mentions } : (filter.filter ?? {}),
      { commitment: 'finalized' },
    ];
    return this.subscribe('logsSubscribe', params, onMessage, onStatus);
  }

  accountSubscribe(pubkey: string, onMessage: (m: any) => void, onStatus?: (s: any) => void) {
    const params = [pubkey, { commitment: 'finalized' }];
    return this.subscribe('accountSubscribe', params, onMessage, onStatus);
  }

  programSubscribe(programId: string, onMessage: (m: any) => void, onStatus?: (s: any) => void) {
    const params = [programId, { commitment: 'finalized' }];
    return this.subscribe('programSubscribe', params, onMessage, onStatus);
  }

  signatureSubscribe(signature: string, onMessage: (m: any) => void, onStatus?: (s: any) => void) {
    const params = [signature, { commitment: 'finalized' }];
    return this.subscribe('signatureSubscribe', params, onMessage, onStatus);
  }

  slotSubscribe(onMessage: (m: any) => void, onStatus?: (s: any) => void) {
    return this.subscribe('slotSubscribe', [], onMessage, onStatus);
  }

  // ========================
  // DAS (Digital Asset Standard)
  // ========================

  private api(path: string, init?: RequestInit) {
    const url = `${API_BASE}${path}${path.includes('?') ? '&' : '?'}api-key=${encodeURIComponent(this.apiKey)}`;
    return this.fetchImpl(url, init);
  }

  async getAsset(id: string): Promise<DASAsset> {
    const res = await this.api(`/v0/assets/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`getAsset failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getAssetBatch(ids: string[]): Promise<DASAsset[]> {
    const res = await this.api(`/v0/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error(`getAssetBatch failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getAssetsByOwner(owner: string, opts?: Record<string, any>) {
    const res = await this.api(`/v0/addresses/${encodeURIComponent(owner)}/assets` + (opts ? `?${new URLSearchParams(opts as any).toString()}` : ''));
    if (!res.ok) throw new Error(`getAssetsByOwner failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async searchAssets(query: Record<string, any>) {
    const res = await this.api(`/v0/metadata/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(`searchAssets failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  // ========================
  // Enhanced Transactions
  // ========================

  async getAddressTransactions(address: string, query?: AddressTxQuery): Promise<EnhancedTx[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    const res = await this.api(`/v0/addresses/${encodeURIComponent(address)}/transactions?${params.toString()}`);
    if (!res.ok) throw new Error(`getAddressTransactions failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  /** Submit signatures (or raw tx) to parse into human-readable events */
  async parseTransactions(signatures: string[]): Promise<EnhancedTx[]> {
    const res = await this.api(`/v0/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: signatures }),
    });
    if (!res.ok) throw new Error(`parseTransactions failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  // ========================
  // Webhooks
  // ========================

  async createWebhook(body: CreateWebhookBody): Promise<Webhook> {
    const res = await this.api(`/v0/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`createWebhook failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getWebhooks(): Promise<Webhook[]> {
    const res = await this.api(`/v0/webhooks`);
    if (!res.ok) throw new Error(`getWebhooks failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async getWebhook(id: string): Promise<Webhook> {
    const res = await this.api(`/v0/webhooks/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`getWebhook failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async updateWebhook(id: string, body: Partial<CreateWebhookBody>): Promise<Webhook> {
    const res = await this.api(`/v0/webhooks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`updateWebhook failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async deleteWebhook(id: string): Promise<{ success: boolean } | Webhook> {
    const res = await this.api(`/v0/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`deleteWebhook failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
}

// ========================
// Examples (remove or adapt in your codebase)
// ========================

/**
 * EX1: Get slot + SOL balance
 *
 * const helius = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
 * const slot = await helius.getSlot();
 * const bal = await helius.getBalance('<WALLET_PUBKEY>');
 * console.log({ slot, lamports: bal.value });
 */

/**
 * EX2: Subscribe to logs mentioning a mint (e.g., VAMP mint)
 *
 * const helius = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
 * const unsubscribe = helius.logsSubscribe(
 *   { mentions: ['G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump'] },
 *   (msg) => console.log('logs evt', msg),
 *   (st) => console.log('ws', st),
 * );
 * // later: unsubscribe();
 */

/**
 * EX3: DAS: Find all assets owned by a wallet
 *
 * const helius = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
 * const assets = await helius.getAssetsByOwner('<WALLET_PUBKEY>', { page: 1, limit: 100 });
 * console.log(assets);
 */

/**
 * EX4: Enhanced tx: fetch history for an address
 *
 * const helius = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
 * const txs = await helius.getAddressTransactions('<WALLET_PUBKEY>', { limit: 50, type: 'SWAP' });
 * console.log(txs);
 */

/**
 * EX5: Webhooks: create a webhook for SWAP events to your server
 *
 * const helius = new HeliusClient({ apiKey: process.env.HELIUS_API_KEY! });
 * const hook = await helius.createWebhook({
 *   webhookURL: 'https://your-server.tld/helius',
 *   transactionTypes: ['SWAP'],
 *   webhookType: 'ENHANCED',
 *   authHeader: 'Bearer your-secret',
 * });
 * console.log('webhook created', hook.webhookID);
 */
