import bpy

node_tree = bpy.data.node_groups.new("Wave", "GeometryNodeTree")
node_tree.inputs.new("NodeSocketGeometry", "Geometry")
node_tree.inputs.new("NodeSocketFloat", "Amplitude")
node_tree.outputs.new("NodeSocketGeometry", "Geometry")
