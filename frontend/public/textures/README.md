# Noise Texture Required

To complete the ambient overlay system, you need to add a seamless noise texture at:

`/public/textures/noise-512.png`

## Requirements:
- **Size**: 512x512 pixels
- **Type**: PNG format
- **Content**: Subtle monochrome grain/noise pattern
- **Seamless**: Must tile seamlessly (repeatable pattern)
- **Color**: Grayscale (black & white)

## Where to Get:
1. **Generate online**: Search for "seamless noise texture generator" or use sites like:
   - Noise Texture Generator (noisepng.com)
   - Pattern Cooler
   - Filter Forge
   
2. **Create in Photoshop/GIMP**: 
   - Create 512x512 canvas
   - Add noise filter (Gaussian noise, ~10-20%)
   - Make seamless (Offset filter + heal edges)
   - Export as PNG

3. **Download free**: Search "free seamless noise texture 512px"

## How It's Used:
The noise texture is applied with `mix-blend-mode: overlay` at 3-5% opacity to add subtle paper-like grain and reduce flat UI glare. This complements the existing paper texture system.

## Current Status:
⚠️ Directory created but texture file is missing.
The ambient overlay will still work without it, but the paper grain effect won't be visible.
