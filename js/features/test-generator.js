document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const extractPropertiesBtn = document.getElementById('extractPropertiesBtn');
    const dynamicXmlFileInput = document.getElementById('dynamicXmlFileInput');
    const propertyListContainer = document.getElementById('propertyListContainer');
    const propertyButtonsDiv = document.getElementById('propertyButtons');
    const dynamicTestCodeOutput = document.getElementById('dynamicTestCodeOutput');
    const generatedTestCode = document.getElementById('generatedTestCode');
    const copyTestCodeBtn = document.getElementById('copyTestCodeBtn');

    let currentXmlContent = '';
    let baseObjectName = 'Component'; // Default value
    let selectedProperties = new Map(); // Stores propertyName -> generatedLogicSnippet

    // 메시지 박스 관련 요소 가져오기
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const closeMessageBox = document.getElementById('closeMessageBox');

    // 메시지 박스 표시 함수
    function showMessageBox(message) {
        messageText.textContent = message;
        messageBox.classList.remove('hidden');
    }

    // 메시지 박스 닫기 이벤트 리스너
    closeMessageBox.addEventListener('click', () => {
        messageBox.classList.add('hidden');
    });

    // 파일 내용을 읽는 비동기 함수
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    // 속성 목록 추출 버튼 클릭 이벤트
    extractPropertiesBtn.addEventListener('click', async () => {
        const xmlFile = dynamicXmlFileInput.files[0];

        if (!xmlFile) {
            showMessageBox('INFO 파일을 업로드해주세요.');
            return;
        }

        try {
            currentXmlContent = await readFileContent(xmlFile);
            // Extract base object name from filename (e.g., "SpinField.info" -> "SpinField")
            baseObjectName = xmlFile.name.split('.').slice(0, -1).join('.');
            if (baseObjectName.includes('/')) { // Handle cases where path might be included
                baseObjectName = baseObjectName.substring(baseObjectName.lastIndexOf('/') + 1);
            }
            if (baseObjectName.includes('\\')) { // Handle Windows paths
                baseObjectName = baseObjectName.substring(baseObjectName.lastIndexOf('\\') + 1);
            }
            // Ensure the first character is uppercase for class naming convention
            baseObjectName = baseObjectName.charAt(0).toUpperCase() + baseObjectName.slice(1);


            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(currentXmlContent, "text/xml"); // FIX: Use valid MIME type

            // XML 파싱 오류 확인
            const errorNode = xmlDoc.querySelector('parsererror');
            if (errorNode) {
                showMessageBox('INFO 파일 파싱 중 오류가 발생했습니다: ' + errorNode.textContent);
                return;
            }

            const propertyGroups = {}; // { "Group Name": [{name: "prop1", group: "Group Name"}, ...] }
            const propertyInfoElements = xmlDoc.querySelectorAll('PropertyInfo');
            propertyInfoElements.forEach(propertyInfo => {
                const properties = propertyInfo.querySelectorAll('Property');
                properties.forEach(prop => {
                    const name = prop.getAttribute('name');
                    const group = prop.getAttribute('group') || '기타'; // Default group if not specified
                    const edittype = prop.getAttribute('edittype');
                    const readonly = prop.getAttribute('readonly') === 'true';
                    const description = prop.getAttribute('description');

                    if (name) {
                        if (!propertyGroups[group]) {
                            propertyGroups[group] = [];
                        }
                        propertyGroups[group].push({ name, group, edittype, readonly, description });
                    }
                });
            });

            // 속성 버튼 동적 생성
            propertyButtonsDiv.innerHTML = ''; // Clear previous buttons
            selectedProperties.clear(); // Clear selected properties on new XML upload
            updateOverallTestCodeDisplay(); // Clear displayed code

            if (Object.keys(propertyGroups).length > 0) {
                for (const groupName in propertyGroups) {
                    const groupSection = document.createElement('div');
                    groupSection.classList.add('mb-4', 'p-3', 'bg-white', 'rounded-lg', 'shadow-sm', 'border', 'border-gray-100');

                    const groupHeader = document.createElement('h4');
                    groupHeader.classList.add('text-lg', 'font-semibold', 'text-gray-700', 'mb-3', 'cursor-pointer', 'flex', 'justify-between', 'items-center');
                    groupHeader.textContent = groupName === '기타' ? '기타 속성' : `${groupName} 속성`; // Localize default group name
                    groupHeader.setAttribute('role', 'button');
                    groupHeader.setAttribute('aria-expanded', 'true'); // Default to expanded
                    groupHeader.setAttribute('tabindex', '0');

                    const toggleIcon = document.createElement('span');
                    toggleIcon.classList.add('ml-2', 'transform', 'transition-transform', 'duration-200');
                    toggleIcon.innerHTML = '&#9660;'; // Down arrow
                    groupHeader.appendChild(toggleIcon);


                    const groupContent = document.createElement('div');
                    groupContent.classList.add('flex', 'flex-wrap', 'gap-2'); // Use flex for buttons

                    // Toggle functionality for group header
                    groupHeader.addEventListener('click', () => {
                        const isHidden = groupContent.classList.toggle('hidden');
                        groupHeader.setAttribute('aria-expanded', !isHidden);
                        toggleIcon.style.transform = isHidden ? 'rotate(-90deg)' : 'rotate(0deg)';
                    });

                    propertyGroups[groupName].forEach(prop => {
                        const button = document.createElement('button');
                        button.textContent = prop.name;
                        button.classList.add('px-4', 'py-2', 'bg-gray-200', 'text-gray-800', 'rounded-md', 'hover:bg-gray-300', 'focus:outline-none', 'focus:ring-2', 'focus:ring-gray-400', 'transition', 'duration-150');
                        button.dataset.propertyName = prop.name; // Store property name in data attribute
                        button.dataset.propertyEdittype = prop.edittype || '';
                        button.dataset.propertyReadonly = prop.readonly;
                        button.dataset.propertyDescription = prop.description || '';

                        button.addEventListener('click', () => {
                            const propertyName = button.dataset.propertyName;
                            const edittype = button.dataset.propertyEdittype;
                            const readonly = button.dataset.propertyReadonly === 'true';
                            const description = button.dataset.propertyDescription;

                            if (selectedProperties.has(propertyName)) {
                                // Deselect
                                selectedProperties.delete(propertyName);
                                button.classList.remove('selected-property-button');
                            } else {
                                // Select
                                const logicSnippet = generatePropertyLogicSnippet(propertyName, baseObjectName, edittype, readonly, description);
                                selectedProperties.set(propertyName, logicSnippet);
                                button.classList.add('selected-property-button');
                            }
                            updateOverallTestCodeDisplay();
                        });
                        groupContent.appendChild(button);
                    });

                    groupSection.appendChild(groupHeader);
                    groupSection.appendChild(groupContent);
                    propertyButtonsDiv.appendChild(groupSection);
                }
                propertyListContainer.classList.remove('hidden');
            } else {
                showMessageBox('INFO 파일에서 추출할 속성이 없습니다.');
                propertyListContainer.classList.add('hidden');
            }

            // Ensure output area is visible and display initial template
            dynamicTestCodeOutput.classList.remove('hidden');
            updateOverallTestCodeDisplay();
        } catch (error) {
            console.error('Error extracting properties:', error);
            showMessageBox(`속성 추출 중 오류가 발생했습니다: ${error.message}`);
        }
    });

    // Function to generate a single property's test logic snippet
    function generatePropertyLogicSnippet(propertyName, objName, edittype, readonly, description) {
        let logicSnippet = '';
        let exampleValue = '';

        // Determine example value based on edittype
        if (edittype) {
            switch (edittype.toLowerCase()) {
                case 'string':
                    exampleValue = `"Test${propertyName}"`;
                    break;
                case 'number':
                    exampleValue = '123';
                    break;
                case 'boolean':
                    exampleValue = 'true';
                    break;
                case 'enum':
                    exampleValue = `"VALUE_EXAMPLE"`; // Placeholder for enum
                    break;
                default:
                    exampleValue = `/* 적절한 값 */`;
            }
        } else {
            // Try to infer from property name if edittype is missing
            if (propertyName.toLowerCase().includes('text') || propertyName.toLowerCase().includes('name')) {
                exampleValue = `"Test${propertyName}"`;
            } else if (propertyName.toLowerCase().includes('value') || propertyName.toLowerCase().includes('count')) {
                exampleValue = '10';
            } else if (propertyName.toLowerCase().includes('enabled') || propertyName.toLowerCase().includes('visible')) {
                exampleValue = 'true';
            } else {
                exampleValue = `/* 적절한 값 */`;
            }
        }

        if (propertyName.startsWith('on_')) { // Event property
            logicSnippet += `    // Event: ${propertyName} - ${description || ''}\n`;
            logicSnippet += `    obj${objName}1.${propertyName} = function(obj, e) {\n`;
            logicSnippet += `        trace("${objName}.${propertyName} 이벤트 발생!");\n`;
            logicSnippet += `        // 여기에 이벤트 핸들러 로직 추가\n`;
            logicSnippet += `    };\n`;
        } else if (edittype && edittype.toLowerCase() === 'method') { // Method property
            logicSnippet += `    // Method: ${propertyName} - ${description || ''}\n`;
            logicSnippet += `    obj${objName}1.${propertyName}(/* 적절한 인자 */);\n`;
            logicSnippet += `    trace("${objName}.${propertyName} 메서드 호출.");\n`;
        } else { // Standard property (set only, as per request)
            logicSnippet += `    // Property: ${propertyName} - ${description || ''}\n`;
            if (!readonly) {
                logicSnippet += `    obj${objName}1.set_${propertyName}(${exampleValue});\n`;
                logicSnippet += `    trace("${objName}.set_${propertyName} 호출. 설정 값: " + ${exampleValue});\n`;
            } else {
                logicSnippet += `    // ${propertyName}은 읽기 전용 속성입니다. 설정할 수 없습니다.\n`;
            }
        }
        return logicSnippet;
    }

    // Function to update the overall test code display
    function updateOverallTestCodeDisplay() {
        const allSetLogic = Array.from(selectedProperties.values()).join('\n');

        const testCodeTemplate = `// Create Object\nvar obj${baseObjectName}1 = new ${baseObjectName}("${baseObjectName}00", 30, 100, 200, 50, null, null);\n\n// Set Logic Here\n${allSetLogic || '// 속성, 메서드, 또는 이벤트를 선택하여 테스트 코드를 생성하세요.'}\n\n// Add Object to Parent Form\nthis.addChild("${baseObjectName}00", obj${baseObjectName}1);\n\n// Insert Object to Parent Form\n// this.insertChild(1, "${baseObjectName}00", obj${baseObjectName}1); // Uncomment if needed\n\n// Show Object\nobj${baseObjectName}1.show();\n`;
        generatedTestCode.textContent = testCodeTemplate;
    }

    // 생성된 코드 복사
    copyTestCodeBtn.addEventListener('click', () => {
        const codeToCopy = generatedTestCode.textContent;
        if (codeToCopy) {
            const textarea = document.createElement('textarea');
            textarea.value = codeToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showMessageBox('테스트 코드가 클립보드에 복사되었습니다!');
            } catch (err) {
                console.error('Failed to copy code:', err);
                showMessageBox('코드 복사에 실패했습니다.');
            } finally {
                document.body.removeChild(textarea);
            }
        } else {
            showMessageBox('복사할 코드가 없습니다.');
        }
    });
});