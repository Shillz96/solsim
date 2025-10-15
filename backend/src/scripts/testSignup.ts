// Test script to verify the signup flow works end-to-end
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Use Railway backend URL directly, not the frontend URL
const API_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'https://solsim-production.up.railway.app';

async function testSignup() {
  console.log('🧪 Testing Signup Flow...\n');
  console.log(`📡 API URL: ${API_URL}/api/auth/signup-email\n`);

  // Generate a unique test email
  const randomId = crypto.randomBytes(4).toString('hex');
  const testUser = {
    email: `test-${randomId}@test.com`,
    password: 'TestPass123!',
    username: `testuser${randomId}`
  };

  console.log('📋 Test User Data:');
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Username: ${testUser.username}`);
  console.log(`   Password: ${testUser.password}`);
  console.log('');

  try {
    console.log('📤 Sending signup request...');

    const response = await fetch(`${API_URL}/api/auth/signup-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get('content-type');
    console.log(`📦 Content-Type: ${contentType}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Signup Failed!');
      console.log('Error Response:', errorText);

      try {
        const errorJson = JSON.parse(errorText);
        console.log('\n🔍 Parsed Error:');
        console.log(JSON.stringify(errorJson, null, 2));
      } catch {
        console.log('\n🔍 Raw Error:');
        console.log(errorText);
      }

      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Signup Successful!');
    console.log('\n📊 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    // Verify response structure
    console.log('\n🔍 Validation:');

    if (data.userId) {
      console.log('   ✅ userId present:', data.userId);
    } else {
      console.log('   ❌ userId missing!');
    }

    if (data.accessToken) {
      console.log('   ✅ accessToken present:', data.accessToken.substring(0, 20) + '...');
    } else {
      console.log('   ❌ accessToken missing!');
    }

    if (data.refreshToken) {
      console.log('   ✅ refreshToken present:', data.refreshToken.substring(0, 20) + '...');
    } else {
      console.log('   ❌ refreshToken missing!');
    }

    if (data.user) {
      console.log('   ✅ user object present');
      console.log(`      - email: ${data.user.email}`);
      console.log(`      - userTier: ${data.user.userTier}`);
      console.log(`      - emailVerified: ${data.user.emailVerified}`);
      console.log(`      - virtualSolBalance: ${data.user.virtualSolBalance}`);
    } else {
      console.log('   ❌ user object missing!');
    }

    console.log('\n🎉 Signup test completed successfully!');
    console.log('\n💡 Note: This created a real user account. You may want to clean it up from your database.');
    console.log(`   User ID: ${data.userId}`);
    console.log(`   Email: ${testUser.email}`);

  } catch (error: any) {
    console.error('\n❌ Test Failed with Exception:');
    console.error('Error:', error.message);

    if (error.cause) {
      console.error('Cause:', error.cause);
    }

    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the test
testSignup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
