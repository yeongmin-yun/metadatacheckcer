import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs";
import { state } from './state.js';
import { updatePropertyTable, updateEventTable } from './ui.js';
import { logEvent, buildFilteredInheritanceTree } from './utils.js';
import { TARGET_ROOT_NAME } from './constants.js';

/**
 * Generates and downloads an XLSX file with component analysis.
 * @param {string} clickedNodeName - The selected component name.
 */
function downloadInheritanceXLSX(clickedNodeName) {
    const treeData = buildFilteredInheritanceTree(clickedNodeName);

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
        
        const componentProperties = state.propertyData.find(p => p.componentname === componentShortName);
        if (componentProperties?.properties) {
            componentProperties.properties.forEach(prop => properties_ws_data.push([componentFullName, prop]));
        }
        
        const componentEvents = state.eventData.find(e => e.componentname === componentShortName);
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

    const codebaseProps = state.allComponentPropertiesData.find(c => c.componentname === componentShortName)?.properties || [];
    const metainfoProps = state.metainfoPropertyData.find(c => c.componentname === componentShortName)?.properties || [];

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

    const codebaseEvents = state.allComponentEventsData.find(c => c.componentname === componentShortName)?.events || [];
    const metainfoEvents = state.metainfoEventData.find(c => c.componentname === componentShortName)?.events || [];

    logEvent(`Comparing Event Data for: ${componentShortName}`, {
        codebaseEvents: { count: codebaseEvents.length, data: codebaseEvents },
        metainfoEvents: { count: metainfoEvents.length, data: metainfoEvents }
    });

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
 * Displays the main analysis view for a component.
 * @param {string} clickedNodeName - The selected component name.
 */
export function showAnalysisView(clickedNodeName) {
    const buttonContainer = document.getElementById('button-container');
    const visualizationContainer = document.getElementById('visualization-container');
    const logContainer = document.getElementById('log-container');
    const logContent = document.getElementById('log-content');

    logContent.innerHTML = '';
    buttonContainer.classList.add('slide-up', 'hidden');
    visualizationContainer.classList.remove('hidden');
    visualizationContainer.classList.add('fade-in');
    logContainer.classList.remove('hidden');

    document.getElementById('download-xlsx-button').onclick = () => downloadInheritanceXLSX(clickedNodeName);

    drawPropertyPieChart(clickedNodeName);
    drawEventPieChart(clickedNodeName);
    showInheritanceGraph(clickedNodeName);
    drawSubElementsGraph(clickedNodeName);
}

/**
 * Draws the inheritance graph for a given component.
 * @param {string} clickedNodeName - The name of the component to display the graph for.
 */
export function showInheritanceGraph(clickedNodeName) {
    const svg = d3.select("#inheritance-graph-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const treeData = buildFilteredInheritanceTree(clickedNodeName);

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


/**
 * Draws the sub-elements graph for a given component.
 * This graph shows components that inherit from the selected component.
 * @param {string} clickedNodeName - The name of the component to display the graph for.
 */
export function drawSubElementsGraph(clickedNodeName) {
    const svg = d3.select("#sub-elements-graph-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('sub-elements-graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    // Find all components that have the clickedNodeName as their parent
    const childrenNodes = state.allInheritanceDataRaw.filter(node => node.parent === clickedNodeName);

    if (childrenNodes.length === 0) {
        svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").attr("fill", "#666")
            .text("No sub-elements found.");
        return;
    }

    // Build the tree structure for the graph
    const treeData = {
        name: clickedNodeName,
        children: childrenNodes.map(node => ({ name: node.child, children: [] }))
    };

    const root = d3.hierarchy(treeData);
    // Use size with swapped width and height for a horizontal layout
    const treeLayout = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treeLayout(root);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Create links using a horizontal link generator with a linear curve
    g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return `M${d.source.y},${d.source.x}` +
                   `L${d.target.y},${d.target.x}`;
        });

    // Create nodes
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", d => "node" + (d.children && d.children.length > 0 ? " node--internal" : " node--leaf"))
        // Swap x and y in the transform
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle").attr("r", 5).attr("fill", d => d.data.name === clickedNodeName ? "#ff7f0e" : "#999");
    
    // Adjust text positioning for horizontal layout
    node.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -10 : 10)
        .style("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name.split('.').pop());
}



/**
 * Draws a vertical bar chart of annotation counts per file.
 * @param {Array<object>} data - Data for the chart, e.g., [{ file: 'file.js', count: 5 }]
 */
export function drawAnnotationBarChart(data) {
    const svg = d3.select("#annotation-bar-chart-svg");
    svg.selectAll("*").remove();

    const container = document.getElementById('annotation-chart-container');
    const margin = { top: 20, right: 30, bottom: 150, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    svg.attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.file))
        .padding(0.2);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(data, d => d.count)]);

    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            const cardId = `annotation-card-${d.replace(/\./g, '-')}`;
            const cardElement = document.getElementById(cardId);
            if (cardElement) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).tickFormat(""));

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.file))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count))
        .attr("fill", "#63b3ed");

    g.selectAll(".bar-label")
        .data(data)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.file) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .style("fill", "#333")
        .text(d => d.count);
}

