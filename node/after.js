function treeWalkerFilter(element) {
    if (element.nodeType === Node.ELEMENT_NODE) {
        return NodeFilter.FILTER_ACCEPT;
    }
}

treeWalker = document.createTreeWalker(
    document,
    NodeFilter.SHOW_ELEMENT,
    treeWalkerFilter,
    false
);
let nodes = [];
while (treeWalker.nextNode()) {
    nodes.push(treeWalker.currentNode)
}
nodes.forEach(node => {
    // 触发点击事件
    if (node.click) {
        node.click();
    }
});