import bpy

mesh = bpy.context.object.data
colors = mesh.color_attributes.new(name="Col", type='FLOAT_COLOR', domain='CORNER')
for i in range(len(colors.data)):
    colors.data[i].color = (1.0, 0.0, 0.0, 1.0)
uv = mesh.uv_layers.new(name="UVMap")
