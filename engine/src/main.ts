import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./style.css";

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required UI element: #${id}`);
  return element as T;
};

const canvas = byId<HTMLCanvasElement>("scene-canvas");
const statusText = byId("status-text");
const assetLabel = byId("asset-label");
const pipelineStatus = byId("pipeline-status");
const fpsLabel = byId("fps-label");
const toast = byId("toast");
const loadingScreen = byId("loading-screen");
const loadingLabel = byId("loading-label");
const timelineLabel = byId("timeline-label");
const timelineTime = byId("timeline-time");
const timelineProgress = byId<HTMLDivElement>("timeline-progress");
const soundLabel = byId("sound-label");
const rotationLabel = byId("rotation-label");
const rotationSwitch = byId("rotation-switch");
const bloomLabel = byId("bloom-label");
const bloomSwitch = byId("bloom-switch");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#03050a");
scene.fog = new THREE.FogExp2("#03050a", 0.026);

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 180);
camera.position.set(8.4, 5.8, 10.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.88, 0.55, 0.16);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0, 1.75, 0);
controls.minDistance = 4.2;
controls.maxDistance = 24;
controls.maxPolarAngle = Math.PI * 0.48;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.42;
controls.update();

scene.add(new THREE.HemisphereLight("#a9d9ef", "#10121b", 1.15));

const keyLight = new THREE.DirectionalLight("#e3f4ff", 3.15);
keyLight.position.set(5, 10, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -9;
scene.add(keyLight);

const cyanLight = new THREE.PointLight("#00d7ff", 34, 12, 2);
cyanLight.position.set(-3, 2.1, 1.5);
scene.add(cyanLight);

const amberLight = new THREE.PointLight("#ff642a", 20, 10, 2);
amberLight.position.set(3.2, 2.6, -2);
scene.add(amberLight);

const rimLight = new THREE.SpotLight("#9d7bff", 48, 22, Math.PI / 5, 0.65, 1.5);
rimLight.position.set(-1, 8, -5);
rimLight.target.position.set(0, 1.6, 0);
scene.add(rimLight, rimLight.target);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

const proceduralRoot = new THREE.Group();
proceduralRoot.name = "MVM CORE — procedural fallback";
worldRoot.add(proceduralRoot);

let importedRoot: THREE.Object3D | null = null;
let importedMixer: THREE.AnimationMixer | null = null;
let importedClips: THREE.AnimationClip[] = [];
let activeAction: THREE.AnimationAction | null = null;
const animationPickerWrap = byId<HTMLDivElement>("animation-picker-wrap");
const animationSelect = byId<HTMLSelectElement>("animation-select");

function standardMaterial(
  color: string,
  metallic: number,
  roughness: number,
  emissive = "#000000",
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: metallic,
    roughness,
    emissive,
    emissiveIntensity
  });
}

const mats = {
  obsidian: standardMaterial("#111821", 0.92, 0.24),
  graphite: standardMaterial("#252f3a", 0.84, 0.29),
  silver: standardMaterial("#91a9b8", 0.86, 0.2),
  cyan: standardMaterial("#076a7b", 0.54, 0.2, "#00cfff", 3.2),
  cyanSoft: standardMaterial("#163943", 0.66, 0.25, "#00b9ef", 1.05),
  amber: standardMaterial("#8a3c1a", 0.68, 0.24, "#ff512a", 2.25),
  blackGlass: standardMaterial("#03080e", 0.45, 0.12, "#00495b", 0.4),
  white: standardMaterial("#c5d8df", 0.36, 0.24)
};

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(85, 96),
  new THREE.MeshStandardMaterial({ color: "#060910", roughness: 0.86, metalness: 0.24 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(60, 90, "#16414d", "#101c28");
grid.position.y = -0.105;
const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
for (const material of gridMaterials) {
  const mat = material as THREE.Material & { opacity: number; transparent: boolean };
  mat.opacity = 0.22;
  mat.transparent = true;
  mat.depthWrite = false;
}
scene.add(grid);

const horizonRing = new THREE.Mesh(
  new THREE.TorusGeometry(12.8, 0.018, 6, 180),
  mats.cyanSoft
);
horizonRing.rotation.x = Math.PI / 2;
horizonRing.position.y = -0.075;
scene.add(horizonRing);

function addMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: THREE.Vector3,
  castShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  y: number,
  material: THREE.Material,
  radialSegments = 12
): THREE.Mesh {
  return addMesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, false),
    material,
    proceduralRoot,
    new THREE.Vector3(0, y, 0)
  );
}

