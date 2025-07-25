import { dom } from './dom-elements.js';
import { state, booleanAttributes, setCurrentCustomItemType } from './state.js';
import { handleItemSelection, handleItemRemoval, handleUnusedChange } from './event-handlers.js';
import { getSheetHeaders } from './logic.js';

export function renderAllButtons() {
    renderButtons('properties', state.aggregatedData.properties);
    renderButtons('cssinfo', state.aggregatedData.CSSInfo);
    renderButtons('controls', state.aggregatedData.controls);
    renderButtons('statuses', state.aggregatedData.statuses);
    renderButtons('methods', state.aggregatedData.methods);
    renderButtons('events', state.aggregatedData.events);
}

export function renderButtons(type, items) {
    const container = dom.containers[type];
    if (!container) return;
    container.innerHTML = '';

    let targetArrayKey;
    if (type === 'properties') targetArrayKey = 'PropertyInfo';
    else if (type === 'cssinfo') targetArrayKey = 'CSSInfo';
    else if (type === 'controls') targetArrayKey = 'ControlInfo';
    else if (type === 'statuses') targetArrayKey = 'StatusInfo';
    else if (type === 'methods') targetArrayKey = 'MethodInfo';
    else if (type === 'events') targetArrayKey = 'EventHandlerInfo';

    items.forEach(item => {
        const button = document.createElement('button');
        const isSelected = state.userSelections[targetArrayKey] && state.userSelections[targetArrayKey].some(selected => selected.name === item.name);
        
        button.className = `w-full text-left p-2 text-sm rounded-md border border-gray-200 transition-colors ${isSelected ? 'bg-yellow-200 hover:bg-yellow-300' : 'bg-white hover:bg-blue-100'}`;
        button.textContent = item.name;
        button.dataset.item = JSON.stringify(item);
        button.addEventListener('click', () => handleItemSelection(type, item));

        if (item.description && dom.tooltip) {
            button.addEventListener('mouseenter', (e) => {
                if (!item.description) return;

                let description = item.description;
                const words = description.split(' ');
                if (words.length > 0 && state.componentNames.has(words[0])) {
                    words[0] = 'Component';
                    description = words.join(' ');
                }
                dom.tooltip.textContent = description;
                
                const rect = e.target.getBoundingClientRect();
                
                dom.tooltip.style.visibility = 'hidden';
                dom.tooltip.classList.remove('hidden');
                
                const tooltipRect = dom.tooltip.getBoundingClientRect();
                
                let top = rect.bottom + 5;
                let left = rect.left;
                
                if (left + tooltipRect.width > window.innerWidth) {
                    left = window.innerWidth - tooltipRect.width - 5;
                }
                if (top + tooltipRect.height > window.innerHeight) {
                    top = rect.top - tooltipRect.height - 5;
                }
                
                dom.tooltip.style.top = `${top}px`;
                dom.tooltip.style.left = `${left}px`;
                dom.tooltip.style.visibility = 'visible';
            });

            button.addEventListener('mouseleave', () => {
                dom.tooltip.classList.add('hidden');
                dom.tooltip.style.visibility = 'hidden';
            });
        }

        container.appendChild(button);
    });
}

