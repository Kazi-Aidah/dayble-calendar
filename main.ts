import { App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, setIcon, Menu, TFile, FuzzySuggestModal, TFolder, Vault, DataAdapter, setTooltip, getIconIds, moment, requestUrl, Component, MarkdownRenderer } from 'obsidian';

const VIEW_TYPE = 'dayble-calendar-view';

const timeToMinutes = (s: string): number => {
    if (!s) return 0;
    const parts = s.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return (h * 60) + m;
};

interface DaybleSettings {
    weekStartDay: number;
    entriesFolder: string;
    iconPlacement?: 'left' | 'right' | 'none' | 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';
    eventTitleAlign?: 'left' | 'center' | 'right' | 'center-left';
    eventDescAlign?: 'left' | 'center' | 'right' | 'center-left';
    timeFormat?: '24h' | '12h';
    holderOpen?: boolean;
    holderWidth?: number; // in pixels
    weeklyNotesHeight?: number; // in pixels
    eventCategories?: EventCategory[];
    preferUserColors?: boolean; // prefer user-set event colors over category colors
    eventBgOpacity?: number; // 0-1, controls background opacity
    eventBorderWidth?: number; // 0-5px, controls border thickness
    eventBorderRadius?: number; // px, controls border radius
    eventBorderOpacity?: number; // 0-1, controls border color opacity (for colored events)
    dayCellRadius?: number; // px, controls day cell border radius
    eventVerticalPadding?: number; // px, controls event vertical padding
    colorSwatchPosition?: 'under-title' | 'under-description' | 'none'; // position of color swatches in modal
    onlyAnimateToday?: boolean;
    completeBehavior?: 'none' | 'dim' | 'strikethrough' | 'hide' | 'color';
    completeColor?: string;
    customSwatchesEnabled?: boolean;
    replaceDefaultSwatches?: boolean;
    swatches?: { name: string, color: string, textColor?: string }[];
    userCustomSwatches?: { name: string, color: string, textColor?: string }[];
    defaultColorsFolded?: boolean;
    customSwatchesFolded?: boolean;
    dayCellMaxHeight?: number;
    dayCellMinWidth?: number;
    holderPlacement?: 'left' | 'right' | 'hidden';
    calendarWeekActive?: boolean;
    calendarView?: 'Month' | 'Week' | 'Day' | 'Agenda';
    triggers?: { id?: string, pattern: string, categoryId: string, color?: string, textColor?: string, colorName?: string }[];
    weeklyNotesEnabled?: boolean;
    todayModalSplitView?: boolean;
    tooltipEnabled?: boolean;
    showCopyTextOption?: boolean;
    onlyShowPinnedEventsMonth?: boolean;
    onlyShowPinnedEventsWeek?: boolean;
    onlyShowPinnedEventsAgenda?: boolean;
    defaultEventColorName?: string;
    eventStates?: EventState[];
    weekTitleFormat?: 'month_year' | 'week_number' | 'full_range' | 'short_range';
    dayTitleFormat?: string;
    agendaTitleFormat?: string;
    agendaDateFormat?: string;
} 

const DEFAULT_SETTINGS: DaybleSettings = {
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
    eventBorderWidth: 2,
    eventBorderRadius: 6,
    eventBorderOpacity: 0.25,
    dayCellRadius: 8,
    eventVerticalPadding: 2,
    colorSwatchPosition: 'under-title',
    onlyAnimateToday: false,
    completeBehavior: 'dim',
    completeColor: '',
    customSwatchesEnabled: false,
    replaceDefaultSwatches: false,
    defaultColorsFolded: true,
    customSwatchesFolded: false,
    dayCellMaxHeight: 0,
    dayCellMinWidth: 0,
    holderPlacement: 'left',
    calendarWeekActive: false,
    calendarView: 'Month',
    weeklyNotesEnabled: false,
    todayModalSplitView: true,
    tooltipEnabled: true,
    showCopyTextOption: false,
    onlyShowPinnedEventsMonth: false,
    onlyShowPinnedEventsWeek: false,
    onlyShowPinnedEventsAgenda: false,
    defaultEventColorName: '',
    eventStates: [],
    weekTitleFormat: 'month_year',
    dayTitleFormat: 'dddd, D MMMM',
    agendaTitleFormat: 'MMMM YYYY',
    agendaDateFormat: 'dddd, D MMMM',
    swatches: [
        // { name: 'Red', color: '#eb3b5a', textColor: '#f9c6d0' },
        // { name: 'Orange', color: '#fa8231', textColor: '#fed8be' },
        // { name: 'Amber', color: '#e5a216', textColor: '#f8e5bb' },
        // { name: 'Green', color: '#20bf6b', textColor: '#c4eeda' },
        // { name: 'Teal', color: '#0fb9b1', textColor: '#bdecea' },
        // { name: 'Blue', color: '#2d98da', textColor: '#c5e3f8' },
        // { name: 'Dark Blue', color: '#3867d6', textColor: '#c9d5f8' },
        // { name: 'Indigo', color: '#5454d0', textColor: '#d2d2f8' },
        // { name: 'Purple', color: '#8854d0', textColor: '#e2d2f8' },
        // { name: 'Violet', color: '#b554d0', textColor: '#edd2f8' },
        // { name: 'Magenta', color: '#e832c1', textColor: '#f8c2ef' },
        // { name: 'Hot Pink', color: '#e83289', textColor: '#f8c2e0' },
        // { name: 'Brown', color: '#965b3b', textColor: '#e5d4c9' },
        // { name: 'Gray', color: '#8392a4', textColor: '#e3e6ea' }

        { name: 'Red',        color: '#952237', textColor: '#e9b7c1' },
        { name: 'Orange',     color: '#ae581e', textColor: '#eec7ad' },
        { name: 'Amber',      color: '#a97714', textColor: '#e8d7ad' },
        { name: 'Green',      color: '#1d9356', textColor: '#b2dbc8' },
        { name: 'Teal',       color: '#1d9993', textColor: '#a9d9d6' },
        { name: 'Blue',       color: '#24709f', textColor: '#b2d2ea' },
        { name: 'Dark Blue', color: '#25499d', textColor: '#b7c4ea' },
        { name: 'Indigo',     color: '#353597', textColor: '#c1c1ea' },
        { name: 'Purple',     color: '#5d33a1', textColor: '#d4c4ea' },
        { name: 'Violet',    color: '#77328e', textColor: '#e0c4ea' },
        { name: 'Magenta',       color: '#9d2383', textColor: '#eab3de' },
        { name: 'Hot Pink',       color: '#a42661', textColor: '#eab3cc' },
        { name: 'Brown',      color: '#653c26', textColor: '#d8c6bb' },
        { name: 'Gray',       color: '#515d6b', textColor: '#d5d9de' }

    ],
    userCustomSwatches: [],
    eventCategories: [],
    triggers: []
};

interface DaybleEvent {
    id: string;
    title: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    time?: string;
    description?: string;
    icon?: string;
    completed?: boolean;
    pinned?: boolean;
    color?: string; // user-set color (hex)
    textColor?: string; // user-set text color (hex)
    colorName?: string; // swatch name
    categoryId?: string;
    stateId?: string;
    effect?: string;
    animation?: string;
    animation2?: string;
    settings?: {
        titleAlign?: 'left' | 'center' | 'right' | 'center-left';
        descAlign?: 'left' | 'center' | 'right' | 'center-left';
        layout?: string;
    };
}

interface EventCategory {
    id: string;
    name: string;
    bgColor: string;
    textColor: string;
    effect: string;
    animation: string;
    animation2: string;
    icon?: string;
}

interface EventState {
    id: string;
    name: string;
    icon: string;
    colorName: string;
    effect: string;
    animation: string;
    animation2: string;
}

export default class DaybleCalendarPlugin extends Plugin {
    settings: DaybleSettings;

    async fetchAllReleases() {
        const allReleases = [];
        let page = 1;
        let hasMorePages = true;
        while (hasMorePages) {
            const url = `https://api.github.com/repos/Kazi-Aidah/dayble-calendar/releases?page=${page}&per_page=100`;
            try {
                let data = null;
                if (typeof requestUrl === 'function') {
                    try {
                        const res = await requestUrl({ 
                            url, 
                            headers: { 
                                'Accept': 'application/vnd.github.v3+json', 
                                'User-Agent': 'Obsidian-Dayble-Calendar' 
                            } 
                        });
                        data = res.json || (res.text ? JSON.parse(res.text) : null);
                    } catch { /* ignore */ }
                }
                if (!data) {
                    try {
                        const r = await requestUrl({ 
                            url,
                            headers: { 
                                'Accept': 'application/vnd.github.v3+json', 
                                'User-Agent': 'Obsidian-Dayble-Calendar' 
                            } 
                        });
                        data = r.json;
                    } catch {
                        hasMorePages = false;
                        break;
                    }
                }
                if (!Array.isArray(data) || data.length === 0) {
                    hasMorePages = false;
                } else {
                    allReleases.push(...data);
                    if (data.length < 100) {
                        hasMorePages = false;
                    } else {
                        page++;
                    }
                }
            } catch {
                hasMorePages = false;
            }
        }
        return allReleases;
    }

    async onload() {
        await this.loadSettings();
        
        this.registerView(VIEW_TYPE, leaf => new DaybleCalendarView(leaf, this));

        this.addRibbonIcon('calendar-heart', 'Dayble calendar', () => {
            void this.openDayble();
        });

        this.addCommand({ id: 'open-calendar', name: 'Open calendar', callback: () => void this.openDayble() });
        this.addCommand({ 
            id: 'open-daily-view', 
            name: 'Open daily view', 
            callback: async () => { 
                await this.openDayble(); 
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Day';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch (e) { console.error(e); }
                }
            } 
        });
        this.addCommand({ 
            id: 'open-agenda-view', 
            name: 'Open agenda view', 
            callback: async () => { 
                await this.openDayble(); 
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Agenda';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch (e) { console.error(e); }
                }
            } 
        });
        this.addCommand({ 
            id: 'add-new-event', 
            name: 'Add new event', 
            callback: async () => { 
                await this.openDayble(); 
                const view = this.getCalendarView();
                if (view) {
                    view.openEventModal(undefined, moment().format('YYYY-MM-DD'));
                }
            } 
        });
        this.addCommand({ id: 'focus-today', name: 'Focus on today', callback: () => void this.focusToday() });
        this.addCommand({ 
            id: 'open-weekly-view', 
            name: 'Open weekly view', 
            callback: async () => { 
                await this.openDayble(); 
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Week';
                    this.settings.calendarWeekActive = true;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch (e) { console.error(e); }
                }
            } 
        });
        this.addCommand({ 
            id: 'open-monthly-view', 
            name: 'Open monthly view', 
            callback: async () => { 
                await this.openDayble(); 
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Month';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch (e) { console.error(e); }
                }
            } 
        });
this.addSettingTab(new DaybleSettingTab(this.app, this));
try { await this.ensureEntriesFolder(); } catch (e) { console.error(e); }
    void this.openDayble();
    }

    onunload() {
        // Do not detach leaves here to respect user layout
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

        // Migration: split onlyShowPinnedEvents into Month and Week settings
        if (data && data.onlyShowPinnedEvents !== undefined) {
            if (data.onlyShowPinnedEventsMonth === undefined) {
                this.settings.onlyShowPinnedEventsMonth = data.onlyShowPinnedEvents;
            }
            if (data.onlyShowPinnedEventsWeek === undefined) {
                this.settings.onlyShowPinnedEventsWeek = data.onlyShowPinnedEvents;
            }
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async openDayble() {
        const leaf = this.getOrCreateLeaf();
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    focusToday() {
        const view = this.getCalendarView();
        if (view) view.focusToday();
        else void this.openDayble();
    }

    getCalendarView(): DaybleCalendarView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length > 0) return leaves[0].view as DaybleCalendarView;
        return null;
    }

    getOrCreateLeaf(): WorkspaceLeaf {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length) return leaves[0];
        return this.app.workspace.getLeaf(true) ?? this.app.workspace.getRightLeaf(false);
    }

    async ensureEntriesFolder() {
        const folder = this.settings.entriesFolder;
        if (!folder || folder.trim() === '') {
            return;
        }
        try {
            await this.app.vault.adapter.stat(folder);
        } catch {
            try {
                await this.app.vault.createFolder(folder);
            } catch {
                // Ignore folder exists error
            }
        }
    }
}

class DaybleCalendarView extends ItemView {
    plugin: DaybleCalendarPlugin;
    rootEl: HTMLElement;
    headerEl: HTMLElement;
    monthTitleEl: HTMLElement;
    weekHeaderEl: HTMLElement;
    calendarEl: HTMLElement;
    bodyEl: HTMLElement;
    holderEl: HTMLElement;
    gridEl: HTMLElement;
    _longOverlayEl?: HTMLElement;
    _longEls: Map<string, HTMLElement> = new Map();
    currentDate: Date;
    events: DaybleEvent[] = [];
    holderEvents: DaybleEvent[] = [];
    weeklyNotes: Record<string, string> = {};
    isSelecting = false;
    isDragging = false;
    selectionStartDate: string | null = null;
    selectionEndDate: string | null = null;
    isResizingHolder = false;
    holderResizeStartX = 0;
    holderResizeStartWidth = 0;
    _boundHolderMouseMove?: (e: MouseEvent) => void;
    _boundHolderMouseUp?: (e: MouseEvent) => void;
    _longRO?: ResizeObserver;
    currentTodayModal?: TodayModal;
    weekToggleBtn?: HTMLElement;
    weeklyNotesEl?: HTMLElement;
    dragId?: string;
    dragDuration?: number;
    dragEl?: HTMLElement;
    dragOffsetY?: number;
    lastScrollTop?: number;
    dayModeTodayModal?: TodayModal;
    _dayModeRO?: ResizeObserver;
    viewSelectEl: HTMLSelectElement;
    saveTimeout: any;
    isResizingWeeklyNotes = false;
    weeklyNotesResizeStartY = 0;
    weeklyNotesResizeStartHeight = 0;
    _boundWeeklyNotesMouseMove?: (e: MouseEvent) => void;
    _boundWeeklyNotesMouseUp?: (e: MouseEvent) => void;

    constructor(leaf: WorkspaceLeaf, plugin: DaybleCalendarPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentDate = new Date();
        this.plugin.registerDomEvent(window, 'resize', () => {
            void this.render();
        });
    }

    debouncedSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => void this.saveAllEntries(), 1000);
    }

    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'Dayble calendar'; }
    getIcon() { return 'calendar-heart'; }
    
    getMonthDataFilePath(): string {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const year = this.currentDate.getFullYear();
        const month = monthNames[this.currentDate.getMonth()];
        const filename = `${year}${month}.json`;
        return `${this.plugin.settings.entriesFolder}/${filename}`;
    }

    async onOpen() {
        this.rootEl = this.containerEl.createDiv({ cls: 'dayble-root' });
        this.rootEl.style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
        this.rootEl.style.setProperty('--day-cell-radius', `${this.plugin.settings.dayCellRadius ?? 8}px`);
        this.rootEl.style.setProperty('--event-vertical-padding', `${this.plugin.settings.eventVerticalPadding ?? 2}px`);
        const initialMinW = this.plugin.settings.dayCellMinWidth ?? 0;
        if (initialMinW > 0) {
            this.rootEl.style.setProperty('--dayble-cell-min-width', `${initialMinW}px`);
        } else {
            this.rootEl.style.removeProperty('--dayble-cell-min-width');
        }
        this.headerEl = this.rootEl.createDiv({ cls: 'dayble-header' });
        const left = this.headerEl.createDiv({ cls: 'dayble-nav-left' });
        const holderToggle = document.createElement('button');
        holderToggle.className = 'dayble-btn dayble-header-buttons dayble-holder-toggle';
        setIcon(holderToggle, 'menu');
        holderToggle.onclick = async () => { this.holderEl.classList.toggle('open'); this.plugin.settings.holderOpen = this.holderEl.classList.contains('open'); await this.plugin.saveSettings(); };
        const searchBtn = document.createElement('button');
        searchBtn.className = 'dayble-btn dayble-header-buttons dayble-search-toggle';
        setIcon(searchBtn, 'search');
        searchBtn.onclick = () => { const modal = new PromptSearchModal(this.app, this); void modal.open(); };

        /*
        const weekToggle = document.createElement('button');
        weekToggle.className = 'dayble-btn dayble-header-buttons dayble-week-toggle';
        setIcon(weekToggle, 'calendar-range');
        weekToggle.onclick = async () => {
             this.plugin.settings.calendarWeekActive = !this.plugin.settings.calendarWeekActive;
             await this.plugin.saveSettings();
             await this.loadAllEntries();
             void this.render();
        };
        this.weekToggleBtn = weekToggle;
        */

        const viewSelect = document.createElement('select');
        this.viewSelectEl = viewSelect;
        viewSelect.className = 'dayble-view-select';
        ['Month', 'Week', 'Day', 'Agenda'].forEach(mode => {
            const opt = viewSelect.createEl('option', { text: mode, value: mode });
            if (this.plugin.settings.calendarView === mode) opt.selected = true;
        });
        viewSelect.onchange = async () => {
            this.plugin.settings.calendarView = viewSelect.value as any;
            this.plugin.settings.calendarWeekActive = viewSelect.value === 'Week';
            await this.plugin.saveSettings();
            void this.render();
        };

        viewSelect.onwheel = async (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            const currentIndex = viewSelect.selectedIndex;
            const newIndex = Math.max(0, Math.min(viewSelect.options.length - 1, currentIndex + direction));
            
            if (newIndex !== currentIndex) {
                viewSelect.selectedIndex = newIndex;
                this.plugin.settings.calendarView = viewSelect.value as any;
                this.plugin.settings.calendarWeekActive = viewSelect.value === 'Week';
                await this.plugin.saveSettings();
                void this.render();
            }
        };

        this.monthTitleEl = this.headerEl.createEl('h1', { cls: 'dayble-month-title' });
        const right = this.headerEl.createDiv({ cls: 'dayble-nav-right' });
        const prevBtn = document.createElement('button'); prevBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(prevBtn, 'chevron-left');
        prevBtn.onclick = () => { this.shiftMonth(-1); };
        const todayBtn = document.createElement('button'); todayBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(todayBtn, 'dot');
        todayBtn.onclick = () => { this.focusToday(); };
        const nextBtn = document.createElement('button'); nextBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(nextBtn, 'chevron-right');
        nextBtn.onclick = () => { this.shiftMonth(1); };
        const placement = this.plugin.settings.holderPlacement ?? 'left';
        
        if (placement === 'left') left.appendChild(holderToggle);
        
        left.appendChild(prevBtn);
        left.appendChild(todayBtn);
        left.appendChild(nextBtn);
        // left.appendChild(weekToggle);
        
        right.appendChild(viewSelect);
        right.appendChild(searchBtn);
        if (placement === 'right') right.appendChild(holderToggle);
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
        setIcon(holderAdd, 'plus');
        holderAdd.onclick = () => void this.openEventModal();
        
        // Add resize handle to holder
        const resizeHandle = holderHeader.createDiv({ cls: 'dayble-holder-resize-handle' });
        
        this._boundHolderMouseMove = (e: MouseEvent) => {
            if (!this.isResizingHolder) return;
            let diff = e.clientX - this.holderResizeStartX;
            // When holder is on the right, reverse the direction
            if (placement === 'right') {
                diff = -diff;
            }
            const newWidth = Math.max(200, this.holderResizeStartWidth + diff);
            this.holderEl.setCssProps({ 'width': newWidth + 'px' });
        };
        
        this._boundHolderMouseUp = async (e: MouseEvent) => {
        if (this.isResizingHolder) {
            this.isResizingHolder = false;
            document.removeEventListener('mousemove', this._boundHolderMouseMove);
            document.removeEventListener('mouseup', this._boundHolderMouseUp);
            this.plugin.settings.holderWidth = this.holderEl.offsetWidth;
            await this.plugin.saveSettings();
        }
    };
        
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
        this.holderEl.ondrop = async (e) => {
            e.preventDefault();
            this.holderEl.removeClass('dayble-drag-over');
            const id = e.dataTransfer?.getData('text/plain');
            if (!id || e.dataTransfer?.getData('dayble-source') === 'holder') return; // Don't drop holder events on holder
            try {
                const idx = this.events.findIndex(ev => ev.id === id);
                if (idx !== -1) {
                    const ev = this.events.splice(idx, 1)[0];
                    // Reset date info when moving to holder
                    ev.date = undefined;
                    ev.startDate = undefined;
                    ev.endDate = undefined;
                    this.holderEvents.push(ev);
                    await this.saveAllEntries();
                    void this.renderHolder();
                    void this.render();
                }
            } catch {
                new Notice('Failed to move event to holder');
            }
        };
        this.holderEl.appendChild(holderList);
        
        // Apply saved holder width if it exists
        if (this.plugin.settings.holderWidth) {
            this.holderEl.setCssProps({ 'width': this.plugin.settings.holderWidth + 'px' });
        }
        
        if (this.plugin.settings.holderOpen) this.holderEl.addClass('open'); else this.holderEl.removeClass('open');
        this.calendarEl = this.bodyEl.createDiv({ cls: 'dayble-calendar' });
        this.weekHeaderEl = this.calendarEl.createDiv({ cls: 'dayble-weekdays' });
        this.gridEl = this.calendarEl.createDiv({ cls: 'dayble-grid' });
        await this.loadAllEntries();
        void this.render();
    }

    async onClose() {
        // Clean up resize handle listeners
        if (this._boundHolderMouseMove) {
            document.removeEventListener('mousemove', this._boundHolderMouseMove);
        }
        if (this._boundHolderMouseUp) {
            document.removeEventListener('mouseup', this._boundHolderMouseUp);
        }
        // Disconnect long event ResizeObserver and remove overlay to prevent leaks
        if (this._longRO) {
            try { this._longRO.disconnect(); } catch (e) { console.debug('[Dayble] ResizeObserver disconnect error:', e); }
            this._longRO = undefined;
        }
        if (this._longOverlayEl && this._longOverlayEl.isConnected) {
            try { this._longOverlayEl.remove(); } catch (e) { console.debug('[Dayble] Overlay remove error:', e); }
        }
        this._longEls.forEach(el => {
            try { if (el && el.parentElement) el.remove(); } catch (e) { console.debug('[Dayble] Long event remove error:', e); }
        });
        this._longEls.clear();
        if (this._boundWeeklyNotesMouseMove) {
            document.removeEventListener('mousemove', this._boundWeeklyNotesMouseMove);
        }
        if (this._boundWeeklyNotesMouseUp) {
        document.removeEventListener('mouseup', this._boundWeeklyNotesMouseUp);
    }
    void this.renderHolder();
    await Promise.resolve();
}

    getRequiredFiles(): Set<string> {
        const files = new Set<string>();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        const addDate = (d: Date) => {
            const y = d.getFullYear();
            const m = monthNames[d.getMonth()];
            files.add(`${y}${m}.json`);
        };

        // Always Add current date's month
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

    async loadAllEntries() {
        const files = this.getRequiredFiles();
        this.events = [];
        this.holderEvents = [];
        this.weeklyNotes = {};
        
        const currentFile = this.getMonthDataFilePath().split('/').pop();

        let holderFromGlobal: DaybleEvent[] | null = null;
        try {
            const holderFile = `${this.plugin.settings.entriesFolder}/holder.json`;
            const hjson = await this.app.vault.adapter.read(holderFile);
            const hdata = JSON.parse(hjson);
            if (Array.isArray(hdata?.holder)) {
                holderFromGlobal = hdata.holder;
            }
        } catch {}

        const holderAggregate: DaybleEvent[] = [];
        for (const filename of files) {
            const file = `${this.plugin.settings.entriesFolder}/${filename}`;
            try {
                const json = await this.app.vault.adapter.read(file);
                const data = JSON.parse(json) as { events: DaybleEvent[], holder: DaybleEvent[], weeklyNotes?: Record<string, string>, lastModified?: string };
                if (data.events) {
                    this.events.push(...data.events);
                }
                if (!holderFromGlobal && Array.isArray(data.holder)) {
                    holderAggregate.push(...data.holder);
                }
                if (filename === currentFile) {
                this.weeklyNotes = data.weeklyNotes || {};
            }
        } catch { /* ignore */ }
        }
        
        const seen = new Set();
        this.events = this.events.filter(e => {
            const duplicate = seen.has(e.id);
            seen.add(e.id);
            return !duplicate;
        });

        const finalizeHolder = (list: DaybleEvent[]) => {
            const hSeen = new Set<string>();
            const dedup: DaybleEvent[] = [];
            for (let i = list.length - 1; i >= 0; i--) {
                const h = list[i];
                if (!h || !h.id) continue;
                if (hSeen.has(h.id)) continue;
                hSeen.add(h.id);
                dedup.unshift(h);
            }
            return dedup;
        };
        if (holderFromGlobal) {
            this.holderEvents = finalizeHolder(holderFromGlobal);
        } else {
            this.holderEvents = finalizeHolder(holderAggregate);
        }
    }

    async saveAllEntries() {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }

        const filesToSave = this.getRequiredFiles();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
                           
        const getFilenameForDate = (dateStr: string) => {
             const d = new Date(dateStr);
             if (isNaN(d.getTime())) return null;
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
        const eventsByFile: Record<string, DaybleEvent[]> = {};
        
        // Initialize arrays for known files
        filesToSave.forEach(f => eventsByFile[f] = []);
        
        const orphanEvents: DaybleEvent[] = [];

        this.events.forEach(ev => {
            let targetFile = currentFile; // Default to current file if no date
            if (ev.date) {
                targetFile = getFilenameForDate(ev.date) || currentFile;
            } else if (ev.startDate) {
                targetFile = getFilenameForDate(ev.startDate) || currentFile;
            }
            
            if (targetFile) {
                if (!eventsByFile[targetFile]) eventsByFile[targetFile] = [];
                eventsByFile[targetFile].push(ev);
            } else {
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
            
            let holderToSave: DaybleEvent[] = [];
            let notesToSave: Record<string, string> = {};
            
            // Write the same holder list to all files to keep it global
            holderToSave = this.holderEvents;
            // Weekly notes are per-file; preserve existing notes for non-current files
            if (isCurrent) {
                notesToSave = this.weeklyNotes;
            } else {
                try {
                    if (await this.app.vault.adapter.exists(file)) {
                        const json = await this.app.vault.adapter.read(file);
                        const data = JSON.parse(json);
                        notesToSave = data.weeklyNotes || {};
                }
            } catch { /* ignore */ }
        }

            const data = {
                events: fileEvents,
                holder: holderToSave,
                weeklyNotes: notesToSave,
                lastModified: new Date().toISOString()
            };
            
            try {
                const jsonStr = JSON.stringify(data, null, 2);
                await this.app.vault.adapter.write(file, jsonStr);
            } catch (e) {
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
            await this.app.vault.adapter.write(holderFile, hjsonStr);
        } catch (e) {
            console.error('[Dayble] Failed to save holder.json', e);
        }
    }

    focusToday() {
        this.currentDate = new Date();
        void this.loadAllEntries().then(() => { void this.render(); });
    }

    shiftMonth(delta: number) {
        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        if (view === 'Week') {
            this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
        } else if (view === 'Day') {
            this.currentDate.setDate(this.currentDate.getDate() + delta);
        } else if (view === 'Agenda') {
            // Explicitly shift by month for Agenda view
            const d = new Date(this.currentDate);
            d.setMonth(d.getMonth() + delta);
            this.currentDate = d;
        } else {
            const d = new Date(this.currentDate);
            d.setMonth(d.getMonth() + delta);
            this.currentDate = d;
        }
        void this.loadAllEntries().then(() => { void this.render(); });
    }

    async render(titleEl?: HTMLElement) {
        if (this._dayModeRO) {
            this._dayModeRO.disconnect();
            this._dayModeRO = undefined;
        }
        if (this.rootEl) {
            this.rootEl.style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
            this.rootEl.style.setProperty('--day-cell-radius', `${this.plugin.settings.dayCellRadius ?? 8}px`);
            this.rootEl.style.setProperty('--event-vertical-padding', `${this.plugin.settings.eventVerticalPadding ?? 2}px`);
            const minW = this.plugin.settings.dayCellMinWidth ?? 0;
            if (minW > 0) {
                this.rootEl.style.setProperty('--dayble-cell-min-width', `${minW}px`);
            } else {
                this.rootEl.style.removeProperty('--dayble-cell-min-width');
            }
        }
        if (this.weeklyNotesEl) {
            this.weeklyNotesEl.remove();
            this.weeklyNotesEl = undefined;
        }
        // Reset grid style is handled by CSS classes and inline elements

        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        if (this.viewSelectEl) this.viewSelectEl.value = view;

        this.gridEl.removeClass('dayble-week-mode');
        this.gridEl.removeClass('dayble-day-mode');
        this.gridEl.removeClass('dayble-agenda-mode');

        if (view === 'Week') {
            this.gridEl.addClass('dayble-week-mode');
            await this.renderWeekView(titleEl);
        } else if (view === 'Day') {
            this.gridEl.addClass('dayble-day-mode');
            await this.renderDayView(titleEl);
        } else if (view === 'Agenda') {
            this.gridEl.addClass('dayble-agenda-mode');
            await this.renderAgendaView(titleEl);
        } else {
            await this.renderMonthView(titleEl);
        }

        // Post-render: The lane walls inside the event container act as spacers,
        // so we don't need manual margin adjustments anymore.
    }

    calculateLongEventLanes(longEvents: DaybleEvent[], unitParams?: { lanesPerEvent: number, lanesPerGap: number, lanesPerDesc: number, lanesPerIcon: number }): { eventLanes: Map<string, number>, maxLanesByDate: Record<string, number> } {
        const eventLanes = new Map<string, number>();
        const maxLanesByDate: Record<string, number> = {};
        const occupiedLanesByDate = new Map<string, Set<number>>();
        
        const { 
            lanesPerEvent = 7, 
            lanesPerGap = 1, 
            lanesPerDesc = 5, 
            lanesPerIcon = 7 
        } = unitParams || {};

        // Sort long events: earlier start date first, then longer duration first
        const sorted = [...longEvents].sort((a, b) => {
            const startA = new Date(a.startDate).getTime();
            const startB = new Date(b.startDate).getTime();
            const durA = new Date(a.endDate).getTime() - startA;
            const durB = new Date(b.endDate).getTime() - startB;

            // Longest duration first
            if (durA !== durB) return durB - durA;
            // Then by start date
            return startA - startB;
        });

        sorted.forEach(ev => {
            if (!ev.startDate || !ev.endDate) return;
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            const dates: string[] = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dates.push(`${y}-${m}-${dd}`);
            }

            const hasDescription = ev.description && ev.description.trim().length > 0;
            const iconPlacement = this.plugin.settings.iconPlacement || 'left';
            const isVerticalIcon = (iconPlacement === 'top' || iconPlacement === 'top-left' || iconPlacement === 'top-right' || 
                                   iconPlacement === 'bottom' || iconPlacement === 'bottom-left' || iconPlacement === 'bottom-right');
            
            const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
            const state = ev.stateId ? (this.plugin.settings.eventStates || []).find(s => s.id === ev.stateId) : null;
            const iconToUse = (state && state.icon) || ev.icon || (category?.icon || '');
            const hasVerticalIcon = isVerticalIcon && iconToUse;

            let extraLanes = 0;
            if (hasDescription) extraLanes += lanesPerDesc;
            if (hasVerticalIcon) extraLanes += lanesPerIcon;

            const lanesNeeded = lanesPerEvent + lanesPerGap + extraLanes;

            let lane = 0;
            while (true) {
                let laneAvailable = true;
                for (const date of dates) {
                    const occupied = occupiedLanesByDate.get(date);
                    if (occupied) {
                        for (let i = 0; i < lanesNeeded; i++) {
                            if (occupied.has(lane + i)) {
                                laneAvailable = false;
                                break;
                            }
                        }
                    }
                    if (!laneAvailable) break;
                }
                if (laneAvailable) break;
                lane++;
            }

            eventLanes.set(ev.id, lane);
            for (const date of dates) {
                if (!occupiedLanesByDate.has(date)) occupiedLanesByDate.set(date, new Set());
                const occupied = occupiedLanesByDate.get(date)!;
                for (let i = 0; i < lanesNeeded; i++) {
                    occupied.add(lane + i);
                }
                maxLanesByDate[date] = Math.max(maxLanesByDate[date] || 0, lane + lanesNeeded);
            }
        });
        
        return { eventLanes, maxLanesByDate };
    }

    async renderWeekView(titleEl?: HTMLElement): Promise<void> {
        let monthLabel = '';
        const weekStartSetting = this.plugin.settings.weekStartDay;
        const baseDate = new Date(this.currentDate);
        const tDow = baseDate.getDay();
        const diffDays = ((tDow - weekStartSetting) + 7) % 7;
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - diffDays);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const format = this.plugin.settings.weekTitleFormat || 'month_year';
        if (format === 'month_year') {
            monthLabel = this.currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        } else if (format === 'week_number') {
            monthLabel = `Week ${moment(this.currentDate).isoWeek()}`;
        } else if (format === 'full_range') {
            monthLabel = `${moment(startOfWeek).format('MMMM D')} to ${moment(endOfWeek).format('MMMM D')}`;
        } else if (format === 'short_range') {
            monthLabel = `${moment(startOfWeek).format('MMM D')} to ${moment(endOfWeek).format('MMM D')}`;
        } else if (format === 'full_range_hyphen') {
            monthLabel = `${moment(startOfWeek).format('MMMM D')} - ${moment(endOfWeek).format('MMMM D')}`;
        } else if (format === 'short_range_hyphen') {
            monthLabel = `${moment(startOfWeek).format('MMM D')} - ${moment(endOfWeek).format('MMM D')}`;
        }

        if (this.monthTitleEl) this.monthTitleEl.setText(monthLabel);
        
        // Update week toggle button active state
        if (this.weekToggleBtn) {
            if (this.plugin.settings.calendarWeekActive) this.weekToggleBtn.addClass('active');
            else this.weekToggleBtn.removeClass('active');
        }

        this.gridEl.empty();
        this.weekHeaderEl.empty();
        
        const weekStart = weekStartSetting;
        const start = startOfWeek;

        // Header
        const header = this.weekHeaderEl.createDiv({ cls: 'dayble-grid-header' });
        const days = ['sun','mon','tue','wed','thu','fri','sat'];
        const ordered = days.slice(weekStart).concat(days.slice(0, weekStart));
        ordered.forEach(d => header.createDiv({ text: d, cls: 'dayble-grid-header-cell' }));

        // Filter long events for week view
        let longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        if (this.plugin.settings.onlyShowPinnedEventsWeek) {
            longEventsPreset = longEventsPreset.filter(ev => ev.pinned);
        }

        // Pre-calculate long event lanes (reused from month view logic)
        const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        const segmentHeight = 24 + (vPadding * 2);
        const segmentGap = 4;
        const LANE_UNIT_HEIGHT = 4;
        const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT);
        const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT);
        const lanesPerDesc = 5;
        const lanesPerIcon = 7;

        const { maxLanesByDate } = this.calculateLongEventLanes(longEventsPreset, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon });
        const countsByDate = maxLanesByDate;

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
                setIcon(searchBtn, 'focus');
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
            
            // Create lane walls container for intelligent stacking
            container.createDiv({ cls: 'dayble-lane-walls' });

            let dayEvents = this.events.filter(e => e.date === fullDate);
            if (this.plugin.settings.onlyShowPinnedEventsWeek) {
                dayEvents = dayEvents.filter(e => e.pinned);
            }
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
            
            // Drag and Drop (reused optimized logic from month view)
            container.ondragover = (e) => { 
                e.preventDefault();
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
                const eventCount = container.querySelectorAll('.dayble-event').length;
                if (targetEvent && targetEvent.parentElement === container && eventCount > 1) {
                    const rect = targetEvent.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const eventHeight = rect.height;
                    
                    container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    
                    const indicator = container.createDiv({ cls: 'dayble-drop-indicator' });
                    if (relativeY < eventHeight / 2) {
                        indicator.addClass('above');
                        targetEvent.parentElement?.insertBefore(indicator, targetEvent);
                    } else {
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

            container.ondrop = async (e) => {
                e.preventDefault();
                container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                
                const id = e.dataTransfer?.getData('text/plain');
                if (!id || e.dataTransfer?.getData('dayble-source') !== 'calendar') return;
                
                const draggedEl = document.querySelector(`[data-id="${id}"]`);
                if (!draggedEl) return;
                
                const draggedContainer = draggedEl.closest('.dayble-event-container');
                if (draggedContainer !== container) return;
                
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
                if (!targetEvent || targetEvent === draggedEl) return;
                
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                
                if (relativeY < rect.height / 2) {
                    container.insertBefore(draggedEl, targetEvent);
                } else {
                    targetEvent.after(draggedEl);
                }
                
                // Reorder logic
                const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                const newOrder = allEventEls.map(el => (el as HTMLElement).dataset.id).filter(Boolean);
                
                const dayDate = fullDate;
                const dayEventIndices: number[] = [];
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) dayEventIndices.push(idx);
                });
                
                const eventIdToIndex = new Map<string, number>();
                newOrder.forEach((eventId, idx) => eventIdToIndex.set(eventId, idx));
                
                dayEventIndices.sort((a, b) => {
                    const idA = this.events[a].id || '';
                    const idB = this.events[b].id || '';
                    const orderA = eventIdToIndex.get(idA) ?? 999;
                    const orderB = eventIdToIndex.get(idB) ?? 999;
                    return orderA - orderB;
                });
                
                const reorderedEvents: DaybleEvent[] = [];
                let dayEventIdx = 0;
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) {
                        reorderedEvents.push(this.events[dayEventIndices[dayEventIdx]]);
                        dayEventIdx++;
                    } else {
                        reorderedEvents.push(ev);
                    }
                });
                
                this.events = reorderedEvents;
                await this.saveAllEntries();
            };
            
            // Drop on cell (move from holder or other day)
            cell.ondragover = (e) => { e.preventDefault(); cell.addClass('dayble-drag-over'); };
            cell.ondragleave = () => { cell.removeClass('dayble-drag-over'); };
            cell.ondrop = async (e) => {
                e.preventDefault();
                cell.removeClass('dayble-drag-over');
                const id = e.dataTransfer?.getData('text/plain');
                const src = e.dataTransfer?.getData('dayble-source');
                if (!id) return;
                
                if (src === 'holder') {
                    const hIdx = this.holderEvents.findIndex(ev => ev.id === id);
                    if (hIdx !== -1) {
                        const evn = this.holderEvents.splice(hIdx, 1)[0];
                        evn.date = fullDate;
                        evn.startDate = fullDate;
                        evn.endDate = fullDate;
                        this.events.push(evn);
                        await this.saveAllEntries();
                        await this.loadAllEntries();
                        await this.render();
                    }
                } else if (src === 'calendar') {
                     // Move from another day
                     const idx = this.events.findIndex(ev => ev.id === id);
                     if (idx !== -1) {
                         const ev = this.events[idx];
                         // Check if moving to same day (already handled by container.ondrop)
                         if (ev.date !== fullDate || ev.startDate !== fullDate) {
                             if (ev.startDate && ev.endDate && ev.startDate !== ev.endDate) {
                                 const span = Math.floor((new Date(ev.endDate).getTime() - new Date(ev.startDate).getTime()) / 86400000);
                                 ev.startDate = fullDate;
                                 const ns = new Date(fullDate);
                                 const ne = new Date(ns);
                                 ne.setDate(ns.getDate() + span);
                                 ev.endDate = `${ne.getFullYear()}-${String(ne.getMonth() + 1).padStart(2, '0')}-${String(ne.getDate()).padStart(2, '0')}`;
                                 ev.date = undefined;
                             } else {
                                 ev.date = fullDate;
                                 ev.startDate = fullDate;
                                 ev.endDate = fullDate;
                             }
                             await this.saveAllEntries();
                             await this.loadAllEntries();
                             await this.render();
                         }
                     }
                }
            };

            // Interactions
            cell.onclick = async (ev) => {
                const target = ev.target as HTMLElement;
                if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                    await this.openEventModal(undefined, fullDate);
                }
            };
            
            cell.onmousedown = (ev) => {
                if ((ev).button !== 0) return;
                const target = ev.target as HTMLElement;
                if (target.closest('.dayble-event')) return;
                if (this.isDragging) return;
                this.startSelection(fullDate, cell);
            };
            
            cell.onmouseover = () => {
                if (this.isSelecting && !this.isDragging) this.updateSelection(fullDate);
            };
            
            cell.ontouchstart = (ev) => {
                const target = ev.target as HTMLElement;
                if (target.closest('.dayble-event')) return;
                if (this.isDragging) return;
                this.startSelection(fullDate, cell);
            };
            
            cell.ontouchmove = () => {
                if (this.isSelecting && !this.isDragging) this.updateSelection(fullDate);
            };
        }
        
        this.gridEl.appendChild(fragment);
        
        // Render long events
        // Prepare overlay for long events; hide it until positions are computed
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
        } else {
            this.gridEl.appendChild(this._longOverlayEl);
        }
        
        requestAnimationFrame(() => { this.renderLongEvents(); });
        
        if (!this._longRO && 'ResizeObserver' in window) {
            this._longRO = new ResizeObserver(() => {
                this.renderLongEvents();
            });
            if (this._longRO && this.gridEl) this._longRO.observe(this.gridEl);
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
            
            this._boundWeeklyNotesMouseMove = (me: MouseEvent) => {
                if (!this.isResizingWeeklyNotes || !this.weeklyNotesEl) return;
                const dy = me.clientY - this.weeklyNotesResizeStartY;
                const newH = Math.max(100, this.weeklyNotesResizeStartHeight - dy);
                this.weeklyNotesEl.style.setProperty('height', `${newH}px`, 'important');
            };
            this._boundWeeklyNotesMouseUp = async () => {
            if (!this.isResizingWeeklyNotes) return;
            this.isResizingWeeklyNotes = false;
            document.removeEventListener('mousemove', this._boundWeeklyNotesMouseMove as EventListener);
            document.removeEventListener('mouseup', this._boundWeeklyNotesMouseUp as EventListener);
            if (this.weeklyNotesEl) {
                this.plugin.settings.weeklyNotesHeight = this.weeklyNotesEl.offsetHeight;
                await this.plugin.saveSettings();
            }
        };
            dragHandle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.weeklyNotesEl) return;
                this.isResizingWeeklyNotes = true;
                this.weeklyNotesResizeStartY = e.clientY;
                this.weeklyNotesResizeStartHeight = this.weeklyNotesEl.offsetHeight;
                document.addEventListener('mousemove', this._boundWeeklyNotesMouseMove as EventListener);
                document.addEventListener('mouseup', this._boundWeeklyNotesMouseUp as EventListener);
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
            
            textareaEl.addClass('dayble-textarea-auto');
            
            // Update on input
            textareaEl.addEventListener('input', () => {
                this.weeklyNotes[weekKey] = textareaEl.value;
                this.debouncedSave();
            });
            
            // Handle tab key
            textareaEl.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const textarea = e.target as HTMLTextAreaElement;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                }
            });
        }
        await Promise.resolve();
    }

    async renderMonthView(titleEl?: HTMLElement): Promise<void> {
        const y = this.currentDate.getFullYear();
        const m = this.currentDate.getMonth();
        const monthLabel = new Date(y, m).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (this.monthTitleEl) this.monthTitleEl.setText(monthLabel);
        this.gridEl.empty();
        const weekStart = this.plugin.settings.weekStartDay;
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const leading = (firstDay - weekStart + 7) % 7;
        this.weekHeaderEl.empty();
        const header = this.weekHeaderEl.createDiv({ cls: 'dayble-grid-header' });
        const days = ['sun','mon','tue','wed','thu','fri','sat'];
        const ordered = days.slice(weekStart).concat(days.slice(0, weekStart));
        ordered.forEach(d => header.createDiv({ text: d, cls: 'dayble-grid-header-cell' }));

        // Filter long events for month view
        let longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        if (this.plugin.settings.onlyShowPinnedEventsMonth) {
            longEventsPreset = longEventsPreset.filter(ev => ev.pinned);
        }

        const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        const segmentHeight = 24 + (vPadding * 2);
        const segmentGap = 4;
        const LANE_UNIT_HEIGHT = 4;
        const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT);
        const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT);
        const lanesPerDesc = 5;
        const lanesPerIcon = 7;

        const { maxLanesByDate } = this.calculateLongEventLanes(longEventsPreset, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon });
        const countsByDate = maxLanesByDate;

        for (let i = 0; i < leading; i++) {
            const c = this.gridEl.createDiv({ cls: 'dayble-day dayble-inactive' });
            c.setAttr('data-empty', 'true');
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const fullDate = `${y}-${String(m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
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
                setIcon(searchBtn, 'focus');
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
            
            // Create lane walls container for intelligent stacking
            container.createDiv({ cls: 'dayble-lane-walls' });
            
            let dayEvents = this.events.filter(e => e.date === fullDate);
            if (this.plugin.settings.onlyShowPinnedEventsMonth) {
                dayEvents = dayEvents.filter(e => e.pinned);
            }
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
            
            // Allow reordering events within the container
            container.ondragover = (e) => { 
                e.preventDefault();
                
                // Show drop position indicator only if there are multiple events
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
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
                        targetEvent.parentElement?.insertBefore(indicator, targetEvent);
                    } else {
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
            container.ondrop = async (e) => {
                e.preventDefault();
                // Remove drop indicator
                container.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                
                const id = e.dataTransfer?.getData('text/plain');
                const src = e.dataTransfer?.getData('dayble-source');
                if (!id || src !== 'calendar') return; // Only reorder calendar events, not from holder
                
                // Find the event being dragged by ID
                const draggedEl = document.querySelector(`[data-id="${id}"]`);
                if (!draggedEl) return;
                
                // Check if dragged event is from this container
                const draggedContainer = draggedEl.closest('.dayble-event-container');
                if (draggedContainer !== container) return;
                
                // Find target event to insert before/after
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
                if (!targetEvent || targetEvent === draggedEl) return;
                
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                
                if (relativeY < eventHeight / 2) {
                    // Insert before
                    container.insertBefore(draggedEl, targetEvent);
                } else {
                    // Insert after
                    targetEvent.after(draggedEl);
                }
                
                // Update the underlying events array to match the new DOM order
                const allEventEls = Array.from(container.querySelectorAll('.dayble-event'));
                const newOrder = allEventEls.map(el => (el as HTMLElement).dataset.id).filter(Boolean);
                
                // Rebuild events array for this date to match new order
                const dayDate = fullDate; // fullDate from outer scope
                const dayEventIndices: number[] = [];
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) {
                        dayEventIndices.push(idx);
                    }
                });
                
                // Sort the indices based on new order
                const eventIdToIndex = new Map<string, number>();
                newOrder.forEach((eventId, idx) => {
                    eventIdToIndex.set(eventId, idx);
                });
                
                dayEventIndices.sort((a, b) => {
                    const idA = this.events[a].id || '';
                    const idB = this.events[b].id || '';
                    const orderA = eventIdToIndex.get(idA) ?? 999;
                    const orderB = eventIdToIndex.get(idB) ?? 999;
                    return orderA - orderB;
                });
                
                // Reconstruct events array with reordered day events
                const reorderedEvents: DaybleEvent[] = [];
                let dayEventIdx = 0;
                this.events.forEach((ev, idx) => {
                    if (ev.date === dayDate) {
                        reorderedEvents.push(this.events[dayEventIndices[dayEventIdx]]);
                        dayEventIdx++;
                    } else {
                        reorderedEvents.push(ev);
                    }
                });
                
                this.events = reorderedEvents;
                
                // Save the updated order
                await this.saveAllEntries();
            };
            
            cell.onclick = async (ev) => {
                        const target = ev.target as HTMLElement;
                        // Only open modal if clicking on the cell itself or container, not on an event
                        if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                            await this.openEventModal(undefined, fullDate);
                        }
                    };
            cell.onmousedown = (ev) => {
                if ((ev).button !== 0) return;
                const target = ev.target as HTMLElement;
                // Don't start selection if clicking on an event
                if (target.closest('.dayble-event')) return;
                // Don't start selection if already dragging
                if (this.isDragging) return;
                this.startSelection(fullDate, cell);
            };
            cell.onmouseover = () => {
                if (this.isSelecting && !this.isDragging) this.updateSelection(fullDate);
            };
            cell.ontouchstart = (ev) => {
                const target = ev.target as HTMLElement;
                // Don't start selection if touching an event
                if (target.closest('.dayble-event')) return;
                // Don't start selection if already dragging
                if (this.isDragging) return;
                this.startSelection(fullDate, cell);
            };
            cell.ontouchmove = () => {
                if (this.isSelecting && !this.isDragging) this.updateSelection(fullDate);
            };
            cell.ondragover = (e) => { e.preventDefault(); cell.addClass('dayble-drag-over'); };
            cell.ondragleave = () => { cell.removeClass('dayble-drag-over'); };
            cell.ondrop = async (e) => {
                e.preventDefault();
                cell.removeClass('dayble-drag-over');
                const id = e.dataTransfer?.getData('text/plain');
                const src = e.dataTransfer?.getData('dayble-source');
                if (!id) return;
                try {
                    if (src === 'holder') {
                        const hIdx = this.holderEvents.findIndex(ev => ev.id === id);
                        if (hIdx !== -1) {
                            const evn = this.holderEvents.splice(hIdx, 1)[0];
                            evn.date = fullDate;
                            evn.startDate = fullDate;
                            evn.endDate = fullDate;
                            this.events.push(evn);
                            await this.saveAllEntries();
                            await this.renderHolder();
                            await this.render();
                        }
                    } else {
                        const idx = this.events.findIndex(ev => ev.id === id);
                        if (idx !== -1) {
                            const ev = this.events[idx];
                            if (ev.startDate && ev.endDate && ev.startDate !== ev.endDate) {
                                const span = Math.floor((new Date(ev.endDate).getTime() - new Date(ev.startDate).getTime()) / 86400000);
                                ev.startDate = fullDate;
                                const ns = new Date(fullDate);
                                const ne = new Date(ns);
                                ne.setDate(ns.getDate() + span);
                                ev.endDate = `${ne.getFullYear()}-${String(ne.getMonth()+1).padStart(2,'0')}-${String(ne.getDate()).padStart(2,'0')}`;
                                ev.date = undefined;
                            } else {
                                ev.date = fullDate;
                                ev.startDate = fullDate;
                                ev.endDate = fullDate;
                            }
                            await this.saveAllEntries();
                        }
                    }
                    await this.renderHolder();
                    await this.render();
                } catch {
                    new Notice('Failed to save event changes');
                }
            };
        }
        // Defer long event positioning until layout settles
        // Prepare overlay for long events; hide it until positions are computed
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
        } else {
            this.gridEl.appendChild(this._longOverlayEl);
        }
        requestAnimationFrame(() => {
            this.renderLongEvents();
        });
        await this.renderHolder();

        if (!this._longRO && 'ResizeObserver' in window) {
            this._longRO = new ResizeObserver(() => {
                this.renderLongEvents();
            });
            if (this._longRO && this.gridEl) this._longRO.observe(this.gridEl);
        }
    }

    async renderDayView(titleEl?: HTMLElement): Promise<void> {
        this.gridEl.empty();
        this.weekHeaderEl.empty();
        
        const d = new Date(this.currentDate);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const fullDate = `${yy}-${mm}-${dd}`;

        const dayContainer = this.gridEl.createDiv({ cls: 'dayble-day-mode-container' });
        dayContainer.setCssProps({
            'grid-column': '1 / span 7',
            'height': '100%',
            'display': 'flex',
            'flex-direction': 'column'
        });

        // Instantiate TodayModal but don't open it as a modal.
        // We will use its contentEl directly.
        const dayModeModal = new TodayModal(this.app, fullDate, this.events, this);
        this.dayModeTodayModal = dayModeModal;
        
        // Mock contentEl to our dayContainer
        // @ts-ignore - overriding internal contentEl for day mode
        dayModeModal.contentEl = dayContainer;
        // @ts-ignore - also need to mock modalEl for some CSS classes
        dayModeModal.modalEl = dayContainer;
        
        dayModeModal.onOpen();

        // Use ResizeObserver to keep events correctly positioned if the view size changes
        const ro = new ResizeObserver(() => {
            dayModeModal.renderEvents();
        });
        ro.observe(dayContainer);
        // Store the observer on the view so we can disconnect it if needed, though mostly it will be cleaned up with the DOM
        this._dayModeRO = ro;
        
        // Fix jumble by re-triggering the rendering part of TodayModal after layout is stable
        requestAnimationFrame(() => {
            dayModeModal.renderEvents();
            
            // Re-adjust scroller height just in case
            const scroller = dayContainer.querySelector('.dayble-focus-scroll') as HTMLElement;
            if (scroller) {
                scroller.setCssProps({
                    'height': '100%',
                    'flex': '1'
                });
            }
        });
        
        // Remove the default title added by TodayModal if we want to use the main title
        const modalTitle = dayContainer.querySelector('.dayble-modal-title');
        if (modalTitle) modalTitle.remove();

        const [year, month, dayNum] = fullDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, dayNum);
        const dayLabel = moment(dateObj).format(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM');
        if (this.monthTitleEl) this.monthTitleEl.setText(dayLabel);

        // Adjust heights to be 100%
        const scroller2 = dayContainer.querySelector('.dayble-focus-scroll') as HTMLElement;
        if (scroller2) {
            scroller2.setCssProps({
                'height': '100%',
                'flex': '1'
            });
        }

        await this.renderHolder();
    }

    async renderAgendaView(titleEl?: HTMLElement): Promise<void> {
        const agendaTitle = moment(this.currentDate).format(this.plugin.settings.agendaTitleFormat || 'MMMM YYYY');
        if (this.monthTitleEl) this.monthTitleEl.setText(agendaTitle);
        
        this.gridEl.empty();
        this.weekHeaderEl.empty();
        
        const agendaContainer = this.gridEl.createDiv({ cls: 'dayble-agenda-container' });
        agendaContainer.setCssProps({
            'grid-column': '1 / span 7',
            'display': 'flex',
            'flex-direction': 'column',
            'gap': '15px',
            'padding': '15px',
            'overflow-y': 'auto'
        });

        // Filter and sort all events by their dates (including each day of multi-day events)
        const dayMap = new Map<string, DaybleEvent[]>();
        
        this.events.forEach(ev => {
            if (this.plugin.settings.onlyShowPinnedEventsAgenda && !ev.pinned) return;
            if (ev.date) {
                if (!dayMap.has(ev.date)) dayMap.set(ev.date, []);
                dayMap.get(ev.date)?.push(ev);
            } else if (ev.startDate && ev.endDate) {
                // For multi-day events, add them to each day in the range
                let curr = new Date(ev.startDate + 'T00:00:00');
                const end = new Date(ev.endDate + 'T00:00:00');
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    if (!dayMap.has(dStr)) dayMap.set(dStr, []);
                    dayMap.get(dStr)?.push(ev);
                    curr.setDate(curr.getDate() + 1);
                }
            }
        });

        const sortedDates = Array.from(dayMap.keys()).sort();

        if (sortedDates.length === 0) {
            agendaContainer.createDiv({ text: 'No events scheduled.', cls: 'dayble-no-events' });
        } else {
            sortedDates.forEach(dateStr => {
                const dateHeader = agendaContainer.createDiv({ cls: 'dayble-agenda-date-header' });
                dateHeader.setCssProps({
                    'font-weight': 'bold',
                    'border-bottom': '1px solid var(--background-modifier-border)',
                    'padding-bottom': '5px',
                    'margin-top': '10px'
                });
                dateHeader.setText(moment(dateStr + 'T00:00:00').format(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM'));

                const dayEvents = dayMap.get(dateStr) || [];
                // Sort day events: multi-day first, then by time
                dayEvents.sort((a, b) => {
                    const isMultiA = a.startDate && a.endDate && a.startDate !== a.endDate ? 0 : 1;
                    const isMultiB = b.startDate && b.endDate && b.startDate !== b.endDate ? 0 : 1;
                    if (isMultiA !== isMultiB) return isMultiA - isMultiB;
                    return (a.time || '').localeCompare(b.time || '');
                });

                dayEvents.forEach(ev => {
                    const item = agendaContainer.appendChild(this.createEventItem(ev));
                    const itemEl = item as HTMLElement;
                    itemEl.setCssProps({ 'width': '100%' });
                    
                    // Add special class for long (multi-day) or all-day (no time) events
                    const isMultiDay = ev.startDate && ev.endDate && ev.startDate !== ev.endDate;
                    const isAllDay = !ev.time || isMultiDay;
                    if (isAllDay) {
                        itemEl.addClass('dayble-agenda-long-events');
                    }
                });
            });
        }

        await this.renderHolder();
    }

    startSelection(date: string, el: HTMLElement) {
        this.isSelecting = true;
        this.selectionStartDate = date;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
        document.addEventListener('mouseup', this._endSelOnce);
    }
    _endSelOnce = async () => { document.removeEventListener('mouseup', this._endSelOnce); await this.endSelection(); };
    updateSelection(date: string) {
        if (!this.isSelecting || this.isDragging) return;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
    }
    async endSelection() {
        if (!this.isSelecting) return;
        this.isSelecting = false;
        if (this.selectionStartDate && this.selectionEndDate) {
            const s = this.selectionStartDate;
            const e = this.selectionEndDate;
            await this.openEventModalForRange(s, e);
        }
        this.clearSelection();
    }
    highlightSelectionRange() {
        const s = new Date(this.selectionStartDate + 'T00:00:00');
        const e = new Date(this.selectionEndDate + 'T00:00:00');
        const [min, max] = s <= e ? [s, e] : [e, s];
        const cells = Array.from(this.gridEl.children) as HTMLElement[];
        cells.forEach(c => {
            c.removeClass('dayble-selected');
            const d = c.getAttr('data-date');
            if (!d) return;
            const dt = new Date(d + 'T00:00:00');
            // Include both start and end dates (use >= and <= for inclusive range)
            if (dt >= min && dt <= max) {
                c.addClass('dayble-selected');
            }
        });
    }
    clearSelection() {
        const cells = Array.from(this.gridEl.children) as HTMLElement[];
        cells.forEach(c => c.removeClass('dayble-selected'));
        this.selectionStartDate = null;
        this.selectionEndDate = null;
    }

    async openEventModalForRange(start: string, end: string) {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }
        const modal = new EventModal(this.app, this.plugin, undefined, start, end, undefined, undefined, async result => {
            const ev: DaybleEvent = { id: randomId(), ...result } as DaybleEvent;
            this.events.push(ev);
            await this.saveAllEntries();
            await this.render();
        }, () => Promise.resolve(), () => {
            const picker = new IconPickerModal(this.app, icon => {
                modal.setIcon(icon);
            }, () => {
                modal.setIcon('');
            });
            void picker.open();
            return Promise.resolve();
        });
        modal.categories = this.plugin.settings.eventCategories || [];
        // plugin is passed in constructor
        void modal.open();
    }

    renderLongEvents() {
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.addClass('dayble-long-overlay-box');
        }
        const cells = Array.from(this.gridEl.children).filter(el => (el as HTMLElement).hasClass?.('dayble-day')) as HTMLElement[];
        
        // Fixed buffer from the top of the day cell to the first long event
        const HEADER_BUFFER = 38; 
        const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        const segmentHeight = 24 + (vPadding * 2);
        const segmentGap = 4;
        
        // Fine-grained lane system using units
        const LANE_UNIT_HEIGHT = 4;
        const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT);
        const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT);
        const lanesPerDesc = 5; // 20px extra for description
        const lanesPerIcon = 7; // 28px extra for top/bottom icons

        let longEvents = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        const isMonth = this.plugin.settings.calendarView === 'Month' || (!this.plugin.settings.calendarView && !this.plugin.settings.calendarWeekActive);
        const isWeek = this.plugin.settings.calendarView === 'Week' || (!this.plugin.settings.calendarView && this.plugin.settings.calendarWeekActive);
        
        if ((isMonth && this.plugin.settings.onlyShowPinnedEventsMonth) || (isWeek && this.plugin.settings.onlyShowPinnedEventsWeek)) {
            longEvents = longEvents.filter(ev => ev.pinned);
        }

        const { eventLanes, maxLanesByDate } = this.calculateLongEventLanes(longEvents, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon });
        const countsByDate = maxLanesByDate;

        const sortedLongEvents = [...longEvents].sort((a, b) => {
            const laneA = eventLanes.get(a.id) ?? 0;
            const laneB = eventLanes.get(b.id) ?? 0;
            return laneA - laneB;
        });

        const requiredKeys = new Set<string>();

        // Pre-initialize lane walls for all cells
        cells.forEach(cell => {
            const wallsContainer = cell.querySelector('.dayble-lane-walls');
            if (!wallsContainer) return;
            const date = cell.getAttr('data-date');
            const unitsCount = countsByDate[date] || 0;
            const totalHeight = unitsCount * LANE_UNIT_HEIGHT;
            
            // Use a single spacer wall for efficiency and smoother layout
            let wall = wallsContainer.firstElementChild as HTMLElement;
            if (!wall) wall = wallsContainer.createDiv({ cls: 'dayble-lane-wall' });
            wall.style.height = `${totalHeight}px`;
            
            while (wallsContainer.children.length > 1) {
                wallsContainer.lastElementChild?.remove();
            }
        });

        // Function to position a single event segment using fixed calculations
        const positionEventSegment = (item: HTMLElement, first: HTMLElement, last: HTMLElement, stackIndex: number) => {
            const frLeft = first.offsetLeft;
            const frTop = first.offsetTop;
            const lrRight = last.offsetLeft + last.offsetWidth;
            
            // Fixed top offset calculation based on lane unit index
            const topOffset = HEADER_BUFFER + (stackIndex * LANE_UNIT_HEIGHT);
            
            const left = frLeft;
            const top = frTop + topOffset;
            const width = (lrRight - frLeft);
            
            item.setCssProps({
                'left': `${left}px`,
                'top': `${top}px`,
                'width': `${width}px`
            });
            
            return { top, left, width };
        };

        sortedLongEvents.forEach(ev => {
            const startIdx = cells.findIndex(c => c.getAttr('data-date') === ev.startDate);
            if (startIdx === -1) return;
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            
            const stackIndex = eventLanes.get(ev.id) ?? 0;
            const span = Math.floor((end.getTime() - start.getTime())/86400000) + 1;
            const cellsPerRow = 7;
            const startRow = Math.floor(startIdx / cellsPerRow);
            const endIdx = startIdx + span - 1;
            const endRow = Math.floor(endIdx / cellsPerRow);
            const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
            const styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${ev.colorName || ''}|${category?.bgColor || ''}|${category?.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}|${this.plugin.settings.eventBorderOpacity}`;
            const contentSig = `${ev.title || ''}|${ev.description || ''}|${ev.icon || ''}|${ev.time || ''}`;
            
            if (startRow === endRow) {
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last) return;
                
                const key = `${ev.id}:row:${startRow}-single`;
                requiredKeys.add(key);
                let item = this._longEls.get(key);
                if (!item || item.dataset.styleSig !== styleSig || item.dataset.contentSig !== contentSig) {
                    if (item && item.parentElement) item.remove();
                    item = this.createEventItem(ev, true); // isLong=true hides description
                    item.addClass('dayble-long-event', 'dayble-long-event-single', 'dayble-absolute-box');
                    item.dataset.longKey = key;
                    item.dataset.styleSig = styleSig;
                    item.dataset.contentSig = contentSig;
                    item.onclick = async (e) => { e.stopPropagation(); await this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                    this.gridEl.appendChild(item);
                    this._longEls.set(key, item);
                }
                
                if (!item.isConnected) this.gridEl.appendChild(item);
                positionEventSegment(item, first, last, stackIndex);

            } else {
                for (let row = startRow; row <= endRow; row++) {
                    const rowStartIdx = row * cellsPerRow;
                    const rowEndIdx = Math.min(rowStartIdx + cellsPerRow - 1, cells.length - 1);
                    const eventStartInRow = row === startRow ? startIdx : rowStartIdx;
                    const eventEndInRow = row === endRow ? endIdx : rowEndIdx;
                    if (eventStartInRow > rowEndIdx || eventEndInRow < rowStartIdx) continue;
                    
                    const first = cells[eventStartInRow];
                    const last = cells[eventEndInRow];
                    if (!first || !last) continue;
                    
                    const key = `${ev.id}:row:${row}`;
                    requiredKeys.add(key);
                    let item = this._longEls.get(key);
                    if (!item || item.dataset.styleSig !== styleSig || item.dataset.contentSig !== contentSig) {
                        if (item && item.parentElement) item.remove();
                        item = this.createEventItem(ev, true);
                        item.addClass('dayble-long-event', 'dayble-absolute-box');
                        if (row === startRow) item.addClass('dayble-long-event-start');
                        if (row === endRow) item.addClass('dayble-long-event-end');
                        item.dataset.longKey = key;
                        item.dataset.styleSig = styleSig;
                        item.dataset.contentSig = contentSig;
                        item.onclick = (e) => { e.stopPropagation(); void this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                        this.gridEl.appendChild(item);
                        this._longEls.set(key, item);
                    }
                    
                    if (!item.isConnected) this.gridEl.appendChild(item);
                    positionEventSegment(item, first, last, stackIndex);
                }
            }
        });
        // Remove any stale long items
        Array.from(this._longEls.keys()).forEach(key => {
            if (!requiredKeys.has(key)) {
                const el = this._longEls.get(key);
                if (el && el.parentElement) el.remove();
                this._longEls.delete(key);
            }
        });

        const updateNormalEventMargins = () => {
            cells.forEach(cell => {
                const container = cell.querySelector('.dayble-event-container') as HTMLElement;
                if (container) {
                    const maxH = this.plugin.settings.dayCellMaxHeight ?? 0;
                    if (maxH > 0) {
                        (cell as HTMLElement).style.setProperty('--dayble-cell-max-height', `${maxH}px`);
                        (cell as HTMLElement).addClass('dayble-cell-max');
                        container.removeClass('dayble-overflow-visible');
                        container.addClass('dayble-scroll-y', 'dayble-scroll-x-hidden');
                    } else {
                        (cell as HTMLElement).style.removeProperty('--dayble-cell-max-height');
                        (cell as HTMLElement).removeClass('dayble-cell-max');
                        container.removeClass('dayble-scroll-y', 'dayble-scroll-x-hidden');
                        container.addClass('dayble-overflow-visible');
                    }
                }
            });
        };

        // Initial update
        updateNormalEventMargins();
    }

    getEventTooltipText(ev: DaybleEvent): string {
        const title = (ev.title || 'Untitled').replace(/[#*`]/g, '');
        const description = (ev.description || '').replace(/[#*`]/g, '');
        const timeFormatSetting = this.plugin.settings.timeFormat || '24h';
        
        const parseTime = (timeStr: string) => {
            if (!timeStr) return null;
            const [h, m] = timeStr.split(':').map(Number);
            return { h, m, total: h * 60 + m };
        };

        const formatTime = (h: number, m: number) => {
            if (timeFormatSetting === '24h') {
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            } else {
                const ampm = h >= 12 ? 'pm' : 'am';
                const h12 = h % 12 || 12;
                const mStr = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
                return `${h12}${mStr}${ampm}`;
            }
        };

        const formatDate = (dateStr?: string) => {
            if (!dateStr) return '';
            const [, m, d] = dateStr.split('-').map(Number);
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            return `${d} ${monthNames[m - 1]}`;
        };

        let startText = '';
        let endText = '';
        let durationText = '';

        if (ev.time) {
            const parts = ev.time.split('-');
            const s = parts[0];
            const e = parts[1];
            const startTime = parseTime(s);
            const endTime = parseTime(e);
            
            if (startTime) {
                const date = ev.date || ev.startDate;
                startText = `Start: ${formatTime(startTime.h, startTime.m)}, ${formatDate(date)}`;
                
                if (endTime) {
                    const endDate = ev.endDate || ev.date || ev.startDate;
                    endText = `End: ${formatTime(endTime.h, endTime.m)}, ${formatDate(endDate)}`;
                    
                    if (ev.date || (ev.startDate === ev.endDate)) {
                        const diff = endTime.total - startTime.total;
                        if (diff > 0) {
                            const hrs = Math.floor(diff / 60);
                            const mins = diff % 60;
                            const hText = hrs > 0 ? `${hrs} hour${hrs > 1 ? 's' : ''}` : '';
                            const mText = mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''}` : '';
                            durationText = `Duration: ${hText}${hText && mText ? ' & ' : ''}${mText}.`;
                        }
                    }
                }
            }
        } else if (ev.date || ev.startDate) {
            startText = `Start: ${formatDate(ev.date || ev.startDate)}`;
            if (ev.endDate && ev.endDate !== ev.startDate) {
                endText = `End: ${formatDate(ev.endDate)}`;
            }
        }

        const lines = [title];
        if (description) lines.push(description);
        if (startText) lines.push(startText);
        if (endText) lines.push(endText);
        if (durationText) lines.push(durationText);
        
        return lines.join('\n');
    }

    createEventItem(ev: DaybleEvent, isLong = false, isDayMode = false): HTMLElement {
        const item = document.createElement('div');
        item.className = 'dayble-event';
        if (isLong) item.addClass('dayble-long-event');
        if (isDayMode) item.addClass('dayble-focus-event-abs');
        item.setAttribute('draggable', 'true');
        item.dataset.id = ev.id;
        item.dataset.categoryId = ev.categoryId || '';
        
        // Add tooltip
        if (this.plugin.settings.tooltipEnabled) {
            setTooltip(item, this.getEventTooltipText(ev));
        }
        
        // Apply title/description alignment
        const eventSettings = ev.settings || {};
        let titleAlign = eventSettings.titleAlign || this.plugin.settings.eventTitleAlign || 'center';
        let descAlign = eventSettings.descAlign || this.plugin.settings.eventDescAlign || 'center';

        // CRITICAL: Apply the conditional logic HERE
        // When BOTH settings are set to "center-left", description mimics title alignment
        if (titleAlign === 'center-left' && descAlign === 'center-left') {
            descAlign = titleAlign; // OVERRIDE the description alignment
        }

        // Debugging logs
        console.log('Event ID:', ev.id);
        console.log('Title Align:', titleAlign);
        console.log('Desc Align (original):', eventSettings.descAlign || this.plugin.settings.eventDescAlign);
        console.log('Condition met:', titleAlign === 'center-left' && (eventSettings.descAlign || this.plugin.settings.eventDescAlign) === 'center-left');
        console.log('Desc Align (final):', descAlign);

        item.addClass(`dayble-title-align-${titleAlign}`);
        item.addClass(`dayble-desc-align-${descAlign}`);
        if (titleAlign === 'center' || titleAlign === 'center-left') {
            item.addClass('dayble-layout-center-flex');
        }
        
        // Determine which colors to use: user-set or category
        const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
        
        let bgColor = '';
        let textColor = '';
        let colorName = ev.colorName || (!ev.color && !category ? this.plugin.settings.defaultEventColorName : undefined);

        // Color selection logic (user-set color always preferred)
        if (colorName) {
            const allSwatches = [...(this.plugin.settings.swatches || []), ...(this.plugin.settings.userCustomSwatches || [])];
            const swatch = allSwatches.find(s => (s.name || '').toLowerCase() === colorName.toLowerCase());
            
            if (swatch) {
                item.classList.add('dayble-event-colored');
                const opacity = this.plugin.settings.eventBgOpacity ?? 1;
                const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                const swatchBg = swatch.color;
                const swatchText = swatch.textColor || chooseTextColor(swatchBg);
                
                item.style.setProperty('--event-bg-color', hexToRgba(swatchBg, opacity));
                item.style.setProperty('--event-text-color', swatchText);
                item.style.setProperty('--event-border-color', hexToRgba(swatchText, bOpacity));
                
                bgColor = swatchBg;
                textColor = swatchText;
            }
        } else {
            if (ev.color) {
                bgColor = ev.color;
                textColor = ev.textColor || chooseTextColor(ev.color);
                (item as HTMLElement).dataset.color = ev.color;
            } else if (category && category.bgColor) {
                bgColor = category.bgColor;
                textColor = category.textColor;
            }

            // Apply styling if we have colors (for non-swatch colors)
            if (bgColor && textColor) {
                const opacity = this.plugin.settings.eventBgOpacity ?? 1;
                const rgbaColor = hexToRgba(bgColor, opacity);
                item.style.setProperty('--event-bg-color', rgbaColor);
                item.style.setProperty('--event-text-color', textColor);
                const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                const borderColor = hexToRgba(textColor, bOpacity);
                item.style.setProperty('--event-border-color', borderColor);
                item.classList.add('dayble-event-colored');
            }
        }
        
        // Apply border width settings
        item.style.setProperty('--event-border-width', `${this.plugin.settings.eventBorderWidth ?? 2}px`);
        item.style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
        item.style.setProperty('--event-vertical-padding', `${this.plugin.settings.eventVerticalPadding ?? 2}px`);
        
        // Apply effect and animation from state or category
        const state = ev.stateId ? (this.plugin.settings.eventStates || []).find(s => s.id === ev.stateId) : null;
        const effect = state ? state.effect : (category ? category.effect : null);
        const anim = state ? state.animation : (category ? category.animation : null);
        const anim2 = state ? state.animation2 : (category ? category.animation2 : null);

        if (effect && effect !== '') item.addClass(`dayble-effect-${effect}`);
        const onlyToday = this.plugin.settings.onlyAnimateToday ?? false;
        const isTodayEvent = this.isEventToday(ev);
        if (anim && anim !== '' && (!onlyToday || isTodayEvent)) {
            item.addClass(`dayble-anim-${anim}`);
        }
        if (anim2 && anim2 !== '' && (!onlyToday || isTodayEvent)) {
            item.addClass(`dayble-anim-${anim2}`);
        }
        
        if (!isLong && !isDayMode) {
            item.addClass('dayble-month-week-event');
            // @ts-ignore
            if (ev.startTime && ev.endTime) {
                // @ts-ignore
                const start = timeToMinutes(ev.startTime);
                // @ts-ignore
                const end = timeToMinutes(ev.endTime);
                if (end - start <= 30) {
                    item.addClass('dayble-event-compact');
                }
            }
        }

        if (isDayMode && ev.time) {
            const parts = ev.time.split('-');
            if (parts.length === 2) {
                const start = timeToMinutes(parts[0]);
                const end = timeToMinutes(parts[1]);
                const diff = end - start;
                if (diff === 15) item.addClass('min15');
                else if (diff === 30) item.addClass('min30');
                else if (diff === 45) item.addClass('min45');
            }
        }
        
        const inner = item.createDiv({ cls: 'dayble-event-inner' });

        const titleContainer = inner.createDiv({ cls: 'dayble-event-title-container' });
        const title = titleContainer.createDiv({ cls: 'dayble-event-title' });
        renderMarkdown(ev.title || '', title, this.plugin.app);
        if (ev.description) {
            const desc = inner.createDiv({ cls: 'dayble-event-desc' });
            // Description inherits text color
            if (bgColor && textColor) {
                desc.setCssProps({ 'color': textColor });
            }
            renderMarkdown(ev.description, desc, this.plugin.app);
        }
        const iconToUse = (state && state.icon) || ev.icon || (category?.icon || '');
        const hasDescription = ev.description && ev.description.trim().length > 0;
        const hasIcon = this.plugin.settings.iconPlacement !== 'none' && iconToUse;

        if (isLong && hasDescription && hasIcon) {
            item.addClass('dayble-long-event-complex');
        }

        if (this.plugin.settings.iconPlacement !== 'none' && iconToUse) {
            let place = this.plugin.settings.iconPlacement ?? 'left';
            if (isDayMode) place = 'top'; // Force top in day mode
            
            item.addClass(`dayble-icon-placement-${place}`);
            const iconEl = (place === 'left' || place === 'right') 
                ? item.createDiv({ cls: 'dayble-event-icon' }) 
                : inner.createDiv({ cls: 'dayble-event-icon' });
            
            setIcon(iconEl, iconToUse);
            
            if (place === 'left') {
                item.insertBefore(iconEl, inner);
            } else if (place === 'right') {
                item.appendChild(iconEl);
            } else if (place === 'top' || place === 'top-left' || place === 'top-right') {
                iconEl.addClass('dayble-icon-top');
                if (place === 'top-left') iconEl.addClass('dayble-icon-top-left');
                else if (place === 'top-right') iconEl.addClass('dayble-icon-top-right');
                else iconEl.addClass('dayble-icon-top-center');
                inner.insertBefore(iconEl, titleContainer);
            } else if (place === 'bottom' || place === 'bottom-left' || place === 'bottom-right') {
                iconEl.addClass('dayble-icon-bottom');
                if (place === 'bottom-left') iconEl.addClass('dayble-icon-bottom-left');
                else if (place === 'bottom-right') iconEl.addClass('dayble-icon-bottom-right');
                else iconEl.addClass('dayble-icon-bottom-center');
                inner.appendChild(iconEl);
            }
        }
        // Completed behavior
        if (ev.completed) {
            const behavior = this.plugin.settings.completeBehavior ?? 'none';
            if (behavior === 'dim') item.addClass('dayble-event-dim');
            else if (behavior === 'strikethrough') item.addClass('dayble-strikethrough');
            else if (behavior === 'hide') item.addClass('dayble-event-hidden');
            else if (behavior === 'color' && this.plugin.settings.completeColor) {
                const swatches = [
                    ...(this.plugin.settings.swatches || []),
                    ...(this.plugin.settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
                ];
                const s = swatches.find(sw => sw.name === this.plugin.settings.completeColor);
                if (s) {
                    const bgColor = s.color;
                    const textColor = s.textColor || chooseTextColor(bgColor);
                    item.style.setProperty('--event-bg-color', bgColor);
                    item.style.setProperty('--event-text-color', textColor);
                    const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                    const borderColor = hexToRgba(bgColor, bOpacity);
                    item.style.setProperty('--event-border-color', borderColor);
                    item.classList.add('dayble-event-colored');
                    // Update desc text color if present
                    const desc = item.querySelector('.dayble-event-desc') as HTMLElement;
                    if (desc) (desc as HTMLElement).style.setProperty('color', textColor);
                }
            }
        }
        item.addEventListener('click', (evt) => {
            const a = (evt.target as HTMLElement).closest('a');
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                evt.preventDefault();
                evt.stopPropagation();
                const file = resolveNoteFile(this.plugin.app, wiki);
                if (file) {
                    const leaf = this.plugin.app.workspace.getLeaf(true);
                    (leaf as WorkspaceLeaf).openFile(file);
                }
            }
        }, { capture: true });
        item.ondragstart = e => {
            console.debug('[Dayble] Drag started on event:', ev.id);
            this.isSelecting = false;
            this.isDragging = true;
            this.clearSelection();
            e.dataTransfer?.setData('text/plain', ev.id);
            (e.dataTransfer)?.setData('dayble-source','calendar');
            try {
                const dragImg = item.cloneNode(true) as HTMLElement;
                dragImg.addClass('dayble-drag-ghost');
                // Ensure ghost is "visible" for browser capture but off-screen or behind
                dragImg.style.position = 'fixed';
                dragImg.style.top = '0';
                dragImg.style.left = '0';
                dragImg.style.zIndex = '-10000';
                const rect = item.getBoundingClientRect();
                dragImg.setCssProps({
                    'width': `${rect.width}px`,
                    'height': `${rect.height}px`,
                    'border-radius': getComputedStyle(item).borderRadius
                });
                document.body.appendChild(dragImg);
                e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = dragImg;
            } catch (e) { console.debug('[Dayble] Drag image setup error:', e); }
            item.addClass('dayble-dragging');
        };
        item.ondragend = () => {
            item.removeClass('dayble-dragging');
            const di = (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg;
            if (di && di.parentElement) di.remove();
            (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = undefined;
            this.isDragging = false;
        };
        item.onclick = async (e) => { e.stopPropagation(); await this.openEventModal(ev.id); };
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new Menu();

            // Section 1: Copy & Pin
            if (this.plugin.settings.showCopyTextOption) {
                menu.addItem(i => i.setTitle('Copy text').setIcon('clipboard').onClick(async () => {
                    const text = `${ev.title || ''}${ev.description ? '\n' + ev.description : ''}`;
                    await navigator.clipboard.writeText(text);
                    new Notice('Event text copied');
                }));
            }

            if (this.plugin.settings.onlyShowPinnedEventsMonth || this.plugin.settings.onlyShowPinnedEventsWeek || this.plugin.settings.onlyShowPinnedEventsAgenda) {
                menu.addItem(i => i.setTitle(ev.pinned ? 'Unpin event' : 'Pin event').setIcon('pin').onClick(async () => {
                    ev.pinned = !ev.pinned;
                    await this.saveAllEntries();
                    await this.render();
                }));
            }

            // Section 2: Duplicate
            menu.addItem(i => i.setTitle('Duplicate').setIcon('copy').onClick(async () => {
                const newEv: DaybleEvent = { ...ev, id: randomId() };
                this.events.push(newEv);
                await this.saveAllEntries();
                await this.render();
            }));

            menu.addSeparator();

            // Section 3: States & Completion
            const eventStates = this.plugin.settings.eventStates || [];
            if (eventStates.length > 0) {
                // Individual states
                eventStates.forEach(state => {
                    menu.addItem(i => i.setTitle(`Set as ${state.name}`).setIcon(state.icon || 'dot').onClick(async () => {
                        if (state.colorName) ev.colorName = state.colorName;
                        ev.stateId = state.id;
                        ev.effect = state.effect || '';
                        ev.animation = state.animation || '';
                        ev.animation2 = state.animation2 || '';
                        await this.saveAllEntries();
                        await this.render();
                    }));
                });

                // Remove state option (only if a state is currently applied)
                if (ev.stateId) {
                    menu.addItem(i => i.setTitle('Remove state').setIcon('x').onClick(async () => {
                        ev.stateId = undefined;
                        ev.colorName = undefined; // Reset colorName to let it fall back to category or default
                        // Optional: Reset effects/animations if they were tied to the state
                        ev.effect = '';
                        ev.animation = '';
                        ev.animation2 = '';
                        await this.saveAllEntries();
                        await this.render();
                    }));
                }
            }

            menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(async () => {
                ev.completed = !ev.completed;
                await this.saveAllEntries();
                await this.render();
            }));

            menu.addSeparator();

            // Section 4: Delete
            menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(async () => {
                this.events = this.events.filter(e2 => e2.id !== ev.id);
                await this.saveAllEntries();
                await this.render();
            }));
            
            menu.showAtMouseEvent(e);
        };
        return item;
    }

    private isEventToday(ev: DaybleEvent): boolean {
        const t = new Date();
        const yyyy = t.getFullYear();
        const mm = String(t.getMonth() + 1).padStart(2, '0');
        const dd = String(t.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        if (ev.date) return ev.date === todayStr;
        if (ev.startDate && ev.endDate) {
            return ev.startDate <= todayStr && ev.endDate >= todayStr;
        }
        if (ev.startDate && !ev.endDate) {
            return ev.startDate === todayStr;
        }
        return false;
    }

    async renderHolder() {
        const list = this.holderEl?.querySelector('.dayble-holder-list');
        if (!list) return;
        list.empty();
        this.holderEvents.forEach(ev => {
            const item = this.createEventItem(ev);
            item.dataset.source = 'holder';
            item.ondragstart = e => {
                this.isDragging = true;
                this.isSelecting = false;
                this.clearSelection();
                e.dataTransfer?.setData('text/plain', ev.id);
                (e.dataTransfer)?.setData('dayble-source','holder');
                try {
                    const dragImg = item.cloneNode(true) as HTMLElement;
                    dragImg.addClass('dayble-drag-ghost');
                    // Ensure ghost is "visible" for browser capture but off-screen or behind
                    dragImg.style.position = 'fixed';
                    dragImg.style.top = '0';
                    dragImg.style.left = '0';
                    dragImg.style.zIndex = '-10000';
                    const rect = item.getBoundingClientRect();
                    dragImg.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'border-radius': getComputedStyle(item).borderRadius
                    });
                    document.body.appendChild(dragImg);
                    e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                    (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = dragImg;
                } catch (e) { console.debug('[Dayble] Drag image setup error:', e); }
                item.addClass('dayble-dragging');
            };
            item.ondragend = () => {
                item.removeClass('dayble-dragging');
                const di = (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg;
                if (di && di.parentElement) di.remove();
                (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = undefined;
                this.isDragging = false;
            };
            list.appendChild(item);
        });
        // Enable reordering inside holder list with drop indicators
        (list as HTMLElement).ondragover = (e: DragEvent) => {
            e.preventDefault();
            const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
            const eventCount = list.querySelectorAll('.dayble-event').length;
            if (targetEvent && targetEvent.parentElement === list && eventCount > 1) {
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const indicator = document.createElement('div');
                indicator.className = 'dayble-drop-indicator';
                if (relativeY < eventHeight / 2) {
                    targetEvent.parentElement?.insertBefore(indicator, targetEvent);
                } else {
                    targetEvent.after(indicator);
                }
            }
        };
        (list as HTMLElement).ondragleave = (e: DragEvent) => {
            if (e.target === list) list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
        };
        (list as HTMLElement).ondrop = async (e: DragEvent) => {
            e.preventDefault();
            list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
            const id = e.dataTransfer?.getData('text/plain');
            const src = e.dataTransfer?.getData('dayble-source');
            if (!id || src !== 'holder') return;
            const draggedEl = document.querySelector(`[data-id="${id}"]`);
            if (!draggedEl) return;
            const draggedContainer = draggedEl.closest('.dayble-holder-list');
            if (draggedContainer !== list) return;
            const targetEvent = (e.target as HTMLElement).closest('.dayble-event');
            if (targetEvent === draggedEl) return;
            if (!targetEvent) { 
                list.appendChild(draggedEl); 
            } else {
                const rect = targetEvent.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const eventHeight = rect.height;
                if (relativeY < eventHeight / 2) { list.insertBefore(draggedEl, targetEvent); }
                else { targetEvent.after(draggedEl); }
            }
            // Persist new holder order
            const reordered: DaybleEvent[] = [];
            list.querySelectorAll('.dayble-event').forEach(el => {
                const eid = (el as HTMLElement).dataset.id;
                const found = this.holderEvents.find(ev => ev.id === eid);
                if (found) reordered.push(found);
            });
            this.holderEvents = reordered;
            await this.saveAllEntries();
        };
    }

    async openEventModal(id?: string, date?: string, endDate?: string, startTime?: string, endTime?: string): Promise<void> {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }
        const existing = id ? (this.events.find(e => e.id === id) ?? this.holderEvents.find(e => e.id === id)) : undefined;
        const fromHolder = !!(existing && this.holderEvents.some(e => e.id === existing.id));
        const modal = new EventModal(this.app, this.plugin, existing, date, endDate, startTime, endTime, async result => {
            const isMulti = !!(result.startDate && result.endDate);
            const isSingle = !!result.date || (!!result.startDate && !result.endDate);
            if (existing) {
                Object.assign(existing, result);
            } else {
                const ev: DaybleEvent = { id: randomId(), ...result } as DaybleEvent;
                if (isMulti || isSingle) {
                    this.events.push(ev);
                } else {
                    this.holderEvents.push(ev);
                }
            }
            try {
                await this.saveAllEntries();
            } catch (e) {
                console.error('[Dayble] Save failed:', e);
            }
            await this.renderHolder();
            await this.render();
            if (this.currentTodayModal) {
                this.currentTodayModal.events = this.events;
                void this.currentTodayModal.onOpen();
            }
        }, async () => {
            if (existing) {
                if (fromHolder) {
                    this.holderEvents = this.holderEvents.filter(e => e.id !== existing.id);
                } else {
                    this.events = this.events.filter(e => e.id !== existing.id);
                }
                await this.saveAllEntries();
                await this.render();
            }
        }, async () => {
            const picker = new IconPickerModal(this.app, icon => {
                if (existing) existing.icon = icon;
                modal.setIcon(icon);
            }, () => {
                // Remove icon handler
                if (existing) existing.icon = undefined;
                modal.setIcon('');
            });
            void picker.open();
        });
        modal.categories = this.plugin.settings.eventCategories || [];
        modal.plugin = this.plugin;
        void modal.open();
    }

    openTodayModal(date: string) {
        const modal = new TodayModal(this.app, date, this.events, this);
        this.currentTodayModal = modal;
        modal.onClose = () => { this.currentTodayModal = undefined; };
        void modal.open();
    }
}

class EventModal extends Modal {
    plugin: DaybleCalendarPlugin;
    categories: EventCategory[] = [];
    ev?: DaybleEvent;
    date?: string;
    endDate?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    onSubmit: (ev: Partial<DaybleEvent>) => Promise<void>;
    onDelete: () => Promise<void>;
    onPickIcon: () => Promise<void>;
    icon?: string;
    iconBtnEl?: HTMLButtonElement;
    selectedColor?: string;
    selectedTextColor?: string;
    selectedColorName?: string;
    isPinned: boolean = false;
    selectedTitleAlign?: 'left' | 'center' | 'right' | 'center-left';
    selectedDescAlign?: 'left' | 'center' | 'right' | 'center-left';
    selectedLayout?: string;

    constructor(app: App, plugin: DaybleCalendarPlugin, ev: DaybleEvent | undefined, date: string | undefined, endDate: string | undefined, defaultStartTime: string | undefined, defaultEndTime: string | undefined, onSubmit: (ev: Partial<DaybleEvent>) => Promise<void>, onDelete: () => Promise<void>, onPickIcon: () => Promise<void>) {
        super(app);
        this.plugin = plugin;
        this.ev = ev;
        this.date = date;
        this.endDate = endDate;
        this.defaultStartTime = defaultStartTime;
        this.defaultEndTime = defaultEndTime;
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;
        this.onPickIcon = onPickIcon;
        this.icon = ev?.icon;
        this.selectedColor = ev?.color;
        this.selectedTextColor = ev?.textColor;
        this.selectedColorName = ev?.colorName;
        this.isPinned = ev?.pinned ?? false;
        this.selectedTitleAlign = ev?.settings?.titleAlign;
        this.selectedDescAlign = ev?.settings?.descAlign;
        this.selectedLayout = ev?.settings?.layout;
    }

    setIcon(icon: string) { this.icon = icon; if (this.iconBtnEl) setIcon(this.iconBtnEl, icon || 'plus'); }

    onOpen() {
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
        setIcon(iconBtn, this.icon ?? 'plus');
        iconBtn.onclick = () => this.onPickIcon();
        this.iconBtnEl = iconBtn;
        const titleInput = row1.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Event title', autofocus: 'true' } });
        titleInput.addClass('db-input');
        titleInput.value = this.ev?.title ?? '';

        const pinBtn = row1.createEl('button', { cls: 'dayble-btn' });
        pinBtn.addClass('db-btn');
        setIcon(pinBtn, 'pin');
        setTooltip(pinBtn, this.isPinned ? 'Unpin event' : 'Pin event');
        
        const updatePinStyle = () => {
            if (this.isPinned) {
                pinBtn.addClass('mod-cta');
                pinBtn.removeClass('button');
            } else {
                pinBtn.removeClass('mod-cta');
                pinBtn.addClass('button');
            }
        };
        updatePinStyle();

        pinBtn.onclick = (e) => {
            e.preventDefault();
            this.isPinned = !this.isPinned;
            updatePinStyle();
            setTooltip(pinBtn, this.isPinned ? 'Unpin event' : 'Pin event');
        };

        const focusTitle = () => { try { titleInput.focus({ preventScroll: true }); } catch (e) { console.debug('[Dayble] Focus title:', e); } };
        focusTitle();
        requestAnimationFrame(focusTitle);
        setTimeout(focusTitle, 0);
        
        // [[link]] suggestions shared for title and description
        let suggestionContainer: HTMLElement | null = null;
        let suggestionSelectedIndex = 0;
        let suggestionTarget: HTMLInputElement | HTMLTextAreaElement | null = null;
        const closeSuggestions = () => { if (suggestionContainer) { suggestionContainer.remove(); suggestionContainer = null; } suggestionSelectedIndex = 0; suggestionTarget = null; };
        const showSuggestionsFor = (target: HTMLInputElement | HTMLTextAreaElement) => {
            if (suggestionContainer) suggestionContainer.remove();
            const val = target.value || '';
            const match = val.match(/\[\[([^[\]]*?)$/);
            if (!match) return;
            const query = match[1].toLowerCase();
            const files = this.app.vault.getFiles()
            .filter((f: TFile) => f.name && f.name.toLowerCase().includes(query) && !f.name.startsWith('.'))
            .slice(0, 10);
            if (files.length === 0) return;
            suggestionTarget = target;
            suggestionSelectedIndex = 0;
            suggestionContainer = document.createElement('div');
            suggestionContainer.className = 'dayble-link-suggestions dayble-suggestion-container';
            files.forEach((file: TFile, i: number) => {
                const item = document.createElement('div');
                item.textContent = file.name;
                item.classList.add('dayble-suggestion-item');
                if (i === 0) { item.classList.add('is-selected'); }
                
                item.onmouseenter = () => {
                    suggestionSelectedIndex = i;
                    const allItems = Array.from(suggestionContainer?.children || []) as HTMLElement[];
                    allItems.forEach(el => el.classList.remove('is-selected'));
                    item.classList.add('is-selected');
                };

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
            suggestionContainer.setCssProps({
                'left': Math.round(rect.left) + 'px',
                'top': Math.round(rect.top + rect.height) + 'px'
            });
        };
        const moveSuggestionSelection = (dir: 1 | -1) => {
            if (!suggestionContainer) return;
            const items = Array.from(suggestionContainer.children) as HTMLElement[];
            items.forEach(i => { i.classList.remove('is-selected'); });
            suggestionSelectedIndex = Math.max(0, Math.min(items.length - 1, suggestionSelectedIndex + dir));
            const sel = items[suggestionSelectedIndex];
            if (sel) { sel.classList.add('is-selected'); }
        };
        const chooseCurrentSuggestion = () => {
            if (!suggestionContainer || !suggestionTarget) return;
            const items = Array.from(suggestionContainer.children) as HTMLElement[];
            const sel = items[suggestionSelectedIndex];
            if (!sel) return;
            const name = sel.textContent || '';
            const text = suggestionTarget.value;
            const beforeMatch = text.substring(0, text.lastIndexOf('[['));
            suggestionTarget.value = beforeMatch + '[[' + name + ']]';
            closeSuggestions();
        };
        document.addEventListener('keydown', (e) => {
            if (!suggestionContainer) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggestionSelection(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggestionSelection(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); chooseCurrentSuggestion(); }
            else if (e.key === 'Escape') { e.preventDefault(); closeSuggestions(); }
        }, { capture: true });
        titleInput.oninput = () => { showSuggestionsFor(titleInput); };
        
        // Create color swatch row (will be positioned based on setting)
        const createColorRow = () => {
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
                this.selectedColorName = undefined;
                document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                defaultSwatch.addClass('dayble-color-swatch-selected');
            };
            if (!this.selectedColor && !this.selectedColorName) defaultSwatch.addClass('dayble-color-swatch-selected');
            
            const settings = this.plugin.settings;
            const builtSwatches = (settings?.swatches ?? []).map((s: { name: string, color: string, textColor?: string }) => ({ name: s.name, color: s.color, textColor: s.textColor }));
            const customSwatches = (settings?.userCustomSwatches ?? []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ name: s.name || `custom-${idx}`, color: s.color, textColor: s.textColor }));
            const swatches: Array<{ name: string, color: string, textColor?: string }> = builtSwatches.concat(customSwatches);
            
            swatches.forEach(({ name, color, textColor }) => {
                const swatch = swatchesContainer.createEl('button', { cls: 'dayble-color-swatch' });
                swatch.addClass('db-color-swatch');
                swatch.setCssProps({
                    'background-color': color,
                    'border-color': color
                });
                swatch.title = name || color;
                swatch.onclick = () => {
                    this.selectedColor = undefined;
                    this.selectedTextColor = undefined;
                    this.selectedColorName = name;
                    document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                    swatch.addClass('dayble-color-swatch-selected');
                };
                if (this.selectedColorName === name || (this.selectedColor === color && !this.selectedColorName)) swatch.addClass('dayble-color-swatch-selected');
            });
            return colorRow;
        };
        
        // Add color swatches under title if setting says so
        const colorSwatchPos = this.plugin.settings.colorSwatchPosition ?? 'under-title';
        if (colorSwatchPos === 'under-title') {
            createColorRow();
        }
        
        const ruleRow = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        ruleRow.addClass('db-modal-row');
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.addClass('db-label');
        categoryLabel.addClass('dayble-category-label');
        let selectedCategoryId = this.ev?.categoryId;
        const categorySelect = ruleRow.createEl('select', { cls: 'dayble-input dayble-category-select' });
        categorySelect.addClass('db-select');
        const emptyOpt = categorySelect.createEl('option'); emptyOpt.value=''; emptyOpt.text='Default';
        const categories = this.plugin.settings.eventCategories || [];
        categories.forEach((c: EventCategory) => { const opt = categorySelect.createEl('option'); opt.value = c.id; opt.text = c.name; });
        categorySelect.value = selectedCategoryId ?? '';
        
        categorySelect.onchange = () => { 
            selectedCategoryId = categorySelect.value || undefined; 
        };
        
        // Date row (above times)
        const rowDate = c.createDiv({ cls: 'dayble-modal-row' });
        rowDate.addClass('db-modal-row');
        const startDate = rowDate.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.addClass('db-input');
        startDate.value = this.ev?.date ?? this.ev?.startDate ?? this.date ?? '';
        
        // End date in same row
        const endDateInput = rowDate.createEl('input', { type: 'date', cls: 'dayble-input' });
        endDateInput.addClass('db-input');
        endDateInput.value = this.ev?.endDate ?? this.endDate ?? startDate.value;
        
        // Time row (start and end on same row)
        const rowTime = c.createDiv({ cls: 'dayble-modal-row' });
        rowTime.addClass('db-modal-row');
        const startTime = rowTime.createEl('input', { type: 'time', cls: 'dayble-input' });
        startTime.addClass('db-input');
        startTime.value = this.ev?.time?.split('-')[0] ?? (this.defaultStartTime ?? '');
        const endTime = rowTime.createEl('input', { type: 'time', cls: 'dayble-input' });
        endTime.addClass('db-input');
        endTime.value = this.ev?.time?.split('-')[1] ?? (this.defaultEndTime ?? '');
        
        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.addClass('db-textarea');
        descInput.value = this.ev?.description ?? '';
        
        descInput.oninput = () => { showSuggestionsFor(descInput); };

        // Per-event alignment settings
        const alignRow = c.createDiv({ cls: 'dayble-modal-row dayble-align-row' });
        alignRow.style.display = 'flex';
        alignRow.style.gap = '10px';
        alignRow.style.marginTop = '10px';

        const createAlignSelect = (label: string, value: string | undefined, onChange: (v: any) => void) => {
            const container = alignRow.createDiv({ cls: 'dayble-align-container' });
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.flex = '1';
            container.createEl('label', { text: label }).style.fontSize = '0.8em';
            const sel = container.createEl('select', { cls: 'dropdown' });
            const options = ['default', 'left', 'center', 'right', 'center-left'];
            options.forEach(opt => {
                const o = sel.createEl('option', { text: opt, value: opt === 'default' ? '' : opt });
                if ((opt === 'default' && !value) || opt === value) o.selected = true;
            });
            sel.onchange = () => onChange(sel.value || undefined);
            return sel;
        };

        createAlignSelect('Title align', this.selectedTitleAlign, (v) => this.selectedTitleAlign = v);
        createAlignSelect('Desc align', this.selectedDescAlign, (v) => this.selectedDescAlign = v);

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
                setIcon(del, 'trash-2');
                del.onclick = async () => { await this.onDelete(); this.close(); };
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
        const handleSave = async () => {
            const payload: Partial<DaybleEvent> = {
                title: titleInput.value,
                description: descInput.value,
                icon: this.icon,
                pinned: this.isPinned,
                categoryId: selectedCategoryId,
                color: this.selectedColor,
                textColor: this.selectedTextColor,
                colorName: this.selectedColorName,
                settings: {
                    titleAlign: this.selectedTitleAlign,
                    descAlign: this.selectedDescAlign,
                    layout: this.selectedLayout
                }
            };
            if (!payload.categoryId && !payload.color && !payload.colorName) {
                const triggers = this.plugin.settings.triggers || [];
                const txt = ((payload.title || '') + ' ' + (payload.description || '')).toLowerCase();
                const found = triggers.find((t: { pattern: string, categoryId: string, color?: string, textColor?: string, colorName?: string }) => (t.pattern || '').toLowerCase() && txt.includes((t.pattern || '').toLowerCase()));
                if (found) {
                    if (!payload.categoryId && found.categoryId) payload.categoryId = found.categoryId;
                    if (!payload.color && !payload.colorName) {
                        if (found.colorName) {
                            payload.colorName = found.colorName;
                        } else if (found.color) {
                            payload.color = found.color;
                            payload.textColor = found.textColor;
                        }
                    }
                }
            }
            
            const finalIsMultiDay = startDate.value !== endDateInput.value;
            
            if (finalIsMultiDay && endTime && endDateInput) {
                // Multi-day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.startDate = startDate.value;
                payload.endDate = endDateInput.value;
                payload.date = undefined;
            } else {
                // Single day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime?.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.date = startDate.value;
                payload.startDate = startDate.value;
                payload.endDate = startDate.value;
            }
            
            try {
                await this.onSubmit(payload);
                this.close();
            } catch (e) {
                console.error('[Dayble] Error saving event:', e);
                new Notice('Error saving event: ' + (e instanceof Error ? e.message : String(e)));
            }
        };

        ok.onclick = handleSave;

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !suggestionContainer) {
                e.preventDefault();
                handleSave();
            }
        });
        // Prevent modal open when clicking markdown links inside event items; open note in new tab
        this.contentEl.addEventListener('click', (ev) => {
            const a = (ev.target as HTMLElement).closest('a');
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (leaf as WorkspaceLeaf).openFile(file);
                }
            }
        }, { capture: true });
    }
}

class IconPickerModal extends Modal {
    onPick: (icon: string) => void;
    onRemove?: () => void;
    allIcons: string[] = [];
    constructor(app: App, onPick: (icon: string) => void, onRemove?: () => void) { super(app); this.onPick = onPick; this.onRemove = onRemove; }
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
        // setIcon(removeIcon, 'x');
        removeIcon.addClass('dayble-inline-flex');
        removeBtn.onclick = () => { if (this.onRemove) this.onRemove(); this.close(); };
        
        // Load icons lazily
        if (!this.allIcons.length) {
            this.allIcons = getIconIdsSafe();
        }
        
        const renderList = (icons: string[], limit: number = 98) => {
            list.empty();
            const toShow = limit > 0 ? icons.slice(0, limit) : icons;
            toShow.forEach(id => {
                const btn = list.createEl('button', { cls: 'dayble-icon-btn' });
                btn.addClass('db-icon-btn');
                btn.title = id;
                setIcon(btn, id);
                btn.onclick = () => { this.onPick(id); this.close(); };
            });
        };
        
        const applyFilter = () => {
            const q = (searchInput.value || '').toLowerCase();
            if (!q) {
                renderList(this.allIcons, 98);
            } else {
                const filtered = this.allIcons.filter(id => id.toLowerCase().includes(q));
                renderList(filtered, 500); // Show more when searching
            }
        };
        
        searchInput.oninput = applyFilter;
        renderList(this.allIcons, 98);
    }
}

class PromptSearchModal extends Modal {
    view: DaybleCalendarView;
    query: string = '';
    results: DaybleEvent[] = [];
    selectedIndex: number = 0;
    constructor(app: App, view: DaybleCalendarView) { 
        super(app); 
        this.view = view; 
        try {
            this.modalEl.classList.remove('modal');
            this.modalEl.className = 'prompt';
            // Remove default content wrapper so prompt is the root
            if (this.contentEl && this.contentEl.parentElement === this.modalEl) {
                this.contentEl.remove();
            }
        } catch (e) { console.debug('[Dayble] PromptSearchModal init:', e); }
    }
    async onOpen() {
        const root = this.modalEl;
        while (root.firstChild) root.removeChild(root.firstChild);
        const inputWrap = root.createDiv({ cls: 'prompt-input-container' });
        const input = inputWrap.createEl('input', { cls: 'prompt-input', attr: { autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', type: 'text', placeholder: 'Find events...' } });
        const resultsEl = root.createDiv({ cls: 'prompt-results' });
        const render = () => {
            resultsEl.empty();
            const items = this.results;
            if (!items.length) return;
            items.forEach((ev, i) => {
                const row = resultsEl.createDiv({ cls: 'suggestion-item mod-complex' });
                if (i === this.selectedIndex) row.addClass('is-selected');
                row.onmouseenter = () => { this.selectedIndex = i; render(); };
                const content = row.createDiv({ cls: 'suggestion-content' });
                const title = content.createDiv({ cls: 'suggestion-title' });
                title.textContent = ev.title || '(untitled)';
                const note = content.createDiv({ cls: 'suggestion-note' });
                note.textContent = ev.date + (ev.time ? ' ' + ev.time : '');
                note.addClass('dayble-suggestion-note');
                row.onclick = async () => { await this.choose(i); };
                row.onmousedown = async (e) => { e.preventDefault(); e.stopPropagation(); await this.choose(i); };
            });
        };
        const update = async () => {
            const q = (input.value || '').toLowerCase();
            this.query = q;
            
            // Search all months by loading all JSON files
            const folder = this.view.plugin.settings.entriesFolder || 'DaybleCalendar';
            let allEvents: DaybleEvent[] = [];
            
            // Start with current view events to be fast
            allEvents = this.view.events.slice();
            
            try {
                // Load all other files if we have a query
                if (q.length > 0) {
                    let listing;
                    try {
                        listing = await this.app.vault.adapter.list(folder);
                    } catch {
                        // Folder might not exist or other error
                        listing = { files: [] };
                    }
                    
                    const files = (listing.files || []).filter((f: string) => f.toLowerCase().endsWith('.json'));
                    
                    for (const f of files) {
                        // Skip current month file as it's already in memory
                        const currentFile = this.view.getMonthDataFilePath();
                        if (f === currentFile) continue;
                        if (f.endsWith(currentFile.split('/').pop())) continue;
                        
                        try {
                            const txt = await this.app.vault.adapter.read(f);
                            const data = JSON.parse(txt);
                            // Handle both legacy array format and new object format
                            let fileEvents: DaybleEvent[] = [];
                            if (Array.isArray(data)) {
                                fileEvents = data;
                            } else if (data && Array.isArray(data.events)) {
                                fileEvents = data.events;
                            }
                            
                            if (fileEvents.length > 0) {
                                allEvents = allEvents.concat(fileEvents);
                            }
                        } catch { /* ignore */ }
                    }
                }
            } catch { /* ignore */ }

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
        };
        const onKey = async (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { this.selectedIndex = Math.min(this.results.length - 1, this.selectedIndex + 1); render(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { this.selectedIndex = Math.max(0, this.selectedIndex - 1); render(); e.preventDefault(); }
            else if (e.key === 'Enter') { await this.choose(this.selectedIndex); e.preventDefault(); }
            else if (e.key === 'Escape') { this.close(); e.preventDefault(); }
        };
        input.oninput = async () => { await update(); };
        input.onkeydown = onKey;
        input.focus();
        await update();
    }
    async choose(idx: number) {
        const ev = this.results[idx];
        if (!ev) return;
        const dateStr = ev.date || ev.startDate;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            this.view.currentDate = new Date(y, (m || 1) - 1, d || 1);
            await this.view.loadAllEntries();
            this.view.render();
            setTimeout(() => {
                const nodes = Array.from(this.view.containerEl.querySelectorAll(`.dayble-event[data-id="${ev.id}"]`));
                nodes.forEach(n => n.classList.add('dayble-event-highlight'));
                setTimeout(() => { nodes.forEach(n => n.classList.remove('dayble-event-highlight')); }, 2000);
            }, 0);
        }
        this.close();
    }
}

class TodayModal extends Modal {
    date: string;
    events: DaybleEvent[];
    view?: DaybleCalendarView;
    dragId?: string;
    dragDuration?: number;
    dragEl?: HTMLElement;
    dragOffsetY?: number;
    lastScrollTop?: number;
    
    gridContainer: HTMLElement;
    morningGrid: HTMLElement;
    afternoonGrid: HTMLElement;
    overlay: HTMLElement;
    scroller: HTMLElement;

    constructor(app: App, date: string, events: DaybleEvent[], view?: DaybleCalendarView) {
        super(app);
        this.date = date;
        this.events = events;
        this.view = view;
    }
    
    onOpen() {
        const c = this.contentEl;
        const split = this.view?.plugin?.settings?.todayModalSplitView ?? true;
        if (split) this.modalEl.addClass('dayble-modal-wide');
        c.empty();
        c.addClass('dayble-modal-column');
        c.addClass('dayble-modal-full-height');
        c.addClass('db-modal');
        const [year, month, day] = this.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const title = c.createEl('h3', { text: `${monthNames[dateObj.getMonth()]} ${day}` });
        title.addClass('db-modal-title');
        title.addClass('dayble-modal-title');
        const fmt = this.view?.plugin?.settings?.timeFormat ?? '24h';
        const pad = (n: number) => String(n).padStart(2,'0');
        const nextDateStr = (s: string) => {
            const [yy, mm, dd] = s.split('-').map(Number);
            const t = new Date(yy, (mm || 1) - 1, dd || 1);
            t.setDate(t.getDate() + 1);
            return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
        };
        const labelFor = (h: number, m: number) => {
            if (m !== 0) return '';
            if (fmt === '12h') {
                const isPM = h >= 12;
                const h12 = ((h % 12) || 12);
                return `${h12}:00${isPM?'pm':'am'}`;
            }
            return `${pad(h)}:00`;
        };
        const slots: { hour: number; minute: number }[] = [];
        for (let h = 0; h <= 23; h++) {
            slots.push({ hour: h, minute: 0 });
            slots.push({ hour: h, minute: 30 });
        }

        const scroller = c.createDiv({ cls: 'dayble-focus-scroll' });
        this.scroller = scroller;
        scroller.style.setProperty('--event-border-radius', `${this.view?.plugin?.settings?.eventBorderRadius ?? 6}px`);

        // Capture scroll position to prevent reset on re-render
        scroller.addEventListener('scroll', () => {
            this.lastScrollTop = scroller.scrollTop;
        });

        // All-day / Multi-day events section above scroll
        const allDayEvents = (this.events || []).filter(e => {
            const isToday = (e.date === this.date) || (e.startDate === this.date) || 
                            (e.startDate && e.endDate && this.date >= e.startDate && this.date <= e.endDate);
            if (!isToday) return false;
            // It's an all-day event if it has no time OR if it's a multi-day event
            const isMultiDay = e.startDate && e.endDate && e.startDate !== e.endDate;
            return !e.time || isMultiDay;
        }).sort((a, b) => {
            const ad = a.startDate && a.endDate ? (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) : 0;
            const bd = b.startDate && b.endDate ? (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) : 0;
            if (ad !== bd) return bd - ad; // longer first
            return (a.title || '').localeCompare(b.title || '');
        });

        if (allDayEvents.length > 0) {
            const allDaySection = c.createDiv({ cls: 'dayble-all-day-section' });
            allDaySection.setCssProps({
                'padding': '8px',
                'border-bottom': '1px solid var(--background-modifier-border)',
                'display': 'flex',
                'flex-direction': 'row',
                'flex-wrap': 'wrap',
                'gap': '4px',
                'flex-shrink': '0'
            });
            allDayEvents.forEach(ev => {
                const item = this.view?.createEventItem(ev) || document.createElement('div');
                item.addClass('dayble-all-day-event-item');
                item.setCssProps({
                    'flex': '1 1 calc(50% - 4px)',
                    'min-width': '120px',
                    'cursor': 'pointer',
                    'overflow': 'hidden'
                });
                item.onclick = (e) => { e.stopPropagation(); this.view?.openEventModal(ev.id, ev.date || ev.startDate, ev.endDate); };
                allDaySection.appendChild(item);
            });
            c.appendChild(scroller);
        }

        // Container for grids
        const gridContainer = scroller.createDiv({ cls: 'dayble-focus-grid-container' });
        this.gridContainer = gridContainer;
        let morningGrid: HTMLElement, afternoonGrid: HTMLElement;
        if (split) {
            morningGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid morning' });
            afternoonGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid afternoon' });
        } else {
            morningGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid' });
            afternoonGrid = morningGrid; // both point to same in single mode
        }
        this.morningGrid = morningGrid;
        this.afternoonGrid = afternoonGrid;
        
        const overlay = gridContainer.createDiv({ cls: 'dayble-focus-overlay' });
        this.overlay = overlay;
        let dropIndicator: HTMLElement | null = null;
        let selectionMirror: HTMLElement | null = null;
        
        const getSlotInfo = (clientX: number, clientY: number) => {
            const morningRect = morningGrid.getBoundingClientRect();
            const afternoonRect = afternoonGrid.getBoundingClientRect();
            
            const isAfternoon = split && (clientX > (morningRect.right + afternoonRect.left) / 2);
            const targetGrid = isAfternoon ? afternoonGrid : morningGrid;
            
            // Calculate correct target Rect for width/left boundaries
            const targetRect = targetGrid.getBoundingClientRect();
            
            const cells = Array.from(targetGrid.querySelectorAll('.dayble-focus-cell')) as HTMLElement[];
            if (cells.length === 0) return null;

            // Find the cell under the given clientY
            // We use the first cell to get a base row height for min15 sub-slot calculation
            const firstCellRect = cells[0].getBoundingClientRect();
            const pxPer30 = firstCellRect.height;
            const pxPer15 = pxPer30 / 2;

            let targetCell: HTMLElement | null = null;
            let slotIdx = -1;

            for (const cell of cells) {
                const r = cell.getBoundingClientRect();
                if (clientY >= r.top && clientY <= r.bottom) {
                    targetCell = cell;
                    slotIdx = parseInt(cell.getAttribute('data-idx') || '-1', 10);
                    break;
                }
            }

            // Fallback to first or last cell if out of bounds
            if (!targetCell) {
                if (clientY < targetRect.top) {
                    targetCell = cells[0];
                    slotIdx = parseInt(targetCell.getAttribute('data-idx') || '0', 10);
                } else {
                    targetCell = cells[cells.length - 1];
                    slotIdx = parseInt(targetCell.getAttribute('data-idx') || '47', 10);
                }
            }

            const targetCellRect = targetCell.getBoundingClientRect();
            const relYInCell = clientY - targetCellRect.top;
            const isSecondHalf = relYInCell > pxPer15;
            
            // n is the total number of min15 increments from the start of the grid
            // (slotIdx - baseIdx) * 2 + (isSecondHalf ? 1 : 0)
            const baseIdx = (split && isAfternoon) ? 24 : 0;
            const n = (slotIdx - baseIdx) * 2 + (isSecondHalf ? 1 : 0);

            return {
                slotIdx,
                isSecondHalf,
                pxPer15,
                isAfternoon,
                targetRect,
                targetCell,
                relY: clientY - targetRect.top,
                n
            };
        };

        const clearTargets = () => {
            gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
        };
        // snapping via pxPer15 computed per dragover/drop
        const sel: { active: boolean, start15?: number, end15?: number } = { active: false };
        const clearSelection = (resetData = true) => { 
            gridContainer.querySelectorAll('.dayble-focus-cell').forEach(el => {
                el.removeClass('sel-top');
                el.removeClass('sel-bottom');
            });
            gridContainer.removeClass('dayble-selecting');
            if (resetData) {
                sel.active = false;
                sel.start15 = undefined;
                sel.end15 = undefined;
            }
            if (selectionMirror) { selectionMirror.remove(); selectionMirror = null; }
        };
        const applySelection = () => {
            if (sel.active && typeof sel.start15 === 'number' && typeof sel.end15 === 'number') {
                const s15 = Math.min(sel.start15, sel.end15);
                const e15 = Math.max(sel.start15, sel.end15);
                
                // Visual Highlight on cells (min15 precision)
                for (let i = s15; i <= e15; i++) {
                    const slotIdx = Math.floor(i / 2);
                    const cell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${slotIdx}"]`) as HTMLElement;
                    if (cell) {
                        if (i % 2 === 0) cell.addClass('sel-top');
                        else cell.addClass('sel-bottom');
                    }
                }

                if (selectionMirror) { selectionMirror.remove(); selectionMirror = null; }
                selectionMirror = document.createElement('div');
                selectionMirror.className = 'dayble-focus-selection-mirror-container';
                overlay.appendChild(selectionMirror);

                const renderMirrorSegment = (start15: number, end15: number, type: 'full'|'start'|'end') => {
                    const startSlotIdx = Math.floor(start15 / 2);
                    const startCell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${startSlotIdx}"]`) as HTMLElement;
                    if (!startCell) return;

                    const gRect = gridContainer.getBoundingClientRect();
                    const sRect = startCell.getBoundingClientRect();
                    const rowHeight = startCell.offsetHeight || 60;
                    const pxPer15 = rowHeight / 2;

                    const segment = document.createElement('div');
                    segment.className = 'dayble-focus-event-abs dayble-focus-selection-mirror';
                    if (type === 'start') segment.addClass('dayble-focus-event-split-start');
                    if (type === 'end') segment.addClass('dayble-focus-event-split-end');
                    selectionMirror?.appendChild(segment);

                    const left = sRect.left - gRect.left;
                    const top = (sRect.top - gRect.top) + (start15 % 2 === 0 ? 0 : pxPer15);
                    const width = startCell.offsetWidth;
                    const height = Math.max(4, ((end15 - start15) + 1) * pxPer15);
                    
                    segment.style.setProperty('--focus-item-left', `${Math.round(left)}px`);
                    segment.style.setProperty('--focus-item-top', `${Math.round(top)}px`);
                    segment.style.setProperty('--focus-item-width', `${Math.round(width)}px`);
                    segment.style.setProperty('--focus-item-height', `${Math.round(height)}px`);
                };

                const boundary15 = 48; // 12:00 PM is at min15 index 48
                if (split && s15 < boundary15 && e15 >= boundary15) {
                    renderMirrorSegment(s15, boundary15 - 1, 'start');
                    renderMirrorSegment(boundary15, e15, 'end');
                } else {
                    renderMirrorSegment(s15, e15, 'full');
                }
                
                if (selectionMirror) {
                    // Show time range and duration in the container or segments
                    const sTotal = s15 * 15;
                    const eTotal = (e15 + 1) * 15;
                    const sh_m = Math.floor(sTotal / 60);
                    const sm_m = sTotal % 60;
                    const eh_m = Math.floor(eTotal / 60);
                    const em_m = eTotal % 60;
                    const formatHM = (h: number, m: number) => {
                        const ampm = h >= 12 ? 'pm' : 'am';
                        return `${h % 12 || 12}:${m.toString().padStart(2, '0')}${ampm}`;
                    };

                    const durationTotalMin = (e15 - s15 + 1) * 15;
                    let durationText = '';
                    if (durationTotalMin < 60) {
                        durationText = `${durationTotalMin} mins`;
                    } else {
                        const h = Math.floor(durationTotalMin / 60);
                        const m = durationTotalMin % 60;
                        if (m === 0) {
                            durationText = `${h} hour${h > 1 ? 's' : ''}`;
                        } else {
                            durationText = `${h} hour${h > 1 ? 's' : ''} & ${m} min${m > 1 ? 's' : ''}`;
                        }
                    }

                    // For now, just add text to the first segment
                    const firstSeg = selectionMirror.querySelector('.dayble-focus-selection-mirror') as HTMLElement;
                    if (firstSeg) {
                        const inner = firstSeg.createDiv({ cls: 'dayble-focus-event-inner' });
                        inner.createDiv().setText(`${formatHM(sh_m, sm_m)} - ${formatHM(eh_m, em_m)}`);
                        inner.createDiv({ cls: 'dayble-selection-duration' }).setText(durationText);
                    }
                }
            }
        };
        const toTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
        const finalizeSelection = async () => {
            if (typeof sel.start15 !== 'number' || typeof sel.end15 !== 'number') return;
            const sIdx15 = Math.min(sel.start15, sel.end15);
            const eIdx15 = Math.max(sel.start15, sel.end15);
            
            const startTotalMin = sIdx15 * 15;
            const endTotalMin = (eIdx15 + 1) * 15;
            
            const sh = Math.floor(startTotalMin / 60);
            const sm = startTotalMin % 60;
            const eh = Math.floor(endTotalMin / 60);
            const em = endTotalMin % 60;
            
            const sTime = toTime(sh, sm);
            let eTime = toTime(eh, em);
            const endIsMidnightNext = (endTotalMin >= 24 * 60);
            if (endIsMidnightNext) eTime = '00:00';
            
            const sDate = this.date;
            const eDate = endIsMidnightNext ? nextDateStr(this.date) : this.date;
            await this.view?.openEventModal(undefined, sDate, eDate, sTime, eTime);
        };
        // Global mouseup to catch releases outside the specific cell
        const onGlobalMouseUp = async (e: MouseEvent) => {
            if (!sel.active) return;
            e.stopPropagation();
            
            sel.active = false;
            await finalizeSelection();
            clearSelection();
            window.removeEventListener('mouseup', onGlobalMouseUp);
        };

        slots.forEach((slot, idx) => {
            const targetGrid = (split && slot.hour >= 12) ? afternoonGrid : morningGrid;
            const row = targetGrid.createDiv({ cls: 'dayble-focus-row' });
            const time = row.createDiv({ cls: 'dayble-focus-time' });
            time.addClass('dayble-time-el-style');
            time.textContent = labelFor(slot.hour, slot.minute);
            
            // Interaction for time labels (clicking/dragging on times creates event)
            time.onmousedown = (e) => {
                if ((e as MouseEvent).button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                
                sel.active = true; 
                gridContainer.addClass('dayble-selecting');
                sel.start15 = idx * 2; // Each slot is 30 mins, so 2x min15 increments
                sel.end15 = sel.start15;

                clearSelection(false); 
                applySelection();
                window.addEventListener('mouseup', onGlobalMouseUp);
            };
            time.onmouseover = (e) => {
                if (!sel.active) return;
                e.preventDefault();
                e.stopPropagation();
                
                sel.end15 = idx * 2;
                
                clearSelection(false); 
                applySelection();
            };
            time.onmouseup = (e) => {
                e.stopPropagation();
            };
            time.onclick = (e) => {
                e.stopPropagation();
            };

            const cell = row.createDiv({ cls: 'dayble-focus-cell' });
            cell.setAttr('data-idx', String(idx));
            
            cell.onmousedown = (e) => {
                if ((e as MouseEvent).button !== 0) return;
                const info = getSlotInfo(e.clientX, e.clientY);
                if (!info) return;
                
                sel.active = true; 
                gridContainer.addClass('dayble-selecting');
                sel.start15 = info.isAfternoon ? (24*2 + (info.n % 48)) : info.n;
                sel.end15 = sel.start15;

                clearSelection(false); 
                applySelection();
                window.addEventListener('mouseup', onGlobalMouseUp);
            };
            cell.onmouseover = (e) => {
                if (!sel.active) return;
                
                const info = getSlotInfo(e.clientX, e.clientY);
                if (!info) return;

                sel.end15 = info.isAfternoon ? (24*2 + (info.n % 48)) : info.n;
                
                clearSelection(false); 
                applySelection();
            };
            cell.onmouseup = (e) => {
                e.stopPropagation();
            };
            // Use click only as a fallback for mobile or when mousedown/mouseup are interrupted
            cell.onclick = (e) => {
                e.stopPropagation();
            };
        });
        scroller.onmouseleave = () => { if (sel.active) { sel.active = false; clearSelection(); } };
        
        // Dynamic mousemove tracking on scroller for selection contraction
        scroller.onmousemove = (e) => {
            if (!sel.active) return;
            
            const info = getSlotInfo(e.clientX, e.clientY);
            if (!info) return;

            const currentN = info.isAfternoon ? (24*2 + (info.n % 48)) : info.n;
            
            // If the time label interaction was used, info.n is already adjusted
            // but for safety we recalculate sel.end15 whenever mouse moves
            if (sel.end15 !== currentN) {
                sel.end15 = currentN;
                clearSelection(false); 
                applySelection();
            }
        };

        if (typeof this.lastScrollTop === 'number') {
            scroller.scrollTop = this.lastScrollTop;
        }
        const quarter = gridContainer.createDiv({ cls: 'dayble-quarter-lines' });
        const cells = Array.from(gridContainer.querySelectorAll('.dayble-focus-cell')) as HTMLElement[];
        if (cells.length > 0) {
            const gRect = gridContainer.getBoundingClientRect();
            const rowHeight = cells[0].offsetHeight || 60;
            const pxPer15 = rowHeight / 2;
            
            // Draw lines for columns
            const grids = split ? [morningGrid, afternoonGrid] : [morningGrid];
            grids.forEach(grid => {
                const gridRect = grid.getBoundingClientRect();
                const colIntervals = split ? (cells.length / 2) * 2 : cells.length * 2;
                for (let i = 1; i < colIntervals; i++) {
                    const line = quarter.createDiv({ cls: 'dayble-quarter-line' });
                    line.setCssProps({
                        'left': `${gridRect.left - gRect.left}px`,
                        'width': `${gridRect.width}px`
                    });
                    line.style.setProperty('--quarter-line-top', `${Math.round((gridRect.top - gRect.top) + i * pxPer15)}px`);
                }
            });
        }
        const footer = c.createDiv({ cls: 'dayble-modal-footer' });
        const addBtn = footer.createEl('button', { cls: 'dayble-today-add-btn', text: '+ add event' });
        addBtn.addClass('db-btn');
        addBtn.addClass('dayble-add-btn-full');
        addBtn.onclick = async () => { await this.view?.openEventModal(undefined, this.date); };
        this.contentEl.addEventListener('click', (ev) => {
            const a = (ev.target as HTMLElement).closest('a');
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (leaf as WorkspaceLeaf).openFile(file);
                }
            }
        }, { capture: true });

        // Handle drop on scroller to reposition event by min15 increments, with magnetic indicator
        scroller.ondragover = (e) => {
            e.preventDefault();
            const id = this.dragId;
            if (!id) return;
            const durationMin = this.dragDuration || 30;
            
            const info = getSlotInfo(e.clientX, e.clientY - (this.dragOffsetY || 0));
            if (!info || !info.targetCell) return;
            
            const gRect = gridContainer.getBoundingClientRect();
            const targetCellRect = info.targetCell.getBoundingClientRect();
            
            // Calculate relative to gridContainer, accounting for scroll
            const left = targetCellRect.left - gRect.left;
            const topLocal = (targetCellRect.top - gRect.top) + (info.isSecondHalf ? info.pxPer15 : 0);
            
            const width = info.targetCell.offsetWidth;
            const heightLocal = Math.max(4, Math.round((durationMin / 15) * info.pxPer15));
            
            // Visual follow for the dragged element
            if (this.dragEl) {
                // Mouse Y relative to gridContainer top
                const mouseY = (e.clientY - gRect.top) - (this.dragOffsetY || 0);
                
                this.dragEl.style.setProperty('--focus-item-top', `${Math.round(mouseY)}px`);
                this.dragEl.style.setProperty('--focus-item-left', `${Math.round(left)}px`);
                this.dragEl.style.setProperty('--focus-item-width', `${Math.round(width)}px`);
                this.dragEl.style.setProperty('--focus-item-height', `${Math.round(heightLocal)}px`);
            }

            if (!dropIndicator) {
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'dayble-focus-drop';
                overlay.appendChild(dropIndicator);
            }
            dropIndicator.style.setProperty('--focus-item-left', `${Math.round(left)}px`);
            dropIndicator.style.setProperty('--focus-item-top', `${Math.round(topLocal)}px`);
            dropIndicator.style.setProperty('--focus-item-width', `${Math.round(width)}px`);
            dropIndicator.style.setProperty('--focus-item-height', `${Math.round(heightLocal)}px`);
            
            gridContainer.querySelectorAll('.dayble-focus-cell').forEach(el => el.removeClass('drop-target'));
            info.targetCell.addClass('drop-target');
        };
        scroller.ondragleave = () => {
            if (dropIndicator) { dropIndicator.remove(); dropIndicator = null; }
            clearTargets();
        };
        scroller.ondrop = async (e) => {
            e.preventDefault();
            const id = this.dragId;
            const el = this.dragEl;
            if (!id) return;
            const durationMin = this.dragDuration || 30;
            
            const info = getSlotInfo(e.clientX, e.clientY - (this.dragOffsetY || 0));
            if (!info) return;

            // ANIMATION START: Settle the element to its new slot
            if (el) {
                    const gRect = gridContainer.getBoundingClientRect();
                    const targetCellRect = info.targetCell.getBoundingClientRect();
                    const left = targetCellRect.left - gRect.left;
                    const topLocal = (targetCellRect.top - gRect.top) + (info.isSecondHalf ? info.pxPer15 : 0);
                    
                    el.removeClass('dragging');
                    el.addClass('settling');
                    el.style.setProperty('--focus-item-left', `${Math.round(left)}px`);
                    el.style.setProperty('--focus-item-top', `${Math.round(topLocal)}px`);
                    el.style.setProperty('--focus-item-width', `${Math.round(info.targetCell.offsetWidth)}px`);
                }

            const baseMin = info.isAfternoon ? 12 * 60 : 0;
            const startTotalMin = baseMin + (info.n * 15);
            
            const newH = Math.floor(startTotalMin / 60);
            const newM = startTotalMin % 60;
            const endTotalMin = startTotalMin + durationMin;
            let endH = Math.floor(endTotalMin / 60);
            let endM = endTotalMin % 60;
            const pad2 = (n: number) => String(n).padStart(2, '0');
            const startStr = `${pad2(newH)}:${pad2(newM)}`;
            let endStr = `${pad2(endH)}:${pad2(endM)}`;
            let endDate = this.date;
            if (endTotalMin >= 24 * 60) {
                endH = 0; endM = 0; endStr = '00:00';
                endDate = nextDateStr(this.date);
            }
            try {
                const currentScroller = this.contentEl.querySelector('.dayble-focus-scroll') as HTMLElement | null;
                this.lastScrollTop = currentScroller ? currentScroller.scrollTop : 0;
                const evIdx = (this.view?.events || []).findIndex(ev => ev.id === id);
                if (evIdx !== -1 && this.view) {
                    const originalEv = this.view.events[evIdx];
                    
                    const updatedEv = JSON.parse(JSON.stringify(originalEv));
                    updatedEv.date = this.date;
                    updatedEv.startDate = this.date;
                    updatedEv.endDate = endDate;
                    updatedEv.time = `${startStr}-${endStr}`;
                    
                    this.view.events[evIdx] = updatedEv;
                    
                    // WAIT for animation before re-rendering everything
                    await new Promise(r => setTimeout(r, 250));
                    
                    await this.view.saveAllEntries();
                    await this.view.render();
                    this.onOpen();
                }
            } catch (err) { console.debug('[Dayble] Today drop update:', err); }
            if (dropIndicator) { dropIndicator.remove(); dropIndicator = null; }
            this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
            clearTargets();
        };

        this.renderEvents();
    }

    renderEvents() {
        const gridContainer = this.gridContainer;
        const overlay = this.overlay;
        if (!gridContainer || !overlay) return;
        overlay.empty();

        // Render existing events for this date spanning above the grid
        try {
            const toIdx = (hh: number, mm: number) => (hh * 2) + (mm >= 30 ? 1 : 0);
            const parseHM = (s: string) => {
                const [h, m] = s.split(':').map(n => parseInt(n || '0', 10));
                return (h * 60) + m;
            };

            const dayEvents = (this.events || []).filter(e => {
                const isToday = (e.date === this.date) || (e.startDate === this.date) || 
                                (e.startDate && e.endDate && this.date >= e.startDate && this.date <= e.endDate);
                if (!isToday) return false;
                
                // If it's an all-day/multi-day event, we skip it here because it's in the all-day section
                const isMultiDay = e.startDate && e.endDate && e.startDate !== e.endDate;
                const isAllDay = !e.time || isMultiDay;
                return !isAllDay;
            });
            
            // Overlap detection and column calculation
            const processedEvents = dayEvents.map(ev => {
                const range = String(ev.time || '');
                const parts = range.split('-');
                const startStr = parts[0] || '';
                const endStr = parts[1] || '';
                if (!startStr) return null;
                const startTotal = parseHM(startStr);
                let endTotal = startTotal + 30;
                if (endStr) endTotal = parseHM(endStr);
                return { ev, startTotal, endTotal, column: 0, totalColumns: 1 };
            }).filter(item => item !== null) as { ev: DaybleEvent, startTotal: number, endTotal: number, column: number, totalColumns: number }[];

            // Simple greedy column assignment
            processedEvents.sort((a, b) => a.startTotal - b.startTotal || (b.endTotal - b.startTotal) - (a.endTotal - a.startTotal));
            
            const columns: { endTotal: number }[][] = [];
            processedEvents.forEach(item => {
                let colIdx = columns.findIndex(col => col.every(placed => placed.endTotal <= item.startTotal));
                if (colIdx === -1) {
                    colIdx = columns.length;
                    columns.push([]);
                }
                item.column = colIdx;
                columns[colIdx].push(item);
            });

            // Calculate total columns for each overlapping group
            processedEvents.forEach(item => {
                const overlaps = processedEvents.filter(other => 
                    (item.startTotal < other.endTotal && item.endTotal > other.startTotal)
                );
                const maxCol = Math.max(...overlaps.map(o => o.column));
                overlaps.forEach(o => o.totalColumns = Math.max(o.totalColumns, maxCol + 1));
            });

            processedEvents.forEach(data => {
                const { ev, startTotal, endTotal, column, totalColumns } = data;
                
                const split = this.view?.plugin?.settings?.todayModalSplitView ?? true;
                const boundary = 12 * 60; // 12:00 PM
                
                const renderSegment = (sMin: number, eMin: number, segmentType: 'full' | 'start' | 'end') => {
                    const sh = Math.floor(sMin / 60);
                    const sm = sMin % 60;
                    let startIdx = toIdx(sh, sm);
                    const startCell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${startIdx}"]`) as HTMLElement;
                    if (!startCell) return;
                    const sRect = startCell.getBoundingClientRect();
                    const gRect = gridContainer.getBoundingClientRect();
                    
                    const rowHeight = startCell.offsetHeight || 60; // Use actual measured height
                    const pxPer15 = rowHeight / 2;
                    const withinMin = (sm % 30);
                    
                    const top = (sRect.top - gRect.top) + (withinMin / 15) * pxPer15;
                    const durationMin = eMin - sMin;
                    const height = Math.max(4, Math.round((durationMin / 15) * pxPer15));

                    // Calculate width and left based on columns within the cell area
                    const fullWidth = startCell.offsetWidth;
                    const colWidth = fullWidth / totalColumns;
                    const left = (sRect.left - gRect.left) + (column * colWidth);
                    const width = colWidth;

                    const item = this.view?.createEventItem(ev, false, true) || document.createElement('div');
                    item.addClass('dayble-focus-event-abs');
                    
                    if (segmentType === 'start') item.addClass('dayble-focus-event-split-start');
                    if (segmentType === 'end') item.addClass('dayble-focus-event-split-end');

                    // Override background-color to use the variable set by createEventItem
                    item.setCssProps({
                        'background-color': 'var(--event-bg-color, var(--background-primary))',
                        'color': 'var(--event-text-color, var(--text-normal))',
                        'border-color': 'var(--event-border-color, var(--background-modifier-border))',
                        'pointer-events': 'auto'
                    });
                    // For events <= 30 mins, in day mode we don't want the compact class to limit height
                    if (durationMin <= 30) {
                        item.removeClass('dayble-event-compact');
                    } else {
                        item.removeClass('dayble-event-compact');
                        item.addClass('dayble-layout-center-flex');
                    }

                    // Special case: 30 min events should show description if they aren't forced to be compact
                    // Actually, the user wants descriptions for 30 min intervals too.
                    // Let's allow 30 min events to have descriptions by NOT making them compact if they have one.
                    if (durationMin === 30 && ev.description) {
                        item.removeClass('dayble-event-compact');
                        item.addClass('dayble-layout-center-flex');
                    }

                    // Add rich tooltip
                    if (this.view && this.view.plugin.settings.tooltipEnabled) {
                        setTooltip(item, this.view.getEventTooltipText(ev));
                    }

                    item.style.setProperty('--focus-item-left', `${Math.round(left)}px`);
                    item.style.setProperty('--focus-item-top', `${Math.round(top)}px`);
                    item.style.setProperty('--focus-item-width', `${Math.round(width)}px`);
                    item.style.setProperty('--focus-item-height', `${Math.round(height)}px`);
                    item.onclick = async (e) => { e.stopPropagation(); await this.view?.openEventModal(ev.id, ev.date || ev.startDate, ev.endDate); };
                    // Drag to reposition within today modal (min15 granularity)
                    item.ondragstart = (e) => {
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        this.dragId = ev.id;
                        this.dragEl = item;
                        
                        // Capture EXACT distance from mouse to top of event
                        const itemRect = item.getBoundingClientRect();
                        this.dragOffsetY = e.clientY - itemRect.top;

                        item.addClass('dragging');
                        try {
                            const img = new Image();
                            img.width = 1; img.height = 1;
                            dt.setDragImage(img, 0, 0);
                        } catch {}
                        let duration = (endTotal - startTotal); // Original full duration
                        this.dragDuration = duration;
                    };
                    item.ondragend = () => { 
                        const currentIndicator = this.contentEl.querySelector('.dayble-focus-drop');
                        if (currentIndicator) currentIndicator.remove();
                        this.gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
                        item.removeClass('dragging'); 
                        this.dragId = undefined; 
                        this.dragDuration = undefined; 
                        this.dragEl = undefined; 
                    };
                    overlay.appendChild(item);
                };

                if (split && startTotal < boundary && endTotal > boundary) {
                    renderSegment(startTotal, boundary, 'start');
                    renderSegment(boundary, endTotal, 'end');
                } else {
                    renderSegment(startTotal, endTotal, 'full');
                }
            });
        } catch (e) { console.debug('[Dayble] Focus grid event render:', e); }
    }
}

class StorageFolderNotSetModal extends Modal {
    constructor(app: App) {
        super(app);
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // contentEl.style.padding = '20px';
        contentEl.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        });

        const title = contentEl.createEl('h2', { text: 'Storage folder not set', cls: 'dayble-modal-title' });
        title.setCssStyles({ margin: '0' });
        
        contentEl.createEl('p', { 
            text: 'You need to set a storage folder to create and save events.',
        }).setCssStyles({ margin: '0' });

        const btns = contentEl.createDiv({ cls: 'dayble-modal-footer' });
        btns.setCssStyles({
            marginTop: '8px',
            justifyContent: 'flex-end'
        }); 
        
        const closeBtn = btns.createEl('button', { cls: 'dayble-btn' });
        closeBtn.setText('Close');
        closeBtn.onclick = () => this.close();

        const openSettingsBtn = btns.createEl('button', { cls: 'dayble-btn mod-cta' });
        openSettingsBtn.setText('Open settings');
        openSettingsBtn.onclick = () => {
            try { 
                const s = (this.app as App & { setting: { open: () => void; openTabById: (id: string) => void } }).setting;
                s?.open?.();
                s?.openTabById?.('dayble-calendar');
            } catch (e) { console.debug('[Dayble] Open settings:', e); }
            this.close();
        };
    }
}

