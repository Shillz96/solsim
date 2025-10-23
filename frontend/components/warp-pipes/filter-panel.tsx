/**
 * Filter Panel Component - Axiom-style per-column filters
 * 
 * Collapsible filter panel with tabbed categories (Audit, $ Metrics, Socials)
 * Features Mario-themed styling with bold borders and 3D shadows
 */

"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChevronDown, 
  ChevronUp, 
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
import { exportFilters, importFilters } from "@/lib/warp-pipes-storage"

interface FilterPanelProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  category: 'new' | 'graduating' | 'bonded'
  isOpen: boolean
  onToggle: () => void
  onApply: () => void
  className?: string
}

export function FilterPanel({
  filters,
  onFiltersChange,
  category,
  isOpen,
  onToggle,
  onApply,
  className
}: FilterPanelProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'metrics' | 'socials'>('audit')
  const [importError, setImportError] = useState<string | null>(null)

  // Count active filters for badge display
  const filterCounts = useMemo(() => {
    const auditCount = [
      filters.dexPaid,
      filters.minAge !== undefined,
      filters.maxAge !== undefined,
      filters.maxTop10Holders !== undefined,
      filters.maxDevHolding !== undefined,
    ].filter(Boolean).length

    const metricsCount = [
      filters.minLiquidityUsd !== undefined,
      filters.maxLiquidityUsd !== undefined,
      filters.minVolume24h !== undefined,
      filters.maxVolume24h !== undefined,
      filters.minMarketCap !== undefined,
      filters.maxMarketCap !== undefined,
    ].filter(Boolean).length

    const socialsCount = [
      filters.requireTwitter,
      filters.requireTelegram,
      filters.requireWebsite,
    ].filter(Boolean).length

    return { audit: auditCount, metrics: metricsCount, socials: socialsCount }
  }, [filters])

  const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    })
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const result = importFilters(e.target?.result as string)
            if (result) {
              onFiltersChange(result.filters)
              setImportError(null)
            } else {
              setImportError('Invalid filter file format')
            }
          } catch (error) {
            setImportError('Failed to import filters')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleExport = () => {
    const jsonString = exportFilters(category)
    if (jsonString) {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `warp-pipes-${category}-filters.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const resetFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-3">
        <Button
          onClick={onToggle}
          variant="outline"
          className="flex items-center gap-2 border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-[var(--outline-black)] font-bold"
        >
          <Settings className="h-4 w-4" />
          🎛️ Filters
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div className="bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] overflow-hidden">
          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-b-4 border-[var(--outline-black)] rounded-none bg-white p-0">
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-[var(--mario-red)] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-none border-r-2 border-[var(--outline-black)] font-bold transition-all text-[var(--outline-black)] flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Audit
                {filterCounts.audit > 0 && (
                  <span className="bg-[var(--mario-red)] text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-[var(--outline-black)] font-bold">
                    {filterCounts.audit}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-none border-r-2 border-[var(--outline-black)] font-bold transition-all text-[var(--outline-black)] flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                $ Metrics
                {filterCounts.metrics > 0 && (
                  <span className="bg-[var(--star-yellow)] text-[var(--outline-black)] text-xs px-1.5 py-0.5 rounded-full border-2 border-[var(--outline-black)] font-bold">
                    {filterCounts.metrics}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="socials"
                className="data-[state=active]:bg-[var(--luigi-green)] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-none font-bold transition-all text-[var(--outline-black)] flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Socials
                {filterCounts.socials > 0 && (
                  <span className="bg-[var(--luigi-green)] text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-[var(--outline-black)] font-bold">
                    {filterCounts.socials}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Audit Tab */}
            <TabsContent value="audit" className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DEX Paid */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dexPaid"
                    checked={filters.dexPaid || false}
                    onCheckedChange={(checked) => handleFilterChange('dexPaid', checked)}
                  />
                  <Label htmlFor="dexPaid" className="text-sm font-bold text-[var(--outline-black)]">
                    DEX Paid (Freeze & Mint Revoked)
                  </Label>
                </div>

                {/* Age Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)] flex items-center gap-2">
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
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--mario-red)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxAge || ''}
                        onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--mario-red)] rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Top 10 Holders */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)]">Top 10 Holders %</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.maxTop10Holders || ''}
                        onChange={(e) => handleFilterChange('maxTop10Holders', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--mario-red)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        disabled
                        className="border-3 border-[var(--outline-black)] rounded-[8px] font-mono bg-[var(--background)] opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Dev Holding */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)]">Dev Holding %</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.maxDevHolding || ''}
                        onChange={(e) => handleFilterChange('maxDevHolding', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--mario-red)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        disabled
                        className="border-3 border-[var(--outline-black)] rounded-[8px] font-mono bg-[var(--background)] opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* $ Metrics Tab */}
            <TabsContent value="metrics" className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Liquidity */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)] flex items-center gap-2">
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
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxLiquidityUsd || ''}
                        onChange={(e) => handleFilterChange('maxLiquidityUsd', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Volume 24h */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)]">Volume 24h ($)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.minVolume24h || ''}
                        onChange={(e) => handleFilterChange('minVolume24h', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxVolume24h || ''}
                        onChange={(e) => handleFilterChange('maxVolume24h', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Market Cap */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[var(--outline-black)]">Market Cap ($)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.minMarketCap || ''}
                        onChange={(e) => handleFilterChange('minMarketCap', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxMarketCap || ''}
                        onChange={(e) => handleFilterChange('maxMarketCap', e.target.value)}
                        className="border-3 border-[var(--outline-black)] focus:border-[var(--star-yellow)] rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Socials Tab */}
            <TabsContent value="socials" className="p-4 space-y-4">
              <div className="space-y-4">
                {/* Social Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requireTwitter"
                      checked={filters.requireTwitter || false}
                      onCheckedChange={(checked) => handleFilterChange('requireTwitter', checked)}
                    />
                    <Label htmlFor="requireTwitter" className="text-sm font-bold text-[var(--outline-black)] flex items-center gap-2">
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
                    <Label htmlFor="requireTelegram" className="text-sm font-bold text-[var(--outline-black)] flex items-center gap-2">
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
                    <Label htmlFor="requireWebsite" className="text-sm font-bold text-[var(--outline-black)] flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Require Website
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between p-4 border-t-4 border-[var(--outline-black)] bg-white">
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                variant="outline"
                size="sm"
                className="border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-[var(--outline-black)] font-bold"
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-[var(--outline-black)] font-bold"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-[var(--outline-black)] font-bold"
              >
                Reset
              </Button>
            </div>

            <Button
              onClick={onApply}
              className="bg-[var(--mario-red)] hover:bg-[var(--mario-red)] text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all duration-200 font-bold"
            >
              Apply All
            </Button>
          </div>

          {/* Import Error */}
          {importError && (
            <div className="p-4 bg-[var(--mario-red)]/10 border-t-4 border-[var(--mario-red)] text-[var(--mario-red)] font-bold text-sm">
              {importError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
