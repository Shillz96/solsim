import React from 'react';
import { BubbleMapsEmbed } from '@/components/BubbleMapsEmbed';

export default function Page() {
  // Demo parameters provided by user
  const address = 'FQgtfugBdpFN7PZ6NdPrZpVLDBrPGxXesi4gVu3vErhY';
  const chain = 'solana' as const;
  const partnerId = 'demo';

  return (
    <main className="p-4 sm:p-6 lg:p-8 bg-sky-50">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="font-mario text-2xl sm:text-3xl text-black drop-shadow">
          BubbleMaps Embed (Demo)
        </h1>
        <p className="text-black/80">
          This page embeds BubbleMaps using their official iframe endpoint with Mario-themed styling.
        </p>
        <BubbleMapsEmbed
          address={address}
          chain={chain}
          partnerId={partnerId}
          heightPx={700}
        />
      </div>
    </main>
  );
}
