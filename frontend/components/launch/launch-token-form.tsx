"use client"

/**
 * Launch Token Form Component
 * 
 * Mario-themed form for creating Solana tokens via PumpPortal API
 * Includes wallet connection, form validation, and image upload
 */

import { useState, useRef, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { validateImageFile, fileToBase64, createImagePreview, revokeImagePreview, formatFileSize } from "@/lib/upload-utils"
import type { LaunchTokenFormData } from "@/lib/types/launch-token"
import { useLaunchToken } from "@/hooks/use-launch-token"
import { Upload, X, Loader2, Wallet, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export function LaunchTokenForm() {
  const { connected, publicKey, wallet } = useWallet()
  const walletModal = useWalletModal()
  const router = useRouter()
  const { toast } = useToast()
  
  // Launch token hook
  const { launchToken, isLaunching } = useLaunchToken()
  
  // Form state
  const [formData, setFormData] = useState<LaunchTokenFormData>({
    name: "",
    symbol: "",
    description: "",
    image: null as any,
    twitter: "",
    telegram: "",
    website: "",
    showName: true
  })
  
  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handle form field changes
  const handleInputChange = (field: keyof LaunchTokenFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }))
    }
  }
  
  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    // Validate image
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image file")
      return
    }
    
    setImageError(null)
    setFormData(prev => ({ ...prev, image: file }))
    
    // Create preview
    const previewUrl = createImagePreview(file)
    setImagePreview(previewUrl)
  }, [])
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleImageUpload(file)
    }
  }
  
  // Remove image
  const removeImage = () => {
    if (imagePreview) {
      revokeImagePreview(imagePreview)
    }
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image: null }))
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Token name is required"
    } else if (formData.name.length > 32) {
      errors.name = "Token name must be 32 characters or less"
    }
    
    if (!formData.symbol.trim()) {
      errors.symbol = "Token symbol is required"
    } else if (formData.symbol.length > 10) {
      errors.symbol = "Token symbol must be 10 characters or less"
    } else if (!/^[A-Z0-9]+$/.test(formData.symbol)) {
      errors.symbol = "Token symbol must contain only uppercase letters and numbers"
    }
    
    if (!formData.description.trim()) {
      errors.description = "Description is required"
    } else if (formData.description.length > 500) {
      errors.description = "Description must be 500 characters or less"
    }
    
    if (!formData.image) {
      errors.image = "Token image is required"
    }
    
    // Validate URLs if provided
    if (formData.twitter && !isValidUrl(formData.twitter)) {
      errors.twitter = "Please enter a valid Twitter URL"
    }
    if (formData.telegram && !isValidUrl(formData.telegram)) {
      errors.telegram = "Please enter a valid Telegram URL"
    }
    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = "Please enter a valid website URL"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to launch a token",
        variant: "destructive"
      })
      return
    }
    
    if (!validateForm()) {
      toast({
        title: "Form validation failed",
        description: "Please fix the errors below",
        variant: "destructive"
      })
      return
    }
    
    // Launch the token using the hook
    launchToken(formData)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mario-card bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Wallet Connection Status */}
        {!connected ? (
          <div className="p-4 bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="w-5 h-5 text-[var(--outline-black)]" />
              <span className="font-semibold text-[var(--outline-black)]">Wallet Required</span>
            </div>
            <p className="text-sm text-[var(--outline-black)]/80 mb-3">
              Connect your Solana wallet to launch a token. You'll need SOL to pay the creation fee (~0.02 SOL).
            </p>
            <Button
              type="button"
              onClick={() => walletModal.setVisible(true)}
              className="mario-btn bg-[var(--mario-red)] hover:bg-[var(--mario-red-hover)] text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all"
            >
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="font-semibold text-[var(--outline-black)]">Wallet Connected</span>
              <span className="text-sm text-[var(--outline-black)]/80 ml-auto">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </span>
            </div>
          </div>
        )}
        
        {/* Token Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-[var(--outline-black)]">
            Token Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="My Awesome Token"
            maxLength={32}
            className={cn(
              "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
              formErrors.name && "border-[var(--mario-red)]"
            )}
          />
          {formErrors.name && (
            <p className="text-sm text-[var(--mario-red)] flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {formErrors.name}
            </p>
          )}
        </div>
        
        {/* Token Symbol */}
        <div className="space-y-2">
          <Label htmlFor="symbol" className="text-sm font-semibold text-[var(--outline-black)]">
            Token Symbol *
          </Label>
          <Input
            id="symbol"
            value={formData.symbol}
            onChange={(e) => handleInputChange("symbol", e.target.value.toUpperCase())}
            placeholder="MAT"
            maxLength={10}
            className={cn(
              "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
              formErrors.symbol && "border-[var(--mario-red)]"
            )}
          />
          {formErrors.symbol && (
            <p className="text-sm text-[var(--mario-red)] flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {formErrors.symbol}
            </p>
          )}
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold text-[var(--outline-black)]">
            Description *
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe your token and its purpose..."
            maxLength={500}
            rows={4}
            className={cn(
              "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
              formErrors.description && "border-[var(--mario-red)]"
            )}
          />
          <div className="flex justify-between text-xs text-[var(--outline-black)]/60">
            <span>{formData.description.length}/500 characters</span>
            {formErrors.description && (
              <span className="text-[var(--mario-red)] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.description}
              </span>
            )}
          </div>
        </div>
        
        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[var(--outline-black)]">
            Token Image *
          </Label>
          
          {!imagePreview ? (
            <div
              className={cn(
                "border-3 border-dashed border-[var(--outline-black)] rounded-lg p-8 text-center cursor-pointer transition-all hover:bg-[var(--sky-blue)]/10",
                imageError && "border-[var(--mario-red)]"
              )}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-[var(--outline-black)]/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--outline-black)] mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-[var(--outline-black)]/60">
                PNG, JPG, or GIF (max 2MB)
              </p>
              {imageError && (
                <p className="text-sm text-[var(--mario-red)] flex items-center justify-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  {imageError}
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Token preview"
                className="w-full h-32 object-cover border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg"
              />
              <Button
                type="button"
                onClick={removeImage}
                size="sm"
                className="absolute top-2 right-2 bg-[var(--mario-red)] hover:bg-[var(--mario-red-hover)] text-white border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-full w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        
        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--outline-black)]">Social Links (Optional)</h3>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-xs font-semibold text-[var(--outline-black)]">
                Twitter URL
              </Label>
              <Input
                id="twitter"
                value={formData.twitter}
                onChange={(e) => handleInputChange("twitter", e.target.value)}
                placeholder="https://twitter.com/yourusername"
                className={cn(
                  "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
                  formErrors.twitter && "border-[var(--mario-red)]"
                )}
              />
              {formErrors.twitter && (
                <p className="text-xs text-[var(--mario-red)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.twitter}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telegram" className="text-xs font-semibold text-[var(--outline-black)]">
                Telegram URL
              </Label>
              <Input
                id="telegram"
                value={formData.telegram}
                onChange={(e) => handleInputChange("telegram", e.target.value)}
                placeholder="https://t.me/yourchannel"
                className={cn(
                  "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
                  formErrors.telegram && "border-[var(--mario-red)]"
                )}
              />
              {formErrors.telegram && (
                <p className="text-xs text-[var(--mario-red)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.telegram}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website" className="text-xs font-semibold text-[var(--outline-black)]">
                Website URL
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="https://yourwebsite.com"
                className={cn(
                  "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg",
                  formErrors.website && "border-[var(--mario-red)]"
                )}
              />
              {formErrors.website && (
                <p className="text-xs text-[var(--mario-red)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.website}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Show Name Option */}
        <div className="flex items-center space-x-3">
          <Checkbox
            id="showName"
            checked={formData.showName}
            onCheckedChange={(checked) => handleInputChange("showName", checked as boolean)}
            className="border-2 border-[var(--outline-black)]"
          />
          <Label htmlFor="showName" className="text-sm font-semibold text-[var(--outline-black)]">
            Show token name in listings
          </Label>
        </div>
        
        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!connected || isLaunching}
          className="w-full mario-btn bg-[var(--mario-red)] hover:bg-[var(--mario-red-hover)] text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all font-mario text-lg py-3"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Launching Token...
            </>
          ) : (
            "Launch Token"
          )}
        </Button>
        
        {/* Cost Information */}
        <div className="text-center text-sm text-[var(--outline-black)]/60">
          Creation fee: ~0.02 SOL • Token will be listed immediately
        </div>
      </form>
    </motion.div>
  )
}
