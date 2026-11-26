// @ts-check

(() => {
    /** @typedef {{ name: string, dataUrl: string }} UploadedFile */
    /** @typedef {{ id: string, type: 'work' | 'article', title: string, date: string, tags: string[], summary: string, thumb: string, url: string, embed: string, urlIcon: 'link' | 'itch', embedIcon: 'game' | 'itch' | 'sketchfab' | 'video', size: number, color: string }} Project */
    /** @typedef {{ project: Project, body: string }} ProjectResponse */
    /** @typedef {{ message: string }} MessageResponse */

    /**
     * @typedef {Object} StudioState
     * @property {Project[]} projects
     * @property {string[]} tags
     * @property {string[]} selectedTags
     * @property {UploadedFile | null} thumbnail
     * @property {UploadedFile[]} inlineImages
     * @property {string | null} existingId
     * @property {boolean} isDirty
     * @property {boolean} isSaving
     * @property {string} savedSnapshot
     * @property {(() => void) | null} pendingSwitch
     * @property {number} uploadGeneration
     * @property {number} uploadRevision
     * @property {number} pendingUploads
     * @property {string[]} uploadErrors
     * @property {Set<Promise<void>>} pendingFileReads
     */

    /** @type {StudioState} */
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
        pendingSwitch: null,
        uploadGeneration: 0,
        uploadRevision: 0,
        pendingUploads: 0,
        uploadErrors: [],
        pendingFileReads: new Set()
    };

    /** Returns a required Studio element and fails clearly if the page markup is incomplete. */
    /** @param {string} id @returns {HTMLElement} */
    function element(id) {
        const found = document.getElementById(id);
        if (!found) throw new Error(`Studio element "${id}" was not found.`);
        return found;
    }

    /** Returns a form field that supports a string value. */
    /** @param {string} id @returns {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */
    function field(id) {
        const found = element(id);
        if (
            !(found instanceof HTMLInputElement) &&
            !(found instanceof HTMLSelectElement) &&
            !(found instanceof HTMLTextAreaElement)
        ) {
            throw new Error(`Studio field "${id}" is not a form control.`);
        }
        return found;
    }

    /** Returns a required input element. */
    /** @param {string} id @returns {HTMLInputElement} */
    function input(id) {
        const found = element(id);
        if (!(found instanceof HTMLInputElement)) {
            throw new Error(`Studio element "${id}" is not an input.`);
        }
        return found;
    }

    /** Returns a required textarea. */
    /** @param {string} id @returns {HTMLTextAreaElement} */
    function textarea(id) {
        const found = element(id);
        if (!(found instanceof HTMLTextAreaElement)) {
            throw new Error(`Studio element "${id}" is not a textarea.`);
        }
        return found;
    }

    /** @param {string} id @returns {HTMLDialogElement} */
    function dialog(id) {
        const found = element(id);
        if (!(found instanceof HTMLDialogElement)) {
            throw new Error(`Studio element "${id}" is not a dialog.`);
        }
        return found;
    }

    /** Returns today's date in the local calendar, formatted for an HTML date input. */
    /** @param {Date} [date] @returns {string} */
    function localDateValue(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /** Converts an unknown thrown value to readable error text. */
    /** @param {unknown} error @returns {string} */
    function errorMessage(error) {
        return error instanceof Error ? error.message : String(error);
    }

    /** Checks objects returned by the Studio API. */
    /** @param {unknown} value @returns {value is Record<string, unknown>} */
    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    /** Checks a project response before it enters the editor. */
    /** @param {unknown} value @returns {value is Project} */
    function isProject(value) {
        return isRecord(value) &&
            typeof value.id === 'string' &&
            (value.type === 'work' || value.type === 'article') &&
            typeof value.title === 'string' &&
            typeof value.date === 'string' &&
            Array.isArray(value.tags) &&
            value.tags.every((tag) => typeof tag === 'string') &&
            typeof value.summary === 'string' &&
            typeof value.thumb === 'string' &&
            typeof value.url === 'string' &&
            typeof value.embed === 'string' &&
            (value.urlIcon === 'link' || value.urlIcon === 'itch') &&
            (value.embedIcon === 'game' || value.embedIcon === 'itch' || value.embedIcon === 'sketchfab' || value.embedIcon === 'video') &&
            typeof value.size === 'number' &&
            typeof value.color === 'string';
    }

    /** Validates the project and body returned by the entry endpoint. */
    /** @param {unknown} value @returns {ProjectResponse} */
    function parseProjectResponse(value) {
        if (!isRecord(value) || !isProject(value.project) || typeof value.body !== 'string') {
            throw new Error('The Studio server returned an invalid project.');
        }
        return { project: value.project, body: value.body };
    }

    /** Validates a successful API response containing a status message. */
    /** @param {unknown} value @returns {MessageResponse} */
    function parseMessageResponse(value) {
        if (!isRecord(value) || typeof value.message !== 'string') {
            throw new Error('The Studio server returned an invalid response.');
        }
        return { message: value.message };
    }

    /** Validates the project and tag lists loaded by the dashboard. */
    /** @param {unknown} projects @param {unknown} tags @returns {{projects: Project[], tags: string[]}} */
    function parseProjectLists(projects, tags) {
        if (!Array.isArray(projects) || !Array.isArray(tags)) {
            throw new Error('The Studio server returned invalid project data.');
        }

        /** @type {Project[]} */
        const validProjects = [];
        for (const project of projects) {
            if (!isProject(project)) {
                throw new Error('The Studio server returned invalid project data.');
            }
            validProjects.push(project);
        }

        /** @type {string[]} */
        const validTags = [];
        for (const tag of tags) {
            if (typeof tag !== 'string') {
                throw new Error('The Studio server returned invalid project data.');
            }
            validTags.push(tag);
        }

        return { projects: validProjects, tags: validTags };
    }

    const dateInput = input('date');
    const titleInput = input('title');
    const slugInput = input('id');
    const tagInput = input('tag-input');
    const tagSuggestions = element('tag-suggestions');
    const tagChips = element('tag-chips');
    const thumbnailDropzone = element('thumb-drop');
    const thumbnailInput = input('thumb-input');
    const bodyEditor = textarea('body');
    const projectList = element('project-list');
    const status = element('status');
    const colorPicker = element('color-picker');
    const unsavedDialog = dialog('unsaved-dialog');

    dateInput.value = localDateValue();

    /** @param {string} message @param {boolean} [isError] */
    function showStatus(message, isError = false) {
        status.textContent = message;
        status.dataset.error = String(isError);
    }

    /** @param {string} url @param {RequestInit} [options] @returns {Promise<unknown>} */
    async function requestJson(url, options) {
        const response = await fetch(url, options);
        /** @type {unknown} */
        const result = await response.json();
        if (!response.ok) {
            const message = isRecord(result) && typeof result.error === 'string'
                ? result.error
                : `Request failed (${response.status}).`;
            throw new Error(message);
        }
        return result;
    }

    /** @param {string} title @returns {string} */
    function slugify(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    /** @param {string} value @returns {string | null} */
    function normalizeHex(value) {
        const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
        return match ? `#${match[1].toLowerCase()}` : null;
    }

    /** Updates the icon preview beside a Studio destination selector. */
    /** @param {string} selectId */
    function updateIconPreview(selectId) {
        const select = field(selectId);
        const preview = /** @type {HTMLImageElement} */ (element(`${selectId}-preview`));
        const fallback = element(`${selectId}-fallback`);
        const fallbackLabels = /** @type {Record<string, string>} */ ({
            link: 'LINK',
            itch: 'ITCH',
            game: 'GAME',
            sketchfab: '3D',
            video: 'VIDEO'
        });

        fallback.textContent = fallbackLabels[select.value] || 'ICON';
        fallback.hidden = true;
        preview.hidden = false;
        preview.src = `/studio-icons/${encodeURIComponent(select.value)}.svg`;
        preview.onerror = () => {
            preview.hidden = true;
            fallback.hidden = false;
        };
        preview.onload = () => {
            preview.hidden = false;
            fallback.hidden = true;
        };
    }

    /** Refreshes both destination icon previews. */
    function updateIconPreviews() {
        updateIconPreview('url-icon');
        updateIconPreview('embed-icon');
    }

    /** @returns {string} */
    function currentSnapshot() {
        return JSON.stringify({
            type: field('type').value,
            date: dateInput.value,
            title: titleInput.value,
            id: slugInput.value,
            tagDraft: tagInput.value,
            summary: field('summary').value,
            tags: state.selectedTags,
            url: field('url').value,
            urlIcon: field('url-icon').value,
            embed: field('embed').value,
            embedIcon: field('embed-icon').value,
            size: field('size').value,
            colorEnabled: input('color-enabled').checked,
            color: input('color').value,
            thumb: field('thumb-url').value,
            body: bodyEditor.value,
            uploadRevision: state.uploadRevision,
            pendingUploads: state.pendingUploads
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

    /** @param {() => void} action */
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

    /** Invalidates file reads from a form that is being cleared or replaced. */
    function resetPendingUploads() {
        state.uploadGeneration += 1;
        state.pendingUploads = 0;
        state.uploadErrors = [];
        state.thumbnail = null;
        state.inlineImages = [];
    }

    /** Reads an image as a data URL and reports file-reader failures as rejected promises. */
    /** @param {File} file @returns {Promise<string>} */
    function readImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error(`Could not read ${file.name}.`));
                }
            });
            reader.addEventListener('error', () => {
                reject(reader.error || new Error(`Could not read ${file.name}.`));
            });
            reader.readAsDataURL(file);
        });
    }

    /** Tracks image reads so saving waits for completed uploads and ignores stale forms. */
    /** @param {File} file @param {(dataUrl: string) => void} onRead */
    function trackImageRead(file, onRead) {
        const generation = state.uploadGeneration;
        state.pendingUploads += 1;
        state.uploadErrors = [];
        updateDirtyState();

        /** @type {Promise<void>} */
        let pendingRead;
        pendingRead = readImage(file)
            .then((dataUrl) => {
                if (generation !== state.uploadGeneration) return;
                state.uploadRevision += 1;
                onRead(dataUrl);
            })
            .catch((error) => {
                if (generation !== state.uploadGeneration) return;
                state.uploadErrors.push(file.name);
                showStatus(errorMessage(error), true);
            })
            .finally(() => {
                if (generation === state.uploadGeneration) {
                    state.pendingUploads -= 1;
                    updateDirtyState();
                }
                state.pendingFileReads.delete(pendingRead);
            });
        state.pendingFileReads.add(pendingRead);
    }

    titleInput.addEventListener('input', () => {
        if (!state.existingId) slugInput.value = slugify(titleInput.value);
        updateDirtyState();
    });

    const projectForm = /** @type {HTMLFormElement} */ (element('project-form'));
    projectForm.addEventListener('input', updateDirtyState);
    projectForm.addEventListener('change', updateDirtyState);

    input('color-enabled').addEventListener('change', () => {
        colorPicker.hidden = !input('color-enabled').checked;
        updateDirtyState();
    });

    /** @param {string} tag */
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
        if (!(event.target instanceof Element) || !event.target.closest('.tag-entry')) {
            tagSuggestions.hidden = true;
        }
    });

    /** @param {string} [filter] */
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
        resetPendingUploads();
        projectForm.reset();
        updateIconPreviews();
        dateInput.value = localDateValue();
        colorPicker.hidden = true;
        element('thumb-name').textContent = 'Image uploads are saved to the assets folder.';
        slugInput.disabled = false;
        element('editing-badge').hidden = true;
        element('save-build').textContent = 'Save & Build';
        renderTags();
        renderProjectList(input('project-search').value);
        markClean();
        showStatus('');
    }

    /** Loads one saved project into the editor. */
    /** @param {string} id @returns {Promise<boolean>} */
    async function loadProject(id) {
        resetPendingUploads();
        try {
            const result = parseProjectResponse(
                await requestJson(`/api/projects/${encodeURIComponent(id)}`)
            );
            const project = result.project;
            state.existingId = project.id;
            state.selectedTags = project.tags;
            state.thumbnail = null;
            state.inlineImages = [];
            tagInput.value = '';
            tagSuggestions.hidden = true;
            field('type').value = project.type;
            dateInput.value = project.date;
            titleInput.value = project.title;
            slugInput.value = project.id;
            slugInput.disabled = true;
            field('summary').value = project.summary;
            field('thumb-url').value = project.thumb;
            field('url').value = project.url;
            field('embed').value = project.embed;
            field('url-icon').value = project.urlIcon;
            field('embed-icon').value = project.embedIcon;
            updateIconPreviews();
            field('size').value = String(project.size || 1);
            input('color-enabled').checked = Boolean(project.color);
            input('color').value = normalizeHex(project.color) || '#58a6ff';
            colorPicker.hidden = !input('color-enabled').checked;
            bodyEditor.value = result.body;
            element('thumb-name').textContent = project.thumb || 'Image uploads are saved to the assets folder.';
            element('editing-badge').hidden = false;
            element('save-build').textContent = 'Update & Build';
            renderTags();
            renderProjectList(input('project-search').value);
            markClean();
            showStatus(`Loaded ${project.title}.`);
            return true;
        } catch (error) {
            showStatus(errorMessage(error), true);
            return false;
        }
    }

    /** @param {File} file */
    function selectThumbnail(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('Choose an image file for the thumbnail.', true);
            return;
        }
        trackImageRead(file, (dataUrl) => {
            state.thumbnail = { name: file.name, dataUrl };
            element('thumb-name').textContent = `Selected: ${file.name}`;
            updateDirtyState();
        });
    }

    thumbnailDropzone.addEventListener('click', () => {
        if (!state.isSaving) thumbnailInput.click();
    });
    thumbnailDropzone.addEventListener('keydown', (event) => {
        if (state.isSaving) return;
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
        if (state.isSaving) return;
        const files = event.dataTransfer?.files;
        if (!files) return;
        const file = Array.from(files).find((candidate) => candidate.type.startsWith('image/'));
        if (file) selectThumbnail(file);
    });
    thumbnailInput.addEventListener('change', () => {
        const file = thumbnailInput.files?.[0];
        if (file) selectThumbnail(file);
    });

    bodyEditor.addEventListener('dragover', (event) => event.preventDefault());
    bodyEditor.addEventListener('drop', (event) => {
        if (state.isSaving) return;
        const droppedFiles = event.dataTransfer?.files;
        if (!droppedFiles) return;
        const files = Array.from(droppedFiles).filter((file) => file.type.startsWith('image/'));
        if (!files.length) return;
        event.preventDefault();
        files.forEach((file) => {
            trackImageRead(file, (dataUrl) => {
                state.inlineImages.push({ name: file.name, dataUrl });
                const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
                const slug = slugInput.value || 'project';
                bodyEditor.value += `\n![](/assets/${slug}-${safeFilename})\n`;
                updateDirtyState();
            });
        });
    });

    /**
     * Saves the current entry and optionally rebuilds the generated site.
     * @param {boolean} buildAfterSave
     * @returns {Promise<boolean>}
     */
    async function saveProject(buildAfterSave) {
        if (state.isSaving) return false;
        state.isSaving = true;
        const controls = Array.from(
            projectForm.querySelectorAll('input, select, textarea, button')
        ).map((control) =>
            /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement} */(control)
        );
        const originalDisabledStates = controls.map((control) => control.disabled);
        controls.forEach((control) => { control.disabled = true; });
        projectForm.setAttribute('aria-busy', 'true');
        let saved = false;
        try {
            await Promise.all(state.pendingFileReads);
            if (state.uploadErrors.length) {
                showStatus(
                    `Could not read ${state.uploadErrors.join(', ')}. Select the image again before saving.`,
                    true
                );
                return false;
            }

            const colorEnabled = input('color-enabled').checked;
            const selectedColor = colorEnabled ? normalizeHex(input('color').value) : '';
            if (colorEnabled && !selectedColor) {
                showStatus('Enter a valid 6-digit hex color before saving.', true);
                return false;
            }

            const type = field('type').value;
            if (type !== 'work' && type !== 'article') {
                showStatus('Choose a valid entry type before saving.', true);
                return false;
            }

            const payload = {
                id: slugInput.value.trim(),
                existingId: state.existingId,
                type,
                title: titleInput.value.trim(),
                date: dateInput.value,
                tags: state.selectedTags,
                summary: field('summary').value.trim(),
                thumb: field('thumb-url').value.trim(),
                url: field('url').value.trim(),
                embed: field('embed').value.trim(),
                urlIcon: field('url-icon').value,
                embedIcon: field('embed-icon').value,
                size: Number(field('size').value),
                color: selectedColor || '',
                body: bodyEditor.value,
                thumbFile: state.thumbnail,
                inlineFiles: [...state.inlineImages]
            };

            if (!payload.id || !payload.title) {
                showStatus('Title and slug are required.', true);
                return false;
            }

            showStatus('Saving Markdown file…');
            const result = parseMessageResponse(await requestJson('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));
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
            const buildResult = parseMessageResponse(await requestJson('/api/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushFtp: false })
            }));
            showStatus(`${result.message} ${buildResult.message}`);
            return true;
        } catch (error) {
            const message = saved
                ? `Saved the entry, but the next step failed: ${errorMessage(error)}`
                : `ERROR: ${errorMessage(error)}`;
            showStatus(message, true);
            return false;
        } finally {
            state.isSaving = false;
            projectForm.removeAttribute('aria-busy');
            controls.forEach((control, index) => {
                control.disabled = originalDisabledStates[index];
            });
        }
    }

    /** Builds the site and optionally publishes it to FTP. */
    /** @param {boolean} pushToFtp */
    async function buildContent(pushToFtp) {
        const buttons = [
            /** @type {HTMLButtonElement} */ (element('build-content')),
            /** @type {HTMLButtonElement} */ (element('build-ftp'))
        ];
        buttons.forEach((button) => { button.disabled = true; });
        element('dashboard-status').dataset.error = 'false';
        element('dashboard-status').textContent = pushToFtp
            ? 'Building content and uploading to FTP…'
            : 'Building content…';
        try {
            const result = parseMessageResponse(await requestJson('/api/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushFtp: pushToFtp })
            }));
            element('dashboard-status').textContent = result.message;
        } catch (error) {
            element('dashboard-status').textContent = `ERROR: ${errorMessage(error)}`;
            element('dashboard-status').dataset.error = 'true';
        } finally {
            buttons.forEach((button) => { button.disabled = false; });
        }
    }

    async function refreshProjects() {
        const [projectData, tagData] = await Promise.all([
            requestJson('/api/projects'),
            requestJson('/api/tags')
        ]);
        const { projects, tags } = parseProjectLists(projectData, tagData);
        state.projects = projects;
        state.tags = tags;
        renderProjectList(input('project-search').value);
    }

    input('project-search').addEventListener('input', () => {
        renderProjectList(input('project-search').value);
    });
    element('new-project').addEventListener('click', () => requestSwitch(clearForm));
    element('save-file').addEventListener('click', () => saveProject(false));
    element('project-form').addEventListener('submit', (event) => {
        event.preventDefault();
        saveProject(true);
    });
    field('url-icon').addEventListener('change', updateIconPreviews);
    field('embed-icon').addEventListener('change', updateIconPreviews);
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
        const button = /** @type {HTMLButtonElement} */ (event.currentTarget);
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
    updateIconPreviews();
    markClean();

    refreshProjects().catch((error) => {
        element('project-error').textContent = `Could not load projects: ${errorMessage(error)}`;
        element('project-count').textContent = 'Could not load entries';
    });
})();
