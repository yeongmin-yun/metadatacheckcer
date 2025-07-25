// js/features/test-generator/event-handlers.js
import * as DOM from './dom-elements.js';
import * as State from './state.js';
import * as UI from './ui.js';
import * as Logic from './logic.js';

export async function handleExtractProperties() {
    const xmlFile = DOM.dynamicXmlFileInput.files[0];

    if (!xmlFile) {
        UI.showMessageBox('INFO 파일을 업로드해주세요.');
        return;
    }

    try {
        const xmlContent = await Logic.readFileContent(xmlFile);
        State.setCurrentXmlContent(xmlContent);
        
        let baseName = xmlFile.name.split('.').slice(0, -1).join('.');
        if (baseName.includes('/')) { // Handle cases where path might be included
            baseName = baseName.substring(baseName.lastIndexOf('/') + 1);
        }
        if (baseName.includes('\\')) { // Handle Windows paths
            baseName = baseName.substring(baseName.lastIndexOf('\\') + 1);
        }
        baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        State.setBaseObjectName(baseName);

        const propertyGroups = Logic.parseXmlAndExtractProperties(xmlContent);
        UI.renderPropertyButtons(propertyGroups, handlePropertyButtonClick);

    } catch (error) {
        console.error('Error extracting properties:', error);
        UI.showMessageBox(`속성 추출 중 오류가 발생했습니다: ${error.message}`);
    }
}

export function handlePropertyButtonClick(event) {
    const button = event.target;
    const propertyName = button.dataset.propertyName;
    const edittype = button.dataset.propertyEdittype;
    const readonly = button.dataset.propertyReadonly === 'true';
    const description = button.dataset.propertyDescription;

    if (State.selectedProperties.has(propertyName)) {
        // Deselect
        State.selectedProperties.delete(propertyName);
        button.classList.remove('bg-blue-500', 'text-white');
        button.classList.add('bg-gray-200', 'text-gray-800');

    } else {
        // Select
        const logicSnippet = Logic.generatePropertyLogicSnippet(propertyName, State.baseObjectName, edittype, readonly, description);
        State.selectedProperties.set(propertyName, logicSnippet);
        button.classList.add('bg-blue-500', 'text-white');
        button.classList.remove('bg-gray-200', 'text-gray-800');
    }
    UI.updateOverallTestCodeDisplay();
}

export function handleCopyTestCode() {
    const codeToCopy = DOM.generatedTestCode.textContent;
    if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy).then(() => {
            UI.showMessageBox('테스트 코드가 클립보드에 복사되었습니다!');
        }).catch(err => {
            console.error('Failed to copy code:', err);
            UI.showMessageBox('코드 복사에 실패했습니다.');
        });
    } else {
        UI.showMessageBox('복사할 코드가 없습니다.');
    }
}

export function handleCloseMessageBox() {
    DOM.messageBox.classList.add('hidden');
}
