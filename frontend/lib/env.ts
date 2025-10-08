import { z } from "zod"

/**
 * Environment Variable Schema
 * Validates all required environment variables at runtime
 * Prevents undefined env vars from causing runtime errors
 */
const envSchema = z.object({
  // Public environment variables (accessible in browser)
  NEXT_PUBLIC_API_URL: z.string().url().describe("Backend API URL"),
  NEXT_PUBLIC_WS_URL: z.string().url().describe("WebSocket URL for real-time data"),
  
  // Optional public variables
  NEXT_PUBLIC_SOLANA_NETWORK: z
    .enum(["mainnet-beta", "devnet", "testnet"])
    .default("devnet")
    .describe("Solana network to connect to"),
  
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === "true")
    .default("false")
    .describe("Enable Vercel Analytics"),

  // Node environment (server-side only, not prefixed with NEXT_PUBLIC_)
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

/**
 * Validated environment variables
 * Type-safe access to all environment variables
 * Throws error at build/startup if validation fails
 */
const parseEnv = () => {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
      NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
      NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
      NODE_ENV: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error("❌ Invalid environment variables:", error)
    throw new Error(
      `Environment validation failed. Please check your .env.local file.\n${
        error instanceof z.ZodError
          ? error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n")
          : error
      }`
    )
  }
}

export const env = parseEnv()

/**
 * Type-safe environment variable access
 * Use this instead of process.env.* throughout the app
 */
export type Env = z.infer<typeof envSchema>

