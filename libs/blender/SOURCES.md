# Sources: blender ledger

Researched 2026-10-27. Current stable: **Blender 5.2.3** (PyPI `bpy` 5.2.3, `Requires-Python ==3.13.*`; the v5.2.3 tag's `BKE_blender_version.h` says `BLENDER_VERSION 502`, `BLENDER_VERSION_PATCH 3`, cycle `release`, and `build_files/build_environment/cmake/versions.cmake` sets `PYTHON_VERSION 3.13.13`). `main` on the GitHub mirror is 5.4 alpha and was not targeted.

**Access limits.** `docs.blender.org` (the API reference and its change log), `developer.blender.org` (release notes) and `projects.blender.org` were denied by the sandbox proxy, so no release-note page was read. Every rule rests on one of:

- **API stubs diffed across versions.** `fake-bpy-module` publishes stubs generated from each Blender release (`fake-bpy-module-2.93`, `-3.6`, `-4.0`, `-4.1`, `-4.2`, `-4.5`, `-5.0`, `-5.2` on PyPI, built 2026-07-30). I parsed every `.pyi` with `ast`, built a set of `module:Class.member` names per version, and read the columns below as `X` = present, `.` = absent. Docstrings in the 5.2 stubs carry Blender's own deprecation text.
- **Blender sources at tags `v3.6.0`, `v4.0.0`, `v4.1.0`, `v5.0.0`, `v5.2.3`** from the GitHub mirror (raw files): `source/blender/nodes/shader/nodes/node_shader_bsdf_principled.cc`, `source/blender/python/gpu/gpu_py_shader.cc`, `source/blender/python/intern/bpy_rna.cc`, `scripts/modules/bpy_extras/anim_utils.py`.

Version columns in the Evidence cells: `2.93 3.6 4.0 4.1 4.2 4.5 5.0 5.2`.

## Rules

| ID | Evidence | What changed |
|---|---|---|
| B1 | The `bgl-stubs` package is present in every stub set up to 4.5 and absent in 5.0 and 5.2. | `bgl` removed in 5.0. |
| B2 | `Mesh.use_auto_smooth` and `Mesh.auto_smooth_angle`: `X X X . . . . .`. `bpy.ops.object.shade_smooth_by_angle` (`angle`, `keep_sharp_edges`): `. . . X X X X X`; `bpy.ops.object.shade_auto_smooth` (`use_auto_smooth`, `angle`): `. . . . X X X X`. `shade_smooth` takes only `keep_sharp_edges`. | Removed in 4.1. |
| B3 | `Mesh.calc_normals`: `X X . . . . . .`; `calc_normals_split` and `free_normals_split`: `X X X . . . . .`. `Mesh.corner_normals`, `vertex_normals`, `polygon_normals`: `. X X X X X X X`. | Removed in 4.0 / 4.1. |
| B4 | The default of `RenderSettings.engine` in the stubs is `'BLENDER_EEVEE'` in 4.1, `'BLENDER_EEVEE_NEXT'` in 4.2, `'BLENDER_EEVEE'` in 5.0 and 5.2; `BLENDER_EEVEE_NEXT` occurs in 4.2 and 4.5 only. | EEVEE Next id used in 4.2 to 4.5, reverted in 5.0. |
| B5 | `SceneEEVEE.use_ssr`, `use_ssr_refraction`, `ssr_*`, `use_bloom`, `bloom_*`, `use_soft_shadows`, `shadow_cube_size`, `shadow_cascade_size`, `gtao_factor`: `X X X X X . . .`. `use_gtao`, `gtao_distance`, `gtao_quality`: `X X X X X X . .`. `use_motion_blur`: `X X X X . . . .` (`RenderSettings.use_motion_blur` is `X` throughout). `use_raytracing` and `ray_tracing_options`: `. . . X X X X X`. | Legacy EEVEE settings removed in 4.5 / 5.0 (one gone in 4.2). |
| B6 | `Material.shadow_method`: `X X X X X . . .`. `Material.use_transparent_shadow`: `. . . X X X X X`. `surface_render_method`: `. . . X X X X X`. | Removed in 4.5. |
| B7 | `Action.fcurves`, `Action.groups`, `Action.id_root`: `X X X X X X . .`. `Action.layers`, `Action.slots`, `ActionChannelbag.fcurves`, `ActionKeyframeStrip.channelbag`: `. . . . . X X X`. `bpy_extras.anim_utils.animdata_get_channelbag_for_assigned_slot(anim_data)` and `action_ensure_channelbag_for_slot(action, slot)` exist in `scripts/modules/bpy_extras/anim_utils.py` at v5.2.3. | Removed in 5.0 (slotted actions). |
| B8 | `Scene.node_tree`: `X X X X X X . .`. `Scene.compositing_node_group`: `. . . . . . X X`. The 5.2 docstring of `Scene.use_nodes`: "Unused but kept for compatibility reasons. Setting the property has no effect, and getting it always returns True. Use #scene.render.use_compositing ...". | Compositor tree moved in 5.0. |
| B9 | The 5.2 docstrings of `Material.use_nodes` and `World.use_nodes`: "Unused but kept for compatibility reasons. Setting the property has no effect, and getting it always returns True ... removal planned in version 6.0"; the same for `Light.use_nodes` and `Scene.use_nodes`. `Texture.use_nodes` ("Make this a node-based texture") is still live, so the rule only matches names containing mat, material, world, light or scene. | `use_nodes = True` is a no-op in 5.x. |
| B10 | `node_shader_bsdf_principled.cc` at v5.2.3 declares the inputs: Base Color, Metallic, Roughness, IOR, Alpha, Thin Wall, Normal, Weight, Diffuse Roughness, Subsurface Weight / Radius / Scale / IOR / Anisotropy, Specular IOR Level, Specular Tint, Anisotropic, Anisotropic Rotation, Tangent, Transmission Weight, Coat Weight / Roughness / IOR / Tint / Normal, Sheen Weight / Roughness / Tint, Emission Color, Emission Strength, Thin Film Thickness / IOR. There is no `Subsurface`, `Specular`, `Transmission`, `Emission`, `Sheen`, `Clearcoat*` or `Transmission Roughness`. | Principled BSDF v2 (4.0) socket names. |
| B11 | `NodeTree.inputs` and `NodeTree.outputs`: `X X . . . . . .`. `NodeTree.interface` and `NodeTreeInterface.new_socket(name, *, description, in_out, socket_type, parent)`: `. . X X X X X X`. | Removed in 4.0. |
| B12 | Every operator in the 3.6 stubs has `override_context: bpy.types.Context \| dict[str, typing.Any]`; in 4.0 and later none does. `Context.temp_override`: `. X X X X X X X`. | Operator context dict removed in 4.0. |
| B13 | `bpy.ops.import_scene.obj` / `export_scene.obj` and `import_mesh.ply` / `export_mesh.ply`: `X X . . . . . .`. `import_mesh.stl` / `export_mesh.stl`: `X X X X . . . .`. `bpy.ops.wm.obj_import` / `obj_export` / `ply_import` / `ply_export` / `stl_import` (`. X X X X X X X`), `stl_export` (`. . . X X X X X`). | Python IO operators replaced by the C++ ones. |
| B14 | `bpy.ops.wm.collada_import` and `collada_export`: `X X X X X X . .`. | Collada operators not in the 5.x API. |
| B15 | `source/blender/python/gpu/gpu_py_shader.c` at v3.6.0 line 793: "Deprecated enums that start with "3D_" or "2D_"."; `gpu_py_shader.cc` at v4.0.0 and v4.1.0 has no `"2D_` / `"3D_` names, and the 5.2 stub lists `FLAT_COLOR IMAGE IMAGE_COLOR SMOOTH_COLOR UNIFORM_COLOR POLYLINE_* POINT_*` (plus two `*_SCENE_LINEAR_TO_REC709_SRGB` image variants). | Prefixed built-in shader names removed in 4.0. |
| B16 | `Image.bindcode`: `X X X X X X . .`. `gpu.texture.from_image`: present throughout. | Removed in 5.0. |
| B17 | `Armature.layers`, `Bone.layers`, `EditBone.layers`, `Bone.use_inherit_scale`, `EditBone.use_inherit_scale`: `X X . . . . . .`. `Armature.collections`, `Bone.collections`, `BoneCollection.assign`: `. . X X X X X X`. `Bone.inherit_scale` is the enum `'FULL' 'FIX_SHEAR' 'ALIGNED' 'AVERAGE' 'NONE' 'NONE_LEGACY'`. `Object.layers` and `Scene.layers` are absent from every set (removed in 2.80). | Layers replaced by collections (2.8) and bone collections (4.0). |
| B18 | The 5.2 docstring of `Mesh.vertex_colors`: "Legacy vertex color layers. Deprecated, use color attributes instead." `Mesh.color_attributes`: `. X X X X X X X`. `Mesh.uv_textures`, `Mesh.tessfaces`, `tessface_uv_textures` are absent from the 2.93 set (removed in 2.80); `Mesh.uv_layers` is present throughout. | Deprecated / removed mesh layer APIs. |
| B19 | Absent from the 2.93 stubs: `Scene.update`, `Scene.cursor_location`, `Context.user_preferences`, `BlendData.groups`, `BlendData.lamps`, `Object.select`, `bpy.ops.object.lamp_add`, `SceneObjects.link`, `SceneObjects.unlink` and `SceneObjects.active` (the class has no such members). Present: `CollectionObjects.link`, `LayerObjects.active`, `Scene.cursor`, `Context.preferences`, `BlendData.collections`, `BlendData.lights`, `Object.select_get`, `bpy.ops.object.light_add`. | The Blender 2.7x API, removed in 2.80. The `.select =` match is limited to `obj`, `obj*`, `ob` and `object` names because `bmesh` elements keep a live `select` property. |
| B20 | `bpy_rna.cc` at v5.2.3 registers class properties from `__annotations__` (`pyrna_deferred_register_props` iterates the class dict's `__annotations__`, and `typing.get_type_hints` supplies them for postponed annotations); an assignment in a class body is not read. | Properties must be annotations. The rule only applies to files that define an Operator, PropertyGroup, Panel, Menu, Header or AddonPreferences subclass. |

Facts: versions from PyPI (`bpy`, `fake-bpy-module-*`) and the v5.2.3 tag; the engine ids from B4; the animation and node-group idioms from B7 and B11.

Snippets: adapted from the stubs and `anim_utils.py` above. They were **not run in Blender**. In particular, the `$material` snippet relies on a new material already having a Principled BSDF node, which follows from `use_nodes` always reading True in 5.x but was not executed.

## Scope notes

- Run this ledger on Python only (`--ext py`). Python `#` comments are not skipped, so a comment that names a banned API will fire.
- Every rule is guarded with `when /\bbpy\b/` (or matches a bpy-only token), so it stays quiet in Python that never imports Blender.
- A project that still targets Blender 4.2 LTS or earlier should not use it: B4 is correct for 4.2 to 4.5 and B2, B5 and B6 describe versions it still has. The ledger targets 5.2.
- `bpy.context.copy()` outside an operator call (B12's second alternative) is flagged only when assigned to a variable named `override`.

## Left out (unsure or not regex-safe)

- `Matrix * Vector` (removed in 2.8 for `@`): `*` is ambiguous with scalar multiplication.
- Python-side add-on packaging (`bl_info` vs `blender_manifest.toml` extensions): no stub or source file read in this session shows it, and legacy add-ons still load.
- `Material.blend_method` and `show_transparent_back`: still present in 5.2 and not marked deprecated in the stubs.
- Geometry Nodes Python API details (socket identifiers, `bpy.types.GeometryNode*` constructors) and Grease Pencil v3 (`bpy.types.GreasePencilv3`): changed in 4.3 to 5.0 but need runtime checks the stubs cannot give.
- Compositor node names and sockets in 5.x (for example Glare, Denoise): not verified in this session.
