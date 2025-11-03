const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

const base58PrivateKey = '4Xw4748238AmKXZP141JRE2r6ujkUvPWvmKTJrpvEN9823Mo8Uyc5Pe3r449qAm4iVgMUggh2XhkMEhZ2cHWC1as';

try {
  // Decode base58 to Uint8Array
  const decoded = bs58.default ? bs58.default.decode(base58PrivateKey) : bs58.decode(base58PrivateKey);

  console.log('Decoded length:', decoded.length);

  // Convert to regular array
  const secretKeyArray = Array.from(decoded);

  console.log('\n=== Wallet Conversion Results ===\n');
  console.log('Secret Key Length:', secretKeyArray.length);
  console.log('\nSecret Key JSON (copy this for Railway):');
  console.log(JSON.stringify(secretKeyArray));

  // Get the public key
  const keypair = Keypair.fromSecretKey(decoded);
  const publicKey = keypair.publicKey.toBase58();

  console.log('\nPublic Address:', publicKey);
  console.log('Solscan Link: https://solscan.io/account/' + publicKey);

  console.log('\n=== Railway Command ===\n');
  console.log('railway variables set HOURLY_REWARD_WALLET_SECRET=\'' + JSON.stringify(secretKeyArray) + '\'');

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
