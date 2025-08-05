export const state = {
    currentWorkVersion: 'WORK800', // Default version
    currentSelectedComponent: null, // To store the currently selected component
    allInheritanceDataRaw: [],
    propertyData: [],
    eventData: [],
    metainfoPropertyData: [],
    allComponentPropertiesData: [],
    metainfoEventData: [],
    allComponentEventsData: [],
    groupedComponents: {},
    isComponentDataLoaded: false,
    isMetainfoAnalyzerSetup: false,
    isMetainfoMakerSetup: false,
    aggregatedComponentNames: [],
};

export function setCurrentWorkVersion(version) {
    state.currentWorkVersion = version;
}
