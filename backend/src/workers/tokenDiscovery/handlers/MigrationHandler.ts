/**
 * Migration Event Handler
 *
 * Handles migration events from PumpPortal stream
 * Manages token state transitions during migration (bonded → graduating → bonded)
 * Extracted from tokenDiscoveryWorker.ts (lines 871-923)
 */

import { loggers, truncateWallet } from '../../../utils/logger.js';
import { IEventHandler, MigrationEventData, WorkerDependencies } from '../types.js';

const logger = loggers.server;

export class MigrationHandler implements IEventHandler<MigrationEventData> {
  constructor(private deps: WorkerDependencies) {}

  async handle(event: MigrationEventData): Promise<void> {
    try {
      const { mint, data } = event;
      const { status, poolAddress, poolType } = data;

      logger.info({
        mint: truncateWallet(mint),
        status,
        poolType
      }, 'Token migration event');

      // Fetch current token state
      const currentToken = await this.deps.prisma.tokenDiscovery.findUnique({
        where: { mint },
      });

      if (!currentToken) {
        logger.warn({ mint: truncateWallet(mint) }, 'Migration event for unknown token');
        return;
      }

      let newState: string;

      if (status === 'initiated') {
        // bonded → graduating
        newState = 'graduating';
      } else if (status === 'completed') {
        // graduating → bonded (has LP now)
        newState = 'bonded';

        // Buffer pool data update (batch sync to DB later)
        await this.deps.bufferManager.bufferToken({
          mint,
          poolAddress: poolAddress || null,
          poolType: poolType || 'pumpswap',
          poolCreatedAt: new Date(),
        });
      } else {
        logger.warn({ status }, 'Unknown migration status');
        return;
      }

      // Update state
      await this.deps.stateManager.updateState(mint, newState, currentToken.state);

      // Notify watchers
      await this.deps.stateManager.notifyWatchers(mint, currentToken.state, newState);
    } catch (error) {
      logger.error({ error }, 'Error handling migration event');
    }
  }
}
