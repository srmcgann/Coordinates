// 'Coordinates', a webgl framework
// Scott McGann - whitehotrobot@gmail.com
// all rights reserved - ©2025

const S = Math.sin, C = Math.cos
//new OffscreenCanvas(256, 256); * might be superior
const scratchCanvas = document.createElement('canvas')
const sctx = scratchCanvas.getContext('2d')
const scratchImage = new Image()

var cacheItem
const cache = {
  objFiles     : [],
  customShapes : [],
  textures     : [],
  geometry     : []
}

const Renderer = (width = 1920, height = 1080, options) => {

  var x=0, y=0, z=0
  var roll=0, pitch=0, yaw=0, fov=2e3
  var attachToBody = true, margin = 10
  var ambientLight = .5, alpha=false, clearColor = 0x000000
  var context = {
    mode: 'webgl',
    options: {
      alpha                   : true,
      //premultipliedAlphAlpha  : true,
      antialias               : true,
      desynchronized          : true,
    }
  }
  
  if(typeof options != 'undefined'){
    Object.keys(options).forEach((key, idx) =>{
      switch(key){
        case 'alpha': alpha = options[key]; break
        case 'x': x = options[key]; break
        case 'y': y = options[key]; break
        case 'z': z = options[key]; break
        case 'roll': roll = options[key]; break
        case 'pitch': pitch = options[key]; break
        case 'yaw': yaw = options[key]; break
        case 'fov': fov = options[key]; break
        case 'clearColor': clearColor = options[key]; break
        case 'attachToBody': attachToBody = options[key]; break
        case 'margin': margin = options[key]; break
        case 'ambientLight': ambientLight = options[key]; break
        case 'context':
          context.mode = options[key].mode
          context.options = options[key]['options']
        break
      }
    })
  }
  
  const c    = document.createElement('canvas')
  const ctx  = c.getContext(context.mode, context.options)
  c.width  = width
  c.height = height
  const contextType = context[0]
  
  switch(contextType){
    case '2d':
    break
    default:
      ctx.viewport(0, 0, c.width, c.height)
    break
  }

  if(attachToBody){
    c.style.display    = 'block'
    c.style.position   = 'absolute'
    c.style.left       = '50vw'
    c.style.top        = '50vh'
    c.style.transform  = 'translate(-50%, -50%)'
    c.style.border     = '1px solid #fff3'
    c.style.background = '#04f1'
    document.body.appendChild(c)
  }
  
  var rsz
  window.addEventListener('resize', rsz = (e) => {
    var b = document.body
    var n
    var d = c.width !== 0 ? c.height / c.width : 1
    if(b.clientHeight/b.clientWidth > d){
      c.style.width = `${(n=b.clientWidth) - margin*2}px`
      c.style.height = `${n*d - margin*2}px`
    }else{
      c.style.height = `${(n=b.clientHeight) - margin*2}px`
      c.style.width = `${n/d - margin*2}px`
    }
  })
  rsz()
  
  
  var ret = {
    // vars & objects
    c, contextType, t:0, alpha,
    width, height, x, y, z,
    roll, pitch, yaw, fov,
    ready: false, ambientLight
    
    // functions
    // ...
  }
  ret[contextType == '2d' ? 'ctx' : 'gl'] = ctx
  
  const Clear = () => {
    switch(contextType){
      case '2d': 
        c.width = ret.c.width
      break
      default:
        ctx.clearColor(0,0,0,1) //...HexToRGB(), 1.0)
        ctx.clear(ctx.COLOR_BUFFER_BIT);
      break
    }
  }
  ret['Clear'] = Clear
  
  
  const Draw = geometry => {
    
    if(typeof geometry?.shader != 'undefined'){
      
      var shader = geometry.shader
      var dset   = shader.datasets[geometry.datasetIdx]
      var sProg  = dset.program
      ctx.useProgram( sProg )
      
      // update uniforms
      


      if(geometry.textureMode == 'video'){
        BindImage(ctx, dset.video,  dset.texture, geometry.textureMode)
      }
      
      ctx.uniform1i(dset.locTexture, dset.texture)
      ctx.activeTexture(ctx.TEXTURE0)
      ctx.bindTexture(ctx.TEXTURE_2D, dset.texture)
      
      ctx.uniform1f(dset.locT,               ret.t)
      ctx.uniform1f(dset.locColorMix,        geometry.colorMix)
      ctx.uniform1f(dset.locIsSprite,        geometry.isSprite)
      ctx.uniform3f(dset.locColor,           ...HexToRGB(geometry.color))
      ctx.uniform1f(dset.locAmbientLight,    ret.ambientLight)
      ctx.uniform2f(dset.locResolution,      ret.width, ret.height)
      ctx.uniform3f(dset.locCamPos,          ret.x, ret.y, ret.z)
      ctx.uniform3f(dset.locCamOri,          ret.roll, ret.pitch, ret.yaw)
      ctx.uniform3f(dset.locGeoPos,          geometry.x, geometry.y, geometry.z)
      ctx.uniform3f(dset.locGeoOri,          geometry.roll, geometry.pitch, geometry.yaw)
      ctx.uniform1f(dset.locFov,             ret.fov)
      ctx.uniform1f(dset.locEquirectangular, geometry.equirectangular ? 1.0 : 0.0)
      ctx.uniform1f(dset.locRenderNormals,   0)
      
      // enable alpha
      if(geometry.shapeType == 'sprite'){
          //ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE);
          ctx.enable(ctx.BLEND)
          ctx.disable(ctx.DEPTH_TEST)
      }
      
      dset.optionalUniforms.map(uniform => {
        if(typeof uniform?.loc === 'object'){
          ctx[uniform.dataType](uniform.loc,      uniform.value * (uniform.name == 'reflection' ? 3 : 1))
          ctx.uniform1f(uniform.locFlatShading,   uniform.flatShading ? 1.0 : 0.0)
          switch(uniform.name){
            case 'reflection':
              ctx.activeTexture(ctx.TEXTURE1)
              if(uniform.textureMode == 'video'){
                BindImage(ctx, uniform.video,  uniform.refTexture, uniform.textureMode)
              }
              ctx.uniform1i(uniform.locRefTexture, 1)
              ctx.bindTexture(ctx.TEXTURE_2D, uniform.refTexture)
              
              ctx.uniform1f(uniform.locRefOmitEquirectangular,
                   ( geometry.shapeType == 'rectangle' || geometry.shapeType == 'sprite' ) ? 1.0 : 0.0)
            break
            case 'phong':
              uniform.locPhongTheta = ctx.getUniformLocation(dset.program, 'phongTheta')
              ctx.uniform1f(uniform.locPhongTheta, uniform.theta)
            break
          }
        }
      })
      
      
      // bind buffers
      ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.uv_buffer)
      ctx.bufferData(ctx.ARRAY_BUFFER, geometry.uvs, ctx.STATIC_DRAW)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.UV_Index_Buffer)
      ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.uvIndices, ctx.STATIC_DRAW)
      ctx.vertexAttribPointer(dset.locUv , 2, ctx.FLOAT, false, 0, 0)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null)
      ctx.bindBuffer(ctx.ARRAY_BUFFER, null)

      
      // vertices

        //ctx.uniform1f(dset.locRenderNormals, 1.0)


      ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.normalVec_buffer)
      ctx.bufferData(ctx.ARRAY_BUFFER, geometry.normalVecs, ctx.STATIC_DRAW)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.NormalVec_Index_Buffer)
      ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.nVecIndices, ctx.STATIC_DRAW)
      ctx.vertexAttribPointer(dset.locNormalVec, 3, ctx.FLOAT, true, 0, 0)
      ctx.enableVertexAttribArray(dset.locNormalVec)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null)
      ctx.bindBuffer(ctx.ARRAY_BUFFER, null)
        

      ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.vertex_buffer)
      ctx.bufferData(ctx.ARRAY_BUFFER, geometry.vertices, ctx.STATIC_DRAW)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.Vertex_Index_Buffer)
      ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.vIndices, ctx.STATIC_DRAW)
      ctx.vertexAttribPointer(dset.locPosition, 3, ctx.FLOAT, false, 0, 0)
      ctx.enableVertexAttribArray(dset.locPosition)
      ctx.drawElements(ctx.TRIANGLES, geometry.vertices.length/3|0, ctx.UNSIGNED_SHORT,0)
      //ctx.drawElements(ctx.LINES, geometry.vertices.length/3|0, ctx.UNSIGNED_SHORT,0)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null)
      ctx.bindBuffer(ctx.ARRAY_BUFFER, null)


      // disable alpha
      if(geometry.shapeType == 'sprite'){
        ctx.blendFunc(ctx.ONE, ctx.ZERO)
        ctx.disable(ctx.BLEND)
        ctx.enable(ctx.DEPTH_TEST)
      }


      // normals lines drawn, optionally
      if(geometry.showNormals){
        ctx.uniform1f(dset.locRenderNormals, 1)
        ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.normal_buffer)
        ctx.bufferData(ctx.ARRAY_BUFFER, geometry.normals, ctx.STATIC_DRAW)
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.Normal_Index_Buffer)
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.nIndices, ctx.STATIC_DRAW)
        ctx.vertexAttribPointer(dset.locNormal, 3, ctx.FLOAT, true, 0, 0)
        ctx.enableVertexAttribArray(dset.locNormal)
        ctx.drawElements(ctx.LINES, geometry.normals.length/3|0, ctx.UNSIGNED_SHORT,0)
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null)
        ctx.bindBuffer(ctx.ARRAY_BUFFER, null)
      }
    }
    ret.t += 1/60 //performance.now() / 1000

    
  }
  ret['Draw'] = Draw
        
  return ret
}

const DestroyViewport = el => {
  el.remove()
}

