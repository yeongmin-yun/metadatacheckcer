// js/features/cats-sampler.js

/**
 * XFDL 파일에서 <Script> 태그의 내용을 추출합니다.
 * @param {string} xfdlContent - XFDL 파일의 전체 내용
 * @returns {string} - 추출된 스크립트 내용 또는 내용이 없을 경우 빈 문자열
 */
function extractScriptFromXFDL(xfdlContent) {
    try {
        // <Script type="xscript5.1"><![CDATA[...]]></Script> 패턴을 처리하는 정규식
        const scriptRegex = /<Script type="xscript5.1"><!\[CDATA\[([\s\S]*?)\]\]><\/Script>/;
        const match = xfdlContent.match(scriptRegex);
        if (match && match[1]) {
            return match[1].trim();
        }
        return '// 스크립트를 찾을 수 없습니다.';
    } catch (error) {
        console.error('스크립트 추출 중 오류 발생:', error);
        return '// 스크립트 추출 중 오류가 발생했습니다.';
    }
}

/**
 * 파일명에서 컴포넌트 이름을 추출합니다. (패턴: A_{$component}_all.xfdl 또는 A_{$component}_*_*_*.xfdl)
 * @param {string} filename - XFDL 파일의 이름
 * @returns {string|null} - 추출된 컴포넌트 이름 또는 찾지 못한 경우 null
 */
function extractComponentName(filename) {
    // 패턴: A_로 시작하고, 다음 '_' 전까지를 컴포넌트명으로 간주
    const pattern = /^A_([^_]+)_.*\.xfdl$/;
    const match = filename.match(pattern);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}