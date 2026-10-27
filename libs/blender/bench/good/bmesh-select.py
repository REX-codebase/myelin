import bmesh
import bpy

obj = bpy.context.edit_object
bm = bmesh.from_edit_mesh(obj.data)
for v in bm.verts:
    v.select = v.co.z > 0.0
for f in bm.faces:
    f.select = False
bmesh.update_edit_mesh(obj.data)

armature = bpy.context.object.data
bone_collection = armature.collections.new("Deform")
for bone in armature.bones:
    bone_collection.assign(bone)
    bone.inherit_scale = 'NONE'