const LoadOBJ = async (url, scale, tx, ty, tz, rl, pt, yw, recenter=true) => {
  var res, flipNormals = false
  var a, e, f, ax, ay, az, X, Y, Z, p, d, i, j, b, l
  var geometry = []

  var rawGeometry = {
    vertices: [],
    normals:  [],
    uvs:      [],
  }
  var data;
  if((cacheItem = cache.filter(v=>v.objFiles.filter(q=>q.url==url).length)).length){
    data = cacheItem[0].data
    console.log('found OBJ in cache... using it'
  } else {
    await fetch(url, res => res).then(data=>data.text()).then(res=>data=res)
    cache.objFiles.push({ url, data })
  }
  var faceLines   = []
  var normalLines = []
  var vertLines   = []
  var uvLines     = []
  
  data.split("\n").forEach(line => {
    if(line.substr(0, 2) == 'v ') vertLines.push(line.substr(2))
    if(line.substr(0, 3) == 'vn ') normalLines.push(line.substr(3))
    if(line.substr(0, 3) == 'vt ') uvLines.push(line.substr(3))
    if(line.substr(0, 2) == 'f ') faceLines.push(line.substr(2))
  })
  faceLines.forEach(line => {
    let verts = line.split(' ')
    var tverts   = []
    var tnormals = []
    var tuvs     = []
    verts.forEach((vertex, idx) => {
      var vidx = vertex.split('/')[0]-1
      var nidx = vertex.split('/')[2]-1
      var tidx = vertex.split('/')[1]-1
      
      var tvert = vertLines[vidx].split(' ')
      for(var i = 0; i<tvert.length; i+=3){
        var X = tvert[i+0] * scale + tx
        var Y = tvert[i+1] * scale + ty
        var Z = tvert[i+2] * scale + tz
        var r = R(X, Y, Z, {x:0, y:0, z:0,
                           roll:  rl,
                           pitch: pt,
                           yaw:   yw})
        
        tvert[i+0] = r[0]
        tvert[i+1] = r[1]
        tvert[i+2] = r[2]
      }
      
      var tnormal = normalLines.length ? normalLines[nidx].split(' ').map(q=>+q) : []
      
      var nx1 = tvert[0]
      var ny1 = tvert[1]
      var nz1 = tvert[2]
      var nx2 = tvert[0] + tnormal[0]
      var ny2 = tvert[1] + tnormal[1]
      var nz2 = tvert[2] + tnormal[2]
      var tuv = uvLines.length && tidx < uvLines.length ? uvLines[tidx].split(' ').map(q=>+q) : []
      
      tverts.push(tvert)
      tuvs.push(tuv)
      tnormals.push([nx1, ny1, nz1, nx2, ny2, nz2])
    })
    switch(verts.length){
      case 3:
        tverts.map(v=> rawGeometry.vertices.push(...v))
        tnormals.map(v=> rawGeometry.normals.push(...v))
        tuvs.map(v=> rawGeometry.uvs.push(...v))
      break
      case 4:  // split quads, if found
        tverts.filter((v,i)=>i<3).map(v=>{
          rawGeometry.vertices.push(...v)
        })
        tnormals.filter((v,i)=>i<3).map(v=>{
          rawGeometry.normals.push(...v)
        })
        tuvs.filter((v,i)=>i<3).map(v=>{
          rawGeometry.uvs.push(...v)
        });
        
        ([2,3,0]).map(idx => {
          tverts[idx].forEach(v=>rawGeometry.vertices.push(v))
          tnormals[idx].forEach(v=>rawGeometry.normals.push(v))
          tuvs[idx].forEach(v=>rawGeometry.uvs.push(v))
        })
      break
    }
  })
  
  return rawGeometry
}

const Q = (X, Y, Z, c, AR=700) => [c.width/2+X/Z*AR, c.height/2+Y/Z*AR]

const R = (X,Y,Z, cam, m=false) => {
  var M = Math, p, d
  var H=M.hypot, A=M.atan2
  var Rl = cam.roll, Pt = cam.pitch, Yw = cam.yaw
  X = S(p=A(X,Y)+Rl)*(d=H(X,Y))
  Y = C(p)*d
  X = S(p=A(X,Z)+Yw)*(d=H(X,Z))
  Z = C(p)*d
  Y = S(p=A(Y,Z)+Pt)*(d=H(Y,Z))
  Z = C(p)*d
  if(m){
    var oX = cam.x, oY = cam.y, oZ = cam.z
    X += oX
    Y += oY
    Z += oZ
  }
  return [X, Y, Z]
}

const LoadGeometry = async (renderer, geoOptions) => {

  var objX, objY, objZ, objRoll, objPitch, objYaw
  var vertex_buffer, Vertex_Index_Buffer
  var normal_buffer, Normal_Index_Buffer, video
  var normalVec_buffer, NormalVec_Index_Buffer
  var uv_buffer, UV_Index_Buffer, name, shapeType
  var vIndices, nIndices, nVecIndices, uvIndices
  const gl = renderer.gl
  var shape, exportShape = false
  
  // geo defaults
  var x = 0, y = 0, z = 0
  var roll = 0, pitch = 0, yaw = 0
  var scaleX=1, scaleY=1, scaleZ=1
  var rows             = 16
  var cols             = 40
               // must remain "16, 40" to trigger default quick torus/cylinder
               
  var map              = ''
  var url              = ''
  var size             = 1
  var averageNormals   = false
  var subs             = 0
  var sphereize        = 0
  var color            = 0x333333
  var colorMix         = .5
  var equirectangular  = false
  var flipNormals      = false
  var showNormals      = false
  var muted            = true
  var isSprite         = 0.0
  var playbackSpeed    = 1.0
  var textureMode      = 'image'
  
  geoOptions = structuredClone(geoOptions)
  Object.keys(geoOptions).forEach((key, idx) => {
    switch(key.toLowerCase()){
      case 'x'               : x = geoOptions[key]; break
      case 'y'               : y = geoOptions[key]; break
      case 'z'               : z = geoOptions[key]; break
      case 'roll'            : roll = geoOptions[key]; break
      case 'pitch'           : pitch = geoOptions[key]; break
      case 'yaw'             : yaw = geoOptions[key]; break
      case 'shapetype'       : shapeType = geoOptions[key]; break
      case 'size'            : size = geoOptions[key]; break
      case 'subs'            : subs = geoOptions[key]; break
      case 'sphereize'       : sphereize = geoOptions[key]; break
      case 'equirectangular' : equirectangular = !!geoOptions[key]; break
      case 'flipnormals'     : flipNormals = !!geoOptions[key]; break
      case 'shownormals'     : showNormals = !!geoOptions[key]; break
      case 'objx'            : objX = geoOptions[key]; break
      case 'objy'            : objY = geoOptions[key]; break
      case 'objz'            : objZ = geoOptions[key]; break
      case 'objroll'         : objRoll = geoOptions[key]; break
      case 'objpitch'        : objPitch = geoOptions[key]; break
      case 'objyaw'          : objYaw = geoOptions[key]; break
      case 'scalex'          : scaleX = geoOptions[key]; break
      case 'scaley'          : scaleY = geoOptions[key]; break
      case 'scalez'          : scaleZ = geoOptions[key]; break
      case 'name'            : name = geoOptions[key]; break
      case 'color'           : color = geoOptions[key]; break
      case 'colormix'        : colorMix = geoOptions[key]; break
      case 'exportshape'     : exportShape = !!geoOptions[key]; break
      case 'url'             : url = geoOptions[key]; break
      case 'map'             : map = geoOptions[key]; break
      case 'rows'            : rows = geoOptions[key]; break
      case 'cols'            : cols = geoOptions[key]; break
      case 'muted'           : muted = !!geoOptions[key]; break
      case 'issprite'        : isSprite = (!!geoOptions[key]) ? 1.0: 0.0; break
      case 'playbackspeed'   : playbackSpeed = geoOptions[key]; break
      case 'averagenormals'  : averageNormals = !!geoOptions[key]; break
    }
  })

  
  var vertices    = []
  var normals     = []
  var normalVecs  = []
  var uvs         = []
  
  shapeType = shapeType.toLowerCase()
  var resolved = false
  var fileURL, hint
  
  if(shapeType.indexOf('custom shape') != -1){
    fileURL = url
    hint = `${shapeType} ${name} (${url})`
    resolved = true
  }else{
    hint = `${shapeType}_${subs}`
    if(subs < 5 && hint){
      var fileBase
      switch(hint){
        case 'tetrahedron_0':
        case 'tetrahedron_1':
        case 'tetrahedron_2':
        case 'tetrahedron_3':
        case 'tetrahedron_4':
        case 'cube_0':
        case 'cube_1':
        case 'cube_2':
        case 'cube_3':
        case 'cube_4':
        case 'octahedron_0':
        case 'octahedron_1':
        case 'octahedron_2':
        case 'octahedron_3':
        case 'octahedron_4':
        case 'dodecahedron_0':
        case 'dodecahedron_1':
        case 'dodecahedron_2':
        case 'dodecahedron_3':
        case 'dodecahedron_4':
        case 'icosahedron_0':
        case 'icosahedron_1':
        case 'icosahedron_2':
        case 'icosahedron_3':
        case 'icosahedron_4':
        case 'cylinder_0':
        case 'torus_0':
        case 'torus knot_0':
          if(hint != 'cylinder_0' || hint != 'torus_0' ||
             (hint == 'cylinder_0' && rows == 16 && cols == 40) ||
             (hint == 'torus_0' && rows == 16 && cols == 40) ||
             (hint == 'torus knot_0' && rows == 16 && cols == 40) 
             ){
            resolved = true;
            url = `https://srmcgann.github.io/Coordinates/new%20shapes/`
            fileURL = `${url}${hint}.json?2`
          }else{
            // unresolved shape
          }
        break
      }
    }
  }
  if(resolved){
    await fetch(fileURL).then(res=>res.json()).then(data=>{
      vertices    = data.vertices
      normals     = data.normals
      normalVecs  = data.normalVecs
      uvs         = data.uvs
    })
    
    //if(shapeType != 'custom shape' && shapeType != 'obj'){
      var ip1 = sphereize
      var ip2 = 1 -sphereize
      for(var i = 0; i< vertices.length; i+=3){
        var d, val
      
        var X = vertices[i+0]
        var Y = vertices[i+1]
        var Z = vertices[i+2]
        d = Math.hypot(X,Y,Z) //+ .0001
        X /= d
        Y /= d
        Z /= d
        X *= ip1 + d*ip2
        Y *= ip1 + d*ip2
        Z *= ip1 + d*ip2
        vertices[i+0] = X * size * scaleX
        vertices[i+1] = Y * size * scaleY
        vertices[i+2] = Z * size * scaleZ
        
        var ox = normals[i*2+0]
        var oy = normals[i*2+1]
        var oz = normals[i*2+2]

        normals[i*2+0] += vertices[i+0] - ox
        normals[i*2+1] += vertices[i+1] - oy
        normals[i*2+2] += vertices[i+2] - oz
        normals[i*2+3] += vertices[i+0] - ox
        normals[i*2+4] += vertices[i+1] - oy
        normals[i*2+5] += vertices[i+2] - oz

        /*normals[i*2+0] *= scaleX
        normals[i*2+1] *= scaleY
        normals[i*2+2] *= scaleZ
        normals[i*2+3] *= scaleX
        normals[i*2+4] *= scaleY
        normals[i*2+5] *= scaleZ
        */
        
        
      }
  }
  if(!resolved){
    switch(shapeType){
      case 'tetrahedron':
        equirectangular = true
        shape = await Tetrahedron(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'octahedron':
        equirectangular = true
        shape = await Octahedron(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'icosahedron':
        equirectangular = true
        shape = await Icosahedron(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'torus':
        shape = await Torus(size, subs, sphereize,
                      flipNormals, shapeType, rows, cols)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'torus knot':
        shape = await TorusKnot(size, subs, sphereize,
                      flipNormals, shapeType, rows, cols)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'cylinder':
        shape = await Cylinder(size, subs, sphereize,
                      flipNormals, shapeType, rows, cols)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'cube':
        shape = await Cube(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'rectangle':
        shape = await Rectangle(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'sprite':
        isSprite = true
        shape = await Rectangle(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices = [...vertices, ...v.position]
          normals  = [...normals,  ...v.normal]
          uvs      = [...uvs,      ...v.texCoord]
        })
      break
      case 'obj':
        if(typeof objX     == 'undefined') objX     = 0
        if(typeof objY     == 'undefined') objY     = 0
        if(typeof objZ     == 'undefined') objZ     = 0
        if(typeof objRoll  == 'undefined') objRoll  = 0
        if(typeof objPitch == 'undefined') objPitch = 0
        if(typeof objYaw   == 'undefined') objYaw   = 0
        shape = await LoadOBJ(url, size, objX, objY, objZ,
                              objRoll, objPitch, objYaw, false)
        vertices = shape.vertices
        normals = shape.normals
        uvs     = shape.uvs
      break
      case 'dodecahedron':
        equirectangular = true
        shape = await Dodecahedron(size, subs, sphereize, flipNormals, shapeType)
        shape.geometry.map(v => {
          vertices    = [...vertices, ...v.position]
          normals     = [...normals,  ...v.normal]
          uvs         = [...uvs,      ...v.texCoord]
        })
      break
    }
    
    for(var i=0; i<vertices.length; i+=3){
       vertices[i+0] *= scaleX
       vertices[i+1] *= scaleY
       vertices[i+2] *= scaleZ
    }
    
    for(var i=0; i<normals.length; i+=6){
      var nx = normals[i+3] - normals[i+0]
      var ny = normals[i+4] - normals[i+1]
      var nz = normals[i+5] - normals[i+2]
      normals[i+0] *= scaleX
      normals[i+1] *= scaleY
      normals[i+2] *= scaleZ
      normals[i+3] = normals[i+0] + nx
      normals[i+4] = normals[i+1] + ny
      normals[i+5] = normals[i+2] + nz
    }
    
  }
  
  if(averageNormals) AverageNormals(vertices, normals, shapeType)
  if(!resolved || averageNormals){
    normalVecs    = []
    for(var i=0; i<normals.length; i+=6){
      let X = normals[i+3] - normals[i+0]
      let Y = normals[i+4] - normals[i+1]
      let Z = normals[i+5] - normals[i+2]
      normalVecs = [...normalVecs, X,Y,Z]
    }
  }
  
  if(flipNormals){
    for(var i=0; i<normals.length; i+=6){
      normals[i+3] = normals[i+0] - (normals[i+3]-normals[i+0])
      normals[i+4] = normals[i+1] - (normals[i+4]-normals[i+1])
      normals[i+5] = normals[i+2] - (normals[i+5]-normals[i+2])
    }
    for(var i=0; i<normalVecs.length; i+=3){
      normalVecs[i+0] *= -1
      normalVecs[i+1] *= -1
      normalVecs[i+2] *= -1
    }
  }
  
  if(exportShape && name !== 'background'){
    var popup = document.createElement('div')
    popup.style.position = 'fixed'
    popup.style.zIndex = 100000
    popup.style.left = '50%'
    popup.style.top = '50%'
    popup.style.transform = 'translate(-50%, -50%)'
    popup.style.background = '#0008'
    popup.style.padding = '20px'
    popup.style.width = '700px'
    popup.style.height = '450px'
    popup.style.border = '1px solid #fff4'
    popup.style.borderRadius = '5px'
    popup.style.fontFamily = 'monospace'
    popup.style.fontSize = '20px'
    popup.style.color = '#fff'
    var titleEl = document.createElement('div')
    titleEl.style.fontSize = '24px'
    titleEl.style.color = '#0f8c'
    titleEl.innerHTML = `Export Coordinates File -> ${shapeType} ` + (geoOptions?.name ? `(${geoOptions.name})` : '') + '<br><br>'
    popup.appendChild(titleEl)
    var output = document.createElement('div')
    //output.id = 'shapeDataOutput' + geometry.name + geometry.shapeType
    output.style.minWidth = 'calc(100% - 0px)'
    output.style.height = '300px'
    output.style.background = '#333'
    output.style.border = '1px solid #fff4'
    output.style.overflowY = 'auto'
    output.style.wordWrap = 'break-word'
    output.style.color = '#888'
    output.style.fontSize = '10px'
    popup.appendChild(output)
    var copyButton = document.createElement('button')
    copyButton.style.border = 'none'
    copyButton.style.padding = '3px'
    copyButton.style.cursor = 'pointer'
    copyButton.fontSize = '20px'
    copyButton.style.borderRadius = '10px'
    copyButton.style.margin = '10px'
    copyButton.style.minWidth = '100px'
    copyButton.innerHTML = '📋 copy'
    copyButton.title = "copy shape data to clipboard"
    copyButton.onclick = () => {
      var range = document.createRange()
      range.selectNode(output)
      window.getSelection().removeAllRanges()
      window.getSelection().addRange(range)
      document.execCommand("copy")
      window.getSelection().removeAllRanges()
      copyButton.innerHTML = 'COPIED!'
      setTimeout(() => {
        copyButton.innerHTML = '📋 copy'
      } , 1000)
    }
    popup.appendChild(copyButton)
    var closeButton = document.createElement('button')
    closeButton.onclick = () => popup.remove()
    
    closeButton.style.border = 'none'
    closeButton.style.padding = '3px'
    closeButton.style.cursor = 'pointer'
    closeButton.fontSize = '20px'
    closeButton.style.borderRadius = '10px'
    closeButton.style.margin = '10px'
    closeButton.style.background = '#faa'
    closeButton.style.minWidth = '100px'
    closeButton.innerHTML = 'close'
    popup.appendChild(closeButton)
    
    output.innerHTML = JSON.stringify({
      vertices: structuredClone(vertices).map(v=>{return Math.round(v*1e4) / 1e4}),
      normals: structuredClone(normals).map(v=>{return Math.round(v*1e4) / 1e4}),
      normalVecs: structuredClone(normalVecs).map(v=>{return Math.round(v*1e4) / 1e4}),
      uvs: structuredClone(uvs).map(v=>{return Math.round(v*1e4) / 1e4}),
    })
    document.body.appendChild(popup)
  }
  

  vertices   = new Float32Array(vertices)
  normals    = new Float32Array(normals)
  normalVecs = new Float32Array(normalVecs)
  uvs        = new Float32Array(uvs)
  
  
  
  // link geometry buffers
  
  //vertics, indices
  vertex_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  vIndices = new Uint16Array( Array(vertices.length/3).fill().map((v,i)=>i) )
  Vertex_Index_Buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Vertex_Index_Buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vIndices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

  //normals, indices
  normalVec_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, normalVec_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, normalVecs, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  nVecIndices = new Uint16Array( Array(normalVecs.length/3).fill().map((v,i)=>i) )
  NormalVec_Index_Buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, NormalVec_Index_Buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, nVecIndices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
  
  //normal lines for drawing, indices
  normal_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  nIndices = new Uint16Array( Array(normals.length/3).fill().map((v,i)=>i) )
  Normal_Index_Buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Normal_Index_Buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, nIndices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

  //uvs, indices
  uv_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, uv_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  uvIndices = new Uint16Array( Array(uvs.length/2).fill().map((v,i)=>i) )
  UV_Index_Buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, UV_Index_Buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, uvIndices, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

  return {
    x, y, z,
    roll, pitch, yaw, color, colorMix,
    size, subs, name, url, averageNormals,
    showNormals, shapeType, exportShape,
    sphereize, equirectangular, flipNormals,
    vertices, normals, normalVecs, uvs,
    vertex_buffer, Vertex_Index_Buffer,
    normal_buffer, Normal_Index_Buffer, muted,
    normalVec_buffer, NormalVec_Index_Buffer,
    nVecIndices, uv_buffer, UV_Index_Buffer,
    vIndices, nIndices, uvIndices, map, video,
    textureMode, isSprite, playbackSpeed
  }
}


const ImageToPo2 = async (image) => {
  let ret = image
  if ( !(IsPowerOf2(image.width) && IsPowerOf2(image.height)) ) {
    let tCan = document.createElement('canvas')
    let tCtx = tCan.getContext('2d')
    let r = 8
    let tsize=0
    let mdif = 6e6
    let d, j
    let h = Math.hypot(image.width, image.height)
    for(let i = 0; i<16; i++){
      if((d=Math.abs(tsize-h)) < mdif){
        mdif = d
        tsize = r * 2**i
        j=i
      }
    }
    tsize -= r * 2**(j-1)
    tCan.width  = tsize
    tCan.height = tsize
    tCtx.drawImage(image, 0, 0, tCan.width, tCan.height)
    ret = new Image()
    ret.src = tCan.toDataURL()
  }
  return ret
}

const VideoToImage = video => {
  if(typeof video != 'undefined'){
    
    let tgtWidth
    let tgtHeight
    
    if(scratchCanvas.width != video.videoWidth ||
       scratchCanvas.height != video.videoHeight){
       tgtWidth = video.videoWidth
       tgtHeight = video.videoHeight
    }else{
       tgtWidth = scratchCanvas.width
       tgtHeight= scratchCanvas.height
    }

    if ( !(IsPowerOf2(tgtWidth) && IsPowerOf2(tgtHeight)) ) {
      let r = 8
      let tsize=0
      let mdif = 6e6
      let d, j
      let h = Math.hypot(tgtWidth, tgtHeight)
      for(let i = 0; i<12; i++){
        if((d=Math.abs(tsize-h)) < mdif){
          mdif = d
          tsize = r * 2**i
          j=i
        }
      }
      tsize -= r * 2**(j-1)
      tsize = Math.min(2048, tsize)
      tgtWidth = tsize / 1
      tgtHeight = tsize / 1
    }

    scratchCanvas.width  = tgtWidth //video.videoWidth
    scratchCanvas.height = tgtHeight //video.videoHeight
    sctx.drawImage(video, 0, 0, scratchCanvas.width, scratchCanvas.height)
    return scratchCanvas//.toDataURL('image/jpeg', .5)
  }else{
    scratchCanvas.width  = 1
    scratchCanvas.height = 1
    return scratchCanvas//.toDataURL('image/jpeg', .5)
  }
}

const BindImage = async (gl, resource, binding, textureMode='image') => {
  let texImage
  switch(textureMode){
    case 'video':
     texImage = VideoToImage(resource)
    break
    case 'image':
      texImage = await ImageToPo2(resource)
    break
    default:
    break
  }
  //gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, binding)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImage);
  //gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  //gl.activeTexture(gl.TEXTURE0)
}


const AverageNormals = (verts, normals, shapeType) => {
  normals.length = 0
  var isPolyhedron = IsPolyhedron(shapeType)
  // expects triangles
  var n
  for(var i = 0; i<verts.length; i+=3){
    if(!(i%9)){
      n = Normal([
        [verts[i+0],verts[i+1],verts[i+2]],
        [verts[i+3],verts[i+4],verts[i+5]],
        [verts[i+6],verts[i+7],verts[i+8]]
      ], isPolyhedron)
    }
    normals[i*2+0] = verts[i+0]
    normals[i*2+1] = verts[i+1]
    normals[i*2+2] = verts[i+2]
    normals[i*2+3] = verts[i+0] + (n[0] - n[3])
    normals[i*2+4] = verts[i+1] + (n[1] - n[4])
    normals[i*2+5] = verts[i+2] + (n[2] - n[5])
  }
  
  var ret = []
  var modSrc = structuredClone(normals)
  var a, ct, ax, ay, az
  var X1a, Y1a, Z1a, X2a, Y2a, Z2a
  var X1b, Y1b, Z1b, X2b, Y2b, Z2b
  for(var i=0; i<normals.length; i+=6){
    X1a = normals[i+0]
    Y1a = normals[i+1]
    Z1a = normals[i+2]
    X2a = normals[i+3]
    Y2a = normals[i+4]
    Z2a = normals[i+5]
    ax = X2a
    ay = Y2a
    az = Z2a
    ct = 1
    for(var j=0; j<normals.length; j+=6){
      if(j!=i){
        X1b = normals[j+0]
        Y1b = normals[j+1]
        Z1b = normals[j+2]
        X2b = normals[j+3]
        Y2b = normals[j+4]
        Z2b = normals[j+5]
        if(Math.hypot(X1a - X1b, Y1a - Y1b, Z1a - Z1b) < .01){
          ax += X2b
          ay += Y2b
          az += Z2b
          ct++
        }
      }
    }
    modSrc[i+3] = ax /= ct
    modSrc[i+4] = ay /= ct
    modSrc[i+5] = az /= ct
  }
  modSrc.map((v,i)=>normals[i]=v)
}

const BasicShader = async (renderer, options=[]) => {
  
  const gl = renderer.gl
  var program
  
  var dataset = {
    iURL: null,
    locT: null,
    locUv: null,
    //muted: null,
    //video: null,
    locFov: null,
    program: null,
    //texture: null,
    //textureMode: null,
    optionalUniforms: [],
  }
  
  options.map(option => {
    Object.keys(option).forEach((key, idx) => {
      switch(key.toLowerCase()){
        case 'uniform':
          switch(option.uniform.type){
            case 'reflection':
              if(typeof option.uniform?.enabled == 'undefined' ||
                 !!option.uniform.enabled){
                var uniformOption = {
                  name:                option.uniform.type,
                  muted:               typeof option.uniform.muted == 'undefined' ?
                                         true : option.uniform.muted,
                  map:                 option.uniform.map,
                  loc:                 'locReflection',
                  value:               typeof option.uniform.value == 'undefined' ?
                                         .5 : option.uniform.value,
                  flatShading:         typeof option.uniform.flatShading == 'undefined' ?
                                         false : option.uniform.flatShading,
                  flatShadingUniform:  'refFlatShading',
                  dataType:            'uniform1f',
                  vertDeclaration:     `
                    varying vec3 reflectionPos;
                  `,
                  vertCode:            `
                    reflectionPos = nVec;
                  `,
                  fragDeclaration:     `
                    uniform float reflection;
                    uniform float refFlatShading;
                    uniform float refOmitEquirectangular;
                    uniform sampler2D reflectionMap;
                    varying vec3 reflectionPos;
                  `,
                  fragCode:            `
                    light = light * .5;
                    float refP1, refP2;
                    if(refOmitEquirectangular != 1.0){
                      float px = reflectionPos.x;
                      float py = reflectionPos.y;
                      float pz = reflectionPos.z;
                      refP1 = -atan(px, pz)/ M_PI / 2.0 + camOri.z / M_PI / 2.0;
                      refP2 = acos( py / sqrt(px * px + py * py + pz * pz)) / M_PI;
                    } else {
                      refP1 = vUv.x;
                      refP2 = vUv.y;
                    }
                    
                    vec2 refCoords = vec2(refP1, refP2);
                    mixColor.a = mixColorIp;
                    vec4 refCol = vec4(texture2D(reflectionMap, vec2(refCoords.x, refCoords.y)).rgb * 1.5, reflection / 2.0);
                    mixColor = merge(mixColor, refCol);
                    mixColorIp = light;
                  `,
                }
                dataset.optionalUniforms.push( uniformOption )
              }
            break
            case 'phong':
              if(typeof option.uniform?.enabled == 'undefined' ||
                 !!option.uniform.enabled){
                var uniformOption = {
                  name:                option.uniform.type,
                  loc:                 'locPhong',
                  value:               typeof option.uniform.value == 'undefined' ?
                                         .3 : option.uniform.value,
                  flatShading:         typeof option.uniform.flatShading == 'undefined' ?
                                         false : option.uniform.flatShading,
                  flatShadingUniform:  'phongFlatShading',
                  theta:                typeof option.uniform.theta == 'undefined' ?
                                          .6 : option.uniform.theta,
                  dataType:            'uniform1f',
                  vertDeclaration:     `
                    varying vec3 phongPos;
                  `,
                  vertCode:            `
                    phongPos = nVec;
                  `,
                  fragDeclaration:     `
                    uniform float phong;
                    uniform float phongTheta;
                    uniform float phongFlatShading;
                    varying vec3 phongPos;
                  `,
                  fragCode:            `
                    light = light * .75;
                    float phongP1, phongP2;
                    float px, py, pz;
                    if(flatShading != 0.0){
                      px = nVec.x;
                      py = nVec.y;
                      pz = nVec.z;
                    }else{
                      px = phongPos.x;
                      py = phongPos.y;
                      pz = phongPos.z;
                    }
                    phongP1 = (atan(px, pz) - camOri.z) + M_PI + phongTheta;
                    phongP2 = -acos( py / sqrt(px * px + py * py + pz * pz)) / M_PI;
                    
                    light = light + pow((1.0+cos(phongP1)) * (1.0+cos(phongP2)), 8.0) / 20000.0 * phong ;
                    mixColorIp = light;
                  `,
                }
                dataset.optionalUniforms.push( uniformOption )
              }
            break
          }
        break
      }
    })
  })
  
  let ret = {
    ConnectGeometry: null,
    datasets: [],
  }
  
  
  gl.enable(gl.DEPTH_TEST)
  //gl.clear(gl.COLOR_BUFFER_BIT)
  gl.disable(gl.CULL_FACE)
  //gl.cullFace(gl.BACK)
  if(renderer.alpha) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.enable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
  }else{
    //gl.cullFace(gl.BACK)
  }
  
  let uVertDeclaration = ''
  dataset.optionalUniforms.map(v=>{ uVertDeclaration += ("\n" + v.vertDeclaration + "\n") })
  let uVertCode= ''
  dataset.optionalUniforms.map(v=>{ uVertCode += ("\n" + v.vertCode + "\n") })

  let uFragDeclaration = ''
  dataset.optionalUniforms.map(v=>{ uFragDeclaration += ("\n" + v.fragDeclaration + "\n") })
  let uFragCode= ''
  dataset.optionalUniforms.map(v=>{ uFragCode += ("\n" + v.fragCode + "\n") })

  ret.vert = `
    precision mediump float;
    #define M_PI 3.14159265358979323
    attribute vec2 uv;
    ${uVertDeclaration}
    uniform float t;
    uniform vec3 color;
    uniform float ambientLight;
    uniform vec3 camPos;
    uniform vec3 camOri;
    uniform vec3 geoPos;
    uniform vec3 geoOri;
    uniform float fov;
    uniform float equirectangular;
    uniform float renderNormals;
    uniform vec2 resolution;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 normalVec;
    varying vec2 vUv;
    varying vec2 uvi;
    varying vec3 nVec;
    varying vec3 nVeci;
    varying vec3 fPos;
    varying vec3 fPosi;
    varying vec3 vnorm;
    varying float skip;
    
    
    vec3 R(vec3 pos, vec3 rot){
      float p, d;
      pos.x = sin(p=atan(pos.x,pos.z)+rot.z)*(d=sqrt(pos.x*pos.x+pos.z*pos.z));
      pos.z = cos(p)*d;
      pos.y = sin(p=atan(pos.y,pos.z)+rot.y)*(d=sqrt(pos.y*pos.y+pos.z*pos.z));
      pos.z = cos(p)*d;
      pos.x = sin(p=atan(pos.x,pos.y)+rot.x)*(d=sqrt(pos.x*pos.x+pos.y*pos.y));
      pos.y = cos(p)*d;
      return pos;
    }
    
    void main(){
      float cx, cy, cz;
      if(renderNormals == 1.0){
        cx = normal.x;
        cy = normal.y;
        cz = normal.z;
      }else{
        cx = position.x;
        cy = position.y;
        cz = position.z;
      }
      
      
      uvi = uv / 2.0;
      uvi = vec2(uvi.x, .5 - uvi.y);
      
      nVeci = normalVec;
      
      fPos = vec3(position.x, position.y, position.z);
      fPosi = position;
      vnorm = normal;
      
      
      // camera rotation
      
      vec3 geo = R(geoPos, camOri);
      vec3 pos = R(vec3(cx, cy, cz), geoOri);
                               
      pos = R(vec3(pos.x, pos.y, pos.z), camOri);
      
      nVec = vec3(normalVec.x, normalVec.y, normalVec.z);
      nVec = R(nVec, geoOri);
                                          
      nVec = R(nVec, vec3(0.0, camOri.y, camOri.z));
                                          
      
      ${uVertCode}
      
      float camz = camPos.z / 1e3 * pow(5.0, (log(fov) / 1.609438));
      
      float Z = pos.z + camz + geo.z;
      if(Z > 0.0) {
        float X = ((pos.x + camPos.x + geo.x) / Z * fov / resolution.x);
        float Y = ((pos.y + camPos.y + geo.y) / Z * fov / resolution.y);
        //gl_PointSize = 100.0 / Z;
        gl_Position = vec4(X, Y, Z/10000.0, 1.0);
        skip = 0.0;
        vUv = uv;
      }else{
        skip = 1.0;
      }
    }
  `
  
  ret.frag = `
    precision mediump float;
    #define M_PI 3.14159265358979323
    ${uFragDeclaration}
    uniform float t;
    uniform vec2 resolution;
    uniform float flatShading;
    uniform float isSprite;
    uniform float ambientLight;
    uniform float renderNormals;
    uniform float equirectangular;
    uniform float colorMix;
    uniform vec3 color;
    uniform sampler2D baseTexture;
    uniform vec3 camPos;
    uniform vec3 camOri;
    uniform vec3 geoPos;
    uniform vec3 geoOri;
    varying vec2 vUv;
    varying vec2 uvi;
    varying vec3 vnorm;
    varying vec3 nVec;
    varying vec3 nVeci;
    varying vec3 fPos;
    varying vec3 fPosi;
    varying float skip;

    vec4 merge (vec4 col1, vec4 col2){
      return vec4((col1.rgb * col1.a) + (col2.rgb * col2.a), 1.0);
    }
    
    vec2 Coords(float flatShading) {
      if(equirectangular == 1.0){
        float p;
        float p2;
        p = flatShading == 1.0 ? atan(nVeci.x, nVeci.z): atan(fPosi.x, fPosi.z);
        float p1;
        p1 = p / M_PI / 2.0;
        p2 = flatShading == 1.0 ?
              acos(nVec.y / (sqrt(nVeci.x*nVec.x + nVec.y*nVec.y + nVec.z*nVec.z)+.00001)) / M_PI   :
              p2 = acos(fPosi.y / (sqrt(fPosi.x*fPosi.x + fPosi.y*fPosi.y + fPosi.z*fPosi.z)+.00001)) / M_PI;
        return vec2(p1, p2);
      }else{
        return vUv;
      }
    }

    void main() {
      float X, Y, Z, p, d, i, j;
      vec2 coords = Coords(0.0);
      float mixColorIp = colorMix;
      float baseColorIp = 1.0 - mixColorIp;
      vec4 mixColor = vec4(color.rgb, 1.0);
      float light = ambientLight / 2.0;
      float colorMag = 1.0;
      float alpha = 1.0;
      if(skip != 1.0){
        if(renderNormals == 1.0){
          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5 * alpha);
        }else{
          ${uFragCode}
          vec4 texel = texture2D( baseTexture, coords);
          if(isSprite != 0.0){
            gl_FragColor = merge(gl_FragColor, vec4(texel.rgb, texel.a));
          }else{
            texel = vec4(texel.rgb * light * 2.0, 1.0);
            mixColor.a = mixColorIp;
            texel.a = baseColorIp;
            vec4 col = merge(mixColor, texel);
            gl_FragColor = vec4(col.rgb * colorMag, alpha);
          }
        }
      }
    }
  `
  
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vertexShader, ret.vert)
  gl.compileShader(vertexShader)

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fragmentShader, ret.frag)
  gl.compileShader(fragmentShader)

  ret.ConnectGeometry = async ( geometry ) => {
                            
    var dset = structuredClone(dataset)
    ret.datasets = [...ret.datasets, dset]
    
    dset.program = gl.createProgram()
    
    gl.attachShader(dset.program, vertexShader)
    gl.attachShader(dset.program, fragmentShader)
    gl.linkProgram(dset.program)

    geometry.shader = ret
    var textureURL = geometry.map
    geometry.datasetIdx = ret.datasets.length - 1

    //gl.detachShader(dset.program, vertexShader)
    //gl.detachShader(dset.program, fragmentShader)
    //gl.deleteShader(vertexShader)
    //gl.deleteShader(fragmentShader)
    
                              
    if (gl.getProgramParameter(dset.program, gl.LINK_STATUS)) {
        
      gl.useProgram(dset.program)
      
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertex_buffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.Vertex_Index_Buffer)
      dset.locPosition = gl.getAttribLocation(dset.program, "position")
      gl.vertexAttribPointer(dset.locPosition, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(dset.locPosition)

      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uv_buffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.UV_Index_Buffer)
      dset.locUv= gl.getAttribLocation(dset.program, "uv")
      gl.vertexAttribPointer(dset.locUv , 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(dset.locUv)

      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normal_buffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.Normal_Index_Buffer)
      dset.locNormal = gl.getAttribLocation(dset.program, "normal")
      gl.vertexAttribPointer(dset.locNormal, 3, gl.FLOAT, true, 0, 0)
      gl.enableVertexAttribArray(dset.locNormal)
      
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normalVec_buffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.NormalVec_Index_Buffer)
      dset.locNormalVec = gl.getAttribLocation(dset.program, "normalVec")
      gl.vertexAttribPointer(dset.locNormalVec, 3, gl.FLOAT, true, 0, 0)
      gl.enableVertexAttribArray(dset.locNormalVec)
      
      let image
      dset.optionalUniforms.map(async (uniform) => {
        switch(uniform.name){
          case 'reflection':
            var url = uniform.map
            if(url){
              let l
              let suffix = (l=url.split('.'))[l.length-1].toLowerCase()
              uniform.refTexture = gl.createTexture()
              switch(suffix){
                case 'mp4': case 'webm': case 'avi': case 'mkv': case 'ogv':
                  uniform.textureMode = 'video'
                  if(cache.textures.filter(v=>v.url == url).length){
                    cacheItem = cache.textures.filter(v=>v.url == url)[0]
                    uniform.video = cacheItem.resource
                    ret.datasets = [...ret.datasets, {texture: cacheItem.texture, iURL: url }]
                    await BindImage(gl, uniform.video, uniform.refTexture, uniform.textureMode)
                  }else{
                    uniform.video = document.createElement('video')
                    uniform.video.playbackRate = geometry.playbackSpeed
                    uniform.video.defaultPlaybackRate = geometry.playbackSpeed
                    ret.datasets = [...ret.datasets, {
                      texture: uniform.refTexture, iURL: url }]
                    uniform.video.loop = true
                    if(uniform.muted) uniform.video.muted = true
                    uniform.video.oncanplay = async () => {
                      uniform.video.play()
                      await BindImage(gl, uniform.video, uniform.refTexture, uniform.textureMode)
                    }
                    await fetch(url).then(res=>res.blob()).then(data => {
                      uniform.video.src = URL.createObjectURL(data)
                    })
                    cache.textures.push({
                      url,
                      resource: uniform.video,
                      texture: uniform.refTexture
                    })
                  }
                break
                default:
                  uniform.textureMode = 'image'
                  if(cache.textures.filter(v=>v.url == url).length){
                    cacheItem = cache.textures.filter(v=>v.url == url)[0]
                    image = cacheItem.resource
                    ret.datasets = [...ret.datasets, {texture: cacheItem.texture, iURL: url }]
                    await BindImage(gl, image, uniform.refTexture, uniform.textureMode)
                  }else{
                    image = new Image()
                    ret.datasets = [...ret.datasets, {
                      texture: uniform.refTexture, iURL: url }]
                    gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
                    await fetch(url).then(res=>res.blob()).then(data => {
                      image.src = URL.createObjectURL(data)
                    })
                    image.onload = async () => await BindImage(gl, image, uniform.refTexture, uniform.textureMode)
                    cache.textures.push({
                      url,
                      resource: image,
                      texture: uniform.refTexture
                    })
                  }                        
                break
              }
            }
            gl.useProgram(dset.program)
            uniform.locRefOmitEquirectangular = gl.getUniformLocation(dset.program, "refOmitEquirectangular")
            gl.uniform1f(uniform.locRefOmitEquirectangular,
               ( geometry.shapeType == 'rectangle' || geometry.shapeType == 'sprite' ) ? 1.0 : 0.0)
            uniform.locRefTexture = gl.getUniformLocation(dset.program, "reflectionMap")
            gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
            gl.uniform1i(uniform.locRefTexture, 1)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
          break
          case 'phong':
            uniform.locPhongTheta = gl.getUniformLocation(dset.program, uniform.theta)
            gl.uniform1f(uniform.locPhongTheta, uniform.theta)
          break
        }
        uniform.locFlatShading = gl.getUniformLocation(dset.program, uniform.flatShadingUniform)
        gl.uniform1f(uniform.locFlatShading , uniform.flatShading ? 1.0 : 0.0)
        
        
        
        uniform.loc = gl.getUniformLocation(dset.program, uniform.name)
        gl[uniform.dataType](uniform.loc, uniform.value)
      })

      dset.locColor = gl.getUniformLocation(dset.program, "color")
      gl.uniform3f(dset.locColor, ...HexToRGB(geometry.color))

      dset.locColorMix = gl.getUniformLocation(dset.program, "colorMix")
      gl.uniform1f(dset.locColorMix, geometry.colorMix)

      dset.locIsSprite = gl.getUniformLocation(dset.program, "isSprite")
      gl.uniform1f(dset.locIsSprite, geometry.isSprite)

      dset.locResolution = gl.getUniformLocation(dset.program, "resolution")
      gl.uniform2f(dset.locResolution, renderer.width, renderer.height)

      dset.locEquirectangular = gl.getUniformLocation(dset.program, "equirectangular")
      gl.uniform1f(dset.locEquirectangular, geometry.equirectangular ? 1.0 : 0.0)

      dset.locT = gl.getUniformLocation(dset.program, "t")
      gl.uniform1f(dset.locT, 0)

      dset.locAmbientLight = gl.getUniformLocation(dset.program, "ambientLight")
      gl.uniform1f(dset.locAmbientLight, renderer.ambientLight)

      dset.texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, dset.texture)
      dset.locTexture = gl.getUniformLocation(dset.program, "baseTexture")
      
      dset.iURL = textureURL
      if(textureURL){
        let l
        let suffix = (l=textureURL.split('.'))[l.length-1].toLowerCase()
        switch(suffix){
          case 'mp4': case 'webm': case 'avi': case 'mkv': case 'ogv':
            dset.video = document.createElement('video')
            dset.video.playbackRate = geometry.playbackSpeed
            dset.video.defaultPlaybackRate = geometry.playbackSpeed
            geometry.textureMode = 'video'
            if(cache.textures.filter(v=>v.url == dset.iURL).length > 1){
              cacheItem = cache.textures.filter(v=>v.url == dset.iURL)[0]
              dset.video = cacheItem.resource
              dset.texture = cacheItem.texture
              await BindImage(gl, dset.video, dset.texture, geometry.textureMode)
            }else{
              dset.video.loop = true
              if(geometry.muted) dset.video.muted = true
              dset.video.oncanplay = async () => {
                dset.video.play()
                await BindImage(gl, dset.video, dset.texture, geometry.textureMode)
              }
              await fetch(dset.iURL).then(res=>res.blob()).then(data => {
                dset.video.src = URL.createObjectURL(data)
              })
              cache.textures.push({
                url: dset.iURL,
                resource: dset.video,
                texture: dset.texture
              })
            }
          break
          default:
            geometry.textureMode = 'image'
            if(cache.textures.filter(v=>v.url == dset.iURL).length > 1){
              cacheItem = cache.textures.filter(v=>v.url == dset.iURL)[0]
              dset.texture = cacheItem.texture
              image = cacheItem.resource
              await BindImage(gl, image, dset.texture, geometry.textureMode)
            }else{
              image = new Image()
              await fetch(dset.iURL).then(res=>res.blob()).then(data => {
                image.src = URL.createObjectURL(data)
              })
              image.onload = async () => await BindImage(gl, image,
                                                dset.texture, geometry.textureMode)
              cache.textures.push({
                url: dset.iURL,
                resource: image,
                texture: dset.texture
              })
            }
          break
        }
      }
      
      gl.useProgram(dset.program)
      gl.uniform1i(dset.locTexture, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dset.texture)
      

      dset.locCamPos         = gl.getUniformLocation(dset.program, "camPos")
      dset.locCamOri         = gl.getUniformLocation(dset.program, "camOri")
      dset.locGeoPos         = gl.getUniformLocation(dset.program, "geoPos")
      dset.locGeoOri         = gl.getUniformLocation(dset.program, "geoOri")
      dset.locFov            = gl.getUniformLocation(dset.program, "fov")
      dset.locRenderNormals  = gl.getUniformLocation(dset.program, "renderNormals")
      gl.uniform1f(dset.locCamPos,        renderer.x, renderer.y, renderer.z)
      gl.uniform1f(dset.locCamOri,        renderer.roll, renderer.pitch, renderer.yaw)
      gl.uniform1f(dset.locGeoPos,        renderer.x, renderer.y, renderer.z)
      gl.uniform1f(dset.locGeoOri,        geometry.roll, geometry.pitch, geometry.yaw)
      gl.uniform1f(dset.locFov,           renderer.fov)
      gl.uniform1f(dset.locRenderNormals, 0)
    }else{
      var info = gl.getProgramInfoLog(dset.program)
      var vshaderInfo = gl.getShaderInfoLog(vertexShader)
      var fshaderInfo = gl.getShaderInfoLog(fragmentShader)
      console.error(`bad shader :( ${info}`)
      console.error(`vShader info : ${vshaderInfo}`)
      console.error(`fShader info : ${fshaderInfo}`)
    }
  }
  
  return ret
}

