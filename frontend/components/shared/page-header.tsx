"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ChevronRight, 
  Home, 
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
    { label: "Home", href: "/", icon: Home },
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
      <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>
        
        <div className="relative z-10 p-6">
          {/* Breadcrumbs */}
          {allBreadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              {allBreadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                  {crumb.href ? (
                    <Link 
                      href={crumb.href}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {crumb.icon && <crumb.icon className="h-4 w-4" />}
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 text-foreground font-medium">
                      {crumb.icon && <crumb.icon className="h-4 w-4" />}
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          )}

          {/* Header Content */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {Icon && (
                <div className="p-3 rounded-lg bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    {title}
                  </h1>
                  {badge && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {badge}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="text-lg text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>

          {/* Accent Line */}
          <div className="w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-accent rounded-full mt-4"></div>
        </div>
      </Card>
    </motion.div>
  )
}

export function PortfolioPageActions() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="bg-background/50">
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Button variant="outline" size="sm" className="bg-background/50">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Button variant="outline" size="sm" className="bg-background/50">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  )
}