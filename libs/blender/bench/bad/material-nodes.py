import bpy

mat = bpy.data.materials.new("Glow")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Specular"].default_value = 0.5
bsdf.inputs["Emission"].default_value = (1.0, 0.4, 0.1, 1.0)
bsdf.inputs["Transmission"].default_value = 0.0
