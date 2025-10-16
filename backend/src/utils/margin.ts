// Margin calculation utilities for perpetual trading
import { Decimal } from "@prisma/client/runtime/library";

export const D = (x: Decimal | number | string) => new Decimal(x);

// Constants for margin calculations
export const MAINTENANCE_MARGIN_RATIO = D(0.05); // 5% maintenance margin
export const INITIAL_MARGIN_RATIO = D(0.10); // 10% initial margin for 10x leverage

/**
 * Calculate initial margin required for a position
 * @param positionSize - Size of position in token quantity
 * @param price - Token price in USD
 * @param leverage - Leverage multiplier (2, 5, 10, 20)
 * @returns Required margin in USD
 */
export function calculateInitialMargin(
  positionSize: Decimal,
  price: Decimal,
  leverage: Decimal
): Decimal {
  const positionValue = positionSize.mul(price);
  return positionValue.div(leverage);
}

/**
 * Calculate liquidation price for a LONG position
 * @param entryPrice - Entry price of position
 * @param leverage - Leverage multiplier
 * @param maintenanceMarginRatio - Maintenance margin ratio (default 5%)
 * @returns Liquidation price
 */
export function calculateLiquidationPriceLong(
  entryPrice: Decimal,
  leverage: Decimal,
  maintenanceMarginRatio: Decimal = MAINTENANCE_MARGIN_RATIO
): Decimal {
  // For LONG: liquidationPrice = entryPrice * (1 - (1/leverage) + maintenanceMarginRatio)
  const leverageFactor = D(1).div(leverage);
  return entryPrice.mul(D(1).sub(leverageFactor).add(maintenanceMarginRatio));
}

/**
 * Calculate liquidation price for a SHORT position
 * @param entryPrice - Entry price of position
 * @param leverage - Leverage multiplier
 * @param maintenanceMarginRatio - Maintenance margin ratio (default 5%)
 * @returns Liquidation price
 */
export function calculateLiquidationPriceShort(
  entryPrice: Decimal,
  leverage: Decimal,
  maintenanceMarginRatio: Decimal = MAINTENANCE_MARGIN_RATIO
): Decimal {
  // For SHORT: liquidationPrice = entryPrice * (1 + (1/leverage) - maintenanceMarginRatio)
  const leverageFactor = D(1).div(leverage);
  return entryPrice.mul(D(1).add(leverageFactor).sub(maintenanceMarginRatio));
}

/**
 * Calculate unrealized PnL for a position
 * @param side - 'LONG' or 'SHORT'
 * @param entryPrice - Entry price of position
 * @param currentPrice - Current market price
 * @param positionSize - Position size in token quantity
 * @returns Unrealized PnL in USD
 */
export function calculateUnrealizedPnL(
  side: "LONG" | "SHORT",
  entryPrice: Decimal,
  currentPrice: Decimal,
  positionSize: Decimal
): Decimal {
  if (side === "LONG") {
    // PnL = (currentPrice - entryPrice) * positionSize
    return currentPrice.sub(entryPrice).mul(positionSize);
  } else {
    // PnL = (entryPrice - currentPrice) * positionSize
    return entryPrice.sub(currentPrice).mul(positionSize);
  }
}

/**
 * Calculate margin ratio for a position
 * @param marginAmount - Current margin (initial margin + unrealized PnL)
 * @param positionValue - Current position value (currentPrice * positionSize)
 * @param leverage - Leverage multiplier
 * @returns Margin ratio (higher is safer)
 */
export function calculateMarginRatio(
  marginAmount: Decimal,
  positionValue: Decimal,
  leverage: Decimal
): Decimal {
  if (positionValue.eq(0)) return D(0);

  // Margin ratio = (margin / positionValue) / maintenanceMarginRatio
  // If ratio < 1.0, position should be liquidated
  const currentMarginPercent = marginAmount.div(positionValue);
  return currentMarginPercent.div(MAINTENANCE_MARGIN_RATIO);
}

/**
 * Calculate current margin balance (initial margin + unrealized PnL)
 * @param initialMargin - Initial margin deposited
 * @param unrealizedPnL - Current unrealized profit/loss
 * @returns Current margin balance
 */
export function calculateMarginBalance(
  initialMargin: Decimal,
  unrealizedPnL: Decimal
): Decimal {
  return initialMargin.add(unrealizedPnL);
}

/**
 * Check if position should be liquidated
 * @param marginBalance - Current margin balance
 * @param positionValue - Current position value
 * @returns true if position should be liquidated
 */
export function shouldLiquidate(
  marginBalance: Decimal,
  positionValue: Decimal
): boolean {
  if (positionValue.eq(0)) return false;

  const maintenanceMargin = positionValue.mul(MAINTENANCE_MARGIN_RATIO);
  return marginBalance.lte(maintenanceMargin);
}

/**
 * Calculate trading fees for perpetual position
 * @param positionValue - Position value in USD
 * @param feeRate - Fee rate as decimal (default 0.001 = 0.1%)
 * @returns Trading fee in USD
 */
export function calculatePerpFee(
  positionValue: Decimal,
  feeRate: Decimal = D(0.001)
): Decimal {
  return positionValue.mul(feeRate);
}

/**
 * Calculate ROE (Return on Equity) percentage
 * @param pnl - Profit/Loss
 * @param initialMargin - Initial margin invested
 * @returns ROE as percentage
 */
export function calculateROE(
  pnl: Decimal,
  initialMargin: Decimal
): Decimal {
  if (initialMargin.eq(0)) return D(0);
  return pnl.div(initialMargin).mul(100);
}

/**
 * Validate leverage value
 * @param leverage - Leverage to validate
 * @returns true if valid
 */
export function isValidLeverage(leverage: number): boolean {
  const validLeverages = [2, 5, 10, 20];
  return validLeverages.includes(leverage);
}

/**
 * Calculate maximum position size given margin and leverage
 * @param marginAmount - Available margin in USD
 * @param price - Token price in USD
 * @param leverage - Leverage multiplier
 * @returns Maximum position size in token quantity
 */
export function calculateMaxPositionSize(
  marginAmount: Decimal,
  price: Decimal,
  leverage: Decimal
): Decimal {
  if (price.eq(0)) return D(0);

  // maxPositionValue = margin * leverage
  const maxPositionValue = marginAmount.mul(leverage);
  return maxPositionValue.div(price);
}