const IsPolyhedron = shapeType => {
  var isPolyhedron
  switch(shapeType){
    case 'tetrahedron': isPolyhedron = true; break
    case 'cube': isPolyhedron = true; break
    case 'octahedron': isPolyhedron = true; break
    case 'dodecahedron': isPolyhedron = true; break
    case 'icosahedron': isPolyhedron = true; break
    case 'tetrahedron': isPolyhedron = true; break
    default: isPolyhedron = false; break
  }
  return isPolyhedron
}

const GeometryFromRaw = async (raw, texCoords, size, subs,
                         sphereize, flipNormals, quads=false, shapeType='') => {
  var j, i, X, Y, Z, b, l
  var a = []
  var f = []
  var e = raw
  var geometry = []
  
  var hint = `${shapeType}_${subs}`;
  var shape
  var isPolyhedron = IsPolyhedron(shapeType)
  switch(shapeType){
    case 'obj': shape = await subbed(0, 1, sphereize, e, texCoords, hint); break
    default: shape = await subbed(subs + (isPolyhedron?1:0), 1, sphereize, e, texCoords, hint); break
  }
  
  shape.map(v => {
    v.verts.map(q=>{
      X = q[0] *= size //  (sphereize ? .5 : 1.5)
      Y = q[1] *= size //  (sphereize ? .5 : 1.5)
      Z = q[2] *= size //  (sphereize ? .5 : 1.5)
    })
    if(quads){
      a = [...a, v.verts[0],v.verts[1],v.verts[2],
                 v.verts[2],v.verts[3],v.verts[0]]
      f = [...f, v.uvs[0],v.uvs[1],v.uvs[2],
                 v.uvs[2],v.uvs[3],v.uvs[0]]
    }else{
      a = [...a, ...v.verts]
      f = [...f, ...v.uvs]
    }
  })
  
  for(i = 0; i < a.length; i++){
    var normal
    j = i/3 | 0
    b = [a[j*3+0], a[j*3+1], a[j*3+2]]
    if(!(i%3)){
      normal = Normal(b, isPolyhedron)
      if(!flipNormals){
        normal[3] = normal[0] + (normal[0]-normal[3])
        normal[4] = normal[1] + (normal[1]-normal[4])
        normal[5] = normal[2] + (normal[2]-normal[5])
      }
    }
    l = flipNormals ? a.length - i - 1 : i
    geometry = [...geometry, {
      position: a[l],
      normal: [...a[l],
               a[l][0] + (normal[3]-normal[0]),
               a[l][1] + (normal[4]-normal[1]),
               a[l][2] + (normal[5]-normal[2])],
      texCoord: f[l],
    }]
  }
  return {
    geometry
  }
}

