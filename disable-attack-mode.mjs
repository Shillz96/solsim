#!/usr/bin/env node

// Disable Vercel Attack Challenge Mode
// This script uses the Vercel API to turn off the 429 rate limiting that's blocking social media crawlers

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_u0P5f0vU6WWi8HgtmGO3w2yRMPrE';
const TEAM_ID = 'team_xmPleNiA0JYtKnJ5ZqTMhF9A';

if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN environment variable not set');
  console.error('Get your token from: https://vercel.com/account/tokens');
  console.error('Then run: $env:VERCEL_TOKEN="your_token_here"; node disable-attack-mode.mjs');
  process.exit(1);
}

async function disableAttackMode() {
  console.log('🔧 Disabling Vercel Attack Challenge Mode...');
  
  try {
    const response = await fetch(
      `https://api.vercel.com/v1/security/attack-mode?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          attackModeEnabled: false,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      process.exit(1);
    }

    console.log('✅ Success! Attack Challenge Mode disabled');
    console.log('📊 Status:', JSON.stringify(data, null, 2));
    console.log('\n⏳ Wait 2-3 minutes for changes to propagate');
    console.log('\n🧪 Then test with:');
    console.log('   curl -A "facebookexternalhit/1.1" -I https://oneupsol.fun/og-banner.png');
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

disableAttackMode();
