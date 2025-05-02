/**
 * Plain tree structure components
 *
 * @Usage new PlainTree(container, options)
 * @Options
 * - data: Tree-structured data [{ id, text, children }]
 * - contextMenu: Context menu config [{ text, onClick }]
 * - depth: The default expansion depth of the tree
 * - onRendered: The callback event after the tree is rendered
 * - onNodeClick: The callback event when the node is clicked
 * @Methods
 * - expand(node): Expand the tree (expand the node when the parameter is specified, otherwise expand the root)
 * - collapse(node): Collapse the tree (collapse the node when the parameter is specified, otherwise collapse the root)
 * - addNode(node, parentId): Add a new node to the tree
 * - updateNode(node): Update a node in the tree
 * - removeNode(node): Remove a node from the tree
 *
 * @Author Marco
 * @Date 2025-02-25
 * @Version 0.0.1
 */
class PlainTree {

    #container;             // The container of the tree
    #selectedNode;          // The selected node data
    #selectedElement;       // The selected node element
    #nodeData = {};         // Node data mapping { id: data }
    #nodeElements = {};     // Node element mapping { id: element }
    #options = {
        data: [],           // Tree-structured data [{ id, text, children }]
        contextMenu: [],    // Context menu config [{ text, onClick }]
        depth: 0,           // The default expansion depth of the tree
        onRendered: null,   // The callback event after the tree is rendered
        onNodeClick: null   // The callback event when the node is clicked
    }

    constructor(container, options) {
        this.#container = document.querySelector(container);
        this.#options = Object.assign(this.#options, options);
        this.#createContextMenu();
        this.#render();
    }

    /** Expand the tree (expand the node when the parameter is specified, otherwise expand the root) */
    expand(node) {
        node = node || this.#options.data;
        if (node instanceof Array) {
            node.forEach(n => this.expand(n));
            return;
        }
        // If the node is in a collapsed state, expand it
        const $node = this.#nodeElements[node.id];
        if ($node.classList.contains('plaintree-collapsed')) {
            const switcher = $node.querySelector('.plaintree-switcher');
            switcher && switcher.click();
        }
        // If there are child nodes, recursively expand them but do not exceed the specified depth
        node.children && node.children.forEach(child => {
            if (child.depth < this.#options.depth) {
                this.expand(child);
            }
        });
    }

    /** Collapse the tree (collapse the node when the parameter is specified, otherwise collapse the root)*/
    collapse(node) {
        node = node || this.#options.data;
        if (node instanceof Array) {
            node.forEach(n => this.collapse(n));
            return;
        }
        // If the node is in a expanded state, collapse it
        const $node = this.#nodeElements[node.id];
        if (!$node.classList.contains('plaintree-collapsed')) {
            const switcher = $node.querySelector('.plaintree-switcher');
            switcher && switcher.click();
        }
        // Recursive collapse the child nodes
        node.children && node.children.forEach(child => {
            this.collapse(child);
        });
    }

    /** Add a new node to the tree */
    addNode(node, parentId) {
        const parent = this.#nodeData[parentId];
        if (!parent) throw new Error('Node parent not found: ' + parent);
        if (!parent.children) parent.children = [];
        parent.children.push(node);

        const $parent = this.#nodeElements[parentId];
        if (parent.children.length > 1) {
            // If a child node already exists, add the new node to the subtree container
            const $group = $parent.querySelector('.plaintree-group');
            const $node = this.#createNodeElement(node);
            $group.append($node);
            // Cache new node data and elements
            node.depth = parent.depth + 1;
            this.#nodeElements[node.id] = $node;
            this.#nodeData[node.id] = node;
            // Expand the parent node after added
            this.expand(parent);
        } else {
            // If there is no child node, create the subtree container first and then add it
            const $subtree = this.#buildTree([node], parent.depth + 1);
            $parent.append($subtree);
            // Change the original leaf icon of the parent node to a switcher icon
            const icon = $parent.firstChild;
            icon.classList.remove('plaintree-leaf');
            icon.classList.add('plaintree-switcher');
        }
    }

    /** Update a node in the tree */
    updateNode(node) {
        const $node = this.#nodeElements[node.id];
        if (!$node) throw new Error('Node not found: ' + node);
        this.#nodeData[node.id] = node; // Update node data
        $node.querySelector('.plaintree-label').textContent = node.text;
    }

    /** Remove a node from the tree */
    removeNode(node) {
        const $node = this.#nodeElements[node.id];
        if (!$node) throw new Error('Node not found: ' + node);

        const $parentNode = $node.parentNode.parentNode;    // li.parentNode > ul.group > li.node
        const parentData = this.#nodeData[$parentNode.nodeId];
        $node.remove();

        // Remove from the children of the parent node
        parentData.children.splice(parentData.children.findIndex(n => n.id === node.id), 1);
        delete this.#nodeData[node.id];     // Removed from the node data mapping
        delete this.#nodeElements[node.id]; // Removed from the node element mapping

        // If the parent node has no children, change the icon to a leaf icon
        if (!parentData.children || !parentData.children.length) {
            $parentNode.firstChild.classList.remove('plaintree-switcher');
            $parentNode.firstChild.classList.add('plaintree-leaf');
        }
    }

    /** Render the tree structure */
    #render() {
        const $root = this.#createRootElement();
        this.#bindEvents($root);
        $root.append(this.#buildTree(this.#options.data, 0));
        this.#container.append($root);
        // Callback after the tree is rendered
        if (this.#options.onRendered) {
            this.#options.onRendered.call(this, this, this.#options.data);
        }
    }

    /** Build a tree based on the data */
    #buildTree(data, depth) {
        const $group = this.#createGroupElement();
        data.forEach(node => {
            // Cache node data and elements
            node.depth = depth;
            const $node = this.#createNodeElement(node, depth === this.#options.depth);
            this.#nodeElements[node.id] = $node;
            this.#nodeData[node.id] = node;

            // Recursive build subtrees
            if (node.children && node.children.length) {
                const $subtree = this.#buildTree(node.children, depth + 1);
                $node.append($subtree);
            }
            $group.append($node);
        });
        return $group;
    }

    #bindEvents($root) {
        $root.addEventListener('click', e => {
            const { target } = e;
            if (target.nodeName === 'SPAN' &&
                target.classList.contains('plaintree-switcher')) {
                this.#onSwitcherClick(target.parentNode);
            } else if (
                target.nodeName === 'SPAN' &&
                target.classList.contains('plaintree-label')) {
                this.#onNodeClick(target.parentNode.nodeId);
            } else if (
                target.nodeName === 'LI' &&
                target.classList.contains('plaintree-node')) {
                this.#onNodeClick(target.nodeId);
            }
        });
        if (this.$contextMenu) {
            $root.addEventListener('contextmenu', e => {
                e.preventDefault();
                const { target } = e;
                if (target.nodeName === 'SPAN' &&
                    target.classList.contains('plaintree-label')) {

                    this.#selectNode(target.parentNode.nodeId);
                    this.$contextMenu.style.left = `${e.pageX}px`;
                    this.$contextMenu.style.top = `${e.pageY}px`;
                    this.$contextMenu.style.display = 'block';
                }
            });
            // Click the blank area to hide the context menu
            document.addEventListener('click', () => {
                this.$contextMenu.style.display = 'none';
            });
        }
    }

    #onNodeClick(id) {
        this.#selectNode(id);
        if (this.#options.onNodeClick) {
            this.#options.onNodeClick.call(this, this.#nodeData[id]);
        }
    }

    #onSwitcherClick($node) {
        const el = $node.lastChild;
        const height = el.scrollHeight;

        if ($node.classList.contains('plaintree-collapsed')) {
            this.#animate(150, {
                enter() {
                    el.style.height = 0;
                    el.style.opacity = 0;
                },
                active() {
                    el.style.height = `${height}px`;
                    el.style.opacity = 1;
                },
                leave() {
                    el.style.height = '';
                    el.style.opacity = '';
                    $node.classList.remove('plaintree-collapsed');
                }
            });
        } else {
            this.#animate(150, {
                enter() {
                    el.style.height = `${height}px`;
                    el.style.opacity = 1;
                },
                active() {
                    el.style.height = 0;
                    el.style.opacity = 0;
                },
                leave() {
                    el.style.height = '';
                    el.style.opacity = '';
                    $node.classList.add('plaintree-collapsed');
                }
            });
        }
    }

    #selectNode(id) {
        this.#selectedNode = this.#nodeData[id];
        this.#selectedElement && this.#selectedElement.classList.remove('plaintree-selected');
        this.#selectedElement = this.#nodeElements[id];
        this.#selectedElement.classList.add('plaintree-selected');
    }

    #createContextMenu() {
        const { contextMenu } = this.#options;
        if (!contextMenu || !contextMenu.length) return;

        this.$contextMenu = document.createElement('div');
        this.$contextMenu.className = 'plaintree-context-menu';
        this.#container.append(this.$contextMenu);

        for (const item of contextMenu) {
            const option = document.createElement('div');
            option.textContent = item.text;
            option.addEventListener('click', () => item.onClick(this.#selectedNode));
            this.$contextMenu.append(option);
        }
    }

    #createRootElement() {
        const div = document.createElement('div');
        div.classList.add('plaintree');
        return div;
    }

    #createGroupElement = function() {
        const ul = document.createElement('ul');
        ul.classList.add('plaintree-group');
        return ul;
    }

    #createNodeElement = function(node, collapsed) {
        const li = document.createElement('li');
        li.classList.add('plaintree-node');
        if (collapsed) {
            li.classList.add('plaintree-collapsed');
        }

        const isLeaf = !node.children || !node.children.length;
        const icon = document.createElement('span');
        icon.classList.add(isLeaf ? 'plaintree-leaf' : 'plaintree-switcher');
        li.append(icon);

        const label = document.createElement('span');
        label.classList.add('plaintree-label');

        const text = document.createTextNode(node.text);
        label.append(text);
        li.append(label);
        li.nodeId = node.id;
        return li;
    }

    #animate(duration, callback) {
        requestAnimationFrame(() => {
            callback.enter();
            requestAnimationFrame(() => {
                callback.active();
                setTimeout(() => callback.leave(), duration);
            });
        });
    }

}
