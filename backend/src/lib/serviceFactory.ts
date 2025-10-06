import { PriceService } from '../services/priceService';
import { MetadataService } from '../services/metadataService';
import { PortfolioService } from '../services/portfolioService';
import { TradeService } from '../services/tradeService';
import { TrendingService } from '../services/trendingService';

/**
 * Service Factory for proper dependency injection
 * Ensures single instances and proper initialization order
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private _priceService?: PriceService;
  private _metadataService?: MetadataService;
  private _portfolioService?: PortfolioService;
  private _tradeService?: TradeService;
  private _trendingService?: TrendingService;
  
  private constructor() {}
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  get priceService(): PriceService {
    if (!this._priceService) {
      this._priceService = new PriceService();
    }
    return this._priceService;
  }
  
  get metadataService(): MetadataService {
    if (!this._metadataService) {
      this._metadataService = new MetadataService();
    }
    return this._metadataService;
  }
  
  get portfolioService(): PortfolioService {
    if (!this._portfolioService) {
      this._portfolioService = new PortfolioService();
    }
    return this._portfolioService;
  }
  
  get tradeService(): TradeService {
    if (!this._tradeService) {
      this._tradeService = new TradeService(this.priceService);
    }
    return this._tradeService;
  }
  
  get trendingService(): TrendingService {
    if (!this._trendingService) {
      this._trendingService = new TrendingService(this.priceService);
    }
    return this._trendingService;
  }
  
  /**
   * Initialize trade service with broadcast functions
   */
  initializeTradeService(broadcastFunctions: any): void {
    this._tradeService = new TradeService(this.priceService);
  }
}

export const serviceFactory = ServiceFactory.getInstance();