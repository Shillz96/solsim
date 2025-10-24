import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/market/lighthouse`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[market-hover] Error fetching data:', error.message);
    
    // Return empty data on error
    return NextResponse.json({
      pumpVolume24h: null,
      totalMarketCapUsd: null,
      fearGreedIndex: null,
      fearGreedLabel: null,
      altcoinSeasonIndex: null,
      ts: Date.now(),
    });
  }
}
