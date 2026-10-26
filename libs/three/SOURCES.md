# three.js ledger: sources

- **Version researched:** r186 (npm `three@0.186.1`, `latest` dist-tag; r186.0 published 2026-09-08, r186.1 2026-09-24). No r187 release exists as of 2026-10-26: the migration guide already has a "186 → 187" section, but that is the dev branch. Those changes are deliberately not banned (see P8).
- **Researched:** 2026-10-26
- **Main sources:**
  - Migration guide: https://github.com/mrdoob/three.js/wiki/Migration-Guide (raw: https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md)
  - Release notes r170–r186: https://github.com/mrdoob/three.js/releases
  - WebGPURenderer manual: https://threejs.org/manual/#en/webgpurenderer (page: https://threejs.org/manual/pages/webgpurenderer.html)
  - WebGPU post-processing manual: https://threejs.org/manual/#en/webgpu-postprocessing (page: https://threejs.org/manual/pages/webgpu-postprocessing.html)
  - LLM docs: https://threejs.org/llms.txt → https://threejs.org/docs/llms.txt and https://threejs.org/docs/llms-full.txt (the TSL guide, including the "Old: onBeforeCompile / New: TSL" example and the RenderPipeline effect list)
  - API docs: https://threejs.org/docs/pages/<Class>.html
  - r186 source, tag `r186`: https://github.com/mrdoob/three.js/tree/r186 (used to confirm what is exported, deprecated or gone)
  - npm: https://registry.npmjs.org/three

## Bans

