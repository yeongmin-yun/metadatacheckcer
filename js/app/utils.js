import { state } from './state.js';
import { TARGET_ROOT_NAME } from './constants.js';

/**
 * Logs data to the debug event log viewer on the page.
 * @param {string} title - The title for the log entry.
 * @param {object} data - The data object to be logged.
 */
export function logEvent(title, data) {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;
    const formattedData = JSON.stringify(data, null, 2); // Pretty print JSON
    const logEntry = `\n<span class="text-yellow-400">-- ${title} --</span>\n${formattedData}\n`;
    logContent.innerHTML += logEntry;
}

/**
 * Builds a filtered inheritance tree for a specific component.
 * @param {string} clickedNodeName - The selected component name.
 * @returns {object} A hierarchical tree object for D3.
 */
export function buildFilteredInheritanceTree(clickedNodeName) {
    const rawData = state.allInheritanceDataRaw;
    const childToParentMap = new Map();
    const allNodesInRawData = new Set();

    rawData.forEach(d => {
        allNodesInRawData.add(d.parent);
        allNodesInRawData.add(d.child);
        childToParentMap.set(d.child, d.parent);
    });

    const lineagePath = [];
    let current = clickedNodeName;
    let foundTargetRoot = false;

    while (current && allNodesInRawData.has(current) && !lineagePath.includes(current)) {
        lineagePath.unshift(current);
        if (current === TARGET_ROOT_NAME) {
            foundTargetRoot = true;
            break;
        }
        current = childToParentMap.get(current);
    }

    if (!foundTargetRoot || !allNodesInRawData.has(clickedNodeName)) {
        return { name: clickedNodeName, children: [] };
    }

    const actualRootName = lineagePath[0];
    const nodeObjectsMap = new Map(lineagePath.map(name => [name, { name, children: [] }]));
    const treeRoot = nodeObjectsMap.get(actualRootName);

    for (let i = 0; i < lineagePath.length - 1; i++) {
        const parentNode = nodeObjectsMap.get(lineagePath[i]);
        const childNode = nodeObjectsMap.get(lineagePath[i + 1]);
        if (parentNode && childNode) {
            parentNode.children.push(childNode);
        }
    }
    return treeRoot;
}