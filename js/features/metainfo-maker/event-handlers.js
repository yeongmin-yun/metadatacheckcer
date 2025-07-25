import { dom } from './dom-elements.js';
import { state, setCurrentCustomItemType } from './state.js';
import { showToast } from '../../app/ui-helpers.js';
import { parseInfoFile, downloadFile, getSheetHeaders } from './logic.js';
import { renderSelections, renderAllButtons, filterButtons, showSteps, setNextButtonState, openCustomItemModal } from './ui.js';

export function handleCreateNew() {
    dom.existingInfoFileInput.value = '';
    Object.keys(state.userSelections).forEach(key => state.userSelections[key] = []);
    state.parsedInfoData = null;
    state.rawInfoFileContent = null;
    
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
            state.parsedInfoData = parseInfoFile(state.rawInfoFileContent);
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
    const newComponentName = dom.newComponentNameInput.value.trim();
    let dataForXlsx = { ObjectInfo: [] };
    let finalFilename = 'MetaInfo_Template.xlsx';

    if (state.parsedInfoData && state.rawInfoFileContent) {
        const originalComponentName = state.parsedInfoData.ObjectInfo[0]?.shorttypename;
        let contentToParse = state.rawInfoFileContent;

        if (newComponentName && originalComponentName && originalComponentName !== newComponentName) {
            const replaceRegex = new RegExp(originalComponentName, 'g');
            contentToParse = state.rawInfoFileContent.replace(replaceRegex, newComponentName);
            finalFilename = `${newComponentName}.info.xlsx`;
            showToast(`'${originalComponentName}'이(가) '${newComponentName}'(으)로 대체되었습니다.`, 'info');
        } else if (originalComponentName) {
             finalFilename = `${originalComponentName}.info.xlsx`;
        }
        
        try {
            const tempData = parseInfoFile(contentToParse);
            dataForXlsx.ObjectInfo = tempData.ObjectInfo;
        } catch (error) {
            showToast(`파일 처리 오류: ${error.message}`, 'error');
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

    const processedSelections = JSON.parse(JSON.stringify(state.userSelections));

    if (newComponentName) {
        const originalComponentName = state.parsedInfoData?.ObjectInfo[0]?.shorttypename;

        for (const key in processedSelections) {
            if (Array.isArray(processedSelections[key])) {
                processedSelections[key].forEach(item => {
                    if (item.description) {
                        if (originalComponentName && newComponentName !== originalComponentName) {
                            item.description = item.description.replace(new RegExp(originalComponentName, 'g'), newComponentName);
                        }
                        
                        const words = item.description.split(' ');
                        const firstWord = words[0];
                        if (state.componentNames.has(firstWord)) {
                            words[0] = newComponentName;
                            item.description = words.join(' ');
                        }
                    }
                });
            }
        }
    }

    Object.assign(dataForXlsx, processedSelections);
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
            const xmlString = convertWorkbookToInfoXml(workbook);
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
    const fields = dom.customItemModalFormContainer.querySelectorAll('input, select');
    const newItem = { fromFile: false };

    fields.forEach(field => {
        const key = field.name;
        const value = field.value.trim();
        if (value) {
            newItem[key] = value;
        }
    });

    if (!newItem.name) {
        showToast('Item name is required.', 'error');
        return;
    }

    const targetArray = state.userSelections[state.currentCustomItemType];
    if (targetArray.some(item => item.name === newItem.name)) {
        showToast(`'${newItem.name}' is already in the list.`, 'warning');
        return;
    }
    
    if (state.currentCustomItemType === 'PropertyInfo' || state.currentCustomItemType === 'CSSInfo') {
        if (!newItem.hasOwnProperty('unused')) {
            newItem.unused = 'false';
        }
    }

    targetArray.push(newItem);
    showToast(`Custom item '${newItem.name}' added.`, 'success');
    
    renderSelections();
    dom.customItemModal.classList.add('hidden');
}

export function handleUnusedChange(event) {
    const type = event.target.dataset.type;
    const index = parseInt(event.target.dataset.index, 10);
    const value = event.target.value;
    if (state.userSelections[type][index]) {
        state.userSelections[type][index].unused = value;
        showToast(`Property '${state.userSelections[type][index].name}' unused status updated to ${value}.`, 'info');
        renderSelections();
    }
}
