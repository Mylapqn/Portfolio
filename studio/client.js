(() => {
    const state = {
        projects: [],
        tags: [],
        selectedTags: [],
        thumbnail: null,
        inlineImages: [],
        existingId: null,
        isDirty: false,
        isSaving: false,
        savedSnapshot: '',
        pendingSwitch: null
    };

    const element = (id) => document.getElementById(id);
    const dateInput = element('date');
    const titleInput = element('title');
    const slugInput = element('id');
    const tagInput = element('tag-input');
    const tagSuggestions = element('tag-suggestions');
    const tagChips = element('tag-chips');
    const thumbnailDropzone = element('thumb-drop');
    const thumbnailInput = element('thumb-input');
    const bodyEditor = element('body');
    const projectList = element('project-list');
    const status = element('status');
    const colorPicker = element('color-picker');
    const unsavedDialog = element('unsaved-dialog');

    dateInput.valueAsDate = new Date();

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.dataset.error = String(isError);
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
        return result;
    }

    function slugify(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function normalizeHex(value) {
        const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
        return match ? `#${match[1].toLowerCase()}` : null;
    }

    function currentSnapshot() {
        return JSON.stringify({
            type: element('type').value,
            date: dateInput.value,
            title: titleInput.value,
            id: slugInput.value,
            tagDraft: tagInput.value,
            summary: element('summary').value,
            tags: state.selectedTags,
            url: element('url').value,
            embed: element('embed').value,
            size: element('size').value,
            colorEnabled: element('color-enabled').checked,
            color: element('color').value,
            thumb: element('thumb-url').value,
            body: bodyEditor.value,
            thumbnail: state.thumbnail ? state.thumbnail.name : '',
            inlineImages: state.inlineImages.map((image) => image.name)
        });
    }

    function updateDirtyState() {
        state.isDirty = currentSnapshot() !== state.savedSnapshot;
        element('dirty-indicator').hidden = !state.isDirty;
        element('editor-title').textContent = titleInput.value.trim() ||
            (state.existingId ? 'Edit project' : 'Create a project');
    }

    function markClean() {
        state.savedSnapshot = currentSnapshot();
        state.isDirty = false;
        element('dirty-indicator').hidden = true;
        element('editor-title').textContent = titleInput.value.trim() ||
            (state.existingId ? 'Edit project' : 'Create a project');
    }

    function requestSwitch(action) {
        if (state.isSaving) return;
        if (!state.isDirty) {
            action();
            return;
        }
        state.pendingSwitch = action;
        unsavedDialog.showModal();
    }

    function performPendingSwitch() {
        const action = state.pendingSwitch;
        state.pendingSwitch = null;
        if (action) action();
    }

    titleInput.addEventListener('input', () => {
        if (!state.existingId) slugInput.value = slugify(titleInput.value);
        updateDirtyState();
    });

    element('project-form').addEventListener('input', updateDirtyState);
    element('project-form').addEventListener('change', updateDirtyState);

    element('color-enabled').addEventListener('change', () => {
        colorPicker.hidden = !element('color-enabled').checked;
        updateDirtyState();
    });

    function addTag(tag) {
        const normalized = tag.trim();
        if (!normalized || state.selectedTags.some((current) => current.toLowerCase() === normalized.toLowerCase())) {
            tagInput.value = '';
            tagSuggestions.hidden = true;
            return;
        }
        state.selectedTags.push(normalized);
        tagInput.value = '';
        tagSuggestions.hidden = true;
        renderTags();
        updateDirtyState();
    }

    function renderTags() {
        tagChips.replaceChildren();
        state.selectedTags.forEach((tag) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            const text = document.createElement('span');
            text.textContent = tag;
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = '×';
            remove.setAttribute('aria-label', `Remove ${tag} tag`);
            remove.addEventListener('click', () => {
                state.selectedTags = state.selectedTags.filter((current) => current !== tag);
                renderTags();
                updateDirtyState();
            });
            chip.append(text, remove);
            tagChips.appendChild(chip);
        });
    }

    function renderSuggestions() {
        const query = tagInput.value.trim().toLocaleLowerCase();
        tagSuggestions.replaceChildren();
        const matches = state.tags
            .filter((tag) =>
                tag.toLocaleLowerCase().includes(query) &&
                !state.selectedTags.some((selected) => selected.toLocaleLowerCase() === tag.toLocaleLowerCase())
            )
            .slice(0, 8);

        if (!query || !matches.length) {
            tagSuggestions.hidden = true;
            return;
        }

        matches.forEach((tag) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'suggestion';
            option.setAttribute('role', 'option');
            option.textContent = tag;
            option.addEventListener('click', () => addTag(tag));
            tagSuggestions.appendChild(option);
        });
        tagSuggestions.hidden = false;
    }

    tagInput.addEventListener('input', renderSuggestions);
    tagInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const firstSuggestion = tagSuggestions.querySelector('.suggestion');
            addTag(firstSuggestion ? firstSuggestion.textContent : tagInput.value);
        } else if (event.key === 'Escape') {
            tagSuggestions.hidden = true;
        }
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tag-entry')) tagSuggestions.hidden = true;
    });

    function renderProjectList(filter = '') {
        projectList.replaceChildren();
        const query = filter.trim().toLocaleLowerCase();
        const projects = state.projects.filter((project) =>
            `${project.title} ${project.id} ${project.tags.join(' ')}`.toLocaleLowerCase().includes(query)
        );
        element('project-count').textContent = `${projects.length} ${projects.length === 1 ? 'entry' : 'entries'}`;

        if (!projects.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-list';
            empty.textContent = query ? 'No matching projects.' : 'No entries yet.';
            projectList.appendChild(empty);
            return;
        }

        projects.forEach((project) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'project-item';
            button.setAttribute('aria-current', String(project.id === state.existingId));
            const title = document.createElement('strong');
            title.textContent = project.title;
            const details = document.createElement('span');
            details.textContent = `${project.type === 'work' ? 'Work' : 'Article'} · ${project.date || 'No date'}`;
            button.append(title, details);
            button.addEventListener('click', () => {
                if (project.id === state.existingId) return;
                requestSwitch(() => loadProject(project.id));
            });
            projectList.appendChild(button);
        });
    }

    function clearForm() {
        state.existingId = null;
        state.selectedTags = [];
        state.thumbnail = null;
        state.inlineImages = [];
        element('project-form').reset();
        dateInput.valueAsDate = new Date();
        colorPicker.hidden = true;
        element('thumb-name').textContent = 'Image uploads are saved to the assets folder.';
        slugInput.disabled = false;
        element('editing-badge').hidden = true;
        element('save-build').textContent = 'Save & Build';
        renderTags();
        renderProjectList(element('project-search').value);
        markClean();
        showStatus('');
    }

    async function loadProject(id) {
        try {
            const result = await requestJson(`/api/projects/${encodeURIComponent(id)}`);
            const project = result.project;
            state.existingId = project.id;
            state.selectedTags = project.tags;
            state.thumbnail = null;
            state.inlineImages = [];
            tagInput.value = '';
            tagSuggestions.hidden = true;
            element('type').value = project.type;
            dateInput.value = project.date;
            titleInput.value = project.title;
            slugInput.value = project.id;
            slugInput.disabled = true;
            element('summary').value = project.summary;
            element('thumb-url').value = project.thumb;
            element('url').value = project.url;
            element('embed').value = project.embed;
            element('size').value = String(project.size || 1);
            element('color-enabled').checked = Boolean(project.color);
            element('color').value = normalizeHex(project.color) || '#58a6ff';
            colorPicker.hidden = !element('color-enabled').checked;
            bodyEditor.value = result.body;
            element('thumb-name').textContent = project.thumb || 'Image uploads are saved to the assets folder.';
            element('editing-badge').hidden = false;
            element('save-build').textContent = 'Update & Build';
            renderTags();
            renderProjectList(element('project-search').value);
            markClean();
            showStatus(`Loaded ${project.title}.`);
            return true;
        } catch (error) {
            showStatus(error.message, true);
            return false;
        }
    }

    function selectThumbnail(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('Choose an image file for the thumbnail.', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            state.thumbnail = { name: file.name, dataUrl: reader.result };
            element('thumb-name').textContent = `Selected: ${file.name}`;
            updateDirtyState();
        };
        reader.onerror = () => showStatus(`Could not read ${file.name}.`, true);
        reader.readAsDataURL(file);
    }

    thumbnailDropzone.addEventListener('click', () => thumbnailInput.click());
    thumbnailDropzone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            thumbnailInput.click();
        }
    });
    thumbnailDropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        thumbnailDropzone.classList.add('drag');
    });
    thumbnailDropzone.addEventListener('dragleave', () => thumbnailDropzone.classList.remove('drag'));
    thumbnailDropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        thumbnailDropzone.classList.remove('drag');
        const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith('image/'));
        if (file) selectThumbnail(file);
    });
    thumbnailInput.addEventListener('change', () => {
        if (thumbnailInput.files[0]) selectThumbnail(thumbnailInput.files[0]);
    });

    bodyEditor.addEventListener('dragover', (event) => event.preventDefault());
    bodyEditor.addEventListener('drop', (event) => {
        const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
        if (!files.length) return;
        event.preventDefault();
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                state.inlineImages.push({ name: file.name, dataUrl: reader.result });
                const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
                const slug = slugInput.value || 'project';
                bodyEditor.value += `\n![${file.name}](/assets/${slug}-${safeFilename})\n`;
                updateDirtyState();
            };
            reader.onerror = () => showStatus(`Could not read ${file.name}.`, true);
            reader.readAsDataURL(file);
        });
    });

    async function saveProject(buildAfterSave) {
        if (state.isSaving) return false;
        const selectedColor = element('color-enabled').checked
            ? normalizeHex(element('color').value)
            : '';
        if (element('color-enabled').checked && !selectedColor) {
            showStatus('Enter a valid 6-digit hex color before saving.', true);
            return false;
        }

        const payload = {
            id: slugInput.value.trim(),
            existingId: state.existingId,
            type: element('type').value,
            title: titleInput.value.trim(),
            date: dateInput.value,
            tags: state.selectedTags,
            summary: element('summary').value.trim(),
            thumb: element('thumb-url').value.trim(),
            url: element('url').value.trim(),
            embed: element('embed').value.trim(),
            size: Number(element('size').value),
            color: selectedColor || '',
            body: bodyEditor.value,
            thumbFile: state.thumbnail,
            inlineFiles: state.inlineImages
        };

        if (!payload.id || !payload.title) {
            showStatus('Title and slug are required.', true);
            return false;
        }

        const buttons = [element('save-file'), element('save-build')];
        state.isSaving = true;
        buttons.forEach((button) => { button.disabled = true; });
        let saved = false;
        try {
            showStatus('Saving Markdown file…');
            const result = await requestJson('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            saved = true;
            state.thumbnail = null;
            state.inlineImages = [];
            await refreshProjects();
            if (!await loadProject(payload.id)) {
                throw new Error('The saved project could not be reloaded.');
            }
            if (!buildAfterSave) {
                showStatus(result.message);
                return true;
            }

            showStatus(`${result.message} Building content…`);
            const buildResult = await requestJson('/api/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushFtp: false })
            });
            showStatus(`${result.message} ${buildResult.message}`);
            return true;
        } catch (error) {
            const message = saved
                ? `Saved content/${payload.id}.md, but the next step failed: ${error.message}`
                : `ERROR: ${error.message}`;
            showStatus(message, true);
            return false;
        } finally {
            state.isSaving = false;
            buttons.forEach((button) => { button.disabled = false; });
        }
    }

    async function buildContent(pushToFtp) {
        const buttons = [element('build-content'), element('build-ftp')];
        buttons.forEach((button) => { button.disabled = true; });
        element('dashboard-status').dataset.error = 'false';
        element('dashboard-status').textContent = pushToFtp
            ? 'Building content and uploading to FTP…'
            : 'Building content…';
        try {
            const result = await requestJson('/api/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushFtp: pushToFtp })
            });
            element('dashboard-status').textContent = result.message;
        } catch (error) {
            element('dashboard-status').textContent = `ERROR: ${error.message}`;
            element('dashboard-status').dataset.error = 'true';
        } finally {
            buttons.forEach((button) => { button.disabled = false; });
        }
    }

    async function refreshProjects() {
        const [projects, tags] = await Promise.all([
            requestJson('/api/projects'),
            requestJson('/api/tags')
        ]);
        state.projects = projects;
        state.tags = tags;
        renderProjectList(element('project-search').value);
    }

    element('project-search').addEventListener('input', (event) => renderProjectList(event.target.value));
    element('new-project').addEventListener('click', () => requestSwitch(clearForm));
    element('save-file').addEventListener('click', () => saveProject(false));
    element('project-form').addEventListener('submit', (event) => {
        event.preventDefault();
        saveProject(true);
    });
    element('build-content').addEventListener('click', () => buildContent(false));
    element('build-ftp').addEventListener('click', () => buildContent(true));

    element('unsaved-cancel').addEventListener('click', () => {
        state.pendingSwitch = null;
        unsavedDialog.close();
    });
    element('unsaved-discard').addEventListener('click', () => {
        unsavedDialog.close();
        performPendingSwitch();
    });
    element('unsaved-save').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const saved = await saveProject(false);
        button.disabled = false;
        if (saved) {
            unsavedDialog.close();
            performPendingSwitch();
        }
    });
    unsavedDialog.addEventListener('cancel', () => {
        state.pendingSwitch = null;
    });

    colorPicker.hidden = true;
    markClean();

    refreshProjects().catch((error) => {
        element('project-error').textContent = `Could not load projects: ${error.message}`;
        element('project-count').textContent = 'Could not load entries';
    });
})();
