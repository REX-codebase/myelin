import bpy

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == 'VIEW_3D')
region = next(r for r in area.regions if r.type == 'WINDOW')

with bpy.context.temp_override(window=window, area=area, region=region):
    bpy.ops.view3d.view_selected()