function addRing(
  radius: number,
  tube: number,
  y: number,
  material: THREE.Material,
  rotationZ = 0
): THREE.Mesh {
  const ring = addMesh(
    new THREE.TorusGeometry(radius, tube, 12, 96),
    material,
    proceduralRoot,
    new THREE.Vector3(0, y, 0)
  );
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = rotationZ;
  return ring;
}

function makeProceduralCore(): void {
  // Stepped machined base
  addCylinder(2.0, 2.18, 0.25, 0.16, mats.graphite, 12);
  addCylinder(1.82, 1.96, 0.12, 0.335, mats.silver, 12);
  addCylinder(1.62, 1.78, 0.22, 0.49, mats.obsidian, 12);
  addCylinder(1.44, 1.58, 0.07, 0.635, mats.cyan, 64);
  addCylinder(1.34, 1.42, 0.2, 0.75, mats.graphite, 12);
  addRing(1.48, 0.028, 0.82, mats.amber);
  addRing(1.29, 0.026, 0.86, mats.cyan);
  addRing(1.85, 0.022, 0.31, mats.cyanSoft);

  // Reactor containment shell
  addCylinder(0.94, 1.12, 1.8, 1.82, mats.obsidian, 12);
  addCylinder(0.84, 0.93, 1.56, 1.82, mats.blackGlass, 48);
  addCylinder(0.9, 0.9, 0.13, 0.99, mats.silver, 12);
  addCylinder(0.9, 0.9, 0.13, 2.65, mats.silver, 12);
  addRing(0.91, 0.045, 1.07, mats.cyan);
  addRing(0.91, 0.045, 2.57, mats.amber);
  addRing(0.85, 0.025, 1.23, mats.cyanSoft);
  addRing(0.85, 0.025, 2.4, mats.cyanSoft);

  // Vertical armor fins, small panel insets and fasteners
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const radius = 0.91;
    const fin = addMesh(
      new THREE.BoxGeometry(0.105, 1.28, 0.23),
      i % 3 === 0 ? mats.silver : mats.graphite,
      proceduralRoot,
      new THREE.Vector3(Math.cos(a) * radius, 1.82, Math.sin(a) * radius)
    );
    fin.rotation.y = -a;
    const inset = addMesh(
      new THREE.BoxGeometry(0.028, 0.72, 0.13),
      i % 2 === 0 ? mats.cyan : mats.amber,
      proceduralRoot,
      new THREE.Vector3(Math.cos(a) * 1.01, 1.82, Math.sin(a) * 1.01),
      false
    );
    inset.rotation.y = -a;
    for (const y of [1.23, 2.39]) {
      const pin = addMesh(
        new THREE.SphereGeometry(0.035, 10, 8),
        mats.white,
        proceduralRoot,
        new THREE.Vector3(Math.cos(a) * 1.035, y, Math.sin(a) * 1.035),
        false
      );
      pin.scale.set(1, 0.65, 1);
    }
  }

  // Reactor core and upper crown
  const innerCore = addCylinder(0.51, 0.65, 1.55, 1.84, mats.cyan, 48);
  innerCore.material = standardMaterial("#073744", 0.36, 0.18, "#00d8ff", 2.0);
  addCylinder(0.68, 0.7, 0.13, 2.68, mats.graphite, 12);
  addRing(0.69, 0.033, 2.76, mats.cyan);
  addCylinder(0.43, 0.56, 0.18, 2.81, mats.silver, 10);

  const crown = addMesh(
    new THREE.IcosahedronGeometry(0.53, 1),
    mats.white,
    proceduralRoot,
    new THREE.Vector3(0, 3.37, 0)
  );
  crown.scale.set(0.84, 1.3, 0.84);
  crown.name = "MVM floating crown crystal";

  const crownHalo = addRing(0.64, 0.025, 3.17, mats.cyan, 0.28);
  crownHalo.name = "MVM upper halo";

  // Three nested orbitals; distinct groups make animation intentional.
  const orbitA = new THREE.Group();
  orbitA.name = "MVM orbital ring A";
  proceduralRoot.add(orbitA);
  const ringA = addMesh(
    new THREE.TorusGeometry(1.37, 0.031, 12, 100),
    mats.cyan,
    orbitA,
    new THREE.Vector3(0, 1.83, 0),
    false
  );
  ringA.rotation.x = Math.PI / 2;
  orbitA.rotation.set(0.33, 0.0, 0.14);
  orbitA.userData.spin = 0.18;

  const orbitB = new THREE.Group();
  orbitB.name = "MVM orbital ring B";
  proceduralRoot.add(orbitB);
  const ringB = addMesh(
    new THREE.TorusGeometry(1.53, 0.019, 10, 100),
    mats.amber,
    orbitB,
    new THREE.Vector3(0, 2.03, 0),
    false
  );
  ringB.rotation.x = Math.PI / 2;
  orbitB.rotation.set(1.12, 0.1, -0.31);
  orbitB.userData.spin = -0.24;

  const orbitC = new THREE.Group();
  orbitC.name = "MVM orbital ring C";
  proceduralRoot.add(orbitC);
  const ringC = addMesh(
    new THREE.TorusGeometry(1.18, 0.014, 10, 100),
    mats.cyanSoft,
    orbitC,
    new THREE.Vector3(0, 2.26, 0),
    false
  );
  ringC.rotation.x = Math.PI / 2;
  orbitC.rotation.set(0.06, 0.2, 0.72);
  orbitC.userData.spin = 0.32;

  // Floating signal nodes around the reactor
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const y = 1.0 + (i % 4) * 0.54;
    const radius = i % 2 === 0 ? 1.75 : 1.54;
    const node = addMesh(
      new THREE.IcosahedronGeometry(i % 3 === 0 ? 0.105 : 0.07, 1),
      i % 3 === 0 ? mats.amber : mats.cyan,
      proceduralRoot,
      new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    );
    node.name = `MVM signal node ${String(i + 1).padStart(2, "0")}`;
    node.userData.floatPhase = angle;
    node.userData.baseY = y;
  }

  // Tiny technical bars around the footing
  for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2;
    const r = 1.78;
    const bar = addMesh(
      new THREE.BoxGeometry(0.11, 0.025, i % 4 === 0 ? 0.15 : 0.07),
      i % 4 === 0 ? mats.cyan : mats.silver,
      proceduralRoot,
      new THREE.Vector3(Math.cos(angle) * r, 0.31, Math.sin(angle) * r),
      false
    );
    bar.rotation.y = -angle;
  }

  // Small luminous dust field in the near scene, behind the hero.
  const positions = new Float32Array(720 * 3);
  for (let i = 0; i < 720; i += 1) {
    const radius = 5 + Math.random() * 24;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * radius;
    positions[i * 3 + 1] = Math.random() * 12 - 0.5;
    positions[i * 3 + 2] = Math.sin(a) * radius;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ color: "#7ed8f0", size: 0.025, transparent: true, opacity: 0.62, depthWrite: false })
  );
  dust.name = "MVM ambient particles";
  proceduralRoot.add(dust);
}

