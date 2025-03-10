<?
$file = <<<'FILE'
<!--
  TO DO
  
  ✔ add renderer object
  ✔ add camera object
  ✔ fix FOV
  
  * sprite sheet system / import basic+custom slicing

  * cache for API, to include all network-callable items
  
  * shapes
    └> ✔ add shapes (in addtion to Cube)
       ✔ make non-cube UVs equirectangular
       ✔ keep shape generation functions, but add 'precompiled' versions for ordinary calls
       ✔ move rotation function into shader
       * loading -> compression, direct output of
                    usable format (no further processing needed)

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
    └> ✔ begin separating module functions as optional includes
       ✔ migrate functions to coordinates.js module
       ✔ integrate obj loader

  * geometry
    └> ✔ generalize geometry function
       * return "raw" geometry with inbuilt shapes, for 2d context
       ✔ add 3-axis 'scale' function 
       
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

      var S = Math.sin, C = Math.cos
      var Rn = Math.random
      
      const main = (async () => {
        var rendererOptions = {
          alpha: false,
          fov: 1500,
          ambientLight: .8,
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
        Coordinates.AnimationLoop(renderer, 'Draw')
        
        if(1) var shaderOptions = [
          {
            uniform: {
              enabled: true,
              type: 'phong',
              value: 1,
              theta: .5,
              flatShading: false,
            },
          },
          {
            uniform: {
              enabled: true,
              type: 'reflection',
              map: 'https://srmcgann.github.io/skyboxes3/HDRI/treehouses.jpg',
              value: .25,
              flatShading: false,
            },
          },
        ]
        var shader = await Coordinates.BasicShader(renderer, shaderOptions)

        var backgroundshaderOptions = structuredClone(shaderOptions)
        backgroundshaderOptions[0].uniform.enabled = true
        backgroundshaderOptions[0].uniform.value   = .6
        backgroundshaderOptions[1].uniform.enabled = false
        backgroundshaderOptions[1].uniform.value   = 0
        backgroundshaderOptions[1].uniform.map   = ''
        var backgroundShader = await Coordinates.BasicShader(renderer, backgroundshaderOptions)

        renderer.z = 25
        
        let geos = []
        let cl = 1
        let rw = 1
        let br = 1
        let sp = 350
        let subs = 3
        
        let size, sphereize
        let equirectangular, invertNormals, showNormals
        let ct = 0
        
        var geoOptions = {
          name: 'background',
          x: 0, y: 0, z: 0,
          roll: 0,
          pitch: 0,
          yaw: 0,
          scaleX: 1,//.7778,
          scaleY: 1,
          scaleZ: 1,
          objX: 0,
          objY: 0,
          objZ: 0,
          objRoll: 0,
          objPitch: 0,
          objYaw: 0,
          shapeType: 'dodecahedron',
          size: 2e3,
          subs: 4,
          sphereize: 1,
          equirectangular: true,
          invertNormals: false,
          showNormals: false,
          url: ''
        }
        await Coordinates.LoadGeometry(renderer, geoOptions).then(async (geometry, idx) => {
          //let tex = ''//
          let tex = 'https://srmcgann.github.io/skyboxes3/HDRI/treehouses.jpg'
          geos = [...geos, geometry]
          await backgroundShader.ConnectGeometry(geometry, tex)
        })

        var iSc = 20
        Array(iSc).fill().map(async (v, i) => {
          var shapeType, URL, size
          var scaleX, scaleY, scaleZ
          var objRoll, objPitch, objYaw
          var x, y, z, exportShape, name, sphereize
          var roll = 0, pitch = 0, yaw = 0
          var objX = 0, objY = 0, objZ = 0
          var equirectangular = false
          //x = ((i%cl)-cl/2 + .5) * sp
          //y = (((i/cl|0)%rw) - rw/2 + .5) * sp
          //z = ((i/cl/rw|0)-br/2 + .5) * sp
          var p
          
          scaleX = 1
          scaleY = 1
          scaleZ = 1
          objRoll = 0
          objPitch = 0
          objYaw = 0
          size = i ? 64 : 200
          name = 'solid'
          exportShape = false
          sphereize = 0
          switch(i){
            case 0:
              x = 0
              y = -31
              z = 0
              shapeType = 'cube'
              pitch = -Math.PI/2
              subs = 3
              size = 50
            break
            default:
              shapeType = 'custom shape'
              name = 'custom'
              URL = 'https://srmcgann.github.io/Coordinates/custom shapes/sedan.json'
              objY -= 0
              subs = 0
              size = .05
              sphereize = 0
              x = 0
              y = -.5
              z = 0
              x = (Rn() -.5) * 50
              y = 0
              z = (Rn() -.5) * 50
              yaw = (Rn() -.5) * Math.PI*2
              exportShape = false
              equirectangular = true
            break
          }
          var geoOptions = {
            exportShape,
            x, y , z,
            roll,
            pitch,
            yaw,
            scaleX,
            scaleY,
            scaleZ,
            objX,
            objY,
            objZ,
            objRoll,
            objPitch,
            objYaw,
            shapeType,
            name,
            size,
            subs,
            sphereize,
            equirectangular,
            invertNormals: false,
            showNormals: false,
            URL,
          }
          await Coordinates.LoadGeometry(renderer, geoOptions).then(async (geometry, idx) => {
            let tex
            switch(i%9){
              case 0: tex = 'https://srmcgann.github.io/objs/tree/bark1.jpg'; break
              brak
              
              case 1: tex = 'https://srmcgann.github.io/Coordinates/spectrum_test.jpg'; break
              case 2: tex = 'https://srmcgann.github.io/Coordinates/ultracloudsbase.jpg'; break
              case 3: tex = 'https://srmcgann.github.io/Coordinates/flat_grey.jpg'; break
              case 4: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/angels.jpg'; break
              case 5: tex = 'https://srmcgann.github.io/Coordinates/ultracloudsbase.jpg'; break
              case 6: tex = 'https://srmcgann.github.io/objs/tree/leaf_texture.png'; break
              case 7: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/creepy_mansion.jpg'; break
              //case 0: tex = 'https://srmcgann.github.io/Coordinates/custom shapes/ladybug texture.jpg'; break
              case 8: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/alices.jpg'; break
              //case 3: tex = 'https://srmcgann.github.io/Coordinates/ultracloudsbase.jpg'; break
              case 9: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/alices.jpg'; break
              default: tex = 'https://srmcgann.github.io/Coordinates/flat_grey.jpg'; break
            }
            ct++
            geos = [...geos, geometry]
            await shader.ConnectGeometry(geometry, tex)
          })
        })

        window.Draw = () => {

          var t = renderer.t
        
          if(1) for(var m=2;m--;) (m?backgroundShader:shader).datasets.map(v=>{
            if(typeof v?.optionalUniforms != 'undefined'){
              let phongShader = v.optionalUniforms.filter(v=>v.name=='phong')
              if(phongShader.length) phongShader[0].theta += .05
            }
          })
          
          //if(cl*rw*br == ct){
          
            var X, Y, Z, e
            renderer.Clear()

            renderer.z = Math.min(32, Math.max(3, (.3 + C(t/4))*50))
            //renderer.x = S(t*8) * 20
            renderer.yaw   =  S(t/2)  * .5 + t/5
            renderer.pitch = .6 + S(t/3) * Math.PI/8

            geos.map((geometry, idx) => {
              switch(geometry.name){
                case 'background':
                  //geometry.yaw += .005
                break;
                default:
                  /*var tx = geometry.x
                  var ty = geometry.y
                  var tz = geometry.z
                  var p = Math.atan2(tx, ty) + S(t/2) * .025
                  var d = Math.hypot(tx, ty)
                  tx = geometry.x = S(p) * d
                  ty = geometry.y = C(p) * d
                  var p = Math.atan2(tx, tz) + C(t/4) * .005
                  var d = Math.hypot(tx, tz)
                  tx = geometry.x = S(p) * d
                  tz = geometry.z = C(p) * d
                  */
                  //geometry.yaw -= C(t/1.5 + idx) * .05 * (idx%2 ? -1 : 1)
                  //geometry.pitch = C(t/2 + idx*2) * 4
                  //geometry.yaw += .004
                  //geometry.pitch += .002
                break
              }
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