import { dom } from './dom-elements.js';
import { loadInitialData } from './logic.js';
import { renderAllButtons, filterButtons, showSteps, setNextButtonState, openCustomItemModal } from './ui.js';
import { handleCreateNew, handleTemplateDownload, handleInfoFileUpload, handleXlsxFileUpload, processXlsxAndGenerateInfo, handleItemRemoval, handleSaveCustomItem, handleEditObjectInfo, handleSaveObjectInfo } from './event-handlers.js';

function initializeMetainfoMaker() {
    // Initial data loading
    loadInitialData().then(() => {
        renderAllButtons();
    }).catch(error => {
        console.error("Failed to initialize Metainfo Maker:", error);
    });

    // Event Listeners
    dom.createNewInfoBtn.addEventListener('click', handleCreateNew);
    dom.existingInfoFileInput.addEventListener('change', handleInfoFileUpload);
    dom.infoFileInput.addEventListener('change', handleXlsxFileUpload);
    dom.generateInfoBtn.addEventListener('click', processXlsxAndGenerateInfo);
    dom.saveCustomItemBtn.addEventListener('click', handleSaveCustomItem);
    dom.cancelCustomItemBtn.addEventListener('click', () => {
        dom.customItemModal.classList.add('hidden');
    });

    dom.step1NextBtn.addEventListener('click', () => {
        showSteps(2);
        dom.steps.step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    dom.step2NextBtn.addEventListener('click', () => {
        showSteps(3);
        dom.steps.step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Search functionality
    for (const key in dom.searchInputs) {
        dom.searchInputs[key].addEventListener('input', (e) => {
            filterButtons(key, e.target.value);
        });
    }

    // Add event listeners for custom add buttons
    document.querySelectorAll('.custom-add-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            openCustomItemModal(type);
        });
    });

    dom.downloadTemplateBtn.addEventListener('click', handleTemplateDownload);
    dom.editObjectInfoBtn.addEventListener('click', handleEditObjectInfo);
    dom.saveObjectInfoBtn.addEventListener('click', handleSaveObjectInfo);
}

// Initialize the feature
initializeMetainfoMaker();
