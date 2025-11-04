const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Base58 private key from user
const base58PrivateKey = '39V5hmQXwwTAKAYZH81onv8aCUoUb63ZNa6S95BDtoQC3dWDFdeDZgY334XZe29zf1Zqbaygjwz7fZ3Zt8xGoN9U';
const expectedPublicKey = '7JdddM5CgzsGMpR1cqMcm4jZfm9WDTX6SWwBvSKfZdrN';

// Decode base58 to byte array
const secretKeyBytes = bs58.decode ? bs58.decode(base58PrivateKey) : bs58.default.decode(base58PrivateKey);
const secretKeyArray = Array.from(secretKeyBytes);

// Create keypair to verify
const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

console.log('\n=== New Distribution Wallet Details ===\n');
console.log('Public Address:', keypair.publicKey.toBase58());
console.log('Expected Address:', expectedPublicKey);
console.log('Match:', keypair.publicKey.toBase58() === expectedPublicKey ? '✅ YES' : '❌ NO');
console.log('\nPrivate Key (Base58 - for Phantom import):');
console.log(base58PrivateKey);
console.log('\nPrivate Key (JSON Array - for Railway REWARDS_WALLET_SECRET):');
console.log(JSON.stringify(secretKeyArray));
console.log('\n=== Update Instructions ===');
console.log('1. Copy the JSON array above');
console.log('2. Update Railway environment variable: REWARDS_WALLET_SECRET=[...]');
console.log('3. Restart the backend service');
console.log('\nSolscan:', 'https://solscan.io/account/' + keypair.publicKey.toBase58());
console.log('');
