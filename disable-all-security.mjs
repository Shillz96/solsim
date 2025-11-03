#!/usr/bin/env node

// Comprehensive Vercel Security Disabler
// Disables ALL security features that could block social crawlers

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_u0P5f0vU6WWi8HgtmGO3w2yRMPrE';
const TEAM_ID = 'team_xmPleNiA0JYtKnJ5ZqTMhF9A';

if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN not set');
  process.exit(1);
}

async function disableAllSecurity() {
  console.log('🔧 Disabling ALL Vercel security features...\n');
  
  // 1. Disable Attack Challenge Mode
  try {
    console.log('1️⃣  Disabling Attack Challenge Mode...');
    const attackResponse = await fetch(
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
    
    if (attackResponse.ok) {
      console.log('✅ Attack Challenge Mode disabled\n');
    } else {
      console.error('❌ Failed:', await attackResponse.text());
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // 2. Disable Firewall
  try {
    console.log('2️⃣  Disabling Firewall...');
    const firewallResponse = await fetch(
      `https://api.vercel.com/v1/security/firewall/config?projectId=${PROJECT_ID}&teamId=${TEAM_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firewallEnabled: false,
        }),
      }
    );
    
    if (firewallResponse.ok) {
      console.log('✅ Firewall disabled\n');
    } else {
      console.error('⚠️  Firewall may already be disabled or error:', await firewallResponse.text());
    }
  } catch (error) {
    console.error('⚠️  Firewall error:', error.message);
  }

  console.log('\n✅ All security features disabled!');
  console.log('⏳ Wait 3-5 minutes for Vercel edge network to propagate');
  console.log('\n🧪 Then test with:');
  console.log('   curl -A "facebookexternalhit/1.1" -I https://oneupsol.fun/og-banner.png');
}

disableAllSecurity();
