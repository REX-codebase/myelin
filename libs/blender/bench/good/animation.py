import bpy
from bpy_extras import anim_utils

obj = bpy.context.object
obj.keyframe_insert(data_path="location", frame=1)

channelbag = anim_utils.animdata_get_channelbag_for_assigned_slot(obj.animation_data)
for fcurve in channelbag.fcurves:
    for point in fcurve.keyframe_points:
        point.interpolation = 'LINEAR'
