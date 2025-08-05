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
                let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

                if (left < 0) left = 5;
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

export function toggleObjectInfoEditMode(isEditing) {
    dom.objectinfoViewContainer.classList.toggle('hidden', isEditing);
    dom.objectinfoFormContainer.classList.toggle('hidden', !isEditing);
    dom.editObjectInfoBtn.classList.toggle('hidden', isEditing);
    dom.saveObjectInfoBtn.classList.toggle('hidden', !isEditing);

    if (isEditing) {
        renderObjectInfoForm();
    } else {
        renderObjectInfoView();
    }
}

function renderObjectInfoView() {
    const container = dom.objectinfoViewContainer;
    container.innerHTML = '';
    const objectInfoData = (state.userSelections.ObjectInfo && state.userSelections.ObjectInfo[0]) || {};

    for (const key in objectInfoData) {
        if (objectInfoData[key]) {
            const wrapper = document.createElement('div');
            wrapper.className = 'text-sm';
            wrapper.innerHTML = `<strong class="font-medium text-gray-900">${key}:</strong> <span class="text-gray-700">${objectInfoData[key]}</span>`;
            container.appendChild(wrapper);
        }
    }
     if (Object.keys(objectInfoData).length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-full">No ObjectInfo data loaded.</p>';
    }
}

function renderObjectInfoForm() {
    const container = dom.objectinfoFormContainer;
    container.innerHTML = '';
    
    const headers = getSheetHeaders().ObjectInfo;
    const objectInfoData = (state.userSelections.ObjectInfo && state.userSelections.ObjectInfo[0]) || {};

    headers.forEach(header => {
        const wrapper = document.createElement('div');
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.textContent = header;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.name = header;
        input.id = `objectinfo-input-${header}`;
        input.className = 'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
        input.value = objectInfoData[header] || '';
        
        input.addEventListener('input', (e) => {
            if (!state.userSelections.ObjectInfo[0]) {
                state.userSelections.ObjectInfo[0] = {};
            }
            state.userSelections.ObjectInfo[0][header] = e.target.value;
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    });
}

export function renderSelections() {
    renderObjectInfoView(); // Always render the view by default
    for (const key in state.userSelections) {
        if (key === 'ObjectInfo') continue;

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
    dom.customItemModalFormContainer.innerHTML = ''; // Clear previous form

    if (type === 'MethodInfo') {
        buildMethodInfoForm();
    } else {
        buildGenericForm(type);
    }

    dom.customItemModal.classList.remove('hidden');
}

function buildGenericForm(type) {
    const headers = getSheetHeaders()[type];
    if (!headers) {
        console.error(`No headers found for type: ${type}`);
        return;
    }
    headers.forEach(headerText => {
        const field = createFormField(headerText);
        dom.customItemModalFormContainer.appendChild(field);
    });
}

function buildMethodInfoForm() {
    const headers = getSheetHeaders().MethodInfo;
    headers.forEach(headerText => {
        if (headerText !== 'arguments_json') {
            const field = createFormField(headerText, headerText.includes('description') ? 'textarea' : 'input');
            dom.customItemModalFormContainer.appendChild(field);
        }
    });

    // Container for dynamic arguments
    const argsContainer = document.createElement('div');
    argsContainer.id = 'arguments-container';
    argsContainer.className = 'space-y-4 mt-4 p-4 border-t';
    
    const argsTitle = document.createElement('h4');
    argsTitle.className = 'text-md font-semibold text-gray-800';
    argsTitle.textContent = 'Arguments';
    argsContainer.appendChild(argsTitle);

    dom.customItemModalFormContainer.appendChild(argsContainer);

    const addArgBtn = document.createElement('button');
    addArgBtn.type = 'button';
    addArgBtn.textContent = 'Add Argument';
    addArgBtn.className = 'mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm';
    addArgBtn.addEventListener('click', () => addArgumentRow());
    dom.customItemModalFormContainer.appendChild(addArgBtn);
}

function addArgumentRow(arg = {}) {
    const container = document.getElementById('arguments-container');
    const argIndex = container.querySelectorAll('.argument-row').length;
    const argRow = document.createElement('div');
    argRow.className = 'argument-row grid grid-cols-1 gap-2 p-3 border rounded-md bg-gray-50';

    const argFields = {
        name: 'text', type: 'text', in: 'checkbox', out: 'checkbox', 
        option: 'checkbox', variable: 'checkbox', description: 'textarea'
    };

    for (const [key, fieldType] of Object.entries(argFields)) {
        const fieldWrapper = document.createElement('div');
        const label = document.createElement('label');
        label.className = 'text-xs font-medium text-gray-600';
        label.textContent = key;
        
        let field;
        if (fieldType === 'textarea') {
            field = document.createElement('textarea');
            field.rows = 2;
        } else if (fieldType === 'checkbox') {
            field = document.createElement('input');
            field.type = 'checkbox';
            field.checked = arg[key] === 'true' || arg[key] === true;
        } else {
            field = document.createElement('input');
            field.type = 'text';
        }
        
        field.name = `arg_${argIndex}_${key}`;
        field.className = 'w-full p-1 border border-gray-300 rounded-md text-sm';
        if (fieldType !== 'checkbox') {
            field.value = arg[key] || '';
        }

        fieldWrapper.appendChild(label);
        fieldWrapper.appendChild(field);
        argRow.appendChild(fieldWrapper);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'mt-2 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs justify-self-end';
    removeBtn.addEventListener('click', () => argRow.remove());
    argRow.appendChild(removeBtn);

    container.appendChild(argRow);
}


function createFormField(headerText, fieldType = 'input') {
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
        field.className = 'w-full p-2 pr-8 border border-gray-300 rounded-md text-sm bg-white';
        field.innerHTML = `<option value="true">true</option><option value="false" selected>false</option>`;
    } else if (fieldType === 'textarea') {
        field = document.createElement('textarea');
        field.className = 'w-full p-2 border border-gray-300 rounded-md text-sm';
        field.rows = 3;
    } else {
        field = document.createElement('input');
        field.type = 'text';
        field.className = 'w-full p-2 border border-gray-300 rounded-md text-sm';
    }
    field.id = `custom-input-${headerText}`;
    field.name = headerText;
    field.placeholder = headerText;
    
    inputContainer.appendChild(field);
    fieldWrapper.appendChild(inputContainer);
    return fieldWrapper;
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
