import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs";
import { dom } from './dom-elements.js';
import { state, setCurrentCustomItemType } from './state.js';
import { showToast } from '../../app/ui-helpers.js';
import { parseInfoFile, downloadFile, getSheetHeaders, generateXlsxFromData, convertWorkbookToInfoXml } from './logic.js';
import { renderSelections, renderAllButtons, filterButtons, showSteps, setNextButtonState, openCustomItemModal, toggleObjectInfoEditMode } from './ui.js';

export function handleCreateNew() {
    dom.existingInfoFileInput.value = '';
    // Reset all selections, providing a default structure for ObjectInfo
    state.userSelections = {
        ObjectInfo: [{}],
        PropertyInfo: [],
        ControlInfo: [],
        StatusInfo: [],
        CSSInfo: [],
        MethodInfo: [],
        EventHandlerInfo: [],
    };
    state.parsedInfoData = null;
    state.rawInfoFileContent = null;
    state.trailingContent = '';
    
    renderSelections();
    showToast('빈 템플릿으로 시작합니다. 항목을 추가하세요.', 'info');
    setNextButtonState(true);
    
    for (const key in dom.searchInputs) {
        dom.searchInputs[key].value = '';
    }
    renderAllButtons();
}

export function handleItemSelection(type, item) {
    let targetArrayKey;
    if (type === 'properties') targetArrayKey = 'PropertyInfo';
    else if (type === 'cssinfo') targetArrayKey = 'CSSInfo';
    else if (type === 'controls') targetArrayKey = 'ControlInfo';
    else if (type === 'statuses') targetArrayKey = 'StatusInfo';
    else if (type === 'methods') targetArrayKey = 'MethodInfo';
    else if (type === 'events') targetArrayKey = 'EventHandlerInfo';
    else return;

    const targetArray = state.userSelections[targetArrayKey];
    if (!targetArray.some(selected => selected.name === item.name)) {
        const newItem = { ...item, fromFile: false };
        targetArray.push(newItem);
        showToast(`'${item.name}'이(가) 템플릿에 추가되었습니다.`, 'success');
        renderSelections();
        const searchTerm = dom.searchInputs[type].value;
        filterButtons(type, searchTerm);
    } else {
        showToast(`'${item.name}'은(는) 이미 추가된 항목입니다.`, 'warning');
    }
}

export function handleItemRemoval(type, index) {
    if (state.userSelections[type] && state.userSelections[type][index]) {
        const removedItem = state.userSelections[type].splice(index, 1);
        showToast(`'${removedItem[0].name}'이(가) 제거되었습니다.`, 'info');
        renderSelections();

        let searchType;
        if (type === 'PropertyInfo') searchType = 'properties';
        else if (type === 'CSSInfo') searchType = 'cssinfo';
        else if (type === 'ControlInfo') searchType = 'controls';
        else if (type === 'StatusInfo') searchType = 'statuses';
        else if (type === 'MethodInfo') searchType = 'methods';
        else if (type === 'EventHandlerInfo') searchType = 'events';
        
        if (searchType) {
            const searchTerm = dom.searchInputs[searchType].value;
            filterButtons(searchType, searchTerm);
        }
    }
}

export function handleInfoFileUpload(event) {
    Object.keys(state.userSelections).forEach(key => state.userSelections[key] = []);
    const file = event.target.files[0];
    if (!file) {
        state.parsedInfoData = null;
        state.rawInfoFileContent = null;
        state.trailingContent = ''; // Reset trailing content
        renderSelections();
        setNextButtonState(false);
        return;
    }

    const filename = file.name;
    const componentNameMatch = filename.match(/^(.*?)\.info$/);
    if (componentNameMatch && componentNameMatch[1]) {
        dom.newComponentNameInput.value = componentNameMatch[1];
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            state.rawInfoFileContent = e.target.result;
            const { meta, trailingContent } = parseInfoFile(state.rawInfoFileContent);
            state.parsedInfoData = meta;
            state.trailingContent = trailingContent;

            for (const key in state.userSelections) {
                if (state.parsedInfoData[key]) {
                    state.userSelections[key] = state.parsedInfoData[key].map(item => ({ ...item, fromFile: true }));
                }
            }
            renderSelections();
            showToast('.info 파일의 내용이 로드되었습니다.', 'success');
            setNextButtonState(true);

            for (const key in dom.searchInputs) {
                dom.searchInputs[key].value = '';
            }
            renderAllButtons();
        } catch (error) {
            console.error("Error parsing .info file:", error);
            showToast(`Info 파일 파싱 오류: ${error.message}`, 'error');
            setNextButtonState(false);
        }
    };
    reader.readAsText(file);
}

export function handleXlsxFileUpload() {
    dom.generateInfoBtn.disabled = dom.infoFileInput.files.length === 0;
    dom.generateInfoBtn.classList.toggle('opacity-50', dom.infoFileInput.files.length === 0);
    dom.generateInfoBtn.classList.toggle('cursor-not-allowed', dom.infoFileInput.files.length === 0);
}

