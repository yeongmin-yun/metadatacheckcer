// 전역 유틸리티 함수: window 객체에 할당하여 다른 스크립트 파일에서 접근 가능하게 합니다.
/**
 * 메시지 박스를 표시합니다.
 * @param {string} message 표시할 메시지
 */
window.showMessageBox = function(message) {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    if (messageText && messageBox) {
        messageText.textContent = message;
        messageBox.classList.remove('hidden');
    }
};

/**
 * CSV 필드 내 쉼표, 큰따옴표, 줄바꿈을 처리하여 CSV 형식에 맞게 문자열을 감쌉니다.
 * @param {string} value 처리할 문자열
 * @returns {string} CSV 형식에 맞게 처리된 문자열
 */
window.escapeCsvField = function(value) {
    if (value === null || value === undefined) {
        return '';
    }
    let stringValue = String(value);
    // 줄바꿈 문자 제거 (CSV 필드 내 줄바꿈은 일반적으로 큰따옴표로 감싸야 하지만, 여기서는 제거)
    stringValue = stringValue.replace(/\n/g, ' ').replace(/\r/g, '');
    // 필드 내에 쉼표, 큰따옴표, 줄바꿈이 포함되어 있으면 큰따옴표로 감싸고,
    // 큰따옴표는 두 개로 이스케이프합니다.
    if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * CSV 데이터를 파일로 다운로드합니다.
 * @param {string} csvContent 다운로드할 CSV 내용
 * @param {string} fileName 다운로드될 파일명
 */
window.downloadCSV = function(csvContent, fileName) {
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8-sig;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * XML 문자열을 파싱하여 XMLDocument 객체로 반환합니다.
 * @param {string} xmlString 파싱할 XML 문자열
 * @returns {XMLDocument | null} 파싱된 XMLDocument 객체 또는 오류 시 null
 */
window.parseXML = function(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
        window.showMessageBox('XML 파싱 오류: XML 내용이 올바른 형식이 아닙니다.');
        console.error('XML parsing error:', errorNode.textContent);
        return null;
    }
    return xmlDoc;
};

/**
 * 설정 객체를 기반으로 XML 데이터를 추출하고 CSV 파일을 생성하여 다운로드합니다.
 * @param {object} config 설정 객체
 * @param {string} config.xmlString XML 파일 내용
 * @param {string} config.selector CSV로 변환할 노드를 선택하는 CSS 선택자
 * @param {string[]} config.headers CSV 헤더 배열
 * @param {string} config.fileName 다운로드될 파일명
 * @param {Function} [config.rowExtractor] 각 노드에서 데이터를 추출하는 함수 (선택 사항)
 */
window.generateAndDownloadCsv = function(config) {
    const { xmlString, selector, headers, fileName, rowExtractor } = config;

    const xmlDoc = window.parseXML(xmlString);
    if (!xmlDoc) return;

    const nodes = xmlDoc.querySelectorAll(selector);
    if (nodes.length === 0) {
        window.showMessageBox(`XML에서 ${selector} 정보를 찾을 수 없습니다.`);
        return;
    }

    const csvRows = [headers.map(window.escapeCsvField).join(',')];
    nodes.forEach(node => {
        const row = rowExtractor ? rowExtractor(node) : headers.map(header => window.escapeCsvField(node.getAttribute(header) || ''));
        csvRows.push(row.join(','));
    });

    window.downloadCSV(csvRows.join('\n'), fileName);
    window.showMessageBox(`${fileName} 파일이 성공적으로 생성되어 다운로드됩니다.`);
};