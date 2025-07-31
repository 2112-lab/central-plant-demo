<template>
  <div class="quad-viewport" style="width: 100%; height: 100%; position: relative; overflow: hidden;">
    <!-- Generic viewport containers -->
    <div 
      v-for="(position, index) in viewportPositions"
      :key="`viewport-${index}`"
      class="viewport-container"
      :style="getViewportStyle(position)"
      :data-viewport="position"
    >
      <div class="viewport-content">
        <div class="viewport-inner">
          <!-- Dynamic component rendering - no conditional logic -->
          <component
            :is="getViewportComponent(position)"
            :ref="`viewport_${position}`"
            :viewport-id="position"
            :viewport-config="getViewportConfig(position)"
            :central-plant="centralPlant"
            @object-selected-for-transform="$emit('object-selected-for-transform', $event)"
            @transform-update="$emit('transform-update', $event)"
            @transform-complete="$emit('transform-complete', $event)"
            @transform-mode-changed="$emit('transform-mode-changed', $event)"
            @component-added-via-drop="$emit('component-added-via-drop', $event)"
            @component-placement-canceled="$emit('component-placement-canceled', $event)"
            @scene-changed="$emit('scene-changed', $event)"
            @scene-data-updated="$emit('scene-data-updated', $event)"
            @viewport-ready="onViewportReady(position, $event)"
            @component-selected-in-2d="$emit('component-selected-in-2d', $event)"
            @component-position-changed="$emit('onTransformEnd', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SceneViewerEnhanced from './SceneViewerEnhanced.vue'
import Viewport2D from './Viewport2D.vue'

