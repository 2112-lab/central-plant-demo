<template>
  <div class="scene-container">
    <!-- LED Status Indicator -->
    <div 
      class="updatePaths-led-indicator" 
      :class="{ 'active': shouldUpdatePaths }"
      @click="toggleShouldUpdatePaths"
      :title="`Auto-Update Paths: ${shouldUpdatePaths ? 'ON' : 'OFF'} (Click to toggle)`"
    >
      <div class="led-light"></div>
      <span class="led-label">Auto-Update Paths</span>
    </div>
    
    <!-- Scene viewport -->
    <div
      ref="container"
      class="scene-viewport"
    >
      <v-btn 
        class="camera-rotate-btn"
        @click="toggleCameraRotation"
        :class="{ active: isAutoRotating }"
        title="Toggle camera auto-rotation"
      >
        <v-icon start class="mr-2">mdi-rotate-3d</v-icon>
        <span v-if="isAutoRotating">Stop Rotation</span>
        <span v-else>Auto Rotate</span>
      </v-btn>
      <!-- Scene content will be rendered here by the pure JavaScript SceneViewer -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'SceneViewerWrapper',
  props: {
    centralPlant: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      // Pure JavaScript SceneViewer instance
      sceneViewer: null,
      
      // UI state
      shouldUpdatePaths: true,
      isAutoRotating: false,
      
      // Instance tracking
      instanceId: Date.now() + Math.random()
    }
  },
  
  async mounted() {
    console.log('🚀 SceneViewerWrapper mounting...', {
      instanceId: this.instanceId,
      centralPlant: !!this.centralPlant
    })
    
    try {
      await this.initializeSceneViewer()
      this.setupEventListeners()
      
      console.log('✅ SceneViewerWrapper mounted successfully')
      
    } catch (error) {
      console.error('❌ Error mounting SceneViewerWrapper:', error)
      this.$emit('error', error)
    }
  },
  
  beforeDestroy() {
    this.cleanup()
  },
  
  // Vue 3 compatibility
  beforeUnmount() {
    this.cleanup()
  },
  
  methods: {
    /**
     * Initialize the pure JavaScript SceneViewer
     */
    async initializeSceneViewer() {
      if (!this.$refs.container) {
        throw new Error('Container ref not available')
      }
      
      if (!this.centralPlant) {
        throw new Error('CentralPlant not provided as prop - required for SceneViewer creation')
      }
      
      // Get the SceneViewer class from centralPlant
      const SceneViewer = this.centralPlant.getSceneViewerClass()
      if (!SceneViewer) {
        throw new Error('SceneViewer class not available from CentralPlant')
      }
      
      // Create the pure JavaScript SceneViewer instance
      this.sceneViewer = new SceneViewer(
        this.$refs.container,
        {
          enableAutoRotation: false,
          enableShadows: true,
          enableBloom: true,
          enableSSAO: false,
          antialias: true
        },
        this.centralPlant
      )
      
      // Set this wrapper on the centralPlant for backward compatibility
      this.centralPlant.setSceneViewer(this.sceneViewer)
      
      console.log('🏗️ Pure JavaScript SceneViewer created from CentralPlant')
    },
    
    /**
     * Set up event listeners between the pure SceneViewer and Vue/Nuxt
     */
    setupEventListeners() {
      if (!this.sceneViewer) return
      
      // Listen to SceneViewer events and emit Vue events
      this.sceneViewer.on('initialized', (data) => {
        console.log('🎉 SceneViewer initialized')
        this.$emit('initialized', data)
      })
      
      this.sceneViewer.on('objectSelected', (data) => {
        console.log('🎯 Object selected:', data.object?.name || 'none')
        this.$emit('objectSelectedForTransform', data.object)
      })
      
      this.sceneViewer.on('componentDropped', (data) => {
        console.log('🎯 Component dropped:', data.componentData?.name || 'unknown')
        this.$emit('componentAddedViaDrop', data)
      })
      
      this.sceneViewer.on('dropError', (data) => {
        console.error('❌ Drop error:', data.error)
        this.$emit('componentPlacementCanceled', {
          reason: 'parse-error',
          message: 'Error parsing dropped component data'
        })
      })
      
      this.sceneViewer.on('sceneLoaded', (data) => {
        console.log('📦 Scene loaded')
        this.$emit('sceneDataUpdated', {
          action: 'scene-loaded',
          sceneData: data.sceneData
        })
      })
      
      this.sceneViewer.on('error', (data) => {
        console.error('❌ SceneViewer error:', data.error)
        this.$emit('error', data.error)
      })
      
      // Listen to Nuxt events and forward to SceneViewer
      this.$nuxt.$on('scene-config-changed', this.handleSceneConfigChanged)
      this.$nuxt.$on('loadNewScene', this.handleLoadNewScene)
      this.$nuxt.$on('createNewScene', this.handleCreateNewScene)
      
      console.log('👂 Event listeners set up between SceneViewer and Vue/Nuxt')
    },
    
    /**
     * Handle scene configuration changes from Nuxt
     */
    handleSceneConfigChanged(settings) {
      console.log('⚙️ Scene configuration changed:', settings)
      
      if (settings.scene && settings.scene.hasOwnProperty('autoRotation')) {
        const shouldAutoRotate = settings.scene.autoRotation
        const currentlyRotating = this.sceneViewer?.cameraControlsManager?.isAutoRotating() || false
        
        if (shouldAutoRotate !== currentlyRotating) {
          this.toggleCameraRotation()
        }
      }
    },
    
    /**
     * Handle load new scene event from Nuxt
     */
    async handleLoadNewScene(sceneData) {
      console.log('📦 Loading new scene from Nuxt event:', sceneData)
      
      if (this.sceneViewer) {
        await this.sceneViewer.loadScene(sceneData)
      }
    },
    
    /**
     * Handle create new scene event from Nuxt
     */
    handleCreateNewScene() {
      console.log('🆕 Creating new scene from Nuxt event')
      
      if (this.sceneViewer) {
        // Clear the current scene
        this.sceneViewer.loadScene({ scene: { object: { children: [] } }, connections: [] })
      }
    },
    
    /**
     * Toggle camera auto-rotation
     */
    toggleCameraRotation() {
      if (!this.sceneViewer) return false
      
      const newState = this.sceneViewer.toggleCameraRotation()
      this.isAutoRotating = newState
      
      // Force Vue reactivity update
      this.$forceUpdate()
      
      return newState
    },
    
    /**
     * Toggle path auto-update setting
     */
    toggleShouldUpdatePaths() {
      this.shouldUpdatePaths = !this.shouldUpdatePaths
      
      if (this.sceneViewer) {
        this.sceneViewer.shouldUpdatePaths = this.shouldUpdatePaths
      }
    },
    
    /**
     * Add component to scene - API method for parent components
     */
    addComponentToScene(componentData) {
      if (!this.sceneViewer) {
        console.error('❌ SceneViewer not available for adding components')
        return false
      }
      
      return this.sceneViewer.addComponentToScene(componentData)
    },
    
    /**
     * Export scene - API method for parent components
     */
    downloadSceneExport() {
      if (!this.sceneViewer) {
        console.error('❌ SceneViewer not available for export')
        return false
      }
      
      const exportData = this.sceneViewer.exportScene()
      if (exportData) {
        // Create and trigger download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `scene-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        return true
      }
      
      return false
    },
    
    /**
     * Select object - API method for parent components
     */
    selectObject(object) {
      if (this.sceneViewer) {
        this.sceneViewer.selectObject(object)
      }
    },
    
    /**
     * Get selected transform - API method for parent components
     */
    getSelectedTransform() {
      return this.sceneViewer?.getSelectedTransform() || null
    },
    
    /**
     * Update pathfinding with connections - API method for parent components
     */
    async updatePathfindingWithConnections(connectionsData) {
      if (this.sceneViewer?.pathfindingManager) {
        try {
          await this.sceneViewer.pathfindingManager.updateWithConnections(connectionsData)
          return true
        } catch (error) {
          console.error('❌ Error updating pathfinding:', error)
          return false
        }
      }
      return false
    },
    
    /**
     * Handle component drag start - API method for parent components
     */
    onComponentDragStart(componentData) {
      if (this.sceneViewer?.dragDropManager) {
        this.sceneViewer.dragDropManager.onDragStart(componentData)
      }
    },
    
    /**
     * Handle component drag end - API method for parent components
     */
    onComponentDragEnd(componentData) {
      if (this.sceneViewer?.dragDropManager) {
        this.sceneViewer.dragDropManager.onDragEnd(componentData)
      }
    },
    
    /**
     * Handle transform end - API method for parent components
     */
    onTransformEnd(component) {
      console.log('🔄 Transform end forwarded to SceneViewer:', component)
      
      if (this.sceneViewer) {
        // Emit transform end event through the SceneViewer event system
        this.sceneViewer.emit('transformEnd', { component })
        
        // Update pathfinding if auto-update is enabled
        if (this.shouldUpdatePaths && this.sceneViewer.pathfindingManager) {
          this.sceneViewer.pathfindingManager.updateAfterTransform()
        }
      }
    },
    
    /**
     * Clean up resources and event listeners
     */
    cleanup() {
      console.log('🧹 Cleaning up SceneViewerWrapper...')
      
      try {
        // Remove Nuxt event listeners
        this.$nuxt.$off('scene-config-changed', this.handleSceneConfigChanged)
        this.$nuxt.$off('loadNewScene', this.handleLoadNewScene)
        this.$nuxt.$off('createNewScene', this.handleCreateNewScene)
        
        // Dispose of the SceneViewer
        if (this.sceneViewer) {
          this.sceneViewer.dispose()
          this.sceneViewer = null
        }
        
        console.log('✅ SceneViewerWrapper cleanup completed')
        
      } catch (error) {
        console.error('❌ Error during SceneViewerWrapper cleanup:', error)
      }
    }
  }
}
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.scene-viewport {
  width: 100%;
  height: 100%;
  position: relative;
}

.updatePaths-led-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  z-index: 10;
  transition: background-color 0.3s ease;
}

.updatePaths-led-indicator:hover {
  background: rgba(0, 0, 0, 0.8);
}

.led-light {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  margin-right: 8px;
  transition: background-color 0.3s ease;
}

.updatePaths-led-indicator.active .led-light {
  background: #4CAF50;
  box-shadow: 0 0 6px #4CAF50;
}

.camera-rotate-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  transition: all 0.3s ease;
}

.camera-rotate-btn.active {
  background-color: #1976d2;
  color: white;
}
</style>
