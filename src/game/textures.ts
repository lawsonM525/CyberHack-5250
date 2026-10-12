import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()

function make(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  configure?: (t: THREE.Texture) => void,
): THREE.Texture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  configure?.(tex)
  tex.needsUpdate = true
  cache.set(key, tex)
  return tex
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
    d[i + 3] = Math.max(0, Math.min(255, d[i + 3] * alpha + 255 * (1 - alpha)))
  }
  ctx.putImageData(img, 0, 0)
}

export function woodTexture(): THREE.Texture {
  return make('wood', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a3a26'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 160; i++) {
      const y = Math.random() * h
      const grad = ctx.createLinearGradient(0, y, w, y + 12)
      const tone = 40 + Math.random() * 60
      grad.addColorStop(0, `rgba(${tone + 40},${tone + 12},${tone - 6},0.28)`)
      grad.addColorStop(1, 'rgba(20,10,6,0.16)')
      ctx.strokeStyle = grad
      ctx.lineWidth = 1 + Math.random() * 3.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 22, w * 0.7, y + (Math.random() - 0.5) * 22, w, y + (Math.random() - 0.5) * 10)
      ctx.stroke()
    }
    noise(ctx, w, h, 18, 1)
  })
}

export function plasterTexture(): THREE.Texture {
  return make('plaster', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2a2530'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,235,220,${Math.random() * 0.035})`
      const r = Math.random() * 26
      ctx.beginPath()
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2)
      ctx.fill()
    }
    noise(ctx, w, h, 12, 1)
  })
}

export function rugTexture(): THREE.Texture {
  return make(
    'rug',
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#4a2338'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(232,183,101,0.55)'
      ctx.lineWidth = 6
      ctx.strokeRect(22, 22, w - 44, h - 44)
      ctx.strokeStyle = 'rgba(79,208,192,0.35)'
      ctx.lineWidth = 3
      ctx.strokeRect(40, 40, w - 80, h - 80)
      for (let i = 0; i < 9; i++) {
        const cx = w / 2
        const cy = (h / 9) * (i + 0.5)
        ctx.strokeStyle = i % 2 ? 'rgba(232,183,101,0.4)' : 'rgba(194,68,122,0.45)'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let a = 0; a <= 64; a++) {
          const t = (a / 64) * Math.PI * 2
          const r = 26 + Math.sin(t * 6) * 9
          const x = cx + Math.cos(t) * r * 2.4
          const y = cy + Math.sin(t) * r * 0.5
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      noise(ctx, w, h, 22, 1)
    },
    (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping
      t.wrapT = THREE.ClampToEdgeWrapping
    },
  )
}

export function fabricTexture(): THREE.Texture {
  return make('fabric', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6a4a58'
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 0.12
    for (let x = 0; x < w; x += 3) {
      ctx.fillStyle = x % 6 ? '#ffffff' : '#000000'
      ctx.fillRect(x, 0, 1.5, h)
    }
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = y % 6 ? '#000000' : '#ffffff'
      ctx.fillRect(0, y, w, 1.5)
    }
    ctx.globalAlpha = 1
    noise(ctx, w, h, 14, 1)
  })
}

/**
 * A leaf surface in leaf space: midrib up the centre of the V axis, veins
 * branching out to the edges, mottled chlorophyll between them. Leaves are
 * UV-mapped so one tile covers exactly one blade.
 */
