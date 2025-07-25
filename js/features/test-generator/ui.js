// js/features/test-generator/ui.js
import * as DOM from './dom-elements.js';
import * as State from './state.js';

// 메시지 박스 표시 함수
export function showMessageBox(message) {
    DOM.messageText.textContent = message;
    DOM.messageBox.classList.remove('hidden');
}

// Function to update the overall test code display
export function updateOverallTestCodeDisplay() {
    const allSetLogic = Array.from(State.selectedProperties.values()).join('\n');

    const testCodeTemplate = `// Create Object\nvar obj${State.baseObjectName}1 = new ${State.baseObjectName}("${State.baseObjectName}00", 30, 100, 200, 50, null, null);\n\n// Set Logic Here\n${allSetLogic || '// 속성, 메서드, 또는 이벤트를 선택하여 테스트 코드를 생성하세요.'}\n\n// Add Object to Parent Form\nthis.addChild("${State.baseObjectName}00", obj${State.baseObjectName}1);\n\n// Insert Object to Parent Form\n// this.insertChild(1, "${State.baseObjectName}00", obj${State.baseObjectName}1); // Uncomment if needed\n\n// Show Object\nobj${State.baseObjectName}1.show();\n`;
    DOM.generatedTestCode.textContent = testCodeTemplate;
}


export function renderPropertyButtons(propertyGroups, propertyButtonClickHandler) {
    DOM.propertyButtonsDiv.innerHTML = ''; // Clear previous buttons
    State.selectedProperties.clear(); // Clear selected properties on new XML upload
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

                button.addEventListener('click', propertyButtonClickHandler);
                groupContent.appendChild(button);
            });

            groupSection.appendChild(groupHeader);
            groupSection.appendChild(groupContent);
            DOM.propertyButtonsDiv.appendChild(groupSection);
        }
        DOM.propertyListContainer.classList.remove('hidden');
    } else {
        showMessageBox('INFO 파일에서 추출할 속성이 없습니다.');
        DOM.propertyListContainer.classList.add('hidden');
    }

    // Ensure output area is visible and display initial template
    DOM.dynamicTestCodeOutput.classList.remove('hidden');
    updateOverallTestCodeDisplay();
}