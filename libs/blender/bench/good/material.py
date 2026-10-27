import bpy

mat = bpy.data.materials.new("Gold")
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.9, 0.7, 0.2, 1.0)
bsdf.inputs["Metallic"].default_value = 1.0
bsdf.inputs["Specular IOR Level"].default_value = 0.5
bsdf.inputs["Transmission Weight"].default_value = 0.0
bsdf.inputs["Emission Color"].default_value = (1.0, 0.4, 0.1, 1.0)
bsdf.inputs["Emission Strength"].default_value = 2.0
mat.surface_render_method = 'DITHERED'
mat.use_transparent_shadow = True
