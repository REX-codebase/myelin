import math

import bpy

obj = bpy.context.object
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
corner_normals = [tuple(n.vector) for n in obj.data.corner_normals]
