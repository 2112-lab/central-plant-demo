<template>  
<!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">      
    <!-- Top navigation bar -->
    <v-app-bar 
      :height="navbarHeight"
      color="#ffffff" 
      light
      style="font-family:'Amazon Ember', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; position:relative; z-index:1000; border-bottom: 1px solid #e0e0e0;"
    >
      <!-- App title with link to home -->
      <v-toolbar-title style="width:330px; border:0px solid green; margin-top:15px">
        <router-link to="/" style="text-decoration: none; color: inherit;">
          <span class="rubik-mono-one-regular">CP3D Sandbox</span>
        </router-link>
      </v-toolbar-title>      
      <!-- Navigation mode buttons (Xeto, Component, Wiring, etc.) -->
      <v-row no-gutters justify="center" style="position:absolute; top:20px; right:25%; width:calc(75% - 250px)">
        <v-menu
          v-for="[key] in Object.entries(navBtns)" 
          :key="key"
          open-on-hover
          close-delay="200"
          offset-y
          :disabled="navBtns[key].contextBtns.length === 0"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn 
              outlined 
              class="mx-1" 
              :style="sandboxMode === key ? 'background:#e3f2fd; color:#1976d2' : 'border:1px solid #666; color:#666'"
              @click="sandboxMode = key"
              v-bind="attrs"
              v-on="on"
            >
              {{ key }}
              <v-icon 
                v-if="navBtns[key].contextBtns.length > 0" 
                small 
                class="ml-1"
              >
                mdi-chevron-down
              </v-icon>
            </v-btn>
          </template>
          
          <v-list v-if="navBtns[key].contextBtns.length > 0" dense>
            <v-list-item
              v-for="(contextValue, contextKey) in navBtns[key].contextBtns"
              :key="contextKey"
              @click="handleContextButtonClick(contextValue); sandboxMode = key"
              :class="getContextListItemClass(contextValue, key)"
            >
              <v-list-item-content>
                <v-list-item-title>{{ contextValue }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-row>        

    </v-app-bar>    
    <!-- Main content area - flexible layout with primary viewport and drawer -->    
    <div style="display: flex; height: calc(100vh - 64px - 15px); width: 100%; overflow: hidden;">      
      <!-- Left side - Primary viewport area (takes remaining space) -->
      <div 
        :style="getViewportStyle()"
      >          
        
        <!-- Quad viewport mode (3x 2D + 1x 3D) -->
        <div
          v-if="quadMode"
          style="height: 100%; width: 100%;"
        >
          <QuadViewport
            ref="quadViewport"
            :centralPlant="centralPlant"
            @object-selected-for-transform="onObjectSelectedForTransform"
            @transform-update="onTransformUpdate"
            @transform-complete="onTransformComplete"
            @transform-mode-changed="onTransformModeChanged"
            @component-added-via-drop="onComponentAddedViaDrop"
            @component-placement-canceled="onComponentPlacementCanceled"
            @scene-changed="updateSceneObjects"
            @scene-data-updated="onSceneDataUpdated"
            @component-selected-in-2d="onComponentSelectedIn2D"
            @2d-view-changed="on2DViewChanged"
            @3d-view-changed="on3DViewChanged"
            @onTransformEnd="onQuadViewportTransformEnd"
          />
        </div>
                 
      </div>      
        
    </div>
    
    <!-- Import Scene File Dialog -->
    <v-dialog 
      v-model="showFileImport" 
      max-width="500px"
      persistent
    >
      <v-card>
        <v-card-title class="text-h6">
          Import Scene File
          <v-spacer></v-spacer>
          <v-btn 
            icon 
            @click="showFileImport = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
          <v-card-text>
          <v-file-input
            v-model="selectedFile"
            label="Select JSON file"
            accept=".json"
            prepend-icon="mdi-file-document-outline"
            @change="handleJsonFileImport"
            outlined
            dense
            clearable
            :error-messages="fileErrorMessage"
            show-size
            style="margin-bottom: 0;"
          />
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn 
            text 
            @click="showFileImport = false"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            :disabled="!selectedFile"
            @click="processSelectedFile"
          >
            Import
          </v-btn>        
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Notification Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      top
      right
    >
      {{ snackbar.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          text
          v-bind="attrs"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
      
  </v-app>
</template>
  
<script>
import { CentralPlant } from '@2112-lab/central-plant'

import SceneViewerWrapper from '../components/SceneViewerWrapper.vue'

export default {
  components: {
    SceneViewerWrapper
  },
  data() {
    return {
      // Component library containing 3D models and metadata
      library: {},
      
      // Scene managers collection - single point of access for all scene utilities
      centralPlant: null,
      
      // UI layout dimensions
      navbarHeight: 64,       // Height of the top navigation bar
      toolbarHeight: 200,     // Height of the bottom toolbar area
      drawerWidth: 400,       // Width of the right drawer panel

      // Menu items for the top-right menu
      menuItems: [
        { title: 'CP Mock Data', path: 'https://drive.google.com/drive/u/0/folders/1-fxmcfxwes2XSAbhlg_nbAj3cxcmB8dc', external: true },
      ],
      
      // Navigation button configuration for different modes
      navBtns: {
        Assembly: {
          contextBtns: ["New", "Load", "Save", "Import", "Export"],
        },
        Scene: {
          contextBtns: ["Editor", "Configs", "Agent"],
        },
        Test: {
          contextBtns: [],
        }
      },
      
      // Scene context state
      sceneContext: "Editor", // Default to Editor context
      
      // Viewport layout state
      quadMode: true,         // Whether quad mode is enabled (default to true)

      selectedLibraryItem: 'Fan',  // Currently selected component type
      libraryJsonData: '',         // JSON representation of the selected library item
      sandboxMode: "Assembly",         // Current active mode (Xeto, Component, Wiring, etc.)
      mockXetoIndexSelected: 0,    // Index of selected mock Xeto data
      mode: 'none',                // Current editing mode
      ahuItem: {},                 // Current AHU item for testing
      sceneObjects: [],            // Processed scene objects for the hierarchy view
      sceneHelper: null,           // Reference to scene viewer for Advanced tree mode
      
      // Component management
      loadedComponents: [],        // List of components loaded in the scene
      selectedComponents: [],      // Currently selected components
      selectedComponent: null,     // Primary selected component
      loadedEdges: [],             // List of edges (connections) between components
      selectedEdge: null,          // Currently selected edge
      translateValue: 0,           // Y-translation value for component positioning
      componentSizeFactor: 1,      // Scaling factor for component size

      isAutoLoad: true,            // Whether to automatically load changes to Xeto data

      selectedFile: null,          // Currently selected file for import
      showFileImport: false,       // Whether to show the file import UI
      fileErrorMessage: null,      // Error message for file validation

      selectedTransformObject: null,  // Currently selected object for transformation
      currentTransformData: null,     // Current transform data (position, rotation, scale)
      transformMode: 'translate',     // Current transform mode (translate, rotate, scale)
      
      // Scene connections data
      currentSceneConnections: [],    // Current scene connections data for the connections tab
      pathfindingStatus: 'idle',      // Track pathfinding update status for UI feedback
      
      // Preloading states      
      isPreloadingModels: false,
      preloadingProgress: null,
      
      // Component dictionary for mapping libraryId to component data
      componentDictionary: null,
      
      // Snackbar notification state
      snackbar: {
        show: false,
        text: '',
        color: 'info',
        timeout: 3000
      },
    };
  },
  
  // Computed properties for menu items
  computed: {
    internalMenuItems() {
      return this.menuItems.filter(item => !item.external);
    },
    externalMenuItems() {
      return this.menuItems.filter(item => item.external);
    }  
  },
  
  // Watch for changes to reactive data properties
  watch: {
    // Reset scene context to Editor when entering Scene mode
    sandboxMode(newMode, oldMode) {
      if (newMode === 'Scene' && oldMode !== 'Scene') {
        console.log('🎛️ Entering Scene mode, setting context to Editor');
        this.sceneContext = 'Editor';
      }
    }
  },
    // Lifecycle hook - called after the instance has been mounted
  created() {
    // Initialize the CentralPlant early - before component mounting
    this.initializeCentralPlant();
  },
  
  async mounted() {
    if(process.env.LOCAL_DEV) {
      // this.sandboxMode = 'Test';
    }
    
    // Load quad mode state from localStorage first
    this.loadQuadModeFromStorage();
    
    // Start model preloading immediately when the page loads
    this.initializeModelPreloading();
    
    // Initialize connections data with sample data
    this.initializeConnectionsData();
    
    // Set up interval to update scene objects for the tree view
    setTimeout(() => {
      this.updateSceneObjects();
    }, 1000);
    
    // Set up scene helper reference after component is mounted
    this.$nextTick(() => {
      this.setupSceneHelper();
    });
    
    // Listen for scene configuration changes
    this.$nuxt.$on('scene-config-changed', this.onSceneConfigChanged);

    setTimeout(() => {
      console.log("mounted centralPlant:", this.centralPlant);
    }, 4000)
  },
  
  // Lifecycle hook - called before the instance is destroyed
  beforeDestroy() {
    
    // Clean up the CentralPlant
    if (this.centralPlant) {
      try {
        this.centralPlant.dispose()
        this.centralPlant = null
        console.log('🧹 CentralPlant disposed from index.vue')
      } catch (error) {
        console.error('Error disposing CentralPlant:', error)
      }
    }
    
    // Remove event listeners
    this.$nuxt.$off('scene-config-changed', this.onSceneConfigChanged);
  },
    
  // Methods section - contains all component methods
  methods: {

    onQuadViewportTransformEnd(component) {
      console.log('🔄 Transform end event received from QuadViewport:', component);
      
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.onTransformEnd) {
        try {
          // Forward the transform end event to the SceneViewerWrapper component
          sceneViewer.onTransformEnd(component);
          console.log('✅ Transform end event forwarded to SceneViewerWrapper');
        } catch (error) {
          console.error('❌ Error forwarding transform end event to SceneViewerWrapper:', error);
        }
      } else {
        console.warn('⚠️ SceneViewerWrapper not available or onTransformEnd method not found');
      }
    },
    // Computed style for the main viewport
    getViewportStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minWidth: '0',
        overflow: 'hidden'
      }
    },
    // Computed style for the drawer
    getDrawerStyle() {
      return {
        flex: `0 0 ${this.drawerWidth}px`,
        borderLeft: '1px solid #e0e0e0',
        background: '#ffffff',
        zIndex: 5,
        overflow: 'hidden'
      }
    },      
    // Handle context button clicks
    handleContextButtonClick(contextKey) {
      console.log('🔘 Context button clicked:', contextKey, 'in mode:', this.sandboxMode);
      
      if (this.sandboxMode === 'Assembly') {
        switch(contextKey) {
          case 'Import':
            console.log('📥 Handling Import...');
            this.showFileImportDialog();
            break;
          case 'New':
            console.log('🆕 Handling New...');
            this.createNewScene();
            break;
          case 'Load':
            console.log('📂 Handling Load...');
            // Handle load functionality
            break;          case 'Save':
            console.log('💾 Handling Save...');
            // Handle save functionality  
            break;
          case 'Export':
            console.log('📤 Handling Export...');
            this.exportScene();
            break;
          default:
            console.log('❓ Unknown context button:', contextKey);
        }
      } else if (this.sandboxMode === 'Scene') {
        // Handle Scene context switches
        switch(contextKey) {
          case 'Editor':
            console.log('🎛️ Switching to Editor context...');
            this.sceneContext = 'Editor';
            break;
          case 'Configs':
            console.log('⚙️ Switching to Configs context...');
            this.sceneContext = 'Configs';
            break;
          case 'Agent':
            console.log('🤖 Switching to Agent context...');
            this.sceneContext = 'Agent';
            break;
          default:
            console.log('❓ Unknown Scene context button:', contextKey);
        }
      } else {
        console.log('⚠️ Context buttons not implemented for mode:', this.sandboxMode);
      }
    },
    
    // Show the file import dialog
    showFileImportDialog() {
      this.selectedFile = null;
      this.fileErrorMessage = null;
      this.showFileImport = true;
    },      
    // Handle JSON file import
    async handleJsonFileImport(file) {
      this.fileErrorMessage = null;
      
      if (!file) {
        this.selectedFile = null;
        return;
      }
      
      // Just validate the file when selected, don't process it yet
      try {
        const text = await this.readFileAsText(file);
        const jsonData = JSON.parse(text);
        
        // Validate that it's a central-plant-compatible JSON
        if (!this.validateCentralPlantJson(jsonData)) {
          this.fileErrorMessage = 'Invalid central-plant JSON format. Please select a valid scene file.';
        }
      } catch (error) {
        console.error('Error reading/parsing JSON file:', error);
        this.fileErrorMessage = 'Error reading or parsing the JSON file. Please check the file format.';
      }
    },
    
    // Process the selected file (called when Import button is clicked)
    async processSelectedFile() {
      if (!this.selectedFile) return;
      
      try {
        const text = await this.readFileAsText(this.selectedFile);
        const jsonData = JSON.parse(text);
          // Validate that it's a central-plant-compatible JSON
        if (this.validateCentralPlantJson(jsonData)) {
          // Load connections data if present
          if (jsonData.connections && Array.isArray(jsonData.connections)) {
            this.currentSceneConnections = [...jsonData.connections];
            console.log('✅ Loaded', this.currentSceneConnections.length, 'connections from imported scene');
          } else {
            this.currentSceneConnections = [];
            console.log('⚠️ No connections data found in imported scene');
          }
          
          // Store complete imported scene data directly in centralPlant
          if (this.centralPlant) {
            this.centralPlant.setImportedSceneData(jsonData);
            console.log('✅ Complete scene data stored in centralPlant');
            
            // Update import metadata with file information
            this.centralPlant.updateMetadataCategory('lastImport', {
              importInfo: {
                ...this.centralPlant.getMetadata('lastImport')?.importInfo,
                originalFileName: this.selectedFile.name,
                fileSize: this.selectedFile.size,
                importTimestamp: new Date().toISOString()
              }
            });
            
            // Store additional import metadata for backward compatibility
            this.centralPlant.setMetadata('fileImportHistory', [
              ...(this.centralPlant.getMetadata('fileImportHistory') || []),
              {
                fileName: this.selectedFile.name,
                fileSize: this.selectedFile.size,
                timestamp: new Date().toISOString(),
                connectionsCount: jsonData.connections?.length || 0,
                componentsCount: jsonData.scene?.object?.children?.length || 0,
                importMethod: 'file-upload'
              }
            ]);
          }
          
          // Emit event to SceneViewer to reload with new data
          this.$nuxt.$emit('loadNewScene', jsonData);
          
          // Hide the import dialog on success
          this.showFileImport = false;
          this.selectedFile = null;
          this.fileErrorMessage = null;
          
          // Show success message
          this.showSnackbar('Scene and connections loaded successfully!', 'success');
          
          // Show success message (optional)
          this.$nextTick(() => {
            // You could add a success toast/snackbar here if desired
            console.log('Scene loaded successfully');
          });
        } else {
          this.fileErrorMessage = 'Invalid central-plant JSON format. Please select a valid scene file.';
        }
      } catch (error) {
        console.error('Error reading/parsing JSON file:', error);
        this.fileErrorMessage = 'Error reading or parsing the JSON file. Please check the file format.';
      }
    },
    
    // Load Central Plant JSON data from TabInspect (generated from gen-item)
    async loadCentralPlantJson(jsonData) {
      if (!jsonData) {
        console.error('❌ No JSON data provided');
        this.showErrorMessage('No JSON data provided');
        return;
      }
      
      try {
        // Validate that it's a central-plant-compatible JSON
        if (this.validateCentralPlantJson(jsonData)) {
          // Load connections data if present
          if (jsonData.connections && Array.isArray(jsonData.connections)) {
            this.currentSceneConnections = [...jsonData.connections];
            console.log('✅ Loaded', this.currentSceneConnections.length, 'connections from generated scene');
          } else {
            this.currentSceneConnections = [];
            console.log('⚠️ No connections data found in generated scene');
          }
          
          // Store complete scene data directly in centralPlant
          if (this.centralPlant) {
            this.centralPlant.setImportedSceneData(jsonData);
            console.log('✅ Complete generated scene data stored in centralPlant');
            
            // Update import metadata with generation information
            this.centralPlant.updateMetadataCategory('lastImport', {
              importInfo: {
                ...this.centralPlant.getMetadata('lastImport')?.importInfo,
                sourceType: 'generated',
                importTimestamp: new Date().toISOString()
              }
            });
            
            // Store additional import metadata for backward compatibility
            this.centralPlant.setMetadata('fileImportHistory', [
              ...(this.centralPlant.getMetadata('fileImportHistory') || []),
              {
                sourceType: 'generated',
                timestamp: new Date().toISOString(),
                connectionsCount: jsonData.connections?.length || 0,
                componentsCount: jsonData.scene?.object?.children?.length || 0,
                importMethod: 'tabinspect-generation'
              }
            ]);
          }
          
          // Emit event to SceneViewer to reload with new data
          this.$nuxt.$emit('loadNewScene', jsonData);
          
          // Show success message
          this.showSnackbar('Generated scene loaded successfully!', 'success');
          
          console.log('✅ Generated scene loaded successfully');
        } else {
          console.error('❌ Invalid central-plant JSON format from generated data');
          this.showErrorMessage('Invalid central-plant JSON format from generated data');
        }
      } catch (error) {
        console.error('❌ Error processing generated JSON data:', error);
        this.showErrorMessage('Error processing generated JSON data. Please check console for details.');
      }
    },
    
    // Read file as text
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },
    // Validate central-plant JSON structure
    validateCentralPlantJson(data) {
      return data && 
             data.connections &&
             data.scene && 
             data.scene.object && 
             data.scene.object.children  
    },    
    // Create new empty scene
    createNewScene() {
      // Emit event to create a new empty scene
      this.$nuxt.$emit('createNewScene');
    },    
    // Export current scene to JSON file
    exportScene() {
      console.log('🏗️ Exporting current scene...');
      
      const sceneViewer = this.getActiveSceneViewer();
      console.log('🔍 Scene viewer ref:', sceneViewer);
      
      if (!sceneViewer) {
        console.error('❌ Scene viewer not available for export');
        this.showErrorMessage('Scene viewer not ready. Please try again.');
        return;
      }
      
      console.log('🔍 Scene viewer downloadSceneExport method:', typeof this.$refs.sceneViewer.downloadSceneExport);

      try {
        // Call the export function from SceneViewerWrapper
        console.log('🔍 Calling downloadSceneExport...');
        const success = sceneViewer.downloadSceneExport();
        
        console.log('🔍 Export result:', success);
        
        if (success) {
          console.log('✅ Scene exported successfully');
          this.showSuccessMessage('Scene exported successfully!');
        } else {
          console.error('❌ Failed to export scene');
          this.showErrorMessage('Failed to export scene. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error during scene export:', error);
        this.showErrorMessage('Error occurred during export. Please check console for details.');
      }
    },

    // Handle adding a component to the scene
    onAddComponentToScene(componentData) {
      console.log('🏗️ Adding component to scene:', componentData);
      
      const sceneViewer = this.getActiveSceneViewer();
      if (!sceneViewer) {
        console.error('❌ Scene viewer not available for adding components');
        this.showErrorMessage('Scene viewer not ready. Please try again.');
        return;
      }
      
      try {
        // Call the addComponentToScene method on SceneViewerWrapper
        const success = sceneViewer.addComponentToScene(componentData);
        
        if (success) {
          console.log('✅ Component added to scene successfully');
          this.showSuccessMessage('Component added to scene successfully!');
        } else {
          console.error('❌ Failed to add component to scene');
          this.showErrorMessage('Failed to add component to scene. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error adding component to scene:', error);
        this.showErrorMessage('Error occurred while adding component. Please check console for details.');      }
    },

    // Handle component dropped into scene via drag and drop
    onComponentAddedViaDrop(data) {
      console.log('🎯 Component dropped into scene:', data);
      
      if (!data || !data.componentData) {
        console.error('❌ Invalid drop data received');
        this.showErrorMessage('Invalid component data. Please try again.');
        return;
      }
      
      try {
        // The SceneViewerWrapper has already added the component to the scene
        // We just need to handle any additional UI updates or state management
        console.log('✅ Component successfully dropped at position:', data.position);
        this.showSuccessMessage(`Component "${data.componentData.name}" added to scene via drag and drop!`);
        
        // Optional: You could add any additional logic here such as:
        // - Updating scene state
        // - Logging the action for undo/redo
        // - Updating any UI indicators
        
      } catch (error) {
        console.error('❌ Error handling dropped component:', error);
        this.showErrorMessage('Error occurred while processing dropped component.');
      }
    },    // Handle drag start from TabAssembly
    onComponentDragStart(componentData) {
      console.log('🔄 Component drag started:', componentData);
      
      // Forward drag start event to SceneViewerWrapper for size calculation
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.onComponentDragStart) {
        sceneViewer.onComponentDragStart(componentData);
      }
    },

    // Handle drag end from TabAssembly  
    onComponentDragEnd(componentData) {
      console.log('🔄 Component drag ended:', componentData);
      
      // Forward drag end event to SceneViewerWrapper for cleanup
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.onComponentDragEnd) {
        sceneViewer.onComponentDragEnd(componentData);
      }
    },    // Handler for when component placement is canceled
    onComponentPlacementCanceled(data) {
      console.log('⚠️ Component placement canceled:', data);
      
      let message = 'Component placement canceled';
      
      // Handle different cancellation reasons
      switch (data.reason) {
        case 'overlap':
          message = 'Cannot place component: Overlapping with existing component';
          break;
        case 'invalid-data':
          message = 'Invalid component data received';
          break;
        case 'parse-error':
          message = 'Error parsing component data';
          break;
        default:
          if (data.message) {
            message = data.message;
          }
      }
      
      this.showWarningMessage(message);
    },
    
    // Helper method to show success messages with snackbar
    showSuccessMessage(message) {
      console.log('✅', message);
      this.snackbar = {
        show: true,
        text: message,
        color: 'success',
        timeout: 3000
      };
    },
    
    // Helper method to show warning messages with snackbar
    showWarningMessage(message) {
      console.warn('⚠️', message);
      this.snackbar = {
        show: true,
        text: message,
        color: 'warning',
        timeout: 4000
      };
    },
    
    // Helper method to show error messages with snackbar
    showErrorMessage(message) {
      console.error('❌', message);
      this.snackbar = {
        show: true,
        text: message,
        color: 'error',
        timeout: 5000
      };
    },

    // Transform event handlers    
    onObjectSelectedForTransform(object) {
      this.selectedTransformObject = object;
      this.currentTransformData = object ? this.getActiveSceneViewer()?.getSelectedTransform() : null;
      console.log('Object selected for transform:', object?.name || 'none');
      
      // Update the scene objects to reflect the new selection
      this.updateSceneObjects();
      
      // If an object is selected, try to populate the TabAssembly with corresponding component data
      if (object && object.userData?.libraryId && this.$refs.tabComponent) {
        this.populateTabAssemblyFromSelectedObject(object);
      }
    },
    
    onTransformUpdate(transformData) {
      // Update transform data with both local and world coordinates if available
      this.currentTransformData = transformData;
    },

    onTransformComplete(data) {
      this.currentTransformData = data.final ? this.getActiveSceneViewer()?.getSelectedTransform() : null;
      console.log('Transform completed:', data.mode);
    },

    onTransformModeChanged(mode) {
      this.transformMode = mode;
      console.log('Transform mode changed to:', mode);
    },    
      // Handle transform value changes from TabAssembly or SceneEditor
    onTransformValueChanged(data) {
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && this.selectedTransformObject) {
        const { type, axis, value, useWorldCoordinates = false } = data;
        // Call TransformControlsManager method directly with world coordinate support
        sceneViewer.transformManager?.updateObjectTransform(type, axis, value, useWorldCoordinates);

        // Update scene data and pathfinding after transform ---
        const object = this.selectedTransformObject;
        if (sceneViewer.sceneOperationsManager && sceneViewer.currentSceneData) {
          sceneViewer.sceneOperationsManager.updateSceneDataAfterTransform(object, sceneViewer.currentSceneData);
        }
        if (sceneViewer.pathfindingManager && sceneViewer.currentSceneData) {
          sceneViewer.pathfindingManager.updatePathfindingAfterTransform(sceneViewer.currentSceneData);
        }
      }
    },
    
    // Handle transform mode changes from TabAssembly
    onTransformModeChange(mode) {
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.transformManager) {
        // Call TransformControlsManager method directly
        sceneViewer.transformManager.setMode(mode);
      }
    },    
    
    // Handle transform reset from TabAssembly
    onResetTransform(data) {
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.transformManager && data.object) {
        console.log('Resetting transform for object:', data.object.name);
        // Reset position, rotation, and scale to default values
        const { values } = data;
        
        // Apply the reset values using TransformControlsManager directly
        Object.keys(values).forEach(transformType => {
          Object.keys(values[transformType]).forEach(axis => {
            sceneViewer.transformManager.updateObjectTransform(
              transformType, 
              axis, 
              values[transformType][axis]
            );
          });
        });
        
        // Update the current transform data
        this.currentTransformData = sceneViewer?.getSelectedTransform();
      }
    },

    // Handle object info display from TabAssembly
    onShowObjectInfo(data) {
      if (data.object) {
        const { object, transformData } = data;
        
        // Create info dialog content
        const info = {
          name: object.name || 'Unnamed Object',
          type: object.type || 'Unknown',
          id: object.id || 'No ID',
          position: transformData?.position || { x: 0, y: 0, z: 0 },
          rotation: transformData?.rotation || { x: 0, y: 0, z: 0 },
          scale: transformData?.scale || { x: 1, y: 1, z: 1 },
          material: object.material?.name || 'No material',
          geometry: object.geometry?.type || 'No geometry'
        };
        
        // For now, log to console - in a full implementation, this would show a dialog
        console.log('Object Information:', info);
        
        // You could emit an event to show a dialog, or implement a notification
        // For example: this.$emit('show-info-dialog', info);
        
        // Simple alert for demonstration
        const infoText = `
          Object: ${info.name}
          Type: ${info.type}
          Position: (${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)}, ${info.position.z.toFixed(2)})
          Rotation: (${info.rotation.x.toFixed(2)}, ${info.rotation.y.toFixed(2)}, ${info.rotation.z.toFixed(2)})
          Scale: (${info.scale.x.toFixed(2)}, ${info.scale.y.toFixed(2)}, ${info.scale.z.toFixed(2)})
          Material: ${info.material}
          Geometry: ${info.geometry}
        `.trim();
        
        // alert(infoText);
      }
    },
    
    /**
     * Initialize model preloading from component dictionary
     */
    async initializeModelPreloading() {
      try {
        console.log('🚀 Starting model preloading initialization...')
        this.isPreloadingModels = true
        
        // Load the component dictionary
        const response = await fetch('/library/component-dictionary.json')
        if (!response.ok) {
          throw new Error(`Failed to load component dictionary: ${response.status}`)
        }
        
        const componentDictionary = await response.json()
        console.log('📚 Component dictionary loaded:', Object.keys(componentDictionary))
        
        // Store the dictionary for later use
        this.componentDictionary = componentDictionary
        
        // Start preloading all models
        const modelPreloader = this.centralPlant.getUtility('modelPreloader')
        this.preloadingProgress = await modelPreloader.preloadAllModels(componentDictionary)
        
        console.log('🎉 Model preloading completed:', this.preloadingProgress)
        
        // Expose preloader to global scope for debugging
        if (typeof window !== 'undefined') {
          window.modelPreloader = modelPreloader
          window.preloaderStats = () => modelPreloader.getCacheStats()
          window.getObjectDimensions = this.getObjectDimensions
          window.getComponentDimensionsByLibraryId = this.getComponentDimensionsByLibraryId
          window.exampleAccessDimensionsFromSceneObjects = this.exampleAccessDimensionsFromSceneObjects
          window.getSceneHelper = this.getSceneHelper
          window.exampleUseSceneHelper = this.exampleUseSceneHelper
          window.getCentralPlant = () => this.centralPlant
          window.getImportedSceneData = () => this.centralPlant?.importedSceneData
          
          console.group('🔧 Model Preloader Debug Commands')
          console.log('📊 window.preloaderStats() - Get cache statistics')
          console.log('🎯 window.modelPreloader.getStatus() - Get preloader status')
          console.log('🗑️ window.modelPreloader.clearCache() - Clear all cached models')
          console.log('🔄 window.modelPreloader.reloadModel(modelKey) - Reload specific model')
          console.log('📏 window.getObjectDimensions(object) - Get dimensions from Three.js object')
          console.log('📏 window.getComponentDimensionsByLibraryId(libraryId) - Get dimensions by library ID')
          console.log('📋 window.exampleAccessDimensionsFromSceneObjects() - Show all objects with dimensions')
          console.groupEnd()
          
          console.group('🔧 Scene Helper Debug Commands')
          console.log('🎯 window.getSceneHelper() - Get SceneHelper utility instance')
          console.log('📊 window.exampleUseSceneHelper() - Demonstrate SceneHelper usage')
          console.log('🔍 sceneHelper.debugSceneInfo() - Log scene debug information')
          console.log('📦 sceneHelper.getSceneObjects() - Get all scene objects')
          console.log('🌳 sceneHelper.getSceneObjectsHierarchy() - Get scene hierarchy')
          console.log('🎥 sceneHelper.focusOnObject(object) - Focus camera on object')
          console.log('📊 sceneHelper.getSceneStats() - Get scene statistics')
          console.groupEnd()
          
          console.group('🔧 CentralPlant & Scene Data Debug Commands')
          console.log('🏗️ window.getCentralPlant() - Get CentralPlant instance')
          console.log('📥 window.getImportedSceneData() - Get imported scene data directly (no getter needed)')
          console.log('🔗 centralPlant.importedSceneData.connections - Direct access to connections')
          console.log('🌍 centralPlant.importedSceneData.scene - Direct access to scene structure')
          console.log('🗑️ centralPlant.clearImportedSceneData() - Clear stored scene data')
          console.groupEnd()
          
          console.group('🔧 Metadata Debug Commands')
          console.log('📋 centralPlant.getAllMetadata() - Get all metadata')
          console.log('📝 centralPlant.getMetadata("sceneInfo") - Get scene information')
          console.log('📥 centralPlant.getMetadata("lastImport") - Get import metadata')
          console.log('⚙️ centralPlant.getMetadata("projectSettings") - Get project settings')
          console.log('🎥 centralPlant.getMetadata("viewportSettings") - Get viewport settings')
          console.log('🔧 centralPlant.getMetadata("componentSettings") - Get component settings')
          console.log('💾 centralPlant.setMetadata(key, value) - Set metadata')
          console.log('📊 centralPlant.updateMetadataCategory(category, updates) - Update metadata category')
          console.groupEnd()
        }        
      } catch (error) {
        console.error('❌ Failed to initialize model preloading:', error)      
      } finally {
        this.isPreloadingModels = false
      }
    },

    /**
     * Initialize connections data with sample data from cp-01-01.json
     */
    async initializeConnectionsData() {
      try {
        console.log('🔗 Loading sample connections data...');
        
        // Load the sample connections data from cp-01-01.json
        const response = await fetch('/mock-data/cp-01-01.json');
        if (!response.ok) {
          console.warn('⚠️ Could not load sample connections data, using empty array');
          return;
        }
        
        const sampleData = await response.json();
        if (sampleData.connections && Array.isArray(sampleData.connections)) {
          this.currentSceneConnections = [...sampleData.connections];
          console.log('✅ Loaded', this.currentSceneConnections.length, 'sample connections');
        } else {
          console.warn('⚠️ Sample data does not contain valid connections array');
        }
        
        // Store complete sample scene data directly in centralPlant
        if (this.centralPlant && sampleData) {
          this.centralPlant.setImportedSceneData(sampleData);
          console.log('✅ Sample scene data stored in centralPlant');
          
          // Update import metadata for sample data
          this.centralPlant.updateMetadataCategory('lastImport', {
            importInfo: {
              ...this.centralPlant.getMetadata('lastImport')?.importInfo,
              originalFileName: 'cp-01-01.json',
              fileSize: JSON.stringify(sampleData).length,
              importMethod: 'sample-data',
              importTimestamp: new Date().toISOString()
            }
          });
          
          // Update scene info for sample data
          this.centralPlant.updateMetadataCategory('sceneInfo', {
            name: 'Sample Central Plant Scene',
            description: 'Sample scene loaded from cp-01-01.json',
            dataSource: 'sample-data',
            lastModified: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Failed to load sample connections data:', error);
      }
    },

    /**
     * Populate TabAssembly with data from the selected scene object
     */
    async populateTabAssemblyFromSelectedObject(object) {
      try {
        console.log('🔄 Populating TabAssembly from selected object:', object.name, object.userData?.libraryId);
          if (!object.userData?.libraryId) {
          console.warn('⚠️ Selected object has no libraryId in userData');
          return;
        }

        // Load component dictionary if not already loaded
        if (!this.componentDictionary) {
          const response = await fetch('/library/component-dictionary.json');
          this.componentDictionary = await response.json();
        }

        const libraryComponent = this.componentDictionary[object.userData.libraryId];
        if (!libraryComponent) {
          console.warn('⚠️ Component not found in library:', object.userData.libraryId);
          return;
        }

        // Create component data object similar to what TabSelect would emit
        const componentData = {
          id: object.userData.libraryId,
          name: libraryComponent.name || object.userData.libraryId,
          libraryId: object.userData.libraryId,
          modelKey: libraryComponent.modelKey,
          metadata: libraryComponent.metadata,
          boundingBox: libraryComponent.boundingBox,
          thumbnail: libraryComponent.thumbnail || null
        };        // Call the TabAssembly's method to select this component
        if (this.$refs.tabComponent && this.$refs.tabComponent.onComponentSelected) {
          this.$refs.tabComponent.onComponentSelected(componentData);
          
          // Don't switch tabs - just show the component name and thumbnail
          console.log('✅ TabAssembly populated with selected object data');
          console.log('📸 Thumbnail path:', componentData.thumbnail);
          console.log('🏷️ Component name:', componentData.name);
        }} catch (error) {
        console.error('❌ Error populating TabAssembly from selected object:', error);
      }
    },

    /**
     * Get scene objects from the SceneViewerWrapper component
     * @returns {Array} Array of scene objects in a hierarchy
     */
    getSceneObjects() {
      const sceneViewer = this.getActiveSceneViewer();
      if (!sceneViewer || !sceneViewer.scene) {
        return [];
      }
        // Create a clone of the scene hierarchy without the actual THREE.js objects
      const cloneSceneHierarchy = (object) => {
        if (!object) return null;
        
        // Skip internal objects and helpers
        if (
          object.name.includes('helper') || 
          object.name.includes('Helper') ||
          object.name.includes('controls') ||
          object.name === 'CameraGimbal' ||
          object.type === 'GridHelper' ||
          object.type === 'AxesHelper'
        ) {
          return null;
        }
        
        // Check if this is the Scene object - always include it as the root
        const isRootScene = object.type === 'Scene';
        
        // For non-Scene objects, check if they have the specified componentType
        const componentType = object.userData?.componentType;
        const shouldInclude = isRootScene || 
                             componentType === 'component' || 
                             componentType === 'connector' || 
                             componentType === 'gateway';
        
        // Skip objects that don't match our filter criteria
        if (!shouldInclude && !isRootScene) {
          return null;
        }
          // Create a lightweight clone with just the properties we need
        const getHardcodedUuid = this.centralPlant.getUtility('getHardcodedUuid')
        const clone = {
          uuid: getHardcodedUuid(object),
          name: object.name || 'Unnamed Object',
          type: object.type,
          userData: object.userData ? { ...object.userData } : {},
          isActive: !object.userData?.disabled,
          isSelected: this.selectedTransformObject ? getHardcodedUuid(this.selectedTransformObject) === getHardcodedUuid(object) : false,
          componentType: componentType || 'other',
          children: []
        };
        
        // Process children if any
        if (object.children && object.children.length > 0) {
          for (const child of object.children) {
            const childClone = cloneSceneHierarchy(child);
            if (childClone) {
              clone.children.push(childClone);
            }
          }
        }
        
        return clone;
      };
        // Get the scene object
      const scene = sceneViewer.scene;
      
      // Instead of returning the scene as the root, return its filtered children directly
      if (scene && scene.children && scene.children.length > 0) {
        // Filter and process each direct child of the scene
        const sceneChildren = [];
        scene.children.forEach(child => {
          const childClone = cloneSceneHierarchy(child);
          if (childClone) {
            sceneChildren.push(childClone);
          }
        });
        return sceneChildren;
      }
      
      return [];
    },
      /**
     * Update the scene objects list periodically or when the scene changes
     * @param {Object} changeEvent Optional event data from scene-changed event
     */
    updateSceneObjects(changeEvent = null) {
      // Get the current scene objects
      const newSceneObjects = this.getSceneObjects();
      
      // Update the state
      this.sceneObjects = newSceneObjects;
      
      if (changeEvent) {
        console.log(`📋 Scene objects updated due to ${changeEvent.action} action`);
      }
      
      // If in quad mode, refresh the 2D component display when scene objects change
      if (this.quadMode && this.$refs.quadViewport && this.$refs.quadViewport.refreshComponentDisplay) {
        this.$nextTick(() => {
          this.$refs.quadViewport.refreshComponentDisplay();
        });
      }
    },

    /**
     * Handle object selection from the tree view
     * @param {Object} objectData Data about the selected object
     */
    selectObjectFromTree(objectData) {
      if (!objectData || !objectData.uuid) {
        return;
      }
      
      const sceneViewer = this.getActiveSceneViewer();
      if (!sceneViewer) {
        return;
      }
      
      // Find the actual object in the scene
      const findObjectById = (parent, uuid) => {
        if (parent.uuid === uuid) {
          return parent;
        }
        
        if (parent.children) {
          for (const child of parent.children) {
            const result = findObjectById(child, uuid);
            if (result) {
              return result;
            }
          }
        }
        
        return null;
      };
      
      const sceneObj = findObjectById(sceneViewer.scene, objectData.uuid);
        if (sceneObj) {
        // Use the existing selection method in SceneViewerWrapper
        sceneViewer.selectObject(sceneObj);
      }
    },    /**
     * Handle connections changes from SceneEditor
     * @param {Array} connectionsData Updated connections data
     */
    async onConnectionsChanged(connectionsData) {
      console.log('🔗 Connections changed received in index.vue:', {
        newConnectionsCount: connectionsData.length,
        newConnections: connectionsData,
        currentConnectionsCount: this.currentSceneConnections.length,
        currentConnections: this.currentSceneConnections
      });
      
      // Update local connections data
      this.currentSceneConnections = [...connectionsData];
      
      // Set pathfinding status to updating
      this.pathfindingStatus = 'updating';
      
      // Update pathfinding in the scene viewer with new connections
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.updatePathfindingWithConnections) {
        try {
          console.log('🔄 Calling SceneViewer updatePathfindingWithConnections...');
          const success = await sceneViewer.updatePathfindingWithConnections(connectionsData);
          if (success) {
            console.log('✅ Pathfinding updated successfully with new connections');
            this.pathfindingStatus = 'completed';
            this.showSnackbar('Connections and pathfinding updated successfully', 'success');
          } else {
            console.warn('⚠️ Failed to update pathfinding with new connections');
            this.pathfindingStatus = 'error';
            this.showSnackbar('Connections updated, but pathfinding update failed', 'warning');
          }
        } catch (error) {
          console.error('❌ Error updating pathfinding with new connections:', error);
          this.pathfindingStatus = 'error';
          this.showSnackbar('Error updating pathfinding with new connections', 'error');
        }
      } else {
        console.warn('⚠️ SceneViewer not available for pathfinding update');
        this.pathfindingStatus = 'completed';
        this.showSnackbar('Connections updated successfully', 'success');
      }
      
      // Update scene helper with new connections data
      if (this.centralPlant) {
        this.centralPlant.updateSceneHelperData({ connections: connectionsData });
      }
      
      // Reset status to idle after a short delay
      setTimeout(() => {
        this.pathfindingStatus = 'idle';
      }, 2000);
    },

    /**
     * Handle scene data updates from SceneViewerWrapper
     * @param {Object} eventData Event data containing action and updated data
     */
    onSceneDataUpdated(eventData) {
      console.log('📊 Scene data updated:', eventData);
      
      if (eventData.action === 'connections-update') {
        // Update our local connections data to match the updated scene data
        this.currentSceneConnections = [...eventData.connections];
        console.log('🔗 Local connections data synchronized with scene data');
        
        // You could add additional logic here such as:
        // - Saving to localStorage
        // - Sending to a server
        // - Updating other UI components
      }
      
      // Update scene objects to reflect changes
      this.updateSceneObjects(eventData);
      
      // If in quad mode, refresh the 2D component display
      if (this.quadMode && this.$refs.quadViewport && this.$refs.quadViewport.refreshComponentDisplay) {
        this.$nextTick(() => {
          this.$refs.quadViewport.refreshComponentDisplay();
        });
      }
    },

    /**
     * Show a snackbar notification
     * @param {String} message The message to display
     * @param {String} color The color of the snackbar (success, error, warning, info)
     */
    showSnackbar(message, color = 'info') {
      this.snackbar.text = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    // Get style for context buttons based on current state
    getContextButtonStyle(contextValue) {
      if (this.sandboxMode === 'Scene') {
        // For Scene mode, check sceneContext
        return this.sceneContext === contextValue ? 
          'background:#e3f2fd; color:#1976d2' : 
          'border:1px solid #666; color:#666';
      } else {
        // For other modes, use the original logic (if needed)
        return 'border:1px solid #666; color:#666';
      }
    },

    // Get CSS class for context menu list items based on current state
    getContextListItemClass(contextValue, mode) {
      let isActive = false;
      
      if (mode === 'Scene') {
        // For Scene mode, check if this context value matches the current sceneContext
        isActive = this.sceneContext === contextValue;
      }
      // For other modes, you could add similar logic if needed
      
      return isActive ? 'v-list-item--active' : '';
    },

    // Set up scene helper reference for SceneEditor Advanced mode
    setupSceneHelper() {
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer) {
        // Create a scene helper object with references to the Three.js scene and other components
        this.sceneHelper = {
          scene: sceneViewer.scene,
          camera: sceneViewer.camera,
          renderer: sceneViewer.renderer,
          controls: sceneViewer.controls
        };
        console.log('🌳 Scene helper set up for Advanced tree mode:', this.sceneHelper);
      } else {
        console.warn('🌳 SceneViewer ref not available yet, retrying...');
        // Retry after a short delay
        setTimeout(() => {
          this.setupSceneHelper();
        }, 500);
      }
    },

    /**
     * Handle scene configuration changes from SceneConfigs component
     */
    onSceneConfigChanged(settings) {
      console.log('⚙️ Scene configuration changed:', settings);
      
      if (settings.viewport && settings.viewport.quadMode !== undefined) {
        const newQuadMode = settings.viewport.quadMode;
        console.log(`🔲 Toggling quad mode: ${this.quadMode} → ${newQuadMode}`);
        
        this.quadMode = newQuadMode;
        
        // Save quad mode state to localStorage immediately
        this.saveQuadModeToStorage();
        
        // Handle the transition between single and quad mode
        this.$nextTick(() => {
          this.handleViewportModeChange();
        });
      }
      
      // Handle other settings changes
      if (settings.scene) {
        this.handleSceneSettingsChange(settings.scene);
      }
      
      if (settings.editor) {
        this.handleEditorSettingsChange(settings.editor);
      }
    },

    /**
     * Handle viewport mode changes (single vs quad)
     */
    handleViewportModeChange() {
      if (this.quadMode) {
        console.log('🔲 Switched to quad mode - 3x 2D Konva + 1x 3D Three.js viewports');
        
        // Wait for QuadViewport component to be mounted
        this.$nextTick(() => {
          if (this.$refs.quadViewport) {
            console.log('✅ QuadViewport component is ready');
            this.showSnackbar('Switched to quad mode layout', 'info');
          } else {
            console.warn('⚠️ QuadViewport component not available yet');
          }
        });
      } else {
        console.log('🔲 Switched to single mode - 1x 3D Three.js viewport');
        
        // Wait for SceneViewer component to be mounted
        this.$nextTick(() => {
          if (this.$refs.sceneViewer) {
            console.log('✅ SceneViewer component is ready');
            this.showSnackbar('Switched to single viewport layout', 'info');
          } else {
            console.warn('⚠️ SceneViewer component not available yet');
          }
        });
      }
    },

    /**
     * Handle scene settings changes
     */
    handleSceneSettingsChange(sceneSettings) {
      console.log('🌍 Applying scene settings:', sceneSettings);
      
      // Get the active scene viewer (either single or from quad mode)
      const sceneViewer = this.getActiveSceneViewer();
      
      if (sceneViewer && sceneSettings.autoRotation !== undefined) {
        // Apply auto rotation setting
        if (sceneViewer.setAutoRotation) {
          sceneViewer.setAutoRotation(sceneSettings.autoRotation);
          console.log('🔄 Auto rotation set to:', sceneSettings.autoRotation);
        }
      }
    },

    /**
     * Handle editor settings changes
     */
    handleEditorSettingsChange(editorSettings) {
      console.log('✏️ Applying editor settings:', editorSettings);
      
      if (editorSettings.treeViewMode !== undefined) {
        // This could be handled by emitting an event to SceneEditor component
        this.$nuxt.$emit('tree-view-mode-changed', editorSettings.treeViewMode);
        console.log('🌳 Tree view mode set to:', editorSettings.treeViewMode);
      }
    },

    /**
     * Get the currently active scene viewer component
     */
    getActiveSceneViewer() {
      if (this.quadMode) {
        // In quad mode, get the scene viewer from the QuadViewport component
        return this.$refs.quadViewport ? this.$refs.quadViewport.getSceneViewer() : null;
      } else {
        // In single mode, use the direct scene viewer reference
        return this.$refs.sceneViewer;
      }
    },

    /**
     * Get the scene helper utility from the active scene viewer
     * @returns {Object|null} SceneHelper instance or null
     */
    getSceneHelper() {
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer && sceneViewer.sceneHelper) {
        return sceneViewer.sceneHelper;
      }
      
      // Fallback: try to get from centralPlant directly
      if (this.centralPlant) {
        return this.centralPlant.getUtility('sceneHelper');
      }
      
      return null;
    },

    /**
     * Example method showing how to use SceneHelper utilities
     */
    exampleUseSceneHelper() {
      const sceneHelper = this.getSceneHelper();
      
      if (!sceneHelper) {
        console.warn('⚠️ SceneHelper not available');
        return;
      }

      // Example 1: Get all scene objects
      const allObjects = sceneHelper.getSceneObjects();
      console.log('📦 All scene objects:', allObjects);

      // Example 2: Get only components
      const components = sceneHelper.getSceneObjects({
        includeConnectors: false,
        includeGateways: false,
        includeHelpers: false
      });
      console.log('🏗️ Component objects:', components);

      // Example 3: Get scene hierarchy
      const hierarchy = sceneHelper.getSceneObjectsHierarchy();
      console.log('🌳 Scene hierarchy:', hierarchy);

      // Example 4: Find objects by name
      const pumps = sceneHelper.findObjectsByName('pump');
      console.log('💧 Found pump objects:', pumps);

      // Example 5: Get scene statistics
      const stats = sceneHelper.getSceneStats();
      console.log('📊 Scene statistics:', stats);

      // Example 6: Get selected object info
      const selected = sceneHelper.getSelectedObject();
      if (selected) {
        const transform = sceneHelper.getSelectedTransform();
        console.log('🎯 Selected object:', selected.name, 'Transform:', transform);
      }

      // Example 7: Focus camera on first component
      if (components.length > 0) {
        sceneHelper.focusOnObject(components[0].object, { animate: true });
        console.log('🎥 Camera focused on:', components[0].name);
      }

      return {
        allObjects,
        components,
        hierarchy,
        pumps,
        stats,
        selected
      };
    },

    /**
     * Handle 2D viewport view changes
     */
    on2DViewChanged(data) {
      console.log('🎨 2D viewport view changed:', data);
      
      // Handle 2D view changes - this could be used to:
      // - Update camera angles for orthographic projections
      // - Load different data for different views
      // - Synchronize with 3D viewport
      
      this.showSnackbar(`${data.viewport} view changed to ${data.viewType}`, 'info');
    },

    /**
     * Handle 3D viewport view changes
     */
    on3DViewChanged(data) {
      console.log('🎥 3D viewport view changed:', data);
      
      const sceneViewer = this.getActiveSceneViewer();
      if (sceneViewer) {
        // Handle camera type changes (perspective vs orthographic)
        if (data.viewType === 'Orthographic') {
          // Switch to orthographic camera if the method exists
          if (sceneViewer.setOrthographicCamera) {
            sceneViewer.setOrthographicCamera();
          }
        } else if (data.viewType === 'Perspective') {
          // Switch to perspective camera if the method exists
          if (sceneViewer.setPerspectiveCamera) {
            sceneViewer.setPerspectiveCamera();
          }
        }
      }
      
      this.showSnackbar(`3D view changed to ${data.viewType}`, 'info');
    },

    /**
     * Load quad mode state from localStorage
     */
    loadQuadModeFromStorage() {
      try {
        console.log('🔲 Loading quad mode state from localStorage...');
        
        // Check if running in browser environment
        if (process.client) {
          const savedSettings = localStorage.getItem('sceneConfigurations');
          
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            console.log('📋 Found saved scene configurations:', parsed);
            
            // Load quad mode state if it exists
            if (parsed.quadMode !== undefined) {
              this.quadMode = parsed.quadMode;
              console.log('✅ Quad mode loaded from localStorage:', this.quadMode);
              
              // If quad mode is enabled, we need to handle the transition
              if (this.quadMode) {
                console.log('🔲 Quad mode was enabled, preparing for quad layout...');
                
                // Wait for the next tick to ensure the component is ready
                this.$nextTick(() => {
                  this.handleViewportModeChange();
                });
              }
            } else {
              console.log('⚙️ No quad mode setting found in localStorage, using default');
            }
          } else {
            console.log('⚙️ No saved scene configurations found, using defaults');
          }
        } else {
          console.log('⚠️ Not in browser environment, skipping localStorage load');
        }
        
      } catch (error) {
        console.error('❌ Error loading quad mode from localStorage:', error);
        // If error occurs, use default value (false)
        this.quadMode = false;
      }
    },

    /**
     * Save quad mode state to localStorage
     */
    saveQuadModeToStorage() {
      try {
        console.log('💾 Saving quad mode state to localStorage...');
        
        if (process.client) {
          // Get existing settings or create new ones
          let existingSettings = {};
          const savedSettings = localStorage.getItem('sceneConfigurations');
          
          if (savedSettings) {
            existingSettings = JSON.parse(savedSettings);
          }
          
          // Update with current quad mode state
          const updatedSettings = {
            ...existingSettings,
            quadMode: this.quadMode,
            lastUpdated: new Date().toISOString()
          };
          
          localStorage.setItem('sceneConfigurations', JSON.stringify(updatedSettings));
          console.log('✅ Quad mode state saved to localStorage:', {
            quadMode: this.quadMode,
            allSettings: updatedSettings
          });
        }
      } catch (error) {
        console.error('❌ Error saving quad mode to localStorage:', error);
      }
    },

    /**
     * Handle component selection from 2D viewport (Front view)
     * @param {Object} component3DObject - The 3D object that was clicked in 2D
     */
    onComponentSelectedIn2D(component3DObject) {
      console.log('🎯 Component selected in 2D viewport:', component3DObject?.name || 'Unnamed component');
      
      if (!component3DObject) {
        console.warn('⚠️ No component object provided for 2D selection');
        return;
      }
      
      // Get the active scene viewer to handle the selection
      const sceneViewer = this.getActiveSceneViewer();
      if (!sceneViewer) {
        console.warn('⚠️ No active scene viewer available for 2D selection');
        return;
      }
      
      try {
        // Use the existing selection mechanism from the 3D scene viewer
        sceneViewer.selectObject(component3DObject);
        
        // This will trigger the onObjectSelectedForTransform method automatically
        // which handles updating the UI and transform controls
        
        console.log('✅ Successfully selected component from 2D viewport:', {
          name: component3DObject.name,
          uuid: component3DObject.uuid,
          libraryId: component3DObject.userData?.libraryId,
          componentType: component3DObject.userData?.componentType
        });
        
        // Show user feedback
        this.showSnackbar(`Selected "${component3DObject.name || 'Component'}" from 2D view`, 'success');
        
        // Optionally, update the scene objects to reflect the selection
        this.updateSceneObjects();
        
      } catch (error) {
        console.error('❌ Error selecting component from 2D viewport:', error);
        this.showSnackbar('Error selecting component from 2D view', 'error');
      }
    },

    /**
     * Initialize the CentralPlant for accessing scene utilities
     * This is called early in the lifecycle to create the collection instance
     */
    initializeCentralPlant() {
      if (!this.centralPlant) {
        // Initialize with a placeholder - the actual component instance will be set later
        this.centralPlant = new CentralPlant(null)
        console.log('🏗️ CentralPlant initialized from index.vue')
      }
      return this.centralPlant
    },

    /**
     * Get the current CentralPlant instance
     */
    getCentralPlant() {
      return this.centralPlant
    },

    /**
     * Get a specific manager from the collection
     */
    getSceneManager(managerName) {
      return this.centralPlant ? this.centralPlant.getManager(managerName) : null
    },

    /**
     * Get a specific utility from the collection
     */
    getSceneUtility(utilityName) {
      return this.centralPlant ? this.centralPlant.getUtility(utilityName) : null
    },

    /**
     * Get imported scene data directly from centralPlant (no getter needed)
     * @returns {Object|null} The complete imported scene data or null
     */
    getImportedSceneData() {
      return this.centralPlant ? this.centralPlant.importedSceneData : null
    },

    /**
     * Get imported connections directly from centralPlant
     * @returns {Array} The connections array or empty array
     */
    getImportedConnections() {
      return this.centralPlant ? this.centralPlant.getImportedConnections() : []
    },

    /**
     * Get imported scene objects directly from centralPlant
     * @returns {Object|null} The scene object structure or null
     */
    getImportedSceneObjects() {
      return this.centralPlant ? this.centralPlant.getImportedSceneObjects() : null
    },

    /**
     * Get current scene metadata from centralPlant
     * @param {string} category - Optional specific category to retrieve
     * @returns {Object} The metadata object or specific category
     */
    getSceneMetadata(category = null) {
      if (!this.centralPlant) return null
      
      if (category) {
        return this.centralPlant.getMetadata(category)
      }
      
      return this.centralPlant.getAllMetadata()
    },

    /**
     * Update scene metadata
     * @param {string} category - The metadata category to update
     * @param {Object} updates - The updates to apply
     */
    updateSceneMetadata(category, updates) {
      if (this.centralPlant) {
        this.centralPlant.updateMetadataCategory(category, updates)
        console.log(`📝 Scene metadata updated for category: ${category}`)
      }
    },

    /**
     * Get scene information summary
     * @returns {Object} Summary of current scene metadata
     */
    getSceneInfoSummary() {
      if (!this.centralPlant) return null
      
      const sceneInfo = this.centralPlant.getMetadata('sceneInfo')
      const lastImport = this.centralPlant.getMetadata('lastImport')
      const projectSettings = this.centralPlant.getMetadata('projectSettings')
      
      return {
        sceneName: sceneInfo?.name || 'Untitled Scene',
        description: sceneInfo?.description || 'No description',
        version: sceneInfo?.version || '1.0.0',
        created: sceneInfo?.created || 'Unknown',
        lastModified: sceneInfo?.lastModified || 'Unknown',
        author: sceneInfo?.author || 'Unknown',
        units: projectSettings?.units || 'metric',
        hasImportedData: !!this.centralPlant.importedSceneData,
        lastImportFile: lastImport?.importInfo?.originalFileName || 'None',
        lastImportTime: lastImport?.importInfo?.importTimestamp || 'None',
        componentsCount: lastImport?.sceneAnalysis?.totalComponents || 0,
        connectionsCount: lastImport?.sceneAnalysis?.totalConnections || 0,
        sceneComplexity: lastImport?.sceneAnalysis?.sceneComplexity || 'unknown'
      }
    },

    /**
     * Export scene metadata to JSON
     * @returns {string} JSON string of all metadata
     */
    exportSceneMetadata() {
      if (!this.centralPlant) return '{}'
      
      const metadata = this.centralPlant.getAllMetadata()
      return JSON.stringify(metadata, null, 2)
    },

    /**
     * Load scene settings from metadata
     */
    applySceneSettingsFromMetadata() {
      if (!this.centralPlant) return
      
      try {
        // Apply viewport settings
        const viewportSettings = this.centralPlant.getMetadata('viewportSettings')
        if (viewportSettings) {
          if (viewportSettings.autoRotate !== undefined) {
            // Apply auto rotation if SceneViewer supports it
            const sceneViewer = this.getActiveSceneViewer()
            if (sceneViewer && sceneViewer.setAutoRotation) {
              sceneViewer.setAutoRotation(viewportSettings.autoRotate)
            }
          }
        }
        
        // Apply project settings
        const projectSettings = this.centralPlant.getMetadata('projectSettings')
        if (projectSettings) {
          // You could apply grid settings, snap settings, etc.
          console.log('📋 Project settings loaded:', projectSettings)
        }
        
        // Apply component settings
        const componentSettings = this.centralPlant.getMetadata('componentSettings')
        if (componentSettings) {
          // You could apply component visualization settings
          console.log('🔧 Component settings loaded:', componentSettings)
        }
        
        console.log('✅ Scene settings applied from metadata')
        
      } catch (error) {
        console.error('❌ Error applying scene settings from metadata:', error)
      }
    },

    /**
     * Save current scene state to metadata
     */
    saveCurrentSceneStateToMetadata() {
      if (!this.centralPlant) return
      
      try {
        // Update scene info with current state
        this.updateSceneMetadata('sceneInfo', {
          lastModified: new Date().toISOString(),
          currentMode: this.sandboxMode,
          currentContext: this.sceneContext,
          componentsLoaded: this.loadedComponents.length,
          connectionsActive: this.currentSceneConnections.length
        })
        
        // Update viewport settings with current state
        this.updateSceneMetadata('viewportSettings', {
          quadMode: this.quadMode,
          currentSandboxMode: this.sandboxMode,
          currentSceneContext: this.sceneContext
        })
        
        // Update component settings
        this.updateSceneMetadata('componentSettings', {
          selectedComponentsCount: this.selectedComponents.length,
          hasSelectedTransformObject: !!this.selectedTransformObject,
          currentTransformMode: this.transformMode
        })
        
        console.log('💾 Current scene state saved to metadata')
        
      } catch (error) {
        console.error('❌ Error saving scene state to metadata:', error)
      }
    }
  }
}
</script>

<style scoped>
  /* Import Rubik Mono One font for app title */
  @import url('https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap');
  .rubik-mono-one-regular {
    font-family: "Rubik Mono One", monospace;
    font-weight: 100;
    font-style: normal;
  }

  /* Prevent scroll bars on body */
  body{
    overflow: hidden;
  }
</style>