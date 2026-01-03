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
            this.addCommand({ id: 'open-calendar', name: 'Open calendar', callback: () => void this.openDayble() });
            this.addCommand({ id: 'focus-today', name: 'Focus on today', callback: () => void this.focusToday() });
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
            void this.openDayble();
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
            void this.openDayble();
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
            catch (_a) {
                try {
                    yield this.app.vault.createFolder(folder);
                }
                catch (_b) {
                    // Ignore folder exists error
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
            void this.render();
        });
    }
    debouncedSave() {
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => void this.saveAllEntries(), 1000);
    }
    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'Dayble calendar'; }
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
            searchBtn.onclick = () => { const modal = new PromptSearchModal(this.app, this); void modal.open(); };
            const weekToggle = document.createElement('button');
            weekToggle.className = 'dayble-btn dayble-header-buttons dayble-week-toggle';
            (0, obsidian_1.setIcon)(weekToggle, 'calendar-range');
            weekToggle.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.calendarWeekActive = !this.plugin.settings.calendarWeekActive;
                yield this.plugin.saveSettings();
                yield this.loadAllEntries();
                void this.render();
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
            holderAdd.onclick = () => void this.openEventModal();
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
                if (!id || ((_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source')) === 'holder')
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
                        void this.renderHolder();
                        void this.render();
                    }
                }
                catch (_) {
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
            void this.render();
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
                catch (e) {
                    console.debug('[Dayble] ResizeObserver disconnect error:', e);
                }
                this._longRO = undefined;
            }
            if (this._longOverlayEl && this._longOverlayEl.isConnected) {
                try {
                    this._longOverlayEl.remove();
                }
                catch (e) {
                    console.debug('[Dayble] Overlay remove error:', e);
                }
            }
            this._longEls.forEach(el => {
                try {
                    if (el && el.parentElement)
                        el.remove();
                }
                catch (e) {
                    console.debug('[Dayble] Long event remove error:', e);
                }
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
            catch (_a) { }
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
                catch (_b) { }
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
                    catch (_) { }
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
        void this.loadAllEntries().then(() => { void this.render(); });
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
        void this.loadAllEntries().then(() => { void this.render(); });
    }
    render(titleEl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.weeklyNotesEl) {
                this.weeklyNotesEl.remove();
                this.weeklyNotesEl = undefined;
            }
            // Reset grid style is handled by CSS classes and inline elements
            if (this.plugin.settings.calendarWeekActive) {
                this.gridEl.addClass('dayble-week-mode');
                yield this.renderWeekView(titleEl);
            }
            else {
                this.gridEl.removeClass('dayble-week-mode');
                yield this.renderMonthView(titleEl);
            }
        });
    }
    renderWeekView(titleEl) {
        return __awaiter(this, void 0, void 0, function* () {
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
                dayHeader.createDiv({ cls: 'dayble-day-number', text: String(d.getDate()) });
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
                    if (!id || ((_b = e.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('dayble-source')) !== 'calendar')
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
                    void this.saveAllEntries();
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
                            void this.saveAllEntries();
                            void this.loadAllEntries();
                            void this.render();
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
                                void this.saveAllEntries();
                                void this.loadAllEntries();
                                void this.render();
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
                    if ((ev).button !== 0)
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
                this.gridEl.addClass('dayble-grid-el');
                const base = new Date(this.currentDate);
                const tDow = base.getDay();
                const diff = ((tDow - this.plugin.settings.weekStartDay) + 7) % 7;
                const weekStartDate = new Date(base);
                weekStartDate.setDate(base.getDate() - diff);
                const weekKey = weekStartDate.toISOString().split('T')[0];
                this.weeklyNotesEl = this.calendarEl.createDiv({ cls: 'dayble-weekly-notes' });
                this.weeklyNotesEl.addClass('dayble-weekly-notes-container');
                // Drag Handle
                const dragHandle = this.weeklyNotesEl.createDiv({ cls: 'dayble-weekly-drag-handle' });
                this._boundWeeklyNotesMouseMove = (me) => {
                    if (!this.isResizingWeeklyNotes || !this.weeklyNotesEl)
                        return;
                    const dy = me.clientY - this.weeklyNotesResizeStartY;
                    const newH = Math.max(100, this.weeklyNotesResizeStartHeight - dy);
                    this.weeklyNotesEl.style.setProperty('height', `${newH}px`, 'important');
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
                header.addClass('dayble-weekly-notes-header-row');
                const h4 = header.createEl('h4', { text: 'Weekly notes' });
                h4.addClass('dayble-weekly-notes-title');
                // Content area with textarea only
                const contentContainer = this.weeklyNotesEl.createDiv({ cls: 'dayble-weekly-notes-content' });
                // Get current text
                const currentText = this.weeklyNotes[weekKey] || '';
                // Create textarea for editing
                const textareaEl = contentContainer.createEl('textarea', { cls: 'dayble-weekly-notes-textarea' });
                textareaEl.value = currentText;
                // Auto-height function - grows with content up to 500px max
                const updateTextareaHeight = () => {
                    textareaEl.style.setProperty('height', 'auto');
                    textareaEl.style.setProperty('height', `${textareaEl.scrollHeight}px`);
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
        return __awaiter(this, void 0, void 0, function* () {
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
                dayHeader.createDiv({ cls: 'dayble-day-number', text: String(day) });
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
                    void this.saveAllEntries();
                });
                cell.onclick = (ev) => {
                    const target = ev.target;
                    // Only open modal if clicking on the cell itself or container, not on an event
                    if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                        this.openEventModal(undefined, fullDate);
                    }
                };
                cell.onmousedown = (ev) => {
                    if ((ev).button !== 0)
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
                                void this.saveAllEntries();
                                void this.renderHolder();
                                void this.render();
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
                                void this.saveAllEntries();
                            }
                        }
                        void this.renderHolder();
                        void this.render();
                    }
                    catch (_) {
                        new obsidian_1.Notice('Failed to save event changes');
                    }
                });
            }
            // Defer long event positioning until layout settles
            // Prepare overlay for long events; hide it until positions are computed
            if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
                this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
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
        });
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
        cells.forEach(c => {
            c.removeClass('dayble-selected');
            const d = c.getAttr('data-date');
            if (!d)
                return;
            const dt = new Date(d + 'T00:00:00');
            // Include both start and end dates (use >= and <= for inclusive range)
            if (dt >= min && dt <= max) {
                c.addClass('dayble-selected');
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
                void this.saveAllEntries();
                void this.render();
            }), () => __awaiter(this, void 0, void 0, function* () { yield Promise.resolve(); }), () => __awaiter(this, void 0, void 0, function* () {
                const picker = new IconPickerModal(this.app, icon => {
                    modal.setIcon(icon);
                }, () => {
                    modal.setIcon('');
                });
                void picker.open();
            }));
            modal.categories = this.plugin.settings.eventCategories || [];
            modal.plugin = this.plugin;
            void modal.open();
        });
    }
    renderLongEvents() {
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
        }
        const cells = Array.from(this.gridEl.children).filter(el => { var _a, _b; return (_b = (_a = el).hasClass) === null || _b === void 0 ? void 0 : _b.call(_a, 'dayble-day'); });
        const todayNum = (el) => {
            const n = el.querySelector('.dayble-day-number');
            return n ? n.getBoundingClientRect().height + parseFloat(getComputedStyle(n).marginBottom || '0') : 24;
        };
        const segmentHeight = 28;
        const segmentGap = 4;
        // getCellWidth removed as unused
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
            const styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}|${this.plugin.settings.eventBorderOpacity}`;
            const contentSig = `${ev.title || ''}|${ev.description || ''}|${ev.icon || ''}|${ev.time || ''}`;
            if (startRow === endRow) {
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last)
                    return;
                const frLeft = (first).offsetLeft;
                const frTop = (first).offsetTop;
                const lrRight = (last).offsetLeft + (last).offsetWidth;
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
                    (item).dataset.longKey = key;
                    (item).dataset.styleSig = styleSig;
                    (item).dataset.contentSig = contentSig;
                    item.addClass('dayble-long-event-position');
                    item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                    this.gridEl.appendChild(item);
                    this._longEls.set(key, item);
                }
                else {
                    const sig = styleSig;
                    const csig = contentSig;
                    if ((item).dataset.styleSig !== sig || (item).dataset.contentSig !== csig) {
                        const newItem = this.createEventItem(ev);
                        newItem.addClass('dayble-long-event');
                        newItem.addClass('dayble-long-event-single');
                        (newItem).dataset.longKey = key;
                        (newItem).dataset.styleSig = sig;
                        (newItem).dataset.contentSig = csig;
                        newItem.addClass('dayble-long-event-position');
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
                (item).style.setProperty('--event-border-width', `${(_a = this.plugin.settings.eventBorderWidth) !== null && _a !== void 0 ? _a : 2}px`);
                (item).style.setProperty('--event-border-radius', `${(_b = this.plugin.settings.eventBorderRadius) !== null && _b !== void 0 ? _b : 6}px`);
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
                    const frLeft = (first).offsetLeft;
                    const frTop = (first).offsetTop;
                    const lrRight = (last).offsetLeft + (last).offsetWidth;
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
                        (item).dataset.longKey = key;
                        (item).dataset.styleSig = styleSig;
                        (item).dataset.contentSig = contentSig;
                        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                        this.gridEl.appendChild(item);
                        this._longEls.set(key, item);
                    }
                    else {
                        const sig = styleSig;
                        const csig = contentSig;
                        if ((item).dataset.styleSig !== sig || (item).dataset.contentSig !== csig) {
                            const newItem = this.createEventItem(ev);
                            newItem.addClass('dayble-long-event');
                            if (row === startRow)
                                newItem.addClass('dayble-long-event-start');
                            if (row === endRow)
                                newItem.addClass('dayble-long-event-end');
                            (newItem).dataset.longKey = key;
                            (newItem).dataset.styleSig = sig;
                            (newItem).dataset.contentSig = csig;
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
                    (item).style.setProperty('--event-border-width', `${(_c = this.plugin.settings.eventBorderWidth) !== null && _c !== void 0 ? _c : 2}px`);
                    (item).style.setProperty('--event-border-radius', `${(_d = this.plugin.settings.eventBorderRadius) !== null && _d !== void 0 ? _d : 6}px`);
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
                title.addClass('dayble-strikethrough');
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
            (_b = (e.dataTransfer)) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'calendar');
            try {
                const dragImg = item.cloneNode(true);
                dragImg.addClass('dayble-drag-ghost');
                const rect = item.getBoundingClientRect();
                dragImg.style.width = `${rect.width}px`;
                dragImg.style.height = `${rect.height}px`;
                dragImg.style.borderRadius = getComputedStyle(item).borderRadius;
                document.body.appendChild(dragImg);
                (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                item.__dragImg = dragImg;
            }
            catch (e) {
                console.debug('[Dayble] Drag image setup error:', e);
            }
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
                void this.saveAllEntries().then(() => void void this.render());
            }));
            menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                ev.completed = !ev.completed;
                void this.saveAllEntries().then(() => void this.render());
            }));
            menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                this.events = this.events.filter(e2 => e2.id !== ev.id);
                void this.saveAllEntries().then(() => void this.render());
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
        return __awaiter(this, void 0, void 0, function* () {
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
                    (_b = (e.dataTransfer)) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'holder');
                    try {
                        const dragImg = item.cloneNode(true);
                        dragImg.addClass('dayble-drag-ghost');
                        const rect = item.getBoundingClientRect();
                        dragImg.style.width = `${rect.width}px`;
                        dragImg.style.height = `${rect.height}px`;
                        dragImg.style.borderRadius = getComputedStyle(item).borderRadius;
                        document.body.appendChild(dragImg);
                        (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                        item.__dragImg = dragImg;
                    }
                    catch (e) {
                        console.debug('[Dayble] Drag image setup error:', e);
                    }
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
                void this.saveAllEntries();
            });
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
                    void this.currentTodayModal.onOpen();
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
                    void this.render();
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
                void picker.open();
            }));
            modal.categories = this.plugin.settings.eventCategories || [];
            modal.plugin = this.plugin;
            void modal.open();
        });
    }
    openTodayModal(date) {
        const modal = new TodayModal(this.app, date, this.events, this);
        this.currentTodayModal = modal;
        modal.onClose = () => { this.currentTodayModal = undefined; };
        void modal.open();
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
        heading.textContent = this.ev ? 'Edit event' : 'Add new event';
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
        catch (e) {
            console.debug('[Dayble] Focus title:', e);
        } };
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
                item.classList.add('dayble-suggestion-item');
                if (i === 0) {
                    item.classList.add('is-selected');
                }
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
            items.forEach(i => { i.classList.remove('is-selected'); });
            suggestionSelectedIndex = Math.max(0, Math.min(items.length - 1, suggestionSelectedIndex + dir));
            const sel = items[suggestionSelectedIndex];
            if (sel) {
                sel.classList.add('is-selected');
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
        const colorSwatchPos = (_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.colorSwatchPosition) !== null && _f !== void 0 ? _f : 'under-title';
        if (colorSwatchPos === 'under-title') {
            createColorRow();
        }
        const ruleRow = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        ruleRow.addClass('db-modal-row');
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.addClass('db-label');
        categoryLabel.addClass('dayble-category-label');
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
            createColorRow();
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
        ok.textContent = 'Save event';
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
        c.addClass('dayble-modal-column');
        c.addClass('dayble-modal-full-height');
        c.addClass('db-modal');
        const searchRow = c.createDiv({ cls: 'dayble-modal-row' });
        searchRow.addClass('db-modal-row');
        const searchInput = searchRow.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Search icons' } });
        searchInput.addClass('db-input');
        searchInput.addClass('dayble-icon-picker-search');
        const list = c.createDiv({ cls: 'dayble-icon-list' });
        list.addClass('dayble-icon-picker-list');
        list.addClass('db-icon-list');
        // Footer with remove button
        const footer = c.createDiv();
        footer.addClass('db-modal-footer');
        footer.addClass('dayble-icon-picker-footer');
        const removeBtn = footer.createEl('button', { cls: 'dayble-btn', text: 'Remove icon' });
        removeBtn.addClass('db-btn');
        removeBtn.addClass('dayble-icon-picker-remove-btn');
        const removeIcon = removeBtn.createDiv();
        (0, obsidian_1.setIcon)(removeIcon, 'x');
        removeIcon.addClass('dayble-inline-flex');
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
                btn.addClass('dayble-icon-btn');
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
        catch (e) {
            console.debug('[Dayble] PromptSearchModal init:', e);
        }
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
                note.addClass('dayble-suggestion-note');
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
                        catch (_a) { }
                    }
                }
            }
            catch (_b) { }
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
        c.addClass('dayble-modal-column');
        c.addClass('dayble-modal-full-height');
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
        title.addClass('dayble-modal-title');
        // Get events for this date
        const dayEvents = this.events.filter(e => e.date === this.date).sort((a, b) => {
            const timeA = a.time ? a.time.split('-')[0] : '99:99';
            const timeB = b.time ? b.time.split('-')[0] : '99:99';
            return timeA.localeCompare(timeB);
        });
        // Events container (scrollable)
        const eventsContainer = c.createDiv({ cls: 'dayble-today-events-container' });
        eventsContainer.addClass('db-events-container');
        eventsContainer.addClass('dayble-modal-events');
        if (dayEvents.length === 0) {
            eventsContainer.createEl('p', { text: 'No events for this day' });
        }
        else {
            dayEvents.forEach(ev => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                const row = c.createDiv({ cls: 'dayble-today-event-row' });
                row.addClass('db-today-row');
                row.addClass('dayble-modal-event-row');
                row.setAttribute('draggable', 'true');
                row.dataset.id = ev.id;
                const contentEl = row.createDiv();
                contentEl.addClass('dayble-modal-event-content');
                const titleEl = contentEl.createDiv({ cls: 'dayble-today-event-title' });
                titleEl.addClass('db-title');
                titleEl.addClass('dayble-font-medium');
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
                timeEl.addClass('dayble-time-el-style');
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
                    descEl.addClass('dayble-desc-text');
                    // Match title color
                    descEl.style.color = titleEl.style.color;
                    renderMarkdown(ev.description, descEl, (_q = (_p = this.view) === null || _p === void 0 ? void 0 : _p.plugin) === null || _q === void 0 ? void 0 : _q.app);
                }
                // Optional completed indicator
                if (ev.completed) {
                    const behavior = (_u = (_t = (_s = (_r = this.view) === null || _r === void 0 ? void 0 : _r.plugin) === null || _s === void 0 ? void 0 : _s.settings) === null || _t === void 0 ? void 0 : _t.completeBehavior) !== null && _u !== void 0 ? _u : 'none';
                    if (behavior === 'dim')
                        row.addClass('dayble-opacity-60');
                    else if (behavior === 'strikethrough')
                        titleEl.addClass('dayble-strikethrough');
                    else if (behavior === 'hide')
                        row.addClass('dayble-hidden');
                }
                eventsContainer.appendChild(row);
                // Drag handlers for reordering
                row.ondragstart = e => {
                    var _a, _b, _c;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', ev.id);
                    (_b = (e.dataTransfer)) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'today');
                    try {
                        const dragImg = row.cloneNode(true);
                        dragImg.addClass('dayble-drag-image-style');
                        const rect = row.getBoundingClientRect();
                        dragImg.style.width = `${rect.width}px`;
                        dragImg.style.height = `${rect.height}px`;
                        dragImg.style.borderRadius = getComputedStyle(row).borderRadius;
                        document.body.appendChild(dragImg);
                        (_c = e.dataTransfer) === null || _c === void 0 ? void 0 : _c.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                        row.__dragImg = dragImg;
                    }
                    catch (e) {
                        console.debug('[Dayble] Drag image setup:', e);
                    }
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
                            void this.view.saveAllEntries().then(() => { var _a; return void void ((_a = this.view) === null || _a === void 0 ? void 0 : _a.render()); });
                        }
                    }));
                    menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                        ev.completed = !ev.completed;
                        if (this.view)
                            void this.view.saveAllEntries().then(() => { var _a; return void ((_a = this.view) === null || _a === void 0 ? void 0 : _a.render()); });
                    }));
                    menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                        if (this.view) {
                            this.view.events = this.view.events.filter(e2 => e2.id !== ev.id);
                            void this.view.saveAllEntries().then(() => { var _a; return void ((_a = this.view) === null || _a === void 0 ? void 0 : _a.render()); });
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
                var _a;
                e.preventDefault();
                eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const id = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('text/plain');
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
                    void this.view.saveAllEntries();
                    void this.view.render();
                }
            });
        }
        // Fixed +Add Event button at bottom
        const addBtn = c.createEl('button', { cls: 'dayble-today-add-btn', text: '+ add event' });
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
            void ((_a = this.view) === null || _a === void 0 ? void 0 : _a.openEventModal(undefined, this.date));
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
        title.addClass('dayble-modal-title');
        contentEl.createEl('p', { text: 'You need to set a storage folder to create and save events.' });
        const btns = contentEl.createDiv({ cls: 'dayble-modal-actions' });
        const openSettingsBtn = btns.createEl('button', { cls: 'dayble-btn' });
        openSettingsBtn.setText('Open settings');
        openSettingsBtn.onclick = () => {
            var _a, _b;
            try {
                const s = this.app.setting;
                (_a = s === null || s === void 0 ? void 0 : s.open) === null || _a === void 0 ? void 0 : _a.call(s);
                (_b = s === null || s === void 0 ? void 0 : s.openTabById) === null || _b === void 0 ? void 0 : _b.call(s, 'dayble-calendar');
            }
            catch (e) {
                console.debug('[Dayble] Open settings:', e);
            }
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
        c.addClass('dayble-confirm-content');
        const msg = c.createEl('div');
        msg.textContent = this.message;
        const row = c.createDiv();
        row.addClass('dayble-modal-row-end');
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
        ;
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                        void view.render();
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
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
                    void view.onOpen();
                }
            }));
        });
        new obsidian_1.Setting(containerEl)
            .setName('Enable weekly notes')
            .setDesc('Show a Markdown notes section below the calendar in weekly view')
            .addToggle(t => {
            var _a;
            t.setValue((_a = this.plugin.settings.weeklyNotesEnabled) !== null && _a !== void 0 ? _a : false)
                .onChange((v) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.weeklyNotesEnabled = v;
                yield this.plugin.saveSettings();
                const view = this.plugin.getCalendarView();
                void (view === null || view === void 0 ? void 0 : view.render());
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
                void (view === null || view === void 0 ? void 0 : view.render());
            }));
            (t.inputEl).type = 'number';
            (t.inputEl).min = '0';
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
            row.addClass('dayble-settings-colors-row');
            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' }));
            const combined = [...built, ...customs];
            const makeItem = (entry, idx) => {
                const wrap = row.createDiv();
                wrap.addClass('dayble-flex-center-gap');
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
                del.addClass('dayble-btn-inline-del');
                (0, obsidian_1.setIcon)(del, 'x');
                del.setAttr('draggable', 'false');
                del.onmousedown = (e) => { e.stopPropagation(); };
                del.ontouchstart = (e) => { e.stopPropagation(); };
                del.onclick = () => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Delete this color swatch?', () => __awaiter(this, void 0, void 0, function* () {
                        wrap.remove();
                        yield updateAll();
                    }));
                    void modal.open();
                });
                wrap.ondragstart = e => {
                    var _a;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', 'drag');
                    (e.dataTransfer).effectAllowed = 'move';
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
            controlsBottom.settingEl.addClass('dayble-settings-controls');
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to default colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', () => __awaiter(this, void 0, void 0, function* () {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        yield this.plugin.saveSettings();
                        renderColorsTop();
                    }));
                    void modal.open();
                }));
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const wrap = row.createDiv();
                    wrap.addClass('dayble-settings-color-item');
                    wrap.setAttr('draggable', 'true');
                    wrap.dataset.source = 'custom';
                    wrap.dataset.name = '';
                    const textPicker = wrap.createEl('input', { type: 'color' });
                    textPicker.value = '#ffffff';
                    const bgPicker = wrap.createEl('input', { type: 'color' });
                    bgPicker.value = '#ff0000';
                    const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                    del.addClass('dayble-btn-inline-del');
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
                        void modal.open();
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
                row.settingEl.addClass('dayble-settings-category-row');
                row.controlEl.addClass('dayble-settings-category-control');
                row.settingEl.classList.add('db-category-row');
                // Icon button
                row.addButton(b => {
                    var _a;
                    (b.buttonEl).classList.add('dayble-btn', 'dayble-icon-add', 'db-btn');
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
                        void picker.open();
                    });
                });
                // Category name input
                row.addText(t => { t.setValue(category.name).onChange(v => { category.name = v; }); (t.inputEl).classList.add('db-input', 'db-category-name'); });
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
                    (d.selectEl).classList.add('db-select', 'db-effect');
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
                    (d.selectEl).classList.add('db-select', 'db-animation');
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
                    (d.selectEl).classList.add('db-select', 'db-animation2');
                });
                row.addExtraButton(btn => { var _a, _b; btn.setIcon('x').setTooltip('Delete').onClick(() => { this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).filter(c => c.id !== category.id); renderRules(); }); (_b = (_a = btn.extraButtonEl) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add('db-btn', 'db-delete-category'); });
            });
        };
        new obsidian_1.Setting(containerEl).addButton(b => {
            b.setButtonText('+ add category');
            (b.buttonEl).addClass('mod-cta');
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
                (row.controlEl).addClass('dayble-flex-gap-8');
                row.addText(t => {
                    t.setPlaceholder('Text in title or description');
                    t.setValue(tr.pattern);
                    t.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                        items[idx].pattern = v || '';
                        this.plugin.settings.triggers = items;
                        yield this.plugin.saveSettings();
                    }));
                    (t.inputEl).classList.add('db-input');
                    (t.inputEl).addClass('dayble-trigger-input');
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
                    (d.selectEl).classList.add('db-select');
                    (d.selectEl).addClass('dayble-icon-select');
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
                    (d.selectEl).classList.add('db-select');
                    // Style the dropdown
                    const applyColorStyles = () => {
                        const currentValue = d.getValue();
                        const selectedSwatch = swatches.find(sw => sw.color === currentValue);
                        // Style the select element itself
                        if (selectedSwatch) {
                            (d.selectEl).style.setProperty('background-color', selectedSwatch.color);
                            (d.selectEl).style.setProperty('color', selectedSwatch.textColor || '#000');
                        }
                        else {
                            (d.selectEl).style.removeProperty('background-color');
                            (d.selectEl).style.removeProperty('color');
                        }
                        // Style the options
                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value)
                                return; // Skip default option
                            const s = swatches.find(sw => sw.color === opt.value);
                            if (s) {
                                opt.style.setProperty('background-color', s.color);
                                opt.style.setProperty('color', s.textColor || '#000');
                            }
                        });
                    };
                    // Apply initially
                    applyColorStyles();
                    (d.selectEl).style.maxWidth = '120px';
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
                b.setButtonText('+ add trigger').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
        swatchesSection.addClass('dayble-hidden');
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
            row.addClass('dayble-settings-row-wrap');
            // Store the old swatches to detect changes
            const oldBuilt = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, source: 'built' }));
            const oldCustoms = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', source: 'custom' }));
            const combined = [...oldBuilt, ...oldCustoms];
            const makeItem = (entry, idx) => {
                const wrap = row.createDiv();
                wrap.addClass('dayble-flex-center-gap');
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
                        const colorInput = w.querySelector('input[type="color"]');
                        const val = (colorInput === null || colorInput === void 0 ? void 0 : colorInput.value) || '';
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
                (del).style.background = 'none';
                (del).style.boxShadow = 'none';
                (del).style.border = 'none';
                (del).style.padding = '2px 4px';
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
                    void modal.open();
                });
                wrap.ondragstart = e => {
                    var _a;
                    (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.setData('text/plain', 'drag');
                    (e.dataTransfer).effectAllowed = 'move';
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
                        const colorInput = w.querySelector('input[type="color"]');
                        const val = (colorInput === null || colorInput === void 0 ? void 0 : colorInput.value) || '';
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
            controlsBottom.settingEl.addClass('dayble-no-border-top');
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to default colors').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', () => __awaiter(this, void 0, void 0, function* () {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        yield this.plugin.saveSettings();
                        renderColors();
                        renderTriggers();
                    }));
                    void modal.open();
                }));
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const newCustom = (this.plugin.settings.userCustomSwatches || []).slice();
                    newCustom.push({ name: '', color: '#ff0000' });
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
                    renderColors();
                    renderTriggers();
                }));
                (b.buttonEl).addClass('dayble-ml-auto');
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
                    catch (_e) {
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
                catch (_f) {
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
                                catch (e) {
                                    console.debug('[Dayble] Create folder:', e);
                                }
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
                    catch (_d) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBbUo7QUFFbkosTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUM7QUFrQ3pDLE1BQU0sZ0JBQWdCLEdBQW1CO0lBQ3JDLFlBQVksRUFBRSxDQUFDO0lBQ2YsYUFBYSxFQUFFLEVBQUU7SUFDakIsYUFBYSxFQUFFLE1BQU07SUFDckIsZUFBZSxFQUFFLFFBQVE7SUFDekIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsaUJBQWlCLEVBQUUsQ0FBQztJQUNwQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLG1CQUFtQixFQUFFLGFBQWE7SUFDbEMsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsc0JBQXNCLEVBQUUsS0FBSztJQUM3QixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixlQUFlLEVBQUUsTUFBTTtJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsUUFBUSxFQUFFO1FBQ04sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN2RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDekQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUM5RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDMUQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUMzRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO0tBQzNEO0lBQ0Qsa0JBQWtCLEVBQUUsRUFBRTtJQUN0QixlQUFlLEVBQUUsRUFBRTtJQUNuQixRQUFRLEVBQUUsRUFBRTtDQUNmLENBQUM7QUE4QkYs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LENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRixDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsR0FBVyxFQUFFLEtBQWE7SUFDekMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksQ0FBQyxHQUFHO1FBQUUsT0FBTyxHQUFHLENBQUM7SUFDckIsT0FBTyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLEtBQUssR0FBRyxDQUFDO0FBQzFELENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUF5QixFQUFFLEdBQWtCO0lBQ2xFLElBQUksQ0FBQyxLQUFLO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFDdEIsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksR0FBRyxLQUFLLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDdEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM5QixPQUFPLEdBQUcsR0FBRyxJQUFJ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QUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLElBQUksTUFBTSxJQUFJLE1BQU0sWUFBWSxnQkFBSztRQUFFLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNuQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDeEUsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDdEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7V0FDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUM7V0FDaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEUsSUFBSSxLQUFLO1FBQUUsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENB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QVMsdUJBQVQsU0FBUyxDQUFFLFVBQVU7UUFBRSxPQUFPLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN6RCxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIEl0ZW1WaWV3LCBNb2RhbCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24sIE1lbnUsIFRGaWxlLCBGdXp6eVN1Z2dlc3RNb2RhbCB9IGZyb20gJ29ic2lkaWFuJztcblxuY29uc3QgVklFV19UWVBFID0gJ2RheWJsZS1jYWxlbmRhci12aWV3JztcblxuaW50ZXJmYWNlIERheWJsZVNldHRpbmdzIHtcbiAgICB3ZWVrU3RhcnREYXk6IG51bWJlcjtcbiAgICBlbnRyaWVzRm9sZGVyOiBzdHJpbmc7XG4gICAgaWNvblBsYWNlbWVudD86ICdsZWZ0JyB8ICdyaWdodCcgfCAnbm9uZScgfCAndG9wJyB8ICd0b3AtbGVmdCcgfCAndG9wLXJpZ2h0JztcbiAgICBldmVudFRpdGxlQWxpZ24/OiAnbGVmdCcgfCAnY2VudGVyJyB8ICdyaWdodCc7XG4gICAgZXZlbnREZXNjQWxpZ24/OiAnbGVmdCcgfCAnY2VudGVyJyB8ICdyaWdodCc7XG4gICAgdGltZUZvcm1hdD86ICcyNGgnIHwgJzEyaCc7XG4gICAgaG9sZGVyT3Blbj86IGJvb2xlYW47XG4gICAgaG9sZGVyV2lkdGg/OiBudW1iZXI7IC8vIGluIHBpeGVsc1xuICAgIHdlZWtseU5vdGVzSGVpZ2h0PzogbnVtYmVyOyAvLyBpbiBwaXhlbHNcbiAgICBldmVudENhdGVnb3JpZXM/OiBFdmVudENhdGVnb3J5W107XG4gICAgcHJlZmVyVXNlckNvbG9ycz86IGJvb2xlYW47IC8vIHByZWZlciB1c2VyLXNldCBldmVudCBjb2xvcnMgb3ZlciBjYXRlZ29yeSBjb2xvcnNcbiAgICBldmVudEJnT3BhY2l0eT86IG51bWJlcjsgLy8gMC0xLCBjb250cm9scyBiYWNrZ3JvdW5kIG9wYWNpdHlcbiAgICBldmVudEJvcmRlcldpZHRoPzogbnVtYmVyOyAvLyAwLTVweCwgY29udHJvbHMgYm9yZGVyIHRoaWNrbmVzc1xuICAgIGV2ZW50Qm9yZGVyUmFkaXVzPzogbnVtYmVyOyAvLyBweCwgY29udHJvbHMgYm9yZGVyIHJhZGl1c1xuICAgIGV2ZW50Qm9yZGVyT3BhY2l0eT86IG51bWJlcjsgLy8gMC0xLCBjb250cm9scyBib3JkZXIgY29sb3Igb3BhY2l0eSAoZm9yIGNvbG9yZWQgZXZlbnRzKVxuICAgIGNvbG9yU3dhdGNoUG9zaXRpb24/OiAndW5kZXItdGl0bGUnIHwgJ3VuZGVyLWRlc2NyaXB0aW9uJyB8ICdub25lJzsgLy8gcG9zaXRpb24gb2YgY29sb3Igc3dhdGNoZXMgaW4gbW9kYWxcbiAgICBvbmx5QW5pbWF0ZVRvZGF5PzogYm9vbGVhbjtcbiAgICBjb21wbGV0ZUJlaGF2aW9yPzogJ25vbmUnIHwgJ2RpbScgfCAnc3RyaWtldGhyb3VnaCcgfCAnaGlkZSc7XG4gICAgY3VzdG9tU3dhdGNoZXNFbmFibGVkPzogYm9vbGVhbjtcbiAgICByZXBsYWNlRGVmYXVsdFN3YXRjaGVzPzogYm9vbGVhbjtcbiAgICBzd2F0Y2hlcz86IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdO1xuICAgIHVzZXJDdXN0b21Td2F0Y2hlcz86IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdO1xuICAgIGRlZmF1bHRDb2xvcnNGb2xkZWQ/OiBib29sZWFuO1xuICAgIGN1c3RvbVN3YXRjaGVzRm9sZGVkPzogYm9vbGVhbjtcbiAgICBkYXlDZWxsTWF4SGVpZ2h0PzogbnVtYmVyO1xuICAgIGhvbGRlclBsYWNlbWVudD86ICdsZWZ0JyB8ICdyaWdodCcgfCAnaGlkZGVuJztcbiAgICBjYWxlbmRhcldlZWtBY3RpdmU/OiBib29sZWFuO1xuICAgIHRyaWdnZXJzPzogeyBwYXR0ZXJuOiBzdHJpbmcsIGNhdGVnb3J5SWQ6IHN0cmluZywgY29sb3I/OiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W107XG4gICAgd2Vla2x5Tm90ZXNFbmFibGVkPzogYm9vbGVhbjtcbn0gXG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IERheWJsZVNldHRpbmdzID0ge1xuICAgIHdlZWtTdGFydERheTogMCxcbiAgICBlbnRyaWVzRm9sZGVyOiAnJyxcbiAgICBpY29uUGxhY2VtZW50OiAnbGVmdCcsXG4gICAgZXZlbnRUaXRsZUFsaWduOiAnY2VudGVyJyxcbiAgICBldmVudERlc2NBbGlnbjogJ2NlbnRlcicsXG4gICAgdGltZUZvcm1hdDogJzI0aCcsXG4gICAgaG9sZGVyT3BlbjogdHJ1ZSxcbiAgICB3ZWVrbHlOb3Rlc0hlaWdodDogMjAwLFxuICAgIHByZWZlclVzZXJDb2xvcnM6IGZhbHNlLFxuICAgIGV2ZW50QmdPcGFjaXR5OiAwLjUwLFxuICAgIGV2ZW50Qm9yZGVyV2lkdGg6IDAsXG4gICAgZXZlbnRCb3JkZXJSYWRpdXM6IDYsXG4gICAgZXZlbnRCb3JkZXJPcGFjaXR5OiAwLjI1LFxuICAgIGNvbG9yU3dhdGNoUG9zaXRpb246ICd1bmRlci10aXRsZScsXG4gICAgb25seUFuaW1hdGVUb2RheTogZmFsc2UsXG4gICAgY29tcGxldGVCZWhhdmlvcjogJ2RpbScsXG4gICAgY3VzdG9tU3dhdGNoZXNFbmFibGVkOiBmYWxzZSxcbiAgICByZXBsYWNlRGVmYXVsdFN3YXRjaGVzOiBmYWxzZSxcbiAgICBkZWZhdWx0Q29sb3JzRm9sZGVkOiB0cnVlLFxuICAgIGN1c3RvbVN3YXRjaGVzRm9sZGVkOiBmYWxzZSxcbiAgICBkYXlDZWxsTWF4SGVpZ2h0OiAwLFxuICAgIGhvbGRlclBsYWNlbWVudDogJ2xlZnQnLFxuICAgIGNhbGVuZGFyV2Vla0FjdGl2ZTogZmFsc2UsXG4gICAgd2Vla2x5Tm90ZXNFbmFibGVkOiBmYWxzZSxcbiAgICBzd2F0Y2hlczogW1xuICAgICAgICB7IG5hbWU6ICdSZWQnLCBjb2xvcjogJyNlYjNiNWEnLCB0ZXh0Q29sb3I6ICcjZjljNmQwJyB9LFxuICAgICAgICB7IG5hbWU6ICdPcmFuZ2UnLCBjb2xvcjogJyNmYTgyMzEnLCB0ZXh0Q29sb3I6ICcjZmVkOGJlJyB9LFxuICAgICAgICB7IG5hbWU6ICdBbWJlcicsIGNvbG9yOiAnI2U1YTIxNicsIHRleHRDb2xvcjogJyNmOGU1YmInIH0sXG4gICAgICAgIHsgbmFtZTogJ0dyZWVuJywgY29sb3I6ICcjMjBiZjZiJywgdGV4dENvbG9yOiAnI2M0ZWVkYScgfSxcbiAgICAgICAgeyBuYW1lOiAnVGVhbCcsIGNvbG9yOiAnIzBmYjliMScsIHRleHRDb2xvcjogJyNiZGVjZWEnIH0sXG4gICAgICAgIHsgbmFtZTogJ0JsdWUnLCBjb2xvcjogJyMyZDk4ZGEnLCB0ZXh0Q29sb3I6ICcjYzVlM2Y4JyB9LFxuICAgICAgICB7IG5hbWU6ICdDb3JuZmxvd2VyJywgY29sb3I6ICcjMzg2N2Q2JywgdGV4dENvbG9yOiAnI2M5ZDVmOCcgfSxcbiAgICAgICAgeyBuYW1lOiAnSW5kaWdvJywgY29sb3I6ICcjNTQ1NGQwJywgdGV4dENvbG9yOiAnI2QyZDJmOCcgfSxcbiAgICAgICAgeyBuYW1lOiAnUHVycGxlJywgY29sb3I6ICcjODg1NGQwJywgdGV4dENvbG9yOiAnI2UyZDJmOCcgfSxcbiAgICAgICAgeyBuYW1lOiAnTWFnZW50YScsIGNvbG9yOiAnI2I1NTRkMCcsIHRleHRDb2xvcjogJyNlZGQyZjgnIH0sXG4gICAgICAgIHsgbmFtZTogJ1BpbmsnLCBjb2xvcjogJyNlODMyYzEnLCB0ZXh0Q29sb3I6ICcjZjhjMmVmJyB9LFxuICAgICAgICB7IG5hbWU6ICdSb3NlJywgY29sb3I6ICcjZTgzMjg5JywgdGV4dENvbG9yOiAnI2Y4YzJlMCcgfSxcbiAgICAgICAgeyBuYW1lOiAnQnJvd24nLCBjb2xvcjogJyM5NjViM2InLCB0ZXh0Q29sb3I6ICcjZTVkNGM5JyB9LFxuICAgICAgICB7IG5hbWU6ICdHcmF5JywgY29sb3I6ICcjODM5MmE0JywgdGV4dENvbG9yOiAnI2UzZTZlYScgfVxuICAgIF0sXG4gICAgdXNlckN1c3RvbVN3YXRjaGVzOiBbXSxcbiAgICBldmVudENhdGVnb3JpZXM6IFtdLFxuICAgIHRyaWdnZXJzOiBbXVxufTtcblxuaW50ZXJmYWNlIERheWJsZUV2ZW50IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgZGF0ZT86IHN0cmluZztcbiAgICBzdGFydERhdGU/OiBzdHJpbmc7XG4gICAgZW5kRGF0ZT86IHN0cmluZztcbiAgICB0aW1lPzogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICAgIGljb24/OiBzdHJpbmc7XG4gICAgY29tcGxldGVkPzogYm9vbGVhbjtcbiAgICBjb2xvcj86IHN0cmluZzsgLy8gdXNlci1zZXQgY29sb3IgKGhleClcbiAgICB0ZXh0Q29sb3I/OiBzdHJpbmc7IC8vIHVzZXItc2V0IHRleHQgY29sb3IgKGhleClcbiAgICBjYXRlZ29yeUlkPzogc3RyaW5nO1xuICAgIGVmZmVjdD86IHN0cmluZztcbiAgICBhbmltYXRpb24/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBFdmVudENhdGVnb3J5IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBiZ0NvbG9yOiBzdHJpbmc7XG4gICAgdGV4dENvbG9yOiBzdHJpbmc7XG4gICAgZWZmZWN0OiBzdHJpbmc7XG4gICAgYW5pbWF0aW9uOiBzdHJpbmc7XG4gICAgYW5pbWF0aW9uMjogc3RyaW5nO1xuICAgIGljb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERheWJsZUNhbGVuZGFyUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgICBzZXR0aW5nczogRGF5YmxlU2V0dGluZ3M7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRSwgbGVhZiA9PiBuZXcgRGF5YmxlQ2FsZW5kYXJWaWV3KGxlYWYsIHRoaXMpKTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLWNhbGVuZGFyJywgbmFtZTogJ09wZW4gY2FsZW5kYXInLCBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLm9wZW5EYXlibGUoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdmb2N1cy10b2RheScsIG5hbWU6ICdGb2N1cyBvbiB0b2RheScsIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuZm9jdXNUb2RheSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAnb3Blbi13ZWVrbHktdmlldycsIFxuICAgICAgICAgICAgbmFtZTogJ09wZW4gd2Vla2x5IHZpZXcnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbkRheWJsZSgpOyBcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ29wZW4tbW9udGhseS12aWV3JywgXG4gICAgICAgICAgICBuYW1lOiAnT3BlbiBtb250aGx5IHZpZXcnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbkRheWJsZSgpOyBcbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgRGF5YmxlU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgICAgICB0aGlzLmVuc3VyZUVudHJpZXNGb2xkZXIoKTtcbiAgICAgICAgdm9pZCB0aGlzLm9wZW5EYXlibGUoKTtcbiAgICB9XG5cbiAgICBvbnVubG9hZCgpIHtcbiAgICAgICAgLy8gRG8gbm90IGRldGFjaCBsZWF2ZXMgaGVyZSB0byByZXNwZWN0IHVzZXIgbGF5b3V0XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICB9XG5cbiAgICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgYXN5bmMgb3BlbkRheWJsZSgpIHtcbiAgICAgICAgY29uc3QgbGVhZiA9IHRoaXMuZ2V0T3JDcmVhdGVMZWFmKCk7XG4gICAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgIH1cblxuICAgIGZvY3VzVG9kYXkoKSB7XG4gICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICBpZiAodmlldykgdmlldy5mb2N1c1RvZGF5KCk7XG4gICAgICAgIGVsc2Ugdm9pZCB0aGlzLm9wZW5EYXlibGUoKTtcbiAgICB9XG5cbiAgICBnZXRDYWxlbmRhclZpZXcoKTogRGF5YmxlQ2FsZW5kYXJWaWV3IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGggPiAwKSByZXR1cm4gbGVhdmVzWzBdLnZpZXcgYXMgRGF5YmxlQ2FsZW5kYXJWaWV3O1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBnZXRPckNyZWF0ZUxlYWYoKTogV29ya3NwYWNlTGVhZiB7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGgpIHJldHVybiBsZWF2ZXNbMF07XG4gICAgICAgIHJldHVybiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKSA/PyB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcbiAgICB9XG5cbiAgICBhc3luYyBlbnN1cmVFbnRyaWVzRm9sZGVyKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnNldHRpbmdzLmVudHJpZXNGb2xkZXI7XG4gICAgICAgIGlmICghZm9sZGVyIHx8IGZvbGRlci50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZm9sZGVyIGV4aXN0cyBlcnJvclxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBEYXlibGVDYWxlbmRhclZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gICAgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbjtcbiAgICByb290RWw6IEhUTUxFbGVtZW50O1xuICAgIGhlYWRlckVsOiBIVE1MRWxlbWVudDtcbiAgICBtb250aFRpdGxlRWw6IEhUTUxFbGVtZW50O1xuICAgIHdlZWtIZWFkZXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgY2FsZW5kYXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgYm9keUVsOiBIVE1MRWxlbWVudDtcbiAgICBob2xkZXJFbDogSFRNTEVsZW1lbnQ7XG4gICAgZ3JpZEVsOiBIVE1MRWxlbWVudDtcbiAgICBfbG9uZ092ZXJsYXlFbD86IEhUTUxFbGVtZW50O1xuICAgIF9sb25nRWxzOiBNYXA8c3RyaW5nLCBIVE1MRWxlbWVudD4gPSBuZXcgTWFwKCk7XG4gICAgY3VycmVudERhdGU6IERhdGU7XG4gICAgZXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgaG9sZGVyRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgd2Vla2x5Tm90ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpc1NlbGVjdGluZyA9IGZhbHNlO1xuICAgIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICBzZWxlY3Rpb25TdGFydERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHNlbGVjdGlvbkVuZERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGlzUmVzaXppbmdIb2xkZXIgPSBmYWxzZTtcbiAgICBob2xkZXJSZXNpemVTdGFydFggPSAwO1xuICAgIGhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggPSAwO1xuICAgIF9ib3VuZEhvbGRlck1vdXNlTW92ZT86IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuICAgIF9ib3VuZEhvbGRlck1vdXNlVXA/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBfbG9uZ1JPPzogUmVzaXplT2JzZXJ2ZXI7XG4gICAgY3VycmVudFRvZGF5TW9kYWw/OiBUb2RheU1vZGFsO1xuICAgIHdlZWtUb2dnbGVCdG4/OiBIVE1MRWxlbWVudDtcbiAgICB3ZWVrbHlOb3Rlc0VsPzogSFRNTEVsZW1lbnQ7XG4gICAgZHJhZ2dlZEV2ZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgIHNhdmVUaW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IHVuZGVmaW5lZDtcbiAgICBpc1Jlc2l6aW5nV2Vla2x5Tm90ZXMgPSBmYWxzZTtcbiAgICB3ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0WSA9IDA7XG4gICAgd2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCA9IDA7XG4gICAgX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmU/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBfYm91bmRXZWVrbHlOb3Rlc01vdXNlVXA/OiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcblxuICAgIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIobGVhZik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5wbHVnaW4ucmVnaXN0ZXJEb21FdmVudCh3aW5kb3csICdyZXNpemUnLCAoKSA9PiB7XG4gICAgICAgICAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGRlYm91bmNlZFNhdmUoKSB7XG4gICAgICAgIGlmICh0aGlzLnNhdmVUaW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy5zYXZlVGltZW91dCk7XG4gICAgICAgIHRoaXMuc2F2ZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpLCAxMDAwKTtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRTsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gJ0RheWJsZSBjYWxlbmRhcic7IH1cbiAgICBnZXRJY29uKCkgeyByZXR1cm4gJ2NhbGVuZGFyJzsgfVxuICAgIFxuICAgIGdldE1vbnRoRGF0YUZpbGVQYXRoKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xuICAgICAgICBjb25zdCB5ZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtb250aCA9IG1vbnRoTmFtZXNbdGhpcy5jdXJyZW50RGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHt5ZWFyfSR7bW9udGh9Lmpzb25gO1xuICAgICAgICByZXR1cm4gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xuICAgIH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHtcbiAgICAgICAgdGhpcy5yb290RWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1yb290JyB9KTtcbiAgICAgICAgdGhpcy5oZWFkZXJFbCA9IHRoaXMucm9vdEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1oZWFkZXInIH0pO1xuICAgICAgICBjb25zdCBsZWZ0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LWxlZnQnIH0pO1xuICAgICAgICBjb25zdCBob2xkZXJUb2dnbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgaG9sZGVyVG9nZ2xlLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyBkYXlibGUtaG9sZGVyLXRvZ2dsZSc7XG4gICAgICAgIHNldEljb24oaG9sZGVyVG9nZ2xlLCAnbWVudScpO1xuICAgICAgICBob2xkZXJUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHsgdGhpcy5ob2xkZXJFbC5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJyk7IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4gPSB0aGlzLmhvbGRlckVsLmNsYXNzTGlzdC5jb250YWlucygnb3BlbicpOyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfTtcbiAgICAgICAgY29uc3Qgc2VhcmNoQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgIHNlYXJjaEJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLXNlYXJjaC10b2dnbGUnO1xuICAgICAgICBzZXRJY29uKHNlYXJjaEJ0biwgJ3NlYXJjaCcpO1xuICAgICAgICBzZWFyY2hCdG4ub25jbGljayA9ICgpID0+IHsgY29uc3QgbW9kYWwgPSBuZXcgUHJvbXB0U2VhcmNoTW9kYWwodGhpcy5hcHAsIHRoaXMpOyB2b2lkIG1vZGFsLm9wZW4oKTsgfTtcblxuICAgICAgICBjb25zdCB3ZWVrVG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgIHdlZWtUb2dnbGUuY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zIGRheWJsZS13ZWVrLXRvZ2dsZSc7XG4gICAgICAgIHNldEljb24od2Vla1RvZ2dsZSwgJ2NhbGVuZGFyLXJhbmdlJyk7XG4gICAgICAgIHdlZWtUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPSAhdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlO1xuICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud2Vla1RvZ2dsZUJ0biA9IHdlZWtUb2dnbGU7XG5cbiAgICAgICAgdGhpcy5tb250aFRpdGxlRWwgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZUVsKCdoMScsIHsgY2xzOiAnZGF5YmxlLW1vbnRoLXRpdGxlJyB9KTtcbiAgICAgICAgY29uc3QgcmlnaHQgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1uYXYtcmlnaHQnIH0pO1xuICAgICAgICBjb25zdCBwcmV2QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7IHByZXZCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcbiAgICAgICAgc2V0SWNvbihwcmV2QnRuLCAnY2hldnJvbi1sZWZ0Jyk7XG4gICAgICAgIHByZXZCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5zaGlmdE1vbnRoKC0xKTsgfTtcbiAgICAgICAgY29uc3QgdG9kYXlCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsgdG9kYXlCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcbiAgICAgICAgc2V0SWNvbih0b2RheUJ0biwgJ2RvdCcpO1xuICAgICAgICB0b2RheUJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLmZvY3VzVG9kYXkoKTsgfTtcbiAgICAgICAgY29uc3QgbmV4dEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOyBuZXh0QnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyc7XG4gICAgICAgIHNldEljb24obmV4dEJ0biwgJ2NoZXZyb24tcmlnaHQnKTtcbiAgICAgICAgbmV4dEJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLnNoaWZ0TW9udGgoMSk7IH07XG4gICAgICAgIGNvbnN0IHBsYWNlbWVudCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA/PyAnbGVmdCc7XG4gICAgICAgIFxuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAnbGVmdCcpIGxlZnQuYXBwZW5kQ2hpbGQoaG9sZGVyVG9nZ2xlKTtcbiAgICAgICAgXG4gICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQocHJldkJ0bik7XG4gICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQodG9kYXlCdG4pO1xuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKG5leHRCdG4pO1xuICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKHdlZWtUb2dnbGUpO1xuICAgICAgICBcbiAgICAgICAgcmlnaHQuYXBwZW5kQ2hpbGQoc2VhcmNoQnRuKTtcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0JykgcmlnaHQuYXBwZW5kQ2hpbGQoaG9sZGVyVG9nZ2xlKTtcbiAgICAgICAgdGhpcy5ib2R5RWwgPSB0aGlzLnJvb3RFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtYm9keScgfSk7XG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgIHRoaXMuYm9keUVsLmFkZENsYXNzKCdkYXlibGUtaG9sZGVyLXJpZ2h0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ob2xkZXJFbCA9IHRoaXMuYm9keUVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXInIH0pO1xuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAnaGlkZGVuJykge1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5hZGRDbGFzcygnZGF5YmxlLWhvbGRlci1oaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBob2xkZXJIZWFkZXIgPSB0aGlzLmhvbGRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItaGVhZGVyJywgdGV4dDogJ0hvbGRlcicgfSk7XG4gICAgICAgIGNvbnN0IGhvbGRlckFkZCA9IGhvbGRlckhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1ob2xkZXItYWRkLWJ0bicgfSk7XG4gICAgICAgIHNldEljb24oaG9sZGVyQWRkLCAncGx1cycpO1xuICAgICAgICBob2xkZXJBZGQub25jbGljayA9ICgpID0+IHZvaWQgdGhpcy5vcGVuRXZlbnRNb2RhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlc2l6ZSBoYW5kbGUgdG8gaG9sZGVyXG4gICAgICAgIGNvbnN0IHJlc2l6ZUhhbmRsZSA9IGhvbGRlckhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaG9sZGVyLXJlc2l6ZS1oYW5kbGUnIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUgPSAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdIb2xkZXIpIHJldHVybjtcbiAgICAgICAgICAgIGxldCBkaWZmID0gZS5jbGllbnRYIC0gdGhpcy5ob2xkZXJSZXNpemVTdGFydFg7XG4gICAgICAgICAgICAvLyBXaGVuIGhvbGRlciBpcyBvbiB0aGUgcmlnaHQsIHJldmVyc2UgdGhlIGRpcmVjdGlvblxuICAgICAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgICAgIGRpZmYgPSAtZGlmZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG5ld1dpZHRoID0gTWF0aC5tYXgoMjAwLCB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggKyBkaWZmKTtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwuc3R5bGUud2lkdGggPSBuZXdXaWR0aCArICdweCc7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXAgPSBhc3luYyAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNSZXNpemluZ0hvbGRlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ0hvbGRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCA9IHRoaXMuaG9sZGVyRWwub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXNpemVIYW5kbGUub25tb3VzZWRvd24gPSAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ0hvbGRlciA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WCA9IGUuY2xpZW50WDtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyUmVzaXplU3RhcnRXaWR0aCA9IHRoaXMuaG9sZGVyRWwub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGhvbGRlckxpc3QgPSB0aGlzLmhvbGRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItbGlzdCcgfSk7XG4gICAgICAgIC8vIEFkZCBkcmFnIGhhbmRsZXJzIHRvIGhvbGRlciBmb3IgZHJvcHBpbmcgZXZlbnRzIHRoZXJlXG4gICAgICAgIHRoaXMuaG9sZGVyRWwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgdGhpcy5ob2xkZXJFbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgIHRoaXMuaG9sZGVyRWwub25kcm9wID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgIGlmICghaWQgfHwgZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKSA9PT0gJ2hvbGRlcicpIHJldHVybjsgLy8gRG9uJ3QgZHJvcCBob2xkZXIgZXZlbnRzIG9uIGhvbGRlclxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLmV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzLnNwbGljZShpZHgsIDEpWzBdO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCBkYXRlIGluZm8gd2hlbiBtb3ZpbmcgdG8gaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGV2LnN0YXJ0RGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZXYuZW5kRGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnJlbmRlckhvbGRlcigpO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZhaWxlZCB0byBtb3ZlIGV2ZW50IHRvIGhvbGRlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmhvbGRlckVsLmFwcGVuZENoaWxkKGhvbGRlckxpc3QpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgc2F2ZWQgaG9sZGVyIHdpZHRoIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyV2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwuc3R5bGUud2lkdGggPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCArICdweCc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJPcGVuKSB0aGlzLmhvbGRlckVsLmFkZENsYXNzKCdvcGVuJyk7IGVsc2UgdGhpcy5ob2xkZXJFbC5yZW1vdmVDbGFzcygnb3BlbicpO1xuICAgICAgICB0aGlzLmNhbGVuZGFyRWwgPSB0aGlzLmJvZHlFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtY2FsZW5kYXInIH0pO1xuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2RheXMnIH0pO1xuICAgICAgICB0aGlzLmdyaWRFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZCcgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgdm9pZCB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIGFzeW5jIG9uQ2xvc2UoKSB7XG4gICAgICAgIC8vIENsZWFuIHVwIHJlc2l6ZSBoYW5kbGUgbGlzdGVuZXJzXG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApO1xuICAgICAgICB9XG4gICAgICAgIC8vIERpc2Nvbm5lY3QgbG9uZyBldmVudCBSZXNpemVPYnNlcnZlciBhbmQgcmVtb3ZlIG92ZXJsYXkgdG8gcHJldmVudCBsZWFrc1xuICAgICAgICBpZiAodGhpcy5fbG9uZ1JPKSB7XG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nUk8uZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIFJlc2l6ZU9ic2VydmVyIGRpc2Nvbm5lY3QgZXJyb3I6JywgZSk7IH1cbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fbG9uZ092ZXJsYXlFbCAmJiB0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nT3ZlcmxheUVsLnJlbW92ZSgpOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIE92ZXJsYXkgcmVtb3ZlIGVycm9yOicsIGUpOyB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbG9uZ0Vscy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIHRyeSB7IGlmIChlbCAmJiBlbC5wYXJlbnRFbGVtZW50KSBlbC5yZW1vdmUoKTsgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBMb25nIGV2ZW50IHJlbW92ZSBlcnJvcjonLCBlKTsgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fbG9uZ0Vscy5jbGVhcigpO1xuICAgICAgICBpZiAodGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGdldFJlcXVpcmVkRmlsZXMoKTogU2V0PHN0cmluZz4ge1xuICAgICAgICBjb25zdCBmaWxlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZERhdGUgPSAoZDogRGF0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtb250aE5hbWVzW2QuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICBmaWxlcy5hZGQoYCR7eX0ke219Lmpzb25gKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBbHdheXMgYWRkIGN1cnJlbnQgZGF0ZSdzIG1vbnRoXG4gICAgICAgIGFkZERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XG5cbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkge1xuICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5O1xuICAgICAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgY29uc3QgdERvdyA9IGJhc2UuZ2V0RGF5KCk7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gKCh0RG93IC0gd2Vla1N0YXJ0KSArIDcpICUgNztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XG4gICAgICAgICAgICBzdGFydC5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpIC0gZGlmZik7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgICAgICBlbmQuc2V0RGF0ZShzdGFydC5nZXREYXRlKCkgKyA2KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYWRkRGF0ZShzdGFydCk7XG4gICAgICAgICAgICBhZGREYXRlKGVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWRBbGxFbnRyaWVzKCkge1xuICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuZ2V0UmVxdWlyZWRGaWxlcygpO1xuICAgICAgICB0aGlzLmV2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLndlZWtseU5vdGVzID0ge307XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKS5zcGxpdCgnLycpLnBvcCgpO1xuXG4gICAgICAgIGxldCBob2xkZXJGcm9tR2xvYmFsOiBEYXlibGVFdmVudFtdIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBob2xkZXJGaWxlID0gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vaG9sZGVyLmpzb25gO1xuICAgICAgICAgICAgY29uc3QgaGpzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoaG9sZGVyRmlsZSk7XG4gICAgICAgICAgICBjb25zdCBoZGF0YSA9IEpTT04ucGFyc2UoaGpzb24pO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaGRhdGE/LmhvbGRlcikpIHtcbiAgICAgICAgICAgICAgICBob2xkZXJGcm9tR2xvYmFsID0gaGRhdGEuaG9sZGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHt9XG5cbiAgICAgICAgY29uc3QgaG9sZGVyQWdncmVnYXRlOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyfS8ke2ZpbGVuYW1lfWA7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbikgYXMgeyBldmVudHM6IERheWJsZUV2ZW50W10sIGhvbGRlcjogRGF5YmxlRXZlbnRbXSwgd2Vla2x5Tm90ZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBsYXN0TW9kaWZpZWQ/OiBzdHJpbmcgfTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5ldmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaCguLi5kYXRhLmV2ZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghaG9sZGVyRnJvbUdsb2JhbCAmJiBBcnJheS5pc0FycmF5KGRhdGEuaG9sZGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBob2xkZXJBZ2dyZWdhdGUucHVzaCguLi5kYXRhLmhvbGRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWxlbmFtZSA9PT0gY3VycmVudEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3RlcyA9IGRhdGEud2Vla2x5Tm90ZXMgfHwge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHNlZW4uaGFzKGUuaWQpO1xuICAgICAgICAgICAgc2Vlbi5hZGQoZS5pZCk7XG4gICAgICAgICAgICByZXR1cm4gIWR1cGxpY2F0ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgZmluYWxpemVIb2xkZXIgPSAobGlzdDogRGF5YmxlRXZlbnRbXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaFNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZHVwOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSBsaXN0W2ldO1xuICAgICAgICAgICAgICAgIGlmICghaCB8fCAhaC5pZCkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKGhTZWVuLmhhcyhoLmlkKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaFNlZW4uYWRkKGguaWQpO1xuICAgICAgICAgICAgICAgIGRlZHVwLnVuc2hpZnQoaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVkdXA7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChob2xkZXJGcm9tR2xvYmFsKSB7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IGZpbmFsaXplSG9sZGVyKGhvbGRlckZyb21HbG9iYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSBmaW5hbGl6ZUhvbGRlcihob2xkZXJBZ2dyZWdhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgc2F2ZUFsbEVudHJpZXMoKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcbiAgICAgICAgaWYgKCFmb2xkZXIpIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7IH1cbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzVG9TYXZlID0gdGhpcy5nZXRSZXF1aXJlZEZpbGVzKCk7XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IGdldEZpbGVuYW1lRm9yRGF0ZSA9IChkYXRlU3RyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICBjb25zdCBkID0gbmV3IERhdGUoZGF0ZVN0cik7XG4gICAgICAgICAgICAgaWYgKGlzTmFOKGQuZ2V0VGltZSgpKSkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgICBjb25zdCBtID0gbW9udGhOYW1lc1tkLmdldE1vbnRoKCldO1xuICAgICAgICAgICAgIHJldHVybiBgJHt5fSR7bX0uanNvbmA7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY3VycmVudEZpbGUgPSB0aGlzLmdldE1vbnRoRGF0YUZpbGVQYXRoKCkuc3BsaXQoJy8nKS5wb3AoKTtcblxuICAgICAgICAvLyBXZSBuZWVkIHRvIHJlYWQgYWxsIGZpbGVzIGZpcnN0IHRvIGVuc3VyZSB3ZSBkb24ndCBsb3NlIGV2ZW50cyB0aGF0IGFyZSBOT1QgaW4gdGhpcy5ldmVudHMgKGUuZy4gb3V0IG9mIHZpZXcgcmFuZ2UpXG4gICAgICAgIC8vIEJ1dCB3YWl0LCBpZiB3ZSBvbmx5IGxvYWRlZCBldmVudHMgZnJvbSBgZmlsZXNUb1NhdmVgLCBhbmQgYHRoaXMuZXZlbnRzYCBjb250YWlucyBtb2RpZmljYXRpb25zLi4uXG4gICAgICAgIC8vIElmIHdlIG1vZGlmeSBhbiBldmVudCwgaXQncyBpbiBgdGhpcy5ldmVudHNgLlxuICAgICAgICAvLyBJZiB3ZSBkZWxldGUgYW4gZXZlbnQsIGl0J3MgcmVtb3ZlZCBmcm9tIGB0aGlzLmV2ZW50c2AuXG4gICAgICAgIC8vIElmIHRoZXJlIGFyZSBldmVudHMgaW4gdGhlIGZpbGVzIHRoYXQgYXJlIE5PVCBpbiBgdGhpcy5ldmVudHNgLCBpdCBpbXBsaWVzIHRoZXkgd2VyZSBub3QgbG9hZGVkLlxuICAgICAgICAvLyBTaW5jZSBgbG9hZEFsbEVudHJpZXNgIGxvYWRzIEVWRVJZVEhJTkcgZnJvbSBgZmlsZXNUb1NhdmVgLCBgdGhpcy5ldmVudHNgIHNob3VsZCBjb3ZlciBBTEwgZXZlbnRzIGluIHRob3NlIGZpbGVzLlxuICAgICAgICAvLyBTbyB3ZSBjYW4gc2FmZWx5IG92ZXJ3cml0ZSBgZmlsZXNUb1NhdmVgLlxuICAgICAgICBcbiAgICAgICAgLy8gUGFydGl0aW9uIGV2ZW50cyBieSB0YXJnZXQgZmlsZW5hbWVcbiAgICAgICAgY29uc3QgZXZlbnRzQnlGaWxlOiBSZWNvcmQ8c3RyaW5nLCBEYXlibGVFdmVudFtdPiA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhcnJheXMgZm9yIGtub3duIGZpbGVzXG4gICAgICAgIGZpbGVzVG9TYXZlLmZvckVhY2goZiA9PiBldmVudHNCeUZpbGVbZl0gPSBbXSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcnBoYW5FdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcblxuICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGxldCB0YXJnZXRGaWxlID0gY3VycmVudEZpbGU7IC8vIERlZmF1bHQgdG8gY3VycmVudCBmaWxlIGlmIG5vIGRhdGVcbiAgICAgICAgICAgIGlmIChldi5kYXRlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0RmlsZSA9IGdldEZpbGVuYW1lRm9yRGF0ZShldi5kYXRlKSB8fCBjdXJyZW50RmlsZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXYuc3RhcnREYXRlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0RmlsZSA9IGdldEZpbGVuYW1lRm9yRGF0ZShldi5zdGFydERhdGUpIHx8IGN1cnJlbnRGaWxlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGFyZ2V0RmlsZSkge1xuICAgICAgICAgICAgICAgIGlmICghZXZlbnRzQnlGaWxlW3RhcmdldEZpbGVdKSBldmVudHNCeUZpbGVbdGFyZ2V0RmlsZV0gPSBbXTtcbiAgICAgICAgICAgICAgICBldmVudHNCeUZpbGVbdGFyZ2V0RmlsZV0ucHVzaChldik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9ycGhhbkV2ZW50cy5wdXNoKGV2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGV2ZW50cyB0aGF0IGJlbG9uZyB0byBmaWxlcyBOT1QgaW4gYGZpbGVzVG9TYXZlYCAoZS5nLiBtb3ZlZCBldmVudCB0byBmYXIgZnV0dXJlKSxcbiAgICAgICAgLy8gd2Ugc2hvdWxkIHByb2JhYmx5IHNhdmUgdGhvc2UgZmlsZXMgdG9vLlxuICAgICAgICAvLyBCdXQgZm9yIG5vdywgbGV0J3MgZm9jdXMgb24gYGZpbGVzVG9TYXZlYCArIGFueSBuZXcgdGFyZ2V0cyBmb3VuZC5cbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgZWFjaCBmaWxlXG4gICAgICAgIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgT2JqZWN0LmtleXMoZXZlbnRzQnlGaWxlKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZUV2ZW50cyA9IGV2ZW50c0J5RmlsZVtmaWxlbmFtZV07XG4gICAgICAgICAgICBjb25zdCBpc0N1cnJlbnQgPSBmaWxlbmFtZSA9PT0gY3VycmVudEZpbGU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBgJHtmb2xkZXJ9LyR7ZmlsZW5hbWV9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byBwcmVzZXJ2ZSBob2xkZXIvd2Vla2x5Tm90ZXMgaWYgd2UgYXJlIE5PVCB0aGUgY3VycmVudCBmaWxlXG4gICAgICAgICAgICAvLyBCdXQgd2FpdCwgYGxvYWRBbGxFbnRyaWVzYCBvbmx5IGxvYWRlZCBob2xkZXIgZnJvbSBgY3VycmVudEZpbGVgLlxuICAgICAgICAgICAgLy8gU28gZm9yIG90aGVyIGZpbGVzLCB3ZSBkb24ndCBrbm93IHRoZWlyIGhvbGRlciBjb250ZW50IVxuICAgICAgICAgICAgLy8gV2UgTVVTVCByZWFkIHRoZW0gdG8gcHJlc2VydmUgaG9sZGVyL25vdGVzLlxuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgaG9sZGVyVG9TYXZlOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICBsZXQgbm90ZXNUb1NhdmU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gV3JpdGUgdGhlIHNhbWUgaG9sZGVyIGxpc3QgdG8gYWxsIGZpbGVzIHRvIGtlZXAgaXQgZ2xvYmFsXG4gICAgICAgICAgICBob2xkZXJUb1NhdmUgPSB0aGlzLmhvbGRlckV2ZW50cztcbiAgICAgICAgICAgIC8vIFdlZWtseSBub3RlcyBhcmUgcGVyLWZpbGU7IHByZXNlcnZlIGV4aXN0aW5nIG5vdGVzIGZvciBub24tY3VycmVudCBmaWxlc1xuICAgICAgICAgICAgaWYgKGlzQ3VycmVudCkge1xuICAgICAgICAgICAgICAgIG5vdGVzVG9TYXZlID0gdGhpcy53ZWVrbHlOb3RlcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKGZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3Rlc1RvU2F2ZSA9IGRhdGEud2Vla2x5Tm90ZXMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7fVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGV2ZW50czogZmlsZUV2ZW50cyxcbiAgICAgICAgICAgICAgICBob2xkZXI6IGhvbGRlclRvU2F2ZSxcbiAgICAgICAgICAgICAgICB3ZWVrbHlOb3Rlczogbm90ZXNUb1NhdmUsXG4gICAgICAgICAgICAgICAgbGFzdE1vZGlmaWVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoZmlsZSwganNvblN0cik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZV0gRmFpbGVkIHRvIHNhdmUnLCBmaWxlbmFtZSwgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBob2xkZXJGaWxlID0gYCR7Zm9sZGVyfS9ob2xkZXIuanNvbmA7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBoZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBob2xkZXI6IHRoaXMuaG9sZGVyRXZlbnRzLFxuICAgICAgICAgICAgICAgIGxhc3RNb2RpZmllZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgaGpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShoZGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKGhvbGRlckZpbGUsIGhqc29uU3RyKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZV0gRmFpbGVkIHRvIHNhdmUgaG9sZGVyLmpzb24nLCBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvY3VzVG9kYXkoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB2b2lkIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHsgdm9pZCB0aGlzLnJlbmRlcigpOyB9KTtcbiAgICB9XG5cbiAgICBzaGlmdE1vbnRoKGRlbHRhOiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXREYXRlKHRoaXMuY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgKGRlbHRhICogNykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgZC5zZXRNb250aChkLmdldE1vbnRoKCkgKyBkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gZDtcbiAgICAgICAgfVxuICAgICAgICB2b2lkIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHsgdm9pZCB0aGlzLnJlbmRlcigpOyB9KTtcbiAgICB9XG5cbiAgICBhc3luYyByZW5kZXIodGl0bGVFbD86IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLndlZWtseU5vdGVzRWwpIHtcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXNldCBncmlkIHN0eWxlIGlzIGhhbmRsZWQgYnkgQ1NTIGNsYXNzZXMgYW5kIGlubGluZSBlbGVtZW50c1xuXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFkZENsYXNzKCdkYXlibGUtd2Vlay1tb2RlJyk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcldlZWtWaWV3KHRpdGxlRWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ncmlkRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS13ZWVrLW1vZGUnKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyTW9udGhWaWV3KHRpdGxlRWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcmVuZGVyV2Vla1ZpZXcodGl0bGVFbD86IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG1vbnRoTGFiZWwgPSB0aGlzLmN1cnJlbnREYXRlLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xuICAgICAgICBpZiAodGhpcy5tb250aFRpdGxlRWwpIHRoaXMubW9udGhUaXRsZUVsLnNldFRleHQobW9udGhMYWJlbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgd2VlayB0b2dnbGUgYnV0dG9uIGFjdGl2ZSBzdGF0ZVxuICAgICAgICBpZiAodGhpcy53ZWVrVG9nZ2xlQnRuKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB0aGlzLndlZWtUb2dnbGVCdG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLndlZWtUb2dnbGVCdG4ucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5ncmlkRWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy53ZWVrSGVhZGVyRWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdlZWtTdGFydCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheTtcbiAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcbiAgICAgICAgY29uc3QgZGlmZiA9ICgodERvdyAtIHdlZWtTdGFydCkgKyA3KSAlIDc7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XG4gICAgICAgIHN0YXJ0LnNldERhdGUoYmFzZS5nZXREYXRlKCkgLSBkaWZmKTsgLy8gU3RhcnQgb2YgdGhlIHdlZWtcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgY29uc3QgaGVhZGVyID0gdGhpcy53ZWVrSGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWdyaWQtaGVhZGVyJyB9KTtcbiAgICAgICAgY29uc3QgZGF5cyA9IFsnc3VuJywnbW9uJywndHVlJywnd2VkJywndGh1JywnZnJpJywnc2F0J107XG4gICAgICAgIGNvbnN0IG9yZGVyZWQgPSBkYXlzLnNsaWNlKHdlZWtTdGFydCkuY29uY2F0KGRheXMuc2xpY2UoMCwgd2Vla1N0YXJ0KSk7XG4gICAgICAgIG9yZGVyZWQuZm9yRWFjaChkID0+IGhlYWRlci5jcmVhdGVEaXYoeyB0ZXh0OiBkLCBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXItY2VsbCcgfSkpO1xuXG4gICAgICAgIC8vIFByZS1jYWxjdWxhdGUgbG9uZyBldmVudCBtYXJnaW5zIChyZXVzZWQgZnJvbSBtb250aCB2aWV3IGxvZ2ljKVxuICAgICAgICBjb25zdCBzZWdtZW50SGVpZ2h0ID0gMjg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRHYXAgPSA0OyAvLyBnYXBweVxuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgICAgY29uc3QgbG9uZ0V2ZW50c1ByZXNldCA9IHRoaXMuZXZlbnRzLmZpbHRlcihldiA9PiBldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpO1xuICAgICAgICBsb25nRXZlbnRzUHJlc2V0LmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUpO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSk7XG4gICAgICAgICAgICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgMSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB5eSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3l5fS0ke21tfS0ke2RkfWA7XG4gICAgICAgICAgICAgICAgY291bnRzQnlEYXRlW2tleV0gPSAoY291bnRzQnlEYXRlW2tleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBHcmlkXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgICAgICBkLnNldERhdGUoc3RhcnQuZ2V0RGF0ZSgpICsgaSk7XG4gICAgICAgICAgICBjb25zdCB5eSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBkZCA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxEYXRlID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY2VsbCA9IGZyYWdtZW50LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXknIH0pO1xuICAgICAgICAgICAgY2VsbC5zZXRBdHRyKCdkYXRhLWRhdGUnLCBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRheUhlYWRlciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheS1oZWFkZXInIH0pO1xuICAgICAgICAgICAgZGF5SGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktbnVtYmVyJywgdGV4dDogU3RyaW5nKGQuZ2V0RGF0ZSgpKSB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZC5nZXREYXRlKCkgPT09IHQuZ2V0RGF0ZSgpICYmIGQuZ2V0TW9udGgoKSA9PT0gdC5nZXRNb250aCgpICYmIGQuZ2V0RnVsbFllYXIoKSA9PT0gdC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNUb2RheSkge1xuICAgICAgICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoJ2RheWJsZS1jdXJyZW50LWRheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaEJ0biA9IGRheUhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtZGF5LXNlYXJjaC1idG4nIH0pO1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5hZGRDbGFzcygnZGItZGF5LXNlYXJjaC1idG4nKTtcbiAgICAgICAgICAgICAgICBzZXRJY29uKHNlYXJjaEJ0biwgJ2ZvY3VzJyk7XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9uY2xpY2sgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3BlblRvZGF5TW9kYWwoZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4ub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbG9uZ0NvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctY29udGFpbmVyJyB9KTtcbiAgICAgICAgICAgIGxvbmdDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWxvbmctY29udGFpbmVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IG1hcmdpbnMgZm9yIGxvbmcgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBwcmVDb3VudCA9IGNvdW50c0J5RGF0ZVtmdWxsRGF0ZV0gfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHByZU10ID0gcHJlQ291bnQgPiAwID8gKHByZUNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgcHJlQ291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XG4gICAgICAgICAgICBjb25zdCBhZGp1c3RlZCA9IE1hdGgubWF4KDAsIHByZU10IC0gNik7XG4gICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gYWRqdXN0ZWQgPyBgJHthZGp1c3RlZH1weGAgOiAnJztcblxuICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5kYXRlID09PSBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChlID0+IGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmNyZWF0ZUV2ZW50SXRlbShlKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEcmFnIGFuZCBEcm9wIChyZXVzZWQgb3B0aW1pemVkIGxvZ2ljIGZyb20gbW9udGggdmlldylcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHsgXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRDb3VudCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRFdmVudCAmJiB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50ID09PSBjb250YWluZXIgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdhYm92ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0RXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdiZWxvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCA9PT0gY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGlmICghaWQgfHwgZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKSAhPT0gJ2NhbGVuZGFyJykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldEV2ZW50IHx8IHRhcmdldEV2ZW50ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IHJlY3QuaGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGRyYWdnZWRFbCwgdGFyZ2V0RXZlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlb3JkZXIgbG9naWNcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxFdmVudEVscyA9IEFycmF5LmZyb20oY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3T3JkZXIgPSBhbGxFdmVudEVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmlkKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGF5RGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRheUV2ZW50SW5kaWNlczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSBkYXlFdmVudEluZGljZXMucHVzaChpZHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SWRUb0luZGV4ID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICAgICAgICAgICAgICBuZXdPcmRlci5mb3JFYWNoKChldmVudElkLCBpZHgpID0+IGV2ZW50SWRUb0luZGV4LnNldChldmVudElkLCBpZHgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkYXlFdmVudEluZGljZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZEEgPSB0aGlzLmV2ZW50c1thXS5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRCID0gdGhpcy5ldmVudHNbYl0uaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQSA9IGV2ZW50SWRUb0luZGV4LmdldChpZEEpID8/IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQikgPz8gOTk5O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXJBIC0gb3JkZXJCO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHJlb3JkZXJlZEV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgICAgIGxldCBkYXlFdmVudElkeCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVvcmRlcmVkRXZlbnRzLnB1c2godGhpcy5ldmVudHNbZGF5RXZlbnRJbmRpY2VzW2RheUV2ZW50SWR4XV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJZHgrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gcmVvcmRlcmVkRXZlbnRzO1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRHJvcCBvbiBjZWxsIChtb3ZlIGZyb20gaG9sZGVyIG9yIG90aGVyIGRheSlcbiAgICAgICAgICAgIGNlbGwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICAgICAgY2VsbC5vbmRyYWdsZWF2ZSA9ICgpID0+IHsgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xuICAgICAgICAgICAgY2VsbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdob2xkZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhJZHggPSB0aGlzLmhvbGRlckV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhJZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldm4gPSB0aGlzLmhvbGRlckV2ZW50cy5zcGxpY2UoaElkeCwgMSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBldm4uZGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldm4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3JjID09PSAnY2FsZW5kYXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZyb20gYW5vdGhlciBkYXlcbiAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuZXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzW2lkeF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgbW92aW5nIHRvIHNhbWUgZGF5IChhbHJlYWR5IGhhbmRsZWQgYnkgY29udGFpbmVyLm9uZHJvcClcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSAhPT0gZnVsbERhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuZGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gSW50ZXJhY3Rpb25zXG4gICAgICAgICAgICBjZWxsLm9uY2xpY2sgPSAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpICYmIHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpID09PSBjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuRXZlbnRNb2RhbCh1bmRlZmluZWQsIGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjZWxsLm9ubW91c2Vkb3duID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKChldikuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2VsbC5vbm1vdXNlb3ZlciA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB0aGlzLnVwZGF0ZVNlbGVjdGlvbihmdWxsRGF0ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjZWxsLm9udG91Y2hzdGFydCA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub250b3VjaG1vdmUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVuZGVyIGxvbmcgZXZlbnRzXG4gICAgICAgIC8vIFByZXBhcmUgb3ZlcmxheSBmb3IgbG9uZyBldmVudHM7IGhpZGUgaXQgdW50aWwgcG9zaXRpb25zIGFyZSBjb21wdXRlZFxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFwcGVuZENoaWxkKHRoaXMuX2xvbmdPdmVybGF5RWwpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5yZW5kZXJMb25nRXZlbnRzKCkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLl9sb25nUk8gJiYgKHdpbmRvdyBhcyBhbnkpLlJlc2l6ZU9ic2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLl9sb25nUk8gPSBuZXcgKHdpbmRvdyBhcyBhbnkpLlJlc2l6ZU9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckxvbmdFdmVudHMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xvbmdSTyAmJiB0aGlzLmdyaWRFbCkgdGhpcy5fbG9uZ1JPLm9ic2VydmUodGhpcy5ncmlkRWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2Vla2x5IE5vdGVzXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQpIHtcbiAgICAgICAgICAgIC8vIEFkanVzdCBncmlkIHRvIGFsbG93IHNocmlua2luZyBhbmQgbGV0IG5vdGVzIHRha2Ugc3BhY2VcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFkZENsYXNzKCdkYXlibGUtZ3JpZC1lbCcpO1xuXG4gICAgICAgICAgICBjb25zdCBiYXNlID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XG4gICAgICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSAoKHREb3cgLSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrU3RhcnREYXkpICsgNykgJSA3O1xuICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0RGF0ZSA9IG5ldyBEYXRlKGJhc2UpO1xuICAgICAgICAgICAgd2Vla1N0YXJ0RGF0ZS5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpIC0gZGlmZik7XG4gICAgICAgICAgICBjb25zdCB3ZWVrS2V5ID0gd2Vla1N0YXJ0RGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LW5vdGVzJyB9KTtcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5hZGRDbGFzcygnZGF5YmxlLXdlZWtseS1ub3Rlcy1jb250YWluZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRHJhZyBIYW5kbGVcbiAgICAgICAgICAgIGNvbnN0IGRyYWdIYW5kbGUgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1kcmFnLWhhbmRsZScgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmUgPSAobWU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzIHx8ICF0aGlzLndlZWtseU5vdGVzRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBkeSA9IG1lLmNsaWVudFkgLSB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRZO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0ggPSBNYXRoLm1heCgxMDAsIHRoaXMud2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCAtIGR5KTtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUuc2V0UHJvcGVydHkoJ2hlaWdodCcsIGAke25ld0h9cHhgLCAnaW1wb3J0YW50Jyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMud2Vla2x5Tm90ZXNFbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0hlaWdodCA9IHRoaXMud2Vla2x5Tm90ZXNFbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkcmFnSGFuZGxlLm9ubW91c2Vkb3duID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMud2Vla2x5Tm90ZXNFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ1dlZWtseU5vdGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRZID0gZS5jbGllbnRZO1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNSZXNpemVTdGFydEhlaWdodCA9IHRoaXMud2Vla2x5Tm90ZXNFbC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSBhcyBFdmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXAgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IHRoaXMud2Vla2x5Tm90ZXNFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LW5vdGVzLWhlYWRlcicgfSk7XG4gICAgICAgICAgICBoZWFkZXIuYWRkQ2xhc3MoJ2RheWJsZS13ZWVrbHktbm90ZXMtaGVhZGVyLXJvdycpO1xuICAgICAgICAgICAgY29uc3QgaDQgPSBoZWFkZXIuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnV2Vla2x5IG5vdGVzJyB9KTtcbiAgICAgICAgICAgIGg0LmFkZENsYXNzKCdkYXlibGUtd2Vla2x5LW5vdGVzLXRpdGxlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnRlbnQgYXJlYSB3aXRoIHRleHRhcmVhIG9ubHlcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy1jb250ZW50JyB9KTtcblxuICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgdGV4dFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLndlZWtseU5vdGVzW3dlZWtLZXldIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGV4dGFyZWEgZm9yIGVkaXRpbmdcbiAgICAgICAgICAgIGNvbnN0IHRleHRhcmVhRWwgPSBjb250ZW50Q29udGFpbmVyLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy10ZXh0YXJlYScgfSk7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnZhbHVlID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8taGVpZ2h0IGZ1bmN0aW9uIC0gZ3Jvd3Mgd2l0aCBjb250ZW50IHVwIHRvIDUwMHB4IG1heFxuICAgICAgICAgICAgY29uc3QgdXBkYXRlVGV4dGFyZWFIZWlnaHQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5zZXRQcm9wZXJ0eSgnaGVpZ2h0JywgJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLnNldFByb3BlcnR5KCdoZWlnaHQnLCBgJHt0ZXh0YXJlYUVsLnNjcm9sbEhlaWdodH1weGApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHRcbiAgICAgICAgICAgIHNldFRpbWVvdXQodXBkYXRlVGV4dGFyZWFIZWlnaHQsIDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgb24gaW5wdXRcbiAgICAgICAgICAgIHRleHRhcmVhRWwuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc1t3ZWVrS2V5XSA9IHRleHRhcmVhRWwudmFsdWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlVGV4dGFyZWFIZWlnaHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZFNhdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgdGFiIGtleVxuICAgICAgICAgICAgdGV4dGFyZWFFbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdUYWInKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dGFyZWEgPSBlLnRhcmdldCBhcyBIVE1MVGV4dEFyZWFFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IHRleHRhcmVhLnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICAgICAgICAgIHRleHRhcmVhLnZhbHVlID0gdGV4dGFyZWEudmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArICdcXHQnICsgdGV4dGFyZWEudmFsdWUuc3Vic3RyaW5nKGVuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRleHRhcmVhLnNlbGVjdGlvblN0YXJ0ID0gdGV4dGFyZWEuc2VsZWN0aW9uRW5kID0gc3RhcnQgKyAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbmRlck1vbnRoVmlldyh0aXRsZUVsPzogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeSA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgbSA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgY29uc3QgbW9udGhMYWJlbCA9IG5ldyBEYXRlKHksIG0pLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xuICAgICAgICBpZiAodGhpcy5tb250aFRpdGxlRWwpIHRoaXMubW9udGhUaXRsZUVsLnNldFRleHQobW9udGhMYWJlbCk7XG4gICAgICAgIHRoaXMuZ3JpZEVsLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IHdlZWtTdGFydCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheTtcbiAgICAgICAgY29uc3QgZmlyc3REYXkgPSBuZXcgRGF0ZSh5LCBtLCAxKS5nZXREYXkoKTtcbiAgICAgICAgY29uc3QgZGF5c0luTW9udGggPSBuZXcgRGF0ZSh5LCBtICsgMSwgMCkuZ2V0RGF0ZSgpO1xuICAgICAgICBjb25zdCBsZWFkaW5nID0gKGZpcnN0RGF5IC0gd2Vla1N0YXJ0ICsgNykgJSA3O1xuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb25zdCBoZWFkZXIgPSB0aGlzLndlZWtIZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXInIH0pO1xuICAgICAgICBjb25zdCBkYXlzID0gWydzdW4nLCdtb24nLCd0dWUnLCd3ZWQnLCd0aHUnLCdmcmknLCdzYXQnXTtcbiAgICAgICAgY29uc3Qgb3JkZXJlZCA9IGRheXMuc2xpY2Uod2Vla1N0YXJ0KS5jb25jYXQoZGF5cy5zbGljZSgwLCB3ZWVrU3RhcnQpKTtcbiAgICAgICAgb3JkZXJlZC5mb3JFYWNoKGQgPT4gaGVhZGVyLmNyZWF0ZURpdih7IHRleHQ6IGQsIGNsczogJ2RheWJsZS1ncmlkLWhlYWRlci1jZWxsJyB9KSk7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcbiAgICAgICAgY29uc3Qgc2VnbWVudEdhcCA9IDQ7IC8vIGdhcHB5XG4gICAgICAgIGNvbnN0IGNvdW50c0J5RGF0ZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgICAgICBjb25zdCBsb25nRXZlbnRzUHJlc2V0ID0gdGhpcy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSk7XG4gICAgICAgIGxvbmdFdmVudHNQcmVzZXQuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcbiAgICAgICAgICAgICAgICBjb3VudHNCeURhdGVba2V5XSA9IChjb3VudHNCeURhdGVba2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlYWRpbmc7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXkgZGF5YmxlLWluYWN0aXZlJyB9KTtcbiAgICAgICAgICAgIGMuc2V0QXR0cignZGF0YS1lbXB0eScsICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgZGF5ID0gMTsgZGF5IDw9IGRheXNJbk1vbnRoOyBkYXkrKykge1xuICAgICAgICAgICAgY29uc3QgZnVsbERhdGUgPSBgJHt5fS0ke1N0cmluZyhtICsgMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xuICAgICAgICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXknIH0pO1xuICAgICAgICAgICAgY2VsbC5zZXRBdHRyKCdkYXRhLWRhdGUnLCBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcbiAgICAgICAgICAgIGRheUhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LW51bWJlcicsIHRleHQ6IFN0cmluZyhkYXkpIH0pO1xuICAgICAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF5ID09PSB0LmdldERhdGUoKSAmJiBtID09PSB0LmdldE1vbnRoKCkgJiYgeSA9PT0gdC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCdkYXlibGUtY3VycmVudC1kYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihzZWFyY2hCdG4sICdmb2N1cycpO1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsb25nQ29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1jb250YWluZXInIH0pO1xuICAgICAgICAgICAgbG9uZ0NvbnRhaW5lci5hZGRDbGFzcygnZGItbG9uZy1jb250YWluZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicgfSk7XG4gICAgICAgICAgICBjb25zdCBwcmVDb3VudCA9IGNvdW50c0J5RGF0ZVtmdWxsRGF0ZV0gfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHByZU10ID0gcHJlQ291bnQgPiAwID8gKHByZUNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgcHJlQ291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XG4gICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gcHJlTXQgPyBgJHtwcmVNdH1weGAgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5kYXRlID09PSBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChlID0+IGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmNyZWF0ZUV2ZW50SXRlbShlKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyByZW9yZGVyaW5nIGV2ZW50cyB3aXRoaW4gdGhlIGNvbnRhaW5lclxuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkcm9wIHBvc2l0aW9uIGluZGljYXRvciBvbmx5IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBldmVudHNcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gY29udGFpbmVyICYmIGV2ZW50Q291bnQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgdmVydGljYWwgcG9zaXRpb24gd2l0aGluIHRoZSB0YXJnZXQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgZXhpc3RpbmcgZHJvcCBpbmRpY2F0b3JzXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaW5kaWNhdG9yIGFib3ZlIG9yIGJlbG93IGJhc2VkIG9uIG1vdXNlIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEcm9wIGFib3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuYWRkQ2xhc3MoJ2Fib3ZlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEcm9wIGJlbG93XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuYWRkQ2xhc3MoJ2JlbG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5hZnRlcihpbmRpY2F0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIC8vIE9ubHkgcmVtb3ZlIGluZGljYXRvcnMgaWYgd2UncmUgdHJ1bHkgbGVhdmluZyB0aGUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkcm9wIGluZGljYXRvclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdjYWxlbmRhcicpIHJldHVybjsgLy8gT25seSByZW9yZGVyIGNhbGVuZGFyIGV2ZW50cywgbm90IGZyb20gaG9sZGVyXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgZXZlbnQgYmVpbmcgZHJhZ2dlZCBieSBJRFxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyYWdnZWQgZXZlbnQgaXMgZnJvbSB0aGlzIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRmluZCB0YXJnZXQgZXZlbnQgdG8gaW5zZXJ0IGJlZm9yZS9hZnRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgYmVmb3JlXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5zZXJ0IGFmdGVyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdW5kZXJseWluZyBldmVudHMgYXJyYXkgdG8gbWF0Y2ggdGhlIG5ldyBET00gb3JkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxFdmVudEVscyA9IEFycmF5LmZyb20oY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3T3JkZXIgPSBhbGxFdmVudEVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmlkKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVidWlsZCBldmVudHMgYXJyYXkgZm9yIHRoaXMgZGF0ZSB0byBtYXRjaCBuZXcgb3JkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlEYXRlID0gZnVsbERhdGU7IC8vIGZ1bGxEYXRlIGZyb20gb3V0ZXIgc2NvcGVcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNvcnQgdGhlIGluZGljZXMgYmFzZWQgb24gbmV3IG9yZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRJZFRvSW5kZXggPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgICAgICAgICAgICAgIG5ld09yZGVyLmZvckVhY2goKGV2ZW50SWQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkYXlFdmVudEluZGljZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZEEgPSB0aGlzLmV2ZW50c1thXS5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRCID0gdGhpcy5ldmVudHNbYl0uaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQSA9IGV2ZW50SWRUb0luZGV4LmdldChpZEEpID8/IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQikgPz8gOTk5O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXJBIC0gb3JkZXJCO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlY29uc3RydWN0IGV2ZW50cyBhcnJheSB3aXRoIHJlb3JkZXJlZCBkYXkgZXZlbnRzXG4gICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGRheUV2ZW50SWR4ID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaCh0aGlzLmV2ZW50c1tkYXlFdmVudEluZGljZXNbZGF5RXZlbnRJZHhdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudElkeCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVvcmRlcmVkRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSByZW9yZGVyZWRFdmVudHM7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgdXBkYXRlZCBvcmRlclxuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2VsbC5vbmNsaWNrID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgb3BlbiBtb2RhbCBpZiBjbGlja2luZyBvbiB0aGUgY2VsbCBpdHNlbGYgb3IgY29udGFpbmVyLCBub3Qgb24gYW4gZXZlbnRcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgJiYgdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9ubW91c2Vkb3duID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKChldikuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBjbGlja2luZyBvbiBhbiBldmVudFxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc3RhcnQgc2VsZWN0aW9uIGlmIGFscmVhZHkgZHJhZ2dpbmdcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydFNlbGVjdGlvbihmdWxsRGF0ZSwgY2VsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2VsbC5vbm1vdXNlb3ZlciA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB0aGlzLnVwZGF0ZVNlbGVjdGlvbihmdWxsRGF0ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2VsbC5vbnRvdWNoc3RhcnQgPSAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc3RhcnQgc2VsZWN0aW9uIGlmIHRvdWNoaW5nIGFuIGV2ZW50XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzdGFydCBzZWxlY3Rpb24gaWYgYWxyZWFkeSBkcmFnZ2luZ1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9udG91Y2htb3ZlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjZWxsLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGNlbGwuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcbiAgICAgICAgICAgIGNlbGwub25kcmFnbGVhdmUgPSAoKSA9PiB7IGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcbiAgICAgICAgICAgIGNlbGwub25kcm9wID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xuICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnaG9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhJZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZuID0gdGhpcy5ob2xkZXJFdmVudHMuc3BsaWNlKGhJZHgsIDEpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldm4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLmV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXYgPSB0aGlzLmV2ZW50c1tpZHhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3BhbiA9IE1hdGguZmxvb3IoKG5ldyBEYXRlKGV2LmVuZERhdGUpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSkuZ2V0VGltZSgpKSAvIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5zID0gbmV3IERhdGUoZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZSA9IG5ldyBEYXRlKG5zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmUuc2V0RGF0ZShucy5nZXREYXRlKCkgKyBzcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuZW5kRGF0ZSA9IGAke25lLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKG5lLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhuZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXYuZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRmFpbGVkIHRvIHNhdmUgZXZlbnQgY2hhbmdlcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gRGVmZXIgbG9uZyBldmVudCBwb3NpdGlvbmluZyB1bnRpbCBsYXlvdXQgc2V0dGxlc1xuICAgICAgICAvLyBQcmVwYXJlIG92ZXJsYXkgZm9yIGxvbmcgZXZlbnRzOyBoaWRlIGl0IHVudGlsIHBvc2l0aW9ucyBhcmUgY29tcHV0ZWRcbiAgICAgICAgaWYgKCF0aGlzLl9sb25nT3ZlcmxheUVsIHx8ICF0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZCh0aGlzLl9sb25nT3ZlcmxheUVsKTtcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5yZW5kZXJMb25nRXZlbnRzKCkpO1xuICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xuICAgICAgICBpZiAoIXRoaXMuX2xvbmdSTyAmJiAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIC8vIE9ic2VydmUgZ3JpZCBzaXplIGNoYW5nZXMgdG8ga2VlcCBsb25nIHNwYW5zIGFsaWduZWRcbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IG5ldyAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbG9uZ1JPICYmIHRoaXMuZ3JpZEVsKSB0aGlzLl9sb25nUk8ub2JzZXJ2ZSh0aGlzLmdyaWRFbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydFNlbGVjdGlvbihkYXRlOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCkge1xuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydERhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGlvblJhbmdlKCk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9lbmRTZWxPbmNlKTtcbiAgICB9XG4gICAgX2VuZFNlbE9uY2UgPSAoKSA9PiB7IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9lbmRTZWxPbmNlKTsgdGhpcy5lbmRTZWxlY3Rpb24oKTsgfTtcbiAgICB1cGRhdGVTZWxlY3Rpb24oZGF0ZTogc3RyaW5nKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZyB8fCB0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmREYXRlID0gZGF0ZTtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpO1xuICAgIH1cbiAgICBlbmRTZWxlY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZykgcmV0dXJuO1xuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZSAmJiB0aGlzLnNlbGVjdGlvbkVuZERhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IGUgPSB0aGlzLnNlbGVjdGlvbkVuZERhdGU7XG4gICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsRm9yUmFuZ2UocywgZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgIH1cbiAgICBoaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpIHtcbiAgICAgICAgY29uc3QgcyA9IG5ldyBEYXRlKHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlICsgJ1QwMDowMDowMCcpO1xuICAgICAgICBjb25zdCBlID0gbmV3IERhdGUodGhpcy5zZWxlY3Rpb25FbmREYXRlICsgJ1QwMDowMDowMCcpO1xuICAgICAgICBjb25zdCBbbWluLCBtYXhdID0gcyA8PSBlID8gW3MsIGVdIDogW2UsIHNdO1xuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgIGNlbGxzLmZvckVhY2goYyA9PiB7XG4gICAgICAgICAgICBjLnJlbW92ZUNsYXNzKCdkYXlibGUtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBjLmdldEF0dHIoJ2RhdGEtZGF0ZScpO1xuICAgICAgICAgICAgaWYgKCFkKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBkdCA9IG5ldyBEYXRlKGQgKyAnVDAwOjAwOjAwJyk7XG4gICAgICAgICAgICAvLyBJbmNsdWRlIGJvdGggc3RhcnQgYW5kIGVuZCBkYXRlcyAodXNlID49IGFuZCA8PSBmb3IgaW5jbHVzaXZlIHJhbmdlKVxuICAgICAgICAgICAgaWYgKGR0ID49IG1pbiAmJiBkdCA8PSBtYXgpIHtcbiAgICAgICAgICAgICAgICBjLmFkZENsYXNzKCdkYXlibGUtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNsZWFyU2VsZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgIGNlbGxzLmZvckVhY2goYyA9PiBjLnJlbW92ZUNsYXNzKCdkYXlibGUtc2VsZWN0ZWQnKSk7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlID0gbnVsbDtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmREYXRlID0gbnVsbDtcbiAgICB9XG5cbiAgICBhc3luYyBvcGVuRXZlbnRNb2RhbEZvclJhbmdlKHN0YXJ0OiBzdHJpbmcsIGVuZDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcbiAgICAgICAgaWYgKCFmb2xkZXIpIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7IH1cbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBFdmVudE1vZGFsKHRoaXMuYXBwLCB1bmRlZmluZWQsIHN0YXJ0LCBlbmQsIGFzeW5jIHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBldjogRGF5YmxlRXZlbnQgPSB7IGlkOiByYW5kb21JZCgpLCAuLi5yZXN1bHQgfSBhcyBEYXlibGVFdmVudDtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgdm9pZCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIH0sIGFzeW5jICgpID0+IHsgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKCk7IH0sIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBpY2tlciA9IG5ldyBJY29uUGlja2VyTW9kYWwodGhpcy5hcHAsIGljb24gPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oaWNvbik7XG4gICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWwuc2V0SWNvbignJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZvaWQgcGlja2VyLm9wZW4oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLmNhdGVnb3JpZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLnBsdWdpbiA9IHRoaXMucGx1Z2luO1xuICAgICAgICB2b2lkIG1vZGFsLm9wZW4oKTtcbiAgICB9XG5cbiAgICByZW5kZXJMb25nRXZlbnRzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pLmZpbHRlcihlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmhhc0NsYXNzPy4oJ2RheWJsZS1kYXknKSkgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY29uc3QgdG9kYXlOdW0gPSAoZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gZWwucXVlcnlTZWxlY3RvcignLmRheWJsZS1kYXktbnVtYmVyJyk7XG4gICAgICAgICAgICByZXR1cm4gbiA/IG4uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKG4pLm1hcmdpbkJvdHRvbSB8fCAnMCcpIDogMjQ7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcbiAgICAgICAgY29uc3Qgc2VnbWVudEdhcCA9IDQ7XG4gICAgICAgIC8vIGdldENlbGxXaWR0aCByZW1vdmVkIGFzIHVudXNlZFxuICAgICAgICBjb25zdCBjb3VudHNCeURhdGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgICAgY29uc3QgbG9uZ0V2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihldiA9PiBldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpO1xuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUpO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSk7XG4gICAgICAgICAgICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpICsgMSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZCA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHt5fS0ke219LSR7ZGR9YDtcbiAgICAgICAgICAgICAgICBjb3VudHNCeURhdGVba2V5XSA9IChjb3VudHNCeURhdGVba2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCByZXF1aXJlZEtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgbG9uZ0V2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0SWR4ID0gY2VsbHMuZmluZEluZGV4KGMgPT4gYy5nZXRBdHRyKCdkYXRhLWRhdGUnKSA9PT0gZXYuc3RhcnREYXRlKTtcbiAgICAgICAgICAgIGlmIChzdGFydElkeCA9PT0gLTEpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoZXYuc3RhcnREYXRlKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUpO1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmxhcCA9IGxvbmdFdmVudHNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGUgPT4gZS5zdGFydERhdGUgJiYgZS5lbmREYXRlICYmIGUuc3RhcnREYXRlICE9PSBlLmVuZERhdGUgJiYgbmV3IERhdGUoZS5zdGFydERhdGUpIDw9IHN0YXJ0ICYmIG5ldyBEYXRlKGUuZW5kRGF0ZSkgPj0gc3RhcnQpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZCA9IChuZXcgRGF0ZShhLmVuZERhdGUpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGEuc3RhcnREYXRlKS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZCA9IChuZXcgRGF0ZShiLmVuZERhdGUpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGIuc3RhcnREYXRlKS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWQgIT09IGJkKSByZXR1cm4gYmQgLSBhZDsgLy8gbG9uZ2VyIGZpcnN0IChvbiB0b3ApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmlkLmxvY2FsZUNvbXBhcmUoYi5pZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGFja0luZGV4ID0gb3ZlcmxhcC5maW5kSW5kZXgoZSA9PiBlLmlkID09PSBldi5pZCk7XG4gICAgICAgICAgICBjb25zdCBzcGFuID0gTWF0aC5mbG9vcigoZW5kLmdldFRpbWUoKSAtIHN0YXJ0LmdldFRpbWUoKSkvODY0MDAwMDApICsgMTtcbiAgICAgICAgICAgIGNvbnN0IGNlbGxzUGVyUm93ID0gNztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0Um93ID0gTWF0aC5mbG9vcihzdGFydElkeCAvIGNlbGxzUGVyUm93KTtcbiAgICAgICAgICAgIGNvbnN0IGVuZElkeCA9IHN0YXJ0SWR4ICsgc3BhbiAtIDE7XG4gICAgICAgICAgICBjb25zdCBlbmRSb3cgPSBNYXRoLmZsb29yKGVuZElkeCAvIGNlbGxzUGVyUm93KTtcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2lnID0gYCR7ZXYuY2F0ZWdvcnlJZCB8fCAnJ318JHtldi5jb2xvciB8fCAnJ318JHtldi50ZXh0Q29sb3IgfHwgJyd9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGh9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXN9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5fWA7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50U2lnID0gYCR7ZXYudGl0bGUgfHwgJyd9fCR7ZXYuZGVzY3JpcHRpb24gfHwgJyd9fCR7ZXYuaWNvbiB8fCAnJ318JHtldi50aW1lIHx8ICcnfWA7XG4gICAgICAgICAgICBpZiAoc3RhcnRSb3cgPT09IGVuZFJvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbc3RhcnRJZHhdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3QgPSBjZWxsc1tlbmRJZHhdO1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3QgfHwgIWxhc3QpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBmckxlZnQgPSAoZmlyc3QpLm9mZnNldExlZnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJUb3AgPSAoZmlyc3QpLm9mZnNldFRvcDtcbiAgICAgICAgICAgICAgICBjb25zdCBsclJpZ2h0ID0gKGxhc3QpLm9mZnNldExlZnQgKyAobGFzdCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wT2Zmc2V0ID0gdG9kYXlOdW0oZmlyc3QpICsgMTQgKyBzdGFja0luZGV4ICogKHNlZ21lbnRIZWlnaHQgKyBzZWdtZW50R2FwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gZnJMZWZ0IC0gMjtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBmclRvcCArIHRvcE9mZnNldDtcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IChsclJpZ2h0IC0gZnJMZWZ0KSArIDQ7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7ZXYuaWR9OnJvdzoke3N0YXJ0Um93fS1zaW5nbGVgO1xuICAgICAgICAgICAgICAgIHJlcXVpcmVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXNpbmdsZScpO1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSkuZGF0YXNldC5zdHlsZVNpZyA9IHN0eWxlU2lnO1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSkuZGF0YXNldC5jb250ZW50U2lnID0gY29udGVudFNpZztcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtcG9zaXRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCwgZXYuc3RhcnREYXRlLCBldi5lbmREYXRlKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaWcgPSBzdHlsZVNpZztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3NpZyA9IGNvbnRlbnRTaWc7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaXRlbSkuZGF0YXNldC5zdHlsZVNpZyAhPT0gc2lnIHx8IChpdGVtKS5kYXRhc2V0LmNvbnRlbnRTaWcgIT09IGNzaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc2luZ2xlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0pLmRhdGFzZXQuc3R5bGVTaWcgPSBzaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSkuZGF0YXNldC5jb250ZW50U2lnID0gY3NpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXBvc2l0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5zdGFydERhdGUsIGV2LmVuZERhdGUpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBuZXdJdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNDb25uZWN0ZWQgfHwgaXRlbS5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmdyaWRFbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKGl0ZW0pLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xuICAgICAgICAgICAgICAgIChpdGVtKS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItcmFkaXVzJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXMgPz8gNn1weGApO1xuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUudG9wID0gYCR7dG9wfXB4YDtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuaGVpZ2h0ID0gYCR7c2VnbWVudEhlaWdodH1weGA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IHJvdyA9IHN0YXJ0Um93OyByb3cgPD0gZW5kUm93OyByb3crKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dTdGFydElkeCA9IHJvdyAqIGNlbGxzUGVyUm93O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dFbmRJZHggPSBNYXRoLm1pbihyb3dTdGFydElkeCArIGNlbGxzUGVyUm93IC0gMSwgY2VsbHMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50U3RhcnRJblJvdyA9IHJvdyA9PT0gc3RhcnRSb3cgPyBzdGFydElkeCA6IHJvd1N0YXJ0SWR4O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudEVuZEluUm93ID0gcm93ID09PSBlbmRSb3cgPyBlbmRJZHggOiByb3dFbmRJZHg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudFN0YXJ0SW5Sb3cgPiByb3dFbmRJZHggfHwgZXZlbnRFbmRJblJvdyA8IHJvd1N0YXJ0SWR4KSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBjZWxsc1tldmVudFN0YXJ0SW5Sb3ddO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gY2VsbHNbZXZlbnRFbmRJblJvd107XG4gICAgICAgICAgICAgICAgICAgIGlmICghZmlyc3QgfHwgIWxhc3QpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmckxlZnQgPSAoZmlyc3QpLm9mZnNldExlZnQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyVG9wID0gKGZpcnN0KS5vZmZzZXRUb3A7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxyUmlnaHQgPSAobGFzdCkub2Zmc2V0TGVmdCArIChsYXN0KS5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9wT2Zmc2V0ID0gdG9kYXlOdW0oZmlyc3QpICsgMTQgKyBzdGFja0luZGV4ICogKHNlZ21lbnRIZWlnaHQgKyBzZWdtZW50R2FwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGZyTGVmdCAtIDI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IGZyVG9wICsgdG9wT2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IChsclJpZ2h0IC0gZnJMZWZ0KSArIDQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2V2LmlkfTpyb3c6JHtyb3d9YDtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWRLZXlzLmFkZChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY3JlYXRlRXZlbnRJdGVtKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09PSBzdGFydFJvdykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc3RhcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IGVuZFJvdykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAoaXRlbSkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0pLmRhdGFzZXQuc3R5bGVTaWcgPSBzdHlsZVNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIChpdGVtKS5kYXRhc2V0LmNvbnRlbnRTaWcgPSBjb250ZW50U2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCwgZXYuc3RhcnREYXRlLCBldi5lbmREYXRlKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpZyA9IHN0eWxlU2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3NpZyA9IGNvbnRlbnRTaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0pLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZyB8fCAoaXRlbSkuZGF0YXNldC5jb250ZW50U2lnICE9PSBjc2lnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3SXRlbSA9IHRoaXMuY3JlYXRlRXZlbnRJdGVtKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IHN0YXJ0Um93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zdGFydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IGVuZFJvdykgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtZW5kJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0pLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSkuZGF0YXNldC5zdHlsZVNpZyA9IHNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSkuZGF0YXNldC5jb250ZW50U2lnID0gY3NpZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5zdGFydERhdGUsIGV2LmVuZERhdGUpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnBhcmVudEVsZW1lbnQpIGl0ZW0ucmVwbGFjZVdpdGgobmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IG5ld0l0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNDb25uZWN0ZWQgfHwgaXRlbS5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmdyaWRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKGl0ZW0pLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xuICAgICAgICAgICAgICAgICAgICAoaXRlbSkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5sZWZ0ID0gYCR7bGVmdH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUudG9wID0gYCR7dG9wfXB4YDtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5oZWlnaHQgPSBgJHtzZWdtZW50SGVpZ2h0fXB4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBSZW1vdmUgYW55IHN0YWxlIGxvbmcgaXRlbXNcbiAgICAgICAgQXJyYXkuZnJvbSh0aGlzLl9sb25nRWxzLmtleXMoKSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXF1aXJlZEtleXMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXMuX2xvbmdFbHMuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKGVsICYmIGVsLnBhcmVudEVsZW1lbnQpIGVsLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuZGVsZXRlKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjZWxscy5mb3JFYWNoKGNlbGwgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IGNlbGwuZ2V0QXR0cignZGF0YS1kYXRlJyk7XG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGNvdW50c0J5RGF0ZVtkYXRlXSB8fCAwO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gY2VsbC5xdWVyeVNlbGVjdG9yKCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VNdCA9IGNvdW50ID4gMCA/IChjb3VudCAqIHNlZ21lbnRIZWlnaHQpICsgKE1hdGgubWF4KDAsIGNvdW50IC0gMSkgKiBzZWdtZW50R2FwKSArIDIgOiAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzVG9kYXlDZWxsID0gY2VsbC5jbGFzc0xpc3QuY29udGFpbnMoJ2RheWJsZS1jdXJyZW50LWRheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gaXNUb2RheUNlbGwgPyBNYXRoLm1heCgwLCBiYXNlTXQgLSA0KSA6IGJhc2VNdDsgLy8gZ2FwcHlcbiAgICAgICAgICAgICAgICAoY29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5tYXJnaW5Ub3AgPSBtdCA/IGAke210fXB4YCA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjcmVhdGVFdmVudEl0ZW0oZXY6IERheWJsZUV2ZW50KTogSFRNTEVsZW1lbnQge1xuICAgICAgICBjb25zdCBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGl0ZW0uY2xhc3NOYW1lID0gJ2RheWJsZS1ldmVudCc7XG4gICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xuICAgICAgICBpdGVtLmRhdGFzZXQuaWQgPSBldi5pZDtcbiAgICAgICAgaXRlbS5kYXRhc2V0LmNhdGVnb3J5SWQgPSBldi5jYXRlZ29yeUlkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdGl0bGUvZGVzY3JpcHRpb24gYWxpZ25tZW50XG4gICAgICAgIGNvbnN0IHRpdGxlQWxpZ24gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudFRpdGxlQWxpZ24gfHwgJ2xlZnQnO1xuICAgICAgICBjb25zdCBkZXNjQWxpZ24gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudERlc2NBbGlnbiB8fCAnbGVmdCc7XG4gICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS10aXRsZS1hbGlnbi0ke3RpdGxlQWxpZ259YCk7XG4gICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1kZXNjLWFsaWduLSR7ZGVzY0FsaWdufWApO1xuICAgICAgICBpZiAodGl0bGVBbGlnbiA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sYXlvdXQtY2VudGVyLWZsZXgnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHdoaWNoIGNvbG9ycyB0byB1c2U6IHVzZXItc2V0IG9yIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzPy5maW5kKGMgPT4gYy5pZCA9PT0gZXYuY2F0ZWdvcnlJZCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgYmdDb2xvciA9ICcnO1xuICAgICAgICBsZXQgdGV4dENvbG9yID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xvciBzZWxlY3Rpb24gbG9naWMgKHVzZXItc2V0IGNvbG9yIGFsd2F5cyBwcmVmZXJyZWQpXG4gICAgICAgIGlmIChldi5jb2xvcikge1xuICAgICAgICAgICAgYmdDb2xvciA9IGV2LmNvbG9yO1xuICAgICAgICAgICAgdGV4dENvbG9yID0gZXYudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihldi5jb2xvcik7XG4gICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5jb2xvciA9IGV2LmNvbG9yO1xuICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcbiAgICAgICAgICAgIGJnQ29sb3IgPSBjYXRlZ29yeS5iZ0NvbG9yO1xuICAgICAgICAgICAgdGV4dENvbG9yID0gY2F0ZWdvcnkudGV4dENvbG9yO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBzdHlsaW5nIGlmIHdlIGhhdmUgY29sb3JzXG4gICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xuICAgICAgICAgICAgLy8gQ29udmVydCBoZXggY29sb3IgdG8gcmdiYSB3aXRoIG9wYWNpdHlcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxO1xuICAgICAgICAgICAgY29uc3QgcmdiYUNvbG9yID0gaGV4VG9SZ2JhKGJnQ29sb3IsIG9wYWNpdHkpO1xuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1iZy1jb2xvcicsIHJnYmFDb2xvcik7XG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LXRleHQtY29sb3InLCB0ZXh0Q29sb3IpO1xuICAgICAgICAgICAgY29uc3QgYk9wYWNpdHkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlck9wYWNpdHkgPz8gMTtcbiAgICAgICAgICAgIGNvbnN0IGJvcmRlckNvbG9yID0gaGV4VG9SZ2JhKHRleHRDb2xvciwgYk9wYWNpdHkpO1xuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItY29sb3InLCBib3JkZXJDb2xvcik7XG4gICAgICAgICAgICBpdGVtLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1jb2xvcmVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGJvcmRlciB3aWR0aCBzZXR0aW5nc1xuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci1yYWRpdXMnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1cyA/PyA2fXB4YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBlZmZlY3QgYW5kIGFuaW1hdGlvbiBmcm9tIGNhdGVnb3J5IChhbHdheXMsIHJlZ2FyZGxlc3Mgb2YgY29sb3IgY2hvaWNlKVxuICAgICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmIChjYXRlZ29yeS5lZmZlY3QgJiYgY2F0ZWdvcnkuZWZmZWN0ICE9PSAnJykgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWVmZmVjdC0ke2NhdGVnb3J5LmVmZmVjdH1gKTtcbiAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5RXZlbnQgPSB0aGlzLmlzRXZlbnRUb2RheShldik7XG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uICYmIGNhdGVnb3J5LmFuaW1hdGlvbiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgaXNUb2RheUV2ZW50KSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbjIgJiYgY2F0ZWdvcnkuYW5pbWF0aW9uMiAhPT0gJycgJiYgKCFvbmx5VG9kYXkgfHwgaXNUb2RheUV2ZW50KSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9uMn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGl0bGUgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC10aXRsZScgfSk7XG4gICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZSwgdGhpcy5wbHVnaW4uYXBwKTtcbiAgICAgICAgY29uc3QgdEZtdCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPz8gJzI0aCc7XG4gICAgICAgIGNvbnN0IHRpbWVEaXNwbGF5ID0gZm9ybWF0VGltZVJhbmdlKGV2LnRpbWUsIHRGbXQpO1xuICAgICAgICBpZiAodGltZURpc3BsYXkpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgdGltZVNwYW4udGV4dENvbnRlbnQgPSBgICgke3RpbWVEaXNwbGF5fSlgO1xuICAgICAgICAgICAgdGl0bGUuYXBwZW5kQ2hpbGQodGltZVNwYW4pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGljb25Ub1VzZSA9IGV2Lmljb24gfHwgKGNhdGVnb3J5Py5pY29uIHx8ICcnKTtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgIT09ICdub25lJyAmJiBpY29uVG9Vc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGljb25FbCA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWljb24nIH0pO1xuICAgICAgICAgICAgc2V0SWNvbihpY29uRWwsIGljb25Ub1VzZSk7XG4gICAgICAgICAgICBjb25zdCBwbGFjZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPz8gJ2xlZnQnO1xuICAgICAgICAgICAgaWYgKHBsYWNlID09PSAnbGVmdCcpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmluc2VydEJlZm9yZShpY29uRWwsIHRpdGxlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxhY2UgPT09ICdyaWdodCcpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmFwcGVuZENoaWxkKGljb25FbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYWNlID09PSAndG9wJyB8fCBwbGFjZSA9PT0gJ3RvcC1sZWZ0JyB8fCBwbGFjZSA9PT0gJ3RvcC1yaWdodCcpIHtcbiAgICAgICAgICAgICAgICBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcCcpO1xuICAgICAgICAgICAgICAgIGlmIChwbGFjZSA9PT0gJ3RvcC1sZWZ0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtbGVmdCcpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHBsYWNlID09PSAndG9wLXJpZ2h0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtcmlnaHQnKTtcbiAgICAgICAgICAgICAgICBlbHNlIGljb25FbC5hZGRDbGFzcygnZGF5YmxlLWljb24tdG9wLWNlbnRlcicpO1xuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGljb25FbCwgaXRlbS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZXYuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1kZXNjJyB9KTtcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uIGluaGVyaXRzIHRleHQgY29sb3JcbiAgICAgICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xuICAgICAgICAgICAgICAgIGRlc2Muc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZW5kZXJNYXJrZG93bihldi5kZXNjcmlwdGlvbiwgZGVzYywgdGhpcy5wbHVnaW4uYXBwKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDb21wbGV0ZWQgYmVoYXZpb3JcbiAgICAgICAgaWYgKGV2LmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgY29uc3QgYmVoYXZpb3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJztcbiAgICAgICAgICAgIGlmIChiZWhhdmlvciA9PT0gJ2RpbScpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1ldmVudC1kaW0nKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnc3RyaWtldGhyb3VnaCcpIHRpdGxlLmFkZENsYXNzKCdkYXlibGUtc3RyaWtldGhyb3VnaCcpO1xuICAgICAgICAgICAgZWxzZSBpZiAoYmVoYXZpb3IgPT09ICdoaWRlJykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWV2ZW50LWhpZGRlbicpO1xuICAgICAgICB9XG4gICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhID0gKGV2dC50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgIGlmICghYSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcbiAgICAgICAgICAgIGlmICh3aWtpKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5wbHVnaW4uYXBwLCB3aWtpKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAobGVhZiBhcyBhbnkpLm9wZW5GaWxlPy4oZmlsZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICAgIGl0ZW0ub25kcmFnc3RhcnQgPSBlID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIERyYWcgc3RhcnRlZCBvbiBldmVudDonLCBldi5pZCk7XG4gICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XG4gICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIpPy5zZXREYXRhKCdkYXlibGUtc291cmNlJywnY2FsZW5kYXInKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLWdob3N0Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGl0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShpdGVtKS5ib3JkZXJSYWRpdXM7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcbiAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSBkcmFnSW1nO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBEcmFnIGltYWdlIHNldHVwIGVycm9yOicsIGUpOyB9XG4gICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlbS5vbmRyYWdlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpID0gKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkKTsgfTtcbiAgICAgICAgaXRlbS5vbmNvbnRleHRtZW51ID0gKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0R1cGxpY2F0ZScpLnNldEljb24oJ2NvcHknKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdFdjogRGF5YmxlRXZlbnQgPSB7IC4uLmV2LCBpZDogcmFuZG9tSWQoKSB9O1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2gobmV3RXYpO1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdm9pZCB2b2lkIHRoaXMucmVuZGVyKCkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgbWVudS5hZGRJdGVtKGkgPT4gaS5zZXRUaXRsZShldi5jb21wbGV0ZWQgPyAnTWFyayBpbmNvbXBsZXRlJyA6ICdNYXJrIGNvbXBsZXRlJykuc2V0SWNvbignY2hlY2snKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICBldi5jb21wbGV0ZWQgPSAhZXYuY29tcGxldGVkO1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdm9pZCB0aGlzLnJlbmRlcigpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZTIgPT4gZTIuaWQgIT09IGV2LmlkKTtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHZvaWQgdGhpcy5yZW5kZXIoKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNFdmVudFRvZGF5KGV2OiBEYXlibGVFdmVudCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCB0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3QgeXl5eSA9IHQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcodC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcodC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IHRvZGF5U3RyID0gYCR7eXl5eX0tJHttbX0tJHtkZH1gO1xuICAgICAgICBpZiAoZXYuZGF0ZSkgcmV0dXJuIGV2LmRhdGUgPT09IHRvZGF5U3RyO1xuICAgICAgICBpZiAoZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBldi5zdGFydERhdGUgPD0gdG9kYXlTdHIgJiYgZXYuZW5kRGF0ZSA+PSB0b2RheVN0cjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXYuc3RhcnREYXRlICYmICFldi5lbmREYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gZXYuc3RhcnREYXRlID09PSB0b2RheVN0cjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVuZGVySG9sZGVyKCkge1xuICAgICAgICBjb25zdCBsaXN0ID0gdGhpcy5ob2xkZXJFbD8ucXVlcnlTZWxlY3RvcignLmRheWJsZS1ob2xkZXItbGlzdCcpO1xuICAgICAgICBpZiAoIWxpc3QpIHJldHVybjtcbiAgICAgICAgbGlzdC5lbXB0eSgpO1xuICAgICAgICB0aGlzLmhvbGRlckV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICBpdGVtLmRhdGFzZXQuc291cmNlID0gJ2hvbGRlcic7XG4gICAgICAgICAgICBpdGVtLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xuICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCdob2xkZXInKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnSW1nID0gaXRlbS5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLWdob3N0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSBpdGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLndpZHRoID0gYCR7cmVjdC53aWR0aH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUoaXRlbSkuYm9yZGVyUmFkaXVzO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIERyYWcgaW1hZ2Ugc2V0dXAgZXJyb3I6JywgZSk7IH1cbiAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpdGVtLm9uZHJhZ2VuZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaSA9IChpdGVtIGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGlmIChkaSAmJiBkaS5wYXJlbnRFbGVtZW50KSBkaS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW5zaWRlIGhvbGRlciBsaXN0IHdpdGggZHJvcCBpbmRpY2F0b3JzXG4gICAgICAgIChsaXN0IGFzIGFueSkub25kcmFnb3ZlciA9IChlOiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRhcmdldEV2ZW50ICYmIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQgPT09IGxpc3QgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2RheWJsZS1kcm9wLWluZGljYXRvcic7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIChsaXN0IGFzIGFueSkub25kcmFnbGVhdmUgPSAoZTogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGxpc3QpIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICB9O1xuICAgICAgICAobGlzdCBhcyBhbnkpLm9uZHJvcCA9IGFzeW5jIChlOiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgIGlmICghaWQgfHwgc3JjICE9PSAnaG9sZGVyJykgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgZHJhZ2dlZEVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtaWQ9XCIke2lkfVwiXWApO1xuICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ob2xkZXItbGlzdCcpO1xuICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGxpc3QpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCkgeyBcbiAgICAgICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGRyYWdnZWRFbCk7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7IGxpc3QuaW5zZXJ0QmVmb3JlKGRyYWdnZWRFbCwgdGFyZ2V0RXZlbnQpOyB9XG4gICAgICAgICAgICAgICAgZWxzZSB7IHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBlcnNpc3QgbmV3IGhvbGRlciBvcmRlclxuICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0aGlzLmhvbGRlckV2ZW50cy5maW5kKGV2ID0+IGV2LmlkID09PSBlaWQpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgcmVvcmRlcmVkLnB1c2goZm91bmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IHJlb3JkZXJlZDtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5FdmVudE1vZGFsKGlkPzogc3RyaW5nLCBkYXRlPzogc3RyaW5nLCBlbmREYXRlPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcbiAgICAgICAgaWYgKCFmb2xkZXIpIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7IH1cbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuICAgICAgICBjb25zdCBleGlzdGluZyA9IGlkID8gKHRoaXMuZXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBpZCkgPz8gdGhpcy5ob2xkZXJFdmVudHMuZmluZChlID0+IGUuaWQgPT09IGlkKSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGZyb21Ib2xkZXIgPSAhIShleGlzdGluZyAmJiB0aGlzLmhvbGRlckV2ZW50cy5zb21lKGUgPT4gZS5pZCA9PT0gZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgRXZlbnRNb2RhbCh0aGlzLmFwcCwgZXhpc3RpbmcsIGRhdGUsIGVuZERhdGUsIGFzeW5jIHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc011bHRpID0gISEocmVzdWx0LnN0YXJ0RGF0ZSAmJiByZXN1bHQuZW5kRGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBpc1NpbmdsZSA9ICEhcmVzdWx0LmRhdGUgfHwgKCEhcmVzdWx0LnN0YXJ0RGF0ZSAmJiAhcmVzdWx0LmVuZERhdGUpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgcmVzdWx0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXY6IERheWJsZUV2ZW50ID0geyBpZDogcmFuZG9tSWQoKSwgLi4ucmVzdWx0IH0gYXMgRGF5YmxlRXZlbnQ7XG4gICAgICAgICAgICAgICAgaWYgKGlzTXVsdGkgfHwgaXNTaW5nbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZV0gU2F2ZSBmYWlsZWQ6JywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUb2RheU1vZGFsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbC5ldmVudHMgPSB0aGlzLmV2ZW50cztcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMuY3VycmVudFRvZGF5TW9kYWwub25PcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChmcm9tSG9sZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gdGhpcy5ob2xkZXJFdmVudHMuZmlsdGVyKGUgPT4gZS5pZCAhPT0gZXhpc3RpbmcuaWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5pZCAhPT0gZXhpc3RpbmcuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBpY29uID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLmljb24gPSBpY29uO1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oaWNvbik7XG4gICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGljb24gaGFuZGxlclxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcuaWNvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBtb2RhbC5zZXRJY29uKCcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdm9pZCBwaWNrZXIub3BlbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkuY2F0ZWdvcmllcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkucGx1Z2luID0gdGhpcy5wbHVnaW47XG4gICAgICAgIHZvaWQgbW9kYWwub3BlbigpO1xuICAgIH1cblxuICAgIG9wZW5Ub2RheU1vZGFsKGRhdGU6IHN0cmluZykge1xuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBUb2RheU1vZGFsKHRoaXMuYXBwLCBkYXRlLCB0aGlzLmV2ZW50cywgdGhpcyk7XG4gICAgICAgIHRoaXMuY3VycmVudFRvZGF5TW9kYWwgPSBtb2RhbDtcbiAgICAgICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHsgdGhpcy5jdXJyZW50VG9kYXlNb2RhbCA9IHVuZGVmaW5lZDsgfTtcbiAgICAgICAgdm9pZCBtb2RhbC5vcGVuKCk7XG4gICAgfVxufVxuXG5jbGFzcyBFdmVudE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIGV2PzogRGF5YmxlRXZlbnQ7XG4gICAgZGF0ZT86IHN0cmluZztcbiAgICBlbmREYXRlPzogc3RyaW5nO1xuICAgIG9uU3VibWl0OiAoZXY6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+KSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIG9uRGVsZXRlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIG9uUGlja0ljb246ICgpID0+IFByb21pc2U8dm9pZD47XG4gICAgaWNvbj86IHN0cmluZztcbiAgICBpY29uQnRuRWw/OiBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICBzZWxlY3RlZENvbG9yPzogc3RyaW5nO1xuICAgIHNlbGVjdGVkVGV4dENvbG9yPzogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGV2OiBEYXlibGVFdmVudCB8IHVuZGVmaW5lZCwgZGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBlbmREYXRlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9uU3VibWl0OiAoZXY6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+KSA9PiBQcm9taXNlPHZvaWQ+LCBvbkRlbGV0ZTogKCkgPT4gUHJvbWlzZTx2b2lkPiwgb25QaWNrSWNvbjogKCkgPT4gUHJvbWlzZTx2b2lkPikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLmV2ID0gZXY7XG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuZW5kRGF0ZSA9IGVuZERhdGU7XG4gICAgICAgIHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDtcbiAgICAgICAgdGhpcy5vbkRlbGV0ZSA9IG9uRGVsZXRlO1xuICAgICAgICB0aGlzLm9uUGlja0ljb24gPSBvblBpY2tJY29uO1xuICAgICAgICB0aGlzLmljb24gPSBldj8uaWNvbjtcbiAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gZXY/LmNvbG9yO1xuICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gZXY/LnRleHRDb2xvcjtcbiAgICB9XG5cbiAgICBzZXRJY29uKGljb246IHN0cmluZykgeyB0aGlzLmljb24gPSBpY29uOyBpZiAodGhpcy5pY29uQnRuRWwpIHNldEljb24odGhpcy5pY29uQnRuRWwsIGljb24gfHwgJ3BsdXMnKTsgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgY29uc3QgaGVhZGluZyA9IGMuY3JlYXRlRWwoJ2gzJywgeyBjbHM6ICdkYXlibGUtbW9kYWwtdGl0bGUnIH0pO1xuICAgICAgICBjLmFkZENsYXNzKCdkYi1tb2RhbCcpO1xuICAgICAgICBoZWFkaW5nLmFkZENsYXNzKCdkYi1tb2RhbC10aXRsZScpO1xuICAgICAgICBoZWFkaW5nLnRleHRDb250ZW50ID0gdGhpcy5ldiA/ICdFZGl0IGV2ZW50JyA6ICdBZGQgbmV3IGV2ZW50JztcbiAgICAgICAgY29uc3Qgcm93MSA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgIHJvdzEuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBjb25zdCBpY29uQnRuID0gcm93MS5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1pY29uLWFkZCcgfSk7XG4gICAgICAgIGljb25CdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xuICAgICAgICBzZXRJY29uKGljb25CdG4sIHRoaXMuaWNvbiA/PyAncGx1cycpO1xuICAgICAgICBpY29uQnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLm9uUGlja0ljb24oKTtcbiAgICAgICAgdGhpcy5pY29uQnRuRWwgPSBpY29uQnRuO1xuICAgICAgICBjb25zdCB0aXRsZUlucHV0ID0gcm93MS5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0ZXh0JywgY2xzOiAnZGF5YmxlLWlucHV0JywgYXR0cjogeyBwbGFjZWhvbGRlcjogJ0V2ZW50IHRpdGxlJywgYXV0b2ZvY3VzOiAndHJ1ZScgfSB9KTtcbiAgICAgICAgdGl0bGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgdGl0bGVJbnB1dC52YWx1ZSA9IHRoaXMuZXY/LnRpdGxlID8/ICcnO1xuICAgICAgICBjb25zdCBmb2N1c1RpdGxlID0gKCkgPT4geyB0cnkgeyB0aXRsZUlucHV0LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTsgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBGb2N1cyB0aXRsZTonLCBlKTsgfSB9O1xuICAgICAgICBmb2N1c1RpdGxlKCk7XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmb2N1c1RpdGxlKTtcbiAgICAgICAgc2V0VGltZW91dChmb2N1c1RpdGxlLCAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtbbGlua11dIHN1Z2dlc3Rpb25zIHNoYXJlZCBmb3IgdGl0bGUgYW5kIGRlc2NyaXB0aW9uXG4gICAgICAgIGxldCBzdWdnZXN0aW9uQ29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgICBsZXQgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwO1xuICAgICAgICBsZXQgc3VnZ2VzdGlvblRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICAgICAgY29uc3QgY2xvc2VTdWdnZXN0aW9ucyA9ICgpID0+IHsgaWYgKHN1Z2dlc3Rpb25Db250YWluZXIpIHsgc3VnZ2VzdGlvbkNvbnRhaW5lci5yZW1vdmUoKTsgc3VnZ2VzdGlvbkNvbnRhaW5lciA9IG51bGw7IH0gc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSAwOyBzdWdnZXN0aW9uVGFyZ2V0ID0gbnVsbDsgfTtcbiAgICAgICAgY29uc3Qgc2hvd1N1Z2dlc3Rpb25zRm9yID0gKHRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChzdWdnZXN0aW9uQ29udGFpbmVyKSBzdWdnZXN0aW9uQ29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gdGFyZ2V0LnZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSB2YWwubWF0Y2goL1xcW1xcWyhbXlxcW1xcXV0qPykkLyk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBxdWVyeSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKClcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChmOiBhbnkpID0+IGYubmFtZSAmJiBmLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgJiYgIWYubmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICAgICAgLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25UYXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgICAgICBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdkYXlibGUtbGluay1zdWdnZXN0aW9ucyc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQgPSAnMTgwcHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnpJbmRleCA9ICcxMDAwMCc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm1pbldpZHRoID0gJzIwMHB4JztcbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGU6IHVua25vd24sIGk6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBpdGVtLnRleHRDb250ZW50ID0gKGZpbGUgYXMgYW55KS5uYW1lO1xuICAgICAgICAgICAgICAgIGl0ZW0uY2xhc3NMaXN0LmFkZCgnZGF5YmxlLXN1Z2dlc3Rpb24taXRlbScpO1xuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7IGl0ZW0uY2xhc3NMaXN0LmFkZCgnaXMtc2VsZWN0ZWQnKTsgfVxuICAgICAgICAgICAgICAgIGl0ZW0ub25jbGljayA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlTWF0Y2ggPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxhc3RJbmRleE9mKCdbWycpKTtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnZhbHVlID0gYmVmb3JlTWF0Y2ggKyAnW1snICsgKGZpbGUgYXMgYW55KS5uYW1lICsgJ11dJztcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdWdnZXN0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmxlZnQgPSBNYXRoLnJvdW5kKHJlY3QubGVmdCkgKyAncHgnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS50b3AgPSBNYXRoLnJvdW5kKHJlY3QudG9wICsgcmVjdC5oZWlnaHQpICsgJ3B4JztcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbW92ZVN1Z2dlc3Rpb25TZWxlY3Rpb24gPSAoZGlyOiAxIHwgLTEpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN1Z2dlc3Rpb25Db250YWluZXIuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGkgPT4geyBpLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXNlbGVjdGVkJyk7IH0pO1xuICAgICAgICAgICAgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbihpdGVtcy5sZW5ndGggLSAxLCBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCArIGRpcikpO1xuICAgICAgICAgICAgY29uc3Qgc2VsID0gaXRlbXNbc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXhdO1xuICAgICAgICAgICAgaWYgKHNlbCkgeyBzZWwuY2xhc3NMaXN0LmFkZCgnaXMtc2VsZWN0ZWQnKTsgfVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lciB8fCAhc3VnZ2VzdGlvblRhcmdldCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBBcnJheS5mcm9tKHN1Z2dlc3Rpb25Db250YWluZXIuY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W107XG4gICAgICAgICAgICBjb25zdCBzZWwgPSBpdGVtc1tzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNlbCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IHNlbC50ZXh0Q29udGVudCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzdWdnZXN0aW9uVGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgYmVmb3JlTWF0Y2ggPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxhc3RJbmRleE9mKCdbWycpKTtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25UYXJnZXQudmFsdWUgPSBiZWZvcmVNYXRjaCArICdbWycgKyBuYW1lICsgJ11dJztcbiAgICAgICAgICAgIGNsb3NlU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN1Z2dlc3Rpb25Db250YWluZXIpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93RG93bicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbigxKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdBcnJvd1VwJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IG1vdmVTdWdnZXN0aW9uU2VsZWN0aW9uKC0xKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjaG9vc2VDdXJyZW50U3VnZ2VzdGlvbigpOyB9XG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjbG9zZVN1Z2dlc3Rpb25zKCk7IH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgICB0aXRsZUlucHV0Lm9uaW5wdXQgPSAoKSA9PiB7IHNob3dTdWdnZXN0aW9uc0Zvcih0aXRsZUlucHV0KTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBjb2xvciBzd2F0Y2ggcm93ICh3aWxsIGJlIHBvc2l0aW9uZWQgYmFzZWQgb24gc2V0dGluZylcbiAgICAgICAgY29uc3QgY3JlYXRlQ29sb3JSb3cgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2xvclJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdyBkYXlibGUtY29sb3Itc3dhdGNoZXMtcm93JyB9KTtcbiAgICAgICAgICAgIGNvbG9yUm93LmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3dhdGNoZXNDb250YWluZXIgPSBjb2xvclJvdy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoZXMnIH0pO1xuICAgICAgICAgICAgc3dhdGNoZXNDb250YWluZXIuYWRkQ2xhc3MoJ2RiLWNvbG9yLXN3YXRjaGVzJyk7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0U3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCBkYXlibGUtY29sb3Itc3dhdGNoLW5vbmUnIH0pO1xuICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoJyk7XG4gICAgICAgICAgICBkZWZhdWx0U3dhdGNoLnRpdGxlID0gJ05vbmUgKGRlZmF1bHQpJztcbiAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2gub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3IgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFRleHRDb2xvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWNvbG9yLXN3YXRjaCcpLmZvckVhY2gocyA9PiBzLnJlbW92ZUNsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJykpO1xuICAgICAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2guYWRkQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0ZWRDb2xvcikgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9ICh0aGlzIGFzIGFueSkucGx1Z2luPy5zZXR0aW5ncztcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0U3dhdGNoZXMgPSAoc2V0dGluZ3M/LnN3YXRjaGVzID8/IFtdKS5tYXAoKHM6IGFueSkgPT4gKHsgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgY29uc3QgY3VzdG9tU3dhdGNoZXMgPSAoc2V0dGluZ3M/LnVzZXJDdXN0b21Td2F0Y2hlcyA/PyBbXSkubWFwKChzOiBhbnkpID0+ICh7IGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgIGxldCBzd2F0Y2hlczogQXJyYXk8eyBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4gPSBidWlsdFN3YXRjaGVzO1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzPy5jdXN0b21Td2F0Y2hlc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBzd2F0Y2hlcyA9IGJ1aWx0U3dhdGNoZXMuY29uY2F0KGN1c3RvbVN3YXRjaGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3dhdGNoZXMgfHwgc3dhdGNoZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgc3dhdGNoZXMgPSBbJyNlYjNiNWEnLCAnI2ZhODIzMScsICcjZTVhMjE2JywgJyMyMGJmNmInLCAnIzBmYjliMScsICcjMmQ5OGRhJywgJyMzODY3ZDYnLCAnIzU0NTRkMCcsICcjODg1NGQwJywgJyNiNTU0ZDAnLCAnI2U4MzJjMScsICcjZTgzMjg5JywgJyM5NjViM2InLCAnIzgzOTJhNCddLm1hcChjID0+ICh7IGNvbG9yOiBjIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3YXRjaGVzLmZvckVhY2goKHsgY29sb3IsIHRleHRDb2xvciB9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCcgfSk7XG4gICAgICAgICAgICAgICAgc3dhdGNoLmFkZENsYXNzKCdkYi1jb2xvci1zd2F0Y2gnKTtcbiAgICAgICAgICAgICAgICBzd2F0Y2guc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLnN0eWxlLmJvcmRlckNvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLnRpdGxlID0gY29sb3I7XG4gICAgICAgICAgICAgICAgc3dhdGNoLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvciA9IGNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gdGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihjb2xvcik7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtY29sb3Itc3dhdGNoJykuZm9yRWFjaChzID0+IHMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKSk7XG4gICAgICAgICAgICAgICAgICAgIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRDb2xvciA9PT0gY29sb3IpIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY29sb3JSb3c7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29sb3Igc3dhdGNoZXMgdW5kZXIgdGl0bGUgaWYgc2V0dGluZyBzYXlzIHNvXG4gICAgICAgIGNvbnN0IGNvbG9yU3dhdGNoUG9zID0gKHRoaXMgYXMgYW55KS5wbHVnaW4/LnNldHRpbmdzPy5jb2xvclN3YXRjaFBvc2l0aW9uID8/ICd1bmRlci10aXRsZSc7XG4gICAgICAgIGlmIChjb2xvclN3YXRjaFBvcyA9PT0gJ3VuZGVyLXRpdGxlJykge1xuICAgICAgICAgICAgY3JlYXRlQ29sb3JSb3coKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZVJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdyBkYXlibGUtbW9kYWwtcm93LWNlbnRlcicgfSk7XG4gICAgICAgIHJ1bGVSb3cuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeUxhYmVsID0gcnVsZVJvdy5jcmVhdGVFbCgnbGFiZWwnLCB7IHRleHQ6ICdDYXRlZ29yeTonIH0pO1xuICAgICAgICBjYXRlZ29yeUxhYmVsLmFkZENsYXNzKCdkYi1sYWJlbCcpO1xuICAgICAgICBjYXRlZ29yeUxhYmVsLmFkZENsYXNzKCdkYXlibGUtY2F0ZWdvcnktbGFiZWwnKTtcbiAgICAgICAgbGV0IHNlbGVjdGVkQ2F0ZWdvcnlJZCA9IHRoaXMuZXY/LmNhdGVnb3J5SWQ7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5U2VsZWN0ID0gcnVsZVJvdy5jcmVhdGVFbCgnc2VsZWN0JywgeyBjbHM6ICdkYXlibGUtaW5wdXQgZGF5YmxlLWNhdGVnb3J5LXNlbGVjdCcgfSk7XG4gICAgICAgIGNhdGVnb3J5U2VsZWN0LmFkZENsYXNzKCdkYi1zZWxlY3QnKTtcbiAgICAgICAgY29uc3QgZW1wdHlPcHQgPSBjYXRlZ29yeVNlbGVjdC5jcmVhdGVFbCgnb3B0aW9uJyk7IGVtcHR5T3B0LnZhbHVlPScnOyBlbXB0eU9wdC50ZXh0PSdEZWZhdWx0JztcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9ICh0aGlzIGFzIGFueSkuY2F0ZWdvcmllcyB8fCBbXTtcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKChjOiBFdmVudENhdGVnb3J5KSA9PiB7IGNvbnN0IG9wdCA9IGNhdGVnb3J5U2VsZWN0LmNyZWF0ZUVsKCdvcHRpb24nKTsgb3B0LnZhbHVlID0gYy5pZDsgb3B0LnRleHQgPSBjLm5hbWU7IH0pO1xuICAgICAgICBjYXRlZ29yeVNlbGVjdC52YWx1ZSA9IHNlbGVjdGVkQ2F0ZWdvcnlJZCA/PyAnJztcbiAgICAgICAgXG4gICAgICAgIGNhdGVnb3J5U2VsZWN0Lm9uY2hhbmdlID0gKCkgPT4geyBcbiAgICAgICAgICAgIHNlbGVjdGVkQ2F0ZWdvcnlJZCA9IGNhdGVnb3J5U2VsZWN0LnZhbHVlIHx8IHVuZGVmaW5lZDsgXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG11bHRpLWRheSBldmVudFxuICAgICAgICBjb25zdCBpc011bHRpRGF5ID0gdGhpcy5lbmREYXRlICYmIHRoaXMuZW5kRGF0ZSAhPT0gdGhpcy5kYXRlO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhcnQgdGltZS9kYXRlIHJvd1xuICAgICAgICBjb25zdCByb3cyID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcbiAgICAgICAgcm93Mi5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IHJvdzIuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGltZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XG4gICAgICAgIHN0YXJ0VGltZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgc3RhcnRUaW1lLnZhbHVlID0gdGhpcy5ldj8udGltZT8uc3BsaXQoJy0nKVswXSA/PyAnJztcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gcm93Mi5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdkYXRlJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcbiAgICAgICAgc3RhcnREYXRlLmFkZENsYXNzKCdkYi1pbnB1dCcpO1xuICAgICAgICBzdGFydERhdGUudmFsdWUgPSB0aGlzLmV2Py5kYXRlID8/IHRoaXMuZXY/LnN0YXJ0RGF0ZSA/PyB0aGlzLmRhdGUgPz8gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmQgdGltZS9kYXRlIHJvdyAob25seSBmb3IgbXVsdGktZGF5IGV2ZW50cylcbiAgICAgICAgbGV0IGVuZFRpbWU6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBlbmREYXRlSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChpc011bHRpRGF5KSB7XG4gICAgICAgICAgICBjb25zdCByb3czID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcbiAgICAgICAgICAgIHJvdzMuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICAgICAgZW5kVGltZSA9IHJvdzMuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGltZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XG4gICAgICAgICAgICBlbmRUaW1lLmFkZENsYXNzKCdkYi1pbnB1dCcpO1xuICAgICAgICAgICAgZW5kVGltZS52YWx1ZSA9IHRoaXMuZXY/LnRpbWU/LnNwbGl0KCctJylbMV0gPz8gJyc7XG4gICAgICAgICAgICBlbmREYXRlSW5wdXQgPSByb3czLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2RhdGUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xuICAgICAgICAgICAgZW5kRGF0ZUlucHV0LmFkZENsYXNzKCdkYi1pbnB1dCcpO1xuICAgICAgICAgICAgZW5kRGF0ZUlucHV0LnZhbHVlID0gdGhpcy5lbmREYXRlID8/ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkZXNjSW5wdXQgPSBjLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHsgY2xzOiAnZGF5YmxlLXRleHRhcmVhJywgYXR0cjogeyBwbGFjZWhvbGRlcjogJ0Rlc2NyaXB0aW9uJyB9IH0pO1xuICAgICAgICBkZXNjSW5wdXQuYWRkQ2xhc3MoJ2RiLXRleHRhcmVhJyk7XG4gICAgICAgIGRlc2NJbnB1dC52YWx1ZSA9IHRoaXMuZXY/LmRlc2NyaXB0aW9uID8/ICcnO1xuICAgICAgICBcbiAgICAgICAgZGVzY0lucHV0Lm9uaW5wdXQgPSAoKSA9PiB7IHNob3dTdWdnZXN0aW9uc0ZvcihkZXNjSW5wdXQpOyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvbG9yIHN3YXRjaGVzIHVuZGVyIGRlc2NyaXB0aW9uIGlmIHNldHRpbmcgc2F5cyBzb1xuICAgICAgICBpZiAoY29sb3JTd2F0Y2hQb3MgPT09ICd1bmRlci1kZXNjcmlwdGlvbicpIHtcbiAgICAgICAgICAgIGNyZWF0ZUNvbG9yUm93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLWZvb3RlcicgfSk7XG4gICAgICAgIGZvb3Rlci5hZGRDbGFzcygnZGItbW9kYWwtZm9vdGVyJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIG9uIGxlZnQgKG9ubHkgZm9yIGV4aXN0aW5nIGV2ZW50cylcbiAgICAgICAgICAgIGlmICh0aGlzLmV2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsID0gZm9vdGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLWRlbGV0ZScgfSk7XG4gICAgICAgICAgICAgICAgZGVsLmFkZENsYXNzKCdkYi1idG4nKTtcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3RyYXNoLTInKTtcbiAgICAgICAgICAgICAgICBkZWwub25jbGljayA9ICgpID0+IHsgdm9pZCB0aGlzLm9uRGVsZXRlKCkudGhlbigoKSA9PiB0aGlzLmNsb3NlKCkpOyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FuY2VsIGFuZCBTYXZlIGJ1dHRvbnMgb24gcmlnaHRcbiAgICAgICAgY29uc3QgcmlnaHRCdXR0b25zID0gZm9vdGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1mb290ZXItcmlnaHQnIH0pO1xuICAgICAgICByaWdodEJ1dHRvbnMuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3Rlci1yaWdodCcpO1xuICAgICAgICBjb25zdCBjYW5jZWwgPSByaWdodEJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtY2FuY2VsJyB9KTtcbiAgICAgICAgY2FuY2VsLmFkZENsYXNzKCdkYi1idG4nKTtcbiAgICAgICAgY2FuY2VsLnRleHRDb250ZW50ID0gJ0NhbmNlbCc7XG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgICAgICBjb25zdCBvayA9IHJpZ2h0QnV0dG9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1zYXZlIG1vZC1jdGEnIH0pO1xuICAgICAgICBvay5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIG9rLnRleHRDb250ZW50ID0gJ1NhdmUgZXZlbnQnO1xuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGF5bG9hZDogUGFydGlhbDxEYXlibGVFdmVudD4gPSB7XG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlSW5wdXQudmFsdWUsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRlc2NJbnB1dC52YWx1ZSxcbiAgICAgICAgICAgICAgICBpY29uOiB0aGlzLmljb24sXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlJZDogc2VsZWN0ZWRDYXRlZ29yeUlkLFxuICAgICAgICAgICAgICAgIGNvbG9yOiB0aGlzLnNlbGVjdGVkQ29sb3IsXG4gICAgICAgICAgICAgICAgdGV4dENvbG9yOiB0aGlzLnNlbGVjdGVkVGV4dENvbG9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKCFwYXlsb2FkLmNhdGVnb3J5SWQgfHwgIXBheWxvYWQuY29sb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmlnZ2VycyA9ICh0aGlzIGFzIGFueSkucGx1Z2luPy5zZXR0aW5ncz8udHJpZ2dlcnMgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgdHh0ID0gKChwYXlsb2FkLnRpdGxlIHx8ICcnKSArICcgJyArIChwYXlsb2FkLmRlc2NyaXB0aW9uIHx8ICcnKSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IHRyaWdnZXJzLmZpbmQoKHQ6IGFueSkgPT4gKHQucGF0dGVybiB8fCAnJykudG9Mb3dlckNhc2UoKSAmJiB0eHQuaW5jbHVkZXMoKHQucGF0dGVybiB8fCAnJykudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBheWxvYWQuY2F0ZWdvcnlJZCAmJiBmb3VuZC5jYXRlZ29yeUlkKSBwYXlsb2FkLmNhdGVnb3J5SWQgPSBmb3VuZC5jYXRlZ29yeUlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBheWxvYWQuY29sb3IgJiYgZm91bmQuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWQuY29sb3IgPSBmb3VuZC5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBheWxvYWQudGV4dENvbG9yID0gZm91bmQudGV4dENvbG9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNNdWx0aURheSAmJiBlbmRUaW1lICYmIGVuZERhdGVJbnB1dCkge1xuICAgICAgICAgICAgICAgIC8vIE11bHRpLWRheSBldmVudFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZVZhbCA9IHN0YXJ0VGltZS52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBlbmRUaW1lVmFsID0gZW5kVGltZS52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnRpbWUgPSAoc3RhcnRUaW1lVmFsICYmIGVuZFRpbWVWYWwpID8gYCR7c3RhcnRUaW1lVmFsfS0ke2VuZFRpbWVWYWx9YCA6IChzdGFydFRpbWVWYWwgfHwgJycpO1xuICAgICAgICAgICAgICAgIHBheWxvYWQuc3RhcnREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IHRoaXMuZXY/LnN0YXJ0RGF0ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gZW5kRGF0ZUlucHV0LnZhbHVlIHx8IHRoaXMuZXY/LmVuZERhdGUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaW5nbGUgZGF5IGV2ZW50XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lVmFsID0gc3RhcnRUaW1lLnZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZFRpbWVWYWwgPSBlbmRUaW1lPy52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnRpbWUgPSAoc3RhcnRUaW1lVmFsICYmIGVuZFRpbWVWYWwpID8gYCR7c3RhcnRUaW1lVmFsfS0ke2VuZFRpbWVWYWx9YCA6IChzdGFydFRpbWVWYWwgfHwgJycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrRGF0ZSA9IHRoaXMuZXY/LmRhdGUgfHwgdGhpcy5ldj8uc3RhcnREYXRlIHx8IHRoaXMuZGF0ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5kYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnN0YXJ0RGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCBmYWxsYmFja0RhdGU7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5lbmREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUodGhpcy5vblN1Ym1pdChwYXlsb2FkKSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0RheWJsZV0gRXJyb3Igc2F2aW5nIGV2ZW50OicsIGUpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0Vycm9yIHNhdmluZyBldmVudDogJyArIChlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSkpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvLyBQcmV2ZW50IG1vZGFsIG9wZW4gd2hlbiBjbGlja2luZyBtYXJrZG93biBsaW5rcyBpbnNpZGUgZXZlbnQgaXRlbXM7IG9wZW4gbm90ZSBpbiBuZXcgdGFiXG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhID0gKGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgaWYgKCFhKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCB3aWtpID0gYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xuICAgICAgICAgICAgaWYgKHdpa2kpIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgSWNvblBpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIG9uUGljazogKGljb246IHN0cmluZykgPT4gdm9pZDtcbiAgICBvblJlbW92ZT86ICgpID0+IHZvaWQ7XG4gICAgYWxsSWNvbnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG9uUGljazogKGljb246IHN0cmluZykgPT4gdm9pZCwgb25SZW1vdmU/OiAoKSA9PiB2b2lkKSB7IHN1cGVyKGFwcCk7IHRoaXMub25QaWNrID0gb25QaWNrOyB0aGlzLm9uUmVtb3ZlID0gb25SZW1vdmU7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICAgICAgYy5lbXB0eSgpO1xuICAgICAgICBjLmFkZENsYXNzKCdkYXlibGUtbW9kYWwtY29sdW1uJyk7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RheWJsZS1tb2RhbC1mdWxsLWhlaWdodCcpO1xuICAgICAgICBjLmFkZENsYXNzKCdkYi1tb2RhbCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2VhcmNoUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcbiAgICAgICAgc2VhcmNoUm93LmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcbiAgICAgICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBzZWFyY2hSb3cuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGV4dCcsIGNsczogJ2RheWJsZS1pbnB1dCcsIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdTZWFyY2ggaWNvbnMnIH0gfSk7XG4gICAgICAgIHNlYXJjaElucHV0LmFkZENsYXNzKCdkYi1pbnB1dCcpO1xuICAgICAgICBzZWFyY2hJbnB1dC5hZGRDbGFzcygnZGF5YmxlLWljb24tcGlja2VyLXNlYXJjaCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbGlzdCA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWljb24tbGlzdCcgfSk7XG4gICAgICAgIGxpc3QuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXBpY2tlci1saXN0Jyk7XG4gICAgICAgIGxpc3QuYWRkQ2xhc3MoJ2RiLWljb24tbGlzdCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9vdGVyIHdpdGggcmVtb3ZlIGJ1dHRvblxuICAgICAgICBjb25zdCBmb290ZXIgPSBjLmNyZWF0ZURpdigpO1xuICAgICAgICBmb290ZXIuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3RlcicpO1xuICAgICAgICBmb290ZXIuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXBpY2tlci1mb290ZXInKTtcbiAgICAgICAgY29uc3QgcmVtb3ZlQnRuID0gZm9vdGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nLCB0ZXh0OiAnUmVtb3ZlIGljb24nIH0pO1xuICAgICAgICByZW1vdmVCdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xuICAgICAgICByZW1vdmVCdG4uYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXBpY2tlci1yZW1vdmUtYnRuJyk7XG4gICAgICAgIGNvbnN0IHJlbW92ZUljb24gPSByZW1vdmVCdG4uY3JlYXRlRGl2KCk7XG4gICAgICAgIHNldEljb24ocmVtb3ZlSWNvbiwgJ3gnKTtcbiAgICAgICAgcmVtb3ZlSWNvbi5hZGRDbGFzcygnZGF5YmxlLWlubGluZS1mbGV4Jyk7XG4gICAgICAgIHJlbW92ZUJ0bi5vbmNsaWNrID0gKCkgPT4geyBpZiAodGhpcy5vblJlbW92ZSkgdGhpcy5vblJlbW92ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGljb25zIGxhemlseVxuICAgICAgICBpZiAoIXRoaXMuYWxsSWNvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmFsbEljb25zID0gZ2V0SWNvbklkc1NhZmUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgwLCA5Nik7IC8vIE9ubHkgc2hvdyBmaXJzdCAxMDAgaW5pdGlhbGx5XG4gICAgICAgIGxldCBmdWxsRmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLnNsaWNlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW5kZXJMaXN0ID0gKGljb25zOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAgICAgbGlzdC5lbXB0eSgpO1xuICAgICAgICAgICAgaWNvbnMuc2xpY2UoMCwgMjAwKS5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidG4gPSBsaXN0LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1pY29uLWJ0bicgfSk7XG4gICAgICAgICAgICAgICAgYnRuLmFkZENsYXNzKCdkYi1pY29uLWJ0bicpO1xuICAgICAgICAgICAgICAgIGJ0bi5hZGRDbGFzcygnZGF5YmxlLWljb24tYnRuJyk7XG4gICAgICAgICAgICAgICAgYnRuLnRpdGxlID0gaWQ7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihidG4sIGlkKTtcbiAgICAgICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5vblBpY2soaWQpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFwcGx5RmlsdGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcSA9IChzZWFyY2hJbnB1dC52YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmICghcSkge1xuICAgICAgICAgICAgICAgIGZ1bGxGaWx0ZXJlZCA9IHRoaXMuYWxsSWNvbnMuc2xpY2UoMCwgMTUwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5maWx0ZXIoaWQgPT4gaWQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZW5kZXJMaXN0KGZ1bGxGaWx0ZXJlZCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBzZWFyY2hJbnB1dC5vbmlucHV0ID0gYXBwbHlGaWx0ZXI7XG4gICAgICAgIHJlbmRlckxpc3QoZmlsdGVyZWQpO1xuICAgIH1cbn1cblxuY2xhc3MgUHJvbXB0U2VhcmNoTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgdmlldzogRGF5YmxlQ2FsZW5kYXJWaWV3O1xuICAgIHF1ZXJ5OiBzdHJpbmcgPSAnJztcbiAgICByZXN1bHRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgc2VsZWN0ZWRJbmRleDogbnVtYmVyID0gMDtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgdmlldzogRGF5YmxlQ2FsZW5kYXJWaWV3KSB7IFxuICAgICAgICBzdXBlcihhcHApOyBcbiAgICAgICAgdGhpcy52aWV3ID0gdmlldzsgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLm1vZGFsRWwuY2xhc3NMaXN0LnJlbW92ZSgnbW9kYWwnKTtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbC5jbGFzc05hbWUgPSAncHJvbXB0JztcbiAgICAgICAgICAgIC8vIFJlbW92ZSBkZWZhdWx0IGNvbnRlbnQgd3JhcHBlciBzbyBwcm9tcHQgaXMgdGhlIHJvb3RcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRlbnRFbCAmJiB0aGlzLmNvbnRlbnRFbC5wYXJlbnRFbGVtZW50ID09PSB0aGlzLm1vZGFsRWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRFbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBQcm9tcHRTZWFyY2hNb2RhbCBpbml0OicsIGUpOyB9XG4gICAgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3Qgcm9vdCA9IHRoaXMubW9kYWxFbDtcbiAgICAgICAgd2hpbGUgKHJvb3QuZmlyc3RDaGlsZCkgcm9vdC5yZW1vdmVDaGlsZChyb290LmZpcnN0Q2hpbGQpO1xuICAgICAgICBjb25zdCBpbnB1dFdyYXAgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3Byb21wdC1pbnB1dC1jb250YWluZXInIH0pO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGlucHV0V3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IGNsczogJ3Byb21wdC1pbnB1dCcsIGF0dHI6IHsgYXV0b2NhcGl0YWxpemU6ICdvZmYnLCBzcGVsbGNoZWNrOiAnZmFsc2UnLCBlbnRlcmtleWhpbnQ6ICdkb25lJywgdHlwZTogJ3RleHQnLCBwbGFjZWhvbGRlcjogJ0ZpbmQgZXZlbnRzLi4uJyB9IH0pO1xuICAgICAgICBjb25zdCByZXN1bHRzRWwgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3Byb21wdC1yZXN1bHRzJyB9KTtcbiAgICAgICAgY29uc3QgcmVuZGVyID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzdWx0c0VsLmVtcHR5KCk7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucmVzdWx0cztcbiAgICAgICAgICAgIGlmICghaXRlbXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKChldiwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHJlc3VsdHNFbC5jcmVhdGVEaXYoeyBjbHM6ICdzdWdnZXN0aW9uLWl0ZW0gbW9kLWNvbXBsZXgnIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpID09PSB0aGlzLnNlbGVjdGVkSW5kZXgpIHJvdy5hZGRDbGFzcygnaXMtc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWVudGVyID0gKCkgPT4geyB0aGlzLnNlbGVjdGVkSW5kZXggPSBpOyByZW5kZXIoKTsgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gcm93LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tY29udGVudCcgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tdGl0bGUnIH0pO1xuICAgICAgICAgICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gZXYudGl0bGUgfHwgJyh1bnRpdGxlZCknO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vdGUgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24tbm90ZScgfSk7XG4gICAgICAgICAgICAgICAgbm90ZS50ZXh0Q29udGVudCA9IGV2LmRhdGUgKyAoZXYudGltZSA/ICcgJyArIGV2LnRpbWUgOiAnJyk7XG4gICAgICAgICAgICAgICAgbm90ZS5hZGRDbGFzcygnZGF5YmxlLXN1Z2dlc3Rpb24tbm90ZScpO1xuICAgICAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gdGhpcy5jaG9vc2UoaSk7XG4gICAgICAgICAgICAgICAgcm93Lm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLmNob29zZShpKTsgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCB1cGRhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxID0gKGlucHV0LnZhbHVlIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdGhpcy5xdWVyeSA9IHE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlYXJjaCBhbGwgbW9udGhzIGJ5IGxvYWRpbmcgYWxsIEpTT04gZmlsZXNcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMudmlldy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciB8fCAnRGF5YmxlQ2FsZW5kYXInO1xuICAgICAgICAgICAgbGV0IGFsbEV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdGFydCB3aXRoIGN1cnJlbnQgdmlldyBldmVudHMgdG8gYmUgZmFzdFxuICAgICAgICAgICAgYWxsRXZlbnRzID0gdGhpcy52aWV3LmV2ZW50cy5zbGljZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgYWxsIG90aGVyIGZpbGVzIGlmIHdlIGhhdmUgYSBxdWVyeVxuICAgICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxpc3Rpbmc7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5saXN0KGZvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvbGRlciBtaWdodCBub3QgZXhpc3Qgb3Igb3RoZXIgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RpbmcgPSB7IGZpbGVzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IChsaXN0aW5nLmZpbGVzIHx8IFtdKS5maWx0ZXIoKGY6IHN0cmluZykgPT4gZi50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuanNvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZiBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBjdXJyZW50IG1vbnRoIGZpbGUgYXMgaXQncyBhbHJlYWR5IGluIG1lbW9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudEZpbGUgPSB0aGlzLnZpZXcuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmID09PSBjdXJyZW50RmlsZSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZi5lbmRzV2l0aChjdXJyZW50RmlsZS5zcGxpdCgnLycpLnBvcCgpKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHh0ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggbGVnYWN5IGFycmF5IGZvcm1hdCBhbmQgbmV3IG9iamVjdCBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZUV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVFdmVudHMgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEuZXZlbnRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlRXZlbnRzID0gZGF0YS5ldmVudHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlRXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsRXZlbnRzID0gYWxsRXZlbnRzLmNvbmNhdChmaWxlRXZlbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGJhc2VkIG9uIElEXG4gICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlRXZlbnRzID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2IG9mIGFsbEV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmICghc2Vlbi5oYXMoZXYuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZW4uYWRkKGV2LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgdW5pcXVlRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5yZXN1bHRzID0gdW5pcXVlRXZlbnRzLmZpbHRlcihlID0+ICgoZS50aXRsZSB8fCAnJykgKyAnICcgKyAoZS5kZXNjcmlwdGlvbiB8fCAnJykpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkpLnNsaWNlKDAsIDUwKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgICAgICByZW5kZXIoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgb25LZXkgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnQXJyb3dEb3duJykgeyB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnJlc3VsdHMubGVuZ3RoIC0gMSwgdGhpcy5zZWxlY3RlZEluZGV4ICsgMSk7IHJlbmRlcigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnQXJyb3dVcCcpIHsgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgoMCwgdGhpcy5zZWxlY3RlZEluZGV4IC0gMSk7IHJlbmRlcigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRW50ZXInKSB7IHRoaXMuY2hvb3NlKHRoaXMuc2VsZWN0ZWRJbmRleCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7IHRoaXMuY2xvc2UoKTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgICAgIH07XG4gICAgICAgIGlucHV0Lm9uaW5wdXQgPSB1cGRhdGU7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IG9uS2V5O1xuICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB1cGRhdGUoKTtcbiAgICB9XG4gICAgYXN5bmMgY2hvb3NlKGlkeDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGV2ID0gdGhpcy5yZXN1bHRzW2lkeF07XG4gICAgICAgIGlmICghZXYpIHJldHVybjtcbiAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGV2LmRhdGUgfHwgZXYuc3RhcnREYXRlO1xuICAgICAgICBpZiAoZGF0ZVN0cikge1xuICAgICAgICAgICAgY29uc3QgW3ksIG0sIGRdID0gZGF0ZVN0ci5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdGhpcy52aWV3LmN1cnJlbnREYXRlID0gbmV3IERhdGUoeSwgKG0gfHwgMSkgLSAxLCBkIHx8IDEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy52aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB0aGlzLnZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlcyA9IEFycmF5LmZyb20odGhpcy52aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1pZD1cIiR7ZXYuaWR9XCJdYCkpO1xuICAgICAgICAgICAgICAgIG5vZGVzLmZvckVhY2gobiA9PiBuLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1oaWdobGlnaHQnKSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IG5vZGVzLmZvckVhY2gobiA9PiBuLmNsYXNzTGlzdC5yZW1vdmUoJ2RheWJsZS1ldmVudC1oaWdobGlnaHQnKSk7IH0sIDIwMDApO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbn1cblxuY2xhc3MgVG9kYXlNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBkYXRlOiBzdHJpbmc7XG4gICAgZXZlbnRzOiBEYXlibGVFdmVudFtdO1xuICAgIHZpZXc/OiBEYXlibGVDYWxlbmRhclZpZXc7XG4gICAgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGRhdGU6IHN0cmluZywgZXZlbnRzOiBEYXlibGVFdmVudFtdLCB2aWV3PzogRGF5YmxlQ2FsZW5kYXJWaWV3KSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gZXZlbnRzO1xuICAgICAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICAgIH1cbiAgICBcbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICAgICAgYy5lbXB0eSgpO1xuICAgICAgICBjLmFkZENsYXNzKCdkYXlibGUtbW9kYWwtY29sdW1uJyk7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RheWJsZS1tb2RhbC1mdWxsLWhlaWdodCcpO1xuICAgICAgICBjLmFkZENsYXNzKCdkYi1tb2RhbCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFyc2UgZGF0ZVxuICAgICAgICBjb25zdCBbeWVhciwgbW9udGgsIGRheV0gPSB0aGlzLmRhdGUuc3BsaXQoJy0nKS5tYXAoTnVtYmVyKTtcbiAgICAgICAgY29uc3QgZGF0ZU9iaiA9IG5ldyBEYXRlKHllYXIsIG1vbnRoIC0gMSwgZGF5KTtcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcbiAgICAgICAgY29uc3QgbW9udGhOYW1lID0gbW9udGhOYW1lc1tkYXRlT2JqLmdldE1vbnRoKCldO1xuICAgICAgICBcbiAgICAgICAgLy8gVGl0bGUgd2l0aCBkYXRlXG4gICAgICAgIGNvbnN0IHRpdGxlID0gYy5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6IGAke21vbnRoTmFtZX0gJHtkYXl9YCB9KTtcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XG4gICAgICAgIHRpdGxlLmFkZENsYXNzKCdkYXlibGUtbW9kYWwtdGl0bGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBldmVudHMgZm9yIHRoaXMgZGF0ZVxuICAgICAgICBjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmRhdGUgPT09IHRoaXMuZGF0ZSkuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZUEgPSBhLnRpbWUgPyBhLnRpbWUuc3BsaXQoJy0nKVswXSA6ICc5OTo5OSc7XG4gICAgICAgICAgICBjb25zdCB0aW1lQiA9IGIudGltZSA/IGIudGltZS5zcGxpdCgnLScpWzBdIDogJzk5Ojk5JztcbiAgICAgICAgICAgIHJldHVybiB0aW1lQS5sb2NhbGVDb21wYXJlKHRpbWVCKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudHMgY29udGFpbmVyIChzY3JvbGxhYmxlKVxuICAgICAgICBjb25zdCBldmVudHNDb250YWluZXIgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudHMtY29udGFpbmVyJyB9KTtcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLmFkZENsYXNzKCdkYi1ldmVudHMtY29udGFpbmVyJyk7XG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5hZGRDbGFzcygnZGF5YmxlLW1vZGFsLWV2ZW50cycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheUV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ05vIGV2ZW50cyBmb3IgdGhpcyBkYXknIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYi10b2RheS1yb3cnKTtcbiAgICAgICAgICAgICAgICByb3cuYWRkQ2xhc3MoJ2RheWJsZS1tb2RhbC1ldmVudC1yb3cnKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgIHJvdy5kYXRhc2V0LmlkID0gZXYuaWQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudEVsID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5hZGRDbGFzcygnZGF5YmxlLW1vZGFsLWV2ZW50LWNvbnRlbnQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZUVsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC10aXRsZScgfSk7XG4gICAgICAgICAgICAgICAgdGl0bGVFbC5hZGRDbGFzcygnZGItdGl0bGUnKTtcbiAgICAgICAgICAgICAgICB0aXRsZUVsLmFkZENsYXNzKCdkYXlibGUtZm9udC1tZWRpdW0nKTtcbiAgICAgICAgICAgICAgICB0aXRsZUVsLnN0eWxlLmNvbG9yID0gZXYuY29sb3IgPyAoZXYudGV4dENvbG9yIHx8ICd2YXIoLS10ZXh0LW5vcm1hbCknKSA6ICd2YXIoLS10ZXh0LW5vcm1hbCknO1xuICAgICAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZUVsLCB0aGlzLnZpZXc/LnBsdWdpbj8uYXBwKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBldmVudCBjb2xvcnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy52aWV3Py5wbHVnaW47XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IHBsdWdpbj8uc2V0dGluZ3M/LmV2ZW50Q2F0ZWdvcmllcyA/PyBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGNhdGVnb3JpZXMuZmluZChjID0+IGMuaWQgPT09IGV2LmNhdGVnb3J5SWQpO1xuICAgICAgICAgICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XG4gICAgICAgICAgICAgICAgbGV0IHRleHRDb2xvciA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChldi5jb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gZXYuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb2xvciA9IGV2LnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IoZXYuY29sb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2F0ZWdvcnkgJiYgY2F0ZWdvcnkuYmdDb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gY2F0ZWdvcnkuYmdDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbG9yID0gY2F0ZWdvcnkudGV4dENvbG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYmdDb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcGFjaXR5ID0gcGx1Z2luPy5zZXR0aW5ncz8uZXZlbnRCZ09wYWNpdHkgPz8gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmdiYUNvbG9yID0gaGV4VG9SZ2JhKGJnQ29sb3IsIG9wYWNpdHkpO1xuICAgICAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcmdiYUNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB0aXRsZUVsLnN0eWxlLmNvbG9yID0gdGV4dENvbG9yIHx8IHRpdGxlRWwuc3R5bGUuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmVmZmVjdCAmJiBjYXRlZ29yeS5lZmZlY3QgIT09ICcnKSByb3cuYWRkQ2xhc3MoYGRheWJsZS1lZmZlY3QtJHtjYXRlZ29yeS5lZmZlY3R9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHBsdWdpbj8uc2V0dGluZ3M/Lm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24gJiYgY2F0ZWdvcnkuYW5pbWF0aW9uICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKGBkYXlibGUtYW5pbS0ke2NhdGVnb3J5LmFuaW1hdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uMiAmJiBjYXRlZ29yeS5hbmltYXRpb24yICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKGBkYXlibGUtYW5pbS0ke2NhdGVnb3J5LmFuaW1hdGlvbjJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUVsID0gcm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS10aW1lJyB9KTtcbiAgICAgICAgICAgICAgICB0aW1lRWwuYWRkQ2xhc3MoJ2RiLXRpbWUnKTtcbiAgICAgICAgICAgICAgICB0aW1lRWwuYWRkQ2xhc3MoJ2RheWJsZS10aW1lLWVsLXN0eWxlJyk7XG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggZXZlbnQgdGl0bGUgY29sb3JcbiAgICAgICAgICAgICAgICB0aW1lRWwuc3R5bGUuY29sb3IgPSB0aXRsZUVsLnN0eWxlLmNvbG9yO1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm10ID0gdGhpcy52aWV3Py5wbHVnaW4/LnNldHRpbmdzPy50aW1lRm9ybWF0ID8/ICcyNGgnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFZhbCA9IGV2LnRpbWUgPyBldi50aW1lLnNwbGl0KCctJylbMF0gOiAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzcCA9IGZvcm1hdFRpbWVWYWx1ZShzdGFydFZhbCwgZm10KTtcbiAgICAgICAgICAgICAgICAgICAgdGltZUVsLnRleHRDb250ZW50ID0gZGlzcCB8fCAn4oCUJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV2LmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtZGVzYycgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5hZGRDbGFzcygnZGItZGVzYycpO1xuICAgICAgICAgICAgICAgICAgICBkZXNjRWwuYWRkQ2xhc3MoJ2RheWJsZS1kZXNjLXRleHQnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWF0Y2ggdGl0bGUgY29sb3JcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLnN0eWxlLmNvbG9yID0gdGl0bGVFbC5zdHlsZS5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyTWFya2Rvd24oZXYuZGVzY3JpcHRpb24sIGRlc2NFbCwgdGhpcy52aWV3Py5wbHVnaW4/LmFwcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsIGNvbXBsZXRlZCBpbmRpY2F0b3JcbiAgICAgICAgICAgICAgICBpZiAoZXYuY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlaGF2aW9yID0gdGhpcy52aWV3Py5wbHVnaW4/LnNldHRpbmdzPy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlaGF2aW9yID09PSAnZGltJykgcm93LmFkZENsYXNzKCdkYXlibGUtb3BhY2l0eS02MCcpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ3N0cmlrZXRocm91Z2gnKSB0aXRsZUVsLmFkZENsYXNzKCdkYXlibGUtc3RyaWtldGhyb3VnaCcpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ2hpZGUnKSByb3cuYWRkQ2xhc3MoJ2RheWJsZS1oaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICAgICAgICAgICAgLy8gRHJhZyBoYW5kbGVycyBmb3IgcmVvcmRlcmluZ1xuICAgICAgICAgICAgICAgIHJvdy5vbmRyYWdzdGFydCA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsIGV2LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyKT8uc2V0RGF0YSgnZGF5YmxlLXNvdXJjZScsJ3RvZGF5Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnSW1nID0gcm93LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLWltYWdlLXN0eWxlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gcm93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUocm93KS5ib3JkZXJSYWRpdXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERyYWdJbWFnZShkcmFnSW1nLCBNYXRoLm1pbig4LCByZWN0LndpZHRoIC8gNCksIE1hdGgubWluKDgsIHJlY3QuaGVpZ2h0IC8gNCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKHJvdyBhcyBhbnkpLl9fZHJhZ0ltZyA9IGRyYWdJbWc7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgY29uc29sZS5kZWJ1ZygnW0RheWJsZV0gRHJhZyBpbWFnZSBzZXR1cDonLCBlKTsgfVxuICAgICAgICAgICAgICAgICAgICByb3cuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ2VuZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm93LnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGkgPSAocm93IGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIChyb3cgYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBDbGljayB0byBlZGl0XG4gICAgICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXc/Lm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5kYXRlID8/IHRoaXMuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBSaWdodC1jbGljayBjb250ZXh0IG1lbnVcbiAgICAgICAgICAgICAgICByb3cub25jb250ZXh0bWVudSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0R1cGxpY2F0ZScpLnNldEljb24oJ2NvcHknKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0V2OiBEYXlibGVFdmVudCA9IHsgLi4uZXYsIGlkOiByYW5kb21JZCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuZXZlbnRzLnB1c2gobmV3RXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB2b2lkIHZvaWQgdGhpcy52aWV3Py5yZW5kZXIoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgbWVudS5hZGRJdGVtKGkgPT4gaS5zZXRUaXRsZShldi5jb21wbGV0ZWQgPyAnTWFyayBpbmNvbXBsZXRlJyA6ICdNYXJrIGNvbXBsZXRlJykuc2V0SWNvbignY2hlY2snKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbXBsZXRlZCA9ICFldi5jb21wbGV0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3KSB2b2lkIHRoaXMudmlldy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdm9pZCB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEZWxldGUnKS5zZXRJY29uKCd0cmFzaCcpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB2b2lkIHRoaXMudmlldz8ucmVuZGVyKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnUuc2hvd0F0TW91c2VFdmVudChlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBFbmFibGUgcmVvcmRlcmluZyBpbiB0b2RheSBtb2RhbFxuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3cgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93c0NvdW50ID0gZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93JykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRSb3cgJiYgcm93c0NvdW50ID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0Um93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IHJlY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgaCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFJvdy5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRSb3cpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Um93LmFmdGVyKGluZGljYXRvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJhZ2xlYXZlID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGV2ZW50c0NvbnRhaW5lcikgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBldmVudHNDb250YWluZXIub25kcm9wID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3cgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRSb3cgfHwgdGFyZ2V0Um93ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0Um93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgaCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldFJvdyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Um93LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Um93KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChkcmFnZ2VkRWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQZXJzaXN0IG9yZGVyIGZvciB0aGlzIGRhdGVcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheUlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93JykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlJZHMucHVzaChlaWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWwgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihldiA9PiBldi5kYXRlID09PSBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJzID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSAhPT0gZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlb3JkZXJlZERheSA9IGRheUlkcy5tYXAoaWQgPT4gb3JpZ2luYWwuZmluZChlID0+IGUuaWQgPT09IGlkKSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuZXZlbnRzID0gb3RoZXJzLmNvbmNhdChyZW9yZGVyZWREYXkpO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMudmlldy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMudmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaXhlZCArQWRkIEV2ZW50IGJ1dHRvbiBhdCBib3R0b21cbiAgICAgICAgY29uc3QgYWRkQnRuID0gYy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtdG9kYXktYWRkLWJ0bicsIHRleHQ6ICcrIGFkZCBldmVudCcgfSk7XG4gICAgICAgIGFkZEJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgYWRkQnRuLnN0eWxlLnBhZGRpbmcgPSAnMTBweCc7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgICAgIGFkZEJ0bi5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcbiAgICAgICAgYWRkQnRuLnN0eWxlLmZvbnRXZWlnaHQgPSAnNjAwJztcbiAgICAgICAgYWRkQnRuLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICAgICAgYWRkQnRuLnN0eWxlLm1hcmdpblRvcCA9ICdhdXRvJztcbiAgICAgICAgYWRkQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB2b2lkIHRoaXMudmlldz8ub3BlbkV2ZW50TW9kYWwodW5kZWZpbmVkLCB0aGlzLmRhdGUpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGludGVybmFsIGxpbmsgY2xpY2tzIGluc2lkZSB0b2RheSBtb2RhbCBjb250ZW50XG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhID0gKGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgaWYgKCFhKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCB3aWtpID0gYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xuICAgICAgICAgICAgaWYgKHdpa2kpIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb25zdCB0aXRsZSA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdTdG9yYWdlIGZvbGRlciBub3Qgc2V0JyB9KTtcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RheWJsZS1tb2RhbC10aXRsZScpO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdZb3UgbmVlZCB0byBzZXQgYSBzdG9yYWdlIGZvbGRlciB0byBjcmVhdGUgYW5kIHNhdmUgZXZlbnRzLicgfSk7XG4gICAgICAgIGNvbnN0IGJ0bnMgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLWFjdGlvbnMnIH0pO1xuICAgICAgICBjb25zdCBvcGVuU2V0dGluZ3NCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nIH0pO1xuICAgICAgICBvcGVuU2V0dGluZ3NCdG4uc2V0VGV4dCgnT3BlbiBzZXR0aW5ncycpO1xuICAgICAgICBvcGVuU2V0dGluZ3NCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7IFxuICAgICAgICAgICAgICAgIGNvbnN0IHMgPSAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nO1xuICAgICAgICAgICAgICAgIHM/Lm9wZW4/LigpO1xuICAgICAgICAgICAgICAgIHM/Lm9wZW5UYWJCeUlkPy4oJ2RheWJsZS1jYWxlbmRhcicpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBPcGVuIHNldHRpbmdzOicsIGUpOyB9XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNsb3NlQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcbiAgICAgICAgY2xvc2VCdG4uc2V0VGV4dCgnQ2xvc2UnKTtcbiAgICAgICAgY2xvc2VCdG4ub25jbGljayA9ICgpID0+IHRoaXMuY2xvc2UoKTtcbiAgICB9XG59XG5cbmNsYXNzIENvbmZpcm1Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgb25Db25maXJtOiAoKSA9PiB2b2lkO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtZXNzYWdlOiBzdHJpbmcsIG9uQ29uZmlybTogKCkgPT4gdm9pZCkge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLm9uQ29uZmlybSA9IG9uQ29uZmlybTtcbiAgICB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgYy5hZGRDbGFzcygnZGF5YmxlLWNvbmZpcm0tY29udGVudCcpO1xuICAgICAgICBjb25zdCBtc2cgPSBjLmNyZWF0ZUVsKCdkaXYnKTtcbiAgICAgICAgbXNnLnRleHRDb250ZW50ID0gdGhpcy5tZXNzYWdlO1xuICAgICAgICBjb25zdCByb3cgPSBjLmNyZWF0ZURpdigpO1xuICAgICAgICByb3cuYWRkQ2xhc3MoJ2RheWJsZS1tb2RhbC1yb3ctZW5kJyk7XG4gICAgICAgIGNvbnN0IGNhbmNlbCA9IHJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcbiAgICAgICAgY2FuY2VsLnRleHRDb250ZW50ID0gJ0NhbmNlbCc7XG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgICAgICBjb25zdCBvayA9IHJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIG1vZC1jdGEnIH0pO1xuICAgICAgICBvay50ZXh0Q29udGVudCA9ICdEZWxldGUnO1xuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4geyB0cnkgeyB0aGlzLm9uQ29uZmlybSgpOyB9IGZpbmFsbHkgeyB0aGlzLmNsb3NlKCk7IH0gfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEljb25JZHNTYWZlKCk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbnlPYiA9ICh3aW5kb3cgYXMgYW55KS5vYnNpZGlhbjtcbiAgICBjb25zdCBpZHNGbiA9IGFueU9iPy5nZXRJY29uSWRzO1xuICAgIGlmICh0eXBlb2YgaWRzRm4gPT09ICdmdW5jdGlvbicpIHJldHVybiBpZHNGbigpO1xuICAgIHJldHVybiBbJ2NhbGVuZGFyJywnY2xvY2snLCdzdGFyJywnYm9va21hcmsnLCdmbGFnJywnYmVsbCcsJ2NoZWNrJywncGVuY2lsJywnYm9vaycsJ3phcCddO1xufVxuXG5mdW5jdGlvbiBjaG9vc2VUZXh0Q29sb3IoaGV4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJnYiA9IGhleFRvUmdiKGhleCk7XG4gICAgaWYgKCFyZ2IpIHJldHVybiAndmFyKC0tdGV4dC1ub3JtYWwpJztcbiAgICBjb25zdCB5aXEgPSAoKHJnYi5yKjI5OSkrKHJnYi5nKjU4NykrKHJnYi5iKjExNCkpLzEwMDA7XG4gICAgcmV0dXJuIHlpcSA+PSAxMjggPyAnIzAwMDAwMCcgOiAnI2ZmZmZmZic7XG59XG5cbmZ1bmN0aW9uIGhleFRvUmdiKGhleDogc3RyaW5nKToge3I6bnVtYmVyLGc6bnVtYmVyLGI6bnVtYmVyfXxudWxsIHtcbiAgICBjb25zdCBtID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gICAgcmV0dXJuIG0gPyB7IHI6IHBhcnNlSW50KG1bMV0sMTYpLCBnOiBwYXJzZUludChtWzJdLDE2KSwgYjogcGFyc2VJbnQobVszXSwxNikgfSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGhleFRvUmdiYShoZXg6IHN0cmluZywgYWxwaGE6IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IoaGV4KTtcbiAgICBpZiAoIXJnYikgcmV0dXJuIGhleDtcbiAgICByZXR1cm4gYHJnYmEoJHtyZ2Iucn0sICR7cmdiLmd9LCAke3JnYi5ifSwgJHthbHBoYX0pYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZVZhbHVlKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZtdDogJzI0aCcgfCAnMTJoJyk6IHN0cmluZyB7XG4gICAgaWYgKCF2YWx1ZSkgcmV0dXJuICcnO1xuICAgIGNvbnN0IFtoaFN0ciwgbW1TdHJdID0gdmFsdWUuc3BsaXQoJzonKTtcbiAgICBjb25zdCBoaCA9IHBhcnNlSW50KGhoU3RyIHx8ICcwJywgMTApO1xuICAgIGNvbnN0IG1tID0gcGFyc2VJbnQobW1TdHIgfHwgJzAnLCAxMCk7XG4gICAgaWYgKGZtdCA9PT0gJzEyaCcpIHtcbiAgICAgICAgY29uc3QgaXNQTSA9IGhoID49IDEyO1xuICAgICAgICBjb25zdCBoMTIgPSAoKGhoICUgMTIpIHx8IDEyKTtcbiAgICAgICAgcmV0dXJuIGAke2gxMn06JHtTdHJpbmcobW0pLnBhZFN0YXJ0KDIsICcwJyl9ICR7aXNQTSA/ICdQTScgOiAnQU0nfWA7XG4gICAgfVxuICAgIHJldHVybiBgJHtTdHJpbmcoaGgpLnBhZFN0YXJ0KDIsICcwJyl9OiR7U3RyaW5nKG1tKS5wYWRTdGFydCgyLCAnMCcpfWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRpbWVSYW5nZShyYW5nZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmbXQ6ICcyNGgnIHwgJzEyaCcpOiBzdHJpbmcge1xuICAgIGlmICghcmFuZ2UpIHJldHVybiAnJztcbiAgICBjb25zdCBwYXJ0cyA9IHJhbmdlLnNwbGl0KCctJyk7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBjb25zdCBzID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xuICAgICAgICBjb25zdCBlID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzFdLCBmbXQpO1xuICAgICAgICBpZiAocyAmJiBlKSByZXR1cm4gYCR7c30tJHtlfWA7XG4gICAgICAgIHJldHVybiBzIHx8IGUgfHwgJyc7XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXRUaW1lVmFsdWUocGFydHNbMF0sIGZtdCk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlck1hcmtkb3duKHRleHQ6IHN0cmluZywgZWxlbWVudDogSFRNTEVsZW1lbnQsIGFwcD86IEFwcCk6IHZvaWQge1xuICAgIC8vIFNpbXBsZSBtYXJrZG93biByZW5kZXJpbmc6IGhlYWRpbmdzLCBib2xkLCBpdGFsaWMsIGxpbmtzLCBjb2RlLCBzdHJpa2V0aHJvdWdoLCBoaWdobGlnaHQsIGJsb2NrcXVvdGUsIGltYWdlc1xuICAgIC8vIE5PVEU6IFdlIGRvIE5PVCBlc2NhcGUgSFRNTCB0byBhbGxvdyB1c2VycyB0byB1c2UgSFRNTCB0YWdzIGRpcmVjdGx5IChlLmcuLCA8dT51bmRlcmxpbmU8L3U+KVxuICAgIGxldCBodG1sID0gdGV4dFxuICAgICAgICAvLyBPYnNpZGlhbiB3aWtpLXN0eWxlIGltYWdlcyAhW1tpbWFnZS5wbmddXVxuICAgICAgICAucmVwbGFjZSgvIVxcW1xcWyhbXlxcXV0rKVxcXVxcXS9nLCAobWF0Y2gsIGZpbGVuYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbWFnZVVybCA9IGFwcCA/IHJlc29sdmVJbWFnZVBhdGgoZmlsZW5hbWUsIGFwcCkgOiBmaWxlbmFtZTtcbiAgICAgICAgICAgIHJldHVybiBgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cIiR7ZmlsZW5hbWV9XCIgY2xhc3M9XCJkYXlibGUtZW1iZWQtaW1hZ2VcIj5gO1xuICAgICAgICB9KVxuICAgICAgICAvLyBNYXJrZG93biBpbWFnZXMgIVthbHRdKHVybClcbiAgICAgICAgLnJlcGxhY2UoLyFcXFsoW15cXF1dKilcXF1cXCgoW14pXSspXFwpL2csIChtYXRjaCwgYWx0LCBzcmMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlVXJsID0gYXBwID8gcmVzb2x2ZUltYWdlUGF0aChzcmMsIGFwcCkgOiBzcmM7XG4gICAgICAgICAgICByZXR1cm4gYDxpbWcgc3JjPVwiJHtpbWFnZVVybH1cIiBhbHQ9XCIke2FsdH1cIiBjbGFzcz1cImRheWJsZS1lbWJlZC1pbWFnZVwiPmA7XG4gICAgICAgIH0pXG4gICAgICAgIC8vIEhlYWRpbmdzICMuLiMjIyMjI1xuICAgICAgICAucmVwbGFjZSgvXiMjIyMjI1xccysoLispJC9nbSwgJzxoNj4kMTwvaDY+JylcbiAgICAgICAgLnJlcGxhY2UoL14jIyMjI1xccysoLispJC9nbSwgJzxoNT4kMTwvaDU+JylcbiAgICAgICAgLnJlcGxhY2UoL14jIyMjXFxzKyguKykkL2dtLCAnPGg0PiQxPC9oND4nKVxuICAgICAgICAucmVwbGFjZSgvXiMjI1xccysoLispJC9nbSwgJzxoMz4kMTwvaDM+JylcbiAgICAgICAgLnJlcGxhY2UoL14jI1xccysoLispJC9nbSwgJzxoMj4kMTwvaDI+JylcbiAgICAgICAgLnJlcGxhY2UoL14jXFxzKyguKykkL2dtLCAnPGgxPiQxPC9oMT4nKVxuICAgICAgICAvLyBCb2xkICoqdGV4dCoqIGFuZCBfX3RleHRfX1xuICAgICAgICAucmVwbGFjZSgvXFwqXFwqKC4rPylcXCpcXCovZywgJzxzdHJvbmc+JDE8L3N0cm9uZz4nKVxuICAgICAgICAucmVwbGFjZSgvX18oLis/KV9fL2csICc8c3Ryb25nPiQxPC9zdHJvbmc+JylcbiAgICAgICAgLy8gSXRhbGljICp0ZXh0KiBhbmQgX3RleHRfXG4gICAgICAgIC5yZXBsYWNlKC9cXCooLis/KVxcKi9nLCAnPGVtPiQxPC9lbT4nKVxuICAgICAgICAucmVwbGFjZSgvXyguKz8pXy9nLCAnPGVtPiQxPC9lbT4nKVxuICAgICAgICAvLyBTdHJpa2V0aHJvdWdoIH5+dGV4dH5+XG4gICAgICAgIC5yZXBsYWNlKC9+figuKz8pfn4vZywgJzxkZWw+JDE8L2RlbD4nKVxuICAgICAgICAvLyBIaWdobGlnaHQgPT10ZXh0PT1cbiAgICAgICAgLnJlcGxhY2UoLz09KC4rPyk9PS9nLCAnPG1hcms+JDE8L21hcms+JylcbiAgICAgICAgLy8gQmxvY2txdW90ZSBsaW5lcyBzdGFydGluZyB3aXRoID5cbiAgICAgICAgLnJlcGxhY2UoL14mZ3Q7WyBcXHRdKiguKykkL2dtLCAnPGJsb2NrcXVvdGU+JDE8L2Jsb2NrcXVvdGU+JylcbiAgICAgICAgLy8gQ29kZSBgdGV4dGAgYW5kIGBgYGJsb2Nrc2BgYFxuICAgICAgICAucmVwbGFjZSgvYChbXmBdKylgL2csICc8Y29kZSBjbGFzcz1cImRheWJsZS1pbmxpbmUtY29kZVwiPiQxPC9jb2RlPicpXG4gICAgICAgIC5yZXBsYWNlKC9gYGAoW1xcc1xcU10qPylgYGAvZywgJzxwcmUgY2xhc3M9XCJkYXlibGUtY29kZS1ibG9ja1wiPjxjb2RlPiQxPC9jb2RlPjwvcHJlPicpXG4gICAgICAgIC8vIExpbmtzIFtbdGFyZ2V0fGFsaWFzXV0gYW5kIFt0ZXh0XSh1cmwpXG4gICAgICAgIC5yZXBsYWNlKC9cXFtcXFsoW15cXFtcXF1dKylcXF1cXF0vZywgKG0sIGlubmVyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFN0cmluZyhpbm5lcikuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3QgYWxpYXMgPSBwYXJ0c1sxXSB8fCBwYXJ0c1swXTtcbiAgICAgICAgICAgIHJldHVybiBgPGEgY2xhc3M9XCJpbnRlcm5hbC1saW5rIGRheWJsZS1pbnRlcm5hbC1saW5rXCIgZGF0YS1ocmVmPVwiJHt0YXJnZXR9XCI+JHthbGlhc308L2E+YDtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKChbXildKylcXCkvZywgJzxhIGhyZWY9XCIkMlwiIGNsYXNzPVwiZGF5YmxlLWV4dGVybmFsLWxpbmtcIj4kMTwvYT4nKVxuICAgICAgICAvLyBMaW5lIGJyZWFrc1xuICAgICAgICAucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgXG4gICAgY29uc3QgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIHJhbmdlLnNlbGVjdE5vZGVDb250ZW50cyhlbGVtZW50KTtcbiAgICBlbGVtZW50LnJlcGxhY2VDaGlsZHJlbihyYW5nZS5jcmVhdGVDb250ZXh0dWFsRnJhZ21lbnQoaHRtbCkpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW1hZ2VQYXRoKGltYWdlUGF0aDogc3RyaW5nLCBhcHA6IEFwcCk6IHN0cmluZyB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKGltYWdlUGF0aCB8fCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XG4gICAgY29uc3QgYnlQYXRoID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFyZ2V0KTtcbiAgICBpZiAoYnlQYXRoICYmIGJ5UGF0aCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gYXBwLnZhdWx0LmdldFJlc291cmNlUGF0aChieVBhdGgpO1xuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XG4gICAgY29uc3QgZXh0VGFyZ2V0ID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XG4gICAgY29uc3QgZm91bmQgPSBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aCh0YXJnZXQpKVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IGV4dFRhcmdldClcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgoYCR7ZXh0VGFyZ2V0fS5tZGApKTtcbiAgICBpZiAoZm91bmQpIHJldHVybiBhcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGZvdW5kKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTm90ZUZpbGUoYXBwOiBBcHAsIGxpbmt0ZXh0OiBzdHJpbmcpOiBURmlsZSB8IG51bGwge1xuICAgIGNvbnN0IHJhdyA9IFN0cmluZyhsaW5rdGV4dCB8fCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XG4gICAgY29uc3Qgd2l0aG91dE1kID0gdGFyZ2V0LmVuZHNXaXRoKCcubWQnKSA/IHRhcmdldC5zbGljZSgwLCAtMykgOiB0YXJnZXQ7XG4gICAgY29uc3QgYnlQYXRoID0gYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFyZ2V0KTtcbiAgICBpZiAoYnlQYXRoICYmIGJ5UGF0aCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gYnlQYXRoO1xuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XG4gICAgY29uc3QgZm91bmQgPSBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aCh0YXJnZXQpKVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYuYmFzZW5hbWUgPT09IHdpdGhvdXRNZClcbiAgICAgICAgfHwgZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgoYCR7d2l0aG91dE1kfS5tZGApKTtcbiAgICByZXR1cm4gZm91bmQgfHwgbnVsbDtcbn1cblxuY2xhc3MgRGF5YmxlU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW47XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW4pIHsgc3VwZXIoYXBwLCBwbHVnaW4pOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfVxuICAgIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgICAgIDtcblxuICAgICAgICAvLyBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdHZW5lcmFsJyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnV2VlayBzdGFydCBkYXknKVxuICAgICAgICAgICAgLnNldERlc2MoJ0ZpcnN0IGRheSBvZiB0aGUgd2VlaycpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJzAnLCAnU3VuZGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignMScsICdNb25kYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcyJywgJ1R1ZXNkYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCczJywgJ1dlZG5lc2RheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzQnLCAnVGh1cnNkYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCc1JywgJ0ZyaWRheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzYnLCAnU2F0dXJkYXknKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSkpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSA9IHBhcnNlSW50KHYsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnU3RvcmFnZSBmb2xkZXInKVxuICAgICAgICAgICAgLnNldERlc2MoJ0ZvbGRlciB0byBzdG9yZSBjYWxlbmRhciBldmVudHMuIERhdGEgaXMgc3RvcmVkIGluIEpTT04gZmlsZXMuJylcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKSA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgOiAnVW5zZXQnKVxuICAgICAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWxsRm9sZGVycygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmID0+IGYucGF0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc29ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VnZ2VzdCA9IG5ldyAoRnV6enlTdWdnZXN0TW9kYWwgYXMgYW55KSh0aGlzLmFwcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0LnNldFBsYWNlaG9sZGVyKCdTZWxlY3Qgc3RvcmFnZSBmb2xkZXIuLi4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3QuZ2V0U3VnZ2VzdGlvbnMgPSAocTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFxKSByZXR1cm4gZm9sZGVycztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9sZGVycy5maWx0ZXIoZiA9PiBmLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5yZW5kZXJTdWdnZXN0aW9uID0gKGZvbGRlcjogc3RyaW5nLCBlbDogSFRNTEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRUZXh0KGZvbGRlciB8fCAnKFZhdWx0IHJvb3QpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5vbkNob29zZVN1Z2dlc3Rpb24gPSBhc3luYyAoZm9sZGVyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyID0gZm9sZGVyIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuc3VyZUVudHJpZXNGb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA6ICdVbnNldCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ1RpbWUgZm9ybWF0JylcbiAgICAgICAgICAgIC5zZXREZXNjKCdEaXNwbGF5IHRpbWVzIGluIDI0aCBvciAxMmggZm9ybWF0JylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignMjRoJywgJzI0LWhvdXInKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcxMmgnLCAnMTItaG91cicpXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lRm9ybWF0ID8/ICcyNGgnKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lRm9ybWF0ID0gdiBhcyBcIjI0aFwiIHwgXCIxMmhcIiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnQXBwZWFyYW5jZScpLnNldEhlYWRpbmcoKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdJY29uIHBsYWNlbWVudCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnUG9zaXRpb24gb2YgZXZlbnQgaWNvbicpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdOb25lJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndG9wJywgJ1RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AtbGVmdCcsICdUb3AgbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RvcC1yaWdodCcsICdUb3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPSB2IGFzIFwibm9uZVwiIHwgXCJsZWZ0XCIgfCBcInRvcFwiIHwgXCJyaWdodFwiIHwgXCJ0b3AtbGVmdFwiIHwgXCJ0b3AtcmlnaHRcIiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCB0aXRsZSBhbGlnbm1lbnQnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0FsaWdubWVudCBvZiBldmVudCB0aXRsZXMnKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdsZWZ0JywgJ0xlZnQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdjZW50ZXInLCAnQ2VudGVyJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmlnaHQnLCAnUmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRUaXRsZUFsaWduID8/ICdsZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRUaXRsZUFsaWduID0gdiBhcyBcImNlbnRlclwiIHwgXCJsZWZ0XCIgfCBcInJpZ2h0XCIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGRlc2NyaXB0aW9uIGFsaWdubWVudCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnQWxpZ25tZW50IG9mIGV2ZW50IGRlc2NyaXB0aW9ucycpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2NlbnRlcicsICdDZW50ZXInKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdyaWdodCcsICdSaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudERlc2NBbGlnbiA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50RGVzY0FsaWduID0gdiBhcyBcImNlbnRlclwiIHwgXCJsZWZ0XCIgfCBcInJpZ2h0XCIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJhY2tncm91bmQgb3BhY2l0eScpXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIHRyYW5zcGFyZW5jeSBvZiBldmVudCBiYWNrZ3JvdW5kcy4nKVxuICAgICAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDEsIDAuMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgYm9yZGVyIHRoaWNrbmVzcycpXG4gICAgICAgICAgICAuc2V0RGVzYygnQ29udHJvbHMgZXZlbnQgYm9yZGVyIHRoaWNrbmVzcyAoMC01cHgpJylcbiAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgNSwgMC41KVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA/PyAyKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgYm9yZGVyIG9wYWNpdHknKVxuICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIGJvcmRlciBjb2xvciBvcGFjaXR5IGZvciBjb2xvcmVkIGV2ZW50cyAoMC0xKScpXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xuICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDEsIDAuMSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyT3BhY2l0eSA/PyAxKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlck9wYWNpdHkgPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2b2lkIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgcmFkaXVzJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBldmVudCBjb3JuZXIgcm91bmRuZXNzIChweCknKVxuICAgICAgICAgICAgLmFkZFNsaWRlcihzID0+IHtcbiAgICAgICAgICAgICAgICBzLnNldExpbWl0cygwLCAyNCwgMSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDYpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0NvbXBsZXRlZCBldmVudCBkaXNwbGF5JylcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygnSG93IGNvbXBsZXRlZCBldmVudHMgYXBwZWFyJylcbiAgICAgICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdub25lJywgJ05vIGNoYW5nZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdkaW0nLCAnRGltJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3N0cmlrZXRocm91Z2gnLCAnU3RyaWtldGhyb3VnaCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdoaWRlJywgJ0hpZGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlQmVoYXZpb3IgPz8gJ25vbmUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlQmVoYXZpb3IgPSB2IGFzIFwibm9uZVwiIHwgXCJoaWRlXCIgfCBcImRpbVwiIHwgXCJzdHJpa2V0aHJvdWdoXCIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKGBPbmx5IGFuaW1hdGUgdG9kYXkncyBldmVudHNgKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdTdG9wIGFuaW1hdGlvbiBmb3IgYWxsIGV2ZW50cyBleGNlcHQgdG9kYXknKVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mub25seUFuaW1hdGVUb2RheSA/PyBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0hvbGRlciBwbGFjZW1lbnQnKVxuICAgICAgICAgICAgLnNldERlc2MoJ1BsYWNlIHRoZSBob2xkZXIgdG9nZ2xlIChsZWZ0LCByaWdodCwgb3IgaGlkZGVuKScpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaGlkZGVuJywgJ0hpZGRlbicpXG4gICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJQbGFjZW1lbnQgPz8gJ2xlZnQnKVxuICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA9IHYgYXMgXCJsZWZ0XCIgfCBcInJpZ2h0XCIgfCBcImhpZGRlblwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNvbnRhaW5lciBhbmQgcmVidWlsZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5jb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCB2aWV3Lm9uT3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRW5hYmxlIHdlZWtseSBub3RlcycpXG4gICAgICAgICAgICAuc2V0RGVzYygnU2hvdyBhIE1hcmtkb3duIG5vdGVzIHNlY3Rpb24gYmVsb3cgdGhlIGNhbGVuZGFyIGluIHdlZWtseSB2aWV3JylcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQgPz8gZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtseU5vdGVzRW5hYmxlZCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnTWF4IGRheSBjZWxsIGhlaWdodCAocHgpJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdJZiBzZXQsIGRheSBjZWxscyBjYXAgYXQgdGhpcyBoZWlnaHQgYW5kIGV2ZW50cyBzY3JvbGwgdmVydGljYWxseScpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0LnNldFBsYWNlaG9sZGVyKCcwIChkaXNhYmxlZCknKTtcbiAgICAgICAgICAgICAgICB0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlDZWxsTWF4SGVpZ2h0ID8/IDApKTtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludCh2IHx8ICcwJywgMTApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlDZWxsTWF4SGVpZ2h0ID0gaXNOYU4obnVtKSA/IDAgOiBNYXRoLm1heCgwLCBudW0pO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICh0LmlucHV0RWwpLnR5cGUgPSAnbnVtYmVyJztcbiAgICAgICAgICAgICAgICAodC5pbnB1dEVsKS5taW4gPSAnMCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdDb2xvciBzd2F0Y2ggcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdQb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBldmVudCBtb2RhbCcpXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbigndW5kZXItdGl0bGUnLCAnVW5kZXIgdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndW5kZXItZGVzY3JpcHRpb24nLCAnVW5kZXIgZGVzY3JpcHRpb24nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdEbyBub3Qgc2hvdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29sb3JTd2F0Y2hQb3NpdGlvbiA/PyAndW5kZXItdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbG9yU3dhdGNoUG9zaXRpb24gPSB2IGFzIFwibm9uZVwiIHwgXCJ1bmRlci10aXRsZVwiIHwgXCJ1bmRlci1kZXNjcmlwdGlvblwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN3YXRjaGVzU2VjdGlvblRvcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuICAgICAgICBuZXcgU2V0dGluZyhzd2F0Y2hlc1NlY3Rpb25Ub3ApLnNldE5hbWUoJ0NvbG9ycycpLnNldEhlYWRpbmcoKTtcbiAgICAgICAgY29uc3QgY29sb3JzTGlzdFRvcCA9IHN3YXRjaGVzU2VjdGlvblRvcC5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyQ29sb3JzVG9wID0gKCkgPT4ge1xuICAgICAgICAgICAgY29sb3JzTGlzdFRvcC5lbXB0eSgpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY29sb3JzTGlzdFRvcC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHJvdy5hZGRDbGFzcygnZGF5YmxlLXNldHRpbmdzLWNvbG9ycy1yb3cnKTtcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnLCBzb3VyY2U6ICdidWlsdCcgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3QgY3VzdG9tcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnLCBzb3VyY2U6ICdjdXN0b20nIGFzIGNvbnN0IH0pKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbWJpbmVkOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yOiBzdHJpbmcsIHNvdXJjZTogJ2J1aWx0J3wnY3VzdG9tJyB9W10gPSBbLi4uYnVpbHQsIC4uLmN1c3RvbXNdO1xuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH0sIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd3JhcCA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICB3cmFwLmFkZENsYXNzKCdkYXlibGUtZmxleC1jZW50ZXItZ2FwJyk7XG4gICAgICAgICAgICAgICAgd3JhcC5zZXRBdHRyKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5zb3VyY2UgPSBlbnRyeS5zb3VyY2U7XG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LmluZGV4ID0gU3RyaW5nKGlkeCk7XG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0Lm5hbWUgPSBlbnRyeS5uYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHRQaWNrZXIgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLnZhbHVlID0gZW50cnkudGV4dENvbG9yIHx8ICcjZmZmZmZmJztcbiAgICAgICAgICAgICAgICBjb25zdCBiZ1BpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xuICAgICAgICAgICAgICAgIGJnUGlja2VyLnZhbHVlID0gZW50cnkuY29sb3I7XG4gICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlQWxsID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2QnVpbHRBcnIgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2Q3VzdG9tQXJyID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfHwgJycgfSkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICgodyBhcyBhbnkpLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHggPSAoKHcgYXMgYW55KS5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVswXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvck1hcDogUmVjb3JkPHN0cmluZywgeyBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcmV2QnVpbHRBcnIubGVuZ3RoICYmIGkgPCBuZXdCdWlsdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHByZXZCdWlsdEFycltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ld0J1aWx0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXYuY29sb3IgIT09IG5vdy5jb2xvciB8fCAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobm93LnRleHRDb2xvciB8fCAnJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvck1hcFtwcmV2LmNvbG9yXSA9IHsgY29sb3I6IG5vdy5jb2xvciwgdGV4dENvbG9yOiBub3cudGV4dENvbG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcmV2Q3VzdG9tQXJyLmxlbmd0aCAmJiBpIDwgbmV3Q3VzdG9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkN1c3RvbUFycltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ld0N1c3RvbVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2LmNvbG9yICE9PSBub3cuY29sb3IgfHwgKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5vdy50ZXh0Q29sb3IgfHwgJycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbcHJldi5jb2xvcl0gPSB7IGNvbG9yOiBub3cuY29sb3IsIHRleHRDb2xvcjogbm93LnRleHRDb2xvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRUcmlnZ2VycyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXSkubWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHQuY29sb3IgJiYgY29sb3JNYXBbdC5jb2xvcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXBwZWQgPSBjb2xvck1hcFt0LmNvbG9yXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyAuLi50LCBjb2xvcjogbWFwcGVkLmNvbG9yLCB0ZXh0Q29sb3I6IG1hcHBlZC50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG1hcHBlZC5jb2xvcikgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHVwZGF0ZWRUcmlnZ2VycztcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCeU5hbWUgPSBuZXcgTWFwPHN0cmluZywgeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9PigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldkJ1aWx0QXJyLmZvckVhY2gocyA9PiBwcmV2QnlOYW1lLnNldChzLm5hbWUsIHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlydHkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1aWx0LmZvckVhY2gobmIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnlOYW1lLmdldChuYi5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXYpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvckNoYW5nZWQgPSBwcmV2LmNvbG9yICE9PSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0Q2hhbmdlZCA9IChwcmV2LnRleHRDb2xvciB8fCAnJykgIT09IChuYi50ZXh0Q29sb3IgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29sb3JDaGFuZ2VkICYmICF0ZXh0Q2hhbmdlZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBoZXhUb1JnYmEobmIuY29sb3IsIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChgLmRheWJsZS1ldmVudFtkYXRhLWNvbG9yPVwiJHtwcmV2LmNvbG9yfVwiXWApLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoID0gZWwgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYmctY29sb3InLCByZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC10ZXh0LWNvbG9yJywgbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmRhdGFzZXQuY29sb3IgPSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuZXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbG9yID0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuaG9sZGVyRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbG9yID0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlbmRlclRyaWdnZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xuICAgICAgICAgICAgICAgIGJnUGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xuICAgICAgICAgICAgICAgIGRlbC5hZGRDbGFzcygnZGF5YmxlLWJ0bi1pbmxpbmUtZGVsJyk7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihkZWwsICd4Jyk7XG4gICAgICAgICAgICAgICAgZGVsLnNldEF0dHIoJ2RyYWdnYWJsZScsJ2ZhbHNlJyk7XG4gICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBkZWwub250b3VjaHN0YXJ0ID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyYXAucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGRhdGVBbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgbW9kYWwub3BlbigpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd3JhcC5vbmRyYWdzdGFydCA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsICdkcmFnJyk7XG4gICAgICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlcikuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJvdy5vbmRyYWdvdmVyID0gZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgfTtcbiAgICAgICAgICAgICAgICByb3cub25kcm9wID0gYXN5bmMgZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQucGFyZW50RWxlbWVudCAhPT0gcm93KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IChlLmNsaWVudFggLSByZWN0LmxlZnQpIDwgcmVjdC53aWR0aCAvIDI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHJvdy5pbnNlcnRCZWZvcmUod3JhcCwgdGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUFsbCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29tYmluZWQuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4geyBtYWtlSXRlbShlbnRyeSwgaWR4KTsgfSk7XG4gICAgICAgICAgICBjb25zdCBjb250cm9sc0JvdHRvbSA9IG5ldyBTZXR0aW5nKGNvbG9yc0xpc3RUb3ApO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uc2V0dGluZ0VsLmFkZENsYXNzKCdkYXlibGUtY29sb3JzLWNvbnRyb2xzJyk7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuYWRkQ2xhc3MoJ2RheWJsZS1zZXR0aW5ncy1jb250cm9scycpO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnUmVzZXQgdG8gZGVmYXVsdCBjb2xvcnMnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnUmVzZXQgY29sb3Igc3dhdGNoZXMgdG8gZGVmYXVsdD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IChERUZBVUxUX1NFVFRJTkdTLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IChzIGFzIGFueSkudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgbW9kYWwub3BlbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIGFkZCBjb2xvcicpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgICAgICB3cmFwLmFkZENsYXNzKCdkYXlibGUtc2V0dGluZ3MtY29sb3ItaXRlbScpO1xuICAgICAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5zb3VyY2UgPSAnY3VzdG9tJztcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0Lm5hbWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dFBpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0UGlja2VyLnZhbHVlID0gJyNmZmZmZmYnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZ1BpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xuICAgICAgICAgICAgICAgICAgICBiZ1BpY2tlci52YWx1ZSA9ICcjZmYwMDAwJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsID0gd3JhcC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRiLWNvbG9yLWRlbCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRlbC5hZGRDbGFzcygnZGF5YmxlLWJ0bi1pbmxpbmUtZGVsJyk7XG4gICAgICAgICAgICAgICAgICAgIHNldEljb24oZGVsLCAneCcpO1xuICAgICAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUFsbCA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCdWlsdEFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yc0xpc3RUb3AucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICgodyBhcyBhbnkpLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4ID0gKCh3IGFzIGFueSkucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImNvbG9yXCJdJylbMF0gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2J1aWx0JykgbmV3QnVpbHQucHVzaCh7IG5hbWU6IG5tLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldkJ1aWx0QXJyLmZvckVhY2gocyA9PiBwcmV2QnlOYW1lLnNldChzLm5hbWUsIHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVpbHQuZm9yRWFjaChuYiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnlOYW1lLmdldChuYi5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBwcmV2LmNvbG9yICE9PSBuYi5jb2xvciB8fCAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobmIudGV4dENvbG9yIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGFuZ2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBoZXhUb1JnYmEobmIuY29sb3IsIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1jb2xvcj1cIiR7cHJldi5jb2xvcn1cIl1gKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGggPSBlbCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYmctY29sb3InLCByZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguZGF0YXNldC5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5ldmVudHMuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LnRleHRDb2xvciA9IG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuaG9sZGVyRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29sb3IgPSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHRleHRQaWNrZXIub25jaGFuZ2UgPSB1cGRhdGVBbGw7XG4gICAgICAgICAgICAgICAgICAgIGJnUGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xuICAgICAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ0RlbGV0ZSB0aGlzIGNvbG9yIHN3YXRjaD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGRhdGVBbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCBtb2RhbC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVuZGVyQ29sb3JzVG9wKCk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdFdmVudCBjYXRlZ29yaWVzJykuc2V0SGVhZGluZygpO1xuICAgICAgICBjb25zdCBydWxlc1dyYXAgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyUnVsZXMgPSAoKSA9PiB7XG4gICAgICAgICAgICBydWxlc1dyYXAuZW1wdHkoKTtcbiAgICAgICAgICAgICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmZvckVhY2goKGNhdGVnb3J5OiBFdmVudENhdGVnb3J5KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gbmV3IFNldHRpbmcocnVsZXNXcmFwKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIGxlZnQtc2lkZSBzZXR0aW5nIHRpdGxlIGVsZW1lbnRcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZXR0aW5nLWl0ZW0tbmFtZScpPy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmFkZENsYXNzKCdkYXlibGUtc2V0dGluZ3MtY2F0ZWdvcnktcm93Jyk7XG4gICAgICAgICAgICAgICAgcm93LmNvbnRyb2xFbC5hZGRDbGFzcygnZGF5YmxlLXNldHRpbmdzLWNhdGVnb3J5LWNvbnRyb2wnKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLWNhdGVnb3J5LXJvdycpO1xuICAgICAgICAgICAgICAgIC8vIEljb24gYnV0dG9uXG4gICAgICAgICAgICAgICAgcm93LmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwpLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1idG4nLCdkYXlibGUtaWNvbi1hZGQnLCdkYi1idG4nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbihiLmJ1dHRvbkVsLCBjYXRlZ29yeS5pY29uID8/ICdwbHVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGIub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBhc3luYyAoaWNvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5Lmljb24gPSBpY29uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5Lmljb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgcGlja2VyLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gQ2F0ZWdvcnkgbmFtZSBpbnB1dFxuICAgICAgICAgICAgICAgIHJvdy5hZGRUZXh0KHQgPT4geyB0LnNldFZhbHVlKGNhdGVnb3J5Lm5hbWUpLm9uQ2hhbmdlKHYgPT4geyBjYXRlZ29yeS5uYW1lID0gdjsgfSk7ICh0LmlucHV0RWwpLmNsYXNzTGlzdC5hZGQoJ2RiLWlucHV0JywnZGItY2F0ZWdvcnktbmFtZScpOyB9KTtcbiAgICAgICAgICAgICAgICAvLyBUZXh0IGNvbG9yIGZpcnN0XG4gICAgICAgICAgICAgICAgcm93LmFkZENvbG9yUGlja2VyKGNwID0+IHsgY3Auc2V0VmFsdWUoY2F0ZWdvcnkudGV4dENvbG9yKS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LnRleHRDb2xvciA9IHY7IFxuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pOyAoY3AgYXMgYW55KS5pbnB1dEVsPy5jbGFzc0xpc3Q/LmFkZCgnZGItY29sb3InLCdkYi10ZXh0LWNvbG9yJyk7IH0pO1xuICAgICAgICAgICAgICAgIC8vIEJhY2tncm91bmQgY29sb3IgbmV4dFxuICAgICAgICAgICAgICAgIHJvdy5hZGRDb2xvclBpY2tlcihjcCA9PiB7IGNwLnNldFZhbHVlKGNhdGVnb3J5LmJnQ29sb3IpLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYmdDb2xvciA9IHY7IFxuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pOyAoY3AgYXMgYW55KS5pbnB1dEVsPy5jbGFzc0xpc3Q/LmFkZCgnZGItY29sb3InLCdkYi1iZy1jb2xvcicpOyB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gZWZmZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgJ3N0cmlwZWQtMSc6ICdTdHJpcGVkICg0NcKwKScsXG4gICAgICAgICAgICAgICAgICAgICdzdHJpcGVkLTInOiAnU3RyaXBlZCAoLTQ1wrApJyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZlcnRpY2FsLXN0cmlwZXMnOiAnVmVydGljYWwgc3RyaXBlcycsXG4gICAgICAgICAgICAgICAgICAgICd0aGluLXRleHR1cmVkLXN0cmlwZXMnOiAnVGhpbiB0ZXh0dXJlZCBzdHJpcGVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nyb3NzaGF0Y2hlZCc6ICdDcm9zc2hhdGNoZWQnLFxuICAgICAgICAgICAgICAgICAgICAnY2hlY2tlcmJvYXJkJzogJ0NoZWNrZXJib2FyZCcsXG4gICAgICAgICAgICAgICAgICAgICdoZXhhYm9hcmQnOiAnSGV4YWJvYXJkJyxcbiAgICAgICAgICAgICAgICAgICAgJ3dhdnktbGluZXMnOiAnV2F2eSBsaW5lcycsXG4gICAgICAgICAgICAgICAgICAgICdkb3R0ZWQnOiAnRG90dGVkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3lsZSc6ICdBcmd5bGUnLFxuICAgICAgICAgICAgICAgICAgICAnZW1ib3NzZWQnOiAnRW1ib3NzZWQnLFxuICAgICAgICAgICAgICAgICAgICAnZ2xhc3MnOiAnR2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICAnZ2xvdyc6ICdHbG93JyxcbiAgICAgICAgICAgICAgICAgICAgJ3JldHJvLWJ1dHRvbic6ICdSZXRybyBidXR0b24nXG4gICAgICAgICAgICAgICAgfSkuc2V0VmFsdWUoY2F0ZWdvcnkuZWZmZWN0KS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LmVmZmVjdCA9IHY7IFxuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pOyAoZC5zZWxlY3RFbCkuY2xhc3NMaXN0LmFkZCgnZGItc2VsZWN0JywnZGItZWZmZWN0Jyk7IH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHsgZC5hZGRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICAgICAgJyc6ICdObyBhbmltYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAnbW92ZS1ob3Jpem9udGFsbHknOiAnTW92ZSBob3Jpem9udGFsbHknLFxuICAgICAgICAgICAgICAgICAgICAnbW92ZS12ZXJ0aWNhbGx5JzogJ01vdmUgdmVydGljYWxseScsXG4gICAgICAgICAgICAgICAgICAgICdwYXJ0aWNsZXMnOiAnUGFydGljbGVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3Nub3ctZmFsbGluZyc6ICdTbm93IGZhbGxpbmcnLFxuICAgICAgICAgICAgICAgICAgICAnYW5pbWF0ZWQtZ3JhZGllbnQnOiAnQW5pbWF0ZWQgZ3JhZGllbnQnLFxuICAgICAgICAgICAgICAgICAgICAnZ2xhc3Mtc2hpbmUnOiAnR2xhc3Mgc2hpbmUnLFxuICAgICAgICAgICAgICAgICAgICAnZ2xvd2luZyc6ICdHbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pLnNldFZhbHVlKGNhdGVnb3J5LmFuaW1hdGlvbikub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5hbmltYXRpb24gPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWFuaW1hdGlvbicpOyB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gYW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtaG9yaXpvbnRhbGx5JzogJ01vdmUgaG9yaXpvbnRhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtdmVydGljYWxseSc6ICdNb3ZlIHZlcnRpY2FsbHknLFxuICAgICAgICAgICAgICAgICAgICAncGFydGljbGVzJzogJ1BhcnRpY2xlcycsXG4gICAgICAgICAgICAgICAgICAgICdzbm93LWZhbGxpbmcnOiAnU25vdyBmYWxsaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FuaW1hdGVkLWdyYWRpZW50JzogJ0FuaW1hdGVkIGdyYWRpZW50JyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzLXNoaW5lJzogJ0dsYXNzIHNoaW5lJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3dpbmcnOiAnR2xvd2luZydcbiAgICAgICAgICAgICAgICB9KS5zZXRWYWx1ZShjYXRlZ29yeS5hbmltYXRpb24yKS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LmFuaW1hdGlvbjIgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWFuaW1hdGlvbjInKTsgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZEV4dHJhQnV0dG9uKGJ0biA9PiB7IGJ0bi5zZXRJY29uKCd4Jykuc2V0VG9vbHRpcCgnRGVsZXRlJykub25DbGljaygoKSA9PiB7IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmZpbHRlcihjID0+IGMuaWQgIT09IGNhdGVnb3J5LmlkKTsgcmVuZGVyUnVsZXMoKTsgfSk7IChidG4gYXMgYW55KS5leHRyYUJ1dHRvbkVsPy5jbGFzc0xpc3Q/LmFkZCgnZGItYnRuJywnZGItZGVsZXRlLWNhdGVnb3J5Jyk7IH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5hZGRCdXR0b24oYiA9PiB7XG4gICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgYWRkIGNhdGVnb3J5Jyk7XG4gICAgICAgICAgICAoYi5idXR0b25FbCkuYWRkQ2xhc3MoJ21vZC1jdGEnKTtcbiAgICAgICAgICAgIGIub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnk6IEV2ZW50Q2F0ZWdvcnkgPSB7IGlkOiByYW5kb21JZCgpLCBuYW1lOiAnTmV3IGNhdGVnb3J5JywgYmdDb2xvcjogJyM4MzkyYTQnLCB0ZXh0Q29sb3I6ICcjZmZmZmZmJywgZWZmZWN0OiAnZW1ib3NzZWQnLCBhbmltYXRpb246ICcnLCBhbmltYXRpb24yOiAnJywgaWNvbjogdW5kZWZpbmVkIH07XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXSkuY29uY2F0KGNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZW5kZXJSdWxlcygpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKCdUcmlnZ2VycycpLnNldEhlYWRpbmcoKTtcbiAgICAgICAgY29uc3QgdHJpZ2dlcnNXcmFwID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IHJlbmRlclRyaWdnZXJzID0gKCkgPT4ge1xuICAgICAgICAgICAgdHJpZ2dlcnNXcmFwLmVtcHR5KCk7XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzIHx8IFtdO1xuICAgICAgICAgICAgY29uc3Qgc3dhdGNoZXMgPSBbXG4gICAgICAgICAgICAgICAgLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKSxcbiAgICAgICAgICAgICAgICAuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzIHx8IFtdKVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goKHRyLCBpZHgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBuZXcgU2V0dGluZyh0cmlnZ2Vyc1dyYXApO1xuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwucXVlcnlTZWxlY3RvcignLnNldHRpbmctaXRlbS1uYW1lJyk/LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHJvdy5zZXR0aW5nRWwuY2xhc3NMaXN0LmFkZCgnZGItdHJpZ2dlcnMtcm93Jyk7XG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwpLmFkZENsYXNzKCdkYXlibGUtZmxleC1nYXAtOCcpO1xuICAgICAgICAgICAgICAgIHJvdy5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0LnNldFBsYWNlaG9sZGVyKCdUZXh0IGluIHRpdGxlIG9yIGRlc2NyaXB0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIHQuc2V0VmFsdWUodHIucGF0dGVybik7XG4gICAgICAgICAgICAgICAgICAgIHQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc1tpZHhdLnBhdHRlcm4gPSB2IHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgKHQuaW5wdXRFbCkuY2xhc3NMaXN0LmFkZCgnZGItaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgKHQuaW5wdXRFbCkuYWRkQ2xhc3MoJ2RheWJsZS10cmlnZ2VyLWlucHV0Jyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignJywgJ0RlZmF1bHQgY2F0ZWdvcnknKTtcbiAgICAgICAgICAgICAgICAgICAgY2F0cy5mb3JFYWNoKGMgPT4gZC5hZGRPcHRpb24oYy5pZCwgYy5uYW1lKSk7XG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VmFsdWUodHIuY2F0ZWdvcnlJZCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc1tpZHhdLmNhdGVnb3J5SWQgPSB2IHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuY2xhc3NMaXN0LmFkZCgnZGItc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsKS5hZGRDbGFzcygnZGF5YmxlLWljb24tc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignJywgJ0RlZmF1bHQgY29sb3InKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhdGNoZXMuZm9yRWFjaChzID0+IGQuYWRkT3B0aW9uKHMuY29sb3IsICdDb2xvcicpKTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRWYWx1ZSh0ci5jb2xvciB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbXNbaWR4XS5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbXNbaWR4XS50ZXh0Q29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBzd2F0Y2hlcy5maW5kKHN3ID0+IHN3LmNvbG9yID09PSB2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtc1tpZHhdLmNvbG9yID0gcy5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS50ZXh0Q29sb3IgPSBzLnRleHRDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBseUNvbG9yU3R5bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuY2xhc3NMaXN0LmFkZCgnZGItc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTdHlsZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXBwbHlDb2xvclN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkU3dhdGNoID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3R5bGUgdGhlIHNlbGVjdCBlbGVtZW50IGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3dhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLnN0eWxlLnNldFByb3BlcnR5KCdiYWNrZ3JvdW5kLWNvbG9yJywgc2VsZWN0ZWRTd2F0Y2guY29sb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsKS5zdHlsZS5zZXRQcm9wZXJ0eSgnY29sb3InLCBzZWxlY3RlZFN3YXRjaC50ZXh0Q29sb3IgfHwgJyMwMDAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdiYWNrZ3JvdW5kLWNvbG9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLnN0eWxlLnJlbW92ZVByb3BlcnR5KCdjb2xvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTdHlsZSB0aGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgQXJyYXkuZnJvbShkLnNlbGVjdEVsLm9wdGlvbnMpLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdC52YWx1ZSkgcmV0dXJuOyAvLyBTa2lwIGRlZmF1bHQgb3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcyA9IHN3YXRjaGVzLmZpbmQoc3cgPT4gc3cuY29sb3IgPT09IG9wdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0LnN0eWxlLnNldFByb3BlcnR5KCdiYWNrZ3JvdW5kLWNvbG9yJywgcy5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdC5zdHlsZS5zZXRQcm9wZXJ0eSgnY29sb3InLCBzLnRleHRDb2xvciB8fCAnIzAwMCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICAgICAgYXBwbHlDb2xvclN0eWxlcygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLnN0eWxlLm1heFdpZHRoID0gJzEyMHB4JztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRXh0cmFCdXR0b24oYnRuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnRuLnNldEljb24oJ3gnKS5zZXRUb29sdGlwKCdEZWxldGUnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBpdGVtcy5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGlkeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHVwZGF0ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBuZXcgU2V0dGluZyh0cmlnZ2Vyc1dyYXApLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgYWRkIHRyaWdnZXInKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbXMyID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzIHx8IFtdKS5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICBpdGVtczIucHVzaCh7IHBhdHRlcm46ICcnLCBjYXRlZ29yeUlkOiAnJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtczI7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG5cbiAgICAgICAgLy8gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnQ3VzdG9tIFN3YXRjaGVzJyB9KTtcbiAgICAgICAgY29uc3Qgc3dhdGNoZXNTZWN0aW9uID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIChzd2F0Y2hlc1NlY3Rpb24gYXMgSFRNTEVsZW1lbnQpLmFkZENsYXNzKCdkYXlibGUtaGlkZGVuJyk7XG4gICAgICAgIG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbilcbiAgICAgICAgICAgIC8vIC5zZXROYW1lKCdFbmFibGUgQ3VzdG9tIFN3YXRjaGVzJylcbiAgICAgICAgICAgIC8vIC5zZXREZXNjKCdJZiBvbiwgeW91ciBjdXN0b20gc3dhdGNoZXMgd2lsbCBhcHBlYXIgaW4gdGhlIGNvbG9yIHBpY2tlci4nKVxuICAgICAgICAgICAgLy8gLmFkZFRvZ2dsZSh0ID0+IHtcbiAgICAgICAgICAgIC8vICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA/PyBmYWxzZSlcbiAgICAgICAgICAgIC8vICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA9IHY7XG4gICAgICAgICAgICAvLyAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgLy8gICAgICB9KTtcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbikuc2V0TmFtZSgnQ29sb3JzJykuc2V0SGVhZGluZygpO1xuICAgICAgICBjb25zdCBjb2xvcnNMaXN0ID0gc3dhdGNoZXNTZWN0aW9uLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCByZW5kZXJDb2xvcnMgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb2xvcnNMaXN0LmVtcHR5KCk7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb2xvcnNMaXN0LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYXlibGUtc2V0dGluZ3Mtcm93LXdyYXAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgdGhlIG9sZCBzd2F0Y2hlcyB0byBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgY29uc3Qgb2xkQnVpbHQgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHNvdXJjZTogJ2J1aWx0JyBhcyBjb25zdCB9KSk7XG4gICAgICAgICAgICBjb25zdCBvbGRDdXN0b21zID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHNvdXJjZTogJ2N1c3RvbScgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3QgY29tYmluZWQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfVtdID0gWy4uLm9sZEJ1aWx0LCAuLi5vbGRDdXN0b21zXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfSwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIHdyYXAuYWRkQ2xhc3MoJ2RheWJsZS1mbGV4LWNlbnRlci1nYXAnKTtcbiAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9IGVudHJ5LnNvdXJjZTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuaW5kZXggPSBTdHJpbmcoaWR4KTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9IGVudHJ5Lm5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IGVudHJ5LmNvbG9yO1xuICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9ySW5wdXQgPSAodyBhcyBIVE1MRWxlbWVudCkucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGNvbG9ySW5wdXQ/LnZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2J1aWx0JykgbmV3QnVpbHQucHVzaCh7IG5hbWU6IG5tLCBjb2xvcjogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBjb2xvciBtYXBwaW5nIGZyb20gb2xkIHRvIG5ldyBiYXNlZCBvbiBwb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvck1hcDogeyBbb2xkQ29sb3I6IHN0cmluZ106IHN0cmluZyB9ID0ge307XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgYnVpbHQgc3dhdGNoZXNcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRCdWlsdC5sZW5ndGggJiYgaSA8IG5ld0J1aWx0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQnVpbHRbaV0uY29sb3IgIT09IG5ld0J1aWx0W2ldLmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbb2xkQnVpbHRbaV0uY29sb3JdID0gbmV3QnVpbHRbaV0uY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcCBjdXN0b20gc3dhdGNoZXNcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRDdXN0b21zLmxlbmd0aCAmJiBpIDwgbmV3Q3VzdG9tLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkQ3VzdG9tc1tpXS5jb2xvciAhPT0gbmV3Q3VzdG9tW2ldLmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbb2xkQ3VzdG9tc1tpXS5jb2xvcl0gPSBuZXdDdXN0b21baV0uY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBhbnkgdHJpZ2dlcnMgdXNpbmcgY29sb3JzIHRoYXQgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmlnZ2VycyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXSkuc2xpY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcnMuZm9yRWFjaCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LmNvbG9yICYmIGNvbG9yTWFwW3QuY29sb3JdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29sb3JWYWx1ZSA9IGNvbG9yTWFwW3QuY29sb3JdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsc28gdXBkYXRlIHRoZSB0ZXh0Q29sb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGxTd2F0Y2hlcyA9IFsuLi5uZXdCdWlsdCwgLi4ubmV3Q3VzdG9tXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3VuZFN3YXRjaCA9IGFsbFN3YXRjaGVzLmZpbmQocyA9PiBzLmNvbG9yID09PSBuZXdDb2xvclZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmNvbG9yID0gbmV3Q29sb3JWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmRTd2F0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgdGV4dENvbG9yIGZyb20gb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTd2F0Y2ggPSBbLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKSwgLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSldLmZpbmQocyA9PiBzLmNvbG9yID09PSBuZXdDb2xvclZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsU3dhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnRleHRDb2xvciA9IChvcmlnaW5hbFN3YXRjaCBhcyBhbnkpLnRleHRDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzID0gdHJpZ2dlcnM7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsID0gd3JhcC5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRiLWNvbG9yLWRlbCcgfSk7XG4gICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcbiAgICAgICAgICAgICAgICAoZGVsKS5zdHlsZS5ib3hTaGFkb3cgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIChkZWwpLnN0eWxlLnBhZGRpbmcgPSAnMnB4IDRweCc7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihkZWwsICd4Jyk7XG4gICAgICAgICAgICAgICAgZGVsLnNldEF0dHIoJ2RyYWdnYWJsZScsJ2ZhbHNlJyk7XG4gICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBkZWwub250b3VjaHN0YXJ0ID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyYXAucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKCh3IGFzIGFueSkucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2J1aWx0JykgbmV3QnVpbHQucHVzaCh7IG5hbWU6IG5tLCBjb2xvcjogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCBtb2RhbC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB3cmFwLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgJ2RyYWcnKTtcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyKS5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ292ZXIgPSBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9O1xuICAgICAgICAgICAgICAgIHJvdy5vbmRyb3AgPSBhc3luYyBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0IHx8IHRhcmdldC5wYXJlbnRFbGVtZW50ICE9PSByb3cpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gKGUuY2xpZW50WCAtIHJlY3QubGVmdCkgPCByZWN0LndpZHRoIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlZm9yZSkgcm93Lmluc2VydEJlZm9yZSh3cmFwLCB0YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIHRhcmdldC5hZnRlcih3cmFwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QnVpbHQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvcklucHV0ID0gKHcgYXMgSFRNTEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBjb2xvcklucHV0Py52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JhcDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb21iaW5lZC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7IG1ha2VJdGVtKGVudHJ5LCBpZHgpOyB9KTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzQm90dG9tID0gbmV3IFNldHRpbmcoc3dhdGNoZXNTZWN0aW9uKTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbC5hZGRDbGFzcygnZGF5YmxlLW5vLWJvcmRlci10b3AnKTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ1Jlc2V0IHRvIGRlZmF1bHQgY29sb3JzJykub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ1Jlc2V0IGNvbG9yIHN3YXRjaGVzIHRvIGRlZmF1bHQ/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSAoREVGQVVMVF9TRVRUSU5HUy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiAocyBhcyBhbnkpLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29sb3JzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCBtb2RhbC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgYWRkIGNvbG9yJykub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbSA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiAnI2ZmMDAwMCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbG9ycygpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIChiLmJ1dHRvbkVsKS5hZGRDbGFzcygnZGF5YmxlLW1sLWF1dG8nKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICA7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoJ0RhdGEgbWFuYWdlbWVudCcpLnNldEhlYWRpbmcoKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXhwb3J0IGRhdGEnKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ0V4cG9ydCBkYXRhJylcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmF1bHROYW1lID0gKHRoaXMuYXBwLnZhdWx0IGFzIGFueSk/LmdldE5hbWU/LigpIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIGFueSk/LmJhc2VQYXRoPy5zcGxpdCgvW1xcXFwvXS8pLmZpbHRlcihCb29sZWFuKS5wb3AoKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCAnVmF1bHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0T2JqOiB1bmtub3duID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhdWx0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHRoaXMucGx1Z2luLnNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vbnRoczogW10gYXMgQXJyYXk8eyBmaWxlOiBzdHJpbmcsIGRhdGE6IHVua25vd24gfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyIHx8ICdEYXlibGVDYWxlbmRhcic7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3RpbmcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmxpc3QoZm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlcyA9IChsaXN0aW5nLmZpbGVzIHx8IFtdKS5maWx0ZXIoKGY6IHN0cmluZykgPT4gZi50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuanNvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eHQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChleHBvcnRPYmogYXMgYW55KS5tb250aHMucHVzaCh7IGZpbGU6IGYsIGRhdGEgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgZmlsZSBzYXZlIGRpYWxvZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBgRGF5YmxlRXhwb3J0XyR7dmF1bHROYW1lfV8ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydE9iaiwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIGRvd25sb2FkIGxpbmsgYW5kIHRyaWdnZXIgc2F2ZSBkaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2pzb25TdHJdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmsuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwobGluay5ocmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRXhwb3J0IHJlYWR5OiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0V4cG9ydCBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdJbXBvcnQgZGF0YScpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnSW1wb3J0IGRhdGEnKVxuICAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWNjZXB0ID0gJ2FwcGxpY2F0aW9uL2pzb24sLmpzb24nO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBpbnB1dC5maWxlcz8uWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBmaWxlLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvYmogPSBKU09OLnBhcnNlKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmo/LnNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgb2JqLnNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaj8ubW9udGhzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyIHx8ICdEYXlibGVDYWxlbmRhcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9IGNhdGNoIHsgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7IH0gY2F0Y2ggKGUpIHsgY29uc29sZS5kZWJ1ZygnW0RheWJsZV0gQ3JlYXRlIGZvbGRlcjonLCBlKTsgfSB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbSBvZiBvYmoubW9udGhzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gdHlwZW9mIG0uZmlsZSA9PT0gJ3N0cmluZycgPyBtLmZpbGUgOiBgJHtmb2xkZXJ9L0ltcG9ydGVkXyR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KG0uZGF0YSA/PyB7fSwgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgeyBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7IHZpZXcucmVuZGVyKCk7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdJbXBvcnQgY29tcGxldGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVsb2FkIHRoZSBwbHVnaW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwbHVnaW5NYW5hZ2VyID0gKHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLnBsdWdpbnM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsdWdpbk1hbmFnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcGx1Z2luTWFuYWdlci5kaXNhYmxlUGx1Z2luKHRoaXMucGx1Z2luLm1hbmlmZXN0LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcGx1Z2luTWFuYWdlci5lbmFibGVQbHVnaW4odGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ltcG9ydCBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59XG5mdW5jdGlvbiByYW5kb21JZCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFueUNyeXB0byA9ICh3aW5kb3cgYXMgYW55KS5jcnlwdG87XG4gICAgaWYgKGFueUNyeXB0bz8ucmFuZG9tVVVJRCkgcmV0dXJuIGFueUNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgcmV0dXJuICdldi0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyAnLScgKyBEYXRlLm5vdygpO1xufVxuIl19