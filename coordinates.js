// 'Coordinates', a webgl framework
// Scott McGann - whitehotrobot@gmail.com
// all rights reserved - ©2024

const S = Math.sin, C = Math.cos

const Renderer = (width   = 1920,
                  height  = 1080,
                  x      = 0, y     = 0, z = 0,
                  roll   = 0, pitch = 0, yaw = 0, fov = 2e3,
                  context = ['webgl', {
                      alpha          : true,
                      antialias      : true,
                      desynchronized : true,
                    }],
                    attachToBody = true,
                    margin = 10,
                  ) => {
                          
  const c    = document.createElement('canvas')
  const ctx  = c.getContext(...context)
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
    c, contextType,
    width, height, x, y, z,
    roll, pitch, yaw, fov,
    ready: false,
    
    // functions
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
      
      ctx.bindTexture(ctx.TEXTURE_2D, dset.texture)
      ctx.uniform1i(dset.locTexture, dset.texture)
      
      ctx.uniform2f(dset.locResolution,    ret.width, ret.height)
      ctx.uniform1f(dset.locCamX,          ret.x)
      ctx.uniform1f(dset.locCamY,          ret.y)
      ctx.uniform1f(dset.locCamZ,          ret.z)
      ctx.uniform1f(dset.locGeoX,          geometry.x)
      ctx.uniform1f(dset.locGeoY,          geometry.y)
      ctx.uniform1f(dset.locGeoZ,          geometry.z)
      ctx.uniform1f(dset.locFov,           ret.fov)
      ctx.uniform1f(dset.locRenderNormals, 0)
      
      
      // bind buffers
      
      // uvs - (unless these are changes they needn't be uncommented)
      //ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.uv_buffer);
      //ctx.bufferData(ctx.ARRAY_BUFFER, geometry.uvs, ctx.STATIC_DRAW);
      //ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.UV_Index_Buffer)
      //ctx.bufferData(ctx.ARRAY_BUFFER, geometry.uvIndices, ctx.STATIC_DRAW);
      //ctx.vertexAttribPointer(dset.locUv , 2, ctx.FLOAT, false, 0, 0)
      //ctx.enableVertexAttribArray(dset.locUv)
      
      
      // vertices

      ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.vertex_buffer)
      ctx.bufferData(ctx.ARRAY_BUFFER, geometry.vertices, ctx.STATIC_DRAW)
      ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.Vertex_Index_Buffer)
      ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.vIndices, ctx.STATIC_DRAW)
      ctx.vertexAttribPointer(dset.locPosition, 3, ctx.FLOAT, false, 0, 0)
      ctx.enableVertexAttribArray(dset.locPosition)
      ctx.drawElements(ctx.TRIANGLES, geometry.vertices.length/3|0, ctx.UNSIGNED_SHORT,0)

      // normals
      if(geometry.showNormals){
        ctx.uniform1f(dset.locRenderNormals, 1)
        ctx.bindBuffer(ctx.ARRAY_BUFFER, geometry.normal_buffer)
        ctx.bufferData(ctx.ARRAY_BUFFER, geometry.normals, ctx.STATIC_DRAW)
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, geometry.Normal_Index_Buffer)
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, geometry.nIndices, ctx.STATIC_DRAW)
        ctx.vertexAttribPointer(dset.locNormal, 3, ctx.FLOAT, true, 0, 0)
        ctx.enableVertexAttribArray(dset.locNormal)
        ctx.drawElements(ctx.LINES, geometry.normals.length/3|0, ctx.UNSIGNED_SHORT,0)
      }
    }
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
  
  await fetch(url, res => res).then(data=>data.text()).then(data=>{
    a=[]
    data.split("\nv ").map(v=>{
      a=[...a, v.split("\n")[0]]
    })
    a=a.filter((v,i)=>i).map(v=>[...v.split(' ').map(n=>(+n.replace("\n", '')))])
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
  
  a = []
  f = []

  res = res.map((v, i) => {
    return {
      verts: v,
      uvs: texCoords[i]
    }
  })
  res.map(v => {
    v.verts.map(q=>{
      X = q[0] *= 1//size
      Y = q[1] *= 1//size
      Z = q[2] *= 1//size
    })
    // triangulate
    a = [...a, v.verts[0],v.verts[2],v.verts[1],
               v.verts[2],v.verts[0],v.verts[3]]
    f = [...f, v.uvs[0],v.uvs[2],v.uvs[1],
               v.uvs[2],v.uvs[0],v.uvs[3]]
  })
  
  for(i = 0; i < a.length; i++){
    var normal
    j = i/3 | 0
    b = [a[j*3+0], a[j*3+1], a[j*3+2]]
    if(!(i%3)){
      normal = Normal(b, true)
      if(flipNormals){
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

const Q = (X, Y, Z, c, AR=700) => [c.width/2+X/Z*AR, c.height/2+Y/Z*AR]

const R = (X,Y,Z, cam, m=false) => {
  var M = Math, p, d
  var H=M.hypot, A=M.atan2
  var Rl = cam.roll, Pt = cam.pitch, Yw = cam.yaw
  Y = S(p=A(Y,Z)+Pt)*(d=H(Y,Z))
  Z = C(p)*d
  X = S(p=A(X,Z)+Yw)*(d=H(X,Z))
  Z = C(p)*d
  X = S(p=A(X,Y)+Rl)*(d=H(X,Y))
  Y = C(p)*d
  if(m){
    var oX = cam.x, oY = cam.y, oZ = cam.z
    X += oX
    Y += oY
    Z += oZ
  }
  return [X, Y, Z]
}

const LoadGeometry = async (renderer, shape, size=1, subs=1, sphereize=0, equirectangular=false,
                      flipNormals=false, showNormals=false, url='') => {

  var vertex_buffer, Vertex_Index_Buffer
  var normal_buffer, Normal_Index_Buffer
  var uv_buffer, UV_Index_Buffer
  var vIndices, nIndices, uvIndices
  const gl = renderer.gl
  var shape
  
  var vertices = []
  var normals  = []
  var uvs      = []
  
  switch(shape){
    case 'cube':
      shape = Cube(size, subs, sphereize, flipNormals)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
    break
    case 'obj':
      shape = await LoadOBJ(url, 1, 0,0,0, 0,0,0, false)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
    break
    case 'dodecahedron':
      shape = Dodecahedron(size, subs, sphereize, flipNormals)
      shape.geometry.map(v => {
        vertices = [...vertices, ...v.position]
        normals  = [...normals,  ...v.normal]
        uvs      = [...uvs,      ...v.texCoord]
      })
    break
  }
  if(equirectangular){
    console.log('normals', normals)
    for(var i = 0; i < normals.length; i+=6){
      var idx = i/6|0
      var n = normals
      var nidx = idx*6
      var nx = n[nidx+0] - n[nidx+3]
      var ny = n[nidx+1] - n[nidx+4]
      var nz = n[nidx+2] - n[nidx+5]
      var p1 = Math.atan2(nx, nz) / Math.PI /2 + .5
      var p2 = Math.acos(ny / (Math.hypot(nx, ny, nz)+.00001)) / Math.PI 
      
      var tidx = idx*2
      uvs[tidx+0] = p1
      uvs[tidx+1] = p2
    }
  }

  
  vertices = new Float32Array(vertices)
  normals  = new Float32Array(normals)
  uvs      = new Float32Array(uvs)
  
  
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
    vertices, normals, uvs,
    vertex_buffer, Vertex_Index_Buffer,
    normal_buffer, Normal_Index_Buffer,
    uv_buffer, UV_Index_Buffer,
    vIndices, nIndices, uvIndices,
    showNormals
  }
}

var BasicShader = async (renderer) => {

  const gl = renderer.gl
  var program
  
  var dataset = {
    iURL: null,
    locUv: null,
    locFov: null,
    program: null,
    locCamX: null,
    locCamY: null,
    locCamZ: null,
    locGeoX: null,
    locGeoY: null,
    locGeoZ: null,
    locNormal: null,
    locTexture: null,
    locPosition: null,
    locResolution: null,
    locRenderNormals: null,
  }
  
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
  //gl.cullFace(null)
  

  ret.vert = `
    precision mediump float;
    attribute vec2 uv;
    uniform float camX;
    uniform float camY;
    uniform float camZ;
    uniform float geoX;
    uniform float geoY;
    uniform float geoZ;
    uniform float fov;
    uniform float renderNormals;
    attribute vec3 position;
    attribute vec3 normal;
    varying vec2 vUv;
    varying float skip;
    uniform vec2 resolution;
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
      vUv = uv;
      
      float camz = camZ / 1e3 * pow(5.0, (log(fov) / 1.609438));
      
      float Z = cz + camz + geoZ;
      if(Z > 0.0) {
        float X = ((cx + camX + geoX) / Z * fov / resolution.x);
        float Y = ((cy + camY + geoY) / Z * fov / resolution.y);
        //gl_PointSize = 100.0 / Z;
        gl_Position = vec4(X, Y, Z/1000000.0, 1.0);
        skip = 0.0;
      }else{
        skip = 1.0;
      }
    }
  `
  
  ret.frag = `
    precision mediump float;
    uniform float renderNormals;
    uniform sampler2D baseTexture;
    varying vec2 vUv;
    varying float skip;
    void main() {
      if(skip != 1.0){
        if(renderNormals == 1.0){
          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
        }else{
          vec4 texel = texture2D( baseTexture, vUv);
          gl_FragColor = texel;
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
      

      dset.locResolution = gl.getUniformLocation(dset.program, "resolution")
      gl.uniform2f(dset.locResolution, renderer.width, renderer.height)

      dset.locTexture = gl.getUniformLocation(dset.program, "baseTexture")
      dset.texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, dset.texture)
      var image = new Image()
      dset.iURL = textureURL
      let mTex
      if((mTex = ret.datasets.filter(v=>v.iURL == dset.iURL)).length > 1){
        dset.texture = mTex[0].texture
      }else{
        await fetch(dset.iURL).then(res=>res.blob()).then(data => {
          image.src = URL.createObjectURL(data)
        })
        image.onload = () => {
          
          gl.bindTexture(gl.TEXTURE_2D, dset.texture)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          
          if (IsPowerOf2(image.width) &&
              IsPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
        }
      }
      
      gl.useProgram(dset.program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dset.texture)
      gl.uniform1i(dset.locTexture, dset.texture)
      

      dset.locCamX           = gl.getUniformLocation(dset.program, "camX")
      dset.locCamY           = gl.getUniformLocation(dset.program, "camY")
      dset.locCamZ           = gl.getUniformLocation(dset.program, "camZ")
      dset.locGeoX           = gl.getUniformLocation(dset.program, "geoX")
      dset.locGeoY           = gl.getUniformLocation(dset.program, "geoY")
      dset.locGeoZ           = gl.getUniformLocation(dset.program, "geoZ")
      dset.locFov            = gl.getUniformLocation(dset.program, "fov")
      dset.locRenderNormals  = gl.getUniformLocation(dset.program, "renderNormals")
      gl.uniform1f(dset.locCamX,          renderer.x)
      gl.uniform1f(dset.locCamY,          renderer.y)
      gl.uniform1f(dset.locCamZ,          renderer.z)
      gl.uniform1f(dset.locGeoX,          geometry.x)
      gl.uniform1f(dset.locGeoY,          geometry.y)
      gl.uniform1f(dset.locGeoZ,          geometry.z)
      gl.uniform1f(dset.locFov,           renderer.fov)
      gl.uniform1f(dset.locRenderNormals, 0)
    }else{
      var info = gl.getProgramInfoLog(program)
      var vshaderInfo = gl.getShaderInfoLog(vertexShader)
      var fshaderInfo = gl.getShaderInfoLog(fragmentShader)
      console.error(`bad shader :( ${info}`)
      console.error(`vShader info : ${vshaderInfo}`)
      console.error(`fShader info : ${fshaderInfo}`)
    }
  }
  
  return ret
}


const subbed = (subs, size, sphereize, shape, texCoords) => {
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
  if(sphereize){
    var d
    ip1 = sphereize
    ip2 = 1-sphereize
    shape = shape.map(v=>{
      v = v.map(q=>{
        X = q[0]
        Y = q[1]
        Z = q[2]
        d = Math.hypot(X,Y,Z)
        X /= d
        Y /= d
        Z /= d
        X *= size/1*ip1 + d*ip2
        Y *= size/1*ip1 + d*ip2
        Z *= size/1*ip1 + d*ip2
        var ls = 1
        return [X*ls, Y*ls, Z*ls]
      })
      return v
    })
  }
  return shape.map((v, i) => {
    return {
      verts: v,
      uvs: texCoords[i]
    }
  })
}


const Camera = (x=0, y=0, z=0, roll=0, pitch=0, yaw=0) => ({ x, y, z, roll, pitch, yaw })


const Dodecahedron = (size = 1, subs = 0, sphereize = 0, flipNormals=false) => {
  var i, X, Y, Z, d1, b, p, r, tx, ty, f, i, j, l
  var ret = []
  var a = []
  var geometry = []
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
      
      r = R(X, Y, Z, {x:r[0], y:r[1], z:r[2],
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
      
      r = R(X, Y, Z, {x:r[0], y:r[1], z:r[2],
                         roll:  Math.PI/2,
                         pitch: 0,
                         yaw:   0})
      q[0] = r[0]
      q[1] = r[1]
      q[2] = r[2]
    })
  })
  ret = [...ret, ...b, ...e]
  ret.map(v=>{
    v.map(q=>{
      q[0] *= size/2
      q[1] *= size/2
      q[2] *= size/2
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
  
  
  a = []
  f = []
  subbed(subs + 1, 1, sphereize, e, texCoords).map(v => {
    v.verts.map(q=>{
      X = q[0] *= size
      Y = q[1] *= size
      Z = q[2] *= size
    })
    // triangulate
//    a = [...a, v.verts[0],v.verts[2],v.verts[1],
//               v.verts[2],v.verts[0],v.verts[3]]
//    f = [...f, v.uvs[0],v.uvs[2],v.uvs[1],
//               v.uvs[2],v.uvs[0],v.uvs[3]]
    a = [...a, v.verts[0],v.verts[1],v.verts[2]]
    f = [...f, v.uvs[0],v.uvs[1],v.uvs[2]]
  })
  
  for(i = 0; i < a.length; i++){
    var normal
    j = i/3 | 0
    b = [a[j*3+0], a[j*3+1], a[j*3+2]]
    if(!(i%3)){
      normal = Normal(b, true)
      if(flipNormals){
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




const Cube = (size = 1, subs = 0, sphereize = 0, flipNormals=false) => {
  var p, pi=Math.PI, a, b, l, i, j, k, tx, ty, X, Y, Z
  var S=Math.sin, C=Math.cos
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
  
  
  a = []
  f = []
  subbed(subs, 1, sphereize, e, texCoords).map(v => {
    v.verts.map(q=>{
      X = q[0] *= size
      Y = q[1] *= size
      Z = q[2] *= size
    })
    // triangulate
    a = [...a, v.verts[0],v.verts[2],v.verts[1],
               v.verts[2],v.verts[0],v.verts[3]]
    f = [...f, v.uvs[0],v.uvs[2],v.uvs[1],
               v.uvs[2],v.uvs[0],v.uvs[3]]
  })
  
  for(i = 0; i < a.length; i++){
    let X = a[i][0]
    let Y = a[i][1]
    let Z = a[i][2]
    let d = Math.hypot(X, Y, Z)
    X /= d
    Y /= d
    Z /= d
    var normal = [...a[i], X+a[i][0], Y+a[i][1], Z+a[i][2]]
    if(!flipNormals){
      normal[3] = normal[0] + (normal[0]-normal[3])
      normal[4] = normal[1] + (normal[1]-normal[4])
      normal[5] = normal[2] + (normal[2]-normal[5])
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
  Cube,
  Q, R,
  Normal,
  LoadOBJ,
  IsPowerOf2,
}