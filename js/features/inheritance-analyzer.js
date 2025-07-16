document.addEventListener('DOMContentLoaded', () => {
    const jsFilesInput = document.getElementById('jsFilesInput');
    const analyzeInheritanceBtn = document.getElementById('analyzeInheritanceBtn');
    const inheritanceOutput = document.getElementById('inheritanceOutput');
    const finalPropertiesTableBody = document.querySelector('#finalPropertiesTable tbody');

    analyzeInheritanceBtn.addEventListener('click', async () => {
        const files = jsFilesInput.files;
        if (files.length === 0) {
            window.showMessageBox('분석할 JS 파일을 선택해주세요.');
            return;
        }

        const fileContents = await Promise.all(Array.from(files).map(file => file.text()));
        
        try {
            const { hierarchy, allProperties } = parseAndBuildHierarchy(fileContents);
            
            if (Object.keys(hierarchy).length === 0) {
                window.showMessageBox('상속 구조를 파악할 수 없습니다. 파일 내용을 확인해주세요.');
                return;
            }

            const treeData = buildTreeData(hierarchy);
            renderTree(treeData);

            const finalChildrenProperties = findFinalChildrenProperties(hierarchy, allProperties);
            renderPropertiesTable(finalChildrenProperties);

            inheritanceOutput.classList.remove('hidden');
        } catch (error) {
            window.showMessageBox(`오류 발생: ${error.message}`);
            console.error(error);
        }
    });

    function parseAndBuildHierarchy(contents) {
        const hierarchy = {};
        const allProperties = {};
        const prototypeRegex = /var\s+([\w\d_]+)\s*=\s*nexacro\._createPrototype\(nexacro\.([\w\d_]+),\s*nexacro\.([\w\d_]+)\);/;
        const propertiesRegex = /([\w\d_]+)\._properties\s*=\s*\[([\s\S]*?)\];/;

        contents.forEach(content => {
            const prototypeMatch = content.match(prototypeRegex);
            if (prototypeMatch) {
                const protoVar = prototypeMatch[1];
                const parent = prototypeMatch[2];
                const child = prototypeMatch[3];

                if (!hierarchy[parent]) {
                    hierarchy[parent] = { children: new Set(), properties: new Map() };
                }
                hierarchy[parent].children.add(child);

                if (!hierarchy[child]) {
                    hierarchy[child] = { children: new Set(), properties: new Map() };
                }

                const propertiesMatch = content.match(new RegExp(protoVar + "._properties\\s*=\\s*\\[([\\s\\S]*?)\\];"));
                if (propertiesMatch) {
                    const propertiesString = propertiesMatch[1];
                    const propertyRegex = /{\s*name:\s*"([\w\d_]+)"\s*,?\s*(readonly:\s*true)?/g;
                    let propMatch;
                    while ((propMatch = propertyRegex.exec(propertiesString)) !== null) {
                        const name = propMatch[1];
                        const readonly = !!propMatch[2];
                        hierarchy[child].properties.set(name, { readonly, inheritedFrom: child });
                    }
                }
                allProperties[child] = hierarchy[child].properties;
            }
        });

        return { hierarchy, allProperties };
    }

    function buildTreeData(hierarchy) {
        const nodes = {};
        let root = null;

        Object.keys(hierarchy).forEach(name => {
            if (!nodes[name]) nodes[name] = { name, children: [] };
            hierarchy[name].children.forEach(childName => {
                if (!nodes[childName]) nodes[childName] = { name: childName, children: [] };
                nodes[name].children.push(nodes[childName]);
            });
        });

        const allChildren = new Set();
        Object.values(hierarchy).forEach(data => data.children.forEach(child => allChildren.add(child)));
        const rootCandidates = Object.keys(nodes).filter(name => !allChildren.has(name));
        
        if (rootCandidates.length > 1) {
            root = { name: "(root)", children: rootCandidates.map(name => nodes[name]) };
        } else {
            root = nodes[rootCandidates[0]];
        }
        return root;
    }

    function renderTree(treeData) {
        const container = document.getElementById('inheritance-visualization');
        let svg = d3.select(container).select("svg");
        if (!svg.empty()) {
            svg.remove();
        }

        const width = container.clientWidth;
        const root = d3.hierarchy(treeData);
        const dx = 20;
        const dy = width / (root.height + 1);
        const tree = d3.tree().nodeSize([dx, dy]);
        root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
        tree(root);

        let x0 = Infinity;
        let x1 = -x0;
        root.each(d => {
            if (d.x > x1) x1 = d.x;
            if (d.x < x0) x0 = d.x;
        });

        const height = x1 - x0 + dx * 2;

        svg = d3.select(container).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-dy / 3, x0 - dx, width, height])
            .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(root.links())
            .join("path")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        const node = svg.append("g")
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .selectAll("g")
            .data(root.descendants())
            .join("g")
            .attr("transform", d => `translate(${d.y},${d.x})`);

        node.append("circle")
            .attr("fill", d => d.children ? "#555" : "#999")
            .attr("r", 2.5);

        node.append("text")
            .attr("dx", d => d.children ? -6 : 6)
            .attr("dy", 3)
            .attr("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.name)
            .clone(true).lower()
            .attr("stroke", "white");
    }

    function findFinalChildrenProperties(hierarchy, allProperties) {
        const finalChildren = new Map();
        const allNodes = Object.keys(hierarchy);
        const nonFinalNodes = new Set();

        allNodes.forEach(node => {
            if (hierarchy[node].children.size > 0) {
                nonFinalNodes.add(node);
            }
        });

        const finalNodes = allNodes.filter(node => !nonFinalNodes.has(node) && allProperties[node]);

        finalNodes.forEach(child => {
            let current = child;
            const inheritedProperties = new Map();
            
            while(current) {
                if (allProperties[current]) {
                    allProperties[current].forEach((prop, name) => {
                        if (!inheritedProperties.has(name)) {
                            inheritedProperties.set(name, prop);
                        }
                    });
                }
                
                let parentFound = false;
                for(const parent in hierarchy) {
                    if(hierarchy[parent].children.has(current)) {
                        current = parent;
                        parentFound = true;
                        break;
                    }
                }
                if(!parentFound) current = null;
            }
            finalChildren.set(child, inheritedProperties);
        });

        return finalChildren;
    }

    function renderPropertiesTable(finalChildrenProperties) {
        finalPropertiesTableBody.innerHTML = ''; // Clear existing rows
        const downloadCsvBtn = document.getElementById('downloadPropertiesCsvBtn');
        const downloadExcelBtn = document.getElementById('downloadPropertiesExcelBtn');

        if (finalChildrenProperties.size === 0) {
            downloadCsvBtn.classList.add('hidden');
            downloadExcelBtn.classList.add('hidden');
            return;
        }

        downloadCsvBtn.classList.remove('hidden');
        downloadExcelBtn.classList.remove('hidden');

        finalChildrenProperties.forEach((properties, component) => {
            properties.forEach((prop, name) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">${component}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${prop.readonly ? 'Yes' : 'No'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${prop.inheritedFrom}</td>
                `;
                finalPropertiesTableBody.appendChild(row);
            });
        });
    }

    function getTableCsvContent() {
        const table = document.getElementById('finalPropertiesTable');
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        let csvContent = headers.map(window.escapeCsvField).join(",") + "\n";

        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowData = cells.map(cell => window.escapeCsvField(cell.textContent));
            csvContent += rowData.join(",") + "\n";
        });
        
        return csvContent;
    }

    function downloadProperties(fileType) {
        const csvContent = getTableCsvContent();
        const fileName = fileType === 'excel' ? 'Inherited_Properties.xlsx' : 'Inherited_Properties.csv';
        const mimeType = fileType === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';

        // BOM for UTF-8 to ensure Excel opens it correctly
        const bom = "\uFEFF"; 
        const blob = new Blob([bom + csvContent], { type: `${mimeType};charset=utf-8;` });
        
        const link = document.createElement("a");
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    document.getElementById('downloadPropertiesCsvBtn').addEventListener('click', () => downloadProperties('csv'));
    document.getElementById('downloadPropertiesExcelBtn').addEventListener('click', () => downloadProperties('excel'));
});