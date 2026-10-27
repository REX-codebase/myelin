import bpy

mat = bpy.data.materials["Glass"]
mat.blend_method = 'BLEND'
mat.shadow_method = 'HASHED'
