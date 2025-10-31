'use client';

import React from 'react';

export type BubbleMapsChain =
  | 'solana'
  | 'eth'
  | 'bsc'
  | 'tron'
  | 'base'
  | 'apechain'
  | 'sonic'
  | 'ton';

interface BubbleMapsEmbedProps {
  address: string;
  chain: BubbleMapsChain;
  partnerId: string;
  title?: string;
  className?: string;
  heightPx?: number; // default 700 per docs
}

export function BubbleMapsEmbed({
  address,
  chain,
  partnerId,
  title = 'BubbleMaps',
  className,
  heightPx = 700,
}: BubbleMapsEmbedProps) {
  const src = `https://iframe.bubblemaps.io/map?address=${encodeURIComponent(
    address,
  )}&chain=${encodeURIComponent(chain)}&partnerId=${encodeURIComponent(
    partnerId,
  )}`;

  return (
    <div
      className={
        `mario-card border-4 border-black shadow-mario bg-white ` +
        (className ? className : '')
      }
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        allow="fullscreen"
        style={{ width: '100%', height: `${heightPx}px`, border: 'none' }}
      />
    </div>
  );
}
