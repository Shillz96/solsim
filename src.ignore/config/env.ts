import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredEnvVars = ['HELIUS_API_KEY', 'WALLET_ADDRESS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    'Please copy .env.example to .env and fill in your values.'
  );
}

export const config = {
  HELIUS_API_KEY: process.env.HELIUS_API_KEY as string,
  WALLET_ADDRESS: process.env.WALLET_ADDRESS as string,
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  HELIUS_RPC_URL: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
  HELIUS_API_URL: 'https://api.helius.xyz/v0',
};

export default config;