| ID | What changed | Source |
|---|---|---|
| B1 | `PostProcessing` was renamed `RenderPipeline` in r183. The old class is now a subclass that warns "has been renamed to RenderPipeline" (`// @deprecated, r183`). | Migration Guide 182→183: "`PostProcessing` has been renamed to `RenderPipeline`." PR https://github.com/mrdoob/three.js/pull/32789 ; https://threejs.org/docs/pages/PostProcessing.html ("Deprecated: since r183. Use RenderPipeline instead.") |
| B2 | EffectComposer and its passes work only with WebGLRenderer. WebGPURenderer uses RenderPipeline plus TSL effect nodes. | https://threejs.org/docs/pages/EffectComposer.html ("This module can only be used with WebGLRenderer."); WebGPURenderer manual: "`EffectComposer` with its effect passes are not supported"; WebGPU post-processing manual: "The instance of `RenderPipeline` replaces the previous instance of `EffectComposer`." |
| B3 | ShaderMaterial and RawShaderMaterial work only with WebGLRenderer. WebGPURenderer's node library has no mapping for them, so NodeBuilder logs 'Material "ShaderMaterial" is not compatible.' | https://threejs.org/docs/pages/ShaderMaterial.html ("ShaderMaterial can only be used with WebGLRenderer."); WebGPURenderer manual, Migration section; r186 `src/renderers/webgpu/nodes/StandardNodeLibrary.js`, `src/nodes/core/NodeBuilder.js` |
| B4 | `onBeforeCompile()` is not supported in WebGPURenderer. Use TSL node inputs instead. | WebGPURenderer manual: "modifications of built-in materials via `onBeforeCompile()` are not supported in `WebGPURenderer`. This part of your application must be ported to node materials and TSL."; https://threejs.org/docs/llms-full.txt "Why TSL?" Old/New example |
| B5 | `Clock` is deprecated since r183 (its constructor warns). Use `Timer`, which has been in core since r179. | Migration Guide 182→183: "`Clock` has been deprecated. Please use `Timer` instead."; 178→179: "The `Timer` module has been moved into the core"; PR https://github.com/mrdoob/three.js/pull/32798 ; https://threejs.org/docs/pages/Clock.html ("Deprecated: since r183") |
| B6 | `PCFSoftShadowMap` was removed in r186. Both renderers warn "PCFSoftShadowMap has been removed. Using PCFShadowMap instead." The constant is `@deprecated since r186`. | Migration Guide 185→186: "`PCFSoftShadowMap` with `WebGPURenderer` has been removed … Use `PCFShadowMap` which is now soft as well."; 181→182 (deprecated for WebGLRenderer); PR https://github.com/mrdoob/three.js/pull/33987 ; r186 `src/constants.js`, `src/renderers/webgl/WebGLShadowMap.js` |
| B7 | `outputEncoding`/`texture.encoding`/`sRGBEncoding`/`LinearEncoding` were replaced by `outputColorSpace`/`colorSpace`/`SRGBColorSpace`/`LinearSRGBColorSpace` in r152 and are gone from source in r162 (checked r161 vs r162 tags). `ColorManagement.legacyMode` became `enabled` in r150. | Migration Guide 151→152 and 149→150; https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791 (linked from the guide) |
| B8 | `physicallyCorrectLights` was renamed `useLegacyLights=false` in r150, and `useLegacyLights` was deprecated in r155. The aliases were removed: `physicallyCorrectLights` in r160 and `useLegacyLights` in r165. | Migration Guide 149→150, 154→155; r165 release notes "Remove deprecated `useLegacyLights`. #28482"; WebGLRenderer.js at r158/r160/r165 tags |
| B9 | The `*BufferGeometry` generator aliases were deprecated in r145 and removed from `Three.Legacy.js` in r154. | Migration Guide 144→145: "Use e.g. `BoxGeometry` instead of `BoxBufferGeometry`."; r154 release notes "Remove deprecated code. #26175"; `src/Three.Legacy.js` at r153 vs r154 |
| B10 | `Geometry`/`Face3` left core in r125 and the deprecated class was deleted in r141. `THREE.Math` was renamed `MathUtils` in r113. | Migration Guide r124→r125, 140→141 ("The deprecated `Geometry` class has been removed."), r112→r113 |
| B11 | `examples/js` was removed in r148. `build/three.js` and `build/three.min.js` were removed in r161. In r186 the shipped `*.min.js` builds were deleted: jsDelivr still minifies on the fly, but unpkg/cdnjs `.min.js` links 404. | Migration Guide 147→148, r160→r161; PR https://github.com/mrdoob/three.js/pull/33893 ; docs/llms.txt §1 "Use Import Maps (Not Old CDN Patterns)" |
| B12 | The documented addon path is `three/addons/` (package.json export `./addons/*` → `./examples/jsm/*`). Note: `three/examples/jsm/*` still resolves, so this is a consistency ban, not a removal. | https://threejs.org/docs/llms.txt (import map + `three/addons/controls/OrbitControls.js`); r186 `package.json` `exports` |
| B13 | WebGPU imports changed in r167 and again in r171: use `three/webgpu` and `three/tsl`. `three/nodes`, `examples/jsm/nodes` and `examples/jsm/renderers/webgpu/WebGPURenderer.js` no longer exist (r186 package exports have no `./nodes`, and `examples/jsm/renderers` holds only CSS2D/CSS3D/SVG/Projector). | Migration Guide 170→171 ("Use `three/webgpu` … Use `three/tsl`"), 166→r167 (PR https://github.com/mrdoob/three.js/pull/28650); r186 `package.json` |
| B14 | Ledger scope: the WebGPU path. WebGPURenderer falls back to WebGL 2 automatically. **WebGLRenderer is not removed.** The manual says it "is still maintained and the recommended choice for pure WebGL 2 applications", and docs/llms.txt still lists it as the mature default. This ban encodes the ledger's target and is stated in `about`/`status`. | WebGPURenderer manual ("State of WebGLRenderer"); https://threejs.org/docs/pages/WebGPURenderer.html ; https://threejs.org/docs/llms.txt §2 |
| B15 | TSL renames: `tslFn`→`Fn` (r168, PR #29064). `timerLocal`/`timerGlobal`/`timerDelta`→`time`/`deltaTime` (r170, PR #29557). `directionToColor`→`packNormalToRGB` and `colorToDirection`→`unpackRGBToNormal` (r185; the old names warn). `tslFn`/`timer*` are not exported from r186 `three/tsl` at all. | https://github.com/mrdoob/three.js/pull/29064 ; https://github.com/mrdoob/three.js/pull/29557 ; Migration Guide 184→185; r186 `src/Three.TSL.js`, `src/nodes/utils/Packing.js` |
| B16 | `renderAsync()`, `clearAsync()`, `hasFeatureAsync()`, `initTextureAsync()` and similar were deprecated in r181. Initialise with `setAnimationLoop()` or `await renderer.init()`, then use the sync methods. (`computeAsync()` is not deprecated in r186, so it is not banned.) | Migration Guide 180→181; r186 `src/renderers/common/Renderer.js` (`// @deprecated r181` warnings) |
| B17 | The WebGPURenderer option `colorBufferType` was renamed `outputBufferType` in r182, and `getColorBufferType()` became `getOutputBufferType()`. The r186 constructor no longer reads `colorBufferType`. | Migration Guide 181→182; r186 `Renderer.js` |
| B18 | `RGBELoader` was renamed `HDRLoader` in r180. The old file is a subclass that warns "deprecated". | Migration Guide 179→180; r186 `examples/jsm/loaders/RGBELoader.js` (`// @deprecated, r180`); https://threejs.org/docs/pages/HDRLoader.html |
| B19 | `WebGLCubeRenderTarget` can't be used with WebGPURenderer since r183. Use `CubeRenderTarget` (exported from `three/webgpu`). | Migration Guide 182→183 (PR #32871) |
| B20 | `TRAAPassNode`/`traaPass(scene, camera)` became `TRAANode`/`traa(color, depth, velocity, camera)` in r179, and the setup changed (MRT velocity). | Migration Guide 178→179; r178 `TRAAPassNode.js` vs r186 `TRAANode.js`; https://threejs.org/docs/pages/TRAANode.html |
| B21 | GTAONode `distanceExponent`/`distanceFallOff` are deprecated in r186 and have no effect (new distance model). | Migration Guide 185→186 (PR #33895); https://threejs.org/docs/pages/GTAONode.html ("Deprecated: since r186") |

## Preferences

| ID | Source |
|---|---|
| P1 | WebGPURenderer maps classic materials to node materials (`StandardNodeLibrary.addMaterial(MeshStandardNodeMaterial, 'MeshStandardMaterial')`). Official WebGPU examples still use `MeshStandardMaterial`. Node slots live on `*NodeMaterial` (docs/llms.txt §4). |
| P2 | WebGPU post-processing manual: "- renderer.render( scene, camera ); + renderPipeline.render();"; https://threejs.org/docs/pages/RenderPipeline.html (`needsUpdate`). |
| P3 | WebGPU post-processing manual, "Tone Mapping and Color Spaces"; docs/llms-full.txt "Output Color Transform". |
| P4 | Migration Guide 182→183 (SSR additive blend), 180→181 (GTAO in `.r`); official `webgpu_postprocessing_ssr` / `webgpu_postprocessing_ao` examples at r186 (`builtinAOContext`). |
| P5 | Migration Guide 182→183: "It might be necessary to remove or decrease shadow bias values"; r183 release notes "Remove obsolete shadow bias from WebGPU demos. #32715". |
| P6 | Migration Guide 184→185 (`positionLocal` vs `positionGeometry`). |
| P7 | Migration Guide 168→169 (`TransformControls.getHelper()`). |
| P8 | Migration Guide "186 → 187" section (unreleased; npm latest is 0.186.1). |

## Bench / snippet provenance

- `good/basic-scene.html`: from the "Basic Scene with WebGPURenderer and TSL" example in https://threejs.org/docs/llms-full.txt (import map pinned to 0.186.1, `three/webgpu` import).
- `good/bloom.js`, `good/traa.js`, `good/ao.js`, `good/ssr.js`: trimmed from the official r186 examples `webgpu_postprocessing_bloom|traa|ao|ssr.html` (https://github.com/mrdoob/three.js/tree/r186/examples). The Inspector UI was removed.
- `good/tsl-material.js`: TSL guide detail-map example plus `Fn`/`time`.
- `good/shadows-env.js`: based on `webgpu_shadowmap.html` (Timer, `shadow.radius`, no bias) plus HDRLoader.
- Snippets follow the same sources. They pass the ledger's own bans but have **not** been executed on a GPU.

## Checked and left out

- `blendColor()` for SSR: still exported in r186, so only the usage changed. Kept as preference P4, not a ban.
- `PI2` → `TWO_PI` (r181): `PI2` is a common user-side constant name, so a ban would false-positive.
- TSL `varying()` → `toVarying()` (r173): `varying` is still exported from r186 `three/tsl`, so it was not banned.
- `TextureNode.uv()` → `.sample()` (r172): no reliable regex.
- `computeAsync()`: not deprecated in r186.
- Classic `Mesh*Material` under WebGPURenderer: supported (auto-mapped), so it is not banned.
- `require('three')`: the CJS build was deprecated in r186 (PR #33891) but still works through a shim, and the pattern is rare in browser code. Left out to keep the list tight.
- From the skill playbook, not verified/needed here: VXGI/`vxgi()`, `SunLight` CSM, `MeshSSSNodeMaterial`, SPZ/3DGS loaders. No rules depend on them.
