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
      outlined
      color="primary"
      class="mb-n4"
      @click="openFileImport"
      style="position:absolute; left:10px; top:10px; z-index:99; background:white"
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

    setTimeout(() => {
      console.log("mounted centralPlant:", this.centralPlant);
      console.log("mounted sceneViewer:", this.sceneViewer);
    }, 4000)
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
        
        // Expose preloader to global scope for debugging
        if (typeof window !== 'undefined') {
          window.modelPreloader = modelPreloader
          window.preloaderStats = () => modelPreloader.getCacheStats()
          window.getCentralPlant = () => this.centralPlant
          window.getImportedSceneData = () => this.centralPlant?.importedSceneData
        }        
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

        // Set up event listeners for scene viewer events
        this.sceneViewer.on('sceneDataUpdated', (data) => {
          console.log('Scene data updated:', data)
        })

        this.sceneViewer.on('objectSelected', (object) => {
          console.log('Object selected:', object)
        })

        this.sceneViewer.on('transformUpdate', (transform) => {
          console.log('Transform update:', transform)
        })

        this.sceneViewer.on('sceneChanged', (data) => {
          console.log('Scene changed:', data)
        })

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
        console.log('🏗️ CentralPlant initialized from index.vue')
      }
      return this.centralPlant
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