const subbed = async (subs, size, sphereize, shape, texCoords, hint='') => {
  
  var base, baseTexCoords, l, X, Y, Z
  var X1, Y1, Z1, X2, Y2, Z2
  var X3, Y3, Z3, X4, Y4, Z4, X5, Y5, Z5
  var tX1, tY1, tX2, tY2
  var tX3, tY3, tX4, tY4, tX5, tY5
  var mx1, my1, mz1, mx2, my2, mz2
  var mx3, my3, mz3, mx4, my4, mz4, mx5, my5, mz5
  var tmx1, tmy1, tmx2, tmy2
  var tmx3, tmy3, tmx4, tmy4, tmx5, tmy5
  var cx, cy, cz, ip1, ip2, a, ta
  var tcx, tcy, tv
  var resolved = false
  if(0 && subs > 1 && hint){
    var fileBase
    switch(hint){
      case 'tetrahedron_0': resolved = true; fileBase = hint; break
      case 'tetrahedron_1': resolved = true; fileBase = hint; break
      case 'tetrahedron_2': resolved = true; fileBase = hint; break
      case 'tetrahedron_3': resolved = true; fileBase = hint; break
      case 'tetrahedron_4': resolved = true; fileBase = hint; break
      case 'cube_0': resolved = true; fileBase = hint; break
      case 'cube_1': resolved = true; fileBase = hint; break
      case 'cube_2': resolved = true; fileBase = hint; break
      case 'cube_3': resolved = true; fileBase = hint; break
      case 'cube_4': resolved = true; fileBase = hint; break
      case 'octahedron_0': resolved = true; fileBase = hint; break
      case 'octahedron_1': resolved = true; fileBase = hint; break
      case 'octahedron_2': resolved = true; fileBase = hint; break
      case 'octahedron_3': resolved = true; fileBase = hint; break
      case 'octahedron_4': resolved = true; fileBase = hint; break
      case 'dodecahedron_0': resolved = true; fileBase = hint; break
      case 'dodecahedron_1': resolved = true; fileBase = hint; break
      case 'dodecahedron_2': resolved = true; fileBase = hint; break
      case 'dodecahedron_3': resolved = true; fileBase = hint; break
      case 'dodecahedron_4': resolved = true; fileBase = hint; break
      case 'icosahedron_0': resolved = true; fileBase = hint; break
      case 'icosahedron_1': resolved = true; fileBase = hint; break
      case 'icosahedron_2': resolved = true; fileBase = hint; break
      case 'icosahedron_3': resolved = true; fileBase = hint; break
      case 'icosahedron_4': resolved = true; fileBase = hint; break
    }
    
    if(resolved){
      var url = `https://srmcgann.github.io/Coordinates/prebuilt%20shapes/`
      await fetch(`${url}${fileBase}_full.json`).then(res=>res.json()).then(data=>{
        shape     = data.shape
        texCoords = data.texCoords
      })
    }
  }
  if(!resolved){
    for(var m=subs; m--;){
      base = shape
      baseTexCoords = texCoords
      shape = []
      texCoords = []
      base.map((v, i) => {
        l = 0
        tv = baseTexCoords[i]
        X1 = v[l][0]
        Y1 = v[l][1]
        Z1 = v[l][2]
        tX1 = tv[l][0]
        tY1 = tv[l][1]
        l = 1
        X2 = v[l][0]
        Y2 = v[l][1]
        Z2 = v[l][2]
        tX2 = tv[l][0]
        tY2 = tv[l][1]
        l = 2
        X3 = v[l][0]
        Y3 = v[l][1]
        Z3 = v[l][2]
        tX3 = tv[l][0]
        tY3 = tv[l][1]
        if(v.length > 3){
          l = 3
          X4 = v[l][0]
          Y4 = v[l][1]
          Z4 = v[l][2]
          tX4 = tv[l][0]
          tY4 = tv[l][1]
          if(v.length > 4){
            l = 4
            X5 = v[l][0]
            Y5 = v[l][1]
            Z5 = v[l][2]
            tX5 = tv[l][0]
            tY5 = tv[l][1]
          }
        }
        mx1 = (X1+X2)/2
        my1 = (Y1+Y2)/2
        mz1 = (Z1+Z2)/2
        mx2 = (X2+X3)/2
        my2 = (Y2+Y3)/2
        mz2 = (Z2+Z3)/2

        tmx1 = (tX1+tX2)/2
        tmy1 = (tY1+tY2)/2
        tmx2 = (tX2+tX3)/2
        tmy2 = (tY2+tY3)/2
        a = []
        ta = []
        switch(v.length){
          case 3:
            mx3 = (X3+X1)/2
            my3 = (Y3+Y1)/2
            mz3 = (Z3+Z1)/2
            tmx3 = (tX3+tX1)/2
            tmy3 = (tY3+tY1)/2
            X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
            X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
            X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []
            
            X = tX1, Y = tY1, ta = [...ta, [X,Y]]
            X = tmx1, Y = tmy1, ta = [...ta, [X,Y]]
            X = tmx3, Y = tmy3, ta = [...ta, [X,Y]]
            texCoords= [...texCoords, ta]
            ta = []
            
            X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
            X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
            X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []
            
            X = tmx1, Y = tmy1, ta = [...ta, [X,Y]]
            X = tX2, Y = tY2, ta = [...ta, [X,Y]]
            X = tmx2, Y = tmy2, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            
            X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
            X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
            X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []
            
            X = tmx3, Y = tmy3, ta = [...ta, [X,Y]]
            X = tmx2, Y = tmy2, ta = [...ta, [X,Y]]
            X = tX3, Y = tY3, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            
            X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
            X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
            X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
            shape = [...shape, a]

            X = tmx1, Y = tmy1, ta = [...ta, [X,Y]]
            X = tmx2, Y = tmy2, ta = [...ta, [X,Y]]
            X = tmx3, Y = tmy3, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            break
          case 4:
            mx3 = (X3+X4)/2
            my3 = (Y3+Y4)/2
            mz3 = (Z3+Z4)/2
            mx4 = (X4+X1)/2
            my4 = (Y4+Y1)/2
            mz4 = (Z4+Z1)/2

            tmx3 = (tX3+tX4)/2
            tmy3 = (tY3+tY4)/2
            tmx4 = (tX4+tX1)/2
            tmy4 = (tY4+tY1)/2

            cx = (X1+X2+X3+X4)/4
            cy = (Y1+Y2+Y3+Y4)/4
            cz = (Z1+Z2+Z3+Z4)/4

            tcx = (tX1+tX2+tX3+tX4)/4
            tcy = (tY1+tY2+tY3+tY4)/4

            X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
            X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tX1, Y = tY1, ta = [...ta, [X,Y]]
            X = tmx1, Y = tmy1, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            X = tmx4, Y = tmy4, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []

            X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
            X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
            X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tmx1, Y = tmy1, ta = [...ta, [X,Y]]
            X = tX2, Y = tY2, ta = [...ta, [X,Y]]
            X = tmx2, Y = tmy2, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []

            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
            X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
            X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            X = tmx2, Y = tmy2, ta = [...ta, [X,Y]]
            X = tX3, Y = tY3, ta = [...ta, [X,Y]]
            X = tmx3, Y = tmy3, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            
            X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
            X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
            shape = [...shape, a]

            X = tmx4, Y = tmy4, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            X = tmx3, Y = tmy3, ta = [...ta, [X,Y]]
            X = tX4, Y = tY4, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            break
          case 5:
            cx = (X1+X2+X3+X4+X5)/5
            cy = (Y1+Y2+Y3+Y4+Y5)/5
            cz = (Z1+Z2+Z3+Z4+Z5)/5

            tcx = (tX1+tX2+tX3+tX4+tX5)/5
            tcy = (tY1+tY2+tY3+tY4+tY5)/5

            mx3 = (X3+X4)/2
            my3 = (Y3+Y4)/2
            mz3 = (Z3+Z4)/2
            mx4 = (X4+X5)/2
            my4 = (Y4+Y5)/2
            mz4 = (Z4+Z5)/2
            mx5 = (X5+X1)/2
            my5 = (Y5+Y1)/2
            mz5 = (Z5+Z1)/2

            tmx3 = (tX3+tX4)/2
            tmy3 = (tY3+tY4)/2
            tmx4 = (tX4+tX5)/2
            tmy4 = (tY4+tY5)/2
            tmx5 = (tX5+tX1)/2
            tmy5 = (tY5+tY1)/2

            X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
            X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []
            
            X = tX1, Y = tY1, ta = [...ta, [X,Y]]
            X = tX2, Y = tY2, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            
            X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
            X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []
            
            X = tX2, Y = tY2, ta = [...ta, [X,Y]]
            X = tX3, Y = tY3, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            
            X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
            X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tX3, Y = tY3, ta = [...ta, [X,Y]]
            X = tX4, Y = tY4, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []

            X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
            X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tX4, Y = tY4, ta = [...ta, [X,Y]]
            X = tX5, Y = tY5, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []

            X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
            X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
            X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
            shape = [...shape, a]
            a = []

            X = tX5, Y = tY5, ta = [...ta, [X,Y]]
            X = tX1, Y = tY1, ta = [...ta, [X,Y]]
            X = tcx, Y = tcy, ta = [...ta, [X,Y]]
            texCoords = [...texCoords, ta]
            ta = []
            break
        }
      })
    }
  }

  if(sphereize){
    var d, val
    ip1 = sphereize
    ip2 = 1-sphereize
    for(var m=2; m--;) {
      (m ? shape : texCoords).map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = m ? q[2] : 0
          d = Math.hypot(X,Y,Z)
          X /= d
          Y /= d
          Z /= d
          q[0]       = X *= ip1 + d*ip2
          q[1]       = Y *= ip1 + d*ip2
          if(m) q[2] = Z *= ip1 + d*ip2
        })
      })
    }
  }
  
  return shape.map((v, i) => {
    return {
      verts: v,
      uvs: texCoords[i]
    }
  })
}


