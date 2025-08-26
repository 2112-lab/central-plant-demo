<template>  
<!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">     
    
    <!-- Top navigation bar -->
    <v-app-bar 
      color="#fff"
      style="
        font-family:'Amazon Ember', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; 
        position:relative; 
        z-index:1; 
        height: 64px !important; 
        min-height: 64px !important; 
        max-height: 64px !important;
      "
    >
      <!-- App title with link to home -->
      <v-toolbar-title>
        <router-link to="/" style="text-decoration: none; color: inherit;">
          <span class="rubik-mono-one-regular">Central Plant Demo</span>
        </router-link>
      </v-toolbar-title>

    </v-app-bar>
    
    <!-- Hidden file input for direct file picking -->
    <input 
      ref="fileInput"
      type="file" 
      accept=".json"
      @change="handleDirectFileImport"
      style="display: none;"
    />

    <!-- Main content area - flexible layout with primary viewport and right sidebar -->    
    <div style="display: flex; width: 100%; overflow: hidden; margin-top: 64px;">      
      <div 
        id="scene-container" 
        ref="sceneContainer"
        style="position:absolute; top:84px; left:20px; right:420px; bottom:20px; box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
      >
        <!-- Scene content will be rendered here -->
      </div>   
    </div>    

    <!-- API Examples Panel - Right Sidebar -->
    <div style="position: fixed; top: 84px; right: 20px; bottom: 20px; width: 380px; z-index: 100;">
      <v-card 
        elevation="4" 
        style="height: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; flex-direction: column;"
      >
        <!-- Header -->
        <v-card-title class="py-3">
          <v-icon class="mr-2">mdi-api</v-icon>
          <span class="text-h6">API Examples</span>
          <v-spacer></v-spacer>
          <a 
            href="https://central-plant-api-docs.s3.us-east-1.amazonaws.com/v0.1.24/CentralPlant.html" 
            target="_blank" 
            class="text-decoration-none"
          >
            <v-btn 
              x-small 
              outlined 
              color="primary"
              class="mr-2"
            >
              Docs
              <v-icon small class="ml-1">mdi-open-in-new</v-icon>
            </v-btn>
          </a>
          <a 
            href="https://drive.google.com/drive/u/0/folders/1EL6EWRr10p6Y6-vlU4qYAawyn6Ck9J5R" 
            target="_blank" 
            class="text-decoration-none"
          >
            <v-btn 
              x-small 
              outlined 
              color="primary"
            >
              Samples
              <v-icon small class="ml-1">mdi-open-in-new</v-icon>
            </v-btn>
          </a>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <!-- Content -->
        <div style="flex: 1; overflow-y: auto; padding: 16px;">
          
          <!-- Add Component Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.addComponent = !expandedSections.addComponent"
            >
              <v-icon small class="mr-2" color="primary">mdi-plus</v-icon>
              <span class="font-weight-medium">Add Component</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.addComponent }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.addComponent" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Add a new component to the scene with positioning options
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">addComponent(libraryId)</code>
                </div>
                
                <v-select
                  v-model="selectedLibraryId"
                  :items="availableLibraryIds"
                  item-text="name"
                  item-value="id"
                  label="libraryId"
                  prepend-icon="mdi-cube-outline"
                  dense
                  outlined
                  class="mt-4 mb-n3"
                />
                
                <v-btn
                  color="primary"
                  @click="addComponentExample"
                  :disabled="!sceneViewer || !centralPlant || !selectedLibraryId"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-plus</v-icon>
                  Add Component
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Translate Component Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.translateComponent = !expandedSections.translateComponent"
            >
              <v-icon small class="mr-2" color="success">mdi-axis-arrow</v-icon>
              <span class="font-weight-medium">Translate Component</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.translateComponent }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.translateComponent" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Position your component as needed in the 3D scene
                </div>

                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">translate(componentId, axis, value)</code>
                </div>
                
                <v-select
                  v-model="selectedComponentIdForTranslation"
                  :items="availableComponentIdsForTranslation"
                  item-text="text"
                  item-value="id"
                  label="componentId"
                  prepend-icon="mdi-cube-outline"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant || availableComponentIdsForTranslation.length === 0"
                  persistent-hint
                  class="mt-4 mb-n2"
                />
                
                <v-select
                  v-model="selectedAxisForTranslation"
                  :items="[
                    { text: 'x', value: 'x' },
                    { text: 'y', value: 'y' },
                    { text: 'z', value: 'z' }
                  ]"
                  item-text="text"
                  item-value="value"
                  label="axis"
                  prepend-icon="mdi-axis"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant"
                  class="mb-n2"
                />
                
                <v-text-field
                  v-model.number="selectedValueForTranslation"
                  label="value"
                  type="number"
                  step="0.5"
                  prepend-icon="mdi-numeric"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant"
                  :rules="[validateMultipleOfHalf]"
                  hint="Translation distance in 3D units (must be multiple of 0.5)"
                  class="mb-2"
                  persistent-hint
                />
                
                <v-btn
                  color="success"
                  @click="translateComponentExample"
                  :disabled="!sceneViewer || !centralPlant || !selectedComponentIdForTranslation"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-axis-arrow</v-icon>
                  Apply Translation
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Rotate Component Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.rotateComponent = !expandedSections.rotateComponent"
            >
              <v-icon small class="mr-2" color="warning">mdi-rotate-3d</v-icon>
              <span class="font-weight-medium">Rotate Component</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.rotateComponent }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.rotateComponent" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Rotate your component around any axis in the 3D scene
                </div>

                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">rotate(componentId, axis, value)</code>
                </div>
                
                <v-select
                  v-model="selectedComponentIdForRotation"
                  :items="availableComponentIdsForRotation"
                  item-text="text"
                  item-value="id"
                  label="componentId"
                  prepend-icon="mdi-cube-outline"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant || availableComponentIdsForRotation.length === 0"
                  persistent-hint
                  class="mt-4 mb-n2"
                />
                
                <v-select
                  v-model="selectedAxisForRotation"
                  :items="[
                    { text: 'x', value: 'x' },
                    { text: 'y', value: 'y' },
                    { text: 'z', value: 'z' }
                  ]"
                  item-text="text"
                  item-value="value"
                  label="axis"
                  prepend-icon="mdi-axis"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant"
                  class="mb-n2"
                />
                
                <v-text-field
                  v-model.number="selectedValueForRotation"
                  label="value (degrees)"
                  type="number"
                  step="15"
                  prepend-icon="mdi-rotate-right"
                  dense
                  outlined
                  :disabled="!sceneViewer || !centralPlant"
                  :rules="[validateRotationDegrees]"
                  hint="Rotation angle in degrees (e.g., 45, 90, 180, -90)"
                  class="mb-2"
                  persistent-hint
                />
                
                <v-btn
                  color="warning"
                  @click="rotateComponentExample"
                  :disabled="!sceneViewer || !centralPlant || !selectedComponentIdForRotation"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-rotate-3d</v-icon>
                  Apply Rotation
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Add Connection Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.addConnection = !expandedSections.addConnection"
            >
              <v-icon small class="mr-2" color="info">mdi-connection</v-icon>
              <span class="font-weight-medium">Add Connection</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.addConnection }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.addConnection" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Connect components together to create flow paths
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">addConnection(source, destination)</code>
                </div>
                
                <div class="d-flex align-center mb-3 pa-2" style="background-color: #f5f5f5; border-radius: 4px;">
                  <v-icon small class="mr-2" color="info">mdi-information-outline</v-icon>
                  <span class="text-caption text--secondary">
                    Available connections: {{ availableConnectorIds.length }}
                  </span>
                </div>
                
                <v-select
                  v-model="selectedSourceConnector"
                  :items="availableConnectorIds"
                  item-text="text"
                  item-value="id"
                  label="source"
                  prepend-icon="mdi-connection"
                  dense
                  outlined
                  class="mt-4 mb-n3"
                  :disabled="!sceneViewer || !centralPlant || availableConnectorIds.length === 0"
                />
                
                <v-select
                  v-model="selectedDestinationConnector"
                  :items="availableConnectorIds"
                  item-text="text"
                  item-value="id"
                  label="destination"
                  prepend-icon="mdi-connection"
                  dense
                  outlined
                  class="mb-3"
                  :disabled="!sceneViewer || !centralPlant || availableConnectorIds.length === 0"
                />
                
                <v-btn
                  color="info"
                  @click="addConnectionExample"
                  :disabled="!sceneViewer || !centralPlant || !selectedSourceConnector || !selectedDestinationConnector || selectedSourceConnector === selectedDestinationConnector"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-connection</v-icon>
                  Add Connection
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Update Paths Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.updatePaths = !expandedSections.updatePaths"
            >
              <v-icon small class="mr-2" color="success">mdi-refresh</v-icon>
              <span class="font-weight-medium">Update Paths</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.updatePaths }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.updatePaths" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Update and finalize all connection paths
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">updatePaths()</code>
                </div>
                
                <v-btn
                  color="success"
                  @click="updatePathsExample"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-refresh</v-icon>
                  Update Paths
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Import Scene Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.importScene = !expandedSections.importScene"
            >
              <v-icon small class="mr-2" color="info">mdi-import</v-icon>
              <span class="font-weight-medium">Import Scene</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.importScene }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.importScene" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Import a JSON scene file to load components and connections
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="text-primary">importScene(jsonData)</code>
                </div>
                
                <v-btn
                  color="info"
                  @click="openFileImport"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-import</v-icon>
                  Import Scene File
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

        </div>
        
      </v-card>
    </div>
      
  </v-app>
