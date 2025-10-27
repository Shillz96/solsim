"use client";

import { useState, useEffect } from "react";
import { CartridgePill } from "@/components/ui/cartridge-pill";
import { HourlyRewardWinnersModal } from "@/components/modals/HourlyRewardWinnersModal";

export function HourlyRewardTimer() {
  const [secondsUntilNext, setSecondsUntilNext] = useState(0);
  const [justDistributed, setJustDistributed] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);

  // Calculate countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diff = Math.floor((nextHour.getTime() - now.getTime()) / 1000);
      setSecondsUntilNext(diff);

      // If we just hit the hour mark (:00), show "Rewards Sent!" for 60 seconds
      if (now.getMinutes() === 0 && now.getSeconds() < 60) {
        setJustDistributed(true);
        setTimeout(() => setJustDistributed(false), 60000);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format seconds as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Distributed mode (shows for 60 seconds after the hour)
  if (justDistributed) {
    return (
      <>
        <button onClick={() => setShowWinnersModal(true)} className="cursor-pointer relative z-rewards-timer">
          <CartridgePill
            value="Rewards Sent! 🎉"
            bgColor="var(--luigi-green)"
            size="sm"
            className="animate-pulse"
          />
        </button>
        <HourlyRewardWinnersModal
          isOpen={showWinnersModal}
          onClose={() => setShowWinnersModal(false)}
        />
      </>
    );
  }

  // Countdown mode (default)
  return (
    <>
      <button onClick={() => setShowWinnersModal(true)} className="cursor-pointer relative z-rewards-timer">
        <CartridgePill
          label="Rewards in"
          value={formatTime(secondsUntilNext)}
          bgColor="var(--luigi-green)"
          size="sm"
        />
      </button>
      <HourlyRewardWinnersModal
        isOpen={showWinnersModal}
        onClose={() => setShowWinnersModal(false)}
      />
    </>
  );
}
