"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import Image from "next/image";
import { CartridgePill } from "@/components/ui/cartridge-pill";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Winner {
  rank: number;
  userId: string;
  handle: string;
  avatarUrl: string | null;
  profitPercent: string;
  rewardAmount: string;
  walletAddress: string;
  txSignature: string;
  status: string;
}

interface DistributionData {
  poolId: string;
  distributedAt: string;
  totalPoolAmount: string;
  winnersCount: number;
  winners: Winner[];
}

interface HourlyRewardWinnersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HourlyRewardWinnersModal({ isOpen, onClose }: HourlyRewardWinnersModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch last distribution data
  const { data, isLoading, error } = useQuery<DistributionData>({
    queryKey: ["lastDistribution"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rewards/hourly/last-distribution`);
      if (!res.ok) throw new Error("Failed to fetch distribution data");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: isOpen, // Only fetch when modal is open
  });

  // Format distribution time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  // Get trophy emoji for top 3
  const getTrophyEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white border-4 border-outline shadow-[8px_8px_0_var(--outline-black)] rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex justify-center">
            <Image
              src="/Hourly-Rewards-Winners-10-25-2025.png"
              alt="Hourly Rewards - Winners"
              width={800}
              height={200}
              className="w-full h-auto max-w-[600px]"
              priority
            />
          </div>
          {data && (
            <p className="text-[14px] text-outline opacity-70">
              Distributed at {formatTime(data.distributedAt)}
            </p>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-[14px] text-outline opacity-70">
              Loading winners...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-[14px] text-mario">
              Failed to load winners. Please try again.
            </div>
          </div>
        )}

        {/* Winners list */}
        {data && data.winners && (
          <>
            <div className="space-y-3">
              {data.winners.map((winner) => (
                <div
                  key={winner.userId}
                  className="border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] rounded-lg p-4 bg-white hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left side: Rank + User info + Profit */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Rank */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-mario text-[16px] text-outline">
                          #{winner.rank}
                        </span>
                        {getTrophyEmoji(winner.rank) && (
                          <span className="text-[18px]">{getTrophyEmoji(winner.rank)}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      {winner.avatarUrl ? (
                        <img
                          src={winner.avatarUrl}
                          alt={winner.handle}
                          className="w-10 h-10 rounded-full border-2 border-outline flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-sky border-2 border-outline flex items-center justify-center flex-shrink-0">
                          <span className="font-mario text-[12px]">
                            {winner.handle.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Handle */}
                      <span className="font-bold text-[14px] text-outline truncate">
                        {winner.handle}
                      </span>

                      {/* Profit % */}
                      <span className="font-mono font-bold text-[14px] text-luigi flex-shrink-0">
                        +{winner.profitPercent}%
                      </span>
                    </div>

                    {/* Right side: Reward amount + Tx link */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Reward amount */}
                      <span className="font-mono font-bold text-[16px] text-outline">
                        {winner.rewardAmount} SOL
                      </span>

                      {/* Solscan link */}
                      {winner.txSignature && (
                        <a
                          href={`https://solscan.io/tx/${winner.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CartridgePill
                            value="View Tx"
                            size="sm"
                            bgColor="var(--sky-blue)"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with total */}
            <div className="mt-6 pt-4 border-t-3 border-outline text-center">
              <p className="text-[14px] text-outline">
                <span className="font-bold">Total Distributed:</span>{" "}
                <span className="font-mono font-bold">{data.totalPoolAmount} SOL</span>
              </p>
              <p className="text-[12px] text-outline opacity-70 mt-2">
                Top 10 traders by profit % earn SOL rewards every hour!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
