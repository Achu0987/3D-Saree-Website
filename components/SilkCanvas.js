"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Woven in code: maroon silk body, gold zari borders with temple motifs, scattered buttas.
// Tiles seamlessly along the length of the drape.
function zariTexture() {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const body = g.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0, "#5a0b18");
  body.addColorStop(0.5, "#7d1224");
  body.addColorStop(1, "#5a0b18");
  g.fillStyle = body;
  g.fillRect(0, 0, W, H);
  // fine warp threads
  for (let x = 0; x < W; x += 2) {
    g.fillStyle = `rgba(255,${180 + Math.random() * 40},${150 + Math.random() * 40},${0.025 + Math.random() * 0.03})`;
    g.fillRect(x, 0, 1, H);
  }
  const gold = (y0, h) => {
    const gr = g.createLinearGradient(0, y0, 0, y0 + h);
    gr.addColorStop(0, "#8a6424");
    gr.addColorStop(0.5, "#e8c56f");
    gr.addColorStop(1, "#8a6424");
    return gr;
  };
  // borders: solid zari band + a row of temple triangles + thin rule
  [
    [0, 1],
    [H, -1],
  ].forEach(([edge, dir]) => {
    const y = (o) => edge + dir * o;
    g.fillStyle = gold(Math.min(y(0), y(70)), 70);
    g.fillRect(0, Math.min(y(0), y(70)), W, 70);
    g.fillStyle = "#5a0b18";
    for (let x = 0; x < W; x += 32) {
      // small diamonds woven into the band
      g.beginPath();
      g.moveTo(x + 16, y(22));
      g.lineTo(x + 24, y(35));
      g.lineTo(x + 16, y(48));
      g.lineTo(x + 8, y(35));
      g.fill();
    }
    g.fillStyle = gold(Math.min(y(70), y(100)), 30);
    for (let x = 0; x < W; x += 32) {
      // temple (gopuram) triangles pointing into the body
      g.beginPath();
      g.moveTo(x, y(70));
      g.lineTo(x + 16, y(100));
      g.lineTo(x + 32, y(70));
      g.fill();
    }
    g.fillStyle = "#e0bb62";
    g.fillRect(0, Math.min(y(108), y(111)), W, 3);
  });
  // body buttas (small gold flowers) on a staggered grid
  g.fillStyle = "#d9b25c";
  for (let row = 0; row < 5; row++) {
    for (let x = 0; x < W; x += 64) {
      const cx = x + (row % 2 ? 32 : 0) + 16;
      const cy = 150 + row * 52;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 4, 2, a, 0, Math.PI * 2);
        g.fill();
      }
      g.beginPath();
      g.arc(cx, cy, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

// A live silk drape: zari texture on a sheen material, rippling, twisting as you scroll.
// `progress` is a ref holding 0..1 (how far through the hero you've scrolled).
// `texture`: an image URL, or omit it to use the woven-in-code zari silk. Changing it cross-fades the fabric.
export default function SilkCanvas({ texture, progress }) {
  const ref = useRef(null);
  const firstTexture = useRef(texture);
  const swapRef = useRef(null);

  // later texture changes swap the fabric in place, without rebuilding the scene
  useEffect(() => {
    if (texture !== firstTexture.current) swapRef.current?.(texture);
  }, [texture]);

  useEffect(() => {
    const texture = firstTexture.current;
    const canvas = ref.current;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 9);

    const warm = new THREE.DirectionalLight("#fff1dc", 2.4);
    warm.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight("#ffd6a8", 1.4);
    rim.position.set(-4, -1, -3);
    scene.add(warm, rim, new THREE.HemisphereLight("#fff8ee", "#c9a98a", 0.8));

    // cloth surface
    // long and narrow like a saree pallu
    const W = 8.6;
    const H = 2.35;
    const SX = mobile ? 90 : 150;
    const SY = mobile ? 40 : 64;
    const geo = new THREE.PlaneGeometry(W, H, SX, SY);
    const base = Float32Array.from(geo.attributes.position.array);
    const uvs = geo.attributes.uv.array;

    const loader = new THREE.TextureLoader();
    const prep = (m, scan) => {
      m.colorSpace = THREE.SRGBColorSpace;
      m.wrapS = m.wrapT = THREE.RepeatWrapping;
      m.repeat.set(scan ? 1 : 2, 1); // a full fabric scan is shown once, edge to edge
      m.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return m;
    };
    let map = prep(texture ? loader.load(texture) : zariTexture(), !!texture);

    // soft ends: the fabric fades into the air instead of stopping at a hard rectangle edge
    const fade = document.createElement("canvas");
    fade.width = 512;
    fade.height = 4;
    {
      const g = fade.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 512, 0);
      // only a whisper of fade at the very ends, so the whole saree reads clearly
      gr.addColorStop(0, "#000");
      gr.addColorStop(0.03, "#fff");
      gr.addColorStop(0.97, "#fff");
      gr.addColorStop(1, "#000");
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 4);
    }
    const alphaMap = new THREE.CanvasTexture(fade);

    const silk = new THREE.Mesh(
      geo,
      new THREE.MeshPhysicalMaterial({
        map,
        alphaMap,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.42,
        metalness: 0.08,
        sheen: 0.75, // enough glow to read as silk without washing out deep colours
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color("#e9c497"),
      })
    );
    const holder = new THREE.Group();
    holder.add(silk);
    holder.rotation.z = -0.22;
    scene.add(holder);

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.position.z = camera.aspect < 1 ? 13 : 9;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // only animate while the hero is on screen
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    // fabric swap: fade the drape out, change the weave, fade back in
    let pending = null;
    let fadeDir = 0; // -1 fading out, +1 fading in
    swapRef.current = (url) => {
      loader.load(url, (tex) => {
        pending = prep(tex, true);
        fadeDir = -1;
      });
    };

    const pos = geo.attributes.position;
    let raf;
    let last = performance.now();
    const start = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = reduce ? 0 : (now - start) / 1000;
      const s = progress?.current ?? 0;
      const intro = Math.min(1, (now - start) / 1800);
      const ease = 1 - Math.pow(1 - intro, 3);

      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const u = uvs[i * 2];
        // held at the left edge, freer toward the right: flutter grows along the length
        const free = 0.2 + u * 1.05;
        let z =
          (Math.sin(x * 1.05 + t * 0.9) * 0.34 + Math.sin(y * 1.6 + x * 0.45 + t * 1.25) * 0.17 + Math.sin((x + y) * 2.4 + t * 1.8) * 0.05) * free;
        // the pallu falls in a gentle S-curve rather than a straight band
        const fall = Math.sin(u * Math.PI * 1.15 + 0.4) * 0.55 - u * 0.5;
        let yy = y + fall + Math.sin(x * 0.8 + t * 0.7) * 0.12 * free;
        // scroll: the drape twists along its length and lifts away
        const tw = u * s * Math.PI * 0.45; // a gentle half-turn, so the drape never pinches to a line
        const cy = yy * Math.cos(tw) - z * Math.sin(tw);
        const cz = yy * Math.sin(tw) + z * Math.cos(tw);
        // intro: unrolls from a narrow fold
        pos.setXYZ(i, x * (0.55 + 0.45 * ease), cy * (0.25 + 0.75 * ease), cz);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      mouse.sx += (mouse.x - mouse.sx) * 0.04;
      mouse.sy += (mouse.y - mouse.sy) * 0.04;
      // rests on the right beside the headline, sweeps to dead centre as you scroll
      holder.rotation.x = -0.25 * (1 - s) + mouse.sy * 0.2;
      holder.rotation.y = -0.35 * (1 - s) + mouse.sx * 0.3;
      holder.rotation.z = -0.22 * (1 - s);
      holder.position.y = mobile ? 1.6 * (1 - s) : 0;
      holder.position.x = mobile ? 0 : 2.6 * (1 - s);
      // by the end of the scroll the drape spans the full width of the screen, edge to edge
      const viewW = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const fullScale = (viewW * 1.06) / W;
      // stretch the length to the screen width, but keep the height modest so nothing is cut off
      if (mobile) holder.scale.setScalar(1);
      else holder.scale.set(1 + (fullScale - 1) * s, 1 + (Math.min(fullScale, 1.15) - 1) * s, 1);
      if (map.repeat.x > 1) map.offset.x = t * 0.012; // the tiling weave slowly travels along the drape

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (fadeDir) {
        const m = silk.material;
        m.opacity = Math.min(1, Math.max(0, m.opacity + fadeDir * dt * 4));
        if (fadeDir < 0 && m.opacity === 0 && pending) {
          map.dispose();
          map = pending;
          pending = null;
          m.map = map;
          m.needsUpdate = true;
          fadeDir = 1;
        } else if (fadeDir > 0 && m.opacity === 1) fadeDir = 0;
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      swapRef.current = null;
      pending?.dispose();
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      geo.dispose();
      map.dispose();
      alphaMap.dispose();
      silk.material.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [progress]);

  return <canvas ref={ref} className="silk" aria-hidden />;
}
