# Skybox Assets

This folder contains all skybox and environment map assets for the 3D pathfinding application.

## Files

- **sky_fallback.jpg** - JPEG fallback skybox texture used when HDR files fail to load
- **kloofendal_48d_partly_cloudy_puresky_2k.hdr** - High-quality 2K HDR environment map (primary)
- **kloofendal_48d_partly_cloudy_puresky_1k.hdr** - Lower resolution 1K HDR environment map (fallback)

## Usage

The application will attempt to load HDR files in order of preference:
1. 2K HDR file (best quality)
2. 1K HDR file (fallback)
3. JPEG skybox (final fallback)

All files in this folder are accessed via the `/skyboxes/` URL path in the application.
