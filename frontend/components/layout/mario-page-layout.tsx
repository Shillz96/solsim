import Image from "next/image"
import { motion } from "framer-motion"

interface MarioPageLayoutProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function MarioPageLayout({ title, subtitle, icon, children, className }: MarioPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-sky/20 border-4 border-outline rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/money-bag.png" alt="Coin" width={24} height={24} />
            </div>
            <div className="flex items-center gap-4">
              {icon && (
                <div className="bg-mario p-3 rounded-lg border-4 border-outline shadow-[4px_4px_0_var(--outline-black)]">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-mario font-bold text-outline">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground font-bold mt-1">{subtitle}</p>}
              </div>
            </div>
          </div>
        </motion.div>
        <div className={className}>{children}</div>
      </main>
    </div>
  )
}
