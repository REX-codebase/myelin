import bpy
import bgl
import gpu
from gpu_extras.batch import batch_for_shader

shader = gpu.shader.from_builtin('3D_UNIFORM_COLOR')
batch = batch_for_shader(shader, 'LINES', {"pos": [(0, 0, 0), (0, 0, 2)]})


def draw():
    bgl.glEnable(bgl.GL_BLEND)
    shader.bind()
    shader.uniform_float("color", (1, 0, 0, 1))
    batch.draw(shader)


bpy.types.SpaceView3D.draw_handler_add(draw, (), 'WINDOW', 'POST_VIEW')
