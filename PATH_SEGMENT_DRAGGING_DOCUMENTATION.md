# Path Segment Dragging: From Automatic to Manual Segments

## Overview

The Central Plant Demo application implements a sophisticated system for handling path segments that can transition from automatically generated (computed) paths to manually positioned (declared) segments through user interaction. This document details the complete workflow, from initial path generation through drag transformation and scene data persistence.

## System Architecture

The path segment dragging system involves three primary components:

1. **Central Plant Module** - Manages pathfinding logic and scene data
2. **Pathfinder Class** - Generates automatic paths between connectors  
3. **Transform Controls** - Handles user interaction and drag operations

## Path Segment Lifecycle

### 1. Initial Path Generation (Automatic)

When connections are established between components, the system automatically generates paths:

```javascript
// PathfindingManager.initializePathfinder()
const pathfindingResult = await this._executePathfinding(
  data.scene, 
  data.connections, 
  { createGateways: true, context: 'Scene Loading' }
);
```

**Key Steps:**
- The **Pathfinder** class uses A* algorithm to find optimal routes
- Paths are generated as arrays of 3D points between connectors
- The **PathfindingManager** creates visual pipe segments from these paths
- Each segment receives `userData` marking it as automatically generated

### 2. Pipe Segment Creation

Automatic segments are created with specific metadata:

```javascript
// PathfindingManager.createPipePaths()
cylinder.userData = {
  isPipeSegment: true,
  segmentId: `pipe-segment-${pathData.from}-${pathData.to}-${j}`,
  segmentIndex: j,
  pathFrom: pathData.from,
  pathTo: pathData.to,
  pathIndex: index,
  length: length.toFixed(2),
  // Initially, isManuallyPositioned is undefined (automatic)
}
```

**Important Properties:**
- `isPipeSegment: true` - Identifies the object as a draggable pipe segment
- `segmentId` - Unique identifier for the segment
- `pathFrom/pathTo` - Connection endpoints this segment belongs to
- `isManuallyPositioned` - Initially undefined (automatic), set to `true` when manually positioned

## User Interaction: Drag Transformation

### 3. Transform Controls Setup

The **TransformControlsManager** handles user selection and drag operations:

```javascript
// SceneViewerEnhanced.isSelectableObject()
const isPipeSegment = object.userData?.isPipeSegment === true
if (isPipeSegment) {
  return true // Allow pipe segments to be selected
}
```

**Selection Process:**
- Single-click: Shows transform controls and bounding box
- Double-click: Full selection with tooltips
- Pipe segments are specifically made selectable for transformation

### 4. Drag Operation Mechanics

When a user drags a pipe segment:

```javascript
// TransformControls.pointerMove()
if (mode === 'translate') {
  // Apply translate with snap constraints
  this._offset.copy(this.pointEnd).sub(this.pointStart);
  
  // Apply translation snap if configured
  if (this.translationSnap) {
    object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
    // ... similar for Y and Z axes
  }
}
```

**Transform Features:**
- Grid snapping (default 0.5 units)
- Real-time visual feedback
- Coordinate constraints (X, Y, Z axes)
- Underground prevention (moves segments to surface if y < 0)

## Transition to Manual Segment

### 5. Transform End Handling

When a drag operation completes, the segment transitions from automatic to manual:

```javascript
// SceneViewerEnhanced.onTransformEnd()
if (object && object.userData && object.userData.isPipeSegment) {
  if (this.pathfindingManager && this.currentSceneData) {
    this.pathfindingManager.handleManualSegmentTransformation(object, this.currentSceneData)
  }
}
```

### 6. Manual Segment Transformation Process

The **PathfindingManager** handles the complex transformation process:

```javascript
// PathfindingManager.handleManualSegmentTransformation()
handleManualSegmentTransformation(segment, currentSceneData) {
  // 1. Calculate new segment endpoints
  const segmentEndpoints = this.calculateSegmentEndpoints(segment);
  
  // 2. Create connectors at endpoints
  const connectors = this.createSegmentConnectors(segment, segmentEndpoints);
  
  // 3. Add connectors to scene
  this.addConnectorsToScene(connectors);
  
  // 4. Convert connected gateways to manual
  this.convertConnectedGatewaysToManual(connectors, currentSceneData);
  
  // 5. Find and restructure original connection
  const originalConnection = this.findOriginalConnection(segment, currentSceneData.connections);
  this.restructureConnections(originalConnection, connectors, currentSceneData);
  
  // 6. Mark segment as manually positioned
  segment.userData.isManuallyPositioned = true;
  segment.userData.manualConnectors = connectors.map(c => c.uuid);
  
  // 7. Add to scene data
  this.addManualSegmentToSceneData(segment);
}
```

## Connection Restructuring

### 7. Connector Generation

When a segment becomes manual, connectors are created at its endpoints:

```javascript
// PathfindingManager.createSegmentConnectors()
createSegmentConnectors(segment, endpoints) {
  const connectors = [];
  
  ['start', 'end'].forEach((position, index) => {
    const connector = new THREE.Mesh(geometry, material);
    connector.position.copy(endpoints[position]);
    
    connector.userData = {
      componentType: 'connector',
      connectorId: `${segment.userData.segmentId}-${position}`,
      manualSegmentUuid: segment.uuid,
      // ... additional metadata
    };
    
    connectors.push(connector);
  });
  
  return connectors;
}
```

### 8. Connection Restructuring

The original connection is split into multiple connections using the new connectors:

