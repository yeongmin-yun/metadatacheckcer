// js/features/cats-sample-replacer/index.js

import * as DOM from './dom-elements.js';
import * as Handlers from './event-handlers.js';
import { hideAllUi } from './ui.js';

function initialize() {
    if (!DOM.xfdlFileInput) return;

    // Initial UI state
    hideAllUi();

    // Attach event listeners
    DOM.xfdlFileInput.addEventListener('change', Handlers.handleFileChange);
    DOM.extractScriptBtn.addEventListener('click', Handlers.handleExtractScript);
    DOM.copyScriptBtn.addEventListener('click', Handlers.handleCopyScript);
    DOM.downloadXfdlBtn.addEventListener('click', Handlers.handleDownloadXfdl);
    DOM.downloadAllXfdlBtn.addEventListener('click', Handlers.handleDownloadAllXfdl);
    
    console.log('CATS Sample Replacer Initialized');
}

// Initialize the feature
document.addEventListener('DOMContentLoaded', initialize);
