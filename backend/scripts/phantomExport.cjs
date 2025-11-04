const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Secret key from HOURLY_REWARD_WALLET_SECRET
const secretKeyArray = [104,219,76,26,214,46,132,245,63,44,157,186,120,98,157,133,198,155,35,240,226,96,181,51,115,107,191,172,137,155,36,108,159,170,134,244,24,8,74,34,75,206,146,193,243,21,212,90,152,12,138,56,195,93,150,44,197,104,255,50,66,34,113,203];

const secretKey = new Uint8Array(secretKeyArray);
const keypair = Keypair.fromSecretKey(secretKey);

console.log('\n════════════════════════════════════════════════════════════');
console.log('   DISTRIBUTION WALLET - PHANTOM IMPORT FORMATS');
console.log('════════════════════════════════════════════════════════════\n');

console.log('Public Address:');
console.log(keypair.publicKey.toBase58());
console.log('');

console.log('─────────────────────────────────────────────────────────────');
console.log('FORMAT 1: Full Private Key (Base58) - 64 bytes');
console.log('─────────────────────────────────────────────────────────────');
const fullBase58 = bs58.encode(Buffer.from(secretKey));
console.log(fullBase58);
console.log(`Length: ${fullBase58.length} characters`);
console.log('');

console.log('─────────────────────────────────────────────────────────────');
console.log('FORMAT 2: JSON Array (copy entire line)');
console.log('─────────────────────────────────────────────────────────────');
console.log(JSON.stringify(Array.from(secretKey)));
console.log('');

console.log('─────────────────────────────────────────────────────────────');
console.log('FORMAT 3: Comma-separated (no brackets)');
console.log('─────────────────────────────────────────────────────────────');
console.log(Array.from(secretKey).join(','));
console.log('');

console.log('════════════════════════════════════════════════════════════');
console.log('   PHANTOM IMPORT INSTRUCTIONS');
console.log('════════════════════════════════════════════════════════════\n');
console.log('Try these in order:\n');
console.log('1. Use FORMAT 1 (Base58 string)');
console.log('   - Open Phantom → Settings → Add Wallet → Import Private Key');
console.log('   - Paste the Base58 string above\n');
console.log('2. If that fails, try FORMAT 2 (JSON Array)');
console.log('   - Some wallets accept the full JSON array format\n');
console.log('3. Alternative: Import via seed phrase');
console.log('   - Phantom may prefer seed phrase over private key');
console.log('   - Use a tool like solana-keygen to convert if needed\n');
console.log('════════════════════════════════════════════════════════════\n');