class ConfirmModal extends Modal {
    message: string;
    onConfirm: () => void | Promise<void>;
    constructor(app: App, message: string, onConfirm: () => void | Promise<void>) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.addClass('dayble-confirm-content');
        
        const msg = c.createEl('div', { cls: 'dayble-confirm-message' });
        msg.textContent = this.message;
        
        const row = c.createDiv('dayble-modal-row-end');
        
        const cancel = row.createEl('button', { cls: 'dayble-btn' });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();
        
        const ok = row.createEl('button', { cls: 'dayble-btn mod-cta' });
        ok.textContent = 'Confirm';
        ok.onclick = async () => { try { await this.onConfirm(); } finally { this.close(); } };
    }
}

function getIconIdsSafe(): string[] {
    try {
        const ids = getIconIds();
        if (ids && ids.length > 0) return ids;
    } catch (e) {
        console.error('[Dayble] Failed to get icon IDs:', e);
    }
    return ['calendar','clock','star','bookmark','flag','bell','check','pencil','book','zap'];
}

function chooseTextColor(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'var(--text-normal)';
    const yiq = ((rgb.r*299)+(rgb.g*587)+(rgb.b*114))/1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
}

function hexToRgb(hex: string): {r:number,g:number,b:number}|null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}

function hexToRgba(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// removed: formatTimeValue

// removed: formatTimeRange

function renderMarkdown(text: string, element: HTMLElement, app?: App): void {
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

function resolveImagePath(imagePath: string, app: App): string {
    const raw = String(imagePath || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof TFile) return app.vault.getResourcePath(byPath);
    const files = app.vault.getFiles();
    const extTarget = target.endsWith('.md') ? target.slice(0, -3) : target;
    const found = files.find((f: TFile) => f.path.endsWith(target))
        || files.find((f: TFile) => f.name === target)
        || files.find((f: TFile) => f.basename === extTarget)
        || files.find((f: TFile) => f.path.endsWith(`${extTarget}.md`));
    if (found) return app.vault.getResourcePath(found);
    return target;
}

function resolveNoteFile(app: App, linktext: string): TFile | null {
    const raw = String(linktext || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const withoutMd = target.endsWith('.md') ? target.slice(0, -3) : target;
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof TFile) return byPath;
    const files = app.vault.getFiles();
    const found = files.find((f: TFile) => f.path.endsWith(target))
        || files.find((f: TFile) => f.name === target)
        || files.find((f: TFile) => f.basename === withoutMd)
        || files.find((f: TFile) => f.path.endsWith(`${withoutMd}.md`));
    return found || null;
}

class FolderSuggestModal extends FuzzySuggestModal<string> {
    folders: string[];
    onChoose: (folder: string) => void | Promise<void>;

    constructor(app: App, folders: string[], onChoose: (folder: string) => void | Promise<void>) {
        super(app);
        this.folders = folders;
        this.onChoose = onChoose;
    }

    getItems(): string[] {
        return this.folders;
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        void Promise.resolve(this.onChoose(item));
    }
}

class DaybleSettingTab extends PluginSettingTab {
    plugin: DaybleCalendarPlugin;
    constructor(app: App, plugin: DaybleCalendarPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void {
        const scrollPos = this.containerEl.scrollTop;
        const { containerEl } = this;
        containerEl.empty();
        
        
        ;
        new Setting(containerEl).setName('General').setHeading();
        ;

        new Setting(containerEl)
            .setName('Latest release notes')
            .setDesc('View the most recent plugin release notes.')
            .addButton(b => {
                b.setButtonText('Open changelog')
                    .onClick(() => {
                        new ChangelogModal(this.app, this.plugin).open();
                    });
            });

        new Setting(containerEl)
            .setName('Storage folder')
            .setDesc('Folder to store calendar events. Data is stored in monthly JSON files.')
            .addButton(b => {
                b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'Unset')
                    .onClick(() => {
                        const folders = this.app.vault.getAllLoadedFiles()
                            .filter((f): f is TFolder => f instanceof TFolder)
                            .map(f => f.path)
                            .sort();
                        const suggest = new FolderSuggestModal(this.app, folders, async (folder) => {
                            this.plugin.settings.entriesFolder = folder || '';
                            await this.plugin.saveSettings();
                            await this.plugin.ensureEntriesFolder();
                            b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'Unset');
                            const view = this.plugin.getCalendarView();
                            if (view) {
                                await view.loadAllEntries();
                                await view.render();
                            }
                        });
                        suggest.setPlaceholder('Select storage folder...');
                        suggest.open();
                    });
            });

        new Setting(containerEl)
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
                    .onChange(async v => {
                        this.plugin.settings.weekStartDay = parseInt(v, 10);
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Time format')
            .setDesc('Display times in 24h or 12h format')
            .addDropdown(d => {
                d.addOption('24h', '24-hour')
                    .addOption('12h', '12-hour')
                    .setValue(this.plugin.settings.timeFormat ?? '24h')
                    .onChange(v => {
                        this.plugin.settings.timeFormat = v as "24h" | "12h" | undefined;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        const dateFormatHeading = new Setting(containerEl).setName('Date formats').setHeading();
        dateFormatHeading.descEl.createSpan({ text: 'Customize how dates appear in different views. ' });
        dateFormatHeading.descEl.createEl('a', {
            text: 'Check here for more syntax',
            href: 'https://momentjs.com/docs/#/displaying/format/'
        });
        
        // Build dynamic examples using the user’s local time
        const now = moment();
        const startOfWeek = now.clone().startOf('week');
        const endOfWeek   = now.clone().endOf('week');

        new Setting(containerEl)
            .setName('Week title')
            .setDesc('Format for the week view title')
            .addDropdown(d => {
                d.addOption('month_year', now.format('MMMM YYYY'))
                    .addOption('week_number', `Week ${now.week()}`)
                    .addOption('full_range', `${startOfWeek.format('MMMM D')} to ${endOfWeek.format('MMMM D')}`)
                    .addOption('short_range', `${startOfWeek.format('MMM D')} to ${endOfWeek.format('MMM D')}`)
                    .addOption('full_range_hyphen', `${startOfWeek.format('MMMM D')} - ${endOfWeek.format('MMMM D')}`)
                    .addOption('short_range_hyphen', `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}`)
                    .addOption('d_mmmm_range', `${startOfWeek.format('D MMMM')} - ${endOfWeek.format('D MMMM')}`)
                    .addOption('d_mmm_range', `${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM')}`)
                    .setValue(this.plugin.settings.weekTitleFormat || 'month_year')
                    .onChange(async v => {
                        this.plugin.settings.weekTitleFormat = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.weekTitleFormat = 'month_year';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const dayTitleSetting = new Setting(containerEl)
            .setName('Day title');
        
        const updateDayTitleDesc = (val: string) => {
            dayTitleSetting.descEl.empty();
            dayTitleSetting.descEl.createSpan({ text: 'Your current format for Day View: ' });
            const span = dayTitleSetting.descEl.createSpan({ text: moment().format(val || 'dddd, D MMMM') });
            span.setCssStyles({
                fontWeight: 'bold',
                color: 'var(--color-accent)'
            });
        };
        updateDayTitleDesc(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM');

        dayTitleSetting.addText(t => {
                t.setValue(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM')
                    .setPlaceholder('Dddd, d mmmm')
                    .onChange(async v => {
                        this.plugin.settings.dayTitleFormat = v;
                        await this.plugin.saveSettings();
                        updateDayTitleDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.dayTitleFormat = 'dddd, D MMMM';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const agendaTitleSetting = new Setting(containerEl)
            .setName('Agenda title');
        
        const updateAgendaTitleDesc = (val: string) => {
            agendaTitleSetting.descEl.empty();
            agendaTitleSetting.descEl.createSpan({ text: 'Your current format for Agenda View: ' });
            const span = agendaTitleSetting.descEl.createSpan({ text: moment().format(val || 'MMMM YYYY') });
            span.setCssStyles({
                fontWeight: 'bold',
                color: 'var(--color-accent)'
            });
        };
        updateAgendaTitleDesc(this.plugin.settings.agendaTitleFormat || 'MMMM YYYY');

        agendaTitleSetting.addText(t => {
                t.setValue(this.plugin.settings.agendaTitleFormat || 'MMMM YYYY')
                    .setPlaceholder('Mmmm yyyy')
                    .onChange(async v => {
                        this.plugin.settings.agendaTitleFormat = v;
                        await this.plugin.saveSettings();
                        updateAgendaTitleDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.agendaTitleFormat = 'MMMM YYYY';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const agendaDateSetting = new Setting(containerEl)
            .setName('Agenda dates');
        
        const updateAgendaDateDesc = (val: string) => {
            agendaDateSetting.descEl.empty();
            agendaDateSetting.descEl.createSpan({ text: 'Your current format for Agenda Date: ' });
            const span = agendaDateSetting.descEl.createSpan({ text: moment().format(val || 'dddd, D MMMM') });
            span.setCssStyles({
                fontWeight: 'bold',
                color: 'var(--color-accent)'
            });
        };
        updateAgendaDateDesc(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM');

        agendaDateSetting.addText(t => {
                t.setValue(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM')
                    .setPlaceholder('Dddd, d mmmm')
                    .onChange(async v => {
                        this.plugin.settings.agendaDateFormat = v;
                        await this.plugin.saveSettings();
                        updateAgendaDateDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.agendaDateFormat = 'dddd, D MMMM';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl).setName('Context menu').setHeading();

        new Setting(containerEl)
            .setName('Show copy text option')
            .setDesc('Show copy text in the event context menu to copy title and description')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showCopyTextOption ?? false)
                    .onChange(async v => {
                        this.plugin.settings.showCopyTextOption = v;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in month view')
            .setDesc('Shows only pinned events in month view. All events still appear in day & agenda views')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsMonth ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsMonth = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in week view')
            .setDesc('Shows only pinned events in week view. All events still appear in day & agenda views')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsWeek ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsWeek = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in agenda view')
            .setDesc('Shows only pinned events in agenda view. All events still appear in day view')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsAgenda ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsAgenda = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });


        

        new Setting(containerEl).setName('Event appearance').setHeading();

        const previewContainer = containerEl.createDiv({ cls: 'dayble-event-preview-container' });
        previewContainer.setCssStyles({
            margin: '10px 0',
            padding: '10px',
            borderRadius: 'var(--setting-items-radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--background-primary-alt)'
        });

        const eventBox = previewContainer.createDiv({ cls: 'dayble-event-item' });
        eventBox.setCssStyles({
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });

        const eventIcon = eventBox.createDiv({ cls: 'dayble-event-icon' });
        setIcon(eventIcon, 'clock');

        const eventTextContainer = eventBox.createDiv({ cls: 'dayble-event-text-container' });
        eventTextContainer.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1'
        });

        const eventTitle = eventTextContainer.createDiv({ text: 'Customize me :D', cls: 'dayble-event-title' });
        eventTitle.setCssStyles({
            fontSize: '0.85em',
            fontWeight: '600'
        });

        const eventDesc = eventTextContainer.createDiv({ text: 'I\'m the event description!', cls: 'dayble-event-desc' });
        eventDesc.setCssStyles({
            fontSize: '0.75em',
            opacity: '0.8'
        });

        const updateEventPreview = () => {
            const settings = this.plugin.settings;
            const defaultColorName = settings.defaultEventColorName;
            const swatches = [
                ...(settings.swatches || []),
                ...(settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];
            
            const selectedSwatch = swatches.find(s => s.name === defaultColorName);
            
            const opacity = settings.eventBgOpacity ?? 1;
            const borderOpacity = settings.eventBorderOpacity ?? 1;
            const borderWidth = settings.eventBorderWidth ?? 2;
            const borderRadius = settings.eventBorderRadius ?? 6;
            const titleAlign = settings.eventTitleAlign ?? 'center';
            const descAlign = settings.eventDescAlign ?? 'center';

            let finalDescAlign = descAlign;
            if (titleAlign === 'center-left' && descAlign === 'center-left') {
                finalDescAlign = titleAlign;
            }

            if (selectedSwatch) {
                const baseColor = selectedSwatch.color;
                const textColor = selectedSwatch.textColor || '#ffffff';

                if (baseColor.startsWith('var')) {
                    eventBox.style.backgroundColor = `rgba(from ${baseColor} r g b / ${opacity})`;
                    // Use textColor for border if it's a variable, otherwise fallback
                    if (textColor.startsWith('var')) {
                        eventBox.style.border = `${borderWidth}px solid rgba(from ${textColor} r g b / ${borderOpacity})`;
                    } else {
                        eventBox.style.border = `${borderWidth}px solid ${textColor}`;
                        eventBox.style.borderColor = textColor; // Ensure explicit color
                        // Apply opacity to border if it's a hex/color
                        if (textColor.startsWith('#')) {
                            const r = parseInt(textColor.slice(1, 3), 16);
                            const g = parseInt(textColor.slice(3, 5), 16);
                            const b = parseInt(textColor.slice(5, 7), 16);
                            eventBox.style.borderColor = `rgba(${r}, ${g}, ${b}, ${borderOpacity})`;
                        }
                    }
                } else {
                    eventBox.style.backgroundColor = baseColor;
                    eventBox.setCssStyles({ opacity: String(opacity) });
                    // Use textColor for border
                    if (textColor.startsWith('#')) {
                        const r = parseInt(textColor.slice(1, 3), 16);
                        const g = parseInt(textColor.slice(3, 5), 16);
                        const b = parseInt(textColor.slice(5, 7), 16);
                        eventBox.setCssStyles({ border: `${borderWidth}px solid rgba(${r}, ${g}, ${b}, ${borderOpacity})` });
                    } else {
                        eventBox.setCssStyles({ border: `${borderWidth}px solid ${textColor}` });
                    }
                }
                eventBox.setCssStyles({ color: textColor });
            } else {
                // Default: use background-primary and normal text/border colors
                eventBox.setCssStyles({
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-normal)',
                    border: `${borderWidth}px solid var(--background-modifier-border)`,
                    opacity: '1'
                });
            }

            eventBox.setCssStyles({ borderRadius: `${borderRadius}px` });
            
            // Align title and desc
            eventTitle.setCssStyles({ textAlign: titleAlign === 'center-left' ? 'left' : titleAlign });
            eventDesc.setCssStyles({ textAlign: finalDescAlign === 'center-left' ? 'left' : finalDescAlign });
            
            // Handle overall flex alignment based on title alignment
            eventBox.setCssStyles({ justifyContent: titleAlign === 'center' ? 'center' : (titleAlign === 'right' ? 'flex-end' : 'flex-start') });
            
            // Icon placement
            const placement = settings.iconPlacement ?? 'left';
            eventIcon.setCssStyles({ display: placement === 'none' ? 'none' : 'block' });
            
            // Re-stack icon based on placement
            if (placement === 'right') {
                eventBox.setCssStyles({
                    flexDirection: 'row',
                    alignItems: 'center'
                });
                eventBox.appendChild(eventIcon);
            } else if (placement === 'left') {
                eventBox.setCssStyles({
                    flexDirection: 'row',
                    alignItems: 'center'
                });
                eventBox.prepend(eventIcon);
            } else if (placement.startsWith('top') || placement.startsWith('bottom')) {
                eventBox.setCssStyles({ flexDirection: 'column' });
                
                if (placement.startsWith('top')) {
                    eventBox.prepend(eventIcon);
                } else {
                    eventBox.appendChild(eventIcon);
                }
                
                // Horizontal alignment of the icon itself within the column
                if (placement.endsWith('-left')) {
                    eventBox.setCssStyles({ alignItems: 'flex-start' });
                } else if (placement.endsWith('-right')) {
                    eventBox.setCssStyles({ alignItems: 'flex-end' });
                } else {
                    eventBox.setCssStyles({ alignItems: 'center' });
                }

                // Text container alignment
                if (titleAlign === 'center' || titleAlign === 'center-left') {
                    eventTextContainer.setCssStyles({ alignItems: 'center' });
                } else if (titleAlign === 'right') {
                    eventTextContainer.setCssStyles({ alignItems: 'flex-end' });
                } else {
                    eventTextContainer.setCssStyles({ alignItems: 'flex-start' });
                }
            } else {
                eventBox.setCssStyles({
                    flexDirection: 'row',
                    alignItems: 'center'
                });
                eventBox.prepend(eventIcon);
            }

            if (!placement.startsWith('top')) {
                eventTextContainer.setCssStyles({ alignItems: 'stretch' });
            }
        };

        updateEventPreview();

        new Setting(containerEl)
            .setName('Default event color')
            .setDesc('Default color for events when no category or user color is set.')
            .addDropdown(d => {
                const swatches = [
                    ...(this.plugin.settings.swatches || []),
                    ...(this.plugin.settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
                ];
                d.addOption('', 'No default color');
                swatches.forEach(s => d.addOption(s.name, s.name));
                d.setValue(this.plugin.settings.defaultEventColorName || '');
                d.onChange(async v => {
                    this.plugin.settings.defaultEventColorName = v;
                    await this.plugin.saveSettings();
                    applyColorStyles();
                    updateEventPreview();
                    const view = this.plugin.getCalendarView();
                    await view?.render();
                });

                const applyColorStyles = () => {
                    const currentValue = d.getValue();
                    const selectedSwatch = swatches.find(sw => sw.name === currentValue);
                    
                    if (selectedSwatch) {
                        (d.selectEl).style.setProperty('background-color', selectedSwatch.color, 'important');
                        (d.selectEl).style.setProperty('color', selectedSwatch.textColor || chooseTextColor(selectedSwatch.color), 'important');
                    } else {
                        (d.selectEl).style.removeProperty('background-color');
                        (d.selectEl).style.removeProperty('color');
                    }
                    
                    Array.from(d.selectEl.options).forEach(opt => {
                        if (!opt.value) return;
                        const s = swatches.find(sw => sw.name === opt.value);
                        if (s) {
                            opt.style.setProperty('background-color', s.color);
                            opt.style.setProperty('color', s.textColor || chooseTextColor(s.color));
                        }
                    });
                };
                applyColorStyles();
                (d.selectEl).classList.add('db-select');
                (d.selectEl).addClass('dayble-default-color-select');
            });

        new Setting(containerEl)
            .setName('Event tooltips')
            .setDesc('Show detailed tooltips when hovering over events.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.tooltipEnabled ?? false)
                    .onChange(async v => {
                        this.plugin.settings.tooltipEnabled = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Icon placement')
            .setDesc('Position of event icon')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('right', 'Right')
                    .addOption('none', 'None')
                    .addOption('top', 'Top center')
                    .addOption('top-left', 'Top left')
                    .addOption('top-right', 'Top right')
                    .addOption('bottom', 'Bottom center')
                    .addOption('bottom-left', 'Bottom left')
                    .addOption('bottom-right', 'Bottom right')
                    .setValue(this.plugin.settings.iconPlacement ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.iconPlacement = v as any;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName('Event title alignment')
            .setDesc('Alignment of event titles')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .addOption('center-left', 'Center-left')
                    .setValue(this.plugin.settings.eventTitleAlign ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.eventTitleAlign = v as any;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });
        new Setting(containerEl)
            .setName('Event description alignment')
            .setDesc('Alignment of event descriptions')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .addOption('center-left', 'Center-left')
                    .setValue(this.plugin.settings.eventDescAlign ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.eventDescAlign = v as any;
                        void this.plugin.saveSettings().then(() => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            void view?.render();
                        });
                    });
            });
        
            new Setting(containerEl)
                .setName('Event background opacity')
                .setDesc('Controls transparency of event backgrounds.')
                .addSlider(s => {
                    s.setLimits(0, 1, 0.1)
                        .setValue(this.plugin.settings.eventBgOpacity ?? 1)
                        .onChange(v => {
                            this.plugin.settings.eventBgOpacity = v;
                            void this.plugin.saveSettings().then(async () => {
                                updateEventPreview();
                                const view = this.plugin.getCalendarView();
                                await view?.render();
                            });
                        })
                        .setDynamicTooltip();
                });
        new Setting(containerEl)
            .setName('Event border thickness')
            .setDesc('Controls event border thickness (0-5px)')
            .addSlider(s => {
                s.setLimits(0, 5, 0.5)
                    .setValue(this.plugin.settings.eventBorderWidth ?? 2)
                    .onChange(v => {
                        this.plugin.settings.eventBorderWidth = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border opacity')
            .setDesc('Controls border color opacity for colored events (0-1)')
            .addSlider(s => {
                s.setLimits(0, 1, 0.1)
                    .setValue(this.plugin.settings.eventBorderOpacity ?? 1)
                    .onChange(v => {
                        this.plugin.settings.eventBorderOpacity = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border radius')
            .setDesc('Controls event corner roundness (px)')
            .addSlider(s => {
                s.setLimits(0, 24, 1)
                    .setValue(this.plugin.settings.eventBorderRadius ?? 6)
                    .onChange(v => {
                        this.plugin.settings.eventBorderRadius = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Day cell radius')
            .setDesc('Controls day cell corner roundness (px)')
            .addSlider(s => {
                s.setLimits(0, 24, 1)
                    .setValue(this.plugin.settings.dayCellRadius ?? 8)
                    .onChange(v => {
                        this.plugin.settings.dayCellRadius = v;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Event vertical padding')
            .setDesc('Controls vertical space inside events (0-12px)')
            .addSlider(s => {
                s.setLimits(0, 12, 1)
                    .setValue(this.plugin.settings.eventVerticalPadding ?? 2)
                    .onChange(v => {
                        this.plugin.settings.eventVerticalPadding = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
            
            new Setting(containerEl)
                .setName('Completed event display')
                .setDesc('How completed events appear')
                .addDropdown(d => {
                    d.addOption('none', 'No change')
                        .addOption('dim', 'Dim')
                        .addOption('strikethrough', 'Strikethrough')
                        .addOption('hide', 'Hide')
                        .addOption('color', 'Change color')
                        .setValue(this.plugin.settings.completeBehavior ?? 'none')
                        .onChange(v => {
                            this.plugin.settings.completeBehavior = v as "none" | "hide" | "dim" | "strikethrough" | "color" | undefined;
                            this.display(); // Refresh to show/hide color dropdown
                            void this.plugin.saveSettings().then(async () => {
                                const view = this.plugin.getCalendarView();
                                await view?.render();
                            });
                        });
                });

            if (this.plugin.settings.completeBehavior === 'color') {
                new Setting(containerEl)
                    .setName('Change color to')
                    .setDesc('Color for completed events')
                    .addDropdown(d => {
                        const swatches = [
                            ...(this.plugin.settings.swatches || []),
                            ...(this.plugin.settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
                        ];
                        d.addOption('', 'Default color');
                        swatches.forEach(s => d.addOption(s.name, s.name));
                        d.setValue(this.plugin.settings.completeColor || '');
                        d.onChange(async v => {
                            this.plugin.settings.completeColor = v;
                            await this.plugin.saveSettings();
                            applyColorStyles();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });

                        const applyColorStyles = () => {
                            const currentValue = d.getValue();
                            const selectedSwatch = swatches.find(sw => sw.name === currentValue);
                            
                            if (selectedSwatch) {
                                (d.selectEl).style.setProperty('background-color', selectedSwatch.color, 'important');
                                (d.selectEl).style.setProperty('color', selectedSwatch.textColor || chooseTextColor(selectedSwatch.color), 'important');
                            } else {
                                (d.selectEl).style.removeProperty('background-color');
                                (d.selectEl).style.removeProperty('color');
                            }
                            
                            Array.from(d.selectEl.options).forEach(opt => {
                                if (!opt.value) return;
                                const s = swatches.find(sw => sw.name === opt.value);
                                if (s) {
                                    opt.style.setProperty('background-color', s.color);
                                    opt.style.setProperty('color', s.textColor || chooseTextColor(s.color));
                                }
                            });
                        };
                        applyColorStyles();
                        (d.selectEl).classList.add('db-select');
                        (d.selectEl).addClass('dayble-complete-color-select');
                    });
            }

            new Setting(containerEl)
                .setName(`Only animate today's events`)
                .setDesc('Stop animation for all events except today')
                .addToggle(t => {
                    t.setValue(this.plugin.settings.onlyAnimateToday ?? false)
                        .onChange(v => {
                            this.plugin.settings.onlyAnimateToday = v;
                            void this.plugin.saveSettings().then(async () => {
                                const view = this.plugin.getCalendarView();
                                await view?.render();
                            });
                        });
                });

        new Setting(containerEl).setName('Interface').setHeading();

        new Setting(containerEl)
            .setName('Holder placement')
            .setDesc('Place the holder toggle (left, right, or hidden)')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                 .addOption('right', 'Right')
                 .addOption('hidden', 'Hidden')
                 .setValue(this.plugin.settings.holderPlacement ?? 'left')
                 .onChange(v => {
                    this.plugin.settings.holderPlacement = v as "left" | "right" | "hidden" | undefined;
                    void this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            view.containerEl.empty();
                            void view.onOpen();
                        }
                    });
                 });
            });

        new Setting(containerEl)
            .setName('Day split view')
            .setDesc('Split the day view into morning and afternoon columns on desktop.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.todayModalSplitView ?? true)
                    .onChange(async v => {
                        this.plugin.settings.todayModalSplitView = v;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Enable weekly notes')
            .setDesc('Show a notes section below the calendar in weekly view')
            .addToggle(t => {
                t.setValue(this.plugin.settings.weeklyNotesEnabled ?? true)
                    .onChange(v => {
                        this.plugin.settings.weeklyNotesEnabled = v;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });
            
        new Setting(containerEl)
            .setName('Max day cell height (px)')
            .setDesc('If set, day cells cap at this height and events scroll vertically')
            .addText(t => {
                t.setPlaceholder('0 (disabled)');
                t.setValue(String(this.plugin.settings.dayCellMaxHeight ?? 0));
                t.onChange(v => {
                    const num = parseInt(v || '0', 10);
                    this.plugin.settings.dayCellMaxHeight = isNaN(num) ? 0 : Math.max(0, num);
                    void this.plugin.saveSettings().then(async () => {
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
                });
                (t.inputEl).type = 'number';
                (t.inputEl).min = '0';
            });
            
        new Setting(containerEl)
            .setName('Day cell min width (px)')
            .setDesc('If set, day cells will not shrink below this width (useful for horizontal scrolling). 0 to disable.')
            .addText(t => {
                t.setPlaceholder('0 (disabled)');
                t.setValue(String(this.plugin.settings.dayCellMinWidth ?? 0));
                t.onChange(v => {
                    const num = parseInt(v || '0', 10);
                    this.plugin.settings.dayCellMinWidth = isNaN(num) ? 0 : Math.max(0, num);
                    void this.plugin.saveSettings().then(async () => {
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
                });
                (t.inputEl).type = 'number';
                (t.inputEl).min = '0';
            });
            
            new Setting(containerEl)
                .setName('Color swatch position')
                .setDesc('Position of color swatches in event modal')
                .addDropdown(d => {
                    d.addOption('under-title', 'Under title')
                        .addOption('under-description', 'Under description')
                        .addOption('none', 'Do not show')
                        .setValue(this.plugin.settings.colorSwatchPosition ?? 'under-title')
                        .onChange(v => {
                            this.plugin.settings.colorSwatchPosition = v as "none" | "under-title" | "under-description" | undefined;
                            void this.plugin.saveSettings();
                        });
                });

        
        const swatchesSectionTop = containerEl.createDiv();
        const colorsHeading = new Setting(swatchesSectionTop).setName('Colors').setHeading();
        (colorsHeading.settingEl).setCssProps({ 'margin-top': '18px' });
        const colorsListTop = swatchesSectionTop.createDiv();
        const renderColorsTop = () => {
            colorsListTop.empty();
            const row = colorsListTop.createDiv();
            row.addClass('dayble-settings-colors-row');
            row.setAttr('style', 'margin-top: -10px !important; margin-bottom: 0px; display: flex; flex-wrap: wrap;');

            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' as const }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' as const }));
            const combined: { name: string, color: string, textColor: string, source: 'built'|'custom' }[] = [...built, ...customs];
            const makeItem = (entry: { name: string, color: string, textColor: string, source: 'built'|'custom' }, idx: number) => {
                const wrap = row.createDiv();
                wrap.addClass('dayble-color-group');
                wrap.setAttr('data-qc-index', String(idx));
                wrap.setAttr('style', 'display: inline-flex; align-items: center; gap: 8px; margin: 4px !important; border: 1px solid var(--background-modifier-border); border-radius: var(--setting-items-radius); background-color: var(--setting-items-background); padding: 6px; flex: 0 0 auto; transition: transform 0.2s ease, box-shadow 0.2s ease;');
                
                wrap.setAttr('draggable', 'false');
                wrap.dataset.source = entry.source;
                wrap.dataset.index = String(idx);
                wrap.dataset.name = entry.name;

                // Drag Handle
                const dragBtn = wrap.createEl('button', {
                    attr: {
                        'aria-label': 'Drag to reorder',
                        'style': 'padding: 0px; border: none; background: transparent; box-shadow: none; cursor: grab; color: var(--text-muted); flex-shrink: 0; display: flex; align-items: center; justify-content: center;'
                    }
                });
                setIcon(dragBtn, 'menu');

                // Text Color Picker
                const textPicker = wrap.createEl('input', { 
                    type: 'color',
                    attr: {
                        'title': 'Text color',
                        'style': 'width: 30px; height: 30px; border-radius: 50%; border: none; padding: 0px; overflow: hidden; background: transparent; cursor: pointer;'
                    }
                });
                textPicker.value = entry.textColor || '#ffffff';

                // Background Color Picker
                const bgPicker = wrap.createEl('input', { 
                    type: 'color',
                    attr: {
                        'title': 'Highlight color',
                        'style': 'width: 30px; height: 30px; border-radius: 50%; border: none; padding: 0px; overflow: hidden; background: transparent; cursor: pointer;'
                    }
                });
                bgPicker.value = entry.color;

                // Name input
                const nameInput = wrap.createEl('input', {
                    type: 'text',
                    cls: 'db-input',
                    attr: {
                        'placeholder': 'Name',
                        'style': 'width: 80px; height: 30px; margin-left: 4px;'
                    }
                });
                nameInput.value = entry.name;
                nameInput.onchange = () => updateAll();

                const updateAll = async () => {
                    const newBuilt: { name: string, color: string, textColor?: string }[] = [];
                    const newCustom: { name: string, color: string, textColor?: string }[] = [];
                    row.querySelectorAll('.dayble-color-group').forEach((w) => {
                        const el = w as HTMLElement;
                        const src = el.dataset.source;
                        const bg = (el.querySelectorAll('input[type="color"]')[1] as HTMLInputElement).value;
                        const tx = (el.querySelectorAll('input[type="color"]')[0] as HTMLInputElement).value;
                        const nInput = el.querySelector('input[type="text"]') as HTMLInputElement;
                        const finalName = nInput?.value || '';
                        if (src === 'built') {
                            newBuilt.push({ name: finalName, color: bg, textColor: tx });
                        } else {
                            newCustom.push({ name: finalName, color: bg, textColor: tx });
                        }
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                    const dropdowns = containerEl.querySelectorAll('.dayble-trigger-color-select, .dayble-default-color-select, .dayble-complete-color-select');
                    dropdowns.forEach(t => {
                        const select = t as HTMLSelectElement;
                        const current = select.value;
                        const isDefaultColorSelect = select.classList.contains('dayble-default-color-select');
                        select.empty();
                        select.add(new Option(isDefaultColorSelect ? 'No default color' : 'Default color', ''));
                        [...newBuilt, ...newCustom].forEach((s) => {
                            const name = s.name;
                            const opt = new Option(name, name);
                            opt.setCssProps({
                                'background-color': s.color,
                                'color': s.textColor || chooseTextColor(s.color)
                            });
                            select.add(opt);
                        });
                        select.value = current;
                        
                        // Update select style
                        const selectedSwatch = [...newBuilt, ...newCustom].find((s) => s.name === select.value);
                        if (selectedSwatch) {
                            select.setCssProps({
                                'background-color': selectedSwatch.color,
                                'color': selectedSwatch.textColor || chooseTextColor(selectedSwatch.color)
                            });
                        } else {
                            select.setCssProps({
                                'background-color': '',
                                'color': ''
                            });
                        }
                    });
                };

                textPicker.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };
                bgPicker.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };
                nameInput.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };

                // Delete button
                const delWrap = wrap.createDiv({ 
                    cls: 'clickable-icon',
                    attr: { 'aria-label': 'Delete color swatch' }
                });
                setIcon(delWrap, 'x');
                delWrap.setCssProps({ 'flex-shrink': '0' });
                
                delWrap.onclick = async () => {
                    // const modal = new ConfirmModal(this.app, 'Delete this color swatch?', async () => {
                    wrap.remove();
                    await updateAll();
                    // });
                    // void modal.open();
                };

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(100);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;
                    clone.setCssProps({
                        'background-color': 'transparent',
                        'border': 'none',
                        'box-shadow': 'none'
                    });
                    
                    const originalInputs = wrap.querySelectorAll('input');
                    const clonedInputs = clone.querySelectorAll('input');
                    originalInputs.forEach((el, idx) => {
                        if (clonedInputs[idx]) clonedInputs[idx].value = el.value;
                    });
                    
                    ghost.appendChild(clone);
                    ghost.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'left': `${rect.left}px`,
                        'top': `${rect.top}px`,
                        'position': 'fixed',
                        'z-index': '9999',
                        'pointer-events': 'none',
                        'opacity': '0.8',
                        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.2)',
                        'background-color': 'transparent',
                        'border-radius': '4px'
                    });

                    wrap.classList.add('drag-ghost-hidden');
                    // Use CSS classes instead of dynamic style elements
                    ghost.addClass('dayble-drag-ghost');

                    const onMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const currentX = moveEvent.clientX;
                        const currentY = moveEvent.clientY;

                        ghost.setCssProps({
                            'left': `${currentX - offsetX}px`,
                            'top': `${currentY - offsetY}px`
                        });

                        const target = document.elementFromPoint(currentX, currentY);
                        const targetRow = target ? target.closest('.dayble-color-group') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === row) {
                            const rect = targetRow.getBoundingClientRect();
                            const next = (currentX - rect.left) > (rect.width * 0.2);
                            
                            if (next) {
                                if (targetRow.nextSibling !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow.nextSibling);
                                }
                            } else {
                                if (targetRow !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow);
                                }
                            }
                        }
                    };

                    const onEnd = async () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onEnd);
                        ghost.remove();
                        wrap.classList.remove('drag-ghost-hidden');
                        await updateAll();
                    };

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onEnd);
                });
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new Setting(colorsListTop);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.addClass('dayble-transparent-setting');
            controlsBottom.addButton(b => {
                b.setButtonText('Reset colors').onClick(() => {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', async () => {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        await this.plugin.saveSettings();
                        this.display();
                    });
                    void modal.open();
                });
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ add color').onClick(async () => {
                    (b.buttonEl).addClass('mod-cta');
                    if (!this.plugin.settings.userCustomSwatches) this.plugin.settings.userCustomSwatches = [];
                    const nextIndex = this.plugin.settings.userCustomSwatches.length + 1;
                    this.plugin.settings.userCustomSwatches.push({ 
                        name: `custom-${nextIndex}`, 
                        color: '#ff0000', 
                        textColor: '#ffffff' 
                    });
                    await this.plugin.saveSettings();
                    this.display();
                });
                (b.buttonEl).addClass('mod-cta');
            });
        };
        renderColorsTop();
        new Setting(containerEl).setName('Event categories').setDesc('Adds a category dropdown to apply predefined styling.').setHeading();
        const rulesWrap = containerEl.createDiv();
        const renderRules = () => {
            rulesWrap.empty();
            (this.plugin.settings.eventCategories || []).forEach((category: EventCategory, idx: number) => {
                const row = new Setting(rulesWrap);
                // Remove the left-side setting title element
                row.settingEl.querySelector('.setting-item-name')?.remove();
                row.settingEl.addClass('dayble-settings-category-row');
                row.controlEl.addClass('dayble-settings-category-control');
                row.settingEl.classList.add('db-category-row');
                
                // Drag Handle
                const dragBtn = row.controlEl.createEl('button', {
                    attr: {
                        'aria-label': 'Drag to reorder'
                    }
                });
                dragBtn.setCssProps({
                    'padding': '0px',
                    'border': 'none',
                    'background': 'transparent',
                    'box-shadow': 'none',
                    'cursor': 'grab',
                    'color': 'var(--text-muted)',
                    'flex-shrink': '0',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'margin-right': '8px'
                });
                setIcon(dragBtn, 'menu');

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const wrap = row.settingEl;
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(100);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;
                    
                    // Sync values for cloned inputs/selects
                    const originalInputs = wrap.querySelectorAll('input, select');
                    const clonedInputs = clone.querySelectorAll('input, select');
                    originalInputs.forEach((el, idx) => {
                        if (clonedInputs[idx]) {
                            (clonedInputs[idx] as HTMLInputElement | HTMLSelectElement).value = (el as HTMLInputElement | HTMLSelectElement).value;
                        }
                    });
                    
                    ghost.appendChild(clone);
                    ghost.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'left': `${rect.left}px`,
                        'top': `${rect.top}px`,
                        'position': 'fixed',
                        'z-index': '9999',
                        'pointer-events': 'none',
                        'opacity': '0.8',
                        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.2)',
                        'background-color': 'var(--background-primary)',
                        'border-radius': '4px'
                    });

                    wrap.classList.add('drag-ghost-hidden');
                    ghost.addClass('dayble-drag-ghost');

                    const onMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const currentX = moveEvent.clientX;
                        const currentY = moveEvent.clientY;

                        ghost.setCssProps({
                            'left': `${currentX - offsetX}px`,
                            'top': `${currentY - offsetY}px`
                        });

                        const target = document.elementFromPoint(currentX, currentY);
                        const targetRow = target ? target.closest('.dayble-settings-category-row') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === rulesWrap) {
                            const rect = targetRow.getBoundingClientRect();
                            const isAfter = (currentY - rect.top) > (rect.height / 2);
                            
                            if (isAfter) {
                                if (targetRow.nextSibling !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow.nextSibling);
                                }
                            } else {
                                if (targetRow !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow);
                                }
                            }
                        }
                    };

                    const onEnd = async () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onEnd);
                        ghost.remove();
                        wrap.classList.remove('drag-ghost-hidden');
                        
                        // Reorder settings based on DOM order
                        const newCategories: EventCategory[] = [];
                        rulesWrap.querySelectorAll('.dayble-settings-category-row').forEach((el) => {
                            const name = (el.querySelector('.db-category-name') as HTMLInputElement)?.value;
                            const cat = this.plugin.settings.eventCategories?.find(c => c.name === name); // This is a bit fragile if names are identical
                            if (cat) newCategories.push(cat);
                        });
                        
                        // Fallback/more robust way: store ID on the element
                        const updatedCategories: EventCategory[] = [];
                        rulesWrap.querySelectorAll('.dayble-settings-category-row').forEach((el) => {
                            const catId = (el as HTMLElement).dataset.id;
                            const cat = this.plugin.settings.eventCategories?.find(c => c.id === catId);
                            if (cat) updatedCategories.push(cat);
                        });

                        if (updatedCategories.length > 0) {
                            this.plugin.settings.eventCategories = updatedCategories;
                            await this.plugin.saveSettings();
                        }
                    };

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onEnd);
                });

                row.settingEl.dataset.id = category.id;

                // Icon button
                row.addExtraButton(btn => {
                    btn.setIcon(category.icon || 'plus').setTooltip('Change icon').onClick(() => {
                        const picker = new IconPickerModal(this.app, async (icon) => {
                            category.icon = icon;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                            renderRules();
                        }, async () => {
                            category.icon = undefined;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                            renderRules();
                        });
                        void picker.open();
                    });
                });
                // Category name input
                row.addText(t => { t.setValue(category.name).onChange(v => { category.name = v; }); (t.inputEl).classList.add('db-input','db-category-name'); });
                // Text color first
                row.addColorPicker(cp => { cp.setValue(category.textColor).onChange(async v => { 
                    category.textColor = v; 
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                }); (cp as unknown as { inputEl: HTMLElement }).inputEl?.classList?.add('db-color','db-text-color'); });
                // Background color next
                row.addColorPicker(cp => { cp.setValue(category.bgColor).onChange(async v => { 
                    category.bgColor = v; 
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                }); (cp as unknown as { inputEl: HTMLElement }).inputEl?.classList?.add('db-color','db-bg-color'); });
                row.addDropdown(d => { d.addOptions({
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
                }).setValue(category.effect).onChange(async v => { 
                    category.effect = v; 
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                }); (d.selectEl).classList.add('db-select','db-effect'); });
                row.addDropdown(d => { d.addOptions({
                    '': 'No animation',
                    'move-horizontally': 'Move horizontally',
                    'move-vertically': 'Move vertically',
                    'particles': 'Particles',
                    'snow-falling': 'Snow falling',
                    'animated-gradient': 'Animated gradient',
                    'glass-shine': 'Glass shine',
                    'glowing': 'Glowing'
                }).setValue(category.animation).onChange(async v => { 
                    category.animation = v; 
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                }); (d.selectEl).classList.add('db-select','db-animation'); });
                row.addDropdown(d => { d.addOptions({
                    '': 'No animation',
                    'move-horizontally': 'Move horizontally',
                    'move-vertically': 'Move vertically',
                    'particles': 'Particles',
                    'snow-falling': 'Snow falling',
                    'animated-gradient': 'Animated gradient',
                    'glass-shine': 'Glass shine',
                    'glowing': 'Glowing'
                }).setValue(category.animation2).onChange(async v => { 
                    category.animation2 = v; 
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                }); (d.selectEl).classList.add('db-select','db-animation2'); });
                row.addExtraButton(btn => {
                    btn.setIcon('copy').setTooltip('Duplicate entry').onClick(async () => {
                        const items2 = (this.plugin.settings.eventCategories || []).slice();
                        const copy = { ...category, id: randomId(), name: category.name + ' (copy)' };
                        items2.splice(items2.indexOf(category) + 1, 0, copy);
                        this.plugin.settings.eventCategories = items2;
                        await this.plugin.saveSettings();
                        renderRules();
                    });
                });
                row.addExtraButton(btn => { 
                    btn.setIcon('x').setTooltip('Delete').onClick(() => { 
                        this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).filter(c => c.id !== category.id); 
                        renderRules(); 
                    }); 
                    const extraBtn = (btn as unknown as { extraButtonEl: HTMLElement }).extraButtonEl;
                    if (extraBtn) {
                        extraBtn.classList.add('db-btn','db-delete-category');
                    }
                });
            });
        };
        const addCategorySetting = new Setting(containerEl);
        addCategorySetting.settingEl.addClass('dayble-transparent-setting');
        addCategorySetting.addButton(b => {
            b.setButtonText('+ add category');
            (b.buttonEl).addClass('mod-cta');
            b.onClick(async () => {
                const category: EventCategory = { id: randomId(), name: 'New category', bgColor: '#8392a4', textColor: '#ffffff', effect: 'embossed', animation: '', animation2: '', icon: undefined };
                this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).concat(category);
                await this.plugin.saveSettings();
                renderRules();
            });
        });
        renderRules();

        new Setting(containerEl).setName('Triggers').setDesc('Assigns a category and color when the event description matches defined text.').setHeading();
        const triggersWrap = containerEl.createDiv();
        const renderTriggers = () => {
            triggersWrap.empty();
            const items = this.plugin.settings.triggers || [];
            const swatches = [
                ...(this.plugin.settings.swatches || []),
                ...(this.plugin.settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];
            items.forEach((tr, idx) => {
                if (!tr.id) tr.id = randomId();
                const row = new Setting(triggersWrap);
                row.settingEl.querySelector('.setting-item-name')?.remove();
                row.settingEl.classList.add('db-triggers-row');
                row.settingEl.dataset.id = tr.id;
                (row.controlEl).addClass('dayble-flex-gap-8');

                // Drag Handle
                const dragBtn = row.controlEl.createEl('button', {
                    attr: {
                        'aria-label': 'Drag to reorder'
                    }
                });
                dragBtn.setCssProps({
                    'padding': '0px',
                    'border': 'none',
                    'background': 'transparent',
                    'box-shadow': 'none',
                    'cursor': 'grab',
                    'color': 'var(--text-muted)',
                    'flex-shrink': '0',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'margin-right': '4px'
                });
                setIcon(dragBtn, 'menu');

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const wrap = row.settingEl;
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(100);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;
                    
                    // Sync values for cloned inputs/selects
                    const originalInputs = wrap.querySelectorAll('input, select');
                    const clonedInputs = clone.querySelectorAll('input, select');
                    originalInputs.forEach((el, idx) => {
                        if (clonedInputs[idx]) {
                            (clonedInputs[idx] as HTMLInputElement | HTMLSelectElement).value = (el as HTMLInputElement | HTMLSelectElement).value;
                        }
                    });
                    
                    ghost.appendChild(clone);
                    ghost.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'left': `${rect.left}px`,
                        'top': `${rect.top}px`,
                        'position': 'fixed',
                        'z-index': '9999',
                        'pointer-events': 'none',
                        'opacity': '0.8',
                        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.2)',
                        'background-color': 'var(--background-primary)',
                        'border-radius': '4px'
                    });

                    wrap.classList.add('drag-ghost-hidden');
                    ghost.addClass('dayble-drag-ghost');

                    const onMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const currentX = moveEvent.clientX;
                        const currentY = moveEvent.clientY;

                        ghost.setCssProps({
                            'left': `${currentX - offsetX}px`,
                            'top': `${currentY - offsetY}px`
                        });

                        const target = document.elementFromPoint(currentX, currentY);
                        const targetRow = target ? target.closest('.db-triggers-row') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === triggersWrap) {
                            const rect = targetRow.getBoundingClientRect();
                            const isAfter = (currentY - rect.top) > (rect.height / 2);
                            
                            if (isAfter) {
                                if (targetRow.nextSibling !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow.nextSibling);
                                }
                            } else {
                                if (targetRow !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow);
                                }
                            }
                        }
                    };

                    const onEnd = async () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onEnd);
                        ghost.remove();
                        wrap.classList.remove('drag-ghost-hidden');
                        
                        // Reorder settings based on DOM order
                        const updatedTriggers: any[] = [];
                        triggersWrap.querySelectorAll('.db-triggers-row').forEach((el) => {
                            const trId = (el as HTMLElement).dataset.id;
                            const tr = this.plugin.settings.triggers?.find(t => t.id === trId);
                            if (tr) updatedTriggers.push(tr);
                        });

                        if (updatedTriggers.length > 0) {
                            this.plugin.settings.triggers = updatedTriggers;
                            await this.plugin.saveSettings();
                        }
                    };

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onEnd);
                });

                row.addText(t => {
                    t.setPlaceholder('Text in title or description');
                    t.setValue(tr.pattern);
                    t.onChange(async v => {
                        items[idx].pattern = v || '';
                        this.plugin.settings.triggers = items;
                        await this.plugin.saveSettings();
                    });
                    (t.inputEl).classList.add('db-input');
                    (t.inputEl).addClass('dayble-trigger-input');
                    (t.inputEl).setCssProps({ 'min-width': '200px' });
                });
                row.addDropdown(d => {
                    const cats = this.plugin.settings.eventCategories || [];
                    d.addOption('', 'Default category');
                    cats.forEach(c => d.addOption(c.id, c.name));
                    d.setValue(tr.categoryId || '');
                    d.onChange(async v => {
                        items[idx].categoryId = v || '';
                        this.plugin.settings.triggers = items;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
                    (d.selectEl).classList.add('db-select');
                    (d.selectEl).addClass('dayble-icon-select');
                });
                row.addDropdown(d => {
                    d.addOption('', 'Default color');
                    swatches.forEach(s => d.addOption(s.name, s.name));
                    d.setValue(tr.colorName || tr.color || '');
                    d.onChange(async v => {
                        if (!v) {
                            delete items[idx].colorName;
                            delete items[idx].color;
                            delete items[idx].textColor;
                        } else {
                            const s = swatches.find(sw => sw.name === v || sw.color === v);
                            if (s) {
                                items[idx].colorName = s.name;
                                delete items[idx].color;
                                delete items[idx].textColor;
                            }
                        }
                        this.plugin.settings.triggers = items;
                        await this.plugin.saveSettings();
                        applyColorStyles();
                    });
                    (d.selectEl).classList.add('db-select');
                    (d.selectEl).addClass('dayble-trigger-color-select');
                    
                    // Style the dropdown
                    const applyColorStyles = () => {
                        const currentValue = d.getValue();
                        const selectedSwatch = swatches.find(sw => sw.name === currentValue || sw.color === currentValue);
                        
                        // Style the select element itself
                        if (selectedSwatch) {
                            (d.selectEl).setCssProps({
                                'background-color': selectedSwatch.color,
                                'color': selectedSwatch.textColor || chooseTextColor(selectedSwatch.color)
                            });
                        } else {
                            (d.selectEl).setCssProps({
                                'background-color': '',
                                'color': ''
                            });
                        }
                        
                        // Style the options
                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value) return; // Skip default option
                            const s = swatches.find(sw => sw.name === opt.value || sw.color === opt.value);
                            if (s) {
                                (opt as unknown as { setCssProps: (props: any) => void }).setCssProps?.({
                                    'background-color': s.color,
                                    'color': s.textColor || chooseTextColor(s.color)
                                });
                            }
                        });
                    };
                    // Apply initially
                    applyColorStyles();
                    
                    (d.selectEl).addClass('dayble-select-max-width');
                });
                row.addExtraButton(btn => {
                    btn.setIcon('copy').setTooltip('Duplicate entry').onClick(async () => {
                        const items2 = (this.plugin.settings.triggers || []).slice();
                        const copy = { ...tr, id: randomId(), pattern: tr.pattern + ' (copy)' };
                        items2.splice(idx + 1, 0, copy);
                        this.plugin.settings.triggers = items2;
                        await this.plugin.saveSettings();
                        renderTriggers();
                    });
                });

                row.addExtraButton(btn => {
                    btn.setIcon('x').setTooltip('Delete').onClick(async () => {
                        const updated = items.filter((_, i) => i !== idx);
                        this.plugin.settings.triggers = updated;
                        await this.plugin.saveSettings();
                        renderTriggers();
                    });
                });
            });
            const addTriggerSetting = new Setting(triggersWrap);
            addTriggerSetting.settingEl.addClass('dayble-transparent-setting');
            addTriggerSetting.addButton(b => {
                b.setButtonText('+ add trigger');
                (b.buttonEl).addClass('mod-cta');
                b.onClick(async () => {
                    const items2 = (this.plugin.settings.triggers || []).slice();
                    items2.push({ id: randomId(), pattern: '', categoryId: '' });
                    this.plugin.settings.triggers = items2;
                    await this.plugin.saveSettings();
                    renderTriggers();
                });
            });
        };
        renderTriggers();

        new Setting(containerEl).setName('States').setDesc('Adds state options to the event context menu.').setHeading();
        const statesWrap = containerEl.createDiv();
        const renderStates = () => {
            statesWrap.empty();
            const items = this.plugin.settings.eventStates || [];
            const swatches = [
                ...(this.plugin.settings.swatches || []),
                ...(this.plugin.settings.userCustomSwatches || []).map((s, idx) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];
            items.forEach((state, idx) => {
                const row = new Setting(statesWrap);
                row.settingEl.classList.add('db-states-row');
                row.settingEl.addClass('dayble-settings-state-row');
                
                // Drag Handle
                const dragBtn = row.controlEl.createEl('button', {
                    attr: {
                        'aria-label': 'Drag to reorder'
                    }
                });
                dragBtn.setCssProps({
                    'padding': '0px',
                    'border': 'none',
                    'background': 'transparent',
                    'box-shadow': 'none',
                    'cursor': 'grab',
                    'color': 'var(--text-muted)',
                    'flex-shrink': '0',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'margin-right': '8px'
                });
                setIcon(dragBtn, 'menu');

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const wrap = row.settingEl;
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(100);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;
                    
                    // Sync values for cloned inputs/selects
                    const originalInputs = wrap.querySelectorAll('input, select');
                    const clonedInputs = clone.querySelectorAll('input, select');
                    originalInputs.forEach((el, idx) => {
                        if (clonedInputs[idx]) {
                            (clonedInputs[idx] as HTMLInputElement | HTMLSelectElement).value = (el as HTMLInputElement | HTMLSelectElement).value;
                        }
                    });
                    
                    ghost.appendChild(clone);
                    ghost.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'left': `${rect.left}px`,
                        'top': `${rect.top}px`,
                        'position': 'fixed',
                        'z-index': '9999',
                        'pointer-events': 'none',
                        'opacity': '0.8',
                        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.2)',
                        'background-color': 'var(--background-primary)',
                        'border-radius': '4px'
                    });

                    wrap.classList.add('drag-ghost-hidden');
                    ghost.addClass('dayble-drag-ghost');

                    const onMove = (moveEvent: MouseEvent) => {
                        moveEvent.preventDefault();
                        const currentX = moveEvent.clientX;
                        const currentY = moveEvent.clientY;

                        ghost.setCssProps({
                            'left': `${currentX - offsetX}px`,
                            'top': `${currentY - offsetY}px`
                        });

                        const target = document.elementFromPoint(currentX, currentY);
                        const targetRow = target ? target.closest('.dayble-settings-state-row') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === statesWrap) {
                            const rect = targetRow.getBoundingClientRect();
                            const isAfter = (currentY - rect.top) > (rect.height / 2);
                            
                            if (isAfter) {
                                if (targetRow.nextSibling !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow.nextSibling);
                                }
                            } else {
                                if (targetRow !== wrap) {
                                    targetRow.parentNode?.insertBefore(wrap, targetRow);
                                }
                            }
                        }
                    };

                    const onEnd = async () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onEnd);
                        ghost.remove();
                        wrap.classList.remove('drag-ghost-hidden');
                        
                        const updatedStates: EventState[] = [];
                        statesWrap.querySelectorAll('.dayble-settings-state-row').forEach((el) => {
                            const stateId = (el as HTMLElement).dataset.id;
                            const state = this.plugin.settings.eventStates?.find(s => s.id === stateId);
                            if (state) updatedStates.push(state);
                        });

                        if (updatedStates.length > 0) {
                            this.plugin.settings.eventStates = updatedStates;
                            await this.plugin.saveSettings();
                        }
                    };

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onEnd);
                });

                row.settingEl.dataset.id = state.id;

                row.addExtraButton(btn => {
                    btn.setIcon(state.icon || 'plus').setTooltip('Change icon').onClick(() => {
                        new IconPickerModal(this.plugin.app, (icon) => {
                            state.icon = icon;
                            void this.plugin.saveSettings().then(() => renderStates());
                        }, () => {
                            state.icon = '';
                            void this.plugin.saveSettings().then(() => renderStates());
                        }).open();
                    });
                });

                row.addText(text => {
                    text.setPlaceholder('State name')
                        .setValue(state.name)
                        .onChange(async v => {
                            state.name = v;
                            await this.plugin.saveSettings();
                        });
                    (text.inputEl).addClass('dayble-trigger-input');
                });

                row.addDropdown(d => {
                    d.addOption('', 'No color');
                    swatches.forEach(s => d.addOption(s.name, s.name));
                    d.setValue(state.colorName || '');
                    d.onChange(async v => {
                        state.colorName = v;
                        await this.plugin.saveSettings();
                        applyColorStyles();
                    });

                    const applyColorStyles = () => {
                        const currentValue = d.getValue();
                        const selectedSwatch = swatches.find(sw => sw.name === currentValue);
                        if (selectedSwatch) {
                            (d.selectEl).style.setProperty('background-color', selectedSwatch.color, 'important');
                            (d.selectEl).style.setProperty('color', selectedSwatch.textColor || chooseTextColor(selectedSwatch.color), 'important');
                        } else {
                            (d.selectEl).style.removeProperty('background-color');
                            (d.selectEl).style.removeProperty('color');
                        }

                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value) return;
                            const s = swatches.find(sw => sw.name === opt.value);
                            if (s) {
                                opt.style.setProperty('background-color', s.color);
                                opt.style.setProperty('color', s.textColor || chooseTextColor(s.color));
                            }
                        });
                    };
                    applyColorStyles();
                    (d.selectEl).classList.add('db-select');
                    (d.selectEl).addClass('dayble-select-max-width');
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
                    }).setValue(state.effect || '').onChange(async v => {
                        state.effect = v;
                        await this.plugin.saveSettings();
                    });
                    (d.selectEl).classList.add('db-select');
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
                    }).setValue(state.animation || '').onChange(async v => {
                        state.animation = v;
                        await this.plugin.saveSettings();
                    });
                    (d.selectEl).classList.add('db-select');
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
                    }).setValue(state.animation2 || '').onChange(async v => {
                        state.animation2 = v;
                        await this.plugin.saveSettings();
                    });
                    (d.selectEl).classList.add('db-select');
                });

                row.addExtraButton(btn => {
                    btn.setIcon('copy').setTooltip('Duplicate entry').onClick(async () => {
                        const items2 = (this.plugin.settings.eventStates || []).slice();
                        const copy = { ...state, id: randomId(), name: state.name + ' (copy)' };
                        items2.splice(idx + 1, 0, copy);
                        this.plugin.settings.eventStates = items2;
                        await this.plugin.saveSettings();
                        renderStates();
                    });
                });

                row.addExtraButton(btn => {
                    btn.setIcon('x').setTooltip('Delete').onClick(async () => {
                        this.plugin.settings.eventStates = items.filter((_, i) => i !== idx);
                        await this.plugin.saveSettings();
                        renderStates();
                    });
                });
            });

            const addStateSetting = new Setting(statesWrap);
            addStateSetting.settingEl.addClass('dayble-transparent-setting');
            addStateSetting.addButton(b => {
                b.setButtonText('+ add state');
                (b.buttonEl).addClass('mod-cta');
                b.onClick(async () => {
                    const items2 = (this.plugin.settings.eventStates || []).slice();
                    items2.push({ id: randomId(), name: '', icon: '', colorName: '', effect: '', animation: '', animation2: '' });
                    this.plugin.settings.eventStates = items2;
                    await this.plugin.saveSettings();
                    renderStates();
                });
            });
        };
        renderStates();

        new Setting(containerEl).setName('Data management').setHeading();
        new Setting(containerEl)
            .setName('Export data')
            .addButton(b => {
                b.setButtonText('Export data')
                 .onClick(async () => {
                    try {
                        const vaultName = (this.app.vault as Vault & { getName: () => string }).getName?.() 
                            || (this.app.vault.adapter as DataAdapter & { basePath?: string }).basePath?.split(/[\\/]/).filter(Boolean).pop() 
                            || 'Vault';
                        const exportObj: {
                            vaultName: string;
                            exportedAt: string;
                            settings: DaybleSettings;
                            months: Array<{ file: string; data: unknown }>;
                        } = {
                            vaultName,
                            exportedAt: new Date().toISOString(),
                            settings: this.plugin.settings,
                            months: []
                        };
                        const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                        let files: string[] = [];
                        try {
                            const listing = await this.app.vault.adapter.list(folder);
                            files = (listing.files || []).filter((f: string) => f.toLowerCase().endsWith('.json'));
                        } catch {
                            files = [];
                        }
                        for (const f of files) {
                            try {
                                const txt = await this.app.vault.adapter.read(f);
                                const data = JSON.parse(txt);
                                exportObj.months.push({ file: f, data });
                            } catch { /* ignore */ }
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
                        
                        new Notice(`Export ready: ${fileName}`);
                    } catch {
                        new Notice('Export failed');
                    }
                 });
            });
        new Setting(containerEl)
            .setName('Import data')
            .addButton(b => {
                b.setButtonText('Import data')
                 .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        try {
                            const text = await file.text();
                            const obj = JSON.parse(text);
                            if (obj?.settings) {
                                this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, obj.settings);
                                await this.plugin.saveSettings();
                            }
                            if (Array.isArray(obj?.months)) {
                                const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                                try { await this.app.vault.adapter.stat(folder); } catch { try { await this.app.vault.createFolder(folder); } catch (e) { console.debug('[Dayble] Create folder:', e); } }
                                for (const m of obj.months) {
                                    const path = typeof m.file === 'string' ? m.file : `${folder}/Imported_${Date.now()}.json`;
                                    await this.app.vault.adapter.write(path, JSON.stringify(m.data ?? {}, null, 2));
                                }
                            }
                            const view = this.plugin.getCalendarView();
                            if (view) { await view.loadAllEntries(); await view.render(); }
                            new Notice('Import completed');
                            
                            // Reload the plugin
                            const pluginManager = (this.plugin.app as App & { plugins: { disablePlugin: (id: string) => Promise<void>; enablePlugin: (id: string) => Promise<void>; } }).plugins;
                            if (pluginManager) {
                                await pluginManager.disablePlugin(this.plugin.manifest.id);
                                await pluginManager.enablePlugin(this.plugin.manifest.id);
                            }
                        } catch {
                            new Notice('Import failed');
                        }
                    };
                    input.click();
                 });
            });

        // Restore scroll position
        containerEl.scrollTop = scrollPos;
    }
}


