/**
 * Filter Panel Component - Axiom-style per-column filters
 *
 * Modal popup filter panel with tabbed categories (Audit, $ Metrics, Socials)
 * Features Mario-themed styling with bold borders and 3D shadows
 */

"use client"

import { useState, useMemo } from "react"
import { cn, marioStyles } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Download,
  Upload,
  Settings,
  Shield,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Globe,
  MessageSquare,
  Twitter
} from "lucide-react"
import type { AdvancedFilters } from "@/lib/types/warp-pipes"
import { importFilters } from "@/lib/warp-pipes-storage"

interface FilterPanelProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  category: 'new' | 'graduating' | 'bonded'
  isOpen: boolean
  onToggle: () => void
  onApply: () => void
  className?: string
  headerColor?: 'bonded' | 'graduating' | 'new'
}

export function FilterPanel({
  filters,
  onFiltersChange,
  category,
  isOpen,
  onToggle,
  onApply,
  className,
  headerColor = 'bonded'
}: FilterPanelProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'metrics' | 'socials'>('audit')
  const [importError, setImportError] = useState<string | null>(null)

  // Consolidated color-coded styling based on column type
  const colorTheme = {
    bonded: {
      button: "bg-coin hover:bg-coin",
      text: "text-outline",
      panelBg: "bg-coin/5",
    },
    graduating: {
      button: "bg-star hover:bg-star",
      text: "text-outline",
      panelBg: "bg-star/5",
    },
    new: {
      button: "bg-luigi hover:bg-luigi",
      text: "text-white",
      panelBg: "bg-luigi/5",
    },
  }[headerColor]

  // Count active filters for badge display
  const filterCounts = useMemo(() => {
    const countDefined = (...values: any[]) => values.filter(v => v !== undefined && v !== null && v !== false).length
    
    return {
      audit: countDefined(filters.dexPaid, filters.minAge, filters.maxAge, filters.maxTop10Holders, filters.maxDevHolding, filters.maxSnipers),
      metrics: countDefined(filters.minLiquidityUsd, filters.maxLiquidityUsd, filters.minVolume24h, filters.maxVolume24h, filters.minMarketCap, filters.maxMarketCap),
      socials: countDefined(filters.requireTwitter, filters.requireTelegram, filters.requireWebsite),
      get total() { return this.audit + this.metrics + this.socials }
    }
  }, [filters])

  const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
    const numValue = typeof value === 'string' && value !== '' ? parseFloat(value) : undefined
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : (typeof value === 'string' && !isNaN(numValue!) ? numValue : value),
    })
  }

  const handleExport = () => {
    try {
      const exportData = JSON.stringify({
        category,
        filters,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      }, null, 2)

      navigator.clipboard.writeText(exportData)
      alert('Filters exported to clipboard')
    } catch (error) {
      alert('Failed to export filters')
    }
  }

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const imported = importFilters(text)
      if (imported) {
        onFiltersChange(imported.filters)
        setImportError(null)
        alert('Filters imported successfully')
      } else {
        throw new Error('Invalid filter data')
      }
    } catch (error: any) {
      setImportError(error.message || 'Failed to import filters')
    }
  }

  const resetFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className={cn("w-full", className)}>
      <Dialog open={isOpen} onOpenChange={onToggle}>
        {/* Filter Trigger Button */}
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex items-center gap-2 border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 font-bold w-full justify-center relative",
              colorTheme.button,
              colorTheme.text
            )}
          >
            <Settings className="h-4 w-4" />
            🎛️ Filters
            {filterCounts.total > 0 && (
              <span className="absolute -top-2 -right-2 bg-mario text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-outline font-bold">
                {filterCounts.total}
              </span>
            )}
          </Button>
        </DialogTrigger>

        {/* Filter Modal Content */}
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] p-0 overflow-hidden !bg-[#FFFAE9]">
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b-[3px] md:border-b-4 border-outline bg-[#FFFAE9]">
            <DialogTitle className="font-mario text-[18px] sm:text-[20px] md:text-[24px] text-outline">
              🎛️ Advanced Filters
            </DialogTitle>
            <DialogDescription className="sr-only">
              Filter tokens by audit, metrics, and social criteria
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(90vh-200px)]">
            <div className="bg-[#FFFAE9]">
              {/* Tabbed Interface */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="mario-tabs-horizontal grid w-full grid-cols-3">
                  <TabsTrigger
                    value="audit"
                    className="mario-tab-red flex items-center justify-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Audit</span>
                    {filterCounts.audit > 0 && (
                      <span className="bg-mario text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-outline font-bold min-w-[20px] text-center">
                        {filterCounts.audit}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="metrics"
                    className="mario-tab-yellow flex items-center justify-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">$ Metrics</span>
                    <span className="sm:hidden">$</span>
                    {filterCounts.metrics > 0 && (
                      <span className="bg-star text-outline text-xs px-1.5 py-0.5 rounded-full border-2 border-outline font-bold min-w-[20px] text-center">
                        {filterCounts.metrics}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="socials"
                    className="mario-tab-green flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Socials</span>
                    {filterCounts.socials > 0 && (
                      <span className="bg-luigi text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-outline font-bold min-w-[20px] text-center">
                        {filterCounts.socials}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Audit Tab */}
                <TabsContent value="audit" className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-[#FFFAE9]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* DEX Paid */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dexPaid"
                        checked={filters.dexPaid || false}
                        onCheckedChange={(checked) => handleFilterChange('dexPaid', checked)}
                      />
                      <Label htmlFor="dexPaid" className="text-sm font-bold text-outline">
                        DEX Paid (Freeze & Mint Revoked)
                      </Label>
                    </div>

                    {/* Age Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Age (minutes)
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.minAge || ''}
                            onChange={(e) => handleFilterChange('minAge', e.target.value)}
                            className="border-3 border-outline focus:border-mario rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            value={filters.maxAge || ''}
                            onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                            className="border-3 border-outline focus:border-mario rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Top 10 Holders */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline">Top 10 Holders %</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.maxTop10Holders || ''}
                            onChange={(e) => handleFilterChange('maxTop10Holders', e.target.value)}
                            className="border-3 border-outline focus:border-mario rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            disabled
                            className="border-3 border-outline rounded font-mono bg-white opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dev Holding */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline">Dev Holding %</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.maxDevHolding || ''}
                            onChange={(e) => handleFilterChange('maxDevHolding', e.target.value)}
                            className="border-3 border-outline focus:border-mario rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            disabled
                            className="border-3 border-outline rounded font-mono bg-white opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* $ Metrics Tab */}
                <TabsContent value="metrics" className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-[#FFFAE9]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Liquidity */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Liquidity ($)
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.minLiquidityUsd || ''}
                            onChange={(e) => handleFilterChange('minLiquidityUsd', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            value={filters.maxLiquidityUsd || ''}
                            onChange={(e) => handleFilterChange('maxLiquidityUsd', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Volume 24h */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline">Volume 24h ($)</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.minVolume24h || ''}
                            onChange={(e) => handleFilterChange('minVolume24h', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            value={filters.maxVolume24h || ''}
                            onChange={(e) => handleFilterChange('maxVolume24h', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Market Cap */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-outline">Market Cap ($)</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Min"
                            type="number"
                            value={filters.minMarketCap || ''}
                            onChange={(e) => handleFilterChange('minMarketCap', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Max"
                            type="number"
                            value={filters.maxMarketCap || ''}
                            onChange={(e) => handleFilterChange('maxMarketCap', e.target.value)}
                            className="border-3 border-outline focus:border-star rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Socials Tab */}
                <TabsContent value="socials" className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-[#FFFAE9]">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Social Requirements */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requireTwitter"
                          checked={filters.requireTwitter || false}
                          onCheckedChange={(checked) => handleFilterChange('requireTwitter', checked)}
                        />
                        <Label htmlFor="requireTwitter" className="text-sm font-bold text-outline flex items-center gap-2">
                          <Twitter className="h-4 w-4" />
                          Require Twitter
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requireTelegram"
                          checked={filters.requireTelegram || false}
                          onCheckedChange={(checked) => handleFilterChange('requireTelegram', checked)}
                        />
                        <Label htmlFor="requireTelegram" className="text-sm font-bold text-outline flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Require Telegram
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requireWebsite"
                          checked={filters.requireWebsite || false}
                          onCheckedChange={(checked) => handleFilterChange('requireWebsite', checked)}
                        />
                        <Label htmlFor="requireWebsite" className="text-sm font-bold text-outline flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Require Website
                        </Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 sm:pt-4 border-t-[3px] md:border-t-4 border-outline bg-[#FFFAE9]">
            <div className="flex gap-2 justify-center sm:justify-start">
              <Button
                onClick={handleImport}
                variant="outline"
                size="sm"
                className={cn(
                  marioStyles.button('outline', 'sm'),
                  'bg-card'
                )}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className={cn(
                  marioStyles.button('outline', 'sm'),
                  'bg-card'
                )}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className={cn(
                  marioStyles.button('outline', 'sm'),
                  'bg-card'
                )}
              >
                Reset
              </Button>
            </div>

            <Button
              onClick={() => {
                onApply()
                onToggle() // Close modal after applying
              }}
              className={cn(
                "w-full sm:w-auto border-[3px] md:border-[4px] border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 font-bold min-h-[44px] touch-manipulation",
                colorTheme.button,
                colorTheme.text
              )}
            >
              Apply All
            </Button>
          </div>

          {/* Import Error */}
          {importError && (
            <div className="px-6 pb-4 bg-mario/10 border-t-4 border-mario text-mario font-bold text-sm">
              {importError}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
