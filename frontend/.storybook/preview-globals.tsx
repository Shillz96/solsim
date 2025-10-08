import React from 'react';
import { ThemeProvider } from '../components/theme-provider';

export const decorators = [
  (Story) => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen p-4 bg-background">
        <Story />
      </div>
    </ThemeProvider>
  ),
];