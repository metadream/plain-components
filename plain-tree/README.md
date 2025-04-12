# Plain Tree
A simple and practical tree component based on pure native javascript.  
Demo: https://metadream.github.io/plain-tree

## Usage 
```html
<link rel="stylesheet" href="plain-tree.css"/>
<script src="plain-tree.js"></script>
<script>
const tree = new PlainTree(container, options);
</script>
```

## Options
- `data`: Tree-structured data [{ id, text, children }]
- `contextMenu`: Context menu config [{ text, onClick }]
- `depth`: The default expansion depth of the tree
- `onRendered`: The callback event after the tree is rendered
- `onNodeClick`: The callback event when the node is clicked

## Methods
- `expand(node)`: Expand the tree (expand the node when the parameter is specified, otherwise expand the root)
- `collapse(node)`: Collapse the tree (collapse the node when the parameter is specified, otherwise collapse the root)
- `addNode(node, parentId)`: Add a new node to the tree
- `updateNode(node)`: Update a node in the tree
- `removeNode(node)`: Remove a node from the tree