</template>
  
<script>
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

export default {
  data() {
    return {
      // Scene managers collection - single point of access for all scene utilities
      centralPlant: null,
      sceneViewer: null, // Add reference to the vanilla JS scene viewer
      
      navbarHeight: 64,       // Height of the top navigation bar
      
      // Collapsible sections state
      expandedSections: {
        addComponent: true,
        translateComponent: false,
        rotateComponent: false,
        addConnection: false,
        updatePaths: false,
        importScene: false
      },
      
      // Scene connections data
      currentSceneConnections: [],    // Current scene connections data for the connections tab
      
      // Preloading states      
      isPreloadingModels: false,
      preloadingProgress: null,
      
      // Component dictionary for mapping libraryId to component data
      componentDictionary: null,

      shouldUpdatePaths: false,
      
      // Component selection for adding new components
      selectedLibraryId: 'COOLING-TOWER',
      availableLibraryIds: [
        { id: 'PUMP', name: 'PUMP' },
        { id: 'CHILLER', name: 'CHILLER' },
        { id: 'COOLING-TOWER', name: 'COOLING-TOWER' }
      ],
      
      // Component selection for translation
      selectedComponentIdForTranslation: 'COOLING-TOWER',
      selectedAxisForTranslation: 'x',
      selectedValueForTranslation: 2.5,
      
      // Component selection for rotation
      selectedComponentIdForRotation: 'COOLING-TOWER',
      selectedAxisForRotation: 'z',
      selectedValueForRotation: 90,
      
      // Connection selection for adding new connections
      selectedSourceConnector: null,
      selectedDestinationConnector: null,
      
      // Snackbar notification state
      snackbar: {
        show: false,
        text: '',
        color: 'info',
        timeout: 3000
      },
    };
  },
  
  // Computed properties
  computed: {
    /**
     * Get available component IDs for translation dropdown
     * @returns {Array} Array of component ID objects with id and text properties
     */
    availableComponentIdsForTranslation() {
      if (!this.centralPlant) {
        return []
      }
      
      try {
        const componentIds = this.centralPlant.getComponentIds()
        return componentIds.map(id => ({
          id: id,
          text: id
        }))
      } catch (error) {
        console.warn('⚠️ Error getting component IDs:', error)
        return []
      }
    },
    
    /**
     * Get available component IDs for rotation dropdown
     * @returns {Array} Array of component ID objects with id and text properties
     */
    availableComponentIdsForRotation() {
      if (!this.centralPlant) {
        return []
      }
      
      try {
        const componentIds = this.centralPlant.getComponentIds()
        return componentIds.map(id => ({
          id: id,
          text: id
        }))
      } catch (error) {
        console.warn('⚠️ Error getting component IDs:', error)
        return []
      }
    },
    
    /**
     * Get available connector IDs for connection dropdown
     * @returns {Array} Array of connector ID objects with id and text properties
     */
    availableConnectorIds() {
      if (!this.centralPlant) {
        return []
      }
      
      try {
        const connectorIds = this.centralPlant.getAvailableConnections()
        return connectorIds.map(id => ({
          id: id,
          text: id
        }))
      } catch (error) {
        console.warn('⚠️ Error getting available connections:', error)
        return []
      }
    }
  },
  
  // Watch for changes to reactive data properties
  watch: {
  },
    // Lifecycle hook - called after the instance has been mounted
  created() {
    // Initialize the CentralPlant early - before component mounting
    this.initializeCentralPlant();
  },
  
  async mounted() {
    if(process.env.LOCAL_DEV) {
      setTimeout(() => {
        // Automatically rotate CHILLER-1 if it exists in the loaded scene
        // this.autoRotateChiller()
      }, 1000)
    }
    
    // Start model preloading immediately when the page loads
    this.initializeModelPreloading();

    // Initialize the vanilla JavaScript scene viewer
    await this.initializeSceneViewer();
  },
  
  // Lifecycle hook - called before the instance is destroyed
  beforeDestroy() {
    // Clean up Nuxt event listeners
    this.$nuxt.$off('loadNewScene', this.handleLoadNewScene)
    this.$nuxt.$off('createNewScene', this.handleCreateNewScene)
    
    // Clean up the scene viewer
    if (this.sceneViewer) {
      try {
        this.sceneViewer.dispose()
        this.sceneViewer = null
        console.log('🧹 SceneViewer disposed from index.vue')
      } catch (error) {
        console.error('Error disposing SceneViewer:', error)
      }
    }
    
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
  },
    
  // Methods section - contains all component methods
  methods: {

    openFileImport() {
      console.log("openFileImport started");
      // Directly trigger the file input
      this.$refs.fileInput.click();
    },
    
    // Handle direct file import from hidden input
    async handleDirectFileImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await this.readFileAsText(file);
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
          }
          
          // Emit event to SceneViewer to reload with new data
          this.$nuxt.$emit('loadNewScene', jsonData);
          
          // Show success message
          this.showSnackbar('Scene and connections loaded successfully!', 'success');
          
          console.log('Scene loaded successfully');
        } else {
          this.showSnackbar('Invalid central-plant JSON format. Please select a valid scene file.', 'error');
        }
      } catch (error) {
        console.error('Error reading/parsing JSON file:', error);
        this.showSnackbar('Error reading or parsing the JSON file. Please check the file format.', 'error');
      }
      
      // Clear the input for next use
      event.target.value = '';
    },
    
    // Show the file import dialog
    showFileImportDialog() {
      // This method is no longer needed but kept for backward compatibility
      this.openFileImport();
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
              
      } catch (error) {
        console.error('❌ Failed to initialize model preloading:', error)      
      } finally {
        this.isPreloadingModels = false
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

    /**
     * Initialize the vanilla JavaScript scene viewer
     */
    async initializeSceneViewer() {
      try {
        // Get the container element
        const container = this.$refs.sceneContainer
        if (!container) {
          console.error('❌ Scene container element not found')
          return false
        }

        // Create the scene viewer instance
        this.sceneViewer = new SceneViewerEnhanced(container, this.centralPlant, this)

        // Initialize the scene viewer
        const success = await this.sceneViewer.init()
        
        if (success) {
          console.log('✅ Vanilla JavaScript SceneViewer initialized successfully')
          
          // Set up Nuxt event listeners for scene operations
          this.$nuxt.$on('loadNewScene', this.handleLoadNewScene)
          this.$nuxt.$on('createNewScene', this.handleCreateNewScene)
          
          return true
        } else {
          console.error('❌ Failed to initialize SceneViewer')
          return false
        }
      } catch (error) {
        console.error('❌ Error initializing SceneViewer:', error)
        return false
      }
    },

    /**
     * Handle loading new scene from Nuxt events
     */
    async handleLoadNewScene(sceneData) {
      if (this.sceneViewer && sceneData) {
        try {
          await this.sceneViewer.loadSceneFromData(sceneData)
          console.log('✅ New scene loaded via Nuxt event')
          
          // Reset and auto-select first component for translation after scene loads
          this.$nextTick(() => {
            this.selectedComponentIdForTranslation = null
            this.selectedComponentIdForRotation = null
            if (this.availableComponentIdsForTranslation.length > 0) {
              this.selectedComponentIdForTranslation = this.availableComponentIdsForTranslation[0].id
              console.log('🎯 Auto-selected component for translation after scene load:', this.selectedComponentIdForTranslation)
            }
            if (this.availableComponentIdsForRotation.length > 0) {
              this.selectedComponentIdForRotation = this.availableComponentIdsForRotation[0].id
              console.log('🎯 Auto-selected component for rotation after scene load:', this.selectedComponentIdForRotation)
            }
          })
        } catch (error) {
          console.error('❌ Error loading new scene:', error)
        }
      }
    },

    /**
     * Automatically rotate CHILLER-1 component if it exists in the scene
     * This method is called after a scene is loaded to demonstrate automatic component manipulation
     */
    autoRotateChiller() {
      if (!this.centralPlant) {
        console.warn('⚠️ CentralPlant not available for auto-rotation')
        return
      }

      try {
        // Get all component IDs to check if CHILLER-1 exists
        const componentIds = this.centralPlant.getComponentIds()
        
        if (componentIds.includes('CHILLER-1')) {
          console.log('🔄 Auto-rotating CHILLER-1 component...')
          
          // Rotate CHILLER-1 by 90 degrees around the Y axis
          this.centralPlant.rotate('CHILLER-1', 'y', 90)
          
          // Update paths after rotation
          this.centralPlant.updatePaths()
          
          console.log('✅ CHILLER-1 automatically rotated 90° around Y axis')
          this.showSnackbar('CHILLER-1 automatically rotated after scene load', 'success')
        } else {
          console.log('ℹ️ CHILLER-1 component not found in loaded scene')
        }
      } catch (error) {
        console.error('❌ Error auto-rotating CHILLER-1:', error)
        this.showSnackbar(`Error auto-rotating CHILLER-1: ${error.message}`, 'error')
      }
    },

    /**
     * Handle creating new empty scene from Nuxt events
     */
    handleCreateNewScene() {
      if (this.sceneViewer) {
        try {
          this.sceneViewer.createEmptyScene()
          console.log('✅ New empty scene created via Nuxt event')
          
          // Reset translation component selection for new empty scene
          this.selectedComponentIdForTranslation = null
          this.selectedComponentIdForRotation = null
        } catch (error) {
          console.error('❌ Error creating new scene:', error)
        }
      }
    },

    /**
     * Initialize the CentralPlant for accessing scene utilities
     * This is called early in the lifecycle to create the collection instance
     */
    initializeCentralPlant() {
      if (!this.centralPlant) {
        // Initialize with a placeholder - the actual component instance will be set later
        this.centralPlant = new CentralPlant()
        console.log('🏗️ CentralPlant initialized from index.vue:', this.centralPlant)
      }
      return this.centralPlant
    },

    /**
     * Validate that a value is a multiple of 0.5
     * @param {number} value The value to validate
     * @returns {boolean|string} True if valid, error message if invalid
     */
    validateMultipleOfHalf(value) {
      if (value === null || value === undefined || value === '') {
        return 'Value is required'
      }
      
      const numValue = Number(value)
      
      if (isNaN(numValue)) {
        return 'Must be a valid number'
      }
      
      // Check if the value is a multiple of 0.5
      if ((numValue * 2) % 1 !== 0) {
        return 'Value must be a multiple of 0.5 (e.g., 0.5, 1.0, 1.5, 2.0, etc.)'
      }
      
      return true
    },

    /**
     * Validate that a value is a valid number for rotation (degrees)
     * @param {number} value The value to validate
     * @returns {boolean|string} True if valid, error message if invalid
     */
    validateRotationDegrees(value) {
      if (value === null || value === undefined || value === '') {
        return 'Value is required'
      }
      
      const numValue = Number(value)
      
      if (isNaN(numValue)) {
        return 'Must be a valid number'
      }
      
      return true
    },

    /**
     * Example method demonstrating how to use the centralPlant.addComponent() API
     * This method adds a component with the selected libraryId to the scene
     * @returns {Object|false} The added component object if successful, false otherwise
     */
    addComponentExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        this.showSnackbar('CentralPlant not initialized', 'error')
        return false
      }

      if (!this.selectedLibraryId) {
        console.error('❌ No library ID selected')
        this.showSnackbar('Please select a component type first', 'warning')
        return false
      }

      try {
        const options = {
          position: {
            x: -0.5, 
            y: 5.5,  // Flipped Y direction (was -5.5, now positive)
            z: 0
          },
          rotation: {
            x: 0, 
            y: 0, 
            z: 0
          }
        }
        // Add the component using the centralPlant.addComponent() API
        const addedComponent = this.centralPlant.addComponent(this.selectedLibraryId)
        
        if (addedComponent) {
          console.log('✅ Component added successfully:', {
            libraryId: this.selectedLibraryId,
            componentId: addedComponent.uuid || addedComponent.id,
            position: addedComponent.position
          })
          
          // Show success message with component info
          const componentName = this.availableLibraryIds.find(item => item.id === this.selectedLibraryId)?.name || this.selectedLibraryId
          this.showSnackbar(`${componentName} added successfully!`, 'success')
          
          // Enable update paths button since we added a new component
          this.shouldUpdatePaths = true
          
          // Auto-select the first available component for translation if none is selected
          this.$nextTick(() => {
            if (!this.selectedComponentIdForTranslation && this.availableComponentIdsForTranslation.length > 0) {
              this.selectedComponentIdForTranslation = this.availableComponentIdsForTranslation[0].id
              console.log('🎯 Auto-selected component for translation:', this.selectedComponentIdForTranslation)
            }
            if (!this.selectedComponentIdForRotation && this.availableComponentIdsForRotation.length > 0) {
              this.selectedComponentIdForRotation = this.availableComponentIdsForRotation[0].id
              console.log('🎯 Auto-selected component for rotation:', this.selectedComponentIdForRotation)
            }
          })
          
          return addedComponent
        } else {
          console.error('❌ Failed to add component - centralPlant.addComponent() returned null/undefined')
          this.showSnackbar('Failed to add component', 'error')
          return false
        }
      } catch (error) {
        console.error('❌ Error adding component:', error)
        this.showSnackbar(`Error adding component: ${error.message}`, 'error')
        return false
      }
    },

    /**
     * Example method demonstrating how to use the new translate API
     * This method can be called from the browser console for testing
     * Usage: this.$refs.app.translateComponentExample('COMPONENT-ID', 'x', 2.5)
     * @returns {Object|false} The translated component object if successful, false otherwise
     */
    translateComponentExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        return false
      }

      if (!this.selectedComponentIdForTranslation) {
        console.error('❌ No component selected for translation')
        this.showSnackbar('Please select a component to translate', 'warning')
        return false
      }

      // Use the selected component ID from the dropdown
      const componentId = this.selectedComponentIdForTranslation;
      const axis = this.selectedAxisForTranslation;
      const value = this.selectedValueForTranslation;
      
      try {
        this.centralPlant.translate(componentId, axis, value)
        console.log(`✅ Translated component ${componentId} on ${axis} axis by ${value}`)
        this.showSnackbar(`Component ${componentId} translated successfully`, 'success')
        
        this.shouldUpdatePaths = true;
        return true
      } catch (error) {
        console.error('❌ Error translating component:', error)
        this.showSnackbar(`Error translating component: ${error.message}`, 'error')
        return false
      }
    },

    /**
     * Example method demonstrating how to use the new rotate API
     * This method can be called from the browser console for testing
     * Usage: this.$refs.app.rotateComponentExample('COMPONENT-ID', 'y', 45)
     * @returns {Object|false} The rotated component object if successful, false otherwise
     */
    rotateComponentExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        return false
      }

      if (!this.selectedComponentIdForRotation) {
        console.error('❌ No component selected for rotation')
        this.showSnackbar('Please select a component to rotate', 'warning')
        return false
      }

      // Use the selected component ID from the dropdown
      const componentId = this.selectedComponentIdForRotation;
      const axis = this.selectedAxisForRotation;
      const value = this.selectedValueForRotation;
      
      try {
        this.centralPlant.rotate(componentId, axis, value)
        console.log(`✅ Rotated component ${componentId} around ${axis} axis by ${value} degrees`)
        this.showSnackbar(`Component ${componentId} rotated ${value}° around ${axis} axis`, 'success')
        
        this.shouldUpdatePaths = true;
        return true
      } catch (error) {
        console.error('❌ Error rotating component:', error)
        this.showSnackbar(`Error rotating component: ${error.message}`, 'error')
        return false
      }
    },

    updatePathsExample() {        
      if(this.shouldUpdatePaths) {
        this.centralPlant.updatePaths()
        this.showSnackbar(`Paths updated successfully`, 'success')
      }

      this.shouldUpdatePaths = false;
    },

    /**
     * Example method demonstrating how to use the new addConnection API
     * This method adds a connection between two predefined connector IDs
     * @returns {Object|false} The added connection object if successful, false otherwise
     */
    addConnectionExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        this.showSnackbar('CentralPlant not initialized', 'error')
        return false
      }

      if (!this.selectedSourceConnector) {
        console.error('❌ No "from" connector selected')
        this.showSnackbar('Please select a "from" connector', 'warning')
        return false
      }

      if (!this.selectedDestinationConnector) {
        console.error('❌ No "to" connector selected')
        this.showSnackbar('Please select a "to" connector', 'warning')
        return false
      }

      if (this.selectedSourceConnector === this.selectedDestinationConnector) {
        console.error('❌ Cannot connect a connector to itself')
        this.showSnackbar('Cannot connect a connector to itself', 'warning')
        return false
      }

      try {
        // Use the selected connector IDs from the dropdowns
        const fromConnectorId = this.selectedSourceConnector
        const toConnectorId = this.selectedDestinationConnector
        
        // Add the connection using the centralPlant.addConnection() API
        const addedConnection = this.centralPlant.addConnection(fromConnectorId, toConnectorId)
        
        if (addedConnection) {
          console.log('✅ Connection added successfully:', addedConnection)
          
          // Automatically update paths after adding connection
          this.centralPlant.updatePaths()
          console.log('✅ Paths updated automatically after adding connection')
          
          // Show success message with connection info
          this.showSnackbar(`Connection added: ${fromConnectorId} → ${toConnectorId}`, 'success')
          
          // Reset update paths flag since we already updated
          this.shouldUpdatePaths = false
          
          // Clear the selections after successful connection
          this.selectedSourceConnector = null
          this.selectedDestinationConnector = null
          
          return addedConnection
        } else {
          console.error('❌ Failed to add connection - centralPlant.addConnection() returned null/undefined')
          this.showSnackbar('Failed to add connection', 'error')
          return false
        }
      } catch (error) {
        console.error('❌ Error adding connection:', error)
        this.showSnackbar(`Error adding connection: ${error.message}`, 'error')
        return false
      }
    },

    /**
     * Example method demonstrating how to get all current connections
     * This method retrieves all connections from the scene data
     * @returns {Array} Array of connection objects
     */
    getConnectionsExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        return []
      }

      const connections = this.centralPlant.getConnections()
      console.log('🔍 Current connections:', connections)
      
      if (connections.length > 0) {
        this.showSnackbar(`Found ${connections.length} connections`, 'info')
      } else {
        this.showSnackbar('No connections found', 'warning')
      }
      
      return connections
    },

    /**
     * Example method demonstrating how to use the new getAvailableConnections API
     * This method retrieves all connector IDs that are not currently used in connections
     * @returns {Array} Array of available connector ID strings
     */
    getAvailableConnectionsExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        this.showSnackbar('CentralPlant not initialized', 'error')
        return []
      }

      const availableConnectors = this.centralPlant.getAvailableConnections()
      console.log('🔍 Available connector IDs:', availableConnectors)
      
      if (availableConnectors.length > 0) {
        this.showSnackbar(`Found ${availableConnectors.length} available connectors`, 'info')
      } else {
        this.showSnackbar('No available connectors found', 'warning')
      }
      
      return availableConnectors
    },

    /**
     * Example method demonstrating how to use the new getComponentIds API
     * This method retrieves all component IDs from the scene
     * @returns {Array} Array of component ID strings
     */
    getComponentIdsExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        this.showSnackbar('CentralPlant not initialized', 'error')
        return []
      }

      const componentIds = this.centralPlant.getComponentIds()
      console.log('🔍 Current component IDs:', componentIds)
      
      if (componentIds.length > 0) {
        this.showSnackbar(`Found ${componentIds.length} component IDs`, 'info')
      } else {
        this.showSnackbar('No components found', 'warning')
      }
      
      return componentIds
    },

    /**
     * Example method demonstrating how to remove a connection
     * This method removes a predefined connection between two connector IDs
     * @returns {boolean} True if connection was removed, false otherwise
     */
    removeConnectionExample() {
      if (!this.centralPlant) {
        console.error('❌ CentralPlant not initialized')
        this.showSnackbar('CentralPlant not initialized', 'error')
        return false
      }

      try {
        // Example: Remove the same connection we added in addConnectionExample
        const fromConnectorId = 'COOLING-TOWER-CONNECTOR-1'
        const toConnectorId = 'PUMP-1-CONNECTOR-2'
        
        // Remove the connection using the centralPlant.removeConnection() API
        const wasRemoved = this.centralPlant.removeConnection(fromConnectorId, toConnectorId)
        
        if (wasRemoved) {
          console.log('✅ Connection removed successfully')
          
          // Show success message
          this.showSnackbar(`Connection removed: ${fromConnectorId} ↔ ${toConnectorId}`, 'success')
          
          // Enable update paths button since we removed a connection
          this.shouldUpdatePaths = true
          
          return true
        } else {
          console.warn('⚠️ Connection not found or could not be removed')
          this.showSnackbar('Connection not found to remove', 'warning')
          return false
        }
      } catch (error) {
        console.error('❌ Error removing connection:', error)
        this.showSnackbar(`Error removing connection: ${error.message}`, 'error')
        return false
      }
    },

    /**
     * Helper method to get all components in the scene (for testing the translate API)
     * This can be useful to find component IDs for testing
     */
    getSceneComponentIds() {
      if (!this.sceneViewer) {
        console.warn('⚠️ Scene viewer not available')
        return []
      }
      
      const componentIds = []
      
      if (this.sceneViewer.scene) {
        this.sceneViewer.scene.traverse((child) => {
          if (child.userData && child.userData.componentType === 'component') {
            const id = child.uuid || child.userData.originalUuid || child.name
            if (id) {
              componentIds.push({
                id: id,
                name: child.name,
                type: child.userData.componentType,
                libraryId: child.userData.libraryId,
                position: {
                  x: child.position.x.toFixed(3),
                  y: child.position.y.toFixed(3),
                  z: child.position.z.toFixed(3)
                }
              })
            }
          }
        })
      }
      
      console.log(`📋 Found ${componentIds.length} components in scene:`, componentIds)
      return componentIds
    },

    /**
     * Helper method to get all connector IDs in the scene (for testing connection APIs)
     * This can be useful to find connector IDs for making connections
     */
    getSceneConnectorIds() {
      if (!this.sceneViewer) {
        console.warn('⚠️ Scene viewer not available')
        return []
      }
      
      const connectorIds = []
      
      if (this.sceneViewer.scene) {
        this.sceneViewer.scene.traverse((child) => {
          if (child.userData && child.userData.componentType === 'connector') {
            const id = child.uuid || child.userData.originalUuid || child.name
            if (id) {
              connectorIds.push({
                id: id,
                name: child.name,
                type: child.userData.componentType,
                parentComponentId: child.userData.parentComponentId,
                direction: child.userData.direction,
                group: child.userData.group,
                position: {
                  x: child.position.x.toFixed(3),
                  y: child.position.y.toFixed(3),
                  z: child.position.z.toFixed(3)
                }
              })
            }
          }
        })
      }
      
      console.log(`🔌 Found ${connectorIds.length} connectors in scene:`, connectorIds)
      return connectorIds
    },

  }
}
</script>

<style>
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

  /* Track */
  ::-webkit-scrollbar-track {
    background: #f5f5f5; 
  }
  
  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: #ccc; 
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: #999; 
  }

  /* Corner of scrollbars */
  ::-webkit-scrollbar-corner {
    background-color: #f5f5f5; /* Match light theme */
  }
  
  /* Slightly increase font size for card description text */
  .card-description {
    font-size: 14px !important;
  }
  
  /* Style code elements within card descriptions */
  .card-description code {
    font-size: 14px !important;
  }
  
  /* Cursor pointer for clickable sections */
  .cursor-pointer {
    cursor: pointer;
  }
  
  /* Rotate transition for chevron icons */
  .rotate-180 {
    transform: rotate(180deg);
    transition: transform 0.2s ease-in-out;
  }
  
  /* Smooth transition for non-rotated state */
  .v-icon {
    transition: transform 0.2s ease-in-out;
  }
</style>