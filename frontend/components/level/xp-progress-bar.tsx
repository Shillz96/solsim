'use client';

import React from 'react';
import { calculateLevel, formatXP, getNextMilestone } from '@/lib/utils/levelSystem';

interface XPProgressBarProps {
  currentXP: number;
  variant?: 'default' | 'compact' | 'detailed';
  showTitle?: boolean;
  className?: string;
}

/**
 * Mario-themed XP Progress Bar Component
 * Shows current level, progress to next level, and level title
 */
export function XPProgressBar({
  currentXP,
  variant = 'default',
  showTitle = true,
  className = '',
}: XPProgressBarProps) {
  const levelInfo = calculateLevel(currentXP);
  const nextMilestone = getNextMilestone(currentXP);

  if (variant === 'compact') {
    return (
      <div className={`xp-bar-compact ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Level icon">
            {levelInfo.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">
                LVL {levelInfo.level}
              </span>
              <span className="text-xs text-white/80">
                {Math.floor(levelInfo.progressPercent)}%
              </span>
            </div>
            <div className="mario-xp-bar">
              <div
                className="mario-xp-fill"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`mario-card ${className}`}>
        <div className="flex items-start gap-4">
          {/* Level Icon */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-mario-yellow/20 flex items-center justify-center text-4xl border-4 border-mario-yellow shadow-lg">
              <span role="img" aria-label="Level icon">
                {levelInfo.icon}
              </span>
            </div>
          </div>

          {/* Level Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-2xl font-mario text-mario-yellow">
                Level {levelInfo.level}
              </h3>
              {showTitle && (
                <span className="text-sm text-white/70 truncate">
                  {levelInfo.title}
                </span>
              )}
            </div>

            {/* XP Stats */}
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-white/80">
                {formatXP(levelInfo.currentXP)} XP
              </span>
              <span className="text-mario-yellow font-bold">
                {formatXP(nextMilestone.xpNeeded)} to {nextMilestone.title}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mario-xp-bar">
              <div
                className="mario-xp-fill"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            {/* Progress Percent */}
            <div className="text-right mt-1">
              <span className="text-xs text-white/60">
                {Math.floor(levelInfo.progressPercent)}% to next level
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`xp-bar-default ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl" role="img" aria-label="Level icon">
          {levelInfo.icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-mario text-lg text-mario-yellow">
              Level {levelInfo.level}
            </h4>
            {showTitle && (
              <span className="text-sm text-white/70">{levelInfo.title}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mario-xp-bar mb-2">
        <div
          className="mario-xp-fill"
          style={{ width: `${levelInfo.progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">
          {formatXP(levelInfo.xpIntoLevel)} / {formatXP(levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel)} XP
        </span>
        <span className="text-mario-yellow font-bold">
          {formatXP(nextMilestone.xpNeeded)} to next
        </span>
      </div>
    </div>
  );
}

/**
 * Mini XP Badge - For nav bars and compact displays
 */
export function XPBadge({ currentXP, className = '' }: { currentXP: number; className?: string }) {
  const levelInfo = calculateLevel(currentXP);

  return (
    <div className={`mario-badge inline-flex items-center gap-2 ${className}`}>
      <span className="text-xl" role="img" aria-label="Level icon">
        {levelInfo.icon}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-bold text-white/90">LVL {levelInfo.level}</span>
        <span className="text-[10px] text-white/60">{formatXP(currentXP)} XP</span>
      </div>
    </div>
  );
}

/**
 * Level Up Toast Notification Component
 */
export function LevelUpToast({
  newLevel,
  newTitle,
  newIcon,
  onClose,
}: {
  newLevel: number;
  newTitle: string;
  newIcon: string;
  onClose?: () => void;
}) {
  React.useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce-in">
      <div className="mario-card bg-gradient-to-br from-mario-yellow via-mario-orange to-mario-red p-8 text-center shadow-2xl border-4 border-white">
        <div className="text-7xl mb-4 animate-pulse">{newIcon}</div>
        <h2 className="font-mario text-4xl text-white mb-2 text-shadow-mario">
          LEVEL UP!
        </h2>
        <p className="text-2xl font-mario text-white mb-1">Level {newLevel}</p>
        <p className="text-lg text-white/90">{newTitle}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mario-btn mario-btn-sm mt-4 bg-white text-mario-red"
          >
            Awesome!
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * XP Gain Animation - Shows floating "+XP" text
 */
export function XPGainAnimation({
  amount,
  x,
  y,
}: {
  amount: number;
  x: number;
  y: number;
}) {
  return (
    <div
      className="fixed pointer-events-none z-50 animate-float-up"
      style={{ left: x, top: y }}
    >
      <span className="font-mario text-2xl text-mario-yellow text-shadow-mario">
        +{formatXP(amount)} XP
      </span>
    </div>
  );
}
