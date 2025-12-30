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
            this.addCommand({ id: 'open-dayble-calendar', name: 'Open Dayble Calendar', callback: () => this.openDayble() });
            this.addCommand({ id: 'dayble-focus-today', name: 'Focus on Today', callback: () => this.focusToday() });
            this.addCommand({
                id: 'dayble-open-weekly-view',
                name: 'Open Weekly View',
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
                id: 'dayble-open-monthly-view',
                name: 'Open Monthly View',
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
        this.app.workspace.detachLeavesOfType(VIEW_TYPE);
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
        this._boundHolderMouseMove = (e) => { };
        this._boundHolderMouseUp = (e) => { };
        this.draggedEvent = null;
        this.isResizingWeeklyNotes = false;
        this.weeklyNotesResizeStartY = 0;
        this.weeklyNotesResizeStartHeight = 0;
        this._boundWeeklyNotesMouseMove = (e) => { };
        this._boundWeeklyNotesMouseUp = (e) => { };
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
            for (const filename of files) {
                const file = `${this.plugin.settings.entriesFolder}/${filename}`;
                try {
                    const json = yield this.app.vault.adapter.read(file);
                    const data = JSON.parse(json);
                    // Merge events
                    if (data.events) {
                        this.events.push(...data.events);
                    }
                    // Only load holder and weekly notes from the primary current file to avoid duplication/conflicts
                    if (filename === currentFile) {
                        this.holderEvents = data.holder || [];
                        this.weeklyNotes = data.weeklyNotes || {};
                    }
                }
                catch (e) {
                    // Silently skip if file doesn't exist or can't be read
                }
            }
            // Deduplicate events just in case (though should not happen if files are distinct partitions)
            const seen = new Set();
            this.events = this.events.filter(e => {
                const duplicate = seen.has(e.id);
                seen.add(e.id);
                return !duplicate;
            });
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
                if (isCurrent) {
                    holderToSave = this.holderEvents;
                    notesToSave = this.weeklyNotes;
                }
                else {
                    // Read file to get existing holder/notes
                    try {
                        if (yield this.app.vault.adapter.exists(file)) {
                            const json = yield this.app.vault.adapter.read(file);
                            const data = JSON.parse(json);
                            holderToSave = data.holder || [];
                            notesToSave = data.weeklyNotes || {};
                        }
                    }
                    catch (e) {
                        // Ignore error, maybe new file
                    }
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
        });
    }
    focusToday() {
        this.currentDate = new Date();
        this.loadAllEntries().then(() => this.render());
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
        this.loadAllEntries().then(() => this.render());
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
                            this.loadAllEntries().then(() => this.render());
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
                                this.loadAllEntries().then(() => this.render());
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
                const h4 = header.createEl('h4', { text: 'Weekly Notes' });
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
        });
    }
    renderMonthView(titleEl) {
        var _a;
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
            if (((_a = this.plugin.settings.dayCellMaxHeight) !== null && _a !== void 0 ? _a : 0) > 0) {
                requestAnimationFrame(() => {
                    var _a;
                    const maxH = (_a = this.plugin.settings.dayCellMaxHeight) !== null && _a !== void 0 ? _a : 0;
                    if (maxH > 0) {
                        const headH = dayHeader.offsetHeight || 0;
                        const longH = longContainer.offsetHeight || 0;
                        const rest = Math.max(24, maxH - headH - longH - 8);
                        cell.style.maxHeight = `${maxH}px`;
                        cell.style.overflow = 'hidden';
                        container.style.maxHeight = `${rest}px`;
                        container.style.overflowY = 'auto';
                        container.classList.add('dayble-scrollable');
                    }
                });
            }
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
            }), () => __awaiter(this, void 0, void 0, function* () { }), () => __awaiter(this, void 0, void 0, function* () {
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
            console.log('[Dayble] Drag started on event:', ev.id);
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
                this.saveAllEntries().then(() => this.render());
            }));
            menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                ev.completed = !ev.completed;
                this.saveAllEntries().then(() => this.render());
            }));
            menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                this.events = this.events.filter(e2 => e2.id !== ev.id);
                this.saveAllEntries().then(() => this.render());
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
            del.onclick = () => this.onDelete().then(() => this.close());
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
            Promise.resolve(this.onSubmit(payload)).then(() => {
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
                            this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
                        }
                    }));
                    menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                        ev.completed = !ev.completed;
                        if (this.view)
                            this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
                    }));
                    menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                        if (this.view) {
                            this.view.events = this.view.events.filter(e2 => e2.id !== ev.id);
                            this.view.saveAllEntries().then(() => { var _a; return (_a = this.view) === null || _a === void 0 ? void 0 : _a.render(); });
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
    const api = (apiName) => { var _a, _b; return (_b = (_a = require === null || require === void 0 ? void 0 : require('obsidian')) === null || _a === void 0 ? void 0 : _a[apiName]) !== null && _b !== void 0 ? _b : anyOb === null || anyOb === void 0 ? void 0 : anyOb[apiName]; };
    const ids = api('getIconIds');
    if (typeof ids === 'function')
        return ids();
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
        .replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (match, alt, src) => {
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
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="dayble-external-link">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
    element.innerHTML = html;
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
        containerEl.createEl('h1', { text: 'Dayble Calendar' });
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
            b.setButtonText(((_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim()) ? this.plugin.settings.entriesFolder : 'unset')
                .onClick(() => {
                const folders = this.app.vault.getAllFolders()
                    .map(f => f.path)
                    .sort();
                const FuzzySuggest = require('obsidian').FuzzySuggestModal;
                const suggest = new FuzzySuggest(this.app);
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
                    b.setButtonText(((_a = this.plugin.settings.entriesFolder) === null || _a === void 0 ? void 0 : _a.trim()) ? this.plugin.settings.entriesFolder : 'unset');
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
        containerEl.createEl('h3', { text: 'Appearance' });
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
            .setDesc('Place the Holder toggle (left, right, or hidden)')
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
        const colorsTitleTop = swatchesSectionTop.createEl('h3', { text: 'Colors' });
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
                b.setButtonText('Reset to Default Colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
                b.setButtonText('+ Add Color').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
        containerEl.createEl('h4', { text: 'Event Categories' });
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
                        this.plugin.saveSettings().then(() => {
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
                        this.plugin.saveSettings().then(() => {
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
                        'vertical-stripes': 'Vertical Stripes',
                        'thin-textured-stripes': 'Thin Textured Stripes',
                        'crosshatched': 'Crosshatched',
                        'checkerboard': 'Checkerboard',
                        'hexaboard': 'Hexaboard',
                        'wavy-lines': 'Wavy Lines',
                        'dotted': 'Dotted',
                        'argyle': 'Argyle',
                        'embossed': 'Embossed',
                        'glass': 'Glass',
                        'glow': 'Glow',
                        'retro-button': 'Retro Button'
                    }).setValue(category.effect).onChange(v => {
                        category.effect = v;
                        this.plugin.saveSettings().then(() => {
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
                        'move-horizontally': 'Move Horizontally',
                        'move-vertically': 'Move Vertically',
                        'particles': 'Particles',
                        'snow-falling': 'Snow Falling',
                        'animated-gradient': 'Animated Gradient',
                        'glass-shine': 'Glass Shine',
                        'glowing': 'Glowing'
                    }).setValue(category.animation).onChange(v => {
                        category.animation = v;
                        this.plugin.saveSettings().then(() => {
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
                        'move-horizontally': 'Move Horizontally',
                        'move-vertically': 'Move Vertically',
                        'particles': 'Particles',
                        'snow-falling': 'Snow Falling',
                        'animated-gradient': 'Animated Gradient',
                        'glass-shine': 'Glass Shine',
                        'glowing': 'Glowing'
                    }).setValue(category.animation2).onChange(v => {
                        category.animation2 = v;
                        this.plugin.saveSettings().then(() => {
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
            b.setButtonText('+ Add Category');
            b.buttonEl.addClass('mod-cta');
            b.onClick(() => __awaiter(this, void 0, void 0, function* () {
                const category = { id: randomId(), name: 'New Category', bgColor: '#8392a4', textColor: '#ffffff', effect: 'embossed', animation: '', animation2: '', icon: undefined };
                this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).concat(category);
                yield this.plugin.saveSettings();
                renderRules();
            }));
        });
        renderRules();
        const triggersTitle = containerEl.createEl('h4', { text: 'Triggers' });
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
                    d.addOption('', 'Default Category');
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
                    d.addOption('', 'Default Color');
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
                b.setButtonText('+ Add Trigger').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
        const colorsTitle = swatchesSection.createEl('h3', { text: 'Colors' });
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
                    const oldColor = entry.color; // Store the old color before collecting new ones
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
                b.setButtonText('Reset to Default Colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
                b.setButtonText('+ Add Color').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
        containerEl.createEl('h4', { text: 'Data Management' });
        new obsidian_1.Setting(containerEl)
            .setName('Export Data')
            .addButton(b => {
            b.setButtonText('Export Data')
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
            .setName('Import Data')
            .addButton(b => {
            b.setButtonText('Import Data')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBa0w7QUFFbEwsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUM7QUFrQ3pDLE1BQU0sZ0JBQWdCLEdBQW1CO0lBQ3JDLFlBQVksRUFBRSxDQUFDO0lBQ2YsYUFBYSxFQUFFLEVBQUU7SUFDakIsYUFBYSxFQUFFLE1BQU07SUFDckIsZUFBZSxFQUFFLFFBQVE7SUFDekIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsaUJBQWlCLEVBQUUsQ0FBQztJQUNwQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLG1CQUFtQixFQUFFLGFBQWE7SUFDbEMsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsc0JBQXNCLEVBQUUsS0FBSztJQUM3QixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixlQUFlLEVBQUUsTUFBTTtJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsUUFBUSxFQUFFO1FBQ04sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN2RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDekQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUM5RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDMUQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUMzRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO0tBQzNEO0lBQ0Qsa0JBQWtCLEVBQUUsRUFBRTtJQUN0QixlQUFlLEVBQUUsRUFBRTtJQUNuQixRQUFRLEVBQUUsRUFBRTtDQUNmLENBQUM7QUE4QkYs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SUFDaEYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNuQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDeEUsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDdEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7V0FDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUM7V0FDaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEUsSUFBSSxLQUFLO1FBQUUsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLFFBQWdCO0lBQy9DLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFD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Q0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIEl0ZW1WaWV3LCBNb2RhbCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24sIE1lbnUsIFRGaWxlLCBNYXJrZG93blJlbmRlcmVyLCBNYXJrZG93blJlbmRlckNoaWxkLCBDb21wb25lbnQgfSBmcm9tICdvYnNpZGlhbic7XHJcblxyXG5jb25zdCBWSUVXX1RZUEUgPSAnZGF5YmxlLWNhbGVuZGFyLXZpZXcnO1xyXG5cclxuaW50ZXJmYWNlIERheWJsZVNldHRpbmdzIHtcclxuICAgIHdlZWtTdGFydERheTogbnVtYmVyO1xyXG4gICAgZW50cmllc0ZvbGRlcjogc3RyaW5nO1xyXG4gICAgaWNvblBsYWNlbWVudD86ICdsZWZ0JyB8ICdyaWdodCcgfCAnbm9uZScgfCAndG9wJyB8ICd0b3AtbGVmdCcgfCAndG9wLXJpZ2h0JztcclxuICAgIGV2ZW50VGl0bGVBbGlnbj86ICdsZWZ0JyB8ICdjZW50ZXInIHwgJ3JpZ2h0JztcclxuICAgIGV2ZW50RGVzY0FsaWduPzogJ2xlZnQnIHwgJ2NlbnRlcicgfCAncmlnaHQnO1xyXG4gICAgdGltZUZvcm1hdD86ICcyNGgnIHwgJzEyaCc7XHJcbiAgICBob2xkZXJPcGVuPzogYm9vbGVhbjtcclxuICAgIGhvbGRlcldpZHRoPzogbnVtYmVyOyAvLyBpbiBwaXhlbHNcclxuICAgIHdlZWtseU5vdGVzSGVpZ2h0PzogbnVtYmVyOyAvLyBpbiBwaXhlbHNcclxuICAgIGV2ZW50Q2F0ZWdvcmllcz86IEV2ZW50Q2F0ZWdvcnlbXTtcclxuICAgIHByZWZlclVzZXJDb2xvcnM/OiBib29sZWFuOyAvLyBwcmVmZXIgdXNlci1zZXQgZXZlbnQgY29sb3JzIG92ZXIgY2F0ZWdvcnkgY29sb3JzXHJcbiAgICBldmVudEJnT3BhY2l0eT86IG51bWJlcjsgLy8gMC0xLCBjb250cm9scyBiYWNrZ3JvdW5kIG9wYWNpdHlcclxuICAgIGV2ZW50Qm9yZGVyV2lkdGg/OiBudW1iZXI7IC8vIDAtNXB4LCBjb250cm9scyBib3JkZXIgdGhpY2tuZXNzXHJcbiAgICBldmVudEJvcmRlclJhZGl1cz86IG51bWJlcjsgLy8gcHgsIGNvbnRyb2xzIGJvcmRlciByYWRpdXNcclxuICAgIGV2ZW50Qm9yZGVyT3BhY2l0eT86IG51bWJlcjsgLy8gMC0xLCBjb250cm9scyBib3JkZXIgY29sb3Igb3BhY2l0eSAoZm9yIGNvbG9yZWQgZXZlbnRzKVxyXG4gICAgY29sb3JTd2F0Y2hQb3NpdGlvbj86ICd1bmRlci10aXRsZScgfCAndW5kZXItZGVzY3JpcHRpb24nIHwgJ25vbmUnOyAvLyBwb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBtb2RhbFxyXG4gICAgb25seUFuaW1hdGVUb2RheT86IGJvb2xlYW47XHJcbiAgICBjb21wbGV0ZUJlaGF2aW9yPzogJ25vbmUnIHwgJ2RpbScgfCAnc3RyaWtldGhyb3VnaCcgfCAnaGlkZSc7XHJcbiAgICBjdXN0b21Td2F0Y2hlc0VuYWJsZWQ/OiBib29sZWFuO1xyXG4gICAgcmVwbGFjZURlZmF1bHRTd2F0Y2hlcz86IGJvb2xlYW47XHJcbiAgICBzd2F0Y2hlcz86IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdO1xyXG4gICAgdXNlckN1c3RvbVN3YXRjaGVzPzogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W107XHJcbiAgICBkZWZhdWx0Q29sb3JzRm9sZGVkPzogYm9vbGVhbjtcclxuICAgIGN1c3RvbVN3YXRjaGVzRm9sZGVkPzogYm9vbGVhbjtcclxuICAgIGRheUNlbGxNYXhIZWlnaHQ/OiBudW1iZXI7XHJcbiAgICBob2xkZXJQbGFjZW1lbnQ/OiAnbGVmdCcgfCAncmlnaHQnIHwgJ2hpZGRlbic7XHJcbiAgICBjYWxlbmRhcldlZWtBY3RpdmU/OiBib29sZWFuO1xyXG4gICAgdHJpZ2dlcnM/OiB7IHBhdHRlcm46IHN0cmluZywgY2F0ZWdvcnlJZDogc3RyaW5nLCBjb2xvcj86IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXTtcclxuICAgIHdlZWtseU5vdGVzRW5hYmxlZD86IGJvb2xlYW47XHJcbn0gXHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBEYXlibGVTZXR0aW5ncyA9IHtcclxuICAgIHdlZWtTdGFydERheTogMCxcclxuICAgIGVudHJpZXNGb2xkZXI6ICcnLFxyXG4gICAgaWNvblBsYWNlbWVudDogJ2xlZnQnLFxyXG4gICAgZXZlbnRUaXRsZUFsaWduOiAnY2VudGVyJyxcclxuICAgIGV2ZW50RGVzY0FsaWduOiAnY2VudGVyJyxcclxuICAgIHRpbWVGb3JtYXQ6ICcyNGgnLFxyXG4gICAgaG9sZGVyT3BlbjogdHJ1ZSxcclxuICAgIHdlZWtseU5vdGVzSGVpZ2h0OiAyMDAsXHJcbiAgICBwcmVmZXJVc2VyQ29sb3JzOiBmYWxzZSxcclxuICAgIGV2ZW50QmdPcGFjaXR5OiAwLjUwLFxyXG4gICAgZXZlbnRCb3JkZXJXaWR0aDogMCxcclxuICAgIGV2ZW50Qm9yZGVyUmFkaXVzOiA2LFxyXG4gICAgZXZlbnRCb3JkZXJPcGFjaXR5OiAwLjI1LFxyXG4gICAgY29sb3JTd2F0Y2hQb3NpdGlvbjogJ3VuZGVyLXRpdGxlJyxcclxuICAgIG9ubHlBbmltYXRlVG9kYXk6IGZhbHNlLFxyXG4gICAgY29tcGxldGVCZWhhdmlvcjogJ2RpbScsXHJcbiAgICBjdXN0b21Td2F0Y2hlc0VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgcmVwbGFjZURlZmF1bHRTd2F0Y2hlczogZmFsc2UsXHJcbiAgICBkZWZhdWx0Q29sb3JzRm9sZGVkOiB0cnVlLFxyXG4gICAgY3VzdG9tU3dhdGNoZXNGb2xkZWQ6IGZhbHNlLFxyXG4gICAgZGF5Q2VsbE1heEhlaWdodDogMCxcclxuICAgIGhvbGRlclBsYWNlbWVudDogJ2xlZnQnLFxyXG4gICAgY2FsZW5kYXJXZWVrQWN0aXZlOiBmYWxzZSxcclxuICAgIHdlZWtseU5vdGVzRW5hYmxlZDogZmFsc2UsXHJcbiAgICBzd2F0Y2hlczogW1xyXG4gICAgICAgIHsgbmFtZTogJ1JlZCcsIGNvbG9yOiAnI2ViM2I1YScsIHRleHRDb2xvcjogJyNmOWM2ZDAnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnT3JhbmdlJywgY29sb3I6ICcjZmE4MjMxJywgdGV4dENvbG9yOiAnI2ZlZDhiZScgfSxcclxuICAgICAgICB7IG5hbWU6ICdBbWJlcicsIGNvbG9yOiAnI2U1YTIxNicsIHRleHRDb2xvcjogJyNmOGU1YmInIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnR3JlZW4nLCBjb2xvcjogJyMyMGJmNmInLCB0ZXh0Q29sb3I6ICcjYzRlZWRhJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ1RlYWwnLCBjb2xvcjogJyMwZmI5YjEnLCB0ZXh0Q29sb3I6ICcjYmRlY2VhJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0JsdWUnLCBjb2xvcjogJyMyZDk4ZGEnLCB0ZXh0Q29sb3I6ICcjYzVlM2Y4JyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0Nvcm5mbG93ZXInLCBjb2xvcjogJyMzODY3ZDYnLCB0ZXh0Q29sb3I6ICcjYzlkNWY4JyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0luZGlnbycsIGNvbG9yOiAnIzU0NTRkMCcsIHRleHRDb2xvcjogJyNkMmQyZjgnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnUHVycGxlJywgY29sb3I6ICcjODg1NGQwJywgdGV4dENvbG9yOiAnI2UyZDJmOCcgfSxcclxuICAgICAgICB7IG5hbWU6ICdNYWdlbnRhJywgY29sb3I6ICcjYjU1NGQwJywgdGV4dENvbG9yOiAnI2VkZDJmOCcgfSxcclxuICAgICAgICB7IG5hbWU6ICdQaW5rJywgY29sb3I6ICcjZTgzMmMxJywgdGV4dENvbG9yOiAnI2Y4YzJlZicgfSxcclxuICAgICAgICB7IG5hbWU6ICdSb3NlJywgY29sb3I6ICcjZTgzMjg5JywgdGV4dENvbG9yOiAnI2Y4YzJlMCcgfSxcclxuICAgICAgICB7IG5hbWU6ICdCcm93bicsIGNvbG9yOiAnIzk2NWIzYicsIHRleHRDb2xvcjogJyNlNWQ0YzknIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnR3JheScsIGNvbG9yOiAnIzgzOTJhNCcsIHRleHRDb2xvcjogJyNlM2U2ZWEnIH1cclxuICAgIF0sXHJcbiAgICB1c2VyQ3VzdG9tU3dhdGNoZXM6IFtdLFxyXG4gICAgZXZlbnRDYXRlZ29yaWVzOiBbXSxcclxuICAgIHRyaWdnZXJzOiBbXVxyXG59O1xyXG5cclxuaW50ZXJmYWNlIERheWJsZUV2ZW50IHtcclxuICAgIGlkOiBzdHJpbmc7XHJcbiAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgZGF0ZT86IHN0cmluZztcclxuICAgIHN0YXJ0RGF0ZT86IHN0cmluZztcclxuICAgIGVuZERhdGU/OiBzdHJpbmc7XHJcbiAgICB0aW1lPzogc3RyaW5nO1xyXG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgICBpY29uPzogc3RyaW5nO1xyXG4gICAgY29tcGxldGVkPzogYm9vbGVhbjtcclxuICAgIGNvbG9yPzogc3RyaW5nOyAvLyB1c2VyLXNldCBjb2xvciAoaGV4KVxyXG4gICAgdGV4dENvbG9yPzogc3RyaW5nOyAvLyB1c2VyLXNldCB0ZXh0IGNvbG9yIChoZXgpXHJcbiAgICBjYXRlZ29yeUlkPzogc3RyaW5nO1xyXG4gICAgZWZmZWN0Pzogc3RyaW5nO1xyXG4gICAgYW5pbWF0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgRXZlbnRDYXRlZ29yeSB7XHJcbiAgICBpZDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgYmdDb2xvcjogc3RyaW5nO1xyXG4gICAgdGV4dENvbG9yOiBzdHJpbmc7XHJcbiAgICBlZmZlY3Q6IHN0cmluZztcclxuICAgIGFuaW1hdGlvbjogc3RyaW5nO1xyXG4gICAgYW5pbWF0aW9uMjogc3RyaW5nO1xyXG4gICAgaWNvbj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGF5YmxlQ2FsZW5kYXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gICAgc2V0dGluZ3M6IERheWJsZVNldHRpbmdzO1xyXG5cclxuICAgIGFzeW5jIG9ubG9hZCgpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRSwgbGVhZiA9PiBuZXcgRGF5YmxlQ2FsZW5kYXJWaWV3KGxlYWYsIHRoaXMpKTtcclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ29wZW4tZGF5YmxlLWNhbGVuZGFyJywgbmFtZTogJ09wZW4gRGF5YmxlIENhbGVuZGFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMub3BlbkRheWJsZSgpIH0pO1xyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZGF5YmxlLWZvY3VzLXRvZGF5JywgbmFtZTogJ0ZvY3VzIG9uIFRvZGF5JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZm9jdXNUb2RheSgpIH0pO1xyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxyXG4gICAgICAgICAgICBpZDogJ2RheWJsZS1vcGVuLXdlZWtseS12aWV3JywgXHJcbiAgICAgICAgICAgIG5hbWU6ICdPcGVuIFdlZWtseSBWaWV3JywgXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7IFxyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vcGVuRGF5YmxlKCk7IFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMuZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodmlldykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxyXG4gICAgICAgICAgICBpZDogJ2RheWJsZS1vcGVuLW1vbnRobHktdmlldycsIFxyXG4gICAgICAgICAgICBuYW1lOiAnT3BlbiBNb250aGx5IFZpZXcnLCBcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHsgXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9wZW5EYXlibGUoKTsgXHJcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRGF5YmxlU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG4gICAgICAgIHRoaXMuZW5zdXJlRW50cmllc0ZvbGRlcigpO1xyXG4gICAgICAgIHRoaXMub3BlbkRheWJsZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIG9udW5sb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb3BlbkRheWJsZSgpIHtcclxuICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5nZXRPckNyZWF0ZUxlYWYoKTtcclxuICAgICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xyXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xyXG4gICAgfVxyXG5cclxuICAgIGZvY3VzVG9kYXkoKSB7XHJcbiAgICAgICAgY29uc3QgdmlldyA9IHRoaXMuZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgaWYgKHZpZXcpIHZpZXcuZm9jdXNUb2RheSgpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5vcGVuRGF5YmxlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q2FsZW5kYXJWaWV3KCk6IERheWJsZUNhbGVuZGFyVmlldyB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcclxuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIHJldHVybiBsZWF2ZXNbMF0udmlldyBhcyBEYXlibGVDYWxlbmRhclZpZXc7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0T3JDcmVhdGVMZWFmKCk6IFdvcmtzcGFjZUxlYWYge1xyXG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcclxuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCkgcmV0dXJuIGxlYXZlc1swXTtcclxuICAgICAgICByZXR1cm4gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkgPz8gdGhpcy5hcHAud29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZW5zdXJlRW50cmllc0ZvbGRlcigpIHtcclxuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnNldHRpbmdzLmVudHJpZXNGb2xkZXI7XHJcbiAgICAgICAgaWYgKCFmb2xkZXIgfHwgZm9sZGVyLnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTtcclxuICAgICAgICB9IGNhdGNoIChfKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZSBQbHVnaW5dIEZhaWxlZCB0byBjcmVhdGUgZm9sZGVyOicsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBEYXlibGVDYWxlbmRhclZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcbiAgICBwbHVnaW46IERheWJsZUNhbGVuZGFyUGx1Z2luO1xyXG4gICAgcm9vdEVsOiBIVE1MRWxlbWVudDtcclxuICAgIGhlYWRlckVsOiBIVE1MRWxlbWVudDtcclxuICAgIG1vbnRoVGl0bGVFbDogSFRNTEVsZW1lbnQ7XHJcbiAgICB3ZWVrSGVhZGVyRWw6IEhUTUxFbGVtZW50O1xyXG4gICAgY2FsZW5kYXJFbDogSFRNTEVsZW1lbnQ7XHJcbiAgICBib2R5RWw6IEhUTUxFbGVtZW50O1xyXG4gICAgaG9sZGVyRWw6IEhUTUxFbGVtZW50O1xyXG4gICAgZ3JpZEVsOiBIVE1MRWxlbWVudDtcclxuICAgIF9sb25nT3ZlcmxheUVsPzogSFRNTEVsZW1lbnQ7XHJcbiAgICBfbG9uZ0VsczogTWFwPHN0cmluZywgSFRNTEVsZW1lbnQ+ID0gbmV3IE1hcCgpO1xyXG4gICAgY3VycmVudERhdGU6IERhdGU7XHJcbiAgICBldmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcclxuICAgIGhvbGRlckV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xyXG4gICAgd2Vla2x5Tm90ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuICAgIGlzU2VsZWN0aW5nID0gZmFsc2U7XHJcbiAgICBpc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICBzZWxlY3Rpb25TdGFydERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgc2VsZWN0aW9uRW5kRGF0ZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgICBpc1Jlc2l6aW5nSG9sZGVyID0gZmFsc2U7XHJcbiAgICBob2xkZXJSZXNpemVTdGFydFggPSAwO1xyXG4gICAgaG9sZGVyUmVzaXplU3RhcnRXaWR0aCA9IDA7XHJcbiAgICBfYm91bmRIb2xkZXJNb3VzZU1vdmUgPSAoZTogTW91c2VFdmVudCkgPT4ge307XHJcbiAgICBfYm91bmRIb2xkZXJNb3VzZVVwID0gKGU6IE1vdXNlRXZlbnQpID0+IHt9O1xyXG4gICAgX2xvbmdSTz86IFJlc2l6ZU9ic2VydmVyO1xyXG4gICAgY3VycmVudFRvZGF5TW9kYWw/OiBUb2RheU1vZGFsO1xyXG4gICAgd2Vla1RvZ2dsZUJ0bj86IEhUTUxFbGVtZW50O1xyXG4gICAgd2Vla2x5Tm90ZXNFbD86IEhUTUxFbGVtZW50O1xyXG4gICAgZHJhZ2dlZEV2ZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgc2F2ZVRpbWVvdXQ6IGFueTtcclxuICAgIGlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IGZhbHNlO1xyXG4gICAgd2Vla2x5Tm90ZXNSZXNpemVTdGFydFkgPSAwO1xyXG4gICAgd2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCA9IDA7XHJcbiAgICBfYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7fTtcclxuICAgIF9ib3VuZFdlZWtseU5vdGVzTW91c2VVcCA9IChlOiBNb3VzZUV2ZW50KSA9PiB7fTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IERheWJsZUNhbGVuZGFyUGx1Z2luKSB7XHJcbiAgICAgICAgc3VwZXIobGVhZik7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICAgICAgdGhpcy5jdXJyZW50RGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4ucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdyZXNpemUnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZGVib3VuY2VkU2F2ZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5zYXZlVGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMuc2F2ZVRpbWVvdXQpO1xyXG4gICAgICAgIHRoaXMuc2F2ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuc2F2ZUFsbEVudHJpZXMoKSwgMTAwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Vmlld1R5cGUoKSB7IHJldHVybiBWSUVXX1RZUEU7IH1cclxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gJ0RheWJsZSBDYWxlbmRhcic7IH1cclxuICAgIGdldEljb24oKSB7IHJldHVybiAnY2FsZW5kYXInOyB9XHJcbiAgICBcclxuICAgIGdldE1vbnRoRGF0YUZpbGVQYXRoKCk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcclxuICAgICAgICBjb25zdCB5ZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgIGNvbnN0IG1vbnRoID0gbW9udGhOYW1lc1t0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCldO1xyXG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7eWVhcn0ke21vbnRofS5qc29uYDtcclxuICAgICAgICByZXR1cm4gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIG9uT3BlbigpIHtcclxuICAgICAgICB0aGlzLnJvb3RFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXJvb3QnIH0pO1xyXG4gICAgICAgIHRoaXMuaGVhZGVyRWwgPSB0aGlzLnJvb3RFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaGVhZGVyJyB9KTtcclxuICAgICAgICBjb25zdCBsZWZ0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LWxlZnQnIH0pO1xyXG4gICAgICAgIGNvbnN0IGhvbGRlclRvZ2dsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG4gICAgICAgIGhvbGRlclRvZ2dsZS5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLWhvbGRlci10b2dnbGUnO1xyXG4gICAgICAgIHNldEljb24oaG9sZGVyVG9nZ2xlLCAnbWVudScpO1xyXG4gICAgICAgIGhvbGRlclRvZ2dsZS5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyB0aGlzLmhvbGRlckVsLmNsYXNzTGlzdC50b2dnbGUoJ29wZW4nKTsgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyT3BlbiA9IHRoaXMuaG9sZGVyRWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdvcGVuJyk7IGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyB9O1xyXG4gICAgICAgIGNvbnN0IHNlYXJjaEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG4gICAgICAgIHNlYXJjaEJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLXNlYXJjaC10b2dnbGUnO1xyXG4gICAgICAgIHNldEljb24oc2VhcmNoQnRuLCAnc2VhcmNoJyk7XHJcbiAgICAgICAgc2VhcmNoQnRuLm9uY2xpY2sgPSAoKSA9PiB7IGNvbnN0IG1vZGFsID0gbmV3IFByb21wdFNlYXJjaE1vZGFsKHRoaXMuYXBwLCB0aGlzKTsgbW9kYWwub3BlbigpOyB9O1xyXG5cclxuICAgICAgICBjb25zdCB3ZWVrVG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XHJcbiAgICAgICAgd2Vla1RvZ2dsZS5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLXdlZWstdG9nZ2xlJztcclxuICAgICAgICBzZXRJY29uKHdlZWtUb2dnbGUsICdjYWxlbmRhci1yYW5nZScpO1xyXG4gICAgICAgIHdlZWtUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9ICF0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmU7XHJcbiAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZEFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLndlZWtUb2dnbGVCdG4gPSB3ZWVrVG9nZ2xlO1xyXG5cclxuICAgICAgICB0aGlzLm1vbnRoVGl0bGVFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRWwoJ2gxJywgeyBjbHM6ICdkYXlibGUtbW9udGgtdGl0bGUnIH0pO1xyXG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LXJpZ2h0JyB9KTtcclxuICAgICAgICBjb25zdCBwcmV2QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7IHByZXZCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcclxuICAgICAgICBzZXRJY29uKHByZXZCdG4sICdjaGV2cm9uLWxlZnQnKTtcclxuICAgICAgICBwcmV2QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuc2hpZnRNb250aCgtMSk7IH07XHJcbiAgICAgICAgY29uc3QgdG9kYXlCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsgdG9kYXlCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcclxuICAgICAgICBzZXRJY29uKHRvZGF5QnRuLCAnZG90Jyk7XHJcbiAgICAgICAgdG9kYXlCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5mb2N1c1RvZGF5KCk7IH07XHJcbiAgICAgICAgY29uc3QgbmV4dEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOyBuZXh0QnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyc7XHJcbiAgICAgICAgc2V0SWNvbihuZXh0QnRuLCAnY2hldnJvbi1yaWdodCcpO1xyXG4gICAgICAgIG5leHRCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5zaGlmdE1vbnRoKDEpOyB9O1xyXG4gICAgICAgIGNvbnN0IHBsYWNlbWVudCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA/PyAnbGVmdCc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ2xlZnQnKSBsZWZ0LmFwcGVuZENoaWxkKGhvbGRlclRvZ2dsZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGVmdC5hcHBlbmRDaGlsZChwcmV2QnRuKTtcclxuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKHRvZGF5QnRuKTtcclxuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKG5leHRCdG4pO1xyXG4gICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQod2Vla1RvZ2dsZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmlnaHQuYXBwZW5kQ2hpbGQoc2VhcmNoQnRuKTtcclxuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSByaWdodC5hcHBlbmRDaGlsZChob2xkZXJUb2dnbGUpO1xyXG4gICAgICAgIHRoaXMuYm9keUVsID0gdGhpcy5yb290RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWJvZHknIH0pO1xyXG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdyaWdodCcpIHtcclxuICAgICAgICAgICAgdGhpcy5ib2R5RWwuYWRkQ2xhc3MoJ2RheWJsZS1ob2xkZXItcmlnaHQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ob2xkZXJFbCA9IHRoaXMuYm9keUVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXInIH0pO1xyXG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdoaWRkZW4nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ2RheWJsZS1ob2xkZXItaGlkZGVuJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGhvbGRlckhlYWRlciA9IHRoaXMuaG9sZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlci1oZWFkZXInLCB0ZXh0OiAnSG9sZGVyJyB9KTtcclxuICAgICAgICBjb25zdCBob2xkZXJBZGQgPSBob2xkZXJIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtaG9sZGVyLWFkZC1idG4nIH0pO1xyXG4gICAgICAgIHNldEljb24oaG9sZGVyQWRkLCAncGx1cycpO1xyXG4gICAgICAgIGhvbGRlckFkZC5vbmNsaWNrID0gKCkgPT4gdGhpcy5vcGVuRXZlbnRNb2RhbCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCByZXNpemUgaGFuZGxlIHRvIGhvbGRlclxyXG4gICAgICAgIGNvbnN0IHJlc2l6ZUhhbmRsZSA9IGhvbGRlckhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaG9sZGVyLXJlc2l6ZS1oYW5kbGUnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdIb2xkZXIpIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGRpZmYgPSBlLmNsaWVudFggLSB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WDtcclxuICAgICAgICAgICAgLy8gV2hlbiBob2xkZXIgaXMgb24gdGhlIHJpZ2h0LCByZXZlcnNlIHRoZSBkaXJlY3Rpb25cclxuICAgICAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xyXG4gICAgICAgICAgICAgICAgZGlmZiA9IC1kaWZmO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1dpZHRoID0gTWF0aC5tYXgoMjAwLCB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggKyBkaWZmKTtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoICsgJ3B4JztcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCA9IGFzeW5jIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUmVzaXppbmdIb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ0hvbGRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCA9IHRoaXMuaG9sZGVyRWwub2Zmc2V0V2lkdGg7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVzaXplSGFuZGxlLm9ubW91c2Vkb3duID0gKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdIb2xkZXIgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WCA9IGUuY2xpZW50WDtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJSZXNpemVTdGFydFdpZHRoID0gdGhpcy5ob2xkZXJFbC5vZmZzZXRXaWR0aDtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGhvbGRlckxpc3QgPSB0aGlzLmhvbGRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItbGlzdCcgfSk7XHJcbiAgICAgICAgLy8gQWRkIGRyYWcgaGFuZGxlcnMgdG8gaG9sZGVyIGZvciBkcm9wcGluZyBldmVudHMgdGhlcmVcclxuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcclxuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XHJcbiAgICAgICAgdGhpcy5ob2xkZXJFbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xyXG4gICAgICAgICAgICBpZiAoIWlkIHx8IHNyYyA9PT0gJ2hvbGRlcicpIHJldHVybjsgLy8gRG9uJ3QgZHJvcCBob2xkZXIgZXZlbnRzIG9uIGhvbGRlclxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHMuc3BsaWNlKGlkeCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgZGF0ZSBpbmZvIHdoZW4gbW92aW5nIHRvIGhvbGRlclxyXG4gICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2LmVuZERhdGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMucHVzaChldik7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZhaWxlZCB0byBtb3ZlIGV2ZW50IHRvIGhvbGRlcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmhvbGRlckVsLmFwcGVuZENoaWxkKGhvbGRlckxpc3QpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFwcGx5IHNhdmVkIGhvbGRlciB3aWR0aCBpZiBpdCBleGlzdHNcclxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyV2lkdGgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlcldpZHRoICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4pIHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ29wZW4nKTsgZWxzZSB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgdGhpcy5jYWxlbmRhckVsID0gdGhpcy5ib2R5RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWNhbGVuZGFyJyB9KTtcclxuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2RheXMnIH0pO1xyXG4gICAgICAgIHRoaXMuZ3JpZEVsID0gdGhpcy5jYWxlbmRhckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ncmlkJyB9KTtcclxuICAgICAgICBhd2FpdCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbkNsb3NlKCkge1xyXG4gICAgICAgIC8vIENsZWFuIHVwIHJlc2l6ZSBoYW5kbGUgbGlzdGVuZXJzXHJcbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gRGlzY29ubmVjdCBsb25nIGV2ZW50IFJlc2l6ZU9ic2VydmVyIGFuZCByZW1vdmUgb3ZlcmxheSB0byBwcmV2ZW50IGxlYWtzXHJcbiAgICAgICAgaWYgKHRoaXMuX2xvbmdSTykge1xyXG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nUk8uZGlzY29ubmVjdCgpOyB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX2xvbmdPdmVybGF5RWwgJiYgdGhpcy5fbG9uZ092ZXJsYXlFbC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nT3ZlcmxheUVsLnJlbW92ZSgpOyB9IGNhdGNoIHt9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2xvbmdFbHMuZm9yRWFjaChlbCA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7IGlmIChlbCAmJiBlbC5wYXJlbnRFbGVtZW50KSBlbC5yZW1vdmUoKTsgfSBjYXRjaCB7fVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX2xvbmdFbHMuY2xlYXIoKTtcclxuICAgICAgICBpZiAodGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VNb3ZlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VVcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGdldFJlcXVpcmVkRmlsZXMoKTogU2V0PHN0cmluZz4ge1xyXG4gICAgICAgIGNvbnN0IGZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBhZGREYXRlID0gKGQ6IERhdGUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgY29uc3QgbSA9IG1vbnRoTmFtZXNbZC5nZXRNb250aCgpXTtcclxuICAgICAgICAgICAgZmlsZXMuYWRkKGAke3l9JHttfS5qc29uYCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gQWx3YXlzIGFkZCBjdXJyZW50IGRhdGUncyBtb250aFxyXG4gICAgICAgIGFkZERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHtcclxuICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5O1xyXG4gICAgICAgICAgICBjb25zdCBiYXNlID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHREb3cgPSBiYXNlLmdldERheSgpO1xyXG4gICAgICAgICAgICBjb25zdCBkaWZmID0gKCh0RG93IC0gd2Vla1N0YXJ0KSArIDcpICUgNztcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShiYXNlKTtcclxuICAgICAgICAgICAgc3RhcnQuc2V0RGF0ZShiYXNlLmdldERhdGUoKSAtIGRpZmYpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICAgICAgICAgIGVuZC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSArIDYpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgYWRkRGF0ZShzdGFydCk7XHJcbiAgICAgICAgICAgIGFkZERhdGUoZW5kKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZpbGVzO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGxvYWRBbGxFbnRyaWVzKCkge1xyXG4gICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5nZXRSZXF1aXJlZEZpbGVzKCk7XHJcbiAgICAgICAgdGhpcy5ldmVudHMgPSBbXTtcclxuICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IFtdO1xyXG4gICAgICAgIHRoaXMud2Vla2x5Tm90ZXMgPSB7fTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKS5zcGxpdCgnLycpLnBvcCgpO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyfS8ke2ZpbGVuYW1lfWA7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbikgYXMgeyBldmVudHM6IERheWJsZUV2ZW50W10sIGhvbGRlcjogRGF5YmxlRXZlbnRbXSwgd2Vla2x5Tm90ZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBsYXN0TW9kaWZpZWQ/OiBzdHJpbmcgfTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5ldmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKC4uLmRhdGEuZXZlbnRzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gT25seSBsb2FkIGhvbGRlciBhbmQgd2Vla2x5IG5vdGVzIGZyb20gdGhlIHByaW1hcnkgY3VycmVudCBmaWxlIHRvIGF2b2lkIGR1cGxpY2F0aW9uL2NvbmZsaWN0c1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGVuYW1lID09PSBjdXJyZW50RmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gZGF0YS5ob2xkZXIgfHwgW107XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3RlcyA9IGRhdGEud2Vla2x5Tm90ZXMgfHwge307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IHNraXAgaWYgZmlsZSBkb2Vzbid0IGV4aXN0IG9yIGNhbid0IGJlIHJlYWRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBEZWR1cGxpY2F0ZSBldmVudHMganVzdCBpbiBjYXNlICh0aG91Z2ggc2hvdWxkIG5vdCBoYXBwZW4gaWYgZmlsZXMgYXJlIGRpc3RpbmN0IHBhcnRpdGlvbnMpXHJcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcclxuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZHVwbGljYXRlID0gc2Vlbi5oYXMoZS5pZCk7XHJcbiAgICAgICAgICAgIHNlZW4uYWRkKGUuaWQpO1xyXG4gICAgICAgICAgICByZXR1cm4gIWR1cGxpY2F0ZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBzYXZlQWxsRW50cmllcygpIHtcclxuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCk7XHJcbiAgICAgICAgaWYgKCFmb2xkZXIpIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cclxuICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfVxyXG4gICAgICAgIGNhdGNoIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cclxuXHJcbiAgICAgICAgY29uc3QgZmlsZXNUb1NhdmUgPSB0aGlzLmdldFJlcXVpcmVkRmlsZXMoKTtcclxuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICBjb25zdCBnZXRGaWxlbmFtZUZvckRhdGUgPSAoZGF0ZVN0cjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICBjb25zdCBkID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcbiAgICAgICAgICAgICBpZiAoaXNOYU4oZC5nZXRUaW1lKCkpKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgIGNvbnN0IHkgPSBkLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgICBjb25zdCBtID0gbW9udGhOYW1lc1tkLmdldE1vbnRoKCldO1xyXG4gICAgICAgICAgICAgcmV0dXJuIGAke3l9JHttfS5qc29uYDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKS5zcGxpdCgnLycpLnBvcCgpO1xyXG5cclxuICAgICAgICAvLyBXZSBuZWVkIHRvIHJlYWQgYWxsIGZpbGVzIGZpcnN0IHRvIGVuc3VyZSB3ZSBkb24ndCBsb3NlIGV2ZW50cyB0aGF0IGFyZSBOT1QgaW4gdGhpcy5ldmVudHMgKGUuZy4gb3V0IG9mIHZpZXcgcmFuZ2UpXHJcbiAgICAgICAgLy8gQnV0IHdhaXQsIGlmIHdlIG9ubHkgbG9hZGVkIGV2ZW50cyBmcm9tIGBmaWxlc1RvU2F2ZWAsIGFuZCBgdGhpcy5ldmVudHNgIGNvbnRhaW5zIG1vZGlmaWNhdGlvbnMuLi5cclxuICAgICAgICAvLyBJZiB3ZSBtb2RpZnkgYW4gZXZlbnQsIGl0J3MgaW4gYHRoaXMuZXZlbnRzYC5cclxuICAgICAgICAvLyBJZiB3ZSBkZWxldGUgYW4gZXZlbnQsIGl0J3MgcmVtb3ZlZCBmcm9tIGB0aGlzLmV2ZW50c2AuXHJcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGV2ZW50cyBpbiB0aGUgZmlsZXMgdGhhdCBhcmUgTk9UIGluIGB0aGlzLmV2ZW50c2AsIGl0IGltcGxpZXMgdGhleSB3ZXJlIG5vdCBsb2FkZWQuXHJcbiAgICAgICAgLy8gU2luY2UgYGxvYWRBbGxFbnRyaWVzYCBsb2FkcyBFVkVSWVRISU5HIGZyb20gYGZpbGVzVG9TYXZlYCwgYHRoaXMuZXZlbnRzYCBzaG91bGQgY292ZXIgQUxMIGV2ZW50cyBpbiB0aG9zZSBmaWxlcy5cclxuICAgICAgICAvLyBTbyB3ZSBjYW4gc2FmZWx5IG92ZXJ3cml0ZSBgZmlsZXNUb1NhdmVgLlxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFBhcnRpdGlvbiBldmVudHMgYnkgdGFyZ2V0IGZpbGVuYW1lXHJcbiAgICAgICAgY29uc3QgZXZlbnRzQnlGaWxlOiBSZWNvcmQ8c3RyaW5nLCBEYXlibGVFdmVudFtdPiA9IHt9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXJyYXlzIGZvciBrbm93biBmaWxlc1xyXG4gICAgICAgIGZpbGVzVG9TYXZlLmZvckVhY2goZiA9PiBldmVudHNCeUZpbGVbZl0gPSBbXSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3Qgb3JwaGFuRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0RmlsZSA9IGN1cnJlbnRGaWxlOyAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgZmlsZSBpZiBubyBkYXRlXHJcbiAgICAgICAgICAgIGlmIChldi5kYXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXRGaWxlID0gZ2V0RmlsZW5hbWVGb3JEYXRlKGV2LmRhdGUpIHx8IGN1cnJlbnRGaWxlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2LnN0YXJ0RGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0RmlsZSA9IGdldEZpbGVuYW1lRm9yRGF0ZShldi5zdGFydERhdGUpIHx8IGN1cnJlbnRGaWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0RmlsZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFldmVudHNCeUZpbGVbdGFyZ2V0RmlsZV0pIGV2ZW50c0J5RmlsZVt0YXJnZXRGaWxlXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZXZlbnRzQnlGaWxlW3RhcmdldEZpbGVdLnB1c2goZXYpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgb3JwaGFuRXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBldmVudHMgdGhhdCBiZWxvbmcgdG8gZmlsZXMgTk9UIGluIGBmaWxlc1RvU2F2ZWAgKGUuZy4gbW92ZWQgZXZlbnQgdG8gZmFyIGZ1dHVyZSksXHJcbiAgICAgICAgLy8gd2Ugc2hvdWxkIHByb2JhYmx5IHNhdmUgdGhvc2UgZmlsZXMgdG9vLlxyXG4gICAgICAgIC8vIEJ1dCBmb3Igbm93LCBsZXQncyBmb2N1cyBvbiBgZmlsZXNUb1NhdmVgICsgYW55IG5ldyB0YXJnZXRzIGZvdW5kLlxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNhdmUgZWFjaCBmaWxlXHJcbiAgICAgICAgZm9yIChjb25zdCBmaWxlbmFtZSBvZiBPYmplY3Qua2V5cyhldmVudHNCeUZpbGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVFdmVudHMgPSBldmVudHNCeUZpbGVbZmlsZW5hbWVdO1xyXG4gICAgICAgICAgICBjb25zdCBpc0N1cnJlbnQgPSBmaWxlbmFtZSA9PT0gY3VycmVudEZpbGU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBmaWxlID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHByZXNlcnZlIGhvbGRlci93ZWVrbHlOb3RlcyBpZiB3ZSBhcmUgTk9UIHRoZSBjdXJyZW50IGZpbGVcclxuICAgICAgICAgICAgLy8gQnV0IHdhaXQsIGBsb2FkQWxsRW50cmllc2Agb25seSBsb2FkZWQgaG9sZGVyIGZyb20gYGN1cnJlbnRGaWxlYC5cclxuICAgICAgICAgICAgLy8gU28gZm9yIG90aGVyIGZpbGVzLCB3ZSBkb24ndCBrbm93IHRoZWlyIGhvbGRlciBjb250ZW50IVxyXG4gICAgICAgICAgICAvLyBXZSBNVVNUIHJlYWQgdGhlbSB0byBwcmVzZXJ2ZSBob2xkZXIvbm90ZXMuXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgaG9sZGVyVG9TYXZlOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgIGxldCBub3Rlc1RvU2F2ZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGlzQ3VycmVudCkge1xyXG4gICAgICAgICAgICAgICAgaG9sZGVyVG9TYXZlID0gdGhpcy5ob2xkZXJFdmVudHM7XHJcbiAgICAgICAgICAgICAgICBub3Rlc1RvU2F2ZSA9IHRoaXMud2Vla2x5Tm90ZXM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWFkIGZpbGUgdG8gZ2V0IGV4aXN0aW5nIGhvbGRlci9ub3Rlc1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMoZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRlclRvU2F2ZSA9IGRhdGEuaG9sZGVyIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3Rlc1RvU2F2ZSA9IGRhdGEud2Vla2x5Tm90ZXMgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvciwgbWF5YmUgbmV3IGZpbGVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgIGV2ZW50czogZmlsZUV2ZW50cyxcclxuICAgICAgICAgICAgICAgIGhvbGRlcjogaG9sZGVyVG9TYXZlLFxyXG4gICAgICAgICAgICAgICAgd2Vla2x5Tm90ZXM6IG5vdGVzVG9TYXZlLFxyXG4gICAgICAgICAgICAgICAgbGFzdE1vZGlmaWVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKGZpbGUsIGpzb25TdHIpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlXSBGYWlsZWQgdG8gc2F2ZScsIGZpbGVuYW1lLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb2N1c1RvZGF5KCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNoaWZ0TW9udGgoZGVsdGE6IG51bWJlcikge1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXREYXRlKHRoaXMuY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgKGRlbHRhICogNykpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcclxuICAgICAgICAgICAgZC5zZXRNb250aChkLmdldE1vbnRoKCkgKyBkZWx0YSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBkO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmxvYWRBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyByZW5kZXIodGl0bGVFbD86IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMud2Vla2x5Tm90ZXNFbCkge1xyXG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gUmVzZXQgZ3JpZCBzdHlsZVxyXG4gICAgICAgIHRoaXMuZ3JpZEVsLnN0eWxlLmZsZXggPSAnMSAxIGF1dG8nO1xyXG4gICAgICAgIHRoaXMuZ3JpZEVsLnN0eWxlLm1pbkhlaWdodCA9ICcnO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFkZENsYXNzKCdkYXlibGUtd2Vlay1tb2RlJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyV2Vla1ZpZXcodGl0bGVFbCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS13ZWVrLW1vZGUnKTtcclxuICAgICAgICAgICAgdGhpcy5yZW5kZXJNb250aFZpZXcodGl0bGVFbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHJlbmRlcldlZWtWaWV3KHRpdGxlRWw/OiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHkgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgY29uc3QgbSA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICBjb25zdCBtb250aExhYmVsID0gdGhpcy5jdXJyZW50RGF0ZS50b0xvY2FsZVN0cmluZygnZW4tVVMnLCB7IG1vbnRoOiAnbG9uZycsIHllYXI6ICdudW1lcmljJyB9KTtcclxuICAgICAgICBpZiAodGhpcy5tb250aFRpdGxlRWwpIHRoaXMubW9udGhUaXRsZUVsLnNldFRleHQobW9udGhMYWJlbCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVXBkYXRlIHdlZWsgdG9nZ2xlIGJ1dHRvbiBhY3RpdmUgc3RhdGVcclxuICAgICAgICBpZiAodGhpcy53ZWVrVG9nZ2xlQnRuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHRoaXMud2Vla1RvZ2dsZUJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy53ZWVrVG9nZ2xlQnRuLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZEVsLmVtcHR5KCk7XHJcbiAgICAgICAgdGhpcy53ZWVrSGVhZGVyRWwuZW1wdHkoKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB3ZWVrU3RhcnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrU3RhcnREYXk7XHJcbiAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xyXG4gICAgICAgIGNvbnN0IHREb3cgPSBiYXNlLmdldERheSgpO1xyXG4gICAgICAgIGNvbnN0IGRpZmYgPSAoKHREb3cgLSB3ZWVrU3RhcnQpICsgNykgJSA3O1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XHJcbiAgICAgICAgc3RhcnQuc2V0RGF0ZShiYXNlLmdldERhdGUoKSAtIGRpZmYpOyAvLyBTdGFydCBvZiB0aGUgd2Vla1xyXG5cclxuICAgICAgICAvLyBIZWFkZXJcclxuICAgICAgICBjb25zdCBoZWFkZXIgPSB0aGlzLndlZWtIZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXInIH0pO1xyXG4gICAgICAgIGNvbnN0IGRheXMgPSBbJ3N1bicsJ21vbicsJ3R1ZScsJ3dlZCcsJ3RodScsJ2ZyaScsJ3NhdCddO1xyXG4gICAgICAgIGNvbnN0IG9yZGVyZWQgPSBkYXlzLnNsaWNlKHdlZWtTdGFydCkuY29uY2F0KGRheXMuc2xpY2UoMCwgd2Vla1N0YXJ0KSk7XHJcbiAgICAgICAgb3JkZXJlZC5mb3JFYWNoKGQgPT4gaGVhZGVyLmNyZWF0ZURpdih7IHRleHQ6IGQsIGNsczogJ2RheWJsZS1ncmlkLWhlYWRlci1jZWxsJyB9KSk7XHJcblxyXG4gICAgICAgIC8vIFByZS1jYWxjdWxhdGUgbG9uZyBldmVudCBtYXJnaW5zIChyZXVzZWQgZnJvbSBtb250aCB2aWV3IGxvZ2ljKVxyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcclxuICAgICAgICBjb25zdCBzZWdtZW50R2FwID0gNDsgLy8gZ2FwcHlcclxuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgICAgICBjb25zdCBsb25nRXZlbnRzUHJlc2V0ID0gdGhpcy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSk7XHJcbiAgICAgICAgbG9uZ0V2ZW50c1ByZXNldC5mb3JFYWNoKGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSEpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgMSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcclxuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBHcmlkXHJcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHN0YXJ0KTtcclxuICAgICAgICAgICAgZC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSArIGkpO1xyXG4gICAgICAgICAgICBjb25zdCB5eSA9IGQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxEYXRlID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGwgPSBmcmFnbWVudC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5JyB9KTtcclxuICAgICAgICAgICAgY2VsbC5zZXRBdHRyKCdkYXRhLWRhdGUnLCBmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcclxuICAgICAgICAgICAgY29uc3QgbnVtID0gZGF5SGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktbnVtYmVyJywgdGV4dDogU3RyaW5nKGQuZ2V0RGF0ZSgpKSB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZC5nZXREYXRlKCkgPT09IHQuZ2V0RGF0ZSgpICYmIGQuZ2V0TW9udGgoKSA9PT0gdC5nZXRNb250aCgpICYmIGQuZ2V0RnVsbFllYXIoKSA9PT0gdC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcclxuICAgICAgICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoJ2RheWJsZS1jdXJyZW50LWRheScpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoQnRuID0gZGF5SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1kYXktc2VhcmNoLWJ0bicgfSk7XHJcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XHJcbiAgICAgICAgICAgICAgICBzZXRJY29uKHNlYXJjaEJ0biwgJ2ZvY3VzJyk7XHJcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub25jbGljayA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuVG9kYXlNb2RhbChmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGxvbmdDb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1sb25nLWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgICAgIGxvbmdDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWxvbmctY29udGFpbmVyJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1jb250YWluZXInIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gQXBwbHkgbWFyZ2lucyBmb3IgbG9uZyBldmVudHNcclxuICAgICAgICAgICAgY29uc3QgcHJlQ291bnQgPSBjb3VudHNCeURhdGVbZnVsbERhdGVdIHx8IDA7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZU10ID0gcHJlQ291bnQgPiAwID8gKHByZUNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgcHJlQ291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XHJcbiAgICAgICAgICAgIGNvbnN0IGFkanVzdGVkID0gTWF0aC5tYXgoMCwgcHJlTXQgLSA2KTtcclxuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IGFkanVzdGVkID8gYCR7YWRqdXN0ZWR9cHhgIDogJyc7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmRhdGUgPT09IGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZSA9PiBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5jcmVhdGVFdmVudEl0ZW0oZSkpKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIERyYWcgYW5kIERyb3AgKHJldXNlZCBvcHRpbWl6ZWQgbG9naWMgZnJvbSBtb250aCB2aWV3KVxyXG4gICAgICAgICAgICBjb250YWluZXIub25kcmFnb3ZlciA9IChlKSA9PiB7IFxyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gY29udGFpbmVyICYmIGV2ZW50Q291bnQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYWJvdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYmVsb3cnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb250YWluZXIub25kcmFnbGVhdmUgPSAoZSkgPT4geyBcclxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgICAgIGlmICghaWQgfHwgc3JjICE9PSAnY2FsZW5kYXInKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkQ29udGFpbmVyID0gZHJhZ2dlZEVsLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGNvbnRhaW5lcikgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0RXZlbnQgfHwgdGFyZ2V0RXZlbnQgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IHJlY3QuaGVpZ2h0IC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFJlb3JkZXIgbG9naWNcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbEV2ZW50RWxzID0gQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld09yZGVyID0gYWxsRXZlbnRFbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCkuZmlsdGVyKEJvb2xlYW4pIGFzIHN0cmluZ1tdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlEYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIGRheUV2ZW50SW5kaWNlcy5wdXNoKGlkeCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRJZFRvSW5kZXggPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgICAgICAgICAgICAgbmV3T3JkZXIuZm9yRWFjaCgoZXZlbnRJZCwgaWR4KSA9PiBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGRheUV2ZW50SW5kaWNlcy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRBID0gdGhpcy5ldmVudHNbYV0uaWQgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRCID0gdGhpcy5ldmVudHNbYl0uaWQgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJBID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQSkgPz8gOTk5O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQiA9IGV2ZW50SWRUb0luZGV4LmdldChpZEIpID8/IDk5OTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXJBIC0gb3JkZXJCO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlb3JkZXJlZEV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRheUV2ZW50SWR4ID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaCh0aGlzLmV2ZW50c1tkYXlFdmVudEluZGljZXNbZGF5RXZlbnRJZHhdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVvcmRlcmVkRXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHJlb3JkZXJlZEV2ZW50cztcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIERyb3Agb24gY2VsbCAobW92ZSBmcm9tIGhvbGRlciBvciBvdGhlciBkYXkpXHJcbiAgICAgICAgICAgIGNlbGwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xyXG4gICAgICAgICAgICBjZWxsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XHJcbiAgICAgICAgICAgIGNlbGwub25kcm9wID0gYXN5bmMgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdob2xkZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChoSWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldm4gPSB0aGlzLmhvbGRlckV2ZW50cy5zcGxpY2UoaElkeCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXZuKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNyYyA9PT0gJ2NhbGVuZGFyJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZyb20gYW5vdGhlciBkYXlcclxuICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzW2lkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBtb3ZpbmcgdG8gc2FtZSBkYXkgKGFscmVhZHkgaGFuZGxlZCBieSBjb250YWluZXIub25kcm9wKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgIT09IGZ1bGxEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuZGF0ZSA9IGZ1bGxEYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gSW50ZXJhY3Rpb25zXHJcbiAgICAgICAgICAgIGNlbGwub25jbGljayA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpICYmIHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpID09PSBjb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY2VsbC5vbm1vdXNlZG93biA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKChldiBhcyBNb3VzZUV2ZW50KS5idXR0b24gIT09IDApIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNlbGwub25tb3VzZW92ZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB0aGlzLnVwZGF0ZVNlbGVjdGlvbihmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjZWxsLm9udG91Y2hzdGFydCA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY2VsbC5vbnRvdWNobW92ZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJlbmRlciBsb25nIGV2ZW50c1xyXG4gICAgICAgIC8vIFByZXBhcmUgb3ZlcmxheSBmb3IgbG9uZyBldmVudHM7IGhpZGUgaXQgdW50aWwgcG9zaXRpb25zIGFyZSBjb21wdXRlZFxyXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ092ZXJsYXlFbCB8fCAhdGhpcy5fbG9uZ092ZXJsYXlFbC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLmluc2V0ID0gJzAnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZCh0aGlzLl9sb25nT3ZlcmxheUVsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdSTyAmJiAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ1JPID0gbmV3ICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckxvbmdFdmVudHMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9sb25nUk8gJiYgdGhpcy5ncmlkRWwpIHRoaXMuX2xvbmdSTy5vYnNlcnZlKHRoaXMuZ3JpZEVsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFdlZWtseSBOb3Rlc1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQpIHtcclxuICAgICAgICAgICAgLy8gQWRqdXN0IGdyaWQgdG8gYWxsb3cgc2hyaW5raW5nIGFuZCBsZXQgbm90ZXMgdGFrZSBzcGFjZVxyXG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5zdHlsZS5mbGV4ID0gJzAgMSBhdXRvJztcclxuICAgICAgICAgICAgdGhpcy5ncmlkRWwuc3R5bGUubWluSGVpZ2h0ID0gJzAnO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xyXG4gICAgICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcclxuICAgICAgICAgICAgY29uc3QgZGlmZiA9ICgodERvdyAtIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSkgKyA3KSAlIDc7XHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtTdGFydERhdGUgPSBuZXcgRGF0ZShiYXNlKTtcclxuICAgICAgICAgICAgd2Vla1N0YXJ0RGF0ZS5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpIC0gZGlmZik7XHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtLZXkgPSB3ZWVrU3RhcnREYXRlLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LW5vdGVzJyB9KTtcclxuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmZsZXggPSAnMCAwIGF1dG8gIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXggIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbiAhaW1wb3J0YW50JztcclxuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmJvcmRlclRvcCA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcclxuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIERyYWcgSGFuZGxlXHJcbiAgICAgICAgICAgIGNvbnN0IGRyYWdIYW5kbGUgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1kcmFnLWhhbmRsZScgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VNb3ZlID0gKG1lOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzIHx8ICF0aGlzLndlZWtseU5vdGVzRWwpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGR5ID0gbWUuY2xpZW50WSAtIHRoaXMud2Vla2x5Tm90ZXNSZXNpemVTdGFydFk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdIID0gTWF0aC5tYXgoMTAwLCB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRIZWlnaHQgLSBkeSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUuaGVpZ2h0ID0gYCR7bmV3SH1weCAhaW1wb3J0YW50YDtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSBhcyBFdmVudExpc3RlbmVyKTtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZFdlZWtseU5vdGVzTW91c2VVcCBhcyBFdmVudExpc3RlbmVyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLndlZWtseU5vdGVzRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0hlaWdodCA9IHRoaXMud2Vla2x5Tm90ZXNFbC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGRyYWdIYW5kbGUub25tb3VzZWRvd24gPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy53ZWVrbHlOb3Rlc0VsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRZID0gZS5jbGllbnRZO1xyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0SGVpZ2h0ID0gdGhpcy53ZWVrbHlOb3Rlc0VsLm9mZnNldEhlaWdodDtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmUgYXMgRXZlbnRMaXN0ZW5lcik7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgYXMgRXZlbnRMaXN0ZW5lcik7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyBIZWFkZXJcclxuICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gdGhpcy53ZWVrbHlOb3Rlc0VsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS13ZWVrbHktbm90ZXMtaGVhZGVyJyB9KTtcclxuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgIGhlYWRlci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdzcGFjZS1iZXR3ZWVuJztcclxuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLnBhZGRpbmcgPSAnOHB4IDEwcHggMCAxMHB4JztcclxuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLmZsZXggPSAnMCAwIGF1dG8nO1xyXG4gICAgICAgICAgICBjb25zdCBoNCA9IGhlYWRlci5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdXZWVrbHkgTm90ZXMnIH0pO1xyXG4gICAgICAgICAgICBoNC5zdHlsZS5tYXJnaW4gPSAnMCc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBDb250ZW50IGFyZWEgd2l0aCB0ZXh0YXJlYSBvbmx5XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy1jb250ZW50JyB9KTtcclxuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5mbGV4ID0gJzAgMCBhdXRvICFpbXBvcnRhbnQnO1xyXG4gICAgICAgICAgICBjb250ZW50Q29udGFpbmVyLnN0eWxlLm92ZXJmbG93ID0gJ3Zpc2libGUgIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUucGFkZGluZyA9ICcxMHB4JztcclxuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXggIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4gIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUubWluSGVpZ2h0ID0gJzAgIWltcG9ydGFudCc7XHJcblxyXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCB0ZXh0XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy53ZWVrbHlOb3Rlc1t3ZWVrS2V5XSB8fCAnJztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZXh0YXJlYSBmb3IgZWRpdGluZ1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0YXJlYUVsID0gY29udGVudENvbnRhaW5lci5jcmVhdGVFbCgndGV4dGFyZWEnLCB7IGNsczogJ2RheWJsZS13ZWVrbHktbm90ZXMtdGV4dGFyZWEnIH0pO1xyXG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnZhbHVlID0gY3VycmVudFRleHQ7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUud2lkdGggPSAnMTAwJSAhaW1wb3J0YW50JztcclxuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5wYWRkaW5nID0gJzhweCc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuZm9udEZhbWlseSA9ICd2YXIoLS1mb250LW1vbm9zcGFjZSknO1xyXG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmZvbnRTaXplID0gJ3ZhcigtLWZvbnQtdGV4dC1zaXplKSc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCB2YXIoLS1kaXZpZGVyLWNvbG9yKSc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYmFja2dyb3VuZCA9ICd2YXIoLS1iYWNrZ3JvdW5kLXNlY29uZGFyeSknO1xyXG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbm9ybWFsKSc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUucmVzaXplID0gJ25vbmUgIWltcG9ydGFudCc7XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xyXG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLm92ZXJmbG93WSA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gQXV0by1oZWlnaHQgZnVuY3Rpb24gLSBncm93cyB3aXRoIGNvbnRlbnQgdXAgdG8gNTAwcHggbWF4XHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVRleHRhcmVhSGVpZ2h0ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XHJcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmhlaWdodCA9IGAke3RleHRhcmVhRWwuc2Nyb2xsSGVpZ2h0fXB4YDtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIEluaXRpYWwgaGVpZ2h0XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQodXBkYXRlVGV4dGFyZWFIZWlnaHQsIDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gVXBkYXRlIG9uIGlucHV0XHJcbiAgICAgICAgICAgIHRleHRhcmVhRWwuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzW3dlZWtLZXldID0gdGV4dGFyZWFFbC52YWx1ZTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZVRleHRhcmVhSGVpZ2h0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZFNhdmUoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBIYW5kbGUgdGFiIGtleVxyXG4gICAgICAgICAgICB0ZXh0YXJlYUVsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnVGFiJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0YXJlYSA9IGUudGFyZ2V0IGFzIEhUTUxUZXh0QXJlYUVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25TdGFydDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25FbmQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dGFyZWEudmFsdWUgPSB0ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoMCwgc3RhcnQpICsgJ1xcdCcgKyB0ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoZW5kKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0YXJlYS5zZWxlY3Rpb25TdGFydCA9IHRleHRhcmVhLnNlbGVjdGlvbkVuZCA9IHN0YXJ0ICsgMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlck1vbnRoVmlldyh0aXRsZUVsPzogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICBjb25zdCB5ID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgIGNvbnN0IG0gPSB0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCk7XHJcbiAgICAgICAgY29uc3QgbW9udGhMYWJlbCA9IG5ldyBEYXRlKHksIG0pLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xyXG4gICAgICAgIGlmICh0aGlzLm1vbnRoVGl0bGVFbCkgdGhpcy5tb250aFRpdGxlRWwuc2V0VGV4dChtb250aExhYmVsKTtcclxuICAgICAgICB0aGlzLmdyaWRFbC5lbXB0eSgpO1xyXG4gICAgICAgIGNvbnN0IHdlZWtTdGFydCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheTtcclxuICAgICAgICBjb25zdCBmaXJzdERheSA9IG5ldyBEYXRlKHksIG0sIDEpLmdldERheSgpO1xyXG4gICAgICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoeSwgbSArIDEsIDApLmdldERhdGUoKTtcclxuICAgICAgICBjb25zdCBsZWFkaW5nID0gKGZpcnN0RGF5IC0gd2Vla1N0YXJ0ICsgNykgJSA3O1xyXG4gICAgICAgIHRoaXMud2Vla0hlYWRlckVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3QgaGVhZGVyID0gdGhpcy53ZWVrSGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWdyaWQtaGVhZGVyJyB9KTtcclxuICAgICAgICBjb25zdCBkYXlzID0gWydzdW4nLCdtb24nLCd0dWUnLCd3ZWQnLCd0aHUnLCdmcmknLCdzYXQnXTtcclxuICAgICAgICBjb25zdCBvcmRlcmVkID0gZGF5cy5zbGljZSh3ZWVrU3RhcnQpLmNvbmNhdChkYXlzLnNsaWNlKDAsIHdlZWtTdGFydCkpO1xyXG4gICAgICAgIG9yZGVyZWQuZm9yRWFjaChkID0+IGhlYWRlci5jcmVhdGVEaXYoeyB0ZXh0OiBkLCBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXItY2VsbCcgfSkpO1xyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcclxuICAgICAgICBjb25zdCBzZWdtZW50R2FwID0gNDsgLy8gZ2FwcHlcclxuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgICAgICBjb25zdCBsb25nRXZlbnRzUHJlc2V0ID0gdGhpcy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSk7XHJcbiAgICAgICAgbG9uZ0V2ZW50c1ByZXNldC5mb3JFYWNoKGV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSEpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgMSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcclxuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVhZGluZzsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5IGRheWJsZS1pbmFjdGl2ZScgfSk7XHJcbiAgICAgICAgICAgIGMuc2V0QXR0cignZGF0YS1lbXB0eScsICd0cnVlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAobGV0IGRheSA9IDE7IGRheSA8PSBkYXlzSW5Nb250aDsgZGF5KyspIHtcclxuICAgICAgICAgICAgY29uc3QgZnVsbERhdGUgPSBgJHt5fS0ke1N0cmluZyhtICsgMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xyXG4gICAgICAgICAgICBjb25zdCBjZWxsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheScgfSk7XHJcbiAgICAgICAgICAgIGNlbGwuc2V0QXR0cignZGF0YS1kYXRlJywgZnVsbERhdGUpO1xyXG4gICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcclxuICAgICAgICAgICAgY29uc3QgbnVtID0gZGF5SGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktbnVtYmVyJywgdGV4dDogU3RyaW5nKGRheSkgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF5ID09PSB0LmdldERhdGUoKSAmJiBtID09PSB0LmdldE1vbnRoKCkgJiYgeSA9PT0gdC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICBpZiAoaXNUb2RheSkge1xyXG4gICAgICAgICAgICAgICAgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWN1cnJlbnQtZGF5Jyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5hZGRDbGFzcygnZGItZGF5LXNlYXJjaC1idG4nKTtcclxuICAgICAgICAgICAgICAgIHNldEljb24oc2VhcmNoQnRuLCAnZm9jdXMnKTtcclxuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBsb25nQ29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1jb250YWluZXInIH0pO1xyXG4gICAgICAgICAgICBsb25nQ29udGFpbmVyLmFkZENsYXNzKCdkYi1sb25nLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1jb250YWluZXInIH0pO1xyXG4gICAgICAgICAgICBjb25zdCBwcmVDb3VudCA9IGNvdW50c0J5RGF0ZVtmdWxsRGF0ZV0gfHwgMDtcclxuICAgICAgICAgICAgY29uc3QgcHJlTXQgPSBwcmVDb3VudCA+IDAgPyAocHJlQ291bnQgKiBzZWdtZW50SGVpZ2h0KSArIChNYXRoLm1heCgwLCBwcmVDb3VudCAtIDEpICogc2VnbWVudEdhcCkgKyAyIDogMDtcclxuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IHByZU10ID8gYCR7cHJlTXR9cHhgIDogJyc7XHJcbiAgICAgICAgICAgIGlmICgodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF5Q2VsbE1heEhlaWdodCA/PyAwKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4SCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRheUNlbGxNYXhIZWlnaHQgPz8gMDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWF4SCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVhZEggPSAoZGF5SGVhZGVyIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRIZWlnaHQgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9uZ0ggPSAobG9uZ0NvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkub2Zmc2V0SGVpZ2h0IHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3QgPSBNYXRoLm1heCgyNCwgbWF4SCAtIGhlYWRIIC0gbG9uZ0ggLSA4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNlbGwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLm1heEhlaWdodCA9IGAke21heEh9cHhgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2VsbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkuc3R5bGUubWF4SGVpZ2h0ID0gYCR7cmVzdH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChjb250YWluZXIgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkuY2xhc3NMaXN0LmFkZCgnZGF5YmxlLXNjcm9sbGFibGUnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmRhdGUgPT09IGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZSA9PiBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5jcmVhdGVFdmVudEl0ZW0oZSkpKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIEFsbG93IHJlb3JkZXJpbmcgZXZlbnRzIHdpdGhpbiB0aGUgY29udGFpbmVyXHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHsgXHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFNob3cgZHJvcCBwb3NpdGlvbiBpbmRpY2F0b3Igb25seSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCAmJiB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50ID09PSBjb250YWluZXIgJiYgZXZlbnRDb3VudCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHZlcnRpY2FsIHBvc2l0aW9uIHdpdGhpbiB0aGUgdGFyZ2V0IGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBleGlzdGluZyBkcm9wIGluZGljYXRvcnNcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpbmRpY2F0b3IgYWJvdmUgb3IgYmVsb3cgYmFzZWQgb24gbW91c2UgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERyb3AgYWJvdmVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdhYm92ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRHJvcCBiZWxvd1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuYWRkQ2xhc3MoJ2JlbG93Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGluZGljYXRvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjb250YWluZXIub25kcmFnbGVhdmUgPSAoZSkgPT4geyBcclxuICAgICAgICAgICAgICAgIC8vIE9ubHkgcmVtb3ZlIGluZGljYXRvcnMgaWYgd2UncmUgdHJ1bHkgbGVhdmluZyB0aGUgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRyb3AgaW5kaWNhdG9yXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdjYWxlbmRhcicpIHJldHVybjsgLy8gT25seSByZW9yZGVyIGNhbGVuZGFyIGV2ZW50cywgbm90IGZyb20gaG9sZGVyXHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIGV2ZW50IGJlaW5nIGRyYWdnZWQgYnkgSURcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBkcmFnZ2VkIGV2ZW50IGlzIGZyb20gdGhpcyBjb250YWluZXJcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGFyZ2V0IGV2ZW50IHRvIGluc2VydCBiZWZvcmUvYWZ0ZXJcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRFdmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEluc2VydCBiZWZvcmVcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGRyYWdnZWRFbCwgdGFyZ2V0RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgYWZ0ZXJcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5hZnRlcihkcmFnZ2VkRWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHVuZGVybHlpbmcgZXZlbnRzIGFycmF5IHRvIG1hdGNoIHRoZSBuZXcgRE9NIG9yZGVyXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxFdmVudEVscyA9IEFycmF5LmZyb20oY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdPcmRlciA9IGFsbEV2ZW50RWxzLm1hcChlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQpLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gUmVidWlsZCBldmVudHMgYXJyYXkgZm9yIHRoaXMgZGF0ZSB0byBtYXRjaCBuZXcgb3JkZXJcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRheURhdGUgPSBmdWxsRGF0ZTsgLy8gZnVsbERhdGUgZnJvbSBvdXRlciBzY29wZVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SW5kaWNlcy5wdXNoKGlkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFNvcnQgdGhlIGluZGljZXMgYmFzZWQgb24gbmV3IG9yZGVyXHJcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudElkVG9JbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICAgICAgICAgICAgICBuZXdPcmRlci5mb3JFYWNoKChldmVudElkLCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBkYXlFdmVudEluZGljZXMuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQSA9IHRoaXMuZXZlbnRzW2FdLmlkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQiA9IHRoaXMuZXZlbnRzW2JdLmlkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQSA9IGV2ZW50SWRUb0luZGV4LmdldChpZEEpID8/IDk5OTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckIgPSBldmVudElkVG9JbmRleC5nZXQoaWRCKSA/PyA5OTk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBSZWNvbnN0cnVjdCBldmVudHMgYXJyYXkgd2l0aCByZW9yZGVyZWQgZGF5IGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgICAgICBsZXQgZGF5RXZlbnRJZHggPSAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKHRoaXMuZXZlbnRzW2RheUV2ZW50SW5kaWNlc1tkYXlFdmVudElkeF1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJZHgrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaChldik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gcmVvcmRlcmVkRXZlbnRzO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSB1cGRhdGVkIG9yZGVyXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjZWxsLm9uY2xpY2sgPSAoZXYpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIC8vIE9ubHkgb3BlbiBtb2RhbCBpZiBjbGlja2luZyBvbiB0aGUgY2VsbCBpdHNlbGYgb3IgY29udGFpbmVyLCBub3Qgb24gYW4gZXZlbnRcclxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSAmJiB0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKSA9PT0gY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuRXZlbnRNb2RhbCh1bmRlZmluZWQsIGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY2VsbC5vbm1vdXNlZG93biA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKChldiBhcyBNb3VzZUV2ZW50KS5idXR0b24gIT09IDApIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBjbGlja2luZyBvbiBhbiBldmVudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBhbHJlYWR5IGRyYWdnaW5nXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY2VsbC5vbm1vdXNlb3ZlciA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY2VsbC5vbnRvdWNoc3RhcnQgPSAoZXYpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiB0b3VjaGluZyBhbiBldmVudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBhbHJlYWR5IGRyYWdnaW5nXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY2VsbC5vbnRvdWNobW92ZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY2VsbC5vbmRyYWdvdmVyID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjZWxsLmFkZENsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XHJcbiAgICAgICAgICAgIGNlbGwub25kcmFnbGVhdmUgPSAoKSA9PiB7IGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcclxuICAgICAgICAgICAgY2VsbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2hvbGRlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaElkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2biA9IHRoaXMuaG9sZGVyRXZlbnRzLnNwbGljZShoSWR4LCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2bik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuZXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXYgPSB0aGlzLmV2ZW50c1tpZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwYW4gPSBNYXRoLmZsb29yKChuZXcgRGF0ZShldi5lbmREYXRlKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShldi5zdGFydERhdGUpLmdldFRpbWUoKSkgLyA4NjQwMDAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbnMgPSBuZXcgRGF0ZShmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmUgPSBuZXcgRGF0ZShucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmUuc2V0RGF0ZShucy5nZXREYXRlKCkgKyBzcGFuKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5lbmREYXRlID0gYCR7bmUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobmUuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCcwJyl9LSR7U3RyaW5nKG5lLmdldERhdGUoKSkucGFkU3RhcnQoMiwnMCcpfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV2LmRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5kYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdGYWlsZWQgdG8gc2F2ZSBldmVudCBjaGFuZ2VzJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIERlZmVyIGxvbmcgZXZlbnQgcG9zaXRpb25pbmcgdW50aWwgbGF5b3V0IHNldHRsZXNcclxuICAgICAgICAvLyBQcmVwYXJlIG92ZXJsYXkgZm9yIGxvbmcgZXZlbnRzOyBoaWRlIGl0IHVudGlsIHBvc2l0aW9ucyBhcmUgY29tcHV0ZWRcclxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbCA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1sb25nLW92ZXJsYXknIH0pO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5pbnNldCA9ICcwJztcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnpJbmRleCA9ICcxMCc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQodGhpcy5fbG9uZ092ZXJsYXlFbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnJlbmRlckxvbmdFdmVudHMoKSk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcclxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdSTyAmJiAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgLy8gT2JzZXJ2ZSBncmlkIHNpemUgY2hhbmdlcyB0byBrZWVwIGxvbmcgc3BhbnMgYWxpZ25lZFxyXG4gICAgICAgICAgICB0aGlzLl9sb25nUk8gPSBuZXcgKHdpbmRvdyBhcyBhbnkpLlJlc2l6ZU9ic2VydmVyKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2xvbmdSTyAmJiB0aGlzLmdyaWRFbCkgdGhpcy5fbG9uZ1JPLm9ic2VydmUodGhpcy5ncmlkRWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGFydFNlbGVjdGlvbihkYXRlOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlID0gZGF0ZTtcclxuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBkYXRlO1xyXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0aW9uUmFuZ2UoKTtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fZW5kU2VsT25jZSk7XHJcbiAgICB9XHJcbiAgICBfZW5kU2VsT25jZSA9ICgpID0+IHsgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2VuZFNlbE9uY2UpOyB0aGlzLmVuZFNlbGVjdGlvbigpOyB9O1xyXG4gICAgdXBkYXRlU2VsZWN0aW9uKGRhdGU6IHN0cmluZykge1xyXG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZyB8fCB0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBkYXRlO1xyXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0aW9uUmFuZ2UoKTtcclxuICAgIH1cclxuICAgIGVuZFNlbGVjdGlvbigpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxlY3RpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlICYmIHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zZWxlY3Rpb25TdGFydERhdGU7XHJcbiAgICAgICAgICAgIGNvbnN0IGUgPSB0aGlzLnNlbGVjdGlvbkVuZERhdGU7XHJcbiAgICAgICAgICAgIHRoaXMub3BlbkV2ZW50TW9kYWxGb3JSYW5nZShzLCBlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xyXG4gICAgfVxyXG4gICAgaGlnaGxpZ2h0U2VsZWN0aW9uUmFuZ2UoKSB7XHJcbiAgICAgICAgY29uc3QgcyA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlISArICdUMDA6MDA6MDAnKTtcclxuICAgICAgICBjb25zdCBlID0gbmV3IERhdGUodGhpcy5zZWxlY3Rpb25FbmREYXRlISArICdUMDA6MDA6MDAnKTtcclxuICAgICAgICBjb25zdCBbbWluLCBtYXhdID0gcyA8PSBlID8gW3MsIGVdIDogW2UsIHNdO1xyXG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICBsZXQgc2VsZWN0ZWRDb3VudCA9IDA7XHJcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IHtcclxuICAgICAgICAgICAgYy5yZW1vdmVDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBjLmdldEF0dHIoJ2RhdGEtZGF0ZScpO1xyXG4gICAgICAgICAgICBpZiAoIWQpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgZHQgPSBuZXcgRGF0ZShkICsgJ1QwMDowMDowMCcpO1xyXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGJvdGggc3RhcnQgYW5kIGVuZCBkYXRlcyAodXNlID49IGFuZCA8PSBmb3IgaW5jbHVzaXZlIHJhbmdlKVxyXG4gICAgICAgICAgICBpZiAoZHQgPj0gbWluICYmIGR0IDw9IG1heCkge1xyXG4gICAgICAgICAgICAgICAgYy5hZGRDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNsZWFyU2VsZWN0aW9uKCkge1xyXG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICBjZWxscy5mb3JFYWNoKGMgPT4gYy5yZW1vdmVDbGFzcygnZGF5YmxlLXNlbGVjdGVkJykpO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIG9wZW5FdmVudE1vZGFsRm9yUmFuZ2Uoc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCk7XHJcbiAgICAgICAgaWYgKCFmb2xkZXIpIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cclxuICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfVxyXG4gICAgICAgIGNhdGNoIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cclxuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBFdmVudE1vZGFsKHRoaXMuYXBwLCB1bmRlZmluZWQsIHN0YXJ0LCBlbmQsIGFzeW5jIHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2KTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgIH0sIGFzeW5jICgpID0+IHt9LCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBpY2tlciA9IG5ldyBJY29uUGlja2VyTW9kYWwodGhpcy5hcHAsIGljb24gPT4ge1xyXG4gICAgICAgICAgICAgICAgbW9kYWwuc2V0SWNvbihpY29uKTtcclxuICAgICAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbW9kYWwuc2V0SWNvbignJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBwaWNrZXIub3BlbigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIChtb2RhbCBhcyBhbnkpLmNhdGVnb3JpZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XHJcbiAgICAgICAgKG1vZGFsIGFzIGFueSkucGx1Z2luID0gdGhpcy5wbHVnaW47XHJcbiAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlckxvbmdFdmVudHMoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9sb25nT3ZlcmxheUVsIHx8ICF0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuaW5zZXQgPSAnMCc7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcclxuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS56SW5kZXggPSAnMTAnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pLmZpbHRlcihlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmhhc0NsYXNzPy4oJ2RheWJsZS1kYXknKSkgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICBjb25zdCB0b2RheU51bSA9IChlbDogSFRNTEVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbiA9IGVsLnF1ZXJ5U2VsZWN0b3IoJy5kYXlibGUtZGF5LW51bWJlcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIG4gPyBuLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZShuKS5tYXJnaW5Cb3R0b20gfHwgJzAnKSA6IDI0O1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3Qgc2VnbWVudEhlaWdodCA9IDI4O1xyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRHYXAgPSA0O1xyXG4gICAgICAgIGNvbnN0IGdldENlbGxXaWR0aCA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKGNlbGxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDEwMDtcclxuICAgICAgICAgICAgcmV0dXJuIChjZWxsc1swXSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGggfHwgMTAwO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgY291bnRzQnlEYXRlOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcbiAgICAgICAgY29uc3QgbG9uZ0V2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihldiA9PiBldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpO1xyXG4gICAgICAgIGxvbmdFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoZXYuc3RhcnREYXRlISk7XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUhKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IG5ldyBEYXRlKHN0YXJ0KTsgZCA8PSBlbmQ7IGQuc2V0RGF0ZShkLmdldERhdGUoKSArIDEpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gZC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHt5fS0ke219LSR7ZGR9YDtcclxuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHJlcXVpcmVkS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgIGxvbmdFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0SWR4ID0gY2VsbHMuZmluZEluZGV4KGMgPT4gYy5nZXRBdHRyKCdkYXRhLWRhdGUnKSA9PT0gZXYuc3RhcnREYXRlKTtcclxuICAgICAgICAgICAgaWYgKHN0YXJ0SWR4ID09PSAtMSkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSEpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlISk7XHJcbiAgICAgICAgICAgIGNvbnN0IG92ZXJsYXAgPSBsb25nRXZlbnRzXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGUgPT4gZS5zdGFydERhdGUgJiYgZS5lbmREYXRlICYmIGUuc3RhcnREYXRlICE9PSBlLmVuZERhdGUgJiYgbmV3IERhdGUoZS5zdGFydERhdGUhKSA8PSBzdGFydCAmJiBuZXcgRGF0ZShlLmVuZERhdGUhKSA+PSBzdGFydClcclxuICAgICAgICAgICAgICAgIC5zb3J0KChhLGIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZCA9IChuZXcgRGF0ZShhLmVuZERhdGUhKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShhLnN0YXJ0RGF0ZSEpLmdldFRpbWUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmQgPSAobmV3IERhdGUoYi5lbmREYXRlISkuZ2V0VGltZSgpIC0gbmV3IERhdGUoYi5zdGFydERhdGUhKS5nZXRUaW1lKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZCAhPT0gYmQpIHJldHVybiBiZCAtIGFkOyAvLyBsb25nZXIgZmlyc3QgKG9uIHRvcClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5pZC5sb2NhbGVDb21wYXJlKGIuaWQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrSW5kZXggPSBvdmVybGFwLmZpbmRJbmRleChlID0+IGUuaWQgPT09IGV2LmlkKTtcclxuICAgICAgICAgICAgY29uc3Qgc3BhbiA9IE1hdGguZmxvb3IoKGVuZC5nZXRUaW1lKCkgLSBzdGFydC5nZXRUaW1lKCkpLzg2NDAwMDAwKSArIDE7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxzUGVyUm93ID0gNztcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnRSb3cgPSBNYXRoLmZsb29yKHN0YXJ0SWR4IC8gY2VsbHNQZXJSb3cpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmRJZHggPSBzdGFydElkeCArIHNwYW4gLSAxO1xyXG4gICAgICAgICAgICBjb25zdCBlbmRSb3cgPSBNYXRoLmZsb29yKGVuZElkeCAvIGNlbGxzUGVyUm93KTtcclxuICAgICAgICAgICAgY29uc3QgY2VsbFdpZHRoID0gZ2V0Q2VsbFdpZHRoKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2lnID0gYCR7ZXYuY2F0ZWdvcnlJZCB8fCAnJ318JHtldi5jb2xvciB8fCAnJ318JHtldi50ZXh0Q29sb3IgfHwgJyd9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGh9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXN9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5fWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTaWcgPSBgJHtldi50aXRsZSB8fCAnJ318JHtldi5kZXNjcmlwdGlvbiB8fCAnJ318JHtldi5pY29uIHx8ICcnfXwke2V2LnRpbWUgfHwgJyd9YDtcclxuICAgICAgICAgICAgaWYgKHN0YXJ0Um93ID09PSBlbmRSb3cpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbc3RhcnRJZHhdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IGNlbGxzW2VuZElkeF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0IHx8ICFsYXN0KSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmckxlZnQgPSAoZmlyc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldExlZnQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmclRvcCA9IChmaXJzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0VG9wO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbHJSaWdodCA9IChsYXN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0ICsgKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wT2Zmc2V0ID0gdG9kYXlOdW0oZmlyc3QpICsgMTQgKyBzdGFja0luZGV4ICogKHNlZ21lbnRIZWlnaHQgKyBzZWdtZW50R2FwKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBmckxlZnQgLSAyO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gZnJUb3AgKyB0b3BPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IChsclJpZ2h0IC0gZnJMZWZ0KSArIDQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtldi5pZH06cm93OiR7c3RhcnRSb3d9LXNpbmdsZWA7XHJcbiAgICAgICAgICAgICAgICByZXF1aXJlZEtleXMuYWRkKGtleSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc2luZ2xlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcclxuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHN0eWxlU2lnO1xyXG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNvbnRlbnRTaWcgPSBjb250ZW50U2lnO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMub3BlbkV2ZW50TW9kYWwoZXYuaWQhLCBldi5zdGFydERhdGUhLCBldi5lbmREYXRlISk7IH07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwhLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaWcgPSBzdHlsZVNpZztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjc2lnID0gY29udGVudFNpZztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZyB8fCAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnICE9PSBjc2lnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXNpbmdsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHNpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuY29udGVudFNpZyA9IGNzaWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCEsIGV2LnN0YXJ0RGF0ZSEsIGV2LmVuZERhdGUhKTsgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IG5ld0l0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmlzQ29ubmVjdGVkIHx8IGl0ZW0ucGFyZW50RWxlbWVudCAhPT0gdGhpcy5ncmlkRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbCEuYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXdpZHRoJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA/PyAyfXB4YCk7XHJcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS50b3AgPSBgJHt0b3B9cHhgO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuaGVpZ2h0ID0gYCR7c2VnbWVudEhlaWdodH1weGA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByb3cgPSBzdGFydFJvdzsgcm93IDw9IGVuZFJvdzsgcm93KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dTdGFydElkeCA9IHJvdyAqIGNlbGxzUGVyUm93O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvd0VuZElkeCA9IE1hdGgubWluKHJvd1N0YXJ0SWR4ICsgY2VsbHNQZXJSb3cgLSAxLCBjZWxscy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudFN0YXJ0SW5Sb3cgPSByb3cgPT09IHN0YXJ0Um93ID8gc3RhcnRJZHggOiByb3dTdGFydElkeDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudEVuZEluUm93ID0gcm93ID09PSBlbmRSb3cgPyBlbmRJZHggOiByb3dFbmRJZHg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50U3RhcnRJblJvdyA+IHJvd0VuZElkeCB8fCBldmVudEVuZEluUm93IDwgcm93U3RhcnRJZHgpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbZXZlbnRTdGFydEluUm93XTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gY2VsbHNbZXZlbnRFbmRJblJvd107XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmaXJzdCB8fCAhbGFzdCkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJMZWZ0ID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyVG9wID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbHJSaWdodCA9IChsYXN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0ICsgKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvcE9mZnNldCA9IHRvZGF5TnVtKGZpcnN0KSArIDE0ICsgc3RhY2tJbmRleCAqIChzZWdtZW50SGVpZ2h0ICsgc2VnbWVudEdhcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGZyTGVmdCAtIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9wID0gZnJUb3AgKyB0b3BPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSAobHJSaWdodCAtIGZyTGVmdCkgKyA0O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2V2LmlkfTpyb3c6JHtyb3d9YDtcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZEtleXMuYWRkKGtleSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB0aGlzLl9sb25nRWxzLmdldChrZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09PSBzdGFydFJvdykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc3RhcnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gZW5kUm93KSBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1lbmQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgPSBzdHlsZVNpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuY29udGVudFNpZyA9IGNvbnRlbnRTaWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCEsIGV2LnN0YXJ0RGF0ZSEsIGV2LmVuZERhdGUhKTsgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwhLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2lnID0gc3R5bGVTaWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNzaWcgPSBjb250ZW50U2lnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZyB8fCAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb250ZW50U2lnICE9PSBjc2lnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdJdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IHN0YXJ0Um93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zdGFydCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gZW5kUm93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1lbmQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmxvbmdLZXkgPSBrZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHNpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNvbnRlbnRTaWcgPSBjc2lnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0ub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMub3BlbkV2ZW50TW9kYWwoZXYuaWQhLCBldi5zdGFydERhdGUhLCBldi5lbmREYXRlISk7IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wYXJlbnRFbGVtZW50KSBpdGVtLnJlcGxhY2VXaXRoKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IG5ld0l0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5pc0Nvbm5lY3RlZCB8fCBpdGVtLnBhcmVudEVsZW1lbnQgIT09IHRoaXMuZ3JpZEVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZEVsIS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xyXG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItcmFkaXVzJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXMgPz8gNn1weGApO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUudG9wID0gYCR7dG9wfXB4YDtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuaGVpZ2h0ID0gYCR7c2VnbWVudEhlaWdodH1weGA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBSZW1vdmUgYW55IHN0YWxlIGxvbmcgaXRlbXNcclxuICAgICAgICBBcnJheS5mcm9tKHRoaXMuX2xvbmdFbHMua2V5cygpKS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghcmVxdWlyZWRLZXlzLmhhcyhrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSkhO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsICYmIGVsLnBhcmVudEVsZW1lbnQpIGVsLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5kZWxldGUoa2V5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNlbGxzLmZvckVhY2goY2VsbCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBjZWxsLmdldEF0dHIoJ2RhdGEtZGF0ZScpITtcclxuICAgICAgICAgICAgY29uc3QgY291bnQgPSBjb3VudHNCeURhdGVbZGF0ZV0gfHwgMDtcclxuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gY2VsbC5xdWVyeVNlbGVjdG9yKCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZU10ID0gY291bnQgPiAwID8gKGNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgY291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc1RvZGF5Q2VsbCA9IGNlbGwuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXlibGUtY3VycmVudC1kYXknKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gaXNUb2RheUNlbGwgPyBNYXRoLm1heCgwLCBiYXNlTXQgLSA0KSA6IGJhc2VNdDsgLy8gZ2FwcHlcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSBtdCA/IGAke210fXB4YCA6ICcnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlRXZlbnRJdGVtKGV2OiBEYXlibGVFdmVudCk6IEhUTUxFbGVtZW50IHtcclxuICAgICAgICBjb25zdCBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgaXRlbS5jbGFzc05hbWUgPSAnZGF5YmxlLWV2ZW50JztcclxuICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZSgnZHJhZ2dhYmxlJywgJ3RydWUnKTtcclxuICAgICAgICBpdGVtLmRhdGFzZXQuaWQgPSBldi5pZDtcclxuICAgICAgICBpdGVtLmRhdGFzZXQuY2F0ZWdvcnlJZCA9IGV2LmNhdGVnb3J5SWQgfHwgJyc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQXBwbHkgdGl0bGUvZGVzY3JpcHRpb24gYWxpZ25tZW50XHJcbiAgICAgICAgY29uc3QgdGl0bGVBbGlnbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiB8fCAnbGVmdCc7XHJcbiAgICAgICAgY29uc3QgZGVzY0FsaWduID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnREZXNjQWxpZ24gfHwgJ2xlZnQnO1xyXG4gICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS10aXRsZS1hbGlnbi0ke3RpdGxlQWxpZ259YCk7XHJcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWRlc2MtYWxpZ24tJHtkZXNjQWxpZ259YCk7XHJcbiAgICAgICAgaWYgKHRpdGxlQWxpZ24gPT09ICdjZW50ZXInKSB7XHJcbiAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sYXlvdXQtY2VudGVyLWZsZXgnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoaWNoIGNvbG9ycyB0byB1c2U6IHVzZXItc2V0IG9yIGNhdGVnb3J5XHJcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXM/LmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcclxuICAgICAgICBjb25zdCBpc0RlZmF1bHRDYXRlZ29yeSA9ICFldi5jYXRlZ29yeUlkIHx8IGV2LmNhdGVnb3J5SWQgPT09ICdkZWZhdWx0JztcclxuICAgICAgICBcclxuICAgICAgICBsZXQgYmdDb2xvciA9ICcnO1xyXG4gICAgICAgIGxldCB0ZXh0Q29sb3IgPSAnJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBDb2xvciBzZWxlY3Rpb24gbG9naWMgKHVzZXItc2V0IGNvbG9yIGFsd2F5cyBwcmVmZXJyZWQpXHJcbiAgICAgICAgaWYgKGV2LmNvbG9yKSB7XHJcbiAgICAgICAgICAgIGJnQ29sb3IgPSBldi5jb2xvcjtcclxuICAgICAgICAgICAgdGV4dENvbG9yID0gZXYudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihldi5jb2xvcik7XHJcbiAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNvbG9yID0gZXYuY29sb3I7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjYXRlZ29yeSAmJiBjYXRlZ29yeS5iZ0NvbG9yKSB7XHJcbiAgICAgICAgICAgIGJnQ29sb3IgPSBjYXRlZ29yeS5iZ0NvbG9yO1xyXG4gICAgICAgICAgICB0ZXh0Q29sb3IgPSBjYXRlZ29yeS50ZXh0Q29sb3I7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFwcGx5IHN0eWxpbmcgaWYgd2UgaGF2ZSBjb2xvcnNcclxuICAgICAgICBpZiAoYmdDb2xvciAmJiB0ZXh0Q29sb3IpIHtcclxuICAgICAgICAgICAgLy8gQ29udmVydCBoZXggY29sb3IgdG8gcmdiYSB3aXRoIG9wYWNpdHlcclxuICAgICAgICAgICAgY29uc3Qgb3BhY2l0eSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDE7XHJcbiAgICAgICAgICAgIGNvbnN0IHJnYmFDb2xvciA9IGhleFRvUmdiYShiZ0NvbG9yLCBvcGFjaXR5KTtcclxuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1iZy1jb2xvcicsIHJnYmFDb2xvcik7XHJcbiAgICAgICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIHRleHRDb2xvcik7XHJcbiAgICAgICAgICAgIGNvbnN0IGJPcGFjaXR5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5ID8/IDE7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvcmRlckNvbG9yID0gaGV4VG9SZ2JhKHRleHRDb2xvciwgYk9wYWNpdHkpO1xyXG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci1jb2xvcicsIGJvcmRlckNvbG9yKTtcclxuICAgICAgICAgICAgaXRlbS5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBBcHBseSBib3JkZXIgd2lkdGggc2V0dGluZ3NcclxuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xyXG4gICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBBcHBseSBlZmZlY3QgYW5kIGFuaW1hdGlvbiBmcm9tIGNhdGVnb3J5IChhbHdheXMsIHJlZ2FyZGxlc3Mgb2YgY29sb3IgY2hvaWNlKVxyXG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnkuZWZmZWN0ICYmIGNhdGVnb3J5LmVmZmVjdCAhPT0gJycpIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1lZmZlY3QtJHtjYXRlZ29yeS5lZmZlY3R9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzVG9kYXlFdmVudCA9IHRoaXMuaXNFdmVudFRvZGF5KGV2KTtcclxuICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbiAmJiBjYXRlZ29yeS5hbmltYXRpb24gIT09ICcnICYmICghb25seVRvZGF5IHx8IGlzVG9kYXlFdmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9ufWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24yICYmIGNhdGVnb3J5LmFuaW1hdGlvbjIgIT09ICcnICYmICghb25seVRvZGF5IHx8IGlzVG9kYXlFdmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9uMn1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB0aXRsZSA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LXRpdGxlJyB9KTtcclxuICAgICAgICByZW5kZXJNYXJrZG93bihldi50aXRsZSB8fCAnJywgdGl0bGUsIHRoaXMucGx1Z2luLmFwcCk7XHJcbiAgICAgICAgY29uc3QgdEZtdCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPz8gJzI0aCc7XHJcbiAgICAgICAgY29uc3QgdGltZURpc3BsYXkgPSBmb3JtYXRUaW1lUmFuZ2UoZXYudGltZSwgdEZtdCk7XHJcbiAgICAgICAgaWYgKHRpbWVEaXNwbGF5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgICAgICAgICB0aW1lU3Bhbi50ZXh0Q29udGVudCA9IGAgKCR7dGltZURpc3BsYXl9KWA7XHJcbiAgICAgICAgICAgIHRpdGxlLmFwcGVuZENoaWxkKHRpbWVTcGFuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaWNvblRvVXNlID0gZXYuaWNvbiB8fCAoY2F0ZWdvcnk/Lmljb24gfHwgJycpO1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50ICE9PSAnbm9uZScgJiYgaWNvblRvVXNlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGljb25FbCA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWljb24nIH0pO1xyXG4gICAgICAgICAgICBzZXRJY29uKGljb25FbCwgaWNvblRvVXNlKTtcclxuICAgICAgICAgICAgY29uc3QgcGxhY2UgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50ID8/ICdsZWZ0JztcclxuICAgICAgICAgICAgaWYgKHBsYWNlID09PSAnbGVmdCcpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGljb25FbCwgdGl0bGUpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYWNlID09PSAncmlnaHQnKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmFwcGVuZENoaWxkKGljb25FbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxhY2UgPT09ICd0b3AnIHx8IHBsYWNlID09PSAndG9wLWxlZnQnIHx8IHBsYWNlID09PSAndG9wLXJpZ2h0Jykge1xyXG4gICAgICAgICAgICAgICAgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AnKTtcclxuICAgICAgICAgICAgICAgIGlmIChwbGFjZSA9PT0gJ3RvcC1sZWZ0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtbGVmdCcpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocGxhY2UgPT09ICd0b3AtcmlnaHQnKSBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcC1yaWdodCcpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcC1jZW50ZXInKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGljb25FbCwgaXRlbS5maXJzdENoaWxkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZXYuZGVzY3JpcHRpb24pIHtcclxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWRlc2MnIH0pO1xyXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBpbmhlcml0cyB0ZXh0IGNvbG9yXHJcbiAgICAgICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xyXG4gICAgICAgICAgICAgICAgZGVzYy5zdHlsZS5jb2xvciA9IHRleHRDb2xvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZW5kZXJNYXJrZG93bihldi5kZXNjcmlwdGlvbiwgZGVzYywgdGhpcy5wbHVnaW4uYXBwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQ29tcGxldGVkIGJlaGF2aW9yXHJcbiAgICAgICAgaWYgKGV2LmNvbXBsZXRlZCkge1xyXG4gICAgICAgICAgICBjb25zdCBiZWhhdmlvciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlQmVoYXZpb3IgPz8gJ25vbmUnO1xyXG4gICAgICAgICAgICBpZiAoYmVoYXZpb3IgPT09ICdkaW0nKSBpdGVtLmFkZENsYXNzKCdkYXlibGUtZXZlbnQtZGltJyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnc3RyaWtldGhyb3VnaCcpIHRpdGxlLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnaGlkZScpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1ldmVudC1oaWRkZW4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IChldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcclxuICAgICAgICAgICAgaWYgKHdpa2kpIHtcclxuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHJlc29sdmVOb3RlRmlsZSh0aGlzLnBsdWdpbi5hcHAsIHdpa2kpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIChsZWFmIGFzIGFueSkub3BlbkZpbGU/LihmaWxlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcclxuICAgICAgICBpdGVtLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBEcmFnIHN0YXJ0ZWQgb24gZXZlbnQ6JywgZXYuaWQpO1xyXG4gICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XHJcbiAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlciBhcyBEYXRhVHJhbnNmZXIpPy5zZXREYXRhKCdkYXlibGUtc291cmNlJywnY2FsZW5kYXInKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSBpdGVtLmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5sZWZ0ID0gJy0xMDAwMHB4JztcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUub3BhY2l0eSA9ICcxJztcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUud2lkdGggPSBgJHtyZWN0LndpZHRofXB4YDtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUoaXRlbSkuYm9yZGVyUmFkaXVzO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcclxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREcmFnSW1hZ2UoZHJhZ0ltZywgTWF0aC5taW4oOCwgcmVjdC53aWR0aCAvIDQpLCBNYXRoLm1pbig4LCByZWN0LmhlaWdodCAvIDQpKTtcclxuICAgICAgICAgICAgICAgIChpdGVtIGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcclxuICAgICAgICAgICAgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGl0ZW0ub25kcmFnZW5kID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgY29uc3QgZGkgPSAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyBhcyBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgaWYgKGRpICYmIGRpLnBhcmVudEVsZW1lbnQpIGRpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkKTsgfTtcclxuICAgICAgICBpdGVtLm9uY29udGV4dG1lbnUgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEdXBsaWNhdGUnKS5zZXRJY29uKCdjb3B5Jykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdFdjogRGF5YmxlRXZlbnQgPSB7IC4uLmV2LCBpZDogcmFuZG9tSWQoKSB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChuZXdFdik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKGV2LmNvbXBsZXRlZCA/ICdNYXJrIGluY29tcGxldGUnIDogJ01hcmsgY29tcGxldGUnKS5zZXRJY29uKCdjaGVjaycpLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZXYuY29tcGxldGVkID0gIWV2LmNvbXBsZXRlZDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy5yZW5kZXIoKSk7XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgbWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpc0V2ZW50VG9kYXkoZXY6IERheWJsZUV2ZW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgY29uc3QgeXl5eSA9IHQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyh0LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKHQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgIGNvbnN0IHRvZGF5U3RyID0gYCR7eXl5eX0tJHttbX0tJHtkZH1gO1xyXG4gICAgICAgIGlmIChldi5kYXRlKSByZXR1cm4gZXYuZGF0ZSA9PT0gdG9kYXlTdHI7XHJcbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBldi5zdGFydERhdGUgPD0gdG9kYXlTdHIgJiYgZXYuZW5kRGF0ZSA+PSB0b2RheVN0cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiAhZXYuZW5kRGF0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXYuc3RhcnREYXRlID09PSB0b2RheVN0cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlckhvbGRlcigpIHtcclxuICAgICAgICBjb25zdCBsaXN0ID0gdGhpcy5ob2xkZXJFbD8ucXVlcnlTZWxlY3RvcignLmRheWJsZS1ob2xkZXItbGlzdCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICBpZiAoIWxpc3QpIHJldHVybjtcclxuICAgICAgICBsaXN0LmVtcHR5KCk7XHJcbiAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XHJcbiAgICAgICAgICAgIGl0ZW0uZGF0YXNldC5zb3VyY2UgPSAnaG9sZGVyJztcclxuICAgICAgICAgICAgaXRlbS5vbmRyYWdzdGFydCA9IGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCdob2xkZXInKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudG9wID0gJy0xMDAwMHB4JztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUub3BhY2l0eSA9ICcxJztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLndpZHRoID0gYCR7cmVjdC53aWR0aH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3JkZXJSYWRpdXMgPSBnZXRDb21wdXRlZFN0eWxlKGl0ZW0pLmJvcmRlclJhZGl1cztcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREcmFnSW1hZ2UoZHJhZ0ltZywgTWF0aC5taW4oOCwgcmVjdC53aWR0aCAvIDQpLCBNYXRoLm1pbig4LCByZWN0LmhlaWdodCAvIDQpKTtcclxuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IGRyYWdJbWc7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaXRlbS5vbmRyYWdlbmQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRpID0gKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIEVuYWJsZSByZW9yZGVyaW5nIGluc2lkZSBob2xkZXIgbGlzdCB3aXRoIGRyb3AgaW5kaWNhdG9yc1xyXG4gICAgICAgIGxpc3Qub25kcmFnb3ZlciA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCAmJiB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50ID09PSBsaXN0ICYmIGV2ZW50Q291bnQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldEV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgbGlzdC5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gbGlzdCkgbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBsaXN0Lm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcclxuICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdob2xkZXInKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGlmICghZHJhZ2dlZEVsKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ob2xkZXItbGlzdCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGxpc3QpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0RXZlbnQpIHsgXHJcbiAgICAgICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGRyYWdnZWRFbCk7IFxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikgeyBsaXN0Lmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldEV2ZW50KTsgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7IHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7IH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBQZXJzaXN0IG5ldyBob2xkZXIgb3JkZXJcclxuICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZWlkID0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmlkITtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gdGhpcy5ob2xkZXJFdmVudHMuZmluZChldiA9PiBldi5pZCA9PT0gZWlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgcmVvcmRlcmVkLnB1c2goZm91bmQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSByZW9yZGVyZWQ7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIG9wZW5FdmVudE1vZGFsKGlkPzogc3RyaW5nLCBkYXRlPzogc3RyaW5nLCBlbmREYXRlPzogc3RyaW5nKSB7XHJcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpO1xyXG4gICAgICAgIGlmICghZm9sZGVyKSB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XHJcbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7IH1cclxuICAgICAgICBjYXRjaCB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XHJcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBpZCA/ICh0aGlzLmV2ZW50cy5maW5kKGUgPT4gZS5pZCA9PT0gaWQpID8/IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBpZCkpIDogdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IGZyb21Ib2xkZXIgPSAhIShleGlzdGluZyAmJiB0aGlzLmhvbGRlckV2ZW50cy5zb21lKGUgPT4gZS5pZCA9PT0gZXhpc3RpbmcuaWQpKTtcclxuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBFdmVudE1vZGFsKHRoaXMuYXBwLCBleGlzdGluZywgZGF0ZSwgZW5kRGF0ZSwgYXN5bmMgcmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaXNNdWx0aSA9ICEhKHJlc3VsdC5zdGFydERhdGUgJiYgcmVzdWx0LmVuZERhdGUpO1xyXG4gICAgICAgICAgICBjb25zdCBpc1NpbmdsZSA9ICEhcmVzdWx0LmRhdGUgfHwgKCEhcmVzdWx0LnN0YXJ0RGF0ZSAmJiAhcmVzdWx0LmVuZERhdGUpO1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBldjogRGF5YmxlRXZlbnQgPSB7IGlkOiByYW5kb21JZCgpLCAuLi5yZXN1bHQgfSBhcyBEYXlibGVFdmVudDtcclxuICAgICAgICAgICAgICAgIGlmIChpc011bHRpIHx8IGlzU2luZ2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIFNhdmUgZmFpbGVkOicsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUb2RheU1vZGFsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUb2RheU1vZGFsLmV2ZW50cyA9IHRoaXMuZXZlbnRzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbC5vbk9wZW4oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZnJvbUhvbGRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gdGhpcy5ob2xkZXJFdmVudHMuZmlsdGVyKGUgPT4gZS5pZCAhPT0gZXhpc3RpbmcuaWQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuaWQgIT09IGV4aXN0aW5nLmlkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBpY2tlciA9IG5ldyBJY29uUGlja2VyTW9kYWwodGhpcy5hcHAsIGljb24gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSBleGlzdGluZy5pY29uID0gaWNvbjtcclxuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oaWNvbik7XHJcbiAgICAgICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBpY29uIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcuaWNvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oJycpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcGlja2VyLm9wZW4oKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAobW9kYWwgYXMgYW55KS5jYXRlZ29yaWVzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdO1xyXG4gICAgICAgIChtb2RhbCBhcyBhbnkpLnBsdWdpbiA9IHRoaXMucGx1Z2luO1xyXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH1cclxuXHJcbiAgICBvcGVuVG9kYXlNb2RhbChkYXRlOiBzdHJpbmcpIHtcclxuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBUb2RheU1vZGFsKHRoaXMuYXBwLCBkYXRlLCB0aGlzLmV2ZW50cywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbCA9IG1vZGFsO1xyXG4gICAgICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7IHRoaXMuY3VycmVudFRvZGF5TW9kYWwgPSB1bmRlZmluZWQ7IH07XHJcbiAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBFdmVudE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gICAgZXY/OiBEYXlibGVFdmVudDtcclxuICAgIGRhdGU/OiBzdHJpbmc7XHJcbiAgICBlbmREYXRlPzogc3RyaW5nO1xyXG4gICAgb25TdWJtaXQ6IChldjogUGFydGlhbDxEYXlibGVFdmVudD4pID0+IFByb21pc2U8dm9pZD47XHJcbiAgICBvbkRlbGV0ZTogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuICAgIG9uUGlja0ljb246ICgpID0+IFByb21pc2U8dm9pZD47XHJcbiAgICBpY29uPzogc3RyaW5nO1xyXG4gICAgaWNvbkJ0bkVsPzogSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcbiAgICBzZWxlY3RlZENvbG9yPzogc3RyaW5nO1xyXG4gICAgc2VsZWN0ZWRUZXh0Q29sb3I/OiBzdHJpbmc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGV2OiBEYXlibGVFdmVudCB8IHVuZGVmaW5lZCwgZGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBlbmREYXRlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9uU3VibWl0OiAoZXY6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+KSA9PiBQcm9taXNlPHZvaWQ+LCBvbkRlbGV0ZTogKCkgPT4gUHJvbWlzZTx2b2lkPiwgb25QaWNrSWNvbjogKCkgPT4gUHJvbWlzZTx2b2lkPikge1xyXG4gICAgICAgIHN1cGVyKGFwcCk7XHJcbiAgICAgICAgdGhpcy5ldiA9IGV2O1xyXG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5lbmREYXRlID0gZW5kRGF0ZTtcclxuICAgICAgICB0aGlzLm9uU3VibWl0ID0gb25TdWJtaXQ7XHJcbiAgICAgICAgdGhpcy5vbkRlbGV0ZSA9IG9uRGVsZXRlO1xyXG4gICAgICAgIHRoaXMub25QaWNrSWNvbiA9IG9uUGlja0ljb247XHJcbiAgICAgICAgdGhpcy5pY29uID0gZXY/Lmljb247XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gZXY/LmNvbG9yO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0Q29sb3IgPSBldj8udGV4dENvbG9yO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEljb24oaWNvbjogc3RyaW5nKSB7IHRoaXMuaWNvbiA9IGljb247IGlmICh0aGlzLmljb25CdG5FbCkgc2V0SWNvbih0aGlzLmljb25CdG5FbCwgaWNvbiB8fCAncGx1cycpOyB9XHJcblxyXG4gICAgb25PcGVuKCkge1xyXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcclxuICAgICAgICBjLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3QgaGVhZGluZyA9IGMuY3JlYXRlRWwoJ2gzJywgeyBjbHM6ICdkYXlibGUtbW9kYWwtdGl0bGUnIH0pO1xyXG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XHJcbiAgICAgICAgaGVhZGluZy5hZGRDbGFzcygnZGItbW9kYWwtdGl0bGUnKTtcclxuICAgICAgICBoZWFkaW5nLnRleHRDb250ZW50ID0gdGhpcy5ldiA/ICdFZGl0IEV2ZW50JyA6ICdBZGQgTmV3IEV2ZW50JztcclxuICAgICAgICBjb25zdCByb3cxID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcclxuICAgICAgICByb3cxLmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcclxuICAgICAgICBjb25zdCBpY29uQnRuID0gcm93MS5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1pY29uLWFkZCcgfSk7XHJcbiAgICAgICAgaWNvbkJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XHJcbiAgICAgICAgc2V0SWNvbihpY29uQnRuLCB0aGlzLmljb24gPz8gJ3BsdXMnKTtcclxuICAgICAgICBpY29uQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLm9uUGlja0ljb24oKTtcclxuICAgICAgICB0aGlzLmljb25CdG5FbCA9IGljb25CdG47XHJcbiAgICAgICAgY29uc3QgdGl0bGVJbnB1dCA9IHJvdzEuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGV4dCcsIGNsczogJ2RheWJsZS1pbnB1dCcsIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdFdmVudCB0aXRsZScsIGF1dG9mb2N1czogJ3RydWUnIH0gfSk7XHJcbiAgICAgICAgdGl0bGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcclxuICAgICAgICB0aXRsZUlucHV0LnZhbHVlID0gdGhpcy5ldj8udGl0bGUgPz8gJyc7XHJcbiAgICAgICAgY29uc3QgZm9jdXNUaXRsZSA9ICgpID0+IHsgdHJ5IHsgdGl0bGVJbnB1dC5mb2N1cyh7IHByZXZlbnRTY3JvbGw6IHRydWUgfSk7IH0gY2F0Y2gge30gfTtcclxuICAgICAgICBmb2N1c1RpdGxlKCk7XHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZvY3VzVGl0bGUpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoZm9jdXNUaXRsZSwgMCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gW1tsaW5rXV0gc3VnZ2VzdGlvbnMgc2hhcmVkIGZvciB0aXRsZSBhbmQgZGVzY3JpcHRpb25cclxuICAgICAgICBsZXQgc3VnZ2VzdGlvbkNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgICAgICBsZXQgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwO1xyXG4gICAgICAgIGxldCBzdWdnZXN0aW9uVGFyZ2V0OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgIGNvbnN0IGNsb3NlU3VnZ2VzdGlvbnMgPSAoKSA9PiB7IGlmIChzdWdnZXN0aW9uQ29udGFpbmVyKSB7IHN1Z2dlc3Rpb25Db250YWluZXIucmVtb3ZlKCk7IHN1Z2dlc3Rpb25Db250YWluZXIgPSBudWxsOyB9IHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gMDsgc3VnZ2VzdGlvblRhcmdldCA9IG51bGw7IH07XHJcbiAgICAgICAgY29uc3Qgc2hvd1N1Z2dlc3Rpb25zRm9yID0gKHRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHN1Z2dlc3Rpb25Db250YWluZXIpIHN1Z2dlc3Rpb25Db250YWluZXIucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRhcmdldC52YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB2YWwubWF0Y2goL1xcW1xcWyhbXlxcW1xcXV0qPykkLyk7XHJcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgcXVlcnkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGY6IGFueSkgPT4gZi5uYW1lICYmIGYubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KSAmJiAhZi5uYW1lLnN0YXJ0c1dpdGgoJy4nKSlcclxuICAgICAgICAgICAgICAgIC5zbGljZSgwLCAxMCk7XHJcbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHJldHVybjtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvblRhcmdldCA9IHRhcmdldDtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuY2xhc3NOYW1lID0gJ2RheWJsZS1saW5rLXN1Z2dlc3Rpb25zJztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNHB4JztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQgPSAnMTgwcHgnO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS56SW5kZXggPSAnMTAwMDAnO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm1pbldpZHRoID0gJzIwMHB4JztcclxuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZTogYW55LCBpOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0udGV4dENvbnRlbnQgPSBmaWxlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnBhZGRpbmcgPSAnOHB4JztcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3JkZXJCb3R0b20gPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMCkgeyBpdGVtLmNsYXNzTGlzdC5hZGQoJ2lzLXNlbGVjdGVkJyk7IGl0ZW0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJzsgfVxyXG4gICAgICAgICAgICAgICAgaXRlbS5vbm1vdXNlZW50ZXIgPSAoKSA9PiB7IGl0ZW0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJzsgfTtcclxuICAgICAgICAgICAgICAgIGl0ZW0ub25tb3VzZWxlYXZlID0gKCkgPT4geyBpZiAoIWl0ZW0uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1zZWxlY3RlZCcpKSBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd0cmFuc3BhcmVudCc7IH07XHJcbiAgICAgICAgICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSB0YXJnZXQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlTWF0Y2ggPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxhc3RJbmRleE9mKCdbWycpKTtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudmFsdWUgPSBiZWZvcmVNYXRjaCArICdbWycgKyBmaWxlLm5hbWUgKyAnXV0nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyIS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc3VnZ2VzdGlvbkNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQocmVjdC5sZWZ0KSArICdweCc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUudG9wID0gTWF0aC5yb3VuZChyZWN0LnRvcCArIHJlY3QuaGVpZ2h0KSArICdweCc7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbiA9IChkaXI6IDEgfCAtMSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXN1Z2dlc3Rpb25Db250YWluZXIpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN1Z2dlc3Rpb25Db250YWluZXIuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XHJcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goaSA9PiB7IGkuY2xhc3NMaXN0LnJlbW92ZSgnaXMtc2VsZWN0ZWQnKTsgaS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndHJhbnNwYXJlbnQnOyB9KTtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihpdGVtcy5sZW5ndGggLSAxLCBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCArIGRpcikpO1xyXG4gICAgICAgICAgICBjb25zdCBzZWwgPSBpdGVtc1tzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleF07XHJcbiAgICAgICAgICAgIGlmIChzZWwpIHsgc2VsLmNsYXNzTGlzdC5hZGQoJ2lzLXNlbGVjdGVkJyk7IHNlbC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5LWFsdCknOyB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFzdWdnZXN0aW9uQ29udGFpbmVyIHx8ICFzdWdnZXN0aW9uVGFyZ2V0KSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShzdWdnZXN0aW9uQ29udGFpbmVyLmNoaWxkcmVuKSBhcyBIVE1MRWxlbWVudFtdO1xyXG4gICAgICAgICAgICBjb25zdCBzZWwgPSBpdGVtc1tzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleF07XHJcbiAgICAgICAgICAgIGlmICghc2VsKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBzZWwudGV4dENvbnRlbnQgfHwgJyc7XHJcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzdWdnZXN0aW9uVGFyZ2V0LnZhbHVlO1xyXG4gICAgICAgICAgICBjb25zdCBiZWZvcmVNYXRjaCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGFzdEluZGV4T2YoJ1tbJykpO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uVGFyZ2V0LnZhbHVlID0gYmVmb3JlTWF0Y2ggKyAnW1snICsgbmFtZSArICddXSc7XHJcbiAgICAgICAgICAgIGNsb3NlU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXN1Z2dlc3Rpb25Db250YWluZXIpIHJldHVybjtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnQXJyb3dEb3duJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IG1vdmVTdWdnZXN0aW9uU2VsZWN0aW9uKDEpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnQXJyb3dVcCcpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbigtMSk7IH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbigpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRXNjYXBlJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IGNsb3NlU3VnZ2VzdGlvbnMoKTsgfVxyXG4gICAgICAgIH0sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcclxuICAgICAgICB0aXRsZUlucHV0Lm9uaW5wdXQgPSAoKSA9PiB7IHNob3dTdWdnZXN0aW9uc0Zvcih0aXRsZUlucHV0KTsgfTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDcmVhdGUgY29sb3Igc3dhdGNoIHJvdyAod2lsbCBiZSBwb3NpdGlvbmVkIGJhc2VkIG9uIHNldHRpbmcpXHJcbiAgICAgICAgY29uc3QgY3JlYXRlQ29sb3JSb3cgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93IGRheWJsZS1jb2xvci1zd2F0Y2hlcy1yb3cnIH0pO1xyXG4gICAgICAgICAgICBjb2xvclJvdy5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBzd2F0Y2hlc0NvbnRhaW5lciA9IGNvbG9yUm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1jb2xvci1zd2F0Y2hlcycgfSk7XHJcbiAgICAgICAgICAgIHN3YXRjaGVzQ29udGFpbmVyLmFkZENsYXNzKCdkYi1jb2xvci1zd2F0Y2hlcycpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0U3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCBkYXlibGUtY29sb3Itc3dhdGNoLW5vbmUnIH0pO1xyXG4gICAgICAgICAgICBkZWZhdWx0U3dhdGNoLmFkZENsYXNzKCdkYi1jb2xvci1zd2F0Y2gnKTtcclxuICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC50aXRsZSA9ICdOb25lIChkZWZhdWx0KSc7XHJcbiAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2gub25jbGljayA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0Q29sb3IgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWNvbG9yLXN3YXRjaCcpLmZvckVhY2gocyA9PiBzLnJlbW92ZUNsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJykpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0ZWRDb2xvcikgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSAodGhpcyBhcyBhbnkpLnBsdWdpbj8uc2V0dGluZ3M7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0U3dhdGNoZXMgPSAoc2V0dGluZ3M/LnN3YXRjaGVzID8/IFtdKS5tYXAoKHM6IGFueSkgPT4gKHsgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjdXN0b21Td2F0Y2hlcyA9IChzZXR0aW5ncz8udXNlckN1c3RvbVN3YXRjaGVzID8/IFtdKS5tYXAoKHM6IGFueSkgPT4gKHsgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICBsZXQgc3dhdGNoZXM6IEFycmF5PHsgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+ID0gYnVpbHRTd2F0Y2hlcztcclxuICAgICAgICAgICAgaWYgKHNldHRpbmdzPy5jdXN0b21Td2F0Y2hlc0VuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIHN3YXRjaGVzID0gYnVpbHRTd2F0Y2hlcy5jb25jYXQoY3VzdG9tU3dhdGNoZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghc3dhdGNoZXMgfHwgc3dhdGNoZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2hlcyA9IFsnI2ViM2I1YScsICcjZmE4MjMxJywgJyNlNWEyMTYnLCAnIzIwYmY2YicsICcjMGZiOWIxJywgJyMyZDk4ZGEnLCAnIzM4NjdkNicsICcjNTQ1NGQwJywgJyM4ODU0ZDAnLCAnI2I1NTRkMCcsICcjZTgzMmMxJywgJyNlODMyODknLCAnIzk2NWIzYicsICcjODM5MmE0J10ubWFwKGMgPT4gKHsgY29sb3I6IGMgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN3YXRjaGVzLmZvckVhY2goKHsgY29sb3IsIHRleHRDb2xvciB9KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzd2F0Y2ggPSBzd2F0Y2hlc0NvbnRhaW5lci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoJyB9KTtcclxuICAgICAgICAgICAgICAgIHN3YXRjaC5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoJyk7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2guc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2guc3R5bGUuYm9yZGVyQ29sb3IgPSBjb2xvcjtcclxuICAgICAgICAgICAgICAgIHN3YXRjaC50aXRsZSA9IGNvbG9yO1xyXG4gICAgICAgICAgICAgICAgc3dhdGNoLm9uY2xpY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFRleHRDb2xvciA9IHRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IoY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtY29sb3Itc3dhdGNoJykuZm9yRWFjaChzID0+IHMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dhdGNoLmFkZENsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRDb2xvciA9PT0gY29sb3IpIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbG9yUm93O1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWRkIGNvbG9yIHN3YXRjaGVzIHVuZGVyIHRpdGxlIGlmIHNldHRpbmcgc2F5cyBzb1xyXG4gICAgICAgIGxldCBjb2xvclJvdzogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3QgY29sb3JTd2F0Y2hQb3MgPSAodGhpcyBhcyBhbnkpLnBsdWdpbj8uc2V0dGluZ3M/LmNvbG9yU3dhdGNoUG9zaXRpb24gPz8gJ3VuZGVyLXRpdGxlJztcclxuICAgICAgICBpZiAoY29sb3JTd2F0Y2hQb3MgPT09ICd1bmRlci10aXRsZScpIHtcclxuICAgICAgICAgICAgY29sb3JSb3cgPSBjcmVhdGVDb2xvclJvdygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBydWxlUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93IGRheWJsZS1tb2RhbC1yb3ctY2VudGVyJyB9KTtcclxuICAgICAgICBydWxlUm93LmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcclxuICAgICAgICBjb25zdCBjYXRlZ29yeUxhYmVsID0gcnVsZVJvdy5jcmVhdGVFbCgnbGFiZWwnLCB7IHRleHQ6ICdDYXRlZ29yeTonIH0pO1xyXG4gICAgICAgIGNhdGVnb3J5TGFiZWwuYWRkQ2xhc3MoJ2RiLWxhYmVsJyk7XHJcbiAgICAgICAgY2F0ZWdvcnlMYWJlbC5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuICAgICAgICBsZXQgc2VsZWN0ZWRDYXRlZ29yeUlkID0gdGhpcy5ldj8uY2F0ZWdvcnlJZDtcclxuICAgICAgICBjb25zdCBjYXRlZ29yeVNlbGVjdCA9IHJ1bGVSb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnZGF5YmxlLWlucHV0IGRheWJsZS1jYXRlZ29yeS1zZWxlY3QnIH0pO1xyXG4gICAgICAgIGNhdGVnb3J5U2VsZWN0LmFkZENsYXNzKCdkYi1zZWxlY3QnKTtcclxuICAgICAgICBjb25zdCBlbXB0eU9wdCA9IGNhdGVnb3J5U2VsZWN0LmNyZWF0ZUVsKCdvcHRpb24nKTsgZW1wdHlPcHQudmFsdWU9Jyc7IGVtcHR5T3B0LnRleHQ9J0RlZmF1bHQnO1xyXG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSAodGhpcyBhcyBhbnkpLmNhdGVnb3JpZXMgfHwgW107XHJcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKChjOiBFdmVudENhdGVnb3J5KSA9PiB7IGNvbnN0IG9wdCA9IGNhdGVnb3J5U2VsZWN0LmNyZWF0ZUVsKCdvcHRpb24nKTsgb3B0LnZhbHVlID0gYy5pZDsgb3B0LnRleHQgPSBjLm5hbWU7IH0pO1xyXG4gICAgICAgIGNhdGVnb3J5U2VsZWN0LnZhbHVlID0gc2VsZWN0ZWRDYXRlZ29yeUlkID8/ICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNhdGVnb3J5U2VsZWN0Lm9uY2hhbmdlID0gKCkgPT4geyBcclxuICAgICAgICAgICAgc2VsZWN0ZWRDYXRlZ29yeUlkID0gY2F0ZWdvcnlTZWxlY3QudmFsdWUgfHwgdW5kZWZpbmVkOyBcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbXVsdGktZGF5IGV2ZW50XHJcbiAgICAgICAgY29uc3QgaXNNdWx0aURheSA9IHRoaXMuZW5kRGF0ZSAmJiB0aGlzLmVuZERhdGUgIT09IHRoaXMuZGF0ZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBTdGFydCB0aW1lL2RhdGUgcm93XHJcbiAgICAgICAgY29uc3Qgcm93MiA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XHJcbiAgICAgICAgcm93Mi5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XHJcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gcm93Mi5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0aW1lJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcclxuICAgICAgICBzdGFydFRpbWUuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XHJcbiAgICAgICAgc3RhcnRUaW1lLnZhbHVlID0gdGhpcy5ldj8udGltZT8uc3BsaXQoJy0nKVswXSA/PyAnJztcclxuICAgICAgICBjb25zdCBzdGFydERhdGUgPSByb3cyLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2RhdGUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xyXG4gICAgICAgIHN0YXJ0RGF0ZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcclxuICAgICAgICBzdGFydERhdGUudmFsdWUgPSB0aGlzLmV2Py5kYXRlID8/IHRoaXMuZXY/LnN0YXJ0RGF0ZSA/PyB0aGlzLmRhdGUgPz8gJyc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRW5kIHRpbWUvZGF0ZSByb3cgKG9ubHkgZm9yIG11bHRpLWRheSBldmVudHMpXHJcbiAgICAgICAgbGV0IGVuZFRpbWU6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgbGV0IGVuZERhdGVJbnB1dDogSFRNTElucHV0RWxlbWVudCB8IHVuZGVmaW5lZDtcclxuICAgICAgICBpZiAoaXNNdWx0aURheSkge1xyXG4gICAgICAgICAgICBjb25zdCByb3czID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcclxuICAgICAgICAgICAgcm93My5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XHJcbiAgICAgICAgICAgIGVuZFRpbWUgPSByb3czLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RpbWUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xyXG4gICAgICAgICAgICBlbmRUaW1lLmFkZENsYXNzKCdkYi1pbnB1dCcpO1xyXG4gICAgICAgICAgICBlbmRUaW1lLnZhbHVlID0gdGhpcy5ldj8udGltZT8uc3BsaXQoJy0nKVsxXSA/PyAnJztcclxuICAgICAgICAgICAgZW5kRGF0ZUlucHV0ID0gcm93My5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdkYXRlJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcclxuICAgICAgICAgICAgZW5kRGF0ZUlucHV0LmFkZENsYXNzKCdkYi1pbnB1dCcpO1xyXG4gICAgICAgICAgICBlbmREYXRlSW5wdXQudmFsdWUgPSB0aGlzLmVuZERhdGUgPz8gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGRlc2NJbnB1dCA9IGMuY3JlYXRlRWwoJ3RleHRhcmVhJywgeyBjbHM6ICdkYXlibGUtdGV4dGFyZWEnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnRGVzY3JpcHRpb24nIH0gfSk7XHJcbiAgICAgICAgZGVzY0lucHV0LmFkZENsYXNzKCdkYi10ZXh0YXJlYScpO1xyXG4gICAgICAgIGRlc2NJbnB1dC52YWx1ZSA9IHRoaXMuZXY/LmRlc2NyaXB0aW9uID8/ICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGRlc2NJbnB1dC5vbmlucHV0ID0gKCkgPT4geyBzaG93U3VnZ2VzdGlvbnNGb3IoZGVzY0lucHV0KTsgfTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBBZGQgY29sb3Igc3dhdGNoZXMgdW5kZXIgZGVzY3JpcHRpb24gaWYgc2V0dGluZyBzYXlzIHNvXHJcbiAgICAgICAgaWYgKGNvbG9yU3dhdGNoUG9zID09PSAndW5kZXItZGVzY3JpcHRpb24nKSB7XHJcbiAgICAgICAgICAgIGNvbG9yUm93ID0gY3JlYXRlQ29sb3JSb3coKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZm9vdGVyID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtZm9vdGVyJyB9KTtcclxuICAgICAgICBmb290ZXIuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3RlcicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gb24gbGVmdCAob25seSBmb3IgZXhpc3RpbmcgZXZlbnRzKVxyXG4gICAgICAgIGlmICh0aGlzLmV2KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlbCA9IGZvb3Rlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1kZWxldGUnIH0pO1xyXG4gICAgICAgICAgICBkZWwuYWRkQ2xhc3MoJ2RiLWJ0bicpO1xyXG4gICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3RyYXNoLTInKTtcclxuICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSAoKSA9PiB0aGlzLm9uRGVsZXRlKCkudGhlbigoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDYW5jZWwgYW5kIFNhdmUgYnV0dG9ucyBvbiByaWdodFxyXG4gICAgICAgIGNvbnN0IHJpZ2h0QnV0dG9ucyA9IGZvb3Rlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtZm9vdGVyLXJpZ2h0JyB9KTtcclxuICAgICAgICByaWdodEJ1dHRvbnMuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3Rlci1yaWdodCcpO1xyXG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHJpZ2h0QnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1jYW5jZWwnIH0pO1xyXG4gICAgICAgIGNhbmNlbC5hZGRDbGFzcygnZGItYnRuJyk7XHJcbiAgICAgICAgY2FuY2VsLnRleHRDb250ZW50ID0gJ0NhbmNlbCc7XHJcbiAgICAgICAgY2FuY2VsLm9uY2xpY2sgPSAoKSA9PiB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgY29uc3Qgb2sgPSByaWdodEJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtc2F2ZSBtb2QtY3RhJyB9KTtcclxuICAgICAgICBvay5hZGRDbGFzcygnZGItYnRuJyk7XHJcbiAgICAgICAgb2sudGV4dENvbnRlbnQgPSAnU2F2ZSBFdmVudCc7XHJcbiAgICAgICAgb2sub25jbGljayA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcGF5bG9hZDogUGFydGlhbDxEYXlibGVFdmVudD4gPSB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkZXNjSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBpY29uOiB0aGlzLmljb24sXHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeUlkOiBzZWxlY3RlZENhdGVnb3J5SWQsXHJcbiAgICAgICAgICAgICAgICBjb2xvcjogdGhpcy5zZWxlY3RlZENvbG9yLFxyXG4gICAgICAgICAgICAgICAgdGV4dENvbG9yOiB0aGlzLnNlbGVjdGVkVGV4dENvbG9yXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmICghcGF5bG9hZC5jYXRlZ29yeUlkIHx8ICFwYXlsb2FkLmNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0cmlnZ2VycyA9ICh0aGlzIGFzIGFueSkucGx1Z2luPy5zZXR0aW5ncz8udHJpZ2dlcnMgfHwgW107XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0eHQgPSAoKHBheWxvYWQudGl0bGUgfHwgJycpICsgJyAnICsgKHBheWxvYWQuZGVzY3JpcHRpb24gfHwgJycpKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0cmlnZ2Vycy5maW5kKCh0OiBhbnkpID0+ICh0LnBhdHRlcm4gfHwgJycpLnRvTG93ZXJDYXNlKCkgJiYgdHh0LmluY2x1ZGVzKCh0LnBhdHRlcm4gfHwgJycpLnRvTG93ZXJDYXNlKCkpKTtcclxuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcGF5bG9hZC5jYXRlZ29yeUlkICYmIGZvdW5kLmNhdGVnb3J5SWQpIHBheWxvYWQuY2F0ZWdvcnlJZCA9IGZvdW5kLmNhdGVnb3J5SWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkLmNvbG9yICYmIGZvdW5kLmNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWQuY29sb3IgPSBmb3VuZC5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF5bG9hZC50ZXh0Q29sb3IgPSBmb3VuZC50ZXh0Q29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoaXNNdWx0aURheSAmJiBlbmRUaW1lICYmIGVuZERhdGVJbnB1dCkge1xyXG4gICAgICAgICAgICAgICAgLy8gTXVsdGktZGF5IGV2ZW50XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydFRpbWVWYWwgPSBzdGFydFRpbWUudmFsdWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmRUaW1lVmFsID0gZW5kVGltZS52YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgICAgIHBheWxvYWQudGltZSA9IChzdGFydFRpbWVWYWwgJiYgZW5kVGltZVZhbCkgPyBgJHtzdGFydFRpbWVWYWx9LSR7ZW5kVGltZVZhbH1gIDogKHN0YXJ0VGltZVZhbCB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnN0YXJ0RGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCB0aGlzLmV2Py5zdGFydERhdGUgfHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gZW5kRGF0ZUlucHV0LnZhbHVlIHx8IHRoaXMuZXY/LmVuZERhdGUgfHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGRheSBldmVudFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lVmFsID0gc3RhcnRUaW1lLnZhbHVlIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5kVGltZVZhbCA9IGVuZFRpbWU/LnZhbHVlIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC50aW1lID0gKHN0YXJ0VGltZVZhbCAmJiBlbmRUaW1lVmFsKSA/IGAke3N0YXJ0VGltZVZhbH0tJHtlbmRUaW1lVmFsfWAgOiAoc3RhcnRUaW1lVmFsIHx8ICcnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrRGF0ZSA9IHRoaXMuZXY/LmRhdGUgfHwgdGhpcy5ldj8uc3RhcnREYXRlIHx8IHRoaXMuZGF0ZSB8fCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBwYXlsb2FkLmRhdGUgPSBzdGFydERhdGUudmFsdWUgfHwgZmFsbGJhY2tEYXRlO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5zdGFydERhdGUgPSBzdGFydERhdGUudmFsdWUgfHwgZmFsbGJhY2tEYXRlO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgUHJvbWlzZS5yZXNvbHZlKHRoaXMub25TdWJtaXQocGF5bG9hZCkpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICB9KS5jYXRjaChlID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIEVycm9yIHNhdmluZyBldmVudDonLCBlKTtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0Vycm9yIHNhdmluZyBldmVudDogJyArIChlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSkpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBQcmV2ZW50IG1vZGFsIG9wZW4gd2hlbiBjbGlja2luZyBtYXJrZG93biBsaW5rcyBpbnNpZGUgZXZlbnQgaXRlbXM7IG9wZW4gbm90ZSBpbiBuZXcgdGFiXHJcbiAgICAgICAgdGhpcy5jb250ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXYpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2EnKSBhcyBIVE1MQW5jaG9yRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGlmICghYSkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCB3aWtpID0gYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xyXG4gICAgICAgICAgICBpZiAod2lraSkge1xyXG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHJlc29sdmVOb3RlRmlsZSh0aGlzLmFwcCwgd2lraSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAobGVhZiBhcyBhbnkpLm9wZW5GaWxlPy4oZmlsZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCB7IGNhcHR1cmU6IHRydWUgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEljb25QaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICAgIG9uUGljazogKGljb246IHN0cmluZykgPT4gdm9pZDtcclxuICAgIG9uUmVtb3ZlPzogKCkgPT4gdm9pZDtcclxuICAgIGFsbEljb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG9uUGljazogKGljb246IHN0cmluZykgPT4gdm9pZCwgb25SZW1vdmU/OiAoKSA9PiB2b2lkKSB7IHN1cGVyKGFwcCk7IHRoaXMub25QaWNrID0gb25QaWNrOyB0aGlzLm9uUmVtb3ZlID0gb25SZW1vdmU7IH1cclxuICAgIG9uT3BlbigpIHtcclxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XHJcbiAgICAgICAgYy5lbXB0eSgpO1xyXG4gICAgICAgIGMuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICBjLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcclxuICAgICAgICBjLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcclxuICAgICAgICBjLmFkZENsYXNzKCdkYi1tb2RhbCcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XHJcbiAgICAgICAgc2VhcmNoUm93LmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcclxuICAgICAgICBzZWFyY2hSb3cuc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XHJcbiAgICAgICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBzZWFyY2hSb3cuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGV4dCcsIGNsczogJ2RheWJsZS1pbnB1dCcsIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdTZWFyY2ggaWNvbnMnIH0gfSk7XHJcbiAgICAgICAgc2VhcmNoSW5wdXQuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XHJcbiAgICAgICAgc2VhcmNoSW5wdXQuc3R5bGUuZmxleEdyb3cgPSAnMSc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgbGlzdCA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWljb24tbGlzdCcgfSk7XHJcbiAgICAgICAgbGlzdC5hZGRDbGFzcygnZGItaWNvbi1saXN0Jyk7XHJcbiAgICAgICAgbGlzdC5zdHlsZS5mbGV4ID0gJzEnO1xyXG4gICAgICAgIGxpc3Quc3R5bGUub3ZlcmZsb3dZID0gJ2F1dG8nO1xyXG4gICAgICAgIGxpc3Quc3R5bGUuZGlzcGxheSA9ICdncmlkJztcclxuICAgICAgICBsaXN0LnN0eWxlLmdyaWRUZW1wbGF0ZUNvbHVtbnMgPSAncmVwZWF0KGF1dG8tZmlsbCwgbWlubWF4KDQwcHgsIDFmcikpJztcclxuICAgICAgICBsaXN0LnN0eWxlLmdhcCA9ICc0cHgnO1xyXG4gICAgICAgIGxpc3Quc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRm9vdGVyIHdpdGggcmVtb3ZlIGJ1dHRvblxyXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgZm9vdGVyLmFkZENsYXNzKCdkYi1tb2RhbC1mb290ZXInKTtcclxuICAgICAgICBmb290ZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICBmb290ZXIuc3R5bGUubWFyZ2luVG9wID0gJ2F1dG8nO1xyXG4gICAgICAgIGZvb3Rlci5zdHlsZS5wYWRkaW5nVG9wID0gJzhweCc7XHJcbiAgICAgICAgZm9vdGVyLnN0eWxlLmJvcmRlclRvcCA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcclxuICAgICAgICBjb25zdCByZW1vdmVCdG4gPSBmb290ZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicsIHRleHQ6ICdSZW1vdmUgSWNvbicgfSk7XHJcbiAgICAgICAgcmVtb3ZlQnRuLmFkZENsYXNzKCdkYi1idG4nKTtcclxuICAgICAgICByZW1vdmVCdG4uc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICByZW1vdmVCdG4uc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xyXG4gICAgICAgIHJlbW92ZUJ0bi5zdHlsZS5nYXAgPSAnNHB4JztcclxuICAgICAgICBjb25zdCByZW1vdmVJY29uID0gcmVtb3ZlQnRuLmNyZWF0ZURpdigpO1xyXG4gICAgICAgIHNldEljb24ocmVtb3ZlSWNvbiwgJ3gnKTtcclxuICAgICAgICByZW1vdmVJY29uLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWZsZXgnO1xyXG4gICAgICAgIHJlbW92ZUJ0bi5vbmNsaWNrID0gKCkgPT4geyBpZiAodGhpcy5vblJlbW92ZSkgdGhpcy5vblJlbW92ZSgpOyB0aGlzLmNsb3NlKCk7IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gTG9hZCBpY29ucyBsYXppbHlcclxuICAgICAgICBpZiAoIXRoaXMuYWxsSWNvbnMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsSWNvbnMgPSBnZXRJY29uSWRzU2FmZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBsZXQgZmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLnNsaWNlKDAsIDk2KTsgLy8gT25seSBzaG93IGZpcnN0IDEwMCBpbml0aWFsbHlcclxuICAgICAgICBsZXQgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoaWNvbnM6IHN0cmluZ1tdKSA9PiB7XHJcbiAgICAgICAgICAgIGxpc3QuZW1wdHkoKTtcclxuICAgICAgICAgICAgaWNvbnMuc2xpY2UoMCwgMjAwKS5mb3JFYWNoKGlkID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IGxpc3QuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWljb24tYnRuJyB9KTtcclxuICAgICAgICAgICAgICAgIGJ0bi5hZGRDbGFzcygnZGItaWNvbi1idG4nKTtcclxuICAgICAgICAgICAgICAgIGJ0bi5zdHlsZS5wYWRkaW5nID0gJzZweCc7XHJcbiAgICAgICAgICAgICAgICBidG4udGl0bGUgPSBpZDtcclxuICAgICAgICAgICAgICAgIHNldEljb24oYnRuLCBpZCk7XHJcbiAgICAgICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5vblBpY2soaWQpOyB0aGlzLmNsb3NlKCk7IH07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgYXBwbHlGaWx0ZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHEgPSAoc2VhcmNoSW5wdXQudmFsdWUgfHwgJycpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICghcSkge1xyXG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgwLCAxNTApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5maWx0ZXIoaWQgPT4gaWQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVuZGVyTGlzdChmdWxsRmlsdGVyZWQpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgc2VhcmNoSW5wdXQub25pbnB1dCA9IGFwcGx5RmlsdGVyO1xyXG4gICAgICAgIHJlbmRlckxpc3QoZmlsdGVyZWQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQcm9tcHRTZWFyY2hNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICAgIHZpZXc6IERheWJsZUNhbGVuZGFyVmlldztcclxuICAgIHF1ZXJ5OiBzdHJpbmcgPSAnJztcclxuICAgIHJlc3VsdHM6IERheWJsZUV2ZW50W10gPSBbXTtcclxuICAgIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IDA7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgdmlldzogRGF5YmxlQ2FsZW5kYXJWaWV3KSB7IFxyXG4gICAgICAgIHN1cGVyKGFwcCk7IFxyXG4gICAgICAgIHRoaXMudmlldyA9IHZpZXc7IFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbC5jbGFzc0xpc3QucmVtb3ZlKCdtb2RhbCcpO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGFsRWwuY2xhc3NOYW1lID0gJ3Byb21wdCc7XHJcbiAgICAgICAgICAgIC8vIFJlbW92ZSBkZWZhdWx0IGNvbnRlbnQgd3JhcHBlciBzbyBwcm9tcHQgaXMgdGhlIHJvb3RcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGVudEVsICYmIHRoaXMuY29udGVudEVsLnBhcmVudEVsZW1lbnQgPT09IHRoaXMubW9kYWxFbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50RWwucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIHt9XHJcbiAgICB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3Qgcm9vdCA9IHRoaXMubW9kYWxFbDtcclxuICAgICAgICB3aGlsZSAocm9vdC5maXJzdENoaWxkKSByb290LnJlbW92ZUNoaWxkKHJvb3QuZmlyc3RDaGlsZCk7XHJcbiAgICAgICAgY29uc3QgaW5wdXRXcmFwID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdwcm9tcHQtaW5wdXQtY29udGFpbmVyJyB9KTtcclxuICAgICAgICBjb25zdCBpbnB1dCA9IGlucHV0V3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IGNsczogJ3Byb21wdC1pbnB1dCcsIGF0dHI6IHsgYXV0b2NhcGl0YWxpemU6ICdvZmYnLCBzcGVsbGNoZWNrOiAnZmFsc2UnLCBlbnRlcmtleWhpbnQ6ICdkb25lJywgdHlwZTogJ3RleHQnLCBwbGFjZWhvbGRlcjogJ0ZpbmQgZXZlbnRzLi4uJyB9IH0pO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNFbCA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAncHJvbXB0LXJlc3VsdHMnIH0pO1xyXG4gICAgICAgIGNvbnN0IHJlbmRlciA9ICgpID0+IHtcclxuICAgICAgICAgICAgcmVzdWx0c0VsLmVtcHR5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5yZXN1bHRzO1xyXG4gICAgICAgICAgICBpZiAoIWl0ZW1zLmxlbmd0aCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKChldiwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gcmVzdWx0c0VsLmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24taXRlbSBtb2QtY29tcGxleCcgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSByb3cuYWRkQ2xhc3MoJ2lzLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWVudGVyID0gKCkgPT4geyB0aGlzLnNlbGVjdGVkSW5kZXggPSBpOyByZW5kZXIoKTsgfTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi1jb250ZW50JyB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gY29udGVudC5jcmVhdGVEaXYoeyBjbHM6ICdzdWdnZXN0aW9uLXRpdGxlJyB9KTtcclxuICAgICAgICAgICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gZXYudGl0bGUgfHwgJyh1bnRpdGxlZCknO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm90ZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi1ub3RlJyB9KTtcclxuICAgICAgICAgICAgICAgIG5vdGUudGV4dENvbnRlbnQgPSBldi5kYXRlICsgKGV2LnRpbWUgPyAnICcgKyBldi50aW1lIDogJycpO1xyXG4gICAgICAgICAgICAgICAgbm90ZS5zdHlsZS5mb250U2l6ZSA9ICcwLjhlbSc7XHJcbiAgICAgICAgICAgICAgICBub3RlLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbXV0ZWQpJztcclxuICAgICAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gdGhpcy5jaG9vc2UoaSk7XHJcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMuY2hvb3NlKGkpOyB9O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcSA9IChpbnB1dC52YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgdGhpcy5xdWVyeSA9IHE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBTZWFyY2ggYWxsIG1vbnRocyBieSBsb2FkaW5nIGFsbCBKU09OIGZpbGVzXHJcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMudmlldy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciB8fCAnRGF5YmxlQ2FsZW5kYXInO1xyXG4gICAgICAgICAgICBsZXQgYWxsRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBTdGFydCB3aXRoIGN1cnJlbnQgdmlldyBldmVudHMgdG8gYmUgZmFzdFxyXG4gICAgICAgICAgICBhbGxFdmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLnNsaWNlKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBhbGwgb3RoZXIgZmlsZXMgaWYgd2UgaGF2ZSBhIHF1ZXJ5XHJcbiAgICAgICAgICAgICAgICBpZiAocS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxpc3Rpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIG1pZ2h0IG5vdCBleGlzdCBvciBvdGhlciBlcnJvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nID0geyBmaWxlczogW10gfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSAobGlzdGluZy5maWxlcyB8fCBbXSkuZmlsdGVyKChmOiBzdHJpbmcpID0+IGYudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLmpzb24nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgY3VycmVudCBtb250aCBmaWxlIGFzIGl0J3MgYWxyZWFkeSBpbiBtZW1vcnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudEZpbGUgPSB0aGlzLnZpZXcuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGYgPT09IGN1cnJlbnRGaWxlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGYuZW5kc1dpdGgoY3VycmVudEZpbGUuc3BsaXQoJy8nKS5wb3AoKSEpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eHQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZSh0eHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggbGVnYWN5IGFycmF5IGZvcm1hdCBhbmQgbmV3IG9iamVjdCBmb3JtYXRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVFdmVudHMgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YS5ldmVudHMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUV2ZW50cyA9IGRhdGEuZXZlbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZUV2ZW50cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRXZlbnRzID0gYWxsRXZlbnRzLmNvbmNhdChmaWxlRXZlbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XHJcblxyXG4gICAgICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBiYXNlZCBvbiBJRFxyXG4gICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmlxdWVFdmVudHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBldiBvZiBhbGxFdmVudHMpIHtcclxuICAgICAgICAgICAgICAgIGlmICghc2Vlbi5oYXMoZXYuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Vlbi5hZGQoZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHVuaXF1ZUV2ZW50cy5wdXNoKGV2KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5yZXN1bHRzID0gdW5pcXVlRXZlbnRzLmZpbHRlcihlID0+ICgoZS50aXRsZSB8fCAnJykgKyAnICcgKyAoZS5kZXNjcmlwdGlvbiB8fCAnJykpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkpLnNsaWNlKDAsIDUwKTtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICAgICAgcmVuZGVyKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBvbktleSA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93RG93bicpIHsgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5taW4odGhpcy5yZXN1bHRzLmxlbmd0aCAtIDEsIHRoaXMuc2VsZWN0ZWRJbmRleCArIDEpOyByZW5kZXIoKTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnQXJyb3dVcCcpIHsgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgoMCwgdGhpcy5zZWxlY3RlZEluZGV4IC0gMSk7IHJlbmRlcigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHsgdGhpcy5jaG9vc2UodGhpcy5zZWxlY3RlZEluZGV4KTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRXNjYXBlJykgeyB0aGlzLmNsb3NlKCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgaW5wdXQub25pbnB1dCA9IHVwZGF0ZTtcclxuICAgICAgICBpbnB1dC5vbmtleWRvd24gPSBvbktleTtcclxuICAgICAgICBpbnB1dC5mb2N1cygpO1xyXG4gICAgICAgIHVwZGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgY2hvb3NlKGlkeDogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgZXYgPSB0aGlzLnJlc3VsdHNbaWR4XTtcclxuICAgICAgICBpZiAoIWV2KSByZXR1cm47XHJcbiAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGV2LmRhdGUgfHwgZXYuc3RhcnREYXRlO1xyXG4gICAgICAgIGlmIChkYXRlU3RyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFt5LCBtLCBkXSA9IGRhdGVTdHIuc3BsaXQoJy0nKS5tYXAoTnVtYmVyKTtcclxuICAgICAgICAgICAgdGhpcy52aWV3LmN1cnJlbnREYXRlID0gbmV3IERhdGUoeSwgKG0gfHwgMSkgLSAxLCBkIHx8IDEpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnZpZXcubG9hZEFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgdGhpcy52aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gQXJyYXkuZnJvbSh0aGlzLnZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChgLmRheWJsZS1ldmVudFtkYXRhLWlkPVwiJHtldi5pZH1cIl1gKSkgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICAgICAgICAgIG5vZGVzLmZvckVhY2gobiA9PiBuLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1oaWdobGlnaHQnKSk7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgbm9kZXMuZm9yRWFjaChuID0+IG4uY2xhc3NMaXN0LnJlbW92ZSgnZGF5YmxlLWV2ZW50LWhpZ2hsaWdodCcpKTsgfSwgMjAwMCk7XHJcbiAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFRvZGF5TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBkYXRlOiBzdHJpbmc7XHJcbiAgICBldmVudHM6IERheWJsZUV2ZW50W107XHJcbiAgICB2aWV3PzogRGF5YmxlQ2FsZW5kYXJWaWV3O1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgZGF0ZTogc3RyaW5nLCBldmVudHM6IERheWJsZUV2ZW50W10sIHZpZXc/OiBEYXlibGVDYWxlbmRhclZpZXcpIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5ldmVudHMgPSBldmVudHM7XHJcbiAgICAgICAgdGhpcy52aWV3ID0gdmlldztcclxuICAgIH1cclxuICAgIFxyXG4gICAgb25PcGVuKCkge1xyXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcclxuICAgICAgICBjLmVtcHR5KCk7XHJcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgIGMuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xyXG4gICAgICAgIGMuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xyXG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUGFyc2UgZGF0ZVxyXG4gICAgICAgIGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IHRoaXMuZGF0ZS5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xyXG4gICAgICAgIGNvbnN0IGRhdGVPYmogPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XHJcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xyXG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZSA9IG1vbnRoTmFtZXNbZGF0ZU9iai5nZXRNb250aCgpXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBUaXRsZSB3aXRoIGRhdGVcclxuICAgICAgICBjb25zdCB0aXRsZSA9IGMuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBgJHttb250aE5hbWV9ICR7ZGF5fWAgfSk7XHJcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XHJcbiAgICAgICAgdGl0bGUuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEdldCBldmVudHMgZm9yIHRoaXMgZGF0ZVxyXG4gICAgICAgIGNvbnN0IGRheUV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuZGF0ZSA9PT0gdGhpcy5kYXRlKS5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVBID0gYS50aW1lID8gYS50aW1lLnNwbGl0KCctJylbMF0gOiAnOTk6OTknO1xyXG4gICAgICAgICAgICBjb25zdCB0aW1lQiA9IGIudGltZSA/IGIudGltZS5zcGxpdCgnLScpWzBdIDogJzk5Ojk5JztcclxuICAgICAgICAgICAgcmV0dXJuIHRpbWVBLmxvY2FsZUNvbXBhcmUodGltZUIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEV2ZW50cyBjb250YWluZXIgKHNjcm9sbGFibGUpXHJcbiAgICAgICAgY29uc3QgZXZlbnRzQ29udGFpbmVyID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnRzLWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLmFkZENsYXNzKCdkYi1ldmVudHMtY29udGFpbmVyJyk7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLmZsZXggPSAnMSc7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcclxuICAgICAgICBldmVudHNDb250YWluZXIuc3R5bGUubWFyZ2luQm90dG9tID0gJzEycHgnO1xyXG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5zdHlsZS5wYWRkaW5nUmlnaHQgPSAnOHB4JztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoZGF5RXZlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBldmVudHNDb250YWluZXIuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdObyBldmVudHMgZm9yIHRoaXMgZGF5JyB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC1yb3cnIH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYi10b2RheS1yb3cnKTtcclxuICAgICAgICAgICAgICAgIHJvdy5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICByb3cuZGF0YXNldC5pZCA9IGV2LmlkO1xyXG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzEycHgnO1xyXG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxMnB4JztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gJzhweCc7XHJcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50RWwgPSByb3cuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZmxleCA9ICcxJztcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICAgICAgY29udGVudEVsLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5zdHlsZS5nYXAgPSAnNHB4JztcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGVFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtdGl0bGUnIH0pO1xyXG4gICAgICAgICAgICAgICAgdGl0bGVFbC5hZGRDbGFzcygnZGItdGl0bGUnKTtcclxuICAgICAgICAgICAgICAgIHRpdGxlRWwuc3R5bGUuZm9udFdlaWdodCA9ICc1MDAnO1xyXG4gICAgICAgICAgICAgICAgdGl0bGVFbC5zdHlsZS5jb2xvciA9IGV2LmNvbG9yID8gKGV2LnRleHRDb2xvciB8fCAndmFyKC0tdGV4dC1ub3JtYWwpJykgOiAndmFyKC0tdGV4dC1ub3JtYWwpJztcclxuICAgICAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZUVsLCB0aGlzLnZpZXc/LnBsdWdpbj8uYXBwKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgZXZlbnQgY29sb3JzIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy52aWV3Py5wbHVnaW47XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gcGx1Z2luPy5zZXR0aW5ncz8uZXZlbnRDYXRlZ29yaWVzID8/IFtdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBjYXRlZ29yaWVzLmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcclxuICAgICAgICAgICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGV4dENvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gZXYuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbG9yID0gZXYudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihldi5jb2xvcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gY2F0ZWdvcnkuYmdDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29sb3IgPSBjYXRlZ29yeS50ZXh0Q29sb3I7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYmdDb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBwbHVnaW4/LnNldHRpbmdzPy5ldmVudEJnT3BhY2l0eSA/PyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmFDb2xvciA9IGhleFRvUmdiYShiZ0NvbG9yLCBvcGFjaXR5KTtcclxuICAgICAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcmdiYUNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlRWwuc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3IgfHwgdGl0bGVFbC5zdHlsZS5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICByb3cuY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5lZmZlY3QgJiYgY2F0ZWdvcnkuZWZmZWN0ICE9PSAnJykgcm93LmFkZENsYXNzKGBkYXlibGUtZWZmZWN0LSR7Y2F0ZWdvcnkuZWZmZWN0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHBsdWdpbj8uc2V0dGluZ3M/Lm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbiAmJiBjYXRlZ29yeS5hbmltYXRpb24gIT09ICcnICYmICghb25seVRvZGF5IHx8IHRydWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb259YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24yICYmIGNhdGVnb3J5LmFuaW1hdGlvbjIgIT09ICcnICYmICghb25seVRvZGF5IHx8IHRydWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb24yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUVsID0gcm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS10aW1lJyB9KTtcclxuICAgICAgICAgICAgICAgIHRpbWVFbC5hZGRDbGFzcygnZGItdGltZScpO1xyXG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLm1pbldpZHRoID0gJzYwcHgnO1xyXG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLmZvbnRXZWlnaHQgPSAnNjAwJztcclxuICAgICAgICAgICAgICAgIC8vIE1hdGNoIGV2ZW50IHRpdGxlIGNvbG9yXHJcbiAgICAgICAgICAgICAgICB0aW1lRWwuc3R5bGUuY29sb3IgPSB0aXRsZUVsLnN0eWxlLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZtdCA9IHRoaXMudmlldz8ucGx1Z2luPy5zZXR0aW5ncz8udGltZUZvcm1hdCA/PyAnMjRoJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFZhbCA9IGV2LnRpbWUgPyBldi50aW1lLnNwbGl0KCctJylbMF0gOiAnJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwID0gZm9ybWF0VGltZVZhbHVlKHN0YXJ0VmFsLCBmbXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVFbC50ZXh0Q29udGVudCA9IGRpc3AgfHwgJ+KAlCc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChldi5kZXNjcmlwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtZGVzYycgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLmFkZENsYXNzKCdkYi1kZXNjJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLnN0eWxlLmZvbnRTaXplID0gJzAuOWVtJztcclxuICAgICAgICAgICAgICAgICAgICAvLyBNYXRjaCB0aXRsZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5zdHlsZS5jb2xvciA9IHRpdGxlRWwuc3R5bGUuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyTWFya2Rvd24oZXYuZGVzY3JpcHRpb24sIGRlc2NFbCwgdGhpcy52aWV3Py5wbHVnaW4/LmFwcCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsIGNvbXBsZXRlZCBpbmRpY2F0b3JcclxuICAgICAgICAgICAgICAgIGlmIChldi5jb21wbGV0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWhhdmlvciA9IHRoaXMudmlldz8ucGx1Z2luPy5zZXR0aW5ncz8uY29tcGxldGVCZWhhdmlvciA/PyAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlaGF2aW9yID09PSAnZGltJykgcm93LnN0eWxlLm9wYWNpdHkgPSAnMC42JztcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ3N0cmlrZXRocm91Z2gnKSB0aXRsZUVsLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoYmVoYXZpb3IgPT09ICdoaWRlJykgcm93LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xyXG4gICAgICAgICAgICAgICAgLy8gRHJhZyBoYW5kbGVycyBmb3IgcmVvcmRlcmluZ1xyXG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCd0b2RheScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSByb3cuY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmhlaWdodCA9IGAke3JlY3QuaGVpZ2h0fXB4YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShyb3cpLmJvcmRlclJhZGl1cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERyYWdJbWFnZShkcmFnSW1nLCBNYXRoLm1pbig4LCByZWN0LndpZHRoIC8gNCksIE1hdGgubWluKDgsIHJlY3QuaGVpZ2h0IC8gNCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAocm93IGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcmFnZW5kID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGkgPSAocm93IGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaSAmJiBkaS5wYXJlbnRFbGVtZW50KSBkaS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAocm93IGFzIGFueSkuX19kcmFnSW1nID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIC8vIENsaWNrIHRvIGVkaXRcclxuICAgICAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldz8ub3BlbkV2ZW50TW9kYWwoZXYuaWQsIGV2LmRhdGUgPz8gdGhpcy5kYXRlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAvLyBSaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgICAgICAgICAgICAgIHJvdy5vbmNvbnRleHRtZW51ID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEdXBsaWNhdGUnKS5zZXRJY29uKCdjb3B5Jykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0V2OiBEYXlibGVFdmVudCA9IHsgLi4uZXYsIGlkOiByYW5kb21JZCgpIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMucHVzaChuZXdFdik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMudmlldz8ucmVuZGVyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoZXYuY29tcGxldGVkID8gJ01hcmsgaW5jb21wbGV0ZScgOiAnTWFyayBjb21wbGV0ZScpLnNldEljb24oJ2NoZWNrJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbXBsZXRlZCA9ICFldi5jb21wbGV0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHRoaXMudmlldy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy52aWV3Py5yZW5kZXIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW4gdG9kYXkgbW9kYWxcclxuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um93ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3NDb3VudCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRSb3cgJiYgcm93c0NvdW50ID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRSb3cuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBoIC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0Um93KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cuYWZ0ZXIoaW5kaWNhdG9yKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGV2ZW50c0NvbnRhaW5lcikgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdyA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS10b2RheS1ldmVudC1yb3cnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldFJvdyB8fCB0YXJnZXRSb3cgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldFJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGggLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldFJvdyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFJvdy5hZnRlcihkcmFnZ2VkRWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRSb3cpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZHJhZ2dlZEVsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIFBlcnNpc3Qgb3JkZXIgZm9yIHRoaXMgZGF0ZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmlldykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLmRhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5SWRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlJZHMucHVzaChlaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSA9PT0gZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJzID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSAhPT0gZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRGF5ID0gZGF5SWRzLm1hcChpZCA9PiBvcmlnaW5hbC5maW5kKGUgPT4gZS5pZCA9PT0gaWQpISkuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSBvdGhlcnMuY29uY2F0KHJlb3JkZXJlZERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBGaXhlZCArQWRkIEV2ZW50IGJ1dHRvbiBhdCBib3R0b21cclxuICAgICAgICBjb25zdCBhZGRCdG4gPSBjLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS10b2RheS1hZGQtYnRuJywgdGV4dDogJysgQWRkIEV2ZW50JyB9KTtcclxuICAgICAgICBhZGRCdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuICAgICAgICBhZGRCdG4uc3R5bGUucGFkZGluZyA9ICcxMHB4JztcclxuICAgICAgICBhZGRCdG4uc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcclxuICAgICAgICBhZGRCdG4uc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICAgICAgYWRkQnRuLnN0eWxlLm1hcmdpblRvcCA9ICdhdXRvJztcclxuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXc/Lm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgdGhpcy5kYXRlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuYWJsZSBpbnRlcm5hbCBsaW5rIGNsaWNrcyBpbnNpZGUgdG9kYXkgbW9kYWwgY29udGVudFxyXG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcclxuICAgICAgICAgICAgaWYgKHdpa2kpIHtcclxuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCkge1xyXG4gICAgICAgIHN1cGVyKGFwcCk7XHJcbiAgICB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSBjb250ZW50RWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnU3RvcmFnZSBmb2xkZXIgbm90IHNldCcgfSk7XHJcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiAnWW91IG5lZWQgdG8gc2V0IGEgc3RvcmFnZSBmb2xkZXIgdG8gY3JlYXRlIGFuZCBzYXZlIGV2ZW50cy4nIH0pO1xyXG4gICAgICAgIGNvbnN0IGJ0bnMgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgYnRucy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgIGJ0bnMuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgYnRucy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LWVuZCc7XHJcbiAgICAgICAgYnRucy5zdHlsZS5tYXJnaW5Ub3AgPSAnMTJweCc7XHJcbiAgICAgICAgY29uc3Qgb3BlblNldHRpbmdzQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcclxuICAgICAgICBvcGVuU2V0dGluZ3NCdG4uc2V0VGV4dCgnT3BlbiBTZXR0aW5ncycpO1xyXG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5vbmNsaWNrID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkgeyBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHMgPSAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nO1xyXG4gICAgICAgICAgICAgICAgcz8ub3Blbj8uKCk7XHJcbiAgICAgICAgICAgICAgICBzPy5vcGVuVGFiQnlJZD8uKCdkYXlibGUtY2FsZW5kYXInKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBjbG9zZUJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicgfSk7XHJcbiAgICAgICAgY2xvc2VCdG4uc2V0VGV4dCgnQ2xvc2UnKTtcclxuICAgICAgICBjbG9zZUJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDb25maXJtTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICBvbkNvbmZpcm06ICgpID0+IHZvaWQ7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgbWVzc2FnZTogc3RyaW5nLCBvbkNvbmZpcm06ICgpID0+IHZvaWQpIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgdGhpcy5vbkNvbmZpcm0gPSBvbkNvbmZpcm07XHJcbiAgICB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsO1xyXG4gICAgICAgIGMuZW1wdHkoKTtcclxuICAgICAgICBjLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgYy5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XHJcbiAgICAgICAgYy5zdHlsZS5nYXAgPSAnMTJweCc7XHJcbiAgICAgICAgY29uc3QgbXNnID0gYy5jcmVhdGVFbCgnZGl2Jyk7XHJcbiAgICAgICAgbXNnLnRleHRDb250ZW50ID0gdGhpcy5tZXNzYWdlO1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IGMuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgcm93LnN0eWxlLmdhcCA9ICc4cHgnO1xyXG4gICAgICAgIHJvdy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LWVuZCc7XHJcbiAgICAgICAgY29uc3QgY2FuY2VsID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nIH0pO1xyXG4gICAgICAgIGNhbmNlbC50ZXh0Q29udGVudCA9ICdDYW5jZWwnO1xyXG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIGNvbnN0IG9rID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gbW9kLWN0YScgfSk7XHJcbiAgICAgICAgb2sudGV4dENvbnRlbnQgPSAnRGVsZXRlJztcclxuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4geyB0cnkgeyB0aGlzLm9uQ29uZmlybSgpOyB9IGZpbmFsbHkgeyB0aGlzLmNsb3NlKCk7IH0gfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0SWNvbklkc1NhZmUoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgYW55T2IgPSAod2luZG93IGFzIGFueSkub2JzaWRpYW47XHJcbiAgICBjb25zdCBhcGkgPSAoYXBpTmFtZTogc3RyaW5nKSA9PiAocmVxdWlyZT8uKCdvYnNpZGlhbicpIGFzIGFueSk/LlthcGlOYW1lXSA/PyBhbnlPYj8uW2FwaU5hbWVdO1xyXG4gICAgY29uc3QgaWRzID0gYXBpKCdnZXRJY29uSWRzJyk7XHJcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGlkcygpO1xyXG4gICAgcmV0dXJuIFsnY2FsZW5kYXInLCdjbG9jaycsJ3N0YXInLCdib29rbWFyaycsJ2ZsYWcnLCdiZWxsJywnY2hlY2snLCdwZW5jaWwnLCdib29rJywnemFwJ107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNob29zZVRleHRDb2xvcihoZXg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCByZ2IgPSBoZXhUb1JnYihoZXgpO1xyXG4gICAgaWYgKCFyZ2IpIHJldHVybiAndmFyKC0tdGV4dC1ub3JtYWwpJztcclxuICAgIGNvbnN0IHlpcSA9ICgocmdiLnIqMjk5KSsocmdiLmcqNTg3KSsocmdiLmIqMTE0KSkvMTAwMDtcclxuICAgIHJldHVybiB5aXEgPj0gMTI4ID8gJyMwMDAwMDAnIDogJyNmZmZmZmYnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoZXhUb1JnYihoZXg6IHN0cmluZyk6IHtyOm51bWJlcixnOm51bWJlcixiOm51bWJlcn18bnVsbCB7XHJcbiAgICBjb25zdCBtID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XHJcbiAgICByZXR1cm4gbSA/IHsgcjogcGFyc2VJbnQobVsxXSwxNiksIGc6IHBhcnNlSW50KG1bMl0sMTYpLCBiOiBwYXJzZUludChtWzNdLDE2KSB9IDogbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGV4VG9SZ2JhKGhleDogc3RyaW5nLCBhbHBoYTogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHJnYiA9IGhleFRvUmdiKGhleCk7XHJcbiAgICBpZiAoIXJnYikgcmV0dXJuIGhleDtcclxuICAgIHJldHVybiBgcmdiYSgke3JnYi5yfSwgJHtyZ2IuZ30sICR7cmdiLmJ9LCAke2FscGhhfSlgO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRUaW1lVmFsdWUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZm10OiAnMjRoJyB8ICcxMmgnKTogc3RyaW5nIHtcclxuICAgIGlmICghdmFsdWUpIHJldHVybiAnJztcclxuICAgIGNvbnN0IFtoaFN0ciwgbW1TdHJdID0gdmFsdWUuc3BsaXQoJzonKTtcclxuICAgIGNvbnN0IGhoID0gcGFyc2VJbnQoaGhTdHIgfHwgJzAnLCAxMCk7XHJcbiAgICBjb25zdCBtbSA9IHBhcnNlSW50KG1tU3RyIHx8ICcwJywgMTApO1xyXG4gICAgaWYgKGZtdCA9PT0gJzEyaCcpIHtcclxuICAgICAgICBjb25zdCBpc1BNID0gaGggPj0gMTI7XHJcbiAgICAgICAgY29uc3QgaDEyID0gKChoaCAlIDEyKSB8fCAxMik7XHJcbiAgICAgICAgcmV0dXJuIGAke2gxMn06JHtTdHJpbmcobW0pLnBhZFN0YXJ0KDIsICcwJyl9ICR7aXNQTSA/ICdQTScgOiAnQU0nfWA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYCR7U3RyaW5nKGhoKS5wYWRTdGFydCgyLCAnMCcpfToke1N0cmluZyhtbSkucGFkU3RhcnQoMiwgJzAnKX1gO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRUaW1lUmFuZ2UocmFuZ2U6IHN0cmluZyB8IHVuZGVmaW5lZCwgZm10OiAnMjRoJyB8ICcxMmgnKTogc3RyaW5nIHtcclxuICAgIGlmICghcmFuZ2UpIHJldHVybiAnJztcclxuICAgIGNvbnN0IHBhcnRzID0gcmFuZ2Uuc3BsaXQoJy0nKTtcclxuICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICBjb25zdCBzID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xyXG4gICAgICAgIGNvbnN0IGUgPSBmb3JtYXRUaW1lVmFsdWUocGFydHNbMV0sIGZtdCk7XHJcbiAgICAgICAgaWYgKHMgJiYgZSkgcmV0dXJuIGAke3N9LSR7ZX1gO1xyXG4gICAgICAgIHJldHVybiBzIHx8IGUgfHwgJyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJNYXJrZG93bih0ZXh0OiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBhcHA/OiBBcHApOiB2b2lkIHtcclxuICAgIC8vIFNpbXBsZSBtYXJrZG93biByZW5kZXJpbmc6IGhlYWRpbmdzLCBib2xkLCBpdGFsaWMsIGxpbmtzLCBjb2RlLCBzdHJpa2V0aHJvdWdoLCBoaWdobGlnaHQsIGJsb2NrcXVvdGUsIGltYWdlc1xyXG4gICAgLy8gTk9URTogV2UgZG8gTk9UIGVzY2FwZSBIVE1MIHRvIGFsbG93IHVzZXJzIHRvIHVzZSBIVE1MIHRhZ3MgZGlyZWN0bHkgKGUuZy4sIDx1PnVuZGVybGluZTwvdT4pXHJcbiAgICBsZXQgaHRtbCA9IHRleHRcclxuICAgICAgICAvLyBPYnNpZGlhbiB3aWtpLXN0eWxlIGltYWdlcyAhW1tpbWFnZS5wbmddXVxyXG4gICAgICAgIC5yZXBsYWNlKC8hXFxbXFxbKFteXFxdXSspXFxdXFxdL2csIChtYXRjaCwgZmlsZW5hbWUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VVcmwgPSBhcHAgPyByZXNvbHZlSW1hZ2VQYXRoKGZpbGVuYW1lLCBhcHApIDogZmlsZW5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiBgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cIiR7ZmlsZW5hbWV9XCIgY2xhc3M9XCJkYXlibGUtZW1iZWQtaW1hZ2VcIj5gO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLy8gTWFya2Rvd24gaW1hZ2VzICFbYWx0XSh1cmwpXHJcbiAgICAgICAgLnJlcGxhY2UoLyFcXFsoW15cXF1dKilcXF1cXCgoW15cXCldKylcXCkvZywgKG1hdGNoLCBhbHQsIHNyYykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpbWFnZVVybCA9IGFwcCA/IHJlc29sdmVJbWFnZVBhdGgoc3JjLCBhcHApIDogc3JjO1xyXG4gICAgICAgICAgICByZXR1cm4gYDxpbWcgc3JjPVwiJHtpbWFnZVVybH1cIiBhbHQ9XCIke2FsdH1cIiBjbGFzcz1cImRheWJsZS1lbWJlZC1pbWFnZVwiPmA7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAvLyBIZWFkaW5ncyAjLi4jIyMjIyNcclxuICAgICAgICAucmVwbGFjZSgvXiMjIyMjI1xccysoLispJC9nbSwgJzxoNj4kMTwvaDY+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjIyMjXFxzKyguKykkL2dtLCAnPGg1PiQxPC9oNT4nKVxyXG4gICAgICAgIC5yZXBsYWNlKC9eIyMjI1xccysoLispJC9nbSwgJzxoND4kMTwvaDQ+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjI1xccysoLispJC9nbSwgJzxoMz4kMTwvaDM+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjXFxzKyguKykkL2dtLCAnPGgyPiQxPC9oMj4nKVxyXG4gICAgICAgIC5yZXBsYWNlKC9eI1xccysoLispJC9nbSwgJzxoMT4kMTwvaDE+JylcclxuICAgICAgICAvLyBCb2xkICoqdGV4dCoqIGFuZCBfX3RleHRfX1xyXG4gICAgICAgIC5yZXBsYWNlKC9cXCpcXCooLis/KVxcKlxcKi9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpXHJcbiAgICAgICAgLnJlcGxhY2UoL19fKC4rPylfXy9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpXHJcbiAgICAgICAgLy8gSXRhbGljICp0ZXh0KiBhbmQgX3RleHRfXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcKiguKz8pXFwqL2csICc8ZW0+JDE8L2VtPicpXHJcbiAgICAgICAgLnJlcGxhY2UoL18oLis/KV8vZywgJzxlbT4kMTwvZW0+JylcclxuICAgICAgICAvLyBTdHJpa2V0aHJvdWdoIH5+dGV4dH5+XHJcbiAgICAgICAgLnJlcGxhY2UoL35+KC4rPyl+fi9nLCAnPGRlbD4kMTwvZGVsPicpXHJcbiAgICAgICAgLy8gSGlnaGxpZ2h0ID09dGV4dD09XHJcbiAgICAgICAgLnJlcGxhY2UoLz09KC4rPyk9PS9nLCAnPG1hcms+JDE8L21hcms+JylcclxuICAgICAgICAvLyBCbG9ja3F1b3RlIGxpbmVzIHN0YXJ0aW5nIHdpdGggPlxyXG4gICAgICAgIC5yZXBsYWNlKC9eJmd0O1sgXFx0XSooLispJC9nbSwgJzxibG9ja3F1b3RlPiQxPC9ibG9ja3F1b3RlPicpXHJcbiAgICAgICAgLy8gQ29kZSBgdGV4dGAgYW5kIGBgYGJsb2Nrc2BgYFxyXG4gICAgICAgIC5yZXBsYWNlKC9gKFteYF0rKWAvZywgJzxjb2RlIGNsYXNzPVwiZGF5YmxlLWlubGluZS1jb2RlXCI+JDE8L2NvZGU+JylcclxuICAgICAgICAucmVwbGFjZSgvYGBgKFtcXHNcXFNdKj8pYGBgL2csICc8cHJlIGNsYXNzPVwiZGF5YmxlLWNvZGUtYmxvY2tcIj48Y29kZT4kMTwvY29kZT48L3ByZT4nKVxyXG4gICAgICAgIC8vIExpbmtzIFtbdGFyZ2V0fGFsaWFzXV0gYW5kIFt0ZXh0XSh1cmwpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcW1xcWyhbXlxcW1xcXV0rKVxcXVxcXS9nLCAobSwgaW5uZXIpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBTdHJpbmcoaW5uZXIpLnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHBhcnRzWzFdIHx8IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICByZXR1cm4gYDxhIGNsYXNzPVwiaW50ZXJuYWwtbGluayBkYXlibGUtaW50ZXJuYWwtbGlua1wiIGRhdGEtaHJlZj1cIiR7dGFyZ2V0fVwiPiR7YWxpYXN9PC9hPmA7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoKFteXFwpXSspXFwpL2csICc8YSBocmVmPVwiJDJcIiBjbGFzcz1cImRheWJsZS1leHRlcm5hbC1saW5rXCI+JDE8L2E+JylcclxuICAgICAgICAvLyBMaW5lIGJyZWFrc1xyXG4gICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcclxuICAgIFxyXG4gICAgZWxlbWVudC5pbm5lckhUTUwgPSBodG1sO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNvbHZlSW1hZ2VQYXRoKGltYWdlUGF0aDogc3RyaW5nLCBhcHA6IEFwcCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCByYXcgPSBTdHJpbmcoaW1hZ2VQYXRoIHx8ICcnKTtcclxuICAgIGNvbnN0IHRhcmdldCA9IHJhdy5zcGxpdCgnfCcpWzBdLnNwbGl0KCcjJylbMF0udHJpbSgpO1xyXG4gICAgY29uc3QgYnlQYXRoID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFyZ2V0KTtcclxuICAgIGlmIChieVBhdGggJiYgYnlQYXRoIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBhcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGJ5UGF0aCk7XHJcbiAgICBjb25zdCBmaWxlcyA9IGFwcC52YXVsdC5nZXRGaWxlcygpO1xyXG4gICAgY29uc3QgZXh0VGFyZ2V0ID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XHJcbiAgICBjb25zdCBmb3VuZCA9IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKHRhcmdldCkpXHJcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLm5hbWUgPT09IHRhcmdldClcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IGV4dFRhcmdldClcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aChgJHtleHRUYXJnZXR9Lm1kYCkpO1xyXG4gICAgaWYgKGZvdW5kKSByZXR1cm4gYXBwLnZhdWx0LmdldFJlc291cmNlUGF0aChmb3VuZCk7XHJcbiAgICByZXR1cm4gdGFyZ2V0O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNvbHZlTm90ZUZpbGUoYXBwOiBBcHAsIGxpbmt0ZXh0OiBzdHJpbmcpOiBURmlsZSB8IG51bGwge1xyXG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKGxpbmt0ZXh0IHx8ICcnKTtcclxuICAgIGNvbnN0IHRhcmdldCA9IHJhdy5zcGxpdCgnfCcpWzBdLnNwbGl0KCcjJylbMF0udHJpbSgpO1xyXG4gICAgY29uc3Qgd2l0aG91dE1kID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XHJcbiAgICBjb25zdCBieVBhdGggPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXJnZXQpO1xyXG4gICAgaWYgKGJ5UGF0aCAmJiBieVBhdGggaW5zdGFuY2VvZiBURmlsZSkgcmV0dXJuIGJ5UGF0aDtcclxuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XHJcbiAgICBjb25zdCBmb3VuZCA9IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKHRhcmdldCkpXHJcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLm5hbWUgPT09IHRhcmdldClcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IHdpdGhvdXRNZClcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aChgJHt3aXRob3V0TWR9Lm1kYCkpO1xyXG4gICAgcmV0dXJuIGZvdW5kIHx8IG51bGw7XHJcbn1cclxuXHJcbmNsYXNzIERheWJsZVNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcclxuICAgIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW47XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbikgeyBzdXBlcihhcHAsIHBsdWdpbik7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XHJcbiAgICBkaXNwbGF5KCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDEnLCB7IHRleHQ6ICdEYXlibGUgQ2FsZW5kYXInIH0pO1xyXG4gICAgICAgIC8vIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0dlbmVyYWwnIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnV2VlayBzdGFydCBkYXknKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnRmlyc3QgZGF5IG9mIHRoZSB3ZWVrJylcclxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJzAnLCAnU3VuZGF5JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcxJywgJ01vbmRheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignMicsICdUdWVzZGF5JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCczJywgJ1dlZG5lc2RheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignNCcsICdUaHVyc2RheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignNScsICdGcmlkYXknKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzYnLCAnU2F0dXJkYXknKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5KSlcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSA9IHBhcnNlSW50KHYsIDEwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnU3RvcmFnZSBmb2xkZXInKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnRm9sZGVyIHRvIHN0b3JlIGNhbGVuZGFyIGV2ZW50cy4gRGF0YSBpcyBzdG9yZWQgaW4gSlNPTiBmaWxlcy4nKVxyXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKSA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgOiAndW5zZXQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVycyA9IHRoaXMuYXBwLnZhdWx0LmdldEFsbEZvbGRlcnMoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmID0+IGYucGF0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zb3J0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IEZ1enp5U3VnZ2VzdCA9IChyZXF1aXJlKCdvYnNpZGlhbicpIGFzIGFueSkuRnV6enlTdWdnZXN0TW9kYWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1Z2dlc3QgPSBuZXcgRnV6enlTdWdnZXN0KHRoaXMuYXBwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5zZXRQbGFjZWhvbGRlcignU2VsZWN0IHN0b3JhZ2UgZm9sZGVyLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3QuZ2V0U3VnZ2VzdGlvbnMgPSAocTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXEpIHJldHVybiBmb2xkZXJzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvbGRlcnMuZmlsdGVyKGYgPT4gZi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEudG9Mb3dlckNhc2UoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0LnJlbmRlclN1Z2dlc3Rpb24gPSAoZm9sZGVyOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0VGV4dChmb2xkZXIgfHwgJyhWYXVsdCByb290KScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0Lm9uQ2hvb3NlU3VnZ2VzdGlvbiA9IGFzeW5jIChmb2xkZXI6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA9IGZvbGRlciB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5zdXJlRW50cmllc0ZvbGRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKSA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgOiAndW5zZXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5sb2FkQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Qub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ1RpbWUgZm9ybWF0JylcclxuICAgICAgICAgICAgLnNldERlc2MoJ0Rpc3BsYXkgdGltZXMgaW4gMjRoIG9yIDEyaCBmb3JtYXQnKVxyXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignMjRoJywgJzI0LWhvdXInKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzEyaCcsICcxMi1ob3VyJylcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZUZvcm1hdCA/PyAnMjRoJylcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPSB2IGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdBcHBlYXJhbmNlJyB9KTtcclxuXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdJY29uIHBsYWNlbWVudCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdQb3NpdGlvbiBvZiBldmVudCBpY29uJylcclxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmlnaHQnLCAnUmlnaHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ25vbmUnLCAnTm9uZScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndG9wJywgJ1RvcCBjZW50ZXInKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RvcC1sZWZ0JywgJ1RvcCBsZWZ0JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AtcmlnaHQnLCAnVG9wIHJpZ2h0JylcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50ID0gdiBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCB0aXRsZSBhbGlnbm1lbnQnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnQWxpZ25tZW50IG9mIGV2ZW50IHRpdGxlcycpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcclxuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdsZWZ0JywgJ0xlZnQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2NlbnRlcicsICdDZW50ZXInKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRUaXRsZUFsaWduID8/ICdsZWZ0JylcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBkZXNjcmlwdGlvbiBhbGlnbm1lbnQnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnQWxpZ25tZW50IG9mIGV2ZW50IGRlc2NyaXB0aW9ucycpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcclxuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdsZWZ0JywgJ0xlZnQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2NlbnRlcicsICdDZW50ZXInKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnREZXNjQWxpZ24gPz8gJ2xlZnQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnREZXNjQWxpZ24gPSB2IGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBiYWNrZ3JvdW5kIG9wYWNpdHknKVxyXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIHRyYW5zcGFyZW5jeSBvZiBldmVudCBiYWNrZ3JvdW5kcy4nKVxyXG4gICAgICAgICAgICAgICAgLmFkZFNsaWRlcihzID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzLnNldExpbWl0cygwLCAxLCAwLjEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA9IHY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgYm9yZGVyIHRoaWNrbmVzcycpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBldmVudCBib3JkZXIgdGhpY2tuZXNzICgwLTVweCknKVxyXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xyXG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgNSwgMC41KVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID8/IDIpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID0gdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgb3BhY2l0eScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBib3JkZXIgY29sb3Igb3BhY2l0eSBmb3IgY29sb3JlZCBldmVudHMgKDAtMSknKVxyXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xyXG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgMSwgMC4xKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlck9wYWNpdHkgPz8gMSlcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyT3BhY2l0eSA9IHY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgYm9yZGVyIHJhZGl1cycpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBldmVudCBjb3JuZXIgcm91bmRuZXNzIChweCknKVxyXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xyXG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgMjQsIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDYpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1cyA9IHY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgnQ29tcGxldGVkIGV2ZW50IGRpc3BsYXknKVxyXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0hvdyBjb21wbGV0ZWQgZXZlbnRzIGFwcGVhcicpXHJcbiAgICAgICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ25vbmUnLCAnTm8gY2hhbmdlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignZGltJywgJ0RpbScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3N0cmlrZXRocm91Z2gnLCAnU3RyaWtldGhyb3VnaCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2hpZGUnLCAnSGlkZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVCZWhhdmlvciA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgICAgICAuc2V0TmFtZShgT25seSBhbmltYXRlIHRvZGF5J3MgZXZlbnRzYClcclxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdTdG9wIGFuaW1hdGlvbiBmb3IgYWxsIGV2ZW50cyBleGNlcHQgdG9kYXknKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvZ2dsZSh0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2UpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdIb2xkZXIgcGxhY2VtZW50JylcclxuICAgICAgICAgICAgLnNldERlc2MoJ1BsYWNlIHRoZSBIb2xkZXIgdG9nZ2xlIChsZWZ0LCByaWdodCwgb3IgaGlkZGVuKScpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcclxuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdsZWZ0JywgJ0xlZnQnKVxyXG4gICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcclxuICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdoaWRkZW4nLCAnSGlkZGVuJylcclxuICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyUGxhY2VtZW50ID8/ICdsZWZ0JylcclxuICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyUGxhY2VtZW50ID0gdiBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBjb250YWluZXIgYW5kIHJlYnVpbGRcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3Lm9uT3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRW5hYmxlIFdlZWtseSBOb3RlcycpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdTaG93IGEgbWFya2Rvd24gbm90ZXMgc2VjdGlvbiBiZWxvdyB0aGUgY2FsZW5kYXIgaW4gd2Vla2x5IHZpZXcnKVxyXG4gICAgICAgICAgICAuYWRkVG9nZ2xlKHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQgPz8gZmFsc2UpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQgPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnTWF4IGRheSBjZWxsIGhlaWdodCAocHgpJylcclxuICAgICAgICAgICAgLnNldERlc2MoJ0lmIHNldCwgZGF5IGNlbGxzIGNhcCBhdCB0aGlzIGhlaWdodCBhbmQgZXZlbnRzIHNjcm9sbCB2ZXJ0aWNhbGx5JylcclxuICAgICAgICAgICAgLmFkZFRleHQodCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0LnNldFBsYWNlaG9sZGVyKCcwIChkaXNhYmxlZCknKTtcclxuICAgICAgICAgICAgICAgIHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmRheUNlbGxNYXhIZWlnaHQgPz8gMCkpO1xyXG4gICAgICAgICAgICAgICAgdC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2IHx8ICcwJywgMTApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRheUNlbGxNYXhIZWlnaHQgPSBpc05hTihudW0pID8gMCA6IE1hdGgubWF4KDAsIG51bSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnR5cGUgPSAnbnVtYmVyJztcclxuICAgICAgICAgICAgICAgICh0LmlucHV0RWwgYXMgSFRNTElucHV0RWxlbWVudCkubWluID0gJzAnO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgnQ29sb3Igc3dhdGNoIHBvc2l0aW9uJylcclxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdQb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBldmVudCBtb2RhbCcpXHJcbiAgICAgICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ3VuZGVyLXRpdGxlJywgJ1VuZGVyIHRpdGxlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndW5kZXItZGVzY3JpcHRpb24nLCAnVW5kZXIgZGVzY3JpcHRpb24nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdub25lJywgJ0RvIG5vdCBzaG93JylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbG9yU3dhdGNoUG9zaXRpb24gPz8gJ3VuZGVyLXRpdGxlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29sb3JTd2F0Y2hQb3NpdGlvbiA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHN3YXRjaGVzU2VjdGlvblRvcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xyXG4gICAgICAgIGNvbnN0IGNvbG9yc1RpdGxlVG9wID0gc3dhdGNoZXNTZWN0aW9uVG9wLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0NvbG9ycycgfSk7XHJcbiAgICAgICAgY29uc3QgY29sb3JzTGlzdFRvcCA9IHN3YXRjaGVzU2VjdGlvblRvcC5jcmVhdGVEaXYoKTtcclxuICAgICAgICBjb25zdCByZW5kZXJDb2xvcnNUb3AgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbG9yc0xpc3RUb3AuZW1wdHkoKTtcclxuICAgICAgICAgICAgY29uc3Qgcm93ID0gY29sb3JzTGlzdFRvcC5jcmVhdGVEaXYoKTtcclxuICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5nYXAgPSAnOHB4JztcclxuICAgICAgICAgICAgcm93LnN0eWxlLmFsaWduSXRlbXMgPSAnZmxleC1zdGFydCc7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMTZweCc7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5mbGV4V3JhcCA9ICd3cmFwJztcclxuICAgICAgICAgICAgY29uc3QgYnVpbHQgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfHwgJycsIHNvdXJjZTogJ2J1aWx0JyBhcyBjb25zdCB9KSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1c3RvbXMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUgfHwgJycsIGNvbG9yOiBzLmNvbG9yIHx8ICcjZmYwMDAwJywgdGV4dENvbG9yOiBzLnRleHRDb2xvciB8fCAnJywgc291cmNlOiAnY3VzdG9tJyBhcyBjb25zdCB9KSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbWJpbmVkOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yOiBzdHJpbmcsIHNvdXJjZTogJ2J1aWx0J3wnY3VzdG9tJyB9W10gPSBbLi4uYnVpbHQsIC4uLmN1c3RvbXNdO1xyXG4gICAgICAgICAgICBjb25zdCBtYWtlSXRlbSA9IChlbnRyeTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfSwgaWR4OiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdyYXAgPSByb3cuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZ2FwID0gJzZweCc7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gZW50cnkuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LmluZGV4ID0gU3RyaW5nKGlkeCk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9IGVudHJ5Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0UGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XHJcbiAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLnZhbHVlID0gZW50cnkudGV4dENvbG9yIHx8ICcjZmZmZmZmJztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJnUGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XHJcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci52YWx1ZSA9IGVudHJ5LmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlQWxsID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCdWlsdEFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkN1c3RvbUFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eCA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzBdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiBiZywgdGV4dENvbG9yOiB0eCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JNYXA6IFJlY29yZDxzdHJpbmcsIHsgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcmV2QnVpbHRBcnIubGVuZ3RoICYmIGkgPCBuZXdCdWlsdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkJ1aWx0QXJyW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBuZXdCdWlsdFtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYuY29sb3IgIT09IG5vdy5jb2xvciB8fCAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobm93LnRleHRDb2xvciB8fCAnJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW3ByZXYuY29sb3JdID0geyBjb2xvcjogbm93LmNvbG9yLCB0ZXh0Q29sb3I6IG5vdy50ZXh0Q29sb3IgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByZXZDdXN0b21BcnIubGVuZ3RoICYmIGkgPCBuZXdDdXN0b20ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHByZXZDdXN0b21BcnJbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ld0N1c3RvbVtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYuY29sb3IgIT09IG5vdy5jb2xvciB8fCAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobm93LnRleHRDb2xvciB8fCAnJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW3ByZXYuY29sb3JdID0geyBjb2xvcjogbm93LmNvbG9yLCB0ZXh0Q29sb3I6IG5vdy50ZXh0Q29sb3IgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVkVHJpZ2dlcnMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLm1hcCh0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHQuY29sb3IgJiYgY29sb3JNYXBbdC5jb2xvcl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hcHBlZCA9IGNvbG9yTWFwW3QuY29sb3JdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgLi4udCwgY29sb3I6IG1hcHBlZC5jb2xvciwgdGV4dENvbG9yOiBtYXBwZWQudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihtYXBwZWQuY29sb3IpIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSB1cGRhdGVkVHJpZ2dlcnM7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCeU5hbWUgPSBuZXcgTWFwPHN0cmluZywgeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9PigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2QnVpbHRBcnIuZm9yRWFjaChzID0+IHByZXZCeU5hbWUuc2V0KHMubmFtZSwgeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1aWx0LmZvckVhY2gobmIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHByZXZCeU5hbWUuZ2V0KG5iLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvckNoYW5nZWQgPSBwcmV2LmNvbG9yICE9PSBuYi5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHRDaGFuZ2VkID0gKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5iLnRleHRDb2xvciB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbG9yQ2hhbmdlZCAmJiAhdGV4dENoYW5nZWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBoZXhUb1JnYmEobmIuY29sb3IsIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKGAuZGF5YmxlLWV2ZW50W2RhdGEtY29sb3I9XCIke3ByZXYuY29sb3J9XCJdYCkuZm9yRWFjaChlbCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IGVsIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYmctY29sb3InLCByZ2JhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LXRleHQtY29sb3InLCBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5kYXRhc2V0LmNvbG9yID0gbmIuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29sb3IgPSBuYi5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuaG9sZGVyRXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5jb2xvciA9PT0gcHJldi5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlydHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpcnR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlbmRlclRyaWdnZXJzID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHRleHRQaWNrZXIub25jaGFuZ2UgPSB1cGRhdGVBbGw7XHJcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLnBhZGRpbmcgPSAnMnB4IDRweCc7XHJcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcclxuICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcclxuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHdyYXAub25kcmFnc3RhcnQgPSBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsICdkcmFnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2ZlcikuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcmFnb3ZlciA9IGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcm9wID0gYXN5bmMgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0LnBhcmVudEVsZW1lbnQgIT09IHJvdykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gKGUuY2xpZW50WCAtIHJlY3QubGVmdCkgPCByZWN0LndpZHRoIC8gMjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmVmb3JlKSByb3cuaW5zZXJ0QmVmb3JlKHdyYXAsIHRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXA7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbWJpbmVkLmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHsgbWFrZUl0ZW0oZW50cnksIGlkeCk7IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBjb250cm9sc0JvdHRvbSA9IG5ldyBTZXR0aW5nKGNvbG9yc0xpc3RUb3ApO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuYWRkQ2xhc3MoJ2RheWJsZS1jb2xvcnMtY29udHJvbHMnKTtcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uc2V0dGluZ0VsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgICAgICAoY29udHJvbHNCb3R0b20uc2V0dGluZ0VsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LXN0YXJ0JztcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdSZXNldCB0byBEZWZhdWx0IENvbG9ycycpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ1Jlc2V0IGNvbG9yIHN3YXRjaGVzIHRvIGRlZmF1bHQ/JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IChERUZBVUxUX1NFVFRJTkdTLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IChzIGFzIGFueSkudGV4dENvbG9yIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcclxuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgQ29sb3InKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmdhcCA9ICc2cHgnO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gJ2N1c3RvbSc7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0Lm5hbWUgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0UGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBpY2tlci52YWx1ZSA9ICcjZmZmZmZmJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZ1BpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJnUGlja2VyLnZhbHVlID0gJyNmZjAwMDAnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJhY2tncm91bmQgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5wYWRkaW5nID0gJzJweCA0cHgnO1xyXG4gICAgICAgICAgICAgICAgICAgIHNldEljb24oZGVsLCAneCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlQWxsID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2QnVpbHRBcnIgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcnNMaXN0VG9wLnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHggPSAody5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVswXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2QnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZCdWlsdEFyci5mb3JFYWNoKHMgPT4gcHJldkJ5TmFtZS5zZXQocy5uYW1lLCB7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWlsdC5mb3JFYWNoKG5iID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkJ5TmFtZS5nZXQobmIubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hhbmdlZCA9IHByZXYuY29sb3IgIT09IG5iLmNvbG9yIHx8IChwcmV2LnRleHRDb2xvciB8fCAnJykgIT09IChuYi50ZXh0Q29sb3IgfHwgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hhbmdlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBoZXhUb1JnYmEobmIuY29sb3IsIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChgLmRheWJsZS1ldmVudFtkYXRhLWNvbG9yPVwiJHtwcmV2LmNvbG9yfVwiXWApLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoID0gZWwgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYmctY29sb3InLCByZ2JhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC10ZXh0LWNvbG9yJywgbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmRhdGFzZXQuY29sb3IgPSBuYi5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuZXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbG9yID0gbmIuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuaG9sZGVyRXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbG9yID0gbmIuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlydHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJnUGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUFsbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdFdmVudCBDYXRlZ29yaWVzJyB9KTtcclxuICAgICAgICBjb25zdCBydWxlc1dyYXAgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcclxuICAgICAgICBjb25zdCByZW5kZXJSdWxlcyA9ICgpID0+IHtcclxuICAgICAgICAgICAgcnVsZXNXcmFwLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmZvckVhY2goKGNhdGVnb3J5OiBFdmVudENhdGVnb3J5KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBuZXcgU2V0dGluZyhydWxlc1dyYXApO1xyXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBsZWZ0LXNpZGUgc2V0dGluZyB0aXRsZSBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZXR0aW5nLWl0ZW0tbmFtZScpPy5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgICAgIChyb3cuc2V0dGluZ0VsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gJ3Vuc2V0JztcclxuICAgICAgICAgICAgICAgIHJvdy5jb250cm9sRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgICAgIChyb3cuY29udHJvbEVsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5nYXAgPSAnOHB4JztcclxuICAgICAgICAgICAgICAgIHJvdy5jb250cm9sRWwuc3R5bGUuZmxleCA9ICcxJztcclxuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwuY2xhc3NMaXN0LmFkZCgnZGItY2F0ZWdvcnktcm93Jyk7XHJcbiAgICAgICAgICAgICAgICAvLyBJY29uIGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgcm93LmFkZEJ1dHRvbihiID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAoYi5idXR0b25FbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWJ0bicsJ2RheWJsZS1pY29uLWFkZCcsJ2RiLWJ0bicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNldEljb24oYi5idXR0b25FbCwgY2F0ZWdvcnkuaWNvbiA/PyAncGx1cycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGIub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBpY2tlciA9IG5ldyBJY29uUGlja2VyTW9kYWwodGhpcy5hcHAsIGFzeW5jIChpY29uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5pY29uID0gaWNvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5pY29uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclJ1bGVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwaWNrZXIub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBDYXRlZ29yeSBuYW1lIGlucHV0XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkVGV4dCh0ID0+IHsgdC5zZXRWYWx1ZShjYXRlZ29yeS5uYW1lKS5vbkNoYW5nZSh2ID0+IHsgY2F0ZWdvcnkubmFtZSA9IHY7IH0pOyAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLWlucHV0JywnZGItY2F0ZWdvcnktbmFtZScpOyB9KTtcclxuICAgICAgICAgICAgICAgIC8vIFRleHQgY29sb3IgZmlyc3RcclxuICAgICAgICAgICAgICAgIHJvdy5hZGRDb2xvclBpY2tlcihjcCA9PiB7IGNwLnNldFZhbHVlKGNhdGVnb3J5LnRleHRDb2xvcikub25DaGFuZ2UodiA9PiB7IFxyXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LnRleHRDb2xvciA9IHY7IFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7IChjcCBhcyBhbnkpLmlucHV0RWw/LmNsYXNzTGlzdD8uYWRkKCdkYi1jb2xvcicsJ2RiLXRleHQtY29sb3InKTsgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBCYWNrZ3JvdW5kIGNvbG9yIG5leHRcclxuICAgICAgICAgICAgICAgIHJvdy5hZGRDb2xvclBpY2tlcihjcCA9PiB7IGNwLnNldFZhbHVlKGNhdGVnb3J5LmJnQ29sb3IpLm9uQ2hhbmdlKHYgPT4geyBcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5iZ0NvbG9yID0gdjsgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTsgKGNwIGFzIGFueSkuaW5wdXRFbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWNvbG9yJywnZGItYmctY29sb3InKTsgfSk7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJyc6ICdObyBlZmZlY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzdHJpcGVkLTEnOiAnU3RyaXBlZCAoNDXCsCknLFxyXG4gICAgICAgICAgICAgICAgICAgICdzdHJpcGVkLTInOiAnU3RyaXBlZCAoLTQ1wrApJyxcclxuICAgICAgICAgICAgICAgICAgICAndmVydGljYWwtc3RyaXBlcyc6ICdWZXJ0aWNhbCBTdHJpcGVzJyxcclxuICAgICAgICAgICAgICAgICAgICAndGhpbi10ZXh0dXJlZC1zdHJpcGVzJzogJ1RoaW4gVGV4dHVyZWQgU3RyaXBlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Nyb3NzaGF0Y2hlZCc6ICdDcm9zc2hhdGNoZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdjaGVja2VyYm9hcmQnOiAnQ2hlY2tlcmJvYXJkJyxcclxuICAgICAgICAgICAgICAgICAgICAnaGV4YWJvYXJkJzogJ0hleGFib2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3dhdnktbGluZXMnOiAnV2F2eSBMaW5lcycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2RvdHRlZCc6ICdEb3R0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdhcmd5bGUnOiAnQXJneWxlJyxcclxuICAgICAgICAgICAgICAgICAgICAnZW1ib3NzZWQnOiAnRW1ib3NzZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdnbGFzcyc6ICdHbGFzcycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3cnOiAnR2xvdycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3JldHJvLWJ1dHRvbic6ICdSZXRybyBCdXR0b24nXHJcbiAgICAgICAgICAgICAgICB9KS5zZXRWYWx1ZShjYXRlZ29yeS5lZmZlY3QpLm9uQ2hhbmdlKHYgPT4geyBcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5lZmZlY3QgPSB2OyBcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pOyAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuY2xhc3NMaXN0LmFkZCgnZGItc2VsZWN0JywnZGItZWZmZWN0Jyk7IH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xyXG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gYW5pbWF0aW9uJyxcclxuICAgICAgICAgICAgICAgICAgICAnbW92ZS1ob3Jpem9udGFsbHknOiAnTW92ZSBIb3Jpem9udGFsbHknLFxyXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLXZlcnRpY2FsbHknOiAnTW92ZSBWZXJ0aWNhbGx5JyxcclxuICAgICAgICAgICAgICAgICAgICAncGFydGljbGVzJzogJ1BhcnRpY2xlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3Nub3ctZmFsbGluZyc6ICdTbm93IEZhbGxpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICdhbmltYXRlZC1ncmFkaWVudCc6ICdBbmltYXRlZCBHcmFkaWVudCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzLXNoaW5lJzogJ0dsYXNzIFNoaW5lJyxcclxuICAgICAgICAgICAgICAgICAgICAnZ2xvd2luZyc6ICdHbG93aW5nJ1xyXG4gICAgICAgICAgICAgICAgfSkuc2V0VmFsdWUoY2F0ZWdvcnkuYW5pbWF0aW9uKS5vbkNoYW5nZSh2ID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYW5pbWF0aW9uID0gdjsgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWFuaW1hdGlvbicpOyB9KTtcclxuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHsgZC5hZGRPcHRpb25zKHtcclxuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGFuaW1hdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtaG9yaXpvbnRhbGx5JzogJ01vdmUgSG9yaXpvbnRhbGx5JyxcclxuICAgICAgICAgICAgICAgICAgICAnbW92ZS12ZXJ0aWNhbGx5JzogJ01vdmUgVmVydGljYWxseScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2xlcyc6ICdQYXJ0aWNsZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzbm93LWZhbGxpbmcnOiAnU25vdyBGYWxsaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAnYW5pbWF0ZWQtZ3JhZGllbnQnOiAnQW5pbWF0ZWQgR3JhZGllbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdnbGFzcy1zaGluZSc6ICdHbGFzcyBTaGluZScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3dpbmcnOiAnR2xvd2luZydcclxuICAgICAgICAgICAgICAgIH0pLnNldFZhbHVlKGNhdGVnb3J5LmFuaW1hdGlvbjIpLm9uQ2hhbmdlKHYgPT4geyBcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5hbmltYXRpb24yID0gdjsgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWFuaW1hdGlvbjInKTsgfSk7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkRXh0cmFCdXR0b24oYnRuID0+IHsgYnRuLnNldEljb24oJ3gnKS5zZXRUb29sdGlwKCdEZWxldGUnKS5vbkNsaWNrKCgpID0+IHsgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXSkuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2F0ZWdvcnkuaWQpOyByZW5kZXJSdWxlcygpOyB9KTsgKGJ0biBhcyBhbnkpLmV4dHJhQnV0dG9uRWw/LmNsYXNzTGlzdD8uYWRkKCdkYi1idG4nLCdkYi1kZWxldGUtY2F0ZWdvcnknKTsgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLmFkZEJ1dHRvbihiID0+IHtcclxuICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIEFkZCBDYXRlZ29yeScpO1xyXG4gICAgICAgICAgICAoYi5idXR0b25FbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuYWRkQ2xhc3MoJ21vZC1jdGEnKTtcclxuICAgICAgICAgICAgYi5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5OiBFdmVudENhdGVnb3J5ID0geyBpZDogcmFuZG9tSWQoKSwgbmFtZTogJ05ldyBDYXRlZ29yeScsIGJnQ29sb3I6ICcjODM5MmE0JywgdGV4dENvbG9yOiAnI2ZmZmZmZicsIGVmZmVjdDogJ2VtYm9zc2VkJywgYW5pbWF0aW9uOiAnJywgYW5pbWF0aW9uMjogJycsIGljb246IHVuZGVmaW5lZCB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXSkuY29uY2F0KGNhdGVnb3J5KTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgcmVuZGVyUnVsZXMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmVuZGVyUnVsZXMoKTtcclxuXHJcbiAgICAgICAgY29uc3QgdHJpZ2dlcnNUaXRsZSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ1RyaWdnZXJzJyB9KTtcclxuICAgICAgICBjb25zdCB0cmlnZ2Vyc1dyYXAgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcclxuICAgICAgICBjb25zdCByZW5kZXJUcmlnZ2VycyA9ICgpID0+IHtcclxuICAgICAgICAgICAgdHJpZ2dlcnNXcmFwLmVtcHR5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW107XHJcbiAgICAgICAgICAgIGNvbnN0IHN3YXRjaGVzID0gW1xyXG4gICAgICAgICAgICAgICAgLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKSxcclxuICAgICAgICAgICAgICAgIC4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goKHRyLCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG5ldyBTZXR0aW5nKHRyaWdnZXJzV3JhcCk7XHJcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZXR0aW5nLWl0ZW0tbmFtZScpPy5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwuY2xhc3NMaXN0LmFkZCgnZGItdHJpZ2dlcnMtcm93Jyk7XHJcbiAgICAgICAgICAgICAgICByb3cuY29udHJvbEVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICAocm93LmNvbnRyb2xFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgICAgICAocm93LmNvbnRyb2xFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZmxleCA9ICcxJztcclxuICAgICAgICAgICAgICAgIHJvdy5hZGRUZXh0KHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHQuc2V0UGxhY2Vob2xkZXIoJ1RleHQgaW4gdGl0bGUgb3IgZGVzY3JpcHRpb24nKTtcclxuICAgICAgICAgICAgICAgICAgICB0LnNldFZhbHVlKHRyLnBhdHRlcm4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0ucGF0dGVybiA9IHYgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzID0gaXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICh0LmlucHV0RWwgYXMgSFRNTElucHV0RWxlbWVudCkuY2xhc3NMaXN0LmFkZCgnZGItaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnN0eWxlLmZsZXggPSAnMSc7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCcnLCAnRGVmYXVsdCBDYXRlZ29yeScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhdHMuZm9yRWFjaChjID0+IGQuYWRkT3B0aW9uKGMuaWQsIGMubmFtZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VmFsdWUodHIuY2F0ZWdvcnlJZCB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS5jYXRlZ29yeUlkID0gdiB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5zdHlsZS53aWR0aCA9ICc5MHB4JztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCcnLCAnRGVmYXVsdCBDb2xvcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3YXRjaGVzLmZvckVhY2gocyA9PiBkLmFkZE9wdGlvbihzLmNvbG9yLCAnQ29sb3InKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRWYWx1ZSh0ci5jb2xvciB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbXNbaWR4XS5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpdGVtc1tpZHhdLnRleHRDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBzd2F0Y2hlcy5maW5kKHN3ID0+IHN3LmNvbG9yID09PSB2KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS5jb2xvciA9IHMuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS50ZXh0Q29sb3IgPSBzLnRleHRDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlDb2xvclN0eWxlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBTdHlsZSB0aGUgZHJvcGRvd25cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcHBseUNvbG9yU3R5bGVzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkU3dhdGNoID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gY3VycmVudFZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0eWxlIHRoZSBzZWxlY3QgZWxlbWVudCBpdHNlbGZcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3dhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gc2VsZWN0ZWRTd2F0Y2guY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuc3R5bGUuY29sb3IgPSBzZWxlY3RlZFN3YXRjaC50ZXh0Q29sb3IgfHwgJyMwMDAnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLnN0eWxlLmNvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0eWxlIHRoZSBvcHRpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20oZC5zZWxlY3RFbC5vcHRpb25zKS5mb3JFYWNoKG9wdCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdC52YWx1ZSkgcmV0dXJuOyAvLyBTa2lwIGRlZmF1bHQgb3B0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gb3B0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHMuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0LnN0eWxlLmNvbG9yID0gcy50ZXh0Q29sb3IgfHwgJyMwMDAnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGluaXRpYWxseVxyXG4gICAgICAgICAgICAgICAgICAgIGFwcGx5Q29sb3JTdHlsZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkuc3R5bGUubWF4V2lkdGggPSAnMTIwcHgnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkRXh0cmFCdXR0b24oYnRuID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBidG4uc2V0SWNvbigneCcpLnNldFRvb2x0aXAoJ0RlbGV0ZScpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVkID0gaXRlbXMuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBpZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHVwZGF0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBuZXcgU2V0dGluZyh0cmlnZ2Vyc1dyYXApLmFkZEJ1dHRvbihiID0+IHtcclxuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgVHJpZ2dlcicpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zMiA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXSkuc2xpY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtczIucHVzaCh7IHBhdHRlcm46ICcnLCBjYXRlZ29yeUlkOiAnJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zMjtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcclxuXHJcbiAgICAgICAgLy8gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnQ3VzdG9tIFN3YXRjaGVzJyB9KTtcclxuICAgICAgICBjb25zdCBzd2F0Y2hlc1NlY3Rpb24gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcclxuICAgICAgICAoc3dhdGNoZXNTZWN0aW9uIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbilcclxuICAgICAgICAgICAgLy8gLnNldE5hbWUoJ0VuYWJsZSBDdXN0b20gU3dhdGNoZXMnKVxyXG4gICAgICAgICAgICAvLyAuc2V0RGVzYygnSWYgb24sIHlvdXIgY3VzdG9tIHN3YXRjaGVzIHdpbGwgYXBwZWFyIGluIHRoZSBjb2xvciBwaWNrZXIuJylcclxuICAgICAgICAgICAgLy8gLmFkZFRvZ2dsZSh0ID0+IHtcclxuICAgICAgICAgICAgLy8gICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tU3dhdGNoZXNFbmFibGVkID8/IGZhbHNlKVxyXG4gICAgICAgICAgICAvLyAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA9IHY7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgIC8vICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICBjb25zdCBjb2xvcnNUaXRsZSA9IHN3YXRjaGVzU2VjdGlvbi5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdDb2xvcnMnIH0pO1xyXG4gICAgICAgIGNvbnN0IGNvbG9yc0xpc3QgPSBzd2F0Y2hlc1NlY3Rpb24uY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgY29uc3QgcmVuZGVyQ29sb3JzID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb2xvcnNMaXN0LmVtcHR5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbG9yc0xpc3QuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuZmxleFdyYXAgPSAnd3JhcCc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgb2xkIHN3YXRjaGVzIHRvIGRldGVjdCBjaGFuZ2VzXHJcbiAgICAgICAgICAgIGNvbnN0IG9sZEJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCBzb3VyY2U6ICdidWlsdCcgYXMgY29uc3QgfSkpO1xyXG4gICAgICAgICAgICBjb25zdCBvbGRDdXN0b21zID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHNvdXJjZTogJ2N1c3RvbScgYXMgY29uc3QgfSkpO1xyXG4gICAgICAgICAgICBjb25zdCBvbGRDb21iaW5lZDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHNvdXJjZTogJ2J1aWx0J3wnY3VzdG9tJyB9W10gPSBbLi4ub2xkQnVpbHQsIC4uLm9sZEN1c3RvbXNdO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgYnVpbHQgPSBvbGRCdWlsdDtcclxuICAgICAgICAgICAgY29uc3QgY3VzdG9tcyA9IG9sZEN1c3RvbXM7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbWJpbmVkID0gb2xkQ29tYmluZWQ7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBtYWtlSXRlbSA9IChlbnRyeTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHNvdXJjZTogJ2J1aWx0J3wnY3VzdG9tJyB9LCBpZHg6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd3JhcCA9IHJvdy5jcmVhdGVEaXYoKTtcclxuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5nYXAgPSAnNnB4JztcclxuICAgICAgICAgICAgICAgIHdyYXAuc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcclxuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5zb3VyY2UgPSBlbnRyeS5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuaW5kZXggPSBTdHJpbmcoaWR4KTtcclxuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5uYW1lID0gZW50cnkubmFtZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XHJcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IGVudHJ5LmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2xkQ29sb3IgPSBlbnRyeS5jb2xvcjsgLy8gU3RvcmUgdGhlIG9sZCBjb2xvciBiZWZvcmUgY29sbGVjdGluZyBuZXcgb25lc1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKHcucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogdmFsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBjb2xvciBtYXBwaW5nIGZyb20gb2xkIHRvIG5ldyBiYXNlZCBvbiBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yTWFwOiB7IFtvbGRDb2xvcjogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgYnVpbHQgc3dhdGNoZXNcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZEJ1aWx0Lmxlbmd0aCAmJiBpIDwgbmV3QnVpbHQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEJ1aWx0W2ldLmNvbG9yICE9PSBuZXdCdWlsdFtpXS5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbb2xkQnVpbHRbaV0uY29sb3JdID0gbmV3QnVpbHRbaV0uY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIGN1c3RvbSBzd2F0Y2hlc1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2xkQ3VzdG9tcy5sZW5ndGggJiYgaSA8IG5ld0N1c3RvbS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ3VzdG9tc1tpXS5jb2xvciAhPT0gbmV3Q3VzdG9tW2ldLmNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvck1hcFtvbGRDdXN0b21zW2ldLmNvbG9yXSA9IG5ld0N1c3RvbVtpXS5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYW55IHRyaWdnZXJzIHVzaW5nIGNvbG9ycyB0aGF0IGNoYW5nZWRcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmlnZ2VycyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXSkuc2xpY2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2Vycy5mb3JFYWNoKHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5jb2xvciAmJiBjb2xvck1hcFt0LmNvbG9yXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29sb3JWYWx1ZSA9IGNvbG9yTWFwW3QuY29sb3JdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyB1cGRhdGUgdGhlIHRleHRDb2xvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsU3dhdGNoZXMgPSBbLi4ubmV3QnVpbHQsIC4uLm5ld0N1c3RvbV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3VuZFN3YXRjaCA9IGFsbFN3YXRjaGVzLmZpbmQocyA9PiBzLmNvbG9yID09PSBuZXdDb2xvclZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuY29sb3IgPSBuZXdDb2xvclZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kU3dhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgdGV4dENvbG9yIGZyb20gb3JpZ2luYWwgc2V0dGluZ3NcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFN3YXRjaCA9IFsuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLCAuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzIHx8IFtdKV0uZmluZChzID0+IHMuY29sb3IgPT09IG5ld0NvbG9yVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFN3YXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnRleHRDb2xvciA9IChvcmlnaW5hbFN3YXRjaCBhcyBhbnkpLnRleHRDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHRyaWdnZXJzO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsID0gd3JhcC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRiLWNvbG9yLWRlbCcgfSk7XHJcbiAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcclxuICAgICAgICAgICAgICAgIHNldEljb24oZGVsLCAneCcpO1xyXG4gICAgICAgICAgICAgICAgZGVsLnNldEF0dHIoJ2RyYWdnYWJsZScsJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgZGVsLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cmFwLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKHcucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiB2YWwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB3cmFwLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCAnZHJhZycpO1xyXG4gICAgICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlciBhcyBEYXRhVHJhbnNmZXIpLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ292ZXIgPSBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9O1xyXG4gICAgICAgICAgICAgICAgcm93Lm9uZHJvcCA9IGFzeW5jIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0IHx8IHRhcmdldC5wYXJlbnRFbGVtZW50ICE9PSByb3cpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IChlLmNsaWVudFggLSByZWN0LmxlZnQpIDwgcmVjdC53aWR0aCAvIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZSkgcm93Lmluc2VydEJlZm9yZSh3cmFwLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgdGFyZ2V0LmFmdGVyKHdyYXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKHcucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogdmFsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB3cmFwO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjb21iaW5lZC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7IG1ha2VJdGVtKGVudHJ5LCBpZHgpOyB9KTtcclxuICAgICAgICAgICAgY29uc3QgY29udHJvbHNCb3R0b20gPSBuZXcgU2V0dGluZyhzd2F0Y2hlc1NlY3Rpb24pO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuc3R5bGUuYm9yZGVyVG9wID0gJ25vbmUnO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ1Jlc2V0IHRvIERlZmF1bHQgQ29sb3JzJykub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnUmVzZXQgY29sb3Igc3dhdGNoZXMgdG8gZGVmYXVsdD8nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gKERFRkFVTFRfU0VUVElOR1Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogKHMgYXMgYW55KS50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbG9ycygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIEFkZCBDb2xvcicpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbSA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLnNsaWNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6ICcjZmYwMDAwJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29sb3JzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLm1hcmdpbkxlZnQgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgO1xyXG5cclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdEYXRhIE1hbmFnZW1lbnQnIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXhwb3J0IERhdGEnKVxyXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdFeHBvcnQgRGF0YScpXHJcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhdWx0TmFtZSA9ICh0aGlzLmFwcC52YXVsdCBhcyBhbnkpPy5nZXROYW1lPy4oKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIGFueSk/LmJhc2VQYXRoPy5zcGxpdCgvW1xcXFwvXS8pLmZpbHRlcihCb29sZWFuKS5wb3AoKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdWYXVsdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cG9ydE9iajogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmF1bHROYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHRoaXMucGx1Z2luLnNldHRpbmdzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9udGhzOiBbXSBhcyBBcnJheTx7IGZpbGU6IHN0cmluZywgZGF0YTogYW55IH0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgfHwgJ0RheWJsZUNhbGVuZGFyJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMgPSAobGlzdGluZy5maWxlcyB8fCBbXSkuZmlsdGVyKChmOiBzdHJpbmcpID0+IGYudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLmpzb24nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4dCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChmKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZSh0eHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydE9iai5tb250aHMucHVzaCh7IGZpbGU6IGYsIGRhdGEgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBmaWxlIHNhdmUgZGlhbG9nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gYERheWJsZUV4cG9ydF8ke3ZhdWx0TmFtZX1fJHtEYXRlLm5vdygpfS5qc29uYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydE9iaiwgbnVsbCwgMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBkb3dubG9hZCBsaW5rIGFuZCB0cmlnZ2VyIHNhdmUgZGlhbG9nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbanNvblN0cl0sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rLmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmsuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChsaW5rLmhyZWYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRXhwb3J0IHJlYWR5OiAke2ZpbGVOYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRXhwb3J0IGZhaWxlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdJbXBvcnQgRGF0YScpXHJcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ0ltcG9ydCBEYXRhJylcclxuICAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWNjZXB0ID0gJ2FwcGxpY2F0aW9uL2pzb24sLmpzb24nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gaW5wdXQuZmlsZXM/LlswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZmlsZS50ZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKHRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iaj8uc2V0dGluZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIG9iai5zZXR0aW5ncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmo/Lm1vbnRocykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyIHx8ICdEYXlibGVDYWxlbmRhcic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7IH0gY2F0Y2ggeyB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyKTsgfSBjYXRjaCB7fSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBtIG9mIG9iai5tb250aHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHR5cGVvZiBtLmZpbGUgPT09ICdzdHJpbmcnID8gbS5maWxlIDogYCR7Zm9sZGVyfS9JbXBvcnRlZF8ke0RhdGUubm93KCl9Lmpzb25gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KG0uZGF0YSA/PyB7fSwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7IGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTsgdmlldy5yZW5kZXIoKTsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnSW1wb3J0IGNvbXBsZXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgdGhlIHBsdWdpblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luTWFuYWdlciA9ICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5wbHVnaW5zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsdWdpbk1hbmFnZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwbHVnaW5NYW5hZ2VyLmRpc2FibGVQbHVnaW4odGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHBsdWdpbk1hbmFnZXIuZW5hYmxlUGx1Z2luKHRoaXMucGx1Z2luLm1hbmlmZXN0LmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnSW1wb3J0IGZhaWxlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiByYW5kb21JZCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgYW55Q3J5cHRvID0gKHdpbmRvdyBhcyBhbnkpLmNyeXB0bztcclxuICAgIGlmIChhbnlDcnlwdG8/LnJhbmRvbVVVSUQpIHJldHVybiBhbnlDcnlwdG8ucmFuZG9tVVVJRCgpO1xyXG4gICAgcmV0dXJuICdldi0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyAnLScgKyBEYXRlLm5vdygpO1xyXG59XHJcblxyXG4iXX0=