# Coordinate System Changes: Y-up to Z-up with Flipped Y

This document outlines the changes made to convert the Central Plant Demo from a Y-up coordinate system to a Z-up coordinate system with flipped Y direction.

## Overview

The application has been modified to use a **Z-up coordinate system with flipped Y direction** where:
- **Z-axis** is vertical (up)
- **X-axis** and **Y-axis** are horizontal
- **Y-axis** direction is flipped (negative Y values in the old system become positive)
- Ground plane is at Z=0
- Objects are positioned with Z values for height

## Files Modified

### 1. Camera Setup
- `central-plant/src/managers/scene/sceneInitializationManager.js`
  - Set camera.up.set(0, 0, 1) for Z-up orientation
  - Adjusted camera position from (-8, 4, 9) to (-8, 9, 4)
- `central-plant/src/core/sceneViewer.js`
  - Added camera.up.set(0, 0, 1) in initCamera()
- `central-plant/src/rendering/rendering3D.js`
  - Added Z-up orientation for camera creation

### 2. Environment and Ground
- `central-plant/src/managers/environment/environmentManager.js`
  - Ground plane: removed rotation.x = -Math.PI/2, set position.z = 0
  - Walls: changed from rotateY() to rotateZ() for rotations
  - Fog plane: removed rotation.x, set position.z = -3.0

### 3. Controls
- `central-plant/src/managers/scene/sceneInitializationManager.js`
  - Set controls.up = new THREE.Vector3(0, 0, 1) for OrbitControls

### 4. Direction Vector Rotations
- `central-plant/src/helpers/directionUtils.js`
- `central-plant/src/core/centralPlant.js`
  - Updated direction vector rotation logic for Z-up system:
    - X-axis rotation: Y→Z, Z→-Y
    - Y-axis rotation: X→-Z, Z→X  
    - Z-axis rotation: X→Y, Y→-X

### 5. Drag and Drop
- `central-plant/src/managers/controls/dragDropManager.js`
  - Changed ground plane from Vector3(0,1,0) to Vector3(0,0,1)
  - Updated height validation to use Z-axis

### 6. Scene Utilities
- `central-plant/src/helpers/sceneHelper.js`
  - Modified camera positioning to move along Y-axis instead of Z-axis
- `central-plant/src/managers/scene/sceneTooltipsManager.js`
  - Updated right vector calculation for Z-up system

### 7. API Documentation
- `central-plant/src/core/centralPlant.js`
  - Updated JSDoc comments to clarify Z is height in Z-up system

### 8. Default Positions
- `pages/index.vue`
  - Updated default component position from (x: -0.5, y: 0, z: -5.5) to (x: -0.5, y: -5.5, z: 0)

## Coordinate System Mapping

| Aspect | Y-up System | Z-up System with Flipped Y |
|--------|-------------|----------------------------|
| Vertical Axis | Y | Z |
| Ground Level | Y = 0 | Z = 0 |
| Camera Up Vector | (0, 1, 0) | (0, 0, 1) |
| Ground Plane Rotation | rotation.x = -π/2 | No rotation |
| Height Coordinate | Y values | Z values |
| Y Direction | Standard | Flipped (negative becomes positive) |

## Impact on Existing Data

Existing JSON scene files will need coordinate transformation:
- Y coordinates become Z coordinates for height
- Z coordinates become Y coordinates (with flipped direction)
- Direction vectors need rotation adjustment
- **Y-direction flip**: Positive Y values become negative, negative Y values become positive

## Testing Recommendations

1. **Camera Movement**: Verify orbit controls work correctly with Z-up orientation
2. **Component Placement**: Test that components place on ground (Z=0)
3. **Rotations**: Verify component rotations work as expected
4. **Drag & Drop**: Test object placement and snapping
5. **Existing Scenes**: Test loading of existing JSON files (may need conversion)

## Benefits of Z-up System with Flipped Y

- Consistent with many CAD and engineering applications
- More intuitive for industrial/mechanical applications
- Aligns with common 3D modeling conventions
- Better for architectural and engineering visualizations
- Y-direction flip provides better compatibility with certain industry standards

## Migration Notes

For developers working with existing scenes:
- Update any hardcoded Y-coordinates used for height to Z-coordinates
- **Apply Y-direction flip**: Change positive Y to negative Y and vice versa
- Review custom components for coordinate assumptions
- Test all positioning and rotation logic
- Update any external tools or exporters that generate scene data
