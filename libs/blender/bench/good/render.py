import bpy

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.use_motion_blur = True
scene.eevee.taa_render_samples = 64
scene.eevee.use_raytracing = True
scene.render.filepath = "/tmp/frame.png"
bpy.ops.render.render(write_still=True)
