import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'

const prisma = new PrismaClient()

async function fixTradeData() {
  console.log('🔧 Starting trade data fix...')

  try {
    // Get all trades that need fixing
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          // Sell trades without proceedsUsd
          {
            action: 'sell',
            proceedsUsd: null,
            netSol: { not: null },
            solUsdAtFill: { not: null }
          },
          // Buy trades without costUsd
          {
            action: 'buy',
            costUsd: null,
            netSol: { not: null },
            solUsdAtFill: { not: null }
          }
        ]
      }
    })

    console.log(`📊 Found ${trades.length} trades to fix`)

    let fixed = 0
    let errors = 0

    for (const trade of trades) {
      try {
        const updateData: any = {}

        // Fix proceedsUsd for sell trades
        if (trade.action === 'sell' && !trade.proceedsUsd && trade.netSol && trade.solUsdAtFill) {
          const netSol = new Decimal(trade.netSol.toString())
          const solUsd = new Decimal(trade.solUsdAtFill.toString())
          updateData.proceedsUsd = netSol.mul(solUsd).toDecimalPlaces(2)
        }

        // Fix costUsd for buy trades
        if (trade.action === 'buy' && !trade.costUsd && trade.netSol && trade.solUsdAtFill) {
          const netSol = new Decimal(trade.netSol.toString())
          const solUsd = new Decimal(trade.solUsdAtFill.toString())
          updateData.costUsd = netSol.mul(solUsd).toDecimalPlaces(2)
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.trade.update({
            where: { id: trade.id },
            data: updateData
          })
          fixed++

          if (fixed % 100 === 0) {
            console.log(`✅ Fixed ${fixed} trades...`)
          }
        }
      } catch (error) {
        console.error(`❌ Error fixing trade ${trade.id}:`, error)
        errors++
      }
    }

    console.log(`\n✨ Complete!`)
    console.log(`✅ Fixed: ${fixed}`)
    console.log(`❌ Errors: ${errors}`)

  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTradeData()
