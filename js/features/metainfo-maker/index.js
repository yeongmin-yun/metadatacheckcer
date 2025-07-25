import { dom } from './dom-elements.js';
import { state } from './state.js';
import { showToast } from '../../app/ui-helpers.js';
import { renderAllButtons, filterButtons, showSteps, openCustomItemModal } from './ui.js';
import { handleCreateNew, handleTemplateDownload, handleInfoFileUpload, handleXlsxFileUpload, processXlsxAndGenerateInfo, handleItemRemoval, handleSaveCustomItem } from './event-handlers.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!dom.createNewInfoBtn) return;
    initialize();
});

async function initialize() {
    try {
        const response = await fetch('./parsers/json/aggregated_metainfo.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const aggregatedData = await response.json();
        state.aggregatedData = aggregatedData;

        const namesResponse = await fetch('./parsers/json/aggregated_component_names.json');
        if (!namesResponse.ok) throw new Error(`HTTP error! status: ${namesResponse.status}`);
        const names = await namesResponse.json();
        state.componentNames = new Set(names);

        renderAllButtons();
    } catch (error) {
        console.error("Failed to load initial data:", error);
        showToast('초기 데이터 로딩에 실패했습니다.', 'error');
    }

    // --- Event Listeners ---
    dom.createNewInfoBtn.addEventListener('click', handleCreateNew);
    dom.step1NextBtn.addEventListener('click', () => {
        document.getElementById('metainfo-step-1').classList.add('hidden');
        showSteps(3);
    });
    dom.downloadTemplateBtn.addEventListener('click', handleTemplateDownload);
    dom.existingInfoFileInput.addEventListener('change', handleInfoFileUpload);
    dom.infoFileInput.addEventListener('change', handleXlsxFileUpload);
    dom.generateInfoBtn.addEventListener('click', processXlsxAndGenerateInfo);

    for (const key in dom.searchInputs) {
        dom.searchInputs[key].addEventListener('input', (e) => filterButtons(key, e.target.value));
    }
    
    for (const key in dom.selectionContainers) {
        dom.selectionContainers[key].addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON' && event.target.dataset.type) {
                const type = event.target.dataset.type;
                const index = parseInt(event.target.dataset.index, 10);
                handleItemRemoval(type, index);
            }
        });
    }

    document.querySelectorAll('.custom-add-btn').forEach(btn => {
        btn.addEventListener('click', () => openCustomItemModal(btn.dataset.type));
    });

    dom.saveCustomItemBtn.addEventListener('click', handleSaveCustomItem);
    dom.cancelCustomItemBtn.addEventListener('click', () => dom.customItemModal.classList.add('hidden'));
}