makeProceduralCore();

const gltfLoader = new GLTFLoader();
const clock = new THREE.Clock();
let elapsed = 0;
let frameCounter = 0;
let fpsTime = 0;
let currentFps = 0;
let bloomEnabled = true;
let cinematic: { startedAt: number; duration: number; from: THREE.Vector3 } | null = null;
let toastTimeout = 0;
let audioContext: AudioContext | null = null;
let audioGain: GainNode | null = null;
let soundEnabled = false;

function announce(message: string, kind: "info" | "error" = "info"): void {
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function setStatus(message: string): void {
  statusText.textContent = message.toUpperCase();
}

function resetCamera(): void {
  cinematic = null;
  controls.enabled = true;
  controls.target.set(0, 1.75, 0);
  camera.position.set(8.4, 5.8, 10.8);
  controls.update();
  timelineProgress.style.width = "0%";
  timelineLabel.textContent = "SCENE STANDBY";
  timelineTime.textContent = "00:00 / 00:08";
}

function playCinematic(): void {
  cinematic = { startedAt: elapsed, duration: 8, from: camera.position.clone() };
  controls.enabled = false;
  timelineLabel.textContent = "CINEMATIC CAMERA PASS";
  announce("Cinematic camera sequence started.");
}

function fitModelToStage(model: THREE.Object3D): void {
  // Blender exports may include viewport staging guides and large matte floors.
  // These are useful in Blender but would corrupt browser framing and scene composition.
  const stagingNodes: THREE.Object3D[] = [];
  model.traverse((child) => {
    if (child.name.trim().toUpperCase().startsWith("STAGE |")) {
      stagingNodes.push(child);
    }
  });
  for (const node of stagingNodes) node.parent?.remove(node);

  model.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(model);
  const size = initialBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("The selected GLB does not contain visible 3D geometry after staging helpers were removed.");
  }

  const scale = 4.2 / maxDimension;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaledBox.min.y;
  model.updateMatrixWorld(true);
}

