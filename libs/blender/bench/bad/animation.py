import bpy

obj = bpy.context.object
obj.keyframe_insert(data_path="location", frame=1)

action = obj.animation_data.action
for fcurve in action.fcurves:
    for point in fcurve.keyframe_points:
        point.interpolation = 'LINEAR'
