// js/features/test-generator/index.js

import * as DOM from './dom-elements.js';
import * as Handlers from './event-handlers.js';

function initialize() {
    if (!DOM.extractPropertiesBtn) return;

    DOM.extractPropertiesBtn.addEventListener('click', Handlers.handleExtractProperties);
    DOM.copyTestCodeBtn.addEventListener('click', Handlers.handleCopyTestCode);
    DOM.closeMessageBox.addEventListener('click', Handlers.handleCloseMessageBox);
    
    console.log('Test Generator Initialized');
}

document.addEventListener('DOMContentLoaded', initialize);
