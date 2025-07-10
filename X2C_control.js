document.getElementById('generateCSVControl').addEventListener('click', () => {
    const xmlText = document.getElementById('xmlInput').value;
    if (!xmlText.trim()) {
        showMessage('XML 내용을 입력해주세요.');
        return;
    }

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const parserError = xmlDoc.getElementsByTagName("parsererror");
        if (parserError.length) {
            console.error("XML parsing error:", parserError[0].textContent);
            showMessage("XML 파싱 오류가 발생했습니다. 콘솔을 확인하세요.");
            return;
        }

        const controlNodes = xmlDoc.querySelectorAll("ControlInfo > Control");
        if (controlNodes.length === 0) {
            showMessage("XML에서 Control 정보를 찾을 수 없습니다.");
            return;
        }

        const headers = ["name", "classname", "unusedstatus", "unusedcontrol", "deprecated", "unused", "group", "subgroup"];
        const csvRows = [headers.join(',')];

        controlNodes.forEach(node => {
            const row = headers.map(header => `"${node.getAttribute(header) || ''}"`);
            csvRows.push(row.join(','));
        });

        downloadCSV(csvRows.join('\n'), 'control_info.csv');
    } catch (error) {
        console.error("Error processing XML for Control:", error);
        showMessage("Control 정보 처리 중 오류가 발생했습니다.");
    }
});

