// js/features/metainfo-maker.js

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const createNewInfoBtn = document.getElementById('createNewInfoBtn');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const infoFileInput = document.getElementById('infoFileInput');
    const generateInfoBtn = document.getElementById('generateInfoBtn');
    const existingInfoFileInput = document.getElementById('existingInfoFileInput');
    const newComponentNameInput = document.getElementById('newComponentNameInput');
    const step1NextBtn = document.getElementById('step1NextBtn');

    // --- Step Containers ---
    const steps = {
        step2: document.getElementById('metainfo-step-2'),
        step3: document.getElementById('metainfo-step-3'),
        step4: document.getElementById('metainfo-step-4'),
    };

    // --- Search and Selection Containers ---
    const containers = {
        properties: document.getElementById('properties-container'),
        controls: document.getElementById('controls-container'),
        statuses: document.getElementById('statuses-container'),
    };
    const searchInputs = {
        properties: document.getElementById('property-search'),
        controls: document.getElementById('control-search'),
        statuses: document.getElementById('status-search'),
    };
    const selectionContainers = {
        PropertyInfo: document.getElementById('selected-properties-container'),
        ControlInfo: document.getElementById('selected-controls-container'),
        StatusInfo: document.getElementById('selected-statuses-container'),
    };

    // --- State Management ---
    let parsedInfoData = null;
    let rawInfoFileContent = null;
    let aggregatedData = { properties: [], controls: [], statuses: [] };
    const userSelections = {
        PropertyInfo: [],
        ControlInfo: [],
        StatusInfo: [],
        CSSInfo: [],
        MethodInfo: [],
        EventHandlerInfo: [],
    };

    // --- Initialization ---
    if (!createNewInfoBtn) return;
    initialize();

    async function initialize() {
        try {
            const response = await fetch('./parsers/json/aggregated_metainfo.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            aggregatedData = await response.json();
            renderAllButtons();
        } catch (error) {
            console.error("Failed to load aggregated metainfo:", error);
            window.showToast('속성/컨트롤/상태 목록을 불러오는 데 실패했습니다.', 'error');
        }

        // --- Event Listeners ---
        createNewInfoBtn.addEventListener('click', handleCreateNew);
        step1NextBtn.addEventListener('click', () => {
            document.getElementById('metainfo-step-1').classList.add('hidden');
            showSteps(3);
        });
        downloadTemplateBtn.addEventListener('click', handleTemplateDownload);
        existingInfoFileInput.addEventListener('change', handleInfoFileUpload);
        infoFileInput.addEventListener('change', handleXlsxFileUpload);
        generateInfoBtn.addEventListener('click', processXlsxAndGenerateInfo);

        for (const key in searchInputs) {
            searchInputs[key].addEventListener('input', (e) => filterButtons(key, e.target.value));
        }
        
        for (const key in selectionContainers) {
            selectionContainers[key].addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON' && event.target.dataset.type) {
                    const type = event.target.dataset.type;
                    const index = parseInt(event.target.dataset.index, 10);
                    handleItemRemoval(type, index);
                }
            });
        }
    }
    
    // --- UI Flow Management ---
    function showSteps(stepToShow) {
        Object.values(steps).forEach(step => step.classList.add('hidden'));
        if (stepToShow >= 2) steps.step2.classList.remove('hidden');
        if (stepToShow >= 3) steps.step3.classList.remove('hidden');
        if (stepToShow >= 4) steps.step4.classList.remove('hidden');
    }

    function setNextButtonState(enabled) {
        step1NextBtn.disabled = !enabled;
        step1NextBtn.classList.toggle('opacity-50', !enabled);
        step1NextBtn.classList.toggle('cursor-not-allowed', !enabled);
    }

    // --- Rendering and Filtering ---

    function renderAllButtons() {
        renderButtons('properties', aggregatedData.properties);
        renderButtons('controls', aggregatedData.controls);
        renderButtons('statuses', aggregatedData.statuses);
    }

    function renderButtons(type, items) {
        const container = containers[type];
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'w-full text-left p-2 text-sm rounded-md bg-white hover:bg-blue-100 border border-gray-200 transition-colors';
            button.textContent = item.name;
            button.dataset.item = JSON.stringify(item);
            button.addEventListener('click', () => handleItemSelection(type, item));
            container.appendChild(button);
        });
    }

    function filterButtons(type, searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredItems = aggregatedData[type].filter(item =>
            item.name.toLowerCase().includes(lowerCaseSearchTerm)
        );
        renderButtons(type, filteredItems);
    }

    function renderSelections() {
        for (const key in selectionContainers) {
            const container = selectionContainers[key];
            if (!container) continue;
            container.innerHTML = '';
            userSelections[key].forEach((item, index) => {
                const tag = document.createElement('div');
                let bgColorClass = 'bg-gray-100 text-gray-800'; // Default for non-property items

                if (key === 'PropertyInfo') {
                    bgColorClass = item.unused === 'true' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                }

                tag.className = `flex justify-between items-center p-2 rounded-md text-sm ${bgColorClass}`;

                let content = `<span class="truncate" title="${item.name}">${item.name}</span>`;
                const controls = document.createElement('div');
                controls.className = 'flex items-center';

                if (key === 'PropertyInfo') {
                    const select = document.createElement('select');
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
                container.appendChild(tag);
            });

            // Add event listeners for the new select and remove buttons
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
        }
    }

    function handleUnusedChange(event) {
        const index = parseInt(event.target.dataset.index, 10);
        const value = event.target.value;
        if (userSelections.PropertyInfo[index]) {
            userSelections.PropertyInfo[index].unused = value;
            window.showToast(`Property '${userSelections.PropertyInfo[index].name}' unused status updated to ${value}.`, 'info');
            renderSelections(); // Re-render to update background color
        }
    }

    // --- Event Handlers ---
    
    function handleCreateNew() {
        existingInfoFileInput.value = '';
        Object.keys(userSelections).forEach(key => userSelections[key] = []);
        parsedInfoData = null;
        rawInfoFileContent = null;
        
        renderSelections();
        window.showToast('빈 템플릿으로 시작합니다. 항목을 추가하세요.', 'info');
        setNextButtonState(true);
    }

    function handleItemSelection(type, item) {
        let targetArrayKey;
        if (type === 'properties') targetArrayKey = 'PropertyInfo';
        else if (type === 'controls') targetArrayKey = 'ControlInfo';
        else if (type === 'statuses') targetArrayKey = 'StatusInfo';
        else return;

        const targetArray = userSelections[targetArrayKey];
        if (!targetArray.some(selected => selected.name === item.name)) {
            const newItem = { ...item, fromFile: false };
            targetArray.push(newItem);
            window.showToast(`'${item.name}'이(가) 템플릿에 추가되었습니다.`, 'success');
            renderSelections();
        } else {
            window.showToast(`'${item.name}'은(는) 이미 추가된 항목입니다.`, 'warning');
        }
    }

    function handleItemRemoval(type, index) {
        if (userSelections[type] && userSelections[type][index]) {
            const removedItem = userSelections[type].splice(index, 1);
            window.showToast(`'${removedItem[0].name}'이(가) 제거되었습니다.`, 'info');
            renderSelections();
        }
    }

    function handleInfoFileUpload(event) {
        Object.keys(userSelections).forEach(key => userSelections[key] = []);
        const file = event.target.files[0];
        if (!file) {
            parsedInfoData = null;
            rawInfoFileContent = null;
            renderSelections();
            setNextButtonState(false);
            return;
        }

        // Extract component name from filename and set it in the input
        const filename = file.name;
        const componentNameMatch = filename.match(/^(.*?)\.info$/);
        if (componentNameMatch && componentNameMatch[1]) {
            newComponentNameInput.value = componentNameMatch[1];
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                rawInfoFileContent = e.target.result;
                parsedInfoData = parseInfoFile(rawInfoFileContent);
                for (const key in userSelections) {
                    if (parsedInfoData[key]) {
                        userSelections[key] = parsedInfoData[key].map(item => ({ ...item, fromFile: true }));
                    }
                }
                renderSelections();
                window.showToast('.info 파일의 내용이 로드되었습니다.', 'success');
                setNextButtonState(true);
            } catch (error) {
                console.error("Error parsing .info file:", error);
                window.showToast(`Info 파일 파싱 오류: ${error.message}`, 'error');
                setNextButtonState(false);
            }
        };
        reader.readAsText(file);
    }

    function handleXlsxFileUpload() {
        generateInfoBtn.disabled = infoFileInput.files.length === 0;
        generateInfoBtn.classList.toggle('opacity-50', infoFileInput.files.length === 0);
        generateInfoBtn.classList.toggle('cursor-not-allowed', infoFileInput.files.length === 0);
    }

    // --- Core Logic ---

    function handleTemplateDownload() {
        const newComponentName = newComponentNameInput.value.trim();
        let dataForXlsx = { ObjectInfo: [] };
        let finalFilename = 'MetaInfo_Template.xlsx';

        if (parsedInfoData && rawInfoFileContent) {
            const originalComponentName = parsedInfoData.ObjectInfo[0]?.shorttypename;
            let contentToParse = rawInfoFileContent;

            if (newComponentName && originalComponentName && originalComponentName !== newComponentName) {
                const replaceRegex = new RegExp(originalComponentName, 'g');
                contentToParse = rawInfoFileContent.replace(replaceRegex, newComponentName);
                finalFilename = `${newComponentName}.info.xlsx`;
                window.showToast(`'${originalComponentName}'이(가) '${newComponentName}'(으)로 대체되었습니다.`, 'info');

                // Update descriptions in userSelections
                for (const key in userSelections) {
                    if (Array.isArray(userSelections[key])) {
                        userSelections[key].forEach(item => {
                            if (item.description) {
                                item.description = item.description.replace(new RegExp(originalComponentName, 'g'), newComponentName);
                            }
                        });
                    }
                }

            } else if (originalComponentName) {
                 finalFilename = `${originalComponentName}.info.xlsx`;
            }
            
            try {
                const tempData = parseInfoFile(contentToParse);
                dataForXlsx.ObjectInfo = tempData.ObjectInfo;
            } catch (error) {
                window.showToast(`파일 처리 오류: ${error.message}`, 'error');
                return;
            }
        } else if (newComponentName) {
            dataForXlsx.ObjectInfo = [{
                id: `nexacro.${newComponentName}`,
                classname: `nexacro.${newComponentName}`,
                shorttypename: newComponentName,
                csstypename: newComponentName.toLowerCase(),
            }];
            finalFilename = `${newComponentName}.info.xlsx`;
        }

        Object.assign(dataForXlsx, userSelections);
        generateXlsxFromData(dataForXlsx, finalFilename);
        window.showToast('XLSX 템플릿 다운로드가 시작됩니다.', 'success');
        showSteps(4);
    }

    function parseInfoFile(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, "application/xml");
        const errorNode = doc.querySelector("parsererror");
        if (errorNode) throw new Error("XML 파싱 오류가 발생했습니다.");

        const meta = {};
        const objectNode = doc.querySelector("Object");
        if (!objectNode) throw new Error("<Object> 태그를 찾을 수 없습니다.");

        const getAttributes = (element) => {
            if (!element) return {};
            const attrs = {};
            for (const attr of element.attributes) attrs[attr.name] = attr.value;
            return attrs;
        };

        const processSection = (sectionName, elementName) => {
            const sectionNode = objectNode.querySelector(sectionName);
            if (!sectionNode) return [];
            return Array.from(sectionNode.querySelectorAll(elementName)).map(getAttributes);
        };
        
        const objectInfoElement = objectNode.querySelector('ObjectInfo');
        const mergedObjectInfo = getAttributes(objectInfoElement);
        mergedObjectInfo.id = objectNode.getAttribute('id');

        meta.ObjectInfo = [mergedObjectInfo];
        meta.PropertyInfo = processSection('PropertyInfo', 'Property');
        meta.CSSInfo = processSection('CSSInfo', 'Property');
        meta.StatusInfo = processSection('StatusInfo', 'Status');
        meta.ControlInfo = processSection('ControlInfo', 'Control');
        meta.MethodInfo = processSection('MethodInfo', 'Method');
        meta.EventHandlerInfo = processSection('EventHandlerInfo', 'EventHandler');

        return meta;
    }

    function generateXlsxFromData(data, filename) {
        const wb = XLSX.utils.book_new();
        const sheetHeaders = getSheetHeaders();

        for (const sheetName in sheetHeaders) {
            const sheetData = data[sheetName] || [];
            const cleanSheetData = sheetData.map(item => {
                const newItem = { ...item };
                delete newItem.fromFile;
                return newItem;
            });

            const jsonData = cleanSheetData.map(row => {
                const newRow = {};
                sheetHeaders[sheetName].forEach(header => {
                    newRow[header] = row[header] !== undefined ? row[header] : "";
                });
                return newRow;
            });
            const ws = XLSX.utils.json_to_sheet(jsonData, { header: sheetHeaders[sheetName] });
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        XLSX.writeFile(wb, filename);
    }

    function getSheetHeaders() {
        return {
            "ObjectInfo": ["id", "finalclass", "inheritance", "classname", "shorttypename", "csstypename", "csscontrolname", "group", "subgroup", "csspseudo", "container", "composite", "tabstop", "cssstyle", "contents", "formats", "contentseditor", "defaultwidth", "defaultheight", "registration", "edittype", "useinitvalue", "popup", "edittypecomponent", "dblclickevent", "requirement", "description"],
            "PropertyInfo": ["name", "group", "subgroup", "refreshinfo", "displayinfo", "edittype", "readonly", "initonly", "hidden", "control", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "enuminfo2", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
            "CSSInfo": ["name", "group", "subgroup", "edittype", "readonly", "initonly", "hidden", "control", "style", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
            "StatusInfo": ["name", "control", "default", "deprecated", "unused", "group"],
            "ControlInfo": ["name", "classname", "unusedstatus", "unusedcontrol", "deprecated", "unused", "group", "subgroup"],
            "MethodInfo": ["name", "group", "async", "usecontextmenu", "deprecated", "unused", "requirement", "description"],
            "EventHandlerInfo": ["name", "group", "deprecated", "unused", "requirement", "description"]
        };
    }

    function processXlsxAndGenerateInfo() {
        const file = infoFileInput.files[0];
        if (!file) {
            window.showToast('먼저 XLSX 파일을 선택해주세요.', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const xmlString = convertWorkbookToInfoXml(workbook);
                const objectInfo = XLSX.utils.sheet_to_json(workbook.Sheets["ObjectInfo"])[0];
                const fileName = objectInfo ? `${objectInfo.shorttypename || 'Component'}.info` : 'Generated.info';
                downloadFile(fileName, xmlString);
                window.showToast('.info 파일이 성공적으로 생성되었습니다.', 'success');
            } catch (error) {
                console.error("Error processing XLSX file:", error);
                window.showToast(`XLSX 처리 중 오류가 발생했습니다: ${error.message}`, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function convertWorkbookToInfoXml(workbook) {
        let xml = `<?xml version="1.0" encoding="utf-8"?>\n<MetaInfo version="2.0">\n`;
        const objectInfoSheet = workbook.Sheets["ObjectInfo"];
        if (!objectInfoSheet) throw new Error("ObjectInfo 시트를 찾을 수 없습니다.");
        const objectInfoData = XLSX.utils.sheet_to_json(objectInfoSheet)[0];
        if (!objectInfoData || !objectInfoData.id) throw new Error("ObjectInfo 시트에 'id' 필드가 포함된 데이터가 필요합니다.");

        xml += `  <Object id="${objectInfoData.id}">\n`;
        
        const generateElements = (sheetName, elementName, parentIndent) => {
            let result = '';
            if (workbook.Sheets[sheetName]) {
                const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                if (sheetData.length > 0) {
                    result += `${' '.repeat(parentIndent + 2)}<${sheetName}>\n`;
                    sheetData.forEach(rowData => {
                        result += `${' '.repeat(parentIndent + 4)}<${elementName}`;
                        for (const key in rowData) {
                            if (rowData[key] !== null && rowData[key] !== undefined) {
                                result += ` ${key}="${String(rowData[key]).replace(/"/g, '&quot;')}"`;
                            }
                        }
                        result += ` />\n`;
                    });
                    result += `${' '.repeat(parentIndent + 2)}</${sheetName}>\n`;
                }
            }
            return result;
        };
        
        const objectInfoElementData = { ...objectInfoData };
        delete objectInfoElementData.id;
        
        xml += `    <ObjectInfo`;
        for(const key in objectInfoElementData) {
            if (objectInfoElementData[key] !== null && objectInfoElementData[key] !== undefined) {
                xml += ` ${key}="${String(objectInfoElementData[key]).replace(/"/g, '&quot;')}"`;
            }
        }
        xml += ` />\n`;

        xml += generateElements('PropertyInfo', 'Property', 4);
        xml += generateElements('CSSInfo', 'Property', 4);
        xml += generateElements('StatusInfo', 'Status', 4);
        xml += generateElements('ControlInfo', 'Control', 4);
        xml += generateElements('MethodInfo', 'Method', 4);
        xml += generateElements('EventHandlerInfo', 'EventHandler', 4);

        xml += `  </Object>\n</MetaInfo>`;
        return xml;
    }

    function downloadFile(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'application/xml'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    if (typeof window.showToast === 'undefined') {
        window.showToast = (message, type = 'info') => console.log(`[${type.toUpperCase()}] ${message}`);
    }
});