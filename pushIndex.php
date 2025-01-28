<?
$file = <<<'FILE'
<!--
  TO DO
  
  ✔ add renderer object
  ✔ add camera object
  ✔ fix FOV
  
  * shapes
    └> * add shapes (in addtion to Cube)
       * make non-cube UVs equirectangular
       * keep shape generation functions, but add 'precompiled' versions
         for ordinary calls

  * subdivision
    └> *  add optional LOD param for all basic geometry
       ✔ decouple polygons from UV subdivision (interpolate UVs @ sub)
       
  * shaders / textures
    └> ✔ move shaders into Coordinates module
       *  add '# tiling (x/y)' option
       ✔  move camera into vertex shader
       ✔  create pseudo-phong shader
       ✔  add 'reflectivity' & texture input for it
       *  flat/smooth shading
       *  integrate optional effect shaders

  * functions / methods
    └> * begin separating module functions as optional includes
       * migrate functions to coordinates.js module
       * integrate obj loader

  * geometry
    └> * generalize geometry function
       * return "raw" geometry with inbuilt shapes, for 2d context
       
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
          fov: 1500,
          ambientLight: .5,
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
        
        var shaderOptions = [
          {
            uniform: {
              type: 'reflection',
              map: 'https://srmcgann.github.io/skyboxes3/HDRI/alices.jpg',
              value: .25,
            },
          },
          {
            uniform: {
              type: 'phong',
              value: 1,
            },
          },
        ]
        var shader = await Coordinates.BasicShader(renderer, shaderOptions)
        
        renderer.z = 20
        
        Coordinates.AnimationLoop(renderer, 'Draw')
        
        let geos = []
        let cl = 1
        let rw = 1
        let br = 1
        let sp = 30
        
        let size, subs, sphereize, flatShading
        let equirectangular, invertNormals, showNormals
        let shapeType
        await Array(cl*rw*br).fill().map(async (v, i) => {
          switch(i%1){
            case 1: shapeType = 'cube'; break
            case 0: shapeType = 'octahedron'; break
            case 2: shapeType = 'tetrahedron'; break
            case 3: shapeType = 'dodecahedron'; break
            case 4: shapeType = 'icosahedron'; break
          }
          let geo = await Coordinates.LoadGeometry(renderer, shapeType,
                            size=20, subs=2, sphereize=0,
                            equirectangular=false, invertNormals=false,
                            flatShading=true, showNormals=true)
          geo.x = ((i%cl)-cl/2 + .5) * sp
          geo.y = (((i/cl|0)%rw) - rw/2 + .5) * sp
          geo.z = ((i/cl/rw|0)-br/2 + .5) * sp
          geos = [...geos, geo]
        })
        
        //geometries.push( await Coordinates.LoadGeometry(renderer, 'obj', 10, 3, 0, true, true, 'https://srmcgann.github.io/objs/axe.obj') )
        //geometries.push( await Coordinates.LoadGeometry(renderer, 'dodecahedron', 24, 0, 1, true, true))
        
        await geos.map(async (geometry, idx) => {
          let tex
          switch(idx%1){
            case 0: tex = 'https://srmcgann.github.io/Coordinates/nebugrid_po2.jpg'; break
            //case 0: tex = 'https://srmcgann.github.io/Coordinates/flat_grey.jpg'; break
            //case 0: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/angels.jpg'; break
            //case 0: tex = 'https://srmcgann.github.io/skyboxes7/HDRI/nebugrid.jpg'; break
            case 1: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/creepy_mansion.jpg'; break
            case 2: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/angels.jpg'; break
            case 3: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/alices.jpg'; break
            case 4: tex = 'https://srmcgann.github.io/skyboxes3/HDRI/redCluds.jpg'; break
          }
          await shader.ConnectGeometry(geometry, tex)
        })
        
        
        var S = Math.sin, C = Math.cos
        
        window.Draw = () => {
        
          var t = renderer.t
          var X, Y, Z, e
          renderer.Clear()
          
          //renderer.z = Math.min(90, Math.max(0, (.3 + C(t/8))*200))
          
          geos.map(geometry => {
            if(1) for(let i = 0; i<geometry.vertices.length; i+=3){
              X = geometry.vertices[i+0]
              Y = geometry.vertices[i+1]
              Z = geometry.vertices[i+2]

              e = Coordinates.R(X,Y,Z, {x:0, y:0, z:0,
                                        roll:  0,
                                        pitch: .005,
                                        yaw:   C(t/2) * .02 + .01}, false)
              geometry.vertices[i+0] = e[0]
              geometry.vertices[i+1] = e[1]
              geometry.vertices[i+2] = e[2]
            }
            
            if(1) for(let i = 0; i<geometry.normals.length; i+=3){
              X = geometry.normals[i+0]
              Y = geometry.normals[i+1]
              Z = geometry.normals[i+2]
              e = Coordinates.R(X,Y,Z, {x:0, y:0, z:0,
                                        roll:  0,
                                        pitch: .005,
                                        yaw:   C(t/2) * .02 + .01}, false)
              geometry.normals[i+0] = e[0]
              geometry.normals[i+1] = e[1]
              geometry.normals[i+2] = e[2]
            }

            renderer.Draw(geometry)
          })

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
      })();
    </script>
  </body>
</html>


FILE;
file_put_contents('../../Coordinates/index.html', $file);
?>