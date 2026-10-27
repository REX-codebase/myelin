import bpy


class OBJECT_OT_scatter(bpy.types.Operator):
    bl_idname = "object.scatter"
    bl_label = "Scatter"

    count = bpy.props.IntProperty(name="Count", default=10)
    spacing = bpy.props.FloatProperty(name="Spacing", default=2.0)

    def execute(self, context):
        return {'FINISHED'}
