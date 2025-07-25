// js/features/cats-sampler.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const xfdlFileInput = document.getElementById('xfdlFileInput');
    const extractScriptBtn = document.getElementById('extractScriptBtn');
    
    // Single file UI
    const singleFileActionContainer = document.getElementById('singleFileAction');
    const scriptOutputContainer = document.getElementById('scriptOutput');
    const editableScript = document.getElementById('editableScript');
    const originalCompNameInput = document.getElementById('originalCompNameInput');
    const newCompNameInput = document.getElementById('newCompNameInput');
    const authorNameInput = document.getElementById('authorNameInput');
    const creationDateInput = document.getElementById('creationDateInput');
    const copyScriptBtn = document.getElementById('copyScriptBtn');
    const downloadXfdlBtn = document.getElementById('downloadXfdlBtn');

    // Batch file UI
    const batchScriptOutputContainer = document.getElementById('batchScriptOutput');
    const batchFileCount = document.getElementById('batchFileCount');
    const batchAuthorNameInput = document.getElementById('batchAuthorNameInput');
    const batchCreationDateInput = document.getElementById('batchCreationDateInput');
    const batchNewCompNameInput = document.getElementById('batchNewCompNameInput');
    const downloadAllXfdlBtn = document.getElementById('downloadAllXfdlBtn');

    if (!xfdlFileInput) return;

    // --- State Management ---
    let loadedFiles = []; // To store { name, content } of loaded files

    // --- UI Toggling ---
    const showUiForSingleFile = () => {
        singleFileActionContainer.style.display = 'flex';
        scriptOutputContainer.style.display = 'block';
        batchScriptOutputContainer.style.display = 'none';
    };

    const showUiForMultipleFiles = (count) => {
        singleFileActionContainer.style.display = 'none';
        scriptOutputContainer.style.display = 'none';
        batchScriptOutputContainer.style.display = 'block';
        batchFileCount.textContent = `${count}개의 파일이 선택되었습니다.`;
    };

    const hideAllUi = () => {
        singleFileActionContainer.style.display = 'none';
        scriptOutputContainer.style.display = 'none';
        batchScriptOutputContainer.style.display = 'none';
    };

    hideAllUi(); // Hide all on initial load

    // --- File Handling ---
    xfdlFileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length === 0) {
            hideAllUi();
            loadedFiles = [];
            return;
        }

        loadedFiles = []; // Reset
        const readPromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({ name: file.name, content: e.target.result });
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        });

        Promise.all(readPromises)
            .then(results => {
                loadedFiles = results;
                if (loadedFiles.length === 1) {
                    showUiForSingleFile();
                    // Trigger extraction automatically for a single file
                    extractScriptBtn.click();
                } else {
                    showUiForMultipleFiles(loadedFiles.length);
                }
                window.showToast(`${loadedFiles.length}개의 파일을 성공적으로 로드했습니다.`, 'success');
            })
            .catch(error => {
                console.error("File reading error:", error);
                window.showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
            });
    });

    // --- Single File Actions ---
    extractScriptBtn.addEventListener('click', () => {
        if (loadedFiles.length !== 1) {
            window.showToast('스크립트 추출은 단일 파일 선택 시에만 가능합니다.', 'warning');
            return;
        }
        const file = loadedFiles[0];
        const extractedScript = extractScriptFromXFDL(file.content);
        const componentName = extractComponentName(file.name);

        editableScript.value = extractedScript;
        originalCompNameInput.value = componentName || 'N/A';
        newCompNameInput.value = componentName || '';
        creationDateInput.value = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    });

    copyScriptBtn.addEventListener('click', () => {
        const modifiedScript = getModifiedScript();
        editableScript.value = modifiedScript; // Update the textarea with the final script
        navigator.clipboard.writeText(modifiedScript)
            .then(() => window.showToast('수정된 스크립트가 클립보드에 복사되었습니다.', 'success'))
            .catch(() => window.showToast('클립보드 복사에 실패했습니다.', 'error'));
    });

    downloadXfdlBtn.addEventListener('click', () => {
        if (loadedFiles.length !== 1) return;
        const originalContent = loadedFiles[0].content;
        const modifiedScript = getModifiedScript();
        editableScript.value = modifiedScript; // Update the textarea before generating the file
        const newXfdlContent = replaceScriptInXFDL(originalContent, modifiedScript);
        
        const newFileName = `A_${newCompNameInput.value}_all.xfdl`;
        downloadFile(newFileName, newXfdlContent);
    });

    // --- Batch File Actions ---
    downloadAllXfdlBtn.addEventListener('click', () => {
        if (loadedFiles.length < 2) return;
        
        const zip = new JSZip();
        const author = batchAuthorNameInput.value;
        const date = batchCreationDateInput.value || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const newCompName = batchNewCompNameInput.value;

        loadedFiles.forEach(file => {
            let script = extractScriptFromXFDL(file.content);
            let currentCompName = extractComponentName(file.name);
            
            script = modifyScript(script, author, date, currentCompName, newCompName || currentCompName);
            const newContent = replaceScriptInXFDL(file.content, script);
            const newFileName = `A_${newCompName || currentCompName}_all.xfdl`;
            zip.file(newFileName, newContent);
        });

        zip.generateAsync({ type: "blob" })
            .then(content => {
                downloadFile("CATS_Samples.zip", content);
            })
            .catch(err => {
                console.error("ZIP generation error:", err);
                window.showToast('ZIP 파일 생성 중 오류가 발생했습니다.', 'error');
            });
    });

    // --- Helper Functions ---
    const getModifiedScript = () => {
        const script = editableScript.value;
        const author = authorNameInput.value;
        const date = creationDateInput.value;
        const originalComp = originalCompNameInput.value;
        const newComp = newCompNameInput.value;
        return modifyScript(script, author, date, originalComp, newComp);
    };
});

// --- Core Logic Functions (can be outside DOMContentLoaded) ---

/**
 * Modifies the script content with new metadata.
 */
function modifyScript(script, author, date, originalComp, newComp) {
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
function replaceScriptInXFDL(xfdlContent, newScript) {
    const scriptBlock = `<![CDATA[${newScript}]]>`;
    return xfdlContent.replace(/<Script type="xscript5.1"><!\[CDATA\[[\s\S]*?\]\]><\/Script>/, `<Script type="xscript5.1">${scriptBlock}</Script>`);
}

/**
 * Triggers the download of a file.
 */
function downloadFile(filename, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Extracts script content from XFDL.
 */
function extractScriptFromXFDL(xfdlContent) {
    const scriptRegex = /<Script type="xscript5.1"><!\[CDATA\[([\s\S]*?)\]\]><\/Script>/;
    const match = xfdlContent.match(scriptRegex);
    return match && match[1] ? match[1].trim() : '// 스크립트를 찾을 수 없습니다.';
}

/**
 * Extracts component name from filename.
 */
function extractComponentName(filename) {
    const pattern = /^A_([^_]+)_.*\.xfdl$/;
    const match = filename.match(pattern);
    return match && match[1] ? match[1] : null;
}
