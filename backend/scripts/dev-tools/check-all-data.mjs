#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllData() {
  console.log('🔍 Checking ALL database data...');
  
  try {
    console.log('\n👥 All Users:');
    const users = await prisma.user.findMany();
    users.forEach(user => {
      console.log(`  - ${user.id} (${user.username}) - Balance: ${user.virtualSolBalance}`);
    });
    
    console.log('\n💼 All Holdings:');
    const holdings = await prisma.holding.findMany();
    holdings.forEach(holding => {
      console.log(`  - User: ${holding.userId}, Token: ${holding.tokenSymbol}, Qty: ${holding.quantity}`);
    });
    
    console.log('\n📊 All Trades:');
    const trades = await prisma.trade.findMany();
    trades.forEach(trade => {
      console.log(`  - User: ${trade.userId}, ${trade.action} ${trade.quantity} ${trade.tokenSymbol}`);
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Holdings: ${holdings.length}`);
    console.log(`  - Trades: ${trades.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();