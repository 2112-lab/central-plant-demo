<template>
  <div 
    ref="viewport2DContainer" 
    class="viewport-2d-container"
    :class="{ 'dragging': isDragging, 'panning': isPanning }"
    :style="{ width: '100%', height: '100%' }"
  >
    <!-- Konva canvas will be attached here -->
  </div>
</template>

<script>
let Konva = null;

export default {
  name: 'Viewport2D',
  
  props: {
    viewportId: {
      type: String,
      required: true
    },
    viewportConfig: {
      type: Object,
      required: true
    },
    centralPlant: {
      type: Object,
      default: null
    }
  },
  
  data() {
    return {
      stage: null,
      layer: null,
      gridLayer: null,
      componentLayer: null,
      spatialBoundariesLayer: null,
      isReady: false,
      gridReady: false,
      componentRectangles: [],
      konvaLoaded: false,
      isDragging: false,
      // Pan state
      isPanning: false,
      lastPanPoint: null,
      // Grid configuration
      PIXELS_PER_UNIT: 30,    // 20 pixels = 1 world unit
      SNAP_GRID_UNIT: 0.5,    // Snap to 0.5 unit increments
      // Zoom configuration
      zoomLevel: 1,
      MIN_ZOOM: 0.1,
      MAX_ZOOM: 5,
      ZOOM_SPEED: 0.1,
      // Event listener references for cleanup
      componentAddedListener: null,
      componentRemovedListener: null,
      sceneUpdateCompleteListener: null
    }
  },
  
  mounted() {
    console.log(`🔲 Viewport2D ${this.viewportId} mounting with config:`, this.viewportConfig);
    this.loadKonvaAndInitialize();
    this.setupComponentEventListeners();
    
    // Setup keyboard shortcuts
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyboardShortcuts);
    }

  },
  
  beforeDestroy() {
    console.log(`🔲 Viewport2D ${this.viewportId} destroying...`);
    this.removeComponentEventListeners();
    this.destroyKonvaStage();
    
    // Clean up keyboard listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyboardShortcuts);
    }
  },
  
  watch: {    
    viewportConfig: {
      handler(newConfig, oldConfig) {
        if (oldConfig && newConfig.type !== oldConfig.type && this.konvaLoaded) {
          console.log(`🔄 Viewport2D ${this.viewportId} config changed from ${oldConfig.type} to ${newConfig.type}`);
          // Only re-render components, keep the grid
          if (this.centralPlant) {
            this.renderComponentRectangles();
          }
        }
      },
      deep: true
    }
  },
  
  methods: {
    drawSpatialBoundaries() {
      if (!this.spatialBoundariesLayer) {
        console.log(`⏳ Cannot render spatial boundaries yet - spatialBoundariesLayer: ${!!this.spatialBoundariesLayer}`);
        return;
      }

      const spatialBoundaries = this.centralPlant.metadata.spatialBoundaries;
      
      console.log(`🔳 Rendering spatial boundaries for ${this.viewportId}...`);
      
      // Clear existing spatial boundaries
      this.spatialBoundariesLayer.destroyChildren();
      
      // Get stage dimensions
      const stageWidth = this.stage.width();
      const stageHeight = this.stage.height();
      
      // Calculate scale and world origin (use current render scale for consistency)
      const scale = this.getCurrentRenderScale(stageWidth, stageHeight);
      const worldOriginX = stageWidth / 2;
      const worldOriginY = stageHeight / 2;

      // Calculate boundary dimensions and position based on viewport type
      let boundaryWidth, boundaryHeight, boundaryX, boundaryY;
      let worldWidth, worldHeight, worldCenterX, worldCenterY;

      switch (this.viewportConfig.type) {
        case 'Front':
          // Front view: X-Y plane
          worldWidth = spatialBoundaries.max.x - spatialBoundaries.min.x;
          worldHeight = spatialBoundaries.max.y - spatialBoundaries.min.y;
          worldCenterX = spatialBoundaries.center.x;
          worldCenterY = spatialBoundaries.center.y;
          break;
        case 'Top':
          // Top view: X-Z plane
          worldWidth = spatialBoundaries.max.x - spatialBoundaries.min.x;
          worldHeight = spatialBoundaries.max.z - spatialBoundaries.min.z;
          worldCenterX = spatialBoundaries.center.x;
          worldCenterY = spatialBoundaries.center.z;
          break;
        case 'Side':
          // Side view: Z-Y plane
          worldWidth = spatialBoundaries.max.z - spatialBoundaries.min.z;
          worldHeight = spatialBoundaries.max.y - spatialBoundaries.min.y;
          worldCenterX = spatialBoundaries.center.z;
          worldCenterY = spatialBoundaries.center.y;
          break;
        default:
          // Default to Front view
          worldWidth = spatialBoundaries.max.x - spatialBoundaries.min.x;
          worldHeight = spatialBoundaries.max.y - spatialBoundaries.min.y;
          worldCenterX = spatialBoundaries.center.x;
          worldCenterY = spatialBoundaries.center.y;
      }

      // Convert world dimensions to screen dimensions
      boundaryWidth = worldWidth * scale;
      boundaryHeight = worldHeight * scale;

      // Calculate screen position - center the boundary on the world origin
      if (this.viewportConfig.type === 'Front' || this.viewportConfig.type === 'Side') {
        // For Front and Side views, Y is vertical with origin at bottom
        boundaryX = worldOriginX + (worldCenterX * scale) - (boundaryWidth / 2);
        boundaryY = worldOriginY - (worldCenterY * scale) - (boundaryHeight / 2);
      } else if (this.viewportConfig.type === 'Top') {
        // For Top view: standard screen coordinates
        boundaryX = worldOriginX + (worldCenterX * scale) - (boundaryWidth / 2);
        boundaryY = worldOriginY + (worldCenterY * scale) - (boundaryHeight / 2);
      } else {
        // Default positioning
        boundaryX = worldOriginX + (worldCenterX * scale) - (boundaryWidth / 2);
        boundaryY = worldOriginY - (worldCenterY * scale) - (boundaryHeight / 2);
      }

      // Create spatial boundary rectangle with black border
      const boundaryRect = new Konva.Rect({
        x: boundaryX,
        y: boundaryY,
        width: boundaryWidth,
        height: boundaryHeight,
        fill: 'transparent', // No fill, only border
        stroke: '#333', // Dark grey
        strokeWidth: 1,
        opacity: 0.8,
        name: 'spatial-boundary-rectangle',
        listening: false // Make non-interactive so it doesn't interfere with component dragging
      });

      this.spatialBoundariesLayer.add(boundaryRect);
      
      // Draw the spatial boundaries layer
      this.spatialBoundariesLayer.draw();
      
      console.log(`✅ Spatial boundaries rendering complete for ${this.viewportId} - Rect: ${boundaryX.toFixed(1)}, ${boundaryY.toFixed(1)}, ${boundaryWidth.toFixed(1)}x${boundaryHeight.toFixed(1)}`);
    
      this.drawGrid(boundaryWidth, boundaryHeight);
      this.addGroundLine();
    
    },
    /**
     * Setup custom event listeners for component changes
     */
    setupComponentEventListeners() {
      if (typeof window === 'undefined') {
        return;
      }
      
      // Component added event listener
      this.componentAddedListener = (event) => {
        console.log(`📡 Viewport2D ${this.viewportId} received componentAdded event:`, event.detail);
        
        // Check if viewport is ready before attempting to render
        if (this.isReady && this.gridReady && this.konvaLoaded) {
          // Slight delay to ensure the component is fully added to the scene
          this.$nextTick(() => {
            console.log(`🔄 Triggering component render in ${this.viewportId} due to component addition`);
            this.renderComponentRectangles();
          });
        } else {
          console.log(`⏳ Viewport ${this.viewportId} not ready yet, will render when ready`);
        }
      };
      
      // Component removed event listener
      this.componentRemovedListener = (event) => {
        console.log(`📡 Viewport2D ${this.viewportId} received componentRemoved event:`, event.detail);
        
        if (this.isReady && this.gridReady && this.konvaLoaded) {
          this.$nextTick(() => {
            console.log(`🔄 Triggering component render in ${this.viewportId} due to component removal`);
            this.renderComponentRectangles();
          });
        }
      };
      
      // Add listeners to window
      window.addEventListener('componentAdded', this.componentAddedListener);
      window.addEventListener('componentRemoved', this.componentRemovedListener);
      
      // Scene initialization complete event listener
      this.sceneUpdateCompleteListener = (event) => {
        console.log(`📡 Viewport2D ${this.viewportId} received sceneUpdateComplete event:`, event.detail);
        
        if (this.isReady && this.gridReady && this.konvaLoaded) {
          this.$nextTick(() => {
            console.log(`🔄 Triggering full component render in ${this.viewportId} due to scene initialization completion`);
            this.renderComponentRectangles();
          });
        }
      };
      
      window.addEventListener('sceneUpdateComplete', this.sceneUpdateCompleteListener);
      
      console.log(`📡 Event listeners setup for Viewport2D ${this.viewportId}`);
    },
    
    /**
     * Remove custom event listeners
     */
    removeComponentEventListeners() {
      if (typeof window === 'undefined') {
        return;
      }
      
      if (this.componentAddedListener) {
        window.removeEventListener('componentAdded', this.componentAddedListener);
        this.componentAddedListener = null;
      }
      
      if (this.componentRemovedListener) {
        window.removeEventListener('componentRemoved', this.componentRemovedListener);
        this.componentRemovedListener = null;
      }
      
      if (this.sceneUpdateCompleteListener) {
        window.removeEventListener('sceneUpdateComplete', this.sceneUpdateCompleteListener);
        this.sceneUpdateCompleteListener = null;
      }
      
      console.log(`📡 Event listeners removed for Viewport2D ${this.viewportId}`);
    },

    /**
     * Load Konva dynamically and initialize stage
     */
    async loadKonvaAndInitialize() {
      try {
        // Try to use existing global Konva first
        if (typeof window !== 'undefined' && window.Konva) {
          Konva = window.Konva;
          this.konvaLoaded = true;
          console.log('🎨 Using existing global Konva');
        } else {
          // Dynamic import for Konva
          console.log('🔄 Loading Konva dynamically...');
          const konvaModule = await import('konva');
          Konva = konvaModule.default || konvaModule;
          
          // Make it available globally for other components
          if (typeof window !== 'undefined') {
            window.Konva = Konva;
          }
          
          this.konvaLoaded = true;
          console.log('✅ Konva loaded successfully');
        }
        
        // Initialize stage after Konva is loaded
        this.initializeKonvaStage();
        
      } catch (error) {
        console.error('❌ Failed to load Konva:', error);
        this.$emit('viewport-ready', {
          ready: false,
          component: 'Viewport2D',
          error: 'Failed to load Konva'
        });
      }
    },
    
    /**
     * Initialize Konva stage for 2D rendering
     */
    initializeKonvaStage() {
      if (!Konva) {
        console.error('❌ Konva not available for 2D viewport initialization');
        return;
      }
      
      const container = this.$refs.viewport2DContainer;
      if (!container) {
        console.error('❌ Container not found for 2D viewport');
        return;
      }
      
      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 300;
      
      console.log(`📐 Initializing Konva stage for ${this.viewportId}: ${width}x${height}`);
      
      // Create Konva stage
      this.stage = new Konva.Stage({
        container: container,
        width: width,
        height: height
      });
      
      // Create separate layers for grid, components, and spatial boundaries
      this.gridLayer = new Konva.Layer();
      this.componentLayer = new Konva.Layer();
      this.spatialBoundariesLayer = new Konva.Layer();
      
      // Add layers to stage in order (grid first, then components, then spatial boundaries on top)
      this.stage.add(this.gridLayer);
      this.stage.add(this.componentLayer);
      this.stage.add(this.spatialBoundariesLayer);
      
      // Keep reference to main layer for backward compatibility
      this.layer = this.componentLayer;
      
      // Setup resize handling
      this.setupResizeListener();
      
      // Add global stage event handlers for cursor management
      this.setupStageEventHandlers();
      
      // Setup zoom handling
      this.setupZoomHandlers();
      
      this.drawSpatialBoundaries();

      this.addGroundLine();
      
      // Mark as ready
      this.isReady = true;
      this.$emit('viewport-ready', {
        ready: true,
        component: 'Viewport2D',
        stage: this.stage,
        layer: this.componentLayer,
        gridLayer: this.gridLayer,
        spatialBoundariesLayer: this.spatialBoundariesLayer
      });
      
      console.log(`✅ Viewport2D ${this.viewportId} initialized successfully`);
      
      // Render components if central plant data is available
      if (this.centralPlant) {
        this.$nextTick(() => {
          this.renderComponentRectangles();
        });
      }
    },
    
    /**
     * Destroy Konva stage
     */
    destroyKonvaStage() {
      
      if (this.stage) {
        this.stage.destroy();
        this.stage = null;
        this.layer = null;
        this.gridLayer = null;
        this.componentLayer = null;
        this.spatialBoundariesLayer = null;
      }
      
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      
      // Reset cursor as final cleanup
      document.body.style.cursor = 'default';
      
      this.isReady = false;
      this.gridReady = false;
      this.isDragging = false;
      this.isPanning = false;
      this.lastPanPoint = null;
    },
    
    /**
     * Setup resize listener for responsive stage
     */
    setupResizeListener() {
      if (!window.ResizeObserver) {
        // Fallback to window resize event
        const resizeHandler = () => {
          this.resizeStage();
        };
        window.addEventListener('resize', resizeHandler);
        this._resizeHandler = resizeHandler;
        return;
      }
      
      // Use ResizeObserver for better performance
      this._resizeObserver = new ResizeObserver(() => {
        this.resizeStage();
      });
      
      this._resizeObserver.observe(this.$refs.viewport2DContainer);
    },
    
    /**
     * Resize stage to fit container
     */
    resizeStage() {
      if (!this.stage || !this.$refs.viewport2DContainer) {
        return;
      }
      
      const container = this.$refs.viewport2DContainer;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      if (width > 0 && height > 0) {
        this.stage.width(width);
        this.stage.height(height);
        
        // Redraw grid on the grid layer
        // this.redrawGrid(width, height);
        
        // Redraw spatial boundaries if data is available
        if (this.centralPlant && this.centralPlant.metadata && this.centralPlant.metadata.spatialBoundaries) {
          this.drawSpatialBoundaries();
        }
        
        // Redraw ground line
        this.redrawGroundLine();
        
        // Redraw components if data is available
        if (this.centralPlant) {
          this.renderComponentRectangles();
        }
      }
    },
    
    /**
     * Add grid pattern to the grid layer
     */
    addGrid(width, height, scale = null) {
      if (!Konva || !this.gridLayer) return;
      
      // Use the same scale that components use for consistency
      const currentScale = scale || this.getCurrentRenderScale(width, height);
      const majorGridSize = currentScale; // 1 unit spacing in current scale
      const minorGridSize = currentScale * this.SNAP_GRID_UNIT; // 0.5 unit spacing in current scale
      const gridGroup = new Konva.Group();
      
      // Calculate center position to align grid with crosshairs
      const centerX = Math.round(width / 2);
      const centerY = Math.round(height / 2);
      
      // Add major grid lines (1 unit intervals)
      for (let i = 0; i <= Math.max(centerX, width - centerX); i += majorGridSize) {
        // Line to the right of center
        if (centerX + i <= width) {
          const line = new Konva.Line({
            points: [centerX + i, 0, centerX + i, height],
            stroke: '#e9ecef',
            strokeWidth: 0.8
          });
          gridGroup.add(line);
        }
        
        // Line to the left of center (skip i=0 to avoid duplicate center line)
        if (i > 0 && centerX - i >= 0) {
          const line = new Konva.Line({
            points: [centerX - i, 0, centerX - i, height],
            stroke: '#e9ecef',
            strokeWidth: 0.8
          });
          gridGroup.add(line);
        }
      }
      
      for (let i = 0; i <= Math.max(centerY, height - centerY); i += majorGridSize) {
        // Line below center
        if (centerY + i <= height) {
          const line = new Konva.Line({
            points: [0, centerY + i, width, centerY + i],
            stroke: '#e9ecef',
            strokeWidth: 0.8
          });
          gridGroup.add(line);
        }
        
        // Line above center (skip i=0 to avoid duplicate center line)
        if (i > 0 && centerY - i >= 0) {
          const line = new Konva.Line({
            points: [0, centerY - i, width, centerY - i],
            stroke: '#e9ecef',
            strokeWidth: 0.8
          });
          gridGroup.add(line);
        }
      }
      
      // Add minor grid lines for 0.5 unit snap points
      for (let i = minorGridSize; i <= Math.max(centerX, width - centerX); i += minorGridSize) {
        // Skip positions that already have major grid lines
        if (i % majorGridSize !== 0) {
          // Vertical minor lines to the right
          if (centerX + i <= width) {
            const line = new Konva.Line({
              points: [centerX + i, 0, centerX + i, height],
              stroke: '#f1f3f4',
              strokeWidth: 0.3,
              dash: [2, 2]
            });
            gridGroup.add(line);
          }
          
          // Vertical minor lines to the left
          if (centerX - i >= 0) {
            const line = new Konva.Line({
              points: [centerX - i, 0, centerX - i, height],
              stroke: '#f1f3f4',
              strokeWidth: 0.3,
              dash: [2, 2]
            });
            gridGroup.add(line);
          }
        }
      }
      
      for (let i = minorGridSize; i <= Math.max(centerY, height - centerY); i += minorGridSize) {
        // Skip positions that already have major grid lines
        if (i % majorGridSize !== 0) {
          // Horizontal minor lines below
          if (centerY + i <= height) {
            const line = new Konva.Line({
              points: [0, centerY + i, width, centerY + i],
              stroke: '#f1f3f4',
              strokeWidth: 0.3,
              dash: [2, 2]
            });
            gridGroup.add(line);
          }
          
          // Horizontal minor lines above
          if (centerY - i >= 0) {
            const line = new Konva.Line({
              points: [0, centerY - i, width, centerY - i],
              stroke: '#f1f3f4',
              strokeWidth: 0.3,
              dash: [2, 2]
            });
            gridGroup.add(line);
          }
        }
      }
      
      this.gridLayer.add(gridGroup);
    },
    
    /**
     * Add crosshairs at the center to the grid layer
     */
    addCrosshairs(width, height) {
      if (!Konva || !this.gridLayer) return;
      
      // Round to nearest pixel to ensure crisp lines
      const centerX = Math.round(width / 2) + 0.5;
      const centerY = Math.round(height / 2) + 0.5;
      const crosshairLength = 20;
      
      // Create crosshair group
      const crosshairGroup = new Konva.Group();
      
      // Dash pattern configuration
      const dashLength = 5.1;
      const gapLength = 4;
      const totalDashUnit = dashLength + gapLength;
      
      // Calculate dash offset to center the pattern
      const horizontalOffset = (crosshairLength * 2) % totalDashUnit;
      const verticalOffset = (crosshairLength * 2) % totalDashUnit;
      
      // Horizontal crosshair line
      const horizontalLine = new Konva.Line({
        points: [
          Math.round(centerX - crosshairLength) + 0.5, centerY,
          Math.round(centerX + crosshairLength) + 0.5, centerY
        ],
        stroke: '#000000',
        strokeWidth: 1,
        dash: [dashLength, gapLength],
        dashOffset: horizontalOffset / 2,
        opacity: 0.8,
        perfectDrawEnabled: false
      });
      
      // Vertical crosshair line
      const verticalLine = new Konva.Line({
        points: [
          centerX, Math.round(centerY - crosshairLength) + 0.5,
          centerX, Math.round(centerY + crosshairLength) + 0.5
        ],
        stroke: '#000000',
        strokeWidth: 1,
        dash: [dashLength, gapLength],
        dashOffset: verticalOffset / 2,
        opacity: 0.8,
        perfectDrawEnabled: false
      });
      
      crosshairGroup.add(horizontalLine);
      crosshairGroup.add(verticalLine);
      this.gridLayer.add(crosshairGroup);
    },
    
    /**
     * Add ground line for Front and Side views
     * @param {number} length - Length of the ground line in world units (optional, defaults to full viewport width)
     */
    addGroundLine(length = null) {
      if (!Konva || !this.gridLayer) return;
      
      // Only add ground line for Front and Side views (where Y represents vertical)
      if (this.viewportConfig.type !== 'Front' && this.viewportConfig.type !== 'Side') {
        return;
      }
      
      const stageWidth = this.stage.width();
      const stageHeight = this.stage.height();
      const scale = this.getCurrentRenderScale(stageWidth, stageHeight);
      const centerX = stageWidth / 2;
      const centerY = stageHeight / 2;
      
      // Ground is at world Y = 0
      const groundWorldY = 0;
      
      // Convert world Y to screen Y coordinate
      // In Front and Side views, Y is vertical with origin at center
      const groundScreenY = centerY - (groundWorldY * scale);
      
      // Only draw ground line if it's within the viewport bounds
      if (groundScreenY >= 0 && groundScreenY <= stageHeight) {
        let startX, endX;
        
        if (length !== null) {
          // Draw a centered line with specified length in world units
          const halfLength = (length / 2) * scale;
          startX = centerX - halfLength;
          endX = centerX + halfLength;
        } else {
          // Draw line across full viewport width
          startX = 0;
          endX = stageWidth;
        }
        
        const groundLine = new Konva.Line({
          points: [startX, groundScreenY, endX, groundScreenY],
          stroke: '#0D47A1', // Brown color for ground
          strokeWidth: 1,
          opacity: 0.8,
          name: 'ground-line',
          listening: false // Make non-interactive
        });
        
        this.gridLayer.add(groundLine);
        
        const lengthDesc = length !== null ? `${length} units` : 'full width';
        console.log(`🌍 Ground line added for ${this.viewportConfig.type} view at Y=${groundScreenY.toFixed(1)}px (world Y=${groundWorldY}, length: ${lengthDesc})`);
      } else {
        console.log(`🌍 Ground line not visible in ${this.viewportConfig.type} view (Y=${groundScreenY.toFixed(1)}px outside bounds)`);
      }
    },
    
    /**
     * Redraw ground line when viewport is resized
     */
    redrawGroundLine() {
      if (!this.gridLayer) return;
      
      // Remove existing ground line
      const existingGroundLine = this.gridLayer.findOne('.ground-line');
      if (existingGroundLine) {
        existingGroundLine.destroy();
      }
      
      // Add new ground line
      this.addGroundLine();
      
      // Redraw grid layer
      this.gridLayer.draw();
    },
    
    /**
     * Refresh the display - called when scene data changes
     */
    refreshDisplay() {
      if (!this.isReady || !this.stage || !this.konvaLoaded) {
        return;
      }
      
      console.log(`🔄 Refreshing Viewport2D ${this.viewportId} display...`);
      this.renderComponentRectangles();
    },
    /**
     * Render component rectangles based on scene data
     */
    renderComponentRectangles() {
      if (!this.componentLayer || !this.centralPlant) {
        console.log(`⏳ Cannot render components yet - componentLayer: ${!!this.componentLayer}, centralPlant: ${!!this.centralPlant}`);
        return;
      }
      
      console.log(`🔄 Rendering component rectangles for ${this.viewportId}...`);
      
      // Clear existing component rectangles from component layer
      this.componentLayer.destroyChildren();
      
      // Get scene data from central plant
      const sceneData = this.getSceneData();
      if (!sceneData || !sceneData.length) {
        console.log(`📦 No component data available for ${this.viewportId}`);
        this.componentLayer.draw();
        return;
      }
      
      console.log(`📦 Rendering ${sceneData.length} components in ${this.viewportId} (${this.viewportConfig.type})`);
      
      // Get stage dimensions
      const stageWidth = this.stage.width();
      const stageHeight = this.stage.height();
      
      // Calculate scale and render components
      const scale = this.calculateAdaptiveScale(sceneData, stageWidth, stageHeight);
      const worldOriginX = stageWidth / 2;
      const worldOriginY = stageHeight / 2;
      
      sceneData.forEach((component, index) => {
        this.renderComponentRectangle(component, index, scale, worldOriginX, worldOriginY);
      });
      
      // Draw only the component layer
      this.componentLayer.draw();
      
      // Refresh grid to match the component scale if it's different
      this.refreshGridToMatchComponents();
      
      console.log(`✅ Component rendering complete for ${this.viewportId}`);
    },
    
    /**
     * Get scene data from central plant
     */
    getSceneData() {
      if (!this.centralPlant) {
        return [];
      }
      
      // Try to get scene data from central plant
      // This is a placeholder - you'll need to implement the actual method
      // based on how your central plant exposes scene data
      try {
        if (this.centralPlant.getComponentsWithDimensions) {
          return this.centralPlant.getComponentsWithDimensions();
        }
        
        // Fallback: try to get from scene viewer
        const sceneViewer = this.getSceneViewer();
        if (sceneViewer && sceneViewer.scene) {
          const components = [];
          sceneViewer.scene.traverse((object) => {
            if (object.userData && 
                object.userData.componentType === 'component' && 
                object.userData.adaptedBoundingBox) {
              
              components.push({
                name: object.name || 'Unnamed Component',
                uuid: object.uuid,
                position: object.position,
                rotation: object.rotation,
                adaptedBoundingBox: object.userData.adaptedBoundingBox,
                object: object
              });
            }
          });
          return components;
        }
      } catch (error) {
        console.warn('⚠️ Error getting scene data:', error);
      }
      
      return [];
    },
    
    /**
     * Get scene viewer from parent
     */
    getSceneViewer() {
      // Try to get scene viewer from parent component
      if (this.$parent && this.$parent.getSceneViewer) {
        return this.$parent.getSceneViewer();
      }
      return null;
    },
    
    /**
     * Calculate scale for component rendering
     */
    calculateScale(components, stageWidth, stageHeight) {
      if (!components.length) {
        return 1;
      }
      
      // Calculate bounds of all components
      let minCoord1 = Infinity, maxCoord1 = -Infinity;
      let minCoord2 = Infinity, maxCoord2 = -Infinity;
      
      components.forEach(component => {
        const coords = this.getComponentCoords(component);
        if (coords) {
          minCoord1 = Math.min(minCoord1, coords.coord1 - coords.width / 2);
          maxCoord1 = Math.max(maxCoord1, coords.coord1 + coords.width / 2);
          minCoord2 = Math.min(minCoord2, coords.coord2 - coords.height / 2);
          maxCoord2 = Math.max(maxCoord2, coords.coord2 + coords.height / 2);
        }
      });
      
      // Calculate scale based on viewport size
      const maxExtent = Math.max(
        Math.abs(minCoord1), Math.abs(maxCoord1),
        Math.abs(minCoord2), Math.abs(maxCoord2)
      );
      
      const baseScale = Math.min(stageWidth, stageHeight) * 0.4; // 40% of viewport size
      return maxExtent > 0 ? baseScale / maxExtent : 1;
    },
    
    /**
     * Get the base scale that aligns with the grid system
     * This ensures that 1 world unit = PIXELS_PER_UNIT screen pixels
     */
    getBaseScale() {
      return this.PIXELS_PER_UNIT;
    },
    
    /**
     * Calculate adaptive scale for component rendering that maintains grid alignment
     */
    calculateAdaptiveScale(components, stageWidth, stageHeight) {
      if (!components.length) {
        return this.getBaseScale();
      }
      
      // Calculate bounds of all components
      let minCoord1 = Infinity, maxCoord1 = -Infinity;
      let minCoord2 = Infinity, maxCoord2 = -Infinity;
      
      components.forEach(component => {
        const coords = this.getComponentCoords(component);
        if (coords) {
          minCoord1 = Math.min(minCoord1, coords.coord1 - coords.width / 2);
          maxCoord1 = Math.max(maxCoord1, coords.coord1 + coords.width / 2);
          minCoord2 = Math.min(minCoord2, coords.coord2 - coords.height / 2);
          maxCoord2 = Math.max(maxCoord2, coords.coord2 + coords.height / 2);
        }
      });
      
      // Calculate the world space extent
      const worldWidth = maxCoord1 - minCoord1;
      const worldHeight = maxCoord2 - minCoord2;
      const maxWorldExtent = Math.max(worldWidth, worldHeight);
      
      // If all components fit comfortably at base scale, use base scale
      const baseScale = this.getBaseScale();
      const baseScreenWidth = worldWidth * baseScale;
      const baseScreenHeight = worldHeight * baseScale;
      
      // Use 80% of viewport size as target area
      const targetScreenWidth = stageWidth * 0.8;
      const targetScreenHeight = stageHeight * 0.8;
      
      // If components fit at base scale, use it
      if (baseScreenWidth <= targetScreenWidth && baseScreenHeight <= targetScreenHeight) {
        return baseScale;
      }
      
      // Otherwise calculate a scale that fits the components
      const scaleX = targetScreenWidth / worldWidth;
      const scaleY = targetScreenHeight / worldHeight;
      const adaptiveScale = Math.min(scaleX, scaleY);
      
      // Round scale to maintain grid alignment if possible
      const scaleRatio = adaptiveScale / baseScale;
      if (scaleRatio > 0.1) {
        const roundedRatio = Math.round(scaleRatio * 4) / 4; // Round to quarter increments
        return baseScale * roundedRatio;
      }
      
      return adaptiveScale;
    },
    
    /**
     * Get component coordinates and dimensions for current view type
     * 
     * COORDINATE SYSTEM NOTES:
     * - 3D components have their origin at the bottom center of the mesh
     * - In Front/Side views, we need to account for this by adjusting Y coordinates
     * - pos.y represents the center of the component in 3D space
     * - For 2D rendering, we convert to a bottom-based coordinate system
     */
    getComponentCoords(component) {
      if (!component.position || !component.adaptedBoundingBox) {
        return null;
      }
      
      const pos = component.position;
      const adaptedBoundingBox = component.adaptedBoundingBox;
      const rotation = component.rotation || { x: 0, y: 0, z: 0 };
      
      const origWidth = adaptedBoundingBox.x || adaptedBoundingBox.width || 1;
      const origHeight = adaptedBoundingBox.y || adaptedBoundingBox.height || 1;
      const origDepth = adaptedBoundingBox.z || adaptedBoundingBox.depth || 1;
      
      let coord1, coord2, width, height;
      
      switch (this.viewportConfig.type) {
        case 'Front':
          coord1 = pos.x;
          // For Front view, pos.y is the center of the component, but we need to adjust
          // for the fact that 3D components have their origin at the bottom
          coord2 = pos.y + origHeight / 2; // Convert from center to bottom-based coordinate
          width = Math.abs(rotation.y) > Math.PI/4 ? origDepth : origWidth;
          height = origHeight;
          break;
        case 'Top':
          coord1 = pos.x;
          coord2 = pos.z;
          width = Math.abs(rotation.y) > Math.PI/4 ? origDepth : origWidth;
          height = Math.abs(rotation.y) > Math.PI/4 ? origWidth : origDepth;
          break;
        case 'Side':
          coord1 = pos.z;
          // For Side view, pos.y is the center of the component, but we need to adjust
          // for the fact that 3D components have their origin at the bottom
          coord2 = pos.y + origHeight / 2; // Convert from center to bottom-based coordinate
          width = Math.abs(rotation.y) > Math.PI/4 ? origWidth : origDepth;
          height = origHeight;
          break;
        default:
          coord1 = pos.x;
          coord2 = pos.y;
          width = origWidth;
          height = origHeight;
      }
      
      return { coord1, coord2, width, height };
    },
    
    /**
     * Render a single component rectangle
     * 
     * COORDINATE SYSTEM NOTES:
     * - For Front/Side views: coord2 represents the bottom of the component (bottom-based coordinate)
     * - Screen Y calculation: worldOriginY - (coord2 + height/2) * scale positions the rectangle
     *   so that coord2 corresponds to the bottom of the visual rectangle
     * - This ensures consistency between rendering and dragging transformations
     */
    renderComponentRectangle(component, index, scale, worldOriginX, worldOriginY) {
      if (!Konva) return;
      
      const coords = this.getComponentCoords(component);
      if (!coords) {
        return;
      }
      
      const { coord1, coord2, width, height } = coords;
      
      // Calculate screen position
      const screenWidth = width * scale;
      const screenHeight = height * scale;
      
      let screenX, screenY;
      
      if (this.viewportConfig.type === 'Front' || this.viewportConfig.type === 'Side') {
        // For Front and Side views, Y is vertical - origin at bottom of component
        // coord2 represents the bottom of the component, so we need to offset by height/2 to get center
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY - (coord2 + height / 2) * scale;
      } else if (this.viewportConfig.type === 'Top') {
        // For Top view: X is left-right, Z is forward-back
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY + (coord2 - height / 2) * scale;
      } else {
        // Default case
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY - (coord2 + height / 2) * scale;
      }
      
      // Create rectangle
      const rect = new Konva.Rect({
        x: screenX,
        y: screenY,
        width: screenWidth,
        height: screenHeight,
        fill: this.getComponentColor(index),
        stroke: '#333333',
        strokeWidth: 1,
        opacity: 0.7,
        name: 'component-rectangle',
        componentData: component,
        draggable: true
      });
      
      // Add text label
      const label = new Konva.Text({
        x: screenX + 2,
        y: screenY + 2,
        text: component.name,
        fontSize: Math.max(10, Math.min(14, screenWidth / 8)),
        fontFamily: 'Arial',
        fill: '#000000',
        name: 'component-label',
        listening: false // Make label non-interactive so it doesn't interfere with rectangle dragging
      });
      
      // Group rectangle and label together for easier dragging
      const componentGroup = new Konva.Group({
        draggable: true,
        name: 'component-group',
        componentData: component
      });
      
      // Remove draggable from individual rectangle since group handles it
      rect.draggable(false);
      
      // Add rectangle and label to group
      componentGroup.add(rect);
      componentGroup.add(label);
      
      // Add hover effects to rectangle
      rect.on('mouseenter', () => {
        if (!this.isDragging) {
          rect.opacity(0.9);
          rect.stroke('#007bff');
          rect.strokeWidth(2);
          
          // Set hover cursor
          const stageContainer = this.stage.container();
          if (stageContainer) {
            stageContainer.style.cursor = 'grab';
          }
          
          this.componentLayer.draw();
        }
      });
      
      rect.on('mouseleave', () => {
        if (!this.isDragging) {
          rect.opacity(0.7);
          rect.stroke('#333333');
          rect.strokeWidth(1);
          
          // Reset cursor
          const stageContainer = this.stage.container();
          if (stageContainer) {
            stageContainer.style.cursor = 'default';
          }
          
          this.componentLayer.draw();
        }
      });
      
      // Add click handler for selection to rectangle
      rect.on('click', (e) => {
        // Only handle click if not currently dragging
        if (!this.isDragging) {
          console.log(`🎯 Component clicked: ${component.name}`, component);
          this.$emit('component-selected-in-2d', component.object);
        }
      });
      
      // Add drag event handlers to the group
      componentGroup.on('dragstart', (e) => {
        // Set dragging state
        this.isDragging = true;
        
        // Change cursor and highlight during drag
        rect.opacity(1.0);
        rect.stroke('#007bff');
        rect.strokeWidth(2);
        
        // Set cursor on the stage container instead of document.body
        const stageContainer = this.stage.container();
        if (stageContainer) {
          stageContainer.style.cursor = 'grabbing';
        }
        document.body.style.cursor = 'grabbing';
        
        this.componentLayer.draw();
        
        console.log(`🎯 Started dragging ${component.name}`);
      });
      
      componentGroup.on('dragmove', (e) => {
        // Ensure cursor stays as grabbing during move
        const stageContainer = this.stage.container();
        if (stageContainer) {
          stageContainer.style.cursor = 'grabbing';
        }
        
        // Get current group position
        const currentPos = componentGroup.position();
        
        // Calculate the center position of the rectangle
        const rectCenterX = currentPos.x + rect.x() + rect.width() / 2;
        const rectCenterY = currentPos.y + rect.y() + rect.height() / 2;
        
        // Get stage dimensions and calculate scale/origin
        const stageWidth = this.stage.width();
        const stageHeight = this.stage.height();
        const sceneData = this.getSceneData();
        const scale = this.calculateAdaptiveScale(sceneData, stageWidth, stageHeight);
        const worldOriginX = stageWidth / 2;
        const worldOriginY = stageHeight / 2;
        
        // Snap to grid
        const snappedPos = this.snapScreenToGrid(rectCenterX, rectCenterY, scale, worldOriginX, worldOriginY);
        
        // Calculate the offset needed to center the rectangle on the snapped position
        const newGroupX = snappedPos.x - rect.x() - rect.width() / 2;
        const newGroupY = snappedPos.y - rect.y() - rect.height() / 2;
        
        // Update group position to snapped coordinates
        componentGroup.position({ x: newGroupX, y: newGroupY });

          // Update component position based on new group position
          this.updateComponentPositionFromGroup(component, componentGroup, rect, scale, worldOriginX, worldOriginY);
        
        // Optional: emit real-time position updates
        // this.$emit('component-dragging', { component: component.object, group: componentGroup });
        this.componentLayer.draw();
      });
      
      componentGroup.on('dragend', (e) => {
        // Use setTimeout to ensure this runs after Konva's internal drag end handling
        setTimeout(() => {
          // Reset dragging state
          this.isDragging = false;
          
          // Reset appearance
          rect.opacity(0.7);
          rect.stroke('#333333');
          rect.strokeWidth(1);
          
          // Reset cursor on both stage container and document body
          const stageContainer = this.stage.container();
          if (stageContainer) {
            stageContainer.style.cursor = 'default';
          }
          document.body.style.cursor = 'default';
          
          // Emit event to notify parent about position change
          this.$emit('component-position-changed', component.object);
          
          this.componentLayer.draw();
          
          console.log(`🎯 Finished dragging ${component.name}`);
        }, 10); // Small delay to ensure Konva's internal state is settled
      });
      
      // Add the group to the layer instead of individual elements
      this.componentLayer.add(componentGroup);
    },
    
    /**
     * Get color for component based on index
     */
    getComponentColor(index) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
      ];
      return colors[index % colors.length];
    },
    
    /**
     * Handle object selection from 3D viewport
     */
    onObjectSelected(selectedObject) {
      if (!this.componentLayer) {
        return;
      }
      
      // Update rectangle visual states based on selection
      this.componentLayer.find('.component-group').forEach(group => {
        const componentData = group.getAttr('componentData');
        if (componentData && componentData.object) {
          const isSelected = selectedObject && 
            (componentData.object.uuid === selectedObject.uuid ||
             componentData.object.userData?.originalUuid === selectedObject.uuid);
          
          // Find the rectangle within the group
          const rect = group.findOne('Rect');
          if (rect) {
            if (isSelected) {
              // Highlight selected component
              rect.stroke('#FFD700'); // Gold color for selection
              rect.strokeWidth(3);
              rect.opacity(1.0);
            } else {
              // Reset to normal appearance
              rect.stroke('#333333');
              rect.strokeWidth(1);
              rect.opacity(0.7);
            }
          }
        }
      });
      
      this.componentLayer.draw();
    },
    
    /**
     * Initialize grid immediately when stage is ready
     */
    drawGrid(width, height, showSnapPoints = false) {
      console.log(`🔳 Initializing grid for ${this.viewportId} with ${this.PIXELS_PER_UNIT}px per unit and ${this.SNAP_GRID_UNIT} unit snap...`);
      
      // Get the current render scale to ensure grid aligns with components
      const currentScale = this.getCurrentRenderScale(width, height);
      
      // Add grid and crosshairs to grid layer using current scale
      this.addGrid(width, height, currentScale);
      this.addCrosshairs(width, height);
      this.addGroundLine();
      
      // Optionally add snap point visualization for debugging
      if (showSnapPoints) {
        this.addGridSnapPoints(width, height, currentScale);
      }
      
      // Draw grid layer
      this.gridLayer.draw();
      
      // Mark grid as ready
      this.gridReady = true;
      
      console.log(`✅ Grid ready for ${this.viewportId} - Scale: ${currentScale}px per unit, Major lines every ${currentScale}px, Minor lines every ${currentScale * this.SNAP_GRID_UNIT}px`);
    },
    
    /**
     * Redraw grid when stage is resized
     */
    redrawGrid(width, height) {
      if (!this.gridLayer) {
        return;
      }
      
      // Clear existing grid content
      this.gridLayer.destroyChildren();
      
      // Get the current render scale to ensure grid aligns with components
      const currentScale = this.getCurrentRenderScale(width, height);
      
      // Add grid and crosshairs using current scale
      this.addGrid(width, height, currentScale);
      this.addCrosshairs(width, height);
      this.addGroundLine();
      
      // Redraw grid layer
      this.gridLayer.draw();
    },
    
    /**
     * Refresh grid to match current component scale
     */
    refreshGridToMatchComponents() {
      if (!this.gridLayer || !this.stage) {
        return;
      }
      
      const width = this.stage.width();
      const height = this.stage.height();
      
      // Get the current scale being used for components
      const currentScale = this.getCurrentRenderScale(width, height);
      
      // Clear and redraw grid with the current scale
      this.gridLayer.destroyChildren();
      this.addGrid(width, height, currentScale);
      this.addCrosshairs(width, height);
      this.addGroundLine();
      
      this.gridLayer.draw();
      
      console.log(`🔄 Grid refreshed to match component scale: ${currentScale}px per unit`);
    },
    
    /**
     * Force grid synchronization with current component scale
     * Call this method to ensure grid perfectly matches component positioning
     */
    synchronizeGridWithComponents() {
      if (!this.isReady || !this.stage) {
        console.log('❌ Viewport not ready for grid synchronization');
        return;
      }
      
      const width = this.stage.width();
      const height = this.stage.height();
      const currentScale = this.getCurrentRenderScale(width, height);
      
      console.log(`🔄 Synchronizing grid with components using scale: ${currentScale}px per unit`);
      
      // Clear and redraw grid with exact scale used by components
      this.gridLayer.destroyChildren();
      this.addGrid(width, height, currentScale);
      this.addCrosshairs(width, height);
      this.addGroundLine();
      this.gridLayer.draw();
      
      // Also re-render components to ensure they're using the same scale
      if (this.centralPlant) {
        this.renderComponentRectangles();
      }
      
      console.log(`✅ Grid and components synchronized`);
      
      return {
        scale: currentScale,
        majorGridSpacing: currentScale,
        minorGridSpacing: currentScale * this.SNAP_GRID_UNIT
      };
    },
    
    /**
     * Update component position based on group drag
     */
    updateComponentPositionFromGroup(component, group, rect, scale, worldOriginX, worldOriginY) {
      if (!component.object || !component.object.position) {
        console.warn('⚠️ Cannot update position: component object not found');
        return;
      }

      console.log("updateComponentPositionFromGroup started");
      
      // Get the group position and rectangle dimensions
      const groupPos = group.position();
      const rectWidth = rect.width();
      const rectHeight = rect.height();
      
      // Calculate the center of the rectangle in screen coordinates
      // Note: rect position is relative to group, so we add group position
      const screenCenterX = groupPos.x + rect.x() + rectWidth / 2;
      const screenCenterY = groupPos.y + rect.y() + rectHeight / 2;
      
      // Convert screen coordinates to world coordinates and snap to grid
      const worldCoords = this.screenToWorldCoords(
        screenCenterX, 
        screenCenterY, 
        scale, 
        worldOriginX, 
        worldOriginY
      );
      
      // Snap the world coordinates to the grid
      const snappedCoord1 = this.snapToGrid(worldCoords.coord1);
      const snappedCoord2 = this.snapToGrid(worldCoords.coord2);
      
      // Update the 3D object position based on viewport type using snapped coordinates
      const newPosition = this.worldCoordsToObjectPosition(
        { coord1: snappedCoord1, coord2: snappedCoord2 }, 
        component.object.position,
        component
      );

      // Update the component data for future renders
      component.object.position.set(newPosition.x, newPosition.y, newPosition.z);
      
    },
    
    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorldCoords(screenX, screenY, scale, worldOriginX, worldOriginY) {
      let coord1, coord2;
      
      if (this.viewportConfig.type === 'Front' || this.viewportConfig.type === 'Side') {
        // For Front and Side views, Y is vertical - origin at bottom
        coord1 = (screenX - worldOriginX) / scale;
        coord2 = -(screenY - worldOriginY) / scale;
      } else if (this.viewportConfig.type === 'Top') {
        // For Top view: X is left-right, Z is forward-back
        coord1 = (screenX - worldOriginX) / scale;
        coord2 = (screenY - worldOriginY) / scale;
      } else {
        // Default case
        coord1 = (screenX - worldOriginX) / scale;
        coord2 = -(screenY - worldOriginY) / scale;
      }
      
      return { coord1, coord2 };
    },
    
    /**
     * Convert world coordinates to 3D object position based on viewport type
     * 
     * COORDINATE SYSTEM NOTES:
     * - This method performs the inverse transformation of getComponentCoords
     * - For Front/Side views, we convert from bottom-based 2D coordinates back to center-based 3D coordinates
     * - coord2 in Front/Side views represents the bottom of the component
     * - We subtract height/2 to convert back to the center position for 3D objects
     */
    worldCoordsToObjectPosition(worldCoords, currentPosition, component = null) {
      const { coord1, coord2 } = worldCoords;
      
      // Try to get the height of the component for proper Y coordinate conversion
      let componentHeight = 1;
      if (component && component.adaptedBoundingBox) {
        componentHeight = component.adaptedBoundingBox.y || component.adaptedBoundingBox.height || 1;
      }
      
      switch (this.viewportConfig.type) {
        case 'Front':
          // Front view: coord1=X, coord2=Y (adjusted for bottom-based coordinate)
          // coord2 represents the bottom of the component, so we need to convert back to center
          return {
            x: coord1,
            y: coord2 - componentHeight / 2,
            z: currentPosition.z
          };
          
        case 'Top':
          // Top view: coord1=X, coord2=Z, Y unchanged
          return {
            x: coord1,
            y: currentPosition.y,
            z: coord2
          };
          
        case 'Side':
          // Side view: coord1=Z, coord2=Y (adjusted for bottom-based coordinate)
          // coord2 represents the bottom of the component, so we need to convert back to center
          return {
            x: currentPosition.x,
            y: coord2 - componentHeight / 2,
            z: coord1
          };
          
        default:
          // Default to Front view behavior
          return {
            x: coord1,
            y: coord2,
            z: currentPosition.z
          };
      }
    },

    /**
     * Snap a coordinate value to the nearest 0.5 unit increment
     */
    snapToGrid(value, gridUnit = null) {
      const snapUnit = gridUnit || this.SNAP_GRID_UNIT;
      return Math.round(value / snapUnit) * snapUnit;
    },
    
    /**
     * Snap screen coordinates to grid positions
     */
    snapScreenToGrid(screenX, screenY, scale, worldOriginX, worldOriginY) {
      // Convert screen to world coordinates
      const worldCoords = this.screenToWorldCoords(screenX, screenY, scale, worldOriginX, worldOriginY);
      
      // Snap world coordinates to grid
      const snappedCoord1 = this.snapToGrid(worldCoords.coord1);
      const snappedCoord2 = this.snapToGrid(worldCoords.coord2);
      
      // Convert back to screen coordinates
      let snappedScreenX, snappedScreenY;
      
      if (this.viewportConfig.type === 'Front' || this.viewportConfig.type === 'Side') {
        // For Front and Side views, Y is vertical - origin at bottom
        snappedScreenX = worldOriginX + snappedCoord1 * scale;
        snappedScreenY = worldOriginY - snappedCoord2 * scale;
      } else if (this.viewportConfig.type === 'Top') {
        // For Top view: X is left-right, Z is forward-back
        snappedScreenX = worldOriginX + snappedCoord1 * scale;
        snappedScreenY = worldOriginY + snappedCoord2 * scale;
      } else {
        // Default case
        snappedScreenX = worldOriginX + snappedCoord1 * scale;
        snappedScreenY = worldOriginY - snappedCoord2 * scale;
      }
      
      return { 
        x: snappedScreenX, 
        y: snappedScreenY,
        worldCoord1: snappedCoord1,
        worldCoord2: snappedCoord2
      };
    },

    /**
     * Handle keyboard shortcuts for viewport operations
     */
    handleKeyboardShortcuts(event) {
      // Prevent dragging if certain keys are pressed
      if (event.key === 'Escape' && this.isDragging) {
        // Cancel any ongoing drag operations
        this.cancelAllDrags();
      }
      
      // Cancel panning on Escape
      if (event.key === 'Escape' && this.isPanning) {
        this.stopPanning();
      }
    },
    
    /**
     * Cancel all active drag operations
     */
    cancelAllDrags() {
      if (!this.componentLayer) return;
      
      this.componentLayer.find('.component-group').forEach(group => {
        if (group.isDragging && group.isDragging()) {
          // Stop the drag programmatically
          group.stopDrag();
          
          // Reset group position to original
          group.position({ x: 0, y: 0 });
          
          // Reset visual state
          const rect = group.findOne('Rect');
          if (rect) {
            rect.opacity(0.7);
            rect.stroke('#333333');
            rect.strokeWidth(1);
          }
        
        }
      });
      
      // Reset state
      this.isDragging = false;
      
      // Reset cursor on both stage and document
      const stageContainer = this.stage?.container();
      if (stageContainer) {
        stageContainer.style.cursor = 'default';
      }
      document.body.style.cursor = 'default';
      
      this.componentLayer.draw();
      
      console.log('🚫 Cancelled all drag operations');
    },
    
    /**
     * Setup stage-level event handlers for cursor management
     */
    setupStageEventHandlers() {
      if (!this.stage) return;
      
      const stageContainer = this.stage.container();
      if (!stageContainer) return;
      
      // Handle mouse leave events to reset cursor
      this.stage.on('mouseleave', () => {
        if (!this.isDragging && !this.isPanning) {
          stageContainer.style.cursor = 'default';
          document.body.style.cursor = 'default';
        }
      });
      
      // Handle mouse enter events
      this.stage.on('mouseenter', () => {
        if (!this.isDragging && !this.isPanning) {
          stageContainer.style.cursor = 'default';
        }
      });
      
      // Handle mouse up events globally on the stage (safety net)
      this.stage.on('mouseup', () => {
        // Small delay to let Konva finish its internal drag handling
        setTimeout(() => {
          if (!this.isDragging && !this.isPanning) {
            stageContainer.style.cursor = 'default';
            document.body.style.cursor = 'default';
          }
        }, 50);
      });
      
      // Setup pan functionality
      this.setupPanHandlers();
      
      console.log(`🖱️ Stage event handlers setup for ${this.viewportId}`);
    },
    
    /**
     * Start pan operation
     */
    startPan(evt) {
      this.isPanning = true;
      this.lastPanPoint = { x: evt.clientX, y: evt.clientY };
      
      // Disable text selection during pan
      document.body.style.userSelect = 'none';
      
      console.log(`🛠️ Panning started for ${this.viewportId}`);
    },
    
    /**
     * Perform pan operation
     */
    performPan(evt) {
      if (!this.isPanning || !this.lastPanPoint) return;
      
      const deltaX = evt.clientX - this.lastPanPoint.x;
      const deltaY = evt.clientY - this.lastPanPoint.y;
      
      // Get current stage position
      const stagePos = this.stage.position();
      
      // Update stage position based on drag distance
      this.stage.position({
        x: stagePos.x + deltaX,
        y: stagePos.y + deltaY
      });
      
      // Update last pan point
      this.lastPanPoint = { x: evt.clientX, y: evt.clientY };
      
      console.log(`🛠️ Panning in progress for ${this.viewportId} - Delta: ${deltaX}, ${deltaY}`);
      
      this.componentLayer.batchDraw();
    },
    
    /**
     * End pan operation
     */
    endPan(evt) {
      if (!this.isPanning) return;
      
      this.isPanning = false;
      this.lastPanPoint = null;
      
      // Re-enable text selection after pan
      document.body.style.userSelect = '';
      
      console.log(`✅ Panning ended for ${this.viewportId}`);
    },

    /**
     * Setup pan handlers for mouse events on empty areas
     */
    setupPanHandlers() {
      if (!this.stage) return;
      
      const stageContainer = this.stage.container();
      if (!stageContainer) return;
      
      // Handle mouse down on stage (empty area)
      this.stage.on('mousedown', (e) => {
        // Only start panning if Shift key is pressed and clicking on empty area (not on components)
        if (e.evt.shiftKey && e.target === this.stage) {
          this.startPanning(e);
        }
      });
      
      // Handle mouse move for panning
      this.stage.on('mousemove', (e) => {
        if (this.isPanning && e.evt.shiftKey) {
          this.updatePanning(e);
        } else if (this.isPanning && !e.evt.shiftKey) {
          // Stop panning if Shift key is released during pan
          this.stopPanning();
        }
      });
      
      // Handle mouse up to stop panning
      this.stage.on('mouseup', () => {
        if (this.isPanning) {
          this.stopPanning();
        }
      });
      
      // Handle mouse leave to stop panning
      this.stage.on('mouseleave', () => {
        if (this.isPanning) {
          this.stopPanning();
        }
      });
      
      console.log(`🖱️ Pan handlers setup for ${this.viewportId} (Shift+drag mode)`);
    },
    
    /**
     * Start panning operation
     */
    startPanning(event) {
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;
      
      this.isPanning = true;
      this.lastPanPoint = pointer;
      
      // Update cursor to indicate panning
      const stageContainer = this.stage.container();
      if (stageContainer) {
        stageContainer.style.cursor = 'grabbing';
      }
      document.body.style.cursor = 'grabbing';
      
      console.log(`🖱️ Started panning ${this.viewportId}`);
    },
    
    /**
     * Update panning based on mouse movement
     */
    updatePanning(event) {
      if (!this.isPanning || !this.lastPanPoint) return;
      
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;
      
      // Calculate movement delta
      const dx = pointer.x - this.lastPanPoint.x;
      const dy = pointer.y - this.lastPanPoint.y;
      
      // Get current stage position
      const currentPos = this.stage.position();
      
      // Update stage position
      this.stage.position({
        x: currentPos.x + dx,
        y: currentPos.y + dy
      });
      
      // Update last pan point
      this.lastPanPoint = pointer;
      
      // Redraw stage
      this.stage.draw();
    },
    
    /**
     * Stop panning operation
     */
    stopPanning() {
      this.isPanning = false;
      this.lastPanPoint = null;
      
      // Reset cursor
      const stageContainer = this.stage.container();
      if (stageContainer) {
        stageContainer.style.cursor = 'default';
      }
      document.body.style.cursor = 'default';
      
      console.log(`🖱️ Stopped panning ${this.viewportId}`);
      
      // Emit pan event for external listeners
      this.$emit('pan-changed', {
        position: this.stage.position(),
        viewportId: this.viewportId
      });
    },
    
    /**
     * Reset pan to center position
     */
    resetPan() {
      if (!this.stage) return;
      
      this.stage.position({ x: 0, y: 0 });
      this.stage.draw();
      
      console.log(`🖱️ Pan reset for ${this.viewportId}`);
      
      this.$emit('pan-changed', {
        position: { x: 0, y: 0 },
        viewportId: this.viewportId
      });
    },
    
    /**
     * Add visual debugging dots at grid snap points (optional, for testing)
     */
    addGridSnapPoints(width, height, scale = null) {
      if (!Konva || !this.gridLayer) return;
      
      const currentScale = scale || this.getCurrentRenderScale(width, height);
      const snapPixelSize = currentScale * this.SNAP_GRID_UNIT; // Snap spacing in current scale
      const centerX = Math.round(width / 2);
      const centerY = Math.round(height / 2);
      const dotGroup = new Konva.Group();
      
      // Add small dots at snap points within a reasonable range
      const maxRange = Math.min(width, height) / 2;
      
      for (let x = centerX - maxRange; x <= centerX + maxRange; x += snapPixelSize) {
        for (let y = centerY - maxRange; y <= centerY + maxRange; y += snapPixelSize) {
          if (x >= 0 && x <= width && y >= 0 && y <= height) {
            const dot = new Konva.Circle({
              x: x,
              y: y,
              radius: 1,
              fill: '#ff9800',
              opacity: 0.3,
              listening: false
            });
            dotGroup.add(dot);
          }
        }
      }
      
      // Make dots only visible temporarily for debugging
      dotGroup.opacity(0.3);
      this.gridLayer.add(dotGroup);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        dotGroup.opacity(0);
        this.gridLayer.draw();
      }, 3000);
    },

    /**
     * Test grid alignment by showing temporary visual indicators
     * Call this method from the browser console for debugging
     */
    testGridAlignment() {
      if (!this.stage || !this.gridLayer) {
        console.log('❌ Stage or grid layer not ready');
        return;
      }
      
      const width = this.stage.width();
      const height = this.stage.height();
      const currentScale = this.getCurrentRenderScale(width, height);
      
      console.log(`🧪 Testing grid alignment for ${this.viewportId}:`);
      console.log(`   - Viewport size: ${width}x${height}px`);
      console.log(`   - Base pixels per unit: ${this.PIXELS_PER_UNIT}px`);
      console.log(`   - Current render scale: ${currentScale}px per unit`);
      console.log(`   - Snap grid unit: ${this.SNAP_GRID_UNIT} units`);
      console.log(`   - Snap pixel spacing: ${currentScale * this.SNAP_GRID_UNIT}px`);
      
      // Show snap points temporarily with current scale
      this.addGridSnapPoints(width, height, currentScale);
      this.gridLayer.draw();
      
      // Test coordinate conversion
      const centerX = width / 2;
      const centerY = height / 2;
      const testCoords = this.screenToWorldCoords(centerX, centerY, currentScale, centerX, centerY);
      console.log(`   - Center screen (${centerX}, ${centerY}) -> world (${testCoords.coord1}, ${testCoords.coord2})`);
      
      // Test snapping
      const testValue = 1.3;
      const snapped = this.snapToGrid(testValue);
      console.log(`   - Snap test: ${testValue} -> ${snapped}`);
      
      return {
        basePixelsPerUnit: this.PIXELS_PER_UNIT,
        currentRenderScale: currentScale,
        snapGridUnit: this.SNAP_GRID_UNIT,
        snapPixelSpacing: currentScale * this.SNAP_GRID_UNIT,
        baseScale: this.getBaseScale()
      };
    },
    
    /**
     * Get the current render scale being used for components
     * This ensures grid and components use the same scale
     */
    getCurrentRenderScale(stageWidth = null, stageHeight = null) {
      if (!stageWidth || !stageHeight) {
        if (this.stage) {
          stageWidth = this.stage.width();
          stageHeight = this.stage.height();
        } else {
          return this.getBaseScale(); // Fallback to base scale
        }
      }
      
      const sceneData = this.getSceneData();
      if (sceneData && sceneData.length > 0) {
        return this.calculateAdaptiveScale(sceneData, stageWidth, stageHeight);
      }
      
      return this.getBaseScale();
    },

    /**
     * Toggle visibility of spatial boundaries layer
     */
    toggleSpatialBoundaries(visible = null) {
      if (!this.spatialBoundariesLayer) {
        console.warn('⚠️ Spatial boundaries layer not available');
        return false;
      }
      
      const newVisibility = visible !== null ? visible : !this.spatialBoundariesLayer.visible();
      this.spatialBoundariesLayer.visible(newVisibility);
      this.spatialBoundariesLayer.draw();
      
      console.log(`🔳 Spatial boundaries ${newVisibility ? 'shown' : 'hidden'} for ${this.viewportId}`);
      return newVisibility;
    },
    
    /**
     * Clear all spatial boundaries
     */
    clearSpatialBoundaries() {
      if (!this.spatialBoundariesLayer) {
        return;
      }
      
      this.spatialBoundariesLayer.destroyChildren();
      this.spatialBoundariesLayer.draw();
      
      console.log(`🧹 Spatial boundaries cleared for ${this.viewportId}`);
    },

    /**
     * Setup zoom handlers for mouse wheel events
     */
    setupZoomHandlers() {
      if (!this.stage) return;
      
      const stageContainer = this.stage.container();
      if (!stageContainer) return;
      
      // Add wheel event listener for zooming
      stageContainer.addEventListener('wheel', this.handleWheelZoom);
      
      console.log(`🔍 Zoom handlers setup for ${this.viewportId}`);
    },
    
    /**
     * Handle mouse wheel zoom
     */
    handleWheelZoom(event) {
      event.preventDefault();
      
      if (!this.stage) return;
      
      // Get mouse position relative to stage
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;
      
      // Calculate zoom direction and amount
      const delta = event.deltaY;
      const zoomDirection = delta > 0 ? -1 : 1;
      const zoomAmount = this.ZOOM_SPEED * zoomDirection;
      
      // Calculate new zoom level
      const newZoomLevel = Math.max(
        this.MIN_ZOOM,
        Math.min(this.MAX_ZOOM, this.zoomLevel + zoomAmount)
      );
      
      // Only update if zoom level actually changed
      if (newZoomLevel !== this.zoomLevel) {
        this.applyZoom(newZoomLevel, pointer);
      }
    },
    
    /**
     * Apply zoom to the stage
     */
    applyZoom(newZoomLevel, zoomCenter = null) {
      if (!this.stage) return;
      
      const oldZoomLevel = this.zoomLevel;
      this.zoomLevel = newZoomLevel;
      
      // Calculate zoom center (default to stage center)
      const center = zoomCenter || {
        x: this.stage.width() / 2,
        y: this.stage.height() / 2
      };
      
      // Get current stage position
      const stagePos = this.stage.position();
      
      // Calculate new position to zoom towards the center point
      const newPos = {
        x: center.x - (center.x - stagePos.x) * (newZoomLevel / oldZoomLevel),
        y: center.y - (center.y - stagePos.y) * (newZoomLevel / oldZoomLevel)
      };
      
      // Apply new scale and position
      this.stage.scale({ x: newZoomLevel, y: newZoomLevel });
      this.stage.position(newPos);
      
      // Redraw all layers
      this.stage.draw();
      
      console.log(`🔍 Zoom applied: ${oldZoomLevel.toFixed(2)} → ${newZoomLevel.toFixed(2)}`);
      
      // Emit zoom event for external listeners
      this.$emit('zoom-changed', {
        zoomLevel: newZoomLevel,
        center: center,
        viewportId: this.viewportId
      });
    },
    
    /**
     * Reset zoom to default level
     */
    resetZoom() {
      if (!this.stage) return;
      
      this.zoomLevel = 1;
      this.stage.scale({ x: 1, y: 1 });
      this.stage.position({ x: 0, y: 0 });
      this.stage.draw();
      
      console.log(`🔍 Zoom reset for ${this.viewportId}`);
      
      this.$emit('zoom-changed', {
        zoomLevel: 1,
        center: { x: this.stage.width() / 2, y: this.stage.height() / 2 },
        viewportId: this.viewportId
      });
    },
    
    /**
     * Zoom to fit all components in the viewport
     */
    zoomToFit() {
      if (!this.stage || !this.centralPlant) return;
      
      const sceneData = this.getSceneData();
      if (!sceneData || !sceneData.length) return;
      
      // Calculate bounds of all components
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      sceneData.forEach(component => {
        const coords = this.getComponentCoords(component);
        if (coords) {
          const { coord1, coord2, width, height } = coords;
          minX = Math.min(minX, coord1 - width / 2);
          maxX = Math.max(maxX, coord1 + width / 2);
          minY = Math.min(minY, coord2 - height / 2);
          maxY = Math.max(maxY, coord2 + height / 2);
        }
      });
      
      // Calculate world bounds
      const worldWidth = maxX - minX;
      const worldHeight = maxY - minY;
      
      // Scale to fit 80% of the viewport
      const scaleX = (stageWidth * 0.8) / worldWidth;
      const scaleY = (stageHeight * 0.8) / worldHeight;
      
      return Math.min(scaleX, scaleY, this.getBaseScale());
    },
    
    /**
     * Test grid alignment with a test component
     */
    testGridAlignment() {
      if (!this.isReady) {
        console.log('❌ Viewport not ready for grid alignment test');
        return;
      }
      
      const testComponent = {
        name: 'Test Component',
        position: { x: 1, y: 1, z: 1 },
        adaptedBoundingBox: { x: 2, y: 2, z: 2 }
      };
      
      const coords = this.getComponentCoords(testComponent);
      console.log('🧪 Grid alignment test:', coords);
      
      const stageWidth = this.stage.width();
      const stageHeight = this.stage.height();
      const scale = this.getCurrentRenderScale(stageWidth, stageHeight);
      const worldOriginX = stageWidth / 2;
      const worldOriginY = stageHeight / 2;
      
      // Test coordinate conversion
      const screenCoords = this.worldCoordsToScreen(coords, scale, worldOriginX, worldOriginY);
      console.log('🧪 Screen coordinates:', screenCoords);
      
      // Test reverse conversion
      const backToWorld = this.screenToWorldCoords(screenCoords.x, screenCoords.y, scale, worldOriginX, worldOriginY);
      console.log('🧪 Back to world coordinates:', backToWorld);
      
      return {
        original: coords,
        screen: screenCoords,
        backToWorld: backToWorld,
        scale: scale
      };
    },
    
    /**
     * Helper method to convert world coordinates to screen coordinates
     */
    worldCoordsToScreen(coords, scale, worldOriginX, worldOriginY) {
      const { coord1, coord2, width, height } = coords;
      
      let screenX, screenY;
      
      if (this.viewportConfig.type === 'Front' || this.viewportConfig.type === 'Side') {
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY - (coord2 + height / 2) * scale;
      } else if (this.viewportConfig.type === 'Top') {
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY + (coord2 - height / 2) * scale;
      } else {
        screenX = worldOriginX + (coord1 - width / 2) * scale;
        screenY = worldOriginY - (coord2 + height / 2) * scale;
      }
      
      return { x: screenX, y: screenY };
    }
  }
}
</script>

<style scoped>
.viewport-2d {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
}

.viewport-2d-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.viewport-header {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  z-index: 10;
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 249, 250, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-content {
  text-align: center;
  color: #6c757d;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #dee2e6;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>