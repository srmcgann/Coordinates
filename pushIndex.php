<?
$file = <<<'FILE'
<!--
  TO DO
  
  ✔ add renderer object
  ✔ add camera object
  ✔ fix FOV

  * cache for API, to include all network-callable items
  
  * shapes
    └> ✔ add shapes (in addtion to Cube)
       ✔ make non-cube UVs equirectangular
       ✔ keep shape generation functions, but add 'precompiled' versions
         for ordinary calls
       ✔ move rotation function into shader

  * subdivision
    └> ✔  add optional LOD param for all basic geometry
       ✔ decouple polygons from UV subdivision (interpolate UVs @ sub)
       
  * shaders / textures
    └> ✔ move shaders into Coordinates module
       *  add '# tiling (x/y)' option
       ✔  move camera into vertex shader
       ✔  create pseudo-phong shader
       ✔  add 'reflectivity' & texture input for it
       ✔  flat/smooth shading
       ✔  integrate optional effect shaders

  * functions / methods
    └> * begin separating module functions as optional includes
       * migrate functions to coordinates.js module
       * integrate obj loader

  * geometry
    └> * generalize geometry function
       * return "raw" geometry with inbuilt shapes, for 2d context
       * add 3-axis 'scale' function 
       
-->

<!DOCTYPE html>
<html>
  <head>
    <style>
      body, html{
        background: #000;
        margin: 0;
        min-height: 100vh;
        color: #fff;
        font-family: monospace;
        font-size: 20px;
      }
    </style>
  </head>
  <body>
    <div id="output"></div>
    <script type="module">
    import * as Coordinates from "./coordinates.js"
    
      const main = (async () => {
        var rendererOptions = {
          fov: 2e3,
          ambientLight: 1,
          x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0,
          margin: 10, attachToBody: true,
          context: {
            mode: 'webgl',
            options: {
              alpha:         true,
              antialias:     true,
              desynchronize: true,
            }
          }
        }
        var renderer = Coordinates.Renderer(1920, 1080, rendererOptions)
        
        if(1) var shaderOptions = [
          {
            uniform: {
              enabled: true,
              type: 'phong',
              value: .5,
              flatShading: false,
            },
          },
          {
            uniform: {
              enabled: false,
              type: 'reflection',
              map: 'https://srmcgann.github.io/skyboxes3/HDRI/treehouses.jpg',
              value: .5,
              flatShading: false,
            },
          },
        ]
        var shader = await Coordinates.BasicShader(renderer, shaderOptions)
        
        renderer.z = 16
        
        Coordinates.AnimationLoop(renderer, 'Draw')
        
        let geos = []
        let cl = 1
        let rw = 1
        let br = 1
        let sp = 25
        let subs = 2
        
        let size, sphereize
        let equirectangular, invertNormals, showNormals
        let shapeType
        let ct = 0
        
        Array(cl*rw*br).fill().map(async (v, i) => {
          switch(i%6){
            case 0: shapeType = 'obj'; break
            //case 0: shapeType = 'cube'; break
            case 1: shapeType = 'dodecahedron'; break
            case 2: shapeType = 'octahedron'; break
            case 3: shapeType = 'tetrahedron'; break
            case 4: shapeType = 'icosahedron'; break
            case 5: shapeType = 'rectangle'; break
          }
          var geoOptions = {
            x: ((i%cl)-cl/2 + .5) * sp,
            y: (((i/cl|0)%rw) - rw/2 + .5) * sp,
            z: ((i/cl/rw|0)-br/2 + .5) * sp,
            roll: 0,
            pitch: 0,
            yaw: 0,
            shapeType,
            size: 12,
            subs,
            sphereize: -1,
            equirectangular: true,
            invertNormals: false,
            showNormals: false,
            url: 'https://srmcgann.github.io/objs/tree/tree.obj'
          }
          await Coordinates.LoadGeometry(renderer, geoOptions).then(async (geometry, idx) => {
            let tex
            switch(ct%1){
              //case 0: tex = 'https://srmcgann.github.io/Coordinates/spectrum_test.jpg'; break
              //case 0: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/pano3.jpg'; break
              case 0: tex = 'https://srmcgann.github.io/Coordinates/nebugrid_po2.jpg'; break
              //case 0: tex = 'https://srmcgann.github.io/Coordinates/flat_grey.jpg'; break
              //case 0: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/angels.jpg'; break
              //case 0: tex = 'https://srmcgann.github.io/skyboxes7/HDRI/nebugrid.jpg'; break
              case 1: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/creepy_mansion.jpg'; break
              case 2: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/angels.jpg'; break
              case 3: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/alices.jpg'; break
              case 4: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/redCluds.jpg'; break
            }
            ct++
            geos = [...geos, geometry]
            await shader.ConnectGeometry(geometry, tex)
          })
        })

        var S = Math.sin, C = Math.cos
        
        window.Draw = () => {
        
          var t = renderer.t
          //if(cl*rw*br == ct){
          
            var X, Y, Z, e
            renderer.Clear()
            
            //renderer.z = Math.min(40, Math.max(0, (.3 + C(t/8))*100))
            //renderer.x = S(t*8) * 20
            //renderer.pitch   -= .01
            //renderer.yaw += .005
            
            geos.map(geometry => {
              geometry.yaw -= .002
              //geometry.pitch -= .01
              renderer.Draw(geometry)
            })
          //}
          
          /*
          
          renderer.Clear()

          renderer.x     = 0
          renderer.y     = 0
          renderer.z     = 16
          renderer.roll  = 0
          renderer.pitch = -t/2
          renderer.yaw   = t

          cube.map(v=>{
            renderer.ctx.beginPath()
            v.map(q=>{
              X = q[0]
              Y = q[1]
              Z = q[2]
              var e = Coordinates.R(X,Y,Z, renderer, true)
              X = e[0]
              Y = e[1]
              Z = e[2]
              if(Z>0) renderer.ctx.lineTo(...Coordinates.Q(X, Y, Z, c))
            })
            renderer.ctx.lineWidth = 50/Z
            renderer.ctx.strokeStyle = `#f004`
            renderer.ctx.fillStyle = `#f001`
            renderer.ctx.stroke()
            renderer.ctx.strokeStyle = `#f008`
            renderer.ctx.lineWidth /= 4
            renderer.ctx.stroke()
            renderer.ctx.fill()
          })
          */
        }
      })
      main()
    </script>
  </body>
</html>

FILE;
file_put_contents('../../Coordinates/index.html', $file);
?>