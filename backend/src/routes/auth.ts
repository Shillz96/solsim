import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { getWalletBalances } from "../services/walletService.js";

// Check if wallet holds SIM tokens and upgrade balance
async function checkAndUpgradeSIMHolder(userId: string, walletAddress: string) {
  try {
    const balances = await getWalletBalances(walletAddress);
    const simBalance = balances.find((token: any) => 
      token.mint === process.env.SIM_TOKEN_MINT && token.uiAmount > 0
    );
    
    if (simBalance) {
      // Upgrade to 100 vSOL for SIM holders
      await prisma.user.update({
        where: { id: userId },
        data: { virtualSolBalance: 100 }
      });
      console.log(`🎯 Upgraded SIM holder ${walletAddress} to 100 vSOL`);
    }
  } catch (error) {
    console.warn("Failed to check SIM holdings:", error);
  }
}

export default async function (app: FastifyInstance) {
  // Email signup (simple; you can swap to Supabase Auth later)
  app.post("/signup-email", async (req, reply) => {
    const { email, password, handle, profileImage } = req.body as {
      email: string;
      password: string;
      handle?: string;
      profileImage?: string;
    };
    if (!email || !password) return reply.code(400).send({ error: "email & password required" });
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        handle: handle ?? null,
        profileImage: profileImage ?? null,
        virtualSolBalance: 10 // seed 10 vSOL for email users
      }
    });
    return { userId: user.id };
  });

  // Email login
  app.post("/login-email", async (req, reply) => {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return reply.code(401).send({ error: "invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "invalid credentials" });
    return { userId: user.id };
  });

  // Wallet nonce (for Sign-In With Solana)
  app.post("/wallet/nonce", async (req) => {
    const { walletAddress } = req.body as {
      walletAddress: string;
    };
    const nonce = crypto.randomBytes(16).toString("hex");
    await prisma.user.upsert({
      where: { walletAddress },
      update: { walletNonce: nonce },
      create: { walletAddress, walletNonce: nonce, virtualSolBalance: 10 } // default 10; upgrade after holding check
    });
    return { nonce };
  });

  // Wallet verify signature
  app.post("/wallet/verify", async (req, reply) => {
    const { walletAddress, signature } = req.body as {
      walletAddress: string;
      signature: string;
    };
    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user || !user.walletNonce) return reply.code(400).send({ error: "nonce missing" });

    const message = new TextEncoder().encode(`Sign-in to Solsim.fun\nNonce: ${user.walletNonce}`);
    const sig = bs58.decode(signature);
    const pub = bs58.decode(walletAddress);

    const ok = nacl.sign.detached.verify(message, sig, pub);
    if (!ok) return reply.code(401).send({ error: "invalid signature" });

    // Check SIM token holding and upgrade balance if eligible
    await checkAndUpgradeSIMHolder(user.id, walletAddress);

    await prisma.user.update({
      where: { walletAddress },
      data: { walletNonce: null }
    });
    return { userId: user.id };
  });

  // Profile update
  app.post("/profile", async (req, reply) => {
    const { userId, handle, profileImage, bio } = req.body as {
      userId: string;
      handle?: string;
      profileImage?: string;
      bio?: string;
    };
    if (!userId) return reply.code(400).send({ error: "userId required" });

    const u = await prisma.user.update({
      where: { id: userId },
      data: { handle, profileImage, bio }
    });
    return { ok: true, user: { id: u.id, handle: u.handle, profileImage: u.profileImage, bio: u.bio } };
  });

  // Get user profile
  app.get("/user/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          avatarUrl: true,
          twitter: true,
          discord: true,
          telegram: true,
          website: true,
          virtualSolBalance: true,
          userTier: true,
          walletAddress: true,
          handle: true,
          profileImage: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return user;
    } catch (error: any) {
      return reply.code(500).send({ error: "Failed to fetch user" });
    }
  });

  // Change password
  app.post("/change-password", async (req, reply) => {
    const { userId, currentPassword, newPassword } = req.body as {
      userId: string;
      currentPassword: string;
      newPassword: string;
    };

    if (!userId || !currentPassword || !newPassword) {
      return reply.code(400).send({ error: "userId, currentPassword, and newPassword required" });
    }

    if (newPassword.length < 8) {
      return reply.code(400).send({ error: "New password must be at least 8 characters" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user || !user.passwordHash) {
        return reply.code(404).send({ error: "User not found or no password set" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      });

      return { success: true, message: "Password updated successfully" };
    } catch (error: any) {
      return reply.code(500).send({ error: "Failed to change password" });
    }
  });

  // Update avatar
  app.post("/update-avatar", async (req, reply) => {
    const { userId, avatarUrl } = req.body as {
      userId: string;
      avatarUrl: string;
    };

    if (!userId || !avatarUrl) {
      return reply.code(400).send({ error: "userId and avatarUrl required" });
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          avatarUrl,
          avatar: avatarUrl // Also update the avatar field for compatibility
        }
      });

      return { 
        success: true, 
        avatarUrl: user.avatarUrl,
        message: "Avatar updated successfully" 
      };
    } catch (error: any) {
      return reply.code(500).send({ error: "Failed to update avatar" });
    }
  });

  // Remove avatar
  app.post("/remove-avatar", async (req, reply) => {
    const { userId } = req.body as {
      userId: string;
    };

    if (!userId) {
      return reply.code(400).send({ error: "userId required" });
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          avatarUrl: null,
          avatar: null
        }
      });

      return { success: true, message: "Avatar removed successfully" };
    } catch (error: any) {
      return reply.code(500).send({ error: "Failed to remove avatar" });
    }
  });
}