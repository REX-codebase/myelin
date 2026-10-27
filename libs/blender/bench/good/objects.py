import bpy

mesh = bpy.data.meshes.new("Quad")
mesh.from_pydata([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [], [(0, 1, 2, 3)])
obj = bpy.data.objects.new("Quad", mesh)
bpy.context.collection.objects.link(obj)

bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.context.view_layer.update()

bpy.ops.object.light_add(type='SUN', location=(0, 0, 5))
bpy.context.scene.cursor.location = (0, 0, 0)

for other in bpy.context.scene.objects:
    print(other.name, other.type)
