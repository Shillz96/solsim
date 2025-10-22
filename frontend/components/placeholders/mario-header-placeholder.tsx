/**
 * Mario Header Image Placeholder Component
 *
 * This component displays a colorful placeholder for Mario-style header images
 * that need to be created. It shows the filename, dimensions, and styling guidelines.
 */

import React from 'react';

interface MarioHeaderPlaceholderProps {
  /** The name of the image file needed (e.g., "1up-sol-logo.png") */
  filename: string;
  /** Width in pixels (default: 800) */
  width?: number;
  /** Height in pixels (default: 200) */
  height?: number;
  /** Optional additional instructions */
  instructions?: string;
  /** Color scheme for the gradient background */
  colorScheme?: 'red' | 'green' | 'blue' | 'yellow' | 'rainbow';
}

const colorGradients = {
  red: 'bg-gradient-to-r from-mario via-star to-coin',
  green: 'bg-gradient-to-r from-luigi via-pipe to-sky',
  blue: 'bg-gradient-to-r from-super via-sky to-star',
  yellow: 'bg-gradient-to-r from-coin via-star to-luigi',
  rainbow: 'bg-gradient-to-r from-super via-mario via-star via-luigi to-sky',
};

export function MarioHeaderPlaceholder({
  filename,
  width = 800,
  height = 200,
  instructions,
  colorScheme = 'rainbow',
}: MarioHeaderPlaceholderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border-4 border-outline ${colorGradients[colorScheme]}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: `${height}px`,
        maxWidth: '100%',
      }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px)',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
        {/* File icon */}
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-outline bg-white shadow-lg">
          <svg
            className="h-8 w-8 text-outline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Filename */}
        <h3 className="mario-font mb-2 text-2xl text-white drop-shadow-[2px_2px_0_#1C1C1C]">
          {filename}
        </h3>

        {/* Dimensions */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-outline bg-white px-4 py-1 font-mono text-sm font-bold text-outline shadow-md">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          {width} × {height}px
        </div>

        {/* Instructions */}
        {instructions && (
          <p className="max-w-md rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-outline shadow-md">
            {instructions}
          </p>
        )}

        {/* Default style guide */}
        {!instructions && (
          <div className="mt-2 max-w-md rounded-lg bg-white/90 px-4 py-3 text-xs text-outline shadow-md">
            <p className="font-bold">Style Guide:</p>
            <ul className="mt-1 space-y-1 text-left">
              <li>• Use <span className="font-mario uppercase">Luckiest Guy</span> font</li>
              <li>• Colorful letters (blue, red, yellow, green)</li>
              <li>• 2-3px black outline on text</li>
              <li>• 3D shadow effect (see Trending Tokens example)</li>
              <li>• PNG format with transparent background</li>
            </ul>
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute left-2 top-2 h-4 w-4 rounded-full border-2 border-outline bg-star animate-pulse" />
      <div className="absolute right-2 top-2 h-4 w-4 rounded-full border-2 border-outline bg-coin animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-2 left-2 h-4 w-4 rounded-full border-2 border-outline bg-luigi animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-outline bg-mario animate-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  );
}

/**
 * Preset placeholders for common header images
 */

export function Logo1UpSolPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="1up-sol-logo.png"
      width={400}
      height={120}
      colorScheme="rainbow"
      instructions="Main logo for navigation and hero section. Extra bold with star power-up icon."
    />
  );
}

export function TradeHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="trade-header.png"
      width={600}
      height={150}
      colorScheme="green"
      instructions="'TRADE' text in Luigi green and coin gold colors."
    />
  );
}

export function PortfolioHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="portfolio-header.png"
      width={700}
      height={150}
      colorScheme="yellow"
      instructions="'PORTFOLIO' text in coin gold and star yellow."
    />
  );
}

export function TrendingTokensHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="trending-tokens-header.png"
      width={800}
      height={150}
      colorScheme="rainbow"
      instructions="'TRENDING TOKENS' - You already have this one! Use as reference."
    />
  );
}

export function LeaderboardHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="leaderboard-header.png"
      width={750}
      height={150}
      colorScheme="blue"
      instructions="'LEADERBOARD' text in super blue and star yellow."
    />
  );
}

export function AboutHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="about-header.png"
      width={500}
      height={120}
      colorScheme="red"
      instructions="'ABOUT' text in Mario red with 3D effect."
    />
  );
}

export function DocsHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="docs-header.png"
      width={500}
      height={120}
      colorScheme="green"
      instructions="'DOCS' text in pipe green with book icon."
    />
  );
}

export function FeaturesHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="features-header.png"
      width={650}
      height={140}
      colorScheme="rainbow"
      instructions="'FEATURES' text for landing page section."
    />
  );
}

export function HowItWorksHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="how-it-works-header.png"
      width={800}
      height={140}
      colorScheme="blue"
      instructions="'HOW IT WORKS' text for landing page section."
    />
  );
}

export function LevelUpHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="level-up-header.png"
      width={700}
      height={150}
      colorScheme="yellow"
      instructions="'LEVEL UP!' text with star power-up graphics. Replaces rewards section."
    />
  );
}

export function StartTradingHeaderPlaceholder() {
  return (
    <MarioHeaderPlaceholder
      filename="start-trading-header.png"
      width={800}
      height={140}
      colorScheme="red"
      instructions="'START TRADING' text for CTA section."
    />
  );
}
