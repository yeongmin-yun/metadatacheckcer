// js/features/csv-generator/event-handlers.js

import * as DOM from './dom-elements.js';
import * as State from './state.js';
import * as UI from './ui.js';
import * as Logic from './logic.js';
import { showToast } from '../../app/ui-helpers.js';

export function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (!file) {
        DOM.xmlInput.value = '';
        State.setXmlString('');
        UI.setButtonsDisabled(true);
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const xmlString = e.target.result;
        DOM.xmlInput.value = xmlString;
        State.setXmlString(xmlString);
        UI.setButtonsDisabled(false);
        showToast('파일이 성공적으로 로드되었습니다.', 'success');
    };
    reader.onerror = () => {
        showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        DOM.xmlInput.value = '';
        State.setXmlString('');
        UI.setButtonsDisabled(true);
    };
    reader.readAsText(file);
}

export function createCsvGenerationHandler(config) {
    return () => {
        const xmlString = State.getXmlString().trim();
        if (!xmlString) {
            showToast('CSV를 생성하려면 먼저 INFO 파일을 선택해주세요.', 'error');
            return;
        }
        config.xmlString = xmlString;
        Logic.generateAndDownloadCsv(config);
    };
}