/**
 * Draws stacked horizontal bar charts for all components' property and event analysis.
 */
export function drawAllComponentsReport() {
    const container = document.getElementById('report-charts-container');
    container.innerHTML = '<div class="text-center py-8"><p class="text-lg font-semibold text-gray-600">Generating report...</p></div>';

    // Use a timeout to allow the "Generating..." message to render before the main thread is blocked.
    setTimeout(() => {
        container.innerHTML = ''; // Clear the loading message

        const allComponents = state.aggregatedComponentNames.sort();
        const keys = ['common', 'missing', 'extra'];
        const colors = {
            common: '#4bc0c0',
            missing: '#ff6384',
            extra: '#ffcd56'
        };

        allComponents.forEach(componentShortName => {
            // --- Data Calculation ---
            const codebaseProps = state.allComponentPropertiesData.find(c => c.componentname === componentShortName)?.properties || [];
            const metainfoProps = state.metainfoPropertyData.find(c => c.componentname === componentShortName)?.properties || [];
            const propData = {
                group: 'Properties',
                common: codebaseProps.filter(p => metainfoProps.includes(p)).length,
                missing: codebaseProps.filter(p => !metainfoProps.includes(p)).length,
                extra: metainfoProps.filter(p => !codebaseProps.includes(p)).length,
            };
            propData.total = propData.common + propData.missing + propData.extra;

            const codebaseEvents = state.allComponentEventsData.find(c => c.componentname === componentShortName)?.events || [];
            const metainfoEvents = state.metainfoEventData.find(c => c.componentname === componentShortName)?.events || [];
            const eventData = {
                group: 'Events',
                common: codebaseEvents.filter(e => metainfoEvents.includes(e)).length,
                missing: codebaseEvents.filter(e => !metainfoEvents.includes(e)).length,
                extra: metainfoEvents.filter(e => !codebaseEvents.includes(e)).length,
            };
            eventData.total = eventData.common + eventData.missing + eventData.extra;
            
            if (propData.total === 0 && eventData.total === 0) return;

            // --- D3 Chart Drawing ---
            const chartData = [propData, eventData];
            const stack = d3.stack().keys(keys);
            const series = stack(chartData);

            const margin = { top: 40, right: 20, bottom: 20, left: 80 };
            const height = 120;
            const width = container.clientWidth - margin.left - margin.right;

            const componentWrapper = document.createElement('div');
            componentWrapper.className = 'bg-white p-4 rounded-lg shadow border border-gray-200';
            
            const title = document.createElement('h3');
            title.className = 'text-xl font-bold text-gray-800 mb-2 text-center';
            title.textContent = componentShortName; // Use short name for title
            componentWrapper.appendChild(title);

            const svg = d3.select(componentWrapper).append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            const y = d3.scaleBand()
                .domain(chartData.map(d => d.group))
                .range([0, height])
                .padding(0.2);

            const x = d3.scaleLinear()
                .domain([0, Math.max(propData.total, eventData.total)])
                .range([0, width]);

            svg.append('g')
                .selectAll('g')
                .data(series)
                .join('g')
                    .attr('fill', d => colors[d.key])
                .selectAll('rect')
                .data(d => d)
                .join('rect')
                    .attr('y', d => y(d.data.group))
                    .attr('x', d => x(d[0]))
                    .attr('width', d => x(d[1]) - x(d[0]))
                    .attr('height', y.bandwidth());

            // Add labels inside the bars
            svg.append('g')
                .selectAll('g')
                .data(series)
                .join('g')
                .selectAll('.text')
                .data(d => d)
                .join('text')
                    .attr('class', 'bar-label')
                    .attr('x', d => x(d[0]) + (x(d[1]) - x(d[0])) / 2)
                    .attr('y', d => y(d.data.group) + y.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .attr('text-anchor', 'middle')
                    .style('fill', 'white')
                    .style('font-size', '12px')
                    .text(d => {
                        const value = d[1] - d[0];
                        return value > 0 ? value : '';
                    });

            svg.append('g')
                .call(d3.axisLeft(y));

            container.appendChild(componentWrapper);
        });
         if (container.innerHTML === '') {
            container.innerHTML = '<div class="text-center py-8"><p class="text-lg font-semibold text-gray-500">No component data to display.</p></div>';
        }
    }, 10);
}
