import bpy

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == 'VIEW_3D')

override = bpy.context.copy()
override["window"] = window
override["area"] = area
bpy.ops.view3d.view_selected(override)
