"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const VIEW_TYPE = 'dayble-calendar-view';
const DEFAULT_SETTINGS = {
    weekStartDay: 0,
    entriesFolder: '',
    iconPlacement: 'left',
    eventTitleAlign: 'center',
    eventDescAlign: 'center',
    timeFormat: '24h',
    holderOpen: true,
    weeklyNotesHeight: 200,
    preferUserColors: false,
    eventBgOpacity: 0.50,
    eventBorderWidth: 0,
    eventBorderRadius: 6,
    eventBorderOpacity: 0.25,
    colorSwatchPosition: 'under-title',
    onlyAnimateToday: false,
    completeBehavior: 'dim',
    customSwatchesEnabled: false,
    replaceDefaultSwatches: false,
    defaultColorsFolded: true,
    customSwatchesFolded: false,
    dayCellMaxHeight: 0,
    holderPlacement: 'left',
    calendarWeekActive: false,
    weeklyNotesEnabled: false,
    swatches: [
        { name: 'Red', color: '#eb3b5a', textColor: '#f9c6d0' },
        { name: 'Orange', color: '#fa8231', textColor: '#fed8be' },
        { name: 'Amber', color: '#e5a216', textColor: '#f8e5bb' },
        { name: 'Green', color: '#20bf6b', textColor: '#c4eeda' },
        { name: 'Teal', color: '#0fb9b1', textColor: '#bdecea' },
        { name: 'Blue', color: '#2d98da', textColor: '#c5e3f8' },
        { name: 'Cornflower', color: '#3867d6', textColor: '#c9d5f8' },
        { name: 'Indigo', color: '#5454d0', textColor: '#d2d2f8' },
        { name: 'Purple', color: '#8854d0', textColor: '#e2d2f8' },
        { name: 'Magenta', color: '#b554d0', textColor: '#edd2f8' },
        { name: 'Pink', color: '#e832c1', textColor: '#f8c2ef' },
        { name: 'Rose', color: '#e83289', textColor: '#f8c2e0' },
        { name: 'Brown', color: '#965b3b', textColor: '#e5d4c9' },
        { name: 'Gray', color: '#8392a4', textColor: '#e3e6ea' }
    ],
    userCustomSwatches: [],
    eventCategories: [],
    triggers: []
};
class DaybleCalendarPlugin extends obsidian_1.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.registerView(VIEW_TYPE, leaf => new DaybleCalendarView(leaf, this));
            this.addCommand({ id: 'open-calendar', name: 'Open calendar', callback: () => this.openDayble() });
            this.addCommand({ id: 'focus-today', name: 'Focus on today', callback: () => this.focusToday() });
            this.addCommand({
                id: 'open-weekly-view',
                name: 'Open weekly view',
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.openDayble();
                    const view = this.getCalendarView();
                    if (view) {
                        this.settings.calendarWeekActive = true;
                        yield this.saveSettings();
                        yield view.loadAllEntries();
                        view.render();
                    }
                })
            });
            this.addCommand({
                id: 'open-monthly-view',
                name: 'Open monthly view',
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.openDayble();
                    const view = this.getCalendarView();
                    if (view) {
                        this.settings.calendarWeekActive = false;
                        yield this.saveSettings();
                        yield view.loadAllEntries();
                        view.render();
                    }
                })
            });
            this.addSettingTab(new DaybleSettingTab(this.app, this));
            this.ensureEntriesFolder();
            this.openDayble();
        });
    }
    onunload() {
        // Do not detach leaves here to respect user layout
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    openDayble() {
        return __awaiter(this, void 0, void 0, function* () {
            const leaf = this.getOrCreateLeaf();
            yield leaf.setViewState({ type: VIEW_TYPE, active: true });
            this.app.workspace.revealLeaf(leaf);
        });
    }
    focusToday() {
        const view = this.getCalendarView();
        if (view)
            view.focusToday();
        else
            this.openDayble();
    }
    getCalendarView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length > 0)
            return leaves[0].view;
        return null;
    }
    getOrCreateLeaf() {
        var _a;
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length)
            return leaves[0];
        return (_a = this.app.workspace.getLeaf(true)) !== null && _a !== void 0 ? _a : this.app.workspace.getRightLeaf(false);
    }
    ensureEntriesFolder() {
        return __awaiter(this, void 0, void 0, function* () {
            const folder = this.settings.entriesFolder;
            if (!folder || folder.trim() === '') {
                return;
            }
            try {
                yield this.app.vault.adapter.stat(folder);
            }
            catch (_) {
                try {
                    yield this.app.vault.createFolder(folder);
                }
                catch (e) {
                    console.error('[Dayble Plugin] Failed to create folder:', e);
                }
            }
        });
    }
}
exports.default = DaybleCalendarPlugin;
class DaybleCalendarView extends obsidian_1.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this._longEls = new Map();
        this.events = [];
        this.holderEvents = [];
        this.weeklyNotes = {};
        this.isSelecting = false;
        this.isDragging = false;
        this.selectionStartDate = null;
        this.selectionEndDate = null;
        this.isResizingHolder = false;
        this.holderResizeStartX = 0;
        this.holderResizeStartWidth = 0;
        this.draggedEvent = null;
        this.isResizingWeeklyNotes = false;
        this.weeklyNotesResizeStartY = 0;
        this.weeklyNotesResizeStartHeight = 0;
        this._endSelOnce = () => { document.removeEventListener('mouseup', this._endSelOnce); this.endSelection(); };
        this.plugin = plugin;
        this.currentDate = new Date();
        this.plugin.registerDomEvent(window, 'resize', () => {
            this.render();
        });
    }
    debouncedSave() {
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveAllEntries(), 1000);
    }
    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'Dayble Calendar'; }
    getIcon() { return 'calendar'; }
    getMonthDataFilePath() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const year = this.currentDate.getFullYear();
        const month = monthNames[this.currentDate.getMonth()];
        const filename = `${year}${month}.json`;
        return `${this.plugin.settings.entriesFolder}/${filename}`;
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.rootEl = this.containerEl.createDiv({ cls: 'dayble-root' });
            this.headerEl = this.rootEl.createDiv({ cls: 'dayble-header' });
            const left = this.headerEl.createDiv({ cls: 'dayble-nav-left' });
            const holderToggle = document.createElement('button');
            holderToggle.className = 'dayble-btn dayble-header-buttons dayble-holder-toggle';
            (0, obsidian_1.setIcon)(holderToggle, 'menu');
            holderToggle.onclick = () => __awaiter(this, void 0, void 0, function* () { this.holderEl.classList.toggle('open'); this.plugin.settings.holderOpen = this.holderEl.classList.contains('open'); yield this.plugin.saveSettings(); });
            const searchBtn = document.createElement('button');
            searchBtn.className = 'dayble-btn dayble-header-buttons dayble-search-toggle';
            (0, obsidian_1.setIcon)(searchBtn, 'search');
            searchBtn.onclick = () => { const modal = new PromptSearchModal(this.app, this); modal.open(); };
            const weekToggle = document.createElement('button');
            weekToggle.className = 'dayble-btn dayble-header-buttons dayble-week-toggle';
            (0, obsidian_1.setIcon)(weekToggle, 'calendar-range');
            weekToggle.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.calendarWeekActive = !this.plugin.settings.calendarWeekActive;
                yield this.plugin.saveSettings();
                yield this.loadAllEntries();
                this.render();
            });
            this.weekToggleBtn = weekToggle;
            this.monthTitleEl = this.headerEl.createEl('h1', { cls: 'dayble-month-title' });
            const right = this.headerEl.createDiv({ cls: 'dayble-nav-right' });
            const prevBtn = document.createElement('button');
            prevBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(prevBtn, 'chevron-left');
            prevBtn.onclick = () => { this.shiftMonth(-1); };
            const todayBtn = document.createElement('button');
            todayBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(todayBtn, 'dot');
            todayBtn.onclick = () => { this.focusToday(); };
            const nextBtn = document.createElement('button');
            nextBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(nextBtn, 'chevron-right');
            nextBtn.onclick = () => { this.shiftMonth(1); };
            const placement = (_a = this.plugin.settings.holderPlacement) !== null && _a !== void 0 ? _a : 'left';
            if (placement === 'left')
                left.appendChild(holderToggle);
            left.appendChild(prevBtn);
            left.appendChild(todayBtn);
            left.appendChild(nextBtn);
            left.appendChild(weekToggle);
            right.appendChild(searchBtn);
            if (placement === 'right')
                right.appendChild(holderToggle);
            this.bodyEl = this.rootEl.createDiv({ cls: 'dayble-body' });
            if (placement === 'right') {
                this.bodyEl.addClass('dayble-holder-right');
            }
            this.holderEl = this.bodyEl.createDiv({ cls: 'dayble-holder' });
            if (placement === 'hidden') {
                this.holderEl.addClass('dayble-holder-hidden');
            }
            const holderHeader = this.holderEl.createDiv({ cls: 'dayble-holder-header', text: 'Holder' });
            const holderAdd = holderHeader.createEl('button', { cls: 'dayble-btn dayble-holder-add-btn' });
            (0, obsidian_1.setIcon)(holderAdd, 'plus');
            holderAdd.onclick = () => this.openEventModal();
            // Add resize handle to holder
            const resizeHandle = holderHeader.createDiv({ cls: 'dayble-holder-resize-handle' });
            this._boundHolderMouseMove = (e) => {
                if (!this.isResizingHolder)
                    return;
                let diff = e.clientX - this.holderResizeStartX;
                // When holder is on the right, reverse the direction
                if (placement === 'right') {
                    diff = -diff;
                }
                const newWidth = Math.max(200, this.holderResizeStartWidth + diff);
                this.holderEl.style.width = newWidth + 'px';
            };
            this._boundHolderMouseUp = (e) => __awaiter(this, void 0, void 0, function* () {
                if (this.isResizingHolder) {
                    this.isResizingHolder = false;
                    document.removeEventListener('mousemove', this._boundHolderMouseMove);
                    document.removeEventListener('mouseup', this._boundHolderMouseUp);
                    this.plugin.settings.holderWidth = this.holderEl.offsetWidth;
                    yield this.plugin.saveSettings();
                }
            });
            resizeHandle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isResizingHolder = true;
                this.holderResizeStartX = e.clientX;
                this.holderResizeStartWidth = this.holderEl.offsetWidth;
                document.addEventListener('mousemove', this._boundHolderMouseMove);
                document.addEventListener('mouseup', this._boundHolderMouseUp);
            };
            const holderList = this.holderEl.createDiv({ cls: 'dayble-holder-list' });
            // Add drag handlers to holder for dropping events there
            this.holderEl.ondragover = (e) => { e.preventDefault(); this.holderEl.addClass('dayble-drag-over'); };
            this.holderEl.ondragleave = () => { this.holderEl.removeClass('dayble-drag-over'); };
            this.holderEl.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                e.preventDefault();
                this.holderEl.removeClass('dayble-drag-over');
                const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                if (!id || src === 'holder')
                    return; // Don't drop holder events on holder
                try {
                    const idx = this.events.findIndex(ev => ev.id === id);
                    if (idx !== -1) {
                        const ev = this.events.splice(idx, 1)[0];
                        // Reset date info when moving to holder
                        ev.date = undefined;
                        ev.startDate = undefined;
                        ev.endDate = undefined;
                        this.holderEvents.push(ev);
                        yield this.saveAllEntries();
                        this.renderHolder();
                        this.render();
                    }
                }
                catch (error) {
                    new obsidian_1.Notice('Failed to move event to holder');
                }
            });
            this.holderEl.appendChild(holderList);
            // Apply saved holder width if it exists
            if (this.plugin.settings.holderWidth) {
                this.holderEl.style.width = this.plugin.settings.holderWidth + 'px';
            }
            if (this.plugin.settings.holderOpen)
                this.holderEl.addClass('open');
            else
                this.holderEl.removeClass('open');
            this.calendarEl = this.bodyEl.createDiv({ cls: 'dayble-calendar' });
            this.weekHeaderEl = this.calendarEl.createDiv({ cls: 'dayble-weekdays' });
            this.gridEl = this.calendarEl.createDiv({ cls: 'dayble-grid' });
            yield this.loadAllEntries();
            this.render();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clean up resize handle listeners
            if (this._boundHolderMouseMove) {
                document.removeEventListener('mousemove', this._boundHolderMouseMove);
            }
            if (this._boundHolderMouseUp) {
                document.removeEventListener('mouseup', this._boundHolderMouseUp);
            }
            // Disconnect long event ResizeObserver and remove overlay to prevent leaks
            if (this._longRO) {
                try {
                    this._longRO.disconnect();
                }
                catch (_a) { }
                this._longRO = undefined;
            }
            if (this._longOverlayEl && this._longOverlayEl.isConnected) {
                try {
                    this._longOverlayEl.remove();
                }
                catch (_b) { }
            }
            this._longEls.forEach(el => {
                try {
                    if (el && el.parentElement)
                        el.remove();
                }
                catch (_a) { }
            });
            this._longEls.clear();
            if (this._boundWeeklyNotesMouseMove) {
                document.removeEventListener('mousemove', this._boundWeeklyNotesMouseMove);
            }
            if (this._boundWeeklyNotesMouseUp) {
                document.removeEventListener('mouseup', this._boundWeeklyNotesMouseUp);
            }
            this.renderHolder();
            yield Promise.resolve();
        });
    }
    getRequiredFiles() {
        const files = new Set();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const addDate = (d) => {
            const y = d.getFullYear();
            const m = monthNames[d.getMonth()];
            files.add(`${y}${m}.json`);
        };
        // Always add current date's month
        addDate(this.currentDate);
        if (this.plugin.settings.calendarWeekActive) {
            const weekStart = this.plugin.settings.weekStartDay;
            const base = new Date(this.currentDate);
            const tDow = base.getDay();
            const diff = ((tDow - weekStart) + 7) % 7;
            const start = new Date(base);
            start.setDate(base.getDate() - diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            addDate(start);
            addDate(end);
        }
        return files;
    }
    loadAllEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = this.getRequiredFiles();
            this.events = [];
            this.holderEvents = [];
            this.weeklyNotes = {};
            const currentFile = this.getMonthDataFilePath().split('/').pop();
            let holderFromGlobal = null;
            try {
                const holderFile = `${this.plugin.settings.entriesFolder}/holder.json`;
                const hjson = yield this.app.vault.adapter.read(holderFile);
                const hdata = JSON.parse(hjson);
                if (Array.isArray(hdata === null || hdata === void 0 ? void 0 : hdata.holder)) {
                    holderFromGlobal = hdata.holder;
                }
            }
            catch (_) { }
            const holderAggregate = [];
            for (const filename of files) {
                const file = `${this.plugin.settings.entriesFolder}/${filename}`;
                try {
                    const json = yield this.app.vault.adapter.read(file);
                    const data = JSON.parse(json);
                    if (data.events) {
                        this.events.push(...data.events);
                    }
                    if (!holderFromGlobal && Array.isArray(data.holder)) {
                        holderAggregate.push(...data.holder);
                    }
                    if (filename === currentFile) {
                        this.weeklyNotes = data.weeklyNotes || {};
                    }
                }
                catch (e) { }
            }
            const seen = new Set();
            this.events = this.events.filter(e => {
                const duplicate = seen.has(e.id);
                seen.add(e.id);
                return !duplicate;
            });
            const finalizeHolder = (list) => {
                const hSeen = new Set();
                const dedup = [];
                for (let i = list.length - 1; i >= 0; i--) {
                    const h = list[i];
                    if (!h || !h.id)
                        continue;
                    if (hSeen.has(h.id))
                        continue;
                    hSeen.add(h.id);
                    dedup.unshift(h);
                }
                return dedup;
            };
            if (holderFromGlobal) {
                this.holderEvents = finalizeHolder(holderFromGlobal);
            }
            else {
                this.holderEvents = finalizeHolder(holderAggregate);
            }
        });
    }
    saveAllEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = (_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim();
            if (!folder) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            try {
                yield this.app.vault.adapter.stat(folder);
            }
            catch (_b) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            const filesToSave = this.getRequiredFiles();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const getFilenameForDate = (dateStr) => {
                const d = new Date(dateStr);
                if (isNaN(d.getTime()))
                    return null;
                const y = d.getFullYear();
                const m = monthNames[d.getMonth()];
                return `${y}${m}.json`;
            };
            const currentFile = this.getMonthDataFilePath().split('/').pop();
            // We need to read all files first to ensure we don't lose events that are NOT in this.events (e.g. out of view range)
            // But wait, if we only loaded events from `filesToSave`, and `this.events` contains modifications...
            // If we modify an event, it's in `this.events`.
            // If we delete an event, it's removed from `this.events`.
            // If there are events in the files that are NOT in `this.events`, it implies they were not loaded.
            // Since `loadAllEntries` loads EVERYTHING from `filesToSave`, `this.events` should cover ALL events in those files.
            // So we can safely overwrite `filesToSave`.
            // Partition events by target filename
            const eventsByFile = {};
            // Initialize arrays for known files
            filesToSave.forEach(f => eventsByFile[f] = []);
            const orphanEvents = [];
            this.events.forEach(ev => {
                let targetFile = currentFile; // Default to current file if no date
                if (ev.date) {
                    targetFile = getFilenameForDate(ev.date) || currentFile;
                }
                else if (ev.startDate) {
                    targetFile = getFilenameForDate(ev.startDate) || currentFile;
                }
                if (targetFile) {
                    if (!eventsByFile[targetFile])
                        eventsByFile[targetFile] = [];
                    eventsByFile[targetFile].push(ev);
                }
                else {
                    orphanEvents.push(ev);
                }
            });
            // If we have events that belong to files NOT in `filesToSave` (e.g. moved event to far future),
            // we should probably save those files too.
            // But for now, let's focus on `filesToSave` + any new targets found.
            // Save each file
            for (const filename of Object.keys(eventsByFile)) {
                const fileEvents = eventsByFile[filename];
                const isCurrent = filename === currentFile;
                const file = `${folder}/${filename}`;
                // We need to preserve holder/weeklyNotes if we are NOT the current file
                // But wait, `loadAllEntries` only loaded holder from `currentFile`.
                // So for other files, we don't know their holder content!
                // We MUST read them to preserve holder/notes.
                let holderToSave = [];
                let notesToSave = {};
                // Write the same holder list to all files to keep it global
                holderToSave = this.holderEvents;
                // Weekly notes are per-file; preserve existing notes for non-current files
                if (isCurrent) {
                    notesToSave = this.weeklyNotes;
                }
                else {
                    try {
                        if (yield this.app.vault.adapter.exists(file)) {
                            const json = yield this.app.vault.adapter.read(file);
                            const data = JSON.parse(json);
                            notesToSave = data.weeklyNotes || {};
                        }
                    }
                    catch (e) { }
                }
                const data = {
                    events: fileEvents,
                    holder: holderToSave,
                    weeklyNotes: notesToSave,
                    lastModified: new Date().toISOString()
                };
                try {
                    const jsonStr = JSON.stringify(data, null, 2);
                    yield this.app.vault.adapter.write(file, jsonStr);
                }
                catch (e) {
                    console.error('[Dayble] Failed to save', filename, e);
                }
            }
            const holderFile = `${folder}/holder.json`;
            try {
                const hdata = {
                    holder: this.holderEvents,
                    lastModified: new Date().toISOString()
                };
                const hjsonStr = JSON.stringify(hdata, null, 2);
                yield this.app.vault.adapter.write(holderFile, hjsonStr);
            }
            catch (e) {
                console.error('[Dayble] Failed to save holder.json', e);
            }
        });
    }
    focusToday() {
        this.currentDate = new Date();
        void this.loadAllEntries().then(() => this.render());
    }
    shiftMonth(delta) {
        if (this.plugin.settings.calendarWeekActive) {
            this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
        }
        else {
            const d = new Date(this.currentDate);
            d.setMonth(d.getMonth() + delta);
            this.currentDate = d;
        }
        void this.loadAllEntries().then(() => this.render());
    }
    render(titleEl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.weeklyNotesEl) {
                this.weeklyNotesEl.remove();
                this.weeklyNotesEl = undefined;
            }
            // Reset grid style
            this.gridEl.style.flex = '1 1 auto';
            this.gridEl.style.minHeight = '';
            if (this.plugin.settings.calendarWeekActive) {
                this.gridEl.addClass('dayble-week-mode');
                yield this.renderWeekView(titleEl);
            }
            else {
                this.gridEl.removeClass('dayble-week-mode');
                this.renderMonthView(titleEl);
            }
        });
    }
    renderWeekView(titleEl) {
        return __awaiter(this, void 0, void 0, function* () {
            const y = this.currentDate.getFullYear();
            const m = this.currentDate.getMonth();
            const monthLabel = this.currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (this.monthTitleEl)
                this.monthTitleEl.setText(monthLabel);
            // Update week toggle button active state
            if (this.weekToggleBtn) {
                if (this.plugin.settings.calendarWeekActive)
                    this.weekToggleBtn.addClass('active');
                else
                    this.weekToggleBtn.removeClass('active');
            }
            this.gridEl.empty();
            this.weekHeaderEl.empty();
            const weekStart = this.plugin.settings.weekStartDay;
            const base = new Date(this.currentDate);
            const tDow = base.getDay();
            const diff = ((tDow - weekStart) + 7) % 7;
            const start = new Date(base);
            start.setDate(base.getDate() - diff); // Start of the week
            // Header
            const header = this.weekHeaderEl.createDiv({ cls: 'dayble-grid-header' });
            const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const ordered = days.slice(weekStart).concat(days.slice(0, weekStart));
            ordered.forEach(d => header.createDiv({ text: d, cls: 'dayble-grid-header-cell' }));
            // Pre-calculate long event margins (reused from month view logic)
            const segmentHeight = 28;
            const segmentGap = 4; // gappy
            const countsByDate = {};
            const longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
            longEventsPreset.forEach(ev => {
                const start = new Date(ev.startDate);
                const end = new Date(ev.endDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const yy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const key = `${yy}-${mm}-${dd}`;
                    countsByDate[key] = (countsByDate[key] || 0) + 1;
                }
            });
            // Grid
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const yy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fullDate = `${yy}-${mm}-${dd}`;
                const cell = fragment.createDiv({ cls: 'dayble-day' });
                cell.setAttr('data-date', fullDate);
                const dayHeader = cell.createDiv({ cls: 'dayble-day-header' });
                const num = dayHeader.createDiv({ cls: 'dayble-day-number', text: String(d.getDate()) });
                const t = new Date();
                const isToday = d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                if (isToday) {
                    cell.addClass('dayble-current-day');
                    const searchBtn = dayHeader.createEl('button', { cls: 'dayble-day-search-btn' });
                    searchBtn.addClass('db-day-search-btn');
                    (0, obsidian_1.setIcon)(searchBtn, 'focus');
                    searchBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openTodayModal(fullDate);
                        return false;
                    };
                    searchBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                    searchBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); };
                }
                const longContainer = cell.createDiv({ cls: 'dayble-long-container' });
                longContainer.addClass('db-long-container');
                const container = cell.createDiv({ cls: 'dayble-event-container' });
                // Apply margins for long events
                const preCount = countsByDate[fullDate] || 0;
                const preMt = preCount > 0 ? (preCount * segmentHeight) + (Math.max(0, preCount - 1) * segmentGap) + 2 : 0;
                const adjusted = Math.max(0, preMt - 6);
                container.style.marginTop = adjusted ? `${adjusted}px` : '';
                const dayEvents = this.events.filter(e => e.date === fullDate);
                dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
                // Drag and Drop (reused optimized logic from month view)
                container.ondragover = (e) => {
                    var _a;
                    e.preventDefault();
                    const targetEvent = e.target.closest('.dayble-event');
                    const eventCount = container.querySelectorAll('.dayble-event').length;
                    if (targetEvent && targetEvent.parentElement === container && eventCount > 1) {
                        const rect = targetEvent.getBoundingClientRect();
                        const relativeY = e.clientY - rect.top;
                        const eventHeight = rect.height;
                        container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                        const indicator = container.createDiv({ cls: 'dayble-drop-indicator' });
                        if (relativeY < eventHeight / 2) {
                            indicator.addClass('above');
                            (_a = targetEvent.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(indicator, targetEvent);
                        }
                        else {
                            indicator.addClass('below');
                            targetEvent.after(indicator);
                        }
                    }
                };
                container.ondragleave = (e) => {
                    if (e.target === container) {
                        container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    }
                };
                container.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    e.preventDefault();
                    container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                    const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                    if (!id || src !== 'calendar')
                        return;
                    const draggedEl = document.querySelector(`[data-id="${id}"]`);
                    if (!draggedEl)
                        return;
                    const draggedContainer = draggedEl.closest('.dayble-event-container');
                    if (draggedContainer !== container)
                        return;
                    const targetEvent = e.target.closest('.dayble-event');
                    if (!targetEvent || targetEvent === draggedEl)
                        return;
                    const rect = targetEvent.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    if (relativeY < rect.height / 2) {
                        container.insertBefore(draggedEl, targetEvent);
                    }
                    else {
                        targetEvent.after(draggedEl);
                    }
                    // Reorder logic
                    const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                    const newOrder = allEventEls.map(el => el.dataset.id).filter(Boolean);
                    const dayDate = fullDate;
                    const dayEventIndices = [];
                    this.events.forEach((ev, idx) => {
                        if (ev.date === dayDate)
                            dayEventIndices.push(idx);
                    });
                    const eventIdToIndex = new Map();
                    newOrder.forEach((eventId, idx) => eventIdToIndex.set(eventId, idx));
                    dayEventIndices.sort((a, b) => {
                        var _a, _b;
                        const idA = this.events[a].id || '';
                        const idB = this.events[b].id || '';
                        const orderA = (_a = eventIdToIndex.get(idA)) !== null && _a !== void 0 ? _a : 999;
                        const orderB = (_b = eventIdToIndex.get(idB)) !== null && _b !== void 0 ? _b : 999;
                        return orderA - orderB;
                    });
                    const reorderedEvents = [];
                    let dayEventIdx = 0;
                    this.events.forEach((ev, idx) => {
                        if (ev.date === dayDate) {
                            reorderedEvents.push(this.events[dayEventIndices[dayEventIdx]]);
                            dayEventIdx++;
                        }
                        else {
                            reorderedEvents.push(ev);
                        }
                    });
                    this.events = reorderedEvents;
                    yield this.saveAllEntries();
                });
                // Drop on cell (move from holder or other day)
                cell.ondragover = (e) => { e.preventDefault(); cell.addClass('dayble-drag-over'); };
                cell.ondragleave = () => { cell.removeClass('dayble-drag-over'); };
                cell.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    e.preventDefault();
                    cell.removeClass('dayble-drag-over');
                    const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                    const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                    if (!id)
                        return;
                    if (src === 'holder') {
                        const hIdx = this.holderEvents.findIndex(ev => ev.id === id);
                        if (hIdx !== -1) {
                            const evn = this.holderEvents.splice(hIdx, 1)[0];
                            evn.date = fullDate;
                            this.events.push(evn);
                            yield this.saveAllEntries();
                            yield this.loadAllEntries();
                            this.render();
                        }
                    }
                    else if (src === 'calendar') {
                        // Move from another day
                        const idx = this.events.findIndex(ev => ev.id === id);
                        if (idx !== -1) {
                            const ev = this.events[idx];
                            // Check if moving to same day (already handled by container.ondrop)
                            if (ev.date !== fullDate) {
                                ev.date = fullDate;
                                yield this.saveAllEntries();
                                yield this.loadAllEntries();
                                this.render();
                            }
                        }
                    }
                });
                // Interactions
                cell.onclick = (ev) => {
                    const target = ev.target;
                    if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                        this.openEventModal(undefined, fullDate);
                    }
                };
                cell.onmousedown = (ev) => {
                    if (ev.button !== 0)
                        return;
                    const target = ev.target;
                    if (target.closest('.dayble-event'))
                        return;
                    if (this.isDragging)
                        return;
                    this.startSelection(fullDate, cell);
                };
                cell.onmouseover = () => {
                    if (this.isSelecting && !this.isDragging)
                        this.updateSelection(fullDate);
                };
                cell.ontouchstart = (ev) => {
                    const target = ev.target;
                    if (target.closest('.dayble-event'))
                        return;
                    if (this.isDragging)
                        return;
                    this.startSelection(fullDate, cell);
                };
                cell.ontouchmove = () => {
                    if (this.isSelecting && !this.isDragging)
                        this.updateSelection(fullDate);
                };
            }
            this.gridEl.appendChild(fragment);
            // Render long events
            // Prepare overlay for long events; hide it until positions are computed
            if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
                this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
                this._longOverlayEl.style.position = 'absolute';
                this._longOverlayEl.style.inset = '0';
                this._longOverlayEl.style.pointerEvents = 'none';
                this._longOverlayEl.style.zIndex = '10';
            }
            else {
                this.gridEl.appendChild(this._longOverlayEl);
            }
            requestAnimationFrame(() => this.renderLongEvents());
            if (!this._longRO && window.ResizeObserver) {
                this._longRO = new window.ResizeObserver(() => {
                    this.renderLongEvents();
                });
                if (this._longRO && this.gridEl)
                    this._longRO.observe(this.gridEl);
            }
            // Weekly Notes
            if (this.plugin.settings.weeklyNotesEnabled) {
                // Adjust grid to allow shrinking and let notes take space
                this.gridEl.style.flex = '0 1 auto';
                this.gridEl.style.minHeight = '0';
                const base = new Date(this.currentDate);
                const tDow = base.getDay();
                const diff = ((tDow - this.plugin.settings.weekStartDay) + 7) % 7;
                const weekStartDate = new Date(base);
                weekStartDate.setDate(base.getDate() - diff);
                const weekKey = weekStartDate.toISOString().split('T')[0];
                this.weeklyNotesEl = this.calendarEl.createDiv({ cls: 'dayble-weekly-notes' });
                this.weeklyNotesEl.style.flex = '0 0 auto !important';
                this.weeklyNotesEl.style.height = 'auto';
                this.weeklyNotesEl.style.display = 'flex !important';
                this.weeklyNotesEl.style.flexDirection = 'column !important';
                this.weeklyNotesEl.style.borderTop = '1px solid var(--background-modifier-border)';
                this.weeklyNotesEl.style.position = 'relative';
                // Drag Handle
                const dragHandle = this.weeklyNotesEl.createDiv({ cls: 'dayble-weekly-drag-handle' });
                this._boundWeeklyNotesMouseMove = (me) => {
                    if (!this.isResizingWeeklyNotes || !this.weeklyNotesEl)
                        return;
                    const dy = me.clientY - this.weeklyNotesResizeStartY;
                    const newH = Math.max(100, this.weeklyNotesResizeStartHeight - dy);
                    this.weeklyNotesEl.style.height = `${newH}px !important`;
                };
                this._boundWeeklyNotesMouseUp = () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.isResizingWeeklyNotes)
                        return;
                    this.isResizingWeeklyNotes = false;
                    document.removeEventListener('mousemove', this._boundWeeklyNotesMouseMove);
                    document.removeEventListener('mouseup', this._boundWeeklyNotesMouseUp);
                    if (this.weeklyNotesEl) {
                        this.plugin.settings.weeklyNotesHeight = this.weeklyNotesEl.offsetHeight;
                        yield this.plugin.saveSettings();
                    }
                });
                dragHandle.onmousedown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!this.weeklyNotesEl)
                        return;
                    this.isResizingWeeklyNotes = true;
                    this.weeklyNotesResizeStartY = e.clientY;
                    this.weeklyNotesResizeStartHeight = this.weeklyNotesEl.offsetHeight;
                    document.addEventListener('mousemove', this._boundWeeklyNotesMouseMove);
                    document.addEventListener('mouseup', this._boundWeeklyNotesMouseUp);
                };
                // Header
                const header = this.weeklyNotesEl.createDiv({ cls: 'dayble-weekly-notes-header' });
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.style.padding = '8px 10px 0 10px';
                header.style.flex = '0 0 auto';
                const h4 = header.createEl('h4', { text: 'Weekly notes' });
                h4.style.margin = '0';
                // Content area with textarea only
                const contentContainer = this.weeklyNotesEl.createDiv({ cls: 'dayble-weekly-notes-content' });
                contentContainer.style.flex = '0 0 auto !important';
                contentContainer.style.overflow = 'visible !important';
                contentContainer.style.padding = '10px';
                contentContainer.style.display = 'flex !important';
                contentContainer.style.flexDirection = 'column !important';
                contentContainer.style.minHeight = '0 !important';
                // Get current text
                const currentText = this.weeklyNotes[weekKey] || '';
                // Create textarea for editing
                const textareaEl = contentContainer.createEl('textarea', { cls: 'dayble-weekly-notes-textarea' });
                textareaEl.value = currentText;
                textareaEl.style.width = '100% !important';
                textareaEl.style.padding = '8px';
                textareaEl.style.fontFamily = 'var(--font-monospace)';
                textareaEl.style.fontSize = 'var(--font-text-size)';
                textareaEl.style.border = '1px solid var(--divider-color)';
                textareaEl.style.borderRadius = '4px';
                textareaEl.style.background = 'var(--background-secondary)';
                textareaEl.style.color = 'var(--text-normal)';
                textareaEl.style.resize = 'none !important';
                textareaEl.style.boxSizing = 'border-box';
                textareaEl.style.overflowY = 'hidden';
                // Auto-height function - grows with content up to 500px max
                const updateTextareaHeight = () => {
                    textareaEl.style.height = 'auto';
                    textareaEl.style.height = `${textareaEl.scrollHeight}px`;
                };
                // Initial height
                setTimeout(updateTextareaHeight, 0);
                // Update on input
                textareaEl.addEventListener('input', () => {
                    this.weeklyNotes[weekKey] = textareaEl.value;
                    updateTextareaHeight();
                    this.debouncedSave();
                });
                // Handle tab key
                textareaEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        const textarea = e.target;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
                        textarea.selectionStart = textarea.selectionEnd = start + 1;
                    }
                });
            }
            yield Promise.resolve();
        });
    }
    renderMonthView(titleEl) {
        const y = this.currentDate.getFullYear();
        const m = this.currentDate.getMonth();
        const monthLabel = new Date(y, m).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (this.monthTitleEl)
            this.monthTitleEl.setText(monthLabel);
        this.gridEl.empty();
        const weekStart = this.plugin.settings.weekStartDay;
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const leading = (firstDay - weekStart + 7) % 7;
        this.weekHeaderEl.empty();
        const header = this.weekHeaderEl.createDiv({ cls: 'dayble-grid-header' });
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const ordered = days.slice(weekStart).concat(days.slice(0, weekStart));
        ordered.forEach(d => header.createDiv({ text: d, cls: 'dayble-grid-header-cell' }));
        const segmentHeight = 28;
        const segmentGap = 4; // gappy
        const countsByDate = {};
        const longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        longEventsPreset.forEach(ev => {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const yy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const key = `${yy}-${mm}-${dd}`;
                countsByDate[key] = (countsByDate[key] || 0) + 1;
            }
        });
        for (let i = 0; i < leading; i++) {
            const c = this.gridEl.createDiv({ cls: 'dayble-day dayble-inactive' });
            c.setAttr('data-empty', 'true');
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const cell = this.gridEl.createDiv({ cls: 'dayble-day' });
            cell.setAttr('data-date', fullDate);
            const dayHeader = cell.createDiv({ cls: 'dayble-day-header' });
            const num = dayHeader.createDiv({ cls: 'dayble-day-number', text: String(day) });
            const t = new Date();
            const isToday = day === t.getDate() && m === t.getMonth() && y === t.getFullYear();
            if (isToday) {
                cell.addClass('dayble-current-day');
                const searchBtn = dayHeader.createEl('button', { cls: 'dayble-day-search-btn' });
                searchBtn.addClass('db-day-search-btn');
                (0, obsidian_1.setIcon)(searchBtn, 'focus');
                searchBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openTodayModal(fullDate);
                    return false;
                };
                searchBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                searchBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); };
            }
            const longContainer = cell.createDiv({ cls: 'dayble-long-container' });
            longContainer.addClass('db-long-container');
            const container = cell.createDiv({ cls: 'dayble-event-container' });
            const preCount = countsByDate[fullDate] || 0;
            const preMt = preCount > 0 ? (preCount * segmentHeight) + (Math.max(0, preCount - 1) * segmentGap) + 2 : 0;
            container.style.marginTop = preMt ? `${preMt}px` : '';
            const dayEvents = this.events.filter(e => e.date === fullDate);
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
            // Allow reordering events within the container
            container.ondragover = (e) => {
                var _a;
                e.preventDefault();
                // Show drop position indicator only if there are multiple events
                const targetEvent = e.target.closest('.dayble-event');
                const eventCount = container.querySelectorAll('.dayble-event').length;
                if (targetEvent && targetEvent.parentElement === container && eventCount > 1) {
                    // Get the vertical position within the target event
                    const rect = targetEvent.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const eventHeight = rect.height;
                    // Remove all existing drop indicators
                    container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    // Add indicator above or below based on mouse position
                    const indicator = container.createDiv({ cls: 'dayble-drop-indicator' });
                    if (relativeY < eventHeight / 2) {
                        // Drop above
                        indicator.addClass('above');
                        (_a = targetEvent.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(indicator, targetEvent);
                    }
                    else {
                        // Drop below
                        indicator.addClass('below');
                        targetEvent.after(indicator);
                    }
                }
            };
            container.ondragleave = (e) => {
                // Only remove indicators if we're truly leaving the container
                if (e.target === container) {
                    container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                }
            };
            container.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                e.preventDefault();
                // Remove drop indicator
                container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                if (!id || src !== 'calendar')
                    return; // Only reorder calendar events, not from holder
                // Find the event being dragged by ID
                const draggedEl = document.querySelector(`[data-id="${id}"]`);
                if (!draggedEl)
                    return;
                // Check if dragged event is from this container
                const draggedContainer = draggedEl.closest('.dayble-event-container');
                if (draggedContainer !== container)
                    return;
                // Find target event to insert before/after
                const targetEvent = e.target.closest('.dayble-event');
                if (!targetEvent || targetEvent === draggedEl)
                    return;
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                if (relativeY < eventHeight / 2) {
                    // Insert before
                    container.insertBefore(draggedEl, targetEvent);
                }
                else {
                    // Insert after
                    targetEvent.after(draggedEl);
                }
                // Update the underlying events array to match the new DOM order
                const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                const newOrder = allEventEls.map(el => el.dataset.id).filter(Boolean);
                // Rebuild events array for this date to match new order
                const dayDate = fullDate; // fullDate from outer scope
                const dayEventIndices = [];
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) {
                        dayEventIndices.push(idx);
                    }
                });
                // Sort the indices based on new order
                const eventIdToIndex = new Map();
                newOrder.forEach((eventId, idx) => {
                    eventIdToIndex.set(eventId, idx);
                });
                dayEventIndices.sort((a, b) => {
                    var _a, _b;
                    const idA = this.events[a].id || '';
                    const idB = this.events[b].id || '';
                    const orderA = (_a = eventIdToIndex.get(idA)) !== null && _a !== void 0 ? _a : 999;
                    const orderB = (_b = eventIdToIndex.get(idB)) !== null && _b !== void 0 ? _b : 999;
                    return orderA - orderB;
                });
                // Reconstruct events array with reordered day events
                const reorderedEvents = [];
                let dayEventIdx = 0;
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) {
                        reorderedEvents.push(this.events[dayEventIndices[dayEventIdx]]);
                        dayEventIdx++;
                    }
                    else {
                        reorderedEvents.push(ev);
                    }
                });
                this.events = reorderedEvents;
                // Save the updated order
                yield this.saveAllEntries();
            });
            cell.onclick = (ev) => {
                const target = ev.target;
                // Only open modal if clicking on the cell itself or container, not on an event
                if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                    this.openEventModal(undefined, fullDate);
                }
            };
            cell.onmousedown = (ev) => {
                if (ev.button !== 0)
                    return;
                const target = ev.target;
                // Don't start selection if clicking on an event
                if (target.closest('.dayble-event'))
                    return;
                // Don't start selection if already dragging
                if (this.isDragging)
                    return;
                this.startSelection(fullDate, cell);
            };
            cell.onmouseover = () => {
                if (this.isSelecting && !this.isDragging)
                    this.updateSelection(fullDate);
            };
            cell.ontouchstart = (ev) => {
                const target = ev.target;
                // Don't start selection if touching an event
                if (target.closest('.dayble-event'))
                    return;
                // Don't start selection if already dragging
                if (this.isDragging)
                    return;
                this.startSelection(fullDate, cell);
            };
            cell.ontouchmove = () => {
                if (this.isSelecting && !this.isDragging)
                    this.updateSelection(fullDate);
            };
            cell.ondragover = (e) => { e.preventDefault(); cell.addClass('dayble-drag-over'); };
            cell.ondragleave = () => { cell.removeClass('dayble-drag-over'); };
            cell.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                e.preventDefault();
                cell.removeClass('dayble-drag-over');
                const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                if (!id)
                    return;
                try {
                    if (src === 'holder') {
                        const hIdx = this.holderEvents.findIndex(ev => ev.id === id);
                        if (hIdx !== -1) {
                            const evn = this.holderEvents.splice(hIdx, 1)[0];
                            evn.date = fullDate;
                            this.events.push(evn);
                            yield this.saveAllEntries();
                            this.renderHolder();
                            this.render();
                        }
                    }
                    else {
                        const idx = this.events.findIndex(ev => ev.id === id);
                        if (idx !== -1) {
                            const ev = this.events[idx];
                            if (ev.startDate && ev.endDate && ev.startDate !== ev.endDate) {
                                const span = Math.floor((new Date(ev.endDate).getTime() - new Date(ev.startDate).getTime()) / 86400000);
                                ev.startDate = fullDate;
                                const ns = new Date(fullDate);
                                const ne = new Date(ns);
                                ne.setDate(ns.getDate() + span);
                                ev.endDate = `${ne.getFullYear()}-${String(ne.getMonth() + 1).padStart(2, '0')}-${String(ne.getDate()).padStart(2, '0')}`;
                            }
                            else if (ev.date) {
                                ev.date = fullDate;
                            }
                            yield this.saveAllEntries();
                        }
                    }
                    this.renderHolder();
                    this.render();
                }
                catch (error) {
                    new obsidian_1.Notice('Failed to save event changes');
                }
            });
        }
        // Defer long event positioning until layout settles
        // Prepare overlay for long events; hide it until positions are computed
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.style.position = 'absolute';
            this._longOverlayEl.style.inset = '0';
            this._longOverlayEl.style.pointerEvents = 'none';
            this._longOverlayEl.style.zIndex = '10';
        }
        else {
            this.gridEl.appendChild(this._longOverlayEl);
        }
        requestAnimationFrame(() => this.renderLongEvents());
        this.renderHolder();
        if (!this._longRO && window.ResizeObserver) {
            // Observe grid size changes to keep long spans aligned
            this._longRO = new window.ResizeObserver(() => {
                this.renderLongEvents();
            });
            if (this._longRO && this.gridEl)
                this._longRO.observe(this.gridEl);
        }
    }
    startSelection(date, el) {
        this.isSelecting = true;
        this.selectionStartDate = date;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
        document.addEventListener('mouseup', this._endSelOnce);
    }
    updateSelection(date) {
        if (!this.isSelecting || this.isDragging)
            return;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
    }
    endSelection() {
        if (!this.isSelecting)
            return;
        this.isSelecting = false;
        if (this.selectionStartDate && this.selectionEndDate) {
            const s = this.selectionStartDate;
            const e = this.selectionEndDate;
            this.openEventModalForRange(s, e);
        }
        this.clearSelection();
    }
    highlightSelectionRange() {
        const s = new Date(this.selectionStartDate + 'T00:00:00');
        const e = new Date(this.selectionEndDate + 'T00:00:00');
        const [min, max] = s <= e ? [s, e] : [e, s];
        const cells = Array.from(this.gridEl.children);
        let selectedCount = 0;
        cells.forEach(c => {
            c.removeClass('dayble-selected');
            const d = c.getAttr('data-date');
            if (!d)
                return;
            const dt = new Date(d + 'T00:00:00');
            // Include both start and end dates (use >= and <= for inclusive range)
            if (dt >= min && dt <= max) {
                c.addClass('dayble-selected');
                selectedCount++;
            }
        });
    }
    clearSelection() {
        const cells = Array.from(this.gridEl.children);
        cells.forEach(c => c.removeClass('dayble-selected'));
        this.selectionStartDate = null;
        this.selectionEndDate = null;
    }
    openEventModalForRange(start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = (_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim();
            if (!folder) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            try {
                yield this.app.vault.adapter.stat(folder);
            }
            catch (_b) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            const modal = new EventModal(this.app, undefined, start, end, (result) => __awaiter(this, void 0, void 0, function* () {
                const ev = Object.assign({ id: randomId() }, result);
                this.events.push(ev);
                yield this.saveAllEntries();
                this.render();
            }), () => __awaiter(this, void 0, void 0, function* () { yield Promise.resolve(); }), () => __awaiter(this, void 0, void 0, function* () {
                const picker = new IconPickerModal(this.app, icon => {
                    modal.setIcon(icon);
                }, () => {
                    modal.setIcon('');
                });
                picker.open();
            }));
            modal.categories = this.plugin.settings.eventCategories || [];
            modal.plugin = this.plugin;
            modal.open();
        });
    }
    renderLongEvents() {
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.style.position = 'absolute';
            this._longOverlayEl.style.inset = '0';
            this._longOverlayEl.style.pointerEvents = 'none';
            this._longOverlayEl.style.zIndex = '10';
        }
        const cells = Array.from(this.gridEl.children).filter(el => { var _a, _b; return (_b = (_a = el).hasClass) === null || _b === void 0 ? void 0 : _b.call(_a, 'dayble-day'); });
        const todayNum = (el) => {
            const n = el.querySelector('.dayble-day-number');
            return n ? n.getBoundingClientRect().height + parseFloat(getComputedStyle(n).marginBottom || '0') : 24;
        };
        const segmentHeight = 28;
        const segmentGap = 4;
        const getCellWidth = () => {
            if (cells.length === 0)
                return 100;
            return cells[0].offsetWidth || 100;
        };
        const countsByDate = {};
        const longEvents = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        longEvents.forEach(ev => {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const key = `${y}-${m}-${dd}`;
                countsByDate[key] = (countsByDate[key] || 0) + 1;
            }
        });
        const requiredKeys = new Set();
        longEvents.forEach(ev => {
            var _a, _b, _c, _d;
            const startIdx = cells.findIndex(c => c.getAttr('data-date') === ev.startDate);
            if (startIdx === -1)
                return;
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            const overlap = longEvents
                .filter(e => e.startDate && e.endDate && e.startDate !== e.endDate && new Date(e.startDate) <= start && new Date(e.endDate) >= start)
                .sort((a, b) => {
                const ad = (new Date(a.endDate).getTime() - new Date(a.startDate).getTime());
                const bd = (new Date(b.endDate).getTime() - new Date(b.startDate).getTime());
                if (ad !== bd)
                    return bd - ad; // longer first (on top)
                return a.id.localeCompare(b.id);
            });
            const stackIndex = overlap.findIndex(e => e.id === ev.id);
            const span = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
            const cellsPerRow = 7;
            const startRow = Math.floor(startIdx / cellsPerRow);
            const endIdx = startIdx + span - 1;
            const endRow = Math.floor(endIdx / cellsPerRow);
            const cellWidth = getCellWidth();
            const styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}|${this.plugin.settings.eventBorderOpacity}`;
            const contentSig = `${ev.title || ''}|${ev.description || ''}|${ev.icon || ''}|${ev.time || ''}`;
            if (startRow === endRow) {
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last)
                    return;
                const frLeft = first.offsetLeft;
                const frTop = first.offsetTop;
                const lrRight = last.offsetLeft + last.offsetWidth;
                const topOffset = todayNum(first) + 14 + stackIndex * (segmentHeight + segmentGap);
                const left = frLeft - 2;
                const top = frTop + topOffset;
                const width = (lrRight - frLeft) + 4;
                const key = `${ev.id}:row:${startRow}-single`;
                requiredKeys.add(key);
                let item = this._longEls.get(key);
                if (!item) {
                    item = this.createEventItem(ev);
                    item.addClass('dayble-long-event');
                    item.addClass('dayble-long-event-single');
                    item.dataset.longKey = key;
                    item.dataset.styleSig = styleSig;
                    item.dataset.contentSig = contentSig;
                    item.style.position = 'absolute';
                    item.style.boxSizing = 'border-box';
                    item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                    this.gridEl.appendChild(item);
                    this._longEls.set(key, item);
                }
                else {
                    const sig = styleSig;
                    const csig = contentSig;
                    if (item.dataset.styleSig !== sig || item.dataset.contentSig !== csig) {
                        const newItem = this.createEventItem(ev);
                        newItem.addClass('dayble-long-event');
                        newItem.addClass('dayble-long-event-single');
                        newItem.dataset.longKey = key;
                        newItem.dataset.styleSig = sig;
                        newItem.dataset.contentSig = csig;
                        newItem.style.position = 'absolute';
                        newItem.style.boxSizing = 'border-box';
                        newItem.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                        if (item.parentElement)
                            item.replaceWith(newItem);
                        item = newItem;
                        this._longEls.set(key, item);
                    }
                }
                if (!item.isConnected || item.parentElement !== this.gridEl) {
                    this.gridEl.appendChild(item);
                }
                item.style.setProperty('--event-border-width', `${(_a = this.plugin.settings.eventBorderWidth) !== null && _a !== void 0 ? _a : 2}px`);
                item.style.setProperty('--event-border-radius', `${(_b = this.plugin.settings.eventBorderRadius) !== null && _b !== void 0 ? _b : 6}px`);
                item.style.left = `${left}px`;
                item.style.top = `${top}px`;
                item.style.width = `${width}px`;
                item.style.height = `${segmentHeight}px`;
            }
            else {
                for (let row = startRow; row <= endRow; row++) {
                    const rowStartIdx = row * cellsPerRow;
                    const rowEndIdx = Math.min(rowStartIdx + cellsPerRow - 1, cells.length - 1);
                    const eventStartInRow = row === startRow ? startIdx : rowStartIdx;
                    const eventEndInRow = row === endRow ? endIdx : rowEndIdx;
                    if (eventStartInRow > rowEndIdx || eventEndInRow < rowStartIdx)
                        continue;
                    const first = cells[eventStartInRow];
                    const last = cells[eventEndInRow];
                    if (!first || !last)
                        continue;
                    const frLeft = first.offsetLeft;
                    const frTop = first.offsetTop;
                    const lrRight = last.offsetLeft + last.offsetWidth;
                    const topOffset = todayNum(first) + 14 + stackIndex * (segmentHeight + segmentGap);
                    const left = frLeft - 2;
                    const top = frTop + topOffset;
                    const width = (lrRight - frLeft) + 4;
                    const key = `${ev.id}:row:${row}`;
                    requiredKeys.add(key);
                    let item = this._longEls.get(key);
                    if (!item) {
                        item = this.createEventItem(ev);
                        item.addClass('dayble-long-event');
                        if (row === startRow)
                            item.addClass('dayble-long-event-start');
                        if (row === endRow)
                            item.addClass('dayble-long-event-end');
                        item.dataset.longKey = key;
                        item.dataset.styleSig = styleSig;
                        item.dataset.contentSig = contentSig;
                        item.style.position = 'absolute';
                        item.style.boxSizing = 'border-box';
                        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                        this.gridEl.appendChild(item);
                        this._longEls.set(key, item);
                    }
                    else {
                        const sig = styleSig;
                        const csig = contentSig;
                        if (item.dataset.styleSig !== sig || item.dataset.contentSig !== csig) {
                            const newItem = this.createEventItem(ev);
                            newItem.addClass('dayble-long-event');
                            if (row === startRow)
                                newItem.addClass('dayble-long-event-start');
                            if (row === endRow)
                                newItem.addClass('dayble-long-event-end');
                            newItem.dataset.longKey = key;
                            newItem.dataset.styleSig = sig;
                            newItem.dataset.contentSig = csig;
                            newItem.style.position = 'absolute';
                            newItem.style.boxSizing = 'border-box';
                            newItem.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                            if (item.parentElement)
                                item.replaceWith(newItem);
                            item = newItem;
                            this._longEls.set(key, item);
                        }
                    }
                    if (!item.isConnected || item.parentElement !== this.gridEl) {
                        this.gridEl.appendChild(item);
                    }
                    item.style.setProperty('--event-border-width', `${(_c = this.plugin.settings.eventBorderWidth) !== null && _c !== void 0 ? _c : 2}px`);
                    item.style.setProperty('--event-border-radius', `${(_d = this.plugin.settings.eventBorderRadius) !== null && _d !== void 0 ? _d : 6}px`);
                    item.style.left = `${left}px`;
                    item.style.top = `${top}px`;
                    item.style.width = `${width}px`;
                    item.style.height = `${segmentHeight}px`;
                }
            }
        });
        // Remove any stale long items
        Array.from(this._longEls.keys()).forEach(key => {
            if (!requiredKeys.has(key)) {
                const el = this._longEls.get(key);
                if (el && el.parentElement)
                    el.remove();
                this._longEls.delete(key);
            }
        });
        cells.forEach(cell => {
            const date = cell.getAttr('data-date');
            const count = countsByDate[date] || 0;
            const container = cell.querySelector('.dayble-event-container');
            if (container) {
                const baseMt = count > 0 ? (count * segmentHeight) + (Math.max(0, count - 1) * segmentGap) + 2 : 0;
                const isTodayCell = cell.classList.contains('dayble-current-day');
                const mt = isTodayCell ? Math.max(0, baseMt - 4) : baseMt; // gappy
                container.style.marginTop = mt ? `${mt}px` : '';
            }
        });
    }
    createEventItem(ev) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const item = document.createElement('div');
        item.className = 'dayble-event';
        item.setAttribute('draggable', 'true');
        item.dataset.id = ev.id;
        item.dataset.categoryId = ev.categoryId || '';
        // Apply title/description alignment
        const titleAlign = this.plugin.settings.eventTitleAlign || 'left';
        const descAlign = this.plugin.settings.eventDescAlign || 'left';
        item.addClass(`dayble-title-align-${titleAlign}`);
        item.addClass(`dayble-desc-align-${descAlign}`);
        if (titleAlign === 'center') {
            item.addClass('dayble-layout-center-flex');
        }
        // Determine which colors to use: user-set or category
        const category = (_a = this.plugin.settings.eventCategories) === null || _a === void 0 ? void 0 : _a.find(c => c.id === ev.categoryId);
        const isDefaultCategory = !ev.categoryId || ev.categoryId === 'default';
        let bgColor = '';
        let textColor = '';
        // Color selection logic (user-set color always preferred)
        if (ev.color) {
            bgColor = ev.color;
            textColor = ev.textColor || chooseTextColor(ev.color);
            item.dataset.color = ev.color;
        }
        else if (category && category.bgColor) {
            bgColor = category.bgColor;
            textColor = category.textColor;
        }
        // Apply styling if we have colors
        if (bgColor && textColor) {
            // Convert hex color to rgba with opacity
            const opacity = (_b = this.plugin.settings.eventBgOpacity) !== null && _b !== void 0 ? _b : 1;
            const rgbaColor = hexToRgba(bgColor, opacity);
            item.style.setProperty('--event-bg-color', rgbaColor);
            item.style.setProperty('--event-text-color', textColor);
            const bOpacity = (_c = this.plugin.settings.eventBorderOpacity) !== null && _c !== void 0 ? _c : 1;
            const borderColor = hexToRgba(textColor, bOpacity);
            item.style.setProperty('--event-border-color', borderColor);
            item.classList.add('dayble-event-colored');
        }
        // Apply border width settings
        item.style.setProperty('--event-border-width', `${(_d = this.plugin.settings.eventBorderWidth) !== null && _d !== void 0 ? _d : 2}px`);
        item.style.setProperty('--event-border-radius', `${(_e = this.plugin.settings.eventBorderRadius) !== null && _e !== void 0 ? _e : 6}px`);
        // Apply effect and animation from category (always, regardless of color choice)
        if (category) {
            if (category.effect && category.effect !== '')
                item.addClass(`dayble-effect-${category.effect}`);
            const onlyToday = (_f = this.plugin.settings.onlyAnimateToday) !== null && _f !== void 0 ? _f : false;
            const isTodayEvent = this.isEventToday(ev);
            if (category.animation && category.animation !== '' && (!onlyToday || isTodayEvent)) {
                item.addClass(`dayble-anim-${category.animation}`);
            }
            if (category.animation2 && category.animation2 !== '' && (!onlyToday || isTodayEvent)) {
                item.addClass(`dayble-anim-${category.animation2}`);
            }
        }
        const title = item.createDiv({ cls: 'dayble-event-title' });
        renderMarkdown(ev.title || '', title, this.plugin.app);
        const tFmt = (_g = this.plugin.settings.timeFormat) !== null && _g !== void 0 ? _g : '24h';
        const timeDisplay = formatTimeRange(ev.time, tFmt);
        if (timeDisplay) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${timeDisplay})`;
            title.appendChild(timeSpan);
        }
        const iconToUse = ev.icon || ((category === null || category === void 0 ? void 0 : category.icon) || '');
        if (this.plugin.settings.iconPlacement !== 'none' && iconToUse) {
            const iconEl = item.createDiv({ cls: 'dayble-event-icon' });
            (0, obsidian_1.setIcon)(iconEl, iconToUse);
            const place = (_h = this.plugin.settings.iconPlacement) !== null && _h !== void 0 ? _h : 'left';
            if (place === 'left') {
                item.insertBefore(iconEl, title);
            }
            else if (place === 'right') {
                item.appendChild(iconEl);
            }
            else if (place === 'top' || place === 'top-left' || place === 'top-right') {
                iconEl.addClass('dayble-icon-top');
                if (place === 'top-left')
                    iconEl.addClass('dayble-icon-top-left');
                else if (place === 'top-right')
                    iconEl.addClass('dayble-icon-top-right');
                else
                    iconEl.addClass('dayble-icon-top-center');
                item.insertBefore(iconEl, item.firstChild);
            }
        }
        if (ev.description) {
            const desc = item.createDiv({ cls: 'dayble-event-desc' });
            // Description inherits text color
            if (bgColor && textColor) {
                desc.style.color = textColor;
            }
            renderMarkdown(ev.description, desc, this.plugin.app);
        }
        // Completed behavior
        if (ev.completed) {
            const behavior = (_j = this.plugin.settings.completeBehavior) !== null && _j !== void 0 ? _j : 'none';
            if (behavior === 'dim')
                item.addClass('dayble-event-dim');
            else if (behavior === 'strikethrough')
                title.style.textDecoration = 'line-through';
            else if (behavior === 'hide')
                item.addClass('dayble-event-hidden');
        }
        item.addEventListener('click', (evt) => {
            var _a, _b;
            const a = evt.target.closest('a');
            if (!a)
                return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                evt.preventDefault();
                evt.stopPropagation();
                const file = resolveNoteFile(this.plugin.app, wiki);
                if (file) {
                    const leaf = this.plugin.app.workspace.getLeaf(true);
                    (_b = (_a = leaf).openFile) === null || _b === void 0 ? void 0 : _b.call(_a, file);
                }
            }
        }, { capture: true });
        item.ondragstart = e => {
            var _a, _b, _c;
            console.debug('[Dayble] Drag started on event:', ev.id);
            this.isSelecting = false;
            this.isDragging = true;
            this.clearSelection();
            (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', ev.id);
            (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'calendar');
            try {
                const dragImg = item.cloneNode(true);
                dragImg.style.position = 'fixed';
                dragImg.style.top = '-10000px';
                dragImg.style.left = '-10000px';
                dragImg.style.opacity = '1';
                dragImg.style.boxShadow = 'none';
                dragImg.style.boxSizing = 'border-box';
                const rect = item.getBoundingClientRect();
                dragImg.style.width = `${rect.width}px`;
                dragImg.style.height = `${rect.height}px`;
                dragImg.style.transform = 'none';
                dragImg.style.borderRadius = getComputedStyle(item).borderRadius;
                document.body.appendChild(dragImg);
                (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                item.__dragImg = dragImg;
            }
            catch (_d) { }
            item.addClass('dayble-dragging');
        };
        item.ondragend = () => {
            item.removeClass('dayble-dragging');
            const di = item.__dragImg;
            if (di && di.parentElement)
                di.remove();
            item.__dragImg = undefined;
            this.isDragging = false;
        };
        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id); };
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new obsidian_1.Menu();
            menu.addItem(i => i.setTitle('Duplicate').setIcon('copy').onClick(() => {
                const newEv = Object.assign(Object.assign({}, ev), { id: randomId() });
                this.events.push(newEv);
                void this.saveAllEntries().then(() => this.render());
            }));
            menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                ev.completed = !ev.completed;
                void this.saveAllEntries().then(() => this.render());
            }));
            menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                this.events = this.events.filter(e2 => e2.id !== ev.id);
                void this.saveAllEntries().then(() => this.render());
            }));
            menu.showAtMouseEvent(e);
        };
        return item;
    }
    isEventToday(ev) {
        const t = new Date();
        const yyyy = t.getFullYear();
        const mm = String(t.getMonth() + 1).padStart(2, '0');
        const dd = String(t.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        if (ev.date)
            return ev.date === todayStr;
        if (ev.startDate && ev.endDate) {
            return ev.startDate <= todayStr && ev.endDate >= todayStr;
        }
        if (ev.startDate && !ev.endDate) {
            return ev.startDate === todayStr;
        }
        return false;
    }
    renderHolder() {
        var _a;
        const list = (_a = this.holderEl) === null || _a === void 0 ? void 0 : _a.querySelector('.dayble-holder-list');
        if (!list)
            return;
        list.empty();
        this.holderEvents.forEach(ev => {
            const item = this.createEventItem(ev);
            item.dataset.source = 'holder';
            item.ondragstart = e => {
                var _a, _b, _c;
                this.isDragging = true;
                this.isSelecting = false;
                this.clearSelection();
                (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', ev.id);
                (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'holder');
                try {
                    const dragImg = item.cloneNode(true);
                    dragImg.style.position = 'fixed';
                    dragImg.style.top = '-10000px';
                    dragImg.style.left = '-10000px';
                    dragImg.style.opacity = '1';
                    dragImg.style.boxShadow = 'none';
                    dragImg.style.boxSizing = 'border-box';
                    const rect = item.getBoundingClientRect();
                    dragImg.style.width = `${rect.width}px`;
                    dragImg.style.height = `${rect.height}px`;
                    dragImg.style.transform = 'none';
                    dragImg.style.borderRadius = getComputedStyle(item).borderRadius;
                    document.body.appendChild(dragImg);
                    (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                    item.__dragImg = dragImg;
                }
                catch (_d) { }
                item.addClass('dayble-dragging');
            };
            item.ondragend = () => {
                item.removeClass('dayble-dragging');
                const di = item.__dragImg;
                if (di && di.parentElement)
                    di.remove();
                item.__dragImg = undefined;
                this.isDragging = false;
            };
            list.appendChild(item);
        });
        // Enable reordering inside holder list with drop indicators
        list.ondragover = (e) => {
            var _a;
            e.preventDefault();
            const targetEvent = e.target.closest('.dayble-event');
            const eventCount = list.querySelectorAll('.dayble-event').length;
            if (targetEvent && targetEvent.parentElement === list && eventCount > 1) {
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const indicator = document.createElement('div');
                indicator.className = 'dayble-drop-indicator';
                if (relativeY < eventHeight / 2) {
                    (_a = targetEvent.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(indicator, targetEvent);
                }
                else {
                    targetEvent.after(indicator);
                }
            }
        };
        list.ondragleave = (e) => {
            if (e.target === list)
                list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
        };
        list.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            e.preventDefault();
            list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
            const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
            const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
            if (!id || src !== 'holder')
                return;
            const draggedEl = document.querySelector(`[data-id="${id}"]`);
            if (!draggedEl)
                return;
            const draggedContainer = draggedEl.closest('.dayble-holder-list');
            if (draggedContainer !== list)
                return;
            const targetEvent = e.target.closest('.dayble-event');
            if (targetEvent === draggedEl)
                return;
            if (!targetEvent) {
                list.appendChild(draggedEl);
            }
            else {
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                if (relativeY < eventHeight / 2) {
                    list.insertBefore(draggedEl, targetEvent);
                }
                else {
                    targetEvent.after(draggedEl);
                }
            }
            // Persist new holder order
            const reordered = [];
            list.querySelectorAll('.dayble-event').forEach(el => {
                const eid = el.dataset.id;
                const found = this.holderEvents.find(ev => ev.id === eid);
                if (found)
                    reordered.push(found);
            });
            this.holderEvents = reordered;
            yield this.saveAllEntries();
        });
    }
    openEventModal(id, date, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const folder = (_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim();
            if (!folder) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            try {
                yield this.app.vault.adapter.stat(folder);
            }
            catch (_c) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            const existing = id ? ((_b = this.events.find(e => e.id === id)) !== null && _b !== void 0 ? _b : this.holderEvents.find(e => e.id === id)) : undefined;
            const fromHolder = !!(existing && this.holderEvents.some(e => e.id === existing.id));
            const modal = new EventModal(this.app, existing, date, endDate, (result) => __awaiter(this, void 0, void 0, function* () {
                const isMulti = !!(result.startDate && result.endDate);
                const isSingle = !!result.date || (!!result.startDate && !result.endDate);
                if (existing) {
                    Object.assign(existing, result);
                }
                else {
                    const ev = Object.assign({ id: randomId() }, result);
                    if (isMulti || isSingle) {
                        this.events.push(ev);
                    }
                    else {
                        this.holderEvents.push(ev);
                    }
                }
                try {
                    yield this.saveAllEntries();
                }
                catch (e) {
                    console.error('[Dayble] Save failed:', e);
                }
                this.renderHolder();
                this.render();
                if (this.currentTodayModal) {
                    this.currentTodayModal.events = this.events;
                    this.currentTodayModal.onOpen();
                }
            }), () => __awaiter(this, void 0, void 0, function* () {
                if (existing) {
                    if (fromHolder) {
                        this.holderEvents = this.holderEvents.filter(e => e.id !== existing.id);
                    }
                    else {
                        this.events = this.events.filter(e => e.id !== existing.id);
                    }
                    yield this.saveAllEntries();
                    this.render();
                }
            }), () => __awaiter(this, void 0, void 0, function* () {
                const picker = new IconPickerModal(this.app, icon => {
                    if (existing)
                        existing.icon = icon;
                    modal.setIcon(icon);
                }, () => {
                    // Remove icon handler
                    if (existing)
                        existing.icon = undefined;
                    modal.setIcon('');
                });
                picker.open();
            }));
            modal.categories = this.plugin.settings.eventCategories || [];
            modal.plugin = this.plugin;
            modal.open();
        });
    }
    openTodayModal(date) {
        const modal = new TodayModal(this.app, date, this.events, this);
        this.currentTodayModal = modal;
        modal.onClose = () => { this.currentTodayModal = undefined; };
        modal.open();
    }
}
class EventModal extends obsidian_1.Modal {
    constructor(app, ev, date, endDate, onSubmit, onDelete, onPickIcon) {
        super(app);
        this.ev = ev;
        this.date = date;
        this.endDate = endDate;
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;
        this.onPickIcon = onPickIcon;
        this.icon = ev === null || ev === void 0 ? void 0 : ev.icon;
        this.selectedColor = ev === null || ev === void 0 ? void 0 : ev.color;
        this.selectedTextColor = ev === null || ev === void 0 ? void 0 : ev.textColor;
    }
    setIcon(icon) { this.icon = icon; if (this.iconBtnEl)
        (0, obsidian_1.setIcon)(this.iconBtnEl, icon || 'plus'); }
    onOpen() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        const c = this.contentEl;
        c.empty();
        const heading = c.createEl('h3', { cls: 'dayble-modal-title' });
        c.addClass('db-modal');
        heading.addClass('db-modal-title');
        heading.textContent = this.ev ? 'Edit Event' : 'Add New Event';
        const row1 = c.createDiv({ cls: 'dayble-modal-row' });
        row1.addClass('db-modal-row');
        const iconBtn = row1.createEl('button', { cls: 'dayble-btn dayble-icon-add' });
        iconBtn.addClass('db-btn');
        (0, obsidian_1.setIcon)(iconBtn, (_a = this.icon) !== null && _a !== void 0 ? _a : 'plus');
        iconBtn.onclick = () => this.onPickIcon();
        this.iconBtnEl = iconBtn;
        const titleInput = row1.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Event title', autofocus: 'true' } });
        titleInput.addClass('db-input');
        titleInput.value = (_c = (_b = this.ev) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : '';
        const focusTitle = () => { try {
            titleInput.focus({ preventScroll: true });
        }
        catch (_a) { } };
        focusTitle();
        requestAnimationFrame(focusTitle);
        setTimeout(focusTitle, 0);
        // [[link]] suggestions shared for title and description
        let suggestionContainer = null;
        let suggestionSelectedIndex = 0;
        let suggestionTarget = null;
        const closeSuggestions = () => { if (suggestionContainer) {
            suggestionContainer.remove();
            suggestionContainer = null;
        } suggestionSelectedIndex = 0; suggestionTarget = null; };
        const showSuggestionsFor = (target) => {
            if (suggestionContainer)
                suggestionContainer.remove();
            const val = target.value || '';
            const match = val.match(/\[\[([^\[\]]*?)$/);
            if (!match)
                return;
            const query = match[1].toLowerCase();
            const files = this.app.vault.getFiles()
                .filter((f) => f.name && f.name.toLowerCase().includes(query) && !f.name.startsWith('.'))
                .slice(0, 10);
            if (files.length === 0)
                return;
            suggestionTarget = target;
            suggestionSelectedIndex = 0;
            suggestionContainer = document.createElement('div');
            suggestionContainer.className = 'dayble-link-suggestions';
            suggestionContainer.style.position = 'fixed';
            suggestionContainer.style.backgroundColor = 'var(--background-primary)';
            suggestionContainer.style.border = '1px solid var(--background-modifier-border)';
            suggestionContainer.style.borderRadius = '4px';
            suggestionContainer.style.maxHeight = '180px';
            suggestionContainer.style.overflowY = 'auto';
            suggestionContainer.style.zIndex = '10000';
            suggestionContainer.style.minWidth = '200px';
            files.forEach((file, i) => {
                const item = document.createElement('div');
                item.textContent = file.name;
                item.style.padding = '8px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid var(--background-modifier-border)';
                if (i === 0) {
                    item.classList.add('is-selected');
                    item.style.backgroundColor = 'var(--background-primary-alt)';
                }
                item.onmouseenter = () => { item.style.backgroundColor = 'var(--background-primary-alt)'; };
                item.onmouseleave = () => { if (!item.classList.contains('is-selected'))
                    item.style.backgroundColor = 'transparent'; };
                item.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = target.value;
                    const beforeMatch = text.substring(0, text.lastIndexOf('[['));
                    target.value = beforeMatch + '[[' + file.name + ']]';
                    closeSuggestions();
                };
                suggestionContainer.appendChild(item);
            });
            document.body.appendChild(suggestionContainer);
            const rect = target.getBoundingClientRect();
            suggestionContainer.style.left = Math.round(rect.left) + 'px';
            suggestionContainer.style.top = Math.round(rect.top + rect.height) + 'px';
        };
        const moveSuggestionSelection = (dir) => {
            if (!suggestionContainer)
                return;
            const items = Array.from(suggestionContainer.children);
            items.forEach(i => { i.classList.remove('is-selected'); i.style.backgroundColor = 'transparent'; });
            suggestionSelectedIndex = Math.max(0, Math.min(items.length - 1, suggestionSelectedIndex + dir));
            const sel = items[suggestionSelectedIndex];
            if (sel) {
                sel.classList.add('is-selected');
                sel.style.backgroundColor = 'var(--background-primary-alt)';
            }
        };
        const chooseCurrentSuggestion = () => {
            if (!suggestionContainer || !suggestionTarget)
                return;
            const items = Array.from(suggestionContainer.children);
            const sel = items[suggestionSelectedIndex];
            if (!sel)
                return;
            const name = sel.textContent || '';
            const text = suggestionTarget.value;
            const beforeMatch = text.substring(0, text.lastIndexOf('[['));
            suggestionTarget.value = beforeMatch + '[[' + name + ']]';
            closeSuggestions();
        };
        document.addEventListener('keydown', (e) => {
            if (!suggestionContainer)
                return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSuggestionSelection(1);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSuggestionSelection(-1);
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                chooseCurrentSuggestion();
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                closeSuggestions();
            }
        }, { capture: true });
        titleInput.oninput = () => { showSuggestionsFor(titleInput); };
        // Create color swatch row (will be positioned based on setting)
        const createColorRow = () => {
            var _a, _b, _c;
            const colorRow = c.createDiv({ cls: 'dayble-modal-row dayble-color-swatches-row' });
            colorRow.addClass('db-modal-row');
            const swatchesContainer = colorRow.createDiv({ cls: 'dayble-color-swatches' });
            swatchesContainer.addClass('db-color-swatches');
            const defaultSwatch = swatchesContainer.createEl('button', { cls: 'dayble-color-swatch dayble-color-swatch-none' });
            defaultSwatch.addClass('db-color-swatch');
            defaultSwatch.title = 'None (default)';
            defaultSwatch.onclick = () => {
                this.selectedColor = undefined;
                this.selectedTextColor = undefined;
                document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                defaultSwatch.addClass('dayble-color-swatch-selected');
            };
            if (!this.selectedColor)
                defaultSwatch.addClass('dayble-color-swatch-selected');
            const settings = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings;
            const builtSwatches = ((_b = settings === null || settings === void 0 ? void 0 : settings.swatches) !== null && _b !== void 0 ? _b : []).map((s) => ({ color: s.color, textColor: s.textColor }));
            const customSwatches = ((_c = settings === null || settings === void 0 ? void 0 : settings.userCustomSwatches) !== null && _c !== void 0 ? _c : []).map((s) => ({ color: s.color, textColor: s.textColor }));
            let swatches = builtSwatches;
            if (settings === null || settings === void 0 ? void 0 : settings.customSwatchesEnabled) {
                swatches = builtSwatches.concat(customSwatches);
            }
            if (!swatches || swatches.length === 0) {
                swatches = ['#eb3b5a', '#fa8231', '#e5a216', '#20bf6b', '#0fb9b1', '#2d98da', '#3867d6', '#5454d0', '#8854d0', '#b554d0', '#e832c1', '#e83289', '#965b3b', '#8392a4'].map(c => ({ color: c }));
            }
            swatches.forEach(({ color, textColor }) => {
                const swatch = swatchesContainer.createEl('button', { cls: 'dayble-color-swatch' });
                swatch.addClass('db-color-swatch');
                swatch.style.backgroundColor = color;
                swatch.style.borderColor = color;
                swatch.title = color;
                swatch.onclick = () => {
                    this.selectedColor = color;
                    this.selectedTextColor = textColor || chooseTextColor(color);
                    document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                    swatch.addClass('dayble-color-swatch-selected');
                };
                if (this.selectedColor === color)
                    swatch.addClass('dayble-color-swatch-selected');
            });
            return colorRow;
        };
        // Add color swatches under title if setting says so
        let colorRow;
        const colorSwatchPos = (_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.colorSwatchPosition) !== null && _f !== void 0 ? _f : 'under-title';
        if (colorSwatchPos === 'under-title') {
            colorRow = createColorRow();
        }
        const ruleRow = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        ruleRow.addClass('db-modal-row');
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.addClass('db-label');
        categoryLabel.style.textAlign = 'center';
        let selectedCategoryId = (_g = this.ev) === null || _g === void 0 ? void 0 : _g.categoryId;
        const categorySelect = ruleRow.createEl('select', { cls: 'dayble-input dayble-category-select' });
        categorySelect.addClass('db-select');
        const emptyOpt = categorySelect.createEl('option');
        emptyOpt.value = '';
        emptyOpt.text = 'Default';
        const categories = this.categories || [];
        categories.forEach((c) => { const opt = categorySelect.createEl('option'); opt.value = c.id; opt.text = c.name; });
        categorySelect.value = selectedCategoryId !== null && selectedCategoryId !== void 0 ? selectedCategoryId : '';
        categorySelect.onchange = () => {
            selectedCategoryId = categorySelect.value || undefined;
        };
        // Determine if this is a multi-day event
        const isMultiDay = this.endDate && this.endDate !== this.date;
        // Start time/date row
        const row2 = c.createDiv({ cls: 'dayble-modal-row' });
        row2.addClass('db-modal-row');
        const startTime = row2.createEl('input', { type: 'time', cls: 'dayble-input' });
        startTime.addClass('db-input');
        startTime.value = (_k = (_j = (_h = this.ev) === null || _h === void 0 ? void 0 : _h.time) === null || _j === void 0 ? void 0 : _j.split('-')[0]) !== null && _k !== void 0 ? _k : '';
        const startDate = row2.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.addClass('db-input');
        startDate.value = (_q = (_p = (_m = (_l = this.ev) === null || _l === void 0 ? void 0 : _l.date) !== null && _m !== void 0 ? _m : (_o = this.ev) === null || _o === void 0 ? void 0 : _o.startDate) !== null && _p !== void 0 ? _p : this.date) !== null && _q !== void 0 ? _q : '';
        // End time/date row (only for multi-day events)
        let endTime;
        let endDateInput;
        if (isMultiDay) {
            const row3 = c.createDiv({ cls: 'dayble-modal-row' });
            row3.addClass('db-modal-row');
            endTime = row3.createEl('input', { type: 'time', cls: 'dayble-input' });
            endTime.addClass('db-input');
            endTime.value = (_t = (_s = (_r = this.ev) === null || _r === void 0 ? void 0 : _r.time) === null || _s === void 0 ? void 0 : _s.split('-')[1]) !== null && _t !== void 0 ? _t : '';
            endDateInput = row3.createEl('input', { type: 'date', cls: 'dayble-input' });
            endDateInput.addClass('db-input');
            endDateInput.value = (_u = this.endDate) !== null && _u !== void 0 ? _u : '';
        }
        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.addClass('db-textarea');
        descInput.value = (_w = (_v = this.ev) === null || _v === void 0 ? void 0 : _v.description) !== null && _w !== void 0 ? _w : '';
        descInput.oninput = () => { showSuggestionsFor(descInput); };
        // Add color swatches under description if setting says so
        if (colorSwatchPos === 'under-description') {
            colorRow = createColorRow();
        }
        const footer = c.createDiv({ cls: 'dayble-modal-footer' });
        footer.addClass('db-modal-footer');
        // Delete button on left (only for existing events)
        if (this.ev) {
            const del = footer.createEl('button', { cls: 'dayble-btn dayble-delete' });
            del.addClass('db-btn');
            (0, obsidian_1.setIcon)(del, 'trash-2');
            del.onclick = () => { void this.onDelete().then(() => this.close()); };
        }
        // Cancel and Save buttons on right
        const rightButtons = footer.createDiv({ cls: 'dayble-modal-footer-right' });
        rightButtons.addClass('db-modal-footer-right');
        const cancel = rightButtons.createEl('button', { cls: 'dayble-btn dayble-cancel' });
        cancel.addClass('db-btn');
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();
        const ok = rightButtons.createEl('button', { cls: 'dayble-btn dayble-save mod-cta' });
        ok.addClass('db-btn');
        ok.textContent = 'Save Event';
        ok.onclick = () => {
            var _a, _b, _c, _d, _e, _f;
            const payload = {
                title: titleInput.value,
                description: descInput.value,
                icon: this.icon,
                categoryId: selectedCategoryId,
                color: this.selectedColor,
                textColor: this.selectedTextColor
            };
            if (!payload.categoryId || !payload.color) {
                const triggers = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.triggers) || [];
                const txt = ((payload.title || '') + ' ' + (payload.description || '')).toLowerCase();
                const found = triggers.find((t) => (t.pattern || '').toLowerCase() && txt.includes((t.pattern || '').toLowerCase()));
                if (found) {
                    if (!payload.categoryId && found.categoryId)
                        payload.categoryId = found.categoryId;
                    if (!payload.color && found.color) {
                        payload.color = found.color;
                        payload.textColor = found.textColor;
                    }
                }
            }
            if (isMultiDay && endTime && endDateInput) {
                // Multi-day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.startDate = startDate.value || ((_c = this.ev) === null || _c === void 0 ? void 0 : _c.startDate) || undefined;
                payload.endDate = endDateInput.value || ((_d = this.ev) === null || _d === void 0 ? void 0 : _d.endDate) || undefined;
            }
            else {
                // Single day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = (endTime === null || endTime === void 0 ? void 0 : endTime.value) || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                const fallbackDate = ((_e = this.ev) === null || _e === void 0 ? void 0 : _e.date) || ((_f = this.ev) === null || _f === void 0 ? void 0 : _f.startDate) || this.date || undefined;
                payload.date = startDate.value || fallbackDate;
                payload.startDate = startDate.value || fallbackDate;
                payload.endDate = startDate.value || fallbackDate;
            }
            void Promise.resolve(this.onSubmit(payload)).then(() => {
                this.close();
            }).catch(e => {
                console.error('[Dayble] Error saving event:', e);
                new obsidian_1.Notice('Error saving event: ' + (e instanceof Error ? e.message : String(e)));
            });
        };
        // Prevent modal open when clicking markdown links inside event items; open note in new tab
        this.contentEl.addEventListener('click', (ev) => {
            var _a, _b;
            const a = ev.target.closest('a');
            if (!a)
                return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (_b = (_a = leaf).openFile) === null || _b === void 0 ? void 0 : _b.call(_a, file);
                }
            }
        }, { capture: true });
    }
}
class IconPickerModal extends obsidian_1.Modal {
    constructor(app, onPick, onRemove) {
        super(app);
        this.allIcons = [];
        this.onPick = onPick;
        this.onRemove = onRemove;
    }
    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.height = '100%';
        c.addClass('db-modal');
        const searchRow = c.createDiv({ cls: 'dayble-modal-row' });
        searchRow.addClass('db-modal-row');
        searchRow.style.marginTop = '8px';
        const searchInput = searchRow.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Search icons' } });
        searchInput.addClass('db-input');
        searchInput.style.flexGrow = '1';
        const list = c.createDiv({ cls: 'dayble-icon-list' });
        list.addClass('db-icon-list');
        list.style.flex = '1';
        list.style.overflowY = 'auto';
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(40px, 1fr))';
        list.style.gap = '4px';
        list.style.marginTop = '8px';
        // Footer with remove button
        const footer = c.createDiv();
        footer.addClass('db-modal-footer');
        footer.style.display = 'flex';
        footer.style.marginTop = 'auto';
        footer.style.paddingTop = '8px';
        footer.style.borderTop = '1px solid var(--background-modifier-border)';
        const removeBtn = footer.createEl('button', { cls: 'dayble-btn', text: 'Remove Icon' });
        removeBtn.addClass('db-btn');
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.gap = '4px';
        const removeIcon = removeBtn.createDiv();
        (0, obsidian_1.setIcon)(removeIcon, 'x');
        removeIcon.style.display = 'inline-flex';
        removeBtn.onclick = () => { if (this.onRemove)
            this.onRemove(); this.close(); };
        // Load icons lazily
        if (!this.allIcons.length) {
            this.allIcons = getIconIdsSafe();
        }
        let filtered = this.allIcons.slice(0, 96); // Only show first 100 initially
        let fullFiltered = this.allIcons.slice();
        const renderList = (icons) => {
            list.empty();
            icons.slice(0, 200).forEach(id => {
                const btn = list.createEl('button', { cls: 'dayble-icon-btn' });
                btn.addClass('db-icon-btn');
                btn.style.padding = '6px';
                btn.title = id;
                (0, obsidian_1.setIcon)(btn, id);
                btn.onclick = () => { this.onPick(id); this.close(); };
            });
        };
        const applyFilter = () => {
            const q = (searchInput.value || '').toLowerCase();
            if (!q) {
                fullFiltered = this.allIcons.slice(0, 150);
            }
            else {
                fullFiltered = this.allIcons.filter(id => id.toLowerCase().includes(q));
            }
            renderList(fullFiltered);
        };
        searchInput.oninput = applyFilter;
        renderList(filtered);
    }
}
class PromptSearchModal extends obsidian_1.Modal {
    constructor(app, view) {
        super(app);
        this.query = '';
        this.results = [];
        this.selectedIndex = 0;
        this.view = view;
        try {
            this.modalEl.classList.remove('modal');
            this.modalEl.className = 'prompt';
            // Remove default content wrapper so prompt is the root
            if (this.contentEl && this.contentEl.parentElement === this.modalEl) {
                this.contentEl.remove();
            }
        }
        catch (_a) { }
    }
    onOpen() {
        const root = this.modalEl;
        while (root.firstChild)
            root.removeChild(root.firstChild);
        const inputWrap = root.createDiv({ cls: 'prompt-input-container' });
        const input = inputWrap.createEl('input', { cls: 'prompt-input', attr: { autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', type: 'text', placeholder: 'Find events...' } });
        const resultsEl = root.createDiv({ cls: 'prompt-results' });
        const render = () => {
            resultsEl.empty();
            const items = this.results;
            if (!items.length)
                return;
            items.forEach((ev, i) => {
                const row = resultsEl.createDiv({ cls: 'suggestion-item mod-complex' });
                if (i === this.selectedIndex)
                    row.addClass('is-selected');
                row.onmouseenter = () => { this.selectedIndex = i; render(); };
                const content = row.createDiv({ cls: 'suggestion-content' });
                const title = content.createDiv({ cls: 'suggestion-title' });
                title.textContent = ev.title || '(untitled)';
                const note = content.createDiv({ cls: 'suggestion-note' });
                note.textContent = ev.date + (ev.time ? ' ' + ev.time : '');
                note.style.fontSize = '0.8em';
                note.style.color = 'var(--text-muted)';
                row.onclick = () => this.choose(i);
                row.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); this.choose(i); };
            });
        };
        const update = () => __awaiter(this, void 0, void 0, function* () {
            const q = (input.value || '').toLowerCase();
            this.query = q;
            // Search all months by loading all JSON files
            const folder = this.view.plugin.settings.entriesFolder || 'DaybleCalendar';
            let allEvents = [];
            // Start with current view events to be fast
            allEvents = this.view.events.slice();
            try {
                // Load all other files if we have a query
                if (q.length > 0) {
                    let listing;
                    try {
                        listing = yield this.app.vault.adapter.list(folder);
                    }
                    catch (e) {
                        // Folder might not exist or other error
                        listing = { files: [] };
                    }
                    const files = (listing.files || []).filter((f) => f.toLowerCase().endsWith('.json'));
                    for (const f of files) {
                        // Skip current month file as it's already in memory
                        const currentFile = this.view.getMonthDataFilePath();
                        if (f === currentFile)
                            continue;
                        if (f.endsWith(currentFile.split('/').pop()))
                            continue;
                        try {
                            const txt = yield this.app.vault.adapter.read(f);
                            const data = JSON.parse(txt);
                            // Handle both legacy array format and new object format
                            let fileEvents = [];
                            if (Array.isArray(data)) {
                                fileEvents = data;
                            }
                            else if (data && Array.isArray(data.events)) {
                                fileEvents = data.events;
                            }
                            if (fileEvents.length > 0) {
                                allEvents = allEvents.concat(fileEvents);
                            }
                        }
                        catch (e) { }
                    }
                }
            }
            catch (e) { }
            // Remove duplicates based on ID
            const seen = new Set();
            const uniqueEvents = [];
            for (const ev of allEvents) {
                if (!seen.has(ev.id)) {
                    seen.add(ev.id);
                    uniqueEvents.push(ev);
                }
            }
            this.results = uniqueEvents.filter(e => ((e.title || '') + ' ' + (e.description || '')).toLowerCase().includes(q)).slice(0, 50);
            this.selectedIndex = 0;
            render();
        });
        const onKey = (e) => {
            if (e.key === 'ArrowDown') {
                this.selectedIndex = Math.min(this.results.length - 1, this.selectedIndex + 1);
                render();
                e.preventDefault();
            }
            else if (e.key === 'ArrowUp') {
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                render();
                e.preventDefault();
            }
            else if (e.key === 'Enter') {
                this.choose(this.selectedIndex);
                e.preventDefault();
            }
            else if (e.key === 'Escape') {
                this.close();
                e.preventDefault();
            }
        };
        input.oninput = update;
        input.onkeydown = onKey;
        input.focus();
        update();
    }
    choose(idx) {
        return __awaiter(this, void 0, void 0, function* () {
            const ev = this.results[idx];
            if (!ev)
                return;
            const dateStr = ev.date || ev.startDate;
            if (dateStr) {
                const [y, m, d] = dateStr.split('-').map(Number);
                this.view.currentDate = new Date(y, (m || 1) - 1, d || 1);
                yield this.view.loadAllEntries();
                this.view.render();
                setTimeout(() => {
                    const nodes = Array.from(this.view.containerEl.querySelectorAll(`.dayble-event[data-id="${ev.id}"]`));
                    nodes.forEach(n => n.classList.add('dayble-event-highlight'));
                    setTimeout(() => { nodes.forEach(n => n.classList.remove('dayble-event-highlight')); }, 2000);
                }, 0);
            }
            this.close();
        });
    }
}
class TodayModal extends obsidian_1.Modal {
    constructor(app, date, events, view) {
        super(app);
        this.date = date;
        this.events = events;
        this.view = view;
    }
    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.height = '100%';
        c.addClass('db-modal');
        // Parse date
        const [year, month, day] = this.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[dateObj.getMonth()];
        // Title with date
        const title = c.createEl('h3', { text: `${monthName} ${day}` });
        title.addClass('db-modal-title');
        title.style.marginBottom = '16px';
        // Get events for this date
        const dayEvents = this.events.filter(e => e.date === this.date).sort((a, b) => {
            const timeA = a.time ? a.time.split('-')[0] : '99:99';
            const timeB = b.time ? b.time.split('-')[0] : '99:99';
            return timeA.localeCompare(timeB);
        });
        // Events container (scrollable)
        const eventsContainer = c.createDiv({ cls: 'dayble-today-events-container' });
        eventsContainer.addClass('db-events-container');
        eventsContainer.style.flex = '1';
        eventsContainer.style.overflowY = 'auto';
        eventsContainer.style.marginBottom = '12px';
        eventsContainer.style.paddingRight = '8px';
        if (dayEvents.length === 0) {
            eventsContainer.createEl('p', { text: 'No events for this day' });
        }
        else {
            dayEvents.forEach(ev => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                const row = c.createDiv({ cls: 'dayble-today-event-row' });
                row.addClass('db-today-row');
                row.setAttribute('draggable', 'true');
                row.dataset.id = ev.id;
                row.style.display = 'flex';
                row.style.gap = '12px';
                row.style.marginBottom = '12px';
                row.style.padding = '8px';
                row.style.backgroundColor = 'var(--background-primary-alt)';
                row.style.borderRadius = '6px';
                row.style.alignItems = 'flex-start';
                const contentEl = row.createDiv();
                contentEl.style.flex = '1';
                contentEl.style.display = 'flex';
                contentEl.style.flexDirection = 'column';
                contentEl.style.gap = '4px';
                const titleEl = contentEl.createDiv({ cls: 'dayble-today-event-title' });
                titleEl.addClass('db-title');
                titleEl.style.fontWeight = '500';
                titleEl.style.color = ev.color ? (ev.textColor || 'var(--text-normal)') : 'var(--text-normal)';
                renderMarkdown(ev.title || '', titleEl, (_b = (_a = this.view) === null || _a === void 0 ? void 0 : _a.plugin) === null || _b === void 0 ? void 0 : _b.app);
                // Apply event colors if available
                const plugin = (_c = this.view) === null || _c === void 0 ? void 0 : _c.plugin;
                const categories = (_e = (_d = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _d === void 0 ? void 0 : _d.eventCategories) !== null && _e !== void 0 ? _e : [];
                const category = categories.find(c => c.id === ev.categoryId);
                let bgColor = '';
                let textColor = '';
                if (ev.color) {
                    bgColor = ev.color;
                    textColor = ev.textColor || chooseTextColor(ev.color);
                }
                else if (category && category.bgColor) {
                    bgColor = category.bgColor;
                    textColor = category.textColor;
                }
                if (bgColor) {
                    const opacity = (_g = (_f = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _f === void 0 ? void 0 : _f.eventBgOpacity) !== null && _g !== void 0 ? _g : 1;
                    const rgbaColor = hexToRgba(bgColor, opacity);
                    row.style.backgroundColor = rgbaColor;
                    titleEl.style.color = textColor || titleEl.style.color;
                    row.classList.add('dayble-event-colored');
                }
                if (category) {
                    if (category.effect && category.effect !== '')
                        row.addClass(`dayble-effect-${category.effect}`);
                    const onlyToday = (_j = (_h = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _h === void 0 ? void 0 : _h.onlyAnimateToday) !== null && _j !== void 0 ? _j : false;
                    if (category.animation && category.animation !== '' && (!onlyToday || true)) {
                        row.addClass(`dayble-anim-${category.animation}`);
                    }
                    if (category.animation2 && category.animation2 !== '' && (!onlyToday || true)) {
                        row.addClass(`dayble-anim-${category.animation2}`);
                    }
                }
                const timeEl = row.createDiv({ cls: 'dayble-today-time' });
                timeEl.addClass('db-time');
                timeEl.style.minWidth = '60px';
                timeEl.style.fontWeight = '600';
                // Match event title color
                timeEl.style.color = titleEl.style.color;
                {
                    const fmt = (_o = (_m = (_l = (_k = this.view) === null || _k === void 0 ? void 0 : _k.plugin) === null || _l === void 0 ? void 0 : _l.settings) === null || _m === void 0 ? void 0 : _m.timeFormat) !== null && _o !== void 0 ? _o : '24h';
                    const startVal = ev.time ? ev.time.split('-')[0] : '';
                    const disp = formatTimeValue(startVal, fmt);
                    timeEl.textContent = disp || '—';
                }
                if (ev.description) {
                    const descEl = contentEl.createDiv({ cls: 'dayble-today-event-desc' });
                    descEl.addClass('db-desc');
                    descEl.style.fontSize = '0.9em';
                    // Match title color
                    descEl.style.color = titleEl.style.color;
                    renderMarkdown(ev.description, descEl, (_q = (_p = this.view) === null || _p === void 0 ? void 0 : _p.plugin) === null || _q === void 0 ? void 0 : _q.app);
                }
                // Optional completed indicator
                if (ev.completed) {
                    const behavior = (_u = (_t = (_s = (_r = this.view) === null || _r === void 0 ? void 0 : _r.plugin) === null || _s === void 0 ? void 0 : _s.settings) === null || _t === void 0 ? void 0 : _t.completeBehavior) !== null && _u !== void 0 ? _u : 'none';
                    if (behavior === 'dim')
                        row.style.opacity = '0.6';
                    else if (behavior === 'strikethrough')
                        titleEl.style.textDecoration = 'line-through';
                    else if (behavior === 'hide')
                        row.style.display = 'none';
                }
                eventsContainer.appendChild(row);
                // Drag handlers for reordering
                row.ondragstart = e => {
                    var _a, _b, _c;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', ev.id);
                    (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'today');
                    try {
                        const dragImg = row.cloneNode(true);
                        dragImg.style.position = 'fixed';
                        dragImg.style.top = '-10000px';
                        dragImg.style.left = '-10000px';
                        dragImg.style.opacity = '1';
                        dragImg.style.boxShadow = 'none';
                        dragImg.style.boxSizing = 'border-box';
                        const rect = row.getBoundingClientRect();
                        dragImg.style.width = `${rect.width}px`;
                        dragImg.style.height = `${rect.height}px`;
                        dragImg.style.transform = 'none';
                        dragImg.style.borderRadius = getComputedStyle(row).borderRadius;
                        document.body.appendChild(dragImg);
                        (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                        row.__dragImg = dragImg;
                    }
                    catch (_d) { }
                    row.addClass('dayble-dragging');
                };
                row.ondragend = () => {
                    row.removeClass('dayble-dragging');
                    const di = row.__dragImg;
                    if (di && di.parentElement)
                        di.remove();
                    row.__dragImg = undefined;
                };
                // Click to edit
                row.onclick = (e) => {
                    var _a, _b;
                    e.stopPropagation();
                    (_a = this.view) === null || _a === void 0 ? void 0 : _a.openEventModal(ev.id, (_b = ev.date) !== null && _b !== void 0 ? _b : this.date);
                };
                // Right-click context menu
                row.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menu = new obsidian_1.Menu();
                    menu.addItem(i => i.setTitle('Duplicate').setIcon('copy').onClick(() => {
                        const newEv = Object.assign(Object.assign({}, ev), { id: randomId() });
                        if (this.view) {
                            this.view.events.push(newEv);
                            void this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
                        }
                    }));
                    menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                        ev.completed = !ev.completed;
                        if (this.view)
                            void this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
                    }));
                    menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                        if (this.view) {
                            this.view.events = this.view.events.filter(e2 => e2.id !== ev.id);
                            void this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
                        }
                    }));
                    menu.showAtMouseEvent(e);
                };
            });
            // Enable reordering in today modal
            eventsContainer.ondragover = (e) => {
                var _a;
                e.preventDefault();
                const targetRow = e.target.closest('.dayble-today-event-row');
                const rowsCount = eventsContainer.querySelectorAll('.dayble-today-event-row').length;
                if (targetRow && rowsCount > 1) {
                    const rect = targetRow.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const h = rect.height;
                    eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    const indicator = document.createElement('div');
                    indicator.className = 'dayble-drop-indicator';
                    if (relativeY < h / 2) {
                        (_a = targetRow.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(indicator, targetRow);
                    }
                    else {
                        targetRow.after(indicator);
                    }
                }
            };
            eventsContainer.ondragleave = (e) => {
                if (e.target === eventsContainer)
                    eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
            };
            eventsContainer.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                e.preventDefault();
                eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
                const src = (_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source');
                if (!id)
                    return;
                const draggedEl = eventsContainer.querySelector(`[data-id="${id}"]`);
                if (!draggedEl)
                    return;
                const targetRow = e.target.closest('.dayble-today-event-row');
                if (!targetRow || targetRow === draggedEl)
                    return;
                const rect = targetRow.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const h = rect.height;
                if (relativeY < h / 2) {
                    eventsContainer.insertBefore(draggedEl, targetRow);
                }
                else {
                    targetRow.after(draggedEl);
                }
                if (!targetRow) {
                    eventsContainer.appendChild(draggedEl);
                }
                // Persist order for this date
                if (this.view) {
                    const date = this.date;
                    const dayIds = [];
                    eventsContainer.querySelectorAll('.dayble-today-event-row').forEach(el => {
                        const eid = el.dataset.id;
                        dayIds.push(eid);
                    });
                    const original = this.view.events.filter(ev => ev.date === date);
                    const others = this.view.events.filter(ev => ev.date !== date);
                    const reorderedDay = dayIds.map(id => original.find(e => e.id === id)).filter(Boolean);
                    this.view.events = others.concat(reorderedDay);
                    yield this.view.saveAllEntries();
                    this.view.render();
                }
            });
        }
        // Fixed +Add Event button at bottom
        const addBtn = c.createEl('button', { cls: 'dayble-today-add-btn', text: '+ Add Event' });
        addBtn.addClass('db-btn');
        addBtn.style.width = '100%';
        addBtn.style.padding = '10px';
        addBtn.style.border = 'none';
        addBtn.style.borderRadius = '6px';
        addBtn.style.fontWeight = '600';
        addBtn.style.cursor = 'pointer';
        addBtn.style.marginTop = 'auto';
        addBtn.onclick = () => {
            var _a;
            this.close();
            (_a = this.view) === null || _a === void 0 ? void 0 : _a.openEventModal(undefined, this.date);
        };
        // Enable internal link clicks inside today modal content
        this.contentEl.addEventListener('click', (ev) => {
            var _a, _b;
            const a = ev.target.closest('a');
            if (!a)
                return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (_b = (_a = leaf).openFile) === null || _b === void 0 ? void 0 : _b.call(_a, file);
                }
            }
        }, { capture: true });
    }
}
class StorageFolderNotSetModal extends obsidian_1.Modal {
    constructor(app) {
        super(app);
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        const title = contentEl.createEl('h2', { text: 'Storage folder not set' });
        title.addClass('db-modal-title');
        contentEl.createEl('p', { text: 'You need to set a storage folder to create and save events.' });
        const btns = contentEl.createDiv();
        btns.style.display = 'flex';
        btns.style.gap = '8px';
        btns.style.justifyContent = 'flex-end';
        btns.style.marginTop = '12px';
        const openSettingsBtn = btns.createEl('button', { cls: 'dayble-btn' });
        openSettingsBtn.setText('Open Settings');
        openSettingsBtn.onclick = () => {
            var _a, _b;
            try {
                const s = this.app.setting;
                (_a = s === null || s === void 0 ? void 0 : s.open) === null || _a === void 0 ? void 0 : _a.call(s);
                (_b = s === null || s === void 0 ? void 0 : s.openTabById) === null || _b === void 0 ? void 0 : _b.call(s, 'dayble-calendar');
            }
            catch (_c) { }
            this.close();
        };
        const closeBtn = btns.createEl('button', { cls: 'dayble-btn' });
        closeBtn.setText('Close');
        closeBtn.onclick = () => this.close();
    }
}
class ConfirmModal extends obsidian_1.Modal {
    constructor(app, message, onConfirm) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '12px';
        const msg = c.createEl('div');
        msg.textContent = this.message;
        const row = c.createDiv();
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.justifyContent = 'flex-end';
        const cancel = row.createEl('button', { cls: 'dayble-btn' });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();
        const ok = row.createEl('button', { cls: 'dayble-btn mod-cta' });
        ok.textContent = 'Delete';
        ok.onclick = () => { try {
            this.onConfirm();
        }
        finally {
            this.close();
        } };
    }
}
function getIconIdsSafe() {
    const anyOb = window.obsidian;
    const idsFn = anyOb === null || anyOb === void 0 ? void 0 : anyOb.getIconIds;
    if (typeof idsFn === 'function')
        return idsFn();
    return ['calendar', 'clock', 'star', 'bookmark', 'flag', 'bell', 'check', 'pencil', 'book', 'zap'];
}
function chooseTextColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb)
        return 'var(--text-normal)';
    const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
}
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}
function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb)
        return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
function formatTimeValue(value, fmt) {
    if (!value)
        return '';
    const [hhStr, mmStr] = value.split(':');
    const hh = parseInt(hhStr || '0', 10);
    const mm = parseInt(mmStr || '0', 10);
    if (fmt === '12h') {
        const isPM = hh >= 12;
        const h12 = ((hh % 12) || 12);
        return `${h12}:${String(mm).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    }
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function formatTimeRange(range, fmt) {
    if (!range)
        return '';
    const parts = range.split('-');
    if (parts.length === 2) {
        const s = formatTimeValue(parts[0], fmt);
        const e = formatTimeValue(parts[1], fmt);
        if (s && e)
            return `${s}-${e}`;
        return s || e || '';
    }
    return formatTimeValue(parts[0], fmt);
}
function renderMarkdown(text, element, app) {
    // Simple markdown rendering: headings, bold, italic, links, code, strikethrough, highlight, blockquote, images
    // NOTE: We do NOT escape HTML to allow users to use HTML tags directly (e.g., <u>underline</u>)
    let html = text
        // Obsidian wiki-style images ![[image.png]]
        .replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
        const imageUrl = app ? resolveImagePath(filename, app) : filename;
        return `<img src="${imageUrl}" alt="${filename}" class="dayble-embed-image">`;
    })
        // Markdown images ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        const imageUrl = app ? resolveImagePath(src, app) : src;
        return `<img src="${imageUrl}" alt="${alt}" class="dayble-embed-image">`;
    })
        // Headings #..######
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // Bold **text** and __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic *text* and _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough ~~text~~
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Highlight ==text==
        .replace(/==(.+?)==/g, '<mark>$1</mark>')
        // Blockquote lines starting with >
        .replace(/^&gt;[ \t]*(.+)$/gm, '<blockquote>$1</blockquote>')
        // Code `text` and ```blocks```
        .replace(/`([^`]+)`/g, '<code class="dayble-inline-code">$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre class="dayble-code-block"><code>$1</code></pre>')
        // Links [[target|alias]] and [text](url)
        .replace(/\[\[([^\[\]]+)\]\]/g, (m, inner) => {
        const parts = String(inner).split('|');
        const target = parts[0];
        const alias = parts[1] || parts[0];
        return `<a class="internal-link dayble-internal-link" data-href="${target}">${alias}</a>`;
    })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="dayble-external-link">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
    const range = document.createRange();
    range.selectNodeContents(element);
    element.replaceChildren(range.createContextualFragment(html));
}
function resolveImagePath(imagePath, app) {
    const raw = String(imagePath || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof obsidian_1.TFile)
        return app.vault.getResourcePath(byPath);
    const files = app.vault.getFiles();
    const extTarget = target.endsWith('.md') ? target.slice(0, -3) : target;
    const found = files.find((f) => f.path.endsWith(target))
        || files.find((f) => f.name === target)
        || files.find((f) => f.basename === extTarget)
        || files.find((f) => f.path.endsWith(`${extTarget}.md`));
    if (found)
        return app.vault.getResourcePath(found);
    return target;
}
function resolveNoteFile(app, linktext) {
    const raw = String(linktext || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const withoutMd = target.endsWith('.md') ? target.slice(0, -3) : target;
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof obsidian_1.TFile)
        return byPath;
    const files = app.vault.getFiles();
    const found = files.find((f) => f.path.endsWith(target))
        || files.find((f) => f.name === target)
        || files.find((f) => f.basename === withoutMd)
        || files.find((f) => f.path.endsWith(`${withoutMd}.md`));
    return found || null;
}
class DaybleSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        new obsidian_1.Setting(containerEl).setName('Dayble calendar').setHeading();
        // containerEl.createEl('h3', { text: 'General' });
        new obsidian_1.Setting(containerEl)
            .setName('Week start day')
            .setDesc('First day of the week')
            .addDropdown(d => {
            d.addOption('0', 'Sunday')
                .addOption('1', 'Monday')
                .addOption('2', 'Tuesday')
                .addOption('3', 'Wednesday')
                .addOption('4', 'Thursday')
                .addOption('5', 'Friday')
                .addOption('6', 'Saturday')
                .setValue(String(this.plugin.settings.weekStartDay))
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.weekStartDay = parseInt(v, 10);
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Storage folder')
            .setDesc('Folder to store calendar events. Data is stored in JSON files.')
            .addButton(b => {
            var _a;
            b.setButtonText(((_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim()) ? this.plugin.settings.entriesFolder : 'Unset')
                .onClick(() => {
                const folders = this.app.vault.getAllFolders()
                    .map(f => f.path)
                    .sort();
                const suggest = new obsidian_1.FuzzySuggestModal(this.app);
                suggest.setPlaceholder('Select storage folder...');
                suggest.getSuggestions = (q) => {
                    if (!q)
                        return folders;
                    return folders.filter(f => f.toLowerCase().includes(q.toLowerCase()));
                };
                suggest.renderSuggestion = (folder, el) => {
                    el.setText(folder || '(Vault root)');
                };
                suggest.onChooseSuggestion = (folder) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    this.plugin.settings.entriesFolder = folder || '';
                    yield this.plugin.saveSettings();
                    yield this.plugin.ensureEntriesFolder();
                    b.setButtonText(((_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim()) ? this.plugin.settings.entriesFolder : 'Unset');
                    const view = this.plugin.getCalendarView();
                    if (view) {
                        yield view.loadAllEntries();
                        view.render();
                    }
                });
                suggest.open();
            });
        });
        new obsidian_1.Setting(containerEl)
            .setName('Time format')
            .setDesc('Display times in 24h or 12h format')
            .addDropdown(d => {
            var _a;
            d.addOption('24h', '24-hour')
                .addOption('12h', '12-hour')
                .setValue((_a = this.plugin.settings.timeFormat) !== null && _a !== void 0 ? _a : '24h')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.timeFormat = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl).setName('Appearance').setHeading();
        new obsidian_1.Setting(containerEl)
            .setName('Icon placement')
            .setDesc('Position of event icon')
            .addDropdown(d => {
            var _a;
            d.addOption('left', 'Left')
                .addOption('right', 'Right')
                .addOption('none', 'None')
                .addOption('top', 'Top center')
                .addOption('top-left', 'Top left')
                .addOption('top-right', 'Top right')
                .setValue((_a = this.plugin.settings.iconPlacement) !== null && _a !== void 0 ? _a : 'left')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.iconPlacement = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event title alignment')
            .setDesc('Alignment of event titles')
            .addDropdown(d => {
            var _a;
            d.addOption('left', 'Left')
                .addOption('center', 'Center')
                .addOption('right', 'Right')
                .setValue((_a = this.plugin.settings.eventTitleAlign) !== null && _a !== void 0 ? _a : 'left')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventTitleAlign = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event description alignment')
            .setDesc('Alignment of event descriptions')
            .addDropdown(d => {
            var _a;
            d.addOption('left', 'Left')
                .addOption('center', 'Center')
                .addOption('right', 'Right')
                .setValue((_a = this.plugin.settings.eventDescAlign) !== null && _a !== void 0 ? _a : 'left')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventDescAlign = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event background opacity')
            .setDesc('Controls transparency of event backgrounds.')
            .addSlider(s => {
            var _a;
            s.setLimits(0, 1, 0.1)
                .setValue((_a = this.plugin.settings.eventBgOpacity) !== null && _a !== void 0 ? _a : 1)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventBgOpacity = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }))
                .setDynamicTooltip();
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event border thickness')
            .setDesc('Controls event border thickness (0-5px)')
            .addSlider(s => {
            var _a;
            s.setLimits(0, 5, 0.5)
                .setValue((_a = this.plugin.settings.eventBorderWidth) !== null && _a !== void 0 ? _a : 2)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventBorderWidth = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }))
                .setDynamicTooltip();
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event border opacity')
            .setDesc('Controls border color opacity for colored events (0-1)')
            .addSlider(s => {
            var _a;
            s.setLimits(0, 1, 0.1)
                .setValue((_a = this.plugin.settings.eventBorderOpacity) !== null && _a !== void 0 ? _a : 1)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventBorderOpacity = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }))
                .setDynamicTooltip();
        });
        new obsidian_1.Setting(containerEl)
            .setName('Event border radius')
            .setDesc('Controls event corner roundness (px)')
            .addSlider(s => {
            var _a;
            s.setLimits(0, 24, 1)
                .setValue((_a = this.plugin.settings.eventBorderRadius) !== null && _a !== void 0 ? _a : 6)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.eventBorderRadius = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }))
                .setDynamicTooltip();
        });
        new obsidian_1.Setting(containerEl)
            .setName('Completed event display')
            .setDesc('How completed events appear')
            .addDropdown(d => {
            var _a;
            d.addOption('none', 'No change')
                .addOption('dim', 'Dim')
                .addOption('strikethrough', 'Strikethrough')
                .addOption('hide', 'Hide')
                .setValue((_a = this.plugin.settings.completeBehavior) !== null && _a !== void 0 ? _a : 'none')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.completeBehavior = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName(`Only animate today's events`)
            .setDesc('Stop animation for all events except today')
            .addToggle(t => {
            var _a;
            t.setValue((_a = this.plugin.settings.onlyAnimateToday) !== null && _a !== void 0 ? _a : false)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.onlyAnimateToday = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Holder placement')
            .setDesc('Place the holder toggle (left, right, or hidden)')
            .addDropdown(d => {
            var _a;
            d.addOption('left', 'Left')
                .addOption('right', 'Right')
                .addOption('hidden', 'Hidden')
                .setValue((_a = this.plugin.settings.holderPlacement) !== null && _a !== void 0 ? _a : 'left')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.holderPlacement = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                if (view) {
                    // Clear the container and rebuild
                    view.containerEl.empty();
                    yield view.onOpen();
                }
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Enable Weekly Notes')
            .setDesc('Show a markdown notes section below the calendar in weekly view')
            .addToggle(t => {
            var _a;
            t.setValue((_a = this.plugin.settings.weeklyNotesEnabled) !== null && _a !== void 0 ? _a : false)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.weeklyNotesEnabled = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Max day cell height (px)')
            .setDesc('If set, day cells cap at this height and events scroll vertically')
            .addText(t => {
            var _a;
            t.setPlaceholder('0 (disabled)');
            t.setValue(String((_a = this.plugin.settings.dayCellMaxHeight) !== null && _a !== void 0 ? _a : 0));
            t.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                const num = parseInt(v || '0', 10);
                this.plugin.settings.dayCellMaxHeight = isNaN(num) ? 0 : Math.max(0, num);
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                view === null || view === void 0 ? void 0 : view.render();
            }));
            t.inputEl.type = 'number';
            t.inputEl.min = '0';
        });
        new obsidian_1.Setting(containerEl)
            .setName('Color swatch position')
            .setDesc('Position of color swatches in event modal')
            .addDropdown(d => {
            var _a;
            d.addOption('under-title', 'Under title')
                .addOption('under-description', 'Under description')
                .addOption('none', 'Do not show')
                .setValue((_a = this.plugin.settings.colorSwatchPosition) !== null && _a !== void 0 ? _a : 'under-title')
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.colorSwatchPosition = v;
                yield this.plugin.saveSettings();
            }));
        });
        const swatchesSectionTop = containerEl.createDiv();
        new obsidian_1.Setting(swatchesSectionTop).setName('Colors').setHeading();
        const colorsListTop = swatchesSectionTop.createDiv();
        const renderColorsTop = () => {
            colorsListTop.empty();
            const row = colorsListTop.createDiv();
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'flex-start';
            row.style.marginBottom = '16px';
            row.style.flexWrap = 'wrap';
            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' }));
            const combined = [...built, ...customs];
            const makeItem = (entry, idx) => {
                const wrap = row.createDiv();
                wrap.style.display = 'flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '6px';
                wrap.setAttr('draggable', 'true');
                wrap.dataset.source = entry.source;
                wrap.dataset.index = String(idx);
                wrap.dataset.name = entry.name;
                const textPicker = wrap.createEl('input', { type: 'color' });
                textPicker.value = entry.textColor || '#ffffff';
                const bgPicker = wrap.createEl('input', { type: 'color' });
                bgPicker.value = entry.color;
                const updateAll = () => __awaiter(this, void 0, void 0, function* () {
                    const prevBuiltArr = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                    const prevCustomArr = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '' }));
                    const newBuilt = [];
                    const newCustom = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w) => {
                        const src = w.dataset.source;
                        const nm = w.dataset.name || '';
                        const bg = w.querySelectorAll('input[type="color"]')[1].value;
                        const tx = w.querySelectorAll('input[type="color"]')[0].value;
                        if (src === 'built')
                            newBuilt.push({ name: nm, color: bg, textColor: tx });
                        else
                            newCustom.push({ name: '', color: bg, textColor: tx });
                    });
                    const colorMap = {};
                    for (let i = 0; i < prevBuiltArr.length && i < newBuilt.length; i++) {
                        const prev = prevBuiltArr[i];
                        const now = newBuilt[i];
                        if (prev.color !== now.color || (prev.textColor || '') !== (now.textColor || '')) {
                            colorMap[prev.color] = { color: now.color, textColor: now.textColor };
                        }
                    }
                    for (let i = 0; i < prevCustomArr.length && i < newCustom.length; i++) {
                        const prev = prevCustomArr[i];
                        const now = newCustom[i];
                        if (prev.color !== now.color || (prev.textColor || '') !== (now.textColor || '')) {
                            colorMap[prev.color] = { color: now.color, textColor: now.textColor };
                        }
                    }
                    const updatedTriggers = (this.plugin.settings.triggers || []).map(t => {
                        if (t.color && colorMap[t.color]) {
                            const mapped = colorMap[t.color];
                            return Object.assign(Object.assign({}, t), { color: mapped.color, textColor: mapped.textColor || chooseTextColor(mapped.color) });
                        }
                        return t;
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    this.plugin.settings.triggers = updatedTriggers;
                    yield this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) {
                        const prevByName = new Map();
                        prevBuiltArr.forEach(s => prevByName.set(s.name, { name: s.name, color: s.color, textColor: s.textColor }));
                        let dirty = false;
                        newBuilt.forEach(nb => {
                            var _a;
                            const prev = prevByName.get(nb.name);
                            if (!prev)
                                return;
                            const colorChanged = prev.color !== nb.color;
                            const textChanged = (prev.textColor || '') !== (nb.textColor || '');
                            if (!colorChanged && !textChanged)
                                return;
                            const rgba = hexToRgba(nb.color, (_a = this.plugin.settings.eventBgOpacity) !== null && _a !== void 0 ? _a : 1);
                            view.containerEl.querySelectorAll(`.dayble-event[data-color="${prev.color}"]`).forEach(el => {
                                const h = el;
                                h.style.setProperty('--event-bg-color', rgba);
                                h.style.setProperty('--event-text-color', nb.textColor || chooseTextColor(nb.color));
                                h.dataset.color = nb.color;
                                h.classList.add('dayble-event-colored');
                            });
                            view.events.forEach(ev => {
                                if (ev.color === prev.color) {
                                    ev.color = nb.color;
                                    ev.textColor = nb.textColor || chooseTextColor(nb.color);
                                    dirty = true;
                                }
                            });
                            view.holderEvents.forEach(ev => {
                                if (ev.color === prev.color) {
                                    ev.color = nb.color;
                                    ev.textColor = nb.textColor || chooseTextColor(nb.color);
                                    dirty = true;
                                }
                            });
                        });
                        if (dirty) {
                            yield view.saveAllEntries();
                            view.render();
                        }
                        else {
                            view.render();
                        }
                    }
                    if (typeof renderTriggers === 'function') {
                        renderTriggers();
                    }
                });
                textPicker.onchange = updateAll;
                bgPicker.onchange = updateAll;
                const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                del.style.background = 'none';
                del.style.boxShadow = 'none';
                del.style.border = 'none';
                del.style.padding = '2px 4px';
                (0, obsidian_1.setIcon)(del, 'x');
                del.setAttr('draggable', 'false');
                del.onmousedown = (e) => { e.stopPropagation(); };
                del.ontouchstart = (e) => { e.stopPropagation(); };
                del.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Delete this color swatch?', () => __awaiter(this, void 0, void 0, function* () {
                        wrap.remove();
                        yield updateAll();
                    }));
                    modal.open();
                });
                wrap.ondragstart = e => {
                    var _a;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', 'drag');
                    e.dataTransfer.effectAllowed = 'move';
                };
                row.ondragover = e => { e.preventDefault(); };
                row.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                    e.preventDefault();
                    const target = e.target.closest('div[draggable="true"]');
                    if (!target || target.parentElement !== row)
                        return;
                    const rect = target.getBoundingClientRect();
                    const before = (e.clientX - rect.left) < rect.width / 2;
                    if (before)
                        row.insertBefore(wrap, target);
                    else
                        target.after(wrap);
                    yield updateAll();
                });
                return wrap;
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new obsidian_1.Setting(colorsListTop);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.style.display = 'flex';
            controlsBottom.settingEl.style.alignItems = 'center';
            controlsBottom.settingEl.style.gap = '8px';
            controlsBottom.settingEl.style.width = '100%';
            controlsBottom.settingEl.style.justifyContent = 'flex-start';
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to default colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', () => __awaiter(this, void 0, void 0, function* () {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        yield this.plugin.saveSettings();
                        renderColorsTop();
                    }));
                    modal.open();
                }));
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ Add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const wrap = row.createDiv();
                    wrap.style.display = 'flex';
                    wrap.style.alignItems = 'center';
                    wrap.style.gap = '6px';
                    wrap.setAttr('draggable', 'true');
                    wrap.dataset.source = 'custom';
                    wrap.dataset.name = '';
                    const textPicker = wrap.createEl('input', { type: 'color' });
                    textPicker.value = '#ffffff';
                    const bgPicker = wrap.createEl('input', { type: 'color' });
                    bgPicker.value = '#ff0000';
                    const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                    del.style.background = 'none';
                    del.style.boxShadow = 'none';
                    del.style.border = 'none';
                    del.style.padding = '2px 4px';
                    (0, obsidian_1.setIcon)(del, 'x');
                    del.setAttr('draggable', 'false');
                    del.onmousedown = (e) => { e.stopPropagation(); };
                    del.ontouchstart = (e) => { e.stopPropagation(); };
                    const updateAll = () => __awaiter(this, void 0, void 0, function* () {
                        const prevBuiltArr = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        const newBuilt = [];
                        const newCustom = [];
                        colorsListTop.querySelectorAll('div[draggable="true"]').forEach((w) => {
                            const src = w.dataset.source;
                            const nm = w.dataset.name || '';
                            const bg = w.querySelectorAll('input[type="color"]')[1].value;
                            const tx = w.querySelectorAll('input[type="color"]')[0].value;
                            if (src === 'built')
                                newBuilt.push({ name: nm, color: bg, textColor: tx });
                            else
                                newCustom.push({ name: '', color: bg, textColor: tx });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        yield this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            const prevByName = new Map();
                            prevBuiltArr.forEach(s => prevByName.set(s.name, { name: s.name, color: s.color, textColor: s.textColor }));
                            let dirty = false;
                            newBuilt.forEach(nb => {
                                var _a;
                                const prev = prevByName.get(nb.name);
                                if (!prev)
                                    return;
                                const changed = prev.color !== nb.color || (prev.textColor || '') !== (nb.textColor || '');
                                if (!changed)
                                    return;
                                const rgba = hexToRgba(nb.color, (_a = this.plugin.settings.eventBgOpacity) !== null && _a !== void 0 ? _a : 1);
                                view.containerEl.querySelectorAll(`.dayble-event[data-color="${prev.color}"]`).forEach(el => {
                                    const h = el;
                                    h.style.setProperty('--event-bg-color', rgba);
                                    h.style.setProperty('--event-text-color', nb.textColor || chooseTextColor(nb.color));
                                    h.dataset.color = nb.color;
                                    h.classList.add('dayble-event-colored');
                                });
                                view.events.forEach(ev => {
                                    if (ev.color === prev.color) {
                                        ev.color = nb.color;
                                        ev.textColor = nb.textColor || chooseTextColor(nb.color);
                                        dirty = true;
                                    }
                                });
                                view.holderEvents.forEach(ev => {
                                    if (ev.color === prev.color) {
                                        ev.color = nb.color;
                                        ev.textColor = nb.textColor || chooseTextColor(nb.color);
                                        dirty = true;
                                    }
                                });
                            });
                            if (dirty) {
                                yield view.saveAllEntries();
                            }
                            view.render();
                        }
                    });
                    textPicker.onchange = updateAll;
                    bgPicker.onchange = updateAll;
                    del.onclick = () => __awaiter(this, void 0, void 0, function* () {
                        const modal = new ConfirmModal(this.app, 'Delete this color swatch?', () => __awaiter(this, void 0, void 0, function* () {
                            wrap.remove();
                            yield updateAll();
                        }));
                        modal.open();
                    });
                }));
            });
        };
        renderColorsTop();
        new obsidian_1.Setting(containerEl).setName('Event categories').setHeading();
        const rulesWrap = containerEl.createDiv();
        const renderRules = () => {
            rulesWrap.empty();
            (this.plugin.settings.eventCategories || []).forEach((category) => {
                var _a;
                const row = new obsidian_1.Setting(rulesWrap);
                // Remove the left-side setting title element
                (_a = row.settingEl.querySelector('.setting-item-name')) === null || _a === void 0 ? void 0 : _a.remove();
                row.settingEl.style.display = 'flex';
                row.settingEl.style.gridTemplateColumns = 'unset';
                row.controlEl.style.display = 'flex';
                row.controlEl.style.gap = '8px';
                row.controlEl.style.flex = '1';
                row.settingEl.classList.add('db-category-row');
                // Icon button
                row.addButton(b => {
                    var _a;
                    b.buttonEl.classList.add('dayble-btn', 'dayble-icon-add', 'db-btn');
                    (0, obsidian_1.setIcon)(b.buttonEl, (_a = category.icon) !== null && _a !== void 0 ? _a : 'plus');
                    b.onClick(() => {
                        const picker = new IconPickerModal(this.app, (icon) => __awaiter(this, void 0, void 0, function* () {
                            category.icon = icon;
                            yield this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view === null || view === void 0 ? void 0 : view.render();
                            renderRules();
                        }), () => __awaiter(this, void 0, void 0, function* () {
                            category.icon = undefined;
                            yield this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view === null || view === void 0 ? void 0 : view.render();
                            renderRules();
                        }));
                        picker.open();
                    });
                });
                // Category name input
                row.addText(t => { t.setValue(category.name).onChange(v => { category.name = v; }); t.inputEl.classList.add('db-input', 'db-category-name'); });
                // Text color first
                row.addColorPicker(cp => {
                    var _a, _b;
                    cp.setValue(category.textColor).onChange(v => {
                        category.textColor = v;
                        void this.plugin.saveSettings().then(() => {
                            const view = this.plugin.getCalendarView();
                            if (view)
                                view.render();
                        });
                    });
                    (_b = (_a = cp.inputEl) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add('db-color', 'db-text-color');
                });
                // Background color next
                row.addColorPicker(cp => {
                    var _a, _b;
                    cp.setValue(category.bgColor).onChange(v => {
                        category.bgColor = v;
                        void this.plugin.saveSettings().then(() => {
                            const view = this.plugin.getCalendarView();
                            if (view)
                                view.render();
                        });
                    });
                    (_b = (_a = cp.inputEl) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add('db-color', 'db-bg-color');
                });
                row.addDropdown(d => {
                    d.addOptions({
                        '': 'No effect',
                        'striped-1': 'Striped (45°)',
                        'striped-2': 'Striped (-45°)',
                        'vertical-stripes': 'Vertical stripes',
                        'thin-textured-stripes': 'Thin textured stripes',
                        'crosshatched': 'Crosshatched',
                        'checkerboard': 'Checkerboard',
                        'hexaboard': 'Hexaboard',
                        'wavy-lines': 'Wavy lines',
                        'dotted': 'Dotted',
                        'argyle': 'Argyle',
                        'embossed': 'Embossed',
                        'glass': 'Glass',
                        'glow': 'Glow',
                        'retro-button': 'Retro button'
                    }).setValue(category.effect).onChange(v => {
                        category.effect = v;
                        void this.plugin.saveSettings().then(() => {
                            const view = this.plugin.getCalendarView();
                            if (view)
                                view.render();
                        });
                    });
                    d.selectEl.classList.add('db-select', 'db-effect');
                });
                row.addDropdown(d => {
                    d.addOptions({
                        '': 'No animation',
                        'move-horizontally': 'Move horizontally',
                        'move-vertically': 'Move vertically',
                        'particles': 'Particles',
                        'snow-falling': 'Snow falling',
                        'animated-gradient': 'Animated gradient',
                        'glass-shine': 'Glass shine',
                        'glowing': 'Glowing'
                    }).setValue(category.animation).onChange(v => {
                        category.animation = v;
                        void this.plugin.saveSettings().then(() => {
                            const view = this.plugin.getCalendarView();
                            if (view)
                                view.render();
                        });
                    });
                    d.selectEl.classList.add('db-select', 'db-animation');
                });
                row.addDropdown(d => {
                    d.addOptions({
                        '': 'No animation',
                        'move-horizontally': 'Move horizontally',
                        'move-vertically': 'Move vertically',
                        'particles': 'Particles',
                        'snow-falling': 'Snow falling',
                        'animated-gradient': 'Animated gradient',
                        'glass-shine': 'Glass shine',
                        'glowing': 'Glowing'
                    }).setValue(category.animation2).onChange(v => {
                        category.animation2 = v;
                        void this.plugin.saveSettings().then(() => {
                            const view = this.plugin.getCalendarView();
                            if (view)
                                view.render();
                        });
                    });
                    d.selectEl.classList.add('db-select', 'db-animation2');
                });
                row.addExtraButton(btn => { var _a, _b; btn.setIcon('x').setTooltip('Delete').onClick(() => { this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).filter(c => c.id !== category.id); renderRules(); }); (_b = (_a = btn.extraButtonEl) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add('db-btn', 'db-delete-category'); });
            });
        };
        new obsidian_1.Setting(containerEl).addButton(b => {
            b.setButtonText('+ Add category');
            b.buttonEl.addClass('mod-cta');
            b.onClick(() => __awaiter(this, void 0, void 0, function* () {
                const category = { id: randomId(), name: 'New category', bgColor: '#8392a4', textColor: '#ffffff', effect: 'embossed', animation: '', animation2: '', icon: undefined };
                this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).concat(category);
                yield this.plugin.saveSettings();
                renderRules();
            }));
        });
        renderRules();
        new obsidian_1.Setting(containerEl).setName('Triggers').setHeading();
        const triggersWrap = containerEl.createDiv();
        const renderTriggers = () => {
            triggersWrap.empty();
            const items = this.plugin.settings.triggers || [];
            const swatches = [
                ...(this.plugin.settings.swatches || []),
                ...(this.plugin.settings.userCustomSwatches || [])
            ];
            items.forEach((tr, idx) => {
                var _a;
                const row = new obsidian_1.Setting(triggersWrap);
                (_a = row.settingEl.querySelector('.setting-item-name')) === null || _a === void 0 ? void 0 : _a.remove();
                row.settingEl.classList.add('db-triggers-row');
                row.controlEl.style.display = 'flex';
                row.controlEl.style.gap = '8px';
                row.controlEl.style.flex = '1';
                row.addText(t => {
                    t.setPlaceholder('Text in title or description');
                    t.setValue(tr.pattern);
                    t.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                        items[idx].pattern = v || '';
                        this.plugin.settings.triggers = items;
                        yield this.plugin.saveSettings();
                    }));
                    t.inputEl.classList.add('db-input');
                    t.inputEl.style.flex = '1';
                });
                row.addDropdown(d => {
                    const cats = this.plugin.settings.eventCategories || [];
                    d.addOption('', 'Default category');
                    cats.forEach(c => d.addOption(c.id, c.name));
                    d.setValue(tr.categoryId || '');
                    d.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                        items[idx].categoryId = v || '';
                        this.plugin.settings.triggers = items;
                        yield this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view === null || view === void 0 ? void 0 : view.render();
                    }));
                    d.selectEl.classList.add('db-select');
                    d.selectEl.style.width = '90px';
                });
                row.addDropdown(d => {
                    d.addOption('', 'Default color');
                    swatches.forEach(s => d.addOption(s.color, 'Color'));
                    d.setValue(tr.color || '');
                    d.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                        if (!v) {
                            delete items[idx].color;
                            delete items[idx].textColor;
                        }
                        else {
                            const s = swatches.find(sw => sw.color === v);
                            if (s) {
                                items[idx].color = s.color;
                                items[idx].textColor = s.textColor;
                            }
                        }
                        this.plugin.settings.triggers = items;
                        yield this.plugin.saveSettings();
                        applyColorStyles();
                    }));
                    d.selectEl.classList.add('db-select');
                    // Style the dropdown
                    const applyColorStyles = () => {
                        const currentValue = d.getValue();
                        const selectedSwatch = swatches.find(sw => sw.color === currentValue);
                        // Style the select element itself
                        if (selectedSwatch) {
                            d.selectEl.style.backgroundColor = selectedSwatch.color;
                            d.selectEl.style.color = selectedSwatch.textColor || '#000';
                        }
                        else {
                            d.selectEl.style.backgroundColor = '';
                            d.selectEl.style.color = '';
                        }
                        // Style the options
                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value)
                                return; // Skip default option
                            const s = swatches.find(sw => sw.color === opt.value);
                            if (s) {
                                opt.style.backgroundColor = s.color;
                                opt.style.color = s.textColor || '#000';
                            }
                        });
                    };
                    // Apply initially
                    applyColorStyles();
                    d.selectEl.style.maxWidth = '120px';
                });
                row.addExtraButton(btn => {
                    btn.setIcon('x').setTooltip('Delete').onClick(() => __awaiter(this, void 0, void 0, function* () {
                        const updated = items.filter((_, i) => i !== idx);
                        this.plugin.settings.triggers = updated;
                        yield this.plugin.saveSettings();
                        renderTriggers();
                    }));
                });
            });
            new obsidian_1.Setting(triggersWrap).addButton(b => {
                b.setButtonText('+ Add trigger').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const items2 = (this.plugin.settings.triggers || []).slice();
                    items2.push({ pattern: '', categoryId: '' });
                    this.plugin.settings.triggers = items2;
                    yield this.plugin.saveSettings();
                    renderTriggers();
                }));
            });
        };
        renderTriggers();
        // containerEl.createEl('h4', { text: 'Custom Swatches' });
        const swatchesSection = containerEl.createDiv();
        swatchesSection.style.display = 'none';
        new obsidian_1.Setting(swatchesSection);
        // .setName('Enable Custom Swatches')
        // .setDesc('If on, your custom swatches will appear in the color picker.')
        // .addToggle(t => {
        //     t.setValue(this.plugin.settings.customSwatchesEnabled ?? false)
        //      .onChange(async (v) => {
        //         this.plugin.settings.customSwatchesEnabled = v;
        //         await this.plugin.saveSettings();
        //      });
        // });
        new obsidian_1.Setting(swatchesSection).setName('Colors').setHeading();
        const colorsList = swatchesSection.createDiv();
        const renderColors = () => {
            colorsList.empty();
            const row = colorsList.createDiv();
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'flex-start';
            row.style.marginBottom = '16px';
            row.style.flexWrap = 'wrap';
            // Store the old swatches to detect changes
            const oldBuilt = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, source: 'built' }));
            const oldCustoms = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', source: 'custom' }));
            const oldCombined = [...oldBuilt, ...oldCustoms];
            const built = oldBuilt;
            const customs = oldCustoms;
            const combined = oldCombined;
            const makeItem = (entry, idx) => {
                const wrap = row.createDiv();
                wrap.style.display = 'flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '6px';
                wrap.setAttr('draggable', 'true');
                wrap.dataset.source = entry.source;
                wrap.dataset.index = String(idx);
                wrap.dataset.name = entry.name;
                const input = wrap.createEl('input', { type: 'color' });
                input.value = entry.color;
                input.onchange = () => __awaiter(this, void 0, void 0, function* () {
                    const newBuilt = [];
                    const newCustom = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w) => {
                        const src = w.dataset.source;
                        const nm = w.dataset.name || '';
                        const val = w.querySelector('input[type="color"]').value;
                        if (src === 'built')
                            newBuilt.push({ name: nm, color: val });
                        else
                            newCustom.push({ name: '', color: val });
                    });
                    // Create color mapping from old to new based on position
                    const colorMap = {};
                    // Map built swatches
                    for (let i = 0; i < oldBuilt.length && i < newBuilt.length; i++) {
                        if (oldBuilt[i].color !== newBuilt[i].color) {
                            colorMap[oldBuilt[i].color] = newBuilt[i].color;
                        }
                    }
                    // Map custom swatches
                    for (let i = 0; i < oldCustoms.length && i < newCustom.length; i++) {
                        if (oldCustoms[i].color !== newCustom[i].color) {
                            colorMap[oldCustoms[i].color] = newCustom[i].color;
                        }
                    }
                    // Update any triggers using colors that changed
                    const triggers = (this.plugin.settings.triggers || []).slice();
                    triggers.forEach(t => {
                        if (t.color && colorMap[t.color]) {
                            const newColorValue = colorMap[t.color];
                            // Also update the textColor
                            const allSwatches = [...newBuilt, ...newCustom];
                            const foundSwatch = allSwatches.find(s => s.color === newColorValue);
                            t.color = newColorValue;
                            if (foundSwatch) {
                                // Find the textColor from original settings
                                const originalSwatch = [...(this.plugin.settings.swatches || []), ...(this.plugin.settings.userCustomSwatches || [])].find(s => s.color === newColorValue);
                                if (originalSwatch) {
                                    t.textColor = originalSwatch.textColor;
                                }
                            }
                        }
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    this.plugin.settings.triggers = triggers;
                    yield this.plugin.saveSettings();
                    renderTriggers();
                });
                const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                del.style.background = 'none';
                del.style.boxShadow = 'none';
                del.style.border = 'none';
                del.style.padding = '2px 4px';
                (0, obsidian_1.setIcon)(del, 'x');
                del.setAttr('draggable', 'false');
                del.onmousedown = (e) => { e.stopPropagation(); };
                del.ontouchstart = (e) => { e.stopPropagation(); };
                del.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Delete this color swatch?', () => __awaiter(this, void 0, void 0, function* () {
                        wrap.remove();
                        const newBuilt = [];
                        const newCustom = [];
                        row.querySelectorAll('div[draggable="true"]').forEach((w) => {
                            const src = w.dataset.source;
                            const nm = w.dataset.name || '';
                            const val = w.querySelector('input[type="color"]').value;
                            if (src === 'built')
                                newBuilt.push({ name: nm, color: val });
                            else
                                newCustom.push({ name: '', color: val });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        yield this.plugin.saveSettings();
                    }));
                    modal.open();
                });
                wrap.ondragstart = e => {
                    var _a;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', 'drag');
                    e.dataTransfer.effectAllowed = 'move';
                };
                row.ondragover = e => { e.preventDefault(); };
                row.ondrop = (e) => __awaiter(this, void 0, void 0, function* () {
                    e.preventDefault();
                    const target = e.target.closest('div[draggable="true"]');
                    if (!target || target.parentElement !== row)
                        return;
                    const rect = target.getBoundingClientRect();
                    const before = (e.clientX - rect.left) < rect.width / 2;
                    if (before)
                        row.insertBefore(wrap, target);
                    else
                        target.after(wrap);
                    const newBuilt = [];
                    const newCustom = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w) => {
                        const src = w.dataset.source;
                        const nm = w.dataset.name || '';
                        const val = w.querySelector('input[type="color"]').value;
                        if (src === 'built')
                            newBuilt.push({ name: nm, color: val });
                        else
                            newCustom.push({ name: '', color: val });
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
                });
                return wrap;
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new obsidian_1.Setting(swatchesSection);
            controlsBottom.settingEl.style.borderTop = 'none';
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to default colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', () => __awaiter(this, void 0, void 0, function* () {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        yield this.plugin.saveSettings();
                        renderColors();
                        renderTriggers();
                    }));
                    modal.open();
                }));
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ Add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const newCustom = (this.plugin.settings.userCustomSwatches || []).slice();
                    newCustom.push({ name: '', color: '#ff0000' });
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
                    renderColors();
                    renderTriggers();
                }));
                b.buttonEl.style.marginLeft = 'auto';
            });
        };
        ;
        new obsidian_1.Setting(containerEl).setName('Data management').setHeading();
        new obsidian_1.Setting(containerEl)
            .setName('Export data')
            .addButton(b => {
            b.setButtonText('Export data')
                .onClick(() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                try {
                    const vaultName = ((_b = (_a = this.app.vault) === null || _a === void 0 ? void 0 : _a.getName) === null || _b === void 0 ? void 0 : _b.call(_a))
                        || ((_d = (_c = this.app.vault.adapter) === null || _c === void 0 ? void 0 : _c.basePath) === null || _d === void 0 ? void 0 : _d.split(/[\\/]/).filter(Boolean).pop())
                        || 'Vault';
                    const exportObj = {
                        vaultName,
                        exportedAt: new Date().toISOString(),
                        settings: this.plugin.settings,
                        months: []
                    };
                    const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                    let files = [];
                    try {
                        const listing = yield this.app.vault.adapter.list(folder);
                        files = (listing.files || []).filter((f) => f.toLowerCase().endsWith('.json'));
                    }
                    catch (_) {
                        files = [];
                    }
                    for (const f of files) {
                        try {
                            const txt = yield this.app.vault.adapter.read(f);
                            const data = JSON.parse(txt);
                            exportObj.months.push({ file: f, data });
                        }
                        catch (e) { }
                    }
                    // Create a file save dialog
                    const fileName = `DaybleExport_${vaultName}_${Date.now()}.json`;
                    const jsonStr = JSON.stringify(exportObj, null, 2);
                    // Create a download link and trigger save dialog
                    const link = document.createElement('a');
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                    new obsidian_1.Notice(`Export ready: ${fileName}`);
                }
                catch (e) {
                    new obsidian_1.Notice('Export failed');
                }
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Import data')
            .addButton(b => {
            b.setButtonText('Import data')
                .onClick(() => __awaiter(this, void 0, void 0, function* () {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json,.json';
                input.onchange = () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];
                    if (!file)
                        return;
                    try {
                        const text = yield file.text();
                        const obj = JSON.parse(text);
                        if (obj === null || obj === void 0 ? void 0 : obj.settings) {
                            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, obj.settings);
                            yield this.plugin.saveSettings();
                        }
                        if (Array.isArray(obj === null || obj === void 0 ? void 0 : obj.months)) {
                            const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                            try {
                                yield this.app.vault.adapter.stat(folder);
                            }
                            catch (_c) {
                                try {
                                    yield this.app.vault.createFolder(folder);
                                }
                                catch (_d) { }
                            }
                            for (const m of obj.months) {
                                const path = typeof m.file === 'string' ? m.file : `${folder}/Imported_${Date.now()}.json`;
                                yield this.app.vault.adapter.write(path, JSON.stringify((_b = m.data) !== null && _b !== void 0 ? _b : {}, null, 2));
                            }
                        }
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            yield view.loadAllEntries();
                            view.render();
                        }
                        new obsidian_1.Notice('Import completed');
                        // Reload the plugin
                        const pluginManager = this.plugin.app.plugins;
                        if (pluginManager) {
                            yield pluginManager.disablePlugin(this.plugin.manifest.id);
                            yield pluginManager.enablePlugin(this.plugin.manifest.id);
                        }
                    }
                    catch (e) {
                        new obsidian_1.Notice('Import failed');
                    }
                });
                input.click();
            }));
        });
    }
}
function randomId() {
    const anyCrypto = window.crypto;
    if (anyCrypto === null || anyCrypto === void 0 ? void 0 : anyCrypto.randomUUID)
        return anyCrypto.randomUUID();
    return 'ev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBbUo7QUFFbkosTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUM7QUFrQ3pDLE1BQU0sZ0JBQWdCLEdBQW1CO0lBQ3JDLFlBQVksRUFBRSxDQUFDO0lBQ2YsYUFBYSxFQUFFLEVBQUU7SUFDakIsYUFBYSxFQUFFLE1BQU07SUFDckIsZUFBZSxFQUFFLFFBQVE7SUFDekIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsaUJBQWlCLEVBQUUsQ0FBQztJQUNwQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLG1CQUFtQixFQUFFLGFBQWE7SUFDbEMsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsc0JBQXNCLEVBQUUsS0FBSztJQUM3QixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixlQUFlLEVBQUUsTUFBTTtJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsUUFBUSxFQUFFO1FBQ04sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN2RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDekQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUM5RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDMUQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUMzRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO0tBQzNEO0lBQ0Qsa0JBQWtCLEVBQUUsRUFBRTtJQUN0QixlQUFlLEVBQUUsRUFBRTtJQUNuQixRQUFRLEVBQUUsRUFBRTtDQUNmLENBQUM7QUE4QkYs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QUFDLE9BQU8sQ0FBQzt3QkFDdkQsSUFBSSxhQUFhLEVBQUUsQ0FBQzs0QkFDaEIsTUFBTSxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUMzRCxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQzlELENBQUM7b0JBQ0wsQ0FBQztvQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUNULElBQUksaUJBQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDaEMsQ0FBQztnQkFDTCxDQUFDLENBQUEsQ0FBQztnQkFDRixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNSLENBQUMsQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNKO0FBQ0QsU0FBUyxRQUFRO0lBQ2IsTUFBTSxTQUFTLEdBQUksTUFBYyxDQUFDLE1BQU0sQ0FBQztJQUN6QyxJQUFJLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxVQUFVO1FBQUUsT0FBTyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDekQsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBJdGVtVmlldywgTW9kYWwsIE5vdGljZSwgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nLCBXb3Jrc3BhY2VMZWFmLCBzZXRJY29uLCBNZW51LCBURmlsZSwgRnV6enlTdWdnZXN0TW9kYWwgfSBmcm9tICdvYnNpZGlhbic7XG5cbmNvbnN0IFZJRVdfVFlQRSA9ICdkYXlibGUtY2FsZW5kYXItdmlldyc7XG5cbmludGVyZmFjZSBEYXlibGVTZXR0aW5ncyB7XG4gICAgd2Vla1N0YXJ0RGF5OiBudW1iZXI7XG4gICAgZW50cmllc0ZvbGRlcjogc3RyaW5nO1xuICAgIGljb25QbGFjZW1lbnQ/OiAnbGVmdCcgfCAncmlnaHQnIHwgJ25vbmUnIHwgJ3RvcCcgfCAndG9wLWxlZnQnIHwgJ3RvcC1yaWdodCc7XG4gICAgZXZlbnRUaXRsZUFsaWduPzogJ2xlZnQnIHwgJ2NlbnRlcicgfCAncmlnaHQnO1xuICAgIGV2ZW50RGVzY0FsaWduPzogJ2xlZnQnIHwgJ2NlbnRlcicgfCAncmlnaHQnO1xuICAgIHRpbWVGb3JtYXQ/OiAnMjRoJyB8ICcxMmgnO1xuICAgIGhvbGRlck9wZW4/OiBib29sZWFuO1xuICAgIGhvbGRlcldpZHRoPzogbnVtYmVyOyAvLyBpbiBwaXhlbHNcbiAgICB3ZWVrbHlOb3Rlc0hlaWdodD86IG51bWJlcjsgLy8gaW4gcGl4ZWxzXG4gICAgZXZlbnRDYXRlZ29yaWVzPzogRXZlbnRDYXRlZ29yeVtdO1xuICAgIHByZWZlclVzZXJDb2xvcnM/OiBib29sZWFuOyAvLyBwcmVmZXIgdXNlci1zZXQgZXZlbnQgY29sb3JzIG92ZXIgY2F0ZWdvcnkgY29sb3JzXG4gICAgZXZlbnRCZ09wYWNpdHk/OiBudW1iZXI7IC8vIDAtMSwgY29udHJvbHMgYmFja2dyb3VuZCBvcGFjaXR5XG4gICAgZXZlbnRCb3JkZXJXaWR0aD86IG51bWJlcjsgLy8gMC01cHgsIGNvbnRyb2xzIGJvcmRlciB0aGlja25lc3NcbiAgICBldmVudEJvcmRlclJhZGl1cz86IG51bWJlcjsgLy8gcHgsIGNvbnRyb2xzIGJvcmRlciByYWRpdXNcbiAgICBldmVudEJvcmRlck9wYWNpdHk/OiBudW1iZXI7IC8vIDAtMSwgY29udHJvbHMgYm9yZGVyIGNvbG9yIG9wYWNpdHkgKGZvciBjb2xvcmVkIGV2ZW50cylcbiAgICBjb2xvclN3YXRjaFBvc2l0aW9uPzogJ3VuZGVyLXRpdGxlJyB8ICd1bmRlci1kZXNjcmlwdGlvbicgfCAnbm9uZSc7IC8vIHBvc2l0aW9uIG9mIGNvbG9yIHN3YXRjaGVzIGluIG1vZGFsXG4gICAgb25seUFuaW1hdGVUb2RheT86IGJvb2xlYW47XG4gICAgY29tcGxldGVCZWhhdmlvcj86ICdub25lJyB8ICdkaW0nIHwgJ3N0cmlrZXRocm91Z2gnIHwgJ2hpZGUnO1xuICAgIGN1c3RvbVN3YXRjaGVzRW5hYmxlZD86IGJvb2xlYW47XG4gICAgcmVwbGFjZURlZmF1bHRTd2F0Y2hlcz86IGJvb2xlYW47XG4gICAgc3dhdGNoZXM/OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXTtcbiAgICB1c2VyQ3VzdG9tU3dhdGNoZXM/OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXTtcbiAgICBkZWZhdWx0Q29sb3JzRm9sZGVkPzogYm9vbGVhbjtcbiAgICBjdXN0b21Td2F0Y2hlc0ZvbGRlZD86IGJvb2xlYW47XG4gICAgZGF5Q2VsbE1heEhlaWdodD86IG51bWJlcjtcbiAgICBob2xkZXJQbGFjZW1lbnQ/OiAnbGVmdCcgfCAncmlnaHQnIHwgJ2hpZGRlbic7XG4gICAgY2FsZW5kYXJXZWVrQWN0aXZlPzogYm9vbGVhbjtcbiAgICB0cmlnZ2Vycz86IHsgcGF0dGVybjogc3RyaW5nLCBjYXRlZ29yeUlkOiBzdHJpbmcsIGNvbG9yPzogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdO1xuICAgIHdlZWtseU5vdGVzRW5hYmxlZD86IGJvb2xlYW47XG59IFxuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEYXlibGVTZXR0aW5ncyA9IHtcbiAgICB3ZWVrU3RhcnREYXk6IDAsXG4gICAgZW50cmllc0ZvbGRlcjogJycsXG4gICAgaWNvblBsYWNlbWVudDogJ2xlZnQnLFxuICAgIGV2ZW50VGl0bGVBbGlnbjogJ2NlbnRlcicsXG4gICAgZXZlbnREZXNjQWxpZ246ICdjZW50ZXInLFxuICAgIHRpbWVGb3JtYXQ6ICcyNGgnLFxuICAgIGhvbGRlck9wZW46IHRydWUsXG4gICAgd2Vla2x5Tm90ZXNIZWlnaHQ6IDIwMCxcbiAgICBwcmVmZXJVc2VyQ29sb3JzOiBmYWxzZSxcbiAgICBldmVudEJnT3BhY2l0eTogMC41MCxcbiAgICBldmVudEJvcmRlcldpZHRoOiAwLFxuICAgIGV2ZW50Qm9yZGVyUmFkaXVzOiA2LFxuICAgIGV2ZW50Qm9yZGVyT3BhY2l0eTogMC4yNSxcbiAgICBjb2xvclN3YXRjaFBvc2l0aW9uOiAndW5kZXItdGl0bGUnLFxuICAgIG9ubHlBbmltYXRlVG9kYXk6IGZhbHNlLFxuICAgIGNvbXBsZXRlQmVoYXZpb3I6ICdkaW0nLFxuICAgIGN1c3RvbVN3YXRjaGVzRW5hYmxlZDogZmFsc2UsXG4gICAgcmVwbGFjZURlZmF1bHRTd2F0Y2hlczogZmFsc2UsXG4gICAgZGVmYXVsdENvbG9yc0ZvbGRlZDogdHJ1ZSxcbiAgICBjdXN0b21Td2F0Y2hlc0ZvbGRlZDogZmFsc2UsXG4gICAgZGF5Q2VsbE1heEhlaWdodDogMCxcbiAgICBob2xkZXJQbGFjZW1lbnQ6ICdsZWZ0JyxcbiAgICBjYWxlbmRhcldlZWtBY3RpdmU6IGZhbHNlLFxuICAgIHdlZWtseU5vdGVzRW5hYmxlZDogZmFsc2UsXG4gICAgc3dhdGNoZXM6IFtcbiAgICAgICAgeyBuYW1lOiAnUmVkJywgY29sb3I6ICcjZWIzYjVhJywgdGV4dENvbG9yOiAnI2Y5YzZkMCcgfSxcbiAgICAgICAgeyBuYW1lOiAnT3JhbmdlJywgY29sb3I6ICcjZmE4MjMxJywgdGV4dENvbG9yOiAnI2ZlZDhiZScgfSxcbiAgICAgICAgeyBuYW1lOiAnQW1iZXInLCBjb2xvcjogJyNlNWEyMTYnLCB0ZXh0Q29sb3I6ICcjZjhlNWJiJyB9LFxuICAgICAgICB7IG5hbWU6ICdHcmVlbicsIGNvbG9yOiAnIzIwYmY2YicsIHRleHRDb2xvcjogJyNjNGVlZGEnIH0sXG4gICAgICAgIHsgbmFtZTogJ1RlYWwnLCBjb2xvcjogJyMwZmI5YjEnLCB0ZXh0Q29sb3I6ICcjYmRlY2VhJyB9LFxuICAgICAgICB7IG5hbWU6ICdCbHVlJywgY29sb3I6ICcjMmQ5OGRhJywgdGV4dENvbG9yOiAnI2M1ZTNmOCcgfSxcbiAgICAgICAgeyBuYW1lOiAnQ29ybmZsb3dlcicsIGNvbG9yOiAnIzM4NjdkNicsIHRleHRDb2xvcjogJyNjOWQ1ZjgnIH0sXG4gICAgICAgIHsgbmFtZTogJ0luZGlnbycsIGNvbG9yOiAnIzU0NTRkMCcsIHRleHRDb2xvcjogJyNkMmQyZjgnIH0sXG4gICAgICAgIHsgbmFtZTogJ1B1cnBsZScsIGNvbG9yOiAnIzg4NTRkMCcsIHRleHRDb2xvcjogJyNlMmQyZjgnIH0sXG4gICAgICAgIHsgbmFtZTogJ01hZ2VudGEnLCBjb2xvcjogJyNiNTU0ZDAnLCB0ZXh0Q29sb3I6ICcjZWRkMmY4JyB9LFxuICAgICAgICB7IG5hbWU6ICdQaW5rJywgY29sb3I6ICcjZTgzMmMxJywgdGV4dENvbG9yOiAnI2Y4YzJlZicgfSxcbiAgICAgICAgeyBuYW1lOiAnUm9zZScsIGNvbG9yOiAnI2U4MzI4OScsIHRleHRDb2xvcjogJyNmOGMyZTAnIH0sXG4gICAgICAgIHsgbmFtZTogJ0Jyb3duJywgY29sb3I6ICcjOTY1YjNiJywgdGV4dENvbG9yOiAnI2U1ZDRjOScgfSxcbiAgICAgICAgeyBuYW1lOiAnR3JheScsIGNvbG9yOiAnIzgzOTJhNCcsIHRleHRDb2xvcjogJyNlM2U2ZWEnIH1cbiAgICBdLFxuICAgIHVzZXJDdXN0b21Td2F0Y2hlczogW10sXG4gICAgZXZlbnRDYXRlZ29yaWVzOiBbXSxcbiAgICB0cmlnZ2VyczogW11cbn07XG5cbmludGVyZmFjZSBEYXlibGVFdmVudCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICB0aXRsZTogc3RyaW5nO1xuICAgIGRhdGU/OiBzdHJpbmc7XG4gICAgc3RhcnREYXRlPzogc3RyaW5nO1xuICAgIGVuZERhdGU/OiBzdHJpbmc7XG4gICAgdGltZT86IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgICBpY29uPzogc3RyaW5nO1xuICAgIGNvbXBsZXRlZD86IGJvb2xlYW47XG4gICAgY29sb3I/OiBzdHJpbmc7IC8vIHVzZXItc2V0IGNvbG9yIChoZXgpXG4gICAgdGV4dENvbG9yPzogc3RyaW5nOyAvLyB1c2VyLXNldCB0ZXh0IGNvbG9yIChoZXgpXG4gICAgY2F0ZWdvcnlJZD86IHN0cmluZztcbiAgICBlZmZlY3Q/OiBzdHJpbmc7XG4gICAgYW5pbWF0aW9uPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgRXZlbnRDYXRlZ29yeSB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgYmdDb2xvcjogc3RyaW5nO1xuICAgIHRleHRDb2xvcjogc3RyaW5nO1xuICAgIGVmZmVjdDogc3RyaW5nO1xuICAgIGFuaW1hdGlvbjogc3RyaW5nO1xuICAgIGFuaW1hdGlvbjI6IHN0cmluZztcbiAgICBpY29uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYXlibGVDYWxlbmRhclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3M6IERheWJsZVNldHRpbmdzO1xuXG4gICAgYXN5bmMgb25sb2FkKCkge1xuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEUsIGxlYWYgPT4gbmV3IERheWJsZUNhbGVuZGFyVmlldyhsZWFmLCB0aGlzKSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnb3Blbi1jYWxlbmRhcicsIG5hbWU6ICdPcGVuIGNhbGVuZGFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMub3BlbkRheWJsZSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2ZvY3VzLXRvZGF5JywgbmFtZTogJ0ZvY3VzIG9uIHRvZGF5JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZm9jdXNUb2RheSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAnb3Blbi13ZWVrbHktdmlldycsIFxuICAgICAgICAgICAgbmFtZTogJ09wZW4gd2Vla2x5IHZpZXcnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbkRheWJsZSgpOyBcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ29wZW4tbW9udGhseS12aWV3JywgXG4gICAgICAgICAgICBuYW1lOiAnT3BlbiBtb250aGx5IHZpZXcnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbkRheWJsZSgpOyBcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRGF5YmxlU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgICAgICB0aGlzLmVuc3VyZUVudHJpZXNGb2xkZXIoKTtcbiAgICAgICAgdGhpcy5vcGVuRGF5YmxlKCk7XG4gICAgfVxuXG4gICAgb251bmxvYWQoKSB7XG4gICAgICAgIC8vIERvIG5vdCBkZXRhY2ggbGVhdmVzIGhlcmUgdG8gcmVzcGVjdCB1c2VyIGxheW91dFxuICAgIH1cblxuICAgIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5EYXlibGUoKSB7XG4gICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmdldE9yQ3JlYXRlTGVhZigpO1xuICAgICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICBmb2N1c1RvZGF5KCkge1xuICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgaWYgKHZpZXcpIHZpZXcuZm9jdXNUb2RheSgpO1xuICAgICAgICBlbHNlIHRoaXMub3BlbkRheWJsZSgpO1xuICAgIH1cblxuICAgIGdldENhbGVuZGFyVmlldygpOiBEYXlibGVDYWxlbmRhclZpZXcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgbGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEUpO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIHJldHVybiBsZWF2ZXNbMF0udmlldyBhcyBEYXlibGVDYWxlbmRhclZpZXc7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGdldE9yQ3JlYXRlTGVhZigpOiBXb3Jrc3BhY2VMZWFmIHtcbiAgICAgICAgY29uc3QgbGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEUpO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCkgcmV0dXJuIGxlYXZlc1swXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpID8/IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xuICAgIH1cblxuICAgIGFzeW5jIGVuc3VyZUVudHJpZXNGb2xkZXIoKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuc2V0dGluZ3MuZW50cmllc0ZvbGRlcjtcbiAgICAgICAgaWYgKCFmb2xkZXIgfHwgZm9sZGVyLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZSBQbHVnaW5dIEZhaWxlZCB0byBjcmVhdGUgZm9sZGVyOicsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBEYXlibGVDYWxlbmRhclZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gICAgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbjtcbiAgICByb290RWw6IEhUTUxFbGVtZW50O1xuICAgIGhlYWRlckVsOiBIVE1MRWxlbWVudDtcbiAgICBtb250aFRpdGxlRWw6IEhUTUxFbGVtZW50O1xuICAgIHdlZWtIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgY2FsZW5kYXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgYm9keUVsOiBIVE1MRWxlbWVudDtcbiAgICBob2xkZXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgZ3JpZEVsOiBIVE1MRWxlbWVudDtcbiAgICBfbG9uZ092ZXJsYXlFbD86IEhUTUxFbGVtZW50O1xuICAgIF9sb25nRWxzOiBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4gPSBuZXcgTWFwKCk7XG4gICAgY3VycmVudERhdGU6IERhdGU7XG4gICAgZXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgaG9sZGVyRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgd2Vla2x5Tm90ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpc1NlbGVjdGluZyA9IGZhbHNlO1xuICAgIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICBzZWxlY3Rpb25TdGFydERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHNlbGVjdGlvbkVuZERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGlzUmVzaXppbmdIb2xkZXIgPSBmYWxzZTtcbiAgICBob2xkZXJSZXNpemVTdGFydFggPSAwO1xuICAgIGhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggPSAwO1xuICAgIF9ib3VuZEhvbGRlck1vdXNlTW92ZT86IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuICAgIF9ib3VuZEhvbGRlck1vdXNlVXA/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBfbG9uZ1JPPzogUmVzaXplT2JzZXJ2ZXI7XG4gICAgY3VycmVudFRvZGF5TW9kYWw/OiBUb2RheU1vZGFsO1xuICAgIHdlZWtUb2dnbGVCdG4/OiBIVE1MRWxlbWVudDtcbiAgICB3ZWVrbHlOb3Rlc0VsPzogSFRNTEVsZW1lbnQ7XG4gICAgZHJhZ2dlZEV2ZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgIHNhdmVUaW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IHVuZGVmaW5lZDtcbiAgICBpc1Jlc2l6aW5nV2Vla2x5Tm90ZXMgPSBmYWxzZTtcbiAgICB3ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0WSA9IDA7XG4gICAgd2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCA9IDA7XG4gICAgX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmU/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBfYm91bmRXZWVrbHlOb3Rlc01vdXNlVXA/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcblxuICAgIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIobGVhZik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5wbHVnaW4ucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdyZXNpemUnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWRTYXZlKCkge1xuICAgICAgICBpZiAodGhpcy5zYXZlVGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMuc2F2ZVRpbWVvdXQpO1xuICAgICAgICB0aGlzLnNhdmVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLnNhdmVBbGxFbnRyaWVzKCksIDEwMDApO1xuICAgIH1cblxuICAgIGdldFZpZXdUeXBlKCkgeyByZXR1cm4gVklFV19UWVBFOyB9XG4gICAgZ2V0RGlzcGxheVRleHQoKSB7IHJldHVybiAnRGF5YmxlIENhbGVuZGFyJzsgfVxuICAgIGdldEljb24oKSB7IHJldHVybiAnY2FsZW5kYXInOyB9XG4gICAgXG4gICAgZ2V0TW9udGhEYXRhRmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XG4gICAgICAgIGNvbnN0IHllYXIgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIGNvbnN0IG1vbnRoID0gbW9udGhOYW1lc1t0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCldO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke3llYXJ9JHttb250aH0uanNvbmA7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgfVxuXG4gICAgYXN5bmMgb25PcGVuKCkge1xuICAgICAgICB0aGlzLnJvb3RFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXJvb3QnIH0pO1xuICAgICAgICB0aGlzLmhlYWRlckVsID0gdGhpcy5yb290RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhlYWRlcicgfSk7XG4gICAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1uYXYtbGVmdCcgfSk7XG4gICAgICAgIGNvbnN0IGhvbGRlclRvZ2dsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICBob2xkZXJUb2dnbGUuY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zIGRheWJsZS1ob2xkZXItdG9nZ2xlJztcbiAgICAgICAgc2V0SWNvbihob2xkZXJUb2dnbGUsICdtZW51Jyk7XG4gICAgICAgIGhvbGRlclRvZ2dsZS5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyB0aGlzLmhvbGRlckVsLmNsYXNzTGlzdC50b2dnbGUoJ29wZW4nKTsgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyT3BlbiA9IHRoaXMuaG9sZGVyRWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdvcGVuJyk7IGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyB9O1xuICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgc2VhcmNoQnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyBkYXlibGUtc2VhcmNoLXRvZ2dsZSc7XG4gICAgICAgIHNldEljb24oc2VhcmNoQnRuLCAnc2VhcmNoJyk7XG4gICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKCkgPT4geyBjb25zdCBtb2RhbCA9IG5ldyBQcm9tcHRTZWFyY2hNb2RhbCh0aGlzLmFwcCwgdGhpcyk7IG1vZGFsLm9wZW4oKTsgfTtcblxuICAgICAgICBjb25zdCB3ZWVrVG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgIHdlZWtUb2dnbGUuY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zIGRheWJsZS13ZWVrLXRvZ2dsZSc7XG4gICAgICAgIHNldEljb24od2Vla1RvZ2dsZSwgJ2NhbGVuZGFyLXJhbmdlJyk7XG4gICAgICAgIHdlZWtUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPSAhdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlO1xuICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLndlZWtUb2dnbGVCdG4gPSB3ZWVrVG9nZ2xlO1xuXG4gICAgICAgIHRoaXMubW9udGhUaXRsZUVsID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVFbCgnaDEnLCB7IGNsczogJ2RheWJsZS1tb250aC10aXRsZScgfSk7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LXJpZ2h0JyB9KTtcbiAgICAgICAgY29uc3QgcHJldkJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOyBwcmV2QnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyc7XG4gICAgICAgIHNldEljb24ocHJldkJ0biwgJ2NoZXZyb24tbGVmdCcpO1xuICAgICAgICBwcmV2QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuc2hpZnRNb250aCgtMSk7IH07XG4gICAgICAgIGNvbnN0IHRvZGF5QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7IHRvZGF5QnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyc7XG4gICAgICAgIHNldEljb24odG9kYXlCdG4sICdkb3QnKTtcbiAgICAgICAgdG9kYXlCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5mb2N1c1RvZGF5KCk7IH07XG4gICAgICAgIGNvbnN0IG5leHRCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsgbmV4dEJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMnO1xuICAgICAgICBzZXRJY29uKG5leHRCdG4sICdjaGV2cm9uLXJpZ2h0Jyk7XG4gICAgICAgIG5leHRCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5zaGlmdE1vbnRoKDEpOyB9O1xuICAgICAgICBjb25zdCBwbGFjZW1lbnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJQbGFjZW1lbnQgPz8gJ2xlZnQnO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ2xlZnQnKSBsZWZ0LmFwcGVuZENoaWxkKGhvbGRlclRvZ2dsZSk7XG4gICAgICAgIFxuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKHByZXZCdG4pO1xuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKHRvZGF5QnRuKTtcbiAgICAgICAgbGVmdC5hcHBlbmRDaGlsZChuZXh0QnRuKTtcbiAgICAgICAgbGVmdC5hcHBlbmRDaGlsZCh3ZWVrVG9nZ2xlKTtcbiAgICAgICAgXG4gICAgICAgIHJpZ2h0LmFwcGVuZENoaWxkKHNlYXJjaEJ0bik7XG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdyaWdodCcpIHJpZ2h0LmFwcGVuZENoaWxkKGhvbGRlclRvZ2dsZSk7XG4gICAgICAgIHRoaXMuYm9keUVsID0gdGhpcy5yb290RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWJvZHknIH0pO1xuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICB0aGlzLmJvZHlFbC5hZGRDbGFzcygnZGF5YmxlLWhvbGRlci1yaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaG9sZGVyRWwgPSB0aGlzLmJvZHlFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaG9sZGVyJyB9KTtcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ2hpZGRlbicpIHtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ2RheWJsZS1ob2xkZXItaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaG9sZGVySGVhZGVyID0gdGhpcy5ob2xkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaG9sZGVyLWhlYWRlcicsIHRleHQ6ICdIb2xkZXInIH0pO1xuICAgICAgICBjb25zdCBob2xkZXJBZGQgPSBob2xkZXJIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtaG9sZGVyLWFkZC1idG4nIH0pO1xuICAgICAgICBzZXRJY29uKGhvbGRlckFkZCwgJ3BsdXMnKTtcbiAgICAgICAgaG9sZGVyQWRkLm9uY2xpY2sgPSAoKSA9PiB0aGlzLm9wZW5FdmVudE1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVzaXplIGhhbmRsZSB0byBob2xkZXJcbiAgICAgICAgY29uc3QgcmVzaXplSGFuZGxlID0gaG9sZGVySGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItcmVzaXplLWhhbmRsZScgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNSZXNpemluZ0hvbGRlcikgcmV0dXJuO1xuICAgICAgICAgICAgbGV0IGRpZmYgPSBlLmNsaWVudFggLSB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WDtcbiAgICAgICAgICAgIC8vIFdoZW4gaG9sZGVyIGlzIG9uIHRoZSByaWdodCwgcmV2ZXJzZSB0aGUgZGlyZWN0aW9uXG4gICAgICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IC1kaWZmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbmV3V2lkdGggPSBNYXRoLm1heCgyMDAsIHRoaXMuaG9sZGVyUmVzaXplU3RhcnRXaWR0aCArIGRpZmYpO1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoICsgJ3B4JztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCA9IGFzeW5jIChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Jlc2l6aW5nSG9sZGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc1Jlc2l6aW5nSG9sZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUhKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwISk7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyV2lkdGggPSB0aGlzLmhvbGRlckVsLm9mZnNldFdpZHRoO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmVzaXplSGFuZGxlLm9ubW91c2Vkb3duID0gKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdIb2xkZXIgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJSZXNpemVTdGFydFggPSBlLmNsaWVudFg7XG4gICAgICAgICAgICB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggPSB0aGlzLmhvbGRlckVsLm9mZnNldFdpZHRoO1xuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUhKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXAhKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGhvbGRlckxpc3QgPSB0aGlzLmhvbGRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItbGlzdCcgfSk7XG4gICAgICAgIC8vIEFkZCBkcmFnIGhhbmRsZXJzIHRvIGhvbGRlciBmb3IgZHJvcHBpbmcgZXZlbnRzIHRoZXJlXG4gICAgICAgIHRoaXMuaG9sZGVyRWwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgdGhpcy5ob2xkZXJFbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgIHRoaXMuaG9sZGVyRWwub25kcm9wID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICBpZiAoIWlkIHx8IHNyYyA9PT0gJ2hvbGRlcicpIHJldHVybjsgLy8gRG9uJ3QgZHJvcCBob2xkZXIgZXZlbnRzIG9uIGhvbGRlclxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLmV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzLnNwbGljZShpZHgsIDEpWzBdO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBkYXRlIGluZm8gd2hlbiBtb3ZpbmcgdG8gaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGV2LnN0YXJ0RGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZXYuZW5kRGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZhaWxlZCB0byBtb3ZlIGV2ZW50IHRvIGhvbGRlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmhvbGRlckVsLmFwcGVuZENoaWxkKGhvbGRlckxpc3QpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgc2F2ZWQgaG9sZGVyIHdpZHRoIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyV2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwuc3R5bGUud2lkdGggPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJPcGVuKSB0aGlzLmhvbGRlckVsLmFkZENsYXNzKCdvcGVuJyk7IGVsc2UgdGhpcy5ob2xkZXJFbC5yZW1vdmVDbGFzcygnb3BlbicpO1xuICAgICAgICB0aGlzLmNhbGVuZGFyRWwgPSB0aGlzLmJvZHlFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtY2FsZW5kYXInIH0pO1xuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2RheXMnIH0pO1xuICAgICAgICB0aGlzLmdyaWRFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZCcgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG5cbiAgICBhc3luYyBvbkNsb3NlKCkge1xuICAgICAgICAvLyBDbGVhbiB1cCByZXNpemUgaGFuZGxlIGxpc3RlbmVyc1xuICAgICAgICBpZiAodGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEaXNjb25uZWN0IGxvbmcgZXZlbnQgUmVzaXplT2JzZXJ2ZXIgYW5kIHJlbW92ZSBvdmVybGF5IHRvIHByZXZlbnQgbGVha3NcbiAgICAgICAgaWYgKHRoaXMuX2xvbmdSTykge1xuICAgICAgICAgICAgdHJ5IHsgdGhpcy5fbG9uZ1JPLmRpc2Nvbm5lY3QoKTsgfSBjYXRjaCB7fVxuICAgICAgICAgICAgdGhpcy5fbG9uZ1JPID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9sb25nT3ZlcmxheUVsICYmIHRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRyeSB7IHRoaXMuX2xvbmdPdmVybGF5RWwucmVtb3ZlKCk7IH0gY2F0Y2gge31cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9sb25nRWxzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgdHJ5IHsgaWYgKGVsICYmIGVsLnBhcmVudEVsZW1lbnQpIGVsLnJlbW92ZSgpOyB9IGNhdGNoIHt9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9sb25nRWxzLmNsZWFyKCk7XG4gICAgICAgIGlmICh0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VNb3ZlKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VNb3ZlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXApIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VVcCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgZ2V0UmVxdWlyZWRGaWxlcygpOiBTZXQ8c3RyaW5nPiB7XG4gICAgICAgIGNvbnN0IGZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYWRkRGF0ZSA9IChkOiBEYXRlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgY29uc3QgbSA9IG1vbnRoTmFtZXNbZC5nZXRNb250aCgpXTtcbiAgICAgICAgICAgIGZpbGVzLmFkZChgJHt5fSR7bX0uanNvbmApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFsd2F5cyBhZGQgY3VycmVudCBkYXRlJ3MgbW9udGhcbiAgICAgICAgYWRkRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcblxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB7XG4gICAgICAgICAgICBjb25zdCB3ZWVrU3RhcnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrU3RhcnREYXk7XG4gICAgICAgICAgICBjb25zdCBiYXNlID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XG4gICAgICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSAoKHREb3cgLSB3ZWVrU3RhcnQpICsgNykgJSA3O1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShiYXNlKTtcbiAgICAgICAgICAgIHN0YXJ0LnNldERhdGUoYmFzZS5nZXREYXRlKCkgLSBkaWZmKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgICAgICAgIGVuZC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSArIDYpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhZGREYXRlKHN0YXJ0KTtcbiAgICAgICAgICAgIGFkZERhdGUoZW5kKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZXM7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZEFsbEVudHJpZXMoKSB7XG4gICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5nZXRSZXF1aXJlZEZpbGVzKCk7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gW107XG4gICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gW107XG4gICAgICAgIHRoaXMud2Vla2x5Tm90ZXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdGhpcy5nZXRNb250aERhdGFGaWxlUGF0aCgpLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgICAgICAgbGV0IGhvbGRlckZyb21HbG9iYWw6IERheWJsZUV2ZW50W10gfCBudWxsID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGhvbGRlckZpbGUgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyfS9ob2xkZXIuanNvbmA7XG4gICAgICAgICAgICBjb25zdCBoanNvbiA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChob2xkZXJGaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IGhkYXRhID0gSlNPTi5wYXJzZShoanNvbik7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShoZGF0YT8uaG9sZGVyKSkge1xuICAgICAgICAgICAgICAgIGhvbGRlckZyb21HbG9iYWwgPSBoZGF0YS5ob2xkZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKF8pIHt9XG5cbiAgICAgICAgY29uc3QgaG9sZGVyQWdncmVnYXRlOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbikgYXMgeyBldmVudHM6IERheWJsZUV2ZW50W10sIGhvbGRlcjogRGF5YmxlRXZlbnRbXSwgd2Vla2x5Tm90ZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBsYXN0TW9kaWZpZWQ/OiBzdHJpbmcgfTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5ldmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaCguLi5kYXRhLmV2ZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghaG9sZGVyRnJvbUdsb2JhbCAmJiBBcnJheS5pc0FycmF5KGRhdGEuaG9sZGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBob2xkZXJBZ2dyZWdhdGUucHVzaCguLi5kYXRhLmhvbGRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWxlbmFtZSA9PT0gY3VycmVudEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3RlcyA9IGRhdGEud2Vla2x5Tm90ZXMgfHwge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkdXBsaWNhdGUgPSBzZWVuLmhhcyhlLmlkKTtcbiAgICAgICAgICAgIHNlZW4uYWRkKGUuaWQpO1xuICAgICAgICAgICAgcmV0dXJuICFkdXBsaWNhdGU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGZpbmFsaXplSG9sZGVyID0gKGxpc3Q6IERheWJsZUV2ZW50W10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhTZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgICAgICBjb25zdCBkZWR1cDogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoID0gbGlzdFtpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWggfHwgIWguaWQpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChoU2Vlbi5oYXMoaC5pZCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGhTZWVuLmFkZChoLmlkKTtcbiAgICAgICAgICAgICAgICBkZWR1cC51bnNoaWZ0KGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlZHVwO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoaG9sZGVyRnJvbUdsb2JhbCkge1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSBmaW5hbGl6ZUhvbGRlcihob2xkZXJGcm9tR2xvYmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gZmluYWxpemVIb2xkZXIoaG9sZGVyQWdncmVnYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHNhdmVBbGxFbnRyaWVzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCk7XG4gICAgICAgIGlmICghZm9sZGVyKSB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XG4gICAgICAgIGNhdGNoIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cblxuICAgICAgICBjb25zdCBmaWxlc1RvU2F2ZSA9IHRoaXMuZ2V0UmVxdWlyZWRGaWxlcygpO1xuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBnZXRGaWxlbmFtZUZvckRhdGUgPSAoZGF0ZVN0cjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKGRhdGVTdHIpO1xuICAgICAgICAgICAgIGlmIChpc05hTihkLmdldFRpbWUoKSkpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgIGNvbnN0IHkgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICAgY29uc3QgbSA9IG1vbnRoTmFtZXNbZC5nZXRNb250aCgpXTtcbiAgICAgICAgICAgICByZXR1cm4gYCR7eX0ke219Lmpzb25gO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdGhpcy5nZXRNb250aERhdGFGaWxlUGF0aCgpLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgICAgICAgLy8gV2UgbmVlZCB0byByZWFkIGFsbCBmaWxlcyBmaXJzdCB0byBlbnN1cmUgd2UgZG9uJ3QgbG9zZSBldmVudHMgdGhhdCBhcmUgTk9UIGluIHRoaXMuZXZlbnRzIChlLmcuIG91dCBvZiB2aWV3IHJhbmdlKVxuICAgICAgICAvLyBCdXQgd2FpdCwgaWYgd2Ugb25seSBsb2FkZWQgZXZlbnRzIGZyb20gYGZpbGVzVG9TYXZlYCwgYW5kIGB0aGlzLmV2ZW50c2AgY29udGFpbnMgbW9kaWZpY2F0aW9ucy4uLlxuICAgICAgICAvLyBJZiB3ZSBtb2RpZnkgYW4gZXZlbnQsIGl0J3MgaW4gYHRoaXMuZXZlbnRzYC5cbiAgICAgICAgLy8gSWYgd2UgZGVsZXRlIGFuIGV2ZW50LCBpdCdzIHJlbW92ZWQgZnJvbSBgdGhpcy5ldmVudHNgLlxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgZXZlbnRzIGluIHRoZSBmaWxlcyB0aGF0IGFyZSBOT1QgaW4gYHRoaXMuZXZlbnRzYCwgaXQgaW1wbGllcyB0aGV5IHdlcmUgbm90IGxvYWRlZC5cbiAgICAgICAgLy8gU2luY2UgYGxvYWRBbGxFbnRyaWVzYCBsb2FkcyBFVkVSWVRISU5HIGZyb20gYGZpbGVzVG9TYXZlYCwgYHRoaXMuZXZlbnRzYCBzaG91bGQgY292ZXIgQUxMIGV2ZW50cyBpbiB0aG9zZSBmaWxlcy5cbiAgICAgICAgLy8gU28gd2UgY2FuIHNhZmVseSBvdmVyd3JpdGUgYGZpbGVzVG9TYXZlYC5cbiAgICAgICAgXG4gICAgICAgIC8vIFBhcnRpdGlvbiBldmVudHMgYnkgdGFyZ2V0IGZpbGVuYW1lXG4gICAgICAgIGNvbnN0IGV2ZW50c0J5RmlsZTogUmVjb3JkPHN0cmluZywgRGF5YmxlRXZlbnRbXT4gPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXJyYXlzIGZvciBrbm93biBmaWxlc1xuICAgICAgICBmaWxlc1RvU2F2ZS5mb3JFYWNoKGYgPT4gZXZlbnRzQnlGaWxlW2ZdID0gW10pO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3JwaGFuRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG5cbiAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICBsZXQgdGFyZ2V0RmlsZSA9IGN1cnJlbnRGaWxlOyAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZmlsZSBpZiBubyBkYXRlXG4gICAgICAgICAgICBpZiAoZXYuZGF0ZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldEZpbGUgPSBnZXRGaWxlbmFtZUZvckRhdGUoZXYuZGF0ZSkgfHwgY3VycmVudEZpbGU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2LnN0YXJ0RGF0ZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldEZpbGUgPSBnZXRGaWxlbmFtZUZvckRhdGUoZXYuc3RhcnREYXRlKSB8fCBjdXJyZW50RmlsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRhcmdldEZpbGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWV2ZW50c0J5RmlsZVt0YXJnZXRGaWxlXSkgZXZlbnRzQnlGaWxlW3RhcmdldEZpbGVdID0gW107XG4gICAgICAgICAgICAgICAgZXZlbnRzQnlGaWxlW3RhcmdldEZpbGVdLnB1c2goZXYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvcnBoYW5FdmVudHMucHVzaChldik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBldmVudHMgdGhhdCBiZWxvbmcgdG8gZmlsZXMgTk9UIGluIGBmaWxlc1RvU2F2ZWAgKGUuZy4gbW92ZWQgZXZlbnQgdG8gZmFyIGZ1dHVyZSksXG4gICAgICAgIC8vIHdlIHNob3VsZCBwcm9iYWJseSBzYXZlIHRob3NlIGZpbGVzIHRvby5cbiAgICAgICAgLy8gQnV0IGZvciBub3csIGxldCdzIGZvY3VzIG9uIGBmaWxlc1RvU2F2ZWAgKyBhbnkgbmV3IHRhcmdldHMgZm91bmQuXG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIGVhY2ggZmlsZVxuICAgICAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIE9iamVjdC5rZXlzKGV2ZW50c0J5RmlsZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVFdmVudHMgPSBldmVudHNCeUZpbGVbZmlsZW5hbWVdO1xuICAgICAgICAgICAgY29uc3QgaXNDdXJyZW50ID0gZmlsZW5hbWUgPT09IGN1cnJlbnRGaWxlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBmaWxlID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdlIG5lZWQgdG8gcHJlc2VydmUgaG9sZGVyL3dlZWtseU5vdGVzIGlmIHdlIGFyZSBOT1QgdGhlIGN1cnJlbnQgZmlsZVxuICAgICAgICAgICAgLy8gQnV0IHdhaXQsIGBsb2FkQWxsRW50cmllc2Agb25seSBsb2FkZWQgaG9sZGVyIGZyb20gYGN1cnJlbnRGaWxlYC5cbiAgICAgICAgICAgIC8vIFNvIGZvciBvdGhlciBmaWxlcywgd2UgZG9uJ3Qga25vdyB0aGVpciBob2xkZXIgY29udGVudCFcbiAgICAgICAgICAgIC8vIFdlIE1VU1QgcmVhZCB0aGVtIHRvIHByZXNlcnZlIGhvbGRlci9ub3Rlcy5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGhvbGRlclRvU2F2ZTogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IG5vdGVzVG9TYXZlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdyaXRlIHRoZSBzYW1lIGhvbGRlciBsaXN0IHRvIGFsbCBmaWxlcyB0byBrZWVwIGl0IGdsb2JhbFxuICAgICAgICAgICAgaG9sZGVyVG9TYXZlID0gdGhpcy5ob2xkZXJFdmVudHM7XG4gICAgICAgICAgICAvLyBXZWVrbHkgbm90ZXMgYXJlIHBlci1maWxlOyBwcmVzZXJ2ZSBleGlzdGluZyBub3RlcyBmb3Igbm9uLWN1cnJlbnQgZmlsZXNcbiAgICAgICAgICAgIGlmIChpc0N1cnJlbnQpIHtcbiAgICAgICAgICAgICAgICBub3Rlc1RvU2F2ZSA9IHRoaXMud2Vla2x5Tm90ZXM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhmaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm90ZXNUb1NhdmUgPSBkYXRhLndlZWtseU5vdGVzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBldmVudHM6IGZpbGVFdmVudHMsXG4gICAgICAgICAgICAgICAgaG9sZGVyOiBob2xkZXJUb1NhdmUsXG4gICAgICAgICAgICAgICAgd2Vla2x5Tm90ZXM6IG5vdGVzVG9TYXZlLFxuICAgICAgICAgICAgICAgIGxhc3RNb2RpZmllZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKGZpbGUsIGpzb25TdHIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIEZhaWxlZCB0byBzYXZlJywgZmlsZW5hbWUsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaG9sZGVyRmlsZSA9IGAke2ZvbGRlcn0vaG9sZGVyLmpzb25gO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgaGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaG9sZGVyOiB0aGlzLmhvbGRlckV2ZW50cyxcbiAgICAgICAgICAgICAgICBsYXN0TW9kaWZpZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGhqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoaGRhdGEsIG51bGwsIDIpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShob2xkZXJGaWxlLCBoanNvblN0cik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIEZhaWxlZCB0byBzYXZlIGhvbGRlci5qc29uJywgZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb2N1c1RvZGF5KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgdm9pZCB0aGlzLmxvYWRBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcbiAgICB9XG5cbiAgICBzaGlmdE1vbnRoKGRlbHRhOiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXREYXRlKHRoaXMuY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgKGRlbHRhICogNykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgZC5zZXRNb250aChkLmdldE1vbnRoKCkgKyBkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gZDtcbiAgICAgICAgfVxuICAgICAgICB2b2lkIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbmRlcih0aXRsZUVsPzogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMud2Vla2x5Tm90ZXNFbCkge1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlc2V0IGdyaWQgc3R5bGVcbiAgICAgICAgdGhpcy5ncmlkRWwuc3R5bGUuZmxleCA9ICcxIDEgYXV0byc7XG4gICAgICAgIHRoaXMuZ3JpZEVsLnN0eWxlLm1pbkhlaWdodCA9ICcnO1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFkZENsYXNzKCdkYXlibGUtd2Vlay1tb2RlJyk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcldlZWtWaWV3KHRpdGxlRWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ncmlkRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS13ZWVrLW1vZGUnKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyTW9udGhWaWV3KHRpdGxlRWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcmVuZGVyV2Vla1ZpZXcodGl0bGVFbD86IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHkgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIGNvbnN0IG0gPSB0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCk7XG4gICAgICAgIGNvbnN0IG1vbnRoTGFiZWwgPSB0aGlzLmN1cnJlbnREYXRlLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xuICAgICAgICBpZiAodGhpcy5tb250aFRpdGxlRWwpIHRoaXMubW9udGhUaXRsZUVsLnNldFRleHQobW9udGhMYWJlbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgd2VlayB0b2dnbGUgYnV0dG9uIGFjdGl2ZSBzdGF0ZVxuICAgICAgICBpZiAodGhpcy53ZWVrVG9nZ2xlQnRuKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB0aGlzLndlZWtUb2dnbGVCdG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLndlZWtUb2dnbGVCdG4ucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5ncmlkRWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy53ZWVrSGVhZGVyRWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtTdGFydCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheTtcbiAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcbiAgICAgICAgY29uc3QgZGlmZiA9ICgodERvdyAtIHdlZWtTdGFydCkgKyA3KSAlIDc7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XG4gICAgICAgIHN0YXJ0LnNldERhdGUoYmFzZS5nZXREYXRlKCkgLSBkaWZmKTsgLy8gU3RhcnQgb2YgdGhlIHdlZWtcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgY29uc3QgaGVhZGVyID0gdGhpcy53ZWVrSGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWdyaWQtaGVhZGVyJyB9KTtcbiAgICAgICAgY29uc3QgZGF5cyA9IFsnc3VuJywnbW9uJywndHVlJywnd2VkJywndGh1JywnZnJpJywnc2F0J107XG4gICAgICAgIGNvbnN0IG9yZGVyZWQgPSBkYXlzLnNsaWNlKHdlZWtTdGFydCkuY29uY2F0KGRheXMuc2xpY2UoMCwgd2Vla1N0YXJ0KSk7XG4gICAgICAgIG9yZGVyZWQuZm9yRWFjaChkID0+IGhlYWRlci5jcmVhdGVEaXYoeyB0ZXh0OiBkLCBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXItY2VsbCcgfSkpO1xuXG4gICAgICAgIC8vIFByZS1jYWxjdWxhdGUgbG9uZyBldmVudCBtYXJnaW5zIChyZXVzZWQgZnJvbSBtb250aCB2aWV3IGxvZ2ljKVxuICAgICAgICBjb25zdCBzZWdtZW50SGVpZ2h0ID0gMjg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRHYXAgPSA0OyAvLyBnYXBweVxuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgICAgY29uc3QgbG9uZ0V2ZW50c1ByZXNldCA9IHRoaXMuZXZlbnRzLmZpbHRlcihldiA9PiBldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpO1xuICAgICAgICBsb25nRXZlbnRzUHJlc2V0LmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUhKTtcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcbiAgICAgICAgICAgICAgICBjb3VudHNCeURhdGVba2V5XSA9IChjb3VudHNCeURhdGVba2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdyaWRcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgICAgICAgIGQuc2V0RGF0ZShzdGFydC5nZXREYXRlKCkgKyBpKTtcbiAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3QgZnVsbERhdGUgPSBgJHt5eX0tJHttbX0tJHtkZH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjZWxsID0gZnJhZ21lbnQuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheScgfSk7XG4gICAgICAgICAgICBjZWxsLnNldEF0dHIoJ2RhdGEtZGF0ZScsIGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGF5SGVhZGVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LWhlYWRlcicgfSk7XG4gICAgICAgICAgICBjb25zdCBudW0gPSBkYXlIZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheS1udW1iZXInLCB0ZXh0OiBTdHJpbmcoZC5nZXREYXRlKCkpIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGNvbnN0IGlzVG9kYXkgPSBkLmdldERhdGUoKSA9PT0gdC5nZXREYXRlKCkgJiYgZC5nZXRNb250aCgpID09PSB0LmdldE1vbnRoKCkgJiYgZC5nZXRGdWxsWWVhcigpID09PSB0LmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc1RvZGF5KSB7XG4gICAgICAgICAgICAgICAgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWN1cnJlbnQtZGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoQnRuID0gZGF5SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1kYXktc2VhcmNoLWJ0bicgfSk7XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLmFkZENsYXNzKCdkYi1kYXktc2VhcmNoLWJ0bicpO1xuICAgICAgICAgICAgICAgIHNldEljb24oc2VhcmNoQnRuLCAnZm9jdXMnKTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub25jbGljayA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuVG9kYXlNb2RhbChmdWxsRGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub250b3VjaHN0YXJ0ID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsb25nQ29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1jb250YWluZXInIH0pO1xuICAgICAgICAgICAgbG9uZ0NvbnRhaW5lci5hZGRDbGFzcygnZGItbG9uZy1jb250YWluZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZXZlbnQtY29udGFpbmVyJyB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXBwbHkgbWFyZ2lucyBmb3IgbG9uZyBldmVudHNcbiAgICAgICAgICAgIGNvbnN0IHByZUNvdW50ID0gY291bnRzQnlEYXRlW2Z1bGxEYXRlXSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgcHJlTXQgPSBwcmVDb3VudCA+IDAgPyAocHJlQ291bnQgKiBzZWdtZW50SGVpZ2h0KSArIChNYXRoLm1heCgwLCBwcmVDb3VudCAtIDEpICogc2VnbWVudEdhcCkgKyAyIDogMDtcbiAgICAgICAgICAgIGNvbnN0IGFkanVzdGVkID0gTWF0aC5tYXgoMCwgcHJlTXQgLSA2KTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSBhZGp1c3RlZCA/IGAke2FkanVzdGVkfXB4YCA6ICcnO1xuXG4gICAgICAgICAgICBjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmRhdGUgPT09IGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIGRheUV2ZW50cy5mb3JFYWNoKGUgPT4gY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuY3JlYXRlRXZlbnRJdGVtKGUpKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERyYWcgYW5kIERyb3AgKHJldXNlZCBvcHRpbWl6ZWQgbG9naWMgZnJvbSBtb250aCB2aWV3KVxuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRDb3VudCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCAmJiB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50ID09PSBjb250YWluZXIgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdhYm92ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0RXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdiZWxvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdjYWxlbmRhcicpIHJldHVybjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgICAgIGlmICghZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dlZENvbnRhaW5lciA9IGRyYWdnZWRFbC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCByZWN0LmhlaWdodCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldEV2ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5hZnRlcihkcmFnZ2VkRWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW9yZGVyIGxvZ2ljXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsRXZlbnRFbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld09yZGVyID0gYWxsRXZlbnRFbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCkuZmlsdGVyKEJvb2xlYW4pIGFzIHN0cmluZ1tdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRheURhdGUgPSBmdWxsRGF0ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkgZGF5RXZlbnRJbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudElkVG9JbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgICAgICAgICAgICAgbmV3T3JkZXIuZm9yRWFjaCgoZXZlbnRJZCwgaWR4KSA9PiBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRBID0gdGhpcy5ldmVudHNbYV0uaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQiA9IHRoaXMuZXZlbnRzW2JdLmlkIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBldmVudElkVG9JbmRleC5nZXQoaWRBKSA/PyA5OTk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQiA9IGV2ZW50SWRUb0luZGV4LmdldChpZEIpID8/IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZW9yZGVyZWRFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgZGF5RXZlbnRJZHggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKHRoaXMuZXZlbnRzW2RheUV2ZW50SW5kaWNlc1tkYXlFdmVudElkeF1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SWR4Kys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHJlb3JkZXJlZEV2ZW50cztcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEcm9wIG9uIGNlbGwgKG1vdmUgZnJvbSBob2xkZXIgb3Igb3RoZXIgZGF5KVxuICAgICAgICAgICAgY2VsbC5vbmRyYWdvdmVyID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjZWxsLmFkZENsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2hvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaElkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2biA9IHRoaXMuaG9sZGVyRXZlbnRzLnNwbGljZShoSWR4LCAxKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2bik7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcmMgPT09ICdjYWxlbmRhcicpIHtcbiAgICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgZnJvbSBhbm90aGVyIGRheVxuICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XG4gICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHNbaWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBtb3ZpbmcgdG8gc2FtZSBkYXkgKGFscmVhZHkgaGFuZGxlZCBieSBjb250YWluZXIub25kcm9wKVxuICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlICE9PSBmdWxsRGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBJbnRlcmFjdGlvbnNcbiAgICAgICAgICAgIGNlbGwub25jbGljayA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgJiYgdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub25tb3VzZWRvd24gPSAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoKGV2IGFzIE1vdXNlRXZlbnQpLmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub25tb3VzZW92ZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2VsbC5vbnRvdWNoc3RhcnQgPSAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydFNlbGVjdGlvbihmdWxsRGF0ZSwgY2VsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjZWxsLm9udG91Y2htb3ZlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZ3JpZEVsLmFwcGVuZENoaWxkKGZyYWdtZW50KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbmRlciBsb25nIGV2ZW50c1xuICAgICAgICAvLyBQcmVwYXJlIG92ZXJsYXkgZm9yIGxvbmcgZXZlbnRzOyBoaWRlIGl0IHVudGlsIHBvc2l0aW9ucyBhcmUgY29tcHV0ZWRcbiAgICAgICAgaWYgKCF0aGlzLl9sb25nT3ZlcmxheUVsIHx8ICF0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuaW5zZXQgPSAnMCc7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnpJbmRleCA9ICcxMCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZCh0aGlzLl9sb25nT3ZlcmxheUVsKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ1JPICYmICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5fbG9uZ1JPID0gbmV3ICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJMb25nRXZlbnRzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sb25nUk8gJiYgdGhpcy5ncmlkRWwpIHRoaXMuX2xvbmdSTy5vYnNlcnZlKHRoaXMuZ3JpZEVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlZWtseSBOb3Rlc1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZXNFbmFibGVkKSB7XG4gICAgICAgICAgICAvLyBBZGp1c3QgZ3JpZCB0byBhbGxvdyBzaHJpbmtpbmcgYW5kIGxldCBub3RlcyB0YWtlIHNwYWNlXG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5zdHlsZS5mbGV4ID0gJzAgMSBhdXRvJztcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLnN0eWxlLm1pbkhlaWdodCA9ICcwJztcblxuICAgICAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgY29uc3QgdERvdyA9IGJhc2UuZ2V0RGF5KCk7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gKCh0RG93IC0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5KSArIDcpICUgNztcbiAgICAgICAgICAgIGNvbnN0IHdlZWtTdGFydERhdGUgPSBuZXcgRGF0ZShiYXNlKTtcbiAgICAgICAgICAgIHdlZWtTdGFydERhdGUuc2V0RGF0ZShiYXNlLmdldERhdGUoKSAtIGRpZmYpO1xuICAgICAgICAgICAgY29uc3Qgd2Vla0tleSA9IHdlZWtTdGFydERhdGUudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwgPSB0aGlzLmNhbGVuZGFyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3RlcycgfSk7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUuZmxleCA9ICcwIDAgYXV0byAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4ICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmJvcmRlclRvcCA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERyYWcgSGFuZGxlXG4gICAgICAgICAgICBjb25zdCBkcmFnSGFuZGxlID0gdGhpcy53ZWVrbHlOb3Rlc0VsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS13ZWVrbHktZHJhZy1oYW5kbGUnIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VNb3ZlID0gKG1lOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcyB8fCAhdGhpcy53ZWVrbHlOb3Rlc0VsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgZHkgPSBtZS5jbGllbnRZIC0gdGhpcy53ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0WTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdIID0gTWF0aC5tYXgoMTAwLCB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRIZWlnaHQgLSBkeSk7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmhlaWdodCA9IGAke25ld0h9cHggIWltcG9ydGFudGA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMud2Vla2x5Tm90ZXNFbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0hlaWdodCA9IHRoaXMud2Vla2x5Tm90ZXNFbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkcmFnSGFuZGxlLm9ubW91c2Vkb3duID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMud2Vla2x5Tm90ZXNFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRZID0gZS5jbGllbnRZO1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCA9IHRoaXMud2Vla2x5Tm90ZXNFbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IHRoaXMud2Vla2x5Tm90ZXNFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LW5vdGVzLWhlYWRlcicgfSk7XG4gICAgICAgICAgICBoZWFkZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgIGhlYWRlci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdzcGFjZS1iZXR3ZWVuJztcbiAgICAgICAgICAgIGhlYWRlci5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgICAgICAgICBoZWFkZXIuc3R5bGUucGFkZGluZyA9ICc4cHggMTBweCAwIDEwcHgnO1xuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLmZsZXggPSAnMCAwIGF1dG8nO1xuICAgICAgICAgICAgY29uc3QgaDQgPSBoZWFkZXIuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnV2Vla2x5IG5vdGVzJyB9KTtcbiAgICAgICAgICAgIGg0LnN0eWxlLm1hcmdpbiA9ICcwJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29udGVudCBhcmVhIHdpdGggdGV4dGFyZWEgb25seVxuICAgICAgICAgICAgY29uc3QgY29udGVudENvbnRhaW5lciA9IHRoaXMud2Vla2x5Tm90ZXNFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LW5vdGVzLWNvbnRlbnQnIH0pO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5mbGV4ID0gJzAgMCBhdXRvICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5vdmVyZmxvdyA9ICd2aXNpYmxlICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5wYWRkaW5nID0gJzEwcHgnO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXggIWltcG9ydGFudCc7XG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVyLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5taW5IZWlnaHQgPSAnMCAhaW1wb3J0YW50JztcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgdGV4dFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLndlZWtseU5vdGVzW3dlZWtLZXldIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGV4dGFyZWEgZm9yIGVkaXRpbmdcbiAgICAgICAgICAgIGNvbnN0IHRleHRhcmVhRWwgPSBjb250ZW50Q29udGFpbmVyLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy10ZXh0YXJlYScgfSk7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnZhbHVlID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLndpZHRoID0gJzEwMCUgIWltcG9ydGFudCc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLnBhZGRpbmcgPSAnOHB4JztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuZm9udEZhbWlseSA9ICd2YXIoLS1mb250LW1vbm9zcGFjZSknO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5mb250U2l6ZSA9ICd2YXIoLS1mb250LXRleHQtc2l6ZSknO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHZhcigtLWRpdmlkZXItY29sb3IpJztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmJhY2tncm91bmQgPSAndmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpJztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuY29sb3IgPSAndmFyKC0tdGV4dC1ub3JtYWwpJztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUucmVzaXplID0gJ25vbmUgIWltcG9ydGFudCc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUub3ZlcmZsb3dZID0gJ2hpZGRlbic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8taGVpZ2h0IGZ1bmN0aW9uIC0gZ3Jvd3Mgd2l0aCBjb250ZW50IHVwIHRvIDUwMHB4IG1heFxuICAgICAgICAgICAgY29uc3QgdXBkYXRlVGV4dGFyZWFIZWlnaHQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5oZWlnaHQgPSBgJHt0ZXh0YXJlYUVsLnNjcm9sbEhlaWdodH1weGA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsIGhlaWdodFxuICAgICAgICAgICAgc2V0VGltZW91dCh1cGRhdGVUZXh0YXJlYUhlaWdodCwgMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBvbiBpbnB1dFxuICAgICAgICAgICAgdGV4dGFyZWFFbC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzW3dlZWtLZXldID0gdGV4dGFyZWFFbC52YWx1ZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVUZXh0YXJlYUhlaWdodCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVib3VuY2VkU2F2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0YWIga2V5XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ1RhYicpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0YXJlYSA9IGUudGFyZ2V0IGFzIEhUTUxUZXh0QXJlYUVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZCA9IHRleHRhcmVhLnNlbGVjdGlvbkVuZDtcbiAgICAgICAgICAgICAgICAgICAgdGV4dGFyZWEudmFsdWUgPSB0ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgJ1xcdCcgKyB0ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25FbmQgPSBzdGFydCArIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyTW9udGhWaWV3KHRpdGxlRWw/OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCB5ID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRNb250aCgpO1xuICAgICAgICBjb25zdCBtb250aExhYmVsID0gbmV3IERhdGUoeSwgbSkudG9Mb2NhbGVTdHJpbmcoJ2VuLVVTJywgeyBtb250aDogJ2xvbmcnLCB5ZWFyOiAnbnVtZXJpYycgfSk7XG4gICAgICAgIGlmICh0aGlzLm1vbnRoVGl0bGVFbCkgdGhpcy5tb250aFRpdGxlRWwuc2V0VGV4dChtb250aExhYmVsKTtcbiAgICAgICAgdGhpcy5ncmlkRWwuZW1wdHkoKTtcbiAgICAgICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5O1xuICAgICAgICBjb25zdCBmaXJzdERheSA9IG5ldyBEYXRlKHksIG0sIDEpLmdldERheSgpO1xuICAgICAgICBjb25zdCBkYXlzSW5Nb250aCA9IG5ldyBEYXRlKHksIG0gKyAxLCAwKS5nZXREYXRlKCk7XG4gICAgICAgIGNvbnN0IGxlYWRpbmcgPSAoZmlyc3REYXkgLSB3ZWVrU3RhcnQgKyA3KSAlIDc7XG4gICAgICAgIHRoaXMud2Vla0hlYWRlckVsLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IGhlYWRlciA9IHRoaXMud2Vla0hlYWRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ncmlkLWhlYWRlcicgfSk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBbJ3N1bicsJ21vbicsJ3R1ZScsJ3dlZCcsJ3RodScsJ2ZyaScsJ3NhdCddO1xuICAgICAgICBjb25zdCBvcmRlcmVkID0gZGF5cy5zbGljZSh3ZWVrU3RhcnQpLmNvbmNhdChkYXlzLnNsaWNlKDAsIHdlZWtTdGFydCkpO1xuICAgICAgICBvcmRlcmVkLmZvckVhY2goZCA9PiBoZWFkZXIuY3JlYXRlRGl2KHsgdGV4dDogZCwgY2xzOiAnZGF5YmxlLWdyaWQtaGVhZGVyLWNlbGwnIH0pKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEhlaWdodCA9IDI4O1xuICAgICAgICBjb25zdCBzZWdtZW50R2FwID0gNDsgLy8gZ2FwcHlcbiAgICAgICAgY29uc3QgY291bnRzQnlEYXRlOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XG4gICAgICAgIGNvbnN0IGxvbmdFdmVudHNQcmVzZXQgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUgJiYgZXYuc3RhcnREYXRlICE9PSBldi5lbmREYXRlKTtcbiAgICAgICAgbG9uZ0V2ZW50c1ByZXNldC5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoZXYuc3RhcnREYXRlISk7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlISk7XG4gICAgICAgICAgICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgMSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB5eSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3l5fS0ke21tfS0ke2RkfWA7XG4gICAgICAgICAgICAgICAgY291bnRzQnlEYXRlW2tleV0gPSAoY291bnRzQnlEYXRlW2tleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZWFkaW5nOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5IGRheWJsZS1pbmFjdGl2ZScgfSk7XG4gICAgICAgICAgICBjLnNldEF0dHIoJ2RhdGEtZW1wdHknLCAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGRheSA9IDE7IGRheSA8PSBkYXlzSW5Nb250aDsgZGF5KyspIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxEYXRlID0gYCR7eX0tJHtTdHJpbmcobSArIDEpLnBhZFN0YXJ0KDIsJzAnKX0tJHtTdHJpbmcoZGF5KS5wYWRTdGFydCgyLCcwJyl9YDtcbiAgICAgICAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5JyB9KTtcbiAgICAgICAgICAgIGNlbGwuc2V0QXR0cignZGF0YS1kYXRlJywgZnVsbERhdGUpO1xuICAgICAgICAgICAgY29uc3QgZGF5SGVhZGVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LWhlYWRlcicgfSk7XG4gICAgICAgICAgICBjb25zdCBudW0gPSBkYXlIZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheS1udW1iZXInLCB0ZXh0OiBTdHJpbmcoZGF5KSB9KTtcbiAgICAgICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgY29uc3QgaXNUb2RheSA9IGRheSA9PT0gdC5nZXREYXRlKCkgJiYgbSA9PT0gdC5nZXRNb250aCgpICYmIHkgPT09IHQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIGlmIChpc1RvZGF5KSB7XG4gICAgICAgICAgICAgICAgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWN1cnJlbnQtZGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoQnRuID0gZGF5SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1kYXktc2VhcmNoLWJ0bicgfSk7XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLmFkZENsYXNzKCdkYi1kYXktc2VhcmNoLWJ0bicpO1xuICAgICAgICAgICAgICAgIHNldEljb24oc2VhcmNoQnRuLCAnZm9jdXMnKTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub25jbGljayA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuVG9kYXlNb2RhbChmdWxsRGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub250b3VjaHN0YXJ0ID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbG9uZ0NvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctY29udGFpbmVyJyB9KTtcbiAgICAgICAgICAgIGxvbmdDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWxvbmctY29udGFpbmVyJyk7XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1jb250YWluZXInIH0pO1xuICAgICAgICAgICAgY29uc3QgcHJlQ291bnQgPSBjb3VudHNCeURhdGVbZnVsbERhdGVdIHx8IDA7XG4gICAgICAgICAgICBjb25zdCBwcmVNdCA9IHByZUNvdW50ID4gMCA/IChwcmVDb3VudCAqIHNlZ21lbnRIZWlnaHQpICsgKE1hdGgubWF4KDAsIHByZUNvdW50IC0gMSkgKiBzZWdtZW50R2FwKSArIDIgOiAwO1xuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IHByZU10ID8gYCR7cHJlTXR9cHhgIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRheUV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuZGF0ZSA9PT0gZnVsbERhdGUpO1xuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZSA9PiBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5jcmVhdGVFdmVudEl0ZW0oZSkpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWxsb3cgcmVvcmRlcmluZyBldmVudHMgd2l0aGluIHRoZSBjb250YWluZXJcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgZHJvcCBwb3NpdGlvbiBpbmRpY2F0b3Igb25seSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZXZlbnRzXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRDb3VudCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCAmJiB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50ID09PSBjb250YWluZXIgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHRoZSB2ZXJ0aWNhbCBwb3NpdGlvbiB3aXRoaW4gdGhlIHRhcmdldCBldmVudFxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBleGlzdGluZyBkcm9wIGluZGljYXRvcnNcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpbmRpY2F0b3IgYWJvdmUgb3IgYmVsb3cgYmFzZWQgb24gbW91c2UgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kcm9wLWluZGljYXRvcicgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERyb3AgYWJvdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYWJvdmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldEV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERyb3AgYmVsb3dcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGluZGljYXRvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJhZ2xlYXZlID0gKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgLy8gT25seSByZW1vdmUgaW5kaWNhdG9ycyBpZiB3ZSdyZSB0cnVseSBsZWF2aW5nIHRoZSBjb250YWluZXJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb250YWluZXIub25kcm9wID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRyb3AgaW5kaWNhdG9yXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkIHx8IHNyYyAhPT0gJ2NhbGVuZGFyJykgcmV0dXJuOyAvLyBPbmx5IHJlb3JkZXIgY2FsZW5kYXIgZXZlbnRzLCBub3QgZnJvbSBob2xkZXJcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBldmVudCBiZWluZyBkcmFnZ2VkIGJ5IElEXG4gICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dlZEVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtaWQ9XCIke2lkfVwiXWApIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyYWdnZWQgZXZlbnQgaXMgZnJvbSB0aGlzIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGNvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGFyZ2V0IGV2ZW50IHRvIGluc2VydCBiZWZvcmUvYWZ0ZXJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldEV2ZW50IHx8IHRhcmdldEV2ZW50ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluc2VydCBiZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldEV2ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgYWZ0ZXJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoZHJhZ2dlZEVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSB1bmRlcmx5aW5nIGV2ZW50cyBhcnJheSB0byBtYXRjaCB0aGUgbmV3IERPTSBvcmRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbEV2ZW50RWxzID0gQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdPcmRlciA9IGFsbEV2ZW50RWxzLm1hcChlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQpLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZWJ1aWxkIGV2ZW50cyBhcnJheSBmb3IgdGhpcyBkYXRlIHRvIG1hdGNoIG5ldyBvcmRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGRheURhdGUgPSBmdWxsRGF0ZTsgLy8gZnVsbERhdGUgZnJvbSBvdXRlciBzY29wZVxuICAgICAgICAgICAgICAgIGNvbnN0IGRheUV2ZW50SW5kaWNlczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudEluZGljZXMucHVzaChpZHgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU29ydCB0aGUgaW5kaWNlcyBiYXNlZCBvbiBuZXcgb3JkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudElkVG9JbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgICAgICAgICAgICAgbmV3T3JkZXIuZm9yRWFjaCgoZXZlbnRJZCwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50SWRUb0luZGV4LnNldChldmVudElkLCBpZHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRheUV2ZW50SW5kaWNlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQSA9IHRoaXMuZXZlbnRzW2FdLmlkIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZEIgPSB0aGlzLmV2ZW50c1tiXS5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJBID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQSkgPz8gOTk5O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckIgPSBldmVudElkVG9JbmRleC5nZXQoaWRCKSA/PyA5OTk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmRlckEgLSBvcmRlckI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVjb25zdHJ1Y3QgZXZlbnRzIGFycmF5IHdpdGggcmVvcmRlcmVkIGRheSBldmVudHNcbiAgICAgICAgICAgICAgICBjb25zdCByZW9yZGVyZWRFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgZGF5RXZlbnRJZHggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKHRoaXMuZXZlbnRzW2RheUV2ZW50SW5kaWNlc1tkYXlFdmVudElkeF1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SWR4Kys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHJlb3JkZXJlZEV2ZW50cztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSB1cGRhdGVkIG9yZGVyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2VsbC5vbmNsaWNrID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgb3BlbiBtb2RhbCBpZiBjbGlja2luZyBvbiB0aGUgY2VsbCBpdHNlbGYgb3IgY29udGFpbmVyLCBub3Qgb24gYW4gZXZlbnRcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgJiYgdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9ubW91c2Vkb3duID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKChldiBhcyBNb3VzZUV2ZW50KS5idXR0b24gIT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc3RhcnQgc2VsZWN0aW9uIGlmIGNsaWNraW5nIG9uIGFuIGV2ZW50XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzdGFydCBzZWxlY3Rpb24gaWYgYWxyZWFkeSBkcmFnZ2luZ1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9ubW91c2VvdmVyID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9udG91Y2hzdGFydCA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzdGFydCBzZWxlY3Rpb24gaWYgdG91Y2hpbmcgYW4gZXZlbnRcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBhbHJlYWR5IGRyYWdnaW5nXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNlbGwub250b3VjaG1vdmUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNlbGwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICAgICAgY2VsbC5vbmRyYWdsZWF2ZSA9ICgpID0+IHsgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICAgICAgY2VsbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdob2xkZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoSWR4ID0gdGhpcy5ob2xkZXJFdmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaElkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldm4gPSB0aGlzLmhvbGRlckV2ZW50cy5zcGxpY2UoaElkeCwgMSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZuLmRhdGUgPSBmdWxsRGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2bik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuZXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzW2lkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGFuID0gTWF0aC5mbG9vcigobmV3IERhdGUoZXYuZW5kRGF0ZSkuZ2V0VGltZSgpIC0gbmV3IERhdGUoZXYuc3RhcnREYXRlKS5nZXRUaW1lKCkpIC8gODY0MDAwMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5zdGFydERhdGUgPSBmdWxsRGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbnMgPSBuZXcgRGF0ZShmdWxsRGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lID0gbmV3IERhdGUobnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZS5zZXREYXRlKG5zLmdldERhdGUoKSArIHNwYW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5lbmREYXRlID0gYCR7bmUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobmUuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCcwJyl9LSR7U3RyaW5nKG5lLmdldERhdGUoKSkucGFkU3RhcnQoMiwnMCcpfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChldi5kYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSBmdWxsRGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRmFpbGVkIHRvIHNhdmUgZXZlbnQgY2hhbmdlcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gRGVmZXIgbG9uZyBldmVudCBwb3NpdGlvbmluZyB1bnRpbCBsYXlvdXQgc2V0dGxlc1xuICAgICAgICAvLyBQcmVwYXJlIG92ZXJsYXkgZm9yIGxvbmcgZXZlbnRzOyBoaWRlIGl0IHVudGlsIHBvc2l0aW9ucyBhcmUgY29tcHV0ZWRcbiAgICAgICAgaWYgKCF0aGlzLl9sb25nT3ZlcmxheUVsIHx8ICF0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuaW5zZXQgPSAnMCc7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnpJbmRleCA9ICcxMCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZCh0aGlzLl9sb25nT3ZlcmxheUVsKTtcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5yZW5kZXJMb25nRXZlbnRzKCkpO1xuICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xuICAgICAgICBpZiAoIXRoaXMuX2xvbmdSTyAmJiAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIC8vIE9ic2VydmUgZ3JpZCBzaXplIGNoYW5nZXMgdG8ga2VlcCBsb25nIHNwYW5zIGFsaWduZWRcbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IG5ldyAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbG9uZ1JPICYmIHRoaXMuZ3JpZEVsKSB0aGlzLl9sb25nUk8ub2JzZXJ2ZSh0aGlzLmdyaWRFbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydFNlbGVjdGlvbihkYXRlOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkge1xuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydERhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGlvblJhbmdlKCk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9lbmRTZWxPbmNlKTtcbiAgICB9XG4gICAgX2VuZFNlbE9uY2UgPSAoKSA9PiB7IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9lbmRTZWxPbmNlKTsgdGhpcy5lbmRTZWxlY3Rpb24oKTsgfTtcbiAgICB1cGRhdGVTZWxlY3Rpb24oZGF0ZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZyB8fCB0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmREYXRlID0gZGF0ZTtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpO1xuICAgIH1cbiAgICBlbmRTZWxlY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZykgcmV0dXJuO1xuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZSAmJiB0aGlzLnNlbGVjdGlvbkVuZERhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IGUgPSB0aGlzLnNlbGVjdGlvbkVuZERhdGU7XG4gICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsRm9yUmFuZ2UocywgZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgIH1cbiAgICBoaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpIHtcbiAgICAgICAgY29uc3QgcyA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlISArICdUMDA6MDA6MDAnKTtcbiAgICAgICAgY29uc3QgZSA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSEgKyAnVDAwOjAwOjAwJyk7XG4gICAgICAgIGNvbnN0IFttaW4sIG1heF0gPSBzIDw9IGUgPyBbcywgZV0gOiBbZSwgc107XG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgbGV0IHNlbGVjdGVkQ291bnQgPSAwO1xuICAgICAgICBjZWxscy5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgICAgYy5yZW1vdmVDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICBjb25zdCBkID0gYy5nZXRBdHRyKCdkYXRhLWRhdGUnKTtcbiAgICAgICAgICAgIGlmICghZCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgZHQgPSBuZXcgRGF0ZShkICsgJ1QwMDowMDowMCcpO1xuICAgICAgICAgICAgLy8gSW5jbHVkZSBib3RoIHN0YXJ0IGFuZCBlbmQgZGF0ZXMgKHVzZSA+PSBhbmQgPD0gZm9yIGluY2x1c2l2ZSByYW5nZSlcbiAgICAgICAgICAgIGlmIChkdCA+PSBtaW4gJiYgZHQgPD0gbWF4KSB7XG4gICAgICAgICAgICAgICAgYy5hZGRDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2xlYXJTZWxlY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IGMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1zZWxlY3RlZCcpKTtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydERhdGUgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5FdmVudE1vZGFsRm9yUmFuZ2Uoc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpO1xuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfVxuICAgICAgICBjYXRjaCB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEV2ZW50TW9kYWwodGhpcy5hcHAsIHVuZGVmaW5lZCwgc3RhcnQsIGVuZCwgYXN5bmMgcmVzdWx0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xuICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9LCBhc3luYyAoKSA9PiB7IGF3YWl0IFByb21pc2UucmVzb2x2ZSgpOyB9LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBpY29uID0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbC5zZXRJY29uKGljb24pO1xuICAgICAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwaWNrZXIub3BlbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkuY2F0ZWdvcmllcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkucGx1Z2luID0gdGhpcy5wbHVnaW47XG4gICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICB9XG5cbiAgICByZW5kZXJMb25nRXZlbnRzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5pbnNldCA9ICcwJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pLmZpbHRlcihlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmhhc0NsYXNzPy4oJ2RheWJsZS1kYXknKSkgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY29uc3QgdG9kYXlOdW0gPSAoZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gZWwucXVlcnlTZWxlY3RvcignLmRheWJsZS1kYXktbnVtYmVyJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIG4gPyBuLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZShuKS5tYXJnaW5Cb3R0b20gfHwgJzAnKSA6IDI0O1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZWdtZW50SGVpZ2h0ID0gMjg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRHYXAgPSA0O1xuICAgICAgICBjb25zdCBnZXRDZWxsV2lkdGggPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2VsbHMubGVuZ3RoID09PSAwKSByZXR1cm4gMTAwO1xuICAgICAgICAgICAgcmV0dXJuIChjZWxsc1swXSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGggfHwgMTAwO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgICAgY29uc3QgbG9uZ0V2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihldiA9PiBldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpO1xuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUhKTtcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3l9LSR7bX0tJHtkZH1gO1xuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHJlcXVpcmVkS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRJZHggPSBjZWxscy5maW5kSW5kZXgoYyA9PiBjLmdldEF0dHIoJ2RhdGEtZGF0ZScpID09PSBldi5zdGFydERhdGUpO1xuICAgICAgICAgICAgaWYgKHN0YXJ0SWR4ID09PSAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUhKTtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJsYXAgPSBsb25nRXZlbnRzXG4gICAgICAgICAgICAgICAgLmZpbHRlcihlID0+IGUuc3RhcnREYXRlICYmIGUuZW5kRGF0ZSAmJiBlLnN0YXJ0RGF0ZSAhPT0gZS5lbmREYXRlICYmIG5ldyBEYXRlKGUuc3RhcnREYXRlISkgPD0gc3RhcnQgJiYgbmV3IERhdGUoZS5lbmREYXRlISkgPj0gc3RhcnQpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZCA9IChuZXcgRGF0ZShhLmVuZERhdGUhKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShhLnN0YXJ0RGF0ZSEpLmdldFRpbWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJkID0gKG5ldyBEYXRlKGIuZW5kRGF0ZSEpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGIuc3RhcnREYXRlISkuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkICE9PSBiZCkgcmV0dXJuIGJkIC0gYWQ7IC8vIGxvbmdlciBmaXJzdCAob24gdG9wKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZC5sb2NhbGVDb21wYXJlKGIuaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgc3RhY2tJbmRleCA9IG92ZXJsYXAuZmluZEluZGV4KGUgPT4gZS5pZCA9PT0gZXYuaWQpO1xuICAgICAgICAgICAgY29uc3Qgc3BhbiA9IE1hdGguZmxvb3IoKGVuZC5nZXRUaW1lKCkgLSBzdGFydC5nZXRUaW1lKCkpLzg2NDAwMDAwKSArIDE7XG4gICAgICAgICAgICBjb25zdCBjZWxsc1BlclJvdyA9IDc7XG4gICAgICAgICAgICBjb25zdCBzdGFydFJvdyA9IE1hdGguZmxvb3Ioc3RhcnRJZHggLyBjZWxsc1BlclJvdyk7XG4gICAgICAgICAgICBjb25zdCBlbmRJZHggPSBzdGFydElkeCArIHNwYW4gLSAxO1xuICAgICAgICAgICAgY29uc3QgZW5kUm93ID0gTWF0aC5mbG9vcihlbmRJZHggLyBjZWxsc1BlclJvdyk7XG4gICAgICAgICAgICBjb25zdCBjZWxsV2lkdGggPSBnZXRDZWxsV2lkdGgoKTtcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2lnID0gYCR7ZXYuY2F0ZWdvcnlJZCB8fCAnJ318JHtldi5jb2xvciB8fCAnJ318JHtldi50ZXh0Q29sb3IgfHwgJyd9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGh9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXN9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5fWA7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50U2lnID0gYCR7ZXYudGl0bGUgfHwgJyd9fCR7ZXYuZGVzY3JpcHRpb24gfHwgJyd9fCR7ZXYuaWNvbiB8fCAnJ318JHtldi50aW1lIHx8ICcnfWA7XG4gICAgICAgICAgICBpZiAoc3RhcnRSb3cgPT09IGVuZFJvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbc3RhcnRJZHhdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBjZWxsc1tlbmRJZHhdO1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3QgfHwgIWxhc3QpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBmckxlZnQgPSAoZmlyc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldExlZnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJUb3AgPSAoZmlyc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFRvcDtcbiAgICAgICAgICAgICAgICBjb25zdCBsclJpZ2h0ID0gKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldExlZnQgKyAobGFzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wT2Zmc2V0ID0gdG9kYXlOdW0oZmlyc3QpICsgMTQgKyBzdGFja0luZGV4ICogKHNlZ21lbnRIZWlnaHQgKyBzZWdtZW50R2FwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gZnJMZWZ0IC0gMjtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBmclRvcCArIHRvcE9mZnNldDtcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IChsclJpZ2h0IC0gZnJMZWZ0KSArIDQ7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7ZXYuaWR9OnJvdzoke3N0YXJ0Um93fS1zaW5nbGVgO1xuICAgICAgICAgICAgICAgIHJlcXVpcmVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXNpbmdsZScpO1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHN0eWxlU2lnO1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnID0gY29udGVudFNpZztcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbCEuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaWcgPSBzdHlsZVNpZztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3NpZyA9IGNvbnRlbnRTaWc7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyAhPT0gc2lnIHx8IChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNvbnRlbnRTaWcgIT09IGNzaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc2luZ2xlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgPSBzaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnID0gY3NpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBuZXdJdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNDb25uZWN0ZWQgfHwgaXRlbS5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmdyaWRFbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbCEuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItd2lkdGgnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID8/IDJ9cHhgKTtcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmxlZnQgPSBgJHtsZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnRvcCA9IGAke3RvcH1weGA7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmhlaWdodCA9IGAke3NlZ21lbnRIZWlnaHR9cHhgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByb3cgPSBzdGFydFJvdzsgcm93IDw9IGVuZFJvdzsgcm93KyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93U3RhcnRJZHggPSByb3cgKiBjZWxsc1BlclJvdztcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93RW5kSWR4ID0gTWF0aC5taW4ocm93U3RhcnRJZHggKyBjZWxsc1BlclJvdyAtIDEsIGNlbGxzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudFN0YXJ0SW5Sb3cgPSByb3cgPT09IHN0YXJ0Um93ID8gc3RhcnRJZHggOiByb3dTdGFydElkeDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRFbmRJblJvdyA9IHJvdyA9PT0gZW5kUm93ID8gZW5kSWR4IDogcm93RW5kSWR4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRTdGFydEluUm93ID4gcm93RW5kSWR4IHx8IGV2ZW50RW5kSW5Sb3cgPCByb3dTdGFydElkeCkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbZXZlbnRTdGFydEluUm93XTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IGNlbGxzW2V2ZW50RW5kSW5Sb3ddO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZpcnN0IHx8ICFsYXN0KSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJMZWZ0ID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmclRvcCA9IChmaXJzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0VG9wO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsclJpZ2h0ID0gKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldExlZnQgKyAobGFzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvcE9mZnNldCA9IHRvZGF5TnVtKGZpcnN0KSArIDE0ICsgc3RhY2tJbmRleCAqIChzZWdtZW50SGVpZ2h0ICsgc2VnbWVudEdhcCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBmckxlZnQgLSAyO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBmclRvcCArIHRvcE9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSAobHJSaWdodCAtIGZyTGVmdCkgKyA0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtldi5pZH06cm93OiR7cm93fWA7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB0aGlzLl9sb25nRWxzLmdldChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gc3RhcnRSb3cpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXN0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09PSBlbmRSb3cpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LWVuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnN0eWxlU2lnID0gc3R5bGVTaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnID0gY29udGVudFNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwhLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpZyA9IHN0eWxlU2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3NpZyA9IGNvbnRlbnRTaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZyB8fCAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnICE9PSBjc2lnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3SXRlbSA9IHRoaXMuY3JlYXRlRXZlbnRJdGVtKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IHN0YXJ0Um93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zdGFydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IGVuZFJvdykgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnID0gY3NpZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnBhcmVudEVsZW1lbnQpIGl0ZW0ucmVwbGFjZVdpdGgobmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IG5ld0l0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNDb25uZWN0ZWQgfHwgaXRlbS5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmdyaWRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwhLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItd2lkdGgnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID8/IDJ9cHhgKTtcbiAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci1yYWRpdXMnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1cyA/PyA2fXB4YCk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnRvcCA9IGAke3RvcH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUud2lkdGggPSBgJHt3aWR0aH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuaGVpZ2h0ID0gYCR7c2VnbWVudEhlaWdodH1weGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBzdGFsZSBsb25nIGl0ZW1zXG4gICAgICAgIEFycmF5LmZyb20odGhpcy5fbG9uZ0Vscy5rZXlzKCkpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghcmVxdWlyZWRLZXlzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzLl9sb25nRWxzLmdldChrZXkpITtcbiAgICAgICAgICAgICAgICBpZiAoZWwgJiYgZWwucGFyZW50RWxlbWVudCkgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNlbGxzLmZvckVhY2goY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY2VsbC5nZXRBdHRyKCdkYXRhLWRhdGUnKSE7XG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGNvdW50c0J5RGF0ZVtkYXRlXSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gY2VsbC5xdWVyeVNlbGVjdG9yKCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYXNlTXQgPSBjb3VudCA+IDAgPyAoY291bnQgKiBzZWdtZW50SGVpZ2h0KSArIChNYXRoLm1heCgwLCBjb3VudCAtIDEpICogc2VnbWVudEdhcCkgKyAyIDogMDtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1RvZGF5Q2VsbCA9IGNlbGwuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXlibGUtY3VycmVudC1kYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtdCA9IGlzVG9kYXlDZWxsID8gTWF0aC5tYXgoMCwgYmFzZU10IC0gNCkgOiBiYXNlTXQ7IC8vIGdhcHB5XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IG10ID8gYCR7bXR9cHhgIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNyZWF0ZUV2ZW50SXRlbShldjogRGF5YmxlRXZlbnQpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgaXRlbS5jbGFzc05hbWUgPSAnZGF5YmxlLWV2ZW50JztcbiAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgIGl0ZW0uZGF0YXNldC5pZCA9IGV2LmlkO1xuICAgICAgICBpdGVtLmRhdGFzZXQuY2F0ZWdvcnlJZCA9IGV2LmNhdGVnb3J5SWQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB0aXRsZS9kZXNjcmlwdGlvbiBhbGlnbm1lbnRcbiAgICAgICAgY29uc3QgdGl0bGVBbGlnbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiB8fCAnbGVmdCc7XG4gICAgICAgIGNvbnN0IGRlc2NBbGlnbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50RGVzY0FsaWduIHx8ICdsZWZ0JztcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLXRpdGxlLWFsaWduLSR7dGl0bGVBbGlnbn1gKTtcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWRlc2MtYWxpZ24tJHtkZXNjQWxpZ259YCk7XG4gICAgICAgIGlmICh0aXRsZUFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxheW91dC1jZW50ZXItZmxleCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggY29sb3JzIHRvIHVzZTogdXNlci1zZXQgb3IgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXM/LmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcbiAgICAgICAgY29uc3QgaXNEZWZhdWx0Q2F0ZWdvcnkgPSAhZXYuY2F0ZWdvcnlJZCB8fCBldi5jYXRlZ29yeUlkID09PSAnZGVmYXVsdCc7XG4gICAgICAgIFxuICAgICAgICBsZXQgYmdDb2xvciA9ICcnO1xuICAgICAgICBsZXQgdGV4dENvbG9yID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xvciBzZWxlY3Rpb24gbG9naWMgKHVzZXItc2V0IGNvbG9yIGFsd2F5cyBwcmVmZXJyZWQpXG4gICAgICAgIGlmIChldi5jb2xvcikge1xuICAgICAgICAgICAgYmdDb2xvciA9IGV2LmNvbG9yO1xuICAgICAgICAgICAgdGV4dENvbG9yID0gZXYudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihldi5jb2xvcik7XG4gICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb2xvciA9IGV2LmNvbG9yO1xuICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcbiAgICAgICAgICAgIGJnQ29sb3IgPSBjYXRlZ29yeS5iZ0NvbG9yO1xuICAgICAgICAgICAgdGV4dENvbG9yID0gY2F0ZWdvcnkudGV4dENvbG9yO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBzdHlsaW5nIGlmIHdlIGhhdmUgY29sb3JzXG4gICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xuICAgICAgICAgICAgLy8gQ29udmVydCBoZXggY29sb3IgdG8gcmdiYSB3aXRoIG9wYWNpdHlcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxO1xuICAgICAgICAgICAgY29uc3QgcmdiYUNvbG9yID0gaGV4VG9SZ2JhKGJnQ29sb3IsIG9wYWNpdHkpO1xuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1iZy1jb2xvcicsIHJnYmFDb2xvcik7XG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LXRleHQtY29sb3InLCB0ZXh0Q29sb3IpO1xuICAgICAgICAgICAgY29uc3QgYk9wYWNpdHkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlck9wYWNpdHkgPz8gMTtcbiAgICAgICAgICAgIGNvbnN0IGJvcmRlckNvbG9yID0gaGV4VG9SZ2JhKHRleHRDb2xvciwgYk9wYWNpdHkpO1xuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItY29sb3InLCBib3JkZXJDb2xvcik7XG4gICAgICAgICAgICBpdGVtLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1jb2xvcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGJvcmRlciB3aWR0aCBzZXR0aW5nc1xuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci1yYWRpdXMnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1cyA/PyA2fXB4YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBlZmZlY3QgYW5kIGFuaW1hdGlvbiBmcm9tIGNhdGVnb3J5IChhbHdheXMsIHJlZ2FyZGxlc3Mgb2YgY29sb3IgY2hvaWNlKVxuICAgICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmIChjYXRlZ29yeS5lZmZlY3QgJiYgY2F0ZWdvcnkuZWZmZWN0ICE9PSAnJykgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWVmZmVjdC0ke2NhdGVnb3J5LmVmZmVjdH1gKTtcbiAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5RXZlbnQgPSB0aGlzLmlzRXZlbnRUb2RheShldik7XG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uICYmIGNhdGVnb3J5LmFuaW1hdGlvbiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgaXNUb2RheUV2ZW50KSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbjIgJiYgY2F0ZWdvcnkuYW5pbWF0aW9uMiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgaXNUb2RheUV2ZW50KSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9uMn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGUgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC10aXRsZScgfSk7XG4gICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZSwgdGhpcy5wbHVnaW4uYXBwKTtcbiAgICAgICAgY29uc3QgdEZtdCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPz8gJzI0aCc7XG4gICAgICAgIGNvbnN0IHRpbWVEaXNwbGF5ID0gZm9ybWF0VGltZVJhbmdlKGV2LnRpbWUsIHRGbXQpO1xuICAgICAgICBpZiAodGltZURpc3BsYXkpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdGltZVNwYW4udGV4dENvbnRlbnQgPSBgICgke3RpbWVEaXNwbGF5fSlgO1xuICAgICAgICAgICAgdGl0bGUuYXBwZW5kQ2hpbGQodGltZVNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGljb25Ub1VzZSA9IGV2Lmljb24gfHwgKGNhdGVnb3J5Py5pY29uIHx8ICcnKTtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgIT09ICdub25lJyAmJiBpY29uVG9Vc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGljb25FbCA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWljb24nIH0pO1xuICAgICAgICAgICAgc2V0SWNvbihpY29uRWwsIGljb25Ub1VzZSk7XG4gICAgICAgICAgICBjb25zdCBwbGFjZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPz8gJ2xlZnQnO1xuICAgICAgICAgICAgaWYgKHBsYWNlID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmluc2VydEJlZm9yZShpY29uRWwsIHRpdGxlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxhY2UgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFwcGVuZENoaWxkKGljb25FbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYWNlID09PSAndG9wJyB8fCBwbGFjZSA9PT0gJ3RvcC1sZWZ0JyB8fCBwbGFjZSA9PT0gJ3RvcC1yaWdodCcpIHtcbiAgICAgICAgICAgICAgICBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcCcpO1xuICAgICAgICAgICAgICAgIGlmIChwbGFjZSA9PT0gJ3RvcC1sZWZ0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtbGVmdCcpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHBsYWNlID09PSAndG9wLXJpZ2h0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtcmlnaHQnKTtcbiAgICAgICAgICAgICAgICBlbHNlIGljb25FbC5hZGRDbGFzcygnZGF5YmxlLWljb24tdG9wLWNlbnRlcicpO1xuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGljb25FbCwgaXRlbS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZXYuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1kZXNjJyB9KTtcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uIGluaGVyaXRzIHRleHQgY29sb3JcbiAgICAgICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xuICAgICAgICAgICAgICAgIGRlc2Muc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZW5kZXJNYXJrZG93bihldi5kZXNjcmlwdGlvbiwgZGVzYywgdGhpcy5wbHVnaW4uYXBwKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDb21wbGV0ZWQgYmVoYXZpb3JcbiAgICAgICAgaWYgKGV2LmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgY29uc3QgYmVoYXZpb3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJztcbiAgICAgICAgICAgIGlmIChiZWhhdmlvciA9PT0gJ2RpbScpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1ldmVudC1kaW0nKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnc3RyaWtldGhyb3VnaCcpIHRpdGxlLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XG4gICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ2hpZGUnKSBpdGVtLmFkZENsYXNzKCdkYXlibGUtZXZlbnQtaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSAoZXZ0LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnYScpIGFzIEhUTUxBbmNob3JFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgIGlmICghYSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcbiAgICAgICAgICAgIGlmICh3aWtpKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5wbHVnaW4uYXBwLCB3aWtpKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAobGVhZiBhcyBhbnkpLm9wZW5GaWxlPy4oZmlsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICAgIGl0ZW0ub25kcmFnc3RhcnQgPSBlID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIERyYWcgc3RhcnRlZCBvbiBldmVudDonLCBldi5pZCk7XG4gICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XG4gICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIgYXMgRGF0YVRyYW5zZmVyKT8uc2V0RGF0YSgnZGF5YmxlLXNvdXJjZScsJ2NhbGVuZGFyJyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSBpdGVtLmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5sZWZ0ID0gJy0xMDAwMHB4JztcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaGFkb3cgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGl0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudHJhbnNmb3JtID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShpdGVtKS5ib3JkZXJSYWRpdXM7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcbiAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSBkcmFnSW1nO1xuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XG4gICAgICAgIH07XG4gICAgICAgIGl0ZW0ub25kcmFnZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgaXRlbS5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBjb25zdCBkaSA9IChpdGVtIGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKGRpICYmIGRpLnBhcmVudEVsZW1lbnQpIGRpLnJlbW92ZSgpO1xuICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCk7IH07XG4gICAgICAgIGl0ZW0ub25jb250ZXh0bWVudSA9IChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEdXBsaWNhdGUnKS5zZXRJY29uKCdjb3B5Jykub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3RXY6IERheWJsZUV2ZW50ID0geyAuLi5ldiwgaWQ6IHJhbmRvbUlkKCkgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKG5ld0V2KTtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgbWVudS5hZGRJdGVtKGkgPT4gaS5zZXRUaXRsZShldi5jb21wbGV0ZWQgPyAnTWFyayBpbmNvbXBsZXRlJyA6ICdNYXJrIGNvbXBsZXRlJykuc2V0SWNvbignY2hlY2snKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICBldi5jb21wbGV0ZWQgPSAhZXYuY29tcGxldGVkO1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy5yZW5kZXIoKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEZWxldGUnKS5zZXRJY29uKCd0cmFzaCcpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUyID0+IGUyLmlkICE9PSBldi5pZCk7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIG1lbnUuc2hvd0F0TW91c2VFdmVudChlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc0V2ZW50VG9kYXkoZXY6IERheWJsZUV2ZW50KTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB5eXl5ID0gdC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyh0LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBkZCA9IFN0cmluZyh0LmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgdG9kYXlTdHIgPSBgJHt5eXl5fS0ke21tfS0ke2RkfWA7XG4gICAgICAgIGlmIChldi5kYXRlKSByZXR1cm4gZXYuZGF0ZSA9PT0gdG9kYXlTdHI7XG4gICAgICAgIGlmIChldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGV2LnN0YXJ0RGF0ZSA8PSB0b2RheVN0ciAmJiBldi5lbmREYXRlID49IHRvZGF5U3RyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldi5zdGFydERhdGUgJiYgIWV2LmVuZERhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBldi5zdGFydERhdGUgPT09IHRvZGF5U3RyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZW5kZXJIb2xkZXIoKSB7XG4gICAgICAgIGNvbnN0IGxpc3QgPSB0aGlzLmhvbGRlckVsPy5xdWVyeVNlbGVjdG9yKCcuZGF5YmxlLWhvbGRlci1saXN0JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICBpZiAoIWxpc3QpIHJldHVybjtcbiAgICAgICAgbGlzdC5lbXB0eSgpO1xuICAgICAgICB0aGlzLmhvbGRlckV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICBpdGVtLmRhdGFzZXQuc291cmNlID0gJ2hvbGRlcic7XG4gICAgICAgICAgICBpdGVtLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xuICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlciBhcyBEYXRhVHJhbnNmZXIpPy5zZXREYXRhKCdkYXlibGUtc291cmNlJywnaG9sZGVyJyk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGl0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUud2lkdGggPSBgJHtyZWN0LndpZHRofXB4YDtcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudHJhbnNmb3JtID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUoaXRlbSkuYm9yZGVyUmFkaXVzO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaXRlbS5vbmRyYWdlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaXRlbS5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGkgPSAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyBhcyBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbGlzdC5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEVuYWJsZSByZW9yZGVyaW5nIGluc2lkZSBob2xkZXIgbGlzdCB3aXRoIGRyb3AgaW5kaWNhdG9yc1xuICAgICAgICBsaXN0Lm9uZHJhZ292ZXIgPSAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRhcmdldEV2ZW50ICYmIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQgPT09IGxpc3QgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2RheWJsZS1kcm9wLWluZGljYXRvcic7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGxpc3Qub25kcmFnbGVhdmUgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBsaXN0KSBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgfTtcbiAgICAgICAgbGlzdC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xuICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdob2xkZXInKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ob2xkZXItbGlzdCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgIGlmIChkcmFnZ2VkQ29udGFpbmVyICE9PSBsaXN0KSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoIXRhcmdldEV2ZW50KSB7IFxuICAgICAgICAgICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQoZHJhZ2dlZEVsKTsgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRFdmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHsgbGlzdC5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7IH1cbiAgICAgICAgICAgICAgICBlbHNlIHsgdGFyZ2V0RXZlbnQuYWZ0ZXIoZHJhZ2dlZEVsKTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGVyc2lzdCBuZXcgaG9sZGVyIG9yZGVyXG4gICAgICAgICAgICBjb25zdCByZW9yZGVyZWQ6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVpZCA9IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCE7XG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0aGlzLmhvbGRlckV2ZW50cy5maW5kKGV2ID0+IGV2LmlkID09PSBlaWQpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgcmVvcmRlcmVkLnB1c2goZm91bmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IHJlb3JkZXJlZDtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYyBvcGVuRXZlbnRNb2RhbChpZD86IHN0cmluZywgZGF0ZT86IHN0cmluZywgZW5kRGF0ZT86IHN0cmluZykge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCk7XG4gICAgICAgIGlmICghZm9sZGVyKSB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XG4gICAgICAgIGNhdGNoIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBpZCA/ICh0aGlzLmV2ZW50cy5maW5kKGUgPT4gZS5pZCA9PT0gaWQpID8/IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBpZCkpIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBmcm9tSG9sZGVyID0gISEoZXhpc3RpbmcgJiYgdGhpcy5ob2xkZXJFdmVudHMuc29tZShlID0+IGUuaWQgPT09IGV4aXN0aW5nLmlkKSk7XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEV2ZW50TW9kYWwodGhpcy5hcHAsIGV4aXN0aW5nLCBkYXRlLCBlbmREYXRlLCBhc3luYyByZXN1bHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNNdWx0aSA9ICEhKHJlc3VsdC5zdGFydERhdGUgJiYgcmVzdWx0LmVuZERhdGUpO1xuICAgICAgICAgICAgY29uc3QgaXNTaW5nbGUgPSAhIXJlc3VsdC5kYXRlIHx8ICghIXJlc3VsdC5zdGFydERhdGUgJiYgIXJlc3VsdC5lbmREYXRlKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xuICAgICAgICAgICAgICAgIGlmIChpc011bHRpIHx8IGlzU2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIFNhdmUgZmFpbGVkOicsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VG9kYXlNb2RhbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRvZGF5TW9kYWwuZXZlbnRzID0gdGhpcy5ldmVudHM7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbC5vbk9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZyb21Ib2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSB0aGlzLmhvbGRlckV2ZW50cy5maWx0ZXIoZSA9PiBlLmlkICE9PSBleGlzdGluZy5pZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmlkICE9PSBleGlzdGluZy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBpY29uID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLmljb24gPSBpY29uO1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oaWNvbik7XG4gICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGljb24gaGFuZGxlclxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcuaWNvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBtb2RhbC5zZXRJY29uKCcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGlja2VyLm9wZW4oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLmNhdGVnb3JpZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLnBsdWdpbiA9IHRoaXMucGx1Z2luO1xuICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgfVxuXG4gICAgb3BlblRvZGF5TW9kYWwoZGF0ZTogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFRvZGF5TW9kYWwodGhpcy5hcHAsIGRhdGUsIHRoaXMuZXZlbnRzLCB0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbCA9IG1vZGFsO1xuICAgICAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4geyB0aGlzLmN1cnJlbnRUb2RheU1vZGFsID0gdW5kZWZpbmVkOyB9O1xuICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgfVxufVxuXG5jbGFzcyBFdmVudE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIGV2PzogRGF5YmxlRXZlbnQ7XG4gICAgZGF0ZT86IHN0cmluZztcbiAgICBlbmREYXRlPzogc3RyaW5nO1xuICAgIG9uU3VibWl0OiAoZXY6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+KSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIG9uRGVsZXRlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIG9uUGlja0ljb246ICgpID0+IFByb21pc2U8dm9pZD47XG4gICAgaWNvbj86IHN0cmluZztcbiAgICBpY29uQnRuRWw/OiBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICBzZWxlY3RlZENvbG9yPzogc3RyaW5nO1xuICAgIHNlbGVjdGVkVGV4dENvbG9yPzogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGV2OiBEYXlibGVFdmVudCB8IHVuZGVmaW5lZCwgZGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBlbmREYXRlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9uU3VibWl0OiAoZXY6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+KSA9PiBQcm9taXNlPHZvaWQ+LCBvbkRlbGV0ZTogKCkgPT4gUHJvbWlzZTx2b2lkPiwgb25QaWNrSWNvbjogKCkgPT4gUHJvbWlzZTx2b2lkPikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLmV2ID0gZXY7XG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuZW5kRGF0ZSA9IGVuZERhdGU7XG4gICAgICAgIHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDtcbiAgICAgICAgdGhpcy5vbkRlbGV0ZSA9IG9uRGVsZXRlO1xuICAgICAgICB0aGlzLm9uUGlja0ljb24gPSBvblBpY2tJY29uO1xuICAgICAgICB0aGlzLmljb24gPSBldj8uaWNvbjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gZXY/LmNvbG9yO1xuICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gZXY/LnRleHRDb2xvcjtcbiAgICB9XG5cbiAgICBzZXRJY29uKGljb246IHN0cmluZykgeyB0aGlzLmljb24gPSBpY29uOyBpZiAodGhpcy5pY29uQnRuRWwpIHNldEljb24odGhpcy5pY29uQnRuRWwsIGljb24gfHwgJ3BsdXMnKTsgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgaGVhZGluZyA9IGMuY3JlYXRlRWwoJ2gzJywgeyBjbHM6ICdkYXlibGUtbW9kYWwtdGl0bGUnIH0pO1xuICAgICAgICBjLmFkZENsYXNzKCdkYi1tb2RhbCcpO1xuICAgICAgICBoZWFkaW5nLmFkZENsYXNzKCdkYi1tb2RhbC10aXRsZScpO1xuICAgICAgICBoZWFkaW5nLnRleHRDb250ZW50ID0gdGhpcy5ldiA/ICdFZGl0IEV2ZW50JyA6ICdBZGQgTmV3IEV2ZW50JztcbiAgICAgICAgY29uc3Qgcm93MSA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgIHJvdzEuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBjb25zdCBpY29uQnRuID0gcm93MS5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1pY29uLWFkZCcgfSk7XG4gICAgICAgIGljb25CdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xuICAgICAgICBzZXRJY29uKGljb25CdG4sIHRoaXMuaWNvbiA/PyAncGx1cycpO1xuICAgICAgICBpY29uQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLm9uUGlja0ljb24oKTtcbiAgICAgICAgdGhpcy5pY29uQnRuRWwgPSBpY29uQnRuO1xuICAgICAgICBjb25zdCB0aXRsZUlucHV0ID0gcm93MS5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0ZXh0JywgY2xzOiAnZGF5YmxlLWlucHV0JywgYXR0cjogeyBwbGFjZWhvbGRlcjogJ0V2ZW50IHRpdGxlJywgYXV0b2ZvY3VzOiAndHJ1ZScgfSB9KTtcbiAgICAgICAgdGl0bGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgdGl0bGVJbnB1dC52YWx1ZSA9IHRoaXMuZXY/LnRpdGxlID8/ICcnO1xuICAgICAgICBjb25zdCBmb2N1c1RpdGxlID0gKCkgPT4geyB0cnkgeyB0aXRsZUlucHV0LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTsgfSBjYXRjaCB7fSB9O1xuICAgICAgICBmb2N1c1RpdGxlKCk7XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmb2N1c1RpdGxlKTtcbiAgICAgICAgc2V0VGltZW91dChmb2N1c1RpdGxlLCAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtbbGlua11dIHN1Z2dlc3Rpb25zIHNoYXJlZCBmb3IgdGl0bGUgYW5kIGRlc2NyaXB0aW9uXG4gICAgICAgIGxldCBzdWdnZXN0aW9uQ29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgICBsZXQgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwO1xuICAgICAgICBsZXQgc3VnZ2VzdGlvblRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICAgICAgY29uc3QgY2xvc2VTdWdnZXN0aW9ucyA9ICgpID0+IHsgaWYgKHN1Z2dlc3Rpb25Db250YWluZXIpIHsgc3VnZ2VzdGlvbkNvbnRhaW5lci5yZW1vdmUoKTsgc3VnZ2VzdGlvbkNvbnRhaW5lciA9IG51bGw7IH0gc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwOyBzdWdnZXN0aW9uVGFyZ2V0ID0gbnVsbDsgfTtcbiAgICAgICAgY29uc3Qgc2hvd1N1Z2dlc3Rpb25zRm9yID0gKHRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChzdWdnZXN0aW9uQ29udGFpbmVyKSBzdWdnZXN0aW9uQ29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gdGFyZ2V0LnZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB2YWwubWF0Y2goL1xcW1xcWyhbXlxcW1xcXV0qPykkLyk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBxdWVyeSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChmOiBhbnkpID0+IGYubmFtZSAmJiBmLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgJiYgIWYubmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICAgICAgLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25UYXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgICAgICBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdkYXlibGUtbGluay1zdWdnZXN0aW9ucyc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQgPSAnMTgwcHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnpJbmRleCA9ICcxMDAwMCc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm1pbldpZHRoID0gJzIwMHB4JztcbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGU6IGFueSwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIGl0ZW0udGV4dENvbnRlbnQgPSBmaWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5wYWRkaW5nID0gJzhweCc7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3JkZXJCb3R0b20gPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHsgaXRlbS5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpOyBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0KSc7IH1cbiAgICAgICAgICAgICAgICBpdGVtLm9ubW91c2VlbnRlciA9ICgpID0+IHsgaXRlbS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5LWFsdCknOyB9O1xuICAgICAgICAgICAgICAgIGl0ZW0ub25tb3VzZWxlYXZlID0gKCkgPT4geyBpZiAoIWl0ZW0uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1zZWxlY3RlZCcpKSBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd0cmFuc3BhcmVudCc7IH07XG4gICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmVNYXRjaCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGFzdEluZGV4T2YoJ1tbJykpO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudmFsdWUgPSBiZWZvcmVNYXRjaCArICdbWycgKyBmaWxlLm5hbWUgKyAnXV0nO1xuICAgICAgICAgICAgICAgICAgICBjbG9zZVN1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyIS5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdWdnZXN0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmxlZnQgPSBNYXRoLnJvdW5kKHJlY3QubGVmdCkgKyAncHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS50b3AgPSBNYXRoLnJvdW5kKHJlY3QudG9wICsgcmVjdC5oZWlnaHQpICsgJ3B4JztcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbW92ZVN1Z2dlc3Rpb25TZWxlY3Rpb24gPSAoZGlyOiAxIHwgLTEpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN1Z2dlc3Rpb25Db250YWluZXIuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGkgPT4geyBpLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXNlbGVjdGVkJyk7IGkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3RyYW5zcGFyZW50JzsgfSk7XG4gICAgICAgICAgICBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KDAsIE1hdGgubWluKGl0ZW1zLmxlbmd0aCAtIDEsIHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ICsgZGlyKSk7XG4gICAgICAgICAgICBjb25zdCBzZWwgPSBpdGVtc1tzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleF07XG4gICAgICAgICAgICBpZiAoc2VsKSB7IHNlbC5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpOyBzZWwuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJzsgfVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lciB8fCAhc3VnZ2VzdGlvblRhcmdldCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN1Z2dlc3Rpb25Db250YWluZXIuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgICAgICBjb25zdCBzZWwgPSBpdGVtc1tzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNlbCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IHNlbC50ZXh0Q29udGVudCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzdWdnZXN0aW9uVGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgYmVmb3JlTWF0Y2ggPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxhc3RJbmRleE9mKCdbWycpKTtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25UYXJnZXQudmFsdWUgPSBiZWZvcmVNYXRjaCArICdbWycgKyBuYW1lICsgJ11dJztcbiAgICAgICAgICAgIGNsb3NlU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN1Z2dlc3Rpb25Db250YWluZXIpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93RG93bicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbigxKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdBcnJvd1VwJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IG1vdmVTdWdnZXN0aW9uU2VsZWN0aW9uKC0xKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbigpOyB9XG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjbG9zZVN1Z2dlc3Rpb25zKCk7IH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgICB0aXRsZUlucHV0Lm9uaW5wdXQgPSAoKSA9PiB7IHNob3dTdWdnZXN0aW9uc0Zvcih0aXRsZUlucHV0KTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBjb2xvciBzd2F0Y2ggcm93ICh3aWxsIGJlIHBvc2l0aW9uZWQgYmFzZWQgb24gc2V0dGluZylcbiAgICAgICAgY29uc3QgY3JlYXRlQ29sb3JSb3cgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2xvclJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdyBkYXlibGUtY29sb3Itc3dhdGNoZXMtcm93JyB9KTtcbiAgICAgICAgICAgIGNvbG9yUm93LmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3dhdGNoZXNDb250YWluZXIgPSBjb2xvclJvdy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoZXMnIH0pO1xuICAgICAgICAgICAgc3dhdGNoZXNDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWNvbG9yLXN3YXRjaGVzJyk7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0U3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCBkYXlibGUtY29sb3Itc3dhdGNoLW5vbmUnIH0pO1xuICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoJyk7XG4gICAgICAgICAgICBkZWZhdWx0U3dhdGNoLnRpdGxlID0gJ05vbmUgKGRlZmF1bHQpJztcbiAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2gub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFRleHRDb2xvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWNvbG9yLXN3YXRjaCcpLmZvckVhY2gocyA9PiBzLnJlbW92ZUNsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJykpO1xuICAgICAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2guYWRkQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0ZWRDb2xvcikgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9ICh0aGlzIGFzIGFueSkucGx1Z2luPy5zZXR0aW5ncztcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0U3dhdGNoZXMgPSAoc2V0dGluZ3M/LnN3YXRjaGVzID8/IFtdKS5tYXAoKHM6IGFueSkgPT4gKHsgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgY29uc3QgY3VzdG9tU3dhdGNoZXMgPSAoc2V0dGluZ3M/LnVzZXJDdXN0b21Td2F0Y2hlcyA/PyBbXSkubWFwKChzOiBhbnkpID0+ICh7IGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgIGxldCBzd2F0Y2hlczogQXJyYXk8eyBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4gPSBidWlsdFN3YXRjaGVzO1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzPy5jdXN0b21Td2F0Y2hlc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBzd2F0Y2hlcyA9IGJ1aWx0U3dhdGNoZXMuY29uY2F0KGN1c3RvbVN3YXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3dhdGNoZXMgfHwgc3dhdGNoZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgc3dhdGNoZXMgPSBbJyNlYjNiNWEnLCAnI2ZhODIzMScsICcjZTVhMjE2JywgJyMyMGJmNmInLCAnIzBmYjliMScsICcjMmQ5OGRhJywgJyMzODY3ZDYnLCAnIzU0NTRkMCcsICcjODg1NGQwJywgJyNiNTU0ZDAnLCAnI2U4MzJjMScsICcjZTgzMjg5JywgJyM5NjViM2InLCAnIzgzOTJhNCddLm1hcChjID0+ICh7IGNvbG9yOiBjIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3YXRjaGVzLmZvckVhY2goKHsgY29sb3IsIHRleHRDb2xvciB9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCcgfSk7XG4gICAgICAgICAgICAgICAgc3dhdGNoLmFkZENsYXNzKCdkYi1jb2xvci1zd2F0Y2gnKTtcbiAgICAgICAgICAgICAgICBzd2F0Y2guc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLnN0eWxlLmJvcmRlckNvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLnRpdGxlID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvciA9IGNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gdGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihjb2xvcik7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtY29sb3Itc3dhdGNoJykuZm9yRWFjaChzID0+IHMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKSk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRDb2xvciA9PT0gY29sb3IpIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY29sb3JSb3c7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29sb3Igc3dhdGNoZXMgdW5kZXIgdGl0bGUgaWYgc2V0dGluZyBzYXlzIHNvXG4gICAgICAgIGxldCBjb2xvclJvdzogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGNvbG9yU3dhdGNoUG9zID0gKHRoaXMgYXMgYW55KS5wbHVnaW4/LnNldHRpbmdzPy5jb2xvclN3YXRjaFBvc2l0aW9uID8/ICd1bmRlci10aXRsZSc7XG4gICAgICAgIGlmIChjb2xvclN3YXRjaFBvcyA9PT0gJ3VuZGVyLXRpdGxlJykge1xuICAgICAgICAgICAgY29sb3JSb3cgPSBjcmVhdGVDb2xvclJvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93IGRheWJsZS1tb2RhbC1yb3ctY2VudGVyJyB9KTtcbiAgICAgICAgcnVsZVJvdy5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5TGFiZWwgPSBydWxlUm93LmNyZWF0ZUVsKCdsYWJlbCcsIHsgdGV4dDogJ0NhdGVnb3J5OicgfSk7XG4gICAgICAgIGNhdGVnb3J5TGFiZWwuYWRkQ2xhc3MoJ2RiLWxhYmVsJyk7XG4gICAgICAgIGNhdGVnb3J5TGFiZWwuc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgIGxldCBzZWxlY3RlZENhdGVnb3J5SWQgPSB0aGlzLmV2Py5jYXRlZ29yeUlkO1xuICAgICAgICBjb25zdCBjYXRlZ29yeVNlbGVjdCA9IHJ1bGVSb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnZGF5YmxlLWlucHV0IGRheWJsZS1jYXRlZ29yeS1zZWxlY3QnIH0pO1xuICAgICAgICBjYXRlZ29yeVNlbGVjdC5hZGRDbGFzcygnZGItc2VsZWN0Jyk7XG4gICAgICAgIGNvbnN0IGVtcHR5T3B0ID0gY2F0ZWdvcnlTZWxlY3QuY3JlYXRlRWwoJ29wdGlvbicpOyBlbXB0eU9wdC52YWx1ZT0nJzsgZW1wdHlPcHQudGV4dD0nRGVmYXVsdCc7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSAodGhpcyBhcyBhbnkpLmNhdGVnb3JpZXMgfHwgW107XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaCgoYzogRXZlbnRDYXRlZ29yeSkgPT4geyBjb25zdCBvcHQgPSBjYXRlZ29yeVNlbGVjdC5jcmVhdGVFbCgnb3B0aW9uJyk7IG9wdC52YWx1ZSA9IGMuaWQ7IG9wdC50ZXh0ID0gYy5uYW1lOyB9KTtcbiAgICAgICAgY2F0ZWdvcnlTZWxlY3QudmFsdWUgPSBzZWxlY3RlZENhdGVnb3J5SWQgPz8gJyc7XG4gICAgICAgIFxuICAgICAgICBjYXRlZ29yeVNlbGVjdC5vbmNoYW5nZSA9ICgpID0+IHsgXG4gICAgICAgICAgICBzZWxlY3RlZENhdGVnb3J5SWQgPSBjYXRlZ29yeVNlbGVjdC52YWx1ZSB8fCB1bmRlZmluZWQ7IFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBtdWx0aS1kYXkgZXZlbnRcbiAgICAgICAgY29uc3QgaXNNdWx0aURheSA9IHRoaXMuZW5kRGF0ZSAmJiB0aGlzLmVuZERhdGUgIT09IHRoaXMuZGF0ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXJ0IHRpbWUvZGF0ZSByb3dcbiAgICAgICAgY29uc3Qgcm93MiA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgIHJvdzIuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSByb3cyLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RpbWUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xuICAgICAgICBzdGFydFRpbWUuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XG4gICAgICAgIHN0YXJ0VGltZS52YWx1ZSA9IHRoaXMuZXY/LnRpbWU/LnNwbGl0KCctJylbMF0gPz8gJyc7XG4gICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IHJvdzIuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnZGF0ZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XG4gICAgICAgIHN0YXJ0RGF0ZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgc3RhcnREYXRlLnZhbHVlID0gdGhpcy5ldj8uZGF0ZSA/PyB0aGlzLmV2Py5zdGFydERhdGUgPz8gdGhpcy5kYXRlID8/ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5kIHRpbWUvZGF0ZSByb3cgKG9ubHkgZm9yIG11bHRpLWRheSBldmVudHMpXG4gICAgICAgIGxldCBlbmRUaW1lOiBIVE1MSW5wdXRFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgZW5kRGF0ZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoaXNNdWx0aURheSkge1xuICAgICAgICAgICAgY29uc3Qgcm93MyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgICAgICByb3czLmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcbiAgICAgICAgICAgIGVuZFRpbWUgPSByb3czLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RpbWUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xuICAgICAgICAgICAgZW5kVGltZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgICAgIGVuZFRpbWUudmFsdWUgPSB0aGlzLmV2Py50aW1lPy5zcGxpdCgnLScpWzFdID8/ICcnO1xuICAgICAgICAgICAgZW5kRGF0ZUlucHV0ID0gcm93My5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdkYXRlJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dC52YWx1ZSA9IHRoaXMuZW5kRGF0ZSA/PyAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZGVzY0lucHV0ID0gYy5jcmVhdGVFbCgndGV4dGFyZWEnLCB7IGNsczogJ2RheWJsZS10ZXh0YXJlYScsIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdEZXNjcmlwdGlvbicgfSB9KTtcbiAgICAgICAgZGVzY0lucHV0LmFkZENsYXNzKCdkYi10ZXh0YXJlYScpO1xuICAgICAgICBkZXNjSW5wdXQudmFsdWUgPSB0aGlzLmV2Py5kZXNjcmlwdGlvbiA/PyAnJztcbiAgICAgICAgXG4gICAgICAgIGRlc2NJbnB1dC5vbmlucHV0ID0gKCkgPT4geyBzaG93U3VnZ2VzdGlvbnNGb3IoZGVzY0lucHV0KTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2xvciBzd2F0Y2hlcyB1bmRlciBkZXNjcmlwdGlvbiBpZiBzZXR0aW5nIHNheXMgc29cbiAgICAgICAgaWYgKGNvbG9yU3dhdGNoUG9zID09PSAndW5kZXItZGVzY3JpcHRpb24nKSB7XG4gICAgICAgICAgICBjb2xvclJvdyA9IGNyZWF0ZUNvbG9yUm93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLWZvb3RlcicgfSk7XG4gICAgICAgIGZvb3Rlci5hZGRDbGFzcygnZGItbW9kYWwtZm9vdGVyJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIG9uIGxlZnQgKG9ubHkgZm9yIGV4aXN0aW5nIGV2ZW50cylcbiAgICAgICAgICAgIGlmICh0aGlzLmV2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsID0gZm9vdGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLWRlbGV0ZScgfSk7XG4gICAgICAgICAgICAgICAgZGVsLmFkZENsYXNzKCdkYi1idG4nKTtcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3RyYXNoLTInKTtcbiAgICAgICAgICAgICAgICBkZWwub25jbGljayA9ICgpID0+IHsgdm9pZCB0aGlzLm9uRGVsZXRlKCkudGhlbigoKSA9PiB0aGlzLmNsb3NlKCkpOyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FuY2VsIGFuZCBTYXZlIGJ1dHRvbnMgb24gcmlnaHRcbiAgICAgICAgY29uc3QgcmlnaHRCdXR0b25zID0gZm9vdGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1mb290ZXItcmlnaHQnIH0pO1xuICAgICAgICByaWdodEJ1dHRvbnMuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3Rlci1yaWdodCcpO1xuICAgICAgICBjb25zdCBjYW5jZWwgPSByaWdodEJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtY2FuY2VsJyB9KTtcbiAgICAgICAgY2FuY2VsLmFkZENsYXNzKCdkYi1idG4nKTtcbiAgICAgICAgY2FuY2VsLnRleHRDb250ZW50ID0gJ0NhbmNlbCc7XG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgICAgICBjb25zdCBvayA9IHJpZ2h0QnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1zYXZlIG1vZC1jdGEnIH0pO1xuICAgICAgICBvay5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIG9rLnRleHRDb250ZW50ID0gJ1NhdmUgRXZlbnQnO1xuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGF5bG9hZDogUGFydGlhbDxEYXlibGVFdmVudD4gPSB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlSW5wdXQudmFsdWUsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRlc2NJbnB1dC52YWx1ZSxcbiAgICAgICAgICAgICAgICBpY29uOiB0aGlzLmljb24sXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlJZDogc2VsZWN0ZWRDYXRlZ29yeUlkLFxuICAgICAgICAgICAgICAgIGNvbG9yOiB0aGlzLnNlbGVjdGVkQ29sb3IsXG4gICAgICAgICAgICAgICAgdGV4dENvbG9yOiB0aGlzLnNlbGVjdGVkVGV4dENvbG9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKCFwYXlsb2FkLmNhdGVnb3J5SWQgfHwgIXBheWxvYWQuY29sb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmlnZ2VycyA9ICh0aGlzIGFzIGFueSkucGx1Z2luPy5zZXR0aW5ncz8udHJpZ2dlcnMgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgdHh0ID0gKChwYXlsb2FkLnRpdGxlIHx8ICcnKSArICcgJyArIChwYXlsb2FkLmRlc2NyaXB0aW9uIHx8ICcnKSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IHRyaWdnZXJzLmZpbmQoKHQ6IGFueSkgPT4gKHQucGF0dGVybiB8fCAnJykudG9Mb3dlckNhc2UoKSAmJiB0eHQuaW5jbHVkZXMoKHQucGF0dGVybiB8fCAnJykudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBheWxvYWQuY2F0ZWdvcnlJZCAmJiBmb3VuZC5jYXRlZ29yeUlkKSBwYXlsb2FkLmNhdGVnb3J5SWQgPSBmb3VuZC5jYXRlZ29yeUlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBheWxvYWQuY29sb3IgJiYgZm91bmQuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWQuY29sb3IgPSBmb3VuZC5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWQudGV4dENvbG9yID0gZm91bmQudGV4dENvbG9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNNdWx0aURheSAmJiBlbmRUaW1lICYmIGVuZERhdGVJbnB1dCkge1xuICAgICAgICAgICAgICAgIC8vIE11bHRpLWRheSBldmVudFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZVZhbCA9IHN0YXJ0VGltZS52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBlbmRUaW1lVmFsID0gZW5kVGltZS52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnRpbWUgPSAoc3RhcnRUaW1lVmFsICYmIGVuZFRpbWVWYWwpID8gYCR7c3RhcnRUaW1lVmFsfS0ke2VuZFRpbWVWYWx9YCA6IChzdGFydFRpbWVWYWwgfHwgJycpO1xuICAgICAgICAgICAgICAgIHBheWxvYWQuc3RhcnREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IHRoaXMuZXY/LnN0YXJ0RGF0ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gZW5kRGF0ZUlucHV0LnZhbHVlIHx8IHRoaXMuZXY/LmVuZERhdGUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaW5nbGUgZGF5IGV2ZW50XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lVmFsID0gc3RhcnRUaW1lLnZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZFRpbWVWYWwgPSBlbmRUaW1lPy52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnRpbWUgPSAoc3RhcnRUaW1lVmFsICYmIGVuZFRpbWVWYWwpID8gYCR7c3RhcnRUaW1lVmFsfS0ke2VuZFRpbWVWYWx9YCA6IChzdGFydFRpbWVWYWwgfHwgJycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrRGF0ZSA9IHRoaXMuZXY/LmRhdGUgfHwgdGhpcy5ldj8uc3RhcnREYXRlIHx8IHRoaXMuZGF0ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5kYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnN0YXJ0RGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCBmYWxsYmFja0RhdGU7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUodGhpcy5vblN1Ym1pdChwYXlsb2FkKSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZV0gRXJyb3Igc2F2aW5nIGV2ZW50OicsIGUpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0Vycm9yIHNhdmluZyBldmVudDogJyArIChlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSkpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBQcmV2ZW50IG1vZGFsIG9wZW4gd2hlbiBjbGlja2luZyBtYXJrZG93biBsaW5rcyBpbnNpZGUgZXZlbnQgaXRlbXM7IG9wZW4gbm90ZSBpbiBuZXcgdGFiXG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhID0gKGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnYScpIGFzIEhUTUxBbmNob3JFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgIGlmICghYSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcbiAgICAgICAgICAgIGlmICh3aWtpKSB7XG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gcmVzb2x2ZU5vdGVGaWxlKHRoaXMuYXBwLCB3aWtpKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIChsZWFmIGFzIGFueSkub3BlbkZpbGU/LihmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICB9XG59XG5cbmNsYXNzIEljb25QaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQ7XG4gICAgb25SZW1vdmU/OiAoKSA9PiB2b2lkO1xuICAgIGFsbEljb25zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQsIG9uUmVtb3ZlPzogKCkgPT4gdm9pZCkgeyBzdXBlcihhcHApOyB0aGlzLm9uUGljayA9IG9uUGljazsgdGhpcy5vblJlbW92ZSA9IG9uUmVtb3ZlOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBjLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICAgICAgYy5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWFyY2hSb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1yb3cnIH0pO1xuICAgICAgICBzZWFyY2hSb3cuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBzZWFyY2hSb3cuc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XG4gICAgICAgIGNvbnN0IHNlYXJjaElucHV0ID0gc2VhcmNoUm93LmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RleHQnLCBjbHM6ICdkYXlibGUtaW5wdXQnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnU2VhcmNoIGljb25zJyB9IH0pO1xuICAgICAgICBzZWFyY2hJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgc2VhcmNoSW5wdXQuc3R5bGUuZmxleEdyb3cgPSAnMSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaXN0ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaWNvbi1saXN0JyB9KTtcbiAgICAgICAgbGlzdC5hZGRDbGFzcygnZGItaWNvbi1saXN0Jyk7XG4gICAgICAgIGxpc3Quc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgbGlzdC5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG4gICAgICAgIGxpc3Quc3R5bGUuZGlzcGxheSA9ICdncmlkJztcbiAgICAgICAgbGlzdC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gJ3JlcGVhdChhdXRvLWZpbGwsIG1pbm1heCg0MHB4LCAxZnIpKSc7XG4gICAgICAgIGxpc3Quc3R5bGUuZ2FwID0gJzRweCc7XG4gICAgICAgIGxpc3Quc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XG4gICAgICAgIFxuICAgICAgICAvLyBGb290ZXIgd2l0aCByZW1vdmUgYnV0dG9uXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KCk7XG4gICAgICAgIGZvb3Rlci5hZGRDbGFzcygnZGItbW9kYWwtZm9vdGVyJyk7XG4gICAgICAgIGZvb3Rlci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBmb290ZXIuc3R5bGUubWFyZ2luVG9wID0gJ2F1dG8nO1xuICAgICAgICBmb290ZXIuc3R5bGUucGFkZGluZ1RvcCA9ICc4cHgnO1xuICAgICAgICBmb290ZXIuc3R5bGUuYm9yZGVyVG9wID0gJzFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlciknO1xuICAgICAgICBjb25zdCByZW1vdmVCdG4gPSBmb290ZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicsIHRleHQ6ICdSZW1vdmUgSWNvbicgfSk7XG4gICAgICAgIHJlbW92ZUJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIHJlbW92ZUJ0bi5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICByZW1vdmVCdG4uc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgICAgICByZW1vdmVCdG4uc3R5bGUuZ2FwID0gJzRweCc7XG4gICAgICAgIGNvbnN0IHJlbW92ZUljb24gPSByZW1vdmVCdG4uY3JlYXRlRGl2KCk7XG4gICAgICAgIHNldEljb24ocmVtb3ZlSWNvbiwgJ3gnKTtcbiAgICAgICAgcmVtb3ZlSWNvbi5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1mbGV4JztcbiAgICAgICAgcmVtb3ZlQnRuLm9uY2xpY2sgPSAoKSA9PiB7IGlmICh0aGlzLm9uUmVtb3ZlKSB0aGlzLm9uUmVtb3ZlKCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgaWNvbnMgbGF6aWx5XG4gICAgICAgIGlmICghdGhpcy5hbGxJY29ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuYWxsSWNvbnMgPSBnZXRJY29uSWRzU2FmZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgZmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLnNsaWNlKDAsIDk2KTsgLy8gT25seSBzaG93IGZpcnN0IDEwMCBpbml0aWFsbHlcbiAgICAgICAgbGV0IGZ1bGxGaWx0ZXJlZCA9IHRoaXMuYWxsSWNvbnMuc2xpY2UoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoaWNvbnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgICAgICBsaXN0LmVtcHR5KCk7XG4gICAgICAgICAgICBpY29ucy5zbGljZSgwLCAyMDApLmZvckVhY2goaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IGxpc3QuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWljb24tYnRuJyB9KTtcbiAgICAgICAgICAgICAgICBidG4uYWRkQ2xhc3MoJ2RiLWljb24tYnRuJyk7XG4gICAgICAgICAgICAgICAgYnRuLnN0eWxlLnBhZGRpbmcgPSAnNnB4JztcbiAgICAgICAgICAgICAgICBidG4udGl0bGUgPSBpZDtcbiAgICAgICAgICAgICAgICBzZXRJY29uKGJ0biwgaWQpO1xuICAgICAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLm9uUGljayhpZCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYXBwbHlGaWx0ZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxID0gKHNlYXJjaElucHV0LnZhbHVlIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKCFxKSB7XG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgwLCAxNTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmdWxsRmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLmZpbHRlcihpZCA9PiBpZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlbmRlckxpc3QoZnVsbEZpbHRlcmVkKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlYXJjaElucHV0Lm9uaW5wdXQgPSBhcHBseUZpbHRlcjtcbiAgICAgICAgcmVuZGVyTGlzdChmaWx0ZXJlZCk7XG4gICAgfVxufVxuXG5jbGFzcyBQcm9tcHRTZWFyY2hNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICB2aWV3OiBEYXlibGVDYWxlbmRhclZpZXc7XG4gICAgcXVlcnk6IHN0cmluZyA9ICcnO1xuICAgIHJlc3VsdHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAwO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCB2aWV3OiBEYXlibGVDYWxlbmRhclZpZXcpIHsgXG4gICAgICAgIHN1cGVyKGFwcCk7IFxuICAgICAgICB0aGlzLnZpZXcgPSB2aWV3OyBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbC5jbGFzc0xpc3QucmVtb3ZlKCdtb2RhbCcpO1xuICAgICAgICAgICAgdGhpcy5tb2RhbEVsLmNsYXNzTmFtZSA9ICdwcm9tcHQnO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY29udGVudCB3cmFwcGVyIHNvIHByb21wdCBpcyB0aGUgcm9vdFxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGVudEVsICYmIHRoaXMuY29udGVudEVsLnBhcmVudEVsZW1lbnQgPT09IHRoaXMubW9kYWxFbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudEVsLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHt9XG4gICAgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3Qgcm9vdCA9IHRoaXMubW9kYWxFbDtcbiAgICAgICAgd2hpbGUgKHJvb3QuZmlyc3RDaGlsZCkgcm9vdC5yZW1vdmVDaGlsZChyb290LmZpcnN0Q2hpbGQpO1xuICAgICAgICBjb25zdCBpbnB1dFdyYXAgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3Byb21wdC1pbnB1dC1jb250YWluZXInIH0pO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGlucHV0V3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IGNsczogJ3Byb21wdC1pbnB1dCcsIGF0dHI6IHsgYXV0b2NhcGl0YWxpemU6ICdvZmYnLCBzcGVsbGNoZWNrOiAnZmFsc2UnLCBlbnRlcmtleWhpbnQ6ICdkb25lJywgdHlwZTogJ3RleHQnLCBwbGFjZWhvbGRlcjogJ0ZpbmQgZXZlbnRzLi4uJyB9IH0pO1xuICAgICAgICBjb25zdCByZXN1bHRzRWwgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3Byb21wdC1yZXN1bHRzJyB9KTtcbiAgICAgICAgY29uc3QgcmVuZGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzdWx0c0VsLmVtcHR5KCk7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucmVzdWx0cztcbiAgICAgICAgICAgIGlmICghaXRlbXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKChldiwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHJlc3VsdHNFbC5jcmVhdGVEaXYoeyBjbHM6ICdzdWdnZXN0aW9uLWl0ZW0gbW9kLWNvbXBsZXgnIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHJvdy5hZGRDbGFzcygnaXMtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWVudGVyID0gKCkgPT4geyB0aGlzLnNlbGVjdGVkSW5kZXggPSBpOyByZW5kZXIoKTsgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gcm93LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tY29udGVudCcgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tdGl0bGUnIH0pO1xuICAgICAgICAgICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gZXYudGl0bGUgfHwgJyh1bnRpdGxlZCknO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vdGUgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tbm90ZScgfSk7XG4gICAgICAgICAgICAgICAgbm90ZS50ZXh0Q29udGVudCA9IGV2LmRhdGUgKyAoZXYudGltZSA/ICcgJyArIGV2LnRpbWUgOiAnJyk7XG4gICAgICAgICAgICAgICAgbm90ZS5zdHlsZS5mb250U2l6ZSA9ICcwLjhlbSc7XG4gICAgICAgICAgICAgICAgbm90ZS5zdHlsZS5jb2xvciA9ICd2YXIoLS10ZXh0LW11dGVkKSc7XG4gICAgICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiB0aGlzLmNob29zZShpKTtcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMuY2hvb3NlKGkpOyB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHEgPSAoaW5wdXQudmFsdWUgfHwgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLnF1ZXJ5ID0gcTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2VhcmNoIGFsbCBtb250aHMgYnkgbG9hZGluZyBhbGwgSlNPTiBmaWxlc1xuICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy52aWV3LnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyIHx8ICdEYXlibGVDYWxlbmRhcic7XG4gICAgICAgICAgICBsZXQgYWxsRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggY3VycmVudCB2aWV3IGV2ZW50cyB0byBiZSBmYXN0XG4gICAgICAgICAgICBhbGxFdmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLnNsaWNlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBhbGwgb3RoZXIgZmlsZXMgaWYgd2UgaGF2ZSBhIHF1ZXJ5XG4gICAgICAgICAgICAgICAgaWYgKHEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGlzdGluZztcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RpbmcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmxpc3QoZm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIG1pZ2h0IG5vdCBleGlzdCBvciBvdGhlciBlcnJvclxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGluZyA9IHsgZmlsZXM6IFtdIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gKGxpc3RpbmcuZmlsZXMgfHwgW10pLmZpbHRlcigoZjogc3RyaW5nKSA9PiBmLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5qc29uJykpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGN1cnJlbnQgbW9udGggZmlsZSBhcyBpdCdzIGFscmVhZHkgaW4gbWVtb3J5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMudmlldy5nZXRNb250aERhdGFGaWxlUGF0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGYgPT09IGN1cnJlbnRGaWxlKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmLmVuZHNXaXRoKGN1cnJlbnRGaWxlLnNwbGl0KCcvJykucG9wKCkhKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHh0ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggbGVnYWN5IGFycmF5IGZvcm1hdCBhbmQgbmV3IG9iamVjdCBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZUV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVFdmVudHMgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEuZXZlbnRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlRXZlbnRzID0gZGF0YS5ldmVudHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlRXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRXZlbnRzID0gYWxsRXZlbnRzLmNvbmNhdChmaWxlRXZlbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgYmFzZWQgb24gSURcbiAgICAgICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBjb25zdCB1bmlxdWVFdmVudHMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZXYgb2YgYWxsRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzZWVuLmhhcyhldi5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vlbi5hZGQoZXYuaWQpO1xuICAgICAgICAgICAgICAgICAgICB1bmlxdWVFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnJlc3VsdHMgPSB1bmlxdWVFdmVudHMuZmlsdGVyKGUgPT4gKChlLnRpdGxlIHx8ICcnKSArICcgJyArIChlLmRlc2NyaXB0aW9uIHx8ICcnKSkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSkuc2xpY2UoMCwgNTApO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gMDtcbiAgICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBvbktleSA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdBcnJvd0Rvd24nKSB7IHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMucmVzdWx0cy5sZW5ndGggLSAxLCB0aGlzLnNlbGVjdGVkSW5kZXggKyAxKTsgcmVuZGVyKCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdBcnJvd1VwJykgeyB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1heCgwLCB0aGlzLnNlbGVjdGVkSW5kZXggLSAxKTsgcmVuZGVyKCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHsgdGhpcy5jaG9vc2UodGhpcy5zZWxlY3RlZEluZGV4KTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHsgdGhpcy5jbG9zZSgpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICAgICAgfTtcbiAgICAgICAgaW5wdXQub25pbnB1dCA9IHVwZGF0ZTtcbiAgICAgICAgaW5wdXQub25rZXlkb3duID0gb25LZXk7XG4gICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgIHVwZGF0ZSgpO1xuICAgIH1cbiAgICBhc3luYyBjaG9vc2UoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgZXYgPSB0aGlzLnJlc3VsdHNbaWR4XTtcbiAgICAgICAgaWYgKCFldikgcmV0dXJuO1xuICAgICAgICBjb25zdCBkYXRlU3RyID0gZXYuZGF0ZSB8fCBldi5zdGFydERhdGU7XG4gICAgICAgIGlmIChkYXRlU3RyKSB7XG4gICAgICAgICAgICBjb25zdCBbeSwgbSwgZF0gPSBkYXRlU3RyLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgICAgICAgICB0aGlzLnZpZXcuY3VycmVudERhdGUgPSBuZXcgRGF0ZSh5LCAobSB8fCAxKSAtIDEsIGQgfHwgMSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnZpZXcubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgIHRoaXMudmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gQXJyYXkuZnJvbSh0aGlzLnZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChgLmRheWJsZS1ldmVudFtkYXRhLWlkPVwiJHtldi5pZH1cIl1gKSkgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgICAgICAgICBub2Rlcy5mb3JFYWNoKG4gPT4gbi5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtaGlnaGxpZ2h0JykpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyBub2Rlcy5mb3JFYWNoKG4gPT4gbi5jbGFzc0xpc3QucmVtb3ZlKCdkYXlibGUtZXZlbnQtaGlnaGxpZ2h0JykpOyB9LCAyMDAwKTtcbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG59XG5cbmNsYXNzIFRvZGF5TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgZGF0ZTogc3RyaW5nO1xuICAgIGV2ZW50czogRGF5YmxlRXZlbnRbXTtcbiAgICB2aWV3PzogRGF5YmxlQ2FsZW5kYXJWaWV3O1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBkYXRlOiBzdHJpbmcsIGV2ZW50czogRGF5YmxlRXZlbnRbXSwgdmlldz86IERheWJsZUNhbGVuZGFyVmlldykge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLmV2ZW50cyA9IGV2ZW50cztcbiAgICAgICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB9XG4gICAgXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBjLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICAgICAgYy5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXJzZSBkYXRlXG4gICAgICAgIGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IHRoaXMuZGF0ZS5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICAgICAgICBjb25zdCBkYXRlT2JqID0gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpO1xuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xuICAgICAgICBjb25zdCBtb250aE5hbWUgPSBtb250aE5hbWVzW2RhdGVPYmouZ2V0TW9udGgoKV07XG4gICAgICAgIFxuICAgICAgICAvLyBUaXRsZSB3aXRoIGRhdGVcbiAgICAgICAgY29uc3QgdGl0bGUgPSBjLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogYCR7bW9udGhOYW1lfSAke2RheX1gIH0pO1xuICAgICAgICB0aXRsZS5hZGRDbGFzcygnZGItbW9kYWwtdGl0bGUnKTtcbiAgICAgICAgdGl0bGUuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGV2ZW50cyBmb3IgdGhpcyBkYXRlXG4gICAgICAgIGNvbnN0IGRheUV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuZGF0ZSA9PT0gdGhpcy5kYXRlKS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lQSA9IGEudGltZSA/IGEudGltZS5zcGxpdCgnLScpWzBdIDogJzk5Ojk5JztcbiAgICAgICAgICAgIGNvbnN0IHRpbWVCID0gYi50aW1lID8gYi50aW1lLnNwbGl0KCctJylbMF0gOiAnOTk6OTknO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVBLmxvY2FsZUNvbXBhcmUodGltZUIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50cyBjb250YWluZXIgKHNjcm9sbGFibGUpXG4gICAgICAgIGNvbnN0IGV2ZW50c0NvbnRhaW5lciA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXRvZGF5LWV2ZW50cy1jb250YWluZXInIH0pO1xuICAgICAgICBldmVudHNDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWV2ZW50cy1jb250YWluZXInKTtcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLmZsZXggPSAnMSc7XG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMTJweCc7XG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5zdHlsZS5wYWRkaW5nUmlnaHQgPSAnOHB4JztcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlFdmVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBldmVudHNDb250YWluZXIuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdObyBldmVudHMgZm9yIHRoaXMgZGF5JyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRheUV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC1yb3cnIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcygnZGItdG9kYXktcm93Jyk7XG4gICAgICAgICAgICAgICAgcm93LnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICByb3cuZGF0YXNldC5pZCA9IGV2LmlkO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5nYXAgPSAnMTJweCc7XG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxMnB4JztcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUucGFkZGluZyA9ICc4cHgnO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5LWFsdCknO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUuYWxpZ25JdGVtcyA9ICdmbGV4LXN0YXJ0JztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50RWwgPSByb3cuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgY29udGVudEVsLnN0eWxlLmZsZXggPSAnMSc7XG4gICAgICAgICAgICAgICAgY29udGVudEVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgY29udGVudEVsLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZ2FwID0gJzRweCc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGVFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtdGl0bGUnIH0pO1xuICAgICAgICAgICAgICAgIHRpdGxlRWwuYWRkQ2xhc3MoJ2RiLXRpdGxlJyk7XG4gICAgICAgICAgICAgICAgdGl0bGVFbC5zdHlsZS5mb250V2VpZ2h0ID0gJzUwMCc7XG4gICAgICAgICAgICAgICAgdGl0bGVFbC5zdHlsZS5jb2xvciA9IGV2LmNvbG9yID8gKGV2LnRleHRDb2xvciB8fCAndmFyKC0tdGV4dC1ub3JtYWwpJykgOiAndmFyKC0tdGV4dC1ub3JtYWwpJztcbiAgICAgICAgICAgICAgICByZW5kZXJNYXJrZG93bihldi50aXRsZSB8fCAnJywgdGl0bGVFbCwgdGhpcy52aWV3Py5wbHVnaW4/LmFwcCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgZXZlbnQgY29sb3JzIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHBsdWdpbiA9IHRoaXMudmlldz8ucGx1Z2luO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBwbHVnaW4/LnNldHRpbmdzPy5ldmVudENhdGVnb3JpZXMgPz8gW107XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBjYXRlZ29yaWVzLmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcbiAgICAgICAgICAgICAgICBsZXQgYmdDb2xvciA9ICcnO1xuICAgICAgICAgICAgICAgIGxldCB0ZXh0Q29sb3IgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgYmdDb2xvciA9IGV2LmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29sb3IgPSBldi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKGV2LmNvbG9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgYmdDb2xvciA9IGNhdGVnb3J5LmJnQ29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb2xvciA9IGNhdGVnb3J5LnRleHRDb2xvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJnQ29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3BhY2l0eSA9IHBsdWdpbj8uc2V0dGluZ3M/LmV2ZW50QmdPcGFjaXR5ID8/IDE7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmFDb2xvciA9IGhleFRvUmdiYShiZ0NvbG9yLCBvcGFjaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgcm93LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHJnYmFDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGVFbC5zdHlsZS5jb2xvciA9IHRleHRDb2xvciB8fCB0aXRsZUVsLnN0eWxlLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICByb3cuY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5lZmZlY3QgJiYgY2F0ZWdvcnkuZWZmZWN0ICE9PSAnJykgcm93LmFkZENsYXNzKGBkYXlibGUtZWZmZWN0LSR7Y2F0ZWdvcnkuZWZmZWN0fWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbmx5VG9kYXkgPSBwbHVnaW4/LnNldHRpbmdzPy5vbmx5QW5pbWF0ZVRvZGF5ID8/IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uICYmIGNhdGVnb3J5LmFuaW1hdGlvbiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb259YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbjIgJiYgY2F0ZWdvcnkuYW5pbWF0aW9uMiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb24yfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVFbCA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktdGltZScgfSk7XG4gICAgICAgICAgICAgICAgdGltZUVsLmFkZENsYXNzKCdkYi10aW1lJyk7XG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLm1pbldpZHRoID0gJzYwcHgnO1xuICAgICAgICAgICAgICAgIHRpbWVFbC5zdHlsZS5mb250V2VpZ2h0ID0gJzYwMCc7XG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggZXZlbnQgdGl0bGUgY29sb3JcbiAgICAgICAgICAgICAgICB0aW1lRWwuc3R5bGUuY29sb3IgPSB0aXRsZUVsLnN0eWxlLmNvbG9yO1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm10ID0gdGhpcy52aWV3Py5wbHVnaW4/LnNldHRpbmdzPy50aW1lRm9ybWF0ID8/ICcyNGgnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFZhbCA9IGV2LnRpbWUgPyBldi50aW1lLnNwbGl0KCctJylbMF0gOiAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzcCA9IGZvcm1hdFRpbWVWYWx1ZShzdGFydFZhbCwgZm10KTtcbiAgICAgICAgICAgICAgICAgICAgdGltZUVsLnRleHRDb250ZW50ID0gZGlzcCB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV2LmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtZGVzYycgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5hZGRDbGFzcygnZGItZGVzYycpO1xuICAgICAgICAgICAgICAgICAgICBkZXNjRWwuc3R5bGUuZm9udFNpemUgPSAnMC45ZW0nO1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXRjaCB0aXRsZSBjb2xvclxuICAgICAgICAgICAgICAgICAgICBkZXNjRWwuc3R5bGUuY29sb3IgPSB0aXRsZUVsLnN0eWxlLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJNYXJrZG93bihldi5kZXNjcmlwdGlvbiwgZGVzY0VsLCB0aGlzLnZpZXc/LnBsdWdpbj8uYXBwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gT3B0aW9uYWwgY29tcGxldGVkIGluZGljYXRvclxuICAgICAgICAgICAgICAgIGlmIChldi5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVoYXZpb3IgPSB0aGlzLnZpZXc/LnBsdWdpbj8uc2V0dGluZ3M/LmNvbXBsZXRlQmVoYXZpb3IgPz8gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmVoYXZpb3IgPT09ICdkaW0nKSByb3cuc3R5bGUub3BhY2l0eSA9ICcwLjYnO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ3N0cmlrZXRocm91Z2gnKSB0aXRsZUVsLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnaGlkZScpIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIuYXBwZW5kQ2hpbGQocm93KTtcbiAgICAgICAgICAgICAgICAvLyBEcmFnIGhhbmRsZXJzIGZvciByZW9yZGVyaW5nXG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xuICAgICAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIgYXMgRGF0YVRyYW5zZmVyKT8uc2V0RGF0YSgnZGF5YmxlLXNvdXJjZScsJ3RvZGF5Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnSW1nID0gcm93LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5sZWZ0ID0gJy0xMDAwMHB4JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gcm93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnRyYW5zZm9ybSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShyb3cpLmJvcmRlclJhZGl1cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZHJhZ0ltZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAocm93IGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgICAgICByb3cuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ2VuZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm93LnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGkgPSAocm93IGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIChyb3cgYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBDbGljayB0byBlZGl0XG4gICAgICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXc/Lm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5kYXRlID8/IHRoaXMuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBSaWdodC1jbGljayBjb250ZXh0IG1lbnVcbiAgICAgICAgICAgICAgICByb3cub25jb250ZXh0bWVudSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0R1cGxpY2F0ZScpLnNldEljb24oJ2NvcHknKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0V2OiBEYXlibGVFdmVudCA9IHsgLi4uZXYsIGlkOiByYW5kb21JZCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuZXZlbnRzLnB1c2gobmV3RXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKGV2LmNvbXBsZXRlZCA/ICdNYXJrIGluY29tcGxldGUnIDogJ01hcmsgY29tcGxldGUnKS5zZXRJY29uKCdjaGVjaycpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29tcGxldGVkID0gIWV2LmNvbXBsZXRlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEZWxldGUnKS5zZXRJY29uKCd0cmFzaCcpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW4gdG9kYXkgbW9kYWxcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um93ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgICAgICBjb25zdCByb3dzQ291bnQgPSBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS10b2RheS1ldmVudC1yb3cnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFJvdyAmJiByb3dzQ291bnQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRSb3cuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBoID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2RheWJsZS1kcm9wLWluZGljYXRvcic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBoIC8gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Um93LnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldFJvdyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBldmVudHNDb250YWluZXIub25kcmFnbGVhdmUgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gZXZlbnRzQ29udGFpbmVyKSBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xuICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvcihgW2RhdGEtaWQ9XCIke2lkfVwiXWApIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdyA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS10b2RheS1ldmVudC1yb3cnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRSb3cgfHwgdGFyZ2V0Um93ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0Um93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgaCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldFJvdyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Um93LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Um93KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChkcmFnZ2VkRWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQZXJzaXN0IG9yZGVyIGZvciB0aGlzIGRhdGVcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheUlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93JykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQhO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF5SWRzLnB1c2goZWlkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSA9PT0gZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG90aGVycyA9IHRoaXMudmlldy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LmRhdGUgIT09IGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZW9yZGVyZWREYXkgPSBkYXlJZHMubWFwKGlkID0+IG9yaWdpbmFsLmZpbmQoZSA9PiBlLmlkID09PSBpZCkhKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSBvdGhlcnMuY29uY2F0KHJlb3JkZXJlZERheSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudmlldy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRml4ZWQgK0FkZCBFdmVudCBidXR0b24gYXQgYm90dG9tXG4gICAgICAgIGNvbnN0IGFkZEJ0biA9IGMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLXRvZGF5LWFkZC1idG4nLCB0ZXh0OiAnKyBBZGQgRXZlbnQnIH0pO1xuICAgICAgICBhZGRCdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xuICAgICAgICBhZGRCdG4uc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5wYWRkaW5nID0gJzEwcHgnO1xuICAgICAgICBhZGRCdG4uc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xuICAgICAgICBhZGRCdG4uc3R5bGUuYm9yZGVyUmFkaXVzID0gJzZweCc7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5mb250V2VpZ2h0ID0gJzYwMCc7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSAnYXV0byc7XG4gICAgICAgIGFkZEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy52aWV3Py5vcGVuRXZlbnRNb2RhbCh1bmRlZmluZWQsIHRoaXMuZGF0ZSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgaW50ZXJuYWwgbGluayBjbGlja3MgaW5zaWRlIHRvZGF5IG1vZGFsIGNvbnRlbnRcbiAgICAgICAgdGhpcy5jb250ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXYpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgaWYgKCFhKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCB3aWtpID0gYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xuICAgICAgICAgICAgaWYgKHdpa2kpIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb25zdCB0aXRsZSA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdTdG9yYWdlIGZvbGRlciBub3Qgc2V0JyB9KTtcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1lvdSBuZWVkIHRvIHNldCBhIHN0b3JhZ2UgZm9sZGVyIHRvIGNyZWF0ZSBhbmQgc2F2ZSBldmVudHMuJyB9KTtcbiAgICAgICAgY29uc3QgYnRucyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgYnRucy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBidG5zLnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgICAgICBidG5zLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtZW5kJztcbiAgICAgICAgYnRucy5zdHlsZS5tYXJnaW5Ub3AgPSAnMTJweCc7XG4gICAgICAgIGNvbnN0IG9wZW5TZXR0aW5nc0J0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicgfSk7XG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5zZXRUZXh0KCdPcGVuIFNldHRpbmdzJyk7XG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHsgXG4gICAgICAgICAgICAgICAgY29uc3QgcyA9ICh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmc7XG4gICAgICAgICAgICAgICAgcz8ub3Blbj8uKCk7XG4gICAgICAgICAgICAgICAgcz8ub3BlblRhYkJ5SWQ/LignZGF5YmxlLWNhbGVuZGFyJyk7XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNsb3NlQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcbiAgICAgICAgY2xvc2VCdG4uc2V0VGV4dCgnQ2xvc2UnKTtcbiAgICAgICAgY2xvc2VCdG4ub25jbGljayA9ICgpID0+IHRoaXMuY2xvc2UoKTtcbiAgICB9XG59XG5cbmNsYXNzIENvbmZpcm1Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgb25Db25maXJtOiAoKSA9PiB2b2lkO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtZXNzYWdlOiBzdHJpbmcsIG9uQ29uZmlybTogKCkgPT4gdm9pZCkge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLm9uQ29uZmlybSA9IG9uQ29uZmlybTtcbiAgICB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBjLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICAgICAgYy5zdHlsZS5nYXAgPSAnMTJweCc7XG4gICAgICAgIGNvbnN0IG1zZyA9IGMuY3JlYXRlRWwoJ2RpdicpO1xuICAgICAgICBtc2cudGV4dENvbnRlbnQgPSB0aGlzLm1lc3NhZ2U7XG4gICAgICAgIGNvbnN0IHJvdyA9IGMuY3JlYXRlRGl2KCk7XG4gICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgICAgIHJvdy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LWVuZCc7XG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcbiAgICAgICAgY2FuY2VsLnRleHRDb250ZW50ID0gJ0NhbmNlbCc7XG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgICAgICBjb25zdCBvayA9IHJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIG1vZC1jdGEnIH0pO1xuICAgICAgICBvay50ZXh0Q29udGVudCA9ICdEZWxldGUnO1xuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4geyB0cnkgeyB0aGlzLm9uQ29uZmlybSgpOyB9IGZpbmFsbHkgeyB0aGlzLmNsb3NlKCk7IH0gfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEljb25JZHNTYWZlKCk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbnlPYiA9ICh3aW5kb3cgYXMgYW55KS5vYnNpZGlhbjtcbiAgICBjb25zdCBpZHNGbiA9IGFueU9iPy5nZXRJY29uSWRzO1xuICAgIGlmICh0eXBlb2YgaWRzRm4gPT09ICdmdW5jdGlvbicpIHJldHVybiBpZHNGbigpO1xuICAgIHJldHVybiBbJ2NhbGVuZGFyJywnY2xvY2snLCdzdGFyJywnYm9va21hcmsnLCdmbGFnJywnYmVsbCcsJ2NoZWNrJywncGVuY2lsJywnYm9vaycsJ3phcCddO1xufVxuXG5mdW5jdGlvbiBjaG9vc2VUZXh0Q29sb3IoaGV4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJnYiA9IGhleFRvUmdiKGhleCk7XG4gICAgaWYgKCFyZ2IpIHJldHVybiAndmFyKC0tdGV4dC1ub3JtYWwpJztcbiAgICBjb25zdCB5aXEgPSAoKHJnYi5yKjI5OSkrKHJnYi5nKjU4NykrKHJnYi5iKjExNCkpLzEwMDA7XG4gICAgcmV0dXJuIHlpcSA+PSAxMjggPyAnIzAwMDAwMCcgOiAnI2ZmZmZmZic7XG59XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleDogc3RyaW5nKToge3I6bnVtYmVyLGc6bnVtYmVyLGI6bnVtYmVyfXxudWxsIHtcbiAgICBjb25zdCBtID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gICAgcmV0dXJuIG0gPyB7IHI6IHBhcnNlSW50KG1bMV0sMTYpLCBnOiBwYXJzZUludChtWzJdLDE2KSwgYjogcGFyc2VJbnQobVszXSwxNikgfSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGhleFRvUmdiYShoZXg6IHN0cmluZywgYWxwaGE6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IoaGV4KTtcbiAgICBpZiAoIXJnYikgcmV0dXJuIGhleDtcbiAgICByZXR1cm4gYHJnYmEoJHtyZ2Iucn0sICR7cmdiLmd9LCAke3JnYi5ifSwgJHthbHBoYX0pYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZVZhbHVlKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZtdDogJzI0aCcgfCAnMTJoJyk6IHN0cmluZyB7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuICcnO1xuICAgIGNvbnN0IFtoaFN0ciwgbW1TdHJdID0gdmFsdWUuc3BsaXQoJzonKTtcbiAgICBjb25zdCBoaCA9IHBhcnNlSW50KGhoU3RyIHx8ICcwJywgMTApO1xuICAgIGNvbnN0IG1tID0gcGFyc2VJbnQobW1TdHIgfHwgJzAnLCAxMCk7XG4gICAgaWYgKGZtdCA9PT0gJzEyaCcpIHtcbiAgICAgICAgY29uc3QgaXNQTSA9IGhoID49IDEyO1xuICAgICAgICBjb25zdCBoMTIgPSAoKGhoICUgMTIpIHx8IDEyKTtcbiAgICAgICAgcmV0dXJuIGAke2gxMn06JHtTdHJpbmcobW0pLnBhZFN0YXJ0KDIsICcwJyl9ICR7aXNQTSA/ICdQTScgOiAnQU0nfWA7XG4gICAgfVxuICAgIHJldHVybiBgJHtTdHJpbmcoaGgpLnBhZFN0YXJ0KDIsICcwJyl9OiR7U3RyaW5nKG1tKS5wYWRTdGFydCgyLCAnMCcpfWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRpbWVSYW5nZShyYW5nZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmbXQ6ICcyNGgnIHwgJzEyaCcpOiBzdHJpbmcge1xuICAgIGlmICghcmFuZ2UpIHJldHVybiAnJztcbiAgICBjb25zdCBwYXJ0cyA9IHJhbmdlLnNwbGl0KCctJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBjb25zdCBzID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xuICAgICAgICBjb25zdCBlID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzFdLCBmbXQpO1xuICAgICAgICBpZiAocyAmJiBlKSByZXR1cm4gYCR7c30tJHtlfWA7XG4gICAgICAgIHJldHVybiBzIHx8IGUgfHwgJyc7XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXRUaW1lVmFsdWUocGFydHNbMF0sIGZtdCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcmtkb3duKHRleHQ6IHN0cmluZywgZWxlbWVudDogSFRNTEVsZW1lbnQsIGFwcD86IEFwcCk6IHZvaWQge1xuICAgIC8vIFNpbXBsZSBtYXJrZG93biByZW5kZXJpbmc6IGhlYWRpbmdzLCBib2xkLCBpdGFsaWMsIGxpbmtzLCBjb2RlLCBzdHJpa2V0aHJvdWdoLCBoaWdobGlnaHQsIGJsb2NrcXVvdGUsIGltYWdlc1xuICAgIC8vIE5PVEU6IFdlIGRvIE5PVCBlc2NhcGUgSFRNTCB0byBhbGxvdyB1c2VycyB0byB1c2UgSFRNTCB0YWdzIGRpcmVjdGx5IChlLmcuLCA8dT51bmRlcmxpbmU8L3U+KVxuICAgIGxldCBodG1sID0gdGV4dFxuICAgICAgICAvLyBPYnNpZGlhbiB3aWtpLXN0eWxlIGltYWdlcyAhW1tpbWFnZS5wbmddXVxuICAgICAgICAucmVwbGFjZSgvIVxcW1xcWyhbXlxcXV0rKVxcXVxcXS9nLCAobWF0Y2gsIGZpbGVuYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbWFnZVVybCA9IGFwcCA/IHJlc29sdmVJbWFnZVBhdGgoZmlsZW5hbWUsIGFwcCkgOiBmaWxlbmFtZTtcbiAgICAgICAgICAgIHJldHVybiBgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cIiR7ZmlsZW5hbWV9XCIgY2xhc3M9XCJkYXlibGUtZW1iZWQtaW1hZ2VcIj5gO1xuICAgICAgICB9KVxuICAgICAgICAvLyBNYXJrZG93biBpbWFnZXMgIVthbHRdKHVybClcbiAgICAgICAgLnJlcGxhY2UoLyFcXFsoW15cXF1dKilcXF1cXCgoW14pXSspXFwpL2csIChtYXRjaCwgYWx0LCBzcmMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlVXJsID0gYXBwID8gcmVzb2x2ZUltYWdlUGF0aChzcmMsIGFwcCkgOiBzcmM7XG4gICAgICAgICAgICByZXR1cm4gYDxpbWcgc3JjPVwiJHtpbWFnZVVybH1cIiBhbHQ9XCIke2FsdH1cIiBjbGFzcz1cImRheWJsZS1lbWJlZC1pbWFnZVwiPmA7XG4gICAgICAgIH0pXG4gICAgICAgIC8vIEhlYWRpbmdzICMuLiMjIyMjI1xuICAgICAgICAucmVwbGFjZSgvXiMjIyMjI1xccysoLispJC9nbSwgJzxoNj4kMTwvaDY+JylcbiAgICAgICAgLnJlcGxhY2UoL14jIyMjI1xccysoLispJC9nbSwgJzxoNT4kMTwvaDU+JylcbiAgICAgICAgLnJlcGxhY2UoL14jIyMjXFxzKyguKykkL2dtLCAnPGg0PiQxPC9oND4nKVxuICAgICAgICAucmVwbGFjZSgvXiMjI1xccysoLispJC9nbSwgJzxoMz4kMTwvaDM+JylcbiAgICAgICAgLnJlcGxhY2UoL14jI1xccysoLispJC9nbSwgJzxoMj4kMTwvaDI+JylcbiAgICAgICAgLnJlcGxhY2UoL14jXFxzKyguKykkL2dtLCAnPGgxPiQxPC9oMT4nKVxuICAgICAgICAvLyBCb2xkICoqdGV4dCoqIGFuZCBfX3RleHRfX1xuICAgICAgICAucmVwbGFjZSgvXFwqXFwqKC4rPylcXCpcXCovZywgJzxzdHJvbmc+JDE8L3N0cm9uZz4nKVxuICAgICAgICAucmVwbGFjZSgvX18oLis/KV9fL2csICc8c3Ryb25nPiQxPC9zdHJvbmc+JylcbiAgICAgICAgLy8gSXRhbGljICp0ZXh0KiBhbmQgX3RleHRfXG4gICAgICAgIC5yZXBsYWNlKC9cXCooLis/KVxcKi9nLCAnPGVtPiQxPC9lbT4nKVxuICAgICAgICAucmVwbGFjZSgvXyguKz8pXy9nLCAnPGVtPiQxPC9lbT4nKVxuICAgICAgICAvLyBTdHJpa2V0aHJvdWdoIH5+dGV4dH5+XG4gICAgICAgIC5yZXBsYWNlKC9+figuKz8pfn4vZywgJzxkZWw+JDE8L2RlbD4nKVxuICAgICAgICAvLyBIaWdobGlnaHQgPT10ZXh0PT1cbiAgICAgICAgLnJlcGxhY2UoLz09KC4rPyk9PS9nLCAnPG1hcms+JDE8L21hcms+JylcbiAgICAgICAgLy8gQmxvY2txdW90ZSBsaW5lcyBzdGFydGluZyB3aXRoID5cbiAgICAgICAgLnJlcGxhY2UoL14mZ3Q7WyBcXHRdKiguKykkL2dtLCAnPGJsb2NrcXVvdGU+JDE8L2Jsb2NrcXVvdGU+JylcbiAgICAgICAgLy8gQ29kZSBgdGV4dGAgYW5kIGBgYGJsb2Nrc2BgYFxuICAgICAgICAucmVwbGFjZSgvYChbXmBdKylgL2csICc8Y29kZSBjbGFzcz1cImRheWJsZS1pbmxpbmUtY29kZVwiPiQxPC9jb2RlPicpXG4gICAgICAgIC5yZXBsYWNlKC9gYGAoW1xcc1xcU10qPylgYGAvZywgJzxwcmUgY2xhc3M9XCJkYXlibGUtY29kZS1ibG9ja1wiPjxjb2RlPiQxPC9jb2RlPjwvcHJlPicpXG4gICAgICAgIC8vIExpbmtzIFtbdGFyZ2V0fGFsaWFzXV0gYW5kIFt0ZXh0XSh1cmwpXG4gICAgICAgIC5yZXBsYWNlKC9cXFtcXFsoW15cXFtcXF1dKylcXF1cXF0vZywgKG0sIGlubmVyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFN0cmluZyhpbm5lcikuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSBwYXJ0c1sxXSB8fCBwYXJ0c1swXTtcbiAgICAgICAgICAgIHJldHVybiBgPGEgY2xhc3M9XCJpbnRlcm5hbC1saW5rIGRheWJsZS1pbnRlcm5hbC1saW5rXCIgZGF0YS1ocmVmPVwiJHt0YXJnZXR9XCI+JHthbGlhc308L2E+YDtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKChbXildKylcXCkvZywgJzxhIGhyZWY9XCIkMlwiIGNsYXNzPVwiZGF5YmxlLWV4dGVybmFsLWxpbmtcIj4kMTwvYT4nKVxuICAgICAgICAvLyBMaW5lIGJyZWFrc1xuICAgICAgICAucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgXG4gICAgY29uc3QgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhlbGVtZW50KTtcbiAgICBlbGVtZW50LnJlcGxhY2VDaGlsZHJlbihyYW5nZS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoaHRtbCkpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW1hZ2VQYXRoKGltYWdlUGF0aDogc3RyaW5nLCBhcHA6IEFwcCk6IHN0cmluZyB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKGltYWdlUGF0aCB8fCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XG4gICAgY29uc3QgYnlQYXRoID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFyZ2V0KTtcbiAgICBpZiAoYnlQYXRoICYmIGJ5UGF0aCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gYXBwLnZhdWx0LmdldFJlc291cmNlUGF0aChieVBhdGgpO1xuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XG4gICAgY29uc3QgZXh0VGFyZ2V0ID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XG4gICAgY29uc3QgZm91bmQgPSBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aCh0YXJnZXQpKVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IGV4dFRhcmdldClcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgoYCR7ZXh0VGFyZ2V0fS5tZGApKTtcbiAgICBpZiAoZm91bmQpIHJldHVybiBhcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGZvdW5kKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTm90ZUZpbGUoYXBwOiBBcHAsIGxpbmt0ZXh0OiBzdHJpbmcpOiBURmlsZSB8IG51bGwge1xuICAgIGNvbnN0IHJhdyA9IFN0cmluZyhsaW5rdGV4dCB8fCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XG4gICAgY29uc3Qgd2l0aG91dE1kID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XG4gICAgY29uc3QgYnlQYXRoID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFyZ2V0KTtcbiAgICBpZiAoYnlQYXRoICYmIGJ5UGF0aCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gYnlQYXRoO1xuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XG4gICAgY29uc3QgZm91bmQgPSBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aCh0YXJnZXQpKVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IHdpdGhvdXRNZClcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgoYCR7d2l0aG91dE1kfS5tZGApKTtcbiAgICByZXR1cm4gZm91bmQgfHwgbnVsbDtcbn1cblxuY2xhc3MgRGF5YmxlU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW4pIHsgc3VwZXIoYXBwLCBwbHVnaW4pOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdEYXlibGUgY2FsZW5kYXInKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIC8vIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0dlbmVyYWwnIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdXZWVrIHN0YXJ0IGRheScpXG4gICAgICAgICAgICAuc2V0RGVzYygnRmlyc3QgZGF5IG9mIHRoZSB3ZWVrJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignMCcsICdTdW5kYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcxJywgJ01vbmRheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzInLCAnVHVlc2RheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzMnLCAnV2VkbmVzZGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignNCcsICdUaHVyc2RheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzUnLCAnRnJpZGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignNicsICdTYXR1cmRheScpXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5KSlcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5ID0gcGFyc2VJbnQodiwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnU3RvcmFnZSBmb2xkZXInKVxuICAgICAgICAgICAgLnNldERlc2MoJ0ZvbGRlciB0byBzdG9yZSBjYWxlbmRhciBldmVudHMuIERhdGEgaXMgc3RvcmVkIGluIEpTT04gZmlsZXMuJylcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKSA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgOiAnVW5zZXQnKVxuICAgICAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWxsRm9sZGVycygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmID0+IGYucGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc29ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VnZ2VzdCA9IG5ldyAoRnV6enlTdWdnZXN0TW9kYWwgYXMgYW55KSh0aGlzLmFwcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0LnNldFBsYWNlaG9sZGVyKCdTZWxlY3Qgc3RvcmFnZSBmb2xkZXIuLi4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3QuZ2V0U3VnZ2VzdGlvbnMgPSAocTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFxKSByZXR1cm4gZm9sZGVycztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9sZGVycy5maWx0ZXIoZiA9PiBmLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5yZW5kZXJTdWdnZXN0aW9uID0gKGZvbGRlcjogc3RyaW5nLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRUZXh0KGZvbGRlciB8fCAnKFZhdWx0IHJvb3QpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5vbkNob29zZVN1Z2dlc3Rpb24gPSBhc3luYyAoZm9sZGVyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyID0gZm9sZGVyIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuc3VyZUVudHJpZXNGb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA6ICdVbnNldCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Qub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdUaW1lIGZvcm1hdCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnRGlzcGxheSB0aW1lcyBpbiAyNGggb3IgMTJoIGZvcm1hdCcpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJzI0aCcsICcyNC1ob3VyJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignMTJoJywgJzEyLWhvdXInKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZUZvcm1hdCA/PyAnMjRoJylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZUZvcm1hdCA9IHYgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnQXBwZWFyYW5jZScpLnNldEhlYWRpbmcoKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdJY29uIHBsYWNlbWVudCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnUG9zaXRpb24gb2YgZXZlbnQgaWNvbicpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdOb25lJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndG9wJywgJ1RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AtbGVmdCcsICdUb3AgbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RvcC1yaWdodCcsICdUb3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPSB2IGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgdGl0bGUgYWxpZ25tZW50JylcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgdGl0bGVzJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiA9IHYgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgZGVzY3JpcHRpb24gYWxpZ25tZW50JylcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgZGVzY3JpcHRpb25zJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50RGVzY0FsaWduID8/ICdsZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnREZXNjQWxpZ24gPSB2IGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJhY2tncm91bmQgb3BhY2l0eScpXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIHRyYW5zcGFyZW5jeSBvZiBldmVudCBiYWNrZ3JvdW5kcy4nKVxuICAgICAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDEsIDAuMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJvcmRlciB0aGlja25lc3MnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIGV2ZW50IGJvcmRlciB0aGlja25lc3MgKDAtNXB4KScpXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xuICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDUsIDAuNSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMilcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgb3BhY2l0eScpXG4gICAgICAgICAgICAuc2V0RGVzYygnQ29udHJvbHMgYm9yZGVyIGNvbG9yIG9wYWNpdHkgZm9yIGNvbG9yZWQgZXZlbnRzICgwLTEpJylcbiAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgMSwgMC4xKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5ID8/IDEpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyT3BhY2l0eSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgcmFkaXVzJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBldmVudCBjb3JuZXIgcm91bmRuZXNzIChweCknKVxuICAgICAgICAgICAgLmFkZFNsaWRlcihzID0+IHtcbiAgICAgICAgICAgICAgICBzLnNldExpbWl0cygwLCAyNCwgMSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDYpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdDb21wbGV0ZWQgZXZlbnQgZGlzcGxheScpXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0hvdyBjb21wbGV0ZWQgZXZlbnRzIGFwcGVhcicpXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbm9uZScsICdObyBjaGFuZ2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignZGltJywgJ0RpbScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdzdHJpa2V0aHJvdWdoJywgJ1N0cmlrZXRocm91Z2gnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaGlkZScsICdIaWRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID0gdiBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgICAgICAuc2V0TmFtZShgT25seSBhbmltYXRlIHRvZGF5J3MgZXZlbnRzYClcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygnU3RvcCBhbmltYXRpb24gZm9yIGFsbCBldmVudHMgZXhjZXB0IHRvZGF5JylcbiAgICAgICAgICAgICAgICAuYWRkVG9nZ2xlKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mub25seUFuaW1hdGVUb2RheSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnSG9sZGVyIHBsYWNlbWVudCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnUGxhY2UgdGhlIGhvbGRlciB0b2dnbGUgKGxlZnQsIHJpZ2h0LCBvciBoaWRkZW4pJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcbiAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmlnaHQnLCAnUmlnaHQnKVxuICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdoaWRkZW4nLCAnSGlkZGVuJylcbiAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyUGxhY2VtZW50ID0gdiBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgY29udGFpbmVyIGFuZCByZWJ1aWxkXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3Lm9uT3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRW5hYmxlIFdlZWtseSBOb3RlcycpXG4gICAgICAgICAgICAuc2V0RGVzYygnU2hvdyBhIG1hcmtkb3duIG5vdGVzIHNlY3Rpb24gYmVsb3cgdGhlIGNhbGVuZGFyIGluIHdlZWtseSB2aWV3JylcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQgPz8gZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtseU5vdGVzRW5hYmxlZCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ01heCBkYXkgY2VsbCBoZWlnaHQgKHB4KScpXG4gICAgICAgICAgICAuc2V0RGVzYygnSWYgc2V0LCBkYXkgY2VsbHMgY2FwIGF0IHRoaXMgaGVpZ2h0IGFuZCBldmVudHMgc2Nyb2xsIHZlcnRpY2FsbHknKVxuICAgICAgICAgICAgLmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5zZXRQbGFjZWhvbGRlcignMCAoZGlzYWJsZWQpJyk7XG4gICAgICAgICAgICAgICAgdC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF5Q2VsbE1heEhlaWdodCA/PyAwKSk7XG4gICAgICAgICAgICAgICAgdC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodiB8fCAnMCcsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF5Q2VsbE1heEhlaWdodCA9IGlzTmFOKG51bSkgPyAwIDogTWF0aC5tYXgoMCwgbnVtKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS50eXBlID0gJ251bWJlcic7XG4gICAgICAgICAgICAgICAgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS5taW4gPSAnMCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdDb2xvciBzd2F0Y2ggcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdQb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBldmVudCBtb2RhbCcpXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbigndW5kZXItdGl0bGUnLCAnVW5kZXIgdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndW5kZXItZGVzY3JpcHRpb24nLCAnVW5kZXIgZGVzY3JpcHRpb24nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdEbyBub3Qgc2hvdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29sb3JTd2F0Y2hQb3NpdGlvbiA/PyAndW5kZXItdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbG9yU3dhdGNoUG9zaXRpb24gPSB2IGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzd2F0Y2hlc1NlY3Rpb25Ub3AgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgbmV3IFNldHRpbmcoc3dhdGNoZXNTZWN0aW9uVG9wKS5zZXROYW1lKCdDb2xvcnMnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIGNvbnN0IGNvbG9yc0xpc3RUb3AgPSBzd2F0Y2hlc1NlY3Rpb25Ub3AuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IHJlbmRlckNvbG9yc1RvcCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbG9yc0xpc3RUb3AuZW1wdHkoKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbG9yc0xpc3RUb3AuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICByb3cuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5nYXAgPSAnOHB4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xuICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxNnB4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5mbGV4V3JhcCA9ICd3cmFwJztcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnLCBzb3VyY2U6ICdidWlsdCcgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3QgY3VzdG9tcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnLCBzb3VyY2U6ICdjdXN0b20nIGFzIGNvbnN0IH0pKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbWJpbmVkOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yOiBzdHJpbmcsIHNvdXJjZTogJ2J1aWx0J3wnY3VzdG9tJyB9W10gPSBbLi4uYnVpbHQsIC4uLmN1c3RvbXNdO1xuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH0sIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd3JhcCA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5nYXAgPSAnNnB4JztcbiAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9IGVudHJ5LnNvdXJjZTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuaW5kZXggPSBTdHJpbmcoaWR4KTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9IGVudHJ5Lm5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dFBpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xuICAgICAgICAgICAgICAgIHRleHRQaWNrZXIudmFsdWUgPSBlbnRyeS50ZXh0Q29sb3IgfHwgJyNmZmZmZmYnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJnUGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XG4gICAgICAgICAgICAgICAgYmdQaWNrZXIudmFsdWUgPSBlbnRyeS5jb2xvcjtcbiAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVBbGwgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCdWlsdEFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZDdXN0b21BcnIgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUgfHwgJycsIGNvbG9yOiBzLmNvbG9yIHx8ICcjZmYwMDAwJywgdGV4dENvbG9yOiBzLnRleHRDb2xvciB8fCAnJyB9KSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmcgPSAody5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVsxXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4ID0gKHcucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImNvbG9yXCJdJylbMF0gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiBiZywgdGV4dENvbG9yOiB0eCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JNYXA6IFJlY29yZDxzdHJpbmcsIHsgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJldkJ1aWx0QXJyLmxlbmd0aCAmJiBpIDwgbmV3QnVpbHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnVpbHRBcnJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBuZXdCdWlsdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2LmNvbG9yICE9PSBub3cuY29sb3IgfHwgKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5vdy50ZXh0Q29sb3IgfHwgJycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbcHJldi5jb2xvcl0gPSB7IGNvbG9yOiBub3cuY29sb3IsIHRleHRDb2xvcjogbm93LnRleHRDb2xvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJldkN1c3RvbUFyci5sZW5ndGggJiYgaSA8IG5ld0N1c3RvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHByZXZDdXN0b21BcnJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBuZXdDdXN0b21baV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldi5jb2xvciAhPT0gbm93LmNvbG9yIHx8IChwcmV2LnRleHRDb2xvciB8fCAnJykgIT09IChub3cudGV4dENvbG9yIHx8ICcnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW3ByZXYuY29sb3JdID0geyBjb2xvcjogbm93LmNvbG9yLCB0ZXh0Q29sb3I6IG5vdy50ZXh0Q29sb3IgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVkVHJpZ2dlcnMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLm1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LmNvbG9yICYmIGNvbG9yTWFwW3QuY29sb3JdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFwcGVkID0gY29sb3JNYXBbdC5jb2xvcl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgLi4udCwgY29sb3I6IG1hcHBlZC5jb2xvciwgdGV4dENvbG9yOiBtYXBwZWQudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihtYXBwZWQuY29sb3IpIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSB1cGRhdGVkVHJpZ2dlcnM7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2QnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZCdWlsdEFyci5mb3JFYWNoKHMgPT4gcHJldkJ5TmFtZS5zZXQocy5uYW1lLCB7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWlsdC5mb3JFYWNoKG5iID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkJ5TmFtZS5nZXQobmIubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JDaGFuZ2VkID0gcHJldi5jb2xvciAhPT0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dENoYW5nZWQgPSAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobmIudGV4dENvbG9yIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbG9yQ2hhbmdlZCAmJiAhdGV4dENoYW5nZWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZ2JhID0gaGV4VG9SZ2JhKG5iLmNvbG9yLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1jb2xvcj1cIiR7cHJldi5jb2xvcn1cIl1gKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IGVsIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJnLWNvbG9yJywgcmdiYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5kYXRhc2V0LmNvbG9yID0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmhvbGRlckV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZW5kZXJUcmlnZ2VycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGV4dFBpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcbiAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcbiAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcbiAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUFsbCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd3JhcC5vbmRyYWdzdGFydCA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsICdkcmFnJyk7XG4gICAgICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlciBhcyBEYXRhVHJhbnNmZXIpLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByb3cub25kcmFnb3ZlciA9IGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJvcCA9IGFzeW5jIGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0IHx8IHRhcmdldC5wYXJlbnRFbGVtZW50ICE9PSByb3cpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gKGUuY2xpZW50WCAtIHJlY3QubGVmdCkgPCByZWN0LndpZHRoIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZSkgcm93Lmluc2VydEJlZm9yZSh3cmFwLCB0YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIHRhcmdldC5hZnRlcih3cmFwKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JhcDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb21iaW5lZC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7IG1ha2VJdGVtKGVudHJ5LCBpZHgpOyB9KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzQm90dG9tID0gbmV3IFNldHRpbmcoY29sb3JzTGlzdFRvcCk7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuYWRkQ2xhc3MoJ2RheWJsZS1jb2xvcnMtY29udHJvbHMnKTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgICAgICAgICAoY29udHJvbHNCb3R0b20uc2V0dGluZ0VsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtc3RhcnQnO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnUmVzZXQgdG8gZGVmYXVsdCBjb2xvcnMnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnUmVzZXQgY29sb3Igc3dhdGNoZXMgdG8gZGVmYXVsdD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IChERUZBVUxUX1NFVFRJTkdTLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IChzIGFzIGFueSkudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgY29sb3InKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd3JhcCA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5nYXAgPSAnNnB4JztcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zZXRBdHRyKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gJ2N1c3RvbSc7XG4gICAgICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5uYW1lID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHRQaWNrZXIgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBpY2tlci52YWx1ZSA9ICcjZmZmZmZmJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmdQaWNrZXIgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgYmdQaWNrZXIudmFsdWUgPSAnI2ZmMDAwMCc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5ib3hTaGFkb3cgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbihkZWwsICd4Jyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xuICAgICAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgICAgICBkZWwub250b3VjaHN0YXJ0ID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlQWxsID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ1aWx0QXJyID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JzTGlzdFRvcC5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmcgPSAody5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVsxXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eCA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzBdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCeU5hbWUgPSBuZXcgTWFwPHN0cmluZywgeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9PigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZCdWlsdEFyci5mb3JFYWNoKHMgPT4gcHJldkJ5TmFtZS5zZXQocy5uYW1lLCB7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJ0eSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1aWx0LmZvckVhY2gobmIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkJ5TmFtZS5nZXQobmIubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcHJldikgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gcHJldi5jb2xvciAhPT0gbmIuY29sb3IgfHwgKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5iLnRleHRDb2xvciB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hhbmdlZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZ2JhID0gaGV4VG9SZ2JhKG5iLmNvbG9yLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKGAuZGF5YmxlLWV2ZW50W2RhdGEtY29sb3I9XCIke3ByZXYuY29sb3J9XCJdYCkuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoID0gZWwgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJnLWNvbG9yJywgcmdiYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LXRleHQtY29sb3InLCBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmRhdGFzZXQuY29sb3IgPSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuZXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29sb3IgPSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmhvbGRlckV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5jb2xvciA9PT0gcHJldi5jb2xvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbG9yID0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xuICAgICAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXAucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ0V2ZW50IGNhdGVnb3JpZXMnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzV3JhcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCByZW5kZXJSdWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgIHJ1bGVzV3JhcC5lbXB0eSgpO1xuICAgICAgICAgICAgKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXSkuZm9yRWFjaCgoY2F0ZWdvcnk6IEV2ZW50Q2F0ZWdvcnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBuZXcgU2V0dGluZyhydWxlc1dyYXApO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgbGVmdC1zaWRlIHNldHRpbmcgdGl0bGUgZWxlbWVudFxuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwucXVlcnlTZWxlY3RvcignLnNldHRpbmctaXRlbS1uYW1lJyk/LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICAocm93LnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ3JpZFRlbXBsYXRlQ29sdW1ucyA9ICd1bnNldCc7XG4gICAgICAgICAgICAgICAgcm93LmNvbnRyb2xFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgICAgIChyb3cuY29udHJvbEVsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5nYXAgPSAnOHB4JztcbiAgICAgICAgICAgICAgICByb3cuY29udHJvbEVsLnN0eWxlLmZsZXggPSAnMSc7XG4gICAgICAgICAgICAgICAgcm93LnNldHRpbmdFbC5jbGFzc0xpc3QuYWRkKCdkYi1jYXRlZ29yeS1yb3cnKTtcbiAgICAgICAgICAgICAgICAvLyBJY29uIGJ1dHRvblxuICAgICAgICAgICAgICAgIHJvdy5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIChiLmJ1dHRvbkVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYXlibGUtYnRuJywnZGF5YmxlLWljb24tYWRkJywnZGItYnRuJyk7XG4gICAgICAgICAgICAgICAgICAgIHNldEljb24oYi5idXR0b25FbCwgY2F0ZWdvcnkuaWNvbiA/PyAncGx1cycpO1xuICAgICAgICAgICAgICAgICAgICBiLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGlja2VyID0gbmV3IEljb25QaWNrZXJNb2RhbCh0aGlzLmFwcCwgYXN5bmMgKGljb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5pY29uID0gaWNvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUnVsZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5pY29uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwaWNrZXIub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBDYXRlZ29yeSBuYW1lIGlucHV0XG4gICAgICAgICAgICAgICAgcm93LmFkZFRleHQodCA9PiB7IHQuc2V0VmFsdWUoY2F0ZWdvcnkubmFtZSkub25DaGFuZ2UodiA9PiB7IGNhdGVnb3J5Lm5hbWUgPSB2OyB9KTsgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1pbnB1dCcsJ2RiLWNhdGVnb3J5LW5hbWUnKTsgfSk7XG4gICAgICAgICAgICAgICAgLy8gVGV4dCBjb2xvciBmaXJzdFxuICAgICAgICAgICAgICAgIHJvdy5hZGRDb2xvclBpY2tlcihjcCA9PiB7IGNwLnNldFZhbHVlKGNhdGVnb3J5LnRleHRDb2xvcikub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS50ZXh0Q29sb3IgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGNwIGFzIGFueSkuaW5wdXRFbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWNvbG9yJywnZGItdGV4dC1jb2xvcicpOyB9KTtcbiAgICAgICAgICAgICAgICAvLyBCYWNrZ3JvdW5kIGNvbG9yIG5leHRcbiAgICAgICAgICAgICAgICByb3cuYWRkQ29sb3JQaWNrZXIoY3AgPT4geyBjcC5zZXRWYWx1ZShjYXRlZ29yeS5iZ0NvbG9yKS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LmJnQ29sb3IgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGNwIGFzIGFueSkuaW5wdXRFbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWNvbG9yJywnZGItYmctY29sb3InKTsgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGVmZmVjdCcsXG4gICAgICAgICAgICAgICAgICAgICdzdHJpcGVkLTEnOiAnU3RyaXBlZCAoNDXCsCknLFxuICAgICAgICAgICAgICAgICAgICAnc3RyaXBlZC0yJzogJ1N0cmlwZWQgKC00NcKwKScsXG4gICAgICAgICAgICAgICAgICAgICd2ZXJ0aWNhbC1zdHJpcGVzJzogJ1ZlcnRpY2FsIHN0cmlwZXMnLFxuICAgICAgICAgICAgICAgICAgICAndGhpbi10ZXh0dXJlZC1zdHJpcGVzJzogJ1RoaW4gdGV4dHVyZWQgc3RyaXBlcycsXG4gICAgICAgICAgICAgICAgICAgICdjcm9zc2hhdGNoZWQnOiAnQ3Jvc3NoYXRjaGVkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2NoZWNrZXJib2FyZCc6ICdDaGVja2VyYm9hcmQnLFxuICAgICAgICAgICAgICAgICAgICAnaGV4YWJvYXJkJzogJ0hleGFib2FyZCcsXG4gICAgICAgICAgICAgICAgICAgICd3YXZ5LWxpbmVzJzogJ1dhdnkgbGluZXMnLFxuICAgICAgICAgICAgICAgICAgICAnZG90dGVkJzogJ0RvdHRlZCcsXG4gICAgICAgICAgICAgICAgICAgICdhcmd5bGUnOiAnQXJneWxlJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VtYm9zc2VkJzogJ0VtYm9zc2VkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzJzogJ0dsYXNzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3cnOiAnR2xvdycsXG4gICAgICAgICAgICAgICAgICAgICdyZXRyby1idXR0b24nOiAnUmV0cm8gYnV0dG9uJ1xuICAgICAgICAgICAgICAgIH0pLnNldFZhbHVlKGNhdGVnb3J5LmVmZmVjdCkub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5lZmZlY3QgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWVmZmVjdCcpOyB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gYW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtaG9yaXpvbnRhbGx5JzogJ01vdmUgaG9yaXpvbnRhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtdmVydGljYWxseSc6ICdNb3ZlIHZlcnRpY2FsbHknLFxuICAgICAgICAgICAgICAgICAgICAncGFydGljbGVzJzogJ1BhcnRpY2xlcycsXG4gICAgICAgICAgICAgICAgICAgICdzbm93LWZhbGxpbmcnOiAnU25vdyBmYWxsaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FuaW1hdGVkLWdyYWRpZW50JzogJ0FuaW1hdGVkIGdyYWRpZW50JyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzLXNoaW5lJzogJ0dsYXNzIHNoaW5lJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3dpbmcnOiAnR2xvd2luZydcbiAgICAgICAgICAgICAgICB9KS5zZXRWYWx1ZShjYXRlZ29yeS5hbmltYXRpb24pLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYW5pbWF0aW9uID0gdjsgXG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24nKTsgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGFuaW1hdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLWhvcml6b250YWxseSc6ICdNb3ZlIGhvcml6b250YWxseScsXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLXZlcnRpY2FsbHknOiAnTW92ZSB2ZXJ0aWNhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2xlcyc6ICdQYXJ0aWNsZXMnLFxuICAgICAgICAgICAgICAgICAgICAnc25vdy1mYWxsaW5nJzogJ1Nub3cgZmFsbGluZycsXG4gICAgICAgICAgICAgICAgICAgICdhbmltYXRlZC1ncmFkaWVudCc6ICdBbmltYXRlZCBncmFkaWVudCcsXG4gICAgICAgICAgICAgICAgICAgICdnbGFzcy1zaGluZSc6ICdHbGFzcyBzaGluZScsXG4gICAgICAgICAgICAgICAgICAgICdnbG93aW5nJzogJ0dsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSkuc2V0VmFsdWUoY2F0ZWdvcnkuYW5pbWF0aW9uMikub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5hbmltYXRpb24yID0gdjsgXG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24yJyk7IH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGRFeHRyYUJ1dHRvbihidG4gPT4geyBidG4uc2V0SWNvbigneCcpLnNldFRvb2x0aXAoJ0RlbGV0ZScpLm9uQ2xpY2soKCkgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdKS5maWx0ZXIoYyA9PiBjLmlkICE9PSBjYXRlZ29yeS5pZCk7IHJlbmRlclJ1bGVzKCk7IH0pOyAoYnRuIGFzIGFueSkuZXh0cmFCdXR0b25FbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWJ0bicsJ2RiLWRlbGV0ZS1jYXRlZ29yeScpOyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIEFkZCBjYXRlZ29yeScpO1xuICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLmFkZENsYXNzKCdtb2QtY3RhJyk7XG4gICAgICAgICAgICBiLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5OiBFdmVudENhdGVnb3J5ID0geyBpZDogcmFuZG9tSWQoKSwgbmFtZTogJ05ldyBjYXRlZ29yeScsIGJnQ29sb3I6ICcjODM5MmE0JywgdGV4dENvbG9yOiAnI2ZmZmZmZicsIGVmZmVjdDogJ2VtYm9zc2VkJywgYW5pbWF0aW9uOiAnJywgYW5pbWF0aW9uMjogJycsIGljb246IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmNvbmNhdChjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgcmVuZGVyUnVsZXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVuZGVyUnVsZXMoKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnVHJpZ2dlcnMnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIGNvbnN0IHRyaWdnZXJzV3JhcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCByZW5kZXJUcmlnZ2VycyA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyaWdnZXJzV3JhcC5lbXB0eSgpO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IHN3YXRjaGVzID0gW1xuICAgICAgICAgICAgICAgIC4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSksXG4gICAgICAgICAgICAgICAgLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSlcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKCh0ciwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gbmV3IFNldHRpbmcodHJpZ2dlcnNXcmFwKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZXR0aW5nLWl0ZW0tbmFtZScpPy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLXRyaWdnZXJzLXJvdycpO1xuICAgICAgICAgICAgICAgIHJvdy5jb250cm9sRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICAocm93LmNvbnRyb2xFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmZsZXggPSAnMSc7XG4gICAgICAgICAgICAgICAgcm93LmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHQuc2V0UGxhY2Vob2xkZXIoJ1RleHQgaW4gdGl0bGUgb3IgZGVzY3JpcHRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0ci5wYXR0ZXJuKTtcbiAgICAgICAgICAgICAgICAgICAgdC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0ucGF0dGVybiA9IHYgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLWlucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICh0LmlucHV0RWwgYXMgSFRNTElucHV0RWxlbWVudCkuc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCcnLCAnRGVmYXVsdCBjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgICAgICBjYXRzLmZvckVhY2goYyA9PiBkLmFkZE9wdGlvbihjLmlkLCBjLm5hbWUpKTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRWYWx1ZSh0ci5jYXRlZ29yeUlkIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgZC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0uY2F0ZWdvcnlJZCA9IHYgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnKTtcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnN0eWxlLndpZHRoID0gJzkwcHgnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJycsICdEZWZhdWx0IGNvbG9yJyk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXRjaGVzLmZvckVhY2gocyA9PiBkLmFkZE9wdGlvbihzLmNvbG9yLCAnQ29sb3InKSk7XG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VmFsdWUodHIuY29sb3IgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICBkLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGl0ZW1zW2lkeF0uY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGl0ZW1zW2lkeF0udGV4dENvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gdik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS5jb2xvciA9IHMuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0udGV4dENvbG9yID0gcy50ZXh0Q29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlDb2xvclN0eWxlcygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3R5bGUgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFwcGx5Q29sb3JTdHlsZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZFN3YXRjaCA9IHN3YXRjaGVzLmZpbmQoc3cgPT4gc3cuY29sb3IgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0eWxlIHRoZSBzZWxlY3QgZWxlbWVudCBpdHNlbGZcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZFN3YXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBzZWxlY3RlZFN3YXRjaC5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuc3R5bGUuY29sb3IgPSBzZWxlY3RlZFN3YXRjaC50ZXh0Q29sb3IgfHwgJyMwMDAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnN0eWxlLmNvbG9yID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0eWxlIHRoZSBvcHRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBBcnJheS5mcm9tKGQuc2VsZWN0RWwub3B0aW9ucykuZm9yRWFjaChvcHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0LnZhbHVlKSByZXR1cm47IC8vIFNraXAgZGVmYXVsdCBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gb3B0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcy5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0LnN0eWxlLmNvbG9yID0gcy50ZXh0Q29sb3IgfHwgJyMwMDAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICAgICAgYXBwbHlDb2xvclN0eWxlcygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnN0eWxlLm1heFdpZHRoID0gJzEyMHB4JztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRXh0cmFCdXR0b24oYnRuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnRuLnNldEljb24oJ3gnKS5zZXRUb29sdGlwKCdEZWxldGUnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBpdGVtcy5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGlkeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHVwZGF0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBuZXcgU2V0dGluZyh0cmlnZ2Vyc1dyYXApLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgQWRkIHRyaWdnZXInKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbXMyID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzIHx8IFtdKS5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICBpdGVtczIucHVzaCh7IHBhdHRlcm46ICcnLCBjYXRlZ29yeUlkOiAnJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtczI7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG5cbiAgICAgICAgLy8gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnQ3VzdG9tIFN3YXRjaGVzJyB9KTtcbiAgICAgICAgY29uc3Qgc3dhdGNoZXNTZWN0aW9uID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIChzd2F0Y2hlc1NlY3Rpb24gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbilcbiAgICAgICAgICAgIC8vIC5zZXROYW1lKCdFbmFibGUgQ3VzdG9tIFN3YXRjaGVzJylcbiAgICAgICAgICAgIC8vIC5zZXREZXNjKCdJZiBvbiwgeW91ciBjdXN0b20gc3dhdGNoZXMgd2lsbCBhcHBlYXIgaW4gdGhlIGNvbG9yIHBpY2tlci4nKVxuICAgICAgICAgICAgLy8gLmFkZFRvZ2dsZSh0ID0+IHtcbiAgICAgICAgICAgIC8vICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA/PyBmYWxzZSlcbiAgICAgICAgICAgIC8vICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA9IHY7XG4gICAgICAgICAgICAvLyAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgLy8gICAgICB9KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbikuc2V0TmFtZSgnQ29sb3JzJykuc2V0SGVhZGluZygpO1xuICAgICAgICBjb25zdCBjb2xvcnNMaXN0ID0gc3dhdGNoZXNTZWN0aW9uLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCByZW5kZXJDb2xvcnMgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb2xvcnNMaXN0LmVtcHR5KCk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb2xvcnNMaXN0LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgICAgICAgICByb3cuc3R5bGUuYWxpZ25JdGVtcyA9ICdmbGV4LXN0YXJ0JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMTZweCc7XG4gICAgICAgICAgICByb3cuc3R5bGUuZmxleFdyYXAgPSAnd3JhcCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBvbGQgc3dhdGNoZXMgdG8gZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIGNvbnN0IG9sZEJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCBzb3VyY2U6ICdidWlsdCcgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3Qgb2xkQ3VzdG9tcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCBzb3VyY2U6ICdjdXN0b20nIGFzIGNvbnN0IH0pKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZENvbWJpbmVkOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH1bXSA9IFsuLi5vbGRCdWlsdCwgLi4ub2xkQ3VzdG9tc107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0ID0gb2xkQnVpbHQ7XG4gICAgICAgICAgICBjb25zdCBjdXN0b21zID0gb2xkQ3VzdG9tcztcbiAgICAgICAgICAgIGNvbnN0IGNvbWJpbmVkID0gb2xkQ29tYmluZWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1ha2VJdGVtID0gKGVudHJ5OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH0sIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd3JhcCA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5nYXAgPSAnNnB4JztcbiAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9IGVudHJ5LnNvdXJjZTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuaW5kZXggPSBTdHJpbmcoaWR4KTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9IGVudHJ5Lm5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IGVudHJ5LmNvbG9yO1xuICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKHcucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGNvbG9yIG1hcHBpbmcgZnJvbSBvbGQgdG8gbmV3IGJhc2VkIG9uIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yTWFwOiB7IFtvbGRDb2xvcjogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcCBidWlsdCBzd2F0Y2hlc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZEJ1aWx0Lmxlbmd0aCAmJiBpIDwgbmV3QnVpbHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbGRCdWlsdFtpXS5jb2xvciAhPT0gbmV3QnVpbHRbaV0uY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvck1hcFtvbGRCdWlsdFtpXS5jb2xvcl0gPSBuZXdCdWlsdFtpXS5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIGN1c3RvbSBzd2F0Y2hlc1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZEN1c3RvbXMubGVuZ3RoICYmIGkgPCBuZXdDdXN0b20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbGRDdXN0b21zW2ldLmNvbG9yICE9PSBuZXdDdXN0b21baV0uY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvck1hcFtvbGRDdXN0b21zW2ldLmNvbG9yXSA9IG5ld0N1c3RvbVtpXS5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGFueSB0cmlnZ2VycyB1c2luZyBjb2xvcnMgdGhhdCBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyaWdnZXJzID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzIHx8IFtdKS5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICB0cmlnZ2Vycy5mb3JFYWNoKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHQuY29sb3IgJiYgY29sb3JNYXBbdC5jb2xvcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDb2xvclZhbHVlID0gY29sb3JNYXBbdC5jb2xvcl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyB1cGRhdGUgdGhlIHRleHRDb2xvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbFN3YXRjaGVzID0gWy4uLm5ld0J1aWx0LCAuLi5uZXdDdXN0b21dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kU3dhdGNoID0gYWxsU3dhdGNoZXMuZmluZChzID0+IHMuY29sb3IgPT09IG5ld0NvbG9yVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuY29sb3IgPSBuZXdDb2xvclZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZFN3YXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSB0ZXh0Q29sb3IgZnJvbSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFN3YXRjaCA9IFsuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLCAuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzIHx8IFtdKV0uZmluZChzID0+IHMuY29sb3IgPT09IG5ld0NvbG9yVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxTd2F0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGV4dENvbG9yID0gKG9yaWdpbmFsU3dhdGNoIGFzIGFueSkudGV4dENvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSB0cmlnZ2VycztcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcbiAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcbiAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcbiAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICh3LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdyYXAub25kcmFnc3RhcnQgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCAnZHJhZycpO1xuICAgICAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIgYXMgRGF0YVRyYW5zZmVyKS5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ292ZXIgPSBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9O1xuICAgICAgICAgICAgICAgIHJvdy5vbmRyb3AgPSBhc3luYyBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQucGFyZW50RWxlbWVudCAhPT0gcm93KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IChlLmNsaWVudFggLSByZWN0LmxlZnQpIDwgcmVjdC53aWR0aCAvIDI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHJvdy5pbnNlcnRCZWZvcmUod3JhcCwgdGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSAody5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JhcDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb21iaW5lZC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7IG1ha2VJdGVtKGVudHJ5LCBpZHgpOyB9KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzQm90dG9tID0gbmV3IFNldHRpbmcoc3dhdGNoZXNTZWN0aW9uKTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbC5zdHlsZS5ib3JkZXJUb3AgPSAnbm9uZSc7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdSZXNldCB0byBkZWZhdWx0IGNvbG9ycycpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdSZXNldCBjb2xvciBzd2F0Y2hlcyB0byBkZWZhdWx0PycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gKERFRkFVTFRfU0VUVElOR1Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogKHMgYXMgYW55KS50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbG9ycygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgY29sb3InKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkuc2xpY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6ICcjZmYwMDAwJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29sb3JzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLm1hcmdpbkxlZnQgPSAnYXV0byc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdEYXRhIG1hbmFnZW1lbnQnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0V4cG9ydCBkYXRhJylcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdFeHBvcnQgZGF0YScpXG4gICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhdWx0TmFtZSA9ICh0aGlzLmFwcC52YXVsdCBhcyBhbnkpPy5nZXROYW1lPy4oKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyBhbnkpPy5iYXNlUGF0aD8uc3BsaXQoL1tcXFxcL10vKS5maWx0ZXIoQm9vbGVhbikucG9wKCkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgJ1ZhdWx0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cG9ydE9iajogYW55ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhdWx0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHRoaXMucGx1Z2luLnNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbnRoczogW10gYXMgQXJyYXk8eyBmaWxlOiBzdHJpbmcsIGRhdGE6IGFueSB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgfHwgJ0RheWJsZUNhbGVuZGFyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gKGxpc3RpbmcuZmlsZXMgfHwgW10pLmZpbHRlcigoZjogc3RyaW5nKSA9PiBmLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5qc29uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eHQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydE9iai5tb250aHMucHVzaCh7IGZpbGU6IGYsIGRhdGEgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgZmlsZSBzYXZlIGRpYWxvZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBgRGF5YmxlRXhwb3J0XyR7dmF1bHROYW1lfV8ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydE9iaiwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIGRvd25sb2FkIGxpbmsgYW5kIHRyaWdnZXIgc2F2ZSBkaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2pzb25TdHJdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmsuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwobGluay5ocmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRXhwb3J0IHJlYWR5OiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFeHBvcnQgZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnSW1wb3J0IGRhdGEnKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ0ltcG9ydCBkYXRhJylcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LmFjY2VwdCA9ICdhcHBsaWNhdGlvbi9qc29uLC5qc29uJztcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gaW5wdXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZmlsZS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqPy5zZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIG9iai5zZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmo/Lm1vbnRocykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciB8fCAnRGF5YmxlQ2FsZW5kYXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfSBjYXRjaCB7IHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXIpOyB9IGNhdGNoIHt9IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBtIG9mIG9iai5tb250aHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0eXBlb2YgbS5maWxlID09PSAnc3RyaW5nJyA/IG0uZmlsZSA6IGAke2ZvbGRlcn0vSW1wb3J0ZWRfJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkobS5kYXRhID8/IHt9LCBudWxsLCAyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7IGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTsgdmlldy5yZW5kZXIoKTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ltcG9ydCBjb21wbGV0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgdGhlIHBsdWdpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBsdWdpbk1hbmFnZXIgPSAodGhpcy5wbHVnaW4uYXBwIGFzIGFueSkucGx1Z2lucztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGx1Z2luTWFuYWdlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwbHVnaW5NYW5hZ2VyLmRpc2FibGVQbHVnaW4odGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwbHVnaW5NYW5hZ2VyLmVuYWJsZVBsdWdpbih0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ltcG9ydCBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59XG5mdW5jdGlvbiByYW5kb21JZCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFueUNyeXB0byA9ICh3aW5kb3cgYXMgYW55KS5jcnlwdG87XG4gICAgaWYgKGFueUNyeXB0bz8ucmFuZG9tVVVJRCkgcmV0dXJuIGFueUNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgcmV0dXJuICdldi0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyAnLScgKyBEYXRlLm5vdygpO1xufVxuIl19