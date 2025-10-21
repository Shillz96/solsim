// Reward service placeholder
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";

// Initialize reward system configuration from environment variables
let SIM_MINT: PublicKey | null = null;
let REWARDS_WALLET: Keypair | null = null;

// Initialize from environment variables
try {
  if (process.env.VSOL_TOKEN_MINT) {
    SIM_MINT = new PublicKey(process.env.VSOL_TOKEN_MINT);
    console.log('✅ VSOL Token Mint configured:', SIM_MINT.toBase58());
  } else {
    console.warn('⚠️  VSOL_TOKEN_MINT not configured - reward claiming disabled');
  }

  if (process.env.REWARDS_WALLET_SECRET) {
    const secretKeyArray = JSON.parse(process.env.REWARDS_WALLET_SECRET);
    REWARDS_WALLET = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
    console.log('✅ Rewards Wallet configured:', REWARDS_WALLET.publicKey.toBase58());
  } else {
    console.warn('⚠️  REWARDS_WALLET_SECRET not configured - reward claiming disabled');
  }

  // Validate both are set together
  if ((SIM_MINT && !REWARDS_WALLET) || (!SIM_MINT && REWARDS_WALLET)) {
    console.error('❌ Both VSOL_TOKEN_MINT and REWARDS_WALLET_SECRET must be configured together');
    SIM_MINT = null;
    REWARDS_WALLET = null;
  }
} catch (error) {
  console.error('❌ Failed to initialize reward system:', error);
  SIM_MINT = null;
  REWARDS_WALLET = null;
}

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Check if reward system is enabled
export function isRewardSystemEnabled(): boolean {
  return SIM_MINT !== null && REWARDS_WALLET !== null;
}

// --- 1. Add points whenever a trade is made ---
export async function addTradePoints(userId: string, tradeVolumeUsd: Decimal) {
  await prisma.user.update({
    where: { id: userId },
    data: { rewardPoints: { increment: tradeVolumeUsd } }
  });
}

// --- 2. Snapshot epoch & allocate pool ---
export async function snapshotRewards(epoch: number, poolAmount: Decimal) {
  try {
    const users = await prisma.user.findMany({ where: { rewardPoints: { gt: 0 } } });
    
    if (users.length === 0) {
      console.log(`📊 No users with reward points for epoch ${epoch}`);
      return;
    }
    
    const totalPoints = users.reduce((sum: Decimal, u: any) => sum.add(u.rewardPoints as any), new Decimal(0));
    
    if (totalPoints.eq(0)) {
      console.log(`📊 Total points is 0 for epoch ${epoch}`);
      return;
    }

    // Create snapshot record
    await prisma.rewardSnapshot.create({
      data: { epoch, totalPoints, poolAmount }
    });

    console.log(`📊 Created snapshot for epoch ${epoch}: ${users.length} users, ${totalPoints} points, ${poolAmount} VSOL pool`);

    // Record claim entitlements in batch
    const claimData = [];
    for (const u of users) {
      const share = (u.rewardPoints as any as Decimal).div(totalPoints);
      const amount = poolAmount.mul(share);

      if (amount.gt(0) && u.walletAddress) {
        claimData.push({
          userId: u.id,
          epoch,
          wallet: u.walletAddress,
          amount,
          status: "PENDING"
        });
      }
    }
    
    // Batch create claims
    if (claimData.length > 0) {
      await prisma.rewardClaim.createMany({
        data: claimData
      });
      console.log(`📊 Created ${claimData.length} reward claims`);
    }
    
    // Reset points for next round (batch update)
    await prisma.user.updateMany({
      where: { id: { in: users.map((u: any) => u.id) } },
      data: { rewardPoints: new Decimal(0) }
    });
    
    console.log(`📊 Reset reward points for ${users.length} users`);
    
  } catch (error) {
    console.error(`❌ Snapshot failed for epoch ${epoch}:`, error);
    throw error;
  }
}

