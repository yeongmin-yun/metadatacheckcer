import { state, booleanAttributes } from './state.js';
import { dom } from './dom-elements.js';
import { showToast } from '../../app/ui-helpers.js';
import { renderSelections, renderAllButtons } from './ui.js';

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
    meta.CSSInfo = processSection('CSSInfo', 'Property');
    meta.StatusInfo = processSection('StatusInfo', 'Status');
    meta.ControlInfo = processSection('ControlInfo', 'Control');
    meta.MethodInfo = processSection('MethodInfo', 'Method');
    meta.EventHandlerInfo = processSection('EventHandlerInfo', 'EventHandler');

    return meta;
}

export function getSheetHeaders() {
    return {
        "ObjectInfo": ["id", "finalclass", "inheritance", "classname", "shorttypename", "csstypename", "csscontrolname", "group", "subgroup", "csspseudo", "container", "composite", "tabstop", "cssstyle", "contents", "formats", "contentseditor", "defaultwidth", "defaultheight", "registration", "edittype", "useinitvalue", "popup", "edittypecomponent", "dblclickevent", "requirement", "description"],
        "PropertyInfo": ["name", "group", "subgroup", "refreshinfo", "displayinfo", "edittype", "readonly", "initonly", "hidden", "control", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "enuminfo2", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
        "CSSInfo": ["name", "group", "subgroup", "edittype", "readonly", "initonly", "hidden", "control", "style", "expr", "bind", "deprecated", "unused", "mandatory", "objectinfo", "enuminfo", "unitinfo", "delimiter", "requirement", "description", "csspropertyname", "normalpropertyname", "stringrc", "defaultstringrc"],
        "StatusInfo": ["name", "control", "default", "deprecated", "unused", "group"],
        "ControlInfo": ["name", "classname", "unusedstatus", "unusedcontrol", "deprecated", "unused", "group", "subgroup"],
        "MethodInfo": ["name", "group", "async", "usecontextmenu", "deprecated", "unused", "requirement", "description"],
        "EventHandlerInfo": ["name", "group", "deprecated", "unused", "requirement", "description"]
    };
}

function generateXlsxFromData(data, filename) {
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

function convertWorkbookToInfoXml(workbook) {
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n<MetaInfo version="2.0">\n`;
    const objectInfoSheet = workbook.Sheets["ObjectInfo"];
    if (!objectInfoSheet) throw new Error("ObjectInfo 시트를 찾을 수 없습니다.");
    const objectInfoData = XLSX.utils.sheet_to_json(objectInfoSheet)[0];
    if (!objectInfoData || !objectInfoData.id) throw new Error("ObjectInfo 시트에 'id' 필드가 포함된 데이터가 필요합니다.");

    xml += `  <Object id="${objectInfoData.id}">\n`;
    
    const generateElements = (sheetName, elementName, parentIndent) => {
        let result = '';
        if (workbook.Sheets[sheetName]) {
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            if (sheetData.length > 0) {
                result += `${' '.repeat(parentIndent + 2)}<${sheetName}>\n`;
                sheetData.forEach(rowData => {
                    result += `${' '.repeat(parentIndent + 4)}<${elementName}`;
                    for (const key in rowData) {
                        if (rowData[key] !== null && rowData[key] !== undefined) {
                            result += ` ${key}="${String(rowData[key]).replace(/"/g, '&quot;')}"`;
                        }
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
            xml += ` ${key}="${String(objectInfoElementData[key]).replace(/"/g, '&quot;')}"`;
        }
    }
    xml += ` />\n`;

    xml += generateElements('PropertyInfo', 'Property', 2);
    xml += generateElements('CSSInfo', 'Property', 2);
    xml += generateElements('StatusInfo', 'Status', 2);
    xml += generateElements('ControlInfo', 'Control', 2);
    xml += generateElements('MethodInfo', 'Method', 2);
    xml += generateElements('EventHandlerInfo', 'EventHandler', 2);

    xml += `  </Object>\n</MetaInfo>`;
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
