// X2C_event.js 파일 내용

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


// DOMContentLoaded 이벤트 리스너는 HTML 파일에서 이 스크립트를 로드할 때 자동으로 실행됩니다.
document.addEventListener('DOMContentLoaded', () => {
    // HTML 요소들을 가져옵니다.
    const xmlInput = document.getElementById('xmlInput');
    const jsInput = document.getElementById('jsInput');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportOutput = document.getElementById('reportOutput');
    const reportContent = document.getElementById('reportContent');
    const messageBox = document.getElementById('messageBox'); // 메시지 박스 요소도 여기서 가져옵니다.
    const closeMessageBox = document.getElementById('closeMessageBox');
    const generateCSVEventBtn = document.getElementById('generateCSVEvent'); 
    
    // 메시지 박스 닫기 이벤트 (전역 함수가 아닌 이 스크립트에서 직접 처리)
    if (closeMessageBox) {
        closeMessageBox.addEventListener('click', () => {
            if (messageBox) {
                messageBox.classList.add('hidden');
            }
        });
    }

    /**
     * XML 내용에서 Method 및 Property 이름을 추출합니다.
     * @param {string} xmlString XML 파일 내용
     * @returns {{methods: Set<string>, properties: Set<string>}} 추출된 이름 Set 객체
     */
    function extractXmlNames(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const methodNames = new Set();
        const propertyNames = new Set();

        // XML 파싱 오류 확인
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            window.showMessageBox('XML 파싱 오류: XML 내용이 올바른 형식이 아닙니다.');
            console.error('XML parsing error:', errorNode.textContent);
            return { methods: new Set(), properties: new Set() }; // 빈 Set 반환
        }

        // Method 이름 추출
        const methods = xmlDoc.querySelectorAll('Method');
        methods.forEach(method => {
            const name = method.getAttribute('name');
            if (name) {
                methodNames.add(name);
            }
        });

        // Property 이름 추출 (<PropertyInfo> 하위)
        const propertiesInPropertyInfo = xmlDoc.querySelectorAll('PropertyInfo Property');
        propertiesInPropertyInfo.forEach(prop => {
            const name = prop.getAttribute('name');
            if (name) {
                propertyNames.add(name);
            }
        });

        // Property 이름 추출 (<CSSInfo> 하위)
        const propertiesInCssInfo = xmlDoc.querySelectorAll('CSSInfo Property');
        propertiesInCssInfo.forEach(prop => {
            const name = prop.getAttribute('name');
            if (name) {
                propertyNames.add(name);
            }
        });

        return { methods: methodNames, properties: propertyNames };
    }

    /**
     * JS 내용에서 특정 패턴의 함수 이름과 속성 이름을 추출합니다.
     * @param {string} jsString JS 파일 내용
     * @returns {{functions: Set<string>, properties: Set<string>}} 추출된 이름 Set 객체
     */
    function extractJsNames(jsString) {
        const functionNames = new Set();
        const propertyNames = new Set(); // 최종적으로 보고서에 포함될 속성 이름

        // _pSpinField.on_FUNCTION_NAME = function 패턴을 찾기 위한 정규식
        const functionRegex = /_pSpinField\.on_([a-zA-Z0-9_]+)\s*=\s*function/g;
        let functionMatch;
        while ((functionMatch = functionRegex.exec(jsString)) !== null) {
            if (functionMatch[1]) {
                functionNames.add(functionMatch[1]);
            }
        }

        // JS 코드에서 속성 사용 패턴을 모두 찾습니다.
        // 이 정규식은 `_pSpinField.`, `this.`, `_p_` 뒤에 오는 속성 이름을 캡처합니다.
        const rawPropertyRegex = /(?:_pSpinField\.|this\.|_p_)([a-zA-Z0-9_]+)/g;
        let propertyMatch;
        const tempExtractedPropertyNames = new Set(); // 임시로 모든 추출된 속성 이름을 저장

        while ((propertyMatch = rawPropertyRegex.exec(jsString)) !== null) {
            if (propertyMatch[1]) {
                tempExtractedPropertyNames.add(propertyMatch[1]);
            }
        }

        // 이제 임시 추출된 속성 이름 중에서 "_p_"로 시작하는 것만 필터링하고,
        // 필터링된 이름에서 "_p_" 접두사를 제거하여 최종 propertyNames에 추가합니다.
        tempExtractedPropertyNames.forEach(rawPropName => {
            if (rawPropName.startsWith('_p_')) {
                // "_p_" 패턴을 갖는 변수이므로 보고서에 포함합니다.
                // XML 속성 이름과 비교하기 위해 "_p_" 접두사를 제거합니다.
                propertyNames.add(rawPropName.substring(3));
            }
            // "_p_" 패턴을 갖지 않는 변수 (예: 'value', 'autoselect')는
            // 사용자 요청에 따라 propertyNames에 추가하지 않습니다.
        });

        return { functions: functionNames, properties: propertyNames };
    }

    /**
     * XML 내용에서 EventHandler 정보를 추출하여 CSV 데이터 형식으로 반환합니다.
     * @param {string} xmlString XML 파일 내용
     * @returns {Array<Array<string>>} CSV로 변환될 이벤트 데이터 배열
     */
    function extractXmlEventsForCsv(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const eventData = [];

        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            window.showMessageBox('XML 파싱 오류: XML 내용이 올바른 형식이 아닙니다.');
            console.error('XML parsing error for events:', errorNode.textContent);
            return [];
        }

        const eventHandlers = xmlDoc.querySelectorAll('EventHandler');
        eventHandlers.forEach(handler => {
            const name = handler.getAttribute('name') || '';
            const description = handler.getAttribute('description') || '';
            
            let syntaxText = '';
            const syntaxElement = handler.querySelector('Syntax');
            if (syntaxElement) {
                syntaxText = syntaxElement.getAttribute('text') || '';
            }

            let returnType = '';
            let returnDescription = '';
            const returnElement = handler.querySelector('Syntax Return');
            if (returnElement) {
                returnType = returnElement.getAttribute('type') || '';
                returnDescription = returnElement.getAttribute('description') || '';
            }

            let argumentString = '';
            const argumentElements = handler.querySelectorAll('Syntax Arguments Argument');
            argumentElements.forEach(arg => {
                const argName = arg.getAttribute('name') || '';
                const argType = arg.getAttribute('type') || '';
                const argDescription = (arg.getAttribute('description') || '').replace(/\n/g, ' ').replace(/\r/g, '');
                if (argumentString !== '') {
                    argumentString += ' | ';
                }
                argumentString += `${argName}:${argType}:${argDescription}`;
            });

            eventData.push([
                window.escapeCsvField(name),
                window.escapeCsvField(syntaxText),
                window.escapeCsvField(argumentString),
                window.escapeCsvField(returnType),
                window.escapeCsvField(returnDescription),
                window.escapeCsvField(description)
            ]);
        });

        return eventData;
    }


    /**
     * 보고서를 생성하고 결과를 표시합니다.
     */
    generateReportBtn.addEventListener('click', () => {
        const currentXmlContent = xmlInput.value.trim();
        const currentJsContent = jsInput.value.trim();

        if (!currentXmlContent || !currentJsContent) {
            window.showMessageBox('XML 내용과 JS 내용을 모두 입력해주세요.');
            return;
        }

        const xmlData = extractXmlNames(currentXmlContent);
        const jsData = extractJsNames(currentJsContent);

        const xmlMethodNames = xmlData.methods;
        const xmlPropertyNames = xmlData.properties;
        const jsFunctionNames = jsData.functions;
        const jsPropertyNames = jsData.properties;

        // 함수 비교 결과
        const matchedFunctions = new Set();
        const jsOnlyFunctions = new Set();
        const xmlOnlyFunctions = new Set();

        xmlMethodNames.forEach(xmlName => {
            if (jsFunctionNames.has(xmlName)) {
                matchedFunctions.add(xmlName);
            } else {
                xmlOnlyFunctions.add(xmlName);
            }
        });
        jsFunctionNames.forEach(jsName => {
            if (!xmlMethodNames.has(jsName)) {
                jsOnlyFunctions.add(jsName);
            }
        });

        // 속성 비교 결과
        const matchedProperties = new Set();
        const jsOnlyProperties = new Set();
        const xmlOnlyProperties = new Set();

        xmlPropertyNames.forEach(xmlName => {
            if (jsPropertyNames.has(xmlName)) {
                matchedProperties.add(xmlName);
            } else {
                xmlOnlyProperties.add(xmlName);
            }
        });
        jsPropertyNames.forEach(jsName => {
            if (!xmlPropertyNames.has(jsName)) {
                jsOnlyProperties.add(jsName);
            }
        });


        // 결과 HTML 생성
        let reportHtml = '';

        // 함수 비교 섹션
        reportHtml += `<h2 class="text-3xl font-bold text-gray-800 text-center mb-6 mt-8">함수 비교 결과</h2>`;
        if (matchedFunctions.size > 0) {
            reportHtml += `
                <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-green-800 mb-2">✅ 일치하는 함수 (${matchedFunctions.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(matchedFunctions).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">일치하는 함수 없음</h3>
                    <p class="text-gray-700">XML과 JS 파일에서 일치하는 함수를 찾지 못했습니다.</p>
                </div>
            `;
        }

        if (jsOnlyFunctions.size > 0) {
            reportHtml += `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-yellow-800 mb-2">⚠️ JS 파일에만 있는 함수 (${jsOnlyFunctions.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(jsOnlyFunctions).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">JS 파일에만 있는 함수 없음</h3>
                </div>
            `;
        }

        if (xmlOnlyFunctions.size > 0) {
            reportHtml += `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-red-800 mb-2">❌ XML 파일에만 있는 함수 (${xmlOnlyFunctions.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(xmlOnlyFunctions).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">XML 파일에만 있는 함수 없음</h3>
                </div>
            `;
        }

        // 속성 비교 섹션
        reportHtml += `<h2 class="text-3xl font-bold text-gray-800 text-center mb-6 mt-10">속성 비교 결과</h2>`;
        if (matchedProperties.size > 0) {
            reportHtml += `
                <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-green-800 mb-2">✅ 일치하는 속성 (${matchedProperties.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(matchedProperties).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">일치하는 속성 없음</h3>
                    <p class="text-gray-700">XML과 JS 파일에서 일치하는 속성을 찾지 못했습니다.</p>
                </div>
            `;
        }

        if (jsOnlyProperties.size > 0) {
            reportHtml += `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-yellow-800 mb-2">⚠️ JS 파일에만 있는 속성 (${jsOnlyProperties.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(jsOnlyProperties).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">JS 파일에만 있는 속성 없음</h3>
                </div>
            `;
        }

        if (xmlOnlyProperties.size > 0) {
            reportHtml += `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-red-800 mb-2">❌ XML 파일에만 있는 속성 (${xmlOnlyProperties.size}개)</h3>
                    <ul class="list-disc list-inside text-gray-700">
                        ${Array.from(xmlOnlyProperties).sort().map(name => `<li>${name}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            reportHtml += `
                <div class="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-md">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">XML 파일에만 있는 속성 없음</h3>
                </div>
            `;
        }

        reportContent.innerHTML = reportHtml;
        reportOutput.classList.remove('hidden'); // 보고서 결과 섹션 표시
    });

    // Event CSV 다운로드 버튼 이벤트 리스너
    if (generateCSVEventBtn) { // 버튼이 존재하는지 확인
        generateCSVEventBtn.addEventListener('click', () => {
            const currentXmlContent = xmlInput.value.trim();

            if (!currentXmlContent) {
                window.showMessageBox('CSV를 생성하려면 XML 내용을 입력해주세요.');
                return;
            }

            const eventData = extractXmlEventsForCsv(currentXmlContent);
            const csvHeaders = ['Name', 'Syntax', 'Arguments', 'Return Type', 'Return Description', 'Description'];
            
            // CSV 문자열 생성
            // BOM을 포함하는 UTF-8 인코딩을 위해 `\ufeff` (BOM)을 추가합니다.
            let csvString = '\ufeff' + csvHeaders.map(h => window.escapeCsvField(h)).join(',') + '\r\n'; // 헤더 추가
            eventData.forEach(row => {
                csvString += row.join(',') + '\r\n'; // 데이터 행 추가
            });

            // Blob 생성 및 다운로드 트리거
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8-sig;' }); // BOM 포함 UTF-8
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'SpinField_Events_Report.csv'; // 다운로드될 파일명
            document.body.appendChild(a); // DOM에 추가 (일부 브라우저에서 필요)
            a.click(); // 클릭 이벤트 트리거
            document.body.removeChild(a); // DOM에서 제거
            URL.revokeObjectURL(url); // URL 객체 해제

            window.showMessageBox('이벤트 CSV 파일이 성공적으로 생성되어 다운로드됩니다.');
        });
    }
});