function disposeImportedAsset(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

async function importGlb(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".glb")) {
    announce("Choose a .glb file. This runtime expects a self-contained binary glTF.", "error");
    return;
  }

  loadingLabel.textContent = `LOADING ${file.name.toUpperCase()}`;
  loadingScreen.classList.remove("is-hidden");

  try {
    const buffer = await file.arrayBuffer();
    await new Promise<void>((resolve, reject) => {
      gltfLoader.parse(
        buffer,
        "",
        (gltf) => {
          try {
            fitModelToStage(gltf.scene);
            if (importedRoot) {
              worldRoot.remove(importedRoot);
              disposeImportedAsset(importedRoot);
            }
            importedRoot = gltf.scene;
            importedRoot.name = `Imported / ${file.name}`;
            worldRoot.add(importedRoot);
            proceduralRoot.visible = false;

            if (importedMixer) importedMixer.stopAllAction();
            importedClips = gltf.animations;
            importedMixer = importedClips.length > 0 ? new THREE.AnimationMixer(importedRoot) : null;
            activeAction = null;
            animationSelect.replaceChildren();

            if (importedMixer && importedClips.length > 0) {
              importedClips.forEach((clip, index) => {
                const option = document.createElement("option");
                option.value = String(index);
                option.textContent = clip.name || `Animation ${index + 1}`;
                animationSelect.append(option);
              });
              animationPickerWrap.hidden = false;
              activeAction = importedMixer.clipAction(importedClips[0]);
              activeAction.reset().play();
            } else {
              animationPickerWrap.hidden = true;
            }

            assetLabel.textContent = file.name.toUpperCase().slice(0, 23);
            pipelineStatus.textContent = gltf.animations.length > 0
              ? `GLB + ${gltf.animations.length} ANIM`
              : "GLB LOADED";
            setStatus("ASSET IMPORTED");
            resetCamera();
            announce(
              `Loaded ${file.name}: ${gltf.scene.children.length} top-level objects, ${gltf.animations.length} animation clips.`
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        (error) => reject(error)
      );
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    announce(`GLB import failed: ${details}`, "error");
    setStatus("IMPORT FAILED");
  } finally {
    loadingScreen.classList.add("is-hidden");
    byId<HTMLInputElement>("asset-input").value = "";
  }
}

function toggleBloom(): void {
  bloomEnabled = !bloomEnabled;
  bloomPass.enabled = bloomEnabled;
  bloomLabel.textContent = bloomEnabled ? "Enabled" : "Disabled";
  bloomSwitch.classList.toggle("is-on", bloomEnabled);
}

function toggleAutoRotation(): void {
  controls.autoRotate = !controls.autoRotate;
  rotationLabel.textContent = controls.autoRotate ? "Enabled" : "Disabled";
  rotationSwitch.classList.toggle("is-on", controls.autoRotate);
}

function toggleHud(): void {
  document.querySelectorAll<HTMLElement>(".hud").forEach((element) => element.classList.toggle("hud-hidden"));
  document.body.classList.toggle("minimal-hud");
}

function toggleSound(): void {
  try {
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext;
      audioContext = new AudioContextCtor();
      audioGain = audioContext.createGain();
      audioGain.gain.value = 0;
      audioGain.connect(audioContext.destination);
      const low = audioContext.createOscillator();
      const high = audioContext.createOscillator();
      const lowGain = audioContext.createGain();
      const highGain = audioContext.createGain();
      low.type = "sine";
      low.frequency.value = 54;
      high.type = "sine";
      high.frequency.value = 81.6;
      lowGain.gain.value = 0.22;
      highGain.gain.value = 0.035;
      low.connect(lowGain).connect(audioGain);
      high.connect(highGain).connect(audioGain);
      low.start();
      high.start();
    }

    if (audioContext.state === "suspended") void audioContext.resume();
    soundEnabled = !soundEnabled;
    if (audioGain) audioGain.gain.setTargetAtTime(soundEnabled ? 0.1 : 0, audioContext.currentTime, 0.3);
    soundLabel.textContent = soundEnabled ? "SOUND ON" : "SOUND OFF";
    announce(soundEnabled ? "Ambient tone enabled." : "Ambient tone muted.");
  } catch {
    announce("Audio is not available in this browser.", "error");
  }
}

byId("cinema-play").addEventListener("click", playCinematic);
byId("load-asset").addEventListener("click", () => byId<HTMLInputElement>("asset-input").click());
byId<HTMLInputElement>("asset-input").addEventListener("change", (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (file) void importGlb(file);
});
byId("camera-reset").addEventListener("click", resetCamera);
animationSelect.addEventListener("change", () => {
  if (!importedMixer) return;
  const clipIndex = Number(animationSelect.value);
  const clip = importedClips[clipIndex];
  if (!clip) return;

  const nextAction = importedMixer.clipAction(clip);
  if (activeAction && activeAction !== nextAction) activeAction.fadeOut(0.18);
  activeAction = nextAction;
  activeAction.reset().fadeIn(0.18).play();
  announce(`Playing animation: ${clip.name || `Animation ${clipIndex + 1}`}.`);
});
byId("auto-rotate").addEventListener("click", toggleAutoRotation);
byId("bloom-toggle").addEventListener("click", toggleBloom);
byId("hud-toggle").addEventListener("click", toggleHud);
byId("sound-toggle").addEventListener("click", toggleSound);

function resize(): void {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  bloomPass.setSize(width, height);
}
window.addEventListener("resize", resize);
resize();

function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  frameCounter += 1;
  fpsTime += delta;

  if (fpsTime >= 0.6) {
    currentFps = Math.round(frameCounter / fpsTime);
    fpsLabel.textContent = `${currentFps} FPS`;
    frameCounter = 0;
    fpsTime = 0;
  }

  for (const child of proceduralRoot.children) {
    const spin = child.userData.spin as number | undefined;
    if (typeof spin === "number") child.rotation.y += spin * delta;
    const phase = child.userData.floatPhase as number | undefined;
    if (typeof phase === "number") {
      const baseY = child.userData.baseY as number;
      child.position.y = baseY + Math.sin(elapsed * 1.4 + phase) * 0.06;
    }
  }

  if (importedMixer) importedMixer.update(delta);

  cyanLight.intensity = 30 + Math.sin(elapsed * 1.8) * 5;
  amberLight.intensity = 18 + Math.sin(elapsed * 1.35 + 1.2) * 4;

  if (cinematic) {
    const raw = Math.min(1, (elapsed - cinematic.startedAt) / cinematic.duration);
    const eased = raw * raw * (3 - 2 * raw);
    const angle = eased * Math.PI * 2;
    const radius = 10.6 - 2.2 * Math.sin(eased * Math.PI);
    camera.position.set(
      Math.sin(angle) * radius,
      4.4 + Math.sin(eased * Math.PI * 2) * 1.25,
      Math.cos(angle) * radius
    );
    camera.lookAt(0, 1.65, 0);
    timelineProgress.style.width = `${eased * 100}%`;
    const total = Math.floor(raw * 8);
    timelineTime.textContent = `00:0${total} / 00:08`;

    if (raw >= 1) {
      cinematic = null;
      controls.enabled = true;
      controls.target.set(0, 1.75, 0);
      controls.update();
      timelineLabel.textContent = "CINEMATIC COMPLETE";
      timelineProgress.style.width = "100%";
    }
  } else {
    controls.update();
  }

  composer.render();
  requestAnimationFrame(animate);
}

setStatus("ENGINE READY");
loadingLabel.textContent = "PREPARING PROCEDURAL SCENE";
window.setTimeout(() => {
  loadingScreen.classList.add("is-hidden");
  announce("MVM 3D Engine ready. Load your Blender .glb asset or explore the procedural preview.");
}, 650);
requestAnimationFrame(animate);

window.addEventListener("error", (event) => {
  console.error("MVM runtime error:", event.message);
  setStatus("RUNTIME WARNING");
});
