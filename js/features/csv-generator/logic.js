// js/features/csv-generator/logic.js
import { showToast } from '../../app/ui-helpers.js';

const escapeCsvField = (field) => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const generateAndDownloadCsv = (config) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(config.xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            console.error("Error parsing XML:", xmlDoc.getElementsByTagName("parsererror")[0].innerText);
            showToast('XML 파싱 중 오류가 발생했습니다. 파일 형식을 확인해주세요.', 'error');
            return;
        }

        const nodes = xmlDoc.querySelectorAll(config.selector);
        if (nodes.length === 0) {
            showToast('CSV로 변환할 데이터를 찾을 수 없습니다. INFO 파일의 내용을 확인해주세요.', 'error');
            return;
        }

        let csvContent = config.headers.map(escapeCsvField).join(',') + '\n';

        nodes.forEach(node => {
            let row;
            if (config.rowExtractor) {
                row = config.rowExtractor(node);
            } else {
                row = config.headers.map(header => escapeCsvField(node.getAttribute(header)));
            }
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", config.fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`${config.fileName} 다운로드가 시작됩니다.`, 'success');
    } catch (error) {
        console.error('Error generating CSV:', error);
        showToast('CSV 생성 중 예기치 않은 오류가 발생했습니다.', 'error');
    }
};


export const csvConfigs = [
    {
        buttonId: 'generateCSVEvent',
        selector: 'EventHandler',
        headers: ['Name', 'Syntax', 'Arguments', 'Return Type', 'Return Description', 'Description'],
        fileName: 'Events_Report.csv',
        rowExtractor: (node) => {
            const name = node.getAttribute('name') || '';
            const description = node.getAttribute('description') || '';
            const syntaxElement = node.querySelector('Syntax');
            const syntaxText = syntaxElement ? syntaxElement.getAttribute('text') || '' : '';
            const returnElement = node.querySelector('Syntax Return');
            const returnType = returnElement ? returnElement.getAttribute('type') || '' : '';
            const returnDescription = returnElement ? returnElement.getAttribute('description') || '' : '';
            const argumentElements = node.querySelectorAll('Syntax Arguments Argument');
            let argumentString = '';
            argumentElements.forEach(arg => {
                const argName = arg.getAttribute('name') || '';
                const argType = arg.getAttribute('type') || '';
                const argDescription = (arg.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
                if (argumentString !== '') argumentString += ' | ';
                argumentString += `${argName}:${argType}:${argDescription}`;
            });
            return [name, syntaxText, argumentString, returnType, returnDescription, description].map(escapeCsvField);
        }
    },
    {
        buttonId: 'generateCSVMethod',
        selector: 'Method',
        headers: ['Name', 'Syntax', 'Arguments', 'Return Type', 'Return Description', 'Description'],
        fileName: 'Methods_Report.csv',
        rowExtractor: (node) => {
            const name = (node.getAttribute('name') || '').replace('-', '');
            const description = (node.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
            const syntaxElement = node.querySelector('Syntax');
            const syntaxText = syntaxElement ? syntaxElement.getAttribute('text') || '' : '';
            const returnElement = node.querySelector('Syntax Return');
            const returnType = returnElement ? returnElement.getAttribute('type') || '' : '';
            const returnDescription = returnElement ? (returnElement.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '') : '';
            const argumentElements = node.querySelectorAll('Syntax Arguments Argument');
            let argumentString = '';
            argumentElements.forEach(arg => {
                const argName = arg.getAttribute('name') || '';
                const argType = arg.getAttribute('type') || '';
                const argDescription = (arg.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
                if (argumentString !== '') argumentString += ' | ';
                argumentString += `${argName}:${argType}:${argDescription}`;
            });
            return [name, syntaxText, argumentString, returnType, returnDescription, description].map(escapeCsvField);
        }
    },
    {
        buttonId: 'generateCSVStatus',
        selector: 'StatusInfo > Status',
        headers: ["name", "control", "default", "deprecated", "unused", "group"],
        fileName: 'Status_Report.csv'
    },
    {
        buttonId: 'generateCSVControl',
        selector: 'ControlInfo > Control',
        headers: ["name", "classname", "unusedstatus", "unusedcontrol", "deprecated", "unused", "group", "subgroup"],
        fileName: 'Control_Report.csv'
    }
];
