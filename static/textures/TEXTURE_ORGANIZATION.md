# Texture Organization

This directory contains organized texture assets for the 3D pathfinding application. All textures are organized into named folders following a consistent structure.

## Folder Structure

Each texture set is organized in its own folder with the following naming convention:
```
textures/
├── [material_name]_[resolution]/
│   ├── diffuse.jpg    # Base color/albedo map
│   ├── normal.jpg     # Normal map for surface detail
│   └── rough.jpg      # Roughness map for material properties
```

## Current Texture Sets

### pavement_03_2k/
- **Purpose**: Brick wall material
- **Resolution**: 2K (2048x1024x2048x1024)
- **Usage**: Perimeter walls in the scene
- **Properties**: High roughness, low metalness, realistic brick appearance

### gravel_embedded_concrete_2k/
- **Purpose**: Textured concrete with embedded gravel
- **Resolution**: 2K (2048x2048x1024)
- **Usage**: Alternative ground material
- **Properties**: High roughness, very low metalness, detailed surface

## File Naming Convention

All texture files within each folder follow this standard naming:
- `diffuse.jpg` - Base color/albedo texture
- `normal.jpg` - Normal map for surface bumps and details
- `rough.jpg` - Roughness map (grayscale, white = rough, black = smooth)

## Adding New Texture Sets

To add a new texture set:

1. Create a new folder: `[material_name]_[resolution]/`
2. Add the three required texture files with standard names
3. Update `src/central-plant/textureConfig.js` to include the new texture set
4. Use the helper functions in `textureConfig.js` to load and apply textures

## Usage in Code

### Using the Texture Configuration Helper

```javascript
import { loadTextureSetAndCreateMaterial } from '@/central-plant/textureConfig'

// Load and create material in one step
const brickMaterial = await loadTextureSetAndCreateMaterial('brick', textureLoader)

// Or load texture set and customize material
const textureSet = await loadTextureSet('concrete', textureLoader)
const customMaterial = createMaterialFromTextureSet(textureSet, {
  color: 0x999999, // Custom tint
  roughness: 0.8   // Custom roughness override
})
```

### Manual Loading (Legacy)

```javascript
// Load individual textures
Promise.all([
  loadTexture('https://central-plant-assets.s3.us-east-1.amazonaws.com/textures/brick_1k/diffuse.jpg'),
  loadTexture('https://central-plant-assets.s3.us-east-1.amazonaws.com/textures/brick_1k/normal.jpg'),
  loadTexture('https://central-plant-assets.s3.us-east-1.amazonaws.com/textures/brick_1k/rough.jpg')
]).then(([diffuse, normal, roughness]) => {
  // Configure and use textures...
})
```

## Technical Requirements

- **Format**: JPEG for best compression and compatibility
- **Resolution**: 1K (1024x1024) recommended for performance
- **Color Space**: sRGB for diffuse maps, linear for normal/roughness maps
- **File Size**: Keep under 1MB per texture when possible

## Quality Guidelines

- **Diffuse Maps**: Should contain base color only, no lighting information
- **Normal Maps**: OpenGL format (Y+ up), encoded in tangent space
- **Roughness Maps**: Grayscale, white = maximum roughness, black = mirror-like
- **Seamless Tiling**: All textures should tile seamlessly for repeating patterns

## Performance Considerations

- Use 1K resolution for most applications
- Consider 2K only for hero materials or close-up viewing
- Compress textures appropriately - JPEG quality 85-90% usually sufficient
- Test loading times and adjust compression as needed

## Maintenance

When updating texture sets:
1. Maintain the folder structure and naming convention
2. Update the texture configuration in `textureConfig.js`
3. Test all materials in the application
4. Update this README if adding new categories or conventions