export function filterButtons(type, searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const dataKey = type === 'cssinfo' ? 'CSSInfo' : type;
    const filteredItems = state.aggregatedData[dataKey].filter(item =>
        item.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
    renderButtons(type, filteredItems);
}

function createSelectionTag(item, index, key) {
    const tag = document.createElement('div');
    let bgColorClass = 'bg-gray-100 text-gray-800';

    if (key === 'PropertyInfo' || key === 'CSSInfo') {
        bgColorClass = item.unused === 'true' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    }

    tag.className = `flex justify-between items-center p-2 rounded-md text-sm ${bgColorClass}`;

    let content = `<span class="truncate" title="${item.name}">${item.name}</span>`;
    const controls = document.createElement('div');
    controls.className = 'flex items-center';

    if (key === 'PropertyInfo' || key === 'CSSInfo') {
        const select = document.createElement('select');
        select.dataset.type = key;
        select.dataset.index = index;
        select.className = 'unused-select ml-auto mr-2 text-sm border-gray-300 rounded-md';
        select.innerHTML = `
            <option value="true" ${item.unused === 'true' ? 'selected' : ''}>Unused</option>
            <option value="false" ${item.unused !== 'true' ? 'selected' : ''}>Used</option>
        `;
        controls.appendChild(select);
    }

    const removeBtn = document.createElement('button');
    removeBtn.dataset.type = key;
    removeBtn.dataset.index = index;
    removeBtn.className = 'ml-2 text-current hover:text-black font-bold';
    removeBtn.innerHTML = '&times;';
    controls.appendChild(removeBtn);

    tag.innerHTML = content;
    tag.appendChild(controls);
    return tag;
}

export function renderSelections() {
    for (const key in state.userSelections) {
        const fromFileContainer = dom.selectionContainers[key];
        const addedContainer = dom.addedSelectionContainers[key];
        if (!fromFileContainer || !addedContainer) continue;

        fromFileContainer.innerHTML = '';
        addedContainer.innerHTML = '';

        const itemsFromFile = state.userSelections[key].filter(item => item.fromFile);
        const itemsAdded = state.userSelections[key].filter(item => !item.fromFile);

        itemsFromFile.forEach(item => {
            const originalIndex = state.userSelections[key].findIndex(i => i.name === item.name);
            const tag = createSelectionTag(item, originalIndex, key);
            fromFileContainer.appendChild(tag);
        });

        itemsAdded.forEach(item => {
            const originalIndex = state.userSelections[key].findIndex(i => i.name === item.name);
            const tag = createSelectionTag(item, originalIndex, key);
            addedContainer.appendChild(tag);
        });

        const allContainers = [fromFileContainer, addedContainer];
        allContainers.forEach(container => {
            container.querySelectorAll('.unused-select').forEach(select => {
                select.addEventListener('change', handleUnusedChange);
            });
            container.querySelectorAll('button[data-type]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    const index = parseInt(e.currentTarget.dataset.index, 10);
                    handleItemRemoval(type, index);
                });
            });
        });
    }
}

export function openCustomItemModal(type) {
    setCurrentCustomItemType(type);
    dom.customItemModalTitle.textContent = `Add Custom ${type.replace('Info', '')}`;
    
    const headers = getSheetHeaders()[type];
    if (!headers) {
        console.error(`No headers found for type: ${type}`);
        return;
    }

    dom.customItemModalFormContainer.innerHTML = '';

    headers.forEach(headerText => {
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'grid grid-cols-3 gap-4 items-center';

        const label = document.createElement('label');
        label.className = 'text-sm font-medium text-gray-700 col-span-1';
        label.textContent = headerText;
        label.htmlFor = `custom-input-${headerText}`;
        fieldWrapper.appendChild(label);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'col-span-2';
        
        let field;
        if (booleanAttributes.has(headerText)) {
            field = document.createElement('select');
            field.className = 'w-full p-2 pr-8 border border-gray-300 rounded-md text-sm bg-white text-red-500';
            field.innerHTML = `
                <option value="true">true</option>
                <option value="false" selected>false</option>
            `;
            field.addEventListener('change', (e) => {
                if (e.target.value === 'true') {
                    e.target.classList.remove('text-red-500');
                    e.target.classList.add('text-blue-500');
                } else {
                    e.target.classList.remove('text-blue-500');
                    e.target.classList.add('text-red-500');
                }
            });
        } else {
            field = document.createElement('input');
            field.type = 'text';
            field.className = 'w-full p-2 border border-gray-300 rounded-md text-sm';
            field.placeholder = headerText;
        }
        field.id = `custom-input-${headerText}`;
        field.name = headerText;
        
        inputContainer.appendChild(field);
        fieldWrapper.appendChild(inputContainer);
        dom.customItemModalFormContainer.appendChild(fieldWrapper);
    });

    dom.customItemModal.classList.remove('hidden');
}

export function showSteps(stepToShow) {
    Object.values(dom.steps).forEach(step => step.classList.add('hidden'));
    if (stepToShow >= 2) dom.steps.step2.classList.remove('hidden');
    if (stepToShow >= 3) dom.steps.step3.classList.remove('hidden');
    if (stepToShow >= 4) dom.steps.step4.classList.remove('hidden');
}

export function setNextButtonState(enabled) {
    dom.step1NextBtn.disabled = !enabled;
    dom.step1NextBtn.classList.toggle('opacity-50', !enabled);
    dom.step1NextBtn.classList.toggle('cursor-not-allowed', !enabled);
}
