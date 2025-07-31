<template>
  <div class="scene-container">    
    <!-- Scene viewport -->
    <div
      ref="container"
      class="scene-viewport"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
    >
      <!-- Scene content will be rendered here -->
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'

/*
 * UUID PRESERVATION STRATEGY:
 * This component prioritizes hardcoded UUIDs from JSON files over Three.js auto-generated UUIDs.
 * - All objects store their original hardcoded UUID in userData.originalUuid
 * - Matching logic prioritizes hardcoded UUIDs first, then falls back to name-based generation
 * - Export functions preserve hardcoded UUIDs using getHardcodedUuid() utility
 * - Import functions set both object.uuid and userData.originalUuid to the JSON UUID
 */

export default {
  name: 'SceneContainer',
  props: {
    centralPlant: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      // Instance tracking for hot-reload handling
      instanceId: Date.now() + Math.random(), // Unique instance identifier
      
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      pathfinder: null,
      composer: null,
      bloomPass: null,
      ssaoPass: null,
      envMap: null,
      textureLoader: null,
      gltfLoader: null,
      performanceMonitor: null,
      performanceUI: null,
      resizeObserver: null,      
      currentSceneData: null,
      
      // Flag to stop animation loop during cleanup
      isDestroyed: false, 

      // Transform controls
      transformManager: null,
      selectedObjectForTransform: null,
      transformMode: 'translate',
      transformSpace: 'world',
      transformHistory: [],
      objectSelectionHandler: null,
      previousTransformValues: null, // Store previous values for history tracking
        
      // Manager instances
      hotReloadManager: null,
      disposalManager: null,
      sceneExportManager: null,
      componentManager: null,
      sceneInitializationManager: null,
      environmentManager: null,
      keyboardControlsManager: null,
      pathfindingManager: null,      
      sceneOperationsManager: null,
      animationManager: null,
      cameraControlsManager: null,
      tooltipsManager: null,
      
      // Drag and drop manager
      dragDropManager: null,
      
      // Scene helper utility
      sceneHelper: null,
      
      // Pathfinder version cache
      pathfinderVersionInfo: null,
      
      // Transform settings
      shouldUpdatePaths: true // Toggle for automatic updates for paths after transforms
    }
  },  
  mounted() {
    // Use console.log initially since logger isn't attached yet
    console.log('Component mounting...', {
      instanceId: this.instanceId,
      isDevelopment: process.env.NODE_ENV === 'development',
      timestamp: new Date().toISOString()
    })
    
    try {
      // Check if centralPlant was passed as prop
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not provided as prop')
        return
      }
      
      // Set this scene viewer instance on the managers collection
      this.centralPlant.setSceneViewer(this)
      
      // Attach all managers and utilities to this component instance
      this.centralPlant.attachToComponent()
      
      // Now we can use the logger
      this.logger.info('Component mounting completed with managers attached')
      
      // Set up event listener for scene configuration changes
      this.$nuxt.$on('scene-config-changed', this.handleSceneConfigChanged)
      
      // Log pathfinder version information at component startup
      this.logPathfinderVersion('Component Startup')
      
      this.init()
      
      // Hot-reload detection for development
      if (process.env.NODE_ENV === 'development') {
        this.$nextTick(() => {
          // Safety check before calling setupHotReloadHandling
          if (this.hotReloadManager && typeof this.hotReloadManager.setupHotReloadHandling === 'function') {
            this.hotReloadManager.setupHotReloadHandling()
          } else {
            console.warn('⚠️ Cannot setup hot-reload handling: hotReloadManager is undefined or missing the method')
          }
        })
      }
    } catch (e) {
      console.error('Error during component mounting:', e)
    }
  },  
  
  beforeDestroy() {
    console.log('Starting comprehensive scene cleanup...')

    // Stop animation loop by setting a flag
    this.isDestroyed = true

    try {
      // Clean up event listeners
      this.$nuxt.$off('scene-config-changed', this.handleSceneConfigChanged)
      
      // Clean up hot-reload handlers (development only)
      if (this.hotReloadManager) {
        try {
          console.log('Cleaning up hot-reload handlers...')
          this.hotReloadManager.cleanupHotReloadHandlers()
        } catch (e) {
          console.error('Error cleaning up hot-reload handlers:', e)
        } finally {
          // Ensure reference is always nullified even if cleanup fails
          this.hotReloadManager = null
        }
      }
  
      // Use disposal manager for comprehensive cleanup
      if (this.disposalManager) {
        try {
          this.disposalManager.cleanupEventListeners()
          this.disposalManager.cleanupControls()
          this.disposalManager.cleanupGlobalReferences()
          this.disposalManager.cleanupNuxtEventListeners()
        } catch (e) {
          console.error('Error during disposal manager cleanup:', e)
        }
      }    
      
      // Clean up transform controls
      try {
        this.cleanupTransformControls()
      } catch (e) {
        console.error('Error cleaning up transform controls:', e)
      }
  
      // Clean up tooltip manager
      if (this.tooltipsManager) {
        try {
          console.log('Disposing tooltip manager...')
          this.tooltipsManager.dispose()
        } catch (e) {
          console.error('Error disposing tooltip manager:', e)
        } finally {
          // Ensure reference is always nullified even if disposal fails
          this.tooltipsManager = null
        }
      }
  
      // Clean up drag and drop manager
      if (this.dragDropManager) {
        try {
          this.dragDropManager.dispose()
        } catch (e) {
          console.error('Error disposing drag drop manager:', e)
        } finally {
          this.dragDropManager = null
        }
      }
  
      // Dispose of scene objects and materials
      if (this.disposalManager) {
        try {
          this.disposalManager.cleanupScene()
          this.disposalManager.cleanupRenderer()
        } catch (e) {
          console.error('Error during scene and renderer cleanup:', e)
        } finally {
          this.disposalManager = null
        }
      }

      // Clean up the managers collection
      // Note: We don't dispose the centralPlant here since it's managed by the parent component
      // The parent (index.vue) is responsible for disposing it
      if (this.centralPlant) {
        console.log('🧹 Managers collection cleanup handled by parent component')
      }
  
      console.log('Scene cleanup completed')
    } catch (e) {
      console.error('Unexpected error during scene cleanup:', e)
    }
  },

  // Vue 3 compatibility
  beforeUnmount() {
    this.beforeDestroy()
  },
  methods: {        
    // Camera auto-rotation toggle method
    toggleCameraRotation() {
      if (!this.cameraControlsManager) return;
      
      // Use the cameraControlsManager to toggle auto-rotation
      const isAutoRotating = this.cameraControlsManager.toggleCameraRotation();
      
      // Force Vue reactivity update by triggering a re-render
      this.$forceUpdate();
      
      return isAutoRotating;
    },
    
    // Handle scene configuration changes from SceneConfigs component
    handleSceneConfigChanged(settings) {
      console.log('📋 Scene configuration changed:', settings);
      
      try {
        // Handle auto rotation setting
        if (settings.scene && settings.scene.hasOwnProperty('autoRotation')) {
          const shouldAutoRotate = settings.scene.autoRotation;
          
          if (this.cameraControlsManager) {
            const currentlyRotating = this.cameraControlsManager.isAutoRotating();
            
            // Only toggle if the desired state is different from current state
            if (shouldAutoRotate !== currentlyRotating) {
              console.log(`🔄 Toggling auto rotation: ${currentlyRotating} → ${shouldAutoRotate}`);
              this.toggleCameraRotation();
            } else {
              console.log(`✅ Auto rotation already in desired state: ${currentlyRotating}`);
            }
          } else {
            console.warn('⚠️ Camera controls manager not available for auto rotation setting');
          }
        }
        
        // Handle checkUnderground setting
        if (settings.scene && settings.scene.hasOwnProperty('checkUnderground')) {
          const checkUnderground = settings.scene.checkUnderground;
          console.log(`🔧 Underground checking setting changed to: ${checkUnderground ? 'enabled' : 'disabled'}`);
          // The setting is stored in localStorage and will be used in onTransformEnd
        }
        
        // Handle environment settings (skybox)
        if (settings.environment) {
          console.log('🌍 Environment settings changed:', settings.environment);
          
          if (settings.environment.hasOwnProperty('skyboxEnabled')) {
            const skyboxEnabled = settings.environment.skyboxEnabled;
            console.log(`🌌 Skybox enabled: ${skyboxEnabled}`);
            
            if (this.environmentManager) {
              if (skyboxEnabled) {
                // Re-create skybox if enabled
                this.environmentManager.createSkybox().then(() => {
                  console.log('✅ Skybox enabled and recreated');
                }).catch(error => {
                  console.error('❌ Error recreating skybox:', error);
                });
              } else {
                // Remove skybox if disabled
                this.environmentManager.removeSkybox();
                console.log('✅ Skybox disabled and removed');
              }
            }
          }
          
          if (settings.environment.skyboxType && settings.environment.skyboxEnabled) {
            const skyboxType = settings.environment.skyboxType;
            console.log(`🌌 Skybox type changed to: ${skyboxType}`);
            
            if (this.environmentManager) {
              this.environmentManager.setSkyboxType(skyboxType).then(() => {
                console.log(`✅ Skybox type changed to: ${skyboxType}`);
              }).catch(error => {
                console.error('❌ Error changing skybox type:', error);
              });
            }
          }
        }
        
        // Handle other settings here in the future (e.g., tree view mode)
        if (settings.editor && settings.editor.treeViewMode) {
          console.log(`📁 Tree view mode setting: ${settings.editor.treeViewMode}`);
          // Future implementation for tree view mode changes
        }
        
      } catch (error) {
        console.error('❌ Error applying scene configuration:', error);
      }
    },
    
    // Pathfinder methods - delegate to PathfindingManager
    async getPathfinderVersionInfo() {
      return this.pathfindingManager ? await this.pathfindingManager.getPathfinderVersionInfo() : null
    },

    async logPathfinderVersion(context = 'Unknown Context') {
      if (this.pathfindingManager) {
        await this.pathfindingManager.logPathfinderVersion(context)
      }
    },

    // Add method to update pathfinding with new connections
    async updatePathfindingWithConnections(newConnections) {
      if (this.pathfindingManager) {
        const success = await this.pathfindingManager.updatePathfindingWithConnections(newConnections)
        if (success) {
          // Emit event to notify parent components about the scene data change
          this.$emit('scene-data-updated', { 
            action: 'connections-update', 
            connections: newConnections,
            sceneData: this.currentSceneData 
          })
        }
        return success
      }
      return false
    },

    getPathColor(index) {
      return this.pathfindingManager ? this.pathfindingManager.getPathColor(index) : '#468e49'
    },

    // Manual cleanup method that can be called externally
    destroy() {
      console.log('🔧 Manual cleanup requested')
      this.beforeDestroy()
    },

    // Utility method to check if scene is properly disposed
    isDisposed() {
      return (
        this.isDestroyed ||
        !this.scene ||
        !this.renderer ||
        !this.camera
      )
    },    
    
    async init() {
      // Initialize scene, camera, renderer, and basic setup
      await this.sceneInitializationManager.initialize()

      // Initialize environment (skybox, lighting, ground, walls, fog)
      await this.environmentManager.initializeEnvironment()

      // Setup keyboard controls and resize handlers
      this.keyboardControlsManager.setupKeyboardControls()
      this.keyboardControlsManager.setupResizeHandler()
      
      // Initialize managers that need scene components (tooltip, drag-drop)
      if (this.centralPlant) {
        this.centralPlant.initializePostSceneManagers()
      }
      
      // Handle window resize to update tooltip renderer size
      window.addEventListener('resize', () => {
        if (this.tooltipsManager) {
          this.tooltipsManager.resize();
        }
      });

      // Configure auto-rotation (initialize state from controls)
      if (this.controls && this.cameraControlsManager) {
        // The cameraControlsManager will handle state synchronization
        this.cameraControlsManager.isAutoRotating(); // This will sync the internal state
      }

      // Load and setup scene
      await this.loadScene()

      // Start animation loop
      this.animationManager.startAnimation()

      // Set up event listeners for scene loading
      this.sceneOperationsManager.setupEventListeners()      
      
      // Initialize transform controls but keep them hidden initially
      this.initTransformControls()
      
      // Use transform manager's object selection instead of our own
      if (this.transformManager) {
        this.transformManager.setupObjectSelection((obj) => this.isSelectableObject(obj))
      }
      
      // Final sync of auto-rotation state after everything is initialized
      if (this.cameraControlsManager) {
        const isRotating = this.cameraControlsManager.isAutoRotating();
        console.log(`🔄 Auto-rotation state synced: ${isRotating ? 'enabled' : 'disabled'}`);
        
        // Check localStorage sceneConfiguration for autoRotation setting
        if (process.client) {
          try {
            const savedSettings = localStorage.getItem('sceneConfigurations');
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              if (parsed.autoRotation === false) {
                this.toggleCameraRotation();
                console.log('🔄 Auto camera rotation disabled based on scene configuration');
              }
            }
          } catch (error) {
            console.error('❌ Error reading scene configuration from localStorage:', error);
          }
        }
      }
      
      // Transform controls should only be visible once we have scene content
      console.log('🔄 Transform controls will be enabled after scene loading')
    },    
    
    // Environment methods - delegate to EnvironmentManager
    async createSkybox() {
      return this.environmentManager ? await this.environmentManager.createSkybox() : null
    },

    setupLighting() {
      if (this.environmentManager) {
        this.environmentManager.setupLighting()
      }
    },

    async addTexturedGround() {
      if (this.environmentManager) {
        await this.environmentManager.addTexturedGround()
      }
    },

    async addBrickWalls() {
      if (this.environmentManager) {
        await this.environmentManager.addBrickWalls()
      }
    },

    addHorizonFog() {
      return this.environmentManager ? this.environmentManager.addHorizonFog() : null
    },    
    
    // Load GLB model for library objects - delegate to SceneOperationsManager    
    async loadLibraryModel(targetMesh, jsonEntry, componentData) {
      return this.sceneOperationsManager ? 
        await this.sceneOperationsManager.loadLibraryModel(targetMesh, jsonEntry, componentData) : 
        targetMesh
    },
    
    // Helper function to verify model preloader cache - delegate to SceneOperationsManager
    async verifyModelPreloaderCache() {
      return this.sceneOperationsManager ? 
        await this.sceneOperationsManager.verifyModelPreloaderCache() : 
        null
    },
    
    // Helper function to preload missing models for a scene - delegate to SceneOperationsManager
    async preloadMissingModels(data, componentDictionary) {
      if (this.sceneOperationsManager) {
        await this.sceneOperationsManager.preloadMissingModels(data, componentDictionary)
      }
    },
    
    // Helper function to create materials with texture sets - delegate to SceneOperationsManager
    async createSceneMaterials(data) {
      return this.sceneOperationsManager ? 
        await this.sceneOperationsManager.createSceneMaterials(data) : 
        { materials: {}, crosscubeTextureSet: null }
    },
      
    // Helper function to create geometries from component library - delegate to SceneOperationsManager
    createSceneGeometries(data, componentDictionary) {
      return this.sceneOperationsManager ? 
        this.sceneOperationsManager.createSceneGeometries(data, componentDictionary) : 
        {}
    },
      
    // Helper function to create object from scene data - delegate to SceneOperationsManager
    createSceneObject(obj, geometries, materials) {
      return this.sceneOperationsManager ? 
        this.sceneOperationsManager.createSceneObject(obj, geometries, materials) : 
        null
    },
      
    // Helper function to compute world bounding boxes - delegate to SceneOperationsManager
    computeWorldBoundingBoxes(data) {
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.computeWorldBoundingBoxes(data)
      }
    },
    
    // Material factory function to reduce duplication - delegate to PathfindingManager
    createPipeMaterial(crosscubeTextureSet, pathIndex) {
      return this.pathfindingManager ? 
        this.pathfindingManager.createPipeMaterial(crosscubeTextureSet, pathIndex) : 
        new THREE.MeshPhysicalMaterial({ color: this.getPathColor(pathIndex) })
    },
    
    // Helper function to create pipe paths - delegate to PathfindingManager
    createPipePaths(paths, crosscubeTextureSet) {
      if (this.pathfindingManager) {
        this.pathfindingManager.createPipePaths(paths, crosscubeTextureSet)
      }
    },
    
    // Consolidated scene loading function - delegate to SceneOperationsManager
    async loadSceneData(data, isImported = true) {
      if (this.sceneOperationsManager) {
        await this.sceneOperationsManager.loadSceneData(data, isImported)
        
        // Update scene helper with new scene data
        if (this.sceneHelper) {
          this.sceneHelper.updateSceneData(data)
        }
      }
    },
    
    // Load default scene - delegate to SceneOperationsManager
    async loadScene() {
      if (this.sceneOperationsManager) {
        await this.sceneOperationsManager.loadScene()
      }
    },
    
    animate() {
      // Delegate to animation manager
      this.animationManager.startAnimation()
    },    
    
    // Set up event listeners for scene loading - delegate to SceneOperationsManager
    setupEventListeners() {
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.setupEventListeners()
      }
    },
    
    // Clear scene objects while preserving base environment - delegate to SceneOperationsManager
    clearSceneObjects() {
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.clearSceneObjects()
      }
    },

    // Create empty scene with just the base environment - delegate to SceneOperationsManager
    createEmptyScene() {
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.createEmptyScene()
      }
    },

    // Load scene from imported JSON data - delegate to SceneOperationsManager
    async loadSceneFromData(data) {
      if (this.sceneOperationsManager) {
        await this.sceneOperationsManager.loadSceneFromData(data)
      }
    },
    
    // Clear the model cache to free up memory - delegate to SceneOperationsManager
    clearModelCache() {
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.clearModelCache()
      }
    },
    
    // Clean up transform controls
    cleanupTransformControls() {
      console.log('🧹 Cleaning up transform controls...')
      if (this.transformManager) {
        // First deselect any object
        if (this.transformManager.selectedObject) {
          this.transformManager.deselectObject()
        }
        
        // Explicitly disable transform controls
        if (this.transformManager.transformControls) {
          console.log('🔧 Disabling transform controls before disposal')
          this.transformManager.setEnabled(false)
          this.transformManager.transformControls.visible = false
        }
        
        // Now dispose of the transform controls
        this.transformManager.dispose()
        this.transformManager = null
      }
      
      this.selectedObjectForTransform = null
      this.transformHistory = []
      console.log('✅ Transform controls cleanup completed')
    },    
    
    // Transform Controls Implementation
    initTransformControls() {
      if (!this.scene || !this.camera || !this.renderer) {
        console.warn('⚠️ Cannot initialize transform controls: missing scene components')
        return
      }
      
      // Clean up existing transform manager if it exists
      if (this.transformManager) {
        console.log('🔧 Cleaning up existing transform manager before reinitializing')
        this.transformManager.dispose()
      }
      
      // Create new transform controls manager using utility from centralPlant
      this.transformManager = this.createTransformControls(
        this.scene,
        this.camera, 
        this.renderer,
        this.controls // OrbitControls instance
      )
      
      // Register event callbacks
      this.transformManager.on({
        onObjectSelect: this.onObjectSelect.bind(this),
        onTransformStart: this.onTransformStart.bind(this),
        onTransform: this.onTransform.bind(this),
        onTransformEnd: this.onTransformEnd.bind(this),
        onModeChange: this.onModeChange.bind(this),
        onObjectRemoved: this.onObjectRemoved.bind(this)
      })
      
      // Set up reasonable defaults
      this.transformManager.setSnap({
        translation: 0.5,
        rotation: Math.PI / 2, // 90 degrees
        scale: 0.05
      })
      
      // Set transform controls size to 50% of default
      this.transformManager.setSize(0.5)
      
      // Hide multi-axis plane helpers by default (only allow single-axis translation)
      this.transformManager.setShowPlanes(false)
      
      // Set transform controls to invisible by default
      // (The caller should explicitly enable them if needed)
      if (this.transformManager.transformControls) {
        this.transformManager.transformControls.visible = false
        this.transformManager.setEnabled(false)
      }
      
      // Check that transform controls are properly in scene
      const isInScene = this.scene.children.includes(this.transformManager.transformControls)
      console.log('🔧 Transform controls initialized and in scene:', isInScene ? 'YES' : 'NO')    },

    // Transform control event handlers    
    onObjectSelect(object) {
      this.selectedObjectForTransform = object
      this.transformLogger.info('Transform target:', object?.uuid || 'none')

      // If object is null, it means we clicked away
      if (!object) {
        // Clear tooltip when clicking away from objects
        if (this.tooltipsManager) {
          this.tooltipsManager.handleSceneClick();
        }
        
        // Hide transform controls when clicking away
        if (this.transformManager && this.transformManager.transformControls) {
          this.transformManager.transformControls.enabled = false;
          this.transformManager.transformControls.visible = false;
        }
        
        this.$emit('object-selected-for-transform', null);
        return;
      }

      // Object is selected, show transform controls
      if (this.transformManager && this.transformManager.transformControls) {
        this.transformManager.transformControls.enabled = true;
        this.transformManager.transformControls.visible = true;
      }
      
      // Show tooltip if the object has component data
      // Check userData.component exists and add attributes if needed to ensure tooltip display
      if (this.tooltipsManager && object && object.userData) {
        // Make sure component exists in userData
        if (!object.userData.component) {
          object.userData.component = {};
        }
        
        // Make sure attributes exists in component 
        if (!object.userData.component.attributes && object.userData.componentType) {
          // Create default attributes based on component type
          object.userData.component.attributes = {
            'info': {
              key: 'Type',
              value: object.userData.componentType || 'component',
              min: 0,
              max: 100,
              step: 1
            }
          };
        }
        
        // Determine the best tooltip corner position based on the object's position in the scene
        // Objects on the right side of the scene should have tooltips on the left to avoid clipping
        // Objects near the top should have tooltips below them
        const cornerPosition = this.determineTooltipPosition(object);
        
        // Now set the selected mesh for tooltip display with the appropriate corner position
        this.tooltipsManager.setSelectedMesh(object, cornerPosition);
      } else if (this.tooltipsManager) {
        // Clear tooltip if no valid userData
        this.tooltipsManager.clearTooltip();
      }
      
      // Debug: check transform controls state
      if (this.transformManager?.transformControls) {
        // Debugging code...
      }
      
      // You could emit an event to update UI
      this.$emit('object-selected-for-transform', object)
    },    
    
    onTransformStart(object, mode) {
      console.log(`🔧 Started ${mode} transformation on ${object.uuid}`)
      
      // Store the current transform mode for history tracking
      this.transformMode = mode
      
      // Store previous transform values for history tracking
      this.previousTransformValues = {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone()
      }
      
      // Log orbit controls state at transform start
      if (this.controls) {
        console.log('🎮 Orbit Controls State at transform start:', {
          enabled: this.controls.enabled,
          autoRotate: this.controls.autoRotate,
          enableRotate: this.controls.enableRotate,
          enablePan: this.controls.enablePan,
          enableZoom: this.controls.enableZoom,
          transformControlsActive: this.transformManager?.transformControls?.dragging || false
        })
      }
    },    
    
    onTransform(object, mode) {
      // Real-time transform feedback with both local and world coordinates
      const transform = this.transformManager.getTransformData()
      
      // Log orbit controls state during transform
      if (this.controls) {
        console.log('🎮 Orbit Controls State during transform:', {
          enabled: this.controls.enabled,
          enableDamping: this.controls.enableDamping,
          enableZoom: this.controls.enableZoom,
          enableRotate: this.controls.enableRotate,
          enablePan: this.controls.enablePan,
          autoRotate: this.controls.autoRotate,
          target: {
            x: this.controls.target.x.toFixed(3),
            y: this.controls.target.y.toFixed(3),
            z: this.controls.target.z.toFixed(3)
          },
          minDistance: this.controls.minDistance,
          maxDistance: this.controls.maxDistance,
          transformControlsActive: this.transformManager?.transformControls?.dragging || false
        })
      }
      
      // Log translation changes specifically
      if (mode === 'translate') {
        console.log('🔄 Translation in progress:', {
          object: object.uuid,
          position: {
            x: object.position.x.toFixed(3),
            y: object.position.y.toFixed(3),
            z: object.position.z.toFixed(3)
          },
          worldPosition: transform.worldPosition ? {
            x: transform.worldPosition.x.toFixed(3),
            y: transform.worldPosition.y.toFixed(3),
            z: transform.worldPosition.z.toFixed(3)
          } : null
        })
      }
      
      // Update tooltip position if it exists
      if (this.tooltipsManager && object === this.tooltipsManager.selectedMesh) {
        // Determine the best tooltip position dynamically as the object moves
        const cornerPosition = this.determineTooltipPosition(object);
        this.tooltipsManager.updateTooltip(cornerPosition);
      }
      
      this.$emit('transform-update', transform)
    },      
    
    // Remove all paths - delegate to PathfindingManager
    removeAllPaths() {
      if (this.pathfindingManager) {
        this.pathfindingManager.removeAllPaths()
      }
    },
    
    // Recompute world bounding boxes - delegate to PathfindingManager
    recomputeWorldBoundingBoxes(currentSceneData) {
      if (this.pathfindingManager) {
        this.pathfindingManager.recomputeWorldBoundingBoxes(currentSceneData)
      }
    },    
    
    onTransformEnd(object) {
      console.log('onTransformEnd started:', object)

      // Check if the transformed object is a pipe segment and handle connector-based transformation
      if (object && object.userData && object.userData.isPipeSegment) {
        const segmentInfo = {
          segmentId: object.userData.segmentId,
          segmentIndex: object.userData.segmentIndex,
          pathFrom: object.userData.pathFrom,
          pathTo: object.userData.pathTo,
          pathIndex: object.userData.pathIndex,
          length: object.userData.length,
          name: object.name
        }
        console.log('🔧 Pipe segment transformation completed:', segmentInfo)
        console.log('📍 Pipe segment position after transform:', {
          x: object.position.x.toFixed(3),
          y: object.position.y.toFixed(3),
          z: object.position.z.toFixed(3)
        })
        
        // Handle manual segment transformation with connector generation
        if (this.pathfindingManager && this.currentSceneData) {
          console.log('🚀 Calling handleManualSegmentTransformation...')
          console.log('🔍 PathfindingManager available:', !!this.pathfindingManager)
          console.log('🔍 CurrentSceneData available:', !!this.currentSceneData)
          console.log('🔍 CurrentSceneData connections:', this.currentSceneData.connections?.length || 0)
          this.pathfindingManager.handleManualSegmentTransformation(object, this.currentSceneData);
        } else {
          console.warn('⚠️ PathfindingManager or CurrentSceneData not available')
          console.log('PathfindingManager:', this.pathfindingManager)
          console.log('CurrentSceneData:', this.currentSceneData)
        }
      } else {
        console.log('🔍 Object is not a pipe segment:', {
          isObject: !!object,
          hasUserData: !!(object && object.userData),
          isPipeSegment: !!(object && object.userData && object.userData.isPipeSegment),
          objectName: object?.name,
          userData: object?.userData
        })
      }

      // Log orbit controls state at transform end
      if (this.controls) {
        console.log('🎮 Orbit Controls State at transform end:', {
          enabled: this.controls.enabled,
          autoRotate: this.controls.autoRotate,
          transformControlsActive: this.transformManager?.transformControls?.dragging || false
        })
      }

      // Check if component is underground and move to surface if needed
      const checkUnderground = this.getCheckUndergroundSetting()
      if (checkUnderground && object.position.y < 0) {
        console.log(`🔧 Component was underground (y=${object.position.y.toFixed(3)}), moving to surface`)
        object.position.y = 0
        
        // Update the transform controls to reflect the new position
        if (this.transformManager && this.transformManager.transformControls) {
          this.transformManager.transformControls.object = object
        }
        
        console.log(`✅ Component moved to surface (y=${object.position.y.toFixed(3)})`)
      }

      object.updateMatrix()

      const worldBoundingBox = new THREE.Box3().setFromObject(object)

      if (object.userData.associatedJsonObject) {
      
        // Update jsonData.userData.worldBoundingBox as array of numbers 
        object.userData.associatedJsonObject.userData.worldBoundingBox.min = worldBoundingBox.min.toArray()
        object.userData.associatedJsonObject.userData.worldBoundingBox.max = worldBoundingBox.max.toArray()
      }

      // Record the transform operation in CentralPlant's transform history
      if (this.centralPlant && this.previousTransformValues) {
        const currentTransformValues = {
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone()
        }
        
        this.centralPlant.recordTransform({
          type: this.transformMode || 'translate',
          object: object,
          values: currentTransformValues,
          previousValues: this.previousTransformValues
        })
        
        // Clear previous values after recording
        this.previousTransformValues = null
      }

      // Delegate the complex update logic to SceneOperationsManager
      if (this.sceneOperationsManager) {
        this.sceneOperationsManager.updateSceneDataAfterTransform(object, this.currentSceneData)
      } 

      if(this.shouldUpdatePaths) {
        this.updatePaths();
      }      

      if (typeof window !== 'undefined') {          
        // Also dispatch a general scene initialization complete event
        console.log('📡 Dispatching sceneUpdateComplete event');
        const sceneCompleteEvent = new CustomEvent('sceneUpdateComplete', {
          detail: {
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(sceneCompleteEvent);
      }
    },

    updatePaths() {
      console.log("updatePaths started");
      // Delegate pathfinding update to PathfindingManager
      if (this.pathfindingManager) {
        this.pathfindingManager.updatePathfindingAfterTransform(this.currentSceneData)
      }
    },

    // Ensure transform controls remain properly attached after scene operations
    ensureTransformControlsAttached(allowVisible = true) {
      // Check if transform manager exists
      if (!this.transformManager) {
        console.log('🔧 No transform manager found, initializing transform controls...')
        this.initTransformControls()
        return
      }
      
      // Check if transform controls exist in the manager
      if (!this.transformManager.transformControls) {
        console.log('🔧 Transform controls not found in manager, reinitializing...')
        this.transformManager.createTransformControls()
        this.transformManager.setupEventListeners()
        console.log('✅ Transform controls recreated in manager')
        return
      }
      
      // Use the TransformControlsManager's built-in method for reattachment
      // This doesn't change visibility or enabled state, just ensures it's in the scene
      const wasReattached = this.transformManager.ensureSceneAttachment(allowVisible)
      if (wasReattached) {
        console.log('🔧 Transform controls were reattached after scene operation')
        
        // Override visibility based on allowVisible parameter
        if (!allowVisible && this.transformManager.transformControls) {
          this.transformManager.transformControls.visible = false
          console.log('🔧 Forcing transform controls to be invisible during load')
        }
      } else {
        console.log('✓ Transform controls are properly attached')
        
        // Still ensure visibility is set correctly even if not reattached
        if (!allowVisible && this.transformManager.transformControls) {
          this.transformManager.transformControls.visible = false
          console.log('🔧 Ensuring transform controls remain invisible during load')
        }
      }
    },

    onModeChange(newMode, oldMode) {
      this.transformMode = newMode
      console.log(`🔄 Transform mode: ${oldMode} → ${newMode}`)
      
      // Update UI if needed
      this.$emit('transform-mode-changed', newMode)
    },

    onObjectRemoved(object) {
      console.log('🗑️ Object removed:', object.uuid)
      
      this.onGatewayConnectionsRevert(object);

    },

    // Gateway removal callback handlers
    onGatewayConnectionsRevert(gatewayInfo) {
      console.log('🔄 Reverting gateway connections in SceneViewer:', gatewayInfo)
      
      // Revert connections that were modified when the gateway was declared
      if (this.currentSceneData && this.currentSceneData.connections && gatewayInfo.connections) {
        const currentConnections = this.currentSceneData.connections
        
        // Revert removed connections (add them back)
        if (gatewayInfo.connections.removed && Array.isArray(gatewayInfo.connections.removed)) {
          console.log('🔄 Adding back removed connections:', gatewayInfo.connections.removed)
          gatewayInfo.connections.removed.forEach(removedConn => {
            // Check if connection already exists to avoid duplicates
            const alreadyExists = currentConnections.some(conn => 
              (conn.from === removedConn.from && conn.to === removedConn.to) ||
              (conn.from === removedConn.to && conn.to === removedConn.from)
            )
            
            if (!alreadyExists) {
              currentConnections.push(removedConn)
              console.log(`🔄 Added back connection: ${removedConn.from} → ${removedConn.to}`)
            }
          })
        }
        
        // Revert added connections (remove them)
        if (gatewayInfo.connections.added && Array.isArray(gatewayInfo.connections.added)) {
          console.log('🔄 Removing added connections:', gatewayInfo.connections.added)
          this.currentSceneData.connections = currentConnections.filter(connection => {
            const shouldRemove = gatewayInfo.connections.added.some(addedConn => 
              (addedConn.from === connection.from && addedConn.to === connection.to) ||
              (addedConn.from === connection.to && addedConn.to === connection.from)
            )
            
            if (shouldRemove) {
              console.log(`🔄 Removed connection: ${connection.from} → ${connection.to}`)
            }
            
            return !shouldRemove
          })
        }
        
        console.log('✅ Gateway connections reverted. Total connections:', this.currentSceneData.connections.length)
      }

      console.log('Executing pathfinding to regenerate gateway:', gatewayInfo.uuid)
      
      // Remove the gateway from scene data so it can be regenerated
      this.currentSceneData.scene.object.children = this.currentSceneData.scene.object.children.filter(child => 
        child.uuid !== gatewayInfo.uuid
      )

      console.log('🗑️ Removed gateway from scene data for regeneration', this.currentSceneData)
      
      // Recalculate bounding boxes
      this.recomputeWorldBoundingBoxes(this.currentSceneData)

      // Execute pathfinding with updated scene data
      this.pathfindingManager.updatePathfindingAfterTransform(this.currentSceneData)
        .then(() => {
          console.log('✅ Pathfinding completed - gateway regenerated automatically')
        })
        .catch(error => {
          console.error('❌ Error during pathfinding execution:', error)
        })
    },

    isConnectorOrb(object) {
      // Check if it's a mesh with connector geometry
      if (!object.isMesh || !object.geometry) {
        return false
      }
      
      // Check for CONNECTOR-GEO geometry uuid
      const hasConnectorGeometry = object.geometry.uuid === 'CONNECTOR-GEO' || object.geometry.uuid === 'GATEWAY-GEO'
        // Check if uuid includes connector
      const hasConnectorName = object.uuid && object.uuid.toLowerCase().includes('connector')
      
      return (hasConnectorGeometry) && hasConnectorName
    },

    isSelectableObject(object) {
      // console.log('🔍 isSelectableObject check:', object)

      if(object.type == "TransformControlsPlane") {
        object = object.object;
        // console.log('🔍 isSelectableObject recheck:', object)
      }
      
      // Allow pipe segments and junctions to be selected
      const isPipeSegment = object.userData?.isPipeSegment === true
      const isPipeJunction = object.userData?.isPipeJunction === true
      
      if (isPipeSegment) {
        // console.log('✅ Pipe segment or junction is selectable:', object.name)
        return true
      }
      
      // Exclude regular polyline parent objects (pipe paths) from selection
      if (object.name && object.name.toLowerCase().includes("polyline") && 
          !isPipeSegment && !isPipeJunction) {
        // console.log('❌ Polyline parent object excluded from selection:', object.name)
        return false
      }

      // Check for different component types using userData.componentType
      const isGLBModel = object.userData && object.userData.componentType === 'component'
      
      // Check for connector orbs using userData.componentType
      const isConnector = object.userData && object.userData.componentType === 'connector'
      
      // Check for gateway objects using userData.componentType
      const isGateway = object.userData && object.userData.componentType === 'gateway'
      
      const canTransform = (object.isMesh || object.isObject3D) && 
        (isGLBModel || isConnector || isGateway) && 
        object.visible
      
      // Debug logging for gateway selection
      if (isGateway || object.userData?.componentType === 'gateway') {
        console.log(`🔍 Gateway selection check for "${object.uuid}":`, {
          isGLBModel,
          isConnector,
          isGateway,
          canTransform,
          objectType: object.type,
          isMesh: object.isMesh,
          isObject3D: object.isObject3D,
          visible: object.visible,
          componentType: object.userData?.componentType,
          userData: object.userData
        })
      }
      
      return canTransform
    },
    
    selectObjectForTransform(object) {
      // Safety check: ensure object is valid before selecting
      if (!object || !object.parent) {
        console.warn('⚠️ Cannot select invalid object for transform')
        return
      }
      
      if (this.transformManager) {
        this.transformManager.selectObject(object)
      }
    },
      deselectObject() {
      if (this.transformManager) {
        this.transformManager.deselectObject()
      }
      this.selectedObjectForTransform = null
    },
    
    // Public API method to select an object in the scene
    selectObject(object) {
      if (!object || !object.uuid) {
        console.warn('⚠️ Cannot select invalid object')
        return false
      }
      
      // Select the object for transformation
      this.selectObjectForTransform(object)
      
      // You could emit an event to update UI
      this.$emit('object-selected-for-transform', object)
      
      return true
    },
    
    // Get currently selected object transform data
    getSelectedTransform() {
      return this.transformManager?.getTransformData() || null
    },   

    // Explicitly disable transform controls
    disableTransformControls() {
      console.log('🔧 Manually disabling transform controls')
      if (!this.transformManager) {
        console.warn('⚠️ No transform manager found to disable')
        return false
      }
      
      // Deselect any selected object
      if (this.transformManager.selectedObject) {
        this.transformManager.deselectObject()
      }
      
      // Disable controls and set visibility to false
      if (this.transformManager.transformControls) {
        this.transformManager.setEnabled(false)
        this.transformManager.transformControls.visible = false
        console.log('✅ Transform controls disabled')
        return true
      }
      
      console.warn('⚠️ Transform controls not found in manager')
      return false
    },

    // Enable transform controls after they've been disabled
    enableTransformControls() {
      console.log('🔧 Manually enabling transform controls')
      if (!this.transformManager) {
        console.warn('⚠️ No transform manager found to enable')
        return false
      }
      
      // Check if we should enable transform controls
      // Only enable if we have actual objects in the scene (not an empty scene)
      let hasNonBaseObjects = false
      this.scene.traverse((child) => {
        if (child.isMesh && 
            !child.userData?.isBaseGround && 
            !child.userData?.isBrickWall && 
            !child.userData?.isBaseGrid &&
            child.geometry?.type !== 'PlaneGeometry') {
          hasNonBaseObjects = true
        }
      });
      
      // Don't enable controls for empty scenes
      if (!hasNonBaseObjects) {
        console.log('🔧 No objects to transform in scene, keeping transform controls disabled')
        return false
      }
      
      // Enable controls and set visibility to true  
      if (this.transformManager.transformControls) {
        // Reset the force invisible flag to allow controls to become visible
        this.transformManager.forceInvisible = false
        
        this.transformManager.setEnabled(true)
        this.transformManager.transformControls.visible = true
        console.log('✅ Transform controls enabled')
        return true
      }
      
      console.warn('⚠️ Transform controls not found in manager')
      return false
    },    
    
    // Keep transform controls inactive - called after scene loading
    keepTransformControlsInactive() {
      if (this.transformManager && this.transformManager.transformControls) {
        console.log('🔄 Ensuring transform controls remain inactive after scene load')
        this.transformManager.setEnabled(false)
        this.transformManager.transformControls.visible = false
        
        // Set force invisible flag to prevent any selection from making controls visible
        this.transformManager.forceInvisible = true
        
        // Deselect any selected object to ensure clean state
        if (this.transformManager.selectedObject) {
          this.transformManager.deselectObject()
        }
      }
    },

    // Configure multi-axis translation plane helpers
    setMultiAxisTranslation(enabled) {
      if (!this.transformManager) {
        console.warn('⚠️ No transform manager found')
        return false
      }
      
      return this.transformManager.setShowPlanes(enabled)
    },
    
    // Note: Hot-reload and disposal methods have been moved to respective manager classes
    // See: HotReloadManager and DisposalManager
    
    // Note: Scene export methods have been moved to SceneExportManager
    
    // Note: Component management methods have been moved to ComponentManager
    
    // Wrapper methods that delegate to the appropriate managers
    // Export methods - delegate to SceneExportManager
    exportSceneData() {
      return this.sceneExportManager ? this.sceneExportManager.exportSceneData() : null
    },

    downloadSceneExport(filename = null) {
      return this.sceneExportManager ? this.sceneExportManager.downloadSceneExport(filename) : false
    },

    // Hot-reload methods - delegate to HotReloadManager  
    setupHotReloadHandling() {
      if (this.hotReloadManager) {
        this.hotReloadManager.setupHotReloadHandling()
      }
    },

    cleanupHotReloadHandlers() {
      if (this.hotReloadManager) {
        this.hotReloadManager.cleanupHotReloadHandlers()
      }
    },

    // Disposal methods - delegate to DisposalManager
    async enhancedDisposal() {
      if (this.disposalManager) {
        await this.disposalManager.enhancedDisposal()
      }
    },

    forceStopOperations() {
      if (this.disposalManager) {
        this.disposalManager.forceStopOperations()
      } else {
        // Fallback for when disposal manager isn't available
        this.isDestroyed = true
        this.isLoading = false
        this.currentTransition = null
        
        if (this.animationId) {
          cancelAnimationFrame(this.animationId)
          this.animationId = null
        }
      }
    },

    async enhancedSceneCleanup() {
      if (this.disposalManager) {
        await this.disposalManager.enhancedSceneCleanup()
      }
    },

    enhancedRendererCleanup() {
      if (this.disposalManager) {
        this.disposalManager.enhancedRendererCleanup()
      }
    },

    clearPendingOperations() {
      if (this.hotReloadManager) {
        this.hotReloadManager.clearPendingOperations()
      }
    },

    forceGarbageCollectionHint() {
      if (this.hotReloadManager) {
        this.hotReloadManager.forceGarbageCollectionHint()
      }
    },

    // Component methods - delegate to ComponentManager    
    async addComponentToScene(componentData) {
      const result = this.componentManager ? await this.componentManager.addComponentToScene(componentData) : false;
      if (result) {
        // Emit an event to notify parent components about the scene change
        this.$emit('scene-changed', { action: 'add', data: componentData });
      }
      return result;
    },
    
    removeComponentFromScene(componentUuid) {
      const result = this.componentManager ? this.componentManager.removeComponentFromScene(componentUuid) : false;
      if (result) {
        // Emit an event to notify parent components about the scene change
        this.$emit('scene-changed', { action: 'remove', uuid: componentUuid });
      }
      return result;
    },

    getSceneComponents() {
      return this.componentManager ? this.componentManager.getSceneComponents() : []
    },    updateComponent(componentUuid, updates) {
      return this.componentManager ? this.componentManager.updateComponent(componentUuid, updates) : false
    },

    // Drag and Drop Methods
      /**
     * Handle component drag start with component data
     */
    /**
     * Handle component drag start with component data
     * Delegates to the dragDropManager
     */
    async onComponentDragStart(componentData) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      return await this.dragDropManager.onComponentDragStart(componentData, this.$refs.container)
    },
    
    /**
     * Handle component drag end
     * Delegates to the dragDropManager
     */
    onComponentDragEnd(componentData) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      return this.dragDropManager.onComponentDragEnd()
    },
    
    /**
     * Handle drag enter event
     * Delegates to the dragDropManager
     */
    async onDragEnter(event) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      await this.dragDropManager.onDragEnter(event, this.$refs.container)
    },
    
    /**
     * Handle drag leave event
     * Delegates to the dragDropManager
     */
    onDragLeave(event) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      this.dragDropManager.onDragLeave(event, this.$refs.container)
    },
    
    /**
     * Handle drag over event to calculate 3D position
     * Delegates to the dragDropManager
     */
    async onDragOver(event) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      await this.dragDropManager.onDragOver(event, this.$refs.container)
    },
    
    /**
     * Handle drop event to add component to scene
     * Delegates to the dragDropManager
     */
    async onDrop(event) {
      if (!this.dragDropManager) {
        console.warn('⚠️ Drag drop manager not initialized')
        return
      }
      
      // Set up callbacks for DragDropManager
      const callbacks = {
        onAddComponent: this.addComponentToScene.bind(this),
        onComponentAdded: (data) => {
          this.$emit('component-added-via-drop', data)
        },
        onPlacementCanceled: (reason) => {
          this.$emit('component-placement-canceled', reason)
        }
      }
      
      await this.dragDropManager.onDrop(event, this.$refs.container, callbacks)
    },
    
    // Public API method to select an object in the scene
    selectObject(object) {
      if (!object || !object.uuid) {
        console.warn('⚠️ Cannot select invalid object')
        return false
      }
      
      // Select the object for transformation
      this.selectObjectForTransform(object)
      
      // You could emit an event to update UI
      this.$emit('object-selected-for-transform', object)
      
      return true
    },

    // Methods for tooltip management
    updateTooltipForObject(object, cornerPosition) {
      if (this.tooltipsManager && object) {
        // If no specific corner position provided, determine the best one
        if (!cornerPosition) {
          cornerPosition = this.determineTooltipPosition(object);
        }
        
        // Update the tooltip for the specified object with the corner position
        this.tooltipsManager.setSelectedMesh(object, cornerPosition);
      }
    },

    clearAllTooltips() {
      if (this.tooltipsManager) {
        this.tooltipsManager.clearTooltip()
      }
    },

    // Helper method to determine the best tooltip position based on the object's position in the scene
    determineTooltipPosition(object) {
      if (!object || !this.camera || !this.scene) {
        return 'top-right'; // Default position
      }
      
      // Get the object's world position
      const objPosition = new THREE.Vector3();
      object.getWorldPosition(objPosition);
      
      // Project the object's position to screen space
      const screenPosition = objPosition.clone();
      screenPosition.project(this.camera);
      
      // Convert to normalized device coordinates (-1 to +1)
      const x = screenPosition.x;
      const y = screenPosition.y;
      
      // Determine the best position based on the screen quadrant
      if (x > 0 && y > 0) {
        // Top-right quadrant - place tooltip at top-left
        return 'top-left';
      } else if (x <= 0 && y > 0) {
        // Top-left quadrant - place tooltip at top-right
        return 'top-right';
      } else if (x > 0 && y <= 0) {
        // Bottom-right quadrant - place tooltip at top-left
        return 'top-left';
      } else {
        // Bottom-left quadrant - place tooltip at top-right
        return 'top-right';
      }
    },

    // Helper method to get the checkUnderground setting from localStorage
    getCheckUndergroundSetting() {
      try {
        if (process.client) {
          const savedSettings = localStorage.getItem('sceneConfigurations');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            // Default to true if not explicitly set to false
            return parsed.checkUnderground !== false;
          }
        }
      } catch (error) {
        console.warn('⚠️ Error reading checkUnderground setting from localStorage:', error);
      }
      
      // Default to true if localStorage is not available or has errors
      return true;
    },

    // Toggle shouldUpdatePaths setting
    toggleshouldUpdatePaths() {
      this.shouldUpdatePaths = !this.shouldUpdatePaths
      console.log(`🔄 shouldUpdatePaths ${this.shouldUpdatePaths ? 'enabled' : 'disabled'}`)
      
      // Also log current state for clarity
      if (this.shouldUpdatePaths) {
        console.log('✅ Path recalculation will occur after component transforms')
        this.updatePaths();
      } else {
        console.log('⚠️ Path recalculation disabled - manual scene reload may be needed')
      }
      
      return this.shouldUpdatePaths
    },
  }
}
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #ffffff;
}

/* LED Status Indicator */
.updatePaths-led-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 5px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  font-weight: 500;
  color: #000;
  user-select: none;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.led-light {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #666;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.updatePaths-led-indicator.active .led-light {
  background: #22c55e;
  box-shadow: 
    0 0 10px rgba(34, 197, 94, 0.6),
    0 0 20px rgba(34, 197, 94, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.updatePaths-led-indicator:not(.active) .led-light {
  background: #ef4444;
  box-shadow: 
    0 0 10px rgba(239, 68, 68, 0.6),
    0 0 20px rgba(239, 68, 68, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.led-label {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

/* Hover effect to show it's clickable (if you want to make it interactive later) */
.updatePaths-led-indicator:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.camera-rotate-btn {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.6) !important; /* Added !important to ensure this color applies */
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s ease;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.camera-rotate-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Explicitly define inactive state to prevent default browser styling */
.camera-rotate-btn:not(.active) {
  background-color: rgba(0, 0, 0, 0.6) !important;
}

.camera-rotate-btn.active {
  background-color: rgba(65, 184, 131, 0.8) !important; /* Vue green when active */
}
</style>