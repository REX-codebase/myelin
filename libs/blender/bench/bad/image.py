import bpy

img = bpy.data.images["Albedo"]
img.gl_load()
texture_id = img.bindcode
