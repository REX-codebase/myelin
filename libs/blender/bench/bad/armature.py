import bpy

arm_obj = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT')
bone = arm_obj.data.edit_bones.new("Spine")
bone.layers[0] = True
bone.use_inherit_scale = False
