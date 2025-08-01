/**
 * SceneViewerEnhanced - Vanilla JavaScript Version
 * Converted from SceneViewerEnhanced.vue component
 */

import * as THREE from 'three'

class SceneViewerEnhanced {
  constructor(container, centralPlant = null, nuxtContext = null) {
    // Container element where the scene will be rendered
    this.container = container
    this.centralPlant = centralPlant
    
    // Create Vue-like $refs object to maintain compatibility with managers
    this.$refs = {
      container: container
    }
    
    // Scene components
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.currentSceneData = null
    
    // Flag to stop animation loop during cleanup
    this.isDestroyed = false
    
    // Transform controls
    this.transformManager = null
    this.selectedObjectForTransform = null
    this.transformMode = 'translate'
    this.transformHistory = []
    this.previousTransformValues = null
    
    // Manager instances
    this.disposalManager = null
    this.sceneExportManager = null
    this.componentManager = null
    this.sceneInitializationManager = null
    this.environmentManager = null
    this.keyboardControlsManager = null
    this.pathfindingManager = null
    this.sceneOperationsManager = null
    this.animationManager = null
    this.cameraControlsManager = null
    this.tooltipsManager = null
    
    // Scene helper utility
    this.sceneHelper = null
    
    // Transform settings
    this.shouldUpdatePaths = true
    
    // Event callbacks
    this.callbacks = {
      onSceneDataUpdated: null,
      onObjectSelected: null,
      onTransformUpdate: null,
      onTransformModeChanged: null,
      onSceneChanged: null
    }
  }
  
