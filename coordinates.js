
// 'Coordinates', a webgl framework
// Scott McGann - whitehotrobot@gmail.com
// all rights reserved - ©2024

const S = Math.sin, C = Math.cos

const CreateViewport = (width   = 1920,
                        height  = 1080,
                        context = ['webgl', {
                            alpha          : true,
                            antialias      : true,
                            desynchronized : true,
                          }],
                          attachToBody = true,
                          margin = 10,
                        ) => {
                          
  const c  = document.createElement('canvas')
  const x  = c.getContext(...context)
  c.width  = width
  c.height = height
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
  
  let rsz
  window.addEventListener('resize', rsz = (e) => {
    let b = document.body
    let n
    let d = c.width !== 0 ? c.height / c.width : 1
    if(b.clientHeight/b.clientWidth > d){
      c.style.width = `${(n=b.clientWidth) - margin*2}px`
      c.style.height = `${n*d - margin*2}px`
    }else{
      c.style.height = `${(n=b.clientHeight) - margin*2}px`
      c.style.width = `${n/d - margin*2}px`
    }
  })
  rsz()
  
  return [c, x]
}

const DestroyViewport = el => {
  el.remove()
}

const Q = (X, Y, Z, c, AR=700) => [c.width/2+X/Z*AR, c.height/2+Y/Z*AR]

const R = (X,Y,Z, oX,oY,oZ, Rl,Pt,Yw, m=false) => {
  let M = Math, p, d
  let H=M.hypot, A=M.atan2
  Y = S(p=A(Y,Z)+Pt)*(d=H(Y,Z))
  Z = C(p)*d
  X = S(p=A(X,Z)+Yw)*(d=H(X,Z))
  Z = C(p)*d
  X = S(p=A(X,Y)+Rl)*(d=H(X,Y))
  Y = C(p)*d
  if(m){
    X += oX
    Y += oY
    Z += oZ
  }
  return [X, Y, Z]
}

const subbed = (subs, size, sphereize, shape) => {
  let base, l, X, Y, Z, X1, Y1, Z1, X2, Y2, Z2
  let X3, Y3, Z3, X4, Y4, Z4, a
  let mx1, my1, mz1, mx2, my2, mz2
  let mx3, my3, mz3, mx4, my4, mz4
  let cx, cy, cz, ip1, ip2
  for(let m=subs; m--;){
    base = shape
    shape = []
    base.map(v=>{
      l = 0
      X1 = v[l][0]
      Y1 = v[l][1]
      Z1 = v[l][2]
      l = 1
      X2 = v[l][0]
      Y2 = v[l][1]
      Z2 = v[l][2]
      l = 2
      X3 = v[l][0]
      Y3 = v[l][1]
      Z3 = v[l][2]
      if(v.length > 3){
        l = 3
        X4 = v[l][0]
        Y4 = v[l][1]
        Z4 = v[l][2]
        if(v.length > 4){
          l = 4
          X5 = v[l][0]
          Y5 = v[l][1]
          Z5 = v[l][2]
        }
      }
      mx1 = (X1+X2)/2
      my1 = (Y1+Y2)/2
      mz1 = (Z1+Z2)/2
      mx2 = (X2+X3)/2
      my2 = (Y2+Y3)/2
      mz2 = (Z2+Z3)/2
      a = []
      switch(v.length){
        case 3:
          mx3 = (X3+X1)/2
          my3 = (Y3+Y1)/2
          mz3 = (Z3+Z1)/2
          X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
          X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
          X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
          X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
          X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
          X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
          X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
          X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
          X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          break
        case 4:
          mx3 = (X3+X4)/2
          my3 = (Y3+Y4)/2
          mz3 = (Z3+Z4)/2
          mx4 = (X4+X1)/2
          my4 = (Y4+Y1)/2
          mz4 = (Z4+Z1)/2
          cx = (X1+X2+X3+X4)/4
          cy = (Y1+Y2+Y3+Y4)/4
          cz = (Z1+Z2+Z3+Z4)/4
          X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
          X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
          X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
          X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
          X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
          X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
          X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          break
        case 5:
          cx = (X1+X2+X3+X4+X5)/5
          cy = (Y1+Y2+Y3+Y4+Y5)/5
          cz = (Z1+Z2+Z3+Z4+Z5)/5
          mx3 = (X3+X4)/2
          my3 = (Y3+Y4)/2
          mz3 = (Z3+Z4)/2
          mx4 = (X4+X5)/2
          my4 = (Y4+Y5)/2
          mz4 = (Z4+Z5)/2
          mx5 = (X5+X1)/2
          my5 = (Y5+Y1)/2
          mz5 = (Z5+Z1)/2
          X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
          X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
          X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
          X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
          X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
          X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
          X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
          shape = [...shape, a]
          a = []
          break
      }
    })
  }
  if(sphereize){
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
        X *= size/2*ip1 + d*ip2
        Y *= size/2*ip1 + d*ip2
        Z *= size/2*ip1 + d*ip2
        return [X,Y,Z]
      })
      return v
    })
  }
  return shape
}