const Camera = (x=0, y=0, z=0, roll=0, pitch=0, yaw=0) => ({ x, y, z, roll, pitch, yaw })


const Cylinder = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType, rw, cl) => {
  var ret = []
  var X1,Y1,Z1, X2,Y2,Z2, X3,Y3,Z3, X4,Y4,Z4
  var TX1,TY1, TX2,TY2, TX3,TY3, TX4,TY4
  var p
  var texCoords = []
  for(var j = 0; j < rw; j++){
    var j2 = j-.5
    for(var i = 0; i < cl; i++){
      X1 = S(p=Math.PI*2/cl*i)
      Y1 = -.5 + 1/rw*j2
      Z1 = C(p=Math.PI*2/cl*i)
      X2 = S(p=Math.PI*2/cl*(i+1))
      Y2 = -.5 + 1/rw*j2
      Z2 = C(p=Math.PI*2/cl*(i+1))
      X3 = S(p=Math.PI*2/cl*(i+1))
      Y3 = -.5 + 1/rw*(j2+1)
      Z3 = C(p=Math.PI*2/cl*(i+1))
      X4 = S(p=Math.PI*2/cl*i)
      Y4 = -.5 + 1/rw*(j2+1)
      Z4 = C(p=Math.PI*2/cl*i)
      
      var p1 = Math.atan2(X1,Z1)
      var p2 = Math.atan2(X2,Z2)
      var p3 = Math.atan2(X3,Z3)
      var p4 = Math.atan2(X4,Z4)
      
      if(Math.abs(p1-p2) > Math.PI){
        p1 -= Math.PI*2
        p4 -= Math.PI*2
      }
      
      TX1 = (p1+Math.PI) / Math.PI / 2
      TY1 = Y1 + .5
      TX2 = (p2+Math.PI) / Math.PI / 2
      TY2 = Y2 + .5
      TX3 = (p3+Math.PI) / Math.PI / 2
      TY3 = Y3 + .5
      TX4 = (p4+Math.PI) / Math.PI / 2
      TY4 = Y4 + .5
      
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3], [X4,Y4,Z4]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3], [TX4,TY4]]]
      
      /* //triangulate
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3]]]
      ret = [...ret, [[X3,Y3,Z3], [X4,Y4,Z4], [X1,Y1,Z1]]]
      texCoords = [...texCoords, [[TX3,TY3], [TX4,TY4], [TX1,TY1]]]
      */
    }
  }
  return await GeometryFromRaw(ret, texCoords, size / 1.2, subs,
                         sphereize, flipNormals, true, shapeType)
}

