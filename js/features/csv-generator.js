document.addEventListener('DOMContentLoaded', () => {
    const xmlInput = document.getElementById('xmlInput');

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
                    window.showMessageBox('CSV를 생성하려면 XML 내용을 입력해주세요.');
                    return;
                }
                config.xmlString = xmlString;
                window.generateAndDownloadCsv(config);
            });
        }
    });
});