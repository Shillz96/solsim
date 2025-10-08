# SolSim Component Documentation with Storybook

This directory contains Storybook documentation for SolSim's component library and UI patterns.

## Getting Started

To run Storybook locally:

```bash
npm run storybook
```

This will start the Storybook server at http://localhost:6006/

## Component Organization

Components are organized into the following categories:

- **Trading**: Components related to token trading and order execution
- **Portfolio**: Components for portfolio management and visualization
- **Forms**: Form components and validation patterns
- **UI**: Base UI components (buttons, cards, inputs, etc.)

## Implementation Standards

### Form Validation

All form components should follow the validation patterns documented in `ValidationPatterns.stories.tsx`:

- Basic validation for required fields and type validation
- Multi-field validation for interdependent fields
- Asynchronous validation for server-dependent checks
- Conditional validation based on form state

See `components/shared/ValidationPatterns.tsx` for reference implementation.

### Data Fetching

Components that fetch data should use React Query hooks from `hooks/use-react-query-hooks.ts`:

- Consistent loading states with skeletons
- Standardized error handling
- Cache management for optimized performance
- Clear separation of data fetching from rendering logic

See `components/trading/ReactQueryTradingForm.tsx` for reference implementation.

### Mobile Optimization

All components should be mobile-optimized following these guidelines:

- Mobile-first design approach
- Touch-friendly targets (min 44px height)
- Responsive layouts that adapt to screen sizes
- Tab navigation for content organization on mobile
- Performance optimization for slower connections

See `components/portfolio/MobilePortfolioView.tsx` for reference implementation.

## Adding New Components

When adding new components to Storybook:

1. Create the component in the appropriate directory
2. Create a corresponding `.stories.tsx` file
3. Add documentation in the story using JSDoc comments
4. Include examples of different states and variants
5. Demonstrate responsive behavior

## Story Structure

Each component story should include:

1. **Default**: Basic implementation with typical props
2. **Variants**: Different visual or functional variants
3. **States**: Different states (loading, error, empty, etc.)
4. **Responsive**: Demonstration of responsive behavior

## Documentation

Use the story parameters to provide comprehensive documentation:

```tsx
const meta = {
  title: 'Forms/ValidationPatterns',
  component: ValidationPatterns,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Component description and usage guidelines...
        `,
      },
    },
  },
  // ...
};
```

## Testing

Components can be tested directly from Storybook using the built-in testing tools:

- **Accessibility**: Test for a11y issues using the accessibility addon
- **Interactions**: Test user interactions
- **Responsive**: Test different viewport sizes

## Resources

- [Official Storybook Documentation](https://storybook.js.org/docs/react/get-started/introduction)
- [Component-Driven Development](https://www.componentdriven.org/)
- [UI component documentation examples](https://storybook.js.org/showcase)