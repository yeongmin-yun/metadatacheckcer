// js/features/test-generator/logic.js

// 파일 내용을 읽는 비동기 함수
export function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

export function parseXmlAndExtractProperties(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // XML 파싱 오류 확인
    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) {
        throw new Error('INFO 파일 파싱 중 오류가 발생했습니다: ' + errorNode.textContent);
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
    return propertyGroups;
}


// Function to generate a single property's test logic snippet
export function generatePropertyLogicSnippet(propertyName, objName, edittype, readonly, description) {
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
