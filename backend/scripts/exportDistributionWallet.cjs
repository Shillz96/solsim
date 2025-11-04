const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Secret key from REWARDS_WALLET_SECRET (updated 2025-11-03)
// Wallet: 7JdddM5CgzsGMpR1cqMcm4jZfm9WDTX6SWwBvSKfZdrN
const secretKeyArray = [107,89,180,143,120,131,16,77,192,224,82,114,110,41,216,111,130,48,250,67,10,107,9,77,19,3,252,153,158,126,82,82,93,170,106,40,32,135,83,48,142,185,234,31,196,69,173,76,197,239,203,76,157,196,247,221,202,202,158,22,203,55,185,159];

const secretKey = new Uint8Array(secretKeyArray);
const keypair = Keypair.fromSecretKey(secretKey);

// Encode to base58 - bs58 v6 exports encode function directly
const base58Key = bs58.encode ? bs58.encode(Buffer.from(secretKey)) : bs58.default.encode(Buffer.from(secretKey));

console.log('\n=== Distribution Wallet Details ===\n');
console.log('Public Address:', keypair.publicKey.toBase58());
console.log('\nPrivate Key (Base58 - for Phantom import):');
console.log(base58Key);
console.log('\nPrivate Key (JSON Array - for Railway):');
console.log(JSON.stringify(secretKeyArray));
console.log('\n=== Import to Phantom ===');
console.log('1. Open Phantom wallet');
console.log('2. Click Settings → Add / Connect Wallet');
console.log('3. Click "Import Private Key"');
console.log('4. Paste the Base58 private key above');
console.log('5. Click Import\n');
console.log('Solscan:', 'https://solscan.io/account/' + keypair.publicKey.toBase58());
console.log('');
