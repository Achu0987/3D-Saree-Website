"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// "The silk room": saree lengths hanging from a gold rod, swaying like cloth in a breeze.
// `fabrics`: [{ tex, name }]. `progress`: ref 0..1 (scroll through the section).
// `onFocus(i)`: called when a different fabric becomes the one closest to centre.
export default function HangingSilk({ fabrics, progress, onFocus }) {
  const ref = useRef(null);
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;

  useEffect(() => {
    const canvas = ref.current;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    scene.add(new THREE.HemisphereLight("#fff8ee", "#d9c3a5", 1.1));
    const key = new THREE.DirectionalLight("#fff1dc", 2.2);
    key.position.set(2, 5, 6);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(mobile ? 50 : 34, 1, 0.1, 60);

    const GAP = mobile ? 1.9 : 2.25;
    const W = 1.35;
    const H = 4.6;
    const TOP = 2.3;
    const loader = new THREE.TextureLoader();
    const strips = [];

    // gold rod across the whole row
    const span = GAP * (fabrics.length - 1) + 3;
    const gold = new THREE.MeshStandardMaterial({ color: "#c9a35a", metalness: 1, roughness: 0.28 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, span, 24), gold);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(((fabrics.length - 1) * GAP) / 2, TOP + 0.08, 0);
    scene.add(rod);
    [-1, 1].forEach((s) => {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), gold);
      knob.position.set(rod.position.x + (s * span) / 2, TOP + 0.08, 0);
      scene.add(knob);
    });

    fabrics.forEach((f, i) => {
      const geo = new THREE.PlaneGeometry(W, H, 24, 64);
      geo.translate(0, -H / 2, 0); // pin at the top edge
      const map = loader.load(f.tex);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      // the scans are long and landscape with borders top/bottom; turn them so the borders run down the sides
      map.center.set(0.5, 0.5);
      map.rotation = Math.PI / 2;
      map.repeat.set(0.95, 0.62);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhysicalMaterial({ map, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.05, sheen: 0.7, sheenRoughness: 0.4, sheenColor: new THREE.Color("#ecc897") })
      );
      mesh.position.set(i * GAP, TOP, 0);
      scene.add(mesh);
      strips.push({ mesh, base: Float32Array.from(geo.attributes.position.array), phase: i * 1.7, billow: 0 });
      // small gold rings holding the fabric
      for (let k = 0; k < 4; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24), gold);
        ring.position.set(i * GAP - W / 2 + 0.12 + (k * (W - 0.24)) / 3, TOP + 0.08, 0);
        scene.add(ring);
      }
    });

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // the fabric under the cursor billows
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", () => ndc.set(9, 9));

    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    let raf;
    let focus = -1;
    const start = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = reduce ? 0 : (now - start) / 1000;
      const p = progress.current ?? 0;

      // camera glides along the row; starts with the first fabric right of the heading
      const startX = mobile ? 0 : -2.6;
      const camX = startX + p * ((fabrics.length - 1) * GAP - startX);
      camera.position.set(camX, 0.2, mobile ? 12 : 10.5);
      camera.lookAt(camX, 0.05, 0);

      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(strips.map((s) => s.mesh))[0];

      strips.forEach((s, i) => {
        s.billow += ((hit?.object === s.mesh ? 1 : 0) - s.billow) * 0.06;
        const pos = s.mesh.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const x = s.base[v * 3];
          const y = s.base[v * 3 + 1];
          const hang = -y / H; // 0 at the rod, 1 at the hem
          const amp = hang * hang;
          const z =
            Math.sin(y * 1.3 + t * 1.2 + s.phase) * 0.22 * amp +
            Math.sin(x * 3 + y * 0.8 + t * 1.7 + s.phase) * 0.05 * hang +
            s.billow * Math.sin(y * 2.2 + t * 3) * 0.35 * amp;
          pos.setXYZ(v, x + Math.sin(t * 0.8 + s.phase) * 0.08 * amp, y, z);
        }
        pos.needsUpdate = true;
        s.mesh.geometry.computeVertexNormals();
        // nearest to centre comes slightly forward
        const d = Math.abs(i * GAP - camX);
        const near = Math.max(0, 1 - d / GAP);
        s.mesh.position.z += (near * 0.6 - s.mesh.position.z) * 0.08;
      });

      const nearest = Math.max(0, Math.min(fabrics.length - 1, Math.round(camX / GAP)));
      if (nearest !== focus) {
        focus = nearest;
        focusRef.current?.(nearest);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [fabrics, progress]);

  return <canvas ref={ref} className="silkroom__canvas" aria-hidden />;
}
