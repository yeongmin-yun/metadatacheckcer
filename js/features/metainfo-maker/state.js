export const state = {
    parsedInfoData: null,
    rawInfoFileContent: null,
    aggregatedData: { properties: [], cssinfo: [], controls: [], statuses: [], methods: [], events: [] },
    userSelections: {
        PropertyInfo: [],
        ControlInfo: [],
        StatusInfo: [],
        CSSInfo: [],
        MethodInfo: [],
        EventHandlerInfo: [],
    },
    componentNames: new Set(),
    currentCustomItemType: null,
};

export const booleanAttributes = new Set(['readonly', 'initonly', 'hidden', 'deprecated', 'unused', 'mandatory', 'async', 'usecontextmenu', 'default', 'control', 'expr', 'bind', 'style']);

export function setCurrentCustomItemType(type) {
    state.currentCustomItemType = type;
}