export function handleTemplateDownload() {
    const objectInfo = (state.userSelections.ObjectInfo && state.userSelections.ObjectInfo[0])
        ? state.userSelections.ObjectInfo[0]
        : {};

    // Strengthen validation: Ensure essential fields exist before download.
    if (!objectInfo.shorttypename || !objectInfo.id) {
        showToast('ObjectInfo의 id와 shorttypename을 먼저 입력해야 합니다.', 'error');
        toggleObjectInfoEditMode(true); // Switch to edit mode to guide the user
        const shortTypeNameInput = document.getElementById('objectinfo-input-shorttypename');
        if(shortTypeNameInput) shortTypeNameInput.focus();
        return;
    }

    const componentName = objectInfo.shorttypename;

    // Auto-populate other essential fields if they are empty
    if (!objectInfo.classname) objectInfo.classname = `nexacro.${componentName}`;
    if (!objectInfo.csstypename) objectInfo.csstypename = componentName.toLowerCase();

    const dataForXlsx = JSON.parse(JSON.stringify(state.userSelections));
    const finalFilename = `${componentName}.info.xlsx`;
    
    generateXlsxFromData(dataForXlsx, finalFilename);
    showToast('XLSX 템플릿 다운로드가 시작됩니다.', 'success');
    showSteps(4);
    dom.steps.step4.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function processXlsxAndGenerateInfo() {
    const file = dom.infoFileInput.files[0];
    if (!file) {
        showToast('먼저 XLSX 파일을 선택해주세요.', 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const xmlString = convertWorkbookToInfoXml(workbook, state.trailingContent);
            const objectInfo = XLSX.utils.sheet_to_json(workbook.Sheets["ObjectInfo"])[0];
            const fileName = objectInfo ? `${objectInfo.shorttypename || 'Component'}.info` : 'Generated.info';
            downloadFile(fileName, xmlString);
            showToast('.info 파일이 성공적으로 생성되었습니다.', 'success');
        } catch (error) {
            console.error("Error processing XLSX file:", error);
            showToast(`XLSX 처리 중 오류가 발생했습니다: ${error.message}`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

export function handleSaveCustomItem() {
    const newItem = { fromFile: false };
    
    if (state.currentCustomItemType === 'MethodInfo') {
        // Handle MethodInfo form
        const form = dom.customItemModalFormContainer;
        const mainFields = form.querySelectorAll('input, select, textarea');
        mainFields.forEach(field => {
            if (field.name && !field.name.startsWith('arg_')) {
                newItem[field.name] = field.value.trim();
            }
        });

        const args = [];
        const argRows = form.querySelectorAll('.argument-row');
        argRows.forEach(row => {
            const arg = {};
            const argFields = row.querySelectorAll('input, textarea');
            argFields.forEach(field => {
                const key = field.name.split('_').pop();
                if (field.type === 'checkbox') {
                    arg[key] = field.checked ? 'true' : 'false';
                } else {
                    arg[key] = field.value.trim();
                }
            });
            args.push(arg);
        });
        newItem.arguments_json = JSON.stringify(args, null, 2);

    } else {
        // Handle generic form
        const fields = dom.customItemModalFormContainer.querySelectorAll('input, select');
        fields.forEach(field => {
            const key = field.name;
            const value = field.value.trim();
            if (value) {
                newItem[key] = value;
            }
        });
    }

    if (!newItem.name) {
        showToast('항목의 이름을 작성해야합니다.', 'error');
        return;
    }

    const targetArray = state.userSelections[state.currentCustomItemType];
    if (targetArray.some(item => item.name === newItem.name)) {
        showToast(`'${newItem.name}' 이미 존재하는 항목입니다..`, 'warning');
        return;
    }
    
    if (state.currentCustomItemType === 'PropertyInfo' || state.currentCustomItemType === 'CSSInfo') {
        if (!newItem.hasOwnProperty('unused')) {
            newItem.unused = 'false';
        }
    }

    targetArray.push(newItem);
    showToast(`작성된 항목: '${newItem.name}' 추가.`, 'success');
    
    renderSelections();
    dom.customItemModal.classList.add('hidden');
}

export function handleUnusedChange(event) {
    const type = event.target.dataset.type;
    const index = parseInt(event.target.dataset.index, 10);
    const value = event.target.value;
    if (state.userSelections[type][index]) {
        state.userSelections[type][index].unused = value;
        showToast(`Property '${state.userSelections[type][index].name}' unused status 업데이트 되었습니다.[${value}].`, 'info');
        renderSelections();
    }
}

export function handleEditObjectInfo() {
    toggleObjectInfoEditMode(true);
}

export function handleSaveObjectInfo() {
    toggleObjectInfoEditMode(false);
    showToast('ObjectInfo가 저장되었습니다.', 'success');
}
