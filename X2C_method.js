// X2C_method.js 파일 내용

document.addEventListener('DOMContentLoaded', () => {
    // HTML 요소들을 가져옵니다.
    const xmlInput = document.getElementById('xmlInput');
    const generateCSVMethodBtn = document.getElementById('generateCSVMethod');

    // X2C_event.js에서 전역으로 선언된 유틸리티 함수들을 window 객체를 통해 가져옵니다.
    const showMessageBox = window.showMessageBox;
    const escapeCsvField = window.escapeCsvField;

    /**
     * XML 내용에서 Method 정보를 추출하여 CSV 데이터 형식으로 반환합니다.
     * @param {string} xmlString XML 파일 내용
     * @returns {Array<Array<string>>} CSV로 변환될 메서드 데이터 배열
     */
    function extractXmlMethodsForCsv(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const methodData = [];

        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            showMessageBox('XML 파싱 오류: XML 내용이 올바른 형식이 아닙니다.');
            console.error('XML parsing error for methods:', errorNode.textContent);
            return [];
        }

        const methods = xmlDoc.querySelectorAll('Method');
        methods.forEach(method => {
            const name = (method.getAttribute('name') || '').replace('-', '', 1); // 첫 번째 '-' 제거
            const description = (method.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
            
            let syntaxText = '';
            const syntaxElement = method.querySelector('Syntax');
            if (syntaxElement) {
                syntaxText = syntaxElement.getAttribute('text') || '';
            }

            let returnType = '';
            let returnDescription = '';
            const returnElement = method.querySelector('Syntax Return');
            if (returnElement) {
                returnType = returnElement.getAttribute('type') || '';
                returnDescription = (returnElement.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
            }

            let argumentString = '';
            const argumentElements = method.querySelectorAll('Syntax Arguments Argument');
            argumentElements.forEach(arg => {
                const argName = arg.getAttribute('name') || '';
                const argType = arg.getAttribute('type') || '';
                const argDescription = (arg.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
                if (argumentString !== '') {
                    argumentString += ' | ';
                }
                argumentString += `${argName}:${argType}:${argDescription}`;
            });

            methodData.push([
                escapeCsvField(name),
                escapeCsvField(syntaxText),
                escapeCsvField(argumentString),
                escapeCsvField(returnType),
                escapeCsvField(returnDescription),
                escapeCsvField(description)
            ]);
        });

        return methodData;
    }

    // Method CSV 다운로드 버튼 이벤트 리스너
    if (generateCSVMethodBtn) {
        generateCSVMethodBtn.addEventListener('click', () => {
            const currentXmlContent = xmlInput.value.trim();

            if (!currentXmlContent) {
                showMessageBox('CSV를 생성하려면 XML 내용을 입력해주세요.');
                return;
            }

            const methodData = extractXmlMethodsForCsv(currentXmlContent);
            const csvHeaders = ['Name', 'Syntax', 'Arguments', 'Return Type', 'Return Description', 'Description'];

            // CSV 문자열 생성
            let csvString = '\ufeff' + csvHeaders.map(h => escapeCsvField(h)).join(',') + '\r\n'; // 헤더 추가
            methodData.forEach(row => {
                csvString += row.join(',') + '\r\n'; // 데이터 행 추가
            });

            // Blob 생성 및 다운로드 트리거
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8-sig;' }); // BOM 포함 UTF-8
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'SpinField_Methods_Report.csv'; // 다운로드될 파일명
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessageBox('메서드 CSV 파일이 성공적으로 생성되어 다운로드됩니다.');
        });
    }
});
