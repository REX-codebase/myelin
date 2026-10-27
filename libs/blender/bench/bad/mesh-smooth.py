import bpy

obj = bpy.context.active_object
mesh = obj.data

mesh.use_auto_smooth = True
mesh.auto_smooth_angle = 0.5236
mesh.calc_normals_split()

for poly in mesh.polygons:
    poly.use_smooth = True
