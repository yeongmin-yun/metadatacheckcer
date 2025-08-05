import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs";
import { state, booleanAttributes } from './state.js';
import { dom } from './dom-elements.js';
import { showToast } from '../../app/ui-helpers.js';
import { renderSelections, renderAllButtons } from './ui.js';
import { state as globalState } from '../../app/state.js';

export async function loadInitialData() {
    try {
        const version = globalState.currentWorkVersion;
        const aggregatedMetainfoPath = `./parsers/json/${version}/aggregated_metainfo.json`;
        const aggregatedNamesPath = `./parsers/json/${version}/aggregated_component_names.json`;

        const response = await fetch(aggregatedMetainfoPath);
        if (!response.ok) throw new Error('Could not fetch aggregated metainfo.');
        const data = await response.json();
        state.aggregatedData = data;

        const componentNamesResponse = await fetch(aggregatedNamesPath);
        if(!componentNamesResponse.ok) throw new Error('Could not fetch component names.');
        const componentNames = await componentNamesResponse.json();
        state.componentNames = new Set(componentNames);

    } catch (error) {
        console.error("Error loading initial data for Metainfo Maker:", error);
        showToast('초기 데이터 로딩에 실패했습니다.', 'error');
    }
}

export function parseInfoFile(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) throw new Error("XML 파싱 오류가 발생했습니다.");

    const meta = {};
    const objectNode = doc.querySelector("Object");
    if (!objectNode) throw new Error("<Object> 태그를 찾을 수 없습니다.");

    const getAttributes = (element) => {
        if (!element) return {};
        const attrs = {};
        for (const attr of element.attributes) attrs[attr.name] = attr.value;
        return attrs;
    };

    const processSection = (sectionName, elementName) => {
        const sectionNode = objectNode.querySelector(sectionName);
        if (!sectionNode) return [];
        return Array.from(sectionNode.querySelectorAll(elementName)).map(getAttributes);
    };
    
    const objectInfoElement = objectNode.querySelector('ObjectInfo');
    const mergedObjectInfo = getAttributes(objectInfoElement);
    mergedObjectInfo.id = objectNode.getAttribute('id');

    meta.ObjectInfo = [mergedObjectInfo];
    meta.PropertyInfo = processSection('PropertyInfo', 'Property');
    
    const cssInfoNode = objectNode.querySelector('CSSInfo > PropertyInfo');
    if (cssInfoNode) {
        meta.CSSInfo = Array.from(cssInfoNode.querySelectorAll('Property')).map(getAttributes);
    } else {
        meta.CSSInfo = processSection('CSSInfo', 'Property');
    }

    meta.StatusInfo = processSection('StatusInfo', 'Status');
    meta.ControlInfo = processSection('ControlInfo', 'Control');
    
    const methodInfoNode = objectNode.querySelector('MethodInfo');
    if (methodInfoNode) {
        meta.MethodInfo = Array.from(methodInfoNode.querySelectorAll('Method')).map(methodEl => {
            const methodData = getAttributes(methodEl);
            const syntaxEl = methodEl.querySelector('Syntax');
            if (syntaxEl) {
                methodData.syntax_text = syntaxEl.getAttribute('text');
                const returnEl = syntaxEl.querySelector('Return');
                if (returnEl) {
                    methodData.return_type = returnEl.getAttribute('type');
                    methodData.return_description = returnEl.getAttribute('description');
                }
                const argsEl = syntaxEl.querySelector('Arguments');
                if (argsEl) {
                    const args = Array.from(argsEl.querySelectorAll('Argument')).map(getAttributes);
                    methodData.arguments_json = JSON.stringify(args, null, 2);
                }
            }
            return methodData;
        });
    } else {
        meta.MethodInfo = [];
    }

    meta.EventHandlerInfo = processSection('EventHandlerInfo', 'EventHandler');

    const closingTag = '</MetaInfo>';
    const closingTagIndex = xmlString.lastIndexOf(closingTag);
    let trailingContent = '';
    if (closingTagIndex !== -1) {
        trailingContent = xmlString.substring(closingTagIndex + closingTag.length);
    }

    return { meta, trailingContent };
}

