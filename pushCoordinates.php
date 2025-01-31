<?
$file = <<<'FILE'
// 'Coordinates', a webgl framework
// Scott McGann - whitehotrobot@gmail.com
// all rights reserved - ©2024

const S = Math.sin, C = Math.cos

const Renderer = (width = 1920, height = 1080, options) => {

  var x=0, y=0, z=0
  var roll=0, pitch=0, yaw=0, fov=2e3
  var attachToBody = true, margin = 10
  var ambientLight = .4
  var context = {
    mode: 'webgl',
    options: {
      alpha          : true,
      antialias      : true,
      desynchronized : true,
    }
  }
  
  Object.keys(options).forEach((key, idx) =>{
    switch(key){
      case 'x': x = options[key]; break
      case 'y': y = options[key]; break
      case 'z': z = options[key]; break
      case 'roll': roll = options[key]; break
      case 'pitch': pitch = options[key]; break
      case 'yaw': yaw = options[key]; break
      case 'fov': fov = options[key]; break
      case 'attachToBody': attachToBody = options[key]; break
      case 'margin': margin = options[key]; break
      case 'ambientLight': ambientLight = options[key]; break
      case 'context':
        context.mode = options[key].mode
        context.options = options[key]['options']
      break
    }
  })

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
    c, contextType, t:0,
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
      
      ctx.uniform1i(dset.locTexture, dset.texture)
      ctx.activeTexture(ctx.TEXTURE0)
      ctx.bindTexture(ctx.TEXTURE_2D, dset.texture)
      
      ctx.uniform1f(dset.locT,               ret.t)
      ctx.uniform1f(dset.locAmbientLight,    ret.ambientLight)
      ctx.uniform2f(dset.locResolution,      ret.width, ret.height)
      ctx.uniform1f(dset.locCamX,            ret.x)
      ctx.uniform1f(dset.locCamY,            ret.y)
      ctx.uniform1f(dset.locCamZ,            ret.z)
      ctx.uniform1f(dset.locCamRoll,         ret.roll)
      ctx.uniform1f(dset.locCamPitch,        ret.pitch)
      ctx.uniform1f(dset.locCamYaw,          ret.yaw)
      ctx.uniform1f(dset.locGeoX,            geometry.x)
      ctx.uniform1f(dset.locGeoY,            geometry.y)
      ctx.uniform1f(dset.locGeoZ,            geometry.z)
      ctx.uniform1f(dset.locGeoRoll,         geometry.roll)
      ctx.uniform1f(dset.locGeoPitch,        geometry.pitch)
      ctx.uniform1f(dset.locGeoYaw,         geometry.yaw)
      ctx.uniform1f(dset.locFov,             ret.fov)
      ctx.uniform1f(dset.locEquirectangular, geometry.equirectangular ? 1.0 : 0.0)
      ctx.uniform1f(dset.locRenderNormals,   0)
      
      dset.optionalUniforms.map(uniform => {
        if(typeof uniform?.loc === 'object'){
          ctx[uniform.dataType](uniform.loc,      uniform.value)
          ctx.uniform1f(uniform.locFlatShading,   uniform.flatShading ? 1.0 : 0.0)
          switch(uniform.name){
            case 'reflection':
              ctx.uniform1i(uniform.locRefTexture, 1)
              ctx.activeTexture(ctx.TEXTURE1)
              ctx.bindTexture(ctx.TEXTURE_2D, uniform.refTexture)
              
              ctx.uniform1f(uniform.locRefOmitEquirectangular, geometry.shapeType == 'rectangle' ? 1.0 : 0.0)
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
    ret.t = performance.now() / 1000
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
  var R2=(Rl,Pt,Yw)=>{
    var M=Math
    var A=M.atan2
    var H=M.hypot
    X=S(p=A(X,Y)+Rl)*(d=H(X,Y))
    Y=C(p)*d
    Y=S(p=A(Y,Z)+Pt)*(d=H(Y,Z))
    Z=C(p)*d
    X=S(p=A(X,Z)+Yw)*(d=H(X,Z))
    Z=C(p)*d
  }
  
  var uvs = []
  await fetch(url, res => res).then(data=>data.text()).then(data=>{
    a=[]
    data.split("\nv ").map(v=>{
      a=[...a, v.split("\n")[0]]
    })
    a=a.filter((v,i)=>i).map(v=>[...v.split(' ').map(n=>(+n.replace("\n", '')))])
    data.split("\nvt ").map(v=>{
      uvs=[...uvs, v.split("\n")[0]]
    })
    uvs=uvs.filter((v,i)=>i).map(v=>[...v.split(' ').map(n=>(+n.replace("\n", '')))])
    ax=ay=az=0
    a.map(v=>{
      v[1]*=-1
      if(recenter){
        ax+=v[0]
        ay+=v[1]
        az+=v[2]
      }
    })
    ax/=a.length
    ay/=a.length
    az/=a.length
    a.map(v=>{
      X=(v[0]-ax)*scale
      Y=(v[1]-ay)*scale
      Z=(v[2]-az)*scale
      R2(rl,pt,yw)
      v[0]=X
      v[1]=Y * (url.indexOf('bug')!=-1?2:1)
      v[2]=Z
    })
    var maxY=-6e6
    a.map(v=>{
      if(v[1]>maxY)maxY=v[1]
    })
    a.map(v=>{
      v[1]-=maxY
      v[0]+=tx
      v[1]+=ty
      v[2]+=tz
    })

    var b=[]
    data.split("\nf ").map(v=>{
      b=[...b, v.split("\n")[0]]
    })
    b.shift()
    b=b.map(v=>v.split(' '))
    b=b.map(v=>{
      v=v.map(q=>{
        return +q.split('/')[0]
      })
      v=v.filter(q=>q)
      return v
    })

    res=[]
    b.map(v=>{
      e=[]
      v.map(q=>{
        e=[...e, a[q-1]]
      })
      e = e.filter(q=>q)
      res=[...res, structuredClone(e)]
    })
  })
  //return res
  
  
  var e = res
  var texCoords = uvs
  
  return await GeometryFromRaw(e, texCoords, 1, 0,
                         0, false, false, 'obj')

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

  var x, y, z, roll, pitch, yaw
  var vertex_buffer, Vertex_Index_Buffer
  var normal_buffer, Normal_Index_Buffer
  var normalVec_buffer, NormalVec_Index_Buffer
  var uv_buffer, UV_Index_Buffer
  var vIndices, nIndices, nVecIndices, uvIndices
  const gl = renderer.gl
  var shape
  
  // geo defaults
  var url              = ''
  var size             = 1
  var subs             = 1
  var sphereize        = 0
  var equirectangular  = false
  var flipNormals      = false
  var showNormals      = false
  geoOptions = structuredClone(geoOptions)
  Object.keys(geoOptions).forEach((key, idx) => {
    switch(key){
      case 'x': x = geoOptions[key]; break
      case 'y': y = geoOptions[key]; break
      case 'z': z = geoOptions[key]; break
      case 'roll': roll = geoOptions[key]; break
      case 'pitch': pitch = geoOptions[key]; break
      case 'yaw': yaw = geoOptions[key]; break
      case 'shapeType': shapeType = geoOptions[key]; break
      case 'url': url = geoOptions[key]; break
      case 'size': size = geoOptions[key]; break
      case 'subs': subs = geoOptions[key]; break
      case 'sphereize': sphereize = geoOptions[key]; break
      case 'equirectangular': equirectangular = geoOptions[key]; break
      case 'flipNormals': flipNormals = geoOptions[key]; break
      case 'showNormals': showNormals = geoOptions[key]; break
    }
  })

  
  var vertices    = []
  var normals     = []
  var normalVecs  = []
  var uvs         = []
  
  var shapeType = shapeType.toLowerCase()
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
    case 'cube':
      //if(sphereize) equirectangular = true
      shape = await Cube(size, subs, sphereize, flipNormals, shapeType)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
    break
    case 'rectangle':
      //equirectangular = false
      shape = await Rectangle(size, subs, sphereize, flipNormals, shapeType)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
    break
    case 'obj':
      shape = await LoadOBJ(url, 1, 0,0,0, 0,0,0, false)
      console.log(shape)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
      console.log(vertices, normals, uvs)
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
  
  normalVecs    = []
  for(var i=0; i<normals.length; i+=6){
    let X = normals[i+3] - normals[i+0]
    let Y = normals[i+4] - normals[i+1]
    let Z = normals[i+5] - normals[i+2]
    normalVecs = [...normalVecs, X, Y, Z]
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
    roll, pitch, yaw,
    url, size, subs,
    showNormals, shapeType,
    sphereize, equirectangular, flipNormals,
    vertices, normals, normalVecs, uvs,
    vertex_buffer, Vertex_Index_Buffer,
    normal_buffer, Normal_Index_Buffer,
    normalVec_buffer, NormalVec_Index_Buffer,
    nVecIndices, uv_buffer, UV_Index_Buffer,
    vIndices, nIndices, uvIndices,
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



const BindImage = async (gl, image, binding) => {
  let texImage = await ImageToPo2(image)
  //gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, binding)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImage);
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  //gl.activeTexture(gl.TEXTURE0)
}


var BasicShader = async (renderer, options=[]) => {
  
  const gl = renderer.gl
  var program
  
  var dataset = {
    iURL: null,
    locT: null,
    locUv: null,
    locFov: null,
    program: null,
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
                  map:                 option.uniform.map,
                  loc:                 'locReflection',
                  value:               option.uniform.value,
                  flatShading:         option.uniform.flatShading,
                  flatShadingUniform:  'refFlatShading',
                  dataType:            'uniform1f',
                  vertDeclaration:     `
                  `,
                  vertCode:            `
                  `,
                  fragDeclaration:     `
                    uniform float reflection;
                    uniform float refFlatShading;
                    uniform float refOmitEquirectangular;
                    uniform sampler2D reflectionMap;
                  `,
                  fragCode:            `
                    mixColorIp = reflection;
                    baseColorIp = 1.0 - mixColorIp;
                    float refP1, refP2;
                    if(refOmitEquirectangular != 1.0){
                      
                      float refp = refFlatShading == 1.0 ? atan(nVec.x, nVec.z) : atan(fPos.x, fPos.z);
                      refP1 = ((refp + camYaw + geoYaw) / M_PI)/ 2.0;
                      
                      //refP2 = refFlatShading == 1.0 ?
                      //    (acos(nVec.y / (sqrt(nVec.x*nVec.x + nVec.y*nVec.y + nVec.z*nVec.z)+.00001)) + camPitch) / M_PI:
                      //    (acos(fPosi.y / (sqrt(fPosi.x*fPosi.x + fPos.y*fPosi.y + fPos.z*fPosi.z)+.00001)) - geoPitch) / M_PI;
                      refP2 = coords.y;
                    } else {
                      refP1 = vUv.x;
                      refP2 = vUv.y;
                    }
                    
                    vec2 refCoords = vec2(refP1, refP2);
                    mixColor = vec4(texture2D( reflectionMap, vec2(refCoords.x, refCoords.y)).rgb, 1.0);
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
                  value:               option.uniform.value,
                  flatShading:         option.uniform.flatShading,
                  flatShadingUniform:  'phongFlatShading',
                  dataType:            'uniform1f',
                  vertDeclaration:     `
                  `,
                  vertCode:            `
                  `,
                  fragDeclaration:     `
                    uniform float phong;
                    uniform float phongFlatShading;
                  `,
                  fragCode:            `
                    light = light * 10.0;
                    float px = phongFlatShading == 1.0 ? nVec.x : fPosi.x;
                    float py = phongFlatShading == 1.0 ? nVec.y : fPosi.y;
                    float pz = phongFlatShading == 1.0 ? nVec.z : fPosi.z;
                    float p1 = atan(px, pz);// + t * 2.0;
                    float phongP1   = 1.0 + sin(p1 - M_PI / 2.0 + .4 - camYaw + geoYaw) * 2.0;
                    float phongP2 = acos(py / sqrt(px * px + py * py+ pz * pz));
                    colorMag = light + pow((1.0+phongP1) * (cos(phongP2-1.222-camPitch) + 1.0), 12.0) / 40000000000.0 * phong;
                    light = max(light, colorMag);
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
  
  
  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  gl.enable(gl.DEPTH_TEST)
  //gl.clear(gl.COLOR_BUFFER_BIT)
  //gl.viewport(0, 0, renderer.width, renderer.height)
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  //gl.enable(gl.BLEND)
  //gl.disable(gl.DEPTH_TEST)
  gl.cullFace(gl.BACK)
  gl.disable(gl.CULL_FACE)
  
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
    uniform float ambientLight;
    uniform float camX;
    uniform float camY;
    uniform float camZ;
    uniform float camRoll;
    uniform float camPitch;
    uniform float camYaw;
    uniform float geoX;
    uniform float geoY;
    uniform float geoZ;
    uniform float geoRoll;
    uniform float geoPitch;
    uniform float geoYaw;
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
    varying float skip;
    
    
    vec3 R(float X, float Y, float Z, float Rl, float Pt, float Yw){
      float p, d;
      X = sin(p=atan(X,Y)+Rl)*(d=sqrt(X*X+Y*Y));
      Y = cos(p)*d;
      X = sin(p=atan(X,Z)+Yw)*(d=sqrt(X*X+Z*Z));
      Z = cos(p)*d;
      Y = sin(p=atan(Y,Z)+Pt)*(d=sqrt(Y*Y+Z*Z));
      Z = cos(p)*d;
      return vec3(X, Y, Z);
    }
    
    void main(){
      ${uVertCode}
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
      fPosi = position;
      
      
      // camera rotation
      
      vec3 geo = R(geoX, geoY, geoZ, camRoll, camPitch, camYaw);
      vec3 pos = R(cx, cy, cz, geoRoll + camRoll,
                               geoPitch + camPitch,
                               geoYaw + camYaw);
      
      nVec = R(nVeci.x, nVeci.y, nVeci.z, geoRoll  - camRoll * 2.0, 
                                          geoPitch - camPitch * 2.0,
                                          geoYaw   - camYaw * 2.0);
                                          
      fPos = R(fPosi.x, fPosi.y, fPosi.z, geoRoll - camRoll,
                                          0.0,
                                          geoYaw - camYaw);
      
      //geo += vec3(camX, camY, camZ);
      //pos += vec3(camX, camY, camZ);
      
      
      float camz = camZ / 1e3 * pow(5.0, (log(fov) / 1.609438));
      
      float Z = pos.z + camz + geo.z;
      if(Z > 0.0) {
        float X = ((pos.x + camX + geo.x) / Z * fov / resolution.x);
        float Y = ((pos.y + camY + geo.y) / Z * fov / resolution.y);
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
    uniform float ambientLight;
    uniform float renderNormals;
    uniform float equirectangular;
    uniform sampler2D baseTexture;
    uniform float camX;
    uniform float camY;
    uniform float camZ;
    uniform float camRoll;
    uniform float camPitch;
    uniform float camYaw;
    uniform float geoX;
    uniform float geoY;
    uniform float geoZ;
    uniform float geoRoll;
    uniform float geoPitch;
    uniform float geoYaw;
    varying vec2 vUv;
    varying vec2 uvi;
    varying vec3 nVec;
    varying vec3 nVeci;
    varying vec3 fPos;
    varying vec3 fPosi;
    varying float skip;

    vec4 merge (vec4 col1, vec4 col2, float ip1, float ip2){
      col1.a *= ip1;
      col2.a *= ip2;
      return vec4(col1.rgb * col1.a + col2.rgb * col2.a, 1.0);
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
      float mixColorIp = 0.0;
      float baseColorIp = 1.0;
      vec4 mixColor = vec4(0.0, 0.0, 0.0, 0.0);
      float light = ambientLight / 10.0;
      float colorMag = 1.0;
      float alpha = 1.0;
      if(skip != 1.0){
        if(renderNormals == 1.0){
          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5 * alpha);
        }else{
          ${uFragCode}
          vec4 texel = texture2D( baseTexture, coords);
          texel = vec4(texel.rgb * (.5 + light/2.0) + light/4.0, 1.0);
          vec4 col = merge(mixColor, texel, mixColorIp, baseColorIp);
          gl_FragColor = vec4(col.rgb * colorMag, alpha);
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


  ret.ConnectGeometry = async ( geometry,
                          textureURL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/NGC_4414_%28NASA-med%29.jpg/800px-NGC_4414_%28NASA-med%29.jpg' ) => {
                            
    var dset = structuredClone(dataset)
    ret.datasets = [...ret.datasets, dset]
    
    dset.program = gl.createProgram()
    
    gl.attachShader(dset.program, vertexShader)
    gl.attachShader(dset.program, fragmentShader)
    gl.linkProgram(dset.program)

    geometry.shader = ret
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
      
      dset.optionalUniforms.map(async (uniform) => {
        switch(uniform.name){
          case 'reflection':
            var image = new Image()
            var url = uniform.map
            let mTex
            if((mTex = ret.datasets.filter(v=>v.iURL == url)).length > 1){
              uniform.refTexture = mTex[0].texture
            }else{
              uniform.refTexture = gl.createTexture()
              ret.datasets = [...ret.datasets, {
                texture: uniform.refTexture, iURL: url }]
              gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
              await fetch(url).then(res=>res.blob()).then(data => {
                image.src = URL.createObjectURL(data)
              })
              image.onload = async () => await BindImage(gl, image, uniform.refTexture)
            }
            gl.useProgram(dset.program)
            uniform.locRefOmitEquirectangular = gl.getUniformLocation(dset.program, "refOmitEquirectangular")
            gl.uniform1f(uniform.locRefOmitEquirectangular, geometry.shapeType == 'rectangle' ? 1.0 : 0.0)
            uniform.locRefTexture = gl.getUniformLocation(dset.program, "reflectionMap")
            gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
            gl.uniform1i(uniform.locRefTexture, 1)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, uniform.refTexture)
          break
          break
        }
        uniform.locFlatShading = gl.getUniformLocation(dset.program, uniform.flatShadingUniform)
        gl.uniform1f(uniform.locFlatShading , uniform.flatShading ? 1.0 : 0.0)
        
        
        uniform.loc = gl.getUniformLocation(dset.program, uniform.name)
        gl[uniform.dataType](uniform.loc, uniform.value)
      })

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
      
      var image = new Image()
      dset.iURL = textureURL
      let mTex
      if((mTex = ret.datasets.filter(v=>v.iURL == dset.iURL)).length > 1){
        dset.texture = mTex[0].texture
      }else{
        await fetch(dset.iURL).then(res=>res.blob()).then(data => {
          image.src = URL.createObjectURL(data)
        })
        image.onload = async () => await BindImage(gl, image, dset.texture)
      }
      
      gl.useProgram(dset.program)
      gl.uniform1i(dset.locTexture, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dset.texture)
      

      dset.locCamX           = gl.getUniformLocation(dset.program, "camX")
      dset.locCamY           = gl.getUniformLocation(dset.program, "camY")
      dset.locCamZ           = gl.getUniformLocation(dset.program, "camZ")
      dset.locCamRoll        = gl.getUniformLocation(dset.program, "camRoll")
      dset.locCamPitch       = gl.getUniformLocation(dset.program, "camPitch")
      dset.locCamYaw         = gl.getUniformLocation(dset.program, "camYaw")
      dset.locGeoX           = gl.getUniformLocation(dset.program, "geoX")
      dset.locGeoY           = gl.getUniformLocation(dset.program, "geoY")
      dset.locGeoZ           = gl.getUniformLocation(dset.program, "geoZ")
      dset.locGeoRoll        = gl.getUniformLocation(dset.program, "geoRoll")
      dset.locGeoPitch       = gl.getUniformLocation(dset.program, "geoPitch")
      dset.locGeoYaw         = gl.getUniformLocation(dset.program, "geoYaw")
      dset.locFov            = gl.getUniformLocation(dset.program, "fov")
      dset.locRenderNormals  = gl.getUniformLocation(dset.program, "renderNormals")
      gl.uniform1f(dset.locCamX,          renderer.x)
      gl.uniform1f(dset.locCamY,          renderer.y)
      gl.uniform1f(dset.locCamZ,          renderer.z)
      gl.uniform1f(dset.locCamRoll,       renderer.roll)
      gl.uniform1f(dset.locCamPitch,      renderer.pitch)
      gl.uniform1f(dset.locCamYaw,        renderer.yaw)
      gl.uniform1f(dset.locGeoX,          geometry.x)
      gl.uniform1f(dset.locGeoY,          geometry.y)
      gl.uniform1f(dset.locGeoZ,          geometry.z)
      gl.uniform1f(dset.locGeoRoll,       geometry.roll)
      gl.uniform1f(dset.locGeoPitch,      geometry.pitch)
      gl.uniform1f(dset.locGeoYaw,        geometry.yaw)
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


const GeometryFromRaw = async (raw, texCoords, size, subs,
                         sphereize, flipNormals, quads=false, shapeType='') => {
  var j, i, X, Y, Z, b, l
  var a = []
  var f = []
  var e = raw
  var geometry = []
  
  var hint = `${shapeType}_${subs}`;
  var shape
  switch(shapeType){
    case 'obj': shape = await subbed(0, 1, sphereize, e, texCoords, hint); break
    default: shape = await subbed(subs + 1, 1, sphereize, e, texCoords, hint); break
  }
  console.log(shape)
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
      normal = Normal(b, true)
      if(!flipNormals){
        normal[3] = normal[0] + (normal[0]-normal[3])
        normal[4] = normal[1] + (normal[1]-normal[4])
        normal[5] = normal[2] + (normal[2]-normal[5])
      }
    }
    l = flipNormals ? a.length - i - 1 : i
    geometry = [...geometry, {
      position: a[l],
      normal,
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
  if(hint){
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
      var baseURL = `https://srmcgann.github.io/Coordinates/prebuilt%20shapes/`
      await fetch(`${baseURL}${fileBase}_full.json`).then(res=>res.json()).then(data=>{
        shape     = data.shape
        texCoords = data.texCoords
      })
      console.log(`shape ${hint} loaded from pre-built file`)
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

  /*
  var truncate = shape => {
    return shape.map(v=>{
      return v.map(q=>{
        return q.map(val=>Math.round(val*1e4) / 1e4)
      })
    })
  }
  
  console.log(JSON.stringify(truncate(shape)))
  console.log(JSON.stringify(truncate(texCoords)))
  */
  
  
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

/*
const  Cylinder = async (size = 1, rw, cl, ls1, ls2, caps=false, flipNormals=false) => {
  let a = []
  for(let i=rw;i--;){
    let b = []
    for(let j=cl;j--;){
      X = S(p=Math.PI*2/cl*j) * ls1
      Y = (1/rw*i-.5)*ls2
      Z = C(p) * ls1
      b = [...b, [X,Y,Z]]
    }
    if(caps) a = [...a, b]
    for(let j=cl;j--;){
      b = []
      X = S(p=Math.PI*2/cl*j) * ls1
      Y = (1/rw*i-.5)*ls2
      Z = C(p) * ls1
      b = [...b, [X,Y,Z]]
      X = S(p=Math.PI*2/cl*(j+1)) * ls1
      Y = (1/rw*i-.5)*ls2
      Z = C(p) * ls1
      b = [...b, [X,Y,Z]]
      X = S(p=Math.PI*2/cl*(j+1)) * ls1
      Y = (1/rw*(i+1)-.5)*ls2
      Z = C(p) * ls1
      b = [...b, [X,Y,Z]]
      X = S(p=Math.PI*2/cl*j) * ls1
      Y = (1/rw*(i+1)-.5)*ls2
      Z = C(p) * ls1
      b = [...b, [X,Y,Z]]
      a = [...a, b]
    }
  }
  b = []
  for(let j=cl;j--;){
    X = S(p=Math.PI*2/cl*j) * ls1
    Y = ls2/2
    Z = C(p) * ls1
    //b = [...b, [X,Y,Z]]
  }
  if(caps) a = [...a, b]
  
  var e = a
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
  
  a = []
  f = []
  subbed(subs + 1, 1, sphereize, e, texCoords).map(v => {
    v.verts.map(q=>{
      X = q[0] *= size /  9
      Y = q[1] *= size /  9
      Z = q[2] *= size /  9
    })
    
    a = [...a, ...v.verts]
    f = [...f, ...v.uvs]
  })
  
  for(i = 0; i < a.length; i++){
    var normal
    j = i/3 | 0
    b = [a[j*3+0], a[j*3+1], a[j*3+2]]
    if(!(i%3)){
      normal = Normal(b, true)
      if(!flipNormals){
        normal[3] = normal[0] + (normal[0]-normal[3])
        normal[4] = normal[1] + (normal[1]-normal[4])
        normal[5] = normal[2] + (normal[2]-normal[5])
      }
    }
    l = flipNormals ? a.length - i - 1 : i
    geometry = [...geometry, {
      position: a[l],
      normal,
      texCoord: f[l],
    }]
  }
  return {
    geometry
  }
}
*/

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
  
  
  return await GeometryFromRaw(e, texCoords, size / 1.5,  subs,
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
  d = Math.hypot(...crs)+.001
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
    if(renderer.ready) window[func]()
    requestAnimationFrame(loop)
  }
  window.addEventListener('load', () => {
    renderer.ready = true
    loop()
  })
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
  Q, R,
  Normal,
  ImageToPo2,
  LoadOBJ,
  IsPowerOf2,
}

FILE;
file_put_contents('../../Coordinates/coordinates.js', $file);
?>