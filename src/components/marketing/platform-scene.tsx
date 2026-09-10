"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { resolveCssColor } from "@/lib/resolve-css-theme";

/**
 * Three of the things an aesthetic clinic actually keeps on the trolley —
 * a syringe, a dropper bottle of serum, a jar — modelled from primitives
 * and floating in WebGL. Not documents, not cards: the section's copy
 * already carries the words, so the visual gets to be the objects
 * themselves.
 *
 * Each item is a small group of cylinders, cones and spheres rather than a
 * loaded model file: it keeps the whole scene at a few hundred triangles
 * and needs no asset pipeline, which matters for something decorative
 * sitting halfway down a marketing page.
 */

const LAYOUT = [
  { x: -1.85, y: 0.12, rotZ: -0.18, phase: 0 },
  { x: 0, y: -0.14, rotZ: 0.05, phase: 2.1 },
  { x: 1.85, y: 0.18, rotZ: 0.2, phase: 4.2 },
];

/** The app's own service-category colours: Injectables, Skin Treatments,
 *  Laser & Devices — the same three used on the Services screen. */
const ACCENTS = [0x0d9488, 0x6366f1, 0xd97706];

export function PlatformScene({ onUnsupported }: { onUnsupported?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        onUnsupported?.();
        return;
      }
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        if (!renderer.getContext()) throw new Error("no webgl context");
      } catch {
        onUnsupported?.();
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0, 7.8);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      // Lit from the front-right with a teal rim behind, so the metal and
      // glass have something to catch.
      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      const key = new THREE.DirectionalLight(0xffffff, 1.35);
      key.position.set(3, 4, 5);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4);
      fill.position.set(-4, 1, 3);
      const rim = new THREE.DirectionalLight(0x2dd4bf, 0.75);
      rim.position.set(-2.5, -1.5, -3);
      scene.add(ambient, key, fill, rim);

      // Glass reads as the page's own foreground tint so it stays visible
      // on either theme rather than washing out on white.
      const glassTint = new THREE.Color(resolveCssColor("--muted-foreground"));

      const glass = () =>
        new THREE.MeshStandardMaterial({
          color: glassTint,
          roughness: 0.12,
          metalness: 0.15,
          transparent: true,
          opacity: 0.32,
        });
      const metal = () =>
        new THREE.MeshStandardMaterial({
          color: 0xdfe4ea,
          roughness: 0.22,
          metalness: 0.95,
        });
      const plastic = (color: number) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.08,
        });
      const fluid = (color: number) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.18,
          metalness: 0.05,
          transparent: true,
          opacity: 0.9,
        });

      // Derived from Mesh's own constructor rather than written out:
      // BufferGeometry's class default is wider than the one Mesh accepts,
      // so naming the class directly doesn't typecheck against a concrete
      // CylinderGeometry.
      type PartGeometry = NonNullable<ConstructorParameters<typeof THREE.Mesh>[0]>;
      type PartMaterial = NonNullable<ConstructorParameters<typeof THREE.Mesh>[1]>;

      function addPart(
        group: InstanceType<typeof THREE.Group>,
        geometry: PartGeometry,
        material: PartMaterial,
        y: number,
        rotX = 0,
      ) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.rotation.x = rotX;
        group.add(mesh);
        return mesh;
      }

      /** A luer-slip syringe: glass barrel, coloured fill, thumb plunger,
       *  tapered hub and a steel needle. */
      function buildSyringe(accent: number) {
        const g = new THREE.Group();
        addPart(g, new THREE.CylinderGeometry(0.22, 0.22, 1.25, 28), glass(), 0);
        addPart(
          g,
          new THREE.CylinderGeometry(0.185, 0.185, 0.72, 24),
          fluid(accent),
          -0.24,
        );
        // Finger flange and plunger.
        addPart(g, new THREE.CylinderGeometry(0.35, 0.35, 0.05, 28), metal(), 0.64);
        addPart(g, new THREE.CylinderGeometry(0.07, 0.07, 0.72, 14), metal(), 0.98);
        addPart(g, new THREE.CylinderGeometry(0.27, 0.27, 0.07, 24), plastic(accent), 1.36);
        // Hub, tapering into the needle.
        addPart(g, new THREE.ConeGeometry(0.22, 0.3, 24), plastic(accent), -0.77, Math.PI);
        addPart(g, new THREE.CylinderGeometry(0.026, 0.016, 0.66, 10), metal(), -1.24);
        return g;
      }

      /** A serum bottle with a pipette cap — the shape every skincare
       *  shelf has on it. */
      function buildDropperBottle(accent: number) {
        const g = new THREE.Group();
        addPart(g, new THREE.CylinderGeometry(0.44, 0.44, 1.05, 32), glass(), -0.2);
        addPart(
          g,
          new THREE.CylinderGeometry(0.39, 0.39, 0.72, 28),
          fluid(accent),
          -0.34,
        );
        // Shoulder tapering into the neck.
        addPart(g, new THREE.CylinderGeometry(0.19, 0.44, 0.22, 32), glass(), 0.44);
        addPart(g, new THREE.CylinderGeometry(0.17, 0.17, 0.16, 24), glass(), 0.63);
        // Collar and rubber bulb.
        addPart(g, new THREE.CylinderGeometry(0.23, 0.23, 0.34, 28), plastic(accent), 0.86);
        const bulb = addPart(
          g,
          new THREE.SphereGeometry(0.2, 24, 18),
          plastic(accent),
          1.2,
        );
        bulb.scale.set(1, 1.25, 1);
        return g;
      }

      /** A squat cream jar with a metal lid. */
      function buildJar(accent: number) {
        const g = new THREE.Group();
        addPart(g, new THREE.CylinderGeometry(0.52, 0.46, 0.62, 34), glass(), -0.22);
        addPart(
          g,
          new THREE.CylinderGeometry(0.47, 0.42, 0.34, 30),
          fluid(accent),
          -0.3,
        );
        addPart(g, new THREE.CylinderGeometry(0.56, 0.56, 0.28, 34), plastic(accent), 0.22);
        const rim = addPart(
          g,
          new THREE.TorusGeometry(0.56, 0.028, 10, 44),
          metal(),
          0.36,
        );
        rim.rotation.x = Math.PI / 2;
        return g;
      }

      const builders = [buildSyringe, buildDropperBottle, buildJar];
      const items = builders.map((build, i) => {
        const group = build(ACCENTS[i]);
        group.scale.setScalar(0.2);
        scene.add(group);
        return { group, ...LAYOUT[i] };
      });

      function resize() {
        const rect = container!.getBoundingClientRect();
        const w = Math.max(rect.width, 1);
        const h = Math.max(rect.height, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      const pointerFine = window.matchMedia(
        "(pointer: fine) and (hover: hover)",
      ).matches;
      const pointerTarget = { x: 0, y: 0 };
      const pointerCurrent = { x: 0, y: 0 };
      function onPointerMove(event: PointerEvent) {
        const rect = container!.getBoundingClientRect();
        pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointerTarget.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      }
      if (pointerFine && !reducedMotion) {
        container.addEventListener("pointermove", onPointerMove);
      }

      let frame = 0;
      const start = performance.now();

      function draw(time: number) {
        const t = (time - start) / 1000;
        // Items grow out from the centre and settle into place; a single
        // eased progress drives position and scale together.
        const progress = reducedMotion ? 1 : Math.min(t / 1.2, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.05;

        items.forEach((item) => {
          const bob = reducedMotion ? 0 : Math.sin(t * 0.75 + item.phase) * 0.07;
          const spin = reducedMotion ? 0 : t * 0.28 + item.phase;

          item.group.position.x = item.x * eased + pointerCurrent.x * 0.2;
          item.group.position.y =
            item.y * eased + bob + pointerCurrent.y * -0.1;
          item.group.rotation.y = spin;
          item.group.rotation.z = item.rotZ * eased;
          item.group.scale.setScalar(0.2 + 0.8 * eased);
        });

        renderer.render(scene, camera);
        if (!reducedMotion || progress < 1) frame = requestAnimationFrame(draw);
      }
      frame = requestAnimationFrame(draw);

      // Only the glass tint follows the theme; the items keep their own
      // colours, the way a real object would.
      function applyPalette() {
        glassTint.set(resolveCssColor("--muted-foreground"));
      }
      const themeObserver = new MutationObserver(applyPalette);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        themeObserver.disconnect();
        container!.removeEventListener("pointermove", onPointerMove);
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = (mesh as { material?: unknown }).material;
          if (Array.isArray(material)) {
            material.forEach((m) => (m as { dispose?: () => void }).dispose?.());
          } else if (material) {
            (material as { dispose?: () => void }).dispose?.();
          }
        });
        renderer.dispose();
        container!.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="aspect-[4/3] w-full max-w-xl"
      aria-hidden
    />
  );
}
