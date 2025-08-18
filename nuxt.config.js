import path from 'path';
const TerserPlugin = require('terser-webpack-plugin')
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default {
  // Disable server-side rendering: https://go.nuxtjs.dev/ssr-mode
  ssr: false,

  env: {
    DEFAULT_CENTRAL_PLANT_URL: './mock-data/cp-01-04.json'
  },

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Central Plant Demo',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],
  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: [
    { path: "~/components", extensions: ["vue"], pathPrefix: false }, // (pathPrefix: false) for auto-import from all subdirectories
  ],

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/vuetify',
  ],
  vuetify: {
    // Vuetify options
    theme: { dark: false },
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/axios',
    '@nuxtjs/dotenv'
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    extend(config, { isDev, isClient }) {
      console.log("Loaded LOCAL_DEV:", process.env.LOCAL_DEV);
      if (process.env.LOCAL_DEV === 'true') {
        // Use different paths for development vs production
        const centralPlantPath = isDev 
          ? path.resolve(__dirname, 'central-plant/src/index.js')
          : path.resolve(__dirname, 'central-plant/dist/bundle/index.js');
        config.resolve.alias['@2112-lab/central-plant'] = centralPlantPath;
      }

      if (!isDev && isClient) { // Apply only in production and for client-side
        config.optimization.minimizer = [
          new TerserPlugin({
            terserOptions: {
              mangle: true,
              compress: true
            }
          })
        ];
      }
    },
    babel: {
      presets: [
        ['@babel/preset-env', { 
          targets: { 
            browsers: ['> 1%', 'last 2 versions', 'not dead'] 
          },
          loose: true
        }]
      ],
      plugins: [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        '@babel/plugin-proposal-class-properties'
      ]
    },    
    transpile: [
      '@2112-lab/pathfinder',
      'ufo',
      '@2112-lab/central-plant'
    ]
  }
}