export default {
  name: 'QuadViewport',
  
  components: {
    SceneViewerEnhanced,
    Viewport2D
  },
  
  props: {
    centralPlant: {
      type: Object,
      required: true,
      default: null
    }
  },
  
  data() {
    return {
      // Viewport configuration with position mapping
      viewportConfig: {
        topLeft: { type: 'Top', renderMode: '2D' },
        topRight: { type: 'Perspective', renderMode: '3D' },
        bottomLeft: { type: 'Front', renderMode: '2D' },
        bottomRight: { type: 'Side', renderMode: '2D' }
      },
      
      // Viewport positions (static - never changes)
      viewportPositions: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      
      // Fullscreen state
      expandedViewport: null, // Which viewport is currently expanded
      
      // CSS positioning for viewport containers
      viewportStyles: {
        topLeft: { top: '0%', left: '0%', width: '50%', height: '50%' },
        topRight: { top: '0%', left: '50%', width: '50%', height: '50%' },
        bottomLeft: { top: '50%', left: '0%', width: '50%', height: '50%' },
        bottomRight: { top: '50%', left: '50%', width: '50%', height: '50%' }
      },
      
      // Unified view type options for all viewports
      viewTypeOptions: [
        { text: 'Front', value: 'Front' },
        { text: 'Top', value: 'Top' },
        { text: 'Side', value: 'Side' },
        { text: 'Perspective', value: 'Perspective' },
      ],
      
      // Viewport readiness tracking
      viewportStates: {
        topLeft: { ready: false, component: null },
        topRight: { ready: false, component: null },
        bottomLeft: { ready: false, component: null },
        bottomRight: { ready: false, component: null }
      },
      
      // Animation control
      skipTransitions: false, // Flag to skip animations during auto-load
      disableFullscreenAnimations: true // Set to true to disable all fullscreen animations
    }
  },
  
  watch: {
    // Watch for central plant changes and propagate to child components
    centralPlant: {
      handler(newValue) {
        if (newValue) {
          console.log('🔍 CentralPlant available, child components will handle initialization...');
        }
      },
      immediate: true
    }
  },
  
  mounted() {
    console.log('🔲 QuadViewport component mounted with generic viewport system');
    
    // Listen for scene data changes 
    this.$nuxt.$on('scene-data-updated', this.onSceneDataUpdated);
    this.$parent.$on('scene-changed', this.onSceneDataUpdated);
    this.$parent.$on('object-selected-for-transform', this.onObjectSelected);
    
    // Listen for viewport-specific changes from SceneConfigs component
    this.$nuxt.$on('viewport-fullscreen-toggle', this.onViewportFullscreenToggle);
    
    // Add keyboard event listener for ESC key to exit fullscreen
    document.addEventListener('keydown', this.handleKeydown);
    
    // Load and apply perspective fullscreen setting from localStorage
    this.loadAndApplyPerspectiveFullscreen();
  },
  
  beforeDestroy() {
    console.log('🔲 QuadViewport component destroying...');
    
    // Clean up event listeners
    this.$nuxt.$off('scene-data-updated', this.onSceneDataUpdated);
    this.$parent.$off('scene-changed', this.onSceneDataUpdated);
    this.$parent.$off('object-selected-for-transform', this.onObjectSelected);
    this.$nuxt.$off('viewport-fullscreen-toggle', this.onViewportFullscreenToggle);
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeydown);
  },
  
  methods: {
    /**
     * Get viewport configuration for a specific position
     */
    getViewportConfig(position) {
      return this.viewportConfig[position] || { type: 'Unknown', renderMode: '2D' };
    },
    
    /**
     * Get the component to render for a viewport position
     */
    getViewportComponent(position) {
      const config = this.getViewportConfig(position);
      return config.renderMode === '3D' ? 'SceneViewerEnhanced' : 'Viewport2D';
    },
    
    /**
     * Get CSS style object for a viewport based on its position
     */
    getViewportStyle(position) {
      // If this viewport is expanded, make it fullscreen
      if (this.expandedViewport === position) {
        return {
          position: 'absolute',
          top: '0%',
          left: '0%',
          width: '100%',
          height: '100%',
          zIndex: 1000
        };
      }
      
      // Normal viewport positioning
      const style = this.viewportStyles[position];
      return {
        position: 'absolute',
        top: style.top,
        left: style.left,
        width: style.width,
        height: style.height
      };
    },

    /**
     * Toggle viewport expansion (fullscreen mode)
     */
    toggleViewportExpansion(position, disableTransition = false) {
      console.log(`🔲 Toggling viewport expansion for: ${position}`);
      
      // Always disable transitions for all viewports or when explicitly requested
      if (disableTransition) {
        this.addNoTransitionClass();
      }
      
      if (this.expandedViewport === position) {
        // Exit fullscreen
        this.expandedViewport = null;
        console.log('🔲 Exited fullscreen mode');
        this.$emit('viewport-fullscreen-exited', { viewport: position });
        
        // If this was the perspective viewport, save state to localStorage
        const perspectivePosition = this.get3DViewport();
        if (position === perspectivePosition) {
          this.savePerspectiveFullscreenToStorage(false);
        }
      } else {
        // Enter fullscreen
        this.expandedViewport = position;
        console.log(`🔲 Entered fullscreen mode for: ${position}`);
        this.$emit('viewport-fullscreen-entered', { viewport: position });
        
        // If this is the perspective viewport, save state to localStorage
        const perspectivePosition = this.get3DViewport();
        if (position === perspectivePosition) {
          this.savePerspectiveFullscreenToStorage(true);
        }
      }
      
      // Re-enable transitions after a short delay when disabled
      if (disableTransition) {
        setTimeout(() => {
          this.removeNoTransitionClass();
        }, 50);
      }
    },

    /**
     * Handle keyboard events (ESC to exit fullscreen)
     */
    handleKeydown(event) {
      if (event.key === 'Escape' && this.expandedViewport) {
        console.log('🔲 ESC pressed - exiting fullscreen mode');
        this.toggleViewportExpansion(this.expandedViewport, this.disableFullscreenAnimations);
      }
    },
    
    /**
     * Handle viewport readiness from child components
     */
    onViewportReady(position, readyState) {
      console.log(`✅ Viewport ${position} is ready:`, readyState);
      this.viewportStates[position].ready = readyState.ready;
      this.viewportStates[position].component = readyState.component;
      
      // Check if all viewports are ready
      const allReady = Object.values(this.viewportStates).every(state => state.ready);
      if (allReady) {
        console.log('🎯 All viewports are ready');
        this.$emit('all-viewports-ready');
      }
    },
    
    /**
     * Refresh all 2D viewports except the specified one
     * @param {string} excludeViewport - The viewport position to exclude from refresh
     */
    refreshOther2DViewports(excludeViewport = null) {
      console.log(`🔄 Refreshing all 2D viewports except: ${excludeViewport}`);
      
      let refreshedCount = 0;
      
      this.viewportPositions.forEach(position => {
        // Skip the viewport that triggered the change
        if (position === excludeViewport) {
          console.log(`⏭️ Skipping refresh for triggering viewport: ${position}`);
          return;
        }
        
        const config = this.getViewportConfig(position);
        if (config.renderMode === '2D') {
          const viewport = this.getViewportRef(position);
          if (viewport && viewport.refreshDisplay) {
            console.log(`🔄 Refreshing 2D viewport: ${position} (${config.type})`);
            viewport.refreshDisplay();
            refreshedCount++;
          } else {
            console.warn(`⚠️ Viewport ${position} not ready or missing refreshDisplay method`);
          }
        }
      });
      
      console.log(`✅ Refreshed ${refreshedCount} other 2D viewports`);
    },

    /**
     * Refresh all 2D viewports (including the specified one)
     * @param {string} includeViewport - Optional specific viewport to ensure is included
     */
    refreshAll2DViewports(includeViewport = null) {
      console.log(`🔄 Refreshing all 2D viewports${includeViewport ? ` (ensuring ${includeViewport} is included)` : ''}`);
      
      let refreshedCount = 0;
      
      this.viewportPositions.forEach(position => {
        const config = this.getViewportConfig(position);
        if (config.renderMode === '2D') {
          const viewport = this.getViewportRef(position);
          if (viewport && viewport.refreshDisplay) {
            console.log(`🔄 Refreshing 2D viewport: ${position} (${config.type})`);
            viewport.refreshDisplay();
            refreshedCount++;
          } else {
            console.warn(`⚠️ Viewport ${position} not ready or missing refreshDisplay method`);
          }
        }
      });
      
      console.log(`✅ Refreshed ${refreshedCount} 2D viewports total`);
    },

    /**
     * Handle scene data updates from child components
     */
    onSceneDataUpdated() {
      console.log('🔄 Scene data updated, propagating to 2D viewports...');
      // Use the unified method to refresh all 2D viewports
      this.refreshAll2DViewports();
    },
    
    /**
     * Handle object selection changes
     */
    onObjectSelected(selectedObject) {
      console.log('🎯 Object selection changed, propagating to viewports...');
      // Notify all viewports about selection change
      this.viewportPositions.forEach(position => {
        const viewport = this.getViewportRef(position);
        if (viewport && viewport.onObjectSelected) {
          viewport.onObjectSelected(selectedObject);
        }
      });
    },
    
    /**
     * Get viewport reference by position
     */
    getViewportRef(position) {
      return this.$refs[`viewport_${position}`]?.[0];
    },
    
    /**
     * Find which viewport currently has the specified view type
     */
    findViewportByType(viewType) {
      for (const [position, config] of Object.entries(this.viewportConfig)) {
        if (config.type === viewType) {
          return position;
        }
      }
      return null;
    },
    
    /**
     * Handle view type changes with generic system
     */
    onViewTypeChanged(viewport, newViewType) {
      console.log(`🔄 ${viewport} view type changed to:`, newViewType);
      
      // Check if the new view type already exists in another viewport
      const existingViewport = this.findViewportByType(newViewType);
      
      if (existingViewport && existingViewport !== viewport) {
        // Option 1: Swap positions (physically move containers)
        this.swapViewportPositions(viewport, existingViewport);
        
        // Option 2: If you prefer to swap content instead, use this:
        // this.swapViewportConfigs(viewport, existingViewport);
        
        // Emit swap event
        this.$emit('viewports-swapped', {
          viewport1: viewport,
          viewport2: existingViewport,
          newViewType: newViewType,
          swapType: 'position' // or 'content' if using swapViewportConfigs
        });
      } else {
        // Simply change the view type without swapping
        const newRenderMode = this.getRenderModeForViewType(newViewType);
        
        this.$set(this.viewportConfig, viewport, {
          type: newViewType,
          renderMode: newRenderMode
        });
        
        // Emit view change event
        this.$emit('viewport-view-changed', {
          viewport: viewport,
          viewType: newViewType,
          renderMode: newRenderMode
        });
      }
    },
    
    /**
     * Determine render mode based on view type
     */
    getRenderModeForViewType(viewType) {
      // Perspective view uses 3D rendering, others use 2D
      return viewType === 'Perspective' ? '3D' : '2D';
    },
    
    /**
     * Swap viewport configurations (simple content swap, no re-initialization)
     */
    swapViewportConfigs(viewport1, viewport2) {
      console.log(`🔄 Swapping viewport content: ${viewport1} ↔ ${viewport2}`);
      
      // Only swap the view type configurations, NOT the CSS positions
      // The DOM containers stay in place, but their content changes
      const tempConfig = { ...this.viewportConfig[viewport1] };
      this.$set(this.viewportConfig, viewport1, { ...this.viewportConfig[viewport2] });
      this.$set(this.viewportConfig, viewport2, tempConfig);
      
      console.log(`✅ Viewport content swapped - ${viewport1} now shows ${this.viewportConfig[viewport1].type}, ${viewport2} now shows ${this.viewportConfig[viewport2].type}`);
    },

    /**
     * Swap viewport positions (moves containers without reinitialization)
     */
    swapViewportPositions(viewport1, viewport2) {
      console.log(`🔄 Swapping viewport positions: ${viewport1} ↔ ${viewport2}`);
      
      // Add transition classes for smooth animation
      this.addSwapTransition(viewport1, viewport2);
      
      // Swap the CSS positions in the viewportStyles
      const tempStyle = { ...this.viewportStyles[viewport1] };
      this.$set(this.viewportStyles, viewport1, { ...this.viewportStyles[viewport2] });
      this.$set(this.viewportStyles, viewport2, tempStyle);
      
      // Remove transition classes after animation completes
      setTimeout(() => {
        this.removeSwapTransition(viewport1, viewport2);
      }, 300); // Match CSS transition duration
      
      console.log(`✅ Viewport positions swapped - containers physically moved`);
    },

    /**
     * Combined swap method that repositions containers AND swaps content
     */
    swapViewportsCompletely(viewport1, viewport2) {
      console.log(`🔄 Complete viewport swap: ${viewport1} ↔ ${viewport2}`);
      
      // Method 1: Swap positions (moves containers physically)
      this.swapViewportPositions(viewport1, viewport2);
      
      // Method 2: If you want to swap content instead, use this:
      // this.swapViewportConfigs(viewport1, viewport2);
    },

    /**
     * Add transition classes for smooth swapping animation
     */
    addSwapTransition(viewport1, viewport2) {
      this.$nextTick(() => {
        const container1 = this.$el.querySelector(`[data-viewport="${viewport1}"]`);
        const container2 = this.$el.querySelector(`[data-viewport="${viewport2}"]`);
        
        if (container1) container1.classList.add('swapping');
        if (container2) container2.classList.add('swapping');
      });
    },

    /**
     * Remove transition classes after swap animation
     */
    removeSwapTransition(viewport1, viewport2) {
      const container1 = this.$el.querySelector(`[data-viewport="${viewport1}"]`);
      const container2 = this.$el.querySelector(`[data-viewport="${viewport2}"]`);
      
      if (container1) container1.classList.remove('swapping');
      if (container2) container2.classList.remove('swapping');
    },
    
    /**
     * Get reference to the 3D scene viewer (dynamically finds it)
     */
    getSceneViewer() {
      // Find which viewport has 3D rendering and return its ref
      for (const [position, config] of Object.entries(this.viewportConfig)) {
        if (config.renderMode === '3D') {
          return this.getViewportRef(position);
        }
      }
      return null;
    },

    /**
     * Swap a 2D viewport with a 3D viewport (specific use case)
     */
    swap2DWith3D(targetViewportPosition = null) {
      // Find the 3D viewport
      const viewport3D = Object.keys(this.viewportConfig).find(position => 
        this.viewportConfig[position].renderMode === '3D'
      );
      
      if (!viewport3D) {
        console.warn('No 3D viewport found to swap with');
        return false;
      }
      
      // If no target specified, find the first 2D viewport
      let viewport2D = targetViewportPosition;
      if (!viewport2D) {
        viewport2D = Object.keys(this.viewportConfig).find(position => 
          this.viewportConfig[position].renderMode === '2D'
        );
      }
      
      if (!viewport2D || this.viewportConfig[viewport2D].renderMode !== '2D') {
        console.warn('No valid 2D viewport found to swap with');
        return false;
      }
      
      console.log(`🔄 Swapping 2D viewport (${viewport2D}) with 3D viewport (${viewport3D})`);
      
      // Perform the position swap
      this.swapViewportPositions(viewport2D, viewport3D);
      
      // Emit specific event for 2D/3D swap
      this.$emit('2d-3d-viewports-swapped', {
        viewport2D: viewport2D,
        viewport3D: viewport3D,
        newPosition2D: viewport3D,
        newPosition3D: viewport2D
      });
      
      return true;
    },

    /**
     * Get all 2D viewport positions
     */
    get2DViewports() {
      return Object.keys(this.viewportConfig).filter(position => 
        this.viewportConfig[position].renderMode === '2D'
      );
    },

    /**
     * Get the 3D viewport position
     */
    get3DViewport() {
      return Object.keys(this.viewportConfig).find(position => 
        this.viewportConfig[position].renderMode === '3D'
      );
    },

    /**
     * Handle viewport fullscreen toggle from SceneConfigs component
     */
    onViewportFullscreenToggle(settings) {
      console.log('🔲 Received viewport fullscreen toggle:', settings);
      
      // Handle perspective fullscreen toggle
      if (settings.hasOwnProperty('perspectiveFullscreen')) {
        this.togglePerspectiveFullscreen(settings.perspectiveFullscreen);
      }
    },

    /**
     * Toggle fullscreen mode for the Perspective 3D viewport specifically
     */
    togglePerspectiveFullscreen(shouldBeFullscreen = null, disableTransition = false) {
      console.log(`🔲 Toggling Perspective viewport fullscreen...`);
      
      // Find the perspective viewport position
      const perspectivePosition = this.get3DViewport();
      
      if (!perspectivePosition) {
        console.warn('⚠️ No Perspective 3D viewport found');
        return false;
      }
      
      const isCurrentlyFullscreen = this.expandedViewport === perspectivePosition;
      
      // If shouldBeFullscreen is specified, use it; otherwise toggle
      const targetFullscreen = shouldBeFullscreen !== null ? shouldBeFullscreen : !isCurrentlyFullscreen;
      
      if (targetFullscreen && !isCurrentlyFullscreen) {
        // Enter fullscreen with optional transition disabling
        if (disableTransition) {
          this.addNoTransitionClass();
        }
        
        this.expandedViewport = perspectivePosition;
        console.log(`🔲 Perspective viewport (${perspectivePosition}) entered fullscreen mode`);
        this.$emit('perspective-fullscreen-entered', { viewport: perspectivePosition });
        
        // Save fullscreen state to localStorage
        this.savePerspectiveFullscreenToStorage(true);
        
        // Re-enable transitions after a short delay if they were disabled
        if (disableTransition) {
          setTimeout(() => {
            this.removeNoTransitionClass();
          }, 50);
        }
        
        return true;
      } else if (!targetFullscreen && isCurrentlyFullscreen) {
        // Exit fullscreen with optional transition disabling
        if (disableTransition) {
          this.addNoTransitionClass();
        }
        
        this.expandedViewport = null;
        console.log(`🔲 Perspective viewport exited fullscreen mode`);
        this.$emit('perspective-fullscreen-exited', { viewport: perspectivePosition });
        
        // Save fullscreen state to localStorage
        this.savePerspectiveFullscreenToStorage(false);
        
        // Re-enable transitions after a short delay if they were disabled
        if (disableTransition) {
          setTimeout(() => {
            this.removeNoTransitionClass();
          }, 50);
        }
        
        return true;
      }
      
      console.log(`🔲 Perspective viewport fullscreen state unchanged (${isCurrentlyFullscreen ? 'fullscreen' : 'normal'})`);
      return false;
    },

    /**
     * Save perspective fullscreen state to localStorage
     */
    savePerspectiveFullscreenToStorage(isFullscreen) {
      try {
        if (process.client) {
          // Get existing settings or create new object
          let savedSettings = {};
          const existingSettings = localStorage.getItem('sceneConfigurations');
          
          if (existingSettings) {
            savedSettings = JSON.parse(existingSettings);
          }
          
          // Update the perspectiveFullscreen setting
          savedSettings.perspectiveFullscreen = isFullscreen;
          savedSettings.lastUpdated = new Date().toISOString();
          
          // Save back to localStorage
          localStorage.setItem('sceneConfigurations', JSON.stringify(savedSettings));
          console.log(`💾 Perspective fullscreen state saved to localStorage: ${isFullscreen}`);
        }
      } catch (error) {
        console.error('❌ Error saving perspective fullscreen state to localStorage:', error);
      }
    },

    /**
     * Check if the Perspective 3D viewport is currently in fullscreen mode
     */
    isPerspectiveFullscreen() {
      const perspectivePosition = this.get3DViewport();
      return perspectivePosition && this.expandedViewport === perspectivePosition;
    },

    /**
     * Load perspective fullscreen setting from localStorage and apply it
     */
    loadAndApplyPerspectiveFullscreen() {
      try {
        // Check if running in browser environment
        if (process.client) {
          console.log('🔲 Loading perspective fullscreen setting from localStorage...');
          
          const savedSettings = localStorage.getItem('sceneConfigurations');
          let shouldApplyFullscreen = true; // Default to fullscreen
          
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            console.log('📋 Found saved settings:', parsed);
            
            // Use saved setting if it exists, otherwise default to true
            shouldApplyFullscreen = parsed.hasOwnProperty('perspectiveFullscreen') 
              ? parsed.perspectiveFullscreen 
              : true;
          } else {
            console.log('⚙️ No saved settings found in localStorage, using default fullscreen view');
          }
          
          if (shouldApplyFullscreen) {
            console.log('🔲 Auto-applying perspective fullscreen...');
            
            // Skip transitions for auto-load
            this.skipTransitions = true;
            
            // Use nextTick to ensure component is fully mounted before applying fullscreen
            this.$nextTick(() => {
              // Add no-transition class to prevent animation
              this.addNoTransitionClass();
              
              // Apply fullscreen immediately
              this.togglePerspectiveFullscreen(true);
              
              // Re-enable transitions after a short delay
              setTimeout(() => {
                this.removeNoTransitionClass();
                this.skipTransitions = false;
                console.log('✅ Perspective fullscreen applied (no animation)');
              }, 50);
            });
          } else {
            console.log('🔲 Perspective fullscreen disabled, keeping normal view');
          }
        }
      } catch (error) {
        console.error('❌ Error loading perspective fullscreen setting from localStorage:', error);
      }
    },

    /**
     * Add no-transition class to skip animations
     */
    addNoTransitionClass() {
      if (this.$el) {
        this.$el.classList.add('no-transitions');
      }
    },

    /**
     * Remove no-transition class to re-enable animations
     */
    removeNoTransitionClass() {
      if (this.$el) {
        this.$el.classList.remove('no-transitions');
      }
    },
  }
}
</script>

