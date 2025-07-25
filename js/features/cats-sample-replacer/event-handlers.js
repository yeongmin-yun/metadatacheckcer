// js/features/cats-sample-replacer/event-handlers.js

import * as DOM from './dom-elements.js';
import * as State from './state.js';
import * as UI from './ui.js';
import * as Logic from './logic.js';

/**
 * Handles the file input change event.
 */
export function handleFileChange(event) {
    const files = event.target.files;
    if (files.length === 0) {
        UI.hideAllUi();
        State.clearLoadedFiles();
        return;
    }

    State.clearLoadedFiles(); // Reset
    const readPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, content: e.target.result });
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    });

    Promise.all(readPromises)
        .then(results => {
            State.setLoadedFiles(results);
            if (State.getLoadedFiles().length === 1) {
                UI.showUiForSingleFile();
                // Trigger extraction automatically for a single file
                DOM.extractScriptBtn.click();
            } else {
                UI.showUiForMultipleFiles(State.getLoadedFiles().length);
            }
            window.showToast(`${State.getLoadedFiles().length}개의 파일을 성공적으로 로드했습니다.`, 'success');
        })
        .catch(error => {
            console.error("File reading error:", error);
            window.showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        });
}

/**
 * Handles the extract script button click event.
 */
export function handleExtractScript() {
    const loadedFiles = State.getLoadedFiles();
    if (loadedFiles.length !== 1) {
        window.showToast('스크립트 추출은 단일 파일 선택 시에만 가능합니다.', 'warning');
        return;
    }
    const file = loadedFiles[0];
    const extractedScript = Logic.extractScriptFromXFDL(file.content);
    const componentName = Logic.extractComponentName(file.name);

    DOM.editableScript.value = extractedScript;
    DOM.originalCompNameInput.value = componentName || 'N/A';
    DOM.newCompNameInput.value = componentName || '';
    DOM.creationDateInput.value = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
}

/**
 * Handles the copy script button click event.
 */
export function handleCopyScript() {
    const modifiedScript = getModifiedScript();
    DOM.editableScript.value = modifiedScript; // Update the textarea with the final script
    navigator.clipboard.writeText(modifiedScript)
        .then(() => window.showToast('수정된 스크립트가 클립보드에 복사되었습니다.', 'success'))
        .catch(() => window.showToast('클립보드 복사에 실패했습니다.', 'error'));
}

/**
 * Handles the download XFDL button click event.
 */
export function handleDownloadXfdl() {
    const loadedFiles = State.getLoadedFiles();
    if (loadedFiles.length !== 1) return;
    const originalContent = loadedFiles[0].content;
    const modifiedScript = getModifiedScript();
    DOM.editableScript.value = modifiedScript; // Update the textarea before generating the file
    const newXfdlContent = Logic.replaceScriptInXFDL(originalContent, modifiedScript);
    
    const newFileName = `A_${DOM.newCompNameInput.value}_all.xfdl`;
    UI.downloadFile(newFileName, newXfdlContent);
}

/**
 * Handles the download all XFDLs button click event.
 */
export function handleDownloadAllXfdl() {
    const loadedFiles = State.getLoadedFiles();
    if (loadedFiles.length < 2) return;
    
    const zip = new JSZip();
    const author = DOM.batchAuthorNameInput.value;
    const date = DOM.batchCreationDateInput.value || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const newCompName = DOM.batchNewCompNameInput.value;

    loadedFiles.forEach(file => {
        let script = Logic.extractScriptFromXFDL(file.content);
        let currentCompName = Logic.extractComponentName(file.name);
        
        script = Logic.modifyScript(script, author, date, currentCompName, newCompName || currentCompName);
        const newContent = Logic.replaceScriptInXFDL(file.content, script);
        const newFileName = `A_${newCompName || currentCompName}_all.xfdl`;
        zip.file(newFileName, newContent);
    });

    zip.generateAsync({ type: "blob" })
        .then(content => {
            UI.downloadFile("CATS_Samples.zip", content);
        })
        .catch(err => {
            console.error("ZIP generation error:", err);
            window.showToast('ZIP 파일 생성 중 오류가 발생했습니다.', 'error');
        });
}


/**
 * Helper function to get the modified script from the UI.
 */
function getModifiedScript() {
    const script = DOM.editableScript.value;
    const author = DOM.authorNameInput.value;
    const date = DOM.creationDateInput.value;
    const originalComp = DOM.originalCompNameInput.value;
    const newComp = DOM.newCompNameInput.value;
    return Logic.modifyScript(script, author, date, originalComp, newComp);
}
