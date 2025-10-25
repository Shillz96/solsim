import { forwardRef } from 'react'
import { MarioFormField } from './mario-form-field'

interface MarioTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  required?: boolean
}

export const MarioTextarea = forwardRef<HTMLTextAreaElement, MarioTextareaProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <MarioFormField label={label} error={error} required={required}>
        <textarea
          ref={ref}
          className={`w-full px-3 py-2 border-4 border-[var(--outline-black)] rounded-lg bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--star-yellow)] focus:border-[var(--star-yellow)] font-mario resize-vertical min-h-[100px] ${className || ''}`}
          {...props}
        />
      </MarioFormField>
    )
  }
)

MarioTextarea.displayName = 'MarioTextarea'