// --- 3. Claim rewards ---
export async function claimReward(userId: string, epoch: number, wallet: string) {
  // Check if reward system is configured
  if (!SIM_MINT || !REWARDS_WALLET) {
    throw new Error("Reward system not configured. Please set VSOL_TOKEN_MINT and REWARDS_WALLET_SECRET environment variables.");
  }

  const claim = await prisma.rewardClaim.findFirst({
    where: { userId, epoch, claimedAt: null }
  });
  if (!claim) throw new Error("No claimable rewards");

  try {
    const userWallet = new PublicKey(wallet);
    
    // Try to send vSOL tokens first
    try {
      const userAta = await getAssociatedTokenAddress(SIM_MINT, userWallet);
      const rewardsAta = await getAssociatedTokenAddress(SIM_MINT, REWARDS_WALLET.publicKey);
      
      // Check rewards wallet token balance
      const rewardsAtaInfo = await connection.getTokenAccountBalance(rewardsAta);
      const rewardsBalance = parseFloat(rewardsAtaInfo.value.amount) / Math.pow(10, rewardsAtaInfo.value.decimals);
      const claimAmount = claim.amount.toNumber();
      
      console.log(`Rewards wallet vSOL balance: ${rewardsBalance}, Claim amount: ${claimAmount}`);
      
      if (rewardsBalance < claimAmount) {
        throw new Error(`Insufficient vSOL tokens in rewards wallet. Balance: ${rewardsBalance}, Required: ${claimAmount}`);
      }
      
      // Check if user's ATA exists, create if needed
      const userAtaInfo = await connection.getAccountInfo(userAta);
      const tx = new Transaction();
      
      if (!userAtaInfo) {
        const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");
        tx.add(
          createAssociatedTokenAccountInstruction(
            REWARDS_WALLET.publicKey, // payer
            userAta,
            userWallet,
            SIM_MINT
          )
        );
      }
      
      // Add transfer instruction
      const transferAmount = Math.floor(claimAmount * 10 ** 6); // 6 decimals
      tx.add(
        createTransferInstruction(
          rewardsAta,
          userAta,
          REWARDS_WALLET.publicKey,
          transferAmount
        )
      );

      // Set recent blockhash and fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = REWARDS_WALLET.publicKey;
      
      // Send and confirm transaction
      const sig = await connection.sendTransaction(tx, [REWARDS_WALLET], {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: sig,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      });

      // Update claim record
      await prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { 
          claimedAt: new Date(), 
          txSig: sig,
          status: "COMPLETED"
        }
      });

      console.log(`✅ Reward claimed (vSOL): ${claim.amount} vSOL to ${wallet} (${sig})`);
      return { sig, amount: claim.amount };
      
    } catch (vsolError: any) {
      // If vSOL transfer failed, fallback to sending native SOL
      console.warn(`vSOL transfer failed, falling back to native SOL: ${vsolError.message}`);
      
      // Send native SOL instead (convert vSOL amount to SOL lamports)
      const solAmountLamports = Math.floor(claim.amount.toNumber() * 1_000_000_000); // Convert to lamports
      
      // Check SOL balance
      const solBalance = await connection.getBalance(REWARDS_WALLET.publicKey);
      if (solBalance < solAmountLamports) {
        throw new Error(`Insufficient SOL in rewards wallet. Balance: ${solBalance / 1_000_000_000} SOL, Required: ${claim.amount.toNumber()} SOL`);
      }
      
      const solTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: REWARDS_WALLET.publicKey,
          toPubkey: userWallet,
          lamports: solAmountLamports
        })
      );

      // Set recent blockhash and fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      solTx.recentBlockhash = blockhash;
      solTx.feePayer = REWARDS_WALLET.publicKey;
      
      // Send and confirm transaction
      const solSig = await connection.sendTransaction(solTx, [REWARDS_WALLET], {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: solSig,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      });

      // Update claim record
      await prisma.rewardClaim.update({
        where: { id: claim.id },
        data: { 
          claimedAt: new Date(), 
          txSig: solSig,
          status: "COMPLETED"
        }
      });

      console.log(`✅ Reward claimed (SOL fallback): ${claim.amount} SOL to ${wallet} (${solSig})`);
      return { sig: solSig, amount: claim.amount };
    }
    
  } catch (error: any) {
    // Mark claim as failed
    await prisma.rewardClaim.update({
      where: { id: claim.id },
      data: { status: "FAILED" }
    });
    
    console.error(`❌ Reward claim failed for ${wallet}:`, error);
    throw new Error(`Reward claim failed: ${error.message}`);
  }
}
