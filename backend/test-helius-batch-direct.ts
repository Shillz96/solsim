/**
 * Direct test of Helius getAssetBatch API to verify response format
 */
import fetch from 'node-fetch';

async function testHeliusBatchDirect() {
  console.log('🧪 Testing Helius getAssetBatch API directly...\n');

  const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

  const testTokens = [
    'H1R9HvnBsTnAAxAtUr7RHRYRrv3Sq5wVRTH3pbzKCkxG', // Opta
    '77SDHo2kgfNiYbR4bCPLLaDtjZ22ucTPsD3zFRB5c3Gu', // TRANSFORMATION AI
  ];

  console.log(`📍 Using RPC URL: ${rpcUrl.split('?')[0]}`);
  console.log(`📦 Testing with ${testTokens.length} tokens\n`);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test',
        method: 'getAssetBatch',
        params: {
          ids: testTokens
        }
      })
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    console.log('\n📄 Response structure:');
    console.log(`  - has error: ${!!data.error}`);
    console.log(`  - has result: ${!!data.result}`);
    console.log(`  - result is array: ${Array.isArray(data.result)}`);
    console.log(`  - result length: ${data.result?.length || 0}`);

    if (data.error) {
      console.log(`\n❌ Error: ${JSON.stringify(data.error, null, 2)}`);
      process.exit(1);
    }

    if (data.result && Array.isArray(data.result)) {
      console.log(`\n✅ Got ${data.result.length} results`);
      data.result.forEach((asset: any, index: number) => {
        console.log(`\n📍 Asset ${index + 1}:`);
        console.log(`  ID: ${asset?.id || 'N/A'}`);
        console.log(`  Name: ${asset?.content?.metadata?.name || 'N/A'}`);
        console.log(`  Symbol: ${asset?.content?.metadata?.symbol || 'N/A'}`);
      });
    }

    console.log('\n✅ Direct API test completed!');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

testHeliusBatchDirect();
