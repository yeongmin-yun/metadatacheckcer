document.addEventListener('DOMContentLoaded', () => {
    const xmlFileInput = document.getElementById('xmlFileInput');
    const xmlInput = document.getElementById('xmlInput');
    const buttons = [
        document.getElementById('generateCSVEvent'),
        document.getElementById('generateCSVMethod'),
        document.getElementById('generateCSVStatus'),
        document.getElementById('generateCSVControl')
    ];

    // Disable buttons initially
    const setButtonsDisabled = (disabled) => {
        buttons.forEach(button => {
            if (button) {
                button.disabled = disabled;
                button.classList.toggle('opacity-50', disabled);
                button.classList.toggle('cursor-not-allowed', disabled);
            }
        });
    };

    setButtonsDisabled(true); // Disable on page load

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
                setButtonsDisabled(false); // Enable buttons after file is loaded
                window.showMessageBox('파일이 성공적으로 로드되었습니다. 이제 CSV를 생성할 수 있습니다.', 'success');
            };
            reader.onerror = () => {
                window.showMessageBox('파일을 읽는 중 오류가 발생했습니다.', 'error');
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
                    if (argumentString !== '') {
                        argumentString += ' | ';
                    }
                    argumentString += `${argName}:${argType}:${argDescription}`;
                });
                return [
                    window.escapeCsvField(name),
                    window.escapeCsvField(syntaxText),
                    window.escapeCsvField(argumentString),
                    window.escapeCsvField(returnType),
                    window.escapeCsvField(returnDescription),
                    window.escapeCsvField(description)
                ];
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
                    if (argumentString !== '') {
                        argumentString += ' | ';
                    }
                    argumentString += `${argName}:${argType}:${argDescription}`;
                });
                return [
                    window.escapeCsvField(name),
                    window.escapeCsvField(syntaxText),
                    window.escapeCsvField(argumentString),
                    window.escapeCsvField(returnType),
                    window.escapeCsvField(returnDescription),
                    window.escapeCsvField(description)
                ];
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
                    window.showMessageBox('CSV를 생성하려면 먼저 INFO 파일을 선택해주세요.', 'error');
                    return;
                }
                config.xmlString = xmlString;
                window.generateAndDownloadCsv(config);
            });
        }
    });
});