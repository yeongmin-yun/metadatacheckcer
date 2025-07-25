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
