document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const renderBtn = document.getElementById('render-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const fileInput = document.getElementById('file-input');
    const syncJsonBtn = document.getElementById('sync-json-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const errorMessage = document.getElementById('error-message');
    const outputSection = document.getElementById('output-section');
    const tableContainer = document.getElementById('table-container');

    let currentData = null;
    let isDirty = false;
    let openedFileName = 'data.json';

    renderBtn.addEventListener('click', renderJSON);
    sampleBtn.addEventListener('click', loadSample);
    clearBtn.addEventListener('click', clearAll);
    saveBtn.addEventListener('click', saveJSON);
    fileInput.addEventListener('change', openFile);
    syncJsonBtn.addEventListener('click', syncToJSON);
    collapseAllBtn.addEventListener('click', collapseAll);
    expandAllBtn.addEventListener('click', expandAll);

    jsonInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') renderJSON();
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveJSON(); }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveJSON(); }
        if (e.ctrlKey && e.key === 'o') { e.preventDefault(); fileInput.click(); }
    });

    function openFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        openedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
            jsonInput.value = ev.target.result;
            renderJSON();
        };
        reader.readAsText(file);
        fileInput.value = '';
    }

    function saveJSON() {
        if (!currentData) return;
        syncDataFromTable();
        const json = JSON.stringify(currentData, null, 2);
        jsonInput.value = json;
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = openedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        markClean();
    }

    function syncToJSON() {
        if (!currentData) return;
        syncDataFromTable();
        jsonInput.value = JSON.stringify(currentData, null, 2);
        markClean();
    }

    function renderJSON() {
        const input = jsonInput.value.trim();
        errorMessage.classList.add('hidden');
        outputSection.classList.add('hidden');

        if (!input) {
            showError('Please enter some JSON data.');
            return;
        }

        let data;
        try {
            data = JSON.parse(input);
        } catch (e) {
            showError(`Invalid JSON: ${e.message}`);
            return;
        }

        if (data === null || typeof data !== 'object') {
            showError('JSON must be an object or array at the root level.');
            return;
        }

        currentData = data;
        tableContainer.innerHTML = '';
        const table = buildTable(data, []);
        tableContainer.appendChild(table);
        outputSection.classList.remove('hidden');
        saveBtn.disabled = false;
        markClean();
    }

    function buildTable(data, path) {
        if (Array.isArray(data)) {
            return buildArrayTable(data, path);
        }
        return buildObjectTable(data, path);
    }

    function buildObjectTable(obj, path) {
        const table = document.createElement('table');
        table.className = 'json-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const thKey = document.createElement('th');
        thKey.textContent = 'Key';
        const thValue = document.createElement('th');
        thValue.textContent = 'Value';
        headerRow.appendChild(thKey);
        headerRow.appendChild(thValue);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (const [key, value] of Object.entries(obj)) {
            const rows = renderKeyValue(key, value, [...path, key]);
            for (const row of rows) {
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function renderKeyValue(key, value, path) {
        if (value === null || typeof value !== 'object') {
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.className = 'key-cell';
            keyCell.textContent = key;

            const valueCell = createEditableCell(value, path);

            row.appendChild(keyCell);
            row.appendChild(valueCell);
            return [row];
        }

        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.className = 'key-cell collapsible-toggle';

        const keyText = document.createTextNode(key);
        keyCell.appendChild(keyText);

        const badge = document.createElement('span');
        badge.className = 'type-badge ' + (Array.isArray(value) ? 'array-badge' : 'object-badge');
        badge.textContent = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
        keyCell.appendChild(badge);

        const valueCell = document.createElement('td');
        valueCell.className = 'nested-table-wrapper';

        const nestedTable = Array.isArray(value)
            ? buildNestedArrayTable(value, path)
            : buildNestedObjectTable(value, path);
        valueCell.appendChild(nestedTable);

        keyCell.addEventListener('click', () => {
            keyCell.classList.toggle('collapsed');
            valueCell.classList.toggle('collapsed-content');
        });

        row.appendChild(keyCell);
        row.appendChild(valueCell);
        return [row];
    }

    function createEditableCell(value, path) {
        const cell = document.createElement('td');
        cell.className = 'value-cell ' + getTypeClass(value);
        cell.textContent = formatPrimitive(value);
        cell.setAttribute('contenteditable', 'true');
        cell.setAttribute('data-path', JSON.stringify(path));
        cell.setAttribute('data-original-type', typeof value === 'object' ? 'null' : typeof value);
        cell.setAttribute('data-original-value', JSON.stringify(value));

        cell.addEventListener('focus', () => {
            if (value === null) cell.textContent = 'null';
            else if (typeof value === 'string') cell.textContent = value;
            else cell.textContent = String(value);
        });

        cell.addEventListener('blur', () => {
            const newRaw = cell.textContent.trim();
            const parsed = parseEditedValue(newRaw, cell.getAttribute('data-original-type'));
            const originalValue = JSON.parse(cell.getAttribute('data-original-value'));

            if (JSON.stringify(parsed) !== JSON.stringify(originalValue)) {
                setNestedValue(currentData, path, parsed);
                cell.classList.add('edited');
                markDirty();
            }

            cell.className = 'value-cell ' + getTypeClass(parsed);
            if (cell.classList.contains('edited')) cell.classList.add('edited');
            cell.textContent = formatPrimitive(parsed);
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                cell.blur();
            }
            if (e.key === 'Escape') {
                cell.textContent = formatPrimitive(JSON.parse(cell.getAttribute('data-original-value')));
                cell.blur();
            }
        });

        return cell;
    }

    function parseEditedValue(raw, originalType) {
        if (raw === 'null' || raw === '') return null;
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (originalType === 'number' || (!isNaN(raw) && raw !== '')) {
            const num = Number(raw);
            if (!isNaN(num)) return num;
        }
        if (raw.startsWith('"') && raw.endsWith('"')) {
            return raw.slice(1, -1);
        }
        return raw;
    }

    function setNestedValue(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
    }

    function syncDataFromTable() {
        const editableCells = tableContainer.querySelectorAll('[contenteditable="true"]');
        editableCells.forEach(cell => {
            const path = JSON.parse(cell.getAttribute('data-path'));
            const raw = cell.textContent.trim();
            const originalType = cell.getAttribute('data-original-type');
            const parsed = parseEditedValue(raw, originalType);
            setNestedValue(currentData, path, parsed);
        });
    }

    function buildNestedObjectTable(obj, path) {
        const table = document.createElement('table');
        table.className = 'json-table';
        const tbody = document.createElement('tbody');

        for (const [key, value] of Object.entries(obj)) {
            const rows = renderKeyValue(key, value, [...path, key]);
            for (const row of rows) {
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function buildNestedArrayTable(arr, path) {
        if (arr.length === 0) {
            const span = document.createElement('span');
            span.className = 'value-cell null-val';
            span.textContent = '[ empty array ]';
            return span;
        }

        if (isHomogeneousObjectArray(arr)) {
            return buildFlatArrayTable(arr, path);
        }

        const table = document.createElement('table');
        table.className = 'json-table';
        const tbody = document.createElement('tbody');

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const itemPath = [...path, i];

            if (item === null || typeof item !== 'object') {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = createEditableCell(item, itemPath);

                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            } else {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = document.createElement('td');
                valueCell.className = 'nested-table-wrapper';
                const nestedTable = Array.isArray(item)
                    ? buildNestedArrayTable(item, itemPath)
                    : buildNestedObjectTable(item, itemPath);
                valueCell.appendChild(nestedTable);

                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function buildFlatArrayTable(arr, path) {
        const allKeys = new Set();
        for (const item of arr) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                for (const key of Object.keys(item)) {
                    allKeys.add(key);
                }
            }
        }
        const keys = Array.from(allKeys);

        const table = document.createElement('table');
        table.className = 'json-table root-array-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const indexTh = document.createElement('th');
        indexTh.textContent = '#';
        headerRow.appendChild(indexTh);

        for (const key of keys) {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const row = document.createElement('tr');

            const indexCell = document.createElement('td');
            indexCell.className = 'key-cell';
            indexCell.innerHTML = `<span class="array-index">${i}</span>`;
            row.appendChild(indexCell);

            for (const key of keys) {
                const val = item && item[key] !== undefined ? item[key] : null;
                const cellPath = [...path, i, key];

                if (val === null || typeof val !== 'object') {
                    const td = createEditableCell(val, cellPath);
                    row.appendChild(td);
                } else {
                    const td = document.createElement('td');
                    td.className = 'nested-table-wrapper';
                    const nestedTable = Array.isArray(val)
                        ? buildNestedArrayTable(val, cellPath)
                        : buildNestedObjectTable(val, cellPath);
                    td.appendChild(nestedTable);
                    row.appendChild(td);
                }
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }

    function buildArrayTable(arr, path) {
        if (arr.length === 0) {
            const p = document.createElement('p');
            p.className = 'value-cell null-val';
            p.textContent = '[ empty array ]';
            return p;
        }

        if (isHomogeneousObjectArray(arr)) {
            return buildFlatArrayTable(arr, path);
        }

        const wrapper = document.createElement('div');
        const table = document.createElement('table');
        table.className = 'json-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const thIndex = document.createElement('th');
        thIndex.textContent = 'Index';
        const thValue = document.createElement('th');
        thValue.textContent = 'Value';
        headerRow.appendChild(thIndex);
        headerRow.appendChild(thValue);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const itemPath = [...path, i];

            if (item === null || typeof item !== 'object') {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = createEditableCell(item, itemPath);

                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            } else {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = document.createElement('td');
                valueCell.className = 'nested-table-wrapper';
                const nestedTable = Array.isArray(item)
                    ? buildNestedArrayTable(item, itemPath)
                    : buildNestedObjectTable(item, itemPath);
                valueCell.appendChild(nestedTable);

                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
    }

    function isHomogeneousObjectArray(arr) {
        if (arr.length === 0) return false;
        for (const item of arr) {
            if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                return false;
            }
        }
        return true;
    }

    function getTypeClass(value) {
        if (value === null) return 'null-val';
        if (typeof value === 'string') return 'string-val';
        if (typeof value === 'number') return 'number-val';
        if (typeof value === 'boolean') return 'boolean-val';
        return '';
    }

    function formatPrimitive(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function markDirty() {
        isDirty = true;
        const h2 = document.querySelector('.output-header h2');
        if (!h2.querySelector('.dirty-indicator')) {
            const dot = document.createElement('span');
            dot.className = 'dirty-indicator';
            dot.title = 'Unsaved changes';
            h2.appendChild(dot);
        }
    }

    function markClean() {
        isDirty = false;
        const dot = document.querySelector('.dirty-indicator');
        if (dot) dot.remove();
        const editedCells = tableContainer.querySelectorAll('.edited');
        editedCells.forEach(cell => cell.classList.remove('edited'));
    }

    function clearAll() {
        jsonInput.value = '';
        errorMessage.classList.add('hidden');
        outputSection.classList.add('hidden');
        tableContainer.innerHTML = '';
        currentData = null;
        saveBtn.disabled = true;
        isDirty = false;
    }

    function collapseAll() {
        const toggles = tableContainer.querySelectorAll('.collapsible-toggle');
        toggles.forEach(toggle => {
            if (!toggle.classList.contains('collapsed')) {
                toggle.classList.add('collapsed');
                const valueCell = toggle.nextElementSibling;
                if (valueCell) valueCell.classList.add('collapsed-content');
            }
        });
    }

    function expandAll() {
        const toggles = tableContainer.querySelectorAll('.collapsible-toggle');
        toggles.forEach(toggle => {
            if (toggle.classList.contains('collapsed')) {
                toggle.classList.remove('collapsed');
                const valueCell = toggle.nextElementSibling;
                if (valueCell) valueCell.classList.remove('collapsed-content');
            }
        });
    }

    function loadSample() {
        const sample = {
            "name": "John Doe",
            "age": 32,
            "active": true,
            "email": null,
            "address": {
                "street": "123 Main St",
                "city": "Springfield",
                "state": "IL",
                "zip": "62701",
                "coordinates": {
                    "lat": 39.7817,
                    "lng": -89.6501
                }
            },
            "phones": [
                { "type": "home", "number": "555-1234" },
                { "type": "work", "number": "555-5678" }
            ],
            "skills": ["JavaScript", "Python", "SQL"],
            "projects": [
                {
                    "name": "Widget App",
                    "status": "completed",
                    "team": ["Alice", "Bob"],
                    "metadata": {
                        "startDate": "2024-01-15",
                        "endDate": "2024-06-30",
                        "budget": 50000
                    }
                },
                {
                    "name": "Data Pipeline",
                    "status": "in-progress",
                    "team": ["Charlie", "Diana", "Eve"],
                    "metadata": {
                        "startDate": "2024-03-01",
                        "endDate": null,
                        "budget": 120000
                    }
                }
            ]
        };
        jsonInput.value = JSON.stringify(sample, null, 2);
        renderJSON();
    }
});
