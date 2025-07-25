// js/features/cats-sample-replacer/logic.js

/**
 * Modifies the script content with new metadata.
 */
export function modifyScript(script, author, date, originalComp, newComp) {
    let modifiedScript = script;

    // --- Author Replacement ---
    if (author) {
        // Try replacing "작성자 : value" format
        if (/\*\s*작성자\s*:/.test(modifiedScript)) {
            modifiedScript = modifiedScript.replace(/(\*\s*작성자\s*:\s*).*/, `$1${author}`);
        } 
        // Else, try replacing "@author value" format
        else if (/@author/.test(modifiedScript)) {
            modifiedScript = modifiedScript.replace(/(@author\s+).*/, `$1${author}`);
        }
    }

    // --- Date Replacement ---
    if (date) {
        // Try replacing "작성일 : value" format
        if (/\*\s*작성일\s*:/.test(modifiedScript)) {
            modifiedScript = modifiedScript.replace(/(\*\s*작성일\s*:\s*).*/, `$1${date}`);
        }
        // Else, try replacing "@creation value" format
        else if (/@creation/.test(modifiedScript)) {
            modifiedScript = modifiedScript.replace(/(@creation\s+).*/, `$1${date}`);
        }
    }

    // --- Component Name Replacement ---
    if (originalComp && newComp && originalComp !== newComp) {
        const compRegex = new RegExp(originalComp, 'g');
        modifiedScript = modifiedScript.replace(compRegex, newComp);
    }

    return modifiedScript;
}

/**
 * Replaces the script content within a full XFDL file content.
 */
export function replaceScriptInXFDL(xfdlContent, newScript) {
    const scriptBlock = `<![CDATA[${newScript}]]>`;
    return xfdlContent.replace(/<Script type="xscript5.1"><!\[CDATA\[[\s\S]*?\]\]><\/Script>/, `<Script type="xscript5.1">${scriptBlock}</Script>`);
}

/**
 * Extracts script content from XFDL.
 */
export function extractScriptFromXFDL(xfdlContent) {
    const scriptRegex = /<Script type="xscript5.1"><!\[CDATA\[([\s\S]*?)\]\]><\/Script>/;
    const match = xfdlContent.match(scriptRegex);
    return match && match[1] ? match[1].trim() : '// 스크립트를 찾을 수 없습니다.';
}

/**
 * Extracts component name from filename.
 */
export function extractComponentName(filename) {
    const pattern = /^A_([^_]+)_.*\.xfdl$/;
    const match = filename.match(pattern);
    return match && match[1] ? match[1] : null;
}
