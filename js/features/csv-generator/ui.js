// js/features/csv-generator/ui.js

import * as DOM from './dom-elements.js';

export const setButtonsDisabled = (disabled) => {
    DOM.buttons.forEach(button => {
        if (button) {
            button.disabled = disabled;
            button.classList.toggle('opacity-50', disabled);
            button.classList.toggle('cursor-not-allowed', disabled);
        }
    });
};
