interface MarioFormFieldProps {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}

export function MarioFormField({ label, error, children, required }: MarioFormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="font-mario text-[var(--outline-black)] font-bold">
        {label}
        {required && <span className="text-[var(--mario-red)] ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[var(--mario-red)] text-sm font-mario">{error}</p>
      )}
    </div>
  )
}
