"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Three of the things an aesthetic clinic actually keeps on the trolley —
 * a syringe, a serum bottle, a cream jar — modelled from lathed profiles
 * and lit like a product shot.
 *
 * What does the work here isn't polygon count, it's the render setup:
 * refractive glass (transmission, not opacity), a hand-built studio
 * environment so reflections are controlled and on-brand rather than
 * whatever a generic room map happens to contain, a real shadow map on a
 * ground plane the camera is tilted just enough to see, and a staggered
 * composition so the trio has depth instead of sitting in a flat row.
 *
 * All of that is stepped down on small or low-core devices, where the
 * transmission pass and shadow map cost more than they return.
 */

const LAYOUT = [
  { x: -1.72, y: -0.04, z: -0.5, tilt: -0.12, scale: 0.84, phase: 0 },
  { x: 0.06, y: 0.06, z: 0.62, tilt: 0.05, scale: 1.06, phase: 2.3 },
  { x: 1.68, y: -0.08, z: -0.32, tilt: 0.15, scale: 1.02, phase: 4.4 },
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

      // Refraction and shadow maps are the two expensive things here, and
      // the two least missed on a phone.
      const lowPower =
        window.matchMedia("(max-width: 700px)").matches ||
        (navigator.hardwareConcurrency ?? 8) <= 4;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.transmissionResolutionScale = lowPower ? 0.35 : 0.6;
      if (!lowPower) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
      // Lifted a little so the ground — and therefore the contact shadow —
      // is visible at all. Straight-on, a floor plane is edge-on and does
      // nothing.
      camera.position.set(0, 0.85, 6.9);
      camera.lookAt(0, -0.12, 0);

      /**
       * A studio in an equirect canvas: gradient from a bright ceiling to a
       * darker floor, one large softbox for the key highlight and a teal
       * bounce card on the opposite side. Controlled and on-brand, where a
       * generic room map throws unpredictable colour onto every highlight.
       */
      function buildStudioEnvironment() {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;

        const sky = ctx.createLinearGradient(0, 0, 0, 512);
        sky.addColorStop(0, "#ffffff");
        sky.addColorStop(0.42, "#e4edf0");
        sky.addColorStop(0.52, "#aab8bf");
        sky.addColorStop(1, "#4d585e");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 1024, 512);

        ctx.filter = "blur(34px)";
        // Key softbox, upper left of the reflection sphere.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(90, 30, 300, 170);
        // Teal bounce opposite it, so the rim light has a colour.
        ctx.fillStyle = "#7fe8d5";
        ctx.fillRect(640, 70, 250, 140);
        // A warm low kick to keep the shadow side from going flat.
        ctx.fillStyle = "#f6e2c8";
        ctx.fillRect(380, 330, 260, 120);
        ctx.filter = "none";

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }

      const pmrem = new THREE.PMREMGenerator(renderer);
      const equirect = buildStudioEnvironment();
      const environment = pmrem.fromEquirectangular(equirect);
      scene.environment = environment.texture;
      equirect.dispose();

      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3.2, 5, 4.5);
      if (!lowPower) {
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 18;
        key.shadow.camera.left = -5;
        key.shadow.camera.right = 5;
        key.shadow.camera.top = 5;
        key.shadow.camera.bottom = -5;
        key.shadow.bias = -0.0016;
        key.shadow.radius = 5;
      }
      const rim = new THREE.DirectionalLight(0x5eead4, 1.2);
      rim.position.set(-3.5, -0.5, -3);
      scene.add(key, rim);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.ShadowMaterial({ opacity: 0.19 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.42;
      ground.receiveShadow = true;
      scene.add(ground);

      // The page's teal in two tones, a cream fill, and chrome for
      // contrast — one family rather than three competing accents.
      const TEAL_BRIGHT = 0x14b8a6;
      const TEAL_DEEP = 0x0f766e;
      const CREAM = 0xf4ece0;

      const glass = (tint: number, thickness = 0.4) =>
        lowPower
          ? new THREE.MeshPhysicalMaterial({
              color: tint,
              roughness: 0.07,
              metalness: 0,
              transparent: true,
              opacity: 0.42,
              clearcoat: 1,
              clearcoatRoughness: 0.04,
              envMapIntensity: 1.5,
            })
          : new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              transmission: 1,
              thickness,
              ior: 1.47,
              roughness: 0.05,
              metalness: 0,
              clearcoat: 1,
              clearcoatRoughness: 0.03,
              attenuationColor: new THREE.Color(tint),
              attenuationDistance: 1.1,
              iridescence: 0.22,
              iridescenceIOR: 1.32,
              envMapIntensity: 1.4,
            });

      const chrome = () =>
        new THREE.MeshStandardMaterial({
          color: 0xf1f5f6,
          roughness: 0.13,
          metalness: 1,
          envMapIntensity: 1.6,
        });

      const enamel = (color: number) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.26,
          metalness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.2,
        });

      const liquid = (color: number) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.1,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMapIntensity: 1,
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
        mesh.castShadow = !lowPower;
        group.add(mesh);
        return mesh;
      }

      /** Revolves a 2D silhouette — the only way to get the curved
       *  shoulders and rolled lips a moulded object actually has. */
      function lathe(points: [number, number][], segments = 64) {
        return new THREE.LatheGeometry(
          points.map(([x, y]) => new THREE.Vector2(x, y)),
          segments,
        );
      }

      function buildSyringe() {
        const g = new THREE.Group();
        addPart(
          g,
          lathe([
            [0.0, -0.62],
            [0.205, -0.62],
            [0.205, 0.58],
            [0.225, 0.605],
            [0.33, 0.625],
            [0.33, 0.675],
            [0.0, 0.675],
          ]),
          glass(0xdff3f1, 0.22),
          0,
        );
        addPart(
          g,
          new THREE.CylinderGeometry(0.183, 0.183, 0.78, 48),
          liquid(TEAL_BRIGHT),
          -0.2,
        );
        // Graduation marks, which is most of what reads as "syringe".
        [0.06, 0.2, 0.34, 0.48].forEach((offset) => {
          const ring = addPart(
            g,
            new THREE.TorusGeometry(0.207, 0.006, 8, 44),
            chrome(),
            offset,
            Math.PI / 2,
          );
          ring.scale.setScalar(1);
        });
        addPart(g, new THREE.CylinderGeometry(0.072, 0.072, 0.78, 24), chrome(), 1.0);
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.27, 0.0],
            [0.29, 0.022],
            [0.29, 0.062],
            [0.26, 0.08],
            [0.0, 0.08],
          ]),
          enamel(TEAL_DEEP),
          1.35,
        );
        addPart(g, new THREE.CylinderGeometry(0.185, 0.185, 0.1, 40), enamel(TEAL_DEEP), 0.19);
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.2, 0.0],
            [0.185, 0.06],
            [0.09, 0.25],
            [0.042, 0.3],
            [0.0, 0.3],
          ]),
          enamel(TEAL_DEEP),
          -0.92,
        );
        addPart(g, new THREE.CylinderGeometry(0.021, 0.011, 0.64, 14), chrome(), -1.24);
        return g;
      }

      function buildSerumBottle() {
        const g = new THREE.Group();
        addPart(
          g,
          lathe([
            [0.0, -0.7],
            [0.3, -0.7],
            [0.41, -0.64],
            [0.435, -0.5],
            [0.435, 0.18],
            [0.415, 0.32],
            [0.3, 0.47],
            [0.19, 0.55],
            [0.18, 0.71],
            [0.0, 0.71],
          ]),
          glass(TEAL_DEEP, 0.5),
          0,
        );
        addPart(
          g,
          new THREE.CylinderGeometry(0.375, 0.375, 0.84, 48),
          liquid(TEAL_BRIGHT),
          -0.26,
        );
        // A wrap-around label — the thing that turns a bottle into a
        // product rather than a container.
        addPart(
          g,
          new THREE.CylinderGeometry(0.443, 0.443, 0.34, 48, 1, true),
          enamel(CREAM),
          -0.12,
        );
        addPart(
          g,
          new THREE.TorusGeometry(0.444, 0.007, 8, 56),
          enamel(TEAL_BRIGHT),
          0.045,
          Math.PI / 2,
        );
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.225, 0.0],
            [0.225, 0.26],
            [0.2, 0.31],
            [0.0, 0.31],
          ]),
          chrome(),
          0.7,
        );
        const bulb = addPart(g, new THREE.SphereGeometry(0.185, 40, 28), enamel(TEAL_DEEP), 1.16);
        bulb.scale.set(1, 1.32, 1);
        return g;
      }

      function buildCreamJar() {
        const g = new THREE.Group();
        addPart(
          g,
          lathe([
            [0.0, -0.34],
            [0.39, -0.34],
            [0.49, -0.25],
            [0.51, 0.06],
            [0.49, 0.17],
            [0.45, 0.2],
            [0.45, 0.24],
            [0.0, 0.24],
          ]),
          glass(0xeaf5f3, 0.34),
          0,
        );
        addPart(g, new THREE.CylinderGeometry(0.44, 0.41, 0.42, 48), liquid(CREAM), -0.1);
        addPart(
          g,
          lathe([
            [0.0, 0.0],
            [0.53, 0.0],
            [0.545, 0.035],
            [0.545, 0.2],
            [0.5, 0.27],
            [0.0, 0.27],
          ]),
          chrome(),
          0.22,
        );
        addPart(
          g,
          new THREE.TorusGeometry(0.541, 0.019, 12, 64),
          enamel(TEAL_BRIGHT),
          0.32,
          Math.PI / 2,
        );
        return g;
      }

      const items = [buildSyringe(), buildSerumBottle(), buildCreamJar()].map(
        (group, i) => {
          scene.add(group);
          return { group, ...LAYOUT[i] };
        },
      );

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
        const progress = reducedMotion ? 1 : Math.min(t / 1.3, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.05;

        items.forEach((item) => {
          const bob = reducedMotion ? 0 : Math.sin(t * 0.68 + item.phase) * 0.07;
          // Rocking through a limited arc, not spinning: a full turn keeps
          // swinging the label and the graduations away from the viewer.
          const rock = reducedMotion
            ? 0.3
            : 0.3 + Math.sin(t * 0.4 + item.phase) * 0.4;

          item.group.position.x = item.x * eased + pointerCurrent.x * 0.2;
          item.group.position.y = item.y * eased + bob + pointerCurrent.y * -0.09;
          item.group.position.z = item.z * eased;
          item.group.rotation.y = rock + pointerCurrent.x * 0.16;
          item.group.rotation.z = item.tilt * eased;
          item.group.scale.setScalar(item.scale * (0.3 + 0.7 * eased));
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