export function getSheetHeaders() {
    return {
        "ObjectInfo": ["id", "finalclass", "inheritance", "classname", "shorttypename", "csstypename", "csscontrolname", "group", "subgroup", "csspseudo", "container", "composite", "tabstop", "cssstyle", "contents", "formats", "contentseditor", "defaultwidth", "defaultheight", "registration", "edittype", "useinitvalue", "popup", "edittypecomponent", "dblclickevent", "requirement", "description"],
        "PropertyInfo": ["name", "group", "subgroup", "refreshinfo", "displayinfo", "edittype", "defaultvalue", "readonly", "initonly", "hidden", "control", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "enuminfo2", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
        "CSSInfo": ["name", "group", "subgroup", "edittype", "readonly", "initonly", "hidden", "control", "style", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
        "StatusInfo": ["name", "control", "default", "deprecated", "unused", "group"],
        "ControlInfo": ["name", "classname", "unusedstatus", "unusedcontrol", "deprecated", "unused", "group", "subgroup"],
        "MethodInfo": ["name", "group", "async", "usecontextmenu", "deprecated", "unused", "requirement", "description", "syntax_text", "return_type", "return_description", "arguments_json"],
        "EventHandlerInfo": ["name", "group", "deprecated", "unused", "requirement", "description"]
    };
}

export function generateXlsxFromData(data, filename) {
    const wb = XLSX.utils.book_new();
    const sheetHeaders = getSheetHeaders();

    for (const sheetName in sheetHeaders) {
        const sheetData = data[sheetName] || [];
        const cleanSheetData = sheetData.map(item => {
            const newItem = { ...item };
            delete newItem.fromFile;
            return newItem;
        });

        const jsonData = cleanSheetData.map(row => {
            const newRow = {};
            sheetHeaders[sheetName].forEach(header => {
                newRow[header] = row[header] !== undefined ? row[header] : "";
            });
            return newRow;
        });
        const ws = XLSX.utils.json_to_sheet(jsonData, { header: sheetHeaders[sheetName] });
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, filename);
}

export function convertWorkbookToInfoXml(workbook, trailingContent = '') {
    const attributesToExcludeIfEmpty = ['defaultvalue'];
    const escapeAttr = (value) => {
        if (value === null || value === undefined) return '';
        return String(value).replace(/"/g, '&quot;').replace(/\n/g, '&#xA;');
    };

    let xml = `<?xml version="1.0" encoding="utf-8"?>\n<MetaInfo version="2.0">\n`;
    const objectInfoSheet = workbook.Sheets["ObjectInfo"];
    if (!objectInfoSheet) throw new Error("ObjectInfo 시트를 찾을 수 없습니다.");
    
    const objectInfoDataArray = XLSX.utils.sheet_to_json(objectInfoSheet);
    if (objectInfoDataArray.length === 0) throw new Error("ObjectInfo 시트에 데이터가 없습니다.");
    
    const objectInfoData = objectInfoDataArray[0];
    
    // Final, robust check for the 'id' field's validity before creating the <Object> tag.
    if (!objectInfoData.id || typeof objectInfoData.id !== 'string' || objectInfoData.id.trim() === '') {
        throw new Error("ObjectInfo 시트의 'id' 필드가 비어있거나 유효하지 않습니다.");
    }

    xml += `  <Object id="${escapeAttr(objectInfoData.id)}">\n`;
    
    const generateElements = (sheetName, elementName, parentIndent) => {
        let result = '';
        if (workbook.Sheets[sheetName]) {
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            if (sheetData.length > 0) {
                result += `${' '.repeat(parentIndent + 2)}<${sheetName}>\n`;
                sheetData.forEach(rowData => {
                    result += `${' '.repeat(parentIndent + 4)}<${elementName}`;
                    for (const key in rowData) {
                        const value = rowData[key];
                        if (value === null || value === undefined) continue;
                        if (attributesToExcludeIfEmpty.includes(key) && value === '') continue;
                        result += ` ${key}="${escapeAttr(value)}"`;
                    }
                    result += ` />\n`;
                });
                result += `${' '.repeat(parentIndent + 2)}</${sheetName}>\n`;
            }
        }
        return result;
    };
    
    const objectInfoElementData = { ...objectInfoData };
    delete objectInfoElementData.id;
    
    xml += `    <ObjectInfo`;
    for(const key in objectInfoElementData) {
        if (objectInfoElementData[key] !== null && objectInfoElementData[key] !== undefined) {
            xml += ` ${key}="${escapeAttr(objectInfoElementData[key])}"`;
        }
    }
    xml += ` />\n`;

    xml += generateElements('PropertyInfo', 'Property', 2);

    if (workbook.Sheets['CSSInfo']) {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets['CSSInfo']);
        if (sheetData.length > 0) {
            xml += `    <CSSInfo>\n`;
            xml += `      <PropertyInfo>\n`;
            sheetData.forEach(rowData => {
                xml += `        <Property`;
                for (const key in rowData) {
                    const value = rowData[key];
                    if (value === null || value === undefined) continue;
                    if (attributesToExcludeIfEmpty.includes(key) && value === '') continue;
                    xml += ` ${key}="${escapeAttr(value)}"`;
                }
                xml += ` />\n`;
            });
            xml += `      </PropertyInfo>\n`;
            xml += `    </CSSInfo>\n`;
        }
    }

    xml += generateElements('StatusInfo', 'Status', 2);
    xml += generateElements('ControlInfo', 'Control', 2);

    if (workbook.Sheets['MethodInfo']) {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets['MethodInfo']);
        if (sheetData.length > 0) {
            xml += `    <MethodInfo>\n`;
            sheetData.forEach(rowData => {
                xml += `      <Method`;
                for (const key in rowData) {
                    if (key !== 'syntax_text' && key !== 'return_type' && key !== 'return_description' && key !== 'arguments_json') {
                        const value = rowData[key];
                        if (value !== null && value !== undefined) {
                             xml += ` ${key}="${escapeAttr(value)}"`;
                        }
                    }
                }
                xml += `>\n`;

                if (rowData.syntax_text) {
                    xml += `        <Syntax text="${escapeAttr(rowData.syntax_text)}">\n`;
                    xml += `          <Return type="${escapeAttr(rowData.return_type || '')}" description="${escapeAttr(rowData.return_description || '')}" />\n`;
                    if (rowData.arguments_json) {
                        try {
                            const args = JSON.parse(rowData.arguments_json);
                            if (Array.isArray(args) && args.length > 0) {
                                xml += `          <Arguments>\n`;
                                args.forEach(arg => {
                                    xml += `            <Argument`;
                                    for (const argKey in arg) {
                                        xml += ` ${argKey}="${escapeAttr(arg[argKey])}"`;
                                    }
                                    xml += ` />\n`;
                                });
                                xml += `          </Arguments>\n`;
                            }
                        } catch (e) {
                            console.error("Error parsing arguments_json:", e);
                        }
                    }
                    xml += `        </Syntax>\n`;
                }
                xml += `      </Method>\n`;
            });
            xml += `    </MethodInfo>\n`;
        }
    }

    xml += generateElements('EventHandlerInfo', 'EventHandler', 2);

    xml += `  </Object>\n</MetaInfo>`;

    xml += trailingContent;
    return xml;
}

export function downloadFile(filename, content) {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'application/xml'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}