export function leafTexture(): THREE.Texture {
  return make(
    'leaf',
    256,
    256,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h, 0, 0)
      g.addColorStop(0, '#2c5f3a')
      g.addColorStop(0.55, '#3d7d48')
      g.addColorStop(1, '#4f9553')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      // mottling
      for (let i = 0; i < 220; i++) {
        const r = 6 + Math.random() * 26
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '120,170,110' : '30,70,45'},0.07)`
        ctx.beginPath()
        ctx.ellipse(Math.random() * w, Math.random() * h, r, r * 0.6, Math.random(), 0, Math.PI * 2)
        ctx.fill()
      }
      // midrib
      ctx.strokeStyle = 'rgba(190,220,160,0.5)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(w / 2, h)
      ctx.lineTo(w / 2, 0)
      ctx.stroke()
      // veins, angled toward the tip on both sides
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(175,205,150,0.34)'
      for (let i = 1; i < 14; i++) {
        const y = h - (i / 14) * h
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(w / 2, y)
          ctx.quadraticCurveTo(w / 2 + s * w * 0.28, y - h * 0.03, w / 2 + s * w * 0.5, y - h * 0.08)
          ctx.stroke()
        }
      }
      noise(ctx, w, h, 10, 1)
    },
    (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping
      t.wrapT = THREE.ClampToEdgeWrapping
    },
  )
}

export function concreteTexture(): THREE.Texture {
  return make('concrete', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#23242c'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 40, Math.random() * 4)
    }
    noise(ctx, w, h, 16, 1)
  })
}

/** Tower facade: lit and dark windows with a few warm interiors. */
export function facadeTexture(seed: number, hue: number): THREE.Texture {
  return make(`facade-${seed}-${hue}`, 256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0b0d18'
    ctx.fillRect(0, 0, w, h)
    const cols = 8
    const rows = 26
    const cw = w / cols
    const ch = h / rows
    let s = seed * 9301
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rnd()
        const x = c * cw + cw * 0.18
        const y = r * ch + ch * 0.2
        const ww = cw * 0.64
        const hh = ch * 0.56
        if (lit > 0.62) {
          const warm = rnd()
          const col =
            warm > 0.72
              ? `hsl(${hue}, 80%, ${45 + rnd() * 18}%)`
              : `hsl(${34 + rnd() * 14}, ${60 + rnd() * 25}%, ${48 + rnd() * 20}%)`
          ctx.fillStyle = col
          ctx.fillRect(x, y, ww, hh)
          ctx.fillStyle = 'rgba(0,0,0,0.25)'
          ctx.fillRect(x, y + hh * 0.55, ww, hh * 0.1)
        } else {
          ctx.fillStyle = `rgba(90,110,160,${0.04 + rnd() * 0.06})`
          ctx.fillRect(x, y, ww, hh)
        }
      }
    }
    noise(ctx, w, h, 10, 1)
  })
}

/** Botanical print for the wall, drawn as line art over a washed ground. */
export function posterTexture(): THREE.Texture {
  return make(
    'poster',
    384,
    512,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#2d1c34')
      g.addColorStop(1, '#16202a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(232,183,101,0.75)'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(w / 2, h - 60)
      ctx.bezierCurveTo(w / 2 - 20, h * 0.6, w / 2 + 16, h * 0.4, w / 2, 90)
      ctx.stroke()
      for (let i = 0; i < 7; i++) {
        const t = i / 6
        const y = h - 90 - t * (h - 200)
        const dir = i % 2 ? 1 : -1
        ctx.strokeStyle = `rgba(${90 + t * 70},${190 - t * 40},${150 + t * 40},0.8)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(w / 2, y)
        ctx.quadraticCurveTo(w / 2 + dir * 70, y - 26, w / 2 + dir * 110, y - 4)
        ctx.quadraticCurveTo(w / 2 + dir * 66, y + 28, w / 2, y)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(194,68,122,0.9)'
      ctx.beginPath()
      ctx.arc(w / 2, 86, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(240,230,215,0.85)'
      ctx.font = '600 22px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('THE VERTICAL GARDEN', w / 2, h - 34)
      noise(ctx, w, h, 10, 1)
    },
    (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping
      t.wrapT = THREE.ClampToEdgeWrapping
    },
  )
}

export function signTexture(text: string, hue: number): THREE.Texture {
  return make(
    `sign-${text}-${hue}`,
    512,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#05060c'
      ctx.fillRect(0, 0, w, h)
      ctx.font = '700 74px "Trebuchet MS", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = `hsl(${hue},95%,60%)`
      ctx.shadowBlur = 28
      ctx.fillStyle = `hsl(${hue},95%,72%)`
      ctx.fillText(text, w / 2, h / 2)
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.55
      ctx.fillText(text, w / 2, h / 2)
      ctx.globalAlpha = 1
    },
    (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping
      t.wrapT = THREE.ClampToEdgeWrapping
    },
  )
}

export function disposeTextures(): void {
  cache.forEach((t) => t.dispose())
  cache.clear()
}
