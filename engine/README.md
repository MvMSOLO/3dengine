# MVM 3D Engine — TypeScript + Three.js

This is a separate browser runtime for the `MvMSOLO/3dengine` repository. The original root `index.html` cutscene remains unchanged.

## Requirements

- Node.js 20.19+ (Node.js 22 LTS recommended)
- npm
- A browser with WebGL support

## Start locally

From a terminal, run:

```bash
cd engine
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## What is implemented

- TypeScript app powered by Three.js and Vite
- Cinematic dark UI and a procedural MVM CORE stand-in, so the runtime works before a Blender asset is ready
- PBR materials, key/rim lighting, fog, a technical floor grid, ambient particle field and bloom post-processing
- Orbit controls, automatic rotation, camera reset and an eight-second camera pass
- Local `.glb` upload through Three.js `GLTFLoader`
- Automatic asset framing and GLTF animation playback
- Optional, user-activated low-volume ambient tone
- Responsive controls for desktop and mobile

## Import a Blender model

1. In Blender, select the finished asset and export as **glTF Binary (.glb)**.
2. Include mesh geometry, materials and any intended animations. A single-file `.glb` is easiest to test.
3. Open the runtime and press **Load Blender asset**.
4. Choose the exported `.glb`. The current scene preview is replaced by the imported model.

The current runtime supports self-contained binary `.glb` files. A `.gltf` file that relies on external texture or buffer files is intentionally not accepted by the upload control yet.

## Build

```bash
npm run build
npm run preview
```

Build verification must be run in an environment with npm registry access. A successful GitHub file commit does not itself prove that the app builds or renders correctly.

## Current status

**Stage 2 — initial runtime scaffold.** The original HTML is preserved. This is not yet a final cutscene engine: the real Blender GLB, character rig/animations, environment assets, audio design and browser/performance tests are still to be integrated.
