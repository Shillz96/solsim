"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ChevronRight, 
  TrendingUp,
  ArrowLeft,
  Share2,
  Download,
  Settings
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumbs = [], 
  actions,
  badge,
  icon: Icon
}: PageHeaderProps) {
  const pathname = usePathname()

  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { label: "Portfolio", href: "/portfolio" }
  ]

  const allBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : defaultBreadcrumbs

  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mario-card-standard relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-primary to-blue-500"></div>

        <div className="relative z-10 p-4 md:p-6">
          {/* Breadcrumbs */}
          {allBreadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 overflow-x-auto">
              {allBreadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center flex-shrink-0">
                  {index > 0 && <ChevronRight className="h-3 md:h-4 w-3 md:w-4 mx-1 md:mx-2" />}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      {crumb.icon && <crumb.icon className="h-3 md:h-4 w-3 md:w-4" />}
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 text-foreground font-medium whitespace-nowrap">
                      {crumb.icon && <crumb.icon className="h-3 md:h-4 w-3 md:w-4" />}
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}

          {/* Header Content */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex items-start md:items-center gap-2 md:gap-4 w-full md:w-auto">
              {Icon && (
                <div className="p-2 md:p-3 rounded-lg bg-primary/20 flex-shrink-0">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1 md:mb-2">
                  <h1 className="text-xl md:text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text truncate">
                    {title}
                  </h1>
                  {badge && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs flex-shrink-0">
                      {badge}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="text-sm md:text-base lg:text-lg text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {actions && (
              <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                {actions}
              </div>
            )}
          </div>

          {/* Accent Line */}
          <div className="w-full h-0.5 md:h-1 bg-gradient-to-r from-primary via-blue-500 to-accent rounded-full mt-3 md:mt-4"></div>
        </div>
      </div>
    </motion.div>
  )
}

export function PortfolioPageActions() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="bg-background/50 text-xs md:text-sm">
        <Share2 className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5 md:mr-2" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <Button variant="outline" size="sm" className="bg-background/50 text-xs md:text-sm">
        <Download className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5 md:mr-2" />
        <span className="hidden sm:inline">Export</span>
      </Button>
      <Button variant="outline" size="sm" className="bg-background/50">
        <Settings className="h-3.5 md:h-4 w-3.5 md:w-4" />
      </Button>
    </div>
  )
}