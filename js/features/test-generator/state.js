// js/features/test-generator/state.js

export let currentXmlContent = '';
export let baseObjectName = 'Component'; // Default value
export const selectedProperties = new Map(); // Stores propertyName -> generatedLogicSnippet

export function setCurrentXmlContent(content) {
    currentXmlContent = content;
}

export function setBaseObjectName(name) {
    baseObjectName = name;
}
