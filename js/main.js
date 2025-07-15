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