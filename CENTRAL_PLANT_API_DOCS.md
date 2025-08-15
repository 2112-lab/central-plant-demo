# Central Plant API Documentation

## Overview

The `@2112-lab/central-plant` npm module provides a comprehensive API for creating, managing, and visualizing 3D central plant systems. This module allows developers to programmatically add components, create connections, translate objects, and manage complex HVAC system layouts.

## Installation

### NPM Installation

```bash
npm install @2112-lab/central-plant
```

### Local Development Setup

This project uses a nested repository setup for local development of the Central Plant module:

1. **Clone the main application:**
   ```bash
   git clone https://github.com/2112-lab/central-plant-demo.git
   cd central-plant-demo
   ```

2. **Set up local development mode:**
   ```bash
   echo "LOCAL_DEV=true" > .env
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000/`

### Repository Structure for Local Development

- `central-plant-demo/` - Main Nuxt.js application (has own .git repository)
- `central-plant-demo/central-plant/` - Nested module repository (has own .git repository)
- Both repositories have independent version control and commit history

## Quick Start

### Basic Usage

```javascript
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

// Initialize the Central Plant instance
const centralPlant = new CentralPlant()

// Initialize the 3D scene viewer
const container = document.getElementById('scene-container')
const sceneViewer = new SceneViewerEnhanced(container, centralPlant)

// Initialize the scene
await sceneViewer.init()
```

### Vue.js/Nuxt.js Integration

```vue
<template>
  <div>
    <div ref="sceneContainer" style="width: 100%; height: 500px;"></div>
  </div>
</template>

<script>
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

export default {
  data() {
    return {
      centralPlant: null,
      sceneViewer: null
    }
  },
  
  async mounted() {
    // Initialize Central Plant
    this.centralPlant = new CentralPlant()
    
    // Initialize Scene Viewer
    this.sceneViewer = new SceneViewerEnhanced(
      this.$refs.sceneContainer, 
      this.centralPlant, 
      this
    )
    
    await this.sceneViewer.init()
  },
  
  beforeDestroy() {
    // Clean up resources
    if (this.sceneViewer) {
      this.sceneViewer.dispose()
    }
    if (this.centralPlant) {
      this.centralPlant.dispose()
    }
  }
}
</script>
```

## Core API Reference

### CentralPlant Class

The main class for managing central plant systems.

#### Constructor

```javascript
const centralPlant = new CentralPlant()
```

#### Component Management

##### addComponent(libraryId, options?)

Adds a new component to the scene.

```javascript
// Add a cooling tower
const component = centralPlant.addComponent('COOLING-TOWER')

// Add a pump with custom position
const pump = centralPlant.addComponent('PUMP', {
  position: { x: 2.5, y: 0, z: -5.0 },
  rotation: { x: 0, y: 90, z: 0 }
})
```

**Parameters:**
- `libraryId` (string): Component type identifier
  - Available types: `'PUMP'`, `'CHILLER'`, `'COOLING-TOWER'`
- `options` (object, optional): Configuration options
  - `position` (object): `{ x, y, z }` coordinates
  - `rotation` (object): `{ x, y, z }` rotation angles in degrees

**Returns:** Component object with UUID and properties

##### getComponentIds()

Retrieves all component IDs in the current scene.

```javascript
const componentIds = centralPlant.getComponentIds()
// Returns: ['component-uuid-1', 'component-uuid-2', ...]
```

##### translate(componentId, axis, value)

Moves a component along a specified axis.

```javascript
// Move component 2.5 units along X-axis
centralPlant.translate('component-uuid', 'x', 2.5)

// Move component -1.0 units along Z-axis
centralPlant.translate('component-uuid', 'z', -1.0)
```

**Parameters:**
- `componentId` (string): UUID of the component to translate
- `axis` (string): Movement axis - `'x'`, `'y'`, or `'z'`
- `value` (number): Distance to move (must be multiple of 0.5)

#### Connection Management

##### addConnection(sourceConnectorId, destinationConnectorId)

Creates a connection between two component connectors.

```javascript
const connection = centralPlant.addConnection(
  'COOLING-TOWER-CONNECTOR-1',
  'PUMP-1-CONNECTOR-2'
)
```

