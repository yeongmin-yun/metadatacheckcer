import { state } from './state.js';
import { GROUP_ORDER } from './constants.js';
import { showAnalysisView } from './chart-drawer.js';
import { loadComponentAnalyzerData } from './data-loader.js';

/**
 * Renders component buttons in categorized groups.
 * @param {object} groups - Grouped component data.
 */
export function renderGroupedButtons(groups) {
    const buttonContainer = document.getElementById('button-container');
    buttonContainer.innerHTML = '';
    buttonContainer.className = 'space-y-8';

    let hasContent = false;

    GROUP_ORDER.forEach(groupName => {
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
                button.addEventListener('click', () => showAnalysisView(childName));
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
export function filterButtons() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const buttonContainer = document.getElementById('button-container');
    const visualizationContainer = document.getElementById('visualization-container');
    const propertyTableContainer = document.getElementById('property-table-container');
    const eventTableContainer = document.getElementById('event-table-container');
    const logContainer = document.getElementById('log-container');
    const preSearchContainer = document.getElementById('pre-search-container');

    visualizationContainer.classList.add('hidden');
    propertyTableContainer.classList.add('hidden');
    eventTableContainer.classList.add('hidden');
    logContainer.classList.add('hidden');

    if (!searchTerm) {
        buttonContainer.classList.add('hidden');
        preSearchContainer.classList.remove('hidden');
        return;
    }

    preSearchContainer.classList.add('hidden');
    buttonContainer.classList.remove('hidden');

    const filteredGroups = { Component: [], Control: [], EventInfo: [], ETC: [] };
    for (const groupName in state.groupedComponents) {
        const filtered = state.groupedComponents[groupName].filter(name => {
            const shortName = name.includes('.') ? name.split('.').pop().toLowerCase() : name.toLowerCase();
            return name.toLowerCase().includes(searchTerm) || shortName.includes(searchTerm);
        });
        filteredGroups[groupName] = filtered;
    }
    renderGroupedButtons(filteredGroups);
}

/**
 * Updates the property table with selected data.
 * @param {string} title - The title for the table.
 * @param {Array<string>} properties - The list of properties to display.
 */
export function updatePropertyTable(title, properties) {
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
export function updateEventTable(title, events) {
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
 * Switches the visible content based on the selected tab.
 * @param {string} tabId - The ID of the tab to switch to.
 */
export function switchTab(tabId) {
    // Hide all content containers
    document.getElementById('home-content').classList.add('hidden');
    document.getElementById('metainfo-analyzer-content').classList.add('hidden');
    document.getElementById('component-analyzer-content').classList.add('hidden');
    document.getElementById('cats-sampler-content').classList.add('hidden');
    document.getElementById('cats-sample-maker-content').classList.add('hidden');
    document.getElementById('metainfo-maker-content').classList.add('hidden');

    // Show the selected content container
    const contentId = tabId.replace('-tab', '-content');
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
        contentElement.classList.remove('hidden');
    }

    // Update active tab styles
    document.querySelectorAll('#tab-container a').forEach(tab => {
        tab.classList.remove('bg-gray-200', 'text-blue-600');
        tab.classList.add('text-gray-700');
    });
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('bg-gray-200', 'text-blue-600');
        activeTab.classList.remove('text-gray-700');
    }

    // Load component analyzer data only when its tab is selected for the first time
    if (tabId === 'component-analyzer-tab' && !state.isComponentDataLoaded) {
        loadComponentAnalyzerData();
        state.isComponentDataLoaded = true;
    }

    // Set up metainfo analyzer only when its tab is selected for the first time
    if (tabId === 'metainfo-analyzer-tab' && !state.isMetainfoAnalyzerSetup) {
        state.isMetainfoAnalyzerSetup = true;
    }

    // Set up metainfo maker only when its tab is selected for the first time
    if (tabId === 'metainfo-maker-tab' && !state.isMetainfoMakerSetup) {
        state.isMetainfoMakerSetup = true;
    }
}
