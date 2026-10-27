import bpy

mesh = bpy.context.object.data
colors = mesh.vertex_colors.new(name="Col")
for item in colors.data:
    item.color = (1.0, 0.0, 0.0, 1.0)
