import bpy

group = bpy.data.node_groups.new("Wave", "GeometryNodeTree")
group.interface.new_socket(name="Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
group.interface.new_socket(name="Amplitude", in_out='INPUT', socket_type='NodeSocketFloat')
group.interface.new_socket(name="Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')

node = bpy.data.materials.new("M").node_tree.nodes.new("ShaderNodeMix")
print(node.inputs["A"], node.outputs["Result"])