**Parameters:**
- `sourceConnectorId` (string): ID of the source connector
- `destinationConnectorId` (string): ID of the destination connector

**Returns:** Connection object or null if failed

##### removeConnection(sourceConnectorId, destinationConnectorId)

Removes an existing connection.

```javascript
const wasRemoved = centralPlant.removeConnection(
  'COOLING-TOWER-CONNECTOR-1',
  'PUMP-1-CONNECTOR-2'
)
```

**Returns:** Boolean indicating success

##### getConnections()

Retrieves all current connections in the scene.

```javascript
const connections = centralPlant.getConnections()
// Returns array of connection objects
```

##### getAvailableConnections()

Gets all connector IDs that are not currently used in connections.

```javascript
const availableConnectors = centralPlant.getAvailableConnections()
// Returns: ['PUMP-1-CONNECTOR-1', 'CHILLER-CONNECTOR-2', ...]
```

##### updatePaths()

Updates and finalizes all connection paths in the scene.

```javascript
centralPlant.updatePaths()
```

**Note:** Call this method after adding/removing components or connections to ensure proper visual representation.

#### Scene Data Management

##### importScene(jsonData)

Loads a complete scene from JSON data.

```javascript
const sceneData = {
  connections: [...],
  scene: {
    object: {
      children: [...]
    }
  }
}

centralPlant.importScene(sceneData)
```

##### exportScene()

Exports the current scene as JSON data.

```javascript
const sceneData = centralPlant.exportScene()
```

##### setImportedSceneData(jsonData)

Stores complete scene data for later use.

```javascript
centralPlant.setImportedSceneData(jsonData)
```

#### Utility Methods

##### getUtility(utilityName)

Access internal utility modules.

```javascript
const modelPreloader = centralPlant.getUtility('modelPreloader')
const renderingEngine = centralPlant.getUtility('rendering3D')
```

##### dispose()

Clean up resources and dispose of the instance.

```javascript
centralPlant.dispose()
```

### SceneViewerEnhanced Class

Manages the 3D visualization and user interaction.

#### Constructor

```javascript
const sceneViewer = new SceneViewerEnhanced(container, centralPlant, parent)
```

**Parameters:**
- `container` (HTMLElement): DOM element to render the scene
- `centralPlant` (CentralPlant): Central Plant instance
- `parent` (object, optional): Parent Vue/React component for callbacks

#### Methods

##### init()

Initialize the scene viewer.

```javascript
const success = await sceneViewer.init()
```

##### loadSceneFromData(sceneData)

Load a scene from JSON data.

```javascript
await sceneViewer.loadSceneFromData(sceneData)
```

##### createEmptyScene()

Create a new empty scene.

```javascript
sceneViewer.createEmptyScene()
```

##### dispose()

Clean up and dispose of the scene viewer.

```javascript
sceneViewer.dispose()
```

## Component Library

### Available Component Types

| Library ID | Description | Default Connectors |
|------------|-------------|-------------------|
| `PUMP` | Centrifugal pump | 2 connectors (inlet/outlet) |
| `CHILLER` | Cooling chiller unit | 4 connectors (supply/return water, refrigerant) |
| `COOLING-TOWER` | Cooling tower | 2 connectors (hot/cold water) |

### Component Positioning

Components are positioned in 3D space using a coordinate system where:
- **X-axis**: Left (-) to Right (+)
- **Y-axis**: Down (-) to Up (+)  
- **Z-axis**: Back (-) to Front (+)

All position values must be multiples of 0.5 for proper grid alignment.

## Advanced Usage Examples

### Building a Complete System

```javascript
// Initialize
const centralPlant = new CentralPlant()

// Add components
const coolingTower = centralPlant.addComponent('COOLING-TOWER', {
  position: { x: 0, y: 0, z: 0 }
})

const pump = centralPlant.addComponent('PUMP', {
  position: { x: 3, y: 0, z: 0 }
})

const chiller = centralPlant.addComponent('CHILLER', {
  position: { x: 6, y: 0, z: 0 }
})

// Create connections
centralPlant.addConnection('COOLING-TOWER-CONNECTOR-1', 'PUMP-1-CONNECTOR-1')
centralPlant.addConnection('PUMP-1-CONNECTOR-2', 'CHILLER-CONNECTOR-1')
centralPlant.addConnection('CHILLER-CONNECTOR-2', 'COOLING-TOWER-CONNECTOR-2')

// Update paths to visualize connections
centralPlant.updatePaths()
```

