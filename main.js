// JSON file paths
const jsonFilePath = './parsers/json/codebase/output.json';
const propertyJsonFilePath = './parsers/json/codebase/output_property.json';
const eventJsonFilePath = './parsers/json/codebase/output_event.json';
const metainfoPropertyJsonFilePath = './parsers/json/metainfo/output_property_metainfo.json';
const allComponentPropertiesJsonFilePath = './parsers/json/codebase/all_component_properties.json';
const metainfoEventJsonFilePath = './parsers/json/metainfo/output_event_metainfo.json';
const allComponentEventsJsonFilePath = './parsers/json/codebase/output_event.json';

// Data stores
let allInheritanceDataRaw = [];
let propertyData = [];
let eventData = [];
let metainfoPropertyData = [];
let allComponentPropertiesData = [];
let metainfoEventData = [];
let allComponentEventsData = [];
let groupedComponents = {};

/**
 * Renders component buttons in categorized groups.
 * @param {object} groups - Grouped component data.
 */
function renderGroupedButtons(groups) {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.innerHTML = '';
    buttonContainer.className = 'space-y-8';

    const groupOrder = ['Component', 'Control', 'EventInfo', 'ETC'];
    let hasContent = false;

    groupOrder.forEach(groupName => {
        const componentsInGroup = groups[groupName];
        if (componentsInGroup && componentsInGroup.length > 0) {
            hasContent = true;
            const groupDiv = document.createElement('div');
            const heading = document.createElement('h2');
            heading.textContent = groupName;
            heading.className = 'text-2xl font-bold text-gray-700 mb-4 border-b pb-2';
            groupDiv.appendChild(heading);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

            componentsInGroup.sort((a, b) => a.localeCompare(b));

            componentsInGroup.forEach(childName => {
                const button = document.createElement('button');
                const span = document.createElement('span');
                const shortName = childName.includes('.') ? childName.split('.').pop() : childName;
                span.textContent = shortName;
                span.classList.add('btn-truncate');
                button.appendChild(span);
                button.title = childName;
                button.className = 'bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 w-full text-sm md:text-base flex items-center justify-center';
                button.addEventListener('click', () => showInheritanceGraph(childName));
                gridDiv.appendChild(button);
            });

            groupDiv.appendChild(gridDiv);
            buttonContainer.appendChild(groupDiv);
        }
    });
    
    if (!hasContent) {
        buttonContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">No components found matching your search.</p>';
    }
}

/**
 * Filters component buttons based on search input.
 */
function filterButtons() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const buttonContainer = document.getElementById('button-container');
    const visualizationContainer = document.getElementById('visualization-container');
    const propertyTableContainer = document.getElementById('property-table-container');
    const eventTableContainer = document.getElementById('event-table-container');
    const logContainer = document.getElementById('log-container');

    buttonContainer.classList.remove('hidden', 'slide-up');
    visualizationContainer.classList.add('hidden');
    propertyTableContainer.classList.add('hidden');
    eventTableContainer.classList.add('hidden');
    logContainer.classList.add('hidden'); // Hide log container on filter

    if (!searchTerm) {
        renderGroupedButtons(groupedComponents);
        return;
    }

    const filteredGroups = { Component: [], Control: [], EventInfo: [], ETC: [] };
    for (const groupName in groupedComponents) {
        const filtered = groupedComponents[groupName].filter(name => {
            const shortName = name.includes('.') ? name.split('.').pop().toLowerCase() : name.toLowerCase();
            return name.toLowerCase().includes(searchTerm) || shortName.includes(searchTerm);
        });
        filteredGroups[groupName] = filtered;
    }
    renderGroupedButtons(filteredGroups);
}

/**
 * Logs data to the debug event log viewer on the page.
 * @param {string} title - The title for the log entry.
 * @param {object} data - The data object to be logged.
 */
function logEvent(title, data) {
    const logContent = document.getElementById('log-content');
    const formattedData = JSON.stringify(data, null, 2); // Pretty print JSON
    const logEntry = `\n<span class="text-yellow-400">-- ${title} --</span>\n${formattedData}\n`;
    logContent.innerHTML += logEntry;
}


/**
 * Builds a filtered inheritance tree for a specific component.
 * @param {string} clickedNodeName - The selected component name.
 * @param {string} targetRootName - The root of the inheritance tree to trace back to.
 * @param {Array} rawData - The complete inheritance data.
 * @returns {object} A hierarchical tree object for D3.
 */