class ChangelogModal extends Modal {
    plugin: DaybleCalendarPlugin;
    _mdComp: Component | null = null;

    constructor(app: App, plugin: DaybleCalendarPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        try {
            this.modalEl.setCssStyles({
                maxWidth: '900px',
                width: '900px',
                padding: '25px'
            });
        } catch { /* ignore */ }

        const header = contentEl.createEl('div');
        header.setCssStyles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--divider-color)'
        });

        const title = header.createEl('h2', { text: 'Dayble calendar' });
        title.setCssStyles({
            margin: '0',
            fontSize: '1.5em',
            fontWeight: '600'
        });

        const link = header.createEl('a', { text: 'View on GitHub' });
        link.href = 'https://github.com/Kazi-Aidah/dayble-calendar/releases';
        link.target = '_blank';
        link.setCssStyles({
            fontSize: '0.9em',
            opacity: '0.8',
            transition: 'opacity 0.2s'
        });
        link.addEventListener('mouseenter', () => link.setCssStyles({ opacity: '1' }));
        link.addEventListener('mouseleave', () => link.setCssStyles({ opacity: '0.8' }));

        const body = contentEl.createDiv();
        body.setCssStyles({
            maxHeight: '70vh',
            overflow: 'auto'
        });

        const loading = body.createEl('div', { text: 'Loading releases...' });
        loading.setCssStyles({
            opacity: '0.7',
            fontSize: '0.95em',
            marginTop: '12px'
        });

        try {
            const rels = await this.plugin.fetchAllReleases();
            body.empty();
            if (!Array.isArray(rels) || rels.length === 0) {
                const noInfo = body.createEl('div', { text: 'No release information available.' });
                noInfo.setCssStyles({ marginTop: '12px' });
                return;
            }

            rels.forEach(async (rel) => {
                const meta = body.createEl('div');
                meta.setCssStyles({
                    marginBottom: '6px',
                    borderBottom: '1px solid var(--divider-color)'
                });

                const releaseName = meta.createEl('div', { text: rel.name || rel.tag_name || 'Release' });
                releaseName.setCssStyles({
                    fontSize: '2em',
                    fontWeight: '900',
                    marginTop: '12px',
                    marginBottom: '12px',
                    color: 'var(--text-normal)'
                });

                try {
                    const dateRaw = rel.published_at || rel.created_at || rel.release_date || null;
                    if (dateRaw) {
                        const dt = new Date(dateRaw);
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        const formatted = `${dt.getFullYear()} ${monthNames[dt.getMonth()]} ${String(dt.getDate()).padStart(2, '0')}`;
                        const dateEl = meta.createEl('div', { text: formatted });
                        dateEl.setCssStyles({
                            display: 'block',
                            opacity: '0.8',
                            fontSize: '0.9em',
                            marginTop: '-4px',
                            marginBottom: '16px'
                        });
                    }
                } catch { /* ignore */ }

                const notes = body.createEl('div');
                notes.setCssStyles({
                    marginTop: '0px',
                    lineHeight: '1.6',
                    fontSize: '0.95em'
                });
                notes.addClass('markdown-preview-view');
                try {
                    notes.setCssStyles({ padding: '0 var(--file-margin)' });
                } catch { /* ignore */ }

                const md = rel.body || 'No notes';
                try {
                    if (!this._mdComp) {
                        this._mdComp = new Component();
                    }
                    await MarkdownRenderer.render(this.plugin.app, md, notes, '', this._mdComp);
                } catch {
                    const preEl = notes.createEl('pre');
                    preEl.setCssStyles({
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        backgroundColor: 'var(--background-secondary)',
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        lineHeight: '1.5'
                    });
                    preEl.textContent = md;
                }
            });
        } catch {
            body.empty();
            const failed = body.createEl('div', { text: 'Failed to load release notes.' });
            failed.setCssStyles({ marginTop: '12px' });
        }
    }

    onClose() {
        try {
            if (this._mdComp) {
                this._mdComp.unload();
            }
        } catch { /* ignore */ }
        this._mdComp = null;
        this.contentEl.empty();
    }
}

function randomId(): string {
    const anyCrypto = window.crypto as unknown as { randomUUID?: () => string };
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return 'ev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
