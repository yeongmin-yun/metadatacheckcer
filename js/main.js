        document.getElementById('xmlFileInput').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const xmlContent = e.target.result;
                    document.getElementById('xmlInput').value = xmlContent;
                    showMessage(`'${file.name}' 파일이 성공적으로 로드되었습니다.`);
                };
                reader.onerror = function() {
                    showMessage('파일을 읽는 중 오류가 발생했습니다.');
                }
                reader.readAsText(file);
            }
        });

        // CATS 샘플링 코드 생성 탭 이벤트 리스너
        const xfdlFileInput = document.getElementById('xfdlFileInput');
        const extractScriptBtn = document.getElementById('extractScriptBtn');
        
        // 단일 파일 UI
        const singleFileAction = document.getElementById('singleFileAction');
        const scriptOutput = document.getElementById('scriptOutput');
        const copyScriptBtn = document.getElementById('copyScriptBtn');
        const downloadXfdlBtn = document.getElementById('downloadXfdlBtn');
        const authorNameInput = document.getElementById('authorNameInput');
        const creationDateInput = document.getElementById('creationDateInput');
        const originalCompNameInput = document.getElementById('originalCompNameInput');
        const newCompNameInput = document.getElementById('newCompNameInput');
        const editableScript = document.getElementById('editableScript');

        // 다중 파일 UI
        const batchScriptOutput = document.getElementById('batchScriptOutput');
        const batchFileCount = document.getElementById('batchFileCount');
        const batchAuthorNameInput = document.getElementById('batchAuthorNameInput');
        const batchCreationDateInput = document.getElementById('batchCreationDateInput');
        const batchNewCompNameInput = document.getElementById('batchNewCompNameInput');
        const downloadAllXfdlBtn = document.getElementById('downloadAllXfdlBtn');

        let loadedFiles = []; // { name, content, componentName }

        // 오늘 날짜를 YYYY.MM.DD 형식으로 반환하는 함수
        function getTodaysDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}.${month}.${day}`;
        }

        xfdlFileInput.addEventListener('change', function(event) {
            const files = event.target.files;
            if (!files.length) return;

            // UI 초기화
            scriptOutput.classList.add('hidden');
            batchScriptOutput.classList.add('hidden');
            singleFileAction.classList.add('hidden');
            loadedFiles = [];

            if (files.length === 1) {
                // 단일 파일 처리
                singleFileAction.classList.remove('hidden');
                handleSingleFile(files[0]);
            } else {
                // 다중 파일 처리
                batchScriptOutput.classList.remove('hidden');
                handleMultipleFiles(files);
            }
        });

        function handleSingleFile(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const componentName = extractComponentName(file.name);
                loadedFiles.push({
                    name: file.name,
                    content: e.target.result,
                    componentName: componentName
                });
                
                if (componentName) {
                    originalCompNameInput.value = componentName;
                    newCompNameInput.value = componentName;
                } else {
                    originalCompNameInput.value = '컴포넌트명을 찾을 수 없습니다.';
                    newCompNameInput.value = '';
                }
                showMessage(`'${file.name}' 파일이 성공적으로 로드되었습니다.`);
            };
            reader.onerror = () => showMessage('파일을 읽는 중 오류가 발생했습니다.');
            reader.readAsText(file, "UTF-8");
        }

        function handleMultipleFiles(files) {
            batchFileCount.textContent = `${files.length}개의 파일이 선택되었습니다.`;
            const filePromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        loadedFiles.push({
                            name: file.name,
                            content: e.target.result,
                            componentName: extractComponentName(file.name)
                        });
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsText(file, "UTF-8");
                });
            });

            Promise.all(filePromises)
                .then(() => showMessage(`${files.length}개의 파일이 모두 로드되었습니다.`))
                .catch(() => showMessage('일부 파일을 읽는 중 오류가 발생했습니다.'));
        }

        extractScriptBtn.addEventListener('click', function() {
            if (loadedFiles.length !== 1) {
                showMessage('먼저 단일 XFDL 파일을 선택하세요.');
                return;
            }
            const script = extractScriptFromXFDL(loadedFiles[0].content);
            editableScript.value = script;
            scriptOutput.classList.remove('hidden');
            showMessage('스크립트 추출이 완료되었습니다.');
        });

        function getModifiedScript(text, author, date, originalComp, newComp) {
            let scriptToModify = text;
            const finalDate = date || getTodaysDate();

            // --- Author and Date Replacement ---
            const complexPatternRegex = /(^\s*\*\s+)(\d{4}\.\d{2}\.\d{2})(\s+)([^\s]+)(\s+.*최초 작성.*)/m;
            const simpleAuthorRegex = /(^\s*\*\s*작성자\s*:\s*).*/m;
            const simpleDateRegex = /(^\s*\*\s*작성일\s*:\s*).*/m;

            if (complexPatternRegex.test(scriptToModify)) {
                // 복잡한 패턴 처리: *   2024.02.26   김재희         최초 작성
                scriptToModify = scriptToModify.replace(complexPatternRegex, (match, p1, p2, p3, p4, p5) => {
                    const newAuthor = author || p4; // 새 작성자가 없으면 기존 작성자 유지
                    return `${p1}${finalDate}${p3}${newAuthor}${p5}`;
                });
            } else {
                // 간단한 패턴 처리 (폴백)
                if (author && simpleAuthorRegex.test(scriptToModify)) {
                    scriptToModify = scriptToModify.replace(simpleAuthorRegex, `$1${author}`);
                }
                if (simpleDateRegex.test(scriptToModify)) {
                    scriptToModify = scriptToModify.replace(simpleDateRegex, `$1${finalDate}`);
                }
            }

            // --- Component Name Replacement (Case-Insensitive) ---
            if (originalComp && newComp && originalComp.toLowerCase() !== newComp.toLowerCase()) {
                const compNameRegex = new RegExp(originalComp, 'gi'); // 'gi' 플래그로 대소문자 무시
                scriptToModify = scriptToModify.replace(compNameRegex, newComp);
            }
            
            return scriptToModify;
        }

        copyScriptBtn.addEventListener('click', function() {
            if (!editableScript.value) {
                showMessage('복사할 스크립트가 없습니다.');
                return;
            }
            const modifiedScript = getModifiedScript(
                editableScript.value,
                authorNameInput.value,
                creationDateInput.value,
                originalCompNameInput.value,
                newCompNameInput.value
            );
            navigator.clipboard.writeText(modifiedScript)
                .then(() => {
                    showMessage('수정된 스크립트가 클립보드에 복사되었습니다.');
                    editableScript.value = modifiedScript;
                })
                .catch(() => showMessage('클립보드 복사에 실패했습니다.'));
        });

        downloadXfdlBtn.addEventListener('click', function() {
            if (loadedFiles.length !== 1) {
                showMessage('먼저 단일 XFDL 파일을 로드하세요.');
                return;
            }
            const fileInfo = loadedFiles[0];
            const newCompName = newCompNameInput.value;

            // 1. 스크립트 내용을 먼저 수정합니다.
            const modifiedScript = getModifiedScript(
                extractScriptFromXFDL(fileInfo.content),
                authorNameInput.value,
                creationDateInput.value,
                fileInfo.componentName,
                newCompName
            );
            
            // 2. 원본 XFDL 내용의 스크립트 부분을 교체합니다.
            const scriptBlockRegex = /(<Script type="xscript5.1"><!\[CDATA\[)[\s\S]*?(\]\]><\/Script>)/;
            let newXfdlContent = fileInfo.content.replace(scriptBlockRegex, `$1\n${modifiedScript}\n$2`);

            // 3. 파일 전체에서 컴포넌트명을 교체합니다. (대소문자 무시)
            if (fileInfo.componentName && newCompName && fileInfo.componentName.toLowerCase() !== newCompName.toLowerCase()) {
                const compNameRegex = new RegExp(fileInfo.componentName, 'gi');
                newXfdlContent = newXfdlContent.replace(compNameRegex, newCompName);
            }

            // 4. 새 파일명을 결정합니다.
            let newFileName = fileInfo.name;
            if (fileInfo.componentName && newCompName && fileInfo.componentName.toLowerCase() !== newCompName.toLowerCase()) {
                newFileName = fileInfo.name.replace(fileInfo.componentName, newCompName);
            }

            // 5. 파일을 다운로드합니다.
            const blob = new Blob([newXfdlContent], { type: 'application/xml;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = newFileName;
            link.click();
            URL.revokeObjectURL(link.href);

            showMessage(`'${newFileName}' 파일이 다운로드되었습니다.`);
            editableScript.value = modifiedScript; // 편집 영역도 업데이트
        });

        downloadAllXfdlBtn.addEventListener('click', function() {
            if (loadedFiles.length === 0) {
                showMessage('먼저 여러 XFDL 파일을 선택하세요.');
                return;
            }
            const zip = new JSZip();
            const author = batchAuthorNameInput.value;
            const date = batchCreationDateInput.value;
            const newComp = batchNewCompNameInput.value;

            loadedFiles.forEach(fileInfo => {
                // 1. 각 파일의 스크립트를 수정합니다.
                const originalScript = extractScriptFromXFDL(fileInfo.content);
                const modifiedScript = getModifiedScript(originalScript, author, date, fileInfo.componentName, newComp);
                
                // 2. 스크립트 부분을 교체합니다.
                const scriptBlockRegex = /(<Script type="xscript5.1"><!\[CDATA\[)[\s\S]*?(\]\]><\/Script>)/;
                let newXfdlContent = fileInfo.content.replace(scriptBlockRegex, `$1\n${modifiedScript}\n$2`);

                // 3. 파일 전체에서 컴포넌트명을 교체합니다. (대소문자 무시)
                const finalCompName = newComp || fileInfo.componentName;
                if (fileInfo.componentName && finalCompName && fileInfo.componentName.toLowerCase() !== finalCompName.toLowerCase()) {
                    const compNameRegex = new RegExp(fileInfo.componentName, 'gi');
                    newXfdlContent = newXfdlContent.replace(compNameRegex, finalCompName);
                }
                
                // 4. 새 파일명을 결정합니다.
                let newFileName = fileInfo.name;
                if (fileInfo.componentName && finalCompName && fileInfo.componentName.toLowerCase() !== finalCompName.toLowerCase()) {
                    newFileName = fileInfo.name.replace(fileInfo.componentName, finalCompName);
                }

                // 5. ZIP에 추가합니다.
                zip.file(newFileName, newXfdlContent);
            });

            zip.generateAsync({ type: "blob" })
                .then(function(content) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = "modified_xfdl_files.zip";
                    link.click();
                    URL.revokeObjectURL(link.href);
                    showMessage('수정된 파일들이 zip으로 다운로드되었습니다.');
                });
        });