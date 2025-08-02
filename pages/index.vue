<template>  
<!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">     
    
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
    
    <v-btn
      color="primary"
      class="mb-n4"
      @click="openFileImport"
      style="position:absolute; left:10px; top:10px; z-index:99; background:white"
      elevation="4"
    >
      <v-icon small class="mr-1">mdi-import</v-icon>
      Import
    </v-btn>

    <!-- Main content area - flexible layout with primary viewport and drawer -->    
    <div style="display: flex; height: calc(100vh); width: 100%; overflow: hidden;">      
      <div 
        id="scene-container" 
        ref="sceneContainer"
        style="width: 100%; height: 100%; position: relative; background-color: #ffffff;"
      >
        <!-- Scene content will be rendered here -->
      </div>   
    </div>    

    <!-- Translation Controls - Bottom Center -->
    <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; gap: 10px; align-items: center;">
      <!-- Add Component Dropdown -->
      <!-- <v-select
        v-model="selectedLibraryId"
        :items="availableLibraryIds"
        item-text="name"
        item-value="id"
        label="Select Component"
        dense
        outlined
        style="min-width: 200px; background: white;"
        hide-details
      >
        <template v-slot:prepend-inner>
          <v-icon small>mdi-cube-outline</v-icon>
        </template>
      </v-select> -->
      
      <v-btn
        color="secondary"
        @click="addComponentExample()"
        :disabled="!sceneViewer || !centralPlant || !selectedLibraryId"
        elevation="4"
      >
        <v-icon small class="mr-1">mdi-plus</v-icon>
        Add Component
      </v-btn>
      
      <v-btn
        color="primary"
        @click="translateComponentExample()"
        :disabled="!sceneViewer || !centralPlant"
        elevation="4"
      >
        <v-icon small class="mr-1">mdi-axis-arrow</v-icon>
        Translate Component
      </v-btn>
      
      <v-btn
        color="success"
        @click="updatePathsExample()"
        :disabled="shouldUpdatePaths === false"
        elevation="4"
      >
        <v-icon small class="mr-1">mdi-refresh</v-icon>
        Update Paths
      </v-btn>
      
      <v-btn
        color="info"
        @click="addConnectionExample()"
        :disabled="!sceneViewer || !centralPlant"
        elevation="4"
      >
        <v-icon small class="mr-1">mdi-connection</v-icon>
        Add Connection
      </v-btn>
    </div>
    
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
import { CentralPlant, SceneViewerEnhanced } from '@2112-lab/central-plant'

export default {
  data() {
    return {
      // Scene managers collection - single point of access for all scene utilities
      centralPlant: null,
      sceneViewer: null, // Add reference to the vanilla JS scene viewer
      
      navbarHeight: 64,       // Height of the top navigation bar
      
      selectedFile: null,          // Currently selected file for import
      showFileImport: false,       // Whether to show the file import UI
      fileErrorMessage: null,      // Error message for file validation
      
      // Scene connections data
      currentSceneConnections: [],    // Current scene connections data for the connections tab
      
      // Preloading states      
      isPreloadingModels: false,
      preloadingProgress: null,
      
      // Component dictionary for mapping libraryId to component data
      componentDictionary: null,

      shouldUpdatePaths: false,
      
      // Component selection for adding new components
      selectedLibraryId: 'PUMP',
      availableLibraryIds: [
        { id: 'PUMP', name: 'PUMP' },
        { id: 'CHILLER', name: 'CHILLER' },
        { id: 'COOLING-TOWER', name: 'COOLING-TOWER' }
      ],
      
      // Snackbar notification state
      snackbar: {
        show: false,
        text: '',
        color: 'info',
        timeout: 3000
      },
    };
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
      this.showFileImport = true;
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
        } catch (error) {
          console.error('❌ Error loading new scene:', error)
        }
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
        this.centralPlant = new CentralPlant(null)
        console.log('🏗️ CentralPlant initialized from index.vue:', this.centralPlant)
      }
      return this.centralPlant
    },

    /**
     * Example method demonstrating how to use the centralPlant.add() API
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
            x: -6.5, 
            y: 0, 
            z: 1.5
          },
          rotation: {
            x: 0, 
            y: 3.141593, 
            z: 0
          }
        }
        // Add the component using the centralPlant.add() API
        const addedComponent = this.centralPlant.add(this.selectedLibraryId, options)
        
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
          
          return addedComponent
        } else {
          console.error('❌ Failed to add component - centralPlant.add() returned null/undefined')
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

      // Hard-coded example of translate() param values
      const componentId = 'COOLING-TOWER';
      const axis = 'x';
      const value = 2.5;
      
      this.centralPlant.translate(componentId, axis, value)

      this.shouldUpdatePaths = true;
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

      try {
        // Example connection between a cooling tower and pump connector
        const fromConnectorId = 'COOLING-TOWER-CONNECTOR-1'
        const toConnectorId = 'PUMP-1-CONNECTOR-2'
        
        // Add the connection using the centralPlant.addConnection() API
        const addedConnection = this.centralPlant.addConnection(fromConnectorId, toConnectorId)
        
        if (addedConnection) {
          console.log('✅ Connection added successfully:', addedConnection)
          
          // Show success message with connection info
          this.showSnackbar(`Connection added: ${fromConnectorId} → ${toConnectorId}`, 'success')
          
          // Enable update paths button since we added a new connection
          this.shouldUpdatePaths = true
          
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

<style scoped>
  /* Import Rubik Mono One font for app title */
  @import url('https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap');
  .rubik-mono-one-regular {
    font-family: "Rubik Mono One", monospace;
    font-weight: 100;
    font-style: normal;
  }
</style>