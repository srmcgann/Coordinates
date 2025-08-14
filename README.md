# Coordinates
<b>Coordinates</b> is a graphics API for JavaScript enabled web browsers. It has methods for leveraging the HTML5 canvas API to create <b>images</b>, <b>animations</b>, <b>games</b> or <b>artwork</b>. This API uses <b>WebGL2</b>. Browsers which do not support webgl2 may have issues (black viewports), although 2d contexts may be invoked using this API which have much broader support.<br><br>
<center>
  
![example0](./img/README_g0.gif) </center>
As a stand-alone module, <b>Coordinates</b> may be included in an HTML5 project, providing a framework for creating graphics <b>viewports, shaders</b>, stock and custom <b>shapes</b>, as well as <b>textures</b>, and a growing library of <b>effects</b>.


### the ``coordinates.js`` docs have moved to a more dynamic platform, with live examples.
Check back for updated links. The documentation is under active development at this time.

## Documentation
- [Main overview](https://coordocs.veriler.com/?s=IRjVAGs0Y&p=1)

### Method specific sections
general documentation, introduction
[main docs](https://coordocs.veriler.com/?s=IRjVAGs0Y&p=1)

# other methods

speed / grouping
[ShapeFromArray](https://coordocs.veriler.com/?s=fqAGEVGSC&p=1)

manual and procedural shapes
[raw shapes](https://coordocs.veriler.com/?s=gsPYtHhNC&p=1)

wireframe style
[ShapeToLines](https://coordocs.veriler.com/?s=iSyJ2lMJN&p=1)

fog effect
[fog](https://coordocs.veriler.com/?s=qa2aDkhV1&p=1)

importing / exporting shape formats
[importing / exporting](https://coordocs.veriler.com/?s=BBJwWA1Qk&p=1)

custom shaders
[custom shaders](https://coordocs.veriler.com/?s=CTUkAzdCv&p=1)

curves
[b-spline curves](https://coordocs.veriler.com/?s=EYfM5WaWU&p=1)

data / procedural textures
[Data Array Textures](https://coordocs.veriler.com/?s=FJmQL8Vzl&p=1)

curve to, between point pairs
[curveTo](https://coordocs.veriler.com/?s=FJUgbKoZe&p=1)

---

for quick reference, a sample of boilerplate...
```js
<!DOCTYPE html>
<html>
  <head>
    <title>Coordinates boilerplate example</title>
    <style>
      body, html{
        background: #000;
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
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



