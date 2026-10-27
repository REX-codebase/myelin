import bpy

scene = bpy.context.scene
scene.use_nodes = True
tree = scene.node_tree
glare = tree.nodes.new("CompositorNodeGlare")
