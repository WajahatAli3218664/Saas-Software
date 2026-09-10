"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Three of the things an aesthetic clinic actually keeps on the trolley —
 * a syringe, a serum bottle, a cream jar — modelled from primitives and
 * lit in WebGL. Not documents, not cards: the section's copy carries the
 * words, so the visual gets to be the objects themselves.
 *
 * The look comes from three decisions rather than detailed geometry:
 * an image-based environment so chrome and glass have something to
 * reflect, filmic tone mapping so the highlights roll off instead of
 * clipping, and lathed silhouettes so the bottle and jar have the
 * curved shoulders that stacked cylinders can't give them.
 */

const LAYOUT = [
  { x: -1.9, y: 0.05, tilt: -0.14, scale: 0.86, phase: 0 },
  { x: 0, y: -0.05, tilt: 0.07, scale: 1, phase: 2.3 },
  { x: 1.9, y: 0.1, tilt: 0.16, scale: 1.12, phase: 4.4 },
];

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
      let RoomEnvironment: typeof import("three/addons/environments/RoomEnvironment.js").RoomEnvironment;
      try {
        [THREE, { RoomEnvironment }] = await Promise.all([
          import("three"),
          import("three/addons/environments/RoomEnvironment.js"),
        ]);
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

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0, 7.8);

      // A generated room gives every metal and glass surface something to
      // reflect. Without it, chrome renders as flat grey and the glass
      // reads as tinted plastic.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = environment.texture;

      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(3, 4.5, 5);
      const rim = new THREE.DirectionalLight(0x5eead4, 1.1);
      rim.position.set(-3, -1, -3.5);
      scene.add(key, rim);

      // One family of colour, not three competing ones — the page's teal
      // in three tones, with chrome doing the contrast.
      const TEAL_BRIGHT = 0x14b8a6;
      const TEAL_DEEP = 0x0f766e;
      const CREAM = 0xf2e9dd;

      const glass = (tint: number, opacity: number, roughness = 0.06) =>
        new THREE.MeshPhysicalMaterial({
          color: tint,
          roughness,
          metalness: 0,
          transparent: true,
          opacity,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          envMapIntensity: 1.6,
        });

      const chrome = () =>
        new THREE.MeshStandardMaterial({
          color: 0xeef2f4,
          roughness: 0.14,
          metalness: 1,
          envMapIntensity: 1.5,
        });

      const enamel = (color: number) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.28,
          metalness: 0.1,
          clearcoat: 0.9,
          clearcoatRoughness: 0.12,
          envMapIntensity: 1.2,
        });

      const fluid = (color: number) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.12,
          metalness: 0,
          transparent: true,
          opacity: 0.92,
          clearcoat: 1,
          envMapIntensity: 1.1,
        });

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

      /** Revolves a 2D silhouette — the only way to get the curved
       *  shoulder a real bottle has. */
      function lathe(points: [number, number][], segments = 48) {
        return new THREE.LatheGeometry(
          points.map(([x, y]) => new THREE.Vector2(x, y)),
          segments,
        );
      }

      function buildSyringe() {
        const g = new THREE.Group();
        // Barrel with a rolled lip at the top, drawn as a profile.
        addPart(
          g,
          lathe([
            [0.0, -0.62],
            [0.21, -0.62],
            [0.21, 0.6],
            [0.24, 0.62],
            [0.34, 0.64],
            [0.34, 0.69],
            [0.0, 0.69],
          ]),
          glass(0xdff1f0, 0.34),
          0,
        );
        addPart(
          g,
          new THREE.CylinderGeometry(0.185, 0.185, 0.78, 40),
          fluid(TEAL_BRIGHT),
          -0.21,
        );
        // Plunger: rod, thumb pad, and the seal you can see through glass.
        addPart(g, new THREE.CylinderGeometry(0.075, 0.075, 0.8, 20), chrome(), 1.02);
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.28, 0.0],
            [0.3, 0.02],
            [0.3, 0.07],
            [0.0, 0.07],
          ]),
          enamel(TEAL_DEEP),
          1.38,
        );
        addPart(g, new THREE.CylinderGeometry(0.19, 0.19, 0.1, 32), enamel(TEAL_DEEP), 0.2);
        // Hub tapering into a steel needle.
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.2, 0.0],
            [0.1, 0.26],
            [0.045, 0.3],
            [0.0, 0.3],
          ]),
          enamel(TEAL_DEEP),
          -0.92,
        );
        addPart(g, new THREE.CylinderGeometry(0.022, 0.012, 0.62, 12), chrome(), -1.23);
        return g;
      }

      function buildSerumBottle() {
        const g = new THREE.Group();
        addPart(
          g,
          lathe([
            [0.0, -0.72],
            [0.32, -0.72],
            [0.42, -0.66],
            [0.44, -0.52],
            [0.44, 0.2],
            [0.42, 0.34],
            [0.3, 0.48],
            [0.19, 0.56],
            [0.18, 0.72],
            [0.0, 0.72],
          ]),
          glass(TEAL_DEEP, 0.42, 0.1),
          0,
        );
        addPart(
          g,
          new THREE.CylinderGeometry(0.38, 0.38, 0.82, 40),
          fluid(TEAL_BRIGHT),
          -0.28,
        );
        // Collar and pipette bulb.
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.23, 0.0],
            [0.23, 0.3],
            [0.2, 0.34],
            [0.0, 0.34],
          ]),
          chrome(),
          0.7,
        );
        const bulb = addPart(g, new THREE.SphereGeometry(0.19, 32, 24), enamel(TEAL_DEEP), 1.18);
        bulb.scale.set(1, 1.3, 1);
        return g;
      }

      function buildCreamJar() {
        const g = new THREE.Group();
        addPart(
          g,
          lathe([
            [0.0, -0.34],
            [0.4, -0.34],
            [0.5, -0.26],
            [0.52, 0.08],
            [0.5, 0.18],
            [0.46, 0.2],
            [0.46, 0.24],
            [0.0, 0.24],
          ]),
          glass(0xe9f4f2, 0.36),
          0,
        );
        addPart(g, new THREE.CylinderGeometry(0.45, 0.42, 0.4, 40), fluid(CREAM), -0.11);
        // Weighted metal lid with a bevelled edge.
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.55, 0.0],
            [0.56, 0.04],
            [0.56, 0.22],
            [0.52, 0.28],
            [0.0, 0.28],
          ]),
          chrome(),
          0.22,
        );
        addPart(g, new THREE.TorusGeometry(0.556, 0.022, 12, 56), enamel(TEAL_BRIGHT), 0.34, Math.PI / 2);
        return g;
      }

      const items = [buildSyringe(), buildSerumBottle(), buildCreamJar()].map(
        (group, i) => {
          scene.add(group);
          return { group, ...LAYOUT[i] };
        },
      );

      // A soft haze under each object so it sits in the scene rather than
      // floating in a void — a camera-facing gradient, since a flat ground
      // plane would be edge-on to this camera and invisible.
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const shadowCtx = shadowCanvas.getContext("2d")!;
      const grad = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,0.4)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 128, 128);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadows = items.map((item) => {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.9, 0.7),
          new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        );
        mesh.position.set(item.x, -1.55, -0.4);
        scene.add(mesh);
        return mesh;
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
        const progress = reducedMotion ? 1 : Math.min(t / 1.2, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.05;

        items.forEach((item, i) => {
          const bob = reducedMotion ? 0 : Math.sin(t * 0.7 + item.phase) * 0.075;
          // Rocking, not spinning: a full turn keeps swinging the good
          // side away from the viewer.
          const rock = reducedMotion
            ? 0.35
            : 0.35 + Math.sin(t * 0.42 + item.phase) * 0.45;

          item.group.position.x = item.x * eased + pointerCurrent.x * 0.22;
          item.group.position.y = item.y * eased + bob + pointerCurrent.y * -0.1;
          item.group.rotation.y = rock + pointerCurrent.x * 0.18;
          item.group.rotation.z = item.tilt * eased;
          item.group.scale.setScalar(item.scale * (0.25 + 0.75 * eased));

          shadows[i].position.x = item.x * eased + pointerCurrent.x * 0.22;
          shadows[i].material.opacity = 0.5 * eased;
        });

        renderer.render(scene, camera);
        if (!reducedMotion || progress < 1) frame = requestAnimationFrame(draw);
      }
      frame = requestAnimationFrame(draw);

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
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
        shadowTexture.dispose();
        environment.texture.dispose();
        pmrem.dispose();
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
