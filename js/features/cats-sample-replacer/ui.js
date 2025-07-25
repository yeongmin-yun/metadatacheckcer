// js/features/cats-sample-replacer/ui.js

import * as DOM from './dom-elements.js';

export const showUiForSingleFile = () => {
    DOM.singleFileActionContainer.style.display = 'flex';
    DOM.scriptOutputContainer.style.display = 'block';
    DOM.batchScriptOutputContainer.style.display = 'none';
};

export const showUiForMultipleFiles = (count) => {
    DOM.singleFileActionContainer.style.display = 'none';
    DOM.scriptOutputContainer.style.display = 'none';
    DOM.batchScriptOutputContainer.style.display = 'block';
    DOM.batchFileCount.textContent = `${count}개의 파일이 선택되었습니다.`;
};

export const hideAllUi = () => {
    DOM.singleFileActionContainer.style.display = 'none';
    DOM.scriptOutputContainer.style.display = 'none';
    DOM.batchScriptOutputContainer.style.display = 'none';
};

/**
 * Triggers the download of a file.
 */
export function downloadFile(filename, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