const Torus = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType, rw, cl) => {
  var ret = []
  var X, Y, Z
  var X1,Y1,Z1, X2,Y2,Z2, X3,Y3,Z3, X4,Y4,Z4
  var TX1,TY1, TX2,TY2, TX3,TY3, TX4,TY4
  var p, d
  var texCoords = []
  var rw_ = rw * 4
  var rad1 = .5
  var rad2 = 1.25
  for(var j = 0; j < rw_; j++){
    var j2 = j+.5
    for(var i = 0; i < cl; i++){

      X = S(p=Math.PI*2/cl*i) * rad1 + rad2
      Y = C(p) * rad1
      Z = 0
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2 + Math.PI/2
      d = Math.hypot(X, Z)
      X1 = S(p) * d
      Y1 = Y
      Z1 = C(p) * d

      X = S(p=Math.PI*2/cl*(i+1)) * rad1 + rad2
      Y = C(p) * rad1
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2 + Math.PI/2
      d = Math.hypot(X, Z)
      X2 = S(p) * d
      Y2 = Y
      Z2 = C(p) * d

      X = S(p=Math.PI*2/cl*(i+1)) * rad1 + rad2
      Y = C(p) * rad1
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * (j2+1) + Math.PI/2
      d = Math.hypot(X, Z)
      X3 = S(p) * d
      Y3 = Y
      Z3 = C(p) * d

      X = S(p=Math.PI*2/cl*i) * rad1 + rad2
      Y = C(p) * rad1
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * (j2+1) + Math.PI/2
      d = Math.hypot(X, Z)
      X4 = S(p) * d
      Y4 = Y
      Z4 = C(p) * d

      var p1 = Math.atan2(X1,Z1)
      var p2 = Math.atan2(X2,Z2)
      var p3 = Math.atan2(X3,Z3)
      var p4 = Math.atan2(X4,Z4)
      
      if(Math.abs(p1-p3) > Math.PI){
        p3 += Math.PI*2
        p4 += Math.PI*2
      }
      
      TX1 = (p1+Math.PI) / Math.PI / 2
      TY1 = Y1 + .5
      TX2 = (p2+Math.PI) / Math.PI / 2
      TY2 = Y2 + .5
      TX3 = (p3+Math.PI) / Math.PI / 2
      TY3 = Y3 + .5
      TX4 = (p4+Math.PI) / Math.PI / 2
      TY4 = Y4 + .5
      
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3], [X4,Y4,Z4]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3], [TX4,TY4]]]
      
      /* //triangulate
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3]]]
      ret = [...ret, [[X3,Y3,Z3], [X4,Y4,Z4], [X1,Y1,Z1]]]
      texCoords = [...texCoords, [[TX3,TY3], [TX4,TY4], [TX1,TY1]]]
      */
    }
  }
  return await GeometryFromRaw(ret, texCoords, size / 1.2, subs,
                         sphereize, flipNormals, true, shapeType)
}