function buildFilteredInheritanceTree(clickedNodeName, targetRootName, rawData) {
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
        if (current === targetRootName) {
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

/**
 * Generates and downloads an XLSX file with component analysis.
 * @param {string} clickedNodeName - The selected component name.
 */
function downloadInheritanceXLSX(clickedNodeName) {
    const targetRootName = "nexacro._EventSinkObject";
    const treeData = buildFilteredInheritanceTree(clickedNodeName, targetRootName, allInheritanceDataRaw);

    const lineage = [];
    function getLineage(node) {
        if (!node) return;
        lineage.push(node.name);
        if (node.children && node.children.length > 0) getLineage(node.children[0]);
    }
    getLineage(treeData);

    const path_ws_data = [["Inheritance Path"], ...lineage.map(name => [name])];
    const properties_ws_data = [["Component", "Property"]];
    const events_ws_data = [["Component", "Event"]];

    lineage.forEach(componentFullName => {
        let componentShortName = componentFullName.includes('.') ? componentFullName.split('.').pop() : componentFullName;
        if (componentShortName.startsWith('_')) componentShortName = componentShortName.substring(1);
        
        const componentProperties = propertyData.find(p => p.componentname === componentShortName);
        if (componentProperties?.properties) {
            componentProperties.properties.forEach(prop => properties_ws_data.push([componentFullName, prop]));
        }
        
        const componentEvents = eventData.find(e => e.componentname === componentShortName);
        if (componentEvents?.events) {
            componentEvents.events.forEach(evt => events_ws_data.push([componentFullName, evt]));
        }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(path_ws_data), "InheritancePath");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(properties_ws_data), "Properties");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(events_ws_data), "Events");
    XLSX.writeFile(wb, `${clickedNodeName}_analysis.xlsx`);
}

/**
 * Draws the property comparison pie chart.
 * @param {string} clickedNodeName - The selected component name.
 */
function drawPropertyPieChart(clickedNodeName) {
    const componentShortName = clickedNodeName.includes('.') ? clickedNodeName.split('.').pop() : clickedNodeName;
    document.getElementById('pie-chart-component-name').textContent = `Property: ${clickedNodeName}`;

    const codebaseProps = allComponentPropertiesData.find(c => c.componentname === componentShortName)?.properties || [];
    const metainfoProps = metainfoPropertyData.find(c => c.componentname === componentShortName)?.properties || [];

    const commonProps = codebaseProps.filter(p => metainfoProps.includes(p));
    const missingProps = codebaseProps.filter(p => !metainfoProps.includes(p));
    const extraProps = metainfoProps.filter(p => !codebaseProps.includes(p));

    const data = [
        { label: 'Common Properties', value: commonProps.length, props: commonProps, color: '#4bc0c0' },
        { label: 'Missing in Metainfo', value: missingProps.length, props: missingProps, color: '#ff6384' },
        { label: 'Extra in Metainfo', value: extraProps.length, props: extraProps, color: '#ffcd56' },
    ];

    document.getElementById('legend-common-prop').style.backgroundColor = data[0].color;
    document.getElementById('legend-missing-prop').style.backgroundColor = data[1].color;
    document.getElementById('legend-extra-prop').style.backgroundColor = data[2].color;

    const svg = d3.select("#property-pie-chart-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('property-pie-chart-container').querySelector('.flex-grow');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 - 20;

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);
    const pie = d3.pie().value(d => d.value).sort(null);
    const path = d3.arc().outerRadius(radius).innerRadius(0);

    const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc")
        .on("click", (event, d) => updatePropertyTable(d.data.label, d.data.props));

    arcs.append("path").attr("d", path).attr("fill", d => d.data.color);
    arcs.append("text").attr("transform", d => `translate(${path.centroid(d)})`)
        .attr("dy", "0.35em").attr("text-anchor", "middle").style("font-size", "14px").style("fill", "white")
        .text(d => d.data.value > 0 ? d.data.value : '');
}

/**
 * Draws the event comparison pie chart and logs the data.
 * @param {string} clickedNodeName - The selected component name.
 */
function drawEventPieChart(clickedNodeName) {
    const componentShortName = clickedNodeName.includes('.') ? clickedNodeName.split('.').pop() : clickedNodeName;
    document.getElementById('event-pie-chart-component-name').textContent = `Event: ${clickedNodeName}`;

    const codebaseEvents = allComponentEventsData.find(c => c.componentname === componentShortName)?.events || [];
    const metainfoEvents = metainfoEventData.find(c => c.componentname === componentShortName)?.events || [];

    // --- LOGGING ADDED HERE ---
    logEvent(`Comparing Event Data for: ${componentShortName}`, {
        codebaseEvents: {
            count: codebaseEvents.length,
            data: codebaseEvents
        },
        metainfoEvents: {
            count: metainfoEvents.length,
            data: metainfoEvents
        }
    });
    // --- END OF LOGGING ---

    const commonEvents = codebaseEvents.filter(e => metainfoEvents.includes(e));
    const missingEvents = codebaseEvents.filter(e => !metainfoEvents.includes(e));
    const extraEvents = metainfoEvents.filter(e => !codebaseEvents.includes(e));

    const data = [
        { label: 'Common Events', value: commonEvents.length, events: commonEvents, color: '#4bc0c0' },
        { label: 'Missing in Metainfo', value: missingEvents.length, events: missingEvents, color: '#ff6384' },
        { label: 'Extra in Metainfo', value: extraEvents.length, events: extraEvents, color: '#ffcd56' },
    ];
    
    document.getElementById('legend-common-event').style.backgroundColor = data[0].color;
    document.getElementById('legend-missing-event').style.backgroundColor = data[1].color;
    document.getElementById('legend-extra-event').style.backgroundColor = data[2].color;

    const svg = d3.select("#event-pie-chart-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('event-pie-chart-container').querySelector('.flex-grow');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 - 20;

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);
    const pie = d3.pie().value(d => d.value).sort(null);
    const path = d3.arc().outerRadius(radius).innerRadius(0);

    const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc")
        .on("click", (event, d) => updateEventTable(d.data.label, d.data.events));

    arcs.append("path").attr("d", path).attr("fill", d => d.data.color);
    arcs.append("text").attr("transform", d => `translate(${path.centroid(d)})`)
        .attr("dy", "0.35em").attr("text-anchor", "middle").style("font-size", "14px").style("fill", "white")
        .text(d => d.data.value > 0 ? d.data.value : '');
}

/**
 * Updates the property table with selected data.
 * @param {string} title - The title for the table.
 * @param {Array<string>} properties - The list of properties to display.
 */
function updatePropertyTable(title, properties) {
    const tableContainer = document.getElementById('property-table-container');
    document.getElementById('property-table-title').textContent = title;
    const tableBody = document.getElementById('property-table-body');
    tableBody.innerHTML = '';

    if (properties.length === 0) {
        tableBody.insertRow().insertCell().textContent = 'No properties in this category.';
    } else {
        properties.sort().forEach(prop => {
            tableBody.insertRow().insertCell().textContent = prop;
        });
    }
    tableContainer.classList.remove('hidden');
}

/**
 * Updates the event table with selected data.
 * @param {string} title - The title for the table.
 * @param {Array<string>} events - The list of events to display.
 */
function updateEventTable(title, events) {
    const tableContainer = document.getElementById('event-table-container');
    document.getElementById('event-table-title').textContent = title;
    const tableBody = document.getElementById('event-table-body');
    tableBody.innerHTML = '';

    if (events.length === 0) {
        tableBody.insertRow().insertCell().textContent = 'No events in this category.';
    } else {
        events.sort().forEach(evt => {
            tableBody.insertRow().insertCell().textContent = evt;
        });
    }
    tableContainer.classList.remove('hidden');
}

/**
 * Displays the main analysis view for a component.
 * @param {string} clickedNodeName - The selected component name.
 */
function showInheritanceGraph(clickedNodeName) {
    const buttonContainer = document.getElementById('button-container');
    const visualizationContainer = document.getElementById('visualization-container');
    const logContainer = document.getElementById('log-container');
    const logContent = document.getElementById('log-content');

    // Clear previous logs and show containers
    logContent.innerHTML = '';
    buttonContainer.classList.add('slide-up', 'hidden');
    visualizationContainer.classList.remove('hidden');
    visualizationContainer.classList.add('fade-in');
    logContainer.classList.remove('hidden');

    document.getElementById('download-xlsx-button').onclick = () => downloadInheritanceXLSX(clickedNodeName);

    drawPropertyPieChart(clickedNodeName);
    drawEventPieChart(clickedNodeName);

    const svg = d3.select("#inheritance-graph-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const targetRootName = "nexacro._EventSinkObject";
    const treeData = buildFilteredInheritanceTree(clickedNodeName, targetRootName, allInheritanceDataRaw);

    if (!treeData.children && treeData.name === clickedNodeName) {
        svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("fill", "#666")
            .text("No inheritance structure found.");
        return;
    }

    const tree = d3.tree().size([width, height - 100]);
    const root = d3.hierarchy(treeData);
    tree(root);

    const g = svg.append("g").attr("transform", "translate(0, 50)");

    g.selectAll(".link").data(root.links()).enter().append("path")
        .attr("class", "link").attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    const node = g.selectAll(".node").data(root.descendants()).enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle").attr("r", 5).attr("fill", d => d.data.name === clickedNodeName ? "#ff7f0e" : (d.children ? "#555" : "#999"));
    node.append("text").attr("dy", 3).attr("y", d => d.children ? -20 : 20)
        .style("text-anchor", "middle")
        .text(d => d.data.name.split('.').pop());
}

// State variables to track if data is loaded
let isComponentDataLoaded = false;
let isMetainfoAnalyzerSetup = false;
let isMetainfoMakerSetup = false; // New state for MetaInfo Maker

/**
 * Switches the visible content based on the selected tab.
 * @param {string} tabId - The ID of the tab to switch to.
 */
function switchTab(tabId) {
    // Hide all content containers
    document.getElementById('home-content').classList.add('hidden');
    document.getElementById('metainfo-analyzer-content').classList.add('hidden');
    document.getElementById('component-analyzer-content').classList.add('hidden');
    document.getElementById('cats-sample-maker-content').classList.add('hidden');
    document.getElementById('metainfo-maker-content').classList.add('hidden'); // Hide new tab

    // Show the selected content container
    const contentId = tabId.replace('-tab', '-content');
    document.getElementById(contentId).classList.remove('hidden');

    // Update active tab styles
    document.querySelectorAll('aside nav a').forEach(tab => {
        tab.classList.remove('bg-gray-200', 'text-blue-600');
        tab.classList.add('text-gray-700');
    });
    document.getElementById(tabId).classList.add('bg-gray-200', 'text-blue-600');
    document.getElementById(tabId).classList.remove('text-gray-700');

    // Load component analyzer data only when its tab is selected for the first time
    if (tabId === 'component-analyzer-tab' && !isComponentDataLoaded) {
        loadComponentAnalyzerData();
        isComponentDataLoaded = true;
    }

    // Set up metainfo analyzer only when its tab is selected for the first time
    if (tabId === 'metainfo-analyzer-tab' && !isMetainfoAnalyzerSetup) {
        // The logic is self-contained in csv-generator.js, so no function call is needed here.
        isMetainfoAnalyzerSetup = true;
    }

    // Set up metainfo maker only when its tab is selected for the first time
    if (tabId === 'metainfo-maker-tab' && !isMetainfoMakerSetup) {
        // The logic is self-contained in metainfo-maker.js, so no function call is needed here.
        isMetainfoMakerSetup = true;
    }
}

/**
 * Main function to load data and set up the application.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Set up tab switching
    document.getElementById('home-tab').addEventListener('click', (e) => { e.preventDefault(); switchTab('home-tab'); });
    document.getElementById('metainfo-analyzer-tab').addEventListener('click', (e) => { e.preventDefault(); switchTab('metainfo-analyzer-tab'); });
    document.getElementById('component-analyzer-tab').addEventListener('click', (e) => { e.preventDefault(); switchTab('component-analyzer-tab'); });
    document.getElementById('cats-sample-maker-tab').addEventListener('click', (e) => { e.preventDefault(); switchTab('cats-sample-maker-tab'); });
    document.getElementById('metainfo-maker-tab').addEventListener('click', (e) => { e.preventDefault(); switchTab('metainfo-maker-tab'); });

    // Set the initial tab
    switchTab('component-analyzer-tab');
});

/**
 * Loads all necessary data for the component analyzer.
 */
async function loadComponentAnalyzerData() {
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input');

    try {
        const responses = await Promise.all([
            fetch(jsonFilePath), fetch(propertyJsonFilePath), fetch(eventJsonFilePath),
            fetch(metainfoPropertyJsonFilePath), fetch(allComponentPropertiesJsonFilePath),
            fetch(metainfoEventJsonFilePath), fetch(allComponentEventsJsonFilePath)
        ]);

        for (const res of responses) {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        }

        [
            allInheritanceDataRaw, propertyData, eventData,
            metainfoPropertyData, allComponentPropertiesData,
            metainfoEventData, allComponentEventsData
        ] = await Promise.all(responses.map(res => res.json()));
        
        const childToParentMap = new Map(allInheritanceDataRaw.map(d => [d.child, d.parent]));
        const allChildNames = [...new Set(allInheritanceDataRaw.map(item => item.child))];

        groupedComponents = { Component: [], Control: [], EventInfo: [], ETC: [] };

        allChildNames.forEach(childName => {
            const shortName = childName.split('.').pop();
            if (shortName.endsWith('EventInfo')) groupedComponents.EventInfo.push(childName);
            else if (shortName.endsWith('Control')) groupedComponents.Control.push(childName);
            else {
                let current = childName, isComponent = false, visited = new Set();
                while (current && !visited.has(current)) {
                    visited.add(current);
                    if (current === 'nexacro.Component') { isComponent = true; break; }
                    current = childToParentMap.get(current);
                }
                if (isComponent || childName === 'nexacro.Component') groupedComponents.Component.push(childName);
                else groupedComponents.ETC.push(childName);
            }
        });

        if (loadingMessage) loadingMessage.remove();
        renderGroupedButtons(groupedComponents);
        searchInput.addEventListener('input', filterButtons);

    } catch (error) {
        console.error('Error loading JSON data:', error);
        if (loadingMessage) loadingMessage.remove();
        document.getElementById('button-container').innerHTML =
            '<p class="text-center text-red-500 col-span-full">Failed to load data. Please check file paths and network.</p>';
    }
}