```javascript
// PathfindingManager.restructureConnections()
restructureConnections(originalConnection, connectors, currentSceneData) {
  // Remove original connection
  const connectionIndex = currentSceneData.connections.findIndex(/* match logic */);
  if (connectionIndex !== -1) {
    currentSceneData.connections.splice(connectionIndex, 1);
  }
  
  // Add new connections using segment connectors
  const newConnections = [
    { from: originalConnection.from, to: connectors[0].uuid },
    { from: connectors[0].uuid, to: connectors[1].uuid },
    { from: connectors[1].uuid, to: originalConnection.to }
  ];
  
  currentSceneData.connections.push(...newConnections);
}
```

## Path Regeneration

### 9. Automatic Path Preservation

When paths are regenerated, manually positioned segments are preserved:

```javascript
// PathfindingManager.createPipePaths()
// Check if this segment has been manually positioned
let isManuallyPositioned = false;
component.scene.traverse((sceneObj) => {
  if (sceneObj.userData && sceneObj.userData.isPipeSegment && sceneObj.userData.isManuallyPositioned) {
    if (sceneObj.userData.segmentId === `pipe-segment-${pathData.from}-${pathData.to}-${j}`) {
      isManuallyPositioned = true;
    }
  }
});

if (isManuallyPositioned) {
  console.log(`🔒 Skipping segment creation for manually positioned segment`);
  continue; // Skip automatic generation for this segment
}
```

### 10. Computed Object Cleanup

When regenerating paths, the system preserves manual segments while removing automatic ones:

```javascript
// PathfindingManager.removeComputedObjects()
removeComputedObjects() {
  const objectsToRemove = [];
  
  this.sceneViewer.scene.traverse((obj) => {
    if (obj.name && obj.name.toLowerCase().includes("polyline")) {
      const manualSegments = [];
      obj.traverse((child) => {
        if (child.userData && child.userData.isPipeSegment && child.userData.isManuallyPositioned) {
          manualSegments.push(child);
        }
      });
      
      if (manualSegments.length === 0) {
        objectsToRemove.push(obj); // Remove entire polyline if no manual segments
      } else {
        // Preserve manual segments, remove automatic ones
        // ... selective removal logic
      }
    }
  });
}
```

## Scene Data Persistence

### 11. Scene Data Integration

Manual segments are integrated into the scene data structure for persistence:

```javascript
// PathfindingManager.addManualSegmentToSceneData()
addManualSegmentToSceneData(segment) {
  const sceneDataSegment = {
    uuid: segment.uuid,
    name: segment.name,
    type: segment.type,
    userData: { ...segment.userData },
    position: { x: segment.position.x, y: segment.position.y, z: segment.position.z },
    rotation: { x: segment.rotation.x, y: segment.rotation.y, z: segment.rotation.z },
    scale: { x: segment.scale.x, y: segment.scale.y, z: segment.scale.z }
  };
  
  component.currentSceneData.scene.object.children.push(sceneDataSegment);
}
```

### 12. Gateway Conversion

Connected gateways are converted from computed to declared status:

```javascript
// PathfindingManager.convertConnectedGatewaysToManual()
convertConnectedGatewaysToManual(connectors, currentSceneData) {
  const pathFrom = segment.userData.pathFrom;
  const pathTo = segment.userData.pathTo;
  
  // Find and convert gateways at path endpoints
  const gatewayIds = [pathFrom, pathTo];
  gatewayIds.forEach(gatewayId => {
    if (gatewayId.startsWith('gateway-')) {
      this.convertGatewayToManual(gateway, currentSceneData);
    }
  });
}
```

## Technical Implementation Details

### Transform Controls Configuration

```javascript
// TransformControlsManager setup
this.transformControls.translationSnap = 0.5; // Grid snapping
this.transformControls.showX = true;
this.transformControls.showY = true; 
this.transformControls.showZ = true;
```

### Pathfinder Integration

The Pathfinder class supports virtual segments for manual positioning:

```javascript
// PathManager.findPathWithVirtualSegments()
findPathWithVirtualSegments(startKey, endKey, occupied, startSegment, endSegment) {
  // Handle paths that connect to manually positioned segments
  // Mark manual segment voxels as occupied
  // Generate paths around manual constraints
}
```

### Event Flow

1. **User clicks** pipe segment → TransformControlsManager selects object
2. **User drags** segment → TransformControls updates position with snapping
3. **User releases** drag → onTransformEnd triggered
4. **Transformation handling** → PathfindingManager processes manual segment
5. **Connection restructuring** → New connectors and connections created
6. **Scene data update** → Manual segment persisted to scene data
7. **Path regeneration** → Future path updates preserve manual segments

## Key Features

### Grid Snapping
- Default 0.5 unit grid alignment
- Configurable snap values per axis
- Visual feedback during drag operations

### Collision Prevention
- Underground detection (y < 0)
- Automatic surface positioning
- Bounding box overlap detection

### State Management
- Clear distinction between automatic and manual segments
- Persistent scene data integration
- Selective preservation during path regeneration

### Visual Feedback
- Transform controls with axis constraints
- Bounding box highlighting
- Real-time position updates
- Color-coded status indicators

## Error Handling

The system includes comprehensive error handling:

- **Missing pathfinder**: Graceful degradation when pathfinding unavailable
- **Invalid segments**: Validation of pipe segment properties
- **Connection errors**: Fallback handling for connection restructuring
- **Scene data corruption**: Defensive programming for data persistence

This architecture ensures that users can seamlessly transition from automatically generated paths to manually positioned segments while maintaining system stability and data integrity.
