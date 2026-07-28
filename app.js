document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const sampleBtn = document.getElementById('sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const copyBtn = document.getElementById('copy-btn');
    const fileInput = document.getElementById('file-input');
    const toggleCodeBtn = document.getElementById('toggle-code-btn');
    const collapseAllBtn = document.getElementById('collapse-all-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const errorMessage = document.getElementById('error-message');
    const codePanel = document.getElementById('code-panel');
    const resizeHandle = document.getElementById('resize-handle');
    const tableContainer = document.getElementById('table-container');
    const statusText = document.getElementById('status-text');
    const statsText = document.getElementById('stats-text');
    const copyToast = document.getElementById('copy-toast');

    const cellEditor = document.getElementById('cell-editor');
    const editorType = document.getElementById('editor-type');
    const editorInput = document.getElementById('editor-input');
    const editorBoolSelect = document.getElementById('editor-bool-select');
    const editorApply = document.getElementById('editor-apply');
    const editorDelete = document.getElementById('editor-delete');
    const editorClose = document.getElementById('editor-close');

    let currentData = null;
    let openedFileName = 'data.json';
    let editingPath = null;
    let editingMode = null;
    let renderTimeout = null;

    sampleBtn.addEventListener('click', loadSample);
    clearBtn.addEventListener('click', clearAll);
    saveBtn.addEventListener('click', saveJSON);
    copyBtn.addEventListener('click', copyJSON);
    fileInput.addEventListener('change', openFile);
    toggleCodeBtn.addEventListener('click', toggleCodePanel);
    collapseAllBtn.addEventListener('click', collapseAll);
    expandAllBtn.addEventListener('click', expandAll);
    themeToggle.addEventListener('click', toggleTheme);
    editorApply.addEventListener('click', applyEdit);
    editorDelete.addEventListener('click', deleteEntry);
    editorClose.addEventListener('click', closeEditor);
    editorType.addEventListener('change', onTypeChange);

    jsonInput.addEventListener('input', debounceRender);
    jsonInput.addEventListener('paste', () => setTimeout(debounceRender, 0));

    editorInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); applyEdit(); }
        if (e.key === 'Escape') closeEditor();
    });

    editorBoolSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); applyEdit(); }
        if (e.key === 'Escape') closeEditor();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeEditor();
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveJSON(); }
        if (e.ctrlKey && e.key === 'o') { e.preventDefault(); fileInput.click(); }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); tryRender(); }
    });

    document.addEventListener('mousedown', (e) => {
        if (!cellEditor.classList.contains('hidden') && !cellEditor.contains(e.target)) {
            closeEditor();
        }
    });

    initTheme();
    initResize();

    function debounceRender() {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(tryRender, 400);
    }

    function tryRender() {
        const input = jsonInput.value.trim();
        errorMessage.classList.add('hidden');

        if (!input) return;

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
        rebuildTable();
        saveBtn.disabled = false;
        copyBtn.disabled = false;
        setStatus('Rendered');
    }

    function initTheme() {
        const saved = localStorage.getItem('json-viewer-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('json-viewer-theme', next);
    }

    function toggleCodePanel() {
        codePanel.classList.toggle('hidden');
        resizeHandle.classList.toggle('hidden');
        toggleCodeBtn.classList.toggle('active');
    }

    function initResize() {
        let isResizing = false;
        let startX, startWidth;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = codePanel.offsetWidth;
            resizeHandle.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(startWidth + diff, window.innerWidth - 400));
            codePanel.style.width = newWidth + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    function openFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        openedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const raw = ev.target.result;
            try {
                const parsed = JSON.parse(raw);
                jsonInput.value = JSON.stringify(parsed, null, 4);
                currentData = parsed;
                rebuildTable();
                saveBtn.disabled = false;
                copyBtn.disabled = false;
                setStatus(`Opened: ${file.name}`);
            } catch (err) {
                jsonInput.value = raw;
                showError(`Invalid JSON in file: ${err.message}`);
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    }

    function saveJSON() {
        if (!currentData) return;
        const json = JSON.stringify(currentData, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = openedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus(`Saved: ${openedFileName}`);
    }

    function copyJSON() {
        if (!currentData) return;
        const json = JSON.stringify(currentData, null, 4);
        navigator.clipboard.writeText(json).then(() => {
            showToast();
            setStatus('Copied to clipboard');
        });
    }

    function showToast() {
        copyToast.classList.remove('hidden');
        setTimeout(() => copyToast.classList.add('hidden'), 2000);
    }

    function syncToInput() {
        if (!currentData) return;
        jsonInput.value = JSON.stringify(currentData, null, 4);
    }

    function rebuildTable() {
        tableContainer.innerHTML = '';
        const table = buildTable(currentData, []);
        tableContainer.appendChild(table);

        const stats = countNodes(currentData);
        statsText.textContent = `${stats.keys} keys • ${stats.values} values • depth ${stats.depth}`;
    }

    function countNodes(obj, depth = 1) {
        let keys = 0, values = 0, maxDepth = depth;
        if (Array.isArray(obj)) {
            values += obj.length;
            for (const item of obj) {
                if (item && typeof item === 'object') {
                    const sub = countNodes(item, depth + 1);
                    keys += sub.keys; values += sub.values;
                    maxDepth = Math.max(maxDepth, sub.depth);
                }
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) {
                keys++;
                if (v && typeof v === 'object') {
                    const sub = countNodes(v, depth + 1);
                    keys += sub.keys; values += sub.values;
                    maxDepth = Math.max(maxDepth, sub.depth);
                } else {
                    values++;
                }
            }
        }
        return { keys, values, depth: maxDepth };
    }

    // --- Table Building ---

    function buildTable(data, path) {
        if (Array.isArray(data)) return buildArrayTable(data, path);
        return buildObjectTable(data, path);
    }

    function buildObjectTable(obj, path) {
        const table = document.createElement('table');
        table.className = 'json-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Key</th><th>Value</th>';
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (const [key, value] of Object.entries(obj)) {
            appendKeyValueRows(tbody, key, value, [...path, key], path);
        }
        table.appendChild(tbody);

        const wrapper = document.createElement('div');
        wrapper.appendChild(table);
        wrapper.appendChild(createAddButton(path, 'object'));
        return wrapper;
    }

    function buildArrayTable(arr, path) {
        if (arr.length === 0) {
            const wrapper = document.createElement('div');
            const p = document.createElement('p');
            p.className = 'value-cell null-val';
            p.textContent = '[ empty array ]';
            p.style.padding = '1rem';
            wrapper.appendChild(p);
            wrapper.appendChild(createAddButton(path, 'array'));
            return wrapper;
        }

        if (isHomogeneousObjectArray(arr)) {
            const wrapper = document.createElement('div');
            wrapper.appendChild(buildFlatArrayTable(arr, path));
            wrapper.appendChild(createAddButton(path, 'array'));
            return wrapper;
        }

        const table = document.createElement('table');
        table.className = 'json-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Index</th><th>Value</th>';
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let i = 0; i < arr.length; i++) {
            appendArrayItemRow(tbody, arr[i], [...path, i], path);
        }
        table.appendChild(tbody);

        const wrapper = document.createElement('div');
        wrapper.appendChild(table);
        wrapper.appendChild(createAddButton(path, 'array'));
        return wrapper;
    }

    function appendKeyValueRows(tbody, key, value, path, parentPath) {
        if (value === null || typeof value !== 'object') {
            const row = document.createElement('tr');
            const keyCell = document.createElement('td');
            keyCell.className = 'key-cell';
            keyCell.textContent = key;
            keyCell.addEventListener('click', (e) => openKeyEditor(e, path, parentPath));

            const valueCell = document.createElement('td');
            valueCell.className = 'value-cell ' + getTypeClass(value);
            valueCell.textContent = formatPrimitive(value);
            valueCell.addEventListener('click', (e) => openValueEditor(e, path, value));

            row.appendChild(keyCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
            return;
        }

        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.className = 'key-cell collapsible-toggle';

        const keySpan = document.createElement('span');
        keySpan.textContent = key;
        keySpan.addEventListener('click', (e) => {
            e.stopPropagation();
            openKeyEditor(e, path, parentPath);
        });
        keyCell.appendChild(keySpan);

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
        tbody.appendChild(row);
    }

    function appendArrayItemRow(tbody, item, itemPath, parentPath) {
        const i = itemPath[itemPath.length - 1];
        if (item === null || typeof item !== 'object') {
            const row = document.createElement('tr');
            const indexCell = document.createElement('td');
            indexCell.className = 'key-cell';
            indexCell.innerHTML = `<span class="array-index">${i}</span>`;

            const valueCell = document.createElement('td');
            valueCell.className = 'value-cell ' + getTypeClass(item);
            valueCell.textContent = formatPrimitive(item);
            valueCell.addEventListener('click', (e) => openValueEditor(e, itemPath, item));

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

    function buildNestedObjectTable(obj, path) {
        const table = document.createElement('table');
        table.className = 'json-table';
        const tbody = document.createElement('tbody');

        for (const [key, value] of Object.entries(obj)) {
            appendKeyValueRows(tbody, key, value, [...path, key], path);
        }

        table.appendChild(tbody);

        const wrapper = document.createElement('div');
        wrapper.appendChild(table);
        wrapper.appendChild(createAddButton(path, 'object'));
        return wrapper;
    }

    function buildNestedArrayTable(arr, path) {
        if (arr.length === 0) {
            const wrapper = document.createElement('div');
            const span = document.createElement('span');
            span.className = 'value-cell null-val';
            span.textContent = '[ empty ]';
            span.style.padding = '0.4rem 0.75rem';
            span.style.display = 'block';
            wrapper.appendChild(span);
            wrapper.appendChild(createAddButton(path, 'array'));
            return wrapper;
        }

        if (isHomogeneousObjectArray(arr)) {
            const wrapper = document.createElement('div');
            wrapper.appendChild(buildFlatArrayTable(arr, path));
            wrapper.appendChild(createAddButton(path, 'array'));
            return wrapper;
        }

        const table = document.createElement('table');
        table.className = 'json-table';
        const tbody = document.createElement('tbody');

        for (let i = 0; i < arr.length; i++) {
            appendArrayItemRow(tbody, arr[i], [...path, i], path);
        }

        table.appendChild(tbody);

        const wrapper = document.createElement('div');
        wrapper.appendChild(table);
        wrapper.appendChild(createAddButton(path, 'array'));
        return wrapper;
    }

    function buildFlatArrayTable(arr, path) {
        const allKeys = new Set();
        for (const item of arr) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                for (const key of Object.keys(item)) allKeys.add(key);
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
                    const td = document.createElement('td');
                    td.className = 'value-cell ' + getTypeClass(val);
                    td.textContent = formatPrimitive(val);
                    td.addEventListener('click', (e) => openValueEditor(e, cellPath, val));
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

    function createAddButton(path, containerType) {
        const btn = document.createElement('button');
        btn.className = 'add-row-btn';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add ${containerType === 'object' ? 'property' : 'item'}`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addNewEntry(path, containerType);
        });
        return btn;
    }

    // --- Cell Editor ---

    function openValueEditor(e, path, currentValue) {
        e.stopPropagation();
        editingPath = path;
        editingMode = 'value';

        const type = getValueType(currentValue);
        editorType.value = type;
        editorType.disabled = false;
        updateEditorFields(type, currentValue);
        editorDelete.classList.remove('hidden');

        positionEditor(e.target);
    }

    function openKeyEditor(e, path, parentPath) {
        e.stopPropagation();
        editingPath = path;
        editingMode = 'key';

        const currentKey = path[path.length - 1];
        editorType.value = 'string';
        editorType.disabled = true;
        editorInput.classList.remove('hidden');
        editorBoolSelect.classList.add('hidden');
        editorInput.disabled = false;
        editorInput.value = currentKey;
        editorDelete.classList.remove('hidden');

        positionEditor(e.target);
        setTimeout(() => {
            editorInput.focus();
            editorInput.select();
        }, 50);
    }

    function positionEditor(target) {
        cellEditor.classList.remove('hidden');
        const rect = target.getBoundingClientRect();
        let top = rect.bottom + 4;
        let left = rect.left;

        if (top + 200 > window.innerHeight) {
            top = rect.top - 200;
        }
        if (left + 280 > window.innerWidth) {
            left = window.innerWidth - 290;
        }

        cellEditor.style.top = Math.max(4, top) + 'px';
        cellEditor.style.left = Math.max(4, left) + 'px';
    }

    function updateEditorFields(type, value) {
        editorInput.disabled = false;
        editorInput.classList.remove('hidden');
        editorBoolSelect.classList.add('hidden');

        switch (type) {
            case 'string':
                editorInput.value = value === null ? '' : String(value);
                setTimeout(() => { editorInput.focus(); editorInput.select(); }, 50);
                break;
            case 'number':
                editorInput.value = value === null ? '0' : String(value);
                setTimeout(() => { editorInput.focus(); editorInput.select(); }, 50);
                break;
            case 'boolean':
                editorInput.classList.add('hidden');
                editorBoolSelect.classList.remove('hidden');
                editorBoolSelect.value = String(!!value);
                break;
            case 'null':
                editorInput.value = 'null';
                editorInput.disabled = true;
                break;
            case 'object':
                editorInput.value = value && typeof value === 'object' && !Array.isArray(value)
                    ? JSON.stringify(value) : '{}';
                setTimeout(() => { editorInput.focus(); editorInput.select(); }, 50);
                break;
            case 'array':
                editorInput.value = Array.isArray(value) ? JSON.stringify(value) : '[]';
                setTimeout(() => { editorInput.focus(); editorInput.select(); }, 50);
                break;
        }
    }

    function onTypeChange() {
        const type = editorType.value;
        editorInput.disabled = false;
        editorInput.classList.remove('hidden');
        editorBoolSelect.classList.add('hidden');

        switch (type) {
            case 'boolean':
                editorInput.classList.add('hidden');
                editorBoolSelect.classList.remove('hidden');
                break;
            case 'null':
                editorInput.value = 'null';
                editorInput.disabled = true;
                break;
            case 'object':
                editorInput.value = '{}';
                editorInput.focus();
                break;
            case 'array':
                editorInput.value = '[]';
                editorInput.focus();
                break;
            case 'number':
                editorInput.value = '0';
                editorInput.focus();
                break;
            default:
                editorInput.value = '';
                editorInput.focus();
                break;
        }
    }

    function applyEdit() {
        if (!editingPath) return;

        if (editingMode === 'key') {
            applyKeyEdit();
        } else {
            applyValueEdit();
        }

        closeEditor();
        rebuildTable();
        syncToInput();
    }

    function applyKeyEdit() {
        const newKey = editorInput.value.trim();
        if (!newKey) return;

        const oldKey = editingPath[editingPath.length - 1];
        if (newKey === oldKey) return;

        const parentPath = editingPath.slice(0, -1);
        const parent = getNestedValue(currentData, parentPath);

        if (typeof parent === 'object' && !Array.isArray(parent)) {
            const entries = Object.entries(parent);
            const idx = entries.findIndex(([k]) => k === oldKey);
            if (idx !== -1) {
                entries[idx][0] = newKey;
                const newObj = {};
                for (const [k, v] of entries) newObj[k] = v;

                if (parentPath.length === 0) {
                    currentData = newObj;
                } else {
                    setNestedValue(currentData, parentPath, newObj);
                }
            }
        }
    }

    function applyValueEdit() {
        const type = editorType.value;
        let newValue;

        switch (type) {
            case 'string':
                newValue = editorInput.value;
                break;
            case 'number':
                newValue = Number(editorInput.value);
                if (isNaN(newValue)) newValue = 0;
                break;
            case 'boolean':
                newValue = editorBoolSelect.value === 'true';
                break;
            case 'null':
                newValue = null;
                break;
            case 'object':
                try { newValue = JSON.parse(editorInput.value); }
                catch { newValue = {}; }
                if (typeof newValue !== 'object' || Array.isArray(newValue)) newValue = {};
                break;
            case 'array':
                try { newValue = JSON.parse(editorInput.value); }
                catch { newValue = []; }
                if (!Array.isArray(newValue)) newValue = [];
                break;
        }

        setNestedValue(currentData, editingPath, newValue);
    }

    function deleteEntry() {
        if (!editingPath || editingPath.length === 0) return;

        const parentPath = editingPath.slice(0, -1);
        const key = editingPath[editingPath.length - 1];
        const parent = getNestedValue(currentData, parentPath);

        if (Array.isArray(parent)) {
            parent.splice(key, 1);
        } else if (typeof parent === 'object' && parent !== null) {
            delete parent[key];
        }

        closeEditor();
        rebuildTable();
        syncToInput();
        setStatus(`Deleted "${key}"`);
    }

    function addNewEntry(path, containerType) {
        const container = path.length === 0 ? currentData : getNestedValue(currentData, path);

        if (containerType === 'array') {
            container.push(null);
        } else {
            let newKey = 'newKey';
            let i = 1;
            while (container.hasOwnProperty(newKey)) {
                newKey = `newKey${i++}`;
            }
            container[newKey] = null;
        }

        rebuildTable();
        syncToInput();
        setStatus('Added new entry');
    }

    function closeEditor() {
        cellEditor.classList.add('hidden');
        editingPath = null;
        editingMode = null;
        editorType.disabled = false;
        editorInput.disabled = false;
    }

    // --- Utilities ---

    function getNestedValue(obj, path) {
        let current = obj;
        for (const key of path) {
            current = current[key];
        }
        return current;
    }

    function setNestedValue(obj, path, value) {
        if (path.length === 0) {
            currentData = value;
            return;
        }
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
    }

    function getValueType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    function isHomogeneousObjectArray(arr) {
        if (arr.length === 0) return false;
        for (const item of arr) {
            if (item === null || typeof item !== 'object' || Array.isArray(item)) return false;
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
        setStatus('Error');
    }

    function setStatus(text) {
        statusText.textContent = text;
    }

    function clearAll() {
        jsonInput.value = '';
        errorMessage.classList.add('hidden');
        tableContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
                <p>Paste JSON and press <strong>Ctrl+Enter</strong> or toggle the Code panel</p>
                <p class="empty-hint">Click any key or value to edit &bull; Change types via dropdown &bull; Add fields with +</p>
            </div>`;
        currentData = null;
        saveBtn.disabled = true;
        copyBtn.disabled = true;
        statsText.textContent = '';
        setStatus('Ready');
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
            "@type": "GeographicSite",
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "Example Site Datacenter",
            "description": "German virtual site created with GAM address reference",
            "status": "planned",
            "siteCategory": "VirtualSite",
            "creationDate": "2026-07-23T10:10:00Z",
            "externalIdentifier": [
                {
                    "@type": "ExternalIdentifier",
                    "owner": "CRM-T",
                    "externalIdentifierType": "StandortID",
                    "id": "1-XXXXXX"
                }
            ],
            "relatedParty": [
                {
                    "@type": "RelatedPartyRefOrPartyRoleRef",
                    "role": "Customer",
                    "partyOrPartyRole": {
                        "id": "org-00000-example-001",
                        "name": "ACME Corp",
                        "@type": "PartyRef",
                        "@referredType": "Organization"
                    }
                },
                {
                    "@type": "RelatedPartyRefOrPartyRoleRef",
                    "role": "ContactFacilityManagement",
                    "partyOrPartyRole": {
                        "id": "ind-00000-example-003",
                        "name": "Alex Example",
                        "@type": "PartyRef",
                        "@referredType": "Individual"
                    }
                }
            ],
            "relatedAddress": [
                {
                    "@type": "RelatedGeographicAddressRef",
                    "role": "Registered Address",
                    "address": {
                        "@type": "GeographicAddressValue",
                        "city": "Beispielstadt",
                        "country": "DE",
                        "postcode": "11111",
                        "streetName": "Testweg",
                        "streetNr": "99"
                    }
                }
            ],
            "siteFeature": [
                {
                    "@type": "AddressFeature",
                    "name": "Address Details GAM Reference",
                    "featureCharacteristic": [
                        {
                            "@type": "KlsIdCharacteristic",
                            "name": "klsId",
                            "value": "8888888"
                        }
                    ]
                }
            ]
        };
        jsonInput.value = JSON.stringify(sample, null, 4);
        currentData = sample;
        rebuildTable();
        saveBtn.disabled = false;
        copyBtn.disabled = false;
        setStatus('Sample data loaded');
    }
});