const TorusKnot = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType, rw, cl) => {
  var ret = []
  var X, Y, Z
  var X1,Y1,Z1, X2,Y2,Z2, X3,Y3,Z3, X4,Y4,Z4
  var TX1,TY1, TX2,TY2, TX3,TY3, TX4,TY4
  var p, d
  var texCoords = []
  var rw_ = rw * 8
  cl /= 1
  var rad1 = .75, p1, p2, p1a, p1b, p1c, p2a, p2b
  var oya, oyb, oyc
  var tRad1 = 3
  var twists = 1
  for(var j = 0; j < rw_ * 2; j++){
    for(var i = 0; i < cl; i++){
      
      var j2a = j+.5
      var j2b = j+1.5
      var j2c = j+2.5

      X1 = tRad1 + S(p1a=Math.PI*2*1.5*twists/rw_*j2a) /1
      Y1 = oya = C(p1a) * 2
      X2 = tRad1 + S(p1b=Math.PI*2*1.5*twists/rw_*j2b) /1
      Y2 = oyb = C(p1b) * 2
      X3 = tRad1 + S(p1c=Math.PI*2*1.5*twists/rw_*j2c) /1
      Y3 = oyc = C(p1c) * 2
      
      p2a = (Math.acos((Y2-Y1) / (Math.hypot(X2-X1, Y2-Y1)+.0001)) - Math.PI/2) / 2
      p2b = (Math.acos((Y3-Y2) / (Math.hypot(X3-X2, Y3-Y2)+.0001)) - Math.PI/2) / 2

      var rad2 = tRad1 + S(p1a) /1
      X = S(p=Math.PI*2/cl*i) * rad1 + rad2
      Y = C(p) * rad1 + oya
      Z = 0
      p = Math.atan2(Y, Z) + p2a
      d = Math.hypot(Y, Z)
      Y = S(p) * d
      Z = C(p) * d
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2a + Math.PI/2
      d = Math.hypot(X, Z)
      X1 = S(p) * d
      Y1 = Y
      Z1 = C(p) * d

      X = S(p=Math.PI*2/cl*(i+1)) * rad1 + rad2
      Y = C(p) * rad1 + oya
      Z = 0
      p = Math.atan2(Y, Z) + p2a
      d = Math.hypot(Y, Z)
      Y = S(p) * d
      Z = C(p) * d
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2a + Math.PI/2
      d = Math.hypot(X, Z)
      X2 = S(p) * d
      Y2 = Y
      Z2 = C(p) * d

      rad2 = tRad1 + S(p1b) /1
      X = S(p=Math.PI*2/cl*(i+1)) * rad1 + rad2
      Y = C(p) * rad1 + oyb
      Z = 0
      p = Math.atan2(Y, Z) + p2b
      d = Math.hypot(Y, Z)
      Y = S(p) * d
      Z = C(p) * d
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2b + Math.PI/2
      d = Math.hypot(X, Z)
      X3 = S(p) * d
      Y3 = Y
      Z3 = C(p) * d

      X = S(p=Math.PI*2/cl*i) * rad1 + rad2
      Y = C(p) * rad1 + oyb
      Z = 0
      p = Math.atan2(Y, Z) + p2b
      d = Math.hypot(Y, Z)
      Y = S(p) * d
      Z = C(p) * d
      p = Math.atan2(X, Z) + Math.PI*2/rw_ * j2b + Math.PI/2
      d = Math.hypot(X, Z)
      X4 = S(p) * d
      Y4 = Y
      Z4 = C(p) * d

      var p1 = Math.atan2(X1,Z1)
      var p2 = Math.atan2(X2,Z2)
      var p3 = Math.atan2(X3,Z3)
      var p4 = Math.atan2(X4,Z4)
      
      if(Math.abs(p1-p3) > Math.PI){
        p3 += Math.PI*2
        p4 += Math.PI*2
      }
      
      TX1 = (p1+Math.PI) / Math.PI / 2
      TY1 = Y1 + .5
      TX2 = (p2+Math.PI) / Math.PI / 2
      TY2 = Y2 + .5
      TX3 = (p3+Math.PI) / Math.PI / 2
      TY3 = Y3 + .5
      TX4 = (p4+Math.PI) / Math.PI / 2
      TY4 = Y4 + .5
      
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3], [X4,Y4,Z4]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3], [TX4,TY4]]]
      
      /* //triangulate
      ret = [...ret, [[X1,Y1,Z1], [X2,Y2,Z2], [X3,Y3,Z3]]]
      texCoords = [...texCoords, [[TX1,TY1], [TX2,TY2], [TX3,TY3]]]
      ret = [...ret, [[X3,Y3,Z3], [X4,Y4,Z4], [X1,Y1,Z1]]]
      texCoords = [...texCoords, [[TX3,TY3], [TX4,TY4], [TX1,TY1]]]
      */
    }
  }
  return await GeometryFromRaw(ret, texCoords, size / 1.2, subs,
                         sphereize, flipNormals, true, shapeType)
}



const Tetrahedron = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var X, Y, Z, p, tx, ty, ax, ay, az
  var f, i, j, l, a, b, ct, sz = 1
  var geometry = []
  var ret = []
  a = []
  let h = sz/1.4142/1.25
  for(i=3;i--;){
    X = S(p=Math.PI*2/3*i) * sz/1.25
    Y = C(p) * sz/1.25
    Z = h
    a = [...a, [X,Y,Z]]
  }
  ret = [...ret, a]
  for(j=3;j--;){
    a = []
    X = 0
    Y = 0
    Z = -h
    a = [...a, [X,Y,Z]]
    X = S(p=Math.PI*2/3*j) * sz/1.25
    Y = C(p) * sz/1.25
    Z = h
    a = [...a, [X,Y,Z]]
    X = S(p=Math.PI*2/3*(j+1)) * sz/1.25
    Y = C(p) * sz/1.25
    Z = h
    a = [...a, [X,Y,Z]]
    ret = [...ret, a]
  }
  ax=ay=az=ct=0
  ret.map(v=>{
    v.map(q=>{
      ax+=q[0]
      ay+=q[1]
      az+=q[2]
      ct++
    })
  })
  ax/=ct
  ay/=ct
  az/=ct
  ret.map(v=>{
    v.map(q=>{
      q[0]-=ax
      q[1]-=ay
      q[2]-=az
    })
  })

  var e = ret
  var texCoords = []
  for(i = 0; i < e.length; i++){
    a = []
    for(var k = e[i].length; k--;){
      switch(k) {
        case 0: tx=0, ty=0; break
        case 1: tx=1, ty=0; break
        case 2: tx=1, ty=1; break
        case 3: tx=0, ty=.5; break
        case 4: tx=0, ty=1; break
      }
      a = [...a, [tx, ty]]
    }
    texCoords = [...texCoords, a]
  }
  
  return GeometryFromRaw(e, texCoords, size, subs,
                         sphereize, flipNormals, false, shapeType)
 }

const Octahedron = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var X, Y, Z, p, tx, ty
  var f, i, j, l, a, b, sz = 1
  var geometry = []
  var ret = []
  let h = sz/1.25
  for(j=8;j--;){
    a = []
    X = 0
    Y = 0
    Z = h * (j<4?-1:1)
    a = [...a, [X,Y,Z]]
    X = S(p=Math.PI*2/4*j) * sz/1.25
    Y = C(p) * sz/1.25
    Z = 0
    a = [...a, [X,Y,Z]]
    X = S(p=Math.PI*2/4*(j+1)) * sz/1.25
    Y = C(p) * sz/1.25
    Z = 0
    a = [...a, [X,Y,Z]]
    ret = [...ret, a]
  }
  
  var e = ret
  var texCoords = []
  for(i = 0; i < e.length; i++){
    a = []
    for(var k = e[i].length; k--;){
      switch(k) {
        case 0: tx=0, ty=0; break
        case 1: tx=1, ty=0; break
        case 2: tx=1, ty=1; break
        case 3: tx=0, ty=.5; break
        case 4: tx=0, ty=1; break
      }
      a = [...a, [tx, ty]]
    }
    texCoords = [...texCoords, a]
  }
  
  return await GeometryFromRaw(e, texCoords, size, subs,
                         sphereize, flipNormals, false, shapeType)
}

    
const Icosahedron = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var i, X, Y, Z, d1, b, p, r, tx, ty
  var out, f, j, l, phi, a, cp
  var idx1a, idx2a, idx3a
  var idx1b, idx2b, idx3b
  var geometry = []
  var ret = []

  let B = [
    [[0,3],[1,0],[2,2]],
    [[0,3],[1,0],[1,3]],
    [[0,3],[2,3],[1,3]],
    [[0,2],[2,1],[1,0]],
    [[0,2],[1,3],[1,0]],
    [[0,2],[1,3],[2,0]],
    [[0,3],[2,2],[0,0]],
    [[1,0],[2,2],[2,1]],
    [[1,1],[2,2],[2,1]],
    [[1,1],[2,2],[0,0]],
    [[1,1],[2,1],[0,1]],
    [[0,2],[2,1],[0,1]],
    [[2,0],[1,2],[2,3]],
    [[0,0],[0,3],[2,3]],
    [[1,3],[2,0],[2,3]],
    [[2,3],[0,0],[1,2]],
    [[1,2],[2,0],[0,1]],
    [[0,0],[1,2],[1,1]],
    [[0,1],[1,2],[1,1]],
    [[0,2],[2,0],[0,1]],
  ]
  phi = .5+5**.5/2  //p[l]/p[l-1]
  a = [
    [-phi,-1,0],
    [phi,-1,0],
    [phi,1,0],
    [-phi,1,0],
  ]
  for(j=3;j--;ret=[...ret, b])for(b=[],i=4;i--;) b = [...b, [a[i][j],a[i][(j+1)%3],a[i][(j+2)%3]]]
  ret.map(v=>{
    v.map(q=>{
      q[0]*=1/2.25
      q[1]*=1/2.25
      q[2]*=1/2.25
    })
  })
  cp = JSON.parse(JSON.stringify(ret))
  out=[]
  a = []
  B.map(v=>{
    idx1a = v[0][0]
    idx2a = v[1][0]
    idx3a = v[2][0]
    idx1b = v[0][1]
    idx2b = v[1][1]
    idx3b = v[2][1]
    a = [...a, [cp[idx1a][idx1b],cp[idx2a][idx2b],cp[idx3a][idx3b]]]
  })
  out = [...out, ...a]

  var e = out
  var texCoords = []
  for(i = 0; i < e.length; i++){
    a = []
    for(var k = e[i].length; k--;){
      switch(k) {
        case 0: tx=0, ty=0; break
        case 1: tx=1, ty=0; break
        case 2: tx=1, ty=1; break
        case 3: tx=0, ty=.5; break
        case 4: tx=0, ty=1; break
      }
      a = [...a, [tx, ty]]
    }
    texCoords = [...texCoords, a]
  }
  
  return await GeometryFromRaw(e, texCoords, size, subs,
                         sphereize, flipNormals, false, shapeType)
}

