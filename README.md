# Coordinates
<b>Coordinates</b> is a graphics API for JavaScript enabled web browsers. It has methods for leveraging the HTML5 canvas API to create <b>images</b>, <b>animations</b>, <b>games</b> or <b>artwork</b>. At this time, <b>WebGL</b> is the only supported context, but 2d canvas support is also planned. Note that Coordinates is under active development, and is in alpha stage, subject to architectural revisions that frequently break backward compatibility. It is recommended to fork the project or coordinates.js file at least, if you are building something so as to avoid function parameters changing, etc. <br>
<center>
  
![example0](README_g0.gif) </center>
As a stand-alone module, <b>Coordinates</b> may be included in an HTML5 project, providing a framework for creating graphics <b>viewports, shaders</b>, stock and custom <b>shapes</b>, as well as <b>textures</b>, and a growing library of <b>effects</b>.


## Some example boilerplate
<b>Coordinates</b> uses functional design principles. There are no 'constructors'.<br>Most methods accept options via an object. E.g.
```js
var rendererOptions = {
  fov: 1500,  // field of vision
  ambientLight: .8,
  margin: 10,
  attachToBody: true  // if false, the canvas doesn't show up
}
```

Instantiation works with default settings as well. You can copy the code below  <br>
verbatim, into a file named ``index.html``, and see the result...<br>

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Coordinates boilerplate example</title>
    <style>
      body, html{
        background: #333;
        margin: 0;
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <script type="module">
    
      import * as Coordinates from
      "https://srmcgann.github.io/Coordinates/coordinates.min.js"
    
      // instantiate a canvas, 'renderer'. this is also our 'camera'
      var rendererOptions = {
        ambientLight: .5,
        fov: 1500
      }
      var renderer = await Coordinates.Renderer(rendererOptions)
      
      // back the camera away from the center (move it toward the viewer)
      renderer.z = 10
      
      // tell the API where to find our animation function
      Coordinates.AnimationLoop(renderer, 'Draw')

      // invoke a shader - phong in this case for a pseudo-lighting effect
      var shaderOptions = [
        { uniform: {
          type: 'phong',
          value: .75
        } }
      ]
      var shader = await Coordinates.BasicShader(renderer, shaderOptions)


      // create a scene (it's async, so we can 'await' each call, but that is optional)
      var shapes = []
        // load a cube
      var geoOptions = {
        shapeType: 'cube',
        size: 5,
        color: 0xffffff,
      }
      await Coordinates.LoadGeometry(renderer, geoOptions).then(async (geometry) => {
        shapes.push(geometry)
        await shader.ConnectGeometry(geometry)
      })  
      
      
      window.Draw = () => {
        shapes.forEach(shape => {
          shape.yaw += .01
          shape.pitch += .005
          renderer.Draw(shape)
        })
      }
      
    </script>
  </body>
</html>
```
the result<br>
![example 1](README_g1.gif)
<br><br>

## methods, options, and their defaults
#### Renderer()
``Coordinates.Renderer( rendererOptions )``
##### returns a camera object, creates a canvas, async
```js
var rendererOptions = {
  alpha: false,
  width: 1920,  // the interior viewport dimensions (pixels)
  height: 1080,
  clearColor: 0x333333,  // grey
  fov: 2e3,  // "field of vision", the camera's focal length
             // useful range:
             //   500 (perspective) to 100,000 (orthographic)
  ambientLight: .5,
  x:    0, y:     0, z:   0,
  roll: 0, pitch: 0, yaw: 0,
  margin: 10,  // the viewport will expand to fill as much of the
               // visible page as possible, resizing automatically,
               // with a margin of this amount
  attachToBody: true, // this can be set to false, for
                      // background/buffer operations if needed
  context: {
    mode: 'webgl',    // 2d is semi-implemented,
                      // not working at this time
    options: {
      alpha:         true,
      antialias:     true,
      desynchronize: true,
    }
  }
}
```
<br>

## Lighting

### Ambient Light

``ambientLight: [0 to ...]``<br>
Ambient light is available, optionally, as a parameter for shader instances, or globally as a Renderer parameter. If the renderer parameter is set, it will be overridden by a shader setting.<br>

### Point Lights

Point lights are invoked as a shapeType (``'point light'``), displayed optionally in scene with a default sprite, when the property is set ``showSource: true``. the ``color`` property describes the emmissive light color. ``lum`` sets the light power. ``size`` sets the sprite size, if used. ``map`` overrides the default sprite with a custom sprite texture, alpha supported. more below.
<br>

## Other Methods


### AnimationLoop()
``Coordinates.AnimationLoop( renderer, 'Draw' )``<br>
##### Returns nothing. Takes no options
The function named should be a<br>
window global  ``window.Draw = () => { ... }``, as to be callable
<br><br>

### BasicShader()
``Coordinates.BasicShader(renderer, shaderOptions)``<br>

##### Returns basic shader object, optional async
```js
var shaderOptions = {
  {
    uniform: { // phong shader
      ambientLight: null, // if set, overrides renderer. may be over/under clocked
      enabled: true,      // may be toggled live, with other options
      type: 'phong',      // pseudo-lighting effect
      value: .3,          // intensity
      theta: .6,          // angle in radians about the horizontal
                          // (~4 oclock, default)
      flatShading: false,
    },
  },
  {
    uniform: { // reflection shader
      ambientLight: null, // if set, overrides renderer. may be over/under clocked
      enabled: true,
      type: 'reflection', // reflect an image on shape surfaces.
                          // works best with 'equirectangular' maps
      map: 'https://example.com/image.jpg',
          // required. URL to an image or video (web formats accepted)
          // "power of 2" (64, 128, 256 etc.) width & height
          // makes it load directly, or it will be
          // resized in the background for drawing
          // performance, with a load-time hit
          // "po2" is required by *gl for texture wrapping
      value: .5,  // intensity. range: 0 = invisible, to 1 = total, may be over/under clocked
      flatShading: false,
    },
  }
}
```
<br><br>

### DestroyGeometry()
``Coordinates.DestroyGeometry( geometry)``<br>
Destroy any references to this shapes created with ``LoadGeometry``.
Currently applies to lights only, which are the only system-side data
stored when geometry is created.

### LoadGeometry()
``Coordinates.LoadGeometry( renderer, geoOptions )``<br>

##### Returns a mesh object, optional async

<br>
#### a note about lighting
the object returned by ``LoadGeometry`` is not kept in system memory. You are expected to create a data structure for managing shapes, without which they have no permanency. A geometry, especially if 'connected' to a shader, is a whole, drawable entity and no special GC (garbage collection) work is required, since they are not stored. The only exception is lights, which are queued internally so that the scene is influenced by them. To remove a light, use the ``DestroyGeometry(shape)`` method, which removes the light source, but not your own reference to it, if any. Recall a light may be visible in your scene with the `showSource: true` property setting, and the shape returned by LoadGeometry (a rectangle) is not stored system-side, and will remain visible after the light is destroyed. You may use, for example if your shapes are in an array named 'shapes' and your light is named 'my light': ``shapes = shapes.filter(v=>v.name != 'my light')`` to remove the shape from your array.
<br>

```js
var geoOptions = {
  name: 'background', // optional name for object
  x: 0, y: 0, z: 0,   // initial coordinates
  roll: 0,            // orientation / rotation
  pitch: 0,
  yaw: 0,
  scaleX: 1,          // resize (at creation)
  scaleY: 1,
  scaleZ: 1,
  color: 0x333333,    // optional color
  colorMix: .5,       // weight of the color, to mix with texture
  map: '',            // optional texture, URL to an image, or video.
                         // for videos, use ``muted: false`` to prompt
                         // the user to play audio, if desired.
  playbackSpeed: 1.0, // if the texture (map) is a video, adjust the speed (.1 to 10)
  sphereize: 1,       // interpolate a polyhedron to a sphere (=1), and beyond
                         // read more below about this feature
  averageNormals: false, // generate/recompute normals for any shape @ load
  size: 1,            // not required, but the default may not be appropriate.
  subs: 0,            // subdivides a polyhedron above, creating exponentially
                      // more polygons/faces. Advise no more than 4!
  equirectangular: false,  // if enabled, textures are assumed to be spherical
  shapeType: ''    // required.
                   // supported types:
                       • 'tetrahedron'
                       • 'cube'
                       • 'octahedron'
                       • 'dodecahedron'
                       • 'icosahedron'
                       • 'rectangle'
                         // is a squre, unless scaled
                       • 'sprite'
                         map: [url] (required)
                         alpha: 0-1 // supports alpha channel (png source)
                         size: 1.0 (squre, always camera-facing)
                         subs: 0 - 5 (poly subdivisions, for finer resolution)
                      // LIGHTS
                         //- other objects require phong shader for
                         //  lights to affect them, except for
                         //  ambient light
                       • 'point light'
                         // is both a 'sprite' (optionally) and a light source.
                         // may have up to 16 in a scene.
                         // has optional parameters, in addition to sprite params:
                              lum : 0.0 to ...
                              color: 0xffffff e.g.
                              showSource: true/false
                              // ignores shader, if one is connected
                       • 'cylinder'
                       • 'torus'
                       • 'torus knot'
                         // cylinder, torus [knot] accept 'rows' and 'cols', optionally. if omitted, high-res
                         // shapes are quick-loaded. recommend zero subs,
                         // omit rows/cols unless custom shape is needed.
                         // Or export a custom shape & load it as such.
                       • 'obj'
                       • 'custom shape',
                         // "custom shapes" may be obtained from any
                         // shape, by enabling the 'exportShape' option.
                         // These files may then be loaded via the
                         // shapeType 'custom shape', and 'url', which
                         // is streamlined for the fastest load times
                       • 'dynamic',
                         // The "dynamic" shape type is used when geometry is
                         // expected to change during render, as in animations
                         // with deformable shapes. Note: every Coordinates
                         // shape, dynamic or not, has these exposed buffers:
                         // `shape.vertices`,
                         // `shape.uvs`,
                         // `shape.normalVecs`, and
                         // `shape.normals`.
                         //  These can be modified, for any shape, but 'dynamic' shapes
                         //  bypass any pre-built methods, creating empty buffers
                         //  and allow the inclusion of geometric data via the
                         //  LoadGeometry option: 'geometryData', and
                         //  'texCoords' (optionally). These properties expect
                         //  data in the following structure:
                         //  geometryData: [  // object/shape
                         //    [              // face/polygon
                                 [X,Y,Z], [X,Y,Z], [X,Y,Z], ... // vertices
                         //    ], ...
                         //  ],
                         //  texCoorods: [    // object/shape
                         //    [              // face/polygon
                                 [U, V], [U, V], [U, V], ... // UVs per vertex
                         //    ], ...
                         //  ],
                         // Considerations: triangles may be used of course, but quads
                         // 5-gons, and even 6-gons are accepted. Higher-point geometry
                         // (>6) may result in undefined behavior, and 3-6 are all
                         // converted to 3-gons, except quads. Like any shape
                         // returned by the LoadGeometry method, buffers are
                         // not references to the original data, but new, contiguous,
                         // buffer-style, packed Float32 arrays. When reading/modifying
                         // these buffers, vertices appear in 3's (X,Y,Z), without
                         // labels or separation. E.g. shp.vertices = [X,Y,Z,X,Y,Z...]
                         // There are 2 shape buffers for normals: 'normals', and
                         // 'normalVecs'. The former are 6-element-stride arrays,
                         // e.g. [X1,Y1,Z1,X2,Y2,Z2, X1,Y1,Z1,X2,Y2,Z2, ...],
                         // with an assumed start and end point for drawing normal
                         // lines in their spatial positions. 'normalVecs' are proper
                         // vectors, for use in the shader. Note that 'normals' are not
                         // automatically re-computed, unless requested. For this
                         // purpose there is the exposed method 'Normal(facet)', and
                         // SyncGeometryNormals(shape, averageNormals=false), which
                         // will recalculate all normals & normalVecs, optionally
                         // averaging them with a significant performance cost.
                         // Example:
                         //   shape.vertices[212] -= .2         (why not?)
                         //   SyncGeometryNormals(shape, true)  (reflections fixed!)
                         // 
                         // Lastly, SyncGeometryNormals() can and will generate
                         // new normals for the supplied shape. All shape types offer
                         // access to this method, if the property is set:
                         // `preComputeNormalAssocs: true`, but for 'dynamic' shapes
                         // it is automatically available.
  
  exportShape: false, // display popup for each geometry which has this option
  objX: 0,            // for 'OBJ' format models, initial offset
  objY: 0,
  objZ: 0,
  objRoll: 0,         // for 'OBJ' format models, orient/rotate
  objPitch: 0,
  objYaw: 0,
                      // enabled, to copy its raw data for later import as a
                      // 'custom shape'.
  flipNormals: false,    // invert normals
  url: ''                // url for 'OBJ' format models, or 'custom shapes'.
                         // url is ignored otherwise.
}
```
<br><br>

### geometry.sphereize = [value]
This value, when set as an option for LoadGeometry, interpolates a polyhedron
between its normal shape (e.g. a cube), and sphere. A value of 0 (zero) is the
shape's original, expected appearance, and 1 is a sphere. Values less than zero
or more than 1 are accepted. NOTE! if sphereize is used, you should set
``averageNormals: true``, to recompute the data used by reflections, lighting etc.
<br><br>

### ConnectGeometry()
Performs linkage between geometry created with the ``LoadGeometry`` method, and a shader created with the ``BasicShader`` method. If not called, <b>Coordinates</b> will use a null shader (no effects) so the shape can be drawn. Connecting geometry to a shader removes it from any previous connections.

``shader.ConnectGeometry( geometry )``

##### Returns nothing, optional async
<br><br>

### Clear()
Clears the viewport.<br>
Note: WebGL "swaps" buffers by default, resulting<br>
in the clearing of drawn elements, but not the background. This clears<br>
the background as well. See Renderer option 'clearColor', to set the color.<br>

``renderer.Clear()``

##### Returns nothing
<br><br>

### Draw()
Draws a single geometry created with the ``LoadGeometry`` method<br>

``renderer.Draw( geometry)``

##### Returns nothing
<br><br>
These color helper methods are also exposed
```
  HSVToHex
  HexFromHSV
  HSVToRGB
  RGBFromHSV
  HexFromRGB
  RGBToHex
  RGBFromHex
  HexToRGB
```

## Tips and tricks

### textures

Videos and images are interchangeable as texture sources. A video may be referenced numerous times as a shape texture and / or as a reflection map, without concern for performance degradation as a result of the multiple references, however video frame calls themselves at render time do impact performance.<br><br>
Coordinates involves an internal cache for all network resource calls with the URL as a key. There may be occasions to bypass the cache (e.g. displaying the same video at a different speed on two objects), in which case you may inoke the ``involveCache: false`` property which forces a new instance of that resource, available on all configurations where network resources apply. If the involveCache property is used and set to false, the order in which calls occur is relevant to the resulting settings for each instance. Some experimentation may be called for to achieve your desired results.

## Additional Helper Methods

### R()
Coordinates performs geometric rotations in shader for performance reasons, but there may be times when scene geometry should be modified manually, apart from shape positions and rotations, such as deforming geometry or custom rotations. The ``R`` function is exposed for this, and expects paramters as follows<br>
``R = (X, Y, Z, {roll, pitch, yaw}, addCameraZ = false)``
<br><br>
``R`` returns a 3-component ( [X, Y, Z] ) array with the resulting, modified input vertex
<br><br>example:
```js
var X = 1
var Y = 0
var Z = 0
var ar = Coordinates.R(X, Y, Z, {0, 0, Math.PI})
// ar -> [-1, 0, 0]

```
<br><br>
### Normal()
A geometric 'normal' is vector, perpendicular to a plane or polgon. Normals are used for many purposes, including shading, reflections, and collision detection.<br>
A method, ``Normal``, is exposed for manually computing the normal of any set of points, which are assumed to constitute a plane or flat surface of arbitrary orientation in space, usually a triangle or quad.<br>
``Normal = (facet, autoFlipNormals=false, X1=0, Y1=0, Z1=0) ``
<br>
``Normal`` requires input of a 2D array of at least 3 vertices. Additionally, it may ``autoflip`` away from the origin, which may be supplied as X1, Y1, Z1, shown above, or assumed to be 0,0,0 if these are omitted.
<br><br>
example:
```js
var facet = [
  [-1, 0, 0],
  [0,  0, 1],
  [1,  0, 0],
]
var n = Coordinates.Normal(facet)
// n -> [0,0,.33,  0,-1,.33]
// returned vector is centered in the polygon, and has 6
// elements, a vec3 start and end point.
// This is for purposes of drawing vector lines, but the raw
// vector [X, Y, Z] may be obtained by subtracting the last 3 elements
// from the first 3, respectively. Note that meshes in Coordinates are
// configured to use 1 normal per vertex, but each vertex in a polygon
// has the same normal, until 'averaged'. See averageNormals above for
// creating smooth surfaces, etc.

```
