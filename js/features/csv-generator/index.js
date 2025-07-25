// js/features/csv-generator/index.js

import * as DOM from './dom-elements.js';
import * as Handlers from './event-handlers.js';
import * as UI from './ui.js';
import { csvConfigs } from './logic.js';

function initialize() {
    if (!DOM.xmlFileInput) return;

    UI.setButtonsDisabled(true);

    DOM.xmlFileInput.addEventListener('change', Handlers.handleFileInputChange);

    csvConfigs.forEach(config => {
        const button = document.getElementById(config.buttonId);
        if (button) {
            button.addEventListener('click', Handlers.createCsvGenerationHandler(config));
        }
    });
    
    console.log('CSV Generator Initialized');
}

document.addEventListener('DOMContentLoaded', initialize);
