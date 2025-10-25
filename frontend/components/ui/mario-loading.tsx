interface MarioLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MarioLoading({ message = "Loading...", size = 'md' }: MarioLoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] rounded-full animate-spin`} />
      <p className="mt-4 text-[var(--outline-black)] font-mario">{message}</p>
    </div>
  )
}
