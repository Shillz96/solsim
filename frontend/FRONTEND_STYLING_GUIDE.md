# 🎨 Frontend Styling Guide

A comprehensive guide to styling and theming in the SolSim Frontend application.

## Table of Contents

- [🎨 Frontend Styling Guide](#-frontend-styling-guide)
  - [Table of Contents](#table-of-contents)
  - [🌈 Theme System](#-theme-system)
    - [Color Palette](#color-palette)
    - [Dark Mode Support](#dark-mode-support)
    - [Using Theme Colors](#using-theme-colors)
  - [🔤 Typography](#-typography)
    - [Font Stack](#font-stack)
    - [Font Usage Guidelines](#font-usage-guidelines)
  - [🧩 Component Architecture](#-component-architecture)
    - [UI Components (Radix UI + shadcn/ui)](#ui-components-radix-ui--shadcnui)
    - [Custom Components](#custom-components)
    - [Component Styling Pattern](#component-styling-pattern)
  - [🎯 Styling Best Practices](#-styling-best-practices)
    - [Tailwind CSS Guidelines](#tailwind-css-guidelines)
    - [Class Organization](#class-organization)
    - [Responsive Design](#responsive-design)
  - [🎭 Trading Theme Elements](#-trading-theme-elements)
    - [Trading-Specific Classes](#trading-specific-classes)
    - [Chart Colors](#chart-colors)
    - [Status Indicators](#status-indicators)
  - [🧱 Layout System](#-layout-system)
    - [Navigation Structure](#navigation-structure)
    - [Grid Systems](#grid-systems)
    - [Spacing Scale](#spacing-scale)
  - [✨ Animations and Effects](#-animations-and-effects)
    - [Built-in Animations](#built-in-animations)
    - [Custom Effects](#custom-effects)
  - [📱 Mobile Responsiveness](#-mobile-responsiveness)
    - [Breakpoints](#breakpoints)
    - [Mobile-First Design](#mobile-first-design)
  - [🔧 Development Workflow](#-development-workflow)
    - [Adding New Components](#adding-new-components)
    - [Styling Guidelines](#styling-guidelines)
    - [Testing Themes](#testing-themes)

## 🌈 Theme System

The SolSim frontend uses a sophisticated theme system built on CSS custom properties with light and dark mode support.

### Color Palette

#### Light Mode Colors
```css
/* Primary colors for trading theme */
--primary: #2563eb;        /* Vibrant blue */
--primary-foreground: #fcfcfc;

--accent: #06b6d4;         /* Vibrant teal/cyan */
--accent-foreground: #fcfcfc;

--background: #f6f4f0;     /* Warm off-white */
--foreground: #1a1a1a;     /* Dark text */

--card: #fcfcfc;           /* Card backgrounds */
--card-foreground: #1a1a1a;

--destructive: #ef4444;    /* Red for errors/losses */
--destructive-foreground: #fcfcfc;
```

#### Dark Mode Colors
```css
/* Enhanced dark mode for trading */
--background: #0a0a0a;     /* Deep black */
--foreground: #fafafa;     /* Light text */

--primary: #3b82f6;        /* Brighter blue for visibility */
--accent: #22d3ee;         /* Vibrant cyan for dark mode */

--card: #171717;           /* Dark cards */
--destructive: #dc2626;    /* Darker red for dark mode */
```

### Dark Mode Support

The theme system automatically adapts to user preferences:

```tsx
// Theme provider setup in layout.tsx
<ThemeProvider 
  attribute="class" 
  defaultTheme="dark" 
  enableSystem 
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### Using Theme Colors

#### In Tailwind Classes
```tsx
// Use semantic color names
<div className="bg-primary text-primary-foreground">
  Primary button
</div>

<div className="bg-card text-card-foreground border border-border">
  Card content
</div>
```

#### In Custom CSS
```css
.custom-element {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border: 1px solid var(--border);
}
```

## 🔤 Typography

### Font Stack

Three primary fonts are used throughout the application:

```typescript
// Font definitions in layout.tsx
const radnikaNext = localFont({
  src: "./fonts/Radnika-Medium.otf",
  variable: "--font-radnika-next",
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-ibm-plex-sans",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
})
```

### Font Usage Guidelines

| Font | Usage | Tailwind Class | CSS Variable |
|------|-------|----------------|--------------|
| **Radnika Next** | Body text, UI elements | `font-sans` | `var(--font-radnika-next)` |
| **IBM Plex Sans** | Headings, emphasis | `font-heading` | `var(--font-ibm-plex-sans)` |
| **JetBrains Mono** | Code, monospace data | `font-mono` | `var(--font-jetbrains-mono)` |

#### Typography Examples
```tsx
// Headings
<h1 className="font-heading text-4xl font-bold text-foreground">
  Main Heading
</h1>

// Body text
<p className="font-sans text-base text-foreground">
  Regular paragraph text
</p>

// Code/Data
<code className="font-mono bg-input px-2 py-1 rounded">
  0x1234...abcd
</code>
```

## 🧩 Component Architecture

### UI Components (Radix UI + shadcn/ui)

The project uses **shadcn/ui** components built on **Radix UI** primitives. All UI components are located in `components/ui/`.

#### Key UI Components
- **Buttons**: `button.tsx` - Multiple variants with hover effects
- **Cards**: `card.tsx` - Container components with theme support
- **Forms**: `form.tsx`, `input.tsx`, `select.tsx` - Form controls
- **Navigation**: `navigation-menu.tsx` - Menu components
- **Charts**: `chart.tsx` - Trading chart components
- **Dialogs**: `dialog.tsx`, `drawer.tsx` - Modal components

#### shadcn/ui Configuration
```json
// components.json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Custom Components

#### Component Organization
```
components/
├── ui/                    # shadcn/ui components
├── navigation/           # Nav bars, menus
├── trading/             # Trading-specific UI
├── portfolio/           # Portfolio components
├── leaderboard/         # Leaderboard components
├── modals/              # Modal dialogs
└── shared/              # Reusable components
```

### Component Styling Pattern

All components follow this consistent pattern:

```tsx
import { cn } from "@/lib/utils"

interface ComponentProps {
  className?: string
  variant?: "default" | "destructive" | "outline"
  children: React.ReactNode
}

export function Component({ className, variant = "default", children }: ComponentProps) {
  return (
    <div className={cn(
      // Base styles
      "rounded-lg border p-4 transition-all duration-200",
      
      // Variant styles
      {
        "bg-primary text-primary-foreground": variant === "default",
        "bg-destructive text-destructive-foreground": variant === "destructive",
        "border-primary bg-transparent": variant === "outline",
      },
      
      // Allow custom classes
      className
    )}>
      {children}
    </div>
  )
}
```

## 🎯 Styling Best Practices

### Tailwind CSS Guidelines

#### ✅ DO
```tsx
// Use semantic spacing
<div className="p-4 m-2 space-y-4">

// Use consistent sizing
<div className="w-full max-w-md h-48">

// Use theme colors
<div className="bg-card text-card-foreground border-border">

// Group related classes
<div className="flex items-center justify-between">
```

#### ❌ DON'T
```tsx
// Avoid arbitrary values when theme values exist
<div className="bg-[#f0f0f0]">  // Use bg-muted instead

// Avoid inline styles
<div style={{ backgroundColor: "red" }}>  // Use className

// Don't override component internals
<Button className="!bg-red-500">  // Use variant props instead
```

### Class Organization

Organize Tailwind classes in this order:
1. Layout (display, position, sizing)
2. Spacing (margin, padding)
3. Typography (font, text)
4. Colors (background, text, border)
5. Effects (shadow, opacity)
6. Interactions (hover, focus)

```tsx
<div className="
  flex flex-col items-center     // Layout
  p-6 m-4 space-y-4             // Spacing  
  text-lg font-semibold         // Typography
  bg-card text-card-foreground  // Colors
  shadow-lg rounded-lg          // Effects
  hover:shadow-xl focus:ring-2  // Interactions
">
```

### Responsive Design

```tsx
// Mobile-first responsive design
<div className="
  w-full                    // Mobile: full width
  md:w-1/2                 // Tablet: half width  
  lg:w-1/3                 // Desktop: third width
  p-4                      // Mobile: standard padding
  md:p-6                   // Tablet: more padding
  text-sm                  // Mobile: small text
  md:text-base             // Tablet+: normal text
">
```

## 🎭 Trading Theme Elements

### Trading-Specific Classes

The app includes custom trading-themed CSS classes:

```css
/* Button variants */
.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent);
}

.btn-primary:hover {
  box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 50%, transparent);
  transform: translateY(-2px);
}

/* Text effects */
.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Visual effects */
.glow-primary {
  box-shadow: 0 0 24px color-mix(in srgb, var(--primary) 40%, transparent);
}

.glass {
  background: color-mix(in srgb, var(--card) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
```

### Chart Colors

Consistent color scheme for trading charts:

```css
:root {
  --chart-1: #2563eb;  /* Primary blue */
  --chart-2: #06b6d4;  /* Teal */
  --chart-3: #10b981;  /* Green */
  --chart-4: #f59e0b;  /* Orange */
  --chart-5: #8b5cf6;  /* Purple */
}
```

### Status Indicators

```tsx
// Profit/Loss indicators
<span className="text-green-500">+$1,234.56</span>    // Gains
<span className="text-red-500">-$987.65</span>        // Losses
<span className="text-muted-foreground">$0.00</span>  // Neutral

// Market status
<Badge variant="default">Active</Badge>     // Trading active
<Badge variant="secondary">Paused</Badge>   // Market closed
<Badge variant="destructive">Error</Badge>  // System issues
```

## 🧱 Layout System

### Navigation Structure

```tsx
// Main layout structure in layout.tsx
<html>
  <body>
    <NavBar />                    {/* Fixed top navigation */}
    <main className="min-h-screen pt-16 pb-20 md:pb-12">
      {children}                  {/* Page content */}
    </main>
    <BottomNavBar />             {/* Mobile bottom navigation */}
  </body>
</html>
```

### Grid Systems

```tsx
// Dashboard grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>Portfolio</Card>
  <Card>Positions</Card>  
  <Card>P&L</Card>
</div>

// Trading interface layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <TradingChart />
  </div>
  <div>
    <TradingPanel />
  </div>
</div>
```

### Spacing Scale

Use consistent spacing throughout:

```tsx
// Container spacing
<div className="container mx-auto px-4 py-8">

// Section spacing  
<section className="space-y-6">

// Component spacing
<div className="p-6 m-4 space-y-4">
```

## ✨ Animations and Effects

### Built-in Animations

The app includes Tailwind's animation classes plus custom animations:

```css
/* Loading shimmer effect */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(
    to right,
    var(--muted) 0%,
    var(--muted-foreground) 20%,
    var(--muted) 40%,
    var(--muted) 100%
  );
}
```

### Custom Effects

```tsx
// Paper texture background (trading theme)
body::before {
  background-image: url("/paper-texture.jpg");
  opacity: 0.12;
  mix-blend-mode: multiply;
}

// Hover effects on cards
<Card className="hover:shadow-xl transition-all duration-200">

// Loading states
<div className="shimmer h-4 w-full rounded">
```

## 📱 Mobile Responsiveness

### Breakpoints

| Breakpoint | Width | Usage |
|-----------|--------|--------|
| `sm` | 640px+ | Small tablets |
| `md` | 768px+ | Tablets |
| `lg` | 1024px+ | Small desktops |
| `xl` | 1280px+ | Large desktops |
| `2xl` | 1536px+ | Extra large screens |

### Mobile-First Design

Always design for mobile first, then enhance for larger screens:

```tsx
<div className="
  // Mobile styles (default)
  flex-col space-y-4 p-4
  
  // Tablet styles
  md:flex-row md:space-y-0 md:space-x-4 md:p-6
  
  // Desktop styles  
  lg:p-8 xl:max-w-6xl xl:mx-auto
">
```

## 🔧 Development Workflow

### Adding New Components

1. **Create component file** in appropriate directory
2. **Follow naming convention**: `kebab-case.tsx`
3. **Use TypeScript** interfaces for props
4. **Include className prop** for customization
5. **Use cn() utility** for class merging
6. **Export from index** if creating a module

```tsx
// Example: components/trading/price-display.tsx
import { cn } from "@/lib/utils"

interface PriceDisplayProps {
  price: number
  change: number
  className?: string
}

export function PriceDisplay({ price, change, className }: PriceDisplayProps) {
  return (
    <div className={cn(
      "flex items-center space-x-2",
      className
    )}>
      <span className="font-mono text-lg">${price.toFixed(2)}</span>
      <span className={cn(
        "text-sm",
        change > 0 ? "text-green-500" : "text-red-500"
      )}>
        {change > 0 ? "+" : ""}{change.toFixed(2)}%
      </span>
    </div>
  )
}
```

### Styling Guidelines

1. **Use theme colors** instead of arbitrary values
2. **Follow responsive design** patterns
3. **Test in both light and dark** modes
4. **Ensure accessibility** with proper contrast
5. **Use semantic HTML** elements

### Testing Themes

```tsx
// Test theme switching in development
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button 
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-primary text-primary-foreground"
    >
      Toggle Theme
    </button>
  )
}
```

---

This styling guide provides the foundation for consistent, maintainable, and beautiful UI development in the SolSim frontend application. Follow these patterns to ensure your components integrate seamlessly with the existing design system.
