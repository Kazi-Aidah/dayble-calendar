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
    preferUserColors: false,
    eventBgOpacity: 0.50,
    eventBorderWidth: 0,
    eventBorderRadius: 6,
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
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
            Promise.resolve(this.loadData()).then(data => {
                this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
            }).catch(() => { });
            this.registerView(VIEW_TYPE, leaf => new DaybleCalendarView(leaf, this));
            this.addCommand({ id: 'open-dayble-calendar', name: 'Open Dayble Calendar', callback: () => this.openDayble() });
            this.addCommand({ id: 'dayble-focus-today', name: 'Focus on Today', callback: () => this.focusToday() });
            this.app.workspace.onLayoutReady(() => {
                this.addSettingTab(new DaybleSettingTab(this.app, this));
                this.ensureEntriesFolder();
            });
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
            this.settings.calendarWeekActive = false;
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
                console.log('[Dayble Plugin] Entries folder is unset; skipping ensureEntriesFolder');
                return;
            }
            try {
                console.log('[Dayble Plugin] Ensuring entries folder exists:', folder);
                yield this.app.vault.adapter.stat(folder);
                console.log('[Dayble Plugin] Folder already exists');
            }
            catch (_) {
                try {
                    console.log('[Dayble Plugin] Folder does not exist, creating:', folder);
                    yield this.app.vault.createFolder(folder);
                    console.log('[Dayble Plugin] Folder created successfully');
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
        this.monthCache = new Map();
        this.events = [];
        this.holderEvents = [];
        this.isSelecting = false;
        this.isDragging = false;
        this.selectionStartDate = null;
        this.selectionEndDate = null;
        this.isResizingHolder = false;
        this.holderResizeStartX = 0;
        this.holderResizeStartWidth = 0;
        this._boundHolderMouseMove = (e) => { };
        this._boundHolderMouseUp = (e) => { };
        this._resizeRaf = 0;
        this._endSelOnce = () => { document.removeEventListener('mouseup', this._endSelOnce); this.endSelection(); };
        this.plugin = plugin;
        this.currentDate = new Date();
        this.plugin.registerDomEvent(window, 'resize', () => {
            if (this._resizeRaf)
                return;
            this._resizeRaf = requestAnimationFrame(() => {
                this._resizeRaf = 0;
                this.render();
            });
        });
    }
    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'Dayble Calendar'; }
    getIcon() { return 'calendar-range'; }
    getMonthDataFilePath() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const year = this.currentDate.getFullYear();
        const month = monthNames[this.currentDate.getMonth()];
        const filename = `${year}${month}.json`;
        return `${this.plugin.settings.entriesFolder}/${filename}`;
    }
    getMonthDataFilePathFor(year, monthIndex) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[monthIndex];
        const filename = `${year}${month}.json`;
        return `${this.plugin.settings.entriesFolder}/${filename}`;
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.rootEl = this.containerEl.createDiv({ cls: 'dayble-root' });
            this.headerEl = this.rootEl.createDiv({ cls: 'dayble-header' });
            const left = this.headerEl.createDiv({ cls: 'dayble-nav-left' });
            const weekToggle = document.createElement('button');
            weekToggle.className = 'dayble-btn dayble-header-buttons dayble-week-toggle';
            try {
                (0, obsidian_1.setIcon)(weekToggle, 'calendar-range');
            }
            catch (_b) {
                try {
                    (0, obsidian_1.setIcon)(weekToggle, 'calendar');
                }
                catch (_c) { }
            }
            weekToggle.onclick = () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const wasActive = (_a = this.plugin.settings.calendarWeekActive) !== null && _a !== void 0 ? _a : false;
                this.plugin.settings.calendarWeekActive = !wasActive;
                if (this.plugin.settings.calendarWeekActive) {
                    this.currentDate = new Date();
                }
                yield this.plugin.saveSettings();
                this.updateWeekToggleUI();
                this.render();
            });
            this.weekToggleBtn = weekToggle;
            const holderToggle = document.createElement('button');
            holderToggle.className = 'dayble-btn dayble-header-buttons dayble-holder-toggle';
            (0, obsidian_1.setIcon)(holderToggle, 'menu');
            holderToggle.onclick = () => __awaiter(this, void 0, void 0, function* () { this.holderEl.classList.toggle('open'); this.plugin.settings.holderOpen = this.holderEl.classList.contains('open'); yield this.plugin.saveSettings(); });
            const searchBtn = document.createElement('button');
            searchBtn.className = 'dayble-btn dayble-header-buttons dayble-search-toggle';
            (0, obsidian_1.setIcon)(searchBtn, 'search');
            searchBtn.onclick = () => { const modal = new PromptSearchModal(this.app, this); modal.open(); };
            this.monthTitleEl = this.headerEl.createEl('h1', { cls: 'dayble-month-title' });
            const right = this.headerEl.createDiv({ cls: 'dayble-nav-right' });
            const prevBtn = document.createElement('button');
            prevBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(prevBtn, 'chevron-left');
            prevBtn.onclick = () => {
                if (this.plugin.settings.calendarWeekActive)
                    this.shiftWeek(-1);
                else
                    this.shiftMonth(-1);
            };
            const todayBtn = document.createElement('button');
            todayBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(todayBtn, 'dot');
            todayBtn.onclick = () => { this.focusToday(); };
            const nextBtn = document.createElement('button');
            nextBtn.className = 'dayble-btn dayble-header-buttons';
            (0, obsidian_1.setIcon)(nextBtn, 'chevron-right');
            nextBtn.onclick = () => {
                if (this.plugin.settings.calendarWeekActive)
                    this.shiftWeek(1);
                else
                    this.shiftMonth(1);
            };
            const placement = (_a = this.plugin.settings.holderPlacement) !== null && _a !== void 0 ? _a : 'left';
            if (placement !== 'hidden') {
                const target = (placement === 'left' ? left : right);
                target.appendChild(holderToggle);
                target.appendChild(searchBtn);
            }
            else {
                left.appendChild(searchBtn);
            }
            if (placement === 'right') {
                left.appendChild(prevBtn);
                left.appendChild(todayBtn);
                left.appendChild(nextBtn);
                left.appendChild(weekToggle);
            }
            else {
                right.appendChild(prevBtn);
                right.appendChild(todayBtn);
                right.appendChild(nextBtn);
                right.appendChild(weekToggle);
            }
            this.bodyEl = this.rootEl.createDiv({ cls: 'dayble-body' });
            if (placement === 'right') {
                this.bodyEl.addClass('dayble-holder-right');
            }
            this.holderEl = this.bodyEl.createDiv({ cls: 'dayble-holder' });
            if (placement === 'hidden') {
                this.holderEl.style.display = 'none';
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
    updateWeekToggleUI() {
        var _a;
        if (!this.weekToggleBtn)
            return;
        const active = (_a = this.plugin.settings.calendarWeekActive) !== null && _a !== void 0 ? _a : false;
        if (active)
            this.weekToggleBtn.addClass('active');
        else
            this.weekToggleBtn.removeClass('active');
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
        });
    }
    loadAllEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.getMonthDataFilePath();
            try {
                const json = yield this.app.vault.adapter.read(file);
                const data = JSON.parse(json);
                this.events = data.events || [];
                this.holderEvents = data.holder || [];
            }
            catch (e) {
                this.events = [];
                this.holderEvents = [];
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
            const file = this.getMonthDataFilePath();
            const data = { events: this.events, holder: this.holderEvents, lastModified: new Date().toISOString() };
            const jsonStr = JSON.stringify(data, null, 2);
            yield this.app.vault.adapter.write(file, jsonStr);
        });
    }
    focusToday() {
        this.currentDate = new Date();
        this.loadAllEntries().then(() => this.render());
    }
    shiftWeek(delta) {
        const d = new Date(this.currentDate);
        d.setDate(d.getDate() + (delta * 7));
        this.currentDate = d;
        this.loadAllEntries().then(() => this.render());
    }
    shiftMonth(delta) {
        const d = new Date(this.currentDate);
        d.setMonth(d.getMonth() + delta);
        this.currentDate = d;
        this.loadAllEntries().then(() => this.render());
    }
    render(titleEl) {
        var _a, _b;
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
        const segmentGap = 4;
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
        const weekMode = (_a = this.plugin.settings.calendarWeekActive) !== null && _a !== void 0 ? _a : false;
        if (weekMode)
            this.gridEl.addClass('dayble-week-mode');
        else
            this.gridEl.removeClass('dayble-week-mode');
        if (!weekMode) {
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
                if (((_b = this.plugin.settings.dayCellMaxHeight) !== null && _b !== void 0 ? _b : 0) > 0) {
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
                    const eventHeight = rect.height;
                    if (relativeY < eventHeight / 2) {
                        container.insertBefore(draggedEl, targetEvent);
                    }
                    else {
                        targetEvent.after(draggedEl);
                    }
                    const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                    const newOrder = allEventEls.map(el => el.dataset.id).filter(Boolean);
                    const dayDate = fullDate;
                    const dayEventIndices = [];
                    this.events.forEach((ev, idx) => {
                        if (ev.date === dayDate) {
                            dayEventIndices.push(idx);
                        }
                    });
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
        }
        else {
            const base = new Date(this.currentDate);
            const tDow = base.getDay();
            const diff = ((tDow - weekStart) + 7) % 7;
            const start = new Date(base);
            start.setDate(base.getDate() - diff);
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const yy = d.getFullYear();
                const mmStr = String(d.getMonth() + 1).padStart(2, '0');
                const ddStr = String(d.getDate()).padStart(2, '0');
                const fullDate = `${yy}-${mmStr}-${ddStr}`;
                const cell = this.gridEl.createDiv({ cls: 'dayble-day' });
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
                // In week view, do not mark cross-month days as inactive
                const longContainer = cell.createDiv({ cls: 'dayble-long-container' });
                longContainer.addClass('db-long-container');
                const container = cell.createDiv({ cls: 'dayble-event-container' });
                const preCount = countsByDate[fullDate] || 0;
                const preMt = preCount > 0 ? (preCount * segmentHeight) + (Math.max(0, preCount - 1) * segmentGap) + 2 : 0;
                container.style.marginTop = preMt ? `${preMt}px` : '';
                // Max height setting does not apply in week view
                const dayEvents = this.events.filter(e => e.date === fullDate);
                dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
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
                    const eventHeight = rect.height;
                    if (relativeY < eventHeight / 2) {
                        container.insertBefore(draggedEl, targetEvent);
                    }
                    else {
                        targetEvent.after(draggedEl);
                    }
                    const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                    const newOrder = allEventEls.map(el => el.dataset.id).filter(Boolean);
                    const dayDate = fullDate;
                    const dayEventIndices = [];
                    this.events.forEach((ev, idx) => {
                        if (ev.date === dayDate) {
                            dayEventIndices.push(idx);
                        }
                    });
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
        console.log('[Dayble] Starting selection from date:', date);
        this.isSelecting = true;
        this.selectionStartDate = date;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
        document.addEventListener('mouseup', this._endSelOnce);
    }
    updateSelection(date) {
        if (!this.isSelecting || this.isDragging)
            return;
        console.log('[Dayble] Updating selection to date:', date);
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
            console.log('[Dayble] Selection range:', s, 'to', e);
            this.openEventModalForRange(s, e);
        }
        this.clearSelection();
    }
    highlightSelectionRange() {
        const s = new Date(this.selectionStartDate + 'T00:00:00');
        const e = new Date(this.selectionEndDate + 'T00:00:00');
        const [min, max] = s <= e ? [s, e] : [e, s];
        console.log('[Dayble] Highlighting range:', min.toISOString(), 'to', max.toISOString());
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
                console.log('[Dayble] Selected date:', d);
            }
        });
        console.log('[Dayble] Selected', selectedCount, 'cells');
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
            }), () => __awaiter(this, void 0, void 0, function* () { }), () => __awaiter(this, void 0, void 0, function* () { }));
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
            if (startRow === endRow) {
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last)
                    return;
                const frLeft = first.offsetLeft;
                const frTop = first.offsetTop;
                const lrRight = last.offsetLeft + last.offsetWidth;
                const topOffset = todayNum(first) + 12 + stackIndex * (segmentHeight + segmentGap);
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
                    item.dataset.styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                    item.style.position = 'absolute';
                    item.style.boxSizing = 'border-box';
                    item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                    this.gridEl.appendChild(item);
                    this._longEls.set(key, item);
                }
                else {
                    const sig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                    if (item.dataset.styleSig !== sig) {
                        const newItem = this.createEventItem(ev);
                        newItem.addClass('dayble-long-event');
                        newItem.addClass('dayble-long-event-single');
                        newItem.dataset.longKey = key;
                        newItem.dataset.styleSig = sig;
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
                    const topOffset = todayNum(first) + 12 + stackIndex * (segmentHeight + segmentGap);
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
                        item.dataset.styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                        item.style.position = 'absolute';
                        item.style.boxSizing = 'border-box';
                        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                        this.gridEl.appendChild(item);
                        this._longEls.set(key, item);
                    }
                    else {
                        const sig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                        if (item.dataset.styleSig !== sig) {
                            const newItem = this.createEventItem(ev);
                            newItem.addClass('dayble-long-event');
                            if (row === startRow)
                                newItem.addClass('dayble-long-event-start');
                            if (row === endRow)
                                newItem.addClass('dayble-long-event-end');
                            newItem.dataset.longKey = key;
                            newItem.dataset.styleSig = sig;
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
                const mt = count > 0 ? (count * segmentHeight) + (Math.max(0, count - 1) * segmentGap) + 2 : 0;
                container.style.marginTop = mt ? `${mt}px` : '';
                // HERE HERE UNDER LONG EVENT GAPPY
            }
        });
    }
    createEventItem(ev) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
            item.classList.add('dayble-event-colored');
        }
        // Apply border width settings
        item.style.setProperty('--event-border-width', `${(_c = this.plugin.settings.eventBorderWidth) !== null && _c !== void 0 ? _c : 2}px`);
        item.style.setProperty('--event-border-radius', `${(_d = this.plugin.settings.eventBorderRadius) !== null && _d !== void 0 ? _d : 6}px`);
        // Apply effect and animation from category (always, regardless of color choice)
        if (category) {
            if (category.effect && category.effect !== '')
                item.addClass(`dayble-effect-${category.effect}`);
            const onlyToday = (_e = this.plugin.settings.onlyAnimateToday) !== null && _e !== void 0 ? _e : false;
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
        const tFmt = (_f = this.plugin.settings.timeFormat) !== null && _f !== void 0 ? _f : '24h';
        const timeDisplay = formatTimeRange(ev.time, tFmt);
        if (timeDisplay) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${timeDisplay})`;
            title.appendChild(timeSpan);
        }
        const iconToUse = (ev.icon !== undefined) ? ev.icon : ((category === null || category === void 0 ? void 0 : category.icon) || '');
        if (this.plugin.settings.iconPlacement !== 'none' && iconToUse) {
            const iconEl = item.createDiv({ cls: 'dayble-event-icon' });
            (0, obsidian_1.setIcon)(iconEl, iconToUse);
            const place = (_g = this.plugin.settings.iconPlacement) !== null && _g !== void 0 ? _g : 'left';
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
            const behavior = (_h = this.plugin.settings.completeBehavior) !== null && _h !== void 0 ? _h : 'none';
            if (behavior === 'dim')
                item.style.opacity = '0.6';
            else if (behavior === 'strikethrough')
                title.style.textDecoration = 'line-through';
            else if (behavior === 'hide')
                item.style.display = 'none';
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
            console.log('[Dayble] Drag ended');
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
                console.log('[Dayble] Drag started on holder event:', ev.id);
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
                console.log('[Dayble] Drag ended from holder');
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
                console.log('[Dayble] Modal submitted with result:', result);
                const isMulti = !!(result.startDate && result.endDate);
                const isSingle = !!result.date || (!!result.startDate && !result.endDate);
                console.log('[Dayble] Event type - isMulti:', isMulti, 'isSingle:', isSingle);
                if (existing) {
                    console.log('[Dayble] Updating existing event:', existing.id);
                    Object.assign(existing, result);
                }
                else {
                    const ev = Object.assign({ id: randomId() }, result);
                    console.log('[Dayble] Creating new event:', ev.id, 'type:', isMulti ? 'multi-day' : isSingle ? 'single-day' : 'holder');
                    if (isMulti || isSingle) {
                        this.events.push(ev);
                        console.log('[Dayble] Added to events array. Total events:', this.events.length);
                    }
                    else {
                        this.holderEvents.push(ev);
                        console.log('[Dayble] Added to holder. Total holder events:', this.holderEvents.length);
                    }
                }
                try {
                    console.log('[Dayble] Saving all entries...');
                    yield this.saveAllEntries();
                    console.log('[Dayble] Save completed');
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
                    console.log('[Dayble] Deleting event:', existing.id);
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
    setIcon(icon) {
        this.icon = icon;
        if (this.iconBtnEl) {
            if (!icon)
                (0, obsidian_1.setIcon)(this.iconBtnEl, 'plus');
            else
                (0, obsidian_1.setIcon)(this.iconBtnEl, icon);
        }
    }
    onOpen() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
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
        (0, obsidian_1.setIcon)(iconBtn, (this.icon && this.icon.length > 0) ? this.icon : 'plus');
        iconBtn.onclick = () => this.onPickIcon();
        this.iconBtnEl = iconBtn;
        const titleInput = row1.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Event title', autofocus: 'true' } });
        titleInput.addClass('db-input');
        titleInput.value = (_b = (_a = this.ev) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : '';
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
        const colorSwatchPos = (_e = (_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings) === null || _d === void 0 ? void 0 : _d.colorSwatchPosition) !== null && _e !== void 0 ? _e : 'under-title';
        if (colorSwatchPos === 'under-title') {
            colorRow = createColorRow();
        }
        const ruleRow = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        ruleRow.addClass('db-modal-row');
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.addClass('db-label');
        categoryLabel.style.textAlign = 'center';
        let selectedCategoryId = (_f = this.ev) === null || _f === void 0 ? void 0 : _f.categoryId;
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
        startTime.value = (_j = (_h = (_g = this.ev) === null || _g === void 0 ? void 0 : _g.time) === null || _h === void 0 ? void 0 : _h.split('-')[0]) !== null && _j !== void 0 ? _j : '';
        const startDate = row2.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.addClass('db-input');
        startDate.value = (_p = (_o = (_l = (_k = this.ev) === null || _k === void 0 ? void 0 : _k.date) !== null && _l !== void 0 ? _l : (_m = this.ev) === null || _m === void 0 ? void 0 : _m.startDate) !== null && _o !== void 0 ? _o : this.date) !== null && _p !== void 0 ? _p : '';
        // End time/date row (only for multi-day events)
        let endTime;
        let endDateInput;
        if (isMultiDay) {
            const row3 = c.createDiv({ cls: 'dayble-modal-row' });
            row3.addClass('db-modal-row');
            endTime = row3.createEl('input', { type: 'time', cls: 'dayble-input' });
            endTime.addClass('db-input');
            endTime.value = (_s = (_r = (_q = this.ev) === null || _q === void 0 ? void 0 : _q.time) === null || _r === void 0 ? void 0 : _r.split('-')[1]) !== null && _s !== void 0 ? _s : '';
            endDateInput = row3.createEl('input', { type: 'date', cls: 'dayble-input' });
            endDateInput.addClass('db-input');
            endDateInput.value = (_t = this.endDate) !== null && _t !== void 0 ? _t : '';
        }
        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.addClass('db-textarea');
        descInput.value = (_v = (_u = this.ev) === null || _u === void 0 ? void 0 : _u.description) !== null && _v !== void 0 ? _v : '';
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
            if (!payload.categoryId) {
                const triggers = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.triggers) || [];
                const txt = ((payload.title || '') + ' ' + (payload.description || '')).toLowerCase();
                const found = triggers.find((t) => (t.pattern || '').toLowerCase() && txt.includes((t.pattern || '').toLowerCase()));
                if (found && found.categoryId)
                    payload.categoryId = found.categoryId;
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
            console.log('[Dayble] Submitting event:', payload);
            Promise.resolve(this.onSubmit(payload)).then(() => {
                console.log('[Dayble] Event saved, closing modal');
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
        const noneBtn = list.createEl('button', { cls: 'dayble-icon-btn', attr: { title: 'None' } });
        noneBtn.addClass('db-icon-btn');
        noneBtn.style.padding = '6px';
        noneBtn.textContent = '—';
        noneBtn.onclick = () => { this.onPick(''); this.close(); };
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
        let filtered = this.allIcons.slice(0, 95); // Only show first 100 initially
        let fullFiltered = this.allIcons.slice();
        const renderList = (icons) => {
            list.empty();
            const noneBtn2 = list.createEl('button', { cls: 'dayble-icon-btn', attr: { title: 'None' } });
            noneBtn2.addClass('db-icon-btn');
            noneBtn2.style.padding = '6px';
            noneBtn2.textContent = '—';
            noneBtn2.onclick = () => { this.onPick(''); this.close(); };
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
    }
    onOpen() {
        const root = this.contentEl;
        root.empty();
        try {
            this.modalEl.style.padding = '0';
            this.modalEl.style.margin = '0';
        }
        catch (_a) { }
        try {
            root.style.padding = '0';
            root.style.margin = '0';
        }
        catch (_b) { }
        const inputWrap = root.createDiv({ cls: 'prompt-input-container' });
        try {
            inputWrap.style.padding = '0';
            inputWrap.style.margin = '0';
        }
        catch (_c) { }
        const input = inputWrap.createEl('input', { cls: 'prompt-input', attr: { autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', type: 'text', placeholder: 'Find events...' } });
        const resultsEl = root.createDiv({ cls: 'prompt-results' });
        try {
            resultsEl.style.padding = '0';
            resultsEl.style.margin = '0';
        }
        catch (_d) { }
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
                row.onclick = () => this.choose(i);
            });
        };
        const update = () => {
            const q = (input.value || '').toLowerCase();
            this.query = q;
            const all = this.view.events.slice();
            this.results = all.filter(e => ((e.title || '') + ' ' + (e.description || '')).toLowerCase().includes(q)).slice(0, 50);
            this.selectedIndex = 0;
            render();
        };
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
        const ev = this.results[idx];
        if (!ev)
            return;
        const dateStr = ev.date || ev.startDate;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            this.view.currentDate = new Date(y, (m || 1) - 1, d || 1);
            this.view.render();
            setTimeout(() => {
                const nodes = Array.from(this.view.containerEl.querySelectorAll(`.dayble-event[data-id="${ev.id}"]`));
                if (nodes.length > 0) {
                    const target = nodes[0];
                    try {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    }
                    catch (_a) { }
                    nodes.forEach(n => n.classList.add('dayble-event-highlight'));
                    setTimeout(() => { nodes.forEach(n => n.classList.remove('dayble-event-highlight')); }, 2000);
                }
            }, 0);
        }
        this.close();
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
        .replace(/`([^`]+)`/g, '<code style="background: var(--background-secondary); padding: 2px 4px; border-radius: 3px;">$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre style="background: var(--background-secondary); padding: 6px; border-radius: 6px;"><code>$1</code></pre>')
        // Links [[target|alias]] and [text](url)
        .replace(/\[\[([^\[\]]+)\]\]/g, (m, inner) => {
        const parts = String(inner).split('|');
        const target = parts[0];
        const alias = parts[1] || parts[0];
        return `<a class="internal-link" data-href="${target}" style="color: var(--link-color);">${alias}</a>`;
    })
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" style="color: var(--link-color);">$1</a>')
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
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    view === null || view === void 0 ? void 0 : view.render();
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
                    const wrap = colorsListTop.createDiv();
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
                        const prevBuilt = (this.plugin.settings.swatches || []);
                        const prevByName = new Map();
                        prevBuilt.forEach(s => prevByName.set(s.name, { name: s.name, color: s.color, textColor: s.textColor }));
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            const root = view.containerEl;
                            newBuilt.forEach(nb => {
                                var _a;
                                const prev = prevByName.get(nb.name);
                                if (!prev)
                                    return;
                                const changed = prev.color !== nb.color || (prev.textColor || '') !== (nb.textColor || '');
                                if (!changed)
                                    return;
                                const rgba = hexToRgba(nb.color, (_a = this.plugin.settings.eventBgOpacity) !== null && _a !== void 0 ? _a : 1);
                                root.querySelectorAll(`.dayble-event[data-color="${prev.color}"]`).forEach(el => {
                                    const h = el;
                                    h.style.setProperty('--event-bg-color', rgba);
                                    h.style.setProperty('--event-text-color', nb.textColor || chooseTextColor(nb.color));
                                    h.dataset.color = nb.color;
                                    h.classList.add('dayble-event-colored');
                                });
                            });
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
                    d.addOption('', 'Default');
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
            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, source: 'built' }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', source: 'custom' }));
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
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    yield this.plugin.saveSettings();
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
            const controlsBottom = new obsidian_1.Setting(colorsList);
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
                        renderColors();
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
                    const input = wrap.createEl('input', { type: 'color' });
                    input.value = '#ff0000';
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
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        yield this.plugin.saveSettings();
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
                    const fname = `${folder}/DaybleExport_${vaultName}_${Date.now()}.json`;
                    yield this.app.vault.adapter.write(fname, JSON.stringify(exportObj, null, 2));
                    new obsidian_1.Notice(`Exported: ${fname}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBZ0k7QUFFaEksTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUM7QUErQnpDLE1BQU0sZ0JBQWdCLEdBQW1CO0lBQ3JDLFlBQVksRUFBRSxDQUFDO0lBQ2YsYUFBYSxFQUFFLEVBQUU7SUFDakIsYUFBYSxFQUFFLE1BQU07SUFDckIsZUFBZSxFQUFFLFFBQVE7SUFDekIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsVUFBVSxFQUFFLElBQUk7SUFDaEIsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixjQUFjLEVBQUUsSUFBSTtJQUNwQixnQkFBZ0IsRUFBRSxDQUFDO0lBQ25CLGlCQUFpQixFQUFFLENBQUM7SUFDcEIsbUJBQW1CLEVBQUUsYUFBYTtJQUNsQyxnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGdCQUFnQixFQUFFLEtBQUs7SUFDdkIscUJBQXFCLEVBQUUsS0FBSztJQUM1QixzQkFBc0IsRUFBRSxLQUFLO0lBQzdCLG1CQUFtQixFQUFFLElBQUk7SUFDekIsb0JBQW9CLEVBQUUsS0FBSztJQUMzQixnQkFBZ0IsRUFBRSxDQUFDO0lBQ25CLGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsUUFBUSxFQUFFO1FBQ04sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtRQUN2RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzFELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDekQsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUss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QUksaUJBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUNuQyxDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1QsSUFBSSxpQkFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUNoQyxDQUFDO2dCQUNMLENBQUMsQ0FBQSxDQUFDO2dCQUNGLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0o7QUFDRCxTQUFTLFFBQVE7SUFDYixNQUFNLFNBQVMsR0FBSSxNQUFjLENBQUMsTUFBTSxDQUFDO0lBQ3pDLElBQUksU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFVBQVU7UUFBRSxPQUFPLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN6RCxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIEl0ZW1WaWV3LCBNb2RhbCwgTm90aWNlLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIFdvcmtzcGFjZUxlYWYsIHNldEljb24sIE1lbnUsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5cclxuY29uc3QgVklFV19UWVBFID0gJ2RheWJsZS1jYWxlbmRhci12aWV3JztcclxuXHJcbmludGVyZmFjZSBEYXlibGVTZXR0aW5ncyB7XHJcbiAgICB3ZWVrU3RhcnREYXk6IG51bWJlcjtcclxuICAgIGVudHJpZXNGb2xkZXI6IHN0cmluZztcclxuICAgIGljb25QbGFjZW1lbnQ/OiAnbGVmdCcgfCAncmlnaHQnIHwgJ25vbmUnIHwgJ3RvcCcgfCAndG9wLWxlZnQnIHwgJ3RvcC1yaWdodCc7XHJcbiAgICBldmVudFRpdGxlQWxpZ24/OiAnbGVmdCcgfCAnY2VudGVyJyB8ICdyaWdodCc7XHJcbiAgICBldmVudERlc2NBbGlnbj86ICdsZWZ0JyB8ICdjZW50ZXInIHwgJ3JpZ2h0JztcclxuICAgIHRpbWVGb3JtYXQ/OiAnMjRoJyB8ICcxMmgnO1xyXG4gICAgaG9sZGVyT3Blbj86IGJvb2xlYW47XHJcbiAgICBob2xkZXJXaWR0aD86IG51bWJlcjsgLy8gaW4gcGl4ZWxzXHJcbiAgICBldmVudENhdGVnb3JpZXM/OiBFdmVudENhdGVnb3J5W107XHJcbiAgICBwcmVmZXJVc2VyQ29sb3JzPzogYm9vbGVhbjsgLy8gcHJlZmVyIHVzZXItc2V0IGV2ZW50IGNvbG9ycyBvdmVyIGNhdGVnb3J5IGNvbG9yc1xyXG4gICAgZXZlbnRCZ09wYWNpdHk/OiBudW1iZXI7IC8vIDAtMSwgY29udHJvbHMgYmFja2dyb3VuZCBvcGFjaXR5XHJcbiAgICBldmVudEJvcmRlcldpZHRoPzogbnVtYmVyOyAvLyAwLTVweCwgY29udHJvbHMgYm9yZGVyIHRoaWNrbmVzc1xyXG4gICAgZXZlbnRCb3JkZXJSYWRpdXM/OiBudW1iZXI7IC8vIHB4LCBjb250cm9scyBib3JkZXIgcmFkaXVzXHJcbiAgICBjb2xvclN3YXRjaFBvc2l0aW9uPzogJ3VuZGVyLXRpdGxlJyB8ICd1bmRlci1kZXNjcmlwdGlvbicgfCAnbm9uZSc7IC8vIHBvc2l0aW9uIG9mIGNvbG9yIHN3YXRjaGVzIGluIG1vZGFsXHJcbiAgICBvbmx5QW5pbWF0ZVRvZGF5PzogYm9vbGVhbjtcclxuICAgIGNvbXBsZXRlQmVoYXZpb3I/OiAnbm9uZScgfCAnZGltJyB8ICdzdHJpa2V0aHJvdWdoJyB8ICdoaWRlJztcclxuICAgIGN1c3RvbVN3YXRjaGVzRW5hYmxlZD86IGJvb2xlYW47XHJcbiAgICByZXBsYWNlRGVmYXVsdFN3YXRjaGVzPzogYm9vbGVhbjtcclxuICAgIHN3YXRjaGVzPzogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W107XHJcbiAgICB1c2VyQ3VzdG9tU3dhdGNoZXM/OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH1bXTtcclxuICAgIGRlZmF1bHRDb2xvcnNGb2xkZWQ/OiBib29sZWFuO1xyXG4gICAgY3VzdG9tU3dhdGNoZXNGb2xkZWQ/OiBib29sZWFuO1xyXG4gICAgZGF5Q2VsbE1heEhlaWdodD86IG51bWJlcjtcclxuICAgIGhvbGRlclBsYWNlbWVudD86ICdsZWZ0JyB8ICdyaWdodCcgfCAnaGlkZGVuJztcclxuICAgIHRyaWdnZXJzPzogeyBwYXR0ZXJuOiBzdHJpbmcsIGNhdGVnb3J5SWQ6IHN0cmluZyB9W107XHJcbiAgICBjYWxlbmRhcldlZWtBY3RpdmU/OiBib29sZWFuO1xyXG59IFxyXG5cclxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogRGF5YmxlU2V0dGluZ3MgPSB7XHJcbiAgICB3ZWVrU3RhcnREYXk6IDAsXHJcbiAgICBlbnRyaWVzRm9sZGVyOiAnJyxcclxuICAgIGljb25QbGFjZW1lbnQ6ICdsZWZ0JyxcclxuICAgIGV2ZW50VGl0bGVBbGlnbjogJ2NlbnRlcicsXHJcbiAgICBldmVudERlc2NBbGlnbjogJ2NlbnRlcicsXHJcbiAgICB0aW1lRm9ybWF0OiAnMjRoJyxcclxuICAgIGhvbGRlck9wZW46IHRydWUsXHJcbiAgICBwcmVmZXJVc2VyQ29sb3JzOiBmYWxzZSxcclxuICAgIGV2ZW50QmdPcGFjaXR5OiAwLjUwLFxyXG4gICAgZXZlbnRCb3JkZXJXaWR0aDogMCxcclxuICAgIGV2ZW50Qm9yZGVyUmFkaXVzOiA2LFxyXG4gICAgY29sb3JTd2F0Y2hQb3NpdGlvbjogJ3VuZGVyLXRpdGxlJyxcclxuICAgIG9ubHlBbmltYXRlVG9kYXk6IGZhbHNlLFxyXG4gICAgY29tcGxldGVCZWhhdmlvcjogJ2RpbScsXHJcbiAgICBjdXN0b21Td2F0Y2hlc0VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgcmVwbGFjZURlZmF1bHRTd2F0Y2hlczogZmFsc2UsXHJcbiAgICBkZWZhdWx0Q29sb3JzRm9sZGVkOiB0cnVlLFxyXG4gICAgY3VzdG9tU3dhdGNoZXNGb2xkZWQ6IGZhbHNlLFxyXG4gICAgZGF5Q2VsbE1heEhlaWdodDogMCxcclxuICAgIGhvbGRlclBsYWNlbWVudDogJ2xlZnQnLFxyXG4gICAgY2FsZW5kYXJXZWVrQWN0aXZlOiBmYWxzZSxcclxuICAgIHN3YXRjaGVzOiBbXHJcbiAgICAgICAgeyBuYW1lOiAnUmVkJywgY29sb3I6ICcjZWIzYjVhJywgdGV4dENvbG9yOiAnI2Y5YzZkMCcgfSxcclxuICAgICAgICB7IG5hbWU6ICdPcmFuZ2UnLCBjb2xvcjogJyNmYTgyMzEnLCB0ZXh0Q29sb3I6ICcjZmVkOGJlJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0FtYmVyJywgY29sb3I6ICcjZTVhMjE2JywgdGV4dENvbG9yOiAnI2Y4ZTViYicgfSxcclxuICAgICAgICB7IG5hbWU6ICdHcmVlbicsIGNvbG9yOiAnIzIwYmY2YicsIHRleHRDb2xvcjogJyNjNGVlZGEnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnVGVhbCcsIGNvbG9yOiAnIzBmYjliMScsIHRleHRDb2xvcjogJyNiZGVjZWEnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnQmx1ZScsIGNvbG9yOiAnIzJkOThkYScsIHRleHRDb2xvcjogJyNjNWUzZjgnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnQ29ybmZsb3dlcicsIGNvbG9yOiAnIzM4NjdkNicsIHRleHRDb2xvcjogJyNjOWQ1ZjgnIH0sXHJcbiAgICAgICAgeyBuYW1lOiAnSW5kaWdvJywgY29sb3I6ICcjNTQ1NGQwJywgdGV4dENvbG9yOiAnI2QyZDJmOCcgfSxcclxuICAgICAgICB7IG5hbWU6ICdQdXJwbGUnLCBjb2xvcjogJyM4ODU0ZDAnLCB0ZXh0Q29sb3I6ICcjZTJkMmY4JyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ01hZ2VudGEnLCBjb2xvcjogJyNiNTU0ZDAnLCB0ZXh0Q29sb3I6ICcjZWRkMmY4JyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ1BpbmsnLCBjb2xvcjogJyNlODMyYzEnLCB0ZXh0Q29sb3I6ICcjZjhjMmVmJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ1Jvc2UnLCBjb2xvcjogJyNlODMyODknLCB0ZXh0Q29sb3I6ICcjZjhjMmUwJyB9LFxyXG4gICAgICAgIHsgbmFtZTogJ0Jyb3duJywgY29sb3I6ICcjOTY1YjNiJywgdGV4dENvbG9yOiAnI2U1ZDRjOScgfSxcclxuICAgICAgICB7IG5hbWU6ICdHcmF5JywgY29sb3I6ICcjODM5MmE0JywgdGV4dENvbG9yOiAnI2UzZTZlYScgfVxyXG4gICAgXSxcclxuICAgIHVzZXJDdXN0b21Td2F0Y2hlczogW10sXHJcbiAgICBldmVudENhdGVnb3JpZXM6IFtdLFxyXG4gICAgdHJpZ2dlcnM6IFtdXHJcbn07XHJcblxyXG5pbnRlcmZhY2UgRGF5YmxlRXZlbnQge1xyXG4gICAgaWQ6IHN0cmluZztcclxuICAgIHRpdGxlOiBzdHJpbmc7XHJcbiAgICBkYXRlPzogc3RyaW5nO1xyXG4gICAgc3RhcnREYXRlPzogc3RyaW5nO1xyXG4gICAgZW5kRGF0ZT86IHN0cmluZztcclxuICAgIHRpbWU/OiBzdHJpbmc7XHJcbiAgICBkZXNjcmlwdGlvbj86IHN0cmluZztcclxuICAgIGljb24/OiBzdHJpbmc7XHJcbiAgICBjb21wbGV0ZWQ/OiBib29sZWFuO1xyXG4gICAgY29sb3I/OiBzdHJpbmc7IC8vIHVzZXItc2V0IGNvbG9yIChoZXgpXHJcbiAgICB0ZXh0Q29sb3I/OiBzdHJpbmc7IC8vIHVzZXItc2V0IHRleHQgY29sb3IgKGhleClcclxuICAgIGNhdGVnb3J5SWQ/OiBzdHJpbmc7XHJcbiAgICBlZmZlY3Q/OiBzdHJpbmc7XHJcbiAgICBhbmltYXRpb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBFdmVudENhdGVnb3J5IHtcclxuICAgIGlkOiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBiZ0NvbG9yOiBzdHJpbmc7XHJcbiAgICB0ZXh0Q29sb3I6IHN0cmluZztcclxuICAgIGVmZmVjdDogc3RyaW5nO1xyXG4gICAgYW5pbWF0aW9uOiBzdHJpbmc7XHJcbiAgICBhbmltYXRpb24yOiBzdHJpbmc7XHJcbiAgICBpY29uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEYXlibGVDYWxlbmRhclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XHJcbiAgICBzZXR0aW5nczogRGF5YmxlU2V0dGluZ3M7XHJcblxyXG4gICAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTKTtcclxuICAgICAgICBQcm9taXNlLnJlc29sdmUodGhpcy5sb2FkRGF0YSgpKS50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgZGF0YSB8fCB7fSk7XHJcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4ge30pO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRSwgbGVhZiA9PiBuZXcgRGF5YmxlQ2FsZW5kYXJWaWV3KGxlYWYsIHRoaXMpKTtcclxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ29wZW4tZGF5YmxlLWNhbGVuZGFyJywgbmFtZTogJ09wZW4gRGF5YmxlIENhbGVuZGFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMub3BlbkRheWJsZSgpIH0pO1xyXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZGF5YmxlLWZvY3VzLXRvZGF5JywgbmFtZTogJ0ZvY3VzIG9uIFRvZGF5JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZm9jdXNUb2RheSgpIH0pO1xyXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEYXlibGVTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlRW50cmllc0ZvbGRlcigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIG9udW5sb2FkKCkge1xyXG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb3BlbkRheWJsZSgpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGxlYWYgPSB0aGlzLmdldE9yQ3JlYXRlTGVhZigpO1xyXG4gICAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcbiAgICB9XHJcblxyXG4gICAgZm9jdXNUb2RheSgpIHtcclxuICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICBpZiAodmlldykgdmlldy5mb2N1c1RvZGF5KCk7XHJcbiAgICAgICAgZWxzZSB0aGlzLm9wZW5EYXlibGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDYWxlbmRhclZpZXcoKTogRGF5YmxlQ2FsZW5kYXJWaWV3IHwgbnVsbCB7XHJcbiAgICAgICAgY29uc3QgbGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEUpO1xyXG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoID4gMCkgcmV0dXJuIGxlYXZlc1swXS52aWV3IGFzIERheWJsZUNhbGVuZGFyVmlldztcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRPckNyZWF0ZUxlYWYoKTogV29ya3NwYWNlTGVhZiB7XHJcbiAgICAgICAgY29uc3QgbGVhdmVzID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShWSUVXX1RZUEUpO1xyXG4gICAgICAgIGlmIChsZWF2ZXMubGVuZ3RoKSByZXR1cm4gbGVhdmVzWzBdO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKSA/PyB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBlbnN1cmVFbnRyaWVzRm9sZGVyKCkge1xyXG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMuc2V0dGluZ3MuZW50cmllc0ZvbGRlcjtcclxuICAgICAgICBpZiAoIWZvbGRlciB8fCBmb2xkZXIudHJpbSgpID09PSAnJykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZSBQbHVnaW5dIEVudHJpZXMgZm9sZGVyIGlzIHVuc2V0OyBza2lwcGluZyBlbnN1cmVFbnRyaWVzRm9sZGVyJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGUgUGx1Z2luXSBFbnN1cmluZyBlbnRyaWVzIGZvbGRlciBleGlzdHM6JywgZm9sZGVyKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5zdGF0KGZvbGRlcik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlIFBsdWdpbl0gRm9sZGVyIGFscmVhZHkgZXhpc3RzJyk7XHJcbiAgICAgICAgfSBjYXRjaCAoXykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGUgUGx1Z2luXSBGb2xkZXIgZG9lcyBub3QgZXhpc3QsIGNyZWF0aW5nOicsIGZvbGRlcik7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlIFBsdWdpbl0gRm9sZGVyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEYXlibGUgUGx1Z2luXSBGYWlsZWQgdG8gY3JlYXRlIGZvbGRlcjonLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgRGF5YmxlQ2FsZW5kYXJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG4gICAgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbjtcclxuICAgIHJvb3RFbDogSFRNTEVsZW1lbnQ7XHJcbiAgICBoZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcbiAgICBtb250aFRpdGxlRWw6IEhUTUxFbGVtZW50O1xyXG4gICAgd2Vla0hlYWRlckVsOiBIVE1MRWxlbWVudDtcclxuICAgIGNhbGVuZGFyRWw6IEhUTUxFbGVtZW50O1xyXG4gICAgYm9keUVsOiBIVE1MRWxlbWVudDtcclxuICAgIGhvbGRlckVsOiBIVE1MRWxlbWVudDtcclxuICAgIGdyaWRFbDogSFRNTEVsZW1lbnQ7XHJcbiAgICBfbG9uZ092ZXJsYXlFbD86IEhUTUxFbGVtZW50O1xyXG4gICAgX2xvbmdFbHM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PiA9IG5ldyBNYXAoKTtcclxuICAgIG1vbnRoQ2FjaGU6IE1hcDxzdHJpbmcsIHsgZXZlbnRzOiBEYXlibGVFdmVudFtdLCBob2xkZXI6IERheWJsZUV2ZW50W10gfT4gPSBuZXcgTWFwKCk7XHJcbiAgICBjdXJyZW50RGF0ZTogRGF0ZTtcclxuICAgIGV2ZW50czogRGF5YmxlRXZlbnRbXSA9IFtdO1xyXG4gICAgaG9sZGVyRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICBpc1NlbGVjdGluZyA9IGZhbHNlO1xyXG4gICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgc2VsZWN0aW9uU3RhcnREYXRlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuICAgIHNlbGVjdGlvbkVuZERhdGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgaXNSZXNpemluZ0hvbGRlciA9IGZhbHNlO1xyXG4gICAgaG9sZGVyUmVzaXplU3RhcnRYID0gMDtcclxuICAgIGhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggPSAwO1xyXG4gICAgX2JvdW5kSG9sZGVyTW91c2VNb3ZlID0gKGU6IE1vdXNlRXZlbnQpID0+IHt9O1xyXG4gICAgX2JvdW5kSG9sZGVyTW91c2VVcCA9IChlOiBNb3VzZUV2ZW50KSA9PiB7fTtcclxuICAgIF9sb25nUk8/OiBSZXNpemVPYnNlcnZlcjtcclxuICAgIGN1cnJlbnRUb2RheU1vZGFsPzogVG9kYXlNb2RhbDtcclxuICAgIHdlZWtUb2dnbGVCdG4/OiBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIF9yZXNpemVSYWYgPSAwO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogRGF5YmxlQ2FsZW5kYXJQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihsZWFmKTtcclxuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICB0aGlzLnBsdWdpbi5yZWdpc3RlckRvbUV2ZW50KHdpbmRvdywgJ3Jlc2l6ZScsICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX3Jlc2l6ZVJhZikgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLl9yZXNpemVSYWYgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzaXplUmFmID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFZpZXdUeXBlKCkgeyByZXR1cm4gVklFV19UWVBFOyB9XHJcbiAgICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuICdEYXlibGUgQ2FsZW5kYXInOyB9XHJcbiAgICBnZXRJY29uKCkgeyByZXR1cm4gJ2NhbGVuZGFyLXJhbmdlJzsgfVxyXG4gICAgXHJcbiAgICBnZXRNb250aERhdGFGaWxlUGF0aCgpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZXMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ107XHJcbiAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBjb25zdCBtb250aCA9IG1vbnRoTmFtZXNbdGhpcy5jdXJyZW50RGF0ZS5nZXRNb250aCgpXTtcclxuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke3llYXJ9JHttb250aH0uanNvbmA7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXJ9LyR7ZmlsZW5hbWV9YDtcclxuICAgIH1cclxuICAgIGdldE1vbnRoRGF0YUZpbGVQYXRoRm9yKHllYXI6IG51bWJlciwgbW9udGhJbmRleDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBtb250aE5hbWVzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xyXG4gICAgICAgIGNvbnN0IG1vbnRoID0gbW9udGhOYW1lc1ttb250aEluZGV4XTtcclxuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke3llYXJ9JHttb250aH0uanNvbmA7XHJcbiAgICAgICAgcmV0dXJuIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXJ9LyR7ZmlsZW5hbWV9YDtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbk9wZW4oKSB7XHJcbiAgICAgICAgdGhpcy5yb290RWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1yb290JyB9KTtcclxuICAgICAgICB0aGlzLmhlYWRlckVsID0gdGhpcy5yb290RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhlYWRlcicgfSk7XHJcbiAgICAgICAgY29uc3QgbGVmdCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW5hdi1sZWZ0JyB9KTtcclxuICAgICAgICBjb25zdCB3ZWVrVG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XHJcbiAgICAgICAgd2Vla1RvZ2dsZS5jbGFzc05hbWUgPSAnZGF5YmxlLWJ0biBkYXlibGUtaGVhZGVyLWJ1dHRvbnMgZGF5YmxlLXdlZWstdG9nZ2xlJztcclxuICAgICAgICB0cnkgeyBzZXRJY29uKHdlZWtUb2dnbGUsICdjYWxlbmRhci1yYW5nZScpOyB9IGNhdGNoIHsgdHJ5IHsgc2V0SWNvbih3ZWVrVG9nZ2xlLCAnY2FsZW5kYXInKTsgfSBjYXRjaCB7fSB9XHJcbiAgICAgICAgd2Vla1RvZ2dsZS5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB3YXNBY3RpdmUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPz8gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNhbGVuZGFyV2Vla0FjdGl2ZSA9ICF3YXNBY3RpdmU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVdlZWtUb2dnbGVVSSgpO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy53ZWVrVG9nZ2xlQnRuID0gd2Vla1RvZ2dsZTtcclxuICAgICAgICBjb25zdCBob2xkZXJUb2dnbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgICBob2xkZXJUb2dnbGUuY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zIGRheWJsZS1ob2xkZXItdG9nZ2xlJztcclxuICAgICAgICBzZXRJY29uKGhvbGRlclRvZ2dsZSwgJ21lbnUnKTtcclxuICAgICAgICBob2xkZXJUb2dnbGUub25jbGljayA9IGFzeW5jICgpID0+IHsgdGhpcy5ob2xkZXJFbC5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJyk7IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4gPSB0aGlzLmhvbGRlckVsLmNsYXNzTGlzdC5jb250YWlucygnb3BlbicpOyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgfTtcclxuICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgICBzZWFyY2hCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zIGRheWJsZS1zZWFyY2gtdG9nZ2xlJztcclxuICAgICAgICBzZXRJY29uKHNlYXJjaEJ0biwgJ3NlYXJjaCcpO1xyXG4gICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKCkgPT4geyBjb25zdCBtb2RhbCA9IG5ldyBQcm9tcHRTZWFyY2hNb2RhbCh0aGlzLmFwcCwgdGhpcyk7IG1vZGFsLm9wZW4oKTsgfTtcclxuICAgICAgICB0aGlzLm1vbnRoVGl0bGVFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRWwoJ2gxJywgeyBjbHM6ICdkYXlibGUtbW9udGgtdGl0bGUnIH0pO1xyXG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbmF2LXJpZ2h0JyB9KTtcclxuICAgICAgICBjb25zdCBwcmV2QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7IHByZXZCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcclxuICAgICAgICBzZXRJY29uKHByZXZCdG4sICdjaGV2cm9uLWxlZnQnKTtcclxuICAgICAgICBwcmV2QnRuLm9uY2xpY2sgPSAoKSA9PiB7IFxyXG4gICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2FsZW5kYXJXZWVrQWN0aXZlKSB0aGlzLnNoaWZ0V2VlaygtMSk7IFxyXG4gICAgICAgICAgICBlbHNlIHRoaXMuc2hpZnRNb250aCgtMSk7IFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgdG9kYXlCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsgdG9kYXlCdG4uY2xhc3NOYW1lID0gJ2RheWJsZS1idG4gZGF5YmxlLWhlYWRlci1idXR0b25zJztcclxuICAgICAgICBzZXRJY29uKHRvZGF5QnRuLCAnZG90Jyk7XHJcbiAgICAgICAgdG9kYXlCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5mb2N1c1RvZGF5KCk7IH07XHJcbiAgICAgICAgY29uc3QgbmV4dEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpOyBuZXh0QnRuLmNsYXNzTmFtZSA9ICdkYXlibGUtYnRuIGRheWJsZS1oZWFkZXItYnV0dG9ucyc7XHJcbiAgICAgICAgc2V0SWNvbihuZXh0QnRuLCAnY2hldnJvbi1yaWdodCcpO1xyXG4gICAgICAgIG5leHRCdG4ub25jbGljayA9ICgpID0+IHsgXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUpIHRoaXMuc2hpZnRXZWVrKDEpOyBcclxuICAgICAgICAgICAgZWxzZSB0aGlzLnNoaWZ0TW9udGgoMSk7IFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcGxhY2VtZW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyUGxhY2VtZW50ID8/ICdsZWZ0JztcclxuICAgICAgICBpZiAocGxhY2VtZW50ICE9PSAnaGlkZGVuJykge1xyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSAocGxhY2VtZW50ID09PSAnbGVmdCcgPyBsZWZ0IDogcmlnaHQpO1xyXG4gICAgICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoaG9sZGVyVG9nZ2xlKTtcclxuICAgICAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKHNlYXJjaEJ0bik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGVmdC5hcHBlbmRDaGlsZChzZWFyY2hCdG4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocGxhY2VtZW50ID09PSAncmlnaHQnKSB7XHJcbiAgICAgICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQocHJldkJ0bik7XHJcbiAgICAgICAgICAgIGxlZnQuYXBwZW5kQ2hpbGQodG9kYXlCdG4pO1xyXG4gICAgICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKG5leHRCdG4pO1xyXG4gICAgICAgICAgICBsZWZ0LmFwcGVuZENoaWxkKHdlZWtUb2dnbGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJpZ2h0LmFwcGVuZENoaWxkKHByZXZCdG4pO1xyXG4gICAgICAgICAgICByaWdodC5hcHBlbmRDaGlsZCh0b2RheUJ0bik7XHJcbiAgICAgICAgICAgIHJpZ2h0LmFwcGVuZENoaWxkKG5leHRCdG4pO1xyXG4gICAgICAgICAgICByaWdodC5hcHBlbmRDaGlsZCh3ZWVrVG9nZ2xlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ib2R5RWwgPSB0aGlzLnJvb3RFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtYm9keScgfSk7XHJcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xyXG4gICAgICAgICAgICB0aGlzLmJvZHlFbC5hZGRDbGFzcygnZGF5YmxlLWhvbGRlci1yaWdodCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmhvbGRlckVsID0gdGhpcy5ib2R5RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlcicgfSk7XHJcbiAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ2hpZGRlbicpIHtcclxuICAgICAgICAgICAgKHRoaXMuaG9sZGVyRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGhvbGRlckhlYWRlciA9IHRoaXMuaG9sZGVyRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWhvbGRlci1oZWFkZXInLCB0ZXh0OiAnSG9sZGVyJyB9KTtcclxuICAgICAgICBjb25zdCBob2xkZXJBZGQgPSBob2xkZXJIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtaG9sZGVyLWFkZC1idG4nIH0pO1xyXG4gICAgICAgIHNldEljb24oaG9sZGVyQWRkLCAncGx1cycpO1xyXG4gICAgICAgIGhvbGRlckFkZC5vbmNsaWNrID0gKCkgPT4gdGhpcy5vcGVuRXZlbnRNb2RhbCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCByZXNpemUgaGFuZGxlIHRvIGhvbGRlclxyXG4gICAgICAgIGNvbnN0IHJlc2l6ZUhhbmRsZSA9IGhvbGRlckhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtaG9sZGVyLXJlc2l6ZS1oYW5kbGUnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VNb3ZlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUmVzaXppbmdIb2xkZXIpIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGRpZmYgPSBlLmNsaWVudFggLSB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WDtcclxuICAgICAgICAgICAgLy8gV2hlbiBob2xkZXIgaXMgb24gdGhlIHJpZ2h0LCByZXZlcnNlIHRoZSBkaXJlY3Rpb25cclxuICAgICAgICAgICAgaWYgKHBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xyXG4gICAgICAgICAgICAgICAgZGlmZiA9IC1kaWZmO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1dpZHRoID0gTWF0aC5tYXgoMjAwLCB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0V2lkdGggKyBkaWZmKTtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoICsgJ3B4JztcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCA9IGFzeW5jIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUmVzaXppbmdIb2xkZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNSZXNpemluZ0hvbGRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ob2xkZXJXaWR0aCA9IHRoaXMuaG9sZGVyRWwub2Zmc2V0V2lkdGg7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVzaXplSGFuZGxlLm9ubW91c2Vkb3duID0gKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLmlzUmVzaXppbmdIb2xkZXIgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmhvbGRlclJlc2l6ZVN0YXJ0WCA9IGUuY2xpZW50WDtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJSZXNpemVTdGFydFdpZHRoID0gdGhpcy5ob2xkZXJFbC5vZmZzZXRXaWR0aDtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZU1vdmUpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5fYm91bmRIb2xkZXJNb3VzZVVwKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGhvbGRlckxpc3QgPSB0aGlzLmhvbGRlckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ob2xkZXItbGlzdCcgfSk7XHJcbiAgICAgICAgLy8gQWRkIGRyYWcgaGFuZGxlcnMgdG8gaG9sZGVyIGZvciBkcm9wcGluZyBldmVudHMgdGhlcmVcclxuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcclxuICAgICAgICB0aGlzLmhvbGRlckVsLm9uZHJhZ2xlYXZlID0gKCkgPT4geyB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7IH07XHJcbiAgICAgICAgdGhpcy5ob2xkZXJFbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xyXG4gICAgICAgICAgICBpZiAoIWlkIHx8IHNyYyA9PT0gJ2hvbGRlcicpIHJldHVybjsgLy8gRG9uJ3QgZHJvcCBob2xkZXIgZXZlbnRzIG9uIGhvbGRlclxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5ldmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ID0gdGhpcy5ldmVudHMuc3BsaWNlKGlkeCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgZGF0ZSBpbmZvIHdoZW4gbW92aW5nIHRvIGhvbGRlclxyXG4gICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2LmVuZERhdGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMucHVzaChldik7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZhaWxlZCB0byBtb3ZlIGV2ZW50IHRvIGhvbGRlcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmhvbGRlckVsLmFwcGVuZENoaWxkKGhvbGRlckxpc3QpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFwcGx5IHNhdmVkIGhvbGRlciB3aWR0aCBpZiBpdCBleGlzdHNcclxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaG9sZGVyV2lkdGgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFbC5zdHlsZS53aWR0aCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlcldpZHRoICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlck9wZW4pIHRoaXMuaG9sZGVyRWwuYWRkQ2xhc3MoJ29wZW4nKTsgZWxzZSB0aGlzLmhvbGRlckVsLnJlbW92ZUNsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgdGhpcy5jYWxlbmRhckVsID0gdGhpcy5ib2R5RWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWNhbGVuZGFyJyB9KTtcclxuICAgICAgICB0aGlzLndlZWtIZWFkZXJFbCA9IHRoaXMuY2FsZW5kYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtd2Vla2RheXMnIH0pO1xyXG4gICAgICAgIHRoaXMuZ3JpZEVsID0gdGhpcy5jYWxlbmRhckVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ncmlkJyB9KTtcclxuICAgICAgICBhd2FpdCB0aGlzLmxvYWRBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVXZWVrVG9nZ2xlVUkoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLndlZWtUb2dnbGVCdG4pIHJldHVybjtcclxuICAgICAgICBjb25zdCBhY3RpdmUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPz8gZmFsc2U7XHJcbiAgICAgICAgaWYgKGFjdGl2ZSkgdGhpcy53ZWVrVG9nZ2xlQnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcclxuICAgICAgICBlbHNlIHRoaXMud2Vla1RvZ2dsZUJ0bi5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb25DbG9zZSgpIHtcclxuICAgICAgICAvLyBDbGVhbiB1cCByZXNpemUgaGFuZGxlIGxpc3RlbmVyc1xyXG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9ib3VuZEhvbGRlck1vdXNlTW92ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLl9ib3VuZEhvbGRlck1vdXNlVXApIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2JvdW5kSG9sZGVyTW91c2VVcCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIERpc2Nvbm5lY3QgbG9uZyBldmVudCBSZXNpemVPYnNlcnZlciBhbmQgcmVtb3ZlIG92ZXJsYXkgdG8gcHJldmVudCBsZWFrc1xyXG4gICAgICAgIGlmICh0aGlzLl9sb25nUk8pIHtcclxuICAgICAgICAgICAgdHJ5IHsgdGhpcy5fbG9uZ1JPLmRpc2Nvbm5lY3QoKTsgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICB0aGlzLl9sb25nUk8gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLl9sb25nT3ZlcmxheUVsICYmIHRoaXMuX2xvbmdPdmVybGF5RWwuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgdHJ5IHsgdGhpcy5fbG9uZ092ZXJsYXlFbC5yZW1vdmUoKTsgfSBjYXRjaCB7fVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9sb25nRWxzLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICB0cnkgeyBpZiAoZWwgJiYgZWwucGFyZW50RWxlbWVudCkgZWwucmVtb3ZlKCk7IH0gY2F0Y2gge31cclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9sb25nRWxzLmNsZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgbG9hZEFsbEVudHJpZXMoKSB7XHJcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuZ2V0TW9udGhEYXRhRmlsZVBhdGgoKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBqc29uID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKGZpbGUpO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShqc29uKSBhcyB7IGV2ZW50czogRGF5YmxlRXZlbnRbXSwgaG9sZGVyOiBEYXlibGVFdmVudFtdLCBsYXN0TW9kaWZpZWQ/OiBzdHJpbmcgfTtcclxuICAgICAgICAgICAgdGhpcy5ldmVudHMgPSBkYXRhLmV2ZW50cyB8fCBbXTtcclxuICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSBkYXRhLmhvbGRlciB8fCBbXTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHNhdmVBbGxFbnRyaWVzKCkge1xyXG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcclxuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XHJcbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmdldE1vbnRoRGF0YUZpbGVQYXRoKCk7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHsgZXZlbnRzOiB0aGlzLmV2ZW50cywgaG9sZGVyOiB0aGlzLmhvbGRlckV2ZW50cywgbGFzdE1vZGlmaWVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTtcclxuICAgICAgICBjb25zdCBqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMik7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShmaWxlLCBqc29uU3RyKTtcclxuICAgIH1cclxuXHJcbiAgICBmb2N1c1RvZGF5KCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIHRoaXMubG9hZEFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHNoaWZ0V2VlayhkZWx0YTogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xyXG4gICAgICAgIGQuc2V0RGF0ZShkLmdldERhdGUoKSArIChkZWx0YSAqIDcpKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gZDtcclxuICAgICAgICB0aGlzLmxvYWRBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgIH1cclxuXHJcbiAgICBzaGlmdE1vbnRoKGRlbHRhOiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBkID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgZC5zZXRNb250aChkLmdldE1vbnRoKCkgKyBkZWx0YSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50RGF0ZSA9IGQ7XHJcbiAgICAgICAgdGhpcy5sb2FkQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy5yZW5kZXIoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyKHRpdGxlRWw/OiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIGNvbnN0IHkgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgY29uc3QgbSA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICBjb25zdCBtb250aExhYmVsID0gbmV3IERhdGUoeSwgbSkudG9Mb2NhbGVTdHJpbmcoJ2VuLVVTJywgeyBtb250aDogJ2xvbmcnLCB5ZWFyOiAnbnVtZXJpYycgfSk7XHJcbiAgICAgICAgaWYgKHRoaXMubW9udGhUaXRsZUVsKSB0aGlzLm1vbnRoVGl0bGVFbC5zZXRUZXh0KG1vbnRoTGFiZWwpO1xyXG4gICAgICAgIHRoaXMuZ3JpZEVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3Qgd2Vla1N0YXJ0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5O1xyXG4gICAgICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoeSwgbSwgMSkuZ2V0RGF5KCk7XHJcbiAgICAgICAgY29uc3QgZGF5c0luTW9udGggPSBuZXcgRGF0ZSh5LCBtICsgMSwgMCkuZ2V0RGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IGxlYWRpbmcgPSAoZmlyc3REYXkgLSB3ZWVrU3RhcnQgKyA3KSAlIDc7XHJcbiAgICAgICAgdGhpcy53ZWVrSGVhZGVyRWwuZW1wdHkoKTtcclxuICAgICAgICBjb25zdCBoZWFkZXIgPSB0aGlzLndlZWtIZWFkZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZ3JpZC1oZWFkZXInIH0pO1xyXG4gICAgICAgIGNvbnN0IGRheXMgPSBbJ3N1bicsJ21vbicsJ3R1ZScsJ3dlZCcsJ3RodScsJ2ZyaScsJ3NhdCddO1xyXG4gICAgICAgIGNvbnN0IG9yZGVyZWQgPSBkYXlzLnNsaWNlKHdlZWtTdGFydCkuY29uY2F0KGRheXMuc2xpY2UoMCwgd2Vla1N0YXJ0KSk7XHJcbiAgICAgICAgb3JkZXJlZC5mb3JFYWNoKGQgPT4gaGVhZGVyLmNyZWF0ZURpdih7IHRleHQ6IGQsIGNsczogJ2RheWJsZS1ncmlkLWhlYWRlci1jZWxsJyB9KSk7XHJcbiAgICAgICAgY29uc3Qgc2VnbWVudEhlaWdodCA9IDI4O1xyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRHYXAgPSA0O1xyXG4gICAgICAgIGNvbnN0IGNvdW50c0J5RGF0ZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IGxvbmdFdmVudHNQcmVzZXQgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUgJiYgZXYuc3RhcnREYXRlICE9PSBldi5lbmREYXRlKTtcclxuICAgICAgICBsb25nRXZlbnRzUHJlc2V0LmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSEpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlISk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeXkgPSBkLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGQgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHt5eX0tJHttbX0tJHtkZH1gO1xyXG4gICAgICAgICAgICAgICAgY291bnRzQnlEYXRlW2tleV0gPSAoY291bnRzQnlEYXRlW2tleV0gfHwgMCkgKyAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3Qgd2Vla01vZGUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jYWxlbmRhcldlZWtBY3RpdmUgPz8gZmFsc2U7XHJcbiAgICAgICAgaWYgKHdlZWtNb2RlKSB0aGlzLmdyaWRFbC5hZGRDbGFzcygnZGF5YmxlLXdlZWstbW9kZScpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5ncmlkRWwucmVtb3ZlQ2xhc3MoJ2RheWJsZS13ZWVrLW1vZGUnKTtcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgaWYgKCF3ZWVrTW9kZSkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlYWRpbmc7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXkgZGF5YmxlLWluYWN0aXZlJyB9KTtcclxuICAgICAgICAgICAgICAgIGMuc2V0QXR0cignZGF0YS1lbXB0eScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yIChsZXQgZGF5ID0gMTsgZGF5IDw9IGRheXNJbk1vbnRoOyBkYXkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbERhdGUgPSBgJHt5fS0ke1N0cmluZyhtICsgMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbCA9IHRoaXMuZ3JpZEVsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXknIH0pO1xyXG4gICAgICAgICAgICAgICAgY2VsbC5zZXRBdHRyKCdkYXRhLWRhdGUnLCBmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlIZWFkZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kYXktaGVhZGVyJyB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG51bSA9IGRheUhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LW51bWJlcicsIHRleHQ6IFN0cmluZyhkYXkpIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF5ID09PSB0LmdldERhdGUoKSAmJiBtID09PSB0LmdldE1vbnRoKCkgJiYgeSA9PT0gdC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCdkYXlibGUtY3VycmVudC1kYXknKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbihzZWFyY2hCdG4sICdmb2N1cycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb25nQ29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbG9uZy1jb250YWluZXInIH0pO1xyXG4gICAgICAgICAgICAgICAgbG9uZ0NvbnRhaW5lci5hZGRDbGFzcygnZGItbG9uZy1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNlbGwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVDb3VudCA9IGNvdW50c0J5RGF0ZVtmdWxsRGF0ZV0gfHwgMDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZU10ID0gcHJlQ291bnQgPiAwID8gKHByZUNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgcHJlQ291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gcHJlTXQgPyBgJHtwcmVNdH1weGAgOiAnJztcclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF5Q2VsbE1heEhlaWdodCA/PyAwKSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhIID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGF5Q2VsbE1heEhlaWdodCA/PyAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF4SCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRIID0gKGRheUhlYWRlciBhcyBIVE1MRWxlbWVudCkub2Zmc2V0SGVpZ2h0IHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb25nSCA9IChsb25nQ29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRIZWlnaHQgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3QgPSBNYXRoLm1heCgyNCwgbWF4SCAtIGhlYWRIIC0gbG9uZ0ggLSA4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZWxsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5tYXhIZWlnaHQgPSBgJHttYXhIfXB4YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZWxsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkuc3R5bGUubWF4SGVpZ2h0ID0gYCR7cmVzdH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYXlibGUtc2Nyb2xsYWJsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZSA9PiBlLmRhdGUgPT09IGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgIGRheUV2ZW50cy5mb3JFYWNoKGUgPT4gY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuY3JlYXRlRXZlbnRJdGVtKGUpKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5vbmRyYWdvdmVyID0gKGUpID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50Q291bnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gY29udGFpbmVyICYmIGV2ZW50Q291bnQgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRFdmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1kcm9wLWluZGljYXRvcicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYWJvdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQ/Lmluc2VydEJlZm9yZShpbmRpY2F0b3IsIHRhcmdldEV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGljYXRvci5hZGRDbGFzcygnYmVsb3cnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGluZGljYXRvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLm9uZHJhZ2xlYXZlID0gKGUpID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBjb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpZCB8fCBzcmMgIT09ICdjYWxlbmRhcicpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZHJhZ2dlZEVsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ2dlZENvbnRhaW5lciA9IGRyYWdnZWRFbC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZHJhZ2dlZENvbnRhaW5lciAhPT0gY29udGFpbmVyKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0RXZlbnQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRFdmVudCB8fCB0YXJnZXRFdmVudCA9PT0gZHJhZ2dlZEVsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SGVpZ2h0ID0gcmVjdC5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGRyYWdnZWRFbCwgdGFyZ2V0RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGRyYWdnZWRFbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbEV2ZW50RWxzID0gQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1ldmVudCcpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdPcmRlciA9IGFsbEV2ZW50RWxzLm1hcChlbCA9PiAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQpLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXlEYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SW5kaWNlcy5wdXNoKGlkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudElkVG9JbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3T3JkZXIuZm9yRWFjaCgoZXZlbnRJZCwgaWR4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50SWRUb0luZGV4LnNldChldmVudElkLCBpZHgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SW5kaWNlcy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQSA9IHRoaXMuZXZlbnRzW2FdLmlkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZEIgPSB0aGlzLmV2ZW50c1tiXS5pZCB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJBID0gZXZlbnRJZFRvSW5kZXguZ2V0KGlkQSkgPz8gOTk5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckIgPSBldmVudElkVG9JbmRleC5nZXQoaWRCKSA/PyA5OTk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcmRlckEgLSBvcmRlckI7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRXZlbnRzOiBEYXlibGVFdmVudFtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRheUV2ZW50SWR4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKChldiwgaWR4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5kYXRlID09PSBkYXlEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaCh0aGlzLmV2ZW50c1tkYXlFdmVudEluZGljZXNbZGF5RXZlbnRJZHhdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudElkeCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVvcmRlcmVkRXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSByZW9yZGVyZWRFdmVudHM7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY2VsbC5vbmNsaWNrID0gKGV2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSAmJiB0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudC1jb250YWluZXInKSA9PT0gY29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3BlbkV2ZW50TW9kYWwodW5kZWZpbmVkLCBmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub25tb3VzZWRvd24gPSAoZXYpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGV2IGFzIE1vdXNlRXZlbnQpLmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjZWxsLm9ubW91c2VvdmVyID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjZWxsLm9udG91Y2hzdGFydCA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQnKSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0U2VsZWN0aW9uKGZ1bGxEYXRlLCBjZWxsKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjZWxsLm9udG91Y2htb3ZlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2VsZWN0aW5nICYmICF0aGlzLmlzRHJhZ2dpbmcpIHRoaXMudXBkYXRlU2VsZWN0aW9uKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjZWxsLm9uZHJhZ292ZXIgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGNlbGwuYWRkQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub25kcmFnbGVhdmUgPSAoKSA9PiB7IGNlbGwucmVtb3ZlQ2xhc3MoJ2RheWJsZS1kcmFnLW92ZXInKTsgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub25kcm9wID0gYXN5bmMgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ3RleHQvcGxhaW4nKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgnZGF5YmxlLXNvdXJjZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnaG9sZGVyJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaElkeCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhJZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZuID0gdGhpcy5ob2xkZXJFdmVudHMuc3BsaWNlKGhJZHgsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2bi5kYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChldm4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLmV2ZW50cy5maW5kSW5kZXgoZXYgPT4gZXYuaWQgPT09IGlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXYgPSB0aGlzLmV2ZW50c1tpZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5zdGFydERhdGUgJiYgZXYuZW5kRGF0ZSAmJiBldi5zdGFydERhdGUgIT09IGV2LmVuZERhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3BhbiA9IE1hdGguZmxvb3IoKG5ldyBEYXRlKGV2LmVuZERhdGUpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSkuZ2V0VGltZSgpKSAvIDg2NDAwMDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuc3RhcnREYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5zID0gbmV3IERhdGUoZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZSA9IG5ldyBEYXRlKG5zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmUuc2V0RGF0ZShucy5nZXREYXRlKCkgKyBzcGFuKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYuZW5kRGF0ZSA9IGAke25lLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKG5lLmdldE1vbnRoKCkrMSkucGFkU3RhcnQoMiwnMCcpfS0ke1N0cmluZyhuZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsJzAnKX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXYuZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5kYXRlID0gZnVsbERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ZhaWxlZCB0byBzYXZlIGV2ZW50IGNoYW5nZXMnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgYmFzZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUpO1xyXG4gICAgICAgICAgICBjb25zdCB0RG93ID0gYmFzZS5nZXREYXkoKTtcclxuICAgICAgICAgICAgY29uc3QgZGlmZiA9ICgodERvdyAtIHdlZWtTdGFydCkgKyA3KSAlIDc7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoYmFzZSk7XHJcbiAgICAgICAgICAgIHN0YXJ0LnNldERhdGUoYmFzZS5nZXREYXRlKCkgLSBkaWZmKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA3OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICAgICAgICAgICAgICBkLnNldERhdGUoc3RhcnQuZ2V0RGF0ZSgpICsgaSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5eSA9IGQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1tU3RyID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZFN0ciA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEYXRlID0gYCR7eXl9LSR7bW1TdHJ9LSR7ZGRTdHJ9YDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGwgPSB0aGlzLmdyaWRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5JyB9KTtcclxuICAgICAgICAgICAgICAgIGNlbGwuc2V0QXR0cignZGF0YS1kYXRlJywgZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGF5SGVhZGVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZGF5LWhlYWRlcicgfSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBudW0gPSBkYXlIZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRheS1udW1iZXInLCB0ZXh0OiBTdHJpbmcoZC5nZXREYXRlKCkpIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc1RvZGF5ID0gZC5nZXREYXRlKCkgPT09IHQuZ2V0RGF0ZSgpICYmIGQuZ2V0TW9udGgoKSA9PT0gdC5nZXRNb250aCgpICYmIGQuZ2V0RnVsbFllYXIoKSA9PT0gdC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzVG9kYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCdkYXlibGUtY3VycmVudC1kYXknKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hCdG4gPSBkYXlIZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWRheS1zZWFyY2gtYnRuJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hCdG4uYWRkQ2xhc3MoJ2RiLWRheS1zZWFyY2gtYnRuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbihzZWFyY2hCdG4sICdmb2N1cycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Ub2RheU1vZGFsKGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoQnRuLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaEJ0bi5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBJbiB3ZWVrIHZpZXcsIGRvIG5vdCBtYXJrIGNyb3NzLW1vbnRoIGRheXMgYXMgaW5hY3RpdmVcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvbmdDb250YWluZXIgPSBjZWxsLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1sb25nLWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgICAgICAgICBsb25nQ29udGFpbmVyLmFkZENsYXNzKCdkYi1sb25nLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gY2VsbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtZXZlbnQtY29udGFpbmVyJyB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZUNvdW50ID0gY291bnRzQnlEYXRlW2Z1bGxEYXRlXSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlTXQgPSBwcmVDb3VudCA+IDAgPyAocHJlQ291bnQgKiBzZWdtZW50SGVpZ2h0KSArIChNYXRoLm1heCgwLCBwcmVDb3VudCAtIDEpICogc2VnbWVudEdhcCkgKyAyIDogMDtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSBwcmVNdCA/IGAke3ByZU10fXB4YCA6ICcnO1xyXG4gICAgICAgICAgICAgICAgLy8gTWF4IGhlaWdodCBzZXR0aW5nIGRvZXMgbm90IGFwcGx5IGluIHdlZWsgdmlld1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGF5RXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5kYXRlID09PSBmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChlID0+IGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmNyZWF0ZUV2ZW50SXRlbShlKSkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIub25kcmFnb3ZlciA9IChlKSA9PiB7IFxyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldEV2ZW50ICYmIHRhcmdldEV2ZW50LnBhcmVudEVsZW1lbnQgPT09IGNvbnRhaW5lciAmJiBldmVudENvdW50ID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGV2ZW50SGVpZ2h0IC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdhYm92ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmFkZENsYXNzKCdiZWxvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoaW5kaWNhdG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIub25kcmFnbGVhdmUgPSAoZSkgPT4geyBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIub25kcm9wID0gYXN5bmMgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWlkIHx8IHNyYyAhPT0gJ2NhbGVuZGFyJykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWlkPVwiJHtpZH1cIl1gKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnZ2VkQ29udGFpbmVyID0gZHJhZ2dlZEVsLmNsb3Nlc3QoJy5kYXlibGUtZXZlbnQtY29udGFpbmVyJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkcmFnZ2VkQ29udGFpbmVyICE9PSBjb250YWluZXIpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRFdmVudCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldEV2ZW50IHx8IHRhcmdldEV2ZW50ID09PSBkcmFnZ2VkRWwpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0RXZlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmVZIDwgZXZlbnRIZWlnaHQgLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQuYWZ0ZXIoZHJhZ2dlZEVsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsRXZlbnRFbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld09yZGVyID0gYWxsRXZlbnRFbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCkuZmlsdGVyKEJvb2xlYW4pIGFzIHN0cmluZ1tdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheURhdGUgPSBmdWxsRGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXlFdmVudEluZGljZXM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaCgoZXYsIGlkeCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXYuZGF0ZSA9PT0gZGF5RGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnB1c2goaWR4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50SWRUb0luZGV4ID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdPcmRlci5mb3JFYWNoKChldmVudElkLCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRJZFRvSW5kZXguc2V0KGV2ZW50SWQsIGlkeCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF5RXZlbnRJbmRpY2VzLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRBID0gdGhpcy5ldmVudHNbYV0uaWQgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkQiA9IHRoaXMuZXZlbnRzW2JdLmlkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmRlckEgPSBldmVudElkVG9JbmRleC5nZXQoaWRBKSA/PyA5OTk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yZGVyQiA9IGV2ZW50SWRUb0luZGV4LmdldChpZEIpID8/IDk5OTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyQSAtIG9yZGVyQjtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZW9yZGVyZWRFdmVudHM6IERheWJsZUV2ZW50W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGF5RXZlbnRJZHggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goKGV2LCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LmRhdGUgPT09IGRheURhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlb3JkZXJlZEV2ZW50cy5wdXNoKHRoaXMuZXZlbnRzW2RheUV2ZW50SW5kaWNlc1tkYXlFdmVudElkeF1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRheUV2ZW50SWR4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW9yZGVyZWRFdmVudHMucHVzaChldik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHJlb3JkZXJlZEV2ZW50cztcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjZWxsLm9uY2xpY2sgPSAoZXYpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldi50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpICYmIHRhcmdldC5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50LWNvbnRhaW5lcicpID09PSBjb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuRXZlbnRNb2RhbCh1bmRlZmluZWQsIGZ1bGxEYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgY2VsbC5vbm1vdXNlZG93biA9IChldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXYgYXMgTW91c2VFdmVudCkuYnV0dG9uICE9PSAwKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub25tb3VzZW92ZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub250b3VjaHN0YXJ0ID0gKGV2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmRheWJsZS1ldmVudCcpKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRTZWxlY3Rpb24oZnVsbERhdGUsIGNlbGwpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub250b3VjaG1vdmUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZWxlY3RpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykgdGhpcy51cGRhdGVTZWxlY3Rpb24oZnVsbERhdGUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNlbGwub25kcmFnb3ZlciA9IChlKSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgY2VsbC5hZGRDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xyXG4gICAgICAgICAgICAgICAgY2VsbC5vbmRyYWdsZWF2ZSA9ICgpID0+IHsgY2VsbC5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWctb3ZlcicpOyB9O1xyXG4gICAgICAgICAgICAgICAgY2VsbC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdob2xkZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoSWR4ID0gdGhpcy5ob2xkZXJFdmVudHMuZmluZEluZGV4KGV2ID0+IGV2LmlkID09PSBpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaElkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldm4gPSB0aGlzLmhvbGRlckV2ZW50cy5zcGxpY2UoaElkeCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZuLmRhdGUgPSBmdWxsRGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKGV2bik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuZXZlbnRzLmZpbmRJbmRleChldiA9PiBldi5pZCA9PT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9IHRoaXMuZXZlbnRzW2lkeF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlICYmIGV2LnN0YXJ0RGF0ZSAhPT0gZXYuZW5kRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGFuID0gTWF0aC5mbG9vcigobmV3IERhdGUoZXYuZW5kRGF0ZSkuZ2V0VGltZSgpIC0gbmV3IERhdGUoZXYuc3RhcnREYXRlKS5nZXRUaW1lKCkpIC8gODY0MDAwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5zdGFydERhdGUgPSBmdWxsRGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbnMgPSBuZXcgRGF0ZShmdWxsRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lID0gbmV3IERhdGUobnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZS5zZXREYXRlKG5zLmdldERhdGUoKSArIHNwYW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldi5lbmREYXRlID0gYCR7bmUuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobmUuZ2V0TW9udGgoKSsxKS5wYWRTdGFydCgyLCcwJyl9LSR7U3RyaW5nKG5lLmdldERhdGUoKSkucGFkU3RhcnQoMiwnMCcpfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChldi5kYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2LmRhdGUgPSBmdWxsRGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVySG9sZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnRmFpbGVkIHRvIHNhdmUgZXZlbnQgY2hhbmdlcycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gRGVmZXIgbG9uZyBldmVudCBwb3NpdGlvbmluZyB1bnRpbCBsYXlvdXQgc2V0dGxlc1xyXG4gICAgICAgIC8vIFByZXBhcmUgb3ZlcmxheSBmb3IgbG9uZyBldmVudHM7IGhpZGUgaXQgdW50aWwgcG9zaXRpb25zIGFyZSBjb21wdXRlZFxyXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ092ZXJsYXlFbCB8fCAhdGhpcy5fbG9uZ092ZXJsYXlFbC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLmluc2V0ID0gJzAnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRFbC5hcHBlbmRDaGlsZCh0aGlzLl9sb25nT3ZlcmxheUVsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMucmVuZGVyTG9uZ0V2ZW50cygpKTtcclxuICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xyXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ1JPICYmICh3aW5kb3cgYXMgYW55KS5SZXNpemVPYnNlcnZlcikge1xyXG4gICAgICAgICAgICAvLyBPYnNlcnZlIGdyaWQgc2l6ZSBjaGFuZ2VzIHRvIGtlZXAgbG9uZyBzcGFucyBhbGlnbmVkXHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdSTyA9IG5ldyAod2luZG93IGFzIGFueSkuUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJMb25nRXZlbnRzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbG9uZ1JPICYmIHRoaXMuZ3JpZEVsKSB0aGlzLl9sb25nUk8ub2JzZXJ2ZSh0aGlzLmdyaWRFbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgc3RhcnRTZWxlY3Rpb24oZGF0ZTogc3RyaW5nLCBlbDogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gU3RhcnRpbmcgc2VsZWN0aW9uIGZyb20gZGF0ZTonLCBkYXRlKTtcclxuICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25FbmREYXRlID0gZGF0ZTtcclxuICAgICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGlvblJhbmdlKCk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2VuZFNlbE9uY2UpO1xyXG4gICAgfVxyXG4gICAgX2VuZFNlbE9uY2UgPSAoKSA9PiB7IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLl9lbmRTZWxPbmNlKTsgdGhpcy5lbmRTZWxlY3Rpb24oKTsgfTtcclxuICAgIHVwZGF0ZVNlbGVjdGlvbihkYXRlOiBzdHJpbmcpIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxlY3RpbmcgfHwgdGhpcy5pc0RyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIFVwZGF0aW5nIHNlbGVjdGlvbiB0byBkYXRlOicsIGRhdGUpO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpO1xyXG4gICAgfVxyXG4gICAgZW5kU2VsZWN0aW9uKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5pc1NlbGVjdGluZykgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSBmYWxzZTtcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3Rpb25TdGFydERhdGUgJiYgdGhpcy5zZWxlY3Rpb25FbmREYXRlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLnNlbGVjdGlvblN0YXJ0RGF0ZTtcclxuICAgICAgICAgICAgY29uc3QgZSA9IHRoaXMuc2VsZWN0aW9uRW5kRGF0ZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIFNlbGVjdGlvbiByYW5nZTonLCBzLCAndG8nLCBlKTtcclxuICAgICAgICAgICAgdGhpcy5vcGVuRXZlbnRNb2RhbEZvclJhbmdlKHMsIGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsZWFyU2VsZWN0aW9uKCk7XHJcbiAgICB9XHJcbiAgICBoaWdobGlnaHRTZWxlY3Rpb25SYW5nZSgpIHtcclxuICAgICAgICBjb25zdCBzID0gbmV3IERhdGUodGhpcy5zZWxlY3Rpb25TdGFydERhdGUhICsgJ1QwMDowMDowMCcpO1xyXG4gICAgICAgIGNvbnN0IGUgPSBuZXcgRGF0ZSh0aGlzLnNlbGVjdGlvbkVuZERhdGUhICsgJ1QwMDowMDowMCcpO1xyXG4gICAgICAgIGNvbnN0IFttaW4sIG1heF0gPSBzIDw9IGUgPyBbcywgZV0gOiBbZSwgc107XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIEhpZ2hsaWdodGluZyByYW5nZTonLCBtaW4udG9JU09TdHJpbmcoKSwgJ3RvJywgbWF4LnRvSVNPU3RyaW5nKCkpO1xyXG4gICAgICAgIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbSh0aGlzLmdyaWRFbC5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICBsZXQgc2VsZWN0ZWRDb3VudCA9IDA7XHJcbiAgICAgICAgY2VsbHMuZm9yRWFjaChjID0+IHtcclxuICAgICAgICAgICAgYy5yZW1vdmVDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGQgPSBjLmdldEF0dHIoJ2RhdGEtZGF0ZScpO1xyXG4gICAgICAgICAgICBpZiAoIWQpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgZHQgPSBuZXcgRGF0ZShkICsgJ1QwMDowMDowMCcpO1xyXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGJvdGggc3RhcnQgYW5kIGVuZCBkYXRlcyAodXNlID49IGFuZCA8PSBmb3IgaW5jbHVzaXZlIHJhbmdlKVxyXG4gICAgICAgICAgICBpZiAoZHQgPj0gbWluICYmIGR0IDw9IG1heCkge1xyXG4gICAgICAgICAgICAgICAgYy5hZGRDbGFzcygnZGF5YmxlLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gU2VsZWN0ZWQgZGF0ZTonLCBkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBTZWxlY3RlZCcsIHNlbGVjdGVkQ291bnQsICdjZWxscycpO1xyXG4gICAgfVxyXG4gICAgY2xlYXJTZWxlY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc3QgY2VsbHMgPSBBcnJheS5mcm9tKHRoaXMuZ3JpZEVsLmNoaWxkcmVuKSBhcyBIVE1MRWxlbWVudFtdO1xyXG4gICAgICAgIGNlbGxzLmZvckVhY2goYyA9PiBjLnJlbW92ZUNsYXNzKCdkYXlibGUtc2VsZWN0ZWQnKSk7XHJcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGFydERhdGUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0aW9uRW5kRGF0ZSA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgb3BlbkV2ZW50TW9kYWxGb3JSYW5nZShzdGFydDogc3RyaW5nLCBlbmQ6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcclxuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XHJcbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEV2ZW50TW9kYWwodGhpcy5hcHAsIHVuZGVmaW5lZCwgc3RhcnQsIGVuZCwgYXN5bmMgcmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZXY6IERheWJsZUV2ZW50ID0geyBpZDogcmFuZG9tSWQoKSwgLi4ucmVzdWx0IH0gYXMgRGF5YmxlRXZlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgfSwgYXN5bmMgKCkgPT4ge30sIGFzeW5jICgpID0+IHt9KTtcclxuICAgICAgICAobW9kYWwgYXMgYW55KS5jYXRlZ29yaWVzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdO1xyXG4gICAgICAgIChtb2RhbCBhcyBhbnkpLnBsdWdpbiA9IHRoaXMucGx1Z2luO1xyXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgIH1cclxuXHJcbiAgICByZW5kZXJMb25nRXZlbnRzKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5fbG9uZ092ZXJsYXlFbCB8fCAhdGhpcy5fbG9uZ092ZXJsYXlFbC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsID0gdGhpcy5ncmlkRWwuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWxvbmctb3ZlcmxheScgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLmluc2V0ID0gJzAnO1xyXG4gICAgICAgICAgICB0aGlzLl9sb25nT3ZlcmxheUVsLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvbmdPdmVybGF5RWwuc3R5bGUuekluZGV4ID0gJzEwJztcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgY2VsbHMgPSBBcnJheS5mcm9tKHRoaXMuZ3JpZEVsLmNoaWxkcmVuKS5maWx0ZXIoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5oYXNDbGFzcz8uKCdkYXlibGUtZGF5JykpIGFzIEhUTUxFbGVtZW50W107XHJcbiAgICAgICAgY29uc3QgdG9kYXlOdW0gPSAoZWw6IEhUTUxFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG4gPSBlbC5xdWVyeVNlbGVjdG9yKCcuZGF5YmxlLWRheS1udW1iZXInKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIHJldHVybiBuID8gbi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgKyBwYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUobikubWFyZ2luQm90dG9tIHx8ICcwJykgOiAyNDtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRIZWlnaHQgPSAyODtcclxuICAgICAgICBjb25zdCBzZWdtZW50R2FwID0gNDtcclxuICAgICAgICBjb25zdCBnZXRDZWxsV2lkdGggPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChjZWxscy5sZW5ndGggPT09IDApIHJldHVybiAxMDA7XHJcbiAgICAgICAgICAgIHJldHVybiAoY2VsbHNbMF0gYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoIHx8IDEwMDtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IGNvdW50c0J5RGF0ZTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IGxvbmdFdmVudHMgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuc3RhcnREYXRlICYmIGV2LmVuZERhdGUgJiYgZXYuc3RhcnREYXRlICE9PSBldi5lbmREYXRlKTtcclxuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGV2LnN0YXJ0RGF0ZSEpO1xyXG4gICAgICAgICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShldi5lbmREYXRlISk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGQgPSBuZXcgRGF0ZShzdGFydCk7IGQgPD0gZW5kOyBkLnNldERhdGUoZC5nZXREYXRlKCkgKyAxKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG0gPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7eX0tJHttfS0ke2RkfWA7XHJcbiAgICAgICAgICAgICAgICBjb3VudHNCeURhdGVba2V5XSA9IChjb3VudHNCeURhdGVba2V5XSB8fCAwKSArIDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCByZXF1aXJlZEtleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgICAgICBsb25nRXZlbnRzLmZvckVhY2goZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzdGFydElkeCA9IGNlbGxzLmZpbmRJbmRleChjID0+IGMuZ2V0QXR0cignZGF0YS1kYXRlJykgPT09IGV2LnN0YXJ0RGF0ZSk7XHJcbiAgICAgICAgICAgIGlmIChzdGFydElkeCA9PT0gLTEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShldi5zdGFydERhdGUhKTtcclxuICAgICAgICAgICAgY29uc3QgZW5kID0gbmV3IERhdGUoZXYuZW5kRGF0ZSEpO1xyXG4gICAgICAgICAgICBjb25zdCBvdmVybGFwID0gbG9uZ0V2ZW50c1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihlID0+IGUuc3RhcnREYXRlICYmIGUuZW5kRGF0ZSAmJiBlLnN0YXJ0RGF0ZSAhPT0gZS5lbmREYXRlICYmIG5ldyBEYXRlKGUuc3RhcnREYXRlISkgPD0gc3RhcnQgJiYgbmV3IERhdGUoZS5lbmREYXRlISkgPj0gc3RhcnQpXHJcbiAgICAgICAgICAgICAgICAuc29ydCgoYSxiKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWQgPSAobmV3IERhdGUoYS5lbmREYXRlISkuZ2V0VGltZSgpIC0gbmV3IERhdGUoYS5zdGFydERhdGUhKS5nZXRUaW1lKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJkID0gKG5ldyBEYXRlKGIuZW5kRGF0ZSEpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGIuc3RhcnREYXRlISkuZ2V0VGltZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYWQgIT09IGJkKSByZXR1cm4gYmQgLSBhZDsgLy8gbG9uZ2VyIGZpcnN0IChvbiB0b3ApXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaWQubG9jYWxlQ29tcGFyZShiLmlkKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjb25zdCBzdGFja0luZGV4ID0gb3ZlcmxhcC5maW5kSW5kZXgoZSA9PiBlLmlkID09PSBldi5pZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwYW4gPSBNYXRoLmZsb29yKChlbmQuZ2V0VGltZSgpIC0gc3RhcnQuZ2V0VGltZSgpKS84NjQwMDAwMCkgKyAxO1xyXG4gICAgICAgICAgICBjb25zdCBjZWxsc1BlclJvdyA9IDc7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0Um93ID0gTWF0aC5mbG9vcihzdGFydElkeCAvIGNlbGxzUGVyUm93KTtcclxuICAgICAgICAgICAgY29uc3QgZW5kSWR4ID0gc3RhcnRJZHggKyBzcGFuIC0gMTtcclxuICAgICAgICAgICAgY29uc3QgZW5kUm93ID0gTWF0aC5mbG9vcihlbmRJZHggLyBjZWxsc1BlclJvdyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxXaWR0aCA9IGdldENlbGxXaWR0aCgpO1xyXG4gICAgICAgICAgICBpZiAoc3RhcnRSb3cgPT09IGVuZFJvdykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlyc3QgPSBjZWxsc1tzdGFydElkeF07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gY2VsbHNbZW5kSWR4XTtcclxuICAgICAgICAgICAgICAgIGlmICghZmlyc3QgfHwgIWxhc3QpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZyTGVmdCA9IChmaXJzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0TGVmdDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZyVG9wID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsclJpZ2h0ID0gKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldExlZnQgKyAobGFzdCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGg7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3BPZmZzZXQgPSB0b2RheU51bShmaXJzdCkgKyAxMiArIHN0YWNrSW5kZXggKiAoc2VnbWVudEhlaWdodCArIHNlZ21lbnRHYXApO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGZyTGVmdCAtIDI7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBmclRvcCArIHRvcE9mZnNldDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gKGxyUmlnaHQgLSBmckxlZnQpICsgNDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2V2LmlkfTpyb3c6JHtzdGFydFJvd30tc2luZ2xlYDtcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVkS2V5cy5hZGQoa2V5KTtcclxuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gdGhpcy5fbG9uZ0Vscy5nZXQoa2V5KTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zaW5nbGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5sb25nS2V5ID0ga2V5O1xyXG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnN0eWxlU2lnID0gYCR7ZXYuY2F0ZWdvcnlJZCB8fCAnJ318JHtldi5jb2xvciB8fCAnJ318JHtldi50ZXh0Q29sb3IgfHwgJyd9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGh9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXN9YDtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZEVsIS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9sb25nRWxzLnNldChrZXksIGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2lnID0gYCR7ZXYuY2F0ZWdvcnlJZCB8fCAnJ318JHtldi5jb2xvciB8fCAnJ318JHtldi50ZXh0Q29sb3IgfHwgJyd9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGh9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXN9YDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgIT09IHNpZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdJdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zaW5nbGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKG5ld0l0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgPSBzaWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5vbmNsaWNrID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgdGhpcy5vcGVuRXZlbnRNb2RhbChldi5pZCEsIGV2LnN0YXJ0RGF0ZSEsIGV2LmVuZERhdGUhKTsgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IG5ld0l0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuc2V0KGtleSwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmlzQ29ubmVjdGVkIHx8IGl0ZW0ucGFyZW50RWxlbWVudCAhPT0gdGhpcy5ncmlkRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbCEuYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXdpZHRoJywgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aCA/PyAyfXB4YCk7XHJcbiAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS50b3AgPSBgJHt0b3B9cHhgO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuaGVpZ2h0ID0gYCR7c2VnbWVudEhlaWdodH1weGA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCByb3cgPSBzdGFydFJvdzsgcm93IDw9IGVuZFJvdzsgcm93KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dTdGFydElkeCA9IHJvdyAqIGNlbGxzUGVyUm93O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvd0VuZElkeCA9IE1hdGgubWluKHJvd1N0YXJ0SWR4ICsgY2VsbHNQZXJSb3cgLSAxLCBjZWxscy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudFN0YXJ0SW5Sb3cgPSByb3cgPT09IHN0YXJ0Um93ID8gc3RhcnRJZHggOiByb3dTdGFydElkeDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudEVuZEluUm93ID0gcm93ID09PSBlbmRSb3cgPyBlbmRJZHggOiByb3dFbmRJZHg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50U3RhcnRJblJvdyA+IHJvd0VuZElkeCB8fCBldmVudEVuZEluUm93IDwgcm93U3RhcnRJZHgpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gY2VsbHNbZXZlbnRTdGFydEluUm93XTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0ID0gY2VsbHNbZXZlbnRFbmRJblJvd107XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmaXJzdCB8fCAhbGFzdCkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJMZWZ0ID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyVG9wID0gKGZpcnN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRUb3A7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbHJSaWdodCA9IChsYXN0IGFzIEhUTUxFbGVtZW50KS5vZmZzZXRMZWZ0ICsgKGxhc3QgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvcE9mZnNldCA9IHRvZGF5TnVtKGZpcnN0KSArIDEyICsgc3RhY2tJbmRleCAqIChzZWdtZW50SGVpZ2h0ICsgc2VnbWVudEdhcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGZyTGVmdCAtIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9wID0gZnJUb3AgKyB0b3BPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSAobHJSaWdodCAtIGZyTGVmdCkgKyA0O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke2V2LmlkfTpyb3c6JHtyb3d9YDtcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZEtleXMuYWRkKGtleSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSB0aGlzLl9sb25nRWxzLmdldChrZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09PSBzdGFydFJvdykgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQtc3RhcnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gZW5kUm93KSBpdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1lbmQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubG9uZ0tleSA9IGtleTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc3R5bGVTaWcgPSBgJHtldi5jYXRlZ29yeUlkIHx8ICcnfXwke2V2LmNvbG9yIHx8ICcnfXwke2V2LnRleHRDb2xvciB8fCAnJ318JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJnT3BhY2l0eX18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXl9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJXaWR0aH18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1c31gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ub25jbGljayA9IChlKSA9PiB7IGUuc3RvcFByb3BhZ2F0aW9uKCk7IHRoaXMub3BlbkV2ZW50TW9kYWwoZXYuaWQhLCBldi5zdGFydERhdGUhLCBldi5lbmREYXRlISk7IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZEVsIS5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpZyA9IGAke2V2LmNhdGVnb3J5SWQgfHwgJyd9fCR7ZXYuY29sb3IgfHwgJyd9fCR7ZXYudGV4dENvbG9yIHx8ICcnfXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5fXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnR9fCR7dGhpcy5wbHVnaW4uc2V0dGluZ3Mub25seUFuaW1hdGVUb2RheX18JHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRofXwke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoaXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyAhPT0gc2lnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdJdGVtID0gdGhpcy5jcmVhdGVFdmVudEl0ZW0oZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5hZGRDbGFzcygnZGF5YmxlLWxvbmctZXZlbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT09IHN0YXJ0Um93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1zdGFydCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PT0gZW5kUm93KSBuZXdJdGVtLmFkZENsYXNzKCdkYXlibGUtbG9uZy1ldmVudC1lbmQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChuZXdJdGVtIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LmxvbmdLZXkgPSBrZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV3SXRlbSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zdHlsZVNpZyA9IHNpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkISwgZXYuc3RhcnREYXRlISwgZXYuZW5kRGF0ZSEpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkgaXRlbS5yZXBsYWNlV2l0aChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBuZXdJdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbG9uZ0Vscy5zZXQoa2V5LCBpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNDb25uZWN0ZWQgfHwgaXRlbS5wYXJlbnRFbGVtZW50ICE9PSB0aGlzLmdyaWRFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRFbCEuYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIChpdGVtIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1ib3JkZXItd2lkdGgnLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlcldpZHRoID8/IDJ9cHhgKTtcclxuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBIVE1MRWxlbWVudCkuc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmxlZnQgPSBgJHtsZWZ0fXB4YDtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLnRvcCA9IGAke3RvcH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmhlaWdodCA9IGAke3NlZ21lbnRIZWlnaHR9cHhgO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBzdGFsZSBsb25nIGl0ZW1zXHJcbiAgICAgICAgQXJyYXkuZnJvbSh0aGlzLl9sb25nRWxzLmtleXMoKSkuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXJlcXVpcmVkS2V5cy5oYXMoa2V5KSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzLl9sb25nRWxzLmdldChrZXkpITtcclxuICAgICAgICAgICAgICAgIGlmIChlbCAmJiBlbC5wYXJlbnRFbGVtZW50KSBlbC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvbmdFbHMuZGVsZXRlKGtleSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBjZWxscy5mb3JFYWNoKGNlbGwgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY2VsbC5nZXRBdHRyKCdkYXRhLWRhdGUnKSE7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRzQnlEYXRlW2RhdGVdIHx8IDA7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNlbGwucXVlcnlTZWxlY3RvcignLmRheWJsZS1ldmVudC1jb250YWluZXInKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gY291bnQgPiAwID8gKGNvdW50ICogc2VnbWVudEhlaWdodCkgKyAoTWF0aC5tYXgoMCwgY291bnQgLSAxKSAqIHNlZ21lbnRHYXApICsgMiA6IDA7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gbXQgPyBgJHttdH1weGAgOiAnJztcclxuICAgICAgICAgICAgICAgIC8vIEhFUkUgSEVSRSBVTkRFUiBMT05HIEVWRU5UIEdBUFBZXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVFdmVudEl0ZW0oZXY6IERheWJsZUV2ZW50KTogSFRNTEVsZW1lbnQge1xyXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBpdGVtLmNsYXNzTmFtZSA9ICdkYXlibGUtZXZlbnQnO1xyXG4gICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xyXG4gICAgICAgIGl0ZW0uZGF0YXNldC5pZCA9IGV2LmlkO1xyXG4gICAgICAgIGl0ZW0uZGF0YXNldC5jYXRlZ29yeUlkID0gZXYuY2F0ZWdvcnlJZCB8fCAnJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBBcHBseSB0aXRsZS9kZXNjcmlwdGlvbiBhbGlnbm1lbnRcclxuICAgICAgICBjb25zdCB0aXRsZUFsaWduID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRUaXRsZUFsaWduIHx8ICdsZWZ0JztcclxuICAgICAgICBjb25zdCBkZXNjQWxpZ24gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudERlc2NBbGlnbiB8fCAnbGVmdCc7XHJcbiAgICAgICAgaXRlbS5hZGRDbGFzcyhgZGF5YmxlLXRpdGxlLWFsaWduLSR7dGl0bGVBbGlnbn1gKTtcclxuICAgICAgICBpdGVtLmFkZENsYXNzKGBkYXlibGUtZGVzYy1hbGlnbi0ke2Rlc2NBbGlnbn1gKTtcclxuICAgICAgICBpZiAodGl0bGVBbGlnbiA9PT0gJ2NlbnRlcicpIHtcclxuICAgICAgICAgICAgaXRlbS5hZGRDbGFzcygnZGF5YmxlLWxheW91dC1jZW50ZXItZmxleCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggY29sb3JzIHRvIHVzZTogdXNlci1zZXQgb3IgY2F0ZWdvcnlcclxuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcz8uZmluZChjID0+IGMuaWQgPT09IGV2LmNhdGVnb3J5SWQpO1xyXG4gICAgICAgIGNvbnN0IGlzRGVmYXVsdENhdGVnb3J5ID0gIWV2LmNhdGVnb3J5SWQgfHwgZXYuY2F0ZWdvcnlJZCA9PT0gJ2RlZmF1bHQnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XHJcbiAgICAgICAgbGV0IHRleHRDb2xvciA9ICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENvbG9yIHNlbGVjdGlvbiBsb2dpYyAodXNlci1zZXQgY29sb3IgYWx3YXlzIHByZWZlcnJlZClcclxuICAgICAgICBpZiAoZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgYmdDb2xvciA9IGV2LmNvbG9yO1xyXG4gICAgICAgICAgICB0ZXh0Q29sb3IgPSBldi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKGV2LmNvbG9yKTtcclxuICAgICAgICAgICAgKGl0ZW0gYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuY29sb3IgPSBldi5jb2xvcjtcclxuICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcclxuICAgICAgICAgICAgYmdDb2xvciA9IGNhdGVnb3J5LmJnQ29sb3I7XHJcbiAgICAgICAgICAgIHRleHRDb2xvciA9IGNhdGVnb3J5LnRleHRDb2xvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQXBwbHkgc3R5bGluZyBpZiB3ZSBoYXZlIGNvbG9yc1xyXG4gICAgICAgIGlmIChiZ0NvbG9yICYmIHRleHRDb2xvcikge1xyXG4gICAgICAgICAgICAvLyBDb252ZXJ0IGhleCBjb2xvciB0byByZ2JhIHdpdGggb3BhY2l0eVxyXG4gICAgICAgICAgICBjb25zdCBvcGFjaXR5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHkgPz8gMTtcclxuICAgICAgICAgICAgY29uc3QgcmdiYUNvbG9yID0gaGV4VG9SZ2JhKGJnQ29sb3IsIG9wYWNpdHkpO1xyXG4gICAgICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJnLWNvbG9yJywgcmdiYUNvbG9yKTtcclxuICAgICAgICAgICAgaXRlbS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC10ZXh0LWNvbG9yJywgdGV4dENvbG9yKTtcclxuICAgICAgICAgICAgaXRlbS5jbGFzc0xpc3QuYWRkKCdkYXlibGUtZXZlbnQtY29sb3JlZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBBcHBseSBib3JkZXIgd2lkdGggc2V0dGluZ3NcclxuICAgICAgICBpdGVtLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LWJvcmRlci13aWR0aCcsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMn1weGApO1xyXG4gICAgICAgIGl0ZW0uc3R5bGUuc2V0UHJvcGVydHkoJy0tZXZlbnQtYm9yZGVyLXJhZGl1cycsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyUmFkaXVzID8/IDZ9cHhgKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBBcHBseSBlZmZlY3QgYW5kIGFuaW1hdGlvbiBmcm9tIGNhdGVnb3J5IChhbHdheXMsIHJlZ2FyZGxlc3Mgb2YgY29sb3IgY2hvaWNlKVxyXG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICBpZiAoY2F0ZWdvcnkuZWZmZWN0ICYmIGNhdGVnb3J5LmVmZmVjdCAhPT0gJycpIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1lZmZlY3QtJHtjYXRlZ29yeS5lZmZlY3R9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzVG9kYXlFdmVudCA9IHRoaXMuaXNFdmVudFRvZGF5KGV2KTtcclxuICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbiAmJiBjYXRlZ29yeS5hbmltYXRpb24gIT09ICcnICYmICghb25seVRvZGF5IHx8IGlzVG9kYXlFdmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9ufWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24yICYmIGNhdGVnb3J5LmFuaW1hdGlvbjIgIT09ICcnICYmICghb25seVRvZGF5IHx8IGlzVG9kYXlFdmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkQ2xhc3MoYGRheWJsZS1hbmltLSR7Y2F0ZWdvcnkuYW5pbWF0aW9uMn1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB0aXRsZSA9IGl0ZW0uY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLWV2ZW50LXRpdGxlJyB9KTtcclxuICAgICAgICByZW5kZXJNYXJrZG93bihldi50aXRsZSB8fCAnJywgdGl0bGUsIHRoaXMucGx1Z2luLmFwcCk7XHJcbiAgICAgICAgY29uc3QgdEZtdCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRpbWVGb3JtYXQgPz8gJzI0aCc7XHJcbiAgICAgICAgY29uc3QgdGltZURpc3BsYXkgPSBmb3JtYXRUaW1lUmFuZ2UoZXYudGltZSwgdEZtdCk7XHJcbiAgICAgICAgaWYgKHRpbWVEaXNwbGF5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgICAgICAgICB0aW1lU3Bhbi50ZXh0Q29udGVudCA9IGAgKCR7dGltZURpc3BsYXl9KWA7XHJcbiAgICAgICAgICAgIHRpdGxlLmFwcGVuZENoaWxkKHRpbWVTcGFuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaWNvblRvVXNlID0gKGV2Lmljb24gIT09IHVuZGVmaW5lZCkgPyBldi5pY29uIDogKGNhdGVnb3J5Py5pY29uIHx8ICcnKTtcclxuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCAhPT0gJ25vbmUnICYmIGljb25Ub1VzZSkge1xyXG4gICAgICAgICAgICBjb25zdCBpY29uRWwgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1pY29uJyB9KTtcclxuICAgICAgICAgICAgc2V0SWNvbihpY29uRWwsIGljb25Ub1VzZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBsYWNlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNvblBsYWNlbWVudCA/PyAnbGVmdCc7XHJcbiAgICAgICAgICAgIGlmIChwbGFjZSA9PT0gJ2xlZnQnKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmluc2VydEJlZm9yZShpY29uRWwsIHRpdGxlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChwbGFjZSA9PT0gJ3JpZ2h0Jykge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5hcHBlbmRDaGlsZChpY29uRWwpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsYWNlID09PSAndG9wJyB8fCBwbGFjZSA9PT0gJ3RvcC1sZWZ0JyB8fCBwbGFjZSA9PT0gJ3RvcC1yaWdodCcpIHtcclxuICAgICAgICAgICAgICAgIGljb25FbC5hZGRDbGFzcygnZGF5YmxlLWljb24tdG9wJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGxhY2UgPT09ICd0b3AtbGVmdCcpIGljb25FbC5hZGRDbGFzcygnZGF5YmxlLWljb24tdG9wLWxlZnQnKTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHBsYWNlID09PSAndG9wLXJpZ2h0JykgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtcmlnaHQnKTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWNvbkVsLmFkZENsYXNzKCdkYXlibGUtaWNvbi10b3AtY2VudGVyJyk7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmluc2VydEJlZm9yZShpY29uRWwsIGl0ZW0uZmlyc3RDaGlsZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV2LmRlc2NyaXB0aW9uKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBpdGVtLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1ldmVudC1kZXNjJyB9KTtcclxuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gaW5oZXJpdHMgdGV4dCBjb2xvclxyXG4gICAgICAgICAgICBpZiAoYmdDb2xvciAmJiB0ZXh0Q29sb3IpIHtcclxuICAgICAgICAgICAgICAgIGRlc2Muc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVuZGVyTWFya2Rvd24oZXYuZGVzY3JpcHRpb24sIGRlc2MsIHRoaXMucGx1Z2luLmFwcCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIENvbXBsZXRlZCBiZWhhdmlvclxyXG4gICAgICAgIGlmIChldi5jb21wbGV0ZWQpIHtcclxuICAgICAgICAgICAgY29uc3QgYmVoYXZpb3IgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21wbGV0ZUJlaGF2aW9yID8/ICdub25lJztcclxuICAgICAgICAgICAgaWYgKGJlaGF2aW9yID09PSAnZGltJykgaXRlbS5zdHlsZS5vcGFjaXR5ID0gJzAuNic7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnc3RyaWtldGhyb3VnaCcpIHRpdGxlLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGJlaGF2aW9yID09PSAnaGlkZScpIGl0ZW0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB9XHJcbiAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IChldnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcclxuICAgICAgICAgICAgaWYgKHdpa2kpIHtcclxuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHJlc29sdmVOb3RlRmlsZSh0aGlzLnBsdWdpbi5hcHAsIHdpa2kpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIChsZWFmIGFzIGFueSkub3BlbkZpbGU/LihmaWxlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcclxuICAgICAgICBpdGVtLm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBEcmFnIHN0YXJ0ZWQgb24gZXZlbnQ6JywgZXYuaWQpO1xyXG4gICAgICAgICAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XHJcbiAgICAgICAgICAgIChlLmRhdGFUcmFuc2ZlciBhcyBEYXRhVHJhbnNmZXIpPy5zZXREYXRhKCdkYXlibGUtc291cmNlJywnY2FsZW5kYXInKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSBpdGVtLmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5sZWZ0ID0gJy0xMDAwMHB4JztcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUub3BhY2l0eSA9ICcxJztcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3hTaXppbmcgPSAnYm9yZGVyLWJveCc7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUud2lkdGggPSBgJHtyZWN0LndpZHRofXB4YDtcclxuICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJvcmRlclJhZGl1cyA9IGdldENvbXB1dGVkU3R5bGUoaXRlbSkuYm9yZGVyUmFkaXVzO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcclxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREcmFnSW1hZ2UoZHJhZ0ltZywgTWF0aC5taW4oOCwgcmVjdC53aWR0aCAvIDQpLCBNYXRoLm1pbig4LCByZWN0LmhlaWdodCAvIDQpKTtcclxuICAgICAgICAgICAgICAgIChpdGVtIGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcclxuICAgICAgICAgICAgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGl0ZW0ub25kcmFnZW5kID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gRHJhZyBlbmRlZCcpO1xyXG4gICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgY29uc3QgZGkgPSAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyBhcyBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgaWYgKGRpICYmIGRpLnBhcmVudEVsZW1lbnQpIGRpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpdGVtLm9uY2xpY2sgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB0aGlzLm9wZW5FdmVudE1vZGFsKGV2LmlkKTsgfTtcclxuICAgICAgICBpdGVtLm9uY29udGV4dG1lbnUgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEdXBsaWNhdGUnKS5zZXRJY29uKCdjb3B5Jykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdFdjogRGF5YmxlRXZlbnQgPSB7IC4uLmV2LCBpZDogcmFuZG9tSWQoKSB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaChuZXdFdik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnJlbmRlcigpKTtcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKGV2LmNvbXBsZXRlZCA/ICdNYXJrIGluY29tcGxldGUnIDogJ01hcmsgY29tcGxldGUnKS5zZXRJY29uKCdjaGVjaycpLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZXYuY29tcGxldGVkID0gIWV2LmNvbXBsZXRlZDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMucmVuZGVyKCkpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy5yZW5kZXIoKSk7XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgbWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpc0V2ZW50VG9kYXkoZXY6IERheWJsZUV2ZW50KTogYm9vbGVhbiB7XHJcbiAgICAgICAgY29uc3QgdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgY29uc3QgeXl5eSA9IHQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBjb25zdCBtbSA9IFN0cmluZyh0LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgIGNvbnN0IGRkID0gU3RyaW5nKHQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xyXG4gICAgICAgIGNvbnN0IHRvZGF5U3RyID0gYCR7eXl5eX0tJHttbX0tJHtkZH1gO1xyXG4gICAgICAgIGlmIChldi5kYXRlKSByZXR1cm4gZXYuZGF0ZSA9PT0gdG9kYXlTdHI7XHJcbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiBldi5lbmREYXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBldi5zdGFydERhdGUgPD0gdG9kYXlTdHIgJiYgZXYuZW5kRGF0ZSA+PSB0b2RheVN0cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV2LnN0YXJ0RGF0ZSAmJiAhZXYuZW5kRGF0ZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXYuc3RhcnREYXRlID09PSB0b2RheVN0cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbmRlckhvbGRlcigpIHtcclxuICAgICAgICBjb25zdCBsaXN0ID0gdGhpcy5ob2xkZXJFbD8ucXVlcnlTZWxlY3RvcignLmRheWJsZS1ob2xkZXItbGlzdCcpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICBpZiAoIWxpc3QpIHJldHVybjtcclxuICAgICAgICBsaXN0LmVtcHR5KCk7XHJcbiAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUV2ZW50SXRlbShldik7XHJcbiAgICAgICAgICAgIGl0ZW0uZGF0YXNldC5zb3VyY2UgPSAnaG9sZGVyJztcclxuICAgICAgICAgICAgaXRlbS5vbmRyYWdzdGFydCA9IGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIERyYWcgc3RhcnRlZCBvbiBob2xkZXIgZXZlbnQ6JywgZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNTZWxlY3RpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCdob2xkZXInKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHJhZ0ltZyA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUudG9wID0gJy0xMDAwMHB4JztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUub3BhY2l0eSA9ICcxJztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLndpZHRoID0gYCR7cmVjdC53aWR0aH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS5ib3JkZXJSYWRpdXMgPSBnZXRDb21wdXRlZFN0eWxlKGl0ZW0pLmJvcmRlclJhZGl1cztcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRyYWdJbWcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREcmFnSW1hZ2UoZHJhZ0ltZywgTWF0aC5taW4oOCwgcmVjdC53aWR0aCAvIDQpLCBNYXRoLm1pbig4LCByZWN0LmhlaWdodCAvIDQpKTtcclxuICAgICAgICAgICAgICAgICAgICAoaXRlbSBhcyBhbnkpLl9fZHJhZ0ltZyA9IGRyYWdJbWc7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgICAgICBpdGVtLmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaXRlbS5vbmRyYWdlbmQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gRHJhZyBlbmRlZCBmcm9tIGhvbGRlcicpO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkaSA9IChpdGVtIGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRpICYmIGRpLnBhcmVudEVsZW1lbnQpIGRpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgKGl0ZW0gYXMgYW55KS5fX2RyYWdJbWcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbGlzdC5hcHBlbmRDaGlsZChpdGVtKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyBFbmFibGUgcmVvcmRlcmluZyBpbnNpZGUgaG9sZGVyIGxpc3Qgd2l0aCBkcm9wIGluZGljYXRvcnNcclxuICAgICAgICBsaXN0Lm9uZHJhZ292ZXIgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBjb25zdCBldmVudENvdW50ID0gbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWV2ZW50JykubGVuZ3RoO1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgJiYgdGFyZ2V0RXZlbnQucGFyZW50RWxlbWVudCA9PT0gbGlzdCAmJiBldmVudENvdW50ID4gMSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldEV2ZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudEhlaWdodCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgbGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGluZGljYXRvci5jbGFzc05hbWUgPSAnZGF5YmxlLWRyb3AtaW5kaWNhdG9yJztcclxuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFdmVudC5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoaW5kaWNhdG9yLCB0YXJnZXRFdmVudCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50LmFmdGVyKGluZGljYXRvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIGxpc3Qub25kcmFnbGVhdmUgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGxpc3QpIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgbGlzdC5vbmRyb3AgPSBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGxpc3QucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICBjb25zdCBpZCA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNyYyA9IGUuZGF0YVRyYW5zZmVyPy5nZXREYXRhKCdkYXlibGUtc291cmNlJyk7XHJcbiAgICAgICAgICAgIGlmICghaWQgfHwgc3JjICE9PSAnaG9sZGVyJykgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBkcmFnZ2VkRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBkcmFnZ2VkQ29udGFpbmVyID0gZHJhZ2dlZEVsLmNsb3Nlc3QoJy5kYXlibGUtaG9sZGVyLWxpc3QnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChkcmFnZ2VkQ29udGFpbmVyICE9PSBsaXN0KSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEV2ZW50ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLWV2ZW50JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0RXZlbnQgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoIXRhcmdldEV2ZW50KSB7IFxyXG4gICAgICAgICAgICAgICAgbGlzdC5hcHBlbmRDaGlsZChkcmFnZ2VkRWwpOyBcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRFdmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRIZWlnaHQgPSByZWN0LmhlaWdodDtcclxuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBldmVudEhlaWdodCAvIDIpIHsgbGlzdC5pbnNlcnRCZWZvcmUoZHJhZ2dlZEVsLCB0YXJnZXRFdmVudCk7IH1cclxuICAgICAgICAgICAgICAgIGVsc2UgeyB0YXJnZXRFdmVudC5hZnRlcihkcmFnZ2VkRWwpOyB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gUGVyc2lzdCBuZXcgaG9sZGVyIG9yZGVyXHJcbiAgICAgICAgICAgIGNvbnN0IHJlb3JkZXJlZDogRGF5YmxlRXZlbnRbXSA9IFtdO1xyXG4gICAgICAgICAgICBsaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZXZlbnQnKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVpZCA9IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5pZCE7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IHRoaXMuaG9sZGVyRXZlbnRzLmZpbmQoZXYgPT4gZXYuaWQgPT09IGVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHJlb3JkZXJlZC5wdXNoKGZvdW5kKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaG9sZGVyRXZlbnRzID0gcmVvcmRlcmVkO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvcGVuRXZlbnRNb2RhbChpZD86IHN0cmluZywgZGF0ZT86IHN0cmluZywgZW5kRGF0ZT86IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXI/LnRyaW0oKTtcclxuICAgICAgICBpZiAoIWZvbGRlcikgeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9XHJcbiAgICAgICAgY2F0Y2ggeyBuZXcgU3RvcmFnZUZvbGRlck5vdFNldE1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7IHJldHVybjsgfVxyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gaWQgPyAodGhpcy5ldmVudHMuZmluZChlID0+IGUuaWQgPT09IGlkKSA/PyB0aGlzLmhvbGRlckV2ZW50cy5maW5kKGUgPT4gZS5pZCA9PT0gaWQpKSA6IHVuZGVmaW5lZDtcclxuICAgICAgICBjb25zdCBmcm9tSG9sZGVyID0gISEoZXhpc3RpbmcgJiYgdGhpcy5ob2xkZXJFdmVudHMuc29tZShlID0+IGUuaWQgPT09IGV4aXN0aW5nLmlkKSk7XHJcbiAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgRXZlbnRNb2RhbCh0aGlzLmFwcCwgZXhpc3RpbmcsIGRhdGUsIGVuZERhdGUsIGFzeW5jIHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBNb2RhbCBzdWJtaXR0ZWQgd2l0aCByZXN1bHQ6JywgcmVzdWx0KTtcclxuICAgICAgICAgICAgY29uc3QgaXNNdWx0aSA9ICEhKHJlc3VsdC5zdGFydERhdGUgJiYgcmVzdWx0LmVuZERhdGUpO1xyXG4gICAgICAgICAgICBjb25zdCBpc1NpbmdsZSA9ICEhcmVzdWx0LmRhdGUgfHwgKCEhcmVzdWx0LnN0YXJ0RGF0ZSAmJiAhcmVzdWx0LmVuZERhdGUpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gRXZlbnQgdHlwZSAtIGlzTXVsdGk6JywgaXNNdWx0aSwgJ2lzU2luZ2xlOicsIGlzU2luZ2xlKTtcclxuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gVXBkYXRpbmcgZXhpc3RpbmcgZXZlbnQ6JywgZXhpc3RpbmcuaWQpO1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgcmVzdWx0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV2OiBEYXlibGVFdmVudCA9IHsgaWQ6IHJhbmRvbUlkKCksIC4uLnJlc3VsdCB9IGFzIERheWJsZUV2ZW50O1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIENyZWF0aW5nIG5ldyBldmVudDonLCBldi5pZCwgJ3R5cGU6JywgaXNNdWx0aSA/ICdtdWx0aS1kYXknIDogaXNTaW5nbGUgPyAnc2luZ2xlLWRheScgOiAnaG9sZGVyJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNNdWx0aSB8fCBpc1NpbmdsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLnB1c2goZXYpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBBZGRlZCB0byBldmVudHMgYXJyYXkuIFRvdGFsIGV2ZW50czonLCB0aGlzLmV2ZW50cy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhvbGRlckV2ZW50cy5wdXNoKGV2KTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gQWRkZWQgdG8gaG9sZGVyLiBUb3RhbCBob2xkZXIgZXZlbnRzOicsIHRoaXMuaG9sZGVyRXZlbnRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBTYXZpbmcgYWxsIGVudHJpZXMuLi4nKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUFsbEVudHJpZXMoKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBTYXZlIGNvbXBsZXRlZCcpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlXSBTYXZlIGZhaWxlZDonLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnJlbmRlckhvbGRlcigpO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VG9kYXlNb2RhbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VG9kYXlNb2RhbC5ldmVudHMgPSB0aGlzLmV2ZW50cztcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRvZGF5TW9kYWwub25PcGVuKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tEYXlibGVdIERlbGV0aW5nIGV2ZW50OicsIGV4aXN0aW5nLmlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChmcm9tSG9sZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ob2xkZXJFdmVudHMgPSB0aGlzLmhvbGRlckV2ZW50cy5maWx0ZXIoZSA9PiBlLmlkICE9PSBleGlzdGluZy5pZCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5ldmVudHMuZmlsdGVyKGUgPT4gZS5pZCAhPT0gZXhpc3RpbmcuaWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQWxsRW50cmllcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcGlja2VyID0gbmV3IEljb25QaWNrZXJNb2RhbCh0aGlzLmFwcCwgaWNvbiA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLmljb24gPSBpY29uO1xyXG4gICAgICAgICAgICAgICAgbW9kYWwuc2V0SWNvbihpY29uKTtcclxuICAgICAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGljb24gaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSBleGlzdGluZy5pY29uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgbW9kYWwuc2V0SWNvbignJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBwaWNrZXIub3BlbigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIChtb2RhbCBhcyBhbnkpLmNhdGVnb3JpZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW107XHJcbiAgICAgICAgKG1vZGFsIGFzIGFueSkucGx1Z2luID0gdGhpcy5wbHVnaW47XHJcbiAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIG9wZW5Ub2RheU1vZGFsKGRhdGU6IHN0cmluZykge1xyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFRvZGF5TW9kYWwodGhpcy5hcHAsIGRhdGUsIHRoaXMuZXZlbnRzLCB0aGlzKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUb2RheU1vZGFsID0gbW9kYWw7XHJcbiAgICAgICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHsgdGhpcy5jdXJyZW50VG9kYXlNb2RhbCA9IHVuZGVmaW5lZDsgfTtcclxuICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEV2ZW50TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBldj86IERheWJsZUV2ZW50O1xyXG4gICAgZGF0ZT86IHN0cmluZztcclxuICAgIGVuZERhdGU/OiBzdHJpbmc7XHJcbiAgICBvblN1Ym1pdDogKGV2OiBQYXJ0aWFsPERheWJsZUV2ZW50PikgPT4gUHJvbWlzZTx2b2lkPjtcclxuICAgIG9uRGVsZXRlOiAoKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gICAgb25QaWNrSWNvbjogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuICAgIGljb24/OiBzdHJpbmc7XHJcbiAgICBpY29uQnRuRWw/OiBIVE1MQnV0dG9uRWxlbWVudDtcclxuICAgIHNlbGVjdGVkQ29sb3I/OiBzdHJpbmc7XHJcbiAgICBzZWxlY3RlZFRleHRDb2xvcj86IHN0cmluZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgZXY6IERheWJsZUV2ZW50IHwgdW5kZWZpbmVkLCBkYXRlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGVuZERhdGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb25TdWJtaXQ6IChldjogUGFydGlhbDxEYXlibGVFdmVudD4pID0+IFByb21pc2U8dm9pZD4sIG9uRGVsZXRlOiAoKSA9PiBQcm9taXNlPHZvaWQ+LCBvblBpY2tJY29uOiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7XHJcbiAgICAgICAgc3VwZXIoYXBwKTtcclxuICAgICAgICB0aGlzLmV2ID0gZXY7XHJcbiAgICAgICAgdGhpcy5kYXRlID0gZGF0ZTtcclxuICAgICAgICB0aGlzLmVuZERhdGUgPSBlbmREYXRlO1xyXG4gICAgICAgIHRoaXMub25TdWJtaXQgPSBvblN1Ym1pdDtcclxuICAgICAgICB0aGlzLm9uRGVsZXRlID0gb25EZWxldGU7XHJcbiAgICAgICAgdGhpcy5vblBpY2tJY29uID0gb25QaWNrSWNvbjtcclxuICAgICAgICB0aGlzLmljb24gPSBldj8uaWNvbjtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3IgPSBldj8uY29sb3I7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZFRleHRDb2xvciA9IGV2Py50ZXh0Q29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0SWNvbihpY29uOiBzdHJpbmcpIHsgXHJcbiAgICAgICAgdGhpcy5pY29uID0gaWNvbjsgXHJcbiAgICAgICAgaWYgKHRoaXMuaWNvbkJ0bkVsKSB7XHJcbiAgICAgICAgICAgIGlmICghaWNvbikgc2V0SWNvbih0aGlzLmljb25CdG5FbCwgJ3BsdXMnKTtcclxuICAgICAgICAgICAgZWxzZSBzZXRJY29uKHRoaXMuaWNvbkJ0bkVsLCBpY29uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25PcGVuKCkge1xyXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcclxuICAgICAgICBjLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3QgaGVhZGluZyA9IGMuY3JlYXRlRWwoJ2gzJywgeyBjbHM6ICdkYXlibGUtbW9kYWwtdGl0bGUnIH0pO1xyXG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XHJcbiAgICAgICAgaGVhZGluZy5hZGRDbGFzcygnZGItbW9kYWwtdGl0bGUnKTtcclxuICAgICAgICBoZWFkaW5nLnRleHRDb250ZW50ID0gdGhpcy5ldiA/ICdFZGl0IEV2ZW50JyA6ICdBZGQgTmV3IEV2ZW50JztcclxuICAgICAgICBjb25zdCByb3cxID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtbW9kYWwtcm93JyB9KTtcclxuICAgICAgICByb3cxLmFkZENsYXNzKCdkYi1tb2RhbC1yb3cnKTtcclxuICAgICAgICBjb25zdCBpY29uQnRuID0gcm93MS5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuIGRheWJsZS1pY29uLWFkZCcgfSk7XHJcbiAgICAgICAgaWNvbkJ0bi5hZGRDbGFzcygnZGItYnRuJyk7XHJcbiAgICAgICAgc2V0SWNvbihpY29uQnRuLCAodGhpcy5pY29uICYmIHRoaXMuaWNvbi5sZW5ndGggPiAwKSA/IHRoaXMuaWNvbiA6ICdwbHVzJyk7XHJcbiAgICAgICAgaWNvbkJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5vblBpY2tJY29uKCk7XHJcbiAgICAgICAgdGhpcy5pY29uQnRuRWwgPSBpY29uQnRuO1xyXG4gICAgICAgIGNvbnN0IHRpdGxlSW5wdXQgPSByb3cxLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RleHQnLCBjbHM6ICdkYXlibGUtaW5wdXQnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnRXZlbnQgdGl0bGUnLCBhdXRvZm9jdXM6ICd0cnVlJyB9IH0pO1xyXG4gICAgICAgIHRpdGxlSW5wdXQuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XHJcbiAgICAgICAgdGl0bGVJbnB1dC52YWx1ZSA9IHRoaXMuZXY/LnRpdGxlID8/ICcnO1xyXG4gICAgICAgIGNvbnN0IGZvY3VzVGl0bGUgPSAoKSA9PiB7IHRyeSB7IHRpdGxlSW5wdXQuZm9jdXMoeyBwcmV2ZW50U2Nyb2xsOiB0cnVlIH0pOyB9IGNhdGNoIHt9IH07XHJcbiAgICAgICAgZm9jdXNUaXRsZSgpO1xyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShmb2N1c1RpdGxlKTtcclxuICAgICAgICBzZXRUaW1lb3V0KGZvY3VzVGl0bGUsIDApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFtbbGlua11dIHN1Z2dlc3Rpb25zIHNoYXJlZCBmb3IgdGl0bGUgYW5kIGRlc2NyaXB0aW9uXHJcbiAgICAgICAgbGV0IHN1Z2dlc3Rpb25Db250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgbGV0IHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICBsZXQgc3VnZ2VzdGlvblRhcmdldDogSFRNTElucHV0RWxlbWVudCB8IEhUTUxUZXh0QXJlYUVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgICAgICBjb25zdCBjbG9zZVN1Z2dlc3Rpb25zID0gKCkgPT4geyBpZiAoc3VnZ2VzdGlvbkNvbnRhaW5lcikgeyBzdWdnZXN0aW9uQ29udGFpbmVyLnJlbW92ZSgpOyBzdWdnZXN0aW9uQ29udGFpbmVyID0gbnVsbDsgfSBzdWdnZXN0aW9uU2VsZWN0ZWRJbmRleCA9IDA7IHN1Z2dlc3Rpb25UYXJnZXQgPSBudWxsOyB9O1xyXG4gICAgICAgIGNvbnN0IHNob3dTdWdnZXN0aW9uc0ZvciA9ICh0YXJnZXQ6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChzdWdnZXN0aW9uQ29udGFpbmVyKSBzdWdnZXN0aW9uQ29udGFpbmVyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICBjb25zdCB2YWwgPSB0YXJnZXQudmFsdWUgfHwgJyc7XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gdmFsLm1hdGNoKC9cXFtcXFsoW15cXFtcXF1dKj8pJC8pO1xyXG4gICAgICAgICAgICBpZiAoIW1hdGNoKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChmOiBhbnkpID0+IGYubmFtZSAmJiBmLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgJiYgIWYubmFtZS5zdGFydHNXaXRoKCcuJykpXHJcbiAgICAgICAgICAgICAgICAuc2xpY2UoMCwgMTApO1xyXG4gICAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm47XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25UYXJnZXQgPSB0YXJnZXQ7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gMDtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdkYXlibGUtbGluay1zdWdnZXN0aW9ucyc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpJztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUubWF4SGVpZ2h0ID0gJzE4MHB4JztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5vdmVyZmxvd1kgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25Db250YWluZXIuc3R5bGUuekluZGV4ID0gJzEwMDAwJztcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lci5zdHlsZS5taW5XaWR0aCA9ICcyMDBweCc7XHJcbiAgICAgICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGU6IGFueSwgaTogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnRleHRDb250ZW50ID0gZmlsZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5wYWRkaW5nID0gJzhweCc7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUuYm9yZGVyQm90dG9tID0gJzFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlciknO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IDApIHsgaXRlbS5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpOyBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0KSc7IH1cclxuICAgICAgICAgICAgICAgIGl0ZW0ub25tb3VzZWVudGVyID0gKCkgPT4geyBpdGVtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnktYWx0KSc7IH07XHJcbiAgICAgICAgICAgICAgICBpdGVtLm9ubW91c2VsZWF2ZSA9ICgpID0+IHsgaWYgKCFpdGVtLmNsYXNzTGlzdC5jb250YWlucygnaXMtc2VsZWN0ZWQnKSkgaXRlbS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndHJhbnNwYXJlbnQnOyB9O1xyXG4gICAgICAgICAgICAgICAgaXRlbS5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gdGFyZ2V0LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZU1hdGNoID0gdGV4dC5zdWJzdHJpbmcoMCwgdGV4dC5sYXN0SW5kZXhPZignW1snKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnZhbHVlID0gYmVmb3JlTWF0Y2ggKyAnW1snICsgZmlsZS5uYW1lICsgJ11dJztcclxuICAgICAgICAgICAgICAgICAgICBjbG9zZVN1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbkNvbnRhaW5lciEuYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHN1Z2dlc3Rpb25Db250YWluZXIpO1xyXG4gICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLmxlZnQgPSBNYXRoLnJvdW5kKHJlY3QubGVmdCkgKyAncHgnO1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9uQ29udGFpbmVyLnN0eWxlLnRvcCA9IE1hdGgucm91bmQocmVjdC50b3AgKyByZWN0LmhlaWdodCkgKyAncHgnO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgbW92ZVN1Z2dlc3Rpb25TZWxlY3Rpb24gPSAoZGlyOiAxIHwgLTEpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFzdWdnZXN0aW9uQ29udGFpbmVyKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShzdWdnZXN0aW9uQ29udGFpbmVyLmNoaWxkcmVuKSBhcyBIVE1MRWxlbWVudFtdO1xyXG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGkgPT4geyBpLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXNlbGVjdGVkJyk7IGkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3RyYW5zcGFyZW50JzsgfSk7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25TZWxlY3RlZEluZGV4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oaXRlbXMubGVuZ3RoIC0gMSwgc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXggKyBkaXIpKTtcclxuICAgICAgICAgICAgY29uc3Qgc2VsID0gaXRlbXNbc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoc2VsKSB7IHNlbC5jbGFzc0xpc3QuYWRkKCdpcy1zZWxlY3RlZCcpOyBzZWwuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJzsgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgY2hvb3NlQ3VycmVudFN1Z2dlc3Rpb24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghc3VnZ2VzdGlvbkNvbnRhaW5lciB8fCAhc3VnZ2VzdGlvblRhcmdldCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20oc3VnZ2VzdGlvbkNvbnRhaW5lci5jaGlsZHJlbikgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICAgICAgY29uc3Qgc2VsID0gaXRlbXNbc3VnZ2VzdGlvblNlbGVjdGVkSW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoIXNlbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gc2VsLnRleHRDb250ZW50IHx8ICcnO1xyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gc3VnZ2VzdGlvblRhcmdldC52YWx1ZTtcclxuICAgICAgICAgICAgY29uc3QgYmVmb3JlTWF0Y2ggPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxhc3RJbmRleE9mKCdbWycpKTtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvblRhcmdldC52YWx1ZSA9IGJlZm9yZU1hdGNoICsgJ1tbJyArIG5hbWUgKyAnXV0nO1xyXG4gICAgICAgICAgICBjbG9zZVN1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFzdWdnZXN0aW9uQ29udGFpbmVyKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93RG93bicpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBtb3ZlU3VnZ2VzdGlvblNlbGVjdGlvbigxKTsgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0Fycm93VXAnKSB7IGUucHJldmVudERlZmF1bHQoKTsgbW92ZVN1Z2dlc3Rpb25TZWxlY3Rpb24oLTEpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRW50ZXInKSB7IGUucHJldmVudERlZmF1bHQoKTsgY2hvb3NlQ3VycmVudFN1Z2dlc3Rpb24oKTsgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyBjbG9zZVN1Z2dlc3Rpb25zKCk7IH1cclxuICAgICAgICB9LCB7IGNhcHR1cmU6IHRydWUgfSk7XHJcbiAgICAgICAgdGl0bGVJbnB1dC5vbmlucHV0ID0gKCkgPT4geyBzaG93U3VnZ2VzdGlvbnNGb3IodGl0bGVJbnB1dCk7IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ3JlYXRlIGNvbG9yIHN3YXRjaCByb3cgKHdpbGwgYmUgcG9zaXRpb25lZCBiYXNlZCBvbiBzZXR0aW5nKVxyXG4gICAgICAgIGNvbnN0IGNyZWF0ZUNvbG9yUm93ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjb2xvclJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdyBkYXlibGUtY29sb3Itc3dhdGNoZXMtcm93JyB9KTtcclxuICAgICAgICAgICAgY29sb3JSb3cuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3Qgc3dhdGNoZXNDb250YWluZXIgPSBjb2xvclJvdy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtY29sb3Itc3dhdGNoZXMnIH0pO1xyXG4gICAgICAgICAgICBzd2F0Y2hlc0NvbnRhaW5lci5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoZXMnKTtcclxuICAgICAgICAgICAgY29uc3QgZGVmYXVsdFN3YXRjaCA9IHN3YXRjaGVzQ29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1jb2xvci1zd2F0Y2ggZGF5YmxlLWNvbG9yLXN3YXRjaC1ub25lJyB9KTtcclxuICAgICAgICAgICAgZGVmYXVsdFN3YXRjaC5hZGRDbGFzcygnZGItY29sb3Itc3dhdGNoJyk7XHJcbiAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2gudGl0bGUgPSAnTm9uZSAoZGVmYXVsdCknO1xyXG4gICAgICAgICAgICBkZWZhdWx0U3dhdGNoLm9uY2xpY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ29sb3IgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkVGV4dENvbG9yID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1jb2xvci1zd2F0Y2gnKS5mb3JFYWNoKHMgPT4gcy5yZW1vdmVDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRTd2F0Y2guYWRkQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnNlbGVjdGVkQ29sb3IpIGRlZmF1bHRTd2F0Y2guYWRkQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gKHRoaXMgYXMgYW55KS5wbHVnaW4/LnNldHRpbmdzO1xyXG4gICAgICAgICAgICBjb25zdCBidWlsdFN3YXRjaGVzID0gKHNldHRpbmdzPy5zd2F0Y2hlcyA/PyBbXSkubWFwKChzOiBhbnkpID0+ICh7IGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcclxuICAgICAgICAgICAgY29uc3QgY3VzdG9tU3dhdGNoZXMgPSAoc2V0dGluZ3M/LnVzZXJDdXN0b21Td2F0Y2hlcyA/PyBbXSkubWFwKChzOiBhbnkpID0+ICh7IGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIH0pKTtcclxuICAgICAgICAgICAgbGV0IHN3YXRjaGVzOiBBcnJheTx7IGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9PiA9IGJ1aWx0U3dhdGNoZXM7XHJcbiAgICAgICAgICAgIGlmIChzZXR0aW5ncz8uY3VzdG9tU3dhdGNoZXNFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2hlcyA9IGJ1aWx0U3dhdGNoZXMuY29uY2F0KGN1c3RvbVN3YXRjaGVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXN3YXRjaGVzIHx8IHN3YXRjaGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgc3dhdGNoZXMgPSBbJyNlYjNiNWEnLCAnI2ZhODIzMScsICcjZTVhMjE2JywgJyMyMGJmNmInLCAnIzBmYjliMScsICcjMmQ5OGRhJywgJyMzODY3ZDYnLCAnIzU0NTRkMCcsICcjODg1NGQwJywgJyNiNTU0ZDAnLCAnI2U4MzJjMScsICcjZTgzMjg5JywgJyM5NjViM2InLCAnIzgzOTJhNCddLm1hcChjID0+ICh7IGNvbG9yOiBjIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzd2F0Y2hlcy5mb3JFYWNoKCh7IGNvbG9yLCB0ZXh0Q29sb3IgfSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3dhdGNoID0gc3dhdGNoZXNDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWNvbG9yLXN3YXRjaCcgfSk7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2guYWRkQ2xhc3MoJ2RiLWNvbG9yLXN3YXRjaCcpO1xyXG4gICAgICAgICAgICAgICAgc3dhdGNoLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xyXG4gICAgICAgICAgICAgICAgc3dhdGNoLnN0eWxlLmJvcmRlckNvbG9yID0gY29sb3I7XHJcbiAgICAgICAgICAgICAgICBzd2F0Y2gudGl0bGUgPSBjb2xvcjtcclxuICAgICAgICAgICAgICAgIHN3YXRjaC5vbmNsaWNrID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDb2xvciA9IGNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0Q29sb3IgPSB0ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKGNvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWNvbG9yLXN3YXRjaCcpLmZvckVhY2gocyA9PiBzLnJlbW92ZUNsYXNzKCdkYXlibGUtY29sb3Itc3dhdGNoLXNlbGVjdGVkJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3YXRjaC5hZGRDbGFzcygnZGF5YmxlLWNvbG9yLXN3YXRjaC1zZWxlY3RlZCcpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkQ29sb3IgPT09IGNvbG9yKSBzd2F0Y2guYWRkQ2xhc3MoJ2RheWJsZS1jb2xvci1zd2F0Y2gtc2VsZWN0ZWQnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb2xvclJvdztcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCBjb2xvciBzd2F0Y2hlcyB1bmRlciB0aXRsZSBpZiBzZXR0aW5nIHNheXMgc29cclxuICAgICAgICBsZXQgY29sb3JSb3c6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IGNvbG9yU3dhdGNoUG9zID0gKHRoaXMgYXMgYW55KS5wbHVnaW4/LnNldHRpbmdzPy5jb2xvclN3YXRjaFBvc2l0aW9uID8/ICd1bmRlci10aXRsZSc7XHJcbiAgICAgICAgaWYgKGNvbG9yU3dhdGNoUG9zID09PSAndW5kZXItdGl0bGUnKSB7XHJcbiAgICAgICAgICAgIGNvbG9yUm93ID0gY3JlYXRlQ29sb3JSb3coKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgcnVsZVJvdyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdyBkYXlibGUtbW9kYWwtcm93LWNlbnRlcicgfSk7XHJcbiAgICAgICAgcnVsZVJvdy5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XHJcbiAgICAgICAgY29uc3QgY2F0ZWdvcnlMYWJlbCA9IHJ1bGVSb3cuY3JlYXRlRWwoJ2xhYmVsJywgeyB0ZXh0OiAnQ2F0ZWdvcnk6JyB9KTtcclxuICAgICAgICBjYXRlZ29yeUxhYmVsLmFkZENsYXNzKCdkYi1sYWJlbCcpO1xyXG4gICAgICAgIGNhdGVnb3J5TGFiZWwuc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICAgICAgbGV0IHNlbGVjdGVkQ2F0ZWdvcnlJZCA9IHRoaXMuZXY/LmNhdGVnb3J5SWQ7XHJcbiAgICAgICAgY29uc3QgY2F0ZWdvcnlTZWxlY3QgPSBydWxlUm93LmNyZWF0ZUVsKCdzZWxlY3QnLCB7IGNsczogJ2RheWJsZS1pbnB1dCBkYXlibGUtY2F0ZWdvcnktc2VsZWN0JyB9KTtcclxuICAgICAgICBjYXRlZ29yeVNlbGVjdC5hZGRDbGFzcygnZGItc2VsZWN0Jyk7XHJcbiAgICAgICAgY29uc3QgZW1wdHlPcHQgPSBjYXRlZ29yeVNlbGVjdC5jcmVhdGVFbCgnb3B0aW9uJyk7IGVtcHR5T3B0LnZhbHVlPScnOyBlbXB0eU9wdC50ZXh0PSdEZWZhdWx0JztcclxuICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gKHRoaXMgYXMgYW55KS5jYXRlZ29yaWVzIHx8IFtdO1xyXG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaCgoYzogRXZlbnRDYXRlZ29yeSkgPT4geyBjb25zdCBvcHQgPSBjYXRlZ29yeVNlbGVjdC5jcmVhdGVFbCgnb3B0aW9uJyk7IG9wdC52YWx1ZSA9IGMuaWQ7IG9wdC50ZXh0ID0gYy5uYW1lOyB9KTtcclxuICAgICAgICBjYXRlZ29yeVNlbGVjdC52YWx1ZSA9IHNlbGVjdGVkQ2F0ZWdvcnlJZCA/PyAnJztcclxuICAgICAgICBcclxuICAgICAgICBjYXRlZ29yeVNlbGVjdC5vbmNoYW5nZSA9ICgpID0+IHsgXHJcbiAgICAgICAgICAgIHNlbGVjdGVkQ2F0ZWdvcnlJZCA9IGNhdGVnb3J5U2VsZWN0LnZhbHVlIHx8IHVuZGVmaW5lZDsgXHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG11bHRpLWRheSBldmVudFxyXG4gICAgICAgIGNvbnN0IGlzTXVsdGlEYXkgPSB0aGlzLmVuZERhdGUgJiYgdGhpcy5lbmREYXRlICE9PSB0aGlzLmRhdGU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU3RhcnQgdGltZS9kYXRlIHJvd1xyXG4gICAgICAgIGNvbnN0IHJvdzIgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1yb3cnIH0pO1xyXG4gICAgICAgIHJvdzIuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IHJvdzIuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAndGltZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XHJcbiAgICAgICAgc3RhcnRUaW1lLmFkZENsYXNzKCdkYi1pbnB1dCcpO1xyXG4gICAgICAgIHN0YXJ0VGltZS52YWx1ZSA9IHRoaXMuZXY/LnRpbWU/LnNwbGl0KCctJylbMF0gPz8gJyc7XHJcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gcm93Mi5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdkYXRlJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcclxuICAgICAgICBzdGFydERhdGUuYWRkQ2xhc3MoJ2RiLWlucHV0Jyk7XHJcbiAgICAgICAgc3RhcnREYXRlLnZhbHVlID0gdGhpcy5ldj8uZGF0ZSA/PyB0aGlzLmV2Py5zdGFydERhdGUgPz8gdGhpcy5kYXRlID8/ICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuZCB0aW1lL2RhdGUgcm93IChvbmx5IGZvciBtdWx0aS1kYXkgZXZlbnRzKVxyXG4gICAgICAgIGxldCBlbmRUaW1lOiBIVE1MSW5wdXRFbGVtZW50IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgIGxldCBlbmREYXRlSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgaWYgKGlzTXVsdGlEYXkpIHtcclxuICAgICAgICAgICAgY29uc3Qgcm93MyA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLXJvdycgfSk7XHJcbiAgICAgICAgICAgIHJvdzMuYWRkQ2xhc3MoJ2RiLW1vZGFsLXJvdycpO1xyXG4gICAgICAgICAgICBlbmRUaW1lID0gcm93My5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICd0aW1lJywgY2xzOiAnZGF5YmxlLWlucHV0JyB9KTtcclxuICAgICAgICAgICAgZW5kVGltZS5hZGRDbGFzcygnZGItaW5wdXQnKTtcclxuICAgICAgICAgICAgZW5kVGltZS52YWx1ZSA9IHRoaXMuZXY/LnRpbWU/LnNwbGl0KCctJylbMV0gPz8gJyc7XHJcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dCA9IHJvdzMuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnZGF0ZScsIGNsczogJ2RheWJsZS1pbnB1dCcgfSk7XHJcbiAgICAgICAgICAgIGVuZERhdGVJbnB1dC5hZGRDbGFzcygnZGItaW5wdXQnKTtcclxuICAgICAgICAgICAgZW5kRGF0ZUlucHV0LnZhbHVlID0gdGhpcy5lbmREYXRlID8/ICcnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBkZXNjSW5wdXQgPSBjLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHsgY2xzOiAnZGF5YmxlLXRleHRhcmVhJywgYXR0cjogeyBwbGFjZWhvbGRlcjogJ0Rlc2NyaXB0aW9uJyB9IH0pO1xyXG4gICAgICAgIGRlc2NJbnB1dC5hZGRDbGFzcygnZGItdGV4dGFyZWEnKTtcclxuICAgICAgICBkZXNjSW5wdXQudmFsdWUgPSB0aGlzLmV2Py5kZXNjcmlwdGlvbiA/PyAnJztcclxuICAgICAgICBcclxuICAgICAgICBkZXNjSW5wdXQub25pbnB1dCA9ICgpID0+IHsgc2hvd1N1Z2dlc3Rpb25zRm9yKGRlc2NJbnB1dCk7IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWRkIGNvbG9yIHN3YXRjaGVzIHVuZGVyIGRlc2NyaXB0aW9uIGlmIHNldHRpbmcgc2F5cyBzb1xyXG4gICAgICAgIGlmIChjb2xvclN3YXRjaFBvcyA9PT0gJ3VuZGVyLWRlc2NyaXB0aW9uJykge1xyXG4gICAgICAgICAgICBjb2xvclJvdyA9IGNyZWF0ZUNvbG9yUm93KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLWZvb3RlcicgfSk7XHJcbiAgICAgICAgZm9vdGVyLmFkZENsYXNzKCdkYi1tb2RhbC1mb290ZXInKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIG9uIGxlZnQgKG9ubHkgZm9yIGV4aXN0aW5nIGV2ZW50cylcclxuICAgICAgICBpZiAodGhpcy5ldikge1xyXG4gICAgICAgICAgICBjb25zdCBkZWwgPSBmb290ZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtZGVsZXRlJyB9KTtcclxuICAgICAgICAgICAgZGVsLmFkZENsYXNzKCdkYi1idG4nKTtcclxuICAgICAgICAgICAgc2V0SWNvbihkZWwsICd0cmFzaC0yJyk7XHJcbiAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5vbkRlbGV0ZSgpLnRoZW4oKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2FuY2VsIGFuZCBTYXZlIGJ1dHRvbnMgb24gcmlnaHRcclxuICAgICAgICBjb25zdCByaWdodEJ1dHRvbnMgPSBmb290ZXIuY3JlYXRlRGl2KHsgY2xzOiAnZGF5YmxlLW1vZGFsLWZvb3Rlci1yaWdodCcgfSk7XHJcbiAgICAgICAgcmlnaHRCdXR0b25zLmFkZENsYXNzKCdkYi1tb2RhbC1mb290ZXItcmlnaHQnKTtcclxuICAgICAgICBjb25zdCBjYW5jZWwgPSByaWdodEJ1dHRvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYXlibGUtY2FuY2VsJyB9KTtcclxuICAgICAgICBjYW5jZWwuYWRkQ2xhc3MoJ2RiLWJ0bicpO1xyXG4gICAgICAgIGNhbmNlbC50ZXh0Q29udGVudCA9ICdDYW5jZWwnO1xyXG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIGNvbnN0IG9rID0gcmlnaHRCdXR0b25zLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGF5YmxlLXNhdmUgbW9kLWN0YScgfSk7XHJcbiAgICAgICAgb2suYWRkQ2xhc3MoJ2RiLWJ0bicpO1xyXG4gICAgICAgIG9rLnRleHRDb250ZW50ID0gJ1NhdmUgRXZlbnQnO1xyXG4gICAgICAgIG9rLm9uY2xpY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQ6IFBhcnRpYWw8RGF5YmxlRXZlbnQ+ID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZGVzY0lucHV0LnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogdGhpcy5pY29uLFxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlJZDogc2VsZWN0ZWRDYXRlZ29yeUlkLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6IHRoaXMuc2VsZWN0ZWRDb2xvcixcclxuICAgICAgICAgICAgICAgIHRleHRDb2xvcjogdGhpcy5zZWxlY3RlZFRleHRDb2xvclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoIXBheWxvYWQuY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdHJpZ2dlcnMgPSAodGhpcyBhcyBhbnkpLnBsdWdpbj8uc2V0dGluZ3M/LnRyaWdnZXJzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdHh0ID0gKChwYXlsb2FkLnRpdGxlIHx8ICcnKSArICcgJyArIChwYXlsb2FkLmRlc2NyaXB0aW9uIHx8ICcnKSkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gdHJpZ2dlcnMuZmluZCgodDogYW55KSA9PiAodC5wYXR0ZXJuIHx8ICcnKS50b0xvd2VyQ2FzZSgpICYmIHR4dC5pbmNsdWRlcygodC5wYXR0ZXJuIHx8ICcnKS50b0xvd2VyQ2FzZSgpKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQgJiYgZm91bmQuY2F0ZWdvcnlJZCkgcGF5bG9hZC5jYXRlZ29yeUlkID0gZm91bmQuY2F0ZWdvcnlJZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGlzTXVsdGlEYXkgJiYgZW5kVGltZSAmJiBlbmREYXRlSW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIC8vIE11bHRpLWRheSBldmVudFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lVmFsID0gc3RhcnRUaW1lLnZhbHVlIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5kVGltZVZhbCA9IGVuZFRpbWUudmFsdWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnRpbWUgPSAoc3RhcnRUaW1lVmFsICYmIGVuZFRpbWVWYWwpID8gYCR7c3RhcnRUaW1lVmFsfS0ke2VuZFRpbWVWYWx9YCA6IChzdGFydFRpbWVWYWwgfHwgJycpO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5zdGFydERhdGUgPSBzdGFydERhdGUudmFsdWUgfHwgdGhpcy5ldj8uc3RhcnREYXRlIHx8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIHBheWxvYWQuZW5kRGF0ZSA9IGVuZERhdGVJbnB1dC52YWx1ZSB8fCB0aGlzLmV2Py5lbmREYXRlIHx8IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFNpbmdsZSBkYXkgZXZlbnRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZVZhbCA9IHN0YXJ0VGltZS52YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuZFRpbWVWYWwgPSBlbmRUaW1lPy52YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgICAgIHBheWxvYWQudGltZSA9IChzdGFydFRpbWVWYWwgJiYgZW5kVGltZVZhbCkgPyBgJHtzdGFydFRpbWVWYWx9LSR7ZW5kVGltZVZhbH1gIDogKHN0YXJ0VGltZVZhbCB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmYWxsYmFja0RhdGUgPSB0aGlzLmV2Py5kYXRlIHx8IHRoaXMuZXY/LnN0YXJ0RGF0ZSB8fCB0aGlzLmRhdGUgfHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5kYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcclxuICAgICAgICAgICAgICAgIHBheWxvYWQuc3RhcnREYXRlID0gc3RhcnREYXRlLnZhbHVlIHx8IGZhbGxiYWNrRGF0ZTtcclxuICAgICAgICAgICAgICAgIHBheWxvYWQuZW5kRGF0ZSA9IHN0YXJ0RGF0ZS52YWx1ZSB8fCBmYWxsYmFja0RhdGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRGF5YmxlXSBTdWJtaXR0aW5nIGV2ZW50OicsIHBheWxvYWQpO1xyXG4gICAgICAgICAgICBQcm9taXNlLnJlc29sdmUodGhpcy5vblN1Ym1pdChwYXlsb2FkKSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0RheWJsZV0gRXZlbnQgc2F2ZWQsIGNsb3NpbmcgbW9kYWwnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbRGF5YmxlXSBFcnJvciBzYXZpbmcgZXZlbnQ6JywgZSk7XHJcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCdFcnJvciBzYXZpbmcgZXZlbnQ6ICcgKyAoZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLy8gUHJldmVudCBtb2RhbCBvcGVuIHdoZW4gY2xpY2tpbmcgbWFya2Rvd24gbGlua3MgaW5zaWRlIGV2ZW50IGl0ZW1zOyBvcGVuIG5vdGUgaW4gbmV3IHRhYlxyXG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcclxuICAgICAgICAgICAgaWYgKHdpa2kpIHtcclxuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBJY29uUGlja2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQ7XHJcbiAgICBvblJlbW92ZT86ICgpID0+IHZvaWQ7XHJcbiAgICBhbGxJY29uczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvblBpY2s6IChpY29uOiBzdHJpbmcpID0+IHZvaWQsIG9uUmVtb3ZlPzogKCkgPT4gdm9pZCkgeyBzdXBlcihhcHApOyB0aGlzLm9uUGljayA9IG9uUGljazsgdGhpcy5vblJlbW92ZSA9IG9uUmVtb3ZlOyB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsO1xyXG4gICAgICAgIGMuZW1wdHkoKTtcclxuICAgICAgICBjLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgYy5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XHJcbiAgICAgICAgYy5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XHJcbiAgICAgICAgYy5hZGRDbGFzcygnZGItbW9kYWwnKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBzZWFyY2hSb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1tb2RhbC1yb3cnIH0pO1xyXG4gICAgICAgIHNlYXJjaFJvdy5hZGRDbGFzcygnZGItbW9kYWwtcm93Jyk7XHJcbiAgICAgICAgc2VhcmNoUm93LnN0eWxlLm1hcmdpblRvcCA9ICc4cHgnO1xyXG4gICAgICAgIGNvbnN0IHNlYXJjaElucHV0ID0gc2VhcmNoUm93LmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ3RleHQnLCBjbHM6ICdkYXlibGUtaW5wdXQnLCBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnU2VhcmNoIGljb25zJyB9IH0pO1xyXG4gICAgICAgIHNlYXJjaElucHV0LmFkZENsYXNzKCdkYi1pbnB1dCcpO1xyXG4gICAgICAgIHNlYXJjaElucHV0LnN0eWxlLmZsZXhHcm93ID0gJzEnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGxpc3QgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS1pY29uLWxpc3QnIH0pO1xyXG4gICAgICAgIGxpc3QuYWRkQ2xhc3MoJ2RiLWljb24tbGlzdCcpO1xyXG4gICAgICAgIGxpc3Quc3R5bGUuZmxleCA9ICcxJztcclxuICAgICAgICBsaXN0LnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcclxuICAgICAgICBsaXN0LnN0eWxlLmRpc3BsYXkgPSAnZ3JpZCc7XHJcbiAgICAgICAgbGlzdC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gJ3JlcGVhdChhdXRvLWZpbGwsIG1pbm1heCg0MHB4LCAxZnIpKSc7XHJcbiAgICAgICAgbGlzdC5zdHlsZS5nYXAgPSAnNHB4JztcclxuICAgICAgICBsaXN0LnN0eWxlLm1hcmdpblRvcCA9ICc4cHgnO1xyXG4gICAgICAgIGNvbnN0IG5vbmVCdG4gPSBsaXN0LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1pY29uLWJ0bicsIGF0dHI6IHsgdGl0bGU6ICdOb25lJyB9IH0pO1xyXG4gICAgICAgIG5vbmVCdG4uYWRkQ2xhc3MoJ2RiLWljb24tYnRuJyk7XHJcbiAgICAgICAgbm9uZUJ0bi5zdHlsZS5wYWRkaW5nID0gJzZweCc7XHJcbiAgICAgICAgbm9uZUJ0bi50ZXh0Q29udGVudCA9ICfigJQnO1xyXG4gICAgICAgIG5vbmVCdG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5vblBpY2soJycpOyB0aGlzLmNsb3NlKCk7IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRm9vdGVyIHdpdGggcmVtb3ZlIGJ1dHRvblxyXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGMuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgZm9vdGVyLmFkZENsYXNzKCdkYi1tb2RhbC1mb290ZXInKTtcclxuICAgICAgICBmb290ZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICBmb290ZXIuc3R5bGUubWFyZ2luVG9wID0gJ2F1dG8nO1xyXG4gICAgICAgIGZvb3Rlci5zdHlsZS5wYWRkaW5nVG9wID0gJzhweCc7XHJcbiAgICAgICAgZm9vdGVyLnN0eWxlLmJvcmRlclRvcCA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcclxuICAgICAgICBjb25zdCByZW1vdmVCdG4gPSBmb290ZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicsIHRleHQ6ICdSZW1vdmUgSWNvbicgfSk7XHJcbiAgICAgICAgcmVtb3ZlQnRuLmFkZENsYXNzKCdkYi1idG4nKTtcclxuICAgICAgICByZW1vdmVCdG4uc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICByZW1vdmVCdG4uc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xyXG4gICAgICAgIHJlbW92ZUJ0bi5zdHlsZS5nYXAgPSAnNHB4JztcclxuICAgICAgICBjb25zdCByZW1vdmVJY29uID0gcmVtb3ZlQnRuLmNyZWF0ZURpdigpO1xyXG4gICAgICAgIHNldEljb24ocmVtb3ZlSWNvbiwgJ3gnKTtcclxuICAgICAgICByZW1vdmVJY29uLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWZsZXgnO1xyXG4gICAgICAgIHJlbW92ZUJ0bi5vbmNsaWNrID0gKCkgPT4geyBpZiAodGhpcy5vblJlbW92ZSkgdGhpcy5vblJlbW92ZSgpOyB0aGlzLmNsb3NlKCk7IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gTG9hZCBpY29ucyBsYXppbHlcclxuICAgICAgICBpZiAoIXRoaXMuYWxsSWNvbnMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsSWNvbnMgPSBnZXRJY29uSWRzU2FmZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBsZXQgZmlsdGVyZWQgPSB0aGlzLmFsbEljb25zLnNsaWNlKDAsIDk1KTsgLy8gT25seSBzaG93IGZpcnN0IDEwMCBpbml0aWFsbHlcclxuICAgICAgICBsZXQgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoaWNvbnM6IHN0cmluZ1tdKSA9PiB7XHJcbiAgICAgICAgICAgIGxpc3QuZW1wdHkoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9uZUJ0bjIgPSBsaXN0LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1pY29uLWJ0bicsIGF0dHI6IHsgdGl0bGU6ICdOb25lJyB9IH0pO1xyXG4gICAgICAgICAgICBub25lQnRuMi5hZGRDbGFzcygnZGItaWNvbi1idG4nKTtcclxuICAgICAgICAgICAgbm9uZUJ0bjIuc3R5bGUucGFkZGluZyA9ICc2cHgnO1xyXG4gICAgICAgICAgICBub25lQnRuMi50ZXh0Q29udGVudCA9ICfigJQnO1xyXG4gICAgICAgICAgICBub25lQnRuMi5vbmNsaWNrID0gKCkgPT4geyB0aGlzLm9uUGljaygnJyk7IHRoaXMuY2xvc2UoKTsgfTtcclxuICAgICAgICAgICAgaWNvbnMuc2xpY2UoMCwgMjAwKS5mb3JFYWNoKGlkID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJ0biA9IGxpc3QuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWljb24tYnRuJyB9KTtcclxuICAgICAgICAgICAgICAgIGJ0bi5hZGRDbGFzcygnZGItaWNvbi1idG4nKTtcclxuICAgICAgICAgICAgICAgIGJ0bi5zdHlsZS5wYWRkaW5nID0gJzZweCc7XHJcbiAgICAgICAgICAgICAgICBidG4udGl0bGUgPSBpZDtcclxuICAgICAgICAgICAgICAgIHNldEljb24oYnRuLCBpZCk7XHJcbiAgICAgICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHsgdGhpcy5vblBpY2soaWQpOyB0aGlzLmNsb3NlKCk7IH07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgYXBwbHlGaWx0ZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHEgPSAoc2VhcmNoSW5wdXQudmFsdWUgfHwgJycpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICghcSkge1xyXG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5zbGljZSgwLCAxNTApO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZnVsbEZpbHRlcmVkID0gdGhpcy5hbGxJY29ucy5maWx0ZXIoaWQgPT4gaWQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVuZGVyTGlzdChmdWxsRmlsdGVyZWQpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgc2VhcmNoSW5wdXQub25pbnB1dCA9IGFwcGx5RmlsdGVyO1xyXG4gICAgICAgIHJlbmRlckxpc3QoZmlsdGVyZWQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBQcm9tcHRTZWFyY2hNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICAgIHZpZXc6IERheWJsZUNhbGVuZGFyVmlldztcclxuICAgIHF1ZXJ5OiBzdHJpbmcgPSAnJztcclxuICAgIHJlc3VsdHM6IERheWJsZUV2ZW50W10gPSBbXTtcclxuICAgIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IDA7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgdmlldzogRGF5YmxlQ2FsZW5kYXJWaWV3KSB7IHN1cGVyKGFwcCk7IHRoaXMudmlldyA9IHZpZXc7IH1cclxuICAgIG9uT3BlbigpIHtcclxuICAgICAgICBjb25zdCByb290ID0gdGhpcy5jb250ZW50RWw7XHJcbiAgICAgICAgcm9vdC5lbXB0eSgpO1xyXG4gICAgICAgIHRyeSB7ICh0aGlzLm1vZGFsRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBhZGRpbmcgPSAnMCc7ICh0aGlzLm1vZGFsRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLm1hcmdpbiA9ICcwJzsgfSBjYXRjaCB7fVxyXG4gICAgICAgIHRyeSB7IChyb290IGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wYWRkaW5nID0gJzAnOyAocm9vdCBhcyBIVE1MRWxlbWVudCkuc3R5bGUubWFyZ2luID0gJzAnOyB9IGNhdGNoIHt9XHJcbiAgICAgICAgY29uc3QgaW5wdXRXcmFwID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICdwcm9tcHQtaW5wdXQtY29udGFpbmVyJyB9KTtcclxuICAgICAgICB0cnkgeyAoaW5wdXRXcmFwIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wYWRkaW5nID0gJzAnOyAoaW5wdXRXcmFwIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5tYXJnaW4gPSAnMCc7IH0gY2F0Y2gge31cclxuICAgICAgICBjb25zdCBpbnB1dCA9IGlucHV0V3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IGNsczogJ3Byb21wdC1pbnB1dCcsIGF0dHI6IHsgYXV0b2NhcGl0YWxpemU6ICdvZmYnLCBzcGVsbGNoZWNrOiAnZmFsc2UnLCBlbnRlcmtleWhpbnQ6ICdkb25lJywgdHlwZTogJ3RleHQnLCBwbGFjZWhvbGRlcjogJ0ZpbmQgZXZlbnRzLi4uJyB9IH0pO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHNFbCA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAncHJvbXB0LXJlc3VsdHMnIH0pO1xyXG4gICAgICAgIHRyeSB7IChyZXN1bHRzRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBhZGRpbmcgPSAnMCc7IChyZXN1bHRzRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLm1hcmdpbiA9ICcwJzsgfSBjYXRjaCB7fVxyXG4gICAgICAgIGNvbnN0IHJlbmRlciA9ICgpID0+IHtcclxuICAgICAgICAgICAgcmVzdWx0c0VsLmVtcHR5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5yZXN1bHRzO1xyXG4gICAgICAgICAgICBpZiAoIWl0ZW1zLmxlbmd0aCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKChldiwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gcmVzdWx0c0VsLmNyZWF0ZURpdih7IGNsczogJ3N1Z2dlc3Rpb24taXRlbSBtb2QtY29tcGxleCcgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gdGhpcy5zZWxlY3RlZEluZGV4KSByb3cuYWRkQ2xhc3MoJ2lzLXNlbGVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICByb3cub25tb3VzZWVudGVyID0gKCkgPT4geyB0aGlzLnNlbGVjdGVkSW5kZXggPSBpOyByZW5kZXIoKTsgfTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiAnc3VnZ2VzdGlvbi1jb250ZW50JyB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gY29udGVudC5jcmVhdGVEaXYoeyBjbHM6ICdzdWdnZXN0aW9uLXRpdGxlJyB9KTtcclxuICAgICAgICAgICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gZXYudGl0bGUgfHwgJyh1bnRpdGxlZCknO1xyXG4gICAgICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiB0aGlzLmNob29zZShpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCB1cGRhdGUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHEgPSAoaW5wdXQudmFsdWUgfHwgJycpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIHRoaXMucXVlcnkgPSBxO1xyXG4gICAgICAgICAgICBjb25zdCBhbGwgPSB0aGlzLnZpZXcuZXZlbnRzLnNsaWNlKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzdWx0cyA9IGFsbC5maWx0ZXIoZSA9PiAoKGUudGl0bGUgfHwgJycpICsgJyAnICsgKGUuZGVzY3JpcHRpb24gfHwgJycpKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpKS5zbGljZSgwLCA1MCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIHJlbmRlcigpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3Qgb25LZXkgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdBcnJvd0Rvd24nKSB7IHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWluKHRoaXMucmVzdWx0cy5sZW5ndGggLSAxLCB0aGlzLnNlbGVjdGVkSW5kZXggKyAxKTsgcmVuZGVyKCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0Fycm93VXAnKSB7IHRoaXMuc2VsZWN0ZWRJbmRleCA9IE1hdGgubWF4KDAsIHRoaXMuc2VsZWN0ZWRJbmRleCAtIDEpOyByZW5kZXIoKTsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5ID09PSAnRW50ZXInKSB7IHRoaXMuY2hvb3NlKHRoaXMuc2VsZWN0ZWRJbmRleCk7IGUucHJldmVudERlZmF1bHQoKTsgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHsgdGhpcy5jbG9zZSgpOyBlLnByZXZlbnREZWZhdWx0KCk7IH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIGlucHV0Lm9uaW5wdXQgPSB1cGRhdGU7XHJcbiAgICAgICAgaW5wdXQub25rZXlkb3duID0gb25LZXk7XHJcbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICB1cGRhdGUoKTtcclxuICAgIH1cclxuICAgIGNob29zZShpZHg6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGV2ID0gdGhpcy5yZXN1bHRzW2lkeF07XHJcbiAgICAgICAgaWYgKCFldikgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IGRhdGVTdHIgPSBldi5kYXRlIHx8IGV2LnN0YXJ0RGF0ZTtcclxuICAgICAgICBpZiAoZGF0ZVN0cikge1xyXG4gICAgICAgICAgICBjb25zdCBbeSwgbSwgZF0gPSBkYXRlU3RyLnNwbGl0KCctJykubWFwKE51bWJlcik7XHJcbiAgICAgICAgICAgIHRoaXMudmlldy5jdXJyZW50RGF0ZSA9IG5ldyBEYXRlKHksIChtIHx8IDEpIC0gMSwgZCB8fCAxKTtcclxuICAgICAgICAgICAgdGhpcy52aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gQXJyYXkuZnJvbSh0aGlzLnZpZXcuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChgLmRheWJsZS1ldmVudFtkYXRhLWlkPVwiJHtldi5pZH1cIl1gKSkgYXMgSFRNTEVsZW1lbnRbXTtcclxuICAgICAgICAgICAgICAgIGlmIChub2Rlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gbm9kZXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgdGFyZ2V0LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnLCBibG9jazogJ2NlbnRlcicsIGlubGluZTogJ25lYXJlc3QnIH0pOyB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMuZm9yRWFjaChuID0+IG4uY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWhpZ2hsaWdodCcpKTtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgbm9kZXMuZm9yRWFjaChuID0+IG4uY2xhc3NMaXN0LnJlbW92ZSgnZGF5YmxlLWV2ZW50LWhpZ2hsaWdodCcpKTsgfSwgMjAwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFRvZGF5TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBkYXRlOiBzdHJpbmc7XHJcbiAgICBldmVudHM6IERheWJsZUV2ZW50W107XHJcbiAgICB2aWV3PzogRGF5YmxlQ2FsZW5kYXJWaWV3O1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgZGF0ZTogc3RyaW5nLCBldmVudHM6IERheWJsZUV2ZW50W10sIHZpZXc/OiBEYXlibGVDYWxlbmRhclZpZXcpIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5ldmVudHMgPSBldmVudHM7XHJcbiAgICAgICAgdGhpcy52aWV3ID0gdmlldztcclxuICAgIH1cclxuICAgIFxyXG4gICAgb25PcGVuKCkge1xyXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDtcclxuICAgICAgICBjLmVtcHR5KCk7XHJcbiAgICAgICAgYy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgIGMuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nO1xyXG4gICAgICAgIGMuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xyXG4gICAgICAgIGMuYWRkQ2xhc3MoJ2RiLW1vZGFsJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUGFyc2UgZGF0ZVxyXG4gICAgICAgIGNvbnN0IFt5ZWFyLCBtb250aCwgZGF5XSA9IHRoaXMuZGF0ZS5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xyXG4gICAgICAgIGNvbnN0IGRhdGVPYmogPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCAtIDEsIGRheSk7XHJcbiAgICAgICAgY29uc3QgbW9udGhOYW1lcyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddO1xyXG4gICAgICAgIGNvbnN0IG1vbnRoTmFtZSA9IG1vbnRoTmFtZXNbZGF0ZU9iai5nZXRNb250aCgpXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBUaXRsZSB3aXRoIGRhdGVcclxuICAgICAgICBjb25zdCB0aXRsZSA9IGMuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBgJHttb250aE5hbWV9ICR7ZGF5fWAgfSk7XHJcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XHJcbiAgICAgICAgdGl0bGUuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEdldCBldmVudHMgZm9yIHRoaXMgZGF0ZVxyXG4gICAgICAgIGNvbnN0IGRheUV2ZW50cyA9IHRoaXMuZXZlbnRzLmZpbHRlcihlID0+IGUuZGF0ZSA9PT0gdGhpcy5kYXRlKS5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWVBID0gYS50aW1lID8gYS50aW1lLnNwbGl0KCctJylbMF0gOiAnOTk6OTknO1xyXG4gICAgICAgICAgICBjb25zdCB0aW1lQiA9IGIudGltZSA/IGIudGltZS5zcGxpdCgnLScpWzBdIDogJzk5Ojk5JztcclxuICAgICAgICAgICAgcmV0dXJuIHRpbWVBLmxvY2FsZUNvbXBhcmUodGltZUIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEV2ZW50cyBjb250YWluZXIgKHNjcm9sbGFibGUpXHJcbiAgICAgICAgY29uc3QgZXZlbnRzQ29udGFpbmVyID0gYy5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnRzLWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLmFkZENsYXNzKCdkYi1ldmVudHMtY29udGFpbmVyJyk7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLmZsZXggPSAnMSc7XHJcbiAgICAgICAgZXZlbnRzQ29udGFpbmVyLnN0eWxlLm92ZXJmbG93WSA9ICdhdXRvJztcclxuICAgICAgICBldmVudHNDb250YWluZXIuc3R5bGUubWFyZ2luQm90dG9tID0gJzEycHgnO1xyXG4gICAgICAgIGV2ZW50c0NvbnRhaW5lci5zdHlsZS5wYWRkaW5nUmlnaHQgPSAnOHB4JztcclxuICAgICAgICBcclxuICAgICAgICBpZiAoZGF5RXZlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBldmVudHNDb250YWluZXIuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdObyBldmVudHMgZm9yIHRoaXMgZGF5JyB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChldiA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBjLmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS1ldmVudC1yb3cnIH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYi10b2RheS1yb3cnKTtcclxuICAgICAgICAgICAgICAgIHJvdy5zZXRBdHRyaWJ1dGUoJ2RyYWdnYWJsZScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICByb3cuZGF0YXNldC5pZCA9IGV2LmlkO1xyXG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzEycHgnO1xyXG4gICAgICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxMnB4JztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5wYWRkaW5nID0gJzhweCc7XHJcbiAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeS1hbHQpJztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcclxuICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50RWwgPSByb3cuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgICAgICBjb250ZW50RWwuc3R5bGUuZmxleCA9ICcxJztcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICAgICAgY29udGVudEVsLnN0eWxlLmZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJztcclxuICAgICAgICAgICAgICAgIGNvbnRlbnRFbC5zdHlsZS5nYXAgPSAnNHB4JztcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGVFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtdGl0bGUnIH0pO1xyXG4gICAgICAgICAgICAgICAgdGl0bGVFbC5hZGRDbGFzcygnZGItdGl0bGUnKTtcclxuICAgICAgICAgICAgICAgIHRpdGxlRWwuc3R5bGUuZm9udFdlaWdodCA9ICc1MDAnO1xyXG4gICAgICAgICAgICAgICAgdGl0bGVFbC5zdHlsZS5jb2xvciA9IGV2LmNvbG9yID8gKGV2LnRleHRDb2xvciB8fCAndmFyKC0tdGV4dC1ub3JtYWwpJykgOiAndmFyKC0tdGV4dC1ub3JtYWwpJztcclxuICAgICAgICAgICAgICAgIHJlbmRlck1hcmtkb3duKGV2LnRpdGxlIHx8ICcnLCB0aXRsZUVsLCB0aGlzLnZpZXc/LnBsdWdpbj8uYXBwKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgZXZlbnQgY29sb3JzIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy52aWV3Py5wbHVnaW47XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gcGx1Z2luPy5zZXR0aW5ncz8uZXZlbnRDYXRlZ29yaWVzID8/IFtdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBjYXRlZ29yaWVzLmZpbmQoYyA9PiBjLmlkID09PSBldi5jYXRlZ29yeUlkKTtcclxuICAgICAgICAgICAgICAgIGxldCBiZ0NvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGV4dENvbG9yID0gJyc7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXYuY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gZXYuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbG9yID0gZXYudGV4dENvbG9yIHx8IGNob29zZVRleHRDb2xvcihldi5jb2xvcik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNhdGVnb3J5ICYmIGNhdGVnb3J5LmJnQ29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBiZ0NvbG9yID0gY2F0ZWdvcnkuYmdDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29sb3IgPSBjYXRlZ29yeS50ZXh0Q29sb3I7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYmdDb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBwbHVnaW4/LnNldHRpbmdzPy5ldmVudEJnT3BhY2l0eSA/PyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJnYmFDb2xvciA9IGhleFRvUmdiYShiZ0NvbG9yLCBvcGFjaXR5KTtcclxuICAgICAgICAgICAgICAgICAgICByb3cuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcmdiYUNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlRWwuc3R5bGUuY29sb3IgPSB0ZXh0Q29sb3IgfHwgdGl0bGVFbC5zdHlsZS5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICByb3cuY2xhc3NMaXN0LmFkZCgnZGF5YmxlLWV2ZW50LWNvbG9yZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5lZmZlY3QgJiYgY2F0ZWdvcnkuZWZmZWN0ICE9PSAnJykgcm93LmFkZENsYXNzKGBkYXlibGUtZWZmZWN0LSR7Y2F0ZWdvcnkuZWZmZWN0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9ubHlUb2RheSA9IHBsdWdpbj8uc2V0dGluZ3M/Lm9ubHlBbmltYXRlVG9kYXkgPz8gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LmFuaW1hdGlvbiAmJiBjYXRlZ29yeS5hbmltYXRpb24gIT09ICcnICYmICghb25seVRvZGF5IHx8IHRydWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb259YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5hbmltYXRpb24yICYmIGNhdGVnb3J5LmFuaW1hdGlvbjIgIT09ICcnICYmICghb25seVRvZGF5IHx8IHRydWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5hZGRDbGFzcyhgZGF5YmxlLWFuaW0tJHtjYXRlZ29yeS5hbmltYXRpb24yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUVsID0gcm93LmNyZWF0ZURpdih7IGNsczogJ2RheWJsZS10b2RheS10aW1lJyB9KTtcclxuICAgICAgICAgICAgICAgIHRpbWVFbC5hZGRDbGFzcygnZGItdGltZScpO1xyXG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLm1pbldpZHRoID0gJzYwcHgnO1xyXG4gICAgICAgICAgICAgICAgdGltZUVsLnN0eWxlLmZvbnRXZWlnaHQgPSAnNjAwJztcclxuICAgICAgICAgICAgICAgIC8vIE1hdGNoIGV2ZW50IHRpdGxlIGNvbG9yXHJcbiAgICAgICAgICAgICAgICB0aW1lRWwuc3R5bGUuY29sb3IgPSB0aXRsZUVsLnN0eWxlLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZtdCA9IHRoaXMudmlldz8ucGx1Z2luPy5zZXR0aW5ncz8udGltZUZvcm1hdCA/PyAnMjRoJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFZhbCA9IGV2LnRpbWUgPyBldi50aW1lLnNwbGl0KCctJylbMF0gOiAnJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNwID0gZm9ybWF0VGltZVZhbHVlKHN0YXJ0VmFsLCBmbXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVFbC50ZXh0Q29udGVudCA9IGRpc3AgfHwgJ+KAlCc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChldi5kZXNjcmlwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6ICdkYXlibGUtdG9kYXktZXZlbnQtZGVzYycgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLmFkZENsYXNzKCdkYi1kZXNjJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY0VsLnN0eWxlLmZvbnRTaXplID0gJzAuOWVtJztcclxuICAgICAgICAgICAgICAgICAgICAvLyBNYXRjaCB0aXRsZSBjb2xvclxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NFbC5zdHlsZS5jb2xvciA9IHRpdGxlRWwuc3R5bGUuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyTWFya2Rvd24oZXYuZGVzY3JpcHRpb24sIGRlc2NFbCwgdGhpcy52aWV3Py5wbHVnaW4/LmFwcCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIE9wdGlvbmFsIGNvbXBsZXRlZCBpbmRpY2F0b3JcclxuICAgICAgICAgICAgICAgIGlmIChldi5jb21wbGV0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWhhdmlvciA9IHRoaXMudmlldz8ucGx1Z2luPy5zZXR0aW5ncz8uY29tcGxldGVCZWhhdmlvciA/PyAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJlaGF2aW9yID09PSAnZGltJykgcm93LnN0eWxlLm9wYWNpdHkgPSAnMC42JztcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChiZWhhdmlvciA9PT0gJ3N0cmlrZXRocm91Z2gnKSB0aXRsZUVsLnN0eWxlLnRleHREZWNvcmF0aW9uID0gJ2xpbmUtdGhyb3VnaCc7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoYmVoYXZpb3IgPT09ICdoaWRlJykgcm93LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xyXG4gICAgICAgICAgICAgICAgLy8gRHJhZyBoYW5kbGVycyBmb3IgcmVvcmRlcmluZ1xyXG4gICAgICAgICAgICAgICAgcm93Lm9uZHJhZ3N0YXJ0ID0gZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCBldi5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2Zlcik/LnNldERhdGEoJ2RheWJsZS1zb3VyY2UnLCd0b2RheScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdJbWcgPSByb3cuY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50b3AgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmxlZnQgPSAnLTEwMDAwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLm9wYWNpdHkgPSAnMSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnSW1nLnN0eWxlLmhlaWdodCA9IGAke3JlY3QuaGVpZ2h0fXB4YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0ltZy5zdHlsZS50cmFuc2Zvcm0gPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdJbWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gZ2V0Q29tcHV0ZWRTdHlsZShyb3cpLmJvcmRlclJhZGl1cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSW1nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERyYWdJbWFnZShkcmFnSW1nLCBNYXRoLm1pbig4LCByZWN0LndpZHRoIC8gNCksIE1hdGgubWluKDgsIHJlY3QuaGVpZ2h0IC8gNCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAocm93IGFzIGFueSkuX19kcmFnSW1nID0gZHJhZ0ltZztcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmFkZENsYXNzKCdkYXlibGUtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcmFnZW5kID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5yZW1vdmVDbGFzcygnZGF5YmxlLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGkgPSAocm93IGFzIGFueSkuX19kcmFnSW1nIGFzIEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaSAmJiBkaS5wYXJlbnRFbGVtZW50KSBkaS5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAocm93IGFzIGFueSkuX19kcmFnSW1nID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIC8vIENsaWNrIHRvIGVkaXRcclxuICAgICAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldz8ub3BlbkV2ZW50TW9kYWwoZXYuaWQsIGV2LmRhdGUgPz8gdGhpcy5kYXRlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAvLyBSaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgICAgICAgICAgICAgIHJvdy5vbmNvbnRleHRtZW51ID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuICAgICAgICAgICAgICAgICAgICBtZW51LmFkZEl0ZW0oaSA9PiBpLnNldFRpdGxlKCdEdXBsaWNhdGUnKS5zZXRJY29uKCdjb3B5Jykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0V2OiBEYXlibGVFdmVudCA9IHsgLi4uZXYsIGlkOiByYW5kb21JZCgpIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMucHVzaChuZXdFdik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXcuc2F2ZUFsbEVudHJpZXMoKS50aGVuKCgpID0+IHRoaXMudmlldz8ucmVuZGVyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoZXYuY29tcGxldGVkID8gJ01hcmsgaW5jb21wbGV0ZScgOiAnTWFyayBjb21wbGV0ZScpLnNldEljb24oJ2NoZWNrJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2LmNvbXBsZXRlZCA9ICFldi5jb21wbGV0ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHRoaXMudmlldy5zYXZlQWxsRW50cmllcygpLnRoZW4oKCkgPT4gdGhpcy52aWV3Py5yZW5kZXIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbShpID0+IGkuc2V0VGl0bGUoJ0RlbGV0ZScpLnNldEljb24oJ3RyYXNoJykub25DbGljaygoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSB0aGlzLnZpZXcuZXZlbnRzLmZpbHRlcihlMiA9PiBlMi5pZCAhPT0gZXYuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCkudGhlbigoKSA9PiB0aGlzLnZpZXc/LnJlbmRlcigpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gRW5hYmxlIHJlb3JkZXJpbmcgaW4gdG9kYXkgbW9kYWxcclxuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJhZ292ZXIgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um93ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3NDb3VudCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRSb3cgJiYgcm93c0NvdW50ID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXRSb3cuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVZID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLWRyb3AtaW5kaWNhdG9yJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9yLmNsYXNzTmFtZSA9ICdkYXlibGUtZHJvcC1pbmRpY2F0b3InO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZVkgPCBoIC8gMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cucGFyZW50RWxlbWVudD8uaW5zZXJ0QmVmb3JlKGluZGljYXRvciwgdGFyZ2V0Um93KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRSb3cuYWZ0ZXIoaW5kaWNhdG9yKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5vbmRyYWdsZWF2ZSA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IGV2ZW50c0NvbnRhaW5lcikgZXZlbnRzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5kYXlibGUtZHJvcC1pbmRpY2F0b3InKS5mb3JFYWNoKGVsID0+IGVsLnJlbW92ZSgpKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLm9uZHJvcCA9IGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmRheWJsZS1kcm9wLWluZGljYXRvcicpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YSgndGV4dC9wbGFpbicpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gZS5kYXRhVHJhbnNmZXI/LmdldERhdGEoJ2RheWJsZS1zb3VyY2UnKTtcclxuICAgICAgICAgICAgICAgIGlmICghaWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRyYWdnZWRFbCA9IGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1pZD1cIiR7aWR9XCJdYCkgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkcmFnZ2VkRWwpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdyA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmRheWJsZS10b2RheS1ldmVudC1yb3cnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldFJvdyB8fCB0YXJnZXRSb3cgPT09IGRyYWdnZWRFbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldFJvdy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlWSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaCA9IHJlY3QuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlWSA8IGggLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzQ29udGFpbmVyLmluc2VydEJlZm9yZShkcmFnZ2VkRWwsIHRhcmdldFJvdyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFJvdy5hZnRlcihkcmFnZ2VkRWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRSb3cpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZHJhZ2dlZEVsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIFBlcnNpc3Qgb3JkZXIgZm9yIHRoaXMgZGF0ZVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmlldykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLmRhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5SWRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5YmxlLXRvZGF5LWV2ZW50LXJvdycpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlaWQgPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuaWQhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlJZHMucHVzaChlaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSA9PT0gZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3RoZXJzID0gdGhpcy52aWV3LmV2ZW50cy5maWx0ZXIoZXYgPT4gZXYuZGF0ZSAhPT0gZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVvcmRlcmVkRGF5ID0gZGF5SWRzLm1hcChpZCA9PiBvcmlnaW5hbC5maW5kKGUgPT4gZS5pZCA9PT0gaWQpISkuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5ldmVudHMgPSBvdGhlcnMuY29uY2F0KHJlb3JkZXJlZERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy52aWV3LnNhdmVBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBGaXhlZCArQWRkIEV2ZW50IGJ1dHRvbiBhdCBib3R0b21cclxuICAgICAgICBjb25zdCBhZGRCdG4gPSBjLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS10b2RheS1hZGQtYnRuJywgdGV4dDogJysgQWRkIEV2ZW50JyB9KTtcclxuICAgICAgICBhZGRCdG4uYWRkQ2xhc3MoJ2RiLWJ0bicpO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuICAgICAgICBhZGRCdG4uc3R5bGUucGFkZGluZyA9ICcxMHB4JztcclxuICAgICAgICBhZGRCdG4uc3R5bGUuYm9yZGVyID0gJ25vbmUnO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNnB4JztcclxuICAgICAgICBhZGRCdG4uc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xyXG4gICAgICAgIGFkZEJ0bi5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICAgICAgYWRkQnRuLnN0eWxlLm1hcmdpblRvcCA9ICdhdXRvJztcclxuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnZpZXc/Lm9wZW5FdmVudE1vZGFsKHVuZGVmaW5lZCwgdGhpcy5kYXRlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuYWJsZSBpbnRlcm5hbCBsaW5rIGNsaWNrcyBpbnNpZGUgdG9kYXkgbW9kYWwgY29udGVudFxyXG4gICAgICAgIHRoaXMuY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGEgPSAoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdhJykgYXMgSFRNTEFuY2hvckVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICBpZiAoIWEpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3Qgd2lraSA9IGEuZ2V0QXR0cmlidXRlKCdkYXRhLWhyZWYnKTtcclxuICAgICAgICAgICAgaWYgKHdpa2kpIHtcclxuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSByZXNvbHZlTm90ZUZpbGUodGhpcy5hcHAsIHdpa2kpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGxlYWYgYXMgYW55KS5vcGVuRmlsZT8uKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgeyBjYXB0dXJlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTdG9yYWdlRm9sZGVyTm90U2V0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCkge1xyXG4gICAgICAgIHN1cGVyKGFwcCk7XHJcbiAgICB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSBjb250ZW50RWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnU3RvcmFnZSBmb2xkZXIgbm90IHNldCcgfSk7XHJcbiAgICAgICAgdGl0bGUuYWRkQ2xhc3MoJ2RiLW1vZGFsLXRpdGxlJyk7XHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiAnWW91IG5lZWQgdG8gc2V0IGEgc3RvcmFnZSBmb2xkZXIgdG8gY3JlYXRlIGFuZCBzYXZlIGV2ZW50cy4nIH0pO1xyXG4gICAgICAgIGNvbnN0IGJ0bnMgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgYnRucy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgIGJ0bnMuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgYnRucy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LWVuZCc7XHJcbiAgICAgICAgYnRucy5zdHlsZS5tYXJnaW5Ub3AgPSAnMTJweCc7XHJcbiAgICAgICAgY29uc3Qgb3BlblNldHRpbmdzQnRuID0gYnRucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICdkYXlibGUtYnRuJyB9KTtcclxuICAgICAgICBvcGVuU2V0dGluZ3NCdG4uc2V0VGV4dCgnT3BlbiBTZXR0aW5ncycpO1xyXG4gICAgICAgIG9wZW5TZXR0aW5nc0J0bi5vbmNsaWNrID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkgeyBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHMgPSAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nO1xyXG4gICAgICAgICAgICAgICAgcz8ub3Blbj8uKCk7XHJcbiAgICAgICAgICAgICAgICBzPy5vcGVuVGFiQnlJZD8uKCdkYXlibGUtY2FsZW5kYXInKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7fVxyXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCBjbG9zZUJ0biA9IGJ0bnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0bicgfSk7XHJcbiAgICAgICAgY2xvc2VCdG4uc2V0VGV4dCgnQ2xvc2UnKTtcclxuICAgICAgICBjbG9zZUJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBDb25maXJtTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICBvbkNvbmZpcm06ICgpID0+IHZvaWQ7XHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgbWVzc2FnZTogc3RyaW5nLCBvbkNvbmZpcm06ICgpID0+IHZvaWQpIHtcclxuICAgICAgICBzdXBlcihhcHApO1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgdGhpcy5vbkNvbmZpcm0gPSBvbkNvbmZpcm07XHJcbiAgICB9XHJcbiAgICBvbk9wZW4oKSB7XHJcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsO1xyXG4gICAgICAgIGMuZW1wdHkoKTtcclxuICAgICAgICBjLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgYy5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XHJcbiAgICAgICAgYy5zdHlsZS5nYXAgPSAnMTJweCc7XHJcbiAgICAgICAgY29uc3QgbXNnID0gYy5jcmVhdGVFbCgnZGl2Jyk7XHJcbiAgICAgICAgbXNnLnRleHRDb250ZW50ID0gdGhpcy5tZXNzYWdlO1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IGMuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgcm93LnN0eWxlLmdhcCA9ICc4cHgnO1xyXG4gICAgICAgIHJvdy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LWVuZCc7XHJcbiAgICAgICAgY29uc3QgY2FuY2VsID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4nIH0pO1xyXG4gICAgICAgIGNhbmNlbC50ZXh0Q29udGVudCA9ICdDYW5jZWwnO1xyXG4gICAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIGNvbnN0IG9rID0gcm93LmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gbW9kLWN0YScgfSk7XHJcbiAgICAgICAgb2sudGV4dENvbnRlbnQgPSAnRGVsZXRlJztcclxuICAgICAgICBvay5vbmNsaWNrID0gKCkgPT4geyB0cnkgeyB0aGlzLm9uQ29uZmlybSgpOyB9IGZpbmFsbHkgeyB0aGlzLmNsb3NlKCk7IH0gfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0SWNvbklkc1NhZmUoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgYW55T2IgPSAod2luZG93IGFzIGFueSkub2JzaWRpYW47XHJcbiAgICBjb25zdCBhcGkgPSAoYXBpTmFtZTogc3RyaW5nKSA9PiAocmVxdWlyZT8uKCdvYnNpZGlhbicpIGFzIGFueSk/LlthcGlOYW1lXSA/PyBhbnlPYj8uW2FwaU5hbWVdO1xyXG4gICAgY29uc3QgaWRzID0gYXBpKCdnZXRJY29uSWRzJyk7XHJcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGlkcygpO1xyXG4gICAgcmV0dXJuIFsnY2FsZW5kYXInLCdjbG9jaycsJ3N0YXInLCdib29rbWFyaycsJ2ZsYWcnLCdiZWxsJywnY2hlY2snLCdwZW5jaWwnLCdib29rJywnemFwJ107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNob29zZVRleHRDb2xvcihoZXg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCByZ2IgPSBoZXhUb1JnYihoZXgpO1xyXG4gICAgaWYgKCFyZ2IpIHJldHVybiAndmFyKC0tdGV4dC1ub3JtYWwpJztcclxuICAgIGNvbnN0IHlpcSA9ICgocmdiLnIqMjk5KSsocmdiLmcqNTg3KSsocmdiLmIqMTE0KSkvMTAwMDtcclxuICAgIHJldHVybiB5aXEgPj0gMTI4ID8gJyMwMDAwMDAnIDogJyNmZmZmZmYnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoZXhUb1JnYihoZXg6IHN0cmluZyk6IHtyOm51bWJlcixnOm51bWJlcixiOm51bWJlcn18bnVsbCB7XHJcbiAgICBjb25zdCBtID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XHJcbiAgICByZXR1cm4gbSA/IHsgcjogcGFyc2VJbnQobVsxXSwxNiksIGc6IHBhcnNlSW50KG1bMl0sMTYpLCBiOiBwYXJzZUludChtWzNdLDE2KSB9IDogbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGV4VG9SZ2JhKGhleDogc3RyaW5nLCBhbHBoYTogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHJnYiA9IGhleFRvUmdiKGhleCk7XHJcbiAgICBpZiAoIXJnYikgcmV0dXJuIGhleDtcclxuICAgIHJldHVybiBgcmdiYSgke3JnYi5yfSwgJHtyZ2IuZ30sICR7cmdiLmJ9LCAke2FscGhhfSlgO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRUaW1lVmFsdWUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZm10OiAnMjRoJyB8ICcxMmgnKTogc3RyaW5nIHtcclxuICAgIGlmICghdmFsdWUpIHJldHVybiAnJztcclxuICAgIGNvbnN0IFtoaFN0ciwgbW1TdHJdID0gdmFsdWUuc3BsaXQoJzonKTtcclxuICAgIGNvbnN0IGhoID0gcGFyc2VJbnQoaGhTdHIgfHwgJzAnLCAxMCk7XHJcbiAgICBjb25zdCBtbSA9IHBhcnNlSW50KG1tU3RyIHx8ICcwJywgMTApO1xyXG4gICAgaWYgKGZtdCA9PT0gJzEyaCcpIHtcclxuICAgICAgICBjb25zdCBpc1BNID0gaGggPj0gMTI7XHJcbiAgICAgICAgY29uc3QgaDEyID0gKChoaCAlIDEyKSB8fCAxMik7XHJcbiAgICAgICAgcmV0dXJuIGAke2gxMn06JHtTdHJpbmcobW0pLnBhZFN0YXJ0KDIsICcwJyl9ICR7aXNQTSA/ICdQTScgOiAnQU0nfWA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYCR7U3RyaW5nKGhoKS5wYWRTdGFydCgyLCAnMCcpfToke1N0cmluZyhtbSkucGFkU3RhcnQoMiwgJzAnKX1gO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmb3JtYXRUaW1lUmFuZ2UocmFuZ2U6IHN0cmluZyB8IHVuZGVmaW5lZCwgZm10OiAnMjRoJyB8ICcxMmgnKTogc3RyaW5nIHtcclxuICAgIGlmICghcmFuZ2UpIHJldHVybiAnJztcclxuICAgIGNvbnN0IHBhcnRzID0gcmFuZ2Uuc3BsaXQoJy0nKTtcclxuICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDIpIHtcclxuICAgICAgICBjb25zdCBzID0gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xyXG4gICAgICAgIGNvbnN0IGUgPSBmb3JtYXRUaW1lVmFsdWUocGFydHNbMV0sIGZtdCk7XHJcbiAgICAgICAgaWYgKHMgJiYgZSkgcmV0dXJuIGAke3N9LSR7ZX1gO1xyXG4gICAgICAgIHJldHVybiBzIHx8IGUgfHwgJyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm9ybWF0VGltZVZhbHVlKHBhcnRzWzBdLCBmbXQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJNYXJrZG93bih0ZXh0OiBzdHJpbmcsIGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBhcHA/OiBBcHApOiB2b2lkIHtcclxuICAgIC8vIFNpbXBsZSBtYXJrZG93biByZW5kZXJpbmc6IGhlYWRpbmdzLCBib2xkLCBpdGFsaWMsIGxpbmtzLCBjb2RlLCBzdHJpa2V0aHJvdWdoLCBoaWdobGlnaHQsIGJsb2NrcXVvdGUsIGltYWdlc1xyXG4gICAgLy8gTk9URTogV2UgZG8gTk9UIGVzY2FwZSBIVE1MIHRvIGFsbG93IHVzZXJzIHRvIHVzZSBIVE1MIHRhZ3MgZGlyZWN0bHkgKGUuZy4sIDx1PnVuZGVybGluZTwvdT4pXHJcbiAgICBsZXQgaHRtbCA9IHRleHRcclxuICAgICAgICAvLyBPYnNpZGlhbiB3aWtpLXN0eWxlIGltYWdlcyAhW1tpbWFnZS5wbmddXVxyXG4gICAgICAgIC5yZXBsYWNlKC8hXFxbXFxbKFteXFxdXSspXFxdXFxdL2csIChtYXRjaCwgZmlsZW5hbWUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW1hZ2VVcmwgPSBhcHAgPyByZXNvbHZlSW1hZ2VQYXRoKGZpbGVuYW1lLCBhcHApIDogZmlsZW5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiBgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cIiR7ZmlsZW5hbWV9XCIgY2xhc3M9XCJkYXlibGUtZW1iZWQtaW1hZ2VcIj5gO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLy8gTWFya2Rvd24gaW1hZ2VzICFbYWx0XSh1cmwpXHJcbiAgICAgICAgLnJlcGxhY2UoLyFcXFsoW15cXF1dKilcXF1cXCgoW15cXCldKylcXCkvZywgKG1hdGNoLCBhbHQsIHNyYykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpbWFnZVVybCA9IGFwcCA/IHJlc29sdmVJbWFnZVBhdGgoc3JjLCBhcHApIDogc3JjO1xyXG4gICAgICAgICAgICByZXR1cm4gYDxpbWcgc3JjPVwiJHtpbWFnZVVybH1cIiBhbHQ9XCIke2FsdH1cIiBjbGFzcz1cImRheWJsZS1lbWJlZC1pbWFnZVwiPmA7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAvLyBIZWFkaW5ncyAjLi4jIyMjIyNcclxuICAgICAgICAucmVwbGFjZSgvXiMjIyMjI1xccysoLispJC9nbSwgJzxoNj4kMTwvaDY+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjIyMjXFxzKyguKykkL2dtLCAnPGg1PiQxPC9oNT4nKVxyXG4gICAgICAgIC5yZXBsYWNlKC9eIyMjI1xccysoLispJC9nbSwgJzxoND4kMTwvaDQ+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjI1xccysoLispJC9nbSwgJzxoMz4kMTwvaDM+JylcclxuICAgICAgICAucmVwbGFjZSgvXiMjXFxzKyguKykkL2dtLCAnPGgyPiQxPC9oMj4nKVxyXG4gICAgICAgIC5yZXBsYWNlKC9eI1xccysoLispJC9nbSwgJzxoMT4kMTwvaDE+JylcclxuICAgICAgICAvLyBCb2xkICoqdGV4dCoqIGFuZCBfX3RleHRfX1xyXG4gICAgICAgIC5yZXBsYWNlKC9cXCpcXCooLis/KVxcKlxcKi9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpXHJcbiAgICAgICAgLnJlcGxhY2UoL19fKC4rPylfXy9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpXHJcbiAgICAgICAgLy8gSXRhbGljICp0ZXh0KiBhbmQgX3RleHRfXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcKiguKz8pXFwqL2csICc8ZW0+JDE8L2VtPicpXHJcbiAgICAgICAgLnJlcGxhY2UoL18oLis/KV8vZywgJzxlbT4kMTwvZW0+JylcclxuICAgICAgICAvLyBTdHJpa2V0aHJvdWdoIH5+dGV4dH5+XHJcbiAgICAgICAgLnJlcGxhY2UoL35+KC4rPyl+fi9nLCAnPGRlbD4kMTwvZGVsPicpXHJcbiAgICAgICAgLy8gSGlnaGxpZ2h0ID09dGV4dD09XHJcbiAgICAgICAgLnJlcGxhY2UoLz09KC4rPyk9PS9nLCAnPG1hcms+JDE8L21hcms+JylcclxuICAgICAgICAvLyBCbG9ja3F1b3RlIGxpbmVzIHN0YXJ0aW5nIHdpdGggPlxyXG4gICAgICAgIC5yZXBsYWNlKC9eJmd0O1sgXFx0XSooLispJC9nbSwgJzxibG9ja3F1b3RlPiQxPC9ibG9ja3F1b3RlPicpXHJcbiAgICAgICAgLy8gQ29kZSBgdGV4dGAgYW5kIGBgYGJsb2Nrc2BgYFxyXG4gICAgICAgIC5yZXBsYWNlKC9gKFteYF0rKWAvZywgJzxjb2RlIHN0eWxlPVwiYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpOyBwYWRkaW5nOiAycHggNHB4OyBib3JkZXItcmFkaXVzOiAzcHg7XCI+JDE8L2NvZGU+JylcclxuICAgICAgICAucmVwbGFjZSgvYGBgKFtcXHNcXFNdKj8pYGBgL2csICc8cHJlIHN0eWxlPVwiYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpOyBwYWRkaW5nOiA2cHg7IGJvcmRlci1yYWRpdXM6IDZweDtcIj48Y29kZT4kMTwvY29kZT48L3ByZT4nKVxyXG4gICAgICAgIC8vIExpbmtzIFtbdGFyZ2V0fGFsaWFzXV0gYW5kIFt0ZXh0XSh1cmwpXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcW1xcWyhbXlxcW1xcXV0rKVxcXVxcXS9nLCAobSwgaW5uZXIpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBTdHJpbmcoaW5uZXIpLnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICBjb25zdCBhbGlhcyA9IHBhcnRzWzFdIHx8IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICByZXR1cm4gYDxhIGNsYXNzPVwiaW50ZXJuYWwtbGlua1wiIGRhdGEtaHJlZj1cIiR7dGFyZ2V0fVwiIHN0eWxlPVwiY29sb3I6IHZhcigtLWxpbmstY29sb3IpO1wiPiR7YWxpYXN9PC9hPmA7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdXFwoKFteXFwpXSspXFwpL2csICc8YSBocmVmPVwiJDJcIiBzdHlsZT1cImNvbG9yOiB2YXIoLS1saW5rLWNvbG9yKTtcIj4kMTwvYT4nKVxyXG4gICAgICAgIC8vIExpbmUgYnJlYWtzXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xyXG4gICAgXHJcbiAgICBlbGVtZW50LmlubmVySFRNTCA9IGh0bWw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc29sdmVJbWFnZVBhdGgoaW1hZ2VQYXRoOiBzdHJpbmcsIGFwcDogQXBwKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHJhdyA9IFN0cmluZyhpbWFnZVBhdGggfHwgJycpO1xyXG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XHJcbiAgICBjb25zdCBieVBhdGggPSBhcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aCh0YXJnZXQpO1xyXG4gICAgaWYgKGJ5UGF0aCAmJiBieVBhdGggaW5zdGFuY2VvZiBURmlsZSkgcmV0dXJuIGFwcC52YXVsdC5nZXRSZXNvdXJjZVBhdGgoYnlQYXRoKTtcclxuICAgIGNvbnN0IGZpbGVzID0gYXBwLnZhdWx0LmdldEZpbGVzKCk7XHJcbiAgICBjb25zdCBleHRUYXJnZXQgPSB0YXJnZXQuZW5kc1dpdGgoJy5tZCcpID8gdGFyZ2V0LnNsaWNlKDAsIC0zKSA6IHRhcmdldDtcclxuICAgIGNvbnN0IGZvdW5kID0gZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgodGFyZ2V0KSlcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxyXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5iYXNlbmFtZSA9PT0gZXh0VGFyZ2V0KVxyXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKGAke2V4dFRhcmdldH0ubWRgKSk7XHJcbiAgICBpZiAoZm91bmQpIHJldHVybiBhcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGZvdW5kKTtcclxuICAgIHJldHVybiB0YXJnZXQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc29sdmVOb3RlRmlsZShhcHA6IEFwcCwgbGlua3RleHQ6IHN0cmluZyk6IFRGaWxlIHwgbnVsbCB7XHJcbiAgICBjb25zdCByYXcgPSBTdHJpbmcobGlua3RleHQgfHwgJycpO1xyXG4gICAgY29uc3QgdGFyZ2V0ID0gcmF3LnNwbGl0KCd8JylbMF0uc3BsaXQoJyMnKVswXS50cmltKCk7XHJcbiAgICBjb25zdCB3aXRob3V0TWQgPSB0YXJnZXQuZW5kc1dpdGgoJy5tZCcpID8gdGFyZ2V0LnNsaWNlKDAsIC0zKSA6IHRhcmdldDtcclxuICAgIGNvbnN0IGJ5UGF0aCA9IGFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhcmdldCk7XHJcbiAgICBpZiAoYnlQYXRoICYmIGJ5UGF0aCBpbnN0YW5jZW9mIFRGaWxlKSByZXR1cm4gYnlQYXRoO1xyXG4gICAgY29uc3QgZmlsZXMgPSBhcHAudmF1bHQuZ2V0RmlsZXMoKTtcclxuICAgIGNvbnN0IGZvdW5kID0gZmlsZXMuZmluZCgoZjogYW55KSA9PiBmLnBhdGguZW5kc1dpdGgodGFyZ2V0KSlcclxuICAgICAgICB8fCBmaWxlcy5maW5kKChmOiBhbnkpID0+IGYubmFtZSA9PT0gdGFyZ2V0KVxyXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5iYXNlbmFtZSA9PT0gd2l0aG91dE1kKVxyXG4gICAgICAgIHx8IGZpbGVzLmZpbmQoKGY6IGFueSkgPT4gZi5wYXRoLmVuZHNXaXRoKGAke3dpdGhvdXRNZH0ubWRgKSk7XHJcbiAgICByZXR1cm4gZm91bmQgfHwgbnVsbDtcclxufVxyXG5cclxuY2xhc3MgRGF5YmxlU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gICAgcGx1Z2luOiBEYXlibGVDYWxlbmRhclBsdWdpbjtcclxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IERheWJsZUNhbGVuZGFyUGx1Z2luKSB7IHN1cGVyKGFwcCwgcGx1Z2luKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH1cclxuICAgIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMScsIHsgdGV4dDogJ0RheWJsZSBDYWxlbmRhcicgfSk7XHJcbiAgICAgICAgLy8gY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnR2VuZXJhbCcgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdXZWVrIHN0YXJ0IGRheScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdGaXJzdCBkYXkgb2YgdGhlIHdlZWsnKVxyXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignMCcsICdTdW5kYXknKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzEnLCAnTW9uZGF5JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCcyJywgJ1R1ZXNkYXknKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJzMnLCAnV2VkbmVzZGF5JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCc0JywgJ1RodXJzZGF5JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCc1JywgJ0ZyaWRheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignNicsICdTYXR1cmRheScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrU3RhcnREYXkpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla1N0YXJ0RGF5ID0gcGFyc2VJbnQodiwgMTApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdTdG9yYWdlIGZvbGRlcicpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdGb2xkZXIgdG8gc3RvcmUgY2FsZW5kYXIgZXZlbnRzLiBEYXRhIGlzIHN0b3JlZCBpbiBKU09OIGZpbGVzLicpXHJcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA6ICd1bnNldCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWxsRm9sZGVycygpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGYgPT4gZi5wYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNvcnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgRnV6enlTdWdnZXN0ID0gKHJlcXVpcmUoJ29ic2lkaWFuJykgYXMgYW55KS5GdXp6eVN1Z2dlc3RNb2RhbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VnZ2VzdCA9IG5ldyBGdXp6eVN1Z2dlc3QodGhpcy5hcHApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0LnNldFBsYWNlaG9sZGVyKCdTZWxlY3Qgc3RvcmFnZSBmb2xkZXIuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5nZXRTdWdnZXN0aW9ucyA9IChxOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcSkgcmV0dXJuIGZvbGRlcnM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9sZGVycy5maWx0ZXIoZiA9PiBmLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocS50b0xvd2VyQ2FzZSgpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3QucmVuZGVyU3VnZ2VzdGlvbiA9IChmb2xkZXI6IHN0cmluZywgZWw6IEhUTUxFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRUZXh0KGZvbGRlciB8fCAnKFZhdWx0IHJvb3QpJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Qub25DaG9vc2VTdWdnZXN0aW9uID0gYXN5bmMgKGZvbGRlcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbnRyaWVzRm9sZGVyID0gZm9sZGVyIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbnN1cmVFbnRyaWVzRm9sZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlcj8udHJpbSgpID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciA6ICd1bnNldCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdC5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnVGltZSBmb3JtYXQnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnRGlzcGxheSB0aW1lcyBpbiAyNGggb3IgMTJoIGZvcm1hdCcpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IHtcclxuICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCcyNGgnLCAnMjQtaG91cicpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignMTJoJywgJzEyLWhvdXInKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy50aW1lRm9ybWF0ID8/ICcyNGgnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGltZUZvcm1hdCA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0FwcGVhcmFuY2UnIH0pO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0ljb24gcGxhY2VtZW50JylcclxuICAgICAgICAgICAgLnNldERlc2MoJ1Bvc2l0aW9uIG9mIGV2ZW50IGljb24nKVxyXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdyaWdodCcsICdSaWdodCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdOb25lJylcclxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AnLCAnVG9wIGNlbnRlcicpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigndG9wLWxlZnQnLCAnVG9wIGxlZnQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RvcC1yaWdodCcsICdUb3AgcmlnaHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY29uUGxhY2VtZW50ID8/ICdsZWZ0JylcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmljb25QbGFjZW1lbnQgPSB2IGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IHRpdGxlIGFsaWdubWVudCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgdGl0bGVzJylcclxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmlnaHQnLCAnUmlnaHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudFRpdGxlQWxpZ24gPz8gJ2xlZnQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRUaXRsZUFsaWduID0gdiBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGRlc2NyaXB0aW9uIGFsaWdubWVudCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdBbGlnbm1lbnQgb2YgZXZlbnQgZGVzY3JpcHRpb25zJylcclxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZC5hZGRPcHRpb24oJ2xlZnQnLCAnTGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignY2VudGVyJywgJ0NlbnRlcicpXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmlnaHQnLCAnUmlnaHQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudERlc2NBbGlnbiA/PyAnbGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudERlc2NBbGlnbiA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJhY2tncm91bmQgb3BhY2l0eScpXHJcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygnQ29udHJvbHMgdHJhbnNwYXJlbmN5IG9mIGV2ZW50IGJhY2tncm91bmRzLicpXHJcbiAgICAgICAgICAgICAgICAuYWRkU2xpZGVyKHMgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDEsIDAuMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID8/IDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50QmdPcGFjaXR5ID0gdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdFdmVudCBib3JkZXIgdGhpY2tuZXNzJylcclxuICAgICAgICAgICAgLnNldERlc2MoJ0NvbnRyb2xzIGV2ZW50IGJvcmRlciB0aGlja25lc3MgKDAtNXB4KScpXHJcbiAgICAgICAgICAgIC5hZGRTbGlkZXIocyA9PiB7XHJcbiAgICAgICAgICAgICAgICBzLnNldExpbWl0cygwLCA1LCAwLjUpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPz8gMilcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Qm9yZGVyV2lkdGggPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0V2ZW50IGJvcmRlciByYWRpdXMnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnQ29udHJvbHMgZXZlbnQgY29ybmVyIHJvdW5kbmVzcyAocHgpJylcclxuICAgICAgICAgICAgLmFkZFNsaWRlcihzID0+IHtcclxuICAgICAgICAgICAgICAgIHMuc2V0TGltaXRzKDAsIDI0LCAxKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudEJvcmRlclJhZGl1cyA/PyA2KVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCb3JkZXJSYWRpdXMgPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0NvbXBsZXRlZCBldmVudCBkaXNwbGF5JylcclxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCdIb3cgY29tcGxldGVkIGV2ZW50cyBhcHBlYXInKVxyXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCdub25lJywgJ05vIGNoYW5nZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2RpbScsICdEaW0nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdzdHJpa2V0aHJvdWdoJywgJ1N0cmlrZXRocm91Z2gnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdoaWRlJywgJ0hpZGUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tcGxldGVCZWhhdmlvciA/PyAnbm9uZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbXBsZXRlQmVoYXZpb3IgPSB2IGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoYE9ubHkgYW5pbWF0ZSB0b2RheSdzIGV2ZW50c2ApXHJcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygnU3RvcCBhbmltYXRpb24gZm9yIGFsbCBldmVudHMgZXhjZXB0IHRvZGF5JylcclxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5ID8/IGZhbHNlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5vbmx5QW5pbWF0ZVRvZGF5ID0gdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnSG9sZGVyIHBsYWNlbWVudCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdQbGFjZSB0aGUgSG9sZGVyIHRvZ2dsZSAobGVmdCwgcmlnaHQsIG9yIGhpZGRlbiknKVxyXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignbGVmdCcsICdMZWZ0JylcclxuICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdyaWdodCcsICdSaWdodCcpXHJcbiAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaGlkZGVuJywgJ0hpZGRlbicpXHJcbiAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA/PyAnbGVmdCcpXHJcbiAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhvbGRlclBsYWNlbWVudCA9IHYgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmlldykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgY29udGFpbmVyIGFuZCByZWJ1aWxkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXcuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdmlldy5vbk9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ01heCBkYXkgY2VsbCBoZWlnaHQgKHB4KScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdJZiBzZXQsIGRheSBjZWxscyBjYXAgYXQgdGhpcyBoZWlnaHQgYW5kIGV2ZW50cyBzY3JvbGwgdmVydGljYWxseScpXHJcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgdC5zZXRQbGFjZWhvbGRlcignMCAoZGlzYWJsZWQpJyk7XHJcbiAgICAgICAgICAgICAgICB0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlDZWxsTWF4SGVpZ2h0ID8/IDApKTtcclxuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtID0gcGFyc2VJbnQodiB8fCAnMCcsIDEwKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYXlDZWxsTWF4SGVpZ2h0ID0gaXNOYU4obnVtKSA/IDAgOiBNYXRoLm1heCgwLCBudW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICB2aWV3Py5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS50eXBlID0gJ251bWJlcic7XHJcbiAgICAgICAgICAgICAgICAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLm1pbiA9ICcwJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAgICAgLnNldE5hbWUoJ0NvbG9yIHN3YXRjaCBwb3NpdGlvbicpXHJcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygnUG9zaXRpb24gb2YgY29sb3Igc3dhdGNoZXMgaW4gZXZlbnQgbW9kYWwnKVxyXG4gICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGQuYWRkT3B0aW9uKCd1bmRlci10aXRsZScsICdVbmRlciB0aXRsZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3VuZGVyLWRlc2NyaXB0aW9uJywgJ1VuZGVyIGRlc2NyaXB0aW9uJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbm9uZScsICdEbyBub3Qgc2hvdycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb2xvclN3YXRjaFBvc2l0aW9uID8/ICd1bmRlci10aXRsZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyB2ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbG9yU3dhdGNoUG9zaXRpb24gPSB2IGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBzd2F0Y2hlc1NlY3Rpb25Ub3AgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoKTtcclxuICAgICAgICBjb25zdCBjb2xvcnNUaXRsZVRvcCA9IHN3YXRjaGVzU2VjdGlvblRvcC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdDb2xvcnMnIH0pO1xyXG4gICAgICAgIGNvbnN0IGNvbG9yc0xpc3RUb3AgPSBzd2F0Y2hlc1NlY3Rpb25Ub3AuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgY29uc3QgcmVuZGVyQ29sb3JzVG9wID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb2xvcnNMaXN0VG9wLmVtcHR5KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGNvbG9yc0xpc3RUb3AuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgIHJvdy5zdHlsZS5hbGlnbkl0ZW1zID0gJ2ZsZXgtc3RhcnQnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuZmxleFdyYXAgPSAnd3JhcCc7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IHMudGV4dENvbG9yIHx8ICcnLCBzb3VyY2U6ICdidWlsdCcgYXMgY29uc3QgfSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjdXN0b21zID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lIHx8ICcnLCBjb2xvcjogcy5jb2xvciB8fCAnI2ZmMDAwMCcsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfHwgJycsIHNvdXJjZTogJ2N1c3RvbScgYXMgY29uc3QgfSkpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21iaW5lZDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfVtdID0gWy4uLmJ1aWx0LCAuLi5jdXN0b21zXTtcclxuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I6IHN0cmluZywgc291cmNlOiAnYnVpbHQnfCdjdXN0b20nIH0sIGlkeDogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gcm93LmNyZWF0ZURpdigpO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmdhcCA9ICc2cHgnO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5zZXRBdHRyKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9IGVudHJ5LnNvdXJjZTtcclxuICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5pbmRleCA9IFN0cmluZyhpZHgpO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0Lm5hbWUgPSBlbnRyeS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dFBpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xyXG4gICAgICAgICAgICAgICAgdGV4dFBpY2tlci52YWx1ZSA9IGVudHJ5LnRleHRDb2xvciB8fCAnI2ZmZmZmZic7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiZ1BpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xyXG4gICAgICAgICAgICAgICAgYmdQaWNrZXIudmFsdWUgPSBlbnRyeS5jb2xvcjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUFsbCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiZyA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzFdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eCA9ICh3LnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpWzBdIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiBiZywgdGV4dENvbG9yOiB0eCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogYmcsIHRleHRDb2xvcjogdHggfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHRleHRQaWNrZXIub25jaGFuZ2UgPSB1cGRhdGVBbGw7XHJcbiAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLnBhZGRpbmcgPSAnMnB4IDRweCc7XHJcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcclxuICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcclxuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHdyYXAub25kcmFnc3RhcnQgPSBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLmRhdGFUcmFuc2Zlcj8uc2V0RGF0YSgndGV4dC9wbGFpbicsICdkcmFnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgKGUuZGF0YVRyYW5zZmVyIGFzIERhdGFUcmFuc2ZlcikuZWZmZWN0QWxsb3dlZCA9ICdtb3ZlJztcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcmFnb3ZlciA9IGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IH07XHJcbiAgICAgICAgICAgICAgICByb3cub25kcm9wID0gYXN5bmMgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQgfHwgdGFyZ2V0LnBhcmVudEVsZW1lbnQgIT09IHJvdykgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gKGUuY2xpZW50WCAtIHJlY3QubGVmdCkgPCByZWN0LndpZHRoIC8gMjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmVmb3JlKSByb3cuaW5zZXJ0QmVmb3JlKHdyYXAsIHRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlQWxsKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXA7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvbWJpbmVkLmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHsgbWFrZUl0ZW0oZW50cnksIGlkeCk7IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBjb250cm9sc0JvdHRvbSA9IG5ldyBTZXR0aW5nKGNvbG9yc0xpc3RUb3ApO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuYWRkQ2xhc3MoJ2RheWJsZS1jb2xvcnMtY29udHJvbHMnKTtcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uc2V0dGluZ0VsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgICAgICAoY29udHJvbHNCb3R0b20uc2V0dGluZ0VsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LXN0YXJ0JztcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdSZXNldCB0byBEZWZhdWx0IENvbG9ycycpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IENvbmZpcm1Nb2RhbCh0aGlzLmFwcCwgJ1Jlc2V0IGNvbG9yIHN3YXRjaGVzIHRvIGRlZmF1bHQ/JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IChERUZBVUxUX1NFVFRJTkdTLnN3YXRjaGVzIHx8IFtdKS5tYXAocyA9PiAoeyBuYW1lOiBzLm5hbWUsIGNvbG9yOiBzLmNvbG9yLCB0ZXh0Q29sb3I6IChzIGFzIGFueSkudGV4dENvbG9yIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb2xvcnNUb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLmFkZEJ1dHRvbihiID0+IHtcclxuICAgICAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgQ29sb3InKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3cmFwID0gY29sb3JzTGlzdFRvcC5jcmVhdGVEaXYoKTtcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5nYXAgPSAnNnB4JztcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LnNvdXJjZSA9ICdjdXN0b20nO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5uYW1lID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dFBpY2tlciA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHRQaWNrZXIudmFsdWUgPSAnI2ZmZmZmZic7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmdQaWNrZXIgPSB3cmFwLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NvbG9yJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBiZ1BpY2tlci52YWx1ZSA9ICcjZmYwMDAwJztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcclxuICAgICAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUFsbCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QnVpbHQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCB0ZXh0Q29sb3I/OiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcsIHRleHRDb2xvcj86IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JzTGlzdFRvcC5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmcgPSAody5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKVsxXSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4ID0gKHcucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbdHlwZT1cImNvbG9yXCJdJylbMF0gYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiBiZywgdGV4dENvbG9yOiB0eCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IGJnLCB0ZXh0Q29sb3I6IHR4IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ1aWx0ID0gKHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzIHx8IFtdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldkJ5TmFtZSA9IG5ldyBNYXA8c3RyaW5nLCB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZywgdGV4dENvbG9yPzogc3RyaW5nIH0+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZCdWlsdC5mb3JFYWNoKHMgPT4gcHJldkJ5TmFtZS5zZXQocy5uYW1lLCB7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogcy50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb290ID0gdmlldy5jb250YWluZXJFbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1aWx0LmZvckVhY2gobmIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXYgPSBwcmV2QnlOYW1lLmdldChuYi5uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXYpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGFuZ2VkID0gcHJldi5jb2xvciAhPT0gbmIuY29sb3IgfHwgKHByZXYudGV4dENvbG9yIHx8ICcnKSAhPT0gKG5iLnRleHRDb2xvciB8fCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGFuZ2VkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmdiYSA9IGhleFRvUmdiYShuYi5jb2xvciwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRCZ09wYWNpdHkgPz8gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKGAuZGF5YmxlLWV2ZW50W2RhdGEtY29sb3I9XCIke3ByZXYuY29sb3J9XCJdYCkuZm9yRWFjaChlbCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGggPSBlbCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1ldmVudC1iZy1jb2xvcicsIHJnYmEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnN0eWxlLnNldFByb3BlcnR5KCctLWV2ZW50LXRleHQtY29sb3InLCBuYi50ZXh0Q29sb3IgfHwgY2hvb3NlVGV4dENvbG9yKG5iLmNvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGguZGF0YXNldC5jb2xvciA9IG5iLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1ldmVudC1jb2xvcmVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcclxuICAgICAgICAgICAgICAgICAgICBiZ1BpY2tlci5vbmNoYW5nZSA9IHVwZGF0ZUFsbDtcclxuICAgICAgICAgICAgICAgICAgICBkZWwub25jbGljayA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXAucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGRhdGVBbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVuZGVyQ29sb3JzVG9wKCk7XHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnRXZlbnQgQ2F0ZWdvcmllcycgfSk7XHJcbiAgICAgICAgY29uc3QgcnVsZXNXcmFwID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgY29uc3QgcmVuZGVyUnVsZXMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHJ1bGVzV3JhcC5lbXB0eSgpO1xyXG4gICAgICAgICAgICAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlbnRDYXRlZ29yaWVzIHx8IFtdKS5mb3JFYWNoKChjYXRlZ29yeTogRXZlbnRDYXRlZ29yeSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gbmV3IFNldHRpbmcocnVsZXNXcmFwKTtcclxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgbGVmdC1zaWRlIHNldHRpbmcgdGl0bGUgZWxlbWVudFxyXG4gICAgICAgICAgICAgICAgcm93LnNldHRpbmdFbC5xdWVyeVNlbGVjdG9yKCcuc2V0dGluZy1pdGVtLW5hbWUnKT8ucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICAocm93LnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ3JpZFRlbXBsYXRlQ29sdW1ucyA9ICd1bnNldCc7XHJcbiAgICAgICAgICAgICAgICByb3cuY29udHJvbEVsLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICAocm93LmNvbnRyb2xFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZ2FwID0gJzhweCc7XHJcbiAgICAgICAgICAgICAgICByb3cuY29udHJvbEVsLnN0eWxlLmZsZXggPSAnMSc7XHJcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLWNhdGVnb3J5LXJvdycpO1xyXG4gICAgICAgICAgICAgICAgLy8gSWNvbiBidXR0b25cclxuICAgICAgICAgICAgICAgIHJvdy5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RheWJsZS1idG4nLCdkYXlibGUtaWNvbi1hZGQnLCdkYi1idG4nKTtcclxuICAgICAgICAgICAgICAgICAgICBzZXRJY29uKGIuYnV0dG9uRWwsIGNhdGVnb3J5Lmljb24gPz8gJ3BsdXMnKTtcclxuICAgICAgICAgICAgICAgICAgICBiLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwaWNrZXIgPSBuZXcgSWNvblBpY2tlck1vZGFsKHRoaXMuYXBwLCBhc3luYyAoaWNvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuaWNvbiA9IGljb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyUnVsZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuaWNvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlldz8ucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJSdWxlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGlja2VyLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gQ2F0ZWdvcnkgbmFtZSBpbnB1dFxyXG4gICAgICAgICAgICAgICAgcm93LmFkZFRleHQodCA9PiB7IHQuc2V0VmFsdWUoY2F0ZWdvcnkubmFtZSkub25DaGFuZ2UodiA9PiB7IGNhdGVnb3J5Lm5hbWUgPSB2OyB9KTsgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1pbnB1dCcsJ2RiLWNhdGVnb3J5LW5hbWUnKTsgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBUZXh0IGNvbG9yIGZpcnN0XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkQ29sb3JQaWNrZXIoY3AgPT4geyBjcC5zZXRWYWx1ZShjYXRlZ29yeS50ZXh0Q29sb3IpLm9uQ2hhbmdlKHYgPT4geyBcclxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeS50ZXh0Q29sb3IgPSB2OyBcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlldyA9IHRoaXMucGx1Z2luLmdldENhbGVuZGFyVmlldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgdmlldy5yZW5kZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pOyAoY3AgYXMgYW55KS5pbnB1dEVsPy5jbGFzc0xpc3Q/LmFkZCgnZGItY29sb3InLCdkYi10ZXh0LWNvbG9yJyk7IH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gQmFja2dyb3VuZCBjb2xvciBuZXh0XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkQ29sb3JQaWNrZXIoY3AgPT4geyBjcC5zZXRWYWx1ZShjYXRlZ29yeS5iZ0NvbG9yKS5vbkNoYW5nZSh2ID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYmdDb2xvciA9IHY7IFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7IChjcCBhcyBhbnkpLmlucHV0RWw/LmNsYXNzTGlzdD8uYWRkKCdkYi1jb2xvcicsJ2RiLWJnLWNvbG9yJyk7IH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZERyb3Bkb3duKGQgPT4geyBkLmFkZE9wdGlvbnMoe1xyXG4gICAgICAgICAgICAgICAgICAgICcnOiAnTm8gZWZmZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAnc3RyaXBlZC0xJzogJ1N0cmlwZWQgKDQ1wrApJyxcclxuICAgICAgICAgICAgICAgICAgICAnc3RyaXBlZC0yJzogJ1N0cmlwZWQgKC00NcKwKScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3ZlcnRpY2FsLXN0cmlwZXMnOiAnVmVydGljYWwgU3RyaXBlcycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3RoaW4tdGV4dHVyZWQtc3RyaXBlcyc6ICdUaGluIFRleHR1cmVkIFN0cmlwZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdjcm9zc2hhdGNoZWQnOiAnQ3Jvc3NoYXRjaGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAnY2hlY2tlcmJvYXJkJzogJ0NoZWNrZXJib2FyZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2hleGFib2FyZCc6ICdIZXhhYm9hcmQnLFxyXG4gICAgICAgICAgICAgICAgICAgICd3YXZ5LWxpbmVzJzogJ1dhdnkgTGluZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdkb3R0ZWQnOiAnRG90dGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAnYXJneWxlJzogJ0FyZ3lsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2VtYm9zc2VkJzogJ0VtYm9zc2VkJyxcclxuICAgICAgICAgICAgICAgICAgICAnZ2xhc3MnOiAnR2xhc3MnLFxyXG4gICAgICAgICAgICAgICAgICAgICdnbG93JzogJ0dsb3cnLFxyXG4gICAgICAgICAgICAgICAgICAgICdyZXRyby1idXR0b24nOiAnUmV0cm8gQnV0dG9uJ1xyXG4gICAgICAgICAgICAgICAgfSkuc2V0VmFsdWUoY2F0ZWdvcnkuZWZmZWN0KS5vbkNoYW5nZSh2ID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuZWZmZWN0ID0gdjsgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLnBsdWdpbi5nZXRDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZpZXcpIHZpZXcucmVuZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTsgKGQuc2VsZWN0RWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLXNlbGVjdCcsJ2RiLWVmZmVjdCcpOyB9KTtcclxuICAgICAgICAgICAgICAgIHJvdy5hZGREcm9wZG93bihkID0+IHsgZC5hZGRPcHRpb25zKHtcclxuICAgICAgICAgICAgICAgICAgICAnJzogJ05vIGFuaW1hdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtaG9yaXpvbnRhbGx5JzogJ01vdmUgSG9yaXpvbnRhbGx5JyxcclxuICAgICAgICAgICAgICAgICAgICAnbW92ZS12ZXJ0aWNhbGx5JzogJ01vdmUgVmVydGljYWxseScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3BhcnRpY2xlcyc6ICdQYXJ0aWNsZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdzbm93LWZhbGxpbmcnOiAnU25vdyBGYWxsaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAnYW5pbWF0ZWQtZ3JhZGllbnQnOiAnQW5pbWF0ZWQgR3JhZGllbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdnbGFzcy1zaGluZSc6ICdHbGFzcyBTaGluZScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dsb3dpbmcnOiAnR2xvd2luZydcclxuICAgICAgICAgICAgICAgIH0pLnNldFZhbHVlKGNhdGVnb3J5LmFuaW1hdGlvbikub25DaGFuZ2UodiA9PiB7IFxyXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LmFuaW1hdGlvbiA9IHY7IFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24nKTsgfSk7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7IGQuYWRkT3B0aW9ucyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJyc6ICdObyBhbmltYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgICdtb3ZlLWhvcml6b250YWxseSc6ICdNb3ZlIEhvcml6b250YWxseScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ21vdmUtdmVydGljYWxseSc6ICdNb3ZlIFZlcnRpY2FsbHknLFxyXG4gICAgICAgICAgICAgICAgICAgICdwYXJ0aWNsZXMnOiAnUGFydGljbGVzJyxcclxuICAgICAgICAgICAgICAgICAgICAnc25vdy1mYWxsaW5nJzogJ1Nub3cgRmFsbGluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ2FuaW1hdGVkLWdyYWRpZW50JzogJ0FuaW1hdGVkIEdyYWRpZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAnZ2xhc3Mtc2hpbmUnOiAnR2xhc3MgU2hpbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICdnbG93aW5nJzogJ0dsb3dpbmcnXHJcbiAgICAgICAgICAgICAgICB9KS5zZXRWYWx1ZShjYXRlZ29yeS5hbmltYXRpb24yKS5vbkNoYW5nZSh2ID0+IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkuYW5pbWF0aW9uMiA9IHY7IFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2aWV3KSB2aWV3LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7IChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnLCdkYi1hbmltYXRpb24yJyk7IH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZEV4dHJhQnV0dG9uKGJ0biA9PiB7IGJ0bi5zZXRJY29uKCd4Jykuc2V0VG9vbHRpcCgnRGVsZXRlJykub25DbGljaygoKSA9PiB7IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmZpbHRlcihjID0+IGMuaWQgIT09IGNhdGVnb3J5LmlkKTsgcmVuZGVyUnVsZXMoKTsgfSk7IChidG4gYXMgYW55KS5leHRyYUJ1dHRvbkVsPy5jbGFzc0xpc3Q/LmFkZCgnZGItYnRuJywnZGItZGVsZXRlLWNhdGVnb3J5Jyk7IH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgIGIuc2V0QnV0dG9uVGV4dCgnKyBBZGQgQ2F0ZWdvcnknKTtcclxuICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLmFkZENsYXNzKCdtb2QtY3RhJyk7XHJcbiAgICAgICAgICAgIGIub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeTogRXZlbnRDYXRlZ29yeSA9IHsgaWQ6IHJhbmRvbUlkKCksIG5hbWU6ICdOZXcgQ2F0ZWdvcnknLCBiZ0NvbG9yOiAnIzgzOTJhNCcsIHRleHRDb2xvcjogJyNmZmZmZmYnLCBlZmZlY3Q6ICdlbWJvc3NlZCcsIGFuaW1hdGlvbjogJycsIGFuaW1hdGlvbjI6ICcnLCBpY29uOiB1bmRlZmluZWQgfTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVudENhdGVnb3JpZXMgfHwgW10pLmNvbmNhdChjYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIHJlbmRlclJ1bGVzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJlbmRlclJ1bGVzKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaWdnZXJzVGl0bGUgPSBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdUcmlnZ2VycycgfSk7XHJcbiAgICAgICAgY29uc3QgdHJpZ2dlcnNXcmFwID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgY29uc3QgcmVuZGVyVHJpZ2dlcnMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyaWdnZXJzV3JhcC5lbXB0eSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzIHx8IFtdO1xyXG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKCh0ciwgaWR4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBuZXcgU2V0dGluZyh0cmlnZ2Vyc1dyYXApO1xyXG4gICAgICAgICAgICAgICAgcm93LnNldHRpbmdFbC5xdWVyeVNlbGVjdG9yKCcuc2V0dGluZy1pdGVtLW5hbWUnKT8ucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICByb3cuc2V0dGluZ0VsLmNsYXNzTGlzdC5hZGQoJ2RiLXRyaWdnZXJzLXJvdycpO1xyXG4gICAgICAgICAgICAgICAgcm93LmNvbnRyb2xFbC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmdhcCA9ICc4cHgnO1xyXG4gICAgICAgICAgICAgICAgKHJvdy5jb250cm9sRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmZsZXggPSAnMSc7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkVGV4dCh0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0LnNldFBsYWNlaG9sZGVyKCdUZXh0IGluIHRpdGxlIG9yIGRlc2NyaXB0aW9uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdC5zZXRWYWx1ZSh0ci5wYXR0ZXJuKTtcclxuICAgICAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKGFzeW5jIHYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc1tpZHhdLnBhdHRlcm4gPSB2IHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50cmlnZ2VycyA9IGl0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAodC5pbnB1dEVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoJ2RiLWlucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgKHQuaW5wdXRFbCBhcyBIVE1MSW5wdXRFbGVtZW50KS5zdHlsZS5mbGV4ID0gJzEnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByb3cuYWRkRHJvcGRvd24oZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZW50Q2F0ZWdvcmllcyB8fCBbXTtcclxuICAgICAgICAgICAgICAgICAgICBkLmFkZE9wdGlvbignJywgJ0RlZmF1bHQnKTtcclxuICAgICAgICAgICAgICAgICAgICBjYXRzLmZvckVhY2goYyA9PiBkLmFkZE9wdGlvbihjLmlkLCBjLm5hbWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBkLnNldFZhbHVlKHRyLmNhdGVnb3J5SWQgfHwgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGQub25DaGFuZ2UoYXN5bmMgdiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zW2lkeF0uY2F0ZWdvcnlJZCA9IHYgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRyaWdnZXJzID0gaXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpZXc/LnJlbmRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIChkLnNlbGVjdEVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5jbGFzc0xpc3QuYWRkKCdkYi1zZWxlY3QnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcm93LmFkZEV4dHJhQnV0dG9uKGJ0biA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnRuLnNldEljb24oJ3gnKS5zZXRUb29sdGlwKCdEZWxldGUnKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlZCA9IGl0ZW1zLmZpbHRlcigoXywgaSkgPT4gaSAhPT0gaWR4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSB1cGRhdGVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgbmV3IFNldHRpbmcodHJpZ2dlcnNXcmFwKS5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJysgQWRkIFRyaWdnZXInKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtczIgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgfHwgW10pLnNsaWNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMyLnB1c2goeyBwYXR0ZXJuOiAnJywgY2F0ZWdvcnlJZDogJycgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudHJpZ2dlcnMgPSBpdGVtczI7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyVHJpZ2dlcnMoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJlbmRlclRyaWdnZXJzKCk7XHJcblxyXG4gICAgICAgIC8vIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ0N1c3RvbSBTd2F0Y2hlcycgfSk7XHJcbiAgICAgICAgY29uc3Qgc3dhdGNoZXNTZWN0aW9uID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgKHN3YXRjaGVzU2VjdGlvbiBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICBuZXcgU2V0dGluZyhzd2F0Y2hlc1NlY3Rpb24pXHJcbiAgICAgICAgICAgIC8vIC5zZXROYW1lKCdFbmFibGUgQ3VzdG9tIFN3YXRjaGVzJylcclxuICAgICAgICAgICAgLy8gLnNldERlc2MoJ0lmIG9uLCB5b3VyIGN1c3RvbSBzd2F0Y2hlcyB3aWxsIGFwcGVhciBpbiB0aGUgY29sb3IgcGlja2VyLicpXHJcbiAgICAgICAgICAgIC8vIC5hZGRUb2dnbGUodCA9PiB7XHJcbiAgICAgICAgICAgIC8vICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVN3YXRjaGVzRW5hYmxlZCA/PyBmYWxzZSlcclxuICAgICAgICAgICAgLy8gICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21Td2F0Y2hlc0VuYWJsZWQgPSB2O1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAvLyAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY29sb3JzVGl0bGUgPSBzd2F0Y2hlc1NlY3Rpb24uY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiAnQ29sb3JzJyB9KTtcclxuICAgICAgICBjb25zdCBjb2xvcnNMaXN0ID0gc3dhdGNoZXNTZWN0aW9uLmNyZWF0ZURpdigpO1xyXG4gICAgICAgIGNvbnN0IHJlbmRlckNvbG9ycyA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29sb3JzTGlzdC5lbXB0eSgpO1xyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBjb2xvcnNMaXN0LmNyZWF0ZURpdigpO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgcm93LnN0eWxlLmdhcCA9ICc4cHgnO1xyXG4gICAgICAgICAgICByb3cuc3R5bGUuYWxpZ25JdGVtcyA9ICdmbGV4LXN0YXJ0JztcclxuICAgICAgICAgICAgcm93LnN0eWxlLm1hcmdpbkJvdHRvbSA9ICcxNnB4JztcclxuICAgICAgICAgICAgcm93LnN0eWxlLmZsZXhXcmFwID0gJ3dyYXAnO1xyXG4gICAgICAgICAgICBjb25zdCBidWlsdCA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyB8fCBbXSkubWFwKHMgPT4gKHsgbmFtZTogcy5uYW1lLCBjb2xvcjogcy5jb2xvciwgc291cmNlOiAnYnVpbHQnIGFzIGNvbnN0IH0pKTtcclxuICAgICAgICAgICAgY29uc3QgY3VzdG9tcyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSB8fCAnJywgY29sb3I6IHMuY29sb3IgfHwgJyNmZjAwMDAnLCBzb3VyY2U6ICdjdXN0b20nIGFzIGNvbnN0IH0pKTtcclxuICAgICAgICAgICAgY29uc3QgY29tYmluZWQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfVtdID0gWy4uLmJ1aWx0LCAuLi5jdXN0b21zXTtcclxuICAgICAgICAgICAgY29uc3QgbWFrZUl0ZW0gPSAoZW50cnk6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nLCBzb3VyY2U6ICdidWlsdCd8J2N1c3RvbScgfSwgaWR4OiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdyYXAgPSByb3cuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZ2FwID0gJzZweCc7XHJcbiAgICAgICAgICAgICAgICB3cmFwLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQuc291cmNlID0gZW50cnkuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgd3JhcC5kYXRhc2V0LmluZGV4ID0gU3RyaW5nKGlkeCk7XHJcbiAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9IGVudHJ5Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IHdyYXAuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAnY29sb3InIH0pO1xyXG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBlbnRyeS5jb2xvcjtcclxuICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5xdWVyeVNlbGVjdG9yQWxsKCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKHc6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKHcucXVlcnlTZWxlY3RvcignaW5wdXRbdHlwZT1cImNvbG9yXCJdJykgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogdmFsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbCA9IHdyYXAuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnZGF5YmxlLWJ0biBkYi1jb2xvci1kZWwnIH0pO1xyXG4gICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICdub25lJztcclxuICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLnBhZGRpbmcgPSAnMnB4IDRweCc7XHJcbiAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcclxuICAgICAgICAgICAgICAgIGRlbC5zZXRBdHRyKCdkcmFnZ2FibGUnLCdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgZGVsLm9ubW91c2Vkb3duID0gKGUpID0+IHsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfTtcclxuICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgZGVsLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnRGVsZXRlIHRoaXMgY29sb3Igc3dhdGNoPycsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3QnVpbHQ6IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDdXN0b206IHsgbmFtZTogc3RyaW5nLCBjb2xvcjogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0LnNvdXJjZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5tID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQubmFtZSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICh3LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNyYyA9PT0gJ2J1aWx0JykgbmV3QnVpbHQucHVzaCh7IG5hbWU6IG5tLCBjb2xvcjogdmFsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBuZXdDdXN0b20ucHVzaCh7IG5hbWU6ICcnLCBjb2xvcjogdmFsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3dhdGNoZXMgPSBuZXdCdWlsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXNlckN1c3RvbVN3YXRjaGVzID0gbmV3Q3VzdG9tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgd3JhcC5vbmRyYWdzdGFydCA9IGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKCd0ZXh0L3BsYWluJywgJ2RyYWcnKTtcclxuICAgICAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIgYXMgRGF0YVRyYW5zZmVyKS5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJvdy5vbmRyYWdvdmVyID0gZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgfTtcclxuICAgICAgICAgICAgICAgIHJvdy5vbmRyb3AgPSBhc3luYyBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCdkaXZbZHJhZ2dhYmxlPVwidHJ1ZVwiXScpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQucGFyZW50RWxlbWVudCAhPT0gcm93KSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmUgPSAoZS5jbGllbnRYIC0gcmVjdC5sZWZ0KSA8IHJlY3Qud2lkdGggLyAyO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHJvdy5pbnNlcnRCZWZvcmUod3JhcCwgdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHRhcmdldC5hZnRlcih3cmFwKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICh3LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiB2YWwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JhcDtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY29tYmluZWQuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4geyBtYWtlSXRlbShlbnRyeSwgaWR4KTsgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xzQm90dG9tID0gbmV3IFNldHRpbmcoY29sb3JzTGlzdCk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbC5hZGRDbGFzcygnZGF5YmxlLWNvbG9ycy1jb250cm9scycpO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcclxuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xyXG4gICAgICAgICAgICAoY29udHJvbHNCb3R0b20uc2V0dGluZ0VsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5nYXAgPSAnOHB4JztcclxuICAgICAgICAgICAgKGNvbnRyb2xzQm90dG9tLnNldHRpbmdFbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcbiAgICAgICAgICAgIChjb250cm9sc0JvdHRvbS5zZXR0aW5nRWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtc3RhcnQnO1xyXG4gICAgICAgICAgICBjb250cm9sc0JvdHRvbS5hZGRCdXR0b24oYiA9PiB7XHJcbiAgICAgICAgICAgICAgICBiLnNldEJ1dHRvblRleHQoJ1Jlc2V0IHRvIERlZmF1bHQgQ29sb3JzJykub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQ29uZmlybU1vZGFsKHRoaXMuYXBwLCAnUmVzZXQgY29sb3Igc3dhdGNoZXMgdG8gZGVmYXVsdD8nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gKERFRkFVTFRfU0VUVElOR1Muc3dhdGNoZXMgfHwgW10pLm1hcChzID0+ICh7IG5hbWU6IHMubmFtZSwgY29sb3I6IHMuY29sb3IsIHRleHRDb2xvcjogKHMgYXMgYW55KS50ZXh0Q29sb3IgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbG9ycygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29udHJvbHNCb3R0b20uYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCcrIEFkZCBDb2xvcicpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdyYXAgPSByb3cuY3JlYXRlRGl2KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zdHlsZS5kaXNwbGF5ID0gJ2ZsZXgnO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuc3R5bGUuZ2FwID0gJzZweCc7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JhcC5zZXRBdHRyKCdkcmFnZ2FibGUnLCAndHJ1ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAuZGF0YXNldC5zb3VyY2UgPSAnY3VzdG9tJztcclxuICAgICAgICAgICAgICAgICAgICB3cmFwLmRhdGFzZXQubmFtZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gd3JhcC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjb2xvcicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSAnI2ZmMDAwMCc7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSAody5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWwgPSB3cmFwLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ2RheWJsZS1idG4gZGItY29sb3ItZGVsJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIChkZWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLmJveFNoYWRvdyA9ICdub25lJztcclxuICAgICAgICAgICAgICAgICAgICAoZGVsIGFzIEhUTUxCdXR0b25FbGVtZW50KS5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgKGRlbCBhcyBIVE1MQnV0dG9uRWxlbWVudCkuc3R5bGUucGFkZGluZyA9ICcycHggNHB4JztcclxuICAgICAgICAgICAgICAgICAgICBzZXRJY29uKGRlbCwgJ3gnKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWwuc2V0QXR0cignZHJhZ2dhYmxlJywnZmFsc2UnKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWwub25tb3VzZWRvd24gPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5vbnRvdWNoc3RhcnQgPSAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbC5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBDb25maXJtTW9kYWwodGhpcy5hcHAsICdEZWxldGUgdGhpcyBjb2xvciBzd2F0Y2g/JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0N1c3RvbTogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm0gPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5uYW1lIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICh3LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIG5ld0N1c3RvbS5wdXNoKHsgbmFtZTogJycsIGNvbG9yOiB2YWwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy51c2VyQ3VzdG9tU3dhdGNoZXMgPSBuZXdDdXN0b207XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHdyYXAub25kcmFnc3RhcnQgPSBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXI/LnNldERhdGEoJ3RleHQvcGxhaW4nLCAnZHJhZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoZS5kYXRhVHJhbnNmZXIgYXMgRGF0YVRyYW5zZmVyKS5lZmZlY3RBbGxvd2VkID0gJ21vdmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgcm93Lm9uZHJhZ292ZXIgPSBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5vbmRyb3AgPSBhc3luYyBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCB8fCB0YXJnZXQucGFyZW50RWxlbWVudCAhPT0gcm93KSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IChlLmNsaWVudFggLSByZWN0LmxlZnQpIDwgcmVjdC53aWR0aCAvIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHJvdy5pbnNlcnRCZWZvcmUod3JhcCwgdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0YXJnZXQuYWZ0ZXIod3JhcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0J1aWx0OiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdltkcmFnZ2FibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgodzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSAodyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5zb3VyY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSAody5xdWVyeVNlbGVjdG9yKCdpbnB1dFt0eXBlPVwiY29sb3JcIl0nKSBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzcmMgPT09ICdidWlsdCcpIG5ld0J1aWx0LnB1c2goeyBuYW1lOiBubSwgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN3YXRjaGVzID0gbmV3QnVpbHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdCdWlsdDogeyBuYW1lOiBzdHJpbmcsIGNvbG9yOiBzdHJpbmcgfVtdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q3VzdG9tOiB7IG5hbWU6IHN0cmluZywgY29sb3I6IHN0cmluZyB9W10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICByb3cucXVlcnlTZWxlY3RvckFsbCgnZGl2W2RyYWdnYWJsZT1cInRydWVcIl0nKS5mb3JFYWNoKCh3OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3JjID0gKHcgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQuc291cmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBubSA9ICh3IGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0Lm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9ICh3LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W3R5cGU9XCJjb2xvclwiXScpIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3JjID09PSAnYnVpbHQnKSBuZXdCdWlsdC5wdXNoKHsgbmFtZTogbm0sIGNvbG9yOiB2YWwgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgbmV3Q3VzdG9tLnB1c2goeyBuYW1lOiAnJywgY29sb3I6IHZhbCB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zd2F0Y2hlcyA9IG5ld0J1aWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVzZXJDdXN0b21Td2F0Y2hlcyA9IG5ld0N1c3RvbTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgKGIuYnV0dG9uRWwgYXMgSFRNTEJ1dHRvbkVsZW1lbnQpLnN0eWxlLm1hcmdpbkxlZnQgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgO1xyXG5cclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdEYXRhIE1hbmFnZW1lbnQnIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnRXhwb3J0IERhdGEnKVxyXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdFeHBvcnQgRGF0YScpXHJcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhdWx0TmFtZSA9ICh0aGlzLmFwcC52YXVsdCBhcyBhbnkpPy5nZXROYW1lPy4oKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIGFueSk/LmJhc2VQYXRoPy5zcGxpdCgvW1xcXFwvXS8pLmZpbHRlcihCb29sZWFuKS5wb3AoKSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICdWYXVsdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cG9ydE9iajogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmF1bHROYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3M6IHRoaXMucGx1Z2luLnNldHRpbmdzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9udGhzOiBbXSBhcyBBcnJheTx7IGZpbGU6IHN0cmluZywgZGF0YTogYW55IH0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmVudHJpZXNGb2xkZXIgfHwgJ0RheWJsZUNhbGVuZGFyJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlzdGluZyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChmb2xkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMgPSAobGlzdGluZy5maWxlcyB8fCBbXSkuZmlsdGVyKChmOiBzdHJpbmcpID0+IGYudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLmpzb24nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR4dCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZChmKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZSh0eHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydE9iai5tb250aHMucHVzaCh7IGZpbGU6IGYsIGRhdGEgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZuYW1lID0gYCR7Zm9sZGVyfS9EYXlibGVFeHBvcnRfJHt2YXVsdE5hbWV9XyR7RGF0ZS5ub3coKX0uanNvbmA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoZm5hbWUsIEpTT04uc3RyaW5naWZ5KGV4cG9ydE9iaiwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBFeHBvcnRlZDogJHtmbmFtZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0V4cG9ydCBmYWlsZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnSW1wb3J0IERhdGEnKVxyXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4ge1xyXG4gICAgICAgICAgICAgICAgYi5zZXRCdXR0b25UZXh0KCdJbXBvcnQgRGF0YScpXHJcbiAgICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LmFjY2VwdCA9ICdhcHBsaWNhdGlvbi9qc29uLC5qc29uJztcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGlucHV0LmZpbGVzPy5bMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGZpbGUudGV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gSlNPTi5wYXJzZSh0ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmo/LnNldHRpbmdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBvYmouc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqPy5tb250aHMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZW50cmllc0ZvbGRlciB8fCAnRGF5YmxlQ2FsZW5kYXInO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdChmb2xkZXIpOyB9IGNhdGNoIHsgdHJ5IHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlcik7IH0gY2F0Y2gge30gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbSBvZiBvYmoubW9udGhzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0eXBlb2YgbS5maWxlID09PSAnc3RyaW5nJyA/IG0uZmlsZSA6IGAke2ZvbGRlcn0vSW1wb3J0ZWRfJHtEYXRlLm5vdygpfS5qc29uYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShtLmRhdGEgPz8ge30sIG51bGwsIDIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aWV3ID0gdGhpcy5wbHVnaW4uZ2V0Q2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmlldykgeyBhd2FpdCB2aWV3LmxvYWRBbGxFbnRyaWVzKCk7IHZpZXcucmVuZGVyKCk7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ0ltcG9ydCBjb21wbGV0ZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZSgnSW1wb3J0IGZhaWxlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiByYW5kb21JZCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgYW55Q3J5cHRvID0gKHdpbmRvdyBhcyBhbnkpLmNyeXB0bztcclxuICAgIGlmIChhbnlDcnlwdG8/LnJhbmRvbVVVSUQpIHJldHVybiBhbnlDcnlwdG8ucmFuZG9tVVVJRCgpO1xyXG4gICAgcmV0dXJuICdldi0nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikgKyAnLScgKyBEYXRlLm5vdygpO1xyXG59XHJcbiJdfQ==