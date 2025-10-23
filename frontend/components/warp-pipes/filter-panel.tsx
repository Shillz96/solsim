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
          className="flex items-center gap-2 border-3 border-pipe-900 shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-pipe-900 font-bold"
        >
          <Settings className="h-4 w-4" />
          🎛️ Filters
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div className="bg-white border-4 border-pipe-900 rounded-[16px] shadow-[6px_6px_0_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-b-4 border-pipe-900 rounded-none bg-pipe-100 p-0">
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-mario-500 data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-none border-r-2 border-pipe-900 font-bold transition-all text-pipe-700 flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Audit
                {filterCounts.audit > 0 && (
                  <span className="bg-mario-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-pipe-900 font-bold">
                    {filterCounts.audit}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="data-[state=active]:bg-star-500 data-[state=active]:text-pipe-900 data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-none border-r-2 border-pipe-900 font-bold transition-all text-pipe-700 flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                $ Metrics
                {filterCounts.metrics > 0 && (
                  <span className="bg-star-500 text-pipe-900 text-xs px-1.5 py-0.5 rounded-full border-2 border-pipe-900 font-bold">
                    {filterCounts.metrics}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="socials"
                className="data-[state=active]:bg-luigi-500 data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-none font-bold transition-all text-pipe-700 flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Socials
                {filterCounts.socials > 0 && (
                  <span className="bg-luigi-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-pipe-900 font-bold">
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
                  <Label htmlFor="dexPaid" className="text-sm font-bold text-pipe-900">
                    DEX Paid (Freeze & Mint Revoked)
                  </Label>
                </div>

                {/* Age Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-pipe-900 flex items-center gap-2">
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
                        className="border-3 border-pipe-300 focus:border-mario-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxAge || ''}
                        onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-mario-500 rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Top 10 Holders */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-pipe-900">Top 10 Holders %</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.maxTop10Holders || ''}
                        onChange={(e) => handleFilterChange('maxTop10Holders', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-mario-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        disabled
                        className="border-3 border-pipe-200 rounded-[8px] font-mono bg-pipe-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Dev Holding */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-pipe-900">Dev Holding %</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.maxDevHolding || ''}
                        onChange={(e) => handleFilterChange('maxDevHolding', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-mario-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        disabled
                        className="border-3 border-pipe-200 rounded-[8px] font-mono bg-pipe-100"
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
                  <Label className="text-sm font-bold text-pipe-900 flex items-center gap-2">
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
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxLiquidityUsd || ''}
                        onChange={(e) => handleFilterChange('maxLiquidityUsd', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Volume 24h */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-pipe-900">Volume 24h ($)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.minVolume24h || ''}
                        onChange={(e) => handleFilterChange('minVolume24h', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxVolume24h || ''}
                        onChange={(e) => handleFilterChange('maxVolume24h', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Market Cap */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-pipe-900">Market Cap ($)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Min"
                        type="number"
                        value={filters.minMarketCap || ''}
                        onChange={(e) => handleFilterChange('minMarketCap', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Max"
                        type="number"
                        value={filters.maxMarketCap || ''}
                        onChange={(e) => handleFilterChange('maxMarketCap', e.target.value)}
                        className="border-3 border-pipe-300 focus:border-star-500 rounded-[8px] font-mono"
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
                    <Label htmlFor="requireTwitter" className="text-sm font-bold text-pipe-900 flex items-center gap-2">
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
                    <Label htmlFor="requireTelegram" className="text-sm font-bold text-pipe-900 flex items-center gap-2">
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
                    <Label htmlFor="requireWebsite" className="text-sm font-bold text-pipe-900 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Require Website
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between p-4 border-t-4 border-pipe-900 bg-pipe-50">
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                variant="outline"
                size="sm"
                className="border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-pipe-900 font-bold"
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-pipe-900 font-bold"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:-translate-y-[1px] transition-all duration-200 bg-white text-pipe-900 font-bold"
              >
                Reset
              </Button>
            </div>

            <Button
              onClick={onApply}
              className="bg-mario-500 hover:bg-mario-600 text-white border-3 border-pipe-900 shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:-translate-y-[1px] transition-all duration-200 font-bold"
            >
              Apply All
            </Button>
          </div>

          {/* Import Error */}
          {importError && (
            <div className="p-4 bg-mario-100 border-t-4 border-mario-500 text-mario-700 font-bold text-sm">
              {importError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
