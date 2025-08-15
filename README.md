# Central Plant Demo

A comprehensive demonstration application for the `@2112-lab/central-plant` npm module, showcasing 3D visualization and programmatic control of HVAC central plant systems.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/2112-lab/central-plant-demo.git
cd central-plant-demo

# Install dependencies
npm install

# Set up local development (optional)
echo "LOCAL_DEV=true" > .env

# Start the development server
npm run dev
```

The application will be available at **http://localhost:3000/**

### NPM Module Installation

To use the Central Plant API in your own project:

```bash
npm install @2112-lab/central-plant
```

## 📚 Documentation

- **[Complete API Documentation](./CENTRAL_PLANT_API_DOCS.md)** - Comprehensive guide with examples
- **[Quick Reference](./QUICK_REFERENCE.md)** - Essential methods and patterns
- **[Online API Docs](https://central-plant-api-docs.s3.us-east-1.amazonaws.com/v0.1.24/CentralPlant.html)** - Full API reference
- **[Sample Files](https://drive.google.com/drive/u/0/folders/1EL6EWRr10p6Y6-vlU4qYAawyn6Ck9J5R)** - Example JSON scenes

## ✨ Features

### Interactive 3D Visualization
- Real-time 3D rendering of HVAC components
- Interactive component manipulation
- Dynamic connection visualization
- Professional lighting and materials

### Comprehensive Component Library
- **Pumps** - Centrifugal pumps with inlet/outlet connections
- **Chillers** - Multi-connector cooling units
- **Cooling Towers** - Heat rejection equipment
- Extensible architecture for additional components

### Programmatic API
- Add/remove components programmatically
- Create and manage connections between components
- Translate and position components in 3D space
- Import/export complete system designs
- Real-time path updates and visualization

### Development Tools
- Live API examples in the UI
- Browser console testing capabilities
- JSON scene import/export
- Component inspection tools

## 🛠 API Examples

### Basic Usage

```javascript
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

// Initialize the system
const centralPlant = new CentralPlant()
const sceneViewer = new SceneViewerEnhanced(container, centralPlant)
await sceneViewer.init()

// Add components
const pump = centralPlant.addComponent('PUMP')
const chiller = centralPlant.addComponent('CHILLER', {
  position: { x: 3, y: 0, z: 0 }
})

// Create connections
centralPlant.addConnection('PUMP-1-CONNECTOR-2', 'CHILLER-CONNECTOR-1')
centralPlant.updatePaths()
```

### Vue.js Integration

```vue
<template>
  <div ref="sceneContainer" style="width: 100%; height: 500px;"></div>
</template>

<script>
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

export default {
  async mounted() {
    this.centralPlant = new CentralPlant()
    this.sceneViewer = new SceneViewerEnhanced(this.$refs.sceneContainer, this.centralPlant)
    await this.sceneViewer.init()
    
    // Add your components here
    this.buildSystem()
  },
  
  methods: {
    buildSystem() {
      // Create a simple pump and chiller system
      const pump = this.centralPlant.addComponent('PUMP')
      const chiller = this.centralPlant.addComponent('CHILLER')
      this.centralPlant.updatePaths()
    }
  }
}
</script>
```

## 🏗 Architecture

### Nested Repository Structure
This project uses a unique nested repository setup for local development:

- `central-plant-demo/` - Main Nuxt.js application
- `central-plant-demo/central-plant/` - Nested npm module source code

Each directory maintains its own Git repository, allowing independent version control for the application and the module.

### Module Resolution
- **Development mode** (`LOCAL_DEV=true`): Uses `central-plant/src/index.js`
- **Production mode**: Uses published npm package `@2112-lab/central-plant`

## 🔧 Development

### Local Module Development

When working on the central-plant module locally:

```bash
# Work on module code
cd central-plant/
# Make changes to src/ files
# Commit to module repository
git add .
git commit -m "Module changes"

# Work on demo app
cd ../
# Make changes to app files  
# Commit to app repository
git add .
git commit -m "App changes"
```

### Building

```bash
# Build the module (if developing locally)
cd central-plant/
npm run build

# Build the demo application
cd ../
npm run build
```

### Testing

The demo application provides interactive examples for testing all API methods:

1. Open the browser developer console
2. Use the interactive panels on the right side of the application
3. Test methods directly: `app.addComponentExample()`, `app.translateComponentExample()`, etc.

## 🎯 Use Cases

### HVAC System Design
- Design and visualize central plant layouts
- Test component arrangements and connections
- Export designs for implementation

### Educational Tools
- Interactive learning for HVAC engineering
- Component relationship demonstrations
- System flow visualization

### Integration Projects
- Embed 3D plant visualization in existing applications
- Programmatic system generation from data
- Real-time system monitoring displays

## 📋 Available Components

| Component Type | Library ID | Description | Connectors |
|----------------|------------|-------------|------------|
| Pump | `PUMP` | Centrifugal pump unit | 2 (inlet/outlet) |
| Chiller | `CHILLER` | Cooling chiller system | 4 (supply/return water, refrigerant) |
| Cooling Tower | `COOLING-TOWER` | Heat rejection tower | 2 (hot/cold water) |

## 🔗 Key API Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `addComponent(type, options)` | Add new component | `addComponent('PUMP')` |
| `translate(id, axis, value)` | Move component | `translate(id, 'x', 2.5)` |
| `addConnection(from, to)` | Connect components | `addConnection(id1, id2)` |
| `updatePaths()` | Refresh connections | `updatePaths()` |
| `getComponentIds()` | List all components | `getComponentIds()` |
| `getAvailableConnections()` | List free connectors | `getAvailableConnections()` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the demo application
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: See the comprehensive docs in this repository
- **Examples**: Interactive examples available in the demo application
- **API Reference**: [Online documentation](https://central-plant-api-docs.s3.us-east-1.amazonaws.com/v0.1.24/CentralPlant.html)