<style scoped>
.quad-viewport {
  background: #ffffff;
}

.viewport-container {
  border: 2px solid #e0e0e0;
  background: #ffffff;
  box-sizing: border-box;
}

.viewport-content {
  width: 100%;
  height: 100%;
  position: relative;
  box-sizing: border-box;
}

.viewport-inner {
  width: 100%;
  height: 100%;
  position: relative;
}

.konva-container {
  background: #f8f9fa;
  width: 100%;
  height: 100%;
}

.threejs-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.viewport-menu {
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 10;
}

.viewport-menu-group {
  display: flex;
  align-items: center;
}

.viewport-menu-text-btn {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(4px);
  min-width: 80px !important;
  font-size: 12px !important;
  text-transform: none !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-right: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 0 0 0 0 !important;
  margin-right: 0 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.viewport-menu-text-btn:hover {
  background: rgba(240, 248, 255, 0.95) !important;
  border-color: rgba(25, 118, 210, 0.3) !important;
}

.viewport-menu-dropdown-btn {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(4px);
  min-width: 28px !important;
  width: 28px !important;
  padding: 0 4px !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-left: none !important;
  border-radius: 0 0 4px 0 !important;
  margin-left: 0 !important;
}

/* Smooth transitions for viewport animations */
.viewport-container {
  will-change: transform, top, left, width, height, z-index;
  transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Expanded viewport styles */
.viewport-container.viewport-expanded {
  z-index: 1000 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 2px solid #1976d2;
}

/* Hide other viewports when one is expanded */
.viewport-container.viewport-hidden {
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

/* Visual feedback during swapping */
.viewport-container.swapping {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(0.98);
  z-index: 100;
}

/* Disable transitions during auto-load */
.quad-viewport.no-transitions .viewport-container {
  transition: none !important;
}

.quad-viewport.no-transitions .viewport-container * {
  transition: none !important;
}

/* Ensure smooth position transitions */
.viewport-container {
  transition-property: top, left, width, height, transform, box-shadow, opacity, z-index;
  transition-duration: 0.4s;
  transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* No transitions class (for auto-loading states) */
.no-transitions {
  transition: none !important;
  animation: none !important;
}
</style>