### Dynamic Component Manipulation

```javascript
// Get all components
const componentIds = centralPlant.getComponentIds()

// Move first component
if (componentIds.length > 0) {
  centralPlant.translate(componentIds[0], 'x', 2.5)
  centralPlant.translate(componentIds[0], 'z', -1.0)
}

// Update paths after movement
centralPlant.updatePaths()
```

### Scene Import/Export

```javascript
// Export current scene
const sceneData = centralPlant.exportScene()

// Save to file or send to server
localStorage.setItem('my-plant-design', JSON.stringify(sceneData))

// Load scene later
const savedScene = JSON.parse(localStorage.getItem('my-plant-design'))
centralPlant.importScene(savedScene)
```

### Error Handling

```javascript
try {
  const component = centralPlant.addComponent('INVALID-TYPE')
} catch (error) {
  console.error('Failed to add component:', error.message)
}

try {
  centralPlant.translate('invalid-id', 'x', 1.0)
} catch (error) {
  console.error('Failed to translate component:', error.message)
}
```

## Event System

### Nuxt.js Events

The demo application uses Nuxt's event system for scene operations:

```javascript
// Load new scene
this.$nuxt.$emit('loadNewScene', sceneData)

// Create empty scene
this.$nuxt.$emit('createNewScene')
```

### Custom Event Handlers

```javascript
// Listen for scene changes
this.$nuxt.$on('loadNewScene', (sceneData) => {
  console.log('New scene loaded:', sceneData)
})

this.$nuxt.$on('createNewScene', () => {
  console.log('Empty scene created')
})
```

## Development Workflow

### Local Module Development

When `LOCAL_DEV=true` is set in `.env`:

1. **Module Resolution**: Points to `central-plant/src/index.js` (source files)
2. **Immediate Changes**: Modifications to `central-plant/src/` files are picked up immediately
3. **Git Workflow**: 
   - Module changes: `cd central-plant/` then commit to module repository
   - App changes: Stay in root directory, commit to app repository

### Building for Production

```bash
# Build the module (if working locally)
cd central-plant/
npm run build

# Build the application
cd ../
npm run build
```

### Testing API Methods

The demo application provides interactive examples. You can also test methods directly in the browser console:

```javascript
// Access the app instance
const app = document.querySelector('#appContainer').__vue__

// Test methods
app.addComponentExample()
app.translateComponentExample('component-id', 'x', 2.5)
app.addConnectionExample('connector-1', 'connector-2')
app.updatePathsExample()
```

## Troubleshooting

### Common Issues

1. **Components not appearing**: Ensure models are preloaded before adding components
2. **Connections not visible**: Call `updatePaths()` after adding/removing connections
3. **Translation not working**: Verify component ID exists and value is multiple of 0.5
4. **Scene not loading**: Check JSON format and component library availability

### Debug Information

Enable debug logging:

```javascript
// Check available components
console.log('Component IDs:', centralPlant.getComponentIds())

// Check available connectors
console.log('Available connectors:', centralPlant.getAvailableConnections())

// Check current connections
console.log('Current connections:', centralPlant.getConnections())
```

## API Reference Links

- **Full API Documentation**: [https://central-plant-api-docs.s3.us-east-1.amazonaws.com/v0.1.24/CentralPlant.html](https://central-plant-api-docs.s3.us-east-1.amazonaws.com/v0.1.24/CentralPlant.html)
- **Sample Files**: [https://drive.google.com/drive/u/0/folders/1EL6EWRr10p6Y6-vlU4qYAawyn6Ck9J5R](https://drive.google.com/drive/u/0/folders/1EL6EWRr10p6Y6-vlU4qYAawyn6Ck9J5R)

## Support

For issues, questions, or contributions, please refer to the GitHub repository or contact the development team.
