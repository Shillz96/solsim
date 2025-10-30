'use client';

export default function AmbientOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {/* Warm tint scrim */}
      <div className="absolute inset-0 overlay-scrim" />
      {/* Soft vignette to pull focus to center */}
      <div className="absolute inset-0 overlay-vignette" />
      {/* Paper grain / noise */}
      <div className="absolute inset-0 overlay-noise" />
    </div>
  );
}
