/**
 * Generate Reward Wallet for Hourly Rewards System
 *
 * This script generates a new Solana keypair for distributing hourly rewards
 * and outputs the configuration needed for your .env file.
 *
 * Usage:
 *   node scripts/generateRewardWallet.js
 *
 * SECURITY WARNING:
 * - Keep the secret key PRIVATE and SECURE
 * - Never commit it to git or share it publicly
 * - Use Railway secrets or similar secure storage for production
 * - Fund this wallet with enough SOL to cover reward distributions
 */

import { Keypair } from "@solana/web3.js";

console.log("\n" + "=".repeat(80));
console.log("🎰 HOURLY REWARDS WALLET GENERATOR");
console.log("=".repeat(80) + "\n");

// Generate new keypair
const keypair = Keypair.generate();

// Get public and secret keys
const publicKey = keypair.publicKey.toBase58();
const secretKeyArray = Array.from(keypair.secretKey);
const secretKeyJSON = JSON.stringify(secretKeyArray);

// Display results
console.log("✅ New reward wallet generated successfully!\n");

console.log("📋 ADD TO YOUR .ENV FILE:");
console.log("-".repeat(80));
console.log(`HOURLY_REWARD_WALLET_SECRET=${secretKeyJSON}`);
console.log("-".repeat(80) + "\n");

console.log("💰 WALLET DETAILS:");
console.log("-".repeat(80));
console.log(`Public Address: ${publicKey}`);
console.log(`Secret Key Length: ${secretKeyArray.length} bytes`);
console.log("-".repeat(80) + "\n");

console.log("⚠️  IMPORTANT SECURITY NOTES:");
console.log("  1. Keep the secret key PRIVATE - never commit to git!");
console.log("  2. Add .env to your .gitignore (it should already be there)");
console.log("  3. For production, use Railway secrets or similar secure storage");
console.log("  4. Fund this wallet with SOL before going live\n");

console.log("💸 FUNDING INSTRUCTIONS:");
console.log("  1. Copy the public address above");
console.log("  2. Send SOL to this address from your main wallet");
console.log("  3. Recommended initial funding: 5-10 SOL for ~100-200 hours of rewards");
console.log("  4. Monitor balance regularly and refund as needed\n");

console.log("🔗 VIEW ON SOLSCAN:");
console.log(`  https://solscan.io/account/${publicKey}\n`);

console.log("✅ Setup complete! Add the HOURLY_REWARD_WALLET_SECRET to your .env file.");
console.log("=".repeat(80) + "\n");
