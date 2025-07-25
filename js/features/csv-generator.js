// Note: This script is self-contained and does not export/import modules.
// It uses a DOMContentLoaded listener to attach its functionality.

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Helper Functions (previously in utils.js) ---

    /**
     * Displays a toast message.
     * @param {string} message - The message to display.
     * @param {string} [type='info'] - The type of message ('success', 'error', 'info').
     */
    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const baseClasses = 'p-4 rounded-lg shadow-lg text-white transition-all duration-300 ease-in-out transform';
        const typeClasses = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            error: 'bg-red-500'
        };
        toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
        toast.textContent = message;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 100);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- CSV Generation Logic (previously in utils.js) ---

    const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const generateAndDownloadCsv = (config) => {
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

    // --- Event Listener Setup ---

    const xmlFileInput = document.getElementById('xmlFileInput');
    const xmlInput = document.getElementById('xmlInput');
    const buttons = [
        document.getElementById('generateCSVEvent'),
        document.getElementById('generateCSVMethod'),
        document.getElementById('generateCSVStatus'),
        document.getElementById('generateCSVControl')
    ];

    const setButtonsDisabled = (disabled) => {
        buttons.forEach(button => {
            if (button) {
                button.disabled = disabled;
                button.classList.toggle('opacity-50', disabled);
                button.classList.toggle('cursor-not-allowed', disabled);
            }
        });
    };

    setButtonsDisabled(true);

    if (xmlFileInput) {
        xmlFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                xmlInput.value = '';
                setButtonsDisabled(true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                xmlInput.value = e.target.result;
                setButtonsDisabled(false);
                showToast('파일이 성공적으로 로드되었습니다.', 'success');
            };
            reader.onerror = () => {
                showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
                xmlInput.value = '';
                setButtonsDisabled(true);
            };
            reader.readAsText(file);
        });
    }

    const csvConfigs = [
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

    csvConfigs.forEach(config => {
        const button = document.getElementById(config.buttonId);
        if (button) {
            button.addEventListener('click', () => {
                const xmlString = xmlInput.value.trim();
                if (!xmlString) {
                    showToast('CSV를 생성하려면 먼저 INFO 파일을 선택해주세요.', 'error');
                    return;
                }
                config.xmlString = xmlString;
                generateAndDownloadCsv(config);
            });
        }
    });
});
