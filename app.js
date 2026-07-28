document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const renderBtn = document.getElementById('render-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const errorMessage = document.getElementById('error-message');
    const outputSection = document.getElementById('output-section');
    const tableContainer = document.getElementById('table-container');

    renderBtn.addEventListener('click', renderJSON);
    sampleBtn.addEventListener('click', loadSample);
    clearBtn.addEventListener('click', clearAll);
    collapseAllBtn.addEventListener('click', collapseAll);
    expandAllBtn.addEventListener('click', expandAll);

    jsonInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') renderJSON();
    });

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

        tableContainer.innerHTML = '';
        const table = buildTable(data);
        tableContainer.appendChild(table);
        outputSection.classList.remove('hidden');
    }

    function buildTable(data) {
        if (Array.isArray(data)) {
            return buildArrayTable(data);
        }
        return buildObjectTable(data);
    }

    function buildObjectTable(obj) {
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
        const entries = Object.entries(obj);

        for (const [key, value] of entries) {
            const rows = renderKeyValue(key, value);
            for (const row of rows) {
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function renderKeyValue(key, value) {
        if (value === null || typeof value !== 'object') {
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.className = 'key-cell';
            keyCell.textContent = key;

            const valueCell = document.createElement('td');
            valueCell.className = 'value-cell ' + getTypeClass(value);
            valueCell.textContent = formatPrimitive(value);

            row.appendChild(keyCell);
            row.appendChild(valueCell);
            return [row];
        }

        const rowspan = calculateRowspan(value);
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.className = 'key-cell collapsible-toggle';
        keyCell.setAttribute('rowspan', rowspan);

        const keyText = document.createTextNode(key);
        keyCell.appendChild(keyText);

        const badge = document.createElement('span');
        badge.className = 'type-badge ' + (Array.isArray(value) ? 'array-badge' : 'object-badge');
        badge.textContent = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
        keyCell.appendChild(badge);

        const valueCell = document.createElement('td');
        valueCell.className = 'nested-table-wrapper';
        valueCell.setAttribute('colspan', '1');

        const nestedTable = Array.isArray(value) ? buildNestedArrayTable(value) : buildNestedObjectTable(value);
        valueCell.appendChild(nestedTable);

        keyCell.addEventListener('click', () => {
            keyCell.classList.toggle('collapsed');
            if (keyCell.classList.contains('collapsed')) {
                valueCell.classList.add('collapsed-content');
                keyCell.setAttribute('rowspan', '1');
            } else {
                valueCell.classList.remove('collapsed-content');
                keyCell.setAttribute('rowspan', rowspan);
            }
        });

        row.appendChild(keyCell);
        row.appendChild(valueCell);
        return [row];
    }

    function buildNestedObjectTable(obj) {
        const table = document.createElement('table');
        table.className = 'json-table';

        const tbody = document.createElement('tbody');
        for (const [key, value] of Object.entries(obj)) {
            const rows = renderKeyValue(key, value);
            for (const row of rows) {
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function buildNestedArrayTable(arr) {
        if (arr.length === 0) {
            const span = document.createElement('span');
            span.className = 'value-cell null-val';
            span.textContent = '[ empty array ]';
            return span;
        }

        if (isHomogeneousObjectArray(arr)) {
            return buildFlatArrayTable(arr);
        }

        const table = document.createElement('table');
        table.className = 'json-table';
        const tbody = document.createElement('tbody');

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            if (item === null || typeof item !== 'object') {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = document.createElement('td');
                valueCell.className = 'value-cell ' + getTypeClass(item);
                valueCell.textContent = formatPrimitive(item);

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

                const nestedTable = Array.isArray(item) ? buildNestedArrayTable(item) : buildNestedObjectTable(item);
                valueCell.appendChild(nestedTable);

                row.appendChild(indexCell);
                row.appendChild(valueCell);
                tbody.appendChild(row);
            }
        }

        table.appendChild(tbody);
        return table;
    }

    function buildFlatArrayTable(arr) {
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
                const td = document.createElement('td');
                const val = item && item[key] !== undefined ? item[key] : null;

                if (val === null || typeof val !== 'object') {
                    td.className = 'value-cell ' + getTypeClass(val);
                    td.textContent = formatPrimitive(val);
                } else {
                    td.className = 'nested-table-wrapper';
                    const nestedTable = Array.isArray(val) ? buildNestedArrayTable(val) : buildNestedObjectTable(val);
                    td.appendChild(nestedTable);
                }

                row.appendChild(td);
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }

    function buildArrayTable(arr) {
        if (arr.length === 0) {
            const p = document.createElement('p');
            p.className = 'value-cell null-val';
            p.textContent = '[ empty array ]';
            return p;
        }

        if (isHomogeneousObjectArray(arr)) {
            return buildFlatArrayTable(arr);
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
            if (item === null || typeof item !== 'object') {
                const row = document.createElement('tr');
                const indexCell = document.createElement('td');
                indexCell.className = 'key-cell';
                indexCell.innerHTML = `<span class="array-index">${i}</span>`;

                const valueCell = document.createElement('td');
                valueCell.className = 'value-cell ' + getTypeClass(item);
                valueCell.textContent = formatPrimitive(item);

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
                const nestedTable = Array.isArray(item) ? buildNestedArrayTable(item) : buildNestedObjectTable(item);
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
        let hasObject = false;
        for (const item of arr) {
            if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                return false;
            }
            hasObject = true;
        }
        return hasObject;
    }

    function calculateRowspan(value) {
        if (value === null || typeof value !== 'object') return 1;
        if (Array.isArray(value)) return 1;
        return 1;
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

    function clearAll() {
        jsonInput.value = '';
        errorMessage.classList.add('hidden');
        outputSection.classList.add('hidden');
        tableContainer.innerHTML = '';
    }

    function collapseAll() {
        const toggles = tableContainer.querySelectorAll('.collapsible-toggle');
        toggles.forEach(toggle => {
            if (!toggle.classList.contains('collapsed')) {
                toggle.click();
            }
        });
    }

    function expandAll() {
        const toggles = tableContainer.querySelectorAll('.collapsible-toggle');
        toggles.forEach(toggle => {
            if (toggle.classList.contains('collapsed')) {
                toggle.click();
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
    }
});