const Clear = el => {
  el.width = el.width
}

const Cube = (size = 1, subs = 0, sphereize = 0) => {
  let ret=[], p, pi=Math.PI, a, b, l, j, i
  let S=Math.sin, C=Math.cos
  for(i=6; i--; ret=[...ret, b])for(b=[], j=4;j--;) b=[...b, [(a=[S(p=pi*2/4*j+pi/4), C(p), 2**.5/2])[i%3]*(l=i<3?1:-1),a[(i+1)%3]*l,a[(i+2)%3]*l]]
  ret = subbed(subs, 1, sphereize, ret)
  ret.map(v=>{
    v.map(q=>{
      q[0] *= size
      q[1] *= size
      q[2] *= size
    })
  })
  return ret
}

const Normal = (facet, autoFlipNormals=false, X1=0, Y1=0, Z1=0) => {
  let ax = 0, ay = 0, az = 0, crs, d
  facet.map(q_=>{ ax += q_[0], ay += q_[1], az += q_[2] })
  ax /= facet.length, ay /= facet.length, az /= facet.length
  let b1 = facet[2][0]-facet[1][0], b2 = facet[2][1]-facet[1][1], b3 = facet[2][2]-facet[1][2]
  let c1 = facet[1][0]-facet[0][0], c2 = facet[1][1]-facet[0][1], c3 = facet[1][2]-facet[0][2]
  crs = [b2*c3-b3*c2,b3*c1-b1*c3,b1*c2-b2*c1]
  d = Math.hypot(...crs)+.001
  let nls = 1 //normal line length
  crs = crs.map(q=>q/d*nls)
  let X1_ = ax, Y1_ = ay, Z1_ = az
  let flip = 1
  if(autoFlipNormals){
    let d1_ = Math.hypot(X1_-X1,Y1_-Y1,Z1_-Z1)
    let d2_ = Math.hypot(X1-(ax + crs[0]/99),Y1-(ay + crs[1]/99),Z1-(az + crs[2]/99))
    flip = d2_>d1_?-1:1
  }
  let X2_ = ax + (crs[0]*=flip), Y2_ = ay + (crs[1]*=flip), Z2_ = az + (crs[2]*=flip)
  
  return [X2_-X1_, Y2_-Y1_, Z2_-Z1_]
  //return [X1_, Y1_, Z1_, X2_, Y2_, Z2_]
}


const Geometry = source => {
  let ret = [], a, tx, ty
  source.map(v => {
    let position, texCoord
    let normal = Normal(v, true)
    let a = []
    v.map((q, j) => {
      switch(j){
        case 0: tx=0, ty=0; break
        case 1: tx=0, ty=1; break
        case 2: tx=1, ty=1; break
        case 3: tx=1, ty=0; break
      }
      a = [...a, {
        position: [...q],
        normal,
        texCoord: [tx, ty]
      }]
    })
    ret = [...ret, ...a]
  })
  return ret
}

const AnimationLoop = func => {
  const loop = () => {
    window[func]()
    requestAnimationFrame(loop)
  }
  window.addEventListener('load', () => loop() )
}

export {
  CreateViewport,
  DestroyViewport,
  AnimationLoop,
  Cube,
  Clear,
  Q, R,
  Geometry,
  Normal,
};