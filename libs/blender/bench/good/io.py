import bpy

bpy.ops.wm.obj_import(filepath="/tmp/model.obj")
bpy.ops.wm.obj_export(filepath="/tmp/out.obj", export_selected_objects=True)
bpy.ops.wm.stl_import(filepath="/tmp/part.stl")
bpy.ops.wm.ply_export(filepath="/tmp/part.ply")
bpy.ops.export_scene.gltf(filepath="/tmp/scene.glb")
bpy.ops.import_scene.fbx(filepath="/tmp/rig.fbx")
