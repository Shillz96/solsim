// Reward service placeholder
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";

const SIM_MINT = new PublicKey(process.env.SIM_TOKEN_MINT!);
const REWARDS_WALLET = Keypair.fromSecretKey(bs58.decode(process.env.REWARDS_WALLET_SECRET!));
const RPC_URL = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

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

    console.log(`📊 Created snapshot for epoch ${epoch}: ${users.length} users, ${totalPoints} points, ${poolAmount} SIM pool`);

    // Record claim entitlements in batch
    const claimData = [];
    for (const u of users) {
      const share = (u.rewardPoints as any as Decimal).div(totalPoints);
      const amount = poolAmount.mul(share);

      if (amount.gt(0)) {
        claimData.push({
          userId: u.id,
          epoch,
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
  const claim = await prisma.rewardClaim.findFirst({
    where: { userId, epoch, claimedAt: null }
  });
  if (!claim) throw new Error("No claimable rewards");

  try {
    const userWallet = new PublicKey(wallet);
    const userAta = await getAssociatedTokenAddress(SIM_MINT, userWallet);
    const rewardsAta = await getAssociatedTokenAddress(SIM_MINT, REWARDS_WALLET.publicKey);
    
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
    const transferAmount = Math.floor(claim.amount.toNumber() * 10 ** 6); // 6 decimals
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

    console.log(`✅ Reward claimed: ${claim.amount} SIM to ${wallet} (${sig})`);
    return { sig, amount: claim.amount };
    
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
