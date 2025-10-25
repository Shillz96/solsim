import { forwardRef } from 'react'
import { MarioFormField } from './mario-form-field'

interface MarioInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
}

export const MarioInput = forwardRef<HTMLInputElement, MarioInputProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <MarioFormField label={label} error={error} required={required}>
        <input
          ref={ref}
          className={`w-full px-3 py-2 border-4 border-[var(--outline-black)] rounded-lg bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--star-yellow)] focus:border-[var(--star-yellow)] font-mario ${className || ''}`}
          {...props}
        />
      </MarioFormField>
    )
  }
)

MarioInput.displayName = 'MarioInput'
