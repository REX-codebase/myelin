import bpy

bpy.ops.import_scene.obj(filepath="/tmp/model.obj")
bpy.ops.export_scene.obj(filepath="/tmp/out.obj", use_selection=True)
bpy.ops.import_mesh.stl(filepath="/tmp/part.stl")
bpy.ops.export_mesh.ply(filepath="/tmp/part.ply")
