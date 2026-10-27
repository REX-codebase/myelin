import bpy


class OBJECT_OT_scatter(bpy.types.Operator):
    bl_idname = "object.scatter"
    bl_label = "Scatter"
    bl_options = {'REGISTER', 'UNDO'}

    count: bpy.props.IntProperty(name="Count", default=10, min=1)
    spacing: bpy.props.FloatProperty(name="Spacing", default=2.0)

    def execute(self, context):
        for i in range(self.count):
            bpy.ops.mesh.primitive_cube_add(location=(i * self.spacing, 0, 0))
        return {'FINISHED'}


def register():
    bpy.utils.register_class(OBJECT_OT_scatter)
    bpy.types.Scene.scatter_seed = bpy.props.IntProperty(name="Seed", default=1)


def unregister():
    del bpy.types.Scene.scatter_seed
    bpy.utils.unregister_class(OBJECT_OT_scatter)
