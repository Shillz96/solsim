/**
 * MarioPanel Component - Standardized Card Layout
 * 
 * Use this as a reference for consistent trading panels and content cards.
 * Follows the Mario theme design system with proper tokens and spacing.
 * 
 * @example
 * <MarioPanel 
 *   title="Trading Panel"
 *   actions={<Button>Refresh</Button>}
 * >
 *   <p>Your content here</p>
 * </MarioPanel>
 */

import React from 'react';

interface MarioPanelProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MarioPanel({ 
  title, 
  actions, 
  children, 
  className = '' 
}: MarioPanelProps) {
  return (
    <section 
      className={`
        bg-[var(--card)] 
        border-[3px] 
        border-[var(--outline-black)] 
        rounded-[var(--radius-xl)] 
        shadow-[3px_3px_0_var(--outline-black)] 
        p-4 
        transition-transform 
        duration-[var(--transition)]
        hover:translate-y-[-2px] 
        hover:shadow-[4px_4px_0_var(--outline-black)]
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}

/**
 * Example Usage Patterns
 * 
 * 1. Basic Panel:
 * <MarioPanel title="Token Details">
 *   <TokenInfo />
 * </MarioPanel>
 * 
 * 2. Panel with Actions:
 * <MarioPanel 
 *   title="My Positions" 
 *   actions={
 *     <>
 *       <button className="mario-btn-primary">Add</button>
 *       <button className="mario-btn-danger">Clear</button>
 *     </>
 *   }
 * >
 *   <PositionsList />
 * </MarioPanel>
 * 
 * 3. Nested Panels (avoid deep nesting):
 * <MarioPanel title="Dashboard">
 *   <div className="grid grid-cols-2 gap-4">
 *     <div className="mario-card-sm">Stats</div>
 *     <div className="mario-card-sm">Charts</div>
 *   </div>
 * </MarioPanel>
 */