const Dodecahedron = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var i, X, Y, Z, d1, b, p, r, tx, ty, f, i, j, l
  var ret = []
  var a = []
  let mind = -6e6
  for(i=5;i--;){
    X=S(p=Math.PI*2/5*i + Math.PI/5)
    Y=C(p)
    Z=0
    if(Y>mind) mind=Y
    a = [...a, [X,Y,Z]]
  }
  a=a.map(v=>{
    X = v[0]
    Y = v[1]-=mind
    Z = v[2]
    return R(X, Y, Z, {x:0, y:0, z:0,
                       roll:  0,
                       pitch: .553573,
                       yaw:   0})
  })
  b = structuredClone(a)
  b.map(v=>{
    v[1] *= -1
  })
  ret = [...ret, a, b]
  mind = -6e6
  ret.map(v=>{
    v.map(q=>{
      X = q[0]
      Y = q[1]
      Z = q[2]
      if(Z>mind)mind = Z
    })
  })
  d1=Math.hypot(ret[0][0][0]-ret[0][1][0],ret[0][0][1]-ret[0][1][1],ret[0][0][2]-ret[0][1][2])
  ret.map(v=>{
    v.map(q=>{
      q[2]-=mind+d1/2
    })
  })
  b = structuredClone(ret)
  b.map(v=>{
    v.map(q=>{
      q[2]*=-1
    })
  })
  ret = [...ret, ...b]
  b = structuredClone(ret)
  b.map(v=>{
    v.map(q=>{
      X = q[0]
      Y = q[1]
      Z = q[2]
      r = R(X, Y, Z, {x:0, y:0, z:0,
                         roll:  0,
                         pitch: 0,
                         yaw:   Math.PI/2})
      
      r = R(r[0], r[1], r[2], {x:0, y:0, z:0,
                         roll:  0,
                         pitch: Math.PI/2,
                         yaw:   0})
      q[0] = r[0]
      q[1] = r[1]
      q[2] = r[2]
    })
  })
  e = structuredClone(ret)
  e.map(v=>{
    v.map(q=>{
      X = q[0]
      Y = q[1]
      Z = q[2]
      r = R(X, Y, Z, {x:0, y:0, z:0,
                         roll:  0,
                         pitch: 0,
                         yaw:   Math.PI/2})
      
      r = R(r[0], r[1], r[2], {x:0, y:0, z:0,
                         roll:  Math.PI/2,
                         pitch: 0,
                         yaw:   0})
      q[0] = r[0]
      q[1] = r[1]
      q[2] = r[2]
    })
  })
  ret = [...ret, ...b, ...e]
  
  var e = ret
  var texCoords = []
  for(i = 0; i < e.length; i++){
    a = []
    for(var k = e[i].length; k--;){
      switch(k) {
        case 0: tx=0, ty=0; break
        case 1: tx=1, ty=0; break
        case 2: tx=1, ty=1; break
        case 3: tx=0, ty=.5; break
        case 4: tx=0, ty=1; break
      }
      a = [...a, [tx, ty]]
    }
    texCoords = [...texCoords, a]
  }
  
  return await GeometryFromRaw(e, texCoords, size / Math.max(1, (2 - sphereize)), subs,
                         sphereize, flipNormals, false, shapeType)
}




const Cube = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var p, pi=Math.PI, a, b, l, i, j, k, tx, ty, X, Y, Z
  var position, texCoord
  var geometry = []
  var e = [], f
  for(i=6; i--; e=[...e, b])for(b=[], j=4;j--;) b=[...b, [(a=[S(p=pi*2/4*j+pi/4), C(p), 2**.5/2])[i%3]*(l=i<3?1:-1),a[(i+1)%3]*l,a[(i+2)%3]*l]]
  
  var texCoords = []
  for(i = 0; i < e.length; i++){
    a = []
    for(var k = e[i].length; k--;){
      switch(k) {
        case 0: tx=0, ty=0; break
        case 1: tx=1, ty=0; break
        case 2: tx=1, ty=1; break
        case 3: tx=0, ty=1; break
      }
      a = [...a, [tx, ty]]
    }
    texCoords = [...texCoords, a]
  }
  
  let ret = await GeometryFromRaw(e, texCoords, size / 1.2, subs,
                         sphereize, flipNormals, true, shapeType)
                         
  return ret
}

const Rectangle = async (size = 1, subs = 0, sphereize = 0, flipNormals=false, shapeType) => {
  var p, pi=Math.PI, a, b, l, i, j, k, tx, ty, X, Y, Z
  var position, texCoord
  var geometry = []
  var e = []

//      a = [...a, v.verts[0],v.verts[1],v.verts[2],
//                 v.verts[2],v.verts[3],v.verts[0]]
//      f = [...f, v.uvs[0],v.uvs[1],v.uvs[2],
//                 v.uvs[2],v.uvs[3],v.uvs[0]]

  e = [[
        [-1, -1, 0],
        [1, -1, 0],
        [1, 1, 0],
        [-1, 1, 0],
      ]]
  var texCoords = [[
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]]
  
  
  return await GeometryFromRaw(e, texCoords, size / 1.5,  Math.max(2, subs),
                         sphereize, flipNormals, true, shapeType)
}

const IsPowerOf2 = (v, d=0) => {
  if(d>300) return false
  if(v==2) return true
  return IsPowerOf2(v/2, d+1)
}

const Normal = (facet, autoFlipNormals=false, X1=0, Y1=0, Z1=0) => {
  var ax = 0, ay = 0, az = 0, crs, d
  facet.map(q_=>{ ax += q_[0], ay += q_[1], az += q_[2] })
  ax /= facet.length, ay /= facet.length, az /= facet.length
  var b1 = facet[2][0]-facet[1][0], b2 = facet[2][1]-facet[1][1], b3 = facet[2][2]-facet[1][2]
  var c1 = facet[1][0]-facet[0][0], c2 = facet[1][1]-facet[0][1], c3 = facet[1][2]-facet[0][2]
  crs = [b2*c3-b3*c2,b3*c1-b1*c3,b1*c2-b2*c1]
  d = Math.hypot(...crs)+.0001
  var nls = 1 //normal line length
  crs = crs.map(q=>q/d*nls)
  var X1_ = ax, Y1_ = ay, Z1_ = az
  var flip = 1
  if(autoFlipNormals){
    var d1_ = Math.hypot(X1_-X1,Y1_-Y1,Z1_-Z1)
    var d2_ = Math.hypot(X1-(ax + crs[0]/99),Y1-(ay + crs[1]/99),Z1-(az + crs[2]/99))
    flip = d2_>d1_?-1:1
  }
  var X2_ = ax + (crs[0]*=flip), Y2_ = ay + (crs[1]*=flip), Z2_ = az + (crs[2]*=flip)
  
  //return [X2_-X1_, Y2_-Y1_, Z2_-Z1_]
  return [X1_, Y1_, Z1_, X2_, Y2_, Z2_]
}


const AnimationLoop = (renderer, func) => {
  const loop = () => {
    if(renderer.ready && typeof window[func] != 'undefined') window[func]()
    requestAnimationFrame(loop)
  }
  window.addEventListener('load', () => {
    renderer.ready = true
    loop()
  })
}

const HSVFromRGB = (R, G, B) => {
  let R_=R/255
  let G_=G/255
  let B_=B/255
  let Cmin = Math.min(R_,G_,B_)
  let Cmax = Math.max(R_,G_,B_)
  let val = Cmax //(Cmax+Cmin) / 2
  let delta = Cmax-Cmin
  let sat = Cmax ? delta / Cmax: 0
  let min=Math.min(R,G,B)
  let max=Math.max(R,G,B)
  let hue = 0
  if(delta){
    if(R>=G && R>=B) hue = (G-B)/(max-min)
    if(G>=R && G>=B) hue = 2+(B-R)/(max-min)
    if(B>=G && B>=R) hue = 4+(R-G)/(max-min)
  }
  hue*=60
  while(hue<0) hue+=360;
  while(hue>=360) hue-=360;
  return [hue, sat, val]
}

const RGBFromHSV = (H, S, V) => {
  while(H<0) H+=360;
  while(H>=360) H-=360;
  let C = V*S
  let X = C * (1-Math.abs((H/60)%2-1))
  let m = V-C
  let R_, G_, B_
  if(H>=0 && H < 60)    R_=C, G_=X, B_=0
  if(H>=60 && H < 120)  R_=X, G_=C, B_=0
  if(H>=120 && H < 180) R_=0, G_=C, B_=X
  if(H>=180 && H < 240) R_=0, G_=X, B_=C
  if(H>=240 && H < 300) R_=X, G_=0, B_=C
  if(H>=300 && H < 360) R_=C, G_=0, B_=X
  let R = (R_+m)*255
  let G = (G_+m)*255
  let B = (B_+m)*255
  return [R,G,B]
}

const RGBtoHex = (R, G, B) => {
  let a = '0123456789abcdef'
  let ret = ''
  ret += a[R/16|0]
  ret += a[R-(R/16|0)*16|0]
  ret += a[G/16|0]
  ret += a[G-(G/16|0)*16|0]
  ret += a[B/16|0]
  ret += a[B-(B/16|0)*16|0]
  return ret
}

const HexToRGB = val => {
    var b = ((val/256) - (val/256|0)) //* 256|0
    var g = ((val/256**2) - (val/256**2|0)) //* 256|0
    var r = ((val/256**3) - (val/256**3|0)) //* 256|0
    return [r, g, b]
}

export {
  Renderer,
  LoadGeometry,
  BasicShader,
  DestroyViewport,
  AnimationLoop,
  Tetrahedron,
  Cube,
  Octahedron,
  Icosahedron,
  Dodecahedron,
  Cylinder,
  Torus,
  TorusKnot,
  Rectangle,
  Q, R,
  Normal,
  ImageToPo2,
  LoadOBJ,
  IsPowerOf2,
  HexToRGB,
}