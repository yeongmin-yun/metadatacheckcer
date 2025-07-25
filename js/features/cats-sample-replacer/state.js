// js/features/cats-sample-replacer/state.js

let loadedFiles = []; // To store { name, content } of loaded files

export function getLoadedFiles() {
    return loadedFiles;
}

export function setLoadedFiles(files) {
    loadedFiles = files;
}

export function clearLoadedFiles() {
    loadedFiles = [];
}
