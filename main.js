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
            void this.render();
        });
    }
    debouncedSave() {
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveAllEntries(), 1000);
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
        void this.loadAllEntries().then(() => { this.render(); });
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
        void this.loadAllEntries().then(() => { this.render(); });
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
            return (cells[0]).offsetWidth || 100;
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
                    item.style.position = 'absolute';
                    item.style.boxSizing = 'border-box';
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
                        item.style.position = 'absolute';
                        item.style.boxSizing = 'border-box';
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
            (_b = (e.dataTransfer)) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'calendar');
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
                yield this.saveAllEntries();
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
        const colorSwatchPos = (_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.colorSwatchPosition) !== null && _f !== void 0 ? _f : 'under-title';
        if (colorSwatchPos === 'under-title') {
            createColorRow();
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
        const removeBtn = footer.createEl('button', { cls: 'dayble-btn', text: 'Remove icon' });
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
                    (_b = (e.dataTransfer)) === null || _b === void 0 ? void 0 : _b.setData('dayble-source', 'today');
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
            .setName('Enable weekly notes')
            .setDesc('Show a Markdown notes section below the calendar in weekly view')
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
                        yield updateAll();
                    }));
                    modal.open();
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
            controlsBottom.settingEl.style.display = 'flex';
            (controlsBottom.settingEl).style.alignItems = 'center';
            (controlsBottom.settingEl).style.gap = '8px';
            (controlsBottom.settingEl).style.width = '100%';
            (controlsBottom.settingEl).style.justifyContent = 'flex-start';
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
                b.setButtonText('+ add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
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
                    (del).style.background = 'none';
                    (del).style.boxShadow = 'none';
                    (del).style.border = 'none';
                    (del).style.padding = '2px 4px';
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
                (row.settingEl).style.gridTemplateColumns = 'unset';
                row.controlEl.style.display = 'flex';
                (row.controlEl).style.gap = '8px';
                row.controlEl.style.flex = '1';
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
                        picker.open();
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
                row.controlEl.style.display = 'flex';
                (row.controlEl).style.gap = '8px';
                (row.controlEl).style.flex = '1';
                row.addText(t => {
                    t.setPlaceholder('Text in title or description');
                    t.setValue(tr.pattern);
                    t.onChange((v) => __awaiter(this, void 0, void 0, function* () {
                        items[idx].pattern = v || '';
                        this.plugin.settings.triggers = items;
                        yield this.plugin.saveSettings();
                    }));
                    (t.inputEl).classList.add('db-input');
                    (t.inputEl).style.flex = '1';
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
                    (d.selectEl).style.width = '90px';
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
                            (d.selectEl).style.backgroundColor = selectedSwatch.color;
                            (d.selectEl).style.color = selectedSwatch.textColor || '#000';
                        }
                        else {
                            (d.selectEl).style.backgroundColor = '';
                            (d.selectEl).style.color = '';
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
            const combined = [...oldBuilt, ...oldCustoms];
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
                    modal.open();
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
                b.setButtonText('+ add color').onClick(() => __awaiter(this, void 0, void 0, function* () {
                    const newCustom = (this.plugin.settings.userCustomSwatches || []).slice();
                    newCustom.push({ name: '', color: '#ff0000' });
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
                    renderColors();
                    renderTriggers();
                }));
                (b.buttonEl).style.marginLeft = 'auto';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBbUo7QUFFbkosTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUM7QUFrQ3pDLE1BQU0sZ0JBQWdCLEdBQW1CO0lBQ3JDLFlBQVksRUFBRSxDQUFDO0lBQ2YsYUFBYSxFQUFFLEVBQUU7SUFDakIsYUFBYSxFQUFFLE1BQU07SUFDckIsZUFBZSxFQUFFLFFBQVE7SUFDekIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFFLENBQUM7SUFDbkIsaUJBQWlCLEVBQUUsQ0FBQztJQUNwQixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLG1CQUFtQixFQUFFLGFBQWE7SUFDbEMsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsc0JBQXNCLEVBQUUsS0FBSztJQUM3QixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixlQUFlLEVBQUUsTUFBTTtJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsUUFBUSxFQUFFO1FBQ04sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN2RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDekQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUM5RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDMUQsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUMzRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQ3hELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDeEQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN6RCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO0tBQzNEO0lBQ0Qsa0JBQWtCLEVBQUUsRUFBRTtJQUN0QixlQUFlLEVBQUUsRUFBRTtJQUNuQixRQUFRLEVBQUUsRUFBRTtDQUNmLENBQUM7QUE4QkYs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Qzs0QkFDM0QsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUM5RCxDQUFDO29CQUNMLENBQUM7b0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDVCxJQUFJLGlCQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ2hDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFBLENBQUM7Z0JBQ0YsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDUixDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDSjtBQUNELFNBQVMsUUFBUTtJQUNiLE1BQU0sU0FBUyxHQUFJLE1BQWMsQ0FBQyxNQUFNLENBQUM7SUFDekMsSUFBSSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsVUFBVTtRQUFFLE9BQU8sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3pELE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgSXRlbVZpZXcsIE1vZGFsLCBOb3RpY2UsIFBsdWdpbiwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgV29ya3NwYWNlTGVhZiwgc2V0SWNvbiwgTWVudSwgVEZpbGUsIEZ1enp5U3VnZ2VzdE1vZGFsIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5jb25zdCBWSUVXX1RZUEUgPSAnZGF5YmxlLWNhbGVuZGFyLXZpZXcnO1xuXG5pbnRlcmZhY2UgRGF5YmxlU2V0dGluZ3Mge1xuICAgIHdlZWtTdGFydERheTogbnVtYmVyO1xuICAgIGVudHJpZXNGb2xkZXI6IHN0cmluZztcbiAgICBpY29uUGxhY2VtZW50PzogJ2xlZnQnIHwgJ3JpZ2h0JyB8ICdub25lJyB8ICd0b3AnIHwgJ3RvcC1sZWZ0JyB8ICd0b3AtcmlnaHQnO1xuICAgIGV2ZW50VGl0bGVBbGlnbj86ICdsZWZ0JyB8ICdjZW50ZXInIHwgJ3JpZ2h0JztcbiAgICBldmVudERlc2NBbGlnbj86ICdsZWZ0JyB8ICdjZW50ZXInIHwgJ3JpZ2h0JztcbiAgICB0aW1lRm9ybWF0PzogJzI0aCcgfCAnMTJoJztcbiAgICBob2xkZXJPcGVuPzogYm9vbGVhbjtcbiAgICBob2xkZXJXaWR0aD86IG51bWJlcjsgLy8gaW4gcGl4ZWxzXG4gICAgd2Vla2x5Tm90ZXNIZWlnaHQ/OiBudW1iZXI7IC8vIGluIHBpeGVsc1xuICAgIGV2ZW50Q2F0ZWdvcmllcz86IEV2ZW50Q2F0ZWdvcnlbXTtcbiAgICBwcmVmZXJVc2VyQ29sb3JzPzogYm9vbGVhbjsgLy8gcHJlZmVyIHVzZXItc2V0IGV2ZW50IGNvbG9ycyBvdmVyIGNhdGVnb3J5IGNvbG9yc1xuICAgIGV2ZW50QmdPcGFjaXR5PzogbnVtYmVyOyAvLyAwLTEsIGNvbnRyb2xzIGJhY2tncm91bmQgb3BhY2l0eVxuICAgIGV2ZW50Qm9yZGVyV2lkdGg/OiBudW1iZXI7IC8vIDAtNXB4LCBjb250cm9scyBib3JkZXIgdGhpY2tuZXNzXG4gICAgZXZlbnRCb3JkZXJSYWRpdXM/OiBudW1iZXI7IC8vIHB4LCBjb250cm9scyBib3JkZXIgcmFkaXVzXG4gICAgZXZlbnRCb3JkZXJPcGFjaXR5PzogbnVtYmVyOyAvLyAwLTEsIGNvbnRyb2xzIGJvcmRlciBjb2xvciBvcGFjaXR5IChmb3IgY29sb3JlZCBldmVudHMpXG4gICAgY29sb3JTd2F0Y2hQb3NpdGlvbj86ICd1bmRlci10aXRsZScgfCAndW5kZXItZGVzY3JpcHRpb24nIHwgJ25vbmUnOyAvLyBwb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBtb2RhbFxuICAgIG9ubHlBbmltYXRlVG9kYXk/OiBib29sZWFuO1xuICAgIGNvbXBsZXRlQmVoYXZpb3I/OiAnbm9uZScgfCAnZGltJyB8ICdzdHJpa2V0aHJvdWdoJyB8ICdoaWRlJztcbiAgICBjdXN0b21Td2F0Y2hlc0VuYWJsZWQ/OiBib29sZWFuO1xuICAgIHJlcGxhY2VEZWZhdWx0U3dhdGNoZXM/OiBib29sZWFuO1xuICAgIHN3YXRjaGVzPzogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W107XG4gICAgdXNlckN1c3RvbVN3YXRjaGVzPzogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W107XG4gICAgZGVmYXVsdENvbG9yc0ZvbGRlZD86IGJvb2xlYW47XG4gICAgY3VzdG9tU3dhdGNoZXNGb2xkZWQ/OiBib29sZWFuO1xuICAgIGRheUNlbGxNYXhIZWlnaHQ/OiBudW1iZXI7XG4gICAgaG9sZGVyUGxhY2VtZW50PzogJ2xlZnQnIHwgJ3JpZ2h0JyB8ICdoaWRkZW4nO1xuICAgIGNhbGVuZGFyV2Vla0FjdGl2ZT86IGJvb2xlYW47XG4gICAgdHJpZ2dlcnM/OiB7IHBhdHRlcm46IHN0cmluZywgY2F0ZWdvcnlJZDogc3RyaW5nLCBjb2xvcj86IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXTtcbiAgICB3ZWVrbHlOb3Rlc0VuYWJsZWQ/OiBib29sZWFuO1xufSBcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRGF5YmxlU2V0dGluZ3MgPSB7XG4gICAgd2Vla1N0YXJ0RGF5OiAwLFxuICAgIGVudHJpZXNGb2xkZXI6ICcnLFxuICAgIGljb25QbGFjZW1lbnQ6ICdsZWZ0JyxcbiAgICBldmVudFRpdGxlQWxpZ246ICdjZW50ZXInLFxuICAgIGV2ZW50RGVzY0FsaWduOiAnY2VudGVyJyxcbiAgICB0aW1lRm9ybWF0OiAnMjRoJyxcbiAgICBob2xkZXJPcGVuOiB0cnVlLFxuICAgIHdlZWtseU5vdGVzSGVpZ2h0OiAyMDAsXG4gICAgcHJlZmVyVXNlckNvbG9yczogZmFsc2UsXG4gICAgZXZlbnRCZ09wYWNpdHk6IDAuNTAsXG4gICAgZXZlbnRCb3JkZXJXaWR0aDogMCxcbiAgICBldmVudEJvcmRlclJhZGl1czogNixcbiAgICBldmVudEJvcmRlck9wYWNpdHk6IDAuMjUsXG4gICAgY29sb3JTd2F0Y2hQb3NpdGlvbjogJ3VuZGVyLXRpdGxlJyxcbiAgICBvbmx5QW5pbWF0ZVRvZGF5OiBmYWxzZSxcbiAgICBjb21wbGV0ZUJlaGF2aW9yOiAnZGltJyxcbiAgICBjdXN0b21Td2F0Y2hlc0VuYWJsZWQ6IGZhbHNlLFxuICAgIHJlcGxhY2VEZWZhdWx0U3dhdGNoZXM6IGZhbHNlLFxuICAgIGRlZmF1bHRDb2xvcnNGb2xkZWQ6IHRydWUsXG4gICAgY3VzdG9tU3dhdGNoZXNGb2xkZWQ6IGZhbHNlLFxuICAgIGRheUNlbGxNYXhIZWlnaHQ6IDAsXG4gICAgaG9sZGVyUGxhY2VtZW50OiAnbGVmdCcsXG4gICAgY2FsZW5kYXJXZWVrQWN0aXZlOiBmYWxzZSxcbiAgICB3ZWVrbHlOb3Rlc0VuYWJsZWQ6IGZhbHNlLFxuICAgIHN3YXRjaGVzOiBbXG4gICAgICAgIHsgbmFtZTogJ1JlZCcsIGNvbG9yOiAnI2ViM2I1YScsIHRleHRDb2xvcjogJyNmOWM2ZDAnIH0sXG4gICAgICAgIHsgbmFtZTogJ09yYW5nZScsIGNvbG9yOiAnI2ZhODIzMScsIHRleHRDb2xvcjogJyNmZWQ4YmUnIH0sXG4gICAgICAgIHsgbmFtZTogJ0FtYmVyJywgY29sb3I6ICcjZTVhMjE2JywgdGV4dENvbG9yOiAnI2Y4ZTViYicgfSxcbiAgICAgICAgeyBuYW1lOiAnR3JlZW4nLCBjb2xvcjogJyMyMGJmNmInLCB0ZXh0Q29sb3I6ICcjYzRlZWRhJyB9LFxuICAgICAgICB7IG5hbWU6ICdUZWFsJywgY29sb3I6ICcjMGZiOWIxJywgdGV4dENvbG9yOiAnI2JkZWNlYScgfSxcbiAgICAgICAgeyBuYW1lOiAnQmx1ZScsIGNvbG9yOiAnIzJkOThkYScsIHRleHRDb2xvcjogJyNjNWUzZjgnIH0sXG4gICAgICAgIHsgbmFtZTogJ0Nvcm5mbG93ZXInLCBjb2xvcjogJyMzODY3ZDYnLCB0ZXh0Q29sb3I6ICcjYzlkNWY4JyB9LFxuICAgICAgICB7IG5hbWU6ICdJbmRpZ28nLCBjb2xvcjogJyM1NDU0ZDAnLCB0ZXh0Q29sb3I6ICcjZDJkMmY4JyB9LFxuICAgICAgICB7IG5hbWU6ICdQdXJwbGUnLCBjb2xvcjogJyM4ODU0ZDAnLCB0ZXh0Q29sb3I6ICcjZTJkMmY4JyB9LFxuICAgICAgICB7IG5hbWU6ICdNYWdlbnRhJywgY29sb3I6ICcjYjU1NGQwJywgdGV4dENvbG9yOiAnI2VkZDJmOCcgfSxcbiAgICAgICAgeyBuYW1lOiAnUGluaycsIGNvbG9yOiAnI2U4MzJjMScsIHRleHRDb2xvcjogJyNmOGMyZWYnIH0sXG4gICAgICAgIHsgbmFtZTogJ1Jvc2UnLCBjb2xvcjogJyNlODMyODknLCB0ZXh0Q29sb3I6ICcjZjhjMmUwJyB9LFxuICAgICAgICB7IG5hbWU6ICdCcm93bicsIGNvbG9yOiAnIzk2NWIzYicsIHRleHRDb2xvcjogJyNlNWQ0YzknIH0sXG4gICAgICAgIHsgbmFtZTogJ0dyYXknLCBjb2xvcjogJyM4MzkyYTQnLCB0ZXh0Q29sb3I6ICcjZTNlNmVhJyB9XG4gICAgXSxcbiAgICB1c2VyQ3VzdG9tU3dhdGNoZXM6IFtdLFxuICAgIGV2ZW50Q2F0ZWdvcmllczogW10sXG4gICAgdHJpZ2dlcnM6IFtdXG59O1xuXG5pbnRlcmZhY2UgRGF5YmxlRXZlbnQge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgdGl0bGU6IHN0cmluZztcbiAgICBkYXRlPzogc3RyaW5nO1xuICAgIHN0YXJ0RGF0ZT86IHN0cmluZztcbiAgICBlbmREYXRlPzogc3RyaW5nO1xuICAgIHRpbWU/OiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gICAgaWNvbj86IHN0cmluZztcbiAgICBjb21wbGV0ZWQ/OiBib29sZWFuO1xuICAgIGNvbG9yPzogc3RyaW5nOyAvLyB1c2VyLXNldCBjb2xvciAoaGV4KVxuICAgIHRleHRDb2xvcj86IHN0cmluZzsgLy8gdXNlci1zZXQgdGV4dCBjb2xvciAoaGV4KVxuICAgIGNhdGVnb3J5SWQ/OiBzdHJpbmc7XG4gICAgZWZmZWN0Pzogc3RyaW5nO1xuICAgIGFuaW1hdGlvbj86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEV2ZW50Q2F0ZWdvcnkge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGJnQ29sb3I6IHN0cmluZztcbiAgICB0ZXh0Q29sb3I6IHN0cmluZztcbiAgICBlZmZlY3Q6IHN0cmluZztcbiAgICBhbmltYXRpb246IHN0cmluZztcbiAgICBhbmltYXRpb24yOiBzdHJpbmc7XG4gICAgaWNvbj86IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGF5YmxlQ2FsZW5kYXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBEYXlibGVTZXR0aW5ncztcblxuICAgIGFzeW5jIG9ubG9hZCgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFLCBsZWFmID0+IG5ldyBEYXlibGVDYWxlbmRhclZpZXcobGVhZiwgdGhpcykpO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ29wZW4tY2FsZW5kYXInLCBuYW1lOiAnT3BlbiBjYWxlbmRhcicsIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMub3BlbkRheWJsZSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2ZvY3VzLXRvZGF5JywgbmFtZTogJ0ZvY3VzIG9uIHRvZGF5JywgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5mb2N1c1RvZGF5KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxuICAgICAgICAgICAgaWQ6ICdvcGVuLXdlZWtseS12aWV3JywgXG4gICAgICAgICAgICBuYW1lOiAnT3BlbiB3ZWVrbHkgdmlldycsIFxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vcGVuRGF5YmxlKCk7IFxuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5sb2FkQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAnb3Blbi1tb250aGx5LXZpZXcnLCBcbiAgICAgICAgICAgIG5hbWU6ICdPcGVuIG1vbnRobHkgdmlldycsIFxuICAgICAgICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5vcGVuRGF5YmxlKCk7IFxuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZpZXcubG9hZEFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXlibGVTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgICAgIHRoaXMuZW5zdXJlRW50cmllc0ZvbGRlcigpO1xuICAgICAgICB0aGlzLm9wZW5EYXlibGUoKTtcbiAgICB9XG5cbiAgICBvbnVubG9hZCgpIHtcbiAgICAgICAgLy8gRG8gbm90IGRldGFjaCBsZWF2ZXMgaGVyZSB0byByZXNwZWN0IHVzZXIgbGF5b3V0XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICB9XG5cbiAgICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgYXN5bmMgb3BlbkRheWJsZSgpIHtcbiAgICAgICAgY29uc3QgbGVhZiA9IHRoaXMuZ2V0T3JDcmVhdGVMZWFmKCk7XG4gICAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgIH1cblxuICAgIGZvY3VzVG9kYXkoKSB7XG4gICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICBpZiAodmlldykgdmlldy5mb2N1c1RvZGF5KCk7XG4gICAgICAgIGVsc2UgdGhpcy5vcGVuRGF5YmxlKCk7XG4gICAgfVxuXG4gICAgZ2V0Q2FsZW5kYXJWaWV3KCk6IERheWJsZUNhbGVuZGFyVmlldyB8IG51bGwge1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRSk7XG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoID4gMCkgcmV0dXJuIGxlYXZlc1swXS52aWV3IGFzIERheWJsZUNhbGVuZGFyVmlldztcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZ2V0T3JDcmVhdGVMZWFmKCk6IFdvcmtzcGFjZUxlYWYge1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRSk7XG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoKSByZXR1cm4gbGVhdmVzWzBdO1xuICAgICAgICByZXR1cm4gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkgPz8gdGhpcy5hcHAud29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZW5zdXJlRW50cmllc0ZvbGRlcigpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyO1xuICAgICAgICBpZiAoIWZvbGRlciB8fCBmb2xkZXIudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlIFBsdWdpbl0gRmFpbGVkIHRvIGNyZWF0ZSBmb2xkZXI6JywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIERheWJsZUNhbGVuZGFyVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IERheWJsZUNhbGVuZGFyUGx1Z2luO1xuICAgIHJvb3RFbDogSFRNTEVsZW1lbnQ7XG4gICAgaGVhZGVyRWw6IEhUTUxFbGVtZW50O1xuICAgIG1vbnRoVGl0bGVFbDogSFRNTEVsZW1lbnQ7XG4gICAgd2Vla0hlYWRlckVsOiBIVE1MRWxlbWVudDtcbiAgICBjYWxlbmRhckVsOiBIVE1MRWxlbWVudDtcbiAgICBib2R5RWw6IEhUTUxFbGVtZW50O1xuICAgIGhvbGRlckVsOiBIVE1MRWxlbWVudDtcbiAgICBncmlkRWw6IEhUTUxFbGVtZW50O1xuICAgIF9sb25nT3ZlcmxheUVsPzogSFRNTEVsZW1lbnQ7XG4gICAgX2xvbmdFbHM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcbiAgICBjdXJyZW50RGF0ZTogRGF0ZTtcbiAgICBldmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICBob2xkZXJFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICB3ZWVrbHlOb3RlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlzU2VsZWN0aW5nID0gZmFsc2U7XG4gICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIHNlbGVjdGlvblN0YXJ0RGF0ZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgc2VsZWN0aW9uRW5kRGF0ZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaXNSZXNpemluZ0hvbGRlciA9IGZhbHNlO1xuICAgIGhvbGRlclJlc2l6ZVN0YXJ0WCA9IDA7XG4gICAgaG9sZGVyUmVzaXplU3RhcnRXaWR0aCA9IDA7XG4gICAgX2JvdW5kSG9sZGVyTW91c2VNb3ZlPzogKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQ7XG4gICAgX2JvdW5kSG9sZGVyTW91c2VVcD86IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuICAgIF9sb25nUk8/OiBSZXNpemVPYnNlcnZlcjtcbiAgICBjdXJyZW50VG9kYXlNb2RhbD86IFRvZGF5TW9kYWw7XG4gICAgd2Vla1RvZ2dsZUJ0bj86IEhUTUxFbGVtZW50O1xuICAgIHdlZWtseU5vdGVzRWw/OiBIVE1MRWxlbWVudDtcbiAgICBkcmFnZ2VkRXZlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgc2F2ZVRpbWVvdXQ6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgdW5kZWZpbmVkO1xuICAgIGlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IGZhbHNlO1xuICAgIHdlZWtseU5vdGVzUmVzaXplU3RhcnRZID0gMDtcbiAgICB3ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0SGVpZ2h0ID0gMDtcbiAgICBfYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZT86IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuICAgIF9ib3VuZFdlZWtseU5vdGVzTW91c2VVcD86IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbikge1xuICAgICAgICBzdXBlcihsZWFmKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICB0aGlzLnBsdWdpbi5yZWdpc3RlckRvbUV2ZW50KHdpbmRvdywgJ3Jlc2l6ZScsICgpID0+IHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZGVib3VuY2VkU2F2ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuc2F2ZVRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnNhdmVUaW1lb3V0KTtcbiAgICAgICAgdGhpcy5zYXZlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5zYXZlQWxsRW50cmllcygpLCAxMDAwKTtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRTsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gJ0RheWJsZSBjYWxlbmRhcic7IH1cbiAgICBnZXRJY29uKCkgeyByZXR1cm4gJ2NhbGVuZGFyJzsgfVxuICAgIFxuICAgIGdldE1vbnRoRGF0YUZpbGVQYXRoKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xuICAgICAgICBjb25zdCB5ZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBtb250aCA9IG1vbnRoTmFtZXNbdGhpcy5jdXJyZW50RGF0ZS5nZXRNb250aCgpXTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHt5ZWFyfSR7bW9udGh9Lmpzb25gO1xuICAgICAgICByZXR1cm4gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xuICAgIH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHtcbiAgICAgICAgdGhpcy5yb290RWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1yb290JyB9KTtcbiAgICAgICAgdGhpcy5oZWFkZXJFbCA9IHRoaXMucm9vdEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1oZWFkZXInIH0pO1xuICAgICAgICBjb25zdCBsZWZ0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LWxlZnQnIH0pO1xuICAgICAgICBjb25zdCBob2xkZXJUb2dnbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgICAgaG9sZGVyVG9nZ2xlLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyBkYXlibGUtaG9sZGVyLXRvZ2dsZSc7XG4gICAgICAgIHNldEljb24oaG9sZGVyVG9nZ2xlLCAnbWVudScpO1xuICAgICAgICBob2xkZXJUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHsgdGhpcy5ob2xkZXJFbC5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJyk7IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4gPSB0aGlzLmhvbGRlckVsLmNsYXNzTGlzdC5jb250YWlucygnb3BlbicpOyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfTtcbiAgICAgICAgY29uc3Qgc2VhcmNoQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgICAgIHNlYXJjaEJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLXNlYXJjaC10b2dnbGUnO1xuICAgICAgICBzZXRJY29uKHNlYXJjaEJ0biwgJ3NlYXJjaCcpO1xuICAgICAgICBzZWFyY2hCdG4ub25jbGljayA9ICgpID0+IHsgY29uc3QgbW9kYWwgPSBuZXcgUHJvbXB0U2VhcmNoTW9kYWwodGhpcy5hcHAsIHRoaXMpOyBtb2RhbC5vcGVuKCk7IH07XG5cbiAgICAgICAgY29uc3Qgd2Vla1RvZ2dsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICB3ZWVrVG9nZ2xlLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyBkYXlibGUtd2Vlay10b2dnbGUnO1xuICAgICAgICBzZXRJY29uKHdlZWtUb2dnbGUsICdjYWxlbmRhci1yYW5nZScpO1xuICAgICAgICB3ZWVrVG9nZ2xlLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlID0gIXRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZTtcbiAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy53ZWVrVG9nZ2xlQnRuID0gd2Vla1RvZ2dsZTtcblxuICAgICAgICB0aGlzLm1vbnRoVGl0bGVFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRWwoJ2gxJywgeyBjbHM6ICdkYXlibGUtbW9udGgtdGl0bGUnIH0pO1xuICAgICAgICBjb25zdCByaWdodCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW5hdi1yaWdodCcgfSk7XG4gICAgICAgIGNvbnN0IHByZXZCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsgcHJldkJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMnO1xuICAgICAgICBzZXRJY29uKHByZXZCdG4sICdjaGV2cm9uLWxlZnQnKTtcbiAgICAgICAgcHJldkJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLnNoaWZ0TW9udGgoLTEpOyB9O1xuICAgICAgICBjb25zdCB0b2RheUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOyB0b2RheUJ0bi5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMnO1xuICAgICAgICBzZXRJY29uKHRvZGF5QnRuLCAnZG90Jyk7XG4gICAgICAgIHRvZGF5QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuZm9jdXNUb2RheSgpOyB9O1xuICAgICAgICBjb25zdCBuZXh0QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7IG5leHRCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcbiAgICAgICAgc2V0SWNvbihuZXh0QnRuLCAnY2hldnJvbi1yaWdodCcpO1xuICAgICAgICBuZXh0QnRuLm9uY2xpY2sgPSAoKSA9PiB7IHRoaXMuc2hpZnRNb250aCgxKTsgfTtcbiAgICAgICAgY29uc3QgcGxhY2VtZW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyUGxhY2VtZW50ID8/ICdsZWZ0JztcbiAgICAgICAgXG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdsZWZ0JykgbGVmdC5hcHBlbmRDaGlsZChob2xkZXJUb2dnbGUpO1xuICAgICAgICBcbiAgICAgICAgbGVmdC5hcHBlbmRDaGlsZChwcmV2QnRuKTtcbiAgICAgICAgbGVmdC5hcHBlbmRDaGlsZCh0b2RheUJ0bik7XG4gICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQobmV4dEJ0bik7XG4gICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQod2Vla1RvZ2dsZSk7XG4gICAgICAgIFxuICAgICAgICByaWdodC5hcHBlbmRDaGlsZChzZWFyY2hCdG4pO1xuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSByaWdodC5hcHBlbmRDaGlsZChob2xkZXJUb2dnbGUpO1xuICAgICAgICB0aGlzLmJvZHlFbCA9IHRoaXMucm9vdEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ib2R5JyB9KTtcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgdGhpcy5ib2R5RWwuYWRkQ2xhc3MoJ2RheWJsZS1ob2xkZXItcmlnaHQnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhvbGRlckVsID0gdGhpcy5ib2R5RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlcicgfSk7XG4gICAgICAgIGlmIChwbGFjZW1lbnQgPT09ICdoaWRkZW4nKSB7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckVsLmFkZENsYXNzKCdkYXlibGUtaG9sZGVyLWhpZGRlbicpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGhvbGRlckhlYWRlciA9IHRoaXMuaG9sZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlci1oZWFkZXInLCB0ZXh0OiAnSG9sZGVyJyB9KTtcbiAgICAgICAgY29uc3QgaG9sZGVyQWRkID0gaG9sZGVySGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLWhvbGRlci1hZGQtYnRuJyB9KTtcbiAgICAgICAgc2V0SWNvbihob2xkZXJBZGQsICdwbHVzJyk7XG4gICAgICAgIGhvbGRlckFkZC5vbmNsaWNrID0gKCkgPT4gdm9pZCB0aGlzLm9wZW5FdmVudE1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVzaXplIGhhbmRsZSB0byBob2xkZXJcbiAgICAgICAgY29uc3QgcmVzaXplSGFuZGxlID0gaG9sZGVySGVhZGVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItcmVzaXplLWhhbmRsZScgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNSZXNpemluZ0hvbGRlcikgcmV0dXJuO1xuICAgICAgICAgICAgbGV0IGRpZmYgPSBlLmNsaWVudFggLSB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WDtcbiAgICAgICAgICAgIC8vIFdoZW4gaG9sZGVyIGlzIG9uIHRoZSByaWdodCwgcmV2ZXJzZSB0aGUgZGlyZWN0aW9uXG4gICAgICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IC1kaWZmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbmV3V2lkdGggPSBNYXRoLm1heCgyMDAsIHRoaXMuaG9sZGVyUmVzaXplU3RhcnRXaWR0aCArIGRpZmYpO1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoICsgJ3B4JztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCA9IGFzeW5jIChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1Jlc2l6aW5nSG9sZGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc1Jlc2l6aW5nSG9sZGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApO1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlcldpZHRoID0gdGhpcy5ob2xkZXJFbC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJlc2l6ZUhhbmRsZS5vbm1vdXNlZG93biA9IChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5pc1Jlc2l6aW5nSG9sZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyUmVzaXplU3RhcnRYID0gZS5jbGllbnRYO1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJSZXNpemVTdGFydFdpZHRoID0gdGhpcy5ob2xkZXJFbC5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaG9sZGVyTGlzdCA9IHRoaXMuaG9sZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlci1saXN0JyB9KTtcbiAgICAgICAgLy8gQWRkIGRyYWcgaGFuZGxlcnMgdG8gaG9sZGVyIGZvciBkcm9wcGluZyBldmVudHMgdGhlcmVcbiAgICAgICAgdGhpcy5ob2xkZXJFbC5vbmRyYWdvdmVyID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB0aGlzLmhvbGRlckVsLmFkZENsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgIHRoaXMuaG9sZGVyRWwub25kcmFnbGVhdmUgPSAoKSA9PiB7IHRoaXMuaG9sZGVyRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcbiAgICAgICAgdGhpcy5ob2xkZXJFbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgaWYgKCFpZCB8fCBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpID09PSAnaG9sZGVyJykgcmV0dXJuOyAvLyBEb24ndCBkcm9wIGhvbGRlciBldmVudHMgb24gaG9sZGVyXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuZXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHMuc3BsaWNlKGlkeCwgMSlbMF07XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGRhdGUgaW5mbyB3aGVuIG1vdmluZyB0byBob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgZXYuZGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBldi5lbmREYXRlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cy5wdXNoKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRmFpbGVkIHRvIG1vdmUgZXZlbnQgdG8gaG9sZGVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaG9sZGVyRWwuYXBwZW5kQ2hpbGQoaG9sZGVyTGlzdCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBzYXZlZCBob2xkZXIgd2lkdGggaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCkge1xuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlcldpZHRoICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4pIHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ29wZW4nKTsgZWxzZSB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdvcGVuJyk7XG4gICAgICAgIHRoaXMuY2FsZW5kYXJFbCA9IHRoaXMuYm9keUVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1jYWxlbmRhcicgfSk7XG4gICAgICAgIHRoaXMud2Vla0hlYWRlckVsID0gdGhpcy5jYWxlbmRhckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS13ZWVrZGF5cycgfSk7XG4gICAgICAgIHRoaXMuZ3JpZEVsID0gdGhpcy5jYWxlbmRhckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ncmlkJyB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkQWxsRW50cmllcygpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIGFzeW5jIG9uQ2xvc2UoKSB7XG4gICAgICAgIC8vIENsZWFuIHVwIHJlc2l6ZSBoYW5kbGUgbGlzdGVuZXJzXG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApO1xuICAgICAgICB9XG4gICAgICAgIC8vIERpc2Nvbm5lY3QgbG9uZyBldmVudCBSZXNpemVPYnNlcnZlciBhbmQgcmVtb3ZlIG92ZXJsYXkgdG8gcHJldmVudCBsZWFrc1xuICAgICAgICBpZiAodGhpcy5fbG9uZ1JPKSB7XG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nUk8uZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIFJlc2l6ZU9ic2VydmVyIGRpc2Nvbm5lY3QgZXJyb3I6JywgZSk7IH1cbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fbG9uZ092ZXJsYXlFbCAmJiB0aGlzLl9sb25nT3ZlcmxheUVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0cnkgeyB0aGlzLl9sb25nT3ZlcmxheUVsLnJlbW92ZSgpOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIE92ZXJsYXkgcmVtb3ZlIGVycm9yOicsIGUpOyB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbG9uZ0Vscy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIHRyeSB7IGlmIChlbCAmJiBlbC5wYXJlbnRFbGVtZW50KSBlbC5yZW1vdmUoKTsgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBMb25nIGV2ZW50IHJlbW92ZSBlcnJvcjonLCBlKTsgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fbG9uZ0Vscy5jbGVhcigpO1xuICAgICAgICBpZiAodGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlVXApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGdldFJlcXVpcmVkRmlsZXMoKTogU2V0PHN0cmluZz4ge1xuICAgICAgICBjb25zdCBmaWxlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZERhdGUgPSAoZDogRGF0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtb250aE5hbWVzW2QuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICBmaWxlcy5hZGQoYCR7eX0ke219Lmpzb25gKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBbHdheXMgYWRkIGN1cnJlbnQgZGF0ZSdzIG1vbnRoXG4gICAgICAgIGFkZERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XG5cbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkge1xuICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5O1xuICAgICAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgY29uc3QgdERvdyA9IGJhc2UuZ2V0RGF5KCk7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gKCh0RG93IC0gd2Vla1N0YXJ0KSArIDcpICUgNztcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XG4gICAgICAgICAgICBzdGFydC5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpIC0gZGlmZik7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgICAgICBlbmQuc2V0RGF0ZShzdGFydC5nZXREYXRlKCkgKyA2KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYWRkRGF0ZShzdGFydCk7XG4gICAgICAgICAgICBhZGREYXRlKGVuZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWRBbGxFbnRyaWVzKCkge1xuICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuZ2V0UmVxdWlyZWRGaWxlcygpO1xuICAgICAgICB0aGlzLmV2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLndlZWtseU5vdGVzID0ge307XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKS5zcGxpdCgnLycpLnBvcCgpO1xuXG4gICAgICAgIGxldCBob2xkZXJGcm9tR2xvYmFsOiBEYXlibGVFdmVudFtdIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBob2xkZXJGaWxlID0gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vaG9sZGVyLmpzb25gO1xuICAgICAgICAgICAgY29uc3QgaGpzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoaG9sZGVyRmlsZSk7XG4gICAgICAgICAgICBjb25zdCBoZGF0YSA9IEpTT04ucGFyc2UoaGpzb24pO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaGRhdGE/LmhvbGRlcikpIHtcbiAgICAgICAgICAgICAgICBob2xkZXJGcm9tR2xvYmFsID0gaGRhdGEuaG9sZGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChfKSB7fVxuXG4gICAgICAgIGNvbnN0IGhvbGRlckFnZ3JlZ2F0ZTogRGF5YmxlRXZlbnRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlID0gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGpzb24pIGFzIHsgZXZlbnRzOiBEYXlibGVFdmVudFtdLCBob2xkZXI6IERheWJsZUV2ZW50W10sIHdlZWtseU5vdGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgbGFzdE1vZGlmaWVkPzogc3RyaW5nIH07XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goLi4uZGF0YS5ldmVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWhvbGRlckZyb21HbG9iYWwgJiYgQXJyYXkuaXNBcnJheShkYXRhLmhvbGRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgaG9sZGVyQWdncmVnYXRlLnB1c2goLi4uZGF0YS5ob2xkZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsZW5hbWUgPT09IGN1cnJlbnRGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXMgPSBkYXRhLndlZWtseU5vdGVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgZHVwbGljYXRlID0gc2Vlbi5oYXMoZS5pZCk7XG4gICAgICAgICAgICBzZWVuLmFkZChlLmlkKTtcbiAgICAgICAgICAgIHJldHVybiAhZHVwbGljYXRlO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBmaW5hbGl6ZUhvbGRlciA9IChsaXN0OiBEYXlibGVFdmVudFtdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBoU2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICAgICAgY29uc3QgZGVkdXA6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaCA9IGxpc3RbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFoIHx8ICFoLmlkKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoaFNlZW4uaGFzKGguaWQpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBoU2Vlbi5hZGQoaC5pZCk7XG4gICAgICAgICAgICAgICAgZGVkdXAudW5zaGlmdChoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkZWR1cDtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGhvbGRlckZyb21HbG9iYWwpIHtcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gZmluYWxpemVIb2xkZXIoaG9sZGVyRnJvbUdsb2JhbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IGZpbmFsaXplSG9sZGVyKGhvbGRlckFnZ3JlZ2F0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBzYXZlQWxsRW50cmllcygpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpO1xuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfVxuICAgICAgICBjYXRjaCB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgY29uc3QgZmlsZXNUb1NhdmUgPSB0aGlzLmdldFJlcXVpcmVkRmlsZXMoKTtcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgY29uc3QgZ2V0RmlsZW5hbWVGb3JEYXRlID0gKGRhdGVTdHI6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShkYXRlU3RyKTtcbiAgICAgICAgICAgICBpZiAoaXNOYU4oZC5nZXRUaW1lKCkpKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICBjb25zdCB5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgIGNvbnN0IG0gPSBtb250aE5hbWVzW2QuZ2V0TW9udGgoKV07XG4gICAgICAgICAgICAgcmV0dXJuIGAke3l9JHttfS5qc29uYDtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBjdXJyZW50RmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKS5zcGxpdCgnLycpLnBvcCgpO1xuXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gcmVhZCBhbGwgZmlsZXMgZmlyc3QgdG8gZW5zdXJlIHdlIGRvbid0IGxvc2UgZXZlbnRzIHRoYXQgYXJlIE5PVCBpbiB0aGlzLmV2ZW50cyAoZS5nLiBvdXQgb2YgdmlldyByYW5nZSlcbiAgICAgICAgLy8gQnV0IHdhaXQsIGlmIHdlIG9ubHkgbG9hZGVkIGV2ZW50cyBmcm9tIGBmaWxlc1RvU2F2ZWAsIGFuZCBgdGhpcy5ldmVudHNgIGNvbnRhaW5zIG1vZGlmaWNhdGlvbnMuLi5cbiAgICAgICAgLy8gSWYgd2UgbW9kaWZ5IGFuIGV2ZW50LCBpdCdzIGluIGB0aGlzLmV2ZW50c2AuXG4gICAgICAgIC8vIElmIHdlIGRlbGV0ZSBhbiBldmVudCwgaXQncyByZW1vdmVkIGZyb20gYHRoaXMuZXZlbnRzYC5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGV2ZW50cyBpbiB0aGUgZmlsZXMgdGhhdCBhcmUgTk9UIGluIGB0aGlzLmV2ZW50c2AsIGl0IGltcGxpZXMgdGhleSB3ZXJlIG5vdCBsb2FkZWQuXG4gICAgICAgIC8vIFNpbmNlIGBsb2FkQWxsRW50cmllc2AgbG9hZHMgRVZFUllUSElORyBmcm9tIGBmaWxlc1RvU2F2ZWAsIGB0aGlzLmV2ZW50c2Agc2hvdWxkIGNvdmVyIEFMTCBldmVudHMgaW4gdGhvc2UgZmlsZXMuXG4gICAgICAgIC8vIFNvIHdlIGNhbiBzYWZlbHkgb3ZlcndyaXRlIGBmaWxlc1RvU2F2ZWAuXG4gICAgICAgIFxuICAgICAgICAvLyBQYXJ0aXRpb24gZXZlbnRzIGJ5IHRhcmdldCBmaWxlbmFtZVxuICAgICAgICBjb25zdCBldmVudHNCeUZpbGU6IFJlY29yZDxzdHJpbmcsIERheWJsZUV2ZW50W10+ID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFycmF5cyBmb3Iga25vd24gZmlsZXNcbiAgICAgICAgZmlsZXNUb1NhdmUuZm9yRWFjaChmID0+IGV2ZW50c0J5RmlsZVtmXSA9IFtdKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9ycGhhbkV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xuXG4gICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgbGV0IHRhcmdldEZpbGUgPSBjdXJyZW50RmlsZTsgLy8gRGVmYXVsdCB0byBjdXJyZW50IGZpbGUgaWYgbm8gZGF0ZVxuICAgICAgICAgICAgaWYgKGV2LmRhdGUpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRGaWxlID0gZ2V0RmlsZW5hbWVGb3JEYXRlKGV2LmRhdGUpIHx8IGN1cnJlbnRGaWxlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldi5zdGFydERhdGUpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRGaWxlID0gZ2V0RmlsZW5hbWVGb3JEYXRlKGV2LnN0YXJ0RGF0ZSkgfHwgY3VycmVudEZpbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0YXJnZXRGaWxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFldmVudHNCeUZpbGVbdGFyZ2V0RmlsZV0pIGV2ZW50c0J5RmlsZVt0YXJnZXRGaWxlXSA9IFtdO1xuICAgICAgICAgICAgICAgIGV2ZW50c0J5RmlsZVt0YXJnZXRGaWxlXS5wdXNoKGV2KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3JwaGFuRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGhhdmUgZXZlbnRzIHRoYXQgYmVsb25nIHRvIGZpbGVzIE5PVCBpbiBgZmlsZXNUb1NhdmVgIChlLmcuIG1vdmVkIGV2ZW50IHRvIGZhciBmdXR1cmUpLFxuICAgICAgICAvLyB3ZSBzaG91bGQgcHJvYmFibHkgc2F2ZSB0aG9zZSBmaWxlcyB0b28uXG4gICAgICAgIC8vIEJ1dCBmb3Igbm93LCBsZXQncyBmb2N1cyBvbiBgZmlsZXNUb1NhdmVgICsgYW55IG5ldyB0YXJnZXRzIGZvdW5kLlxuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBlYWNoIGZpbGVcbiAgICAgICAgZm9yIChjb25zdCBmaWxlbmFtZSBvZiBPYmplY3Qua2V5cyhldmVudHNCeUZpbGUpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlRXZlbnRzID0gZXZlbnRzQnlGaWxlW2ZpbGVuYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IGlzQ3VycmVudCA9IGZpbGVuYW1lID09PSBjdXJyZW50RmlsZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGAke2ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBXZSBuZWVkIHRvIHByZXNlcnZlIGhvbGRlci93ZWVrbHlOb3RlcyBpZiB3ZSBhcmUgTk9UIHRoZSBjdXJyZW50IGZpbGVcbiAgICAgICAgICAgIC8vIEJ1dCB3YWl0LCBgbG9hZEFsbEVudHJpZXNgIG9ubHkgbG9hZGVkIGhvbGRlciBmcm9tIGBjdXJyZW50RmlsZWAuXG4gICAgICAgICAgICAvLyBTbyBmb3Igb3RoZXIgZmlsZXMsIHdlIGRvbid0IGtub3cgdGhlaXIgaG9sZGVyIGNvbnRlbnQhXG4gICAgICAgICAgICAvLyBXZSBNVVNUIHJlYWQgdGhlbSB0byBwcmVzZXJ2ZSBob2xkZXIvbm90ZXMuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBob2xkZXJUb1NhdmU6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgIGxldCBub3Rlc1RvU2F2ZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBXcml0ZSB0aGUgc2FtZSBob2xkZXIgbGlzdCB0byBhbGwgZmlsZXMgdG8ga2VlcCBpdCBnbG9iYWxcbiAgICAgICAgICAgIGhvbGRlclRvU2F2ZSA9IHRoaXMuaG9sZGVyRXZlbnRzO1xuICAgICAgICAgICAgLy8gV2Vla2x5IG5vdGVzIGFyZSBwZXItZmlsZTsgcHJlc2VydmUgZXhpc3Rpbmcgbm90ZXMgZm9yIG5vbi1jdXJyZW50IGZpbGVzXG4gICAgICAgICAgICBpZiAoaXNDdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgbm90ZXNUb1NhdmUgPSB0aGlzLndlZWtseU5vdGVzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5leGlzdHMoZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGVzVG9TYXZlID0gZGF0YS53ZWVrbHlOb3RlcyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgZXZlbnRzOiBmaWxlRXZlbnRzLFxuICAgICAgICAgICAgICAgIGhvbGRlcjogaG9sZGVyVG9TYXZlLFxuICAgICAgICAgICAgICAgIHdlZWtseU5vdGVzOiBub3Rlc1RvU2F2ZSxcbiAgICAgICAgICAgICAgICBsYXN0TW9kaWZpZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShmaWxlLCBqc29uU3RyKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlXSBGYWlsZWQgdG8gc2F2ZScsIGZpbGVuYW1lLCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhvbGRlckZpbGUgPSBgJHtmb2xkZXJ9L2hvbGRlci5qc29uYDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGhkYXRhID0ge1xuICAgICAgICAgICAgICAgIGhvbGRlcjogdGhpcy5ob2xkZXJFdmVudHMsXG4gICAgICAgICAgICAgICAgbGFzdE1vZGlmaWVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBoanNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGhkYXRhLCBudWxsLCAyKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoaG9sZGVyRmlsZSwgaGpzb25TdHIpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlXSBGYWlsZWQgdG8gc2F2ZSBob2xkZXIuanNvbicsIGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9jdXNUb2RheSgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50RGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHZvaWQgdGhpcy5sb2FkQWxsRW50cmllcygpLnRoZW4oKCkgPT4geyB0aGlzLnJlbmRlcigpOyB9KTtcbiAgICB9XG5cbiAgICBzaGlmdE1vbnRoKGRlbHRhOiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXREYXRlKHRoaXMuY3VycmVudERhdGUuZ2V0RGF0ZSgpICsgKGRlbHRhICogNykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xuICAgICAgICAgICAgZC5zZXRNb250aChkLmdldE1vbnRoKCkgKyBkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gZDtcbiAgICAgICAgfVxuICAgICAgICB2b2lkIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHsgdGhpcy5yZW5kZXIoKTsgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVuZGVyKHRpdGxlRWw/OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy53ZWVrbHlOb3Rlc0VsKSB7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwucmVtb3ZlKCk7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVzZXQgZ3JpZCBzdHlsZSBpcyBoYW5kbGVkIGJ5IENTUyBjbGFzc2VzIGFuZCBpbmxpbmUgZWxlbWVudHNcblxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB7XG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hZGRDbGFzcygnZGF5YmxlLXdlZWstbW9kZScpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJXZWVrVmlldyh0aXRsZUVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLnJlbW92ZUNsYXNzKCdkYXlibGUtd2Vlay1tb2RlJyk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlck1vbnRoVmlldyh0aXRsZUVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlbmRlcldlZWtWaWV3KHRpdGxlRWw/OiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBtb250aExhYmVsID0gdGhpcy5jdXJyZW50RGF0ZS50b0xvY2FsZVN0cmluZygnZW4tVVMnLCB7IG1vbnRoOiAnbG9uZycsIHllYXI6ICdudW1lcmljJyB9KTtcbiAgICAgICAgaWYgKHRoaXMubW9udGhUaXRsZUVsKSB0aGlzLm1vbnRoVGl0bGVFbC5zZXRUZXh0KG1vbnRoTGFiZWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHdlZWsgdG9nZ2xlIGJ1dHRvbiBhY3RpdmUgc3RhdGVcbiAgICAgICAgaWYgKHRoaXMud2Vla1RvZ2dsZUJ0bikge1xuICAgICAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSkgdGhpcy53ZWVrVG9nZ2xlQnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy53ZWVrVG9nZ2xlQnRuLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ3JpZEVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMud2Vla0hlYWRlckVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWVrU3RhcnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrU3RhcnREYXk7XG4gICAgICAgIGNvbnN0IGJhc2UgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcbiAgICAgICAgY29uc3QgdERvdyA9IGJhc2UuZ2V0RGF5KCk7XG4gICAgICAgIGNvbnN0IGRpZmYgPSAoKHREb3cgLSB3ZWVrU3RhcnQpICsgNykgJSA3O1xuICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGJhc2UpO1xuICAgICAgICBzdGFydC5zZXREYXRlKGJhc2UuZ2V0RGF0ZSgpIC0gZGlmZik7IC8vIFN0YXJ0IG9mIHRoZSB3ZWVrXG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IHRoaXMud2Vla0hlYWRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ncmlkLWhlYWRlcicgfSk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBbJ3N1bicsJ21vbicsJ3R1ZScsJ3dlZCcsJ3RodScsJ2ZyaScsJ3NhdCddO1xuICAgICAgICBjb25zdCBvcmRlcmVkID0gZGF5cy5zbGljZSh3ZWVrU3RhcnQpLmNvbmNhdChkYXlzLnNsaWNlKDAsIHdlZWtTdGFydCkpO1xuICAgICAgICBvcmRlcmVkLmZvckVhY2goZCA9PiBoZWFkZXIuY3JlYXRlRGl2KHsgdGV4dDogZCwgY2xzOiAnZGF5YmxlLWdyaWQtaGVhZGVyLWNlbGwnIH0pKTtcblxuICAgICAgICAvLyBQcmUtY2FsY3VsYXRlIGxvbmcgZXZlbnQgbWFyZ2lucyAocmV1c2VkIGZyb20gbW9udGggdmlldyBsb2dpYylcbiAgICAgICAgY29uc3Qgc2VnbWVudEhlaWdodCA9IDI4O1xuICAgICAgICBjb25zdCBzZWdtZW50R2FwID0gNDsgLy8gZ2FwcHlcbiAgICAgICAgY29uc3QgY291bnRzQnlEYXRlOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XG4gICAgICAgIGNvbnN0IGxvbmdFdmVudHNQcmVzZXQgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUgJiYgZXYuc3RhcnREYXRlICE9PSBldi5lbmREYXRlKTtcbiAgICAgICAgbG9uZ0V2ZW50c1ByZXNldC5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoZXYuc3RhcnREYXRlKTtcbiAgICAgICAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKGV2LmVuZERhdGUpO1xuICAgICAgICAgICAgZm9yIChsZXQgZCA9IG5ldyBEYXRlKHN0YXJ0KTsgZCA8PSBlbmQ7IGQuc2V0RGF0ZShkLmdldERhdGUoKSArIDEpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeXkgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbW0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZCA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHt5eX0tJHttbX0tJHtkZH1gO1xuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR3JpZFxuICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgICAgICAgZC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSArIGkpO1xuICAgICAgICAgICAgY29uc3QgeXkgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICBjb25zdCBmdWxsRGF0ZSA9IGAke3l5fS0ke21tfS0ke2RkfWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGNlbGwgPSBmcmFnbWVudC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5JyB9KTtcbiAgICAgICAgICAgIGNlbGwuc2V0QXR0cignZGF0YS1kYXRlJywgZnVsbERhdGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcbiAgICAgICAgICAgIGRheUhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LW51bWJlcicsIHRleHQ6IFN0cmluZyhkLmdldERhdGUoKSkgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgY29uc3QgaXNUb2RheSA9IGQuZ2V0RGF0ZSgpID09PSB0LmdldERhdGUoKSAmJiBkLmdldE1vbnRoKCkgPT09IHQuZ2V0TW9udGgoKSAmJiBkLmdldEZ1bGxZZWFyKCkgPT09IHQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCdkYXlibGUtY3VycmVudC1kYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihzZWFyY2hCdG4sICdmb2N1cycpO1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGxvbmdDb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1sb25nLWNvbnRhaW5lcicgfSk7XG4gICAgICAgICAgICBsb25nQ29udGFpbmVyLmFkZENsYXNzKCdkYi1sb25nLWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1jb250YWluZXInIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBcHBseSBtYXJnaW5zIGZvciBsb25nIGV2ZW50c1xuICAgICAgICAgICAgY29uc3QgcHJlQ291bnQgPSBjb3VudHNCeURhdGVbZnVsbERhdGVdIHx8IDA7XG4gICAgICAgICAgICBjb25zdCBwcmVNdCA9IHByZUNvdW50ID4gMCA/IChwcmVDb3VudCAqIHNlZ21lbnRIZWlnaHQpICsgKE1hdGgubWF4KDAsIHByZUNvdW50IC0gMSkgKiBzZWdtZW50R2FwKSArIDIgOiAwO1xuICAgICAgICAgICAgY29uc3QgYWRqdXN0ZWQgPSBNYXRoLm1heCgwLCBwcmVNdCAtIDYpO1xuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IGFkanVzdGVkID8gYCR7YWRqdXN0ZWR9cHhgIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IGRheUV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuZGF0ZSA9PT0gZnVsbERhdGUpO1xuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZSA9PiBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5jcmVhdGVFdmVudEl0ZW0oZSkpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRHJhZyBhbmQgRHJvcCAocmV1c2VkIG9wdGltaXplZCBsb2dpYyBmcm9tIG1vbnRoIHZpZXcpXG4gICAgICAgICAgICBjb250YWluZXIub25kcmFnb3ZlciA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gY29udGFpbmVyICYmIGV2ZW50Q291bnQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRFdmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kcm9wLWluZGljYXRvcicgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYWJvdmUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldEV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYmVsb3cnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGluZGljYXRvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb250YWluZXIub25kcmFnbGVhdmUgPSAoZSkgPT4geyBcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkIHx8IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJykgIT09ICdjYWxlbmRhcicpIHJldHVybjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkQ29udGFpbmVyID0gZHJhZ2dlZEVsLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGNvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCByZWN0LmhlaWdodCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldEV2ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5hZnRlcihkcmFnZ2VkRWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW9yZGVyIGxvZ2ljXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsRXZlbnRFbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld09yZGVyID0gYWxsRXZlbnRFbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRheURhdGUgPSBmdWxsRGF0ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkgZGF5RXZlbnRJbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudElkVG9JbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgICAgICAgICAgICAgbmV3T3JkZXIuZm9yRWFjaCgoZXZlbnRJZCwgaWR4KSA9PiBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRBID0gdGhpcy5ldmVudHNbYV0uaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQiA9IHRoaXMuZXZlbnRzW2JdLmlkIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBldmVudElkVG9JbmRleC5nZXQoaWRBKSA/PyA5OTk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQiA9IGV2ZW50SWRUb0luZGV4LmdldChpZEIpID8/IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZW9yZGVyZWRFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgZGF5RXZlbnRJZHggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKHRoaXMuZXZlbnRzW2RheUV2ZW50SW5kaWNlc1tkYXlFdmVudElkeF1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SWR4Kys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaChldik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHJlb3JkZXJlZEV2ZW50cztcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEcm9wIG9uIGNlbGwgKG1vdmUgZnJvbSBob2xkZXIgb3Igb3RoZXIgZGF5KVxuICAgICAgICAgICAgY2VsbC5vbmRyYWdvdmVyID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjZWxsLmFkZENsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2hvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaElkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2biA9IHRoaXMuaG9sZGVyRXZlbnRzLnNwbGljZShoSWR4LCAxKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2bik7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzcmMgPT09ICdjYWxlbmRhcicpIHtcbiAgICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgZnJvbSBhbm90aGVyIGRheVxuICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XG4gICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHNbaWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBtb3ZpbmcgdG8gc2FtZSBkYXkgKGFscmVhZHkgaGFuZGxlZCBieSBjb250YWluZXIub25kcm9wKVxuICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlICE9PSBmdWxsRGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5kYXRlID0gZnVsbERhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBJbnRlcmFjdGlvbnNcbiAgICAgICAgICAgIGNlbGwub25jbGljayA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgJiYgdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgPT09IGNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgZnVsbERhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub25tb3VzZWRvd24gPSAoZXYpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoKGV2KS5idXR0b24gIT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydFNlbGVjdGlvbihmdWxsRGF0ZSwgY2VsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjZWxsLm9ubW91c2VvdmVyID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub250b3VjaHN0YXJ0ID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2VsbC5vbnRvdWNobW92ZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB0aGlzLnVwZGF0ZVNlbGVjdGlvbihmdWxsRGF0ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgbG9uZyBldmVudHNcbiAgICAgICAgLy8gUHJlcGFyZSBvdmVybGF5IGZvciBsb25nIGV2ZW50czsgaGlkZSBpdCB1bnRpbCBwb3NpdGlvbnMgYXJlIGNvbXB1dGVkXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ092ZXJsYXlFbCB8fCAhdGhpcy5fbG9uZ092ZXJsYXlFbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbCA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1sb25nLW92ZXJsYXknIH0pO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLmluc2V0ID0gJzAnO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS56SW5kZXggPSAnMTAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQodGhpcy5fbG9uZ092ZXJsYXlFbCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnJlbmRlckxvbmdFdmVudHMoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdSTyAmJiAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IG5ldyAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fbG9uZ1JPICYmIHRoaXMuZ3JpZEVsKSB0aGlzLl9sb25nUk8ub2JzZXJ2ZSh0aGlzLmdyaWRFbCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWVrbHkgTm90ZXNcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtseU5vdGVzRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gQWRqdXN0IGdyaWQgdG8gYWxsb3cgc2hyaW5raW5nIGFuZCBsZXQgbm90ZXMgdGFrZSBzcGFjZVxuICAgICAgICAgICAgdGhpcy5ncmlkRWwuc3R5bGUuZmxleCA9ICcwIDEgYXV0byc7XG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5zdHlsZS5taW5IZWlnaHQgPSAnMCc7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhc2UgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlKTtcbiAgICAgICAgICAgIGNvbnN0IHREb3cgPSBiYXNlLmdldERheSgpO1xuICAgICAgICAgICAgY29uc3QgZGlmZiA9ICgodERvdyAtIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSkgKyA3KSAlIDc7XG4gICAgICAgICAgICBjb25zdCB3ZWVrU3RhcnREYXRlID0gbmV3IERhdGUoYmFzZSk7XG4gICAgICAgICAgICB3ZWVrU3RhcnREYXRlLnNldERhdGUoYmFzZS5nZXREYXRlKCkgLSBkaWZmKTtcbiAgICAgICAgICAgIGNvbnN0IHdlZWtLZXkgPSB3ZWVrU3RhcnREYXRlLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsID0gdGhpcy5jYWxlbmRhckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS13ZWVrbHktbm90ZXMnIH0pO1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmZsZXggPSAnMCAwIGF1dG8gIWltcG9ydGFudCc7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc0VsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbiAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5ib3JkZXJUb3AgPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzRWwuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEcmFnIEhhbmRsZVxuICAgICAgICAgICAgY29uc3QgZHJhZ0hhbmRsZSA9IHRoaXMud2Vla2x5Tm90ZXNFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2x5LWRyYWctaGFuZGxlJyB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fYm91bmRXZWVrbHlOb3Rlc01vdXNlTW92ZSA9IChtZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Jlc2l6aW5nV2Vla2x5Tm90ZXMgfHwgIXRoaXMud2Vla2x5Tm90ZXNFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IGR5ID0gbWUuY2xpZW50WSAtIHRoaXMud2Vla2x5Tm90ZXNSZXNpemVTdGFydFk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3SCA9IE1hdGgubWF4KDEwMCwgdGhpcy53ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0SGVpZ2h0IC0gZHkpO1xuICAgICAgICAgICAgICAgIHRoaXMud2Vla2x5Tm90ZXNFbC5zdHlsZS5oZWlnaHQgPSBgJHtuZXdIfXB4ICFpbXBvcnRhbnRgO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc1Jlc2l6aW5nV2Vla2x5Tm90ZXMpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmUgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwIGFzIEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLndlZWtseU5vdGVzRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZXNIZWlnaHQgPSB0aGlzLndlZWtseU5vdGVzRWwub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZHJhZ0hhbmRsZS5vbm1vdXNlZG93biA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLndlZWtseU5vdGVzRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdXZWVrbHlOb3RlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc1Jlc2l6ZVN0YXJ0WSA9IGUuY2xpZW50WTtcbiAgICAgICAgICAgICAgICB0aGlzLndlZWtseU5vdGVzUmVzaXplU3RhcnRIZWlnaHQgPSB0aGlzLndlZWtseU5vdGVzRWwub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZU1vdmUgYXMgRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kV2Vla2x5Tm90ZXNNb3VzZVVwIGFzIEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy1oZWFkZXInIH0pO1xuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICBoZWFkZXIuc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnc3BhY2UtYmV0d2Vlbic7XG4gICAgICAgICAgICBoZWFkZXIuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgICAgICAgICAgaGVhZGVyLnN0eWxlLnBhZGRpbmcgPSAnOHB4IDEwcHggMCAxMHB4JztcbiAgICAgICAgICAgIGhlYWRlci5zdHlsZS5mbGV4ID0gJzAgMCBhdXRvJztcbiAgICAgICAgICAgIGNvbnN0IGg0ID0gaGVhZGVyLmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ1dlZWtseSBub3RlcycgfSk7XG4gICAgICAgICAgICBoNC5zdHlsZS5tYXJnaW4gPSAnMCc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnRlbnQgYXJlYSB3aXRoIHRleHRhcmVhIG9ubHlcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRDb250YWluZXIgPSB0aGlzLndlZWtseU5vdGVzRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXdlZWtseS1ub3Rlcy1jb250ZW50JyB9KTtcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUuZmxleCA9ICcwIDAgYXV0byAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUub3ZlcmZsb3cgPSAndmlzaWJsZSAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUucGFkZGluZyA9ICcxMHB4JztcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4ICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgY29udGVudENvbnRhaW5lci5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbiAhaW1wb3J0YW50JztcbiAgICAgICAgICAgIGNvbnRlbnRDb250YWluZXIuc3R5bGUubWluSGVpZ2h0ID0gJzAgIWltcG9ydGFudCc7XG5cbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHRleHRcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy53ZWVrbHlOb3Rlc1t3ZWVrS2V5XSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRleHRhcmVhIGZvciBlZGl0aW5nXG4gICAgICAgICAgICBjb25zdCB0ZXh0YXJlYUVsID0gY29udGVudENvbnRhaW5lci5jcmVhdGVFbCgndGV4dGFyZWEnLCB7IGNsczogJ2RheWJsZS13ZWVrbHktbm90ZXMtdGV4dGFyZWEnIH0pO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC52YWx1ZSA9IGN1cnJlbnRUZXh0O1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS53aWR0aCA9ICcxMDAlICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5wYWRkaW5nID0gJzhweCc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmZvbnRGYW1pbHkgPSAndmFyKC0tZm9udC1tb25vc3BhY2UpJztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuZm9udFNpemUgPSAndmFyKC0tZm9udC10ZXh0LXNpemUpJztcbiAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCB2YXIoLS1kaXZpZGVyLWNvbG9yKSc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHgnO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5iYWNrZ3JvdW5kID0gJ3ZhcigtLWJhY2tncm91bmQtc2Vjb25kYXJ5KSc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbm9ybWFsKSc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLnJlc2l6ZSA9ICdub25lICFpbXBvcnRhbnQnO1xuICAgICAgICAgICAgdGV4dGFyZWFFbC5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICB0ZXh0YXJlYUVsLnN0eWxlLm92ZXJmbG93WSA9ICdoaWRkZW4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWhlaWdodCBmdW5jdGlvbiAtIGdyb3dzIHdpdGggY29udGVudCB1cCB0byA1MDBweCBtYXhcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVRleHRhcmVhSGVpZ2h0ID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuaGVpZ2h0ID0gJ2F1dG8nO1xuICAgICAgICAgICAgICAgIHRleHRhcmVhRWwuc3R5bGUuaGVpZ2h0ID0gYCR7dGV4dGFyZWFFbC5zY3JvbGxIZWlnaHR9cHhgO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHRcbiAgICAgICAgICAgIHNldFRpbWVvdXQodXBkYXRlVGV4dGFyZWFIZWlnaHQsIDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgb24gaW5wdXRcbiAgICAgICAgICAgIHRleHRhcmVhRWwuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWVrbHlOb3Rlc1t3ZWVrS2V5XSA9IHRleHRhcmVhRWwudmFsdWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlVGV4dGFyZWFIZWlnaHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRlYm91bmNlZFNhdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgdGFiIGtleVxuICAgICAgICAgICAgdGV4dGFyZWFFbC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdUYWInKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dGFyZWEgPSBlLnRhcmdldCBhcyBIVE1MVGV4dEFyZWFFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IHRleHRhcmVhLnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSB0ZXh0YXJlYS5zZWxlY3Rpb25FbmQ7XG4gICAgICAgICAgICAgICAgICAgIHRleHRhcmVhLnZhbHVlID0gdGV4dGFyZWEudmFsdWUuc3Vic3RyaW5nKDAsIHN0YXJ0KSArICdcXHQnICsgdGV4dGFyZWEudmFsdWUuc3Vic3RyaW5nKGVuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRleHRhcmVhLnNlbGVjdGlvblN0YXJ0ID0gdGV4dGFyZWEuc2VsZWN0aW9uRW5kID0gc3RhcnQgKyAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbmRlck1vbnRoVmlldyh0aXRsZUVsPzogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeSA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgbSA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgY29uc3QgbW9udGhMYWJlbCA9IG5ldyBEYXRlKHksIG0pLnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgbW9udGg6ICdsb25nJywgeWVhcjogJ251bWVyaWMnIH0pO1xuICAgICAgICBpZiAodGhpcy5tb250aFRpdGxlRWwpIHRoaXMubW9udGhUaXRsZUVsLnNldFRleHQobW9udGhMYWJlbCk7XG4gICAgICAgIHRoaXMuZ3JpZEVsLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IHdlZWtTdGFydCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheTtcbiAgICAgICAgY29uc3QgZmlyc3REYXkgPSBuZXcgRGF0ZSh5LCBtLCAxKS5nZXREYXkoKTtcbiAgICAgICAgY29uc3QgZGF5c0luTW9udGggPSBuZXcgRGF0ZSh5LCBtICsgMSwgMCkuZ2V0RGF0ZSgpO1xuICAgICAgICBjb25zdCBsZWFkaW5nID0gKGZpcnN0RGF5IC0gd2Vla1N0YXJ0ICsgNykgJSA3O1xuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbC5lbXB0eSgpO1xuICAgICAgICBjb25zdCBoZWFkZXIgPSB0aGlzLndlZWtIZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXInIH0pO1xuICAgICAgICBjb25zdCBkYXlzID0gWydzdW4nLCdtb24nLCd0dWUnLCd3ZWQnLCd0aHUnLCdmcmknLCdzYXQnXTtcbiAgICAgICAgY29uc3Qgb3JkZXJlZCA9IGRheXMuc2xpY2Uod2Vla1N0YXJ0KS5jb25jYXQoZGF5cy5zbGljZSgwLCB3ZWVrU3RhcnQpKTtcbiAgICAgICAgb3JkZXJlZC5mb3JFYWNoKGQgPT4gaGVhZGVyLmNyZWF0ZURpdih7IHRleHQ6IGQsIGNsczogJ2RheWJsZS1ncmlkLWhlYWRlci1jZWxsJyB9KSk7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcbiAgICAgICAgY29uc3Qgc2VnbWVudEdhcCA9IDQ7IC8vIGdhcHB5XG4gICAgICAgIGNvbnN0IGNvdW50c0J5RGF0ZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgICAgICBjb25zdCBsb25nRXZlbnRzUHJlc2V0ID0gdGhpcy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSk7XG4gICAgICAgIGxvbmdFdmVudHNQcmVzZXQuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHl5ID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eXl9LSR7bW19LSR7ZGR9YDtcbiAgICAgICAgICAgICAgICBjb3VudHNCeURhdGVba2V5XSA9IChjb3VudHNCeURhdGVba2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlYWRpbmc7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXkgZGF5YmxlLWluYWN0aXZlJyB9KTtcbiAgICAgICAgICAgIGMuc2V0QXR0cignZGF0YS1lbXB0eScsICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgZGF5ID0gMTsgZGF5IDw9IGRheXNJbk1vbnRoOyBkYXkrKykge1xuICAgICAgICAgICAgY29uc3QgZnVsbERhdGUgPSBgJHt5fS0ke1N0cmluZyhtICsgMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xuICAgICAgICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXknIH0pO1xuICAgICAgICAgICAgY2VsbC5zZXRBdHRyKCdkYXRhLWRhdGUnLCBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcbiAgICAgICAgICAgIGRheUhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LW51bWJlcicsIHRleHQ6IFN0cmluZyhkYXkpIH0pO1xuICAgICAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF5ID09PSB0LmdldERhdGUoKSAmJiBtID09PSB0LmdldE1vbnRoKCkgJiYgeSA9PT0gdC5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCdkYXlibGUtY3VycmVudC1kYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcbiAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihzZWFyY2hCdG4sICdmb2N1cycpO1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsb25nQ29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1jb250YWluZXInIH0pO1xuICAgICAgICAgICAgbG9uZ0NvbnRhaW5lci5hZGRDbGFzcygnZGItbG9uZy1jb250YWluZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicgfSk7XG4gICAgICAgICAgICBjb25zdCBwcmVDb3VudCA9IGNvdW50c0J5RGF0ZVtmdWxsRGF0ZV0gfHwgMDtcbiAgICAgICAgICAgIGNvbnN0IHByZU10ID0gcHJlQ291bnQgPiAwID8gKHByZUNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgcHJlQ291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XG4gICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gcHJlTXQgPyBgJHtwcmVNdH1weGAgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5kYXRlID09PSBmdWxsRGF0ZSk7XG4gICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChlID0+IGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmNyZWF0ZUV2ZW50SXRlbShlKSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyByZW9yZGVyaW5nIGV2ZW50cyB3aXRoaW4gdGhlIGNvbnRhaW5lclxuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkcm9wIHBvc2l0aW9uIGluZGljYXRvciBvbmx5IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBldmVudHNcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gY29udGFpbmVyICYmIGV2ZW50Q291bnQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgdmVydGljYWwgcG9zaXRpb24gd2l0aGluIHRoZSB0YXJnZXQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgZXhpc3RpbmcgZHJvcCBpbmRpY2F0b3JzXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaW5kaWNhdG9yIGFib3ZlIG9yIGJlbG93IGJhc2VkIG9uIG1vdXNlIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEcm9wIGFib3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuYWRkQ2xhc3MoJ2Fib3ZlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEcm9wIGJlbG93XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3IuYWRkQ2xhc3MoJ2JlbG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5hZnRlcihpbmRpY2F0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgIC8vIE9ubHkgcmVtb3ZlIGluZGljYXRvcnMgaWYgd2UncmUgdHJ1bHkgbGVhdmluZyB0aGUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkcm9wIGluZGljYXRvclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdjYWxlbmRhcicpIHJldHVybjsgLy8gT25seSByZW9yZGVyIGNhbGVuZGFyIGV2ZW50cywgbm90IGZyb20gaG9sZGVyXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgZXZlbnQgYmVpbmcgZHJhZ2dlZCBieSBJRFxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyYWdnZWQgZXZlbnQgaXMgZnJvbSB0aGlzIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRmluZCB0YXJnZXQgZXZlbnQgdG8gaW5zZXJ0IGJlZm9yZS9hZnRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgYmVmb3JlXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5zZXJ0IGFmdGVyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgdW5kZXJseWluZyBldmVudHMgYXJyYXkgdG8gbWF0Y2ggdGhlIG5ldyBET00gb3JkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxFdmVudEVscyA9IEFycmF5LmZyb20oY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3T3JkZXIgPSBhbGxFdmVudEVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmlkKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVidWlsZCBldmVudHMgYXJyYXkgZm9yIHRoaXMgZGF0ZSB0byBtYXRjaCBuZXcgb3JkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlEYXRlID0gZnVsbERhdGU7IC8vIGZ1bGxEYXRlIGZyb20gb3V0ZXIgc2NvcGVcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNvcnQgdGhlIGluZGljZXMgYmFzZWQgb24gbmV3IG9yZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRJZFRvSW5kZXggPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgICAgICAgICAgICAgIG5ld09yZGVyLmZvckVhY2goKGV2ZW50SWQsIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBldmVudElkVG9JbmRleC5zZXQoZXZlbnRJZCwgaWR4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkYXlFdmVudEluZGljZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZEEgPSB0aGlzLmV2ZW50c1thXS5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRCID0gdGhpcy5ldmVudHNbYl0uaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQSA9IGV2ZW50SWRUb0luZGV4LmdldChpZEEpID8/IDk5OTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJCID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQikgPz8gOTk5O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3JkZXJBIC0gb3JkZXJCO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlY29uc3RydWN0IGV2ZW50cyBhcnJheSB3aXRoIHJlb3JkZXJlZCBkYXkgZXZlbnRzXG4gICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGRheUV2ZW50SWR4ID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaCh0aGlzLmV2ZW50c1tkYXlFdmVudEluZGljZXNbZGF5RXZlbnRJZHhdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudElkeCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVvcmRlcmVkRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSByZW9yZGVyZWRFdmVudHM7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgdXBkYXRlZCBvcmRlclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNlbGwub25jbGljayA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IG9wZW4gbW9kYWwgaWYgY2xpY2tpbmcgb24gdGhlIGNlbGwgaXRzZWxmIG9yIGNvbnRhaW5lciwgbm90IG9uIGFuIGV2ZW50XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpICYmIHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpID09PSBjb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuRXZlbnRNb2RhbCh1bmRlZmluZWQsIGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2VsbC5vbm1vdXNlZG93biA9IChldikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgoZXYpLmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzdGFydCBzZWxlY3Rpb24gaWYgY2xpY2tpbmcgb24gYW4gZXZlbnRcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiBhbHJlYWR5IGRyYWdnaW5nXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNlbGwub25tb3VzZW92ZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNlbGwub250b3VjaHN0YXJ0ID0gKGV2KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHN0YXJ0IHNlbGVjdGlvbiBpZiB0b3VjaGluZyBhbiBldmVudFxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc3RhcnQgc2VsZWN0aW9uIGlmIGFscmVhZHkgZHJhZ2dpbmdcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydFNlbGVjdGlvbihmdWxsRGF0ZSwgY2VsbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2VsbC5vbnRvdWNobW92ZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB0aGlzLnVwZGF0ZVNlbGVjdGlvbihmdWxsRGF0ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2VsbC5vbmRyYWdvdmVyID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjZWxsLmFkZENsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XG4gICAgICAgICAgICBjZWxsLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2hvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhJZHggPSB0aGlzLmhvbGRlckV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoSWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2biA9IHRoaXMuaG9sZGVyRXZlbnRzLnNwbGljZShoSWR4LCAxKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldm4uZGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXZuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHNbaWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUgJiYgZXYuc3RhcnREYXRlICE9PSBldi5lbmREYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwYW4gPSBNYXRoLmZsb29yKChuZXcgRGF0ZShldi5lbmREYXRlKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShldi5zdGFydERhdGUpLmdldFRpbWUoKSkgLyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LnN0YXJ0RGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBucyA9IG5ldyBEYXRlKGZ1bGxEYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmUgPSBuZXcgRGF0ZShucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lLnNldERhdGUobnMuZ2V0RGF0ZSgpICsgc3Bhbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmVuZERhdGUgPSBgJHtuZS5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhuZS5nZXRNb250aCgpKzEpLnBhZFN0YXJ0KDIsJzAnKX0tJHtTdHJpbmcobmUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCcwJyl9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV2LmRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuZGF0ZSA9IGZ1bGxEYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdGYWlsZWQgdG8gc2F2ZSBldmVudCBjaGFuZ2VzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEZWZlciBsb25nIGV2ZW50IHBvc2l0aW9uaW5nIHVudGlsIGxheW91dCBzZXR0bGVzXG4gICAgICAgIC8vIFByZXBhcmUgb3ZlcmxheSBmb3IgbG9uZyBldmVudHM7IGhpZGUgaXQgdW50aWwgcG9zaXRpb25zIGFyZSBjb21wdXRlZFxuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5pbnNldCA9ICcwJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFwcGVuZENoaWxkKHRoaXMuX2xvbmdPdmVybGF5RWwpO1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLnJlbmRlckxvbmdFdmVudHMoKSk7XG4gICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XG4gICAgICAgIGlmICghdGhpcy5fbG9uZ1JPICYmICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcikge1xuICAgICAgICAgICAgLy8gT2JzZXJ2ZSBncmlkIHNpemUgY2hhbmdlcyB0byBrZWVwIGxvbmcgc3BhbnMgYWxpZ25lZFxuICAgICAgICAgICAgdGhpcy5fbG9uZ1JPID0gbmV3ICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJMb25nRXZlbnRzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9sb25nUk8gJiYgdGhpcy5ncmlkRWwpIHRoaXMuX2xvbmdSTy5vYnNlcnZlKHRoaXMuZ3JpZEVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXJ0U2VsZWN0aW9uKGRhdGU6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0aW9uUmFuZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2VuZFNlbE9uY2UpO1xuICAgIH1cbiAgICBfZW5kU2VsT25jZSA9ICgpID0+IHsgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2VuZFNlbE9uY2UpOyB0aGlzLmVuZFNlbGVjdGlvbigpOyB9O1xuICAgIHVwZGF0ZVNlbGVjdGlvbihkYXRlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU2VsZWN0aW5nIHx8IHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGlvblJhbmdlKCk7XG4gICAgfVxuICAgIGVuZFNlbGVjdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU2VsZWN0aW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlICYmIHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgcyA9IHRoaXMuc2VsZWN0aW9uU3RhcnREYXRlO1xuICAgICAgICAgICAgY29uc3QgZSA9IHRoaXMuc2VsZWN0aW9uRW5kRGF0ZTtcbiAgICAgICAgICAgIHRoaXMub3BlbkV2ZW50TW9kYWxGb3JSYW5nZShzLCBlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgfVxuICAgIGhpZ2hsaWdodFNlbGVjdGlvblJhbmdlKCkge1xuICAgICAgICBjb25zdCBzID0gbmV3IERhdGUodGhpcy5zZWxlY3Rpb25TdGFydERhdGUgKyAnVDAwOjAwOjAwJyk7XG4gICAgICAgIGNvbnN0IGUgPSBuZXcgRGF0ZSh0aGlzLnNlbGVjdGlvbkVuZERhdGUgKyAnVDAwOjAwOjAwJyk7XG4gICAgICAgIGNvbnN0IFttaW4sIG1heF0gPSBzIDw9IGUgPyBbcywgZV0gOiBbZSwgc107XG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IHtcbiAgICAgICAgICAgIGMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgY29uc3QgZCA9IGMuZ2V0QXR0cignZGF0YS1kYXRlJyk7XG4gICAgICAgICAgICBpZiAoIWQpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IGR0ID0gbmV3IERhdGUoZCArICdUMDA6MDA6MDAnKTtcbiAgICAgICAgICAgIC8vIEluY2x1ZGUgYm90aCBzdGFydCBhbmQgZW5kIGRhdGVzICh1c2UgPj0gYW5kIDw9IGZvciBpbmNsdXNpdmUgcmFuZ2UpXG4gICAgICAgICAgICBpZiAoZHQgPj0gbWluICYmIGR0IDw9IG1heCkge1xuICAgICAgICAgICAgICAgIGMuYWRkQ2xhc3MoJ2RheWJsZS1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2xlYXJTZWxlY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IGMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1zZWxlY3RlZCcpKTtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydERhdGUgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkVuZERhdGUgPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIG9wZW5FdmVudE1vZGFsRm9yUmFuZ2Uoc3RhcnQ6IHN0cmluZywgZW5kOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpO1xuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxuICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfVxuICAgICAgICBjYXRjaCB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEV2ZW50TW9kYWwodGhpcy5hcHAsIHVuZGVmaW5lZCwgc3RhcnQsIGVuZCwgYXN5bmMgcmVzdWx0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xuICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9LCBhc3luYyAoKSA9PiB7IGF3YWl0IFByb21pc2UucmVzb2x2ZSgpOyB9LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBpY29uID0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbC5zZXRJY29uKGljb24pO1xuICAgICAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwaWNrZXIub3BlbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkuY2F0ZWdvcmllcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXTtcbiAgICAgICAgKG1vZGFsIGFzIGFueSkucGx1Z2luID0gdGhpcy5wbHVnaW47XG4gICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICB9XG5cbiAgICByZW5kZXJMb25nRXZlbnRzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2xvbmdPdmVybGF5RWwgfHwgIXRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1vdmVybGF5JyB9KTtcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgdGhpcy5fbG9uZ092ZXJsYXlFbC5zdHlsZS5pbnNldCA9ICcwJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20odGhpcy5ncmlkRWwuY2hpbGRyZW4pLmZpbHRlcihlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmhhc0NsYXNzPy4oJ2RheWJsZS1kYXknKSkgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgY29uc3QgdG9kYXlOdW0gPSAoZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuID0gZWwucXVlcnlTZWxlY3RvcignLmRheWJsZS1kYXktbnVtYmVyJyk7XG4gICAgICAgICAgICByZXR1cm4gbiA/IG4uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKG4pLm1hcmdpbkJvdHRvbSB8fCAnMCcpIDogMjQ7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcbiAgICAgICAgY29uc3Qgc2VnbWVudEdhcCA9IDQ7XG4gICAgICAgIGNvbnN0IGdldENlbGxXaWR0aCA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjZWxscy5sZW5ndGggPT09IDApIHJldHVybiAxMDA7XG4gICAgICAgICAgICByZXR1cm4gKGNlbGxzWzBdKS5vZmZzZXRXaWR0aCB8fCAxMDA7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNvdW50c0J5RGF0ZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgICAgICBjb25zdCBsb25nRXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGV2ID0+IGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSk7XG4gICAgICAgIGxvbmdFdmVudHMuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3l9LSR7bX0tJHtkZH1gO1xuICAgICAgICAgICAgICAgIGNvdW50c0J5RGF0ZVtrZXldID0gKGNvdW50c0J5RGF0ZVtrZXldIHx8IDApICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHJlcXVpcmVkS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRJZHggPSBjZWxscy5maW5kSW5kZXgoYyA9PiBjLmdldEF0dHIoJ2RhdGEtZGF0ZScpID09PSBldi5zdGFydERhdGUpO1xuICAgICAgICAgICAgaWYgKHN0YXJ0SWR4ID09PSAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUpO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSk7XG4gICAgICAgICAgICBjb25zdCBvdmVybGFwID0gbG9uZ0V2ZW50c1xuICAgICAgICAgICAgICAgIC5maWx0ZXIoZSA9PiBlLnN0YXJ0RGF0ZSAmJiBlLmVuZERhdGUgJiYgZS5zdGFydERhdGUgIT09IGUuZW5kRGF0ZSAmJiBuZXcgRGF0ZShlLnN0YXJ0RGF0ZSkgPD0gc3RhcnQgJiYgbmV3IERhdGUoZS5lbmREYXRlKSA+PSBzdGFydClcbiAgICAgICAgICAgICAgICAuc29ydCgoYSxiKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkID0gKG5ldyBEYXRlKGEuZW5kRGF0ZSkuZ2V0VGltZSgpIC0gbmV3IERhdGUoYS5zdGFydERhdGUpLmdldFRpbWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJkID0gKG5ldyBEYXRlKGIuZW5kRGF0ZSkuZ2V0VGltZSgpIC0gbmV3IERhdGUoYi5zdGFydERhdGUpLmdldFRpbWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhZCAhPT0gYmQpIHJldHVybiBiZCAtIGFkOyAvLyBsb25nZXIgZmlyc3QgKG9uIHRvcClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQubG9jYWxlQ29tcGFyZShiLmlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrSW5kZXggPSBvdmVybGFwLmZpbmRJbmRleChlID0+IGUuaWQgPT09IGV2LmlkKTtcbiAgICAgICAgICAgIGNvbnN0IHNwYW4gPSBNYXRoLmZsb29yKChlbmQuZ2V0VGltZSgpIC0gc3RhcnQuZ2V0VGltZSgpKS84NjQwMDAwMCkgKyAxO1xuICAgICAgICAgICAgY29uc3QgY2VsbHNQZXJSb3cgPSA3O1xuICAgICAgICAgICAgY29uc3Qgc3RhcnRSb3cgPSBNYXRoLmZsb29yKHN0YXJ0SWR4IC8gY2VsbHNQZXJSb3cpO1xuICAgICAgICAgICAgY29uc3QgZW5kSWR4ID0gc3RhcnRJZHggKyBzcGFuIC0gMTtcbiAgICAgICAgICAgIGNvbnN0IGVuZFJvdyA9IE1hdGguZmxvb3IoZW5kSWR4IC8gY2VsbHNQZXJSb3cpO1xuICAgICAgICAgICAgY29uc3Qgc3R5bGVTaWcgPSBgJHtldi5jYXRlZ29yeUlkIHx8ICcnfXwke2V2LmNvbG9yIHx8ICcnfXwke2V2LnRleHRDb2xvciB8fCAnJ318JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eX18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1c318JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlck9wYWNpdHl9YDtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTaWcgPSBgJHtldi50aXRsZSB8fCAnJ318JHtldi5kZXNjcmlwdGlvbiB8fCAnJ318JHtldi5pY29uIHx8ICcnfXwke2V2LnRpbWUgfHwgJyd9YDtcbiAgICAgICAgICAgIGlmIChzdGFydFJvdyA9PT0gZW5kUm93KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBjZWxsc1tzdGFydElkeF07XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IGNlbGxzW2VuZElkeF07XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdCB8fCAhbGFzdCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyTGVmdCA9IChmaXJzdCkub2Zmc2V0TGVmdDtcbiAgICAgICAgICAgICAgICBjb25zdCBmclRvcCA9IChmaXJzdCkub2Zmc2V0VG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxyUmlnaHQgPSAobGFzdCkub2Zmc2V0TGVmdCArIChsYXN0KS5vZmZzZXRXaWR0aDtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3BPZmZzZXQgPSB0b2RheU51bShmaXJzdCkgKyAxNCArIHN0YWNrSW5kZXggKiAoc2VnbWVudEhlaWdodCArIHNlZ21lbnRHYXApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBmckxlZnQgLSAyO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IGZyVG9wICsgdG9wT2Zmc2V0O1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gKGxyUmlnaHQgLSBmckxlZnQpICsgNDtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtldi5pZH06cm93OiR7c3RhcnRSb3d9LXNpbmdsZWA7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWRLZXlzLmFkZChrZXkpO1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gdGhpcy5fbG9uZ0Vscy5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuY3JlYXRlRXZlbnRJdGVtKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc2luZ2xlJyk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtKS5kYXRhc2V0LmxvbmdLZXkgPSBrZXk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtKS5kYXRhc2V0LnN0eWxlU2lnID0gc3R5bGVTaWc7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtKS5kYXRhc2V0LmNvbnRlbnRTaWcgPSBjb250ZW50U2lnO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMub3BlbkV2ZW50TW9kYWwoZXYuaWQsIGV2LnN0YXJ0RGF0ZSwgZXYuZW5kRGF0ZSk7IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZEVsLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2lnID0gc3R5bGVTaWc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNzaWcgPSBjb250ZW50U2lnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0pLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZyB8fCAoaXRlbSkuZGF0YXNldC5jb250ZW50U2lnICE9PSBjc2lnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdJdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXNpbmdsZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0pLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtKS5kYXRhc2V0LnN0eWxlU2lnID0gc2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0pLmRhdGFzZXQuY29udGVudFNpZyA9IGNzaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCwgZXYuc3RhcnREYXRlLCBldi5lbmREYXRlKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnBhcmVudEVsZW1lbnQpIGl0ZW0ucmVwbGFjZVdpdGgobmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gbmV3SXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmlzQ29ubmVjdGVkIHx8IGl0ZW0ucGFyZW50RWxlbWVudCAhPT0gdGhpcy5ncmlkRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChpdGVtKS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItd2lkdGgnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID8/IDJ9cHhgKTtcbiAgICAgICAgICAgICAgICAoaXRlbSkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmxlZnQgPSBgJHtsZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnRvcCA9IGAke3RvcH1weGA7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmhlaWdodCA9IGAke3NlZ21lbnRIZWlnaHR9cHhgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByb3cgPSBzdGFydFJvdzsgcm93IDw9IGVuZFJvdzsgcm93KyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93U3RhcnRJZHggPSByb3cgKiBjZWxsc1BlclJvdztcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93RW5kSWR4ID0gTWF0aC5taW4ocm93U3RhcnRJZHggKyBjZWxsc1BlclJvdyAtIDEsIGNlbGxzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudFN0YXJ0SW5Sb3cgPSByb3cgPT09IHN0YXJ0Um93ID8gc3RhcnRJZHggOiByb3dTdGFydElkeDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRFbmRJblJvdyA9IHJvdyA9PT0gZW5kUm93ID8gZW5kSWR4IDogcm93RW5kSWR4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRTdGFydEluUm93ID4gcm93RW5kSWR4IHx8IGV2ZW50RW5kSW5Sb3cgPCByb3dTdGFydElkeCkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbZXZlbnRTdGFydEluUm93XTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdCA9IGNlbGxzW2V2ZW50RW5kSW5Sb3ddO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZpcnN0IHx8ICFsYXN0KSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJMZWZ0ID0gKGZpcnN0KS5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmclRvcCA9IChmaXJzdCkub2Zmc2V0VG9wO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsclJpZ2h0ID0gKGxhc3QpLm9mZnNldExlZnQgKyAobGFzdCkub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvcE9mZnNldCA9IHRvZGF5TnVtKGZpcnN0KSArIDE0ICsgc3RhY2tJbmRleCAqIChzZWdtZW50SGVpZ2h0ICsgc2VnbWVudEdhcCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBmckxlZnQgLSAyO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBmclRvcCArIHRvcE9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSAobHJSaWdodCAtIGZyTGVmdCkgKyA0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtldi5pZH06cm93OiR7cm93fWA7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB0aGlzLl9sb25nRWxzLmdldChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gc3RhcnRSb3cpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXN0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09PSBlbmRSb3cpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LWVuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0pLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIChpdGVtKS5kYXRhc2V0LnN0eWxlU2lnID0gc3R5bGVTaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAoaXRlbSkuZGF0YXNldC5jb250ZW50U2lnID0gY29udGVudFNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5zdGFydERhdGUsIGV2LmVuZERhdGUpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkRWwuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2lnID0gc3R5bGVTaWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjc2lnID0gY29udGVudFNpZztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoaXRlbSkuZGF0YXNldC5zdHlsZVNpZyAhPT0gc2lnIHx8IChpdGVtKS5kYXRhc2V0LmNvbnRlbnRTaWcgIT09IGNzaWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdJdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gc3RhcnRSb3cpIG5ld0l0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1sb25nLWV2ZW50LXN0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gZW5kUm93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1lbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtKS5kYXRhc2V0LnN0eWxlU2lnID0gc2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtKS5kYXRhc2V0LmNvbnRlbnRTaWcgPSBjc2lnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0ub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMub3BlbkV2ZW50TW9kYWwoZXYuaWQsIGV2LnN0YXJ0RGF0ZSwgZXYuZW5kRGF0ZSk7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gbmV3SXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5pc0Nvbm5lY3RlZCB8fCBpdGVtLnBhcmVudEVsZW1lbnQgIT09IHRoaXMuZ3JpZEVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAoaXRlbSkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXdpZHRoJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA/PyAyfXB4YCk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtKS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItcmFkaXVzJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXMgPz8gNn1weGApO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmxlZnQgPSBgJHtsZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS50b3AgPSBgJHt0b3B9cHhgO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmhlaWdodCA9IGAke3NlZ21lbnRIZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgc3RhbGUgbG9uZyBpdGVtc1xuICAgICAgICBBcnJheS5mcm9tKHRoaXMuX2xvbmdFbHMua2V5cygpKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlcXVpcmVkS2V5cy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpcy5fbG9uZ0Vscy5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICBpZiAoZWwgJiYgZWwucGFyZW50RWxlbWVudCkgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNlbGxzLmZvckVhY2goY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY2VsbC5nZXRBdHRyKCdkYXRhLWRhdGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRzQnlEYXRlW2RhdGVdIHx8IDA7XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSBjZWxsLnF1ZXJ5U2VsZWN0b3IoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJyk7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZU10ID0gY291bnQgPiAwID8gKGNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgY291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNUb2RheUNlbGwgPSBjZWxsLmNsYXNzTGlzdC5jb250YWlucygnZGF5YmxlLWN1cnJlbnQtZGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXQgPSBpc1RvZGF5Q2VsbCA/IE1hdGgubWF4KDAsIGJhc2VNdCAtIDQpIDogYmFzZU10OyAvLyBnYXBweVxuICAgICAgICAgICAgICAgIChjb250YWluZXIgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLm1hcmdpblRvcCA9IG10ID8gYCR7bXR9cHhgIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNyZWF0ZUV2ZW50SXRlbShldjogRGF5YmxlRXZlbnQpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgaXRlbS5jbGFzc05hbWUgPSAnZGF5YmxlLWV2ZW50JztcbiAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsICd0cnVlJyk7XG4gICAgICAgIGl0ZW0uZGF0YXNldC5pZCA9IGV2LmlkO1xuICAgICAgICBpdGVtLmRhdGFzZXQuY2F0ZWdvcnlJZCA9IGV2LmNhdGVnb3J5SWQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB0aXRsZS9kZXNjcmlwdGlvbiBhbGlnbm1lbnRcbiAgICAgICAgY29uc3QgdGl0bGVBbGlnbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiB8fCAnbGVmdCc7XG4gICAgICAgIGNvbnN0IGRlc2NBbGlnbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50RGVzY0FsaWduIHx8ICdsZWZ0JztcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLXRpdGxlLWFsaWduLSR7dGl0bGVBbGlnbn1gKTtcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWRlc2MtYWxpZ24tJHtkZXNjQWxpZ259YCk7XG4gICAgICAgIGlmICh0aXRsZUFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxheW91dC1jZW50ZXItZmxleCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggY29sb3JzIHRvIHVzZTogdXNlci1zZXQgb3IgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXM/LmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XG4gICAgICAgIGxldCB0ZXh0Q29sb3IgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENvbG9yIHNlbGVjdGlvbiBsb2dpYyAodXNlci1zZXQgY29sb3IgYWx3YXlzIHByZWZlcnJlZClcbiAgICAgICAgaWYgKGV2LmNvbG9yKSB7XG4gICAgICAgICAgICBiZ0NvbG9yID0gZXYuY29sb3I7XG4gICAgICAgICAgICB0ZXh0Q29sb3IgPSBldi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKGV2LmNvbG9yKTtcbiAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmNvbG9yID0gZXYuY29sb3I7XG4gICAgICAgIH0gZWxzZSBpZiAoY2F0ZWdvcnkgJiYgY2F0ZWdvcnkuYmdDb2xvcikge1xuICAgICAgICAgICAgYmdDb2xvciA9IGNhdGVnb3J5LmJnQ29sb3I7XG4gICAgICAgICAgICB0ZXh0Q29sb3IgPSBjYXRlZ29yeS50ZXh0Q29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHN0eWxpbmcgaWYgd2UgaGF2ZSBjb2xvcnNcbiAgICAgICAgaWYgKGJnQ29sb3IgJiYgdGV4dENvbG9yKSB7XG4gICAgICAgICAgICAvLyBDb252ZXJ0IGhleCBjb2xvciB0byByZ2JhIHdpdGggb3BhY2l0eVxuICAgICAgICAgICAgY29uc3Qgb3BhY2l0eSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDE7XG4gICAgICAgICAgICBjb25zdCByZ2JhQ29sb3IgPSBoZXhUb1JnYmEoYmdDb2xvciwgb3BhY2l0eSk7XG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJnLWNvbG9yJywgcmdiYUNvbG9yKTtcbiAgICAgICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIHRleHRDb2xvcik7XG4gICAgICAgICAgICBjb25zdCBiT3BhY2l0eSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyT3BhY2l0eSA/PyAxO1xuICAgICAgICAgICAgY29uc3QgYm9yZGVyQ29sb3IgPSBoZXhUb1JnYmEodGV4dENvbG9yLCBiT3BhY2l0eSk7XG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci1jb2xvcicsIGJvcmRlckNvbG9yKTtcbiAgICAgICAgICAgIGl0ZW0uY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgYm9yZGVyIHdpZHRoIHNldHRpbmdzXG4gICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXdpZHRoJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA/PyAyfXB4YCk7XG4gICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGVmZmVjdCBhbmQgYW5pbWF0aW9uIGZyb20gY2F0ZWdvcnkgKGFsd2F5cywgcmVnYXJkbGVzcyBvZiBjb2xvciBjaG9pY2UpXG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmVmZmVjdCAmJiBjYXRlZ29yeS5lZmZlY3QgIT09ICcnKSBpdGVtLmFkZENsYXNzKGBkYXlibGUtZWZmZWN0LSR7Y2F0ZWdvcnkuZWZmZWN0fWApO1xuICAgICAgICAgICAgY29uc3Qgb25seVRvZGF5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mub25seUFuaW1hdGVUb2RheSA/PyBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IGlzVG9kYXlFdmVudCA9IHRoaXMuaXNFdmVudFRvZGF5KGV2KTtcbiAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24gJiYgY2F0ZWdvcnkuYW5pbWF0aW9uICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCBpc1RvZGF5RXZlbnQpKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb259YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uMiAmJiBjYXRlZ29yeS5hbmltYXRpb24yICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCBpc1RvZGF5RXZlbnQpKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb24yfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aXRsZSA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LXRpdGxlJyB9KTtcbiAgICAgICAgcmVuZGVyTWFya2Rvd24oZXYudGl0bGUgfHwgJycsIHRpdGxlLCB0aGlzLnBsdWdpbi5hcHApO1xuICAgICAgICBjb25zdCB0Rm10ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZUZvcm1hdCA/PyAnMjRoJztcbiAgICAgICAgY29uc3QgdGltZURpc3BsYXkgPSBmb3JtYXRUaW1lUmFuZ2UoZXYudGltZSwgdEZtdCk7XG4gICAgICAgIGlmICh0aW1lRGlzcGxheSkge1xuICAgICAgICAgICAgY29uc3QgdGltZVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aW1lU3Bhbi50ZXh0Q29udGVudCA9IGAgKCR7dGltZURpc3BsYXl9KWA7XG4gICAgICAgICAgICB0aXRsZS5hcHBlbmRDaGlsZCh0aW1lU3Bhbik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaWNvblRvVXNlID0gZXYuaWNvbiB8fCAoY2F0ZWdvcnk/Lmljb24gfHwgJycpO1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCAhPT0gJ25vbmUnICYmIGljb25Ub1VzZSkge1xuICAgICAgICAgICAgY29uc3QgaWNvbkVsID0gaXRlbS5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZXZlbnQtaWNvbicgfSk7XG4gICAgICAgICAgICBzZXRJY29uKGljb25FbCwgaWNvblRvVXNlKTtcbiAgICAgICAgICAgIGNvbnN0IHBsYWNlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCc7XG4gICAgICAgICAgICBpZiAocGxhY2UgPT09ICdsZWZ0Jykge1xuICAgICAgICAgICAgICAgIGl0ZW0uaW5zZXJ0QmVmb3JlKGljb25FbCwgdGl0bGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGFjZSA9PT0gJ3JpZ2h0Jykge1xuICAgICAgICAgICAgICAgIGl0ZW0uYXBwZW5kQ2hpbGQoaWNvbkVsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxhY2UgPT09ICd0b3AnIHx8IHBsYWNlID09PSAndG9wLWxlZnQnIHx8IHBsYWNlID09PSAndG9wLXJpZ2h0Jykge1xuICAgICAgICAgICAgICAgIGljb25FbC5hZGRDbGFzcygnZGF5YmxlLWljb24tdG9wJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBsYWNlID09PSAndG9wLWxlZnQnKSBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcC1sZWZ0Jyk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocGxhY2UgPT09ICd0b3AtcmlnaHQnKSBpY29uRWwuYWRkQ2xhc3MoJ2RheWJsZS1pY29uLXRvcC1yaWdodCcpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtY2VudGVyJyk7XG4gICAgICAgICAgICAgICAgaXRlbS5pbnNlcnRCZWZvcmUoaWNvbkVsLCBpdGVtLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChldi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWRlc2MnIH0pO1xuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gaW5oZXJpdHMgdGV4dCBjb2xvclxuICAgICAgICAgICAgaWYgKGJnQ29sb3IgJiYgdGV4dENvbG9yKSB7XG4gICAgICAgICAgICAgICAgZGVzYy5zdHlsZS5jb2xvciA9IHRleHRDb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LmRlc2NyaXB0aW9uLCBkZXNjLCB0aGlzLnBsdWdpbi5hcHApO1xuICAgICAgICB9XG4gICAgICAgIC8vIENvbXBsZXRlZCBiZWhhdmlvclxuICAgICAgICBpZiAoZXYuY29tcGxldGVkKSB7XG4gICAgICAgICAgICBjb25zdCBiZWhhdmlvciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlQmVoYXZpb3IgPz8gJ25vbmUnO1xuICAgICAgICAgICAgaWYgKGJlaGF2aW9yID09PSAnZGltJykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWV2ZW50LWRpbScpO1xuICAgICAgICAgICAgZWxzZSBpZiAoYmVoYXZpb3IgPT09ICdzdHJpa2V0aHJvdWdoJykgdGl0bGUuc3R5bGUudGV4dERlY29yYXRpb24gPSAnbGluZS10aHJvdWdoJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnaGlkZScpIGl0ZW0uYWRkQ2xhc3MoJ2RheWJsZS1ldmVudC1oaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBpdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYSA9IChldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHdpa2kgPSBhLmdldEF0dHJpYnV0ZSgnZGF0YS1ocmVmJyk7XG4gICAgICAgICAgICBpZiAod2lraSkge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gcmVzb2x2ZU5vdGVGaWxlKHRoaXMucGx1Z2luLmFwcCwgd2lraSk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVhZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgICBpdGVtLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBEcmFnIHN0YXJ0ZWQgb24gZXZlbnQ6JywgZXYuaWQpO1xuICAgICAgICAgICAgdGhpcy5pc1NlbGVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xuICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyKT8uc2V0RGF0YSgnZGF5YmxlLXNvdXJjZScsJ2NhbGVuZGFyJyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSBpdGVtLmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnRvcCA9ICctMTAwMDBweCc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5sZWZ0ID0gJy0xMDAwMHB4JztcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaGFkb3cgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGl0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudHJhbnNmb3JtID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShpdGVtKS5ib3JkZXJSYWRpdXM7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcbiAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSBkcmFnSW1nO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmRlYnVnKCdbRGF5YmxlXSBEcmFnIGltYWdlIHNldHVwIGVycm9yOicsIGUpOyB9XG4gICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlbS5vbmRyYWdlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpID0gKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkKTsgfTtcbiAgICAgICAgaXRlbS5vbmNvbnRleHRtZW51ID0gKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0R1cGxpY2F0ZScpLnNldEljb24oJ2NvcHknKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdFdjogRGF5YmxlRXZlbnQgPSB7IC4uLmV2LCBpZDogcmFuZG9tSWQoKSB9O1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2gobmV3RXYpO1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy5yZW5kZXIoKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKGV2LmNvbXBsZXRlZCA/ICdNYXJrIGluY29tcGxldGUnIDogJ01hcmsgY29tcGxldGUnKS5zZXRJY29uKCdjaGVjaycpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIGV2LmNvbXBsZXRlZCA9ICFldi5jb21wbGV0ZWQ7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZTIgPT4gZTIuaWQgIT09IGV2LmlkKTtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgbWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzRXZlbnRUb2RheShldjogRGF5YmxlRXZlbnQpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHl5eXkgPSB0LmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIGNvbnN0IG1tID0gU3RyaW5nKHQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKHQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB0b2RheVN0ciA9IGAke3l5eXl9LSR7bW19LSR7ZGR9YDtcbiAgICAgICAgaWYgKGV2LmRhdGUpIHJldHVybiBldi5kYXRlID09PSB0b2RheVN0cjtcbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gZXYuc3RhcnREYXRlIDw9IHRvZGF5U3RyICYmIGV2LmVuZERhdGUgPj0gdG9kYXlTdHI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiAhZXYuZW5kRGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGV2LnN0YXJ0RGF0ZSA9PT0gdG9kYXlTdHI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGFzeW5jIHJlbmRlckhvbGRlcigpIHtcbiAgICAgICAgY29uc3QgbGlzdCA9IHRoaXMuaG9sZGVyRWw/LnF1ZXJ5U2VsZWN0b3IoJy5kYXlibGUtaG9sZGVyLWxpc3QnKTtcbiAgICAgICAgaWYgKCFsaXN0KSByZXR1cm47XG4gICAgICAgIGxpc3QuZW1wdHkoKTtcbiAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xuICAgICAgICAgICAgaXRlbS5kYXRhc2V0LnNvdXJjZSA9ICdob2xkZXInO1xuICAgICAgICAgICAgaXRlbS5vbmRyYWdzdGFydCA9IGUgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5pc1NlbGVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsIGV2LmlkKTtcbiAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIpPy5zZXREYXRhKCdkYXlibGUtc291cmNlJywnaG9sZGVyJyk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IGl0ZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUud2lkdGggPSBgJHtyZWN0LndpZHRofXB4YDtcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudHJhbnNmb3JtID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUoaXRlbSkuYm9yZGVyUmFkaXVzO1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RHJhZ0ltYWdlKGRyYWdJbWcsIE1hdGgubWluKDgsIHJlY3Qud2lkdGggLyA0KSwgTWF0aC5taW4oOCwgcmVjdC5oZWlnaHQgLyA0KSk7XG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIERyYWcgaW1hZ2Ugc2V0dXAgZXJyb3I6JywgZSk7IH1cbiAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpdGVtLm9uZHJhZ2VuZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaSA9IChpdGVtIGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGlmIChkaSAmJiBkaS5wYXJlbnRFbGVtZW50KSBkaS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW5zaWRlIGhvbGRlciBsaXN0IHdpdGggZHJvcCBpbmRpY2F0b3JzXG4gICAgICAgIChsaXN0IGFzIGFueSkub25kcmFnb3ZlciA9IChlOiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRhcmdldEV2ZW50ICYmIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQgPT09IGxpc3QgJiYgZXZlbnRDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBpbmRpY2F0b3IuY2xhc3NOYW1lID0gJ2RheWJsZS1kcm9wLWluZGljYXRvcic7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIChsaXN0IGFzIGFueSkub25kcmFnbGVhdmUgPSAoZTogRHJhZ0V2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGxpc3QpIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICB9O1xuICAgICAgICAobGlzdCBhcyBhbnkpLm9uZHJvcCA9IGFzeW5jIChlOiBEcmFnRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcbiAgICAgICAgICAgIGlmICghaWQgfHwgc3JjICE9PSAnaG9sZGVyJykgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgZHJhZ2dlZEVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtaWQ9XCIke2lkfVwiXWApO1xuICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRDb250YWluZXIgPSBkcmFnZ2VkRWwuY2xvc2VzdCgnLmRheWJsZS1ob2xkZXItbGlzdCcpO1xuICAgICAgICAgICAgaWYgKGRyYWdnZWRDb250YWluZXIgIT09IGxpc3QpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50Jyk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCkgeyBcbiAgICAgICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGRyYWdnZWRFbCk7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7IGxpc3QuaW5zZXJ0QmVmb3JlKGRyYWdnZWRFbCwgdGFyZ2V0RXZlbnQpOyB9XG4gICAgICAgICAgICAgICAgZWxzZSB7IHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBlcnNpc3QgbmV3IGhvbGRlciBvcmRlclxuICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkOiBEYXlibGVFdmVudFtdID0gW107XG4gICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0aGlzLmhvbGRlckV2ZW50cy5maW5kKGV2ID0+IGV2LmlkID09PSBlaWQpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgcmVvcmRlcmVkLnB1c2goZm91bmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cyA9IHJlb3JkZXJlZDtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYyBvcGVuRXZlbnRNb2RhbChpZD86IHN0cmluZywgZGF0ZT86IHN0cmluZywgZW5kRGF0ZT86IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCk7XG4gICAgICAgIGlmICghZm9sZGVyKSB7IG5ldyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwodGhpcy5hcHApLm9wZW4oKTsgcmV0dXJuOyB9XG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XG4gICAgICAgIGNhdGNoIHsgbmV3IFN0b3JhZ2VGb2xkZXJOb3RTZXRNb2RhbCh0aGlzLmFwcCkub3BlbigpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBpZCA/ICh0aGlzLmV2ZW50cy5maW5kKGUgPT4gZS5pZCA9PT0gaWQpID8/IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmQoZSA9PiBlLmlkID09PSBpZCkpIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBmcm9tSG9sZGVyID0gISEoZXhpc3RpbmcgJiYgdGhpcy5ob2xkZXJFdmVudHMuc29tZShlID0+IGUuaWQgPT09IGV4aXN0aW5nLmlkKSk7XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEV2ZW50TW9kYWwodGhpcy5hcHAsIGV4aXN0aW5nLCBkYXRlLCBlbmREYXRlLCBhc3luYyByZXN1bHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNNdWx0aSA9ICEhKHJlc3VsdC5zdGFydERhdGUgJiYgcmVzdWx0LmVuZERhdGUpO1xuICAgICAgICAgICAgY29uc3QgaXNTaW5nbGUgPSAhIXJlc3VsdC5kYXRlIHx8ICghIXJlc3VsdC5zdGFydERhdGUgJiYgIXJlc3VsdC5lbmREYXRlKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xuICAgICAgICAgICAgICAgIGlmIChpc011bHRpIHx8IGlzU2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIFNhdmUgZmFpbGVkOicsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZW5kZXJIb2xkZXIoKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VG9kYXlNb2RhbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRvZGF5TW9kYWwuZXZlbnRzID0gdGhpcy5ldmVudHM7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbC5vbk9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZyb21Ib2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSB0aGlzLmhvbGRlckV2ZW50cy5maWx0ZXIoZSA9PiBlLmlkICE9PSBleGlzdGluZy5pZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmlkICE9PSBleGlzdGluZy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBpY29uID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLmljb24gPSBpY29uO1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldEljb24oaWNvbik7XG4gICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGljb24gaGFuZGxlclxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcuaWNvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBtb2RhbC5zZXRJY29uKCcnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcGlja2VyLm9wZW4oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLmNhdGVnb3JpZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XG4gICAgICAgIChtb2RhbCBhcyBhbnkpLnBsdWdpbiA9IHRoaXMucGx1Z2luO1xuICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgfVxuXG4gICAgb3BlblRvZGF5TW9kYWwoZGF0ZTogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFRvZGF5TW9kYWwodGhpcy5hcHAsIGRhdGUsIHRoaXMuZXZlbnRzLCB0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbCA9IG1vZGFsO1xuICAgICAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4geyB0aGlzLmN1cnJlbnRUb2RheU1vZGFsID0gdW5kZWZpbmVkOyB9O1xuICAgICAgICB2b2lkIG1vZGFsLm9wZW4oKTtcbiAgICB9XG59XG5cbmNsYXNzIEV2ZW50TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgZXY/OiBEYXlibGVFdmVudDtcbiAgICBkYXRlPzogc3RyaW5nO1xuICAgIGVuZERhdGU/OiBzdHJpbmc7XG4gICAgb25TdWJtaXQ6IChldjogUGFydGlhbDxEYXlibGVFdmVudD4pID0+IFByb21pc2U8dm9pZD47XG4gICAgb25EZWxldGU6ICgpID0+IFByb21pc2U8dm9pZD47XG4gICAgb25QaWNrSWNvbjogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgICBpY29uPzogc3RyaW5nO1xuICAgIGljb25CdG5FbD86IEhUTUxCdXR0b25FbGVtZW50O1xuICAgIHNlbGVjdGVkQ29sb3I/OiBzdHJpbmc7XG4gICAgc2VsZWN0ZWRUZXh0Q29sb3I/OiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgZXY6IERheWJsZUV2ZW50IHwgdW5kZWZpbmVkLCBkYXRlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGVuZERhdGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb25TdWJtaXQ6IChldjogUGFydGlhbDxEYXlibGVFdmVudD4pID0+IFByb21pc2U8dm9pZD4sIG9uRGVsZXRlOiAoKSA9PiBQcm9taXNlPHZvaWQ+LCBvblBpY2tJY29uOiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMuZXYgPSBldjtcbiAgICAgICAgdGhpcy5kYXRlID0gZGF0ZTtcbiAgICAgICAgdGhpcy5lbmREYXRlID0gZW5kRGF0ZTtcbiAgICAgICAgdGhpcy5vblN1Ym1pdCA9IG9uU3VibWl0O1xuICAgICAgICB0aGlzLm9uRGVsZXRlID0gb25EZWxldGU7XG4gICAgICAgIHRoaXMub25QaWNrSWNvbiA9IG9uUGlja0ljb247XG4gICAgICAgIHRoaXMuaWNvbiA9IGV2Py5pY29uO1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3IgPSBldj8uY29sb3I7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0Q29sb3IgPSBldj8udGV4dENvbG9yO1xuICAgIH1cblxuICAgIHNldEljb24oaWNvbjogc3RyaW5nKSB7IHRoaXMuaWNvbiA9IGljb247IGlmICh0aGlzLmljb25CdG5FbCkgc2V0SWNvbih0aGlzLmljb25CdG5FbCwgaWNvbiB8fCAncGx1cycpOyB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICAgICAgYy5lbXB0eSgpO1xuICAgICAgICBjb25zdCBoZWFkaW5nID0gYy5jcmVhdGVFbCgnaDMnLCB7IGNsczogJ2RheWJsZS1tb2RhbC10aXRsZScgfSk7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XG4gICAgICAgIGhlYWRpbmcuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XG4gICAgICAgIGhlYWRpbmcudGV4dENvbnRlbnQgPSB0aGlzLmV2ID8gJ0VkaXQgZXZlbnQnIDogJ0FkZCBuZXcgZXZlbnQnO1xuICAgICAgICBjb25zdCByb3cxID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcbiAgICAgICAgcm93MS5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XG4gICAgICAgIGNvbnN0IGljb25CdG4gPSByb3cxLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLWljb24tYWRkJyB9KTtcbiAgICAgICAgaWNvbkJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIHNldEljb24oaWNvbkJ0biwgdGhpcy5pY29uID8/ICdwbHVzJyk7XG4gICAgICAgIGljb25CdG4ub25jbGljayA9ICgpID0+IHRoaXMub25QaWNrSWNvbigpO1xuICAgICAgICB0aGlzLmljb25CdG5FbCA9IGljb25CdG47XG4gICAgICAgIGNvbnN0IHRpdGxlSW5wdXQgPSByb3cxLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RleHQnLCBjbHM6ICdkYXlibGUtaW5wdXQnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnRXZlbnQgdGl0bGUnLCBhdXRvZm9jdXM6ICd0cnVlJyB9IH0pO1xuICAgICAgICB0aXRsZUlucHV0LmFkZENsYXNzKCdkYi1pbnB1dCcpO1xuICAgICAgICB0aXRsZUlucHV0LnZhbHVlID0gdGhpcy5ldj8udGl0bGUgPz8gJyc7XG4gICAgICAgIGNvbnN0IGZvY3VzVGl0bGUgPSAoKSA9PiB7IHRyeSB7IHRpdGxlSW5wdXQuZm9jdXMoeyBwcmV2ZW50U2Nyb2xsOiB0cnVlIH0pOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIEZvY3VzIHRpdGxlOicsIGUpOyB9IH07XG4gICAgICAgIGZvY3VzVGl0bGUoKTtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZvY3VzVGl0bGUpO1xuICAgICAgICBzZXRUaW1lb3V0KGZvY3VzVGl0bGUsIDApO1xuICAgICAgICBcbiAgICAgICAgLy8gW1tsaW5rXV0gc3VnZ2VzdGlvbnMgc2hhcmVkIGZvciB0aXRsZSBhbmQgZGVzY3JpcHRpb25cbiAgICAgICAgbGV0IHN1Z2dlc3Rpb25Db250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGxldCBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgIGxldCBzdWdnZXN0aW9uVGFyZ2V0OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgICBjb25zdCBjbG9zZVN1Z2dlc3Rpb25zID0gKCkgPT4geyBpZiAoc3VnZ2VzdGlvbkNvbnRhaW5lcikgeyBzdWdnZXN0aW9uQ29udGFpbmVyLnJlbW92ZSgpOyBzdWdnZXN0aW9uQ29udGFpbmVyID0gbnVsbDsgfSBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IDA7IHN1Z2dlc3Rpb25UYXJnZXQgPSBudWxsOyB9O1xuICAgICAgICBjb25zdCBzaG93U3VnZ2VzdGlvbnNGb3IgPSAodGFyZ2V0OiBIVE1MSW5wdXRFbGVtZW50IHwgSFRNTFRleHRBcmVhRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKHN1Z2dlc3Rpb25Db250YWluZXIpIHN1Z2dlc3Rpb25Db250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSB0YXJnZXQudmFsdWUgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IHZhbC5tYXRjaCgvXFxbXFxbKFteXFxbXFxdXSo/KSQvKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZXMoKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGY6IGFueSkgPT4gZi5uYW1lICYmIGYubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KSAmJiAhZi5uYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAgICAgICAuc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICAgICAgc3VnZ2VzdGlvblRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gMDtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuY2xhc3NOYW1lID0gJ2RheWJsZS1saW5rLXN1Z2dlc3Rpb25zJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5KSc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm1heEhlaWdodCA9ICcxODBweCc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuekluZGV4ID0gJzEwMDAwJztcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUubWluV2lkdGggPSAnMjAwcHgnO1xuICAgICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZTogdW5rbm93biwgaTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIGl0ZW0udGV4dENvbnRlbnQgPSAoZmlsZSBhcyBhbnkpLm5hbWU7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5wYWRkaW5nID0gJzhweCc7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3JkZXJCb3R0b20gPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHsgaXRlbS5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpOyBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0KSc7IH1cbiAgICAgICAgICAgICAgICBpdGVtLm9ubW91c2VlbnRlciA9ICgpID0+IHsgaXRlbS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5LWFsdCknOyB9O1xuICAgICAgICAgICAgICAgIGl0ZW0ub25tb3VzZWxlYXZlID0gKCkgPT4geyBpZiAoIWl0ZW0uY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1zZWxlY3RlZCcpKSBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd0cmFuc3BhcmVudCc7IH07XG4gICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmVNYXRjaCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGFzdEluZGV4T2YoJ1tbJykpO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudmFsdWUgPSBiZWZvcmVNYXRjaCArICdbWycgKyAoZmlsZSBhcyBhbnkpLm5hbWUgKyAnXV0nO1xuICAgICAgICAgICAgICAgICAgICBjbG9zZVN1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGl0ZW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHN1Z2dlc3Rpb25Db250YWluZXIpO1xuICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQocmVjdC5sZWZ0KSArICdweCc7XG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnRvcCA9IE1hdGgucm91bmQocmVjdC50b3AgKyByZWN0LmhlaWdodCkgKyAncHgnO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbiA9IChkaXI6IDEgfCAtMSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFzdWdnZXN0aW9uQ29udGFpbmVyKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20oc3VnZ2VzdGlvbkNvbnRhaW5lci5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goaSA9PiB7IGkuY2xhc3NMaXN0LnJlbW92ZSgnaXMtc2VsZWN0ZWQnKTsgaS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndHJhbnNwYXJlbnQnOyB9KTtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oaXRlbXMubGVuZ3RoIC0gMSwgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggKyBkaXIpKTtcbiAgICAgICAgICAgIGNvbnN0IHNlbCA9IGl0ZW1zW3N1Z2dlc3Rpb25TZWxlY3RlZEluZGV4XTtcbiAgICAgICAgICAgIGlmIChzZWwpIHsgc2VsLmNsYXNzTGlzdC5hZGQoJ2lzLXNlbGVjdGVkJyk7IHNlbC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1wcmltYXJ5LWFsdCknOyB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNob29zZUN1cnJlbnRTdWdnZXN0aW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFzdWdnZXN0aW9uQ29udGFpbmVyIHx8ICFzdWdnZXN0aW9uVGFyZ2V0KSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20oc3VnZ2VzdGlvbkNvbnRhaW5lci5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcbiAgICAgICAgICAgIGNvbnN0IHNlbCA9IGl0ZW1zW3N1Z2dlc3Rpb25TZWxlY3RlZEluZGV4XTtcbiAgICAgICAgICAgIGlmICghc2VsKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gc2VsLnRleHRDb250ZW50IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IHN1Z2dlc3Rpb25UYXJnZXQudmFsdWU7XG4gICAgICAgICAgICBjb25zdCBiZWZvcmVNYXRjaCA9IHRleHQuc3Vic3RyaW5nKDAsIHRleHQubGFzdEluZGV4T2YoJ1tbJykpO1xuICAgICAgICAgICAgc3VnZ2VzdGlvblRhcmdldC52YWx1ZSA9IGJlZm9yZU1hdGNoICsgJ1tbJyArIG5hbWUgKyAnXV0nO1xuICAgICAgICAgICAgY2xvc2VTdWdnZXN0aW9ucygpO1xuICAgICAgICB9O1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnQXJyb3dEb3duJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IG1vdmVTdWdnZXN0aW9uU2VsZWN0aW9uKDEpOyB9XG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0Fycm93VXAnKSB7IGUucHJldmVudERlZmF1bHQoKTsgbW92ZVN1Z2dlc3Rpb25TZWxlY3Rpb24oLTEpOyB9XG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VudGVyJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IGNob29zZUN1cnJlbnRTdWdnZXN0aW9uKCk7IH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRXNjYXBlJykgeyBlLnByZXZlbnREZWZhdWx0KCk7IGNsb3NlU3VnZ2VzdGlvbnMoKTsgfVxuICAgICAgICB9LCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICAgIHRpdGxlSW5wdXQub25pbnB1dCA9ICgpID0+IHsgc2hvd1N1Z2dlc3Rpb25zRm9yKHRpdGxlSW5wdXQpOyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGNvbG9yIHN3YXRjaCByb3cgKHdpbGwgYmUgcG9zaXRpb25lZCBiYXNlZCBvbiBzZXR0aW5nKVxuICAgICAgICBjb25zdCBjcmVhdGVDb2xvclJvdyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93IGRheWJsZS1jb2xvci1zd2F0Y2hlcy1yb3cnIH0pO1xuICAgICAgICAgICAgY29sb3JSb3cuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzd2F0Y2hlc0NvbnRhaW5lciA9IGNvbG9yUm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1jb2xvci1zd2F0Y2hlcycgfSk7XG4gICAgICAgICAgICBzd2F0Y2hlc0NvbnRhaW5lci5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoZXMnKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRTd2F0Y2ggPSBzd2F0Y2hlc0NvbnRhaW5lci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoIGRheWJsZS1jb2xvci1zd2F0Y2gtbm9uZScgfSk7XG4gICAgICAgICAgICBkZWZhdWx0U3dhdGNoLmFkZENsYXNzKCdkYi1jb2xvci1zd2F0Y2gnKTtcbiAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2gudGl0bGUgPSAnTm9uZSAoZGVmYXVsdCknO1xuICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtY29sb3Itc3dhdGNoJykuZm9yRWFjaChzID0+IHMucmVtb3ZlQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKSk7XG4gICAgICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICghdGhpcy5zZWxlY3RlZENvbG9yKSBkZWZhdWx0U3dhdGNoLmFkZENsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gKHRoaXMgYXMgYW55KS5wbHVnaW4/LnNldHRpbmdzO1xuICAgICAgICAgICAgY29uc3QgYnVpbHRTd2F0Y2hlcyA9IChzZXR0aW5ncz8uc3dhdGNoZXMgPz8gW10pLm1hcCgoczogYW55KSA9PiAoeyBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICBjb25zdCBjdXN0b21Td2F0Y2hlcyA9IChzZXR0aW5ncz8udXNlckN1c3RvbVN3YXRjaGVzID8/IFtdKS5tYXAoKHM6IGFueSkgPT4gKHsgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgbGV0IHN3YXRjaGVzOiBBcnJheTx7IGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9PiA9IGJ1aWx0U3dhdGNoZXM7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3M/LmN1c3RvbVN3YXRjaGVzRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIHN3YXRjaGVzID0gYnVpbHRTd2F0Y2hlcy5jb25jYXQoY3VzdG9tU3dhdGNoZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzd2F0Y2hlcyB8fCBzd2F0Y2hlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBzd2F0Y2hlcyA9IFsnI2ViM2I1YScsICcjZmE4MjMxJywgJyNlNWEyMTYnLCAnIzIwYmY2YicsICcjMGZiOWIxJywgJyMyZDk4ZGEnLCAnIzM4NjdkNicsICcjNTQ1NGQwJywgJyM4ODU0ZDAnLCAnI2I1NTRkMCcsICcjZTgzMmMxJywgJyNlODMyODknLCAnIzk2NWIzYicsICcjODM5MmE0J10ubWFwKGMgPT4gKHsgY29sb3I6IGMgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dhdGNoZXMuZm9yRWFjaCgoeyBjb2xvciwgdGV4dENvbG9yIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzd2F0Y2ggPSBzd2F0Y2hlc0NvbnRhaW5lci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoJyB9KTtcbiAgICAgICAgICAgICAgICBzd2F0Y2guYWRkQ2xhc3MoJ2RiLWNvbG9yLXN3YXRjaCcpO1xuICAgICAgICAgICAgICAgIHN3YXRjaC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjtcbiAgICAgICAgICAgICAgICBzd2F0Y2guc3R5bGUuYm9yZGVyQ29sb3IgPSBjb2xvcjtcbiAgICAgICAgICAgICAgICBzd2F0Y2gudGl0bGUgPSBjb2xvcjtcbiAgICAgICAgICAgICAgICBzd2F0Y2gub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZENvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0Q29sb3IgPSB0ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKGNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1jb2xvci1zd2F0Y2gnKS5mb3JFYWNoKHMgPT4gcy5yZW1vdmVDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhdGNoLmFkZENsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZENvbG9yID09PSBjb2xvcikgc3dhdGNoLmFkZENsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBjb2xvclJvdztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2xvciBzd2F0Y2hlcyB1bmRlciB0aXRsZSBpZiBzZXR0aW5nIHNheXMgc29cbiAgICAgICAgY29uc3QgY29sb3JTd2F0Y2hQb3MgPSAodGhpcyBhcyBhbnkpLnBsdWdpbj8uc2V0dGluZ3M/LmNvbG9yU3dhdGNoUG9zaXRpb24gPz8gJ3VuZGVyLXRpdGxlJztcbiAgICAgICAgaWYgKGNvbG9yU3dhdGNoUG9zID09PSAndW5kZXItdGl0bGUnKSB7XG4gICAgICAgICAgICBjcmVhdGVDb2xvclJvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlUm93ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93IGRheWJsZS1tb2RhbC1yb3ctY2VudGVyJyB9KTtcbiAgICAgICAgcnVsZVJvdy5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5TGFiZWwgPSBydWxlUm93LmNyZWF0ZUVsKCdsYWJlbCcsIHsgdGV4dDogJ0NhdGVnb3J5OicgfSk7XG4gICAgICAgIGNhdGVnb3J5TGFiZWwuYWRkQ2xhc3MoJ2RiLWxhYmVsJyk7XG4gICAgICAgIGNhdGVnb3J5TGFiZWwuc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgIGxldCBzZWxlY3RlZENhdGVnb3J5SWQgPSB0aGlzLmV2Py5jYXRlZ29yeUlkO1xuICAgICAgICBjb25zdCBjYXRlZ29yeVNlbGVjdCA9IHJ1bGVSb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnZGF5YmxlLWlucHV0IGRheWJsZS1jYXRlZ29yeS1zZWxlY3QnIH0pO1xuICAgICAgICBjYXRlZ29yeVNlbGVjdC5hZGRDbGFzcygnZGItc2VsZWN0Jyk7XG4gICAgICAgIGNvbnN0IGVtcHR5T3B0ID0gY2F0ZWdvcnlTZWxlY3QuY3JlYXRlRWwoJ29wdGlvbicpOyBlbXB0eU9wdC52YWx1ZT0nJzsgZW1wdHlPcHQudGV4dD0nRGVmYXVsdCc7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSAodGhpcyBhcyBhbnkpLmNhdGVnb3JpZXMgfHwgW107XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaCgoYzogRXZlbnRDYXRlZ29yeSkgPT4geyBjb25zdCBvcHQgPSBjYXRlZ29yeVNlbGVjdC5jcmVhdGVFbCgnb3B0aW9uJyk7IG9wdC52YWx1ZSA9IGMuaWQ7IG9wdC50ZXh0ID0gYy5uYW1lOyB9KTtcbiAgICAgICAgY2F0ZWdvcnlTZWxlY3QudmFsdWUgPSBzZWxlY3RlZENhdGVnb3J5SWQgPz8gJyc7XG4gICAgICAgIFxuICAgICAgICBjYXRlZ29yeVNlbGVjdC5vbmNoYW5nZSA9ICgpID0+IHsgXG4gICAgICAgICAgICBzZWxlY3RlZENhdGVnb3J5SWQgPSBjYXRlZ29yeVNlbGVjdC52YWx1ZSB8fCB1bmRlZmluZWQ7IFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBtdWx0aS1kYXkgZXZlbnRcbiAgICAgICAgY29uc3QgaXNNdWx0aURheSA9IHRoaXMuZW5kRGF0ZSAmJiB0aGlzLmVuZERhdGUgIT09IHRoaXMuZGF0ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXJ0IHRpbWUvZGF0ZSByb3dcbiAgICAgICAgY29uc3Qgcm93MiA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgIHJvdzIuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSByb3cyLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RpbWUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xuICAgICAgICBzdGFydFRpbWUuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XG4gICAgICAgIHN0YXJ0VGltZS52YWx1ZSA9IHRoaXMuZXY/LnRpbWU/LnNwbGl0KCctJylbMF0gPz8gJyc7XG4gICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IHJvdzIuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnZGF0ZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XG4gICAgICAgIHN0YXJ0RGF0ZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgc3RhcnREYXRlLnZhbHVlID0gdGhpcy5ldj8uZGF0ZSA/PyB0aGlzLmV2Py5zdGFydERhdGUgPz8gdGhpcy5kYXRlID8/ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5kIHRpbWUvZGF0ZSByb3cgKG9ubHkgZm9yIG11bHRpLWRheSBldmVudHMpXG4gICAgICAgIGxldCBlbmRUaW1lOiBIVE1MSW5wdXRFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgZW5kRGF0ZUlucHV0OiBIVE1MSW5wdXRFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoaXNNdWx0aURheSkge1xuICAgICAgICAgICAgY29uc3Qgcm93MyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XG4gICAgICAgICAgICByb3czLmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcbiAgICAgICAgICAgIGVuZFRpbWUgPSByb3czLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RpbWUnLCBjbHM6ICdkYXlibGUtaW5wdXQnIH0pO1xuICAgICAgICAgICAgZW5kVGltZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgICAgIGVuZFRpbWUudmFsdWUgPSB0aGlzLmV2Py50aW1lPy5zcGxpdCgnLScpWzFdID8/ICcnO1xuICAgICAgICAgICAgZW5kRGF0ZUlucHV0ID0gcm93My5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdkYXRlJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dC52YWx1ZSA9IHRoaXMuZW5kRGF0ZSA/PyAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZGVzY0lucHV0ID0gYy5jcmVhdGVFbCgndGV4dGFyZWEnLCB7IGNsczogJ2RheWJsZS10ZXh0YXJlYScsIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdEZXNjcmlwdGlvbicgfSB9KTtcbiAgICAgICAgZGVzY0lucHV0LmFkZENsYXNzKCdkYi10ZXh0YXJlYScpO1xuICAgICAgICBkZXNjSW5wdXQudmFsdWUgPSB0aGlzLmV2Py5kZXNjcmlwdGlvbiA/PyAnJztcbiAgICAgICAgXG4gICAgICAgIGRlc2NJbnB1dC5vbmlucHV0ID0gKCkgPT4geyBzaG93U3VnZ2VzdGlvbnNGb3IoZGVzY0lucHV0KTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2xvciBzd2F0Y2hlcyB1bmRlciBkZXNjcmlwdGlvbiBpZiBzZXR0aW5nIHNheXMgc29cbiAgICAgICAgaWYgKGNvbG9yU3dhdGNoUG9zID09PSAndW5kZXItZGVzY3JpcHRpb24nKSB7XG4gICAgICAgICAgICBjcmVhdGVDb2xvclJvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmb290ZXIgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1mb290ZXInIH0pO1xuICAgICAgICBmb290ZXIuYWRkQ2xhc3MoJ2RiLW1vZGFsLWZvb3RlcicpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBvbiBsZWZ0IChvbmx5IGZvciBleGlzdGluZyBldmVudHMpXG4gICAgICAgICAgICBpZiAodGhpcy5ldikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IGZvb3Rlci5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1kZWxldGUnIH0pO1xuICAgICAgICAgICAgICAgIGRlbC5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgICAgICAgICAgc2V0SWNvbihkZWwsICd0cmFzaC0yJyk7XG4gICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSAoKSA9PiB7IHZvaWQgdGhpcy5vbkRlbGV0ZSgpLnRoZW4oKCkgPT4gdGhpcy5jbG9zZSgpKTsgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhbmNlbCBhbmQgU2F2ZSBidXR0b25zIG9uIHJpZ2h0XG4gICAgICAgIGNvbnN0IHJpZ2h0QnV0dG9ucyA9IGZvb3Rlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtZm9vdGVyLXJpZ2h0JyB9KTtcbiAgICAgICAgcmlnaHRCdXR0b25zLmFkZENsYXNzKCdkYi1tb2RhbC1mb290ZXItcmlnaHQnKTtcbiAgICAgICAgY29uc3QgY2FuY2VsID0gcmlnaHRCdXR0b25zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLWNhbmNlbCcgfSk7XG4gICAgICAgIGNhbmNlbC5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIGNhbmNlbC50ZXh0Q29udGVudCA9ICdDYW5jZWwnO1xuICAgICAgICBjYW5jZWwub25jbGljayA9ICgpID0+IHRoaXMuY2xvc2UoKTtcbiAgICAgICAgY29uc3Qgb2sgPSByaWdodEJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtc2F2ZSBtb2QtY3RhJyB9KTtcbiAgICAgICAgb2suYWRkQ2xhc3MoJ2RiLWJ0bicpO1xuICAgICAgICBvay50ZXh0Q29udGVudCA9ICdTYXZlIGV2ZW50JztcbiAgICAgICAgb2sub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQ6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+ID0ge1xuICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZUlucHV0LnZhbHVlLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkZXNjSW5wdXQudmFsdWUsXG4gICAgICAgICAgICAgICAgaWNvbjogdGhpcy5pY29uLFxuICAgICAgICAgICAgICAgIGNhdGVnb3J5SWQ6IHNlbGVjdGVkQ2F0ZWdvcnlJZCxcbiAgICAgICAgICAgICAgICBjb2xvcjogdGhpcy5zZWxlY3RlZENvbG9yLFxuICAgICAgICAgICAgICAgIHRleHRDb2xvcjogdGhpcy5zZWxlY3RlZFRleHRDb2xvclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICghcGF5bG9hZC5jYXRlZ29yeUlkIHx8ICFwYXlsb2FkLmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJpZ2dlcnMgPSAodGhpcyBhcyBhbnkpLnBsdWdpbj8uc2V0dGluZ3M/LnRyaWdnZXJzIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHR4dCA9ICgocGF5bG9hZC50aXRsZSB8fCAnJykgKyAnICcgKyAocGF5bG9hZC5kZXNjcmlwdGlvbiB8fCAnJykpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0cmlnZ2Vycy5maW5kKCh0OiBhbnkpID0+ICh0LnBhdHRlcm4gfHwgJycpLnRvTG93ZXJDYXNlKCkgJiYgdHh0LmluY2x1ZGVzKCh0LnBhdHRlcm4gfHwgJycpLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkLmNhdGVnb3J5SWQgJiYgZm91bmQuY2F0ZWdvcnlJZCkgcGF5bG9hZC5jYXRlZ29yeUlkID0gZm91bmQuY2F0ZWdvcnlJZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXlsb2FkLmNvbG9yICYmIGZvdW5kLmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXlsb2FkLmNvbG9yID0gZm91bmQuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXlsb2FkLnRleHRDb2xvciA9IGZvdW5kLnRleHRDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzTXVsdGlEYXkgJiYgZW5kVGltZSAmJiBlbmREYXRlSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAvLyBNdWx0aS1kYXkgZXZlbnRcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydFRpbWVWYWwgPSBzdGFydFRpbWUudmFsdWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kVGltZVZhbCA9IGVuZFRpbWUudmFsdWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC50aW1lID0gKHN0YXJ0VGltZVZhbCAmJiBlbmRUaW1lVmFsKSA/IGAke3N0YXJ0VGltZVZhbH0tJHtlbmRUaW1lVmFsfWAgOiAoc3RhcnRUaW1lVmFsIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnN0YXJ0RGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCB0aGlzLmV2Py5zdGFydERhdGUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHBheWxvYWQuZW5kRGF0ZSA9IGVuZERhdGVJbnB1dC52YWx1ZSB8fCB0aGlzLmV2Py5lbmREYXRlIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGRheSBldmVudFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZVZhbCA9IHN0YXJ0VGltZS52YWx1ZSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBlbmRUaW1lVmFsID0gZW5kVGltZT8udmFsdWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC50aW1lID0gKHN0YXJ0VGltZVZhbCAmJiBlbmRUaW1lVmFsKSA/IGAke3N0YXJ0VGltZVZhbH0tJHtlbmRUaW1lVmFsfWAgOiAoc3RhcnRUaW1lVmFsIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmYWxsYmFja0RhdGUgPSB0aGlzLmV2Py5kYXRlIHx8IHRoaXMuZXY/LnN0YXJ0RGF0ZSB8fCB0aGlzLmRhdGUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHBheWxvYWQuZGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCBmYWxsYmFja0RhdGU7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5zdGFydERhdGUgPSBzdGFydERhdGUudmFsdWUgfHwgZmFsbGJhY2tEYXRlO1xuICAgICAgICAgICAgICAgIHBheWxvYWQuZW5kRGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCBmYWxsYmFja0RhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKHRoaXMub25TdWJtaXQocGF5bG9hZCkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGVdIEVycm9yIHNhdmluZyBldmVudDonLCBlKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFcnJvciBzYXZpbmcgZXZlbnQ6ICcgKyAoZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gUHJldmVudCBtb2RhbCBvcGVuIHdoZW4gY2xpY2tpbmcgbWFya2Rvd24gbGlua3MgaW5zaWRlIGV2ZW50IGl0ZW1zOyBvcGVuIG5vdGUgaW4gbmV3IHRhYlxuICAgICAgICB0aGlzLmNvbnRlbnRFbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldikgPT4ge1xuICAgICAgICAgICAgY29uc3QgYSA9IChldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgIGlmICghYSkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcbiAgICAgICAgICAgIGlmICh3aWtpKSB7XG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gcmVzb2x2ZU5vdGVGaWxlKHRoaXMuYXBwLCB3aWtpKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIChsZWFmIGFzIGFueSkub3BlbkZpbGU/LihmaWxlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICB9XG59XG5cbmNsYXNzIEljb25QaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQ7XG4gICAgb25SZW1vdmU/OiAoKSA9PiB2b2lkO1xuICAgIGFsbEljb25zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQsIG9uUmVtb3ZlPzogKCkgPT4gdm9pZCkgeyBzdXBlcihhcHApOyB0aGlzLm9uUGljayA9IG9uUGljazsgdGhpcy5vblJlbW92ZSA9IG9uUmVtb3ZlOyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7XG4gICAgICAgIGMuZW1wdHkoKTtcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBjLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcbiAgICAgICAgYy5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWFyY2hSb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1yb3cnIH0pO1xuICAgICAgICBzZWFyY2hSb3cuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xuICAgICAgICBzZWFyY2hSb3cuc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XG4gICAgICAgIGNvbnN0IHNlYXJjaElucHV0ID0gc2VhcmNoUm93LmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RleHQnLCBjbHM6ICdkYXlibGUtaW5wdXQnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnU2VhcmNoIGljb25zJyB9IH0pO1xuICAgICAgICBzZWFyY2hJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcbiAgICAgICAgc2VhcmNoSW5wdXQuc3R5bGUuZmxleEdyb3cgPSAnMSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaXN0ID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaWNvbi1saXN0JyB9KTtcbiAgICAgICAgbGlzdC5hZGRDbGFzcygnZGItaWNvbi1saXN0Jyk7XG4gICAgICAgIGxpc3Quc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgbGlzdC5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XG4gICAgICAgIGxpc3Quc3R5bGUuZGlzcGxheSA9ICdncmlkJztcbiAgICAgICAgbGlzdC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gJ3JlcGVhdChhdXRvLWZpbGwsIG1pbm1heCg0MHB4LCAxZnIpKSc7XG4gICAgICAgIGxpc3Quc3R5bGUuZ2FwID0gJzRweCc7XG4gICAgICAgIGxpc3Quc3R5bGUubWFyZ2luVG9wID0gJzhweCc7XG4gICAgICAgIFxuICAgICAgICAvLyBGb290ZXIgd2l0aCByZW1vdmUgYnV0dG9uXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KCk7XG4gICAgICAgIGZvb3Rlci5hZGRDbGFzcygnZGItbW9kYWwtZm9vdGVyJyk7XG4gICAgICAgIGZvb3Rlci5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBmb290ZXIuc3R5bGUubWFyZ2luVG9wID0gJ2F1dG8nO1xuICAgICAgICBmb290ZXIuc3R5bGUucGFkZGluZ1RvcCA9ICc4cHgnO1xuICAgICAgICBmb290ZXIuc3R5bGUuYm9yZGVyVG9wID0gJzFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlciknO1xuICAgICAgICBjb25zdCByZW1vdmVCdG4gPSBmb290ZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicsIHRleHQ6ICdSZW1vdmUgaWNvbicgfSk7XG4gICAgICAgIHJlbW92ZUJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XG4gICAgICAgIHJlbW92ZUJ0bi5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICByZW1vdmVCdG4uc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgICAgICByZW1vdmVCdG4uc3R5bGUuZ2FwID0gJzRweCc7XG4gICAgICAgIGNvbnN0IHJlbW92ZUljb24gPSByZW1vdmVCdG4uY3JlYXRlRGl2KCk7XG4gICAgICAgIHNldEljb24ocmVtb3ZlSWNvbiwgJ3gnKTtcbiAgICAgICAgcmVtb3ZlSWNvbi5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1mbGV4JztcbiAgICAgICAgcmVtb3ZlQnRuLm9uY2xpY2sgPSAoKSA9PiB7IGlmICh0aGlzLm9uUmVtb3ZlKSB0aGlzLm9uUmVtb3ZlKCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgaWNvbnMgbGF6aWx5XG4gICAgICAgIGlmICghdGhpcy5hbGxJY29ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuYWxsSWNvbnMgPSBnZXRJY29uSWRzU2FmZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgZmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLnNsaWNlKDAsIDk2KTsgLy8gT25seSBzaG93IGZpcnN0IDEwMCBpbml0aWFsbHlcbiAgICAgICAgbGV0IGZ1bGxGaWx0ZXJlZCA9IHRoaXMuYWxsSWNvbnMuc2xpY2UoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoaWNvbnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgICAgICBsaXN0LmVtcHR5KCk7XG4gICAgICAgICAgICBpY29ucy5zbGljZSgwLCAyMDApLmZvckVhY2goaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IGxpc3QuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWljb24tYnRuJyB9KTtcbiAgICAgICAgICAgICAgICBidG4uYWRkQ2xhc3MoJ2RiLWljb24tYnRuJyk7XG4gICAgICAgICAgICAgICAgYnRuLnN0eWxlLnBhZGRpbmcgPSAnNnB4JztcbiAgICAgICAgICAgICAgICBidG4udGl0bGUgPSBpZDtcbiAgICAgICAgICAgICAgICBzZXRJY29uKGJ0biwgaWQpO1xuICAgICAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLm9uUGljayhpZCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYXBwbHlGaWx0ZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxID0gKHNlYXJjaElucHV0LnZhbHVlIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKCFxKSB7XG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgwLCAxNTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmdWxsRmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLmZpbHRlcihpZCA9PiBpZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlbmRlckxpc3QoZnVsbEZpbHRlcmVkKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHNlYXJjaElucHV0Lm9uaW5wdXQgPSBhcHBseUZpbHRlcjtcbiAgICAgICAgcmVuZGVyTGlzdChmaWx0ZXJlZCk7XG4gICAgfVxufVxuXG5jbGFzcyBQcm9tcHRTZWFyY2hNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICB2aWV3OiBEYXlibGVDYWxlbmRhclZpZXc7XG4gICAgcXVlcnk6IHN0cmluZyA9ICcnO1xuICAgIHJlc3VsdHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAwO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCB2aWV3OiBEYXlibGVDYWxlbmRhclZpZXcpIHsgXG4gICAgICAgIHN1cGVyKGFwcCk7IFxuICAgICAgICB0aGlzLnZpZXcgPSB2aWV3OyBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMubW9kYWxFbC5jbGFzc0xpc3QucmVtb3ZlKCdtb2RhbCcpO1xuICAgICAgICAgICAgdGhpcy5tb2RhbEVsLmNsYXNzTmFtZSA9ICdwcm9tcHQnO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY29udGVudCB3cmFwcGVyIHNvIHByb21wdCBpcyB0aGUgcm9vdFxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGVudEVsICYmIHRoaXMuY29udGVudEVsLnBhcmVudEVsZW1lbnQgPT09IHRoaXMubW9kYWxFbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudEVsLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIFByb21wdFNlYXJjaE1vZGFsIGluaXQ6JywgZSk7IH1cbiAgICB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCByb290ID0gdGhpcy5tb2RhbEVsO1xuICAgICAgICB3aGlsZSAocm9vdC5maXJzdENoaWxkKSByb290LnJlbW92ZUNoaWxkKHJvb3QuZmlyc3RDaGlsZCk7XG4gICAgICAgIGNvbnN0IGlucHV0V3JhcCA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAncHJvbXB0LWlucHV0LWNvbnRhaW5lcicgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gaW5wdXRXcmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgY2xzOiAncHJvbXB0LWlucHV0JywgYXR0cjogeyBhdXRvY2FwaXRhbGl6ZTogJ29mZicsIHNwZWxsY2hlY2s6ICdmYWxzZScsIGVudGVya2V5aGludDogJ2RvbmUnLCB0eXBlOiAndGV4dCcsIHBsYWNlaG9sZGVyOiAnRmluZCBldmVudHMuLi4nIH0gfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdHNFbCA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAncHJvbXB0LXJlc3VsdHMnIH0pO1xuICAgICAgICBjb25zdCByZW5kZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRzRWwuZW1wdHkoKTtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5yZXN1bHRzO1xuICAgICAgICAgICAgaWYgKCFpdGVtcy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIGl0ZW1zLmZvckVhY2goKGV2LCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gcmVzdWx0c0VsLmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24taXRlbSBtb2QtY29tcGxleCcgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IHRoaXMuc2VsZWN0ZWRJbmRleCkgcm93LmFkZENsYXNzKCdpcy1zZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgIHJvdy5vbm1vdXNlZW50ZXIgPSAoKSA9PiB7IHRoaXMuc2VsZWN0ZWRJbmRleCA9IGk7IHJlbmRlcigpOyB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi1jb250ZW50JyB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi10aXRsZScgfSk7XG4gICAgICAgICAgICAgICAgdGl0bGUudGV4dENvbnRlbnQgPSBldi50aXRsZSB8fCAnKHVudGl0bGVkKSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm90ZSA9IGNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi1ub3RlJyB9KTtcbiAgICAgICAgICAgICAgICBub3RlLnRleHRDb250ZW50ID0gZXYuZGF0ZSArIChldi50aW1lID8gJyAnICsgZXYudGltZSA6ICcnKTtcbiAgICAgICAgICAgICAgICBub3RlLnN0eWxlLmZvbnRTaXplID0gJzAuOGVtJztcbiAgICAgICAgICAgICAgICBub3RlLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbXV0ZWQpJztcbiAgICAgICAgICAgICAgICByb3cub25jbGljayA9ICgpID0+IHRoaXMuY2hvb3NlKGkpO1xuICAgICAgICAgICAgICAgIHJvdy5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5jaG9vc2UoaSk7IH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcSA9IChpbnB1dC52YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHRoaXMucXVlcnkgPSBxO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZWFyY2ggYWxsIG1vbnRocyBieSBsb2FkaW5nIGFsbCBKU09OIGZpbGVzXG4gICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnZpZXcucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgfHwgJ0RheWJsZUNhbGVuZGFyJztcbiAgICAgICAgICAgIGxldCBhbGxFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RhcnQgd2l0aCBjdXJyZW50IHZpZXcgZXZlbnRzIHRvIGJlIGZhc3RcbiAgICAgICAgICAgIGFsbEV2ZW50cyA9IHRoaXMudmlldy5ldmVudHMuc2xpY2UoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIGFsbCBvdGhlciBmaWxlcyBpZiB3ZSBoYXZlIGEgcXVlcnlcbiAgICAgICAgICAgICAgICBpZiAocS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBsaXN0aW5nO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgbWlnaHQgbm90IGV4aXN0IG9yIG90aGVyIGVycm9yXG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0aW5nID0geyBmaWxlczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSAobGlzdGluZy5maWxlcyB8fCBbXSkuZmlsdGVyKChmOiBzdHJpbmcpID0+IGYudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLmpzb24nKSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgY3VycmVudCBtb250aCBmaWxlIGFzIGl0J3MgYWxyZWFkeSBpbiBtZW1vcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRGaWxlID0gdGhpcy52aWV3LmdldE1vbnRoRGF0YUZpbGVQYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZiA9PT0gY3VycmVudEZpbGUpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGYuZW5kc1dpdGgoY3VycmVudEZpbGUuc3BsaXQoJy8nKS5wb3AoKSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4dCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZSh0eHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGxlZ2FjeSBhcnJheSBmb3JtYXQgYW5kIG5ldyBvYmplY3QgZm9ybWF0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlRXZlbnRzID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgJiYgQXJyYXkuaXNBcnJheShkYXRhLmV2ZW50cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUV2ZW50cyA9IGRhdGEuZXZlbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZUV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsbEV2ZW50cyA9IGFsbEV2ZW50cy5jb25jYXQoZmlsZUV2ZW50cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzIGJhc2VkIG9uIElEXG4gICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlRXZlbnRzID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2IG9mIGFsbEV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmICghc2Vlbi5oYXMoZXYuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZW4uYWRkKGV2LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgdW5pcXVlRXZlbnRzLnB1c2goZXYpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5yZXN1bHRzID0gdW5pcXVlRXZlbnRzLmZpbHRlcihlID0+ICgoZS50aXRsZSB8fCAnJykgKyAnICcgKyAoZS5kZXNjcmlwdGlvbiB8fCAnJykpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkpLnNsaWNlKDAsIDUwKTtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IDA7XG4gICAgICAgICAgICByZW5kZXIoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgb25LZXkgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnQXJyb3dEb3duJykgeyB0aGlzLnNlbGVjdGVkSW5kZXggPSBNYXRoLm1pbih0aGlzLnJlc3VsdHMubGVuZ3RoIC0gMSwgdGhpcy5zZWxlY3RlZEluZGV4ICsgMSk7IHJlbmRlcigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnQXJyb3dVcCcpIHsgdGhpcy5zZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgoMCwgdGhpcy5zZWxlY3RlZEluZGV4IC0gMSk7IHJlbmRlcigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRW50ZXInKSB7IHRoaXMuY2hvb3NlKHRoaXMuc2VsZWN0ZWRJbmRleCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7IHRoaXMuY2xvc2UoKTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgICAgIH07XG4gICAgICAgIGlucHV0Lm9uaW5wdXQgPSB1cGRhdGU7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IG9uS2V5O1xuICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB1cGRhdGUoKTtcbiAgICB9XG4gICAgYXN5bmMgY2hvb3NlKGlkeDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGV2ID0gdGhpcy5yZXN1bHRzW2lkeF07XG4gICAgICAgIGlmICghZXYpIHJldHVybjtcbiAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGV2LmRhdGUgfHwgZXYuc3RhcnREYXRlO1xuICAgICAgICBpZiAoZGF0ZVN0cikge1xuICAgICAgICAgICAgY29uc3QgW3ksIG0sIGRdID0gZGF0ZVN0ci5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdGhpcy52aWV3LmN1cnJlbnREYXRlID0gbmV3IERhdGUoeSwgKG0gfHwgMSkgLSAxLCBkIHx8IDEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy52aWV3LmxvYWRBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICB0aGlzLnZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlcyA9IEFycmF5LmZyb20odGhpcy52aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1pZD1cIiR7ZXYuaWR9XCJdYCkpO1xuICAgICAgICAgICAgICAgIG5vZGVzLmZvckVhY2gobiA9PiBuLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1oaWdobGlnaHQnKSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IG5vZGVzLmZvckVhY2gobiA9PiBuLmNsYXNzTGlzdC5yZW1vdmUoJ2RheWJsZS1ldmVudC1oaWdobGlnaHQnKSk7IH0sIDIwMDApO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbn1cblxuY2xhc3MgVG9kYXlNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBkYXRlOiBzdHJpbmc7XG4gICAgZXZlbnRzOiBEYXlibGVFdmVudFtdO1xuICAgIHZpZXc/OiBEYXlibGVDYWxlbmRhclZpZXc7XG4gICAgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIGRhdGU6IHN0cmluZywgZXZlbnRzOiBEYXlibGVFdmVudFtdLCB2aWV3PzogRGF5YmxlQ2FsZW5kYXJWaWV3KSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gZXZlbnRzO1xuICAgICAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICAgIH1cbiAgICBcbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICAgICAgYy5lbXB0eSgpO1xuICAgICAgICBjLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIGMuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xuICAgICAgICBjLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgICAgYy5hZGRDbGFzcygnZGItbW9kYWwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhcnNlIGRhdGVcbiAgICAgICAgY29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gdGhpcy5kYXRlLnNwbGl0KCctJykubWFwKE51bWJlcik7XG4gICAgICAgIGNvbnN0IGRhdGVPYmogPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZSA9IG1vbnRoTmFtZXNbZGF0ZU9iai5nZXRNb250aCgpXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRpdGxlIHdpdGggZGF0ZVxuICAgICAgICBjb25zdCB0aXRsZSA9IGMuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBgJHttb250aE5hbWV9ICR7ZGF5fWAgfSk7XG4gICAgICAgIHRpdGxlLmFkZENsYXNzKCdkYi1tb2RhbC10aXRsZScpO1xuICAgICAgICB0aXRsZS5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMTZweCc7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZXZlbnRzIGZvciB0aGlzIGRhdGVcbiAgICAgICAgY29uc3QgZGF5RXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5kYXRlID09PSB0aGlzLmRhdGUpLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVBID0gYS50aW1lID8gYS50aW1lLnNwbGl0KCctJylbMF0gOiAnOTk6OTknO1xuICAgICAgICAgICAgY29uc3QgdGltZUIgPSBiLnRpbWUgPyBiLnRpbWUuc3BsaXQoJy0nKVswXSA6ICc5OTo5OSc7XG4gICAgICAgICAgICByZXR1cm4gdGltZUEubG9jYWxlQ29tcGFyZSh0aW1lQik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRzIGNvbnRhaW5lciAoc2Nyb2xsYWJsZSlcbiAgICAgICAgY29uc3QgZXZlbnRzQ29udGFpbmVyID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnRzLWNvbnRhaW5lcicgfSk7XG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5hZGRDbGFzcygnZGItZXZlbnRzLWNvbnRhaW5lcicpO1xuICAgICAgICBldmVudHNDb250YWluZXIuc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxMnB4JztcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLnBhZGRpbmdSaWdodCA9ICc4cHgnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheUV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ05vIGV2ZW50cyBmb3IgdGhpcyBkYXknIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF5RXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYi10b2RheS1yb3cnKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgIHJvdy5kYXRhc2V0LmlkID0gZXYuaWQ7XG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmdhcCA9ICcxMnB4JztcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUubWFyZ2luQm90dG9tID0gJzEycHgnO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gJzhweCc7XG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0KSc7XG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmJvcmRlclJhZGl1cyA9ICc2cHgnO1xuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRFbCA9IHJvdy5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5zdHlsZS5nYXAgPSAnNHB4JztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZUVsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC10aXRsZScgfSk7XG4gICAgICAgICAgICAgICAgdGl0bGVFbC5hZGRDbGFzcygnZGItdGl0bGUnKTtcbiAgICAgICAgICAgICAgICB0aXRsZUVsLnN0eWxlLmZvbnRXZWlnaHQgPSAnNTAwJztcbiAgICAgICAgICAgICAgICB0aXRsZUVsLnN0eWxlLmNvbG9yID0gZXYuY29sb3IgPyAoZXYudGV4dENvbG9yIHx8ICd2YXIoLS10ZXh0LW5vcm1hbCknKSA6ICd2YXIoLS10ZXh0LW5vcm1hbCknO1xuICAgICAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZUVsLCB0aGlzLnZpZXc/LnBsdWdpbj8uYXBwKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBldmVudCBjb2xvcnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy52aWV3Py5wbHVnaW47XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IHBsdWdpbj8uc2V0dGluZ3M/LmV2ZW50Q2F0ZWdvcmllcyA/PyBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGNhdGVnb3JpZXMuZmluZChjID0+IGMuaWQgPT09IGV2LmNhdGVnb3J5SWQpO1xuICAgICAgICAgICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XG4gICAgICAgICAgICAgICAgbGV0IHRleHRDb2xvciA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChldi5jb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gZXYuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHRleHRDb2xvciA9IGV2LnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IoZXYuY29sb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2F0ZWdvcnkgJiYgY2F0ZWdvcnkuYmdDb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gY2F0ZWdvcnkuYmdDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbG9yID0gY2F0ZWdvcnkudGV4dENvbG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYmdDb2xvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcGFjaXR5ID0gcGx1Z2luPy5zZXR0aW5ncz8uZXZlbnRCZ09wYWNpdHkgPz8gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmdiYUNvbG9yID0gaGV4VG9SZ2JhKGJnQ29sb3IsIG9wYWNpdHkpO1xuICAgICAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcmdiYUNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB0aXRsZUVsLnN0eWxlLmNvbG9yID0gdGV4dENvbG9yIHx8IHRpdGxlRWwuc3R5bGUuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmVmZmVjdCAmJiBjYXRlZ29yeS5lZmZlY3QgIT09ICcnKSByb3cuYWRkQ2xhc3MoYGRheWJsZS1lZmZlY3QtJHtjYXRlZ29yeS5lZmZlY3R9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHBsdWdpbj8uc2V0dGluZ3M/Lm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24gJiYgY2F0ZWdvcnkuYW5pbWF0aW9uICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKGBkYXlibGUtYW5pbS0ke2NhdGVnb3J5LmFuaW1hdGlvbn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnkuYW5pbWF0aW9uMiAmJiBjYXRlZ29yeS5hbmltYXRpb24yICE9PSAnJyAmJiAoIW9ubHlUb2RheSB8fCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKGBkYXlibGUtYW5pbS0ke2NhdGVnb3J5LmFuaW1hdGlvbjJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUVsID0gcm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS10aW1lJyB9KTtcbiAgICAgICAgICAgICAgICB0aW1lRWwuYWRkQ2xhc3MoJ2RiLXRpbWUnKTtcbiAgICAgICAgICAgICAgICB0aW1lRWwuc3R5bGUubWluV2lkdGggPSAnNjBweCc7XG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLmZvbnRXZWlnaHQgPSAnNjAwJztcbiAgICAgICAgICAgICAgICAvLyBNYXRjaCBldmVudCB0aXRsZSBjb2xvclxuICAgICAgICAgICAgICAgIHRpbWVFbC5zdHlsZS5jb2xvciA9IHRpdGxlRWwuc3R5bGUuY29sb3I7XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmbXQgPSB0aGlzLnZpZXc/LnBsdWdpbj8uc2V0dGluZ3M/LnRpbWVGb3JtYXQgPz8gJzI0aCc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VmFsID0gZXYudGltZSA/IGV2LnRpbWUuc3BsaXQoJy0nKVswXSA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwID0gZm9ybWF0VGltZVZhbHVlKHN0YXJ0VmFsLCBmbXQpO1xuICAgICAgICAgICAgICAgICAgICB0aW1lRWwudGV4dENvbnRlbnQgPSBkaXNwIHx8ICfigJQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZXYuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVzY0VsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC1kZXNjJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLmFkZENsYXNzKCdkYi1kZXNjJyk7XG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5zdHlsZS5mb250U2l6ZSA9ICcwLjllbSc7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hdGNoIHRpdGxlIGNvbG9yXG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5zdHlsZS5jb2xvciA9IHRpdGxlRWwuc3R5bGUuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LmRlc2NyaXB0aW9uLCBkZXNjRWwsIHRoaXMudmlldz8ucGx1Z2luPy5hcHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBPcHRpb25hbCBjb21wbGV0ZWQgaW5kaWNhdG9yXG4gICAgICAgICAgICAgICAgaWYgKGV2LmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWhhdmlvciA9IHRoaXMudmlldz8ucGx1Z2luPy5zZXR0aW5ncz8uY29tcGxldGVCZWhhdmlvciA/PyAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWhhdmlvciA9PT0gJ2RpbScpIHJvdy5zdHlsZS5vcGFjaXR5ID0gJzAuNic7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnc3RyaWtldGhyb3VnaCcpIHRpdGxlRWwuc3R5bGUudGV4dERlY29yYXRpb24gPSAnbGluZS10aHJvdWdoJztcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoYmVoYXZpb3IgPT09ICdoaWRlJykgcm93LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuICAgICAgICAgICAgICAgIC8vIERyYWcgaGFuZGxlcnMgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgICAgICAgICByb3cub25kcmFnc3RhcnQgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCd0b2RheScpO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IHJvdy5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudG9wID0gJy0xMDAwMHB4JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUubGVmdCA9ICctMTAwMDBweCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUud2lkdGggPSBgJHtyZWN0LndpZHRofXB4YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUocm93KS5ib3JkZXJSYWRpdXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERyYWdJbWFnZShkcmFnSW1nLCBNYXRoLm1pbig4LCByZWN0LndpZHRoIC8gNCksIE1hdGgubWluKDgsIHJlY3QuaGVpZ2h0IC8gNCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKHJvdyBhcyBhbnkpLl9fZHJhZ0ltZyA9IGRyYWdJbWc7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgY29uc29sZS5kZWJ1ZygnW0RheWJsZV0gRHJhZyBpbWFnZSBzZXR1cDonLCBlKTsgfVxuICAgICAgICAgICAgICAgICAgICByb3cuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ2VuZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm93LnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGkgPSAocm93IGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGkgJiYgZGkucGFyZW50RWxlbWVudCkgZGkucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIChyb3cgYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBDbGljayB0byBlZGl0XG4gICAgICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXc/Lm9wZW5FdmVudE1vZGFsKGV2LmlkLCBldi5kYXRlID8/IHRoaXMuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvLyBSaWdodC1jbGljayBjb250ZXh0IG1lbnVcbiAgICAgICAgICAgICAgICByb3cub25jb250ZXh0bWVudSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0R1cGxpY2F0ZScpLnNldEljb24oJ2NvcHknKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0V2OiBEYXlibGVFdmVudCA9IHsgLi4uZXYsIGlkOiByYW5kb21JZCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuZXZlbnRzLnB1c2gobmV3RXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKGV2LmNvbXBsZXRlZCA/ICdNYXJrIGluY29tcGxldGUnIDogJ01hcmsgY29tcGxldGUnKS5zZXRJY29uKCdjaGVjaycpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29tcGxldGVkID0gIWV2LmNvbXBsZXRlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEZWxldGUnKS5zZXRJY29uKCd0cmFzaCcpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW4gdG9kYXkgbW9kYWxcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um93ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3NDb3VudCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0Um93ICYmIHJvd3NDb3VudCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldFJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGggPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5jbGFzc05hbWUgPSAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGggLyAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0Um93KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFJvdy5hZnRlcihpbmRpY2F0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBldmVudHNDb250YWluZXIpIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3cgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRSb3cgfHwgdGFyZ2V0Um93ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0Um93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgaCAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldFJvdyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Um93LmFmdGVyKGRyYWdnZWRFbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Um93KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChkcmFnZ2VkRWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQZXJzaXN0IG9yZGVyIGZvciB0aGlzIGRhdGVcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheUlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtdG9kYXktZXZlbnQtcm93JykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlJZHMucHVzaChlaWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWwgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihldiA9PiBldi5kYXRlID09PSBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJzID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSAhPT0gZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlb3JkZXJlZERheSA9IGRheUlkcy5tYXAoaWQgPT4gb3JpZ2luYWwuZmluZChlID0+IGUuaWQgPT09IGlkKSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuZXZlbnRzID0gb3RoZXJzLmNvbmNhdChyZW9yZGVyZWREYXkpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnZpZXcuc2F2ZUFsbEVudHJpZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpeGVkICtBZGQgRXZlbnQgYnV0dG9uIGF0IGJvdHRvbVxuICAgICAgICBjb25zdCBhZGRCdG4gPSBjLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS10b2RheS1hZGQtYnRuJywgdGV4dDogJysgYWRkIGV2ZW50JyB9KTtcbiAgICAgICAgYWRkQnRuLmFkZENsYXNzKCdkYi1idG4nKTtcbiAgICAgICAgYWRkQnRuLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICBhZGRCdG4uc3R5bGUucGFkZGluZyA9ICcxMHB4JztcbiAgICAgICAgYWRkQnRuLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICAgICAgYWRkQnRuLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc2cHgnO1xuICAgICAgICBhZGRCdG4uc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xuICAgICAgICBhZGRCdG4uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICAgICAgICBhZGRCdG4uc3R5bGUubWFyZ2luVG9wID0gJ2F1dG8nO1xuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMudmlldz8ub3BlbkV2ZW50TW9kYWwodW5kZWZpbmVkLCB0aGlzLmRhdGUpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGludGVybmFsIGxpbmsgY2xpY2tzIGluc2lkZSB0b2RheSBtb2RhbCBjb250ZW50XG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhID0gKGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgaWYgKCFhKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCB3aWtpID0gYS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xuICAgICAgICAgICAgaWYgKHdpa2kpIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgIH1cbn1cblxuY2xhc3MgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgICAgICBjb25zdCB0aXRsZSA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdTdG9yYWdlIGZvbGRlciBub3Qgc2V0JyB9KTtcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1lvdSBuZWVkIHRvIHNldCBhIHN0b3JhZ2UgZm9sZGVyIHRvIGNyZWF0ZSBhbmQgc2F2ZSBldmVudHMuJyB9KTtcbiAgICAgICAgY29uc3QgYnRucyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgYnRucy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICBidG5zLnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgICAgICBidG5zLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtZW5kJztcbiAgICAgICAgYnRucy5zdHlsZS5tYXJnaW5Ub3AgPSAnMTJweCc7XG4gICAgICAgIGNvbnN0IG9wZW5TZXR0aW5nc0J0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicgfSk7XG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5zZXRUZXh0KCdPcGVuIHNldHRpbmdzJyk7XG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHsgXG4gICAgICAgICAgICAgICAgY29uc3QgcyA9ICh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmc7XG4gICAgICAgICAgICAgICAgcz8ub3Blbj8uKCk7XG4gICAgICAgICAgICAgICAgcz8ub3BlblRhYkJ5SWQ/LignZGF5YmxlLWNhbGVuZGFyJyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIE9wZW4gc2V0dGluZ3M6JywgZSk7IH1cbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgY2xvc2VCdG4gPSBidG5zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nIH0pO1xuICAgICAgICBjbG9zZUJ0bi5zZXRUZXh0KCdDbG9zZScpO1xuICAgICAgICBjbG9zZUJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xuICAgIH1cbn1cblxuY2xhc3MgQ29uZmlybU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgICBvbkNvbmZpcm06ICgpID0+IHZvaWQ7XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG1lc3NhZ2U6IHN0cmluZywgb25Db25maXJtOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgIHRoaXMub25Db25maXJtID0gb25Db25maXJtO1xuICAgIH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICAgICAgYy5lbXB0eSgpO1xuICAgICAgICBjLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIGMuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xuICAgICAgICBjLnN0eWxlLmdhcCA9ICcxMnB4JztcbiAgICAgICAgY29uc3QgbXNnID0gYy5jcmVhdGVFbCgnZGl2Jyk7XG4gICAgICAgIG1zZy50ZXh0Q29udGVudCA9IHRoaXMubWVzc2FnZTtcbiAgICAgICAgY29uc3Qgcm93ID0gYy5jcmVhdGVEaXYoKTtcbiAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIHJvdy5zdHlsZS5nYXAgPSAnOHB4JztcbiAgICAgICAgcm93LnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtZW5kJztcbiAgICAgICAgY29uc3QgY2FuY2VsID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nIH0pO1xuICAgICAgICBjYW5jZWwudGV4dENvbnRlbnQgPSAnQ2FuY2VsJztcbiAgICAgICAgY2FuY2VsLm9uY2xpY2sgPSAoKSA9PiB0aGlzLmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IG9rID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gbW9kLWN0YScgfSk7XG4gICAgICAgIG9rLnRleHRDb250ZW50ID0gJ0RlbGV0ZSc7XG4gICAgICAgIG9rLm9uY2xpY2sgPSAoKSA9PiB7IHRyeSB7IHRoaXMub25Db25maXJtKCk7IH0gZmluYWxseSB7IHRoaXMuY2xvc2UoKTsgfSB9O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0SWNvbklkc1NhZmUoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGFueU9iID0gKHdpbmRvdyBhcyBhbnkpLm9ic2lkaWFuO1xuICAgIGNvbnN0IGlkc0ZuID0gYW55T2I/LmdldEljb25JZHM7XG4gICAgaWYgKHR5cGVvZiBpZHNGbiA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGlkc0ZuKCk7XG4gICAgcmV0dXJuIFsnY2FsZW5kYXInLCdjbG9jaycsJ3N0YXInLCdib29rbWFyaycsJ2ZsYWcnLCdiZWxsJywnY2hlY2snLCdwZW5jaWwnLCdib29rJywnemFwJ107XG59XG5cbmZ1bmN0aW9uIGNob29zZVRleHRDb2xvcihoZXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IoaGV4KTtcbiAgICBpZiAoIXJnYikgcmV0dXJuICd2YXIoLS10ZXh0LW5vcm1hbCknO1xuICAgIGNvbnN0IHlpcSA9ICgocmdiLnIqMjk5KSsocmdiLmcqNTg3KSsocmdiLmIqMTE0KSkvMTAwMDtcbiAgICByZXR1cm4geWlxID49IDEyOCA/ICcjMDAwMDAwJyA6ICcjZmZmZmZmJztcbn1cblxuZnVuY3Rpb24gaGV4VG9SZ2IoaGV4OiBzdHJpbmcpOiB7cjpudW1iZXIsZzpudW1iZXIsYjpudW1iZXJ9fG51bGwge1xuICAgIGNvbnN0IG0gPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcbiAgICByZXR1cm4gbSA/IHsgcjogcGFyc2VJbnQobVsxXSwxNiksIGc6IHBhcnNlSW50KG1bMl0sMTYpLCBiOiBwYXJzZUludChtWzNdLDE2KSB9IDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaGV4VG9SZ2JhKGhleDogc3RyaW5nLCBhbHBoYTogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCByZ2IgPSBoZXhUb1JnYihoZXgpO1xuICAgIGlmICghcmdiKSByZXR1cm4gaGV4O1xuICAgIHJldHVybiBgcmdiYSgke3JnYi5yfSwgJHtyZ2IuZ30sICR7cmdiLmJ9LCAke2FscGhhfSlgO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lVmFsdWUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZm10OiAnMjRoJyB8ICcxMmgnKTogc3RyaW5nIHtcbiAgICBpZiAoIXZhbHVlKSByZXR1cm4gJyc7XG4gICAgY29uc3QgW2hoU3RyLCBtbVN0cl0gPSB2YWx1ZS5zcGxpdCgnOicpO1xuICAgIGNvbnN0IGhoID0gcGFyc2VJbnQoaGhTdHIgfHwgJzAnLCAxMCk7XG4gICAgY29uc3QgbW0gPSBwYXJzZUludChtbVN0ciB8fCAnMCcsIDEwKTtcbiAgICBpZiAoZm10ID09PSAnMTJoJykge1xuICAgICAgICBjb25zdCBpc1BNID0gaGggPj0gMTI7XG4gICAgICAgIGNvbnN0IGgxMiA9ICgoaGggJSAxMikgfHwgMTIpO1xuICAgICAgICByZXR1cm4gYCR7aDEyfToke1N0cmluZyhtbSkucGFkU3RhcnQoMiwgJzAnKX0gJHtpc1BNID8gJ1BNJyA6ICdBTSd9YDtcbiAgICB9XG4gICAgcmV0dXJuIGAke1N0cmluZyhoaCkucGFkU3RhcnQoMiwgJzAnKX06JHtTdHJpbmcobW0pLnBhZFN0YXJ0KDIsICcwJyl9YDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZVJhbmdlKHJhbmdlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZtdDogJzI0aCcgfCAnMTJoJyk6IHN0cmluZyB7XG4gICAgaWYgKCFyYW5nZSkgcmV0dXJuICcnO1xuICAgIGNvbnN0IHBhcnRzID0gcmFuZ2Uuc3BsaXQoJy0nKTtcbiAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGNvbnN0IHMgPSBmb3JtYXRUaW1lVmFsdWUocGFydHNbMF0sIGZtdCk7XG4gICAgICAgIGNvbnN0IGUgPSBmb3JtYXRUaW1lVmFsdWUocGFydHNbMV0sIGZtdCk7XG4gICAgICAgIGlmIChzICYmIGUpIHJldHVybiBgJHtzfS0ke2V9YDtcbiAgICAgICAgcmV0dXJuIHMgfHwgZSB8fCAnJztcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdFRpbWVWYWx1ZShwYXJ0c1swXSwgZm10KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTWFya2Rvd24odGV4dDogc3RyaW5nLCBlbGVtZW50OiBIVE1MRWxlbWVudCwgYXBwPzogQXBwKTogdm9pZCB7XG4gICAgLy8gU2ltcGxlIG1hcmtkb3duIHJlbmRlcmluZzogaGVhZGluZ3MsIGJvbGQsIGl0YWxpYywgbGlua3MsIGNvZGUsIHN0cmlrZXRocm91Z2gsIGhpZ2hsaWdodCwgYmxvY2txdW90ZSwgaW1hZ2VzXG4gICAgLy8gTk9URTogV2UgZG8gTk9UIGVzY2FwZSBIVE1MIHRvIGFsbG93IHVzZXJzIHRvIHVzZSBIVE1MIHRhZ3MgZGlyZWN0bHkgKGUuZy4sIDx1PnVuZGVybGluZTwvdT4pXG4gICAgbGV0IGh0bWwgPSB0ZXh0XG4gICAgICAgIC8vIE9ic2lkaWFuIHdpa2ktc3R5bGUgaW1hZ2VzICFbW2ltYWdlLnBuZ11dXG4gICAgICAgIC5yZXBsYWNlKC8hXFxbXFxbKFteXFxdXSspXFxdXFxdL2csIChtYXRjaCwgZmlsZW5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlVXJsID0gYXBwID8gcmVzb2x2ZUltYWdlUGF0aChmaWxlbmFtZSwgYXBwKSA6IGZpbGVuYW1lO1xuICAgICAgICAgICAgcmV0dXJuIGA8aW1nIHNyYz1cIiR7aW1hZ2VVcmx9XCIgYWx0PVwiJHtmaWxlbmFtZX1cIiBjbGFzcz1cImRheWJsZS1lbWJlZC1pbWFnZVwiPmA7XG4gICAgICAgIH0pXG4gICAgICAgIC8vIE1hcmtkb3duIGltYWdlcyAhW2FsdF0odXJsKVxuICAgICAgICAucmVwbGFjZSgvIVxcWyhbXlxcXV0qKVxcXVxcKChbXildKylcXCkvZywgKG1hdGNoLCBhbHQsIHNyYykgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW1hZ2VVcmwgPSBhcHAgPyByZXNvbHZlSW1hZ2VQYXRoKHNyYywgYXBwKSA6IHNyYztcbiAgICAgICAgICAgIHJldHVybiBgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cIiR7YWx0fVwiIGNsYXNzPVwiZGF5YmxlLWVtYmVkLWltYWdlXCI+YDtcbiAgICAgICAgfSlcbiAgICAgICAgLy8gSGVhZGluZ3MgIy4uIyMjIyMjXG4gICAgICAgIC5yZXBsYWNlKC9eIyMjIyMjXFxzKyguKykkL2dtLCAnPGg2PiQxPC9oNj4nKVxuICAgICAgICAucmVwbGFjZSgvXiMjIyMjXFxzKyguKykkL2dtLCAnPGg1PiQxPC9oNT4nKVxuICAgICAgICAucmVwbGFjZSgvXiMjIyNcXHMrKC4rKSQvZ20sICc8aDQ+JDE8L2g0PicpXG4gICAgICAgIC5yZXBsYWNlKC9eIyMjXFxzKyguKykkL2dtLCAnPGgzPiQxPC9oMz4nKVxuICAgICAgICAucmVwbGFjZSgvXiMjXFxzKyguKykkL2dtLCAnPGgyPiQxPC9oMj4nKVxuICAgICAgICAucmVwbGFjZSgvXiNcXHMrKC4rKSQvZ20sICc8aDE+JDE8L2gxPicpXG4gICAgICAgIC8vIEJvbGQgKip0ZXh0KiogYW5kIF9fdGV4dF9fXG4gICAgICAgIC5yZXBsYWNlKC9cXCpcXCooLis/KVxcKlxcKi9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpXG4gICAgICAgIC5yZXBsYWNlKC9fXyguKz8pX18vZywgJzxzdHJvbmc+JDE8L3N0cm9uZz4nKVxuICAgICAgICAvLyBJdGFsaWMgKnRleHQqIGFuZCBfdGV4dF9cbiAgICAgICAgLnJlcGxhY2UoL1xcKiguKz8pXFwqL2csICc8ZW0+JDE8L2VtPicpXG4gICAgICAgIC5yZXBsYWNlKC9fKC4rPylfL2csICc8ZW0+JDE8L2VtPicpXG4gICAgICAgIC8vIFN0cmlrZXRocm91Z2ggfn50ZXh0fn5cbiAgICAgICAgLnJlcGxhY2UoL35+KC4rPyl+fi9nLCAnPGRlbD4kMTwvZGVsPicpXG4gICAgICAgIC8vIEhpZ2hsaWdodCA9PXRleHQ9PVxuICAgICAgICAucmVwbGFjZSgvPT0oLis/KT09L2csICc8bWFyaz4kMTwvbWFyaz4nKVxuICAgICAgICAvLyBCbG9ja3F1b3RlIGxpbmVzIHN0YXJ0aW5nIHdpdGggPlxuICAgICAgICAucmVwbGFjZSgvXiZndDtbIFxcdF0qKC4rKSQvZ20sICc8YmxvY2txdW90ZT4kMTwvYmxvY2txdW90ZT4nKVxuICAgICAgICAvLyBDb2RlIGB0ZXh0YCBhbmQgYGBgYmxvY2tzYGBgXG4gICAgICAgIC5yZXBsYWNlKC9gKFteYF0rKWAvZywgJzxjb2RlIGNsYXNzPVwiZGF5YmxlLWlubGluZS1jb2RlXCI+JDE8L2NvZGU+JylcbiAgICAgICAgLnJlcGxhY2UoL2BgYChbXFxzXFxTXSo/KWBgYC9nLCAnPHByZSBjbGFzcz1cImRheWJsZS1jb2RlLWJsb2NrXCI+PGNvZGU+JDE8L2NvZGU+PC9wcmU+JylcbiAgICAgICAgLy8gTGlua3MgW1t0YXJnZXR8YWxpYXNdXSBhbmQgW3RleHRdKHVybClcbiAgICAgICAgLnJlcGxhY2UoL1xcW1xcWyhbXlxcW1xcXV0rKVxcXVxcXS9nLCAobSwgaW5uZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gU3RyaW5nKGlubmVyKS5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHBhcnRzWzFdIHx8IHBhcnRzWzBdO1xuICAgICAgICAgICAgcmV0dXJuIGA8YSBjbGFzcz1cImludGVybmFsLWxpbmsgZGF5YmxlLWludGVybmFsLWxpbmtcIiBkYXRhLWhyZWY9XCIke3RhcmdldH1cIj4ke2FsaWFzfTwvYT5gO1xuICAgICAgICB9KVxuICAgICAgICAucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoKFteKV0rKVxcKS9nLCAnPGEgaHJlZj1cIiQyXCIgY2xhc3M9XCJkYXlibGUtZXh0ZXJuYWwtbGlua1wiPiQxPC9hPicpXG4gICAgICAgIC8vIExpbmUgYnJlYWtzXG4gICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICBcbiAgICBjb25zdCByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQucmVwbGFjZUNoaWxkcmVuKHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChodG1sKSk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVJbWFnZVBhdGgoaW1hZ2VQYXRoOiBzdHJpbmcsIGFwcDogQXBwKTogc3RyaW5nIHtcbiAgICBjb25zdCByYXcgPSBTdHJpbmcoaW1hZ2VQYXRoIHx8ICcnKTtcbiAgICBjb25zdCB0YXJnZXQgPSByYXcuc3BsaXQoJ3wnKVswXS5zcGxpdCgnIycpWzBdLnRyaW0oKTtcbiAgICBjb25zdCBieVBhdGggPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXJnZXQpO1xuICAgIGlmIChieVBhdGggJiYgYnlQYXRoIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBhcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGJ5UGF0aCk7XG4gICAgY29uc3QgZmlsZXMgPSBhcHAudmF1bHQuZ2V0RmlsZXMoKTtcbiAgICBjb25zdCBleHRUYXJnZXQgPSB0YXJnZXQuZW5kc1dpdGgoJy5tZCcpID8gdGFyZ2V0LnNsaWNlKDAsIC0zKSA6IHRhcmdldDtcbiAgICBjb25zdCBmb3VuZCA9IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKHRhcmdldCkpXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5uYW1lID09PSB0YXJnZXQpXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5iYXNlbmFtZSA9PT0gZXh0VGFyZ2V0KVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aChgJHtleHRUYXJnZXR9Lm1kYCkpO1xuICAgIGlmIChmb3VuZCkgcmV0dXJuIGFwcC52YXVsdC5nZXRSZXNvdXJjZVBhdGgoZm91bmQpO1xuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVOb3RlRmlsZShhcHA6IEFwcCwgbGlua3RleHQ6IHN0cmluZyk6IFRGaWxlIHwgbnVsbCB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKGxpbmt0ZXh0IHx8ICcnKTtcbiAgICBjb25zdCB0YXJnZXQgPSByYXcuc3BsaXQoJ3wnKVswXS5zcGxpdCgnIycpWzBdLnRyaW0oKTtcbiAgICBjb25zdCB3aXRob3V0TWQgPSB0YXJnZXQuZW5kc1dpdGgoJy5tZCcpID8gdGFyZ2V0LnNsaWNlKDAsIC0zKSA6IHRhcmdldDtcbiAgICBjb25zdCBieVBhdGggPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXJnZXQpO1xuICAgIGlmIChieVBhdGggJiYgYnlQYXRoIGluc3RhbmNlb2YgVEZpbGUpIHJldHVybiBieVBhdGg7XG4gICAgY29uc3QgZmlsZXMgPSBhcHAudmF1bHQuZ2V0RmlsZXMoKTtcbiAgICBjb25zdCBmb3VuZCA9IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKHRhcmdldCkpXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5uYW1lID09PSB0YXJnZXQpXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5iYXNlbmFtZSA9PT0gd2l0aG91dE1kKVxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYucGF0aC5lbmRzV2l0aChgJHt3aXRob3V0TWR9Lm1kYCkpO1xuICAgIHJldHVybiBmb3VuZCB8fCBudWxsO1xufVxuXG5jbGFzcyBEYXlibGVTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gICAgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbikgeyBzdXBlcihhcHAsIHBsdWdpbik7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9XG4gICAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICAgICAgO1xuICAgICAgICAvLyBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdHZW5lcmFsJyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnV2VlayBzdGFydCBkYXknKVxuICAgICAgICAgICAgLnNldERlc2MoJ0ZpcnN0IGRheSBvZiB0aGUgd2VlaycpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJzAnLCAnU3VuZGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignMScsICdNb25kYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcyJywgJ1R1ZXNkYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCczJywgJ1dlZG5lc2RheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzQnLCAnVGh1cnNkYXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCc1JywgJ0ZyaWRheScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzYnLCAnU2F0dXJkYXknKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSkpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtTdGFydERheSA9IHBhcnNlSW50KHYsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ1N0b3JhZ2UgZm9sZGVyJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdGb2xkZXIgdG8gc3RvcmUgY2FsZW5kYXIgZXZlbnRzLiBEYXRhIGlzIHN0b3JlZCBpbiBKU09OIGZpbGVzLicpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyPy50cmltKCkgPyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyIDogJ1Vuc2V0JylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVycyA9IHRoaXMuYXBwLnZhdWx0LmdldEFsbEZvbGRlcnMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZiA9PiBmLnBhdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1Z2dlc3QgPSBuZXcgKEZ1enp5U3VnZ2VzdE1vZGFsIGFzIGFueSkodGhpcy5hcHApO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5zZXRQbGFjZWhvbGRlcignU2VsZWN0IHN0b3JhZ2UgZm9sZGVyLi4uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0LmdldFN1Z2dlc3Rpb25zID0gKHE6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcSkgcmV0dXJuIGZvbGRlcnM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvbGRlcnMuZmlsdGVyKGYgPT4gZi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3QucmVuZGVyU3VnZ2VzdGlvbiA9IChmb2xkZXI6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0VGV4dChmb2xkZXIgfHwgJyhWYXVsdCByb290KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Qub25DaG9vc2VTdWdnZXN0aW9uID0gYXN5bmMgKGZvbGRlcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA9IGZvbGRlciB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbnN1cmVFbnRyaWVzRm9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKSA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgOiAnVW5zZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5sb2FkQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0Lm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnVGltZSBmb3JtYXQnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0Rpc3BsYXkgdGltZXMgaW4gMjRoIG9yIDEyaCBmb3JtYXQnKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCcyNGgnLCAnMjQtaG91cicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzEyaCcsICcxMi1ob3VyJylcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPz8gJzI0aCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPSB2IGFzIFwiMjRoXCIgfCBcIjEyaFwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnQXBwZWFyYW5jZScpLnNldEhlYWRpbmcoKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdJY29uIHBsYWNlbWVudCcpXG4gICAgICAgICAgICAuc2V0RGVzYygnUG9zaXRpb24gb2YgZXZlbnQgaWNvbicpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdOb25lJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndG9wJywgJ1RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AtbGVmdCcsICdUb3AgbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RvcC1yaWdodCcsICdUb3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPSB2IGFzIFwibm9uZVwiIHwgXCJsZWZ0XCIgfCBcInRvcFwiIHwgXCJyaWdodFwiIHwgXCJ0b3AtbGVmdFwiIHwgXCJ0b3AtcmlnaHRcIiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgdGl0bGUgYWxpZ25tZW50JylcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgdGl0bGVzJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiA/PyAnbGVmdCcpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50VGl0bGVBbGlnbiA9IHYgYXMgXCJjZW50ZXJcIiB8IFwibGVmdFwiIHwgXCJyaWdodFwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXZlbnQgZGVzY3JpcHRpb24gYWxpZ25tZW50JylcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgZGVzY3JpcHRpb25zJylcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50RGVzY0FsaWduID8/ICdsZWZ0JylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnREZXNjQWxpZ24gPSB2IGFzIFwiY2VudGVyXCIgfCBcImxlZnRcIiB8IFwicmlnaHRcIiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJhY2tncm91bmQgb3BhY2l0eScpXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIHRyYW5zcGFyZW5jeSBvZiBldmVudCBiYWNrZ3JvdW5kcy4nKVxuICAgICAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDEsIDAuMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJvcmRlciB0aGlja25lc3MnKVxuICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIGV2ZW50IGJvcmRlciB0aGlja25lc3MgKDAtNXB4KScpXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xuICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDUsIDAuNSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMilcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgb3BhY2l0eScpXG4gICAgICAgICAgICAuc2V0RGVzYygnQ29udHJvbHMgYm9yZGVyIGNvbG9yIG9wYWNpdHkgZm9yIGNvbG9yZWQgZXZlbnRzICgwLTEpJylcbiAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XG4gICAgICAgICAgICAgICAgcy5zZXRMaW1pdHMoMCwgMSwgMC4xKVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJPcGFjaXR5ID8/IDEpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyT3BhY2l0eSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgcmFkaXVzJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdDb250cm9scyBldmVudCBjb3JuZXIgcm91bmRuZXNzIChweCknKVxuICAgICAgICAgICAgLmFkZFNsaWRlcihzID0+IHtcbiAgICAgICAgICAgICAgICBzLnNldExpbWl0cygwLCAyNCwgMSlcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDYpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdDb21wbGV0ZWQgZXZlbnQgZGlzcGxheScpXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ0hvdyBjb21wbGV0ZWQgZXZlbnRzIGFwcGVhcicpXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbm9uZScsICdObyBjaGFuZ2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignZGltJywgJ0RpbScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdzdHJpa2V0aHJvdWdoJywgJ1N0cmlrZXRocm91Z2gnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaGlkZScsICdIaWRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID0gdiBhcyBcIm5vbmVcIiB8IFwiaGlkZVwiIHwgXCJkaW1cIiB8IFwic3RyaWtldGhyb3VnaFwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoYE9ubHkgYW5pbWF0ZSB0b2RheSdzIGV2ZW50c2ApXG4gICAgICAgICAgICAgICAgLnNldERlc2MoJ1N0b3AgYW5pbWF0aW9uIGZvciBhbGwgZXZlbnRzIGV4Y2VwdCB0b2RheScpXG4gICAgICAgICAgICAgICAgLmFkZFRvZ2dsZSh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5ID8/IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0hvbGRlciBwbGFjZW1lbnQnKVxuICAgICAgICAgICAgLnNldERlc2MoJ1BsYWNlIHRoZSBob2xkZXIgdG9nZ2xlIChsZWZ0LCByaWdodCwgb3IgaGlkZGVuKScpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXG4gICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3JpZ2h0JywgJ1JpZ2h0JylcbiAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaGlkZGVuJywgJ0hpZGRlbicpXG4gICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJQbGFjZW1lbnQgPz8gJ2xlZnQnKVxuICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA9IHYgYXMgXCJsZWZ0XCIgfCBcInJpZ2h0XCIgfCBcImhpZGRlblwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNvbnRhaW5lciBhbmQgcmVidWlsZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5jb250YWluZXJFbC5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5vbk9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgLnNldE5hbWUoJ0VuYWJsZSB3ZWVrbHkgbm90ZXMnKVxuICAgICAgICAgICAgLnNldERlc2MoJ1Nob3cgYSBNYXJrZG93biBub3RlcyBzZWN0aW9uIGJlbG93IHRoZSBjYWxlbmRhciBpbiB3ZWVrbHkgdmlldycpXG4gICAgICAgICAgICAuYWRkVG9nZ2xlKHQgPT4ge1xuICAgICAgICAgICAgICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZXNFbmFibGVkID8/IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3Rlc0VuYWJsZWQgPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdNYXggZGF5IGNlbGwgaGVpZ2h0IChweCknKVxuICAgICAgICAgICAgLnNldERlc2MoJ0lmIHNldCwgZGF5IGNlbGxzIGNhcCBhdCB0aGlzIGhlaWdodCBhbmQgZXZlbnRzIHNjcm9sbCB2ZXJ0aWNhbGx5JylcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQuc2V0UGxhY2Vob2xkZXIoJzAgKGRpc2FibGVkKScpO1xuICAgICAgICAgICAgICAgIHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmRheUNlbGxNYXhIZWlnaHQgPz8gMCkpO1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KHYgfHwgJzAnLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRheUNlbGxNYXhIZWlnaHQgPSBpc05hTihudW0pID8gMCA6IE1hdGgubWF4KDAsIG51bSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICh0LmlucHV0RWwpLnR5cGUgPSAnbnVtYmVyJztcbiAgICAgICAgICAgICAgICAodC5pbnB1dEVsKS5taW4gPSAnMCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCdDb2xvciBzd2F0Y2ggcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdQb3NpdGlvbiBvZiBjb2xvciBzd2F0Y2hlcyBpbiBldmVudCBtb2RhbCcpXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbigndW5kZXItdGl0bGUnLCAnVW5kZXIgdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndW5kZXItZGVzY3JpcHRpb24nLCAnVW5kZXIgZGVzY3JpcHRpb24nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdEbyBub3Qgc2hvdycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29sb3JTd2F0Y2hQb3NpdGlvbiA/PyAndW5kZXItdGl0bGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbG9yU3dhdGNoUG9zaXRpb24gPSB2IGFzIFwibm9uZVwiIHwgXCJ1bmRlci10aXRsZVwiIHwgXCJ1bmRlci1kZXNjcmlwdGlvblwiIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN3YXRjaGVzU2VjdGlvblRvcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuICAgICAgICBuZXcgU2V0dGluZyhzd2F0Y2hlc1NlY3Rpb25Ub3ApLnNldE5hbWUoJ0NvbG9ycycpLnNldEhlYWRpbmcoKTtcbiAgICAgICAgY29uc3QgY29sb3JzTGlzdFRvcCA9IHN3YXRjaGVzU2VjdGlvblRvcC5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29uc3QgcmVuZGVyQ29sb3JzVG9wID0gKCkgPT4ge1xuICAgICAgICAgICAgY29sb3JzTGlzdFRvcC5lbXB0eSgpO1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gY29sb3JzTGlzdFRvcC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgcm93LnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgICAgICAgICAgcm93LnN0eWxlLmFsaWduSXRlbXMgPSAnZmxleC1zdGFydCc7XG4gICAgICAgICAgICByb3cuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xuICAgICAgICAgICAgcm93LnN0eWxlLmZsZXhXcmFwID0gJ3dyYXAnO1xuICAgICAgICAgICAgY29uc3QgYnVpbHQgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfHwgJycsIHNvdXJjZTogJ2J1aWx0JyBhcyBjb25zdCB9KSk7XG4gICAgICAgICAgICBjb25zdCBjdXN0b21zID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfHwgJycsIHNvdXJjZTogJ2N1c3RvbScgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3QgY29tYmluZWQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH1bXSA9IFsuLi5idWlsdCwgLi4uY3VzdG9tc107XG4gICAgICAgICAgICBjb25zdCBtYWtlSXRlbSA9IChlbnRyeTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfSwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmdhcCA9ICc2cHgnO1xuICAgICAgICAgICAgICAgIHdyYXAuc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gZW50cnkuc291cmNlO1xuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5pbmRleCA9IFN0cmluZyhpZHgpO1xuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5uYW1lID0gZW50cnkubmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0UGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XG4gICAgICAgICAgICAgICAgdGV4dFBpY2tlci52YWx1ZSA9IGVudHJ5LnRleHRDb2xvciB8fCAnI2ZmZmZmZic7XG4gICAgICAgICAgICAgICAgY29uc3QgYmdQaWNrZXIgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci52YWx1ZSA9IGVudHJ5LmNvbG9yO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUFsbCA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ1aWx0QXJyID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkN1c3RvbUFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QnVpbHQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmcgPSAoKHcgYXMgYW55KS5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVsxXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4ID0gKCh3IGFzIGFueSkucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImNvbG9yXCJdJylbMF0gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiBiZywgdGV4dENvbG9yOiB0eCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JNYXA6IFJlY29yZDxzdHJpbmcsIHsgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJldkJ1aWx0QXJyLmxlbmd0aCAmJiBpIDwgbmV3QnVpbHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnVpbHRBcnJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBuZXdCdWlsdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2LmNvbG9yICE9PSBub3cuY29sb3IgfHwgKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5vdy50ZXh0Q29sb3IgfHwgJycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JNYXBbcHJldi5jb2xvcl0gPSB7IGNvbG9yOiBub3cuY29sb3IsIHRleHRDb2xvcjogbm93LnRleHRDb2xvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJldkN1c3RvbUFyci5sZW5ndGggJiYgaSA8IG5ld0N1c3RvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldiA9IHByZXZDdXN0b21BcnJbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBuZXdDdXN0b21baV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldi5jb2xvciAhPT0gbm93LmNvbG9yIHx8IChwcmV2LnRleHRDb2xvciB8fCAnJykgIT09IChub3cudGV4dENvbG9yIHx8ICcnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW3ByZXYuY29sb3JdID0geyBjb2xvcjogbm93LmNvbG9yLCB0ZXh0Q29sb3I6IG5vdy50ZXh0Q29sb3IgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVkVHJpZ2dlcnMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLm1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0LmNvbG9yICYmIGNvbG9yTWFwW3QuY29sb3JdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFwcGVkID0gY29sb3JNYXBbdC5jb2xvcl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgLi4udCwgY29sb3I6IG1hcHBlZC5jb2xvciwgdGV4dENvbG9yOiBtYXBwZWQudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihtYXBwZWQuY29sb3IpIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSB1cGRhdGVkVHJpZ2dlcnM7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2QnlOYW1lID0gbmV3IE1hcDxzdHJpbmcsIHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfT4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZCdWlsdEFyci5mb3JFYWNoKHMgPT4gcHJldkJ5TmFtZS5zZXQocy5uYW1lLCB7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWlsdC5mb3JFYWNoKG5iID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV2ID0gcHJldkJ5TmFtZS5nZXQobmIubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JDaGFuZ2VkID0gcHJldi5jb2xvciAhPT0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dENoYW5nZWQgPSAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobmIudGV4dENvbG9yIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbG9yQ2hhbmdlZCAmJiAhdGV4dENoYW5nZWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZ2JhID0gaGV4VG9SZ2JhKG5iLmNvbG9yLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eSA/PyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1jb2xvcj1cIiR7cHJldi5jb2xvcn1cIl1gKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IGVsIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJnLWNvbG9yJywgcmdiYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5kYXRhc2V0LmNvbG9yID0gbmIuY29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmhvbGRlckV2ZW50cy5mb3JFYWNoKGV2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYudGV4dENvbG9yID0gbmIudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihuYi5jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5zYXZlQWxsRW50cmllcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZW5kZXJUcmlnZ2VycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGV4dFBpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcbiAgICAgICAgICAgICAgICAoZGVsKS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIChkZWwpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcbiAgICAgICAgICAgICAgICAoZGVsKS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcbiAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xuICAgICAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUFsbCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgd3JhcC5vbmRyYWdzdGFydCA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsICdkcmFnJyk7XG4gICAgICAgICAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlcikuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJvdy5vbmRyYWdvdmVyID0gZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgfTtcbiAgICAgICAgICAgICAgICByb3cub25kcm9wID0gYXN5bmMgZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQucGFyZW50RWxlbWVudCAhPT0gcm93KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IChlLmNsaWVudFggLSByZWN0LmxlZnQpIDwgcmVjdC53aWR0aCAvIDI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHJvdy5pbnNlcnRCZWZvcmUod3JhcCwgdGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZUFsbCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29tYmluZWQuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4geyBtYWtlSXRlbShlbnRyeSwgaWR4KTsgfSk7XG4gICAgICAgICAgICBjb25zdCBjb250cm9sc0JvdHRvbSA9IG5ldyBTZXR0aW5nKGNvbG9yc0xpc3RUb3ApO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uc2V0dGluZ0VsLmFkZENsYXNzKCdkYXlibGUtY29sb3JzLWNvbnRyb2xzJyk7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwpLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwpLnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCkuc3R5bGUud2lkdGggPSAnMTAwJSc7XG4gICAgICAgICAgICAoY29udHJvbHNCb3R0b20uc2V0dGluZ0VsKS5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LXN0YXJ0JztcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ1Jlc2V0IHRvIGRlZmF1bHQgY29sb3JzJykub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ1Jlc2V0IGNvbG9yIHN3YXRjaGVzIHRvIGRlZmF1bHQ/JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSAoREVGQVVMVF9TRVRUSU5HUy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiAocyBhcyBhbnkpLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29sb3JzVG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgYWRkIGNvbG9yJykub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdyYXAgPSByb3cuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZ2FwID0gJzZweCc7XG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0UGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRleHRQaWNrZXIudmFsdWUgPSAnI2ZmZmZmZic7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJnUGlja2VyID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJnUGlja2VyLnZhbHVlID0gJyNmZjAwMDAnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAoZGVsKS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIChkZWwpLnN0eWxlLnBhZGRpbmcgPSAnMnB4IDRweCc7XG4gICAgICAgICAgICAgICAgICAgIHNldEljb24oZGVsLCAneCcpO1xuICAgICAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUFsbCA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZCdWlsdEFyciA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yc0xpc3RUb3AucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICgodyBhcyBhbnkpLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4ID0gKCh3IGFzIGFueSkucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImNvbG9yXCJdJylbMF0gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2J1aWx0JykgbmV3QnVpbHQucHVzaCh7IG5hbWU6IG5tLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldkJ1aWx0QXJyLmZvckVhY2gocyA9PiBwcmV2QnlOYW1lLnNldChzLm5hbWUsIHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgdGV4dENvbG9yOiBzLnRleHRDb2xvciB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVpbHQuZm9yRWFjaChuYiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnlOYW1lLmdldChuYi5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2KSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQgPSBwcmV2LmNvbG9yICE9PSBuYi5jb2xvciB8fCAocHJldi50ZXh0Q29sb3IgfHwgJycpICE9PSAobmIudGV4dENvbG9yIHx8ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGFuZ2VkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmEgPSBoZXhUb1JnYmEobmIuY29sb3IsIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3LmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYC5kYXlibGUtZXZlbnRbZGF0YS1jb2xvcj1cIiR7cHJldi5jb2xvcn1cIl1gKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGggPSBlbCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYmctY29sb3InLCByZ2JhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtdGV4dC1jb2xvcicsIG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguZGF0YXNldC5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5ldmVudHMuZm9yRWFjaChldiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IgPT09IHByZXYuY29sb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5jb2xvciA9IG5iLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LnRleHRDb2xvciA9IG5iLnRleHRDb2xvciB8fCBjaG9vc2VUZXh0Q29sb3IobmIuY29sb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuaG9sZGVyRXZlbnRzLmZvckVhY2goZXYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmNvbG9yID09PSBwcmV2LmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuY29sb3IgPSBuYi5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi50ZXh0Q29sb3IgPSBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LnNhdmVBbGxFbnRyaWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHRleHRQaWNrZXIub25jaGFuZ2UgPSB1cGRhdGVBbGw7XG4gICAgICAgICAgICAgICAgICAgIGJnUGlja2VyLm9uY2hhbmdlID0gdXBkYXRlQWxsO1xuICAgICAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ0RlbGV0ZSB0aGlzIGNvbG9yIHN3YXRjaD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGRhdGVBbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlbmRlckNvbG9yc1RvcCgpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnRXZlbnQgY2F0ZWdvcmllcycpLnNldEhlYWRpbmcoKTtcbiAgICAgICAgY29uc3QgcnVsZXNXcmFwID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IHJlbmRlclJ1bGVzID0gKCkgPT4ge1xuICAgICAgICAgICAgcnVsZXNXcmFwLmVtcHR5KCk7XG4gICAgICAgICAgICAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdKS5mb3JFYWNoKChjYXRlZ29yeTogRXZlbnRDYXRlZ29yeSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG5ldyBTZXR0aW5nKHJ1bGVzV3JhcCk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBsZWZ0LXNpZGUgc2V0dGluZyB0aXRsZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgcm93LnNldHRpbmdFbC5xdWVyeVNlbGVjdG9yKCcuc2V0dGluZy1pdGVtLW5hbWUnKT8ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgcm93LnNldHRpbmdFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xuICAgICAgICAgICAgICAgIChyb3cuc2V0dGluZ0VsKS5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gJ3Vuc2V0JztcbiAgICAgICAgICAgICAgICByb3cuY29udHJvbEVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwpLnN0eWxlLmdhcCA9ICc4cHgnO1xuICAgICAgICAgICAgICAgIHJvdy5jb250cm9sRWwuc3R5bGUuZmxleCA9ICcxJztcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLWNhdGVnb3J5LXJvdycpO1xuICAgICAgICAgICAgICAgIC8vIEljb24gYnV0dG9uXG4gICAgICAgICAgICAgICAgcm93LmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwpLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1idG4nLCdkYXlibGUtaWNvbi1hZGQnLCdkYi1idG4nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbihiLmJ1dHRvbkVsLCBjYXRlZ29yeS5pY29uID8/ICdwbHVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGIub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBhc3luYyAoaWNvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5Lmljb24gPSBpY29uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5Lmljb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBpY2tlci5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIENhdGVnb3J5IG5hbWUgaW5wdXRcbiAgICAgICAgICAgICAgICByb3cuYWRkVGV4dCh0ID0+IHsgdC5zZXRWYWx1ZShjYXRlZ29yeS5uYW1lKS5vbkNoYW5nZSh2ID0+IHsgY2F0ZWdvcnkubmFtZSA9IHY7IH0pOyAodC5pbnB1dEVsKS5jbGFzc0xpc3QuYWRkKCdkYi1pbnB1dCcsJ2RiLWNhdGVnb3J5LW5hbWUnKTsgfSk7XG4gICAgICAgICAgICAgICAgLy8gVGV4dCBjb2xvciBmaXJzdFxuICAgICAgICAgICAgICAgIHJvdy5hZGRDb2xvclBpY2tlcihjcCA9PiB7IGNwLnNldFZhbHVlKGNhdGVnb3J5LnRleHRDb2xvcikub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS50ZXh0Q29sb3IgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGNwIGFzIGFueSkuaW5wdXRFbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWNvbG9yJywnZGItdGV4dC1jb2xvcicpOyB9KTtcbiAgICAgICAgICAgICAgICAvLyBCYWNrZ3JvdW5kIGNvbG9yIG5leHRcbiAgICAgICAgICAgICAgICByb3cuYWRkQ29sb3JQaWNrZXIoY3AgPT4geyBjcC5zZXRWYWx1ZShjYXRlZ29yeS5iZ0NvbG9yKS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LmJnQ29sb3IgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGNwIGFzIGFueSkuaW5wdXRFbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWNvbG9yJywnZGItYmctY29sb3InKTsgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGVmZmVjdCcsXG4gICAgICAgICAgICAgICAgICAgICdzdHJpcGVkLTEnOiAnU3RyaXBlZCAoNDXCsCknLFxuICAgICAgICAgICAgICAgICAgICAnc3RyaXBlZC0yJzogJ1N0cmlwZWQgKC00NcKwKScsXG4gICAgICAgICAgICAgICAgICAgICd2ZXJ0aWNhbC1zdHJpcGVzJzogJ1ZlcnRpY2FsIHN0cmlwZXMnLFxuICAgICAgICAgICAgICAgICAgICAndGhpbi10ZXh0dXJlZC1zdHJpcGVzJzogJ1RoaW4gdGV4dHVyZWQgc3RyaXBlcycsXG4gICAgICAgICAgICAgICAgICAgICdjcm9zc2hhdGNoZWQnOiAnQ3Jvc3NoYXRjaGVkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2NoZWNrZXJib2FyZCc6ICdDaGVja2VyYm9hcmQnLFxuICAgICAgICAgICAgICAgICAgICAnaGV4YWJvYXJkJzogJ0hleGFib2FyZCcsXG4gICAgICAgICAgICAgICAgICAgICd3YXZ5LWxpbmVzJzogJ1dhdnkgbGluZXMnLFxuICAgICAgICAgICAgICAgICAgICAnZG90dGVkJzogJ0RvdHRlZCcsXG4gICAgICAgICAgICAgICAgICAgICdhcmd5bGUnOiAnQXJneWxlJyxcbiAgICAgICAgICAgICAgICAgICAgJ2VtYm9zc2VkJzogJ0VtYm9zc2VkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzJzogJ0dsYXNzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3cnOiAnR2xvdycsXG4gICAgICAgICAgICAgICAgICAgICdyZXRyby1idXR0b24nOiAnUmV0cm8gYnV0dG9uJ1xuICAgICAgICAgICAgICAgIH0pLnNldFZhbHVlKGNhdGVnb3J5LmVmZmVjdCkub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5lZmZlY3QgPSB2OyBcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWVmZmVjdCcpOyB9KTtcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gYW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtaG9yaXpvbnRhbGx5JzogJ01vdmUgaG9yaXpvbnRhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtdmVydGljYWxseSc6ICdNb3ZlIHZlcnRpY2FsbHknLFxuICAgICAgICAgICAgICAgICAgICAncGFydGljbGVzJzogJ1BhcnRpY2xlcycsXG4gICAgICAgICAgICAgICAgICAgICdzbm93LWZhbGxpbmcnOiAnU25vdyBmYWxsaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FuaW1hdGVkLWdyYWRpZW50JzogJ0FuaW1hdGVkIGdyYWRpZW50JyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsYXNzLXNoaW5lJzogJ0dsYXNzIHNoaW5lJyxcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3dpbmcnOiAnR2xvd2luZydcbiAgICAgICAgICAgICAgICB9KS5zZXRWYWx1ZShjYXRlZ29yeS5hbmltYXRpb24pLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYW5pbWF0aW9uID0gdjsgXG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsKS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24nKTsgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGFuaW1hdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLWhvcml6b250YWxseSc6ICdNb3ZlIGhvcml6b250YWxseScsXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLXZlcnRpY2FsbHknOiAnTW92ZSB2ZXJ0aWNhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2xlcyc6ICdQYXJ0aWNsZXMnLFxuICAgICAgICAgICAgICAgICAgICAnc25vdy1mYWxsaW5nJzogJ1Nub3cgZmFsbGluZycsXG4gICAgICAgICAgICAgICAgICAgICdhbmltYXRlZC1ncmFkaWVudCc6ICdBbmltYXRlZCBncmFkaWVudCcsXG4gICAgICAgICAgICAgICAgICAgICdnbGFzcy1zaGluZSc6ICdHbGFzcyBzaGluZScsXG4gICAgICAgICAgICAgICAgICAgICdnbG93aW5nJzogJ0dsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSkuc2V0VmFsdWUoY2F0ZWdvcnkuYW5pbWF0aW9uMikub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS5hbmltYXRpb24yID0gdjsgXG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsKS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24yJyk7IH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGRFeHRyYUJ1dHRvbihidG4gPT4geyBidG4uc2V0SWNvbigneCcpLnNldFRvb2x0aXAoJ0RlbGV0ZScpLm9uQ2xpY2soKCkgPT4geyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdKS5maWx0ZXIoYyA9PiBjLmlkICE9PSBjYXRlZ29yeS5pZCk7IHJlbmRlclJ1bGVzKCk7IH0pOyAoYnRuIGFzIGFueSkuZXh0cmFCdXR0b25FbD8uY2xhc3NMaXN0Py5hZGQoJ2RiLWJ0bicsJ2RiLWRlbGV0ZS1jYXRlZ29yeScpOyB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIGFkZCBjYXRlZ29yeScpO1xuICAgICAgICAgICAgKGIuYnV0dG9uRWwpLmFkZENsYXNzKCdtb2QtY3RhJyk7XG4gICAgICAgICAgICBiLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5OiBFdmVudENhdGVnb3J5ID0geyBpZDogcmFuZG9tSWQoKSwgbmFtZTogJ05ldyBjYXRlZ29yeScsIGJnQ29sb3I6ICcjODM5MmE0JywgdGV4dENvbG9yOiAnI2ZmZmZmZicsIGVmZmVjdDogJ2VtYm9zc2VkJywgYW5pbWF0aW9uOiAnJywgYW5pbWF0aW9uMjogJycsIGljb246IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmNvbmNhdChjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgcmVuZGVyUnVsZXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVuZGVyUnVsZXMoKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnVHJpZ2dlcnMnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIGNvbnN0IHRyaWdnZXJzV3JhcCA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCByZW5kZXJUcmlnZ2VycyA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyaWdnZXJzV3JhcC5lbXB0eSgpO1xuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IHN3YXRjaGVzID0gW1xuICAgICAgICAgICAgICAgIC4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSksXG4gICAgICAgICAgICAgICAgLi4uKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSlcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKCh0ciwgaWR4KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gbmV3IFNldHRpbmcodHJpZ2dlcnNXcmFwKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZXR0aW5nLWl0ZW0tbmFtZScpPy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLXRyaWdnZXJzLXJvdycpO1xuICAgICAgICAgICAgICAgIHJvdy5jb250cm9sRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICAocm93LmNvbnRyb2xFbCkuc3R5bGUuZ2FwID0gJzhweCc7XG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwpLnN0eWxlLmZsZXggPSAnMSc7XG4gICAgICAgICAgICAgICAgcm93LmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHQuc2V0UGxhY2Vob2xkZXIoJ1RleHQgaW4gdGl0bGUgb3IgZGVzY3JpcHRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0ci5wYXR0ZXJuKTtcbiAgICAgICAgICAgICAgICAgICAgdC5vbkNoYW5nZShhc3luYyB2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0ucGF0dGVybiA9IHYgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAodC5pbnB1dEVsKS5jbGFzc0xpc3QuYWRkKCdkYi1pbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAodC5pbnB1dEVsKS5zdHlsZS5mbGV4ID0gJzEnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJycsICdEZWZhdWx0IGNhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNhdHMuZm9yRWFjaChjID0+IGQuYWRkT3B0aW9uKGMuaWQsIGMubmFtZSkpO1xuICAgICAgICAgICAgICAgICAgICBkLnNldFZhbHVlKHRyLmNhdGVnb3J5SWQgfHwgJycpO1xuICAgICAgICAgICAgICAgICAgICBkLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS5jYXRlZ29yeUlkID0gdiB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzID0gaXRlbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcpO1xuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuc3R5bGUud2lkdGggPSAnOTBweCc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignJywgJ0RlZmF1bHQgY29sb3InKTtcbiAgICAgICAgICAgICAgICAgICAgc3dhdGNoZXMuZm9yRWFjaChzID0+IGQuYWRkT3B0aW9uKHMuY29sb3IsICdDb2xvcicpKTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRWYWx1ZSh0ci5jb2xvciB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbXNbaWR4XS5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbXNbaWR4XS50ZXh0Q29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBzd2F0Y2hlcy5maW5kKHN3ID0+IHN3LmNvbG9yID09PSB2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtc1tpZHhdLmNvbG9yID0gcy5jb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbaWR4XS50ZXh0Q29sb3IgPSBzLnRleHRDb2xvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBseUNvbG9yU3R5bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuY2xhc3NMaXN0LmFkZCgnZGItc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTdHlsZSB0aGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXBwbHlDb2xvclN0eWxlcyA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGQuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkU3dhdGNoID0gc3dhdGNoZXMuZmluZChzdyA9PiBzdy5jb2xvciA9PT0gY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3R5bGUgdGhlIHNlbGVjdCBlbGVtZW50IGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3dhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGQuc2VsZWN0RWwpLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IHNlbGVjdGVkU3dhdGNoLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsKS5zdHlsZS5jb2xvciA9IHNlbGVjdGVkU3dhdGNoLnRleHRDb2xvciB8fCAnIzAwMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsKS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuc3R5bGUuY29sb3IgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3R5bGUgdGhlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmZyb20oZC5zZWxlY3RFbC5vcHRpb25zKS5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHQudmFsdWUpIHJldHVybjsgLy8gU2tpcCBkZWZhdWx0IG9wdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHMgPSBzd2F0Y2hlcy5maW5kKHN3ID0+IHN3LmNvbG9yID09PSBvcHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBzLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHQuc3R5bGUuY29sb3IgPSBzLnRleHRDb2xvciB8fCAnIzAwMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IGluaXRpYWxseVxuICAgICAgICAgICAgICAgICAgICBhcHBseUNvbG9yU3R5bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAoZC5zZWxlY3RFbCkuc3R5bGUubWF4V2lkdGggPSAnMTIwcHgnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJvdy5hZGRFeHRyYUJ1dHRvbihidG4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBidG4uc2V0SWNvbigneCcpLnNldFRvb2x0aXAoJ0RlbGV0ZScpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlZCA9IGl0ZW1zLmZpbHRlcigoXywgaSkgPT4gaSAhPT0gaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzID0gdXBkYXRlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKHRyaWdnZXJzV3JhcCkuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBhZGQgdHJpZ2dlcicpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtczIgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zMi5wdXNoKHsgcGF0dGVybjogJycsIGNhdGVnb3J5SWQ6ICcnIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zMjtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcblxuICAgICAgICAvLyBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdDdXN0b20gU3dhdGNoZXMnIH0pO1xuICAgICAgICBjb25zdCBzd2F0Y2hlc1NlY3Rpb24gPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgKHN3YXRjaGVzU2VjdGlvbiBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgbmV3IFNldHRpbmcoc3dhdGNoZXNTZWN0aW9uKVxuICAgICAgICAgICAgLy8gLnNldE5hbWUoJ0VuYWJsZSBDdXN0b20gU3dhdGNoZXMnKVxuICAgICAgICAgICAgLy8gLnNldERlc2MoJ0lmIG9uLCB5b3VyIGN1c3RvbSBzd2F0Y2hlcyB3aWxsIGFwcGVhciBpbiB0aGUgY29sb3IgcGlja2VyLicpXG4gICAgICAgICAgICAvLyAuYWRkVG9nZ2xlKHQgPT4ge1xuICAgICAgICAgICAgLy8gICAgIHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tU3dhdGNoZXNFbmFibGVkID8/IGZhbHNlKVxuICAgICAgICAgICAgLy8gICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tU3dhdGNoZXNFbmFibGVkID0gdjtcbiAgICAgICAgICAgIC8vICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAvLyAgICAgIH0pO1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoc3dhdGNoZXNTZWN0aW9uKS5zZXROYW1lKCdDb2xvcnMnKS5zZXRIZWFkaW5nKCk7XG4gICAgICAgIGNvbnN0IGNvbG9yc0xpc3QgPSBzd2F0Y2hlc1NlY3Rpb24uY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IHJlbmRlckNvbG9ycyA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbG9yc0xpc3QuZW1wdHkoKTtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbG9yc0xpc3QuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICByb3cuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5nYXAgPSAnOHB4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xuICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxNnB4JztcbiAgICAgICAgICAgIHJvdy5zdHlsZS5mbGV4V3JhcCA9ICd3cmFwJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgdGhlIG9sZCBzd2F0Y2hlcyB0byBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgY29uc3Qgb2xkQnVpbHQgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHNvdXJjZTogJ2J1aWx0JyBhcyBjb25zdCB9KSk7XG4gICAgICAgICAgICBjb25zdCBvbGRDdXN0b21zID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHNvdXJjZTogJ2N1c3RvbScgYXMgY29uc3QgfSkpO1xuICAgICAgICAgICAgY29uc3QgY29tYmluZWQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfVtdID0gWy4uLm9sZEJ1aWx0LCAuLi5vbGRDdXN0b21zXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfSwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmdhcCA9ICc2cHgnO1xuICAgICAgICAgICAgICAgIHdyYXAuc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gZW50cnkuc291cmNlO1xuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5pbmRleCA9IFN0cmluZyhpZHgpO1xuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5uYW1lID0gZW50cnkubmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZW50cnkuY29sb3I7XG4gICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKCh3IGFzIEhUTUxFbGVtZW50KS5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgY29sb3IgbWFwcGluZyBmcm9tIG9sZCB0byBuZXcgYmFzZWQgb24gcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JNYXA6IHsgW29sZENvbG9yOiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIGJ1aWx0IHN3YXRjaGVzXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2xkQnVpbHQubGVuZ3RoICYmIGkgPCBuZXdCdWlsdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEJ1aWx0W2ldLmNvbG9yICE9PSBuZXdCdWlsdFtpXS5jb2xvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW29sZEJ1aWx0W2ldLmNvbG9yXSA9IG5ld0J1aWx0W2ldLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgY3VzdG9tIHN3YXRjaGVzXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2xkQ3VzdG9tcy5sZW5ndGggJiYgaSA8IG5ld0N1c3RvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZEN1c3RvbXNbaV0uY29sb3IgIT09IG5ld0N1c3RvbVtpXS5jb2xvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTWFwW29sZEN1c3RvbXNbaV0uY29sb3JdID0gbmV3Q3VzdG9tW2ldLmNvbG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYW55IHRyaWdnZXJzIHVzaW5nIGNvbG9ycyB0aGF0IGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJpZ2dlcnMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXJzLmZvckVhY2godCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5jb2xvciAmJiBjb2xvck1hcFt0LmNvbG9yXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbG9yVmFsdWUgPSBjb2xvck1hcFt0LmNvbG9yXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbHNvIHVwZGF0ZSB0aGUgdGV4dENvbG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsU3dhdGNoZXMgPSBbLi4ubmV3QnVpbHQsIC4uLm5ld0N1c3RvbV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm91bmRTd2F0Y2ggPSBhbGxTd2F0Y2hlcy5maW5kKHMgPT4gcy5jb2xvciA9PT0gbmV3Q29sb3JWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5jb2xvciA9IG5ld0NvbG9yVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kU3dhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIHRleHRDb2xvciBmcm9tIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU3dhdGNoID0gWy4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSksIC4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pXS5maW5kKHMgPT4gcy5jb2xvciA9PT0gbmV3Q29sb3JWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFN3YXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC50ZXh0Q29sb3IgPSAob3JpZ2luYWxTd2F0Y2ggYXMgYW55KS50ZXh0Q29sb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IHRyaWdnZXJzO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xuICAgICAgICAgICAgICAgIChkZWwpLnN0eWxlLmJhY2tncm91bmQgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgKGRlbCkuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIChkZWwpLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICAgICAgICAgICAgICAoZGVsKS5zdHlsZS5wYWRkaW5nID0gJzJweCA0cHgnO1xuICAgICAgICAgICAgICAgIHNldEljb24oZGVsLCAneCcpO1xuICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xuICAgICAgICAgICAgICAgIGRlbC5vbm1vdXNlZG93biA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICAgICAgZGVsLm9udG91Y2hzdGFydCA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XG4gICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ0RlbGV0ZSB0aGlzIGNvbG9yIHN3YXRjaD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cmFwLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QnVpbHQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICgodyBhcyBhbnkpLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHdyYXAub25kcmFnc3RhcnQgPSBlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCAnZHJhZycpO1xuICAgICAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIpLmVmZmVjdEFsbG93ZWQgPSAnbW92ZSc7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByb3cub25kcmFnb3ZlciA9IGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IH07XG4gICAgICAgICAgICAgICAgcm93Lm9uZHJvcCA9IGFzeW5jIGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0LnBhcmVudEVsZW1lbnQgIT09IHJvdykgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmUgPSAoZS5jbGllbnRYIC0gcmVjdC5sZWZ0KSA8IHJlY3Qud2lkdGggLyAyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmVmb3JlKSByb3cuaW5zZXJ0QmVmb3JlKHdyYXAsIHRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgdGFyZ2V0LmFmdGVyKHdyYXApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICgodyBhcyBIVE1MRWxlbWVudCkucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXA7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29tYmluZWQuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4geyBtYWtlSXRlbShlbnRyeSwgaWR4KTsgfSk7XG4gICAgICAgICAgICBjb25zdCBjb250cm9sc0JvdHRvbSA9IG5ldyBTZXR0aW5nKHN3YXRjaGVzU2VjdGlvbik7XG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuc3R5bGUuYm9yZGVyVG9wID0gJ25vbmUnO1xuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnUmVzZXQgdG8gZGVmYXVsdCBjb2xvcnMnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnUmVzZXQgY29sb3Igc3dhdGNoZXMgdG8gZGVmYXVsdD8nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IChERUZBVUxUX1NFVFRJTkdTLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IChzIGFzIGFueSkudGV4dENvbG9yIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb2xvcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgYWRkIGNvbG9yJykub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbSA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiAnI2ZmMDAwMCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbG9ycygpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJUcmlnZ2VycygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIChiLmJ1dHRvbkVsKS5zdHlsZS5tYXJnaW5MZWZ0ID0gJ2F1dG8nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIDtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZSgnRGF0YSBtYW5hZ2VtZW50Jykuc2V0SGVhZGluZygpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAgIC5zZXROYW1lKCdFeHBvcnQgZGF0YScpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnRXhwb3J0IGRhdGEnKVxuICAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YXVsdE5hbWUgPSAodGhpcy5hcHAudmF1bHQgYXMgYW55KT8uZ2V0TmFtZT8uKCkgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgYW55KT8uYmFzZVBhdGg/LnNwbGl0KC9bXFxcXC9dLykuZmlsdGVyKEJvb2xlYW4pLnBvcCgpIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdWYXVsdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnRPYmo6IHVua25vd24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmF1bHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nczogdGhpcy5wbHVnaW4uc2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9udGhzOiBbXSBhcyBBcnJheTx7IGZpbGU6IHN0cmluZywgZGF0YTogdW5rbm93biB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgfHwgJ0RheWJsZUNhbGVuZGFyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gKGxpc3RpbmcuZmlsZXMgfHwgW10pLmZpbHRlcigoZjogc3RyaW5nKSA9PiBmLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5qc29uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eHQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoZik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHR4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChleHBvcnRPYmogYXMgYW55KS5tb250aHMucHVzaCh7IGZpbGU6IGYsIGRhdGEgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgZmlsZSBzYXZlIGRpYWxvZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBgRGF5YmxlRXhwb3J0XyR7dmF1bHROYW1lfV8ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydE9iaiwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIGRvd25sb2FkIGxpbmsgYW5kIHRyaWdnZXIgc2F2ZSBkaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2pzb25TdHJdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmsuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rLmRvd25sb2FkID0gZmlsZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwobGluay5ocmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgRXhwb3J0IHJlYWR5OiAke2ZpbGVOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFeHBvcnQgZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnSW1wb3J0IGRhdGEnKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IHtcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ0ltcG9ydCBkYXRhJylcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0LmFjY2VwdCA9ICdhcHBsaWNhdGlvbi9qc29uLC5qc29uJztcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gaW5wdXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZmlsZS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZSh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqPy5zZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIG9iai5zZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmo/Lm1vbnRocykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciB8fCAnRGF5YmxlQ2FsZW5kYXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnN0YXQoZm9sZGVyKTsgfSBjYXRjaCB7IHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXIpOyB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZGVidWcoJ1tEYXlibGVdIENyZWF0ZSBmb2xkZXI6JywgZSk7IH0gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG0gb2Ygb2JqLm1vbnRocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHR5cGVvZiBtLmZpbGUgPT09ICdzdHJpbmcnID8gbS5maWxlIDogYCR7Zm9sZGVyfS9JbXBvcnRlZF8ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShtLmRhdGEgPz8ge30sIG51bGwsIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHsgYXdhaXQgdmlldy5sb2FkQWxsRW50cmllcygpOyB2aWV3LnJlbmRlcigpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnSW1wb3J0IGNvbXBsZXRlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCB0aGUgcGx1Z2luXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luTWFuYWdlciA9ICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5wbHVnaW5zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbHVnaW5NYW5hZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHBsdWdpbk1hbmFnZXIuZGlzYWJsZVBsdWdpbih0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHBsdWdpbk1hbmFnZXIuZW5hYmxlUGx1Z2luKHRoaXMucGx1Z2luLm1hbmlmZXN0LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnSW1wb3J0IGZhaWxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpbnB1dC5jbGljaygpO1xuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJhbmRvbUlkKCk6IHN0cmluZyB7XG4gICAgY29uc3QgYW55Q3J5cHRvID0gKHdpbmRvdyBhcyBhbnkpLmNyeXB0bztcbiAgICBpZiAoYW55Q3J5cHRvPy5yYW5kb21VVUlEKSByZXR1cm4gYW55Q3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICByZXR1cm4gJ2V2LScgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKSArICctJyArIERhdGUubm93KCk7XG59XG4iXX0=