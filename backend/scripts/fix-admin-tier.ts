/**
 * Fix Admin User Tier
 * 
 * Sets the admin@admin.com user to ADMINISTRATOR tier
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAdminTier() {
  try {
    console.log('🔍 Looking for admin@admin.com user...')
    
    const user = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      select: { id: true, email: true, userTier: true, emailVerified: true }
    })

    if (!user) {
      console.log('❌ User admin@admin.com not found!')
      console.log('Please create this user first by signing up.')
      return
    }

    console.log('📋 Current user status:')
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Tier: ${user.userTier}`)
    console.log(`  Email Verified: ${user.emailVerified}`)
    console.log('')

    if (user.userTier === 'ADMINISTRATOR' && user.emailVerified) {
      console.log('✅ User is already an admin with verified email!')
      return
    }

    console.log('🔧 Updating user to ADMINISTRATOR...')
    
    const updated = await prisma.user.update({
      where: { email: 'admin@admin.com' },
      data: {
        userTier: 'ADMINISTRATOR',
        emailVerified: true
      },
      select: { id: true, email: true, userTier: true, emailVerified: true }
    })

    console.log('✅ Update successful!')
    console.log('📋 New user status:')
    console.log(`  ID: ${updated.id}`)
    console.log(`  Email: ${updated.email}`)
    console.log(`  Tier: ${updated.userTier}`)
    console.log(`  Email Verified: ${updated.emailVerified}`)
    console.log('')
    console.log('🔐 Please log out and log back in for changes to take effect.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminTier()
