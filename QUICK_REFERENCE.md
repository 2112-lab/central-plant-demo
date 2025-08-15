# Central Plant API Quick Reference

## Installation

```bash
npm install @2112-lab/central-plant
```

## Basic Setup

```javascript
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

// Initialize
const centralPlant = new CentralPlant()
const sceneViewer = new SceneViewerEnhanced(container, centralPlant)
await sceneViewer.init()
```

## Core Methods

### Add Components
```javascript
// Available types: 'PUMP', 'CHILLER', 'COOLING-TOWER'
const component = centralPlant.addComponent('COOLING-TOWER')

// With position
const pump = centralPlant.addComponent('PUMP', {
  position: { x: 2.5, y: 0, z: -5.0 }
})
```

### Move Components
```javascript
// Move component (values must be multiples of 0.5)
centralPlant.translate(componentId, 'x', 2.5)
centralPlant.translate(componentId, 'y', 1.0)
centralPlant.translate(componentId, 'z', -1.5)
```

### Create Connections
```javascript
// Connect two components
centralPlant.addConnection(sourceConnectorId, destinationConnectorId)

// Update visualization (call after adding/removing connections)
centralPlant.updatePaths()
```

### Query Methods
```javascript
// Get all component IDs
const componentIds = centralPlant.getComponentIds()

// Get available (unused) connector IDs
const availableConnectors = centralPlant.getAvailableConnections()

// Get all current connections
const connections = centralPlant.getConnections()
```

### Scene Management
```javascript
// Import scene from JSON
centralPlant.importScene(jsonData)

// Export current scene
const sceneData = centralPlant.exportScene()
```

## Vue.js Example

```vue
<template>
  <div ref="sceneContainer" style="width: 100%; height: 500px;"></div>
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
    this.centralPlant = new CentralPlant()
    this.sceneViewer = new SceneViewerEnhanced(this.$refs.sceneContainer, this.centralPlant)
    await this.sceneViewer.init()
  },
  
  methods: {
    addPump() {
      return this.centralPlant.addComponent('PUMP')
    },
    
    movePump(pumpId) {
      this.centralPlant.translate(pumpId, 'x', 3.0)
      this.centralPlant.updatePaths()
    }
  },
  
  beforeDestroy() {
    this.sceneViewer?.dispose()
    this.centralPlant?.dispose()
  }
}
</script>
```

## Component Types & Connectors

| Component | Library ID | Typical Connectors |
|-----------|------------|-------------------|
| Pump | `PUMP` | `PUMP-1-CONNECTOR-1`, `PUMP-1-CONNECTOR-2` |
| Chiller | `CHILLER` | `CHILLER-CONNECTOR-1` through `CHILLER-CONNECTOR-4` |
| Cooling Tower | `COOLING-TOWER` | `COOLING-TOWER-CONNECTOR-1`, `COOLING-TOWER-CONNECTOR-2` |

## Common Patterns

### Build a Simple System
```javascript
// Add components
const tower = centralPlant.addComponent('COOLING-TOWER')
const pump = centralPlant.addComponent('PUMP', { position: { x: 3, y: 0, z: 0 } })

// Connect them
centralPlant.addConnection('COOLING-TOWER-CONNECTOR-1', 'PUMP-1-CONNECTOR-1')
centralPlant.updatePaths()
```

### Handle Errors
```javascript
try {
  const component = centralPlant.addComponent('PUMP')
} catch (error) {
  console.error('Failed to add pump:', error.message)
}
```

For complete documentation, see [CENTRAL_PLANT_API_DOCS.md](./CENTRAL_PLANT_API_DOCS.md)
