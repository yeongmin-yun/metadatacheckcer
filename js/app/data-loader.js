import { state } from './state.js';
import * as C from './constants.js';
import { filterButtons } from './ui.js';
import { drawAnnotationBarChart } from './chart-drawer.js';

/**
 * Loads and displays the annotation status.
 */
async function loadAnnotationStatus() {
    const detailsContainer = document.getElementById('annotation-details-container');
    const cardsContainer = document.getElementById('annotation-cards-container');
    const noAnnotationMessage = document.getElementById('no-annotation-message');
    const chartContainer = document.getElementById('annotation-chart-container');

    try {
        const response = await fetch(C.ANNOTATIONS_JSON_FILE_PATH);
        if (!response.ok) {
            throw new Error('Annotation data not found');
        }
        const data = await response.json();
        const fileNames = Object.keys(data);

        const chartData = fileNames.map(fileName => ({
            file: fileName.replace(/\.js$/, ''), // Remove .js extension
            count: data[fileName].length
        })).filter(d => d.count > 0);

        if (chartData.length === 0) {
            detailsContainer.classList.add('hidden');
            chartContainer.classList.add('hidden');
            noAnnotationMessage.classList.remove('hidden');
            return;
        }

        detailsContainer.classList.remove('hidden');
        chartContainer.classList.remove('hidden');
        noAnnotationMessage.classList.add('hidden');
        cardsContainer.innerHTML = '';

        drawAnnotationBarChart(chartData);

        fileNames.forEach(fileName => {
            const annotations = data[fileName];
            if (annotations.length === 0) return;

            const componentName = fileName.replace(/\.js$/, ''); // Remove .js extension
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md p-6 border border-gray-200';
            card.id = `annotation-card-${componentName.replace(/\./g, '-')}`;

            const header = document.createElement('h4');
            header.className = 'text-xl font-bold text-gray-800 mb-4';
            header.textContent = componentName; // Use the modified name
            card.appendChild(header);

            const tableContainer = document.createElement('div');
            tableContainer.className = 'overflow-x-auto';
            
            const table = document.createElement('table');
            table.className = 'min-w-full divide-y divide-gray-200';
            
            const thead = document.createElement('thead');
            thead.className = 'bg-gray-50';
            thead.innerHTML = `
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            tbody.className = 'bg-white divide-y divide-gray-200';
            annotations.forEach(annotation => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${annotation.line}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${annotation.type}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${annotation.content}</td>
                `;
            });
            table.appendChild(tbody);
            tableContainer.appendChild(table);
            card.appendChild(tableContainer);
            cardsContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading annotation status:', error);
        detailsContainer.classList.add('hidden');
        chartContainer.classList.add('hidden');
        noAnnotationMessage.classList.remove('hidden');
        noAnnotationMessage.innerHTML = '<p class="text-red-500">Could not load annotation details.</p>';
    }
}


/**
 * Loads all necessary data for the component analyzer.
 */
export async function loadComponentAnalyzerData() {
    loadAnnotationStatus(); // Load annotation status
    const loadingMessage = document.getElementById('loading-message');
    const searchInput = document.getElementById('search-input');

    try {
        const responses = await Promise.all([
            fetch(C.JSON_FILE_PATH), fetch(C.PROPERTY_JSON_FILE_PATH), fetch(C.EVENT_JSON_FILE_PATH),
            fetch(C.METAINFO_PROPERTY_JSON_FILE_PATH), fetch(C.ALL_COMPONENT_PROPERTIES_JSON_FILE_PATH),
            fetch(C.METAINFO_EVENT_JSON_FILE_PATH), fetch(C.ALL_COMPONENT_EVENTS_JSON_FILE_PATH),
            fetch(C.AGGREGATED_NAMES_JSON_FILE_PATH)
        ]);

        for (const res of responses) {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        }

        const [
            allInheritanceDataRaw, propertyData, eventData,
            metainfoPropertyData, allComponentPropertiesData,
            metainfoEventData, allComponentEventsData,
            aggregatedComponentNames
        ] = await Promise.all(responses.map(res => res.json()));
        
        // Update state
        state.allInheritanceDataRaw = allInheritanceDataRaw;
        state.propertyData = propertyData;
        state.eventData = eventData;
        state.metainfoPropertyData = metainfoPropertyData;
        state.allComponentPropertiesData = allComponentPropertiesData;
        state.metainfoEventData = metainfoEventData;
        state.allComponentEventsData = allComponentEventsData;
        state.aggregatedComponentNames = aggregatedComponentNames;

        const childToParentMap = new Map(state.allInheritanceDataRaw.map(d => [d.child, d.parent]));
        const allChildNames = [...new Set(state.allInheritanceDataRaw.map(item => item.child))];

        const groupedComponents = { Component: [], Control: [], EventInfo: [], ETC: [] };

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
        state.groupedComponents = groupedComponents;

        if (loadingMessage) loadingMessage.remove();
        searchInput.addEventListener('input', filterButtons);

    } catch (error) {
        console.error('Error loading JSON data:', error);
        if (loadingMessage) loadingMessage.remove();
        document.getElementById('button-container').innerHTML =
            '<p class="text-center text-red-500 col-span-full">Failed to load data. Please check file paths and network.</p>';
    }
}
