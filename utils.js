/**
 * Escapes a field for CSV format by wrapping it in double quotes if it contains a comma, double quote, or newline.
 * Double quotes within the field are escaped by doubling them.
 * @param {string} field - The string to escape.
 * @returns {string} The escaped string.
 */
window.escapeCsvField = function(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

/**
 * Parses an XML string and generates a CSV file for download.
 * @param {object} config - The configuration object.
 * @param {string} config.xmlString - The XML content as a string.
 * @param {string} config.selector - The CSS selector to find the parent nodes for each row.
 * @param {string[]} config.headers - The headers for the CSV file.
 * @param {string} config.fileName - The name of the file to be downloaded.
 * @param {function} [config.rowExtractor] - Optional function to extract data for a row from a node.
 */
window.generateAndDownloadCsv = function(config) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(config.xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            console.error("Error parsing XML:", xmlDoc.getElementsByTagName("parsererror")[0].innerText);
            window.showMessageBox('XML 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.', 'error');
            return;
        }

        const nodes = xmlDoc.querySelectorAll(config.selector);
        if (nodes.length === 0) {
            window.showMessageBox('CSV로 변환할 데이터를 찾을 수 없습니다. INFO 파일의 내용을 확인해주세요.', 'warning');
            return;
        }

        let csvContent = config.headers.join(',') + '\n';

        nodes.forEach(node => {
            let row;
            if (config.rowExtractor) {
                row = config.rowExtractor(node);
            } else {
                // Default extractor if none is provided
                row = config.headers.map(header => window.escapeCsvField(node.getAttribute(header)));
            }
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", config.fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        window.showMessageBox(`${config.fileName} 다운로드가 시작됩니다.`, 'success');
    } catch (error) {
        console.error('Error generating CSV:', error);
        window.showMessageBox('CSV 생성 중 예기치 않은 오류가 발생했습니다.', 'error');
    }
};

/**
 * Displays a message box using the new toast animation system.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of message ('success', 'error', 'warning', 'info').
 */
window.showMessageBox = function(message, type = 'info') {
    window.showToast(message, type);
};