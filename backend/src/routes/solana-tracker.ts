import express from 'express';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';
import {
  transformSolanaTrackerToken,
  transformPumpFunToken,
  filterPumpFunTokens,
  deduplicateTokens,
  sortByTrendScore,
  type StandardizedToken
} from '../utils/tokenTransformers.js';
import {
  TOKEN_SOURCE_WEIGHTS,
  CACHE_TTL,
  API_CONFIG,
  TOKEN_FILTERS,
  PAGINATION,
  DEFAULT_TREND_SCORES
} from '../config/solanaTrackerConfig.js';

const router = express.Router();

// Cache for trending tokens
const trendingCache = new NodeCache({ stdTTL: CACHE_TTL.STANDARD });

/**
 * Helper function to make Solana Tracker API calls
 */
async function callSolanaTrackerAPI(endpoint: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'User-Agent': API_CONFIG.USER_AGENT,
      'Content-Type': 'application/json'
    };

    // Add API key if configured
    if (config.apis.solanaTracker.apiKey) {
      headers['x-api-key'] = config.apis.solanaTracker.apiKey;
    }

    logger.info(`Calling Solana Tracker API: ${url}`);

    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Solana Tracker API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error(`Solana Tracker API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Get trending tokens with better data diversity
 * Enhanced with Pump.fun integration for fresh token discovery
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const cacheKey = `solana-tracker-trending-${limit}`;

    // Check cache first
    const cached = trendingCache.get(cacheKey);
    if (cached) {
      logger.info('Returning cached Solana Tracker trending data');
      return res.json({
        success: true,
        data: cached,
        source: 'cache'
      });
    }

    // Try multiple sources for better diversity
    const fetchTasks = [];
    
    // 1. Solana Tracker trending (primary source)
    fetchTasks.push(
      callSolanaTrackerAPI(`/tokens/trending/1h`).catch(err => {
        logger.warn('Solana Tracker trending failed:', err);
        return null;
      })
    );
    
    // 2. Pump.fun trending (secondary source for fresh tokens)
    fetchTasks.push(
      fetch(`${API_CONFIG.PUMP_FUN_URL}/coins?limit=${PAGINATION.PUMP_FUN_FETCH_LIMIT}&offset=0`, {
        headers: { 'User-Agent': API_CONFIG.USER_AGENT }
      })
      .then(res => res.ok ? res.json() : null)
      .catch(err => {
        logger.warn('Pump.fun API failed:', err);
        return null;
      })
    );

    const [trendingData, pumpFunData] = await Promise.all(fetchTasks);

    let allTokens: StandardizedToken[] = [];

    // Process Solana Tracker data (70% weight)
    if (trendingData && Array.isArray(trendingData) && trendingData.length > 0) {
      const tokenLimit = Math.ceil(limit * TOKEN_SOURCE_WEIGHTS.SOLANA_TRACKER);
      const transformedTokens = trendingData
        .slice(0, tokenLimit)
        .map((token: any) => transformSolanaTrackerToken(token, 'solana-tracker'));
      allTokens = allTokens.concat(transformedTokens);
    }

    // Process Pump.fun data (30% weight) - add fresh meme coins
    if (pumpFunData && Array.isArray(pumpFunData) && pumpFunData.length > 0) {
      const tokenLimit = Math.ceil(limit * TOKEN_SOURCE_WEIGHTS.PUMP_FUN);
      const filteredTokens = filterPumpFunTokens(pumpFunData, TOKEN_FILTERS.MIN_MARKET_CAP);
      const transformedTokens = filteredTokens
        .slice(0, tokenLimit)
        .map((token: any) => transformPumpFunToken(token, TOKEN_FILTERS.DEFAULT_SOL_PRICE));
      allTokens = allTokens.concat(transformedTokens);
    }

    // Deduplicate and sort
    const uniqueTokens = deduplicateTokens(allTokens);
    const finalTokens = sortByTrendScore(uniqueTokens).slice(0, limit);

    if (finalTokens.length > 0) {
      const responseData = {
        tokens: finalTokens,
        total: finalTokens.length,
        sources: {
          'solana-tracker': finalTokens.filter(t => t.source === 'solana-tracker').length,
          'pump.fun': finalTokens.filter(t => t.source === 'pump.fun').length
        },
        enhanced: true
      };
      
      trendingCache.set(cacheKey, responseData, CACHE_TTL.STANDARD);

      return res.json({
        success: true,
        data: responseData
      });
    }

    try {
      // Fallback: Try latest tokens endpoint
      logger.info('Fetching latest tokens from Solana Tracker as fallback');
      const latestData = await callSolanaTrackerAPI(`/tokens/latest?limit=${limit}`);

      if (latestData && Array.isArray(latestData) && latestData.length > 0) {
        const transformedTokens = latestData.map((token: any) => ({
          ...transformSolanaTrackerToken(token, 'solana-tracker-latest'),
          trendScore: DEFAULT_TREND_SCORES.LATEST
        }));

        const responseData = {
          tokens: transformedTokens,
          total: transformedTokens.length,
          source: 'solana-tracker-latest'
        };
        
        trendingCache.set(cacheKey, responseData, CACHE_TTL.FALLBACK);

        return res.json({
          success: true,
          data: responseData
        });
      }
    } catch (error) {
      logger.warn('Solana Tracker latest tokens failed:', error);
    }

    // Final fallback: Provide some popular Solana tokens with proper data
    logger.info('Using hardcoded popular Solana tokens as final fallback');
    const fallbackTokens: StandardizedToken[] = [
      {
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        price: 235,
        priceChange24h: 2.5,
        priceChangePercent24h: 2.5,
        volume24h: 15000000,
        marketCap: 110000000000,
        imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        lastUpdated: new Date().toISOString(),
        trendScore: DEFAULT_TREND_SCORES.ESTABLISHED
      },
      {
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenSymbol: 'USDC',
        tokenName: 'USD Coin',
        price: 1.00,
        priceChange24h: 0.01,
        priceChangePercent24h: 0.01,
        volume24h: 8500000,
        marketCap: 37000000000,
        imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        lastUpdated: new Date().toISOString(),
        trendScore: 8.8
      },
      {
        tokenAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        tokenSymbol: 'mSOL',
        tokenName: 'Marinade SOL',
        price: 267,
        priceChange24h: 3.2,
        priceChangePercent24h: 3.2,
        volume24h: 2100000,
        marketCap: 1200000000,
        imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
        lastUpdated: new Date().toISOString(),
        trendScore: 8.2
      },
      {
        tokenAddress: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
        tokenSymbol: 'WIF',
        tokenName: 'dogwifhat',
        price: 2.45,
        priceChange24h: -0.8,
        priceChangePercent24h: -0.8,
        volume24h: 45000000,
        marketCap: 2400000000,
        imageUrl: 'https://bafkreibk3covs5ltyqxa272gzertyptif6w2xwy2bh2yjjtgs5gwsm7nvm.ipfs.nftstorage.link/',
        lastUpdated: new Date().toISOString(),
        trendScore: 8.7
      },
      {
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        price: 0.000032,
        priceChange24h: 5.6,
        priceChangePercent24h: 5.6,
        volume24h: 12000000,
        marketCap: 2800000000,
        imageUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
        lastUpdated: new Date().toISOString(),
        trendScore: 7.9
      }
    ];

    const responseData = {
      tokens: fallbackTokens.slice(0, limit),
      total: fallbackTokens.slice(0, limit).length,
      source: 'fallback',
      note: 'Using fallback data - Solana Tracker API unavailable'
    };

    trendingCache.set(cacheKey, responseData, CACHE_TTL.ERROR_FALLBACK);

    return res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Solana Tracker trending endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific token information from Solana Tracker
 */
router.get('/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `solana-tracker-token-${address}`;

    // Check cache first
    const cached = trendingCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        source: 'cache'
      });
    }

    const tokenData = await callSolanaTrackerAPI(`/tokens/${address}`);

    if (tokenData) {
      const transformedToken = transformSolanaTrackerToken(tokenData, 'solana-tracker');

      trendingCache.set(cacheKey, transformedToken, CACHE_TTL.STANDARD);

      return res.json({
        success: true,
        data: transformedToken
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Token not found'
    });

  } catch (error) {
    logger.error('Solana Tracker token endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch token information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;