  /**
   * Initialize the scene viewer
   */
  async init() {
    try {
      // Check if centralPlant was provided
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not provided')
        return false
      }
      
      // Set this scene viewer instance on the managers collection
      this.centralPlant.setSceneViewer(this)
      
      // Attach all managers and utilities to this component instance
      this.centralPlant.attachToComponent()
      
      await this.initializeScene()
      
      return true
    } catch (error) {
      console.error('Error during scene viewer initialization:', error)
      return false
    }
  }
  
  /**
   * Initialize scene components and managers
   */
  async initializeScene() {
    // Initialize scene, camera, renderer, and basic setup
    await this.sceneInitializationManager.initialize()

    // Initialize environment (skybox, lighting, ground, walls, fog)
    await this.environmentManager.initializeEnvironment()

    // Setup keyboard controls and resize handlers
    this.keyboardControlsManager.setupKeyboardControls()
    this.keyboardControlsManager.setupResizeHandler()
    
    // Initialize managers that need scene components (tooltip)
    if (this.centralPlant) {
      this.centralPlant.initializePostSceneManagers()
    }
    
    // Handle window resize to update tooltip renderer size
    window.addEventListener('resize', () => {
      if (this.tooltipsManager) {
        this.tooltipsManager.resize()
      }
    })

    // Configure auto-rotation (initialize state from controls)
    if (this.controls && this.cameraControlsManager) {
      this.cameraControlsManager.isAutoRotating()
    }

    // Load and setup scene
    await this.loadScene()

    // Start animation loop
    this.animationManager.startAnimation()

    // Set up event listeners for scene loading
    this.sceneOperationsManager.setupEventListeners()      
    
    // Initialize transform controls AFTER all other initialization is complete
    // This ensures that createTransformControls is available via attachToComponent
    this.initTransformControls()
    
    // Use transform manager's object selection instead of our own
    if (this.transformManager) {
      this.transformManager.setupObjectSelection((obj) => this.isSelectableObject(obj))
    }
    
    console.log('🔄 Transform controls will be enabled after scene loading')
  }
  
  /**
   * Add event listener for scene viewer events
   */
  on(eventName, callback) {
    if (this.callbacks.hasOwnProperty(`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`)) {
      this.callbacks[`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`] = callback
    }
  }
  
  /**
   * Emit event to registered callbacks (Vue-compatible method)
   */
  $emit(eventName, data) {
    this.emit(eventName, data)
  }
  
  /**
   * Emit event to registered callbacks
   */
  emit(eventName, data) {
    const callbackName = `on${eventName.charAt(0).toUpperCase() + eventName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`
    if (this.callbacks[callbackName] && typeof this.callbacks[callbackName] === 'function') {
      this.callbacks[callbackName](data)
    }
  }
  
  /**
   * Load scene data
   */
  async loadSceneData(data, isImported = true) {
    if (this.sceneOperationsManager) {
      await this.sceneOperationsManager.loadSceneData(data, isImported)
      
      // Update scene helper with new scene data
      if (this.sceneHelper) {
        this.sceneHelper.updateSceneData(data)
      }
    }
  }
  
  /**
   * Load default scene
   */
  async loadScene() {
    
    if (this.sceneOperationsManager) {
      await this.sceneOperationsManager.loadScene()
    } else {
      console.error('❌ SceneOperationsManager not available for loadScene')
    }
  }
  
  /**
   * Clear scene objects while preserving base environment
   */
  clearSceneObjects() {
    if (this.sceneOperationsManager) {
      this.sceneOperationsManager.clearSceneObjects()
    }
  }

  /**
   * Create empty scene with just the base environment
   */
  createEmptyScene() {
    if (this.sceneOperationsManager) {
      this.sceneOperationsManager.createEmptyScene()
    }
  }

  /**
   * Load scene from imported JSON data
   */
  async loadSceneFromData(data) {
    if (this.sceneOperationsManager) {
      await this.sceneOperationsManager.loadSceneFromData(data)
    }
  }
  
  /**
   * Clear the model cache to free up memory
   */
  clearModelCache() {
    if (this.sceneOperationsManager) {
      this.sceneOperationsManager.clearModelCache()
    }
  }
  
  /**
   * Initialize transform controls
   */
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
    if (this.transformManager.transformControls) {
      this.transformManager.transformControls.visible = false
      this.transformManager.setEnabled(false)
    }
    
    // Check that transform controls are properly in scene
    const isInScene = this.scene.children.includes(this.transformManager.transformControls)
    console.log('🔧 Transform controls initialized and in scene:', isInScene ? 'YES' : 'NO')
  }
  
  /**
   * Transform control event handlers
   */
  onObjectSelect(object) {
    this.selectedObjectForTransform = object

    // If object is null, it means we clicked away
    if (!object) {
      // Clear tooltip when clicking away from objects
      if (this.tooltipsManager) {
        this.tooltipsManager.handleSceneClick()
      }
      
      // Hide transform controls when clicking away
      if (this.transformManager && this.transformManager.transformControls) {
        this.transformManager.transformControls.enabled = false
        this.transformManager.transformControls.visible = false
      }
      
      this.emit('object-selected-for-transform', null)
      return
    }

    // Object is selected, show transform controls
    if (this.transformManager && this.transformManager.transformControls) {
      this.transformManager.transformControls.enabled = true
      this.transformManager.transformControls.visible = true
    }
    
    // Show tooltip if the object has component data
    if (this.tooltipsManager && object && object.userData) {
      // Make sure component exists in userData
      if (!object.userData.component) {
        object.userData.component = {}
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
        }
      }
      
      // Determine the best tooltip corner position based on the object's position in the scene
      const cornerPosition = this.determineTooltipPosition(object)
      
      // Now set the selected mesh for tooltip display with the appropriate corner position
      this.tooltipsManager.setSelectedMesh(object, cornerPosition)
    } else if (this.tooltipsManager) {
      // Clear tooltip if no valid userData
      this.tooltipsManager.clearTooltip()
    }
    
    // Emit event
    this.emit('object-selected-for-transform', object)
  }
  
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
  }
  
  onTransform(object, mode) {
    // Real-time transform feedback with both local and world coordinates
    const transform = this.transformManager.getTransformData()
    
    // Update tooltip position if it exists
    if (this.tooltipsManager && object === this.tooltipsManager.selectedMesh) {
      // Determine the best tooltip position dynamically as the object moves
      const cornerPosition = this.determineTooltipPosition(object)
      this.tooltipsManager.updateTooltip(cornerPosition)
    }
    
    this.emit('transform-update', transform)
  }
  
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
        this.pathfindingManager.handleManualSegmentTransformation(object, this.currentSceneData)
      } else {
        console.warn('⚠️ PathfindingManager or CurrentSceneData not available')
      }
    } else {
      console.warn('🔍 Object is not a pipe segment')
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
      this.updatePaths()
    }      

    if (typeof window !== 'undefined') {          
      // Also dispatch a general scene initialization complete event
      console.log('📡 Dispatching sceneUpdateComplete event')
      const sceneCompleteEvent = new CustomEvent('sceneUpdateComplete', {
        detail: {
          timestamp: Date.now()
        }
      })
      window.dispatchEvent(sceneCompleteEvent)
    }
  }
  
  onModeChange(newMode, oldMode) {
    this.transformMode = newMode
    console.log(`🔄 Transform mode: ${oldMode} → ${newMode}`)
    
    // Emit event
    this.emit('transform-mode-changed', newMode)
  }

  onObjectRemoved(object) {
    console.log('🗑️ Object removed:', object.uuid)
    
    this.onGatewayConnectionsRevert(object)
  }
  
  /**
   * Update pathfinding with new connections
   */
  async updatePathfindingWithConnections(newConnections) {
    if (this.pathfindingManager) {
      const success = await this.pathfindingManager.updatePathfindingWithConnections(newConnections)
      if (success) {
        // Emit event to notify about the scene data change
        this.emit('scene-data-updated', { 
          action: 'connections-update', 
          connections: newConnections,
          sceneData: this.currentSceneData 
        })
      }
      return success
    }
    return false
  }

  getPathColor(index) {
    return this.pathfindingManager ? this.pathfindingManager.getPathColor(index) : '#468e49'
  }

  updatePaths() {
    console.log("updatePaths started")
    // Delegate pathfinding update to PathfindingManager
    if (this.pathfindingManager) {
      this.pathfindingManager.updatePathfindingAfterTransform(this.currentSceneData)
    }
  }

  /**
   * Remove all paths
   */
  removeAllPaths() {
    if (this.pathfindingManager) {
      this.pathfindingManager.removeAllPaths()
    }
  }
  
  /**
   * Recompute world bounding boxes
   */
  recomputeWorldBoundingBoxes(currentSceneData) {
    if (this.pathfindingManager) {
      this.pathfindingManager.recomputeWorldBoundingBoxes(currentSceneData)
    }
  }
  
  /**
   * Gateway removal callback handlers
   */
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
  }

  /**
   * Check if object is selectable for transformation
   */
  isSelectableObject(object) {
    if(object.type == "TransformControlsPlane") {
      object = object.object
    }
    
    // Allow pipe segments and junctions to be selected
    const isPipeSegment = object.userData?.isPipeSegment === true
    const isPipeJunction = object.userData?.isPipeJunction === true
    
    if (isPipeSegment) {
      return true
    }
    
    // Exclude regular polyline parent objects (pipe paths) from selection
    if (object.name && object.name.toLowerCase().includes("polyline") && !isPipeSegment && !isPipeJunction) {
      return false
    }

    // Check for different component types using userData.componentType
    const isGLBModel = object.userData && object.userData.componentType === 'component'
    const isConnector = object.userData && object.userData.componentType === 'connector'
    const isGateway = object.userData && object.userData.componentType === 'gateway'
    
    const canTransform = (object.isMesh || object.isObject3D) && 
      (isGLBModel || isConnector || isGateway) && 
      object.visible
    
    return canTransform
  }
  
  /**
   * Select object for transformation
   */
  selectObjectForTransform(object) {
    // Safety check: ensure object is valid before selecting
    if (!object || !object.parent) {
      console.warn('⚠️ Cannot select invalid object for transform')
      return
    }
    
    if (this.transformManager) {
      this.transformManager.selectObject(object)
    }
  }
  
  /**
   * Deselect currently selected object
   */
  deselectObject() {
    if (this.transformManager) {
      this.transformManager.deselectObject()
    }
    this.selectedObjectForTransform = null
  }
  
  /**
   * Public API method to select an object in the scene
   */
  selectObject(object) {
    if (!object || !object.uuid) {
      console.warn('⚠️ Cannot select invalid object')
      return false
    }
    
    // Select the object for transformation
    this.selectObjectForTransform(object)
    
    // Emit event
    this.emit('object-selected-for-transform', object)
    
    return true
  }
  
  /**
   * Get currently selected object transform data
   */
  getSelectedTransform() {
    return this.transformManager?.getTransformData() || null
  }
  
  /**
   * Component management methods
   */
  async addComponentToScene(componentData) {
    const result = this.componentManager ? await this.componentManager.addComponentToScene(componentData) : false
    if (result) {
      this.emit('scene-changed', { action: 'add', data: componentData })
    }
    return result
  }
  
  removeComponentFromScene(componentUuid) {
    const result = this.componentManager ? this.componentManager.removeComponentFromScene(componentUuid) : false
    if (result) {
      this.emit('scene-changed', { action: 'remove', uuid: componentUuid })
    }
    return result
  }

  getSceneComponents() {
    return this.componentManager ? this.componentManager.getSceneComponents() : []
  }
  
  updateComponent(componentUuid, updates) {
    return this.componentManager ? this.componentManager.updateComponent(componentUuid, updates) : false
  }
  
  /**
   * Export scene data
   */
  exportSceneData() {
    return this.sceneExportManager ? this.sceneExportManager.exportSceneData() : null
  }

  downloadSceneExport(filename = null) {
    return this.sceneExportManager ? this.sceneExportManager.downloadSceneExport(filename) : false
  }
  
  /**
   * Tooltip management methods
   */
  updateTooltipForObject(object, cornerPosition) {
    if (this.tooltipsManager && object) {
      // If no specific corner position provided, determine the best one
      if (!cornerPosition) {
        cornerPosition = this.determineTooltipPosition(object)
      }
      
      // Update the tooltip for the specified object with the corner position
      this.tooltipsManager.setSelectedMesh(object, cornerPosition)
    }
  }

  clearAllTooltips() {
    if (this.tooltipsManager) {
      this.tooltipsManager.clearTooltip()
    }
  }

  /**
   * Helper method to determine the best tooltip position based on the object's position in the scene
   */
  determineTooltipPosition(object) {
    if (!object || !this.camera || !this.scene) {
      return 'top-right' // Default position
    }
    
    // Get the object's world position
    const objPosition = new THREE.Vector3()
    object.getWorldPosition(objPosition)
    
    // Project the object's position to screen space
    const screenPosition = objPosition.clone()
    screenPosition.project(this.camera)
    
    // Convert to normalized device coordinates (-1 to +1)
    const x = screenPosition.x
    const y = screenPosition.y
    
    // Determine the best position based on the screen quadrant
    if (x > 0 && y > 0) {
      // Top-right quadrant - place tooltip at top-left
      return 'top-left'
    } else if (x <= 0 && y > 0) {
      // Top-left quadrant - place tooltip at top-right
      return 'top-right'
    } else if (x > 0 && y <= 0) {
      // Bottom-right quadrant - place tooltip at top-left
      return 'top-left'
    } else {
      // Bottom-left quadrant - place tooltip at top-right
      return 'top-right'
    }
  }

  /**
   * Helper method to get the checkUnderground setting from localStorage
   */
  getCheckUndergroundSetting() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedSettings = localStorage.getItem('sceneConfigurations')
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings)
          // Default to true if not explicitly set to false
          return parsed.checkUnderground !== false
        }
      }
    } catch (error) {
      console.warn('⚠️ Error reading checkUnderground setting from localStorage:', error)
    }
    
    // Default to true if localStorage is not available or has errors
    return true
  }

  /**
   * Toggle shouldUpdatePaths setting
   */
  toggleshouldUpdatePaths() {
    this.shouldUpdatePaths = !this.shouldUpdatePaths
    console.log(`🔄 shouldUpdatePaths ${this.shouldUpdatePaths ? 'enabled' : 'disabled'}`)
    
    // Also log current state for clarity
    if (this.shouldUpdatePaths) {
      console.log('✅ Path recalculation will occur after component transforms')
      this.updatePaths()
    } else {
      console.log('⚠️ Path recalculation disabled - manual scene reload may be needed')
    }
    
    return this.shouldUpdatePaths
  }
  
  /**
   * Transform controls management
   */
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
  }

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
    })
    
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
  }
  
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
  }

  setMultiAxisTranslation(enabled) {
    if (!this.transformManager) {
      console.warn('⚠️ No transform manager found')
      return false
    }
    
    return this.transformManager.setShowPlanes(enabled)
  }
  
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
  }
  
  /**
   * Clean up transform controls
   */
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
  }
  
  /**
   * Manual cleanup method that can be called externally
   */
  destroy() {
    console.log('🔧 Manual cleanup requested')
    this.dispose()
  }

  /**
   * Utility method to check if scene is properly disposed
   */
  isDisposed() {
    return (
      this.isDestroyed ||
      !this.scene ||
      !this.renderer ||
      !this.camera
    )
  }
  
  /**
   * Comprehensive cleanup and disposal
   */
  dispose() {
    console.log('Starting comprehensive scene cleanup...')

    // Stop animation loop by setting a flag
    this.isDestroyed = true

    try {
      // Use disposal manager for comprehensive cleanup
      if (this.disposalManager) {
        try {
          this.disposalManager.cleanupEventListeners()
          this.disposalManager.cleanupControls()
          this.disposalManager.cleanupGlobalReferences()
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
  
      console.log('Scene cleanup completed')
    } catch (e) {
      console.error('Unexpected error during scene cleanup:', e)
    }
  }
}

export default SceneViewerEnhanced
