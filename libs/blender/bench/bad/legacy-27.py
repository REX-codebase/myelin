import bpy

scene = bpy.context.scene
mesh = bpy.data.meshes.new("Cube")
obj = bpy.data.objects.new("Cube", mesh)
scene.objects.link(obj)
scene.objects.active = obj
obj.select = True
scene.update()
lamp = bpy.data.lamps.new("Lamp", 'POINT')
