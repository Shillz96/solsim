const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Secret key from HOURLY_REWARD_WALLET_SECRET
const secretKeyArray = [104,219,76,26,214,46,132,245,63,44,157,186,120,98,157,133,198,155,35,240,226,96,181,51,115,107,191,172,137,155,36,108,159,170,134,244,24,8,74,34,75,206,146,193,243,21,212,90,152,12,138,56,195,93,150,44,197,104,255,50,66,34,113,203];

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
