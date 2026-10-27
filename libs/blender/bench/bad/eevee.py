import bpy

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.eevee.use_bloom = True
scene.eevee.bloom_intensity = 0.1
scene.eevee.use_ssr = True
scene.eevee.use_gtao = True
scene.eevee.taa_render_samples = 64
