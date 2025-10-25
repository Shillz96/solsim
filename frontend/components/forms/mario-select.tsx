import { forwardRef } from 'react'
import { MarioFormField } from './mario-form-field'

interface MarioSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  required?: boolean
  options: Array<{ value: string; label: string }>
}

export const MarioSelect = forwardRef<HTMLSelectElement, MarioSelectProps>(
  ({ label, error, required, options, className, ...props }, ref) => {
    return (
      <MarioFormField label={label} error={error} required={required}>
        <select
          ref={ref}
          className={`w-full px-3 py-2 border-4 border-[var(--outline-black)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--star-yellow)] focus:border-[var(--star-yellow)] font-mario ${className || ''}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </MarioFormField>
    )
  }
)

MarioSelect.displayName = 'MarioSelect'

