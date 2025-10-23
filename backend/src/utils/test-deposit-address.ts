/**
 * Quick test script for deposit address generation
 * Run with: npx tsx src/utils/test-deposit-address.ts
 */

import { generateDepositAddress, formatAddressForDisplay, validateDepositAddress } from './depositAddressGenerator.js';

const testPlatformSeed = 'test-seed-for-development-minimum-32-chars-long';
const testUserId = 'test-user-123';

console.log('🧪 Testing Deposit Address Generation\n');

// Test 1: Generate address
console.log('1️⃣ Generating deposit address...');
const address1 = generateDepositAddress(testUserId, testPlatformSeed);
console.log(`   Address: ${address1.toBase58()}`);
console.log(`   Short: ${formatAddressForDisplay(address1)}`);

// Test 2: Deterministic (same inputs = same address)
console.log('\n2️⃣ Testing deterministic generation...');
const address2 = generateDepositAddress(testUserId, testPlatformSeed);
const matches = address1.equals(address2);
console.log(`   Match: ${matches ? '✅ PASS' : '❌ FAIL'}`);

// Test 3: Different users = different addresses
console.log('\n3️⃣ Testing unique addresses per user...');
const address3 = generateDepositAddress('different-user', testPlatformSeed);
const different = !address1.equals(address3);
console.log(`   Different: ${different ? '✅ PASS' : '❌ FAIL'}`);

// Test 4: Validation
console.log('\n4️⃣ Testing address validation...');
const isValid = validateDepositAddress(testUserId, address1, testPlatformSeed);
const isInvalid = !validateDepositAddress('wrong-user', address1, testPlatformSeed);
console.log(`   Valid for correct user: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Invalid for wrong user: ${isInvalid ? '✅ PASS' : '❌ FAIL'}`);

console.log('\n✨ All tests completed!\n');
