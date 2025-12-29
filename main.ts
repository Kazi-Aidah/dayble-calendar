import { App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, setIcon, Menu, TFile } from 'obsidian';

const VIEW_TYPE = 'dayble-calendar-view';

interface DaybleSettings {
    weekStartDay: number;
    entriesFolder: string;
    iconPlacement?: 'left' | 'right' | 'none' | 'top' | 'top-left' | 'top-right';
    eventTitleAlign?: 'left' | 'center' | 'right';
    eventDescAlign?: 'left' | 'center' | 'right';
    timeFormat?: '24h' | '12h';
    holderOpen?: boolean;
    holderWidth?: number; // in pixels
    eventCategories?: EventCategory[];
    preferUserColors?: boolean; // prefer user-set event colors over category colors
    eventBgOpacity?: number; // 0-1, controls background opacity
    eventBorderWidth?: number; // 0-5px, controls border thickness
    eventBorderRadius?: number; // px, controls border radius
    colorSwatchPosition?: 'under-title' | 'under-description' | 'none'; // position of color swatches in modal
    onlyAnimateToday?: boolean;
    completeBehavior?: 'none' | 'dim' | 'strikethrough' | 'hide';
    customSwatchesEnabled?: boolean;
    replaceDefaultSwatches?: boolean;
    swatches?: { name: string, color: string, textColor?: string }[];
    userCustomSwatches?: { name: string, color: string, textColor?: string }[];
    defaultColorsFolded?: boolean;
    customSwatchesFolded?: boolean;
    dayCellMaxHeight?: number;
    holderPlacement?: 'left' | 'right' | 'hidden';
    triggers?: { pattern: string, categoryId: string }[];
} 

const DEFAULT_SETTINGS: DaybleSettings = {
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
    color?: string; // user-set color (hex)
    textColor?: string; // user-set text color (hex)
    categoryId?: string;
    effect?: string;
    animation?: string;
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

export default class DaybleCalendarPlugin extends Plugin {
    settings: DaybleSettings;

    async onload() {
        await this.loadSettings();
        this.registerView(VIEW_TYPE, leaf => new DaybleCalendarView(leaf, this));
        this.addCommand({ id: 'open-dayble-calendar', name: 'Open Dayble Calendar', callback: () => this.openDayble() });
        this.addCommand({ id: 'dayble-focus-today', name: 'Focus on Today', callback: () => this.focusToday() });
        this.addSettingTab(new DaybleSettingTab(this.app, this));
        this.ensureEntriesFolder();
        this.openDayble();
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
        else this.openDayble();
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
            console.log('[Dayble Plugin] Entries folder is unset; skipping ensureEntriesFolder');
            return;
        }
        try {
            console.log('[Dayble Plugin] Ensuring entries folder exists:', folder);
            await this.app.vault.adapter.stat(folder);
            console.log('[Dayble Plugin] Folder already exists');
        } catch (_) {
            try {
                console.log('[Dayble Plugin] Folder does not exist, creating:', folder);
                await this.app.vault.createFolder(folder);
                console.log('[Dayble Plugin] Folder created successfully');
            } catch (e) {
                console.error('[Dayble Plugin] Failed to create folder:', e);
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
    isSelecting = false;
    isDragging = false;
    selectionStartDate: string | null = null;
    selectionEndDate: string | null = null;
    isResizingHolder = false;
    holderResizeStartX = 0;
    holderResizeStartWidth = 0;
    _boundHolderMouseMove = (e: MouseEvent) => {};
    _boundHolderMouseUp = (e: MouseEvent) => {};
    _longRO?: ResizeObserver;
    currentTodayModal?: TodayModal;

    constructor(leaf: WorkspaceLeaf, plugin: DaybleCalendarPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentDate = new Date();
        this.plugin.registerDomEvent(window, 'resize', () => {
            this.render();
        });
    }

    getViewType() { return VIEW_TYPE; }
    getDisplayText() { return 'Dayble Calendar'; }
    getIcon() { return 'calendar'; }
    
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
        this.headerEl = this.rootEl.createDiv({ cls: 'dayble-header' });
        const left = this.headerEl.createDiv({ cls: 'dayble-nav-left' });
        const holderToggle = document.createElement('button');
        holderToggle.className = 'dayble-btn dayble-header-buttons dayble-holder-toggle';
        setIcon(holderToggle, 'menu');
        holderToggle.onclick = async () => { this.holderEl.classList.toggle('open'); this.plugin.settings.holderOpen = this.holderEl.classList.contains('open'); await this.plugin.saveSettings(); };
        const searchBtn = document.createElement('button');
        searchBtn.className = 'dayble-btn dayble-header-buttons dayble-search-toggle';
        setIcon(searchBtn, 'search');
        searchBtn.onclick = () => { const modal = new PromptSearchModal(this.app, this); modal.open(); };
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
        if (placement !== 'hidden') {
            const target = (placement === 'left' ? left : right);
            target.appendChild(holderToggle);
            target.appendChild(searchBtn);
        } else {
            right.appendChild(searchBtn);
        }
        if (placement === 'right') {
            left.appendChild(prevBtn);
            left.appendChild(todayBtn);
            left.appendChild(nextBtn);
        } else {
            right.appendChild(prevBtn);
            right.appendChild(todayBtn);
            right.appendChild(nextBtn);
        }
        this.bodyEl = this.rootEl.createDiv({ cls: 'dayble-body' });
        if (placement === 'right') {
            this.bodyEl.addClass('dayble-holder-right');
        }
        this.holderEl = this.bodyEl.createDiv({ cls: 'dayble-holder' });
        if (placement === 'hidden') {
            (this.holderEl as HTMLElement).style.display = 'none';
        }
        const holderHeader = this.holderEl.createDiv({ cls: 'dayble-holder-header', text: 'Holder' });
        const holderAdd = holderHeader.createEl('button', { cls: 'dayble-btn dayble-holder-add-btn' });
        setIcon(holderAdd, 'plus');
        holderAdd.onclick = () => this.openEventModal();
        
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
            this.holderEl.style.width = newWidth + 'px';
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
            const src = e.dataTransfer?.getData('dayble-source');
            if (!id || src === 'holder') return; // Don't drop holder events on holder
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
                    this.renderHolder();
                    this.render();
                }
            } catch (error) {
                new Notice('Failed to move event to holder');
            }
        };
        this.holderEl.appendChild(holderList);
        
        // Apply saved holder width if it exists
        if (this.plugin.settings.holderWidth) {
            this.holderEl.style.width = this.plugin.settings.holderWidth + 'px';
        }
        
        if (this.plugin.settings.holderOpen) this.holderEl.addClass('open'); else this.holderEl.removeClass('open');
        this.calendarEl = this.bodyEl.createDiv({ cls: 'dayble-calendar' });
        this.weekHeaderEl = this.calendarEl.createDiv({ cls: 'dayble-weekdays' });
        this.gridEl = this.calendarEl.createDiv({ cls: 'dayble-grid' });
        await this.loadAllEntries();
        this.render();
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
            try { this._longRO.disconnect(); } catch {}
            this._longRO = undefined;
        }
        if (this._longOverlayEl && this._longOverlayEl.isConnected) {
            try { this._longOverlayEl.remove(); } catch {}
        }
        this._longEls.forEach(el => {
            try { if (el && el.parentElement) el.remove(); } catch {}
        });
        this._longEls.clear();
    }

    async loadAllEntries() {
        const file = this.getMonthDataFilePath();
        try {
            console.log('[Dayble] Loading all entries from', file);
            const json = await this.app.vault.adapter.read(file);
            console.log('[Dayble] Read file, size:', json.length, 'bytes');
            const data = JSON.parse(json) as { events: DaybleEvent[], holder: DaybleEvent[], lastModified?: string };
            this.events = data.events || [];
            this.holderEvents = data.holder || [];
            console.log('[Dayble] Loaded', this.events.length, 'events and', this.holderEvents.length, 'holder events');
            if (data.lastModified) {
                console.log('[Dayble] Last modified:', data.lastModified);
            }
        } catch (e) {
            console.log('[Dayble] No data file found, starting with empty events:', file);
            console.log('[Dayble] Error details:', e instanceof Error ? e.message : String(e));
            this.events = [];
            this.holderEvents = [];
        }
    }

    async saveAllEntries() {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }
        const file = this.getMonthDataFilePath();
        try {
            // Folder exists, proceed to save
            
            console.log('[Dayble] Saving all entries to', file);
            console.log('[Dayble] Current events:', this.events.length);
            console.log('[Dayble] Current holder events:', this.holderEvents.length);
            const data = {
                events: this.events,
                holder: this.holderEvents,
                lastModified: new Date().toISOString()
            };
            const jsonStr = JSON.stringify(data, null, 2);
            console.log('[Dayble] JSON size:', jsonStr.length, 'bytes');
            await this.app.vault.adapter.write(file, jsonStr);
            console.log('[Dayble] All entries saved successfully to:', file);
        }
        catch (e) {
            console.error('[Dayble] Failed to save entries:', e);
            console.error('[Dayble] Error message:', e instanceof Error ? e.message : String(e));
            new Notice('Failed to save entries: ' + (e instanceof Error ? e.message : String(e)));
        }
    }

    focusToday() {
        this.currentDate = new Date();
        this.loadAllEntries().then(() => this.render());
    }

    shiftMonth(delta: number) {
        const d = new Date(this.currentDate);
        d.setMonth(d.getMonth() + delta);
        this.currentDate = d;
        this.loadAllEntries().then(() => this.render());
    }

    render(titleEl?: HTMLElement) {
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
        const segmentHeight = 28;
        const segmentGap = 4;
        const countsByDate: Record<string, number> = {};
        const longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        longEventsPreset.forEach(ev => {
            const start = new Date(ev.startDate!);
            const end = new Date(ev.endDate!);
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
            const fullDate = `${y}-${String(m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
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
            const preCount = countsByDate[fullDate] || 0;
            const preMt = preCount > 0 ? (preCount * segmentHeight) + (Math.max(0, preCount - 1) * segmentGap) + 2 : 0;
            container.style.marginTop = preMt ? `${preMt}px` : '';
            if ((this.plugin.settings.dayCellMaxHeight ?? 0) > 0) {
                requestAnimationFrame(() => {
                    const maxH = this.plugin.settings.dayCellMaxHeight ?? 0;
                    if (maxH > 0) {
                        const headH = (dayHeader as HTMLElement).offsetHeight || 0;
                        const longH = (longContainer as HTMLElement).offsetHeight || 0;
                        const rest = Math.max(24, maxH - headH - longH - 8);
                        (cell as HTMLElement).style.maxHeight = `${maxH}px`;
                        (cell as HTMLElement).style.overflow = 'hidden';
                        (container as HTMLElement).style.maxHeight = `${rest}px`;
                        (container as HTMLElement).style.overflowY = 'auto';
                        (container as HTMLElement).classList.add('dayble-scrollable');
                    }
                });
            }
            const dayEvents = this.events.filter(e => e.date === fullDate);
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e)));
            
            // Allow reordering events within the container
            container.ondragover = (e) => { 
                e.preventDefault();
                
                // Show drop position indicator only if there are multiple events
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event') as HTMLElement | null;
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
                const draggedEl = document.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
                if (!draggedEl) return;
                
                // Check if dragged event is from this container
                const draggedContainer = draggedEl.closest('.dayble-event-container') as HTMLElement | null;
                if (draggedContainer !== container) return;
                
                // Find target event to insert before/after
                const targetEvent = (e.target as HTMLElement).closest('.dayble-event') as HTMLElement | null;
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
                const newOrder = allEventEls.map(el => (el as HTMLElement).dataset.id).filter(Boolean) as string[];
                
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
            
            cell.onclick = (ev) => {
                const target = ev.target as HTMLElement;
                // Only open modal if clicking on the cell itself or container, not on an event
                if (!target.closest('.dayble-event') && target.closest('.dayble-event-container') === container) {
                    this.openEventModal(undefined, fullDate);
                }
            };
            cell.onmousedown = (ev) => {
                if ((ev as MouseEvent).button !== 0) return;
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
                            this.events.push(evn);
                            await this.saveAllEntries();
                            this.renderHolder();
                            this.render();
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
                            } else if (ev.date) {
                                ev.date = fullDate;
                            }
                            await this.saveAllEntries();
                        }
                    }
                    this.renderHolder();
                    this.render();
                } catch (error) {
                    new Notice('Failed to save event changes');
                }
            };
        }
        // Defer long event positioning until layout settles
        // Prepare overlay for long events; hide it until positions are computed
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.style.position = 'absolute';
            this._longOverlayEl.style.inset = '0';
            this._longOverlayEl.style.pointerEvents = 'none';
            this._longOverlayEl.style.zIndex = '10';
        } else {
            this.gridEl.appendChild(this._longOverlayEl);
        }
        requestAnimationFrame(() => this.renderLongEvents());
        this.renderHolder();
        if (!this._longRO && (window as any).ResizeObserver) {
            // Observe grid size changes to keep long spans aligned
            this._longRO = new (window as any).ResizeObserver(() => {
                this.renderLongEvents();
            });
            if (this._longRO && this.gridEl) this._longRO.observe(this.gridEl);
        }
    }

    startSelection(date: string, el: HTMLElement) {
        console.log('[Dayble] Starting selection from date:', date);
        this.isSelecting = true;
        this.selectionStartDate = date;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
        document.addEventListener('mouseup', this._endSelOnce);
    }
    _endSelOnce = () => { document.removeEventListener('mouseup', this._endSelOnce); this.endSelection(); };
    updateSelection(date: string) {
        if (!this.isSelecting || this.isDragging) return;
        console.log('[Dayble] Updating selection to date:', date);
        this.selectionEndDate = date;
        this.highlightSelectionRange();
    }
    endSelection() {
        if (!this.isSelecting) return;
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
        const s = new Date(this.selectionStartDate! + 'T00:00:00');
        const e = new Date(this.selectionEndDate! + 'T00:00:00');
        const [min, max] = s <= e ? [s, e] : [e, s];
        console.log('[Dayble] Highlighting range:', min.toISOString(), 'to', max.toISOString());
        const cells = Array.from(this.gridEl.children) as HTMLElement[];
        let selectedCount = 0;
        cells.forEach(c => {
            c.removeClass('dayble-selected');
            const d = c.getAttr('data-date');
            if (!d) return;
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
        const modal = new EventModal(this.app, undefined, start, end, async result => {
            const ev: DaybleEvent = { id: randomId(), ...result } as DaybleEvent;
            this.events.push(ev);
            await this.saveAllEntries();
            this.render();
        }, async () => {}, async () => {});
        (modal as any).categories = this.plugin.settings.eventCategories || [];
        (modal as any).plugin = this.plugin;
        modal.open();
    }

    renderLongEvents() {
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.style.position = 'absolute';
            this._longOverlayEl.style.inset = '0';
            this._longOverlayEl.style.pointerEvents = 'none';
            this._longOverlayEl.style.zIndex = '10';
        }
        const cells = Array.from(this.gridEl.children).filter(el => (el as HTMLElement).hasClass?.('dayble-day')) as HTMLElement[];
        const todayNum = (el: HTMLElement) => {
            const n = el.querySelector('.dayble-day-number') as HTMLElement | null;
            return n ? n.getBoundingClientRect().height + parseFloat(getComputedStyle(n).marginBottom || '0') : 24;
        };
        const segmentHeight = 28;
        const segmentGap = 4;
        const getCellWidth = () => {
            if (cells.length === 0) return 100;
            return (cells[0] as HTMLElement).offsetWidth || 100;
        };
        const countsByDate: Record<string, number> = {};
        const longEvents = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        longEvents.forEach(ev => {
            const start = new Date(ev.startDate!);
            const end = new Date(ev.endDate!);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const key = `${y}-${m}-${dd}`;
                countsByDate[key] = (countsByDate[key] || 0) + 1;
            }
        });
        const requiredKeys = new Set<string>();
        longEvents.forEach(ev => {
            const startIdx = cells.findIndex(c => c.getAttr('data-date') === ev.startDate);
            if (startIdx === -1) return;
            const start = new Date(ev.startDate!);
            const end = new Date(ev.endDate!);
            const overlap = longEvents
                .filter(e => e.startDate && e.endDate && e.startDate !== e.endDate && new Date(e.startDate!) <= start && new Date(e.endDate!) >= start)
                .sort((a,b) => {
                    const ad = (new Date(a.endDate!).getTime() - new Date(a.startDate!).getTime());
                    const bd = (new Date(b.endDate!).getTime() - new Date(b.startDate!).getTime());
                    if (ad !== bd) return bd - ad; // longer first (on top)
                    return a.id.localeCompare(b.id);
                });
            const stackIndex = overlap.findIndex(e => e.id === ev.id);
            const span = Math.floor((end.getTime() - start.getTime())/86400000) + 1;
            const cellsPerRow = 7;
            const startRow = Math.floor(startIdx / cellsPerRow);
            const endIdx = startIdx + span - 1;
            const endRow = Math.floor(endIdx / cellsPerRow);
            const cellWidth = getCellWidth();
            if (startRow === endRow) {
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last) return;
                const frLeft = (first as HTMLElement).offsetLeft;
                const frTop = (first as HTMLElement).offsetTop;
                const lrRight = (last as HTMLElement).offsetLeft + (last as HTMLElement).offsetWidth;
                const topOffset = todayNum(first) + 10 + stackIndex * (segmentHeight + segmentGap);
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
                    (item as HTMLElement).dataset.longKey = key;
                    (item as HTMLElement).dataset.styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                    item.style.position = 'absolute';
                    item.style.boxSizing = 'border-box';
                    item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                    this.gridEl!.appendChild(item);
                    this._longEls.set(key, item);
                }
                else {
                    const sig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                    if ((item as HTMLElement).dataset.styleSig !== sig) {
                        const newItem = this.createEventItem(ev);
                        newItem.addClass('dayble-long-event');
                        newItem.addClass('dayble-long-event-single');
                        (newItem as HTMLElement).dataset.longKey = key;
                        (newItem as HTMLElement).dataset.styleSig = sig;
                        newItem.style.position = 'absolute';
                        newItem.style.boxSizing = 'border-box';
                        newItem.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                        if (item.parentElement) item.replaceWith(newItem);
                        item = newItem;
                        this._longEls.set(key, item);
                    }
                }
                if (!item.isConnected || item.parentElement !== this.gridEl) {
                    this.gridEl!.appendChild(item);
                }
                (item as HTMLElement).style.setProperty('--event-border-width', `${this.plugin.settings.eventBorderWidth ?? 2}px`);
                (item as HTMLElement).style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
                item.style.left = `${left}px`;
                item.style.top = `${top}px`;
                item.style.width = `${width}px`;
                item.style.height = `${segmentHeight}px`;
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
                    const frLeft = (first as HTMLElement).offsetLeft;
                    const frTop = (first as HTMLElement).offsetTop;
                    const lrRight = (last as HTMLElement).offsetLeft + (last as HTMLElement).offsetWidth;
                    const topOffset = todayNum(first) + 10 + stackIndex * (segmentHeight + segmentGap);
                    const left = frLeft - 2;
                    const top = frTop + topOffset;
                    const width = (lrRight - frLeft) + 4;
                    const key = `${ev.id}:row:${row}`;
                    requiredKeys.add(key);
                    let item = this._longEls.get(key);
                    if (!item) {
                        item = this.createEventItem(ev);
                        item.addClass('dayble-long-event');
                        if (row === startRow) item.addClass('dayble-long-event-start');
                        if (row === endRow) item.addClass('dayble-long-event-end');
                        (item as HTMLElement).dataset.longKey = key;
                        (item as HTMLElement).dataset.styleSig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                        item.style.position = 'absolute';
                        item.style.boxSizing = 'border-box';
                        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                        this.gridEl!.appendChild(item);
                        this._longEls.set(key, item);
                    }
                    else {
                        const sig = `${ev.categoryId || ''}|${ev.color || ''}|${ev.textColor || ''}|${this.plugin.settings.eventBgOpacity}|${this.plugin.settings.iconPlacement}|${this.plugin.settings.onlyAnimateToday}|${this.plugin.settings.eventBorderWidth}|${this.plugin.settings.eventBorderRadius}`;
                        if ((item as HTMLElement).dataset.styleSig !== sig) {
                            const newItem = this.createEventItem(ev);
                            newItem.addClass('dayble-long-event');
                            if (row === startRow) newItem.addClass('dayble-long-event-start');
                            if (row === endRow) newItem.addClass('dayble-long-event-end');
                            (newItem as HTMLElement).dataset.longKey = key;
                            (newItem as HTMLElement).dataset.styleSig = sig;
                            newItem.style.position = 'absolute';
                            newItem.style.boxSizing = 'border-box';
                            newItem.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                            if (item.parentElement) item.replaceWith(newItem);
                            item = newItem;
                            this._longEls.set(key, item);
                        }
                    }
                    if (!item.isConnected || item.parentElement !== this.gridEl) {
                        this.gridEl!.appendChild(item);
                    }
                    (item as HTMLElement).style.setProperty('--event-border-width', `${this.plugin.settings.eventBorderWidth ?? 2}px`);
                    (item as HTMLElement).style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
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
                const el = this._longEls.get(key)!;
                if (el && el.parentElement) el.remove();
                this._longEls.delete(key);
            }
        });
        cells.forEach(cell => {
            const date = cell.getAttr('data-date')!;
            const count = countsByDate[date] || 0;
            const container = cell.querySelector('.dayble-event-container') as HTMLElement | null;
            if (container) {
                const mt = count > 0 ? (count * segmentHeight) + (Math.max(0, count - 1) * segmentGap) + 2 : 0;
                container.style.marginTop = mt ? `${mt}px` : '';
                // HERE HERE UNDER LONG EVENT GAPPY
            }
        });
    }

    createEventItem(ev: DaybleEvent): HTMLElement {
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
        const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
        const isDefaultCategory = !ev.categoryId || ev.categoryId === 'default';
        
        let bgColor = '';
        let textColor = '';
        
        // Color selection logic (user-set color always preferred)
        if (ev.color) {
            bgColor = ev.color;
            textColor = ev.textColor || chooseTextColor(ev.color);
            (item as HTMLElement).dataset.color = ev.color;
        } else if (category && category.bgColor) {
            bgColor = category.bgColor;
            textColor = category.textColor;
        }
        
        // Apply styling if we have colors
        if (bgColor && textColor) {
            // Convert hex color to rgba with opacity
            const opacity = this.plugin.settings.eventBgOpacity ?? 1;
            const rgbaColor = hexToRgba(bgColor, opacity);
            item.style.setProperty('--event-bg-color', rgbaColor);
            item.style.setProperty('--event-text-color', textColor);
            item.classList.add('dayble-event-colored');
        }
        
        // Apply border width settings
        item.style.setProperty('--event-border-width', `${this.plugin.settings.eventBorderWidth ?? 2}px`);
        item.style.setProperty('--event-border-radius', `${this.plugin.settings.eventBorderRadius ?? 6}px`);
        
        // Apply effect and animation from category (always, regardless of color choice)
        if (category) {
            if (category.effect && category.effect !== '') item.addClass(`dayble-effect-${category.effect}`);
            const onlyToday = this.plugin.settings.onlyAnimateToday ?? false;
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
        const tFmt = this.plugin.settings.timeFormat ?? '24h';
        const timeDisplay = formatTimeRange(ev.time, tFmt);
        if (timeDisplay) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = ` (${timeDisplay})`;
            title.appendChild(timeSpan);
        }
        const iconToUse = ev.icon || (category?.icon || '');
        if (this.plugin.settings.iconPlacement !== 'none' && iconToUse) {
            const iconEl = item.createDiv({ cls: 'dayble-event-icon' });
            setIcon(iconEl, iconToUse);
            const place = this.plugin.settings.iconPlacement ?? 'left';
            if (place === 'left') {
                item.insertBefore(iconEl, title);
            } else if (place === 'right') {
                item.appendChild(iconEl);
            } else if (place === 'top' || place === 'top-left' || place === 'top-right') {
                iconEl.addClass('dayble-icon-top');
                if (place === 'top-left') iconEl.addClass('dayble-icon-top-left');
                else if (place === 'top-right') iconEl.addClass('dayble-icon-top-right');
                else iconEl.addClass('dayble-icon-top-center');
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
            const behavior = this.plugin.settings.completeBehavior ?? 'none';
            if (behavior === 'dim') item.style.opacity = '0.6';
            else if (behavior === 'strikethrough') title.style.textDecoration = 'line-through';
            else if (behavior === 'hide') item.style.display = 'none';
        }
        item.addEventListener('click', (evt) => {
            const a = (evt.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                evt.preventDefault();
                evt.stopPropagation();
                const file = resolveNoteFile(this.plugin.app, wiki);
                if (file) {
                    const leaf = this.plugin.app.workspace.getLeaf(true);
                    (leaf as any).openFile?.(file);
                }
            }
        }, { capture: true });
        item.ondragstart = e => {
            console.log('[Dayble] Drag started on event:', ev.id);
            this.isSelecting = false;
            this.isDragging = true;
            this.clearSelection();
            e.dataTransfer?.setData('text/plain', ev.id);
            (e.dataTransfer as DataTransfer)?.setData('dayble-source','calendar');
            try {
                const dragImg = item.cloneNode(true) as HTMLElement;
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
                e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                (item as any).__dragImg = dragImg;
            } catch {}
            item.addClass('dayble-dragging');
        };
        item.ondragend = () => {
            console.log('[Dayble] Drag ended');
            item.removeClass('dayble-dragging');
            const di = (item as any).__dragImg as HTMLElement | undefined;
            if (di && di.parentElement) di.remove();
            (item as any).__dragImg = undefined;
            this.isDragging = false;
        };
        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id); };
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = new Menu();
            menu.addItem(i => i.setTitle('Duplicate').setIcon('copy').onClick(() => {
                const newEv: DaybleEvent = { ...ev, id: randomId() };
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

    renderHolder() {
        const list = this.holderEl?.querySelector('.dayble-holder-list') as HTMLElement | null;
        if (!list) return;
        list.empty();
        this.holderEvents.forEach(ev => {
            const item = this.createEventItem(ev);
            item.dataset.source = 'holder';
            item.ondragstart = e => {
                console.log('[Dayble] Drag started on holder event:', ev.id);
                this.isDragging = true;
                this.isSelecting = false;
                this.clearSelection();
                e.dataTransfer?.setData('text/plain', ev.id);
                (e.dataTransfer as DataTransfer)?.setData('dayble-source','holder');
                try {
                    const dragImg = item.cloneNode(true) as HTMLElement;
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
                    e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                    (item as any).__dragImg = dragImg;
                } catch {}
                item.addClass('dayble-dragging');
            };
            item.ondragend = () => {
                console.log('[Dayble] Drag ended from holder');
                item.removeClass('dayble-dragging');
                const di = (item as any).__dragImg as HTMLElement | undefined;
                if (di && di.parentElement) di.remove();
                (item as any).__dragImg = undefined;
                this.isDragging = false;
            };
            list.appendChild(item);
        });
        // Enable reordering inside holder list with drop indicators
        list.ondragover = (e) => {
            e.preventDefault();
            const targetEvent = (e.target as HTMLElement).closest('.dayble-event') as HTMLElement | null;
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
        list.ondragleave = (e) => {
            if (e.target === list) list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
        };
        list.ondrop = async (e) => {
            e.preventDefault();
            list.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
            const id = e.dataTransfer?.getData('text/plain');
            const src = e.dataTransfer?.getData('dayble-source');
            if (!id || src !== 'holder') return;
            const draggedEl = document.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
            if (!draggedEl) return;
            const draggedContainer = draggedEl.closest('.dayble-holder-list') as HTMLElement | null;
            if (draggedContainer !== list) return;
            const targetEvent = (e.target as HTMLElement).closest('.dayble-event') as HTMLElement | null;
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
                const eid = (el as HTMLElement).dataset.id!;
                const found = this.holderEvents.find(ev => ev.id === eid);
                if (found) reordered.push(found);
            });
            this.holderEvents = reordered;
            await this.saveAllEntries();
        };
    }

    async openEventModal(id?: string, date?: string, endDate?: string) {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }
        const existing = id ? (this.events.find(e => e.id === id) ?? this.holderEvents.find(e => e.id === id)) : undefined;
        const fromHolder = !!(existing && this.holderEvents.some(e => e.id === existing.id));
        const modal = new EventModal(this.app, existing, date, endDate, async result => {
            console.log('[Dayble] Modal submitted with result:', result);
            const isMulti = !!(result.startDate && result.endDate);
            const isSingle = !!result.date || (!!result.startDate && !result.endDate);
            console.log('[Dayble] Event type - isMulti:', isMulti, 'isSingle:', isSingle);
            if (existing) {
                console.log('[Dayble] Updating existing event:', existing.id);
                Object.assign(existing, result);
            } else {
                const ev: DaybleEvent = { id: randomId(), ...result } as DaybleEvent;
                console.log('[Dayble] Creating new event:', ev.id, 'type:', isMulti ? 'multi-day' : isSingle ? 'single-day' : 'holder');
                if (isMulti || isSingle) {
                    this.events.push(ev);
                    console.log('[Dayble] Added to events array. Total events:', this.events.length);
                } else {
                    this.holderEvents.push(ev);
                    console.log('[Dayble] Added to holder. Total holder events:', this.holderEvents.length);
                }
            }
            try {
                console.log('[Dayble] Saving all entries...');
                await this.saveAllEntries();
                console.log('[Dayble] Save completed');
            } catch (e) {
                console.error('[Dayble] Save failed:', e);
            }
            this.renderHolder();
            this.render();
            if (this.currentTodayModal) {
                this.currentTodayModal.events = this.events;
                this.currentTodayModal.onOpen();
            }
        }, async () => {
            if (existing) {
                console.log('[Dayble] Deleting event:', existing.id);
                if (fromHolder) {
                    this.holderEvents = this.holderEvents.filter(e => e.id !== existing.id);
                } else {
                    this.events = this.events.filter(e => e.id !== existing.id);
                }
                await this.saveAllEntries();
                this.render();
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
            picker.open();
        });
        (modal as any).categories = this.plugin.settings.eventCategories || [];
        (modal as any).plugin = this.plugin;
        modal.open();
    }

    openTodayModal(date: string) {
        const modal = new TodayModal(this.app, date, this.events, this);
        this.currentTodayModal = modal;
        modal.onClose = () => { this.currentTodayModal = undefined; };
        modal.open();
    }
}

class EventModal extends Modal {
    ev?: DaybleEvent;
    date?: string;
    endDate?: string;
    onSubmit: (ev: Partial<DaybleEvent>) => Promise<void>;
    onDelete: () => Promise<void>;
    onPickIcon: () => Promise<void>;
    icon?: string;
    iconBtnEl?: HTMLButtonElement;
    selectedColor?: string;
    selectedTextColor?: string;

    constructor(app: App, ev: DaybleEvent | undefined, date: string | undefined, endDate: string | undefined, onSubmit: (ev: Partial<DaybleEvent>) => Promise<void>, onDelete: () => Promise<void>, onPickIcon: () => Promise<void>) {
        super(app);
        this.ev = ev;
        this.date = date;
        this.endDate = endDate;
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;
        this.onPickIcon = onPickIcon;
        this.icon = ev?.icon;
        this.selectedColor = ev?.color;
        this.selectedTextColor = ev?.textColor;
    }

    setIcon(icon: string) { this.icon = icon; if (this.iconBtnEl) setIcon(this.iconBtnEl, icon); }

    onOpen() {
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
        setIcon(iconBtn, this.icon ?? 'plus');
        iconBtn.onclick = () => this.onPickIcon();
        this.iconBtnEl = iconBtn;
        const titleInput = row1.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Event title', autofocus: 'true' } });
        titleInput.addClass('db-input');
        titleInput.value = this.ev?.title ?? '';
        const focusTitle = () => { try { titleInput.focus({ preventScroll: true }); } catch {} };
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
            const match = val.match(/\[\[([^\[\]]*?)$/);
            if (!match) return;
            const query = match[1].toLowerCase();
            const files = this.app.vault.getFiles()
                .filter((f: any) => f.name && f.name.toLowerCase().includes(query) && !f.name.startsWith('.'))
                .slice(0, 10);
            if (files.length === 0) return;
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
            files.forEach((file: any, i: number) => {
                const item = document.createElement('div');
                item.textContent = file.name;
                item.style.padding = '8px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid var(--background-modifier-border)';
                if (i === 0) { item.classList.add('is-selected'); item.style.backgroundColor = 'var(--background-primary-alt)'; }
                item.onmouseenter = () => { item.style.backgroundColor = 'var(--background-primary-alt)'; };
                item.onmouseleave = () => { if (!item.classList.contains('is-selected')) item.style.backgroundColor = 'transparent'; };
                item.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = target.value;
                    const beforeMatch = text.substring(0, text.lastIndexOf('[['));
                    target.value = beforeMatch + '[[' + file.name + ']]';
                    closeSuggestions();
                };
                suggestionContainer!.appendChild(item);
            });
            document.body.appendChild(suggestionContainer);
            const rect = target.getBoundingClientRect();
            suggestionContainer.style.left = Math.round(rect.left) + 'px';
            suggestionContainer.style.top = Math.round(rect.top + rect.height) + 'px';
        };
        const moveSuggestionSelection = (dir: 1 | -1) => {
            if (!suggestionContainer) return;
            const items = Array.from(suggestionContainer.children) as HTMLElement[];
            items.forEach(i => { i.classList.remove('is-selected'); i.style.backgroundColor = 'transparent'; });
            suggestionSelectedIndex = Math.max(0, Math.min(items.length - 1, suggestionSelectedIndex + dir));
            const sel = items[suggestionSelectedIndex];
            if (sel) { sel.classList.add('is-selected'); sel.style.backgroundColor = 'var(--background-primary-alt)'; }
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
                document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                defaultSwatch.addClass('dayble-color-swatch-selected');
            };
            if (!this.selectedColor) defaultSwatch.addClass('dayble-color-swatch-selected');
            
            const settings = (this as any).plugin?.settings;
            const builtSwatches = (settings?.swatches ?? []).map((s: any) => ({ color: s.color, textColor: s.textColor }));
            const customSwatches = (settings?.userCustomSwatches ?? []).map((s: any) => ({ color: s.color, textColor: s.textColor }));
            let swatches: Array<{ color: string, textColor?: string }> = builtSwatches;
            if (settings?.customSwatchesEnabled) {
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
                if (this.selectedColor === color) swatch.addClass('dayble-color-swatch-selected');
            });
            return colorRow;
        };
        
        // Add color swatches under title if setting says so
        let colorRow: HTMLElement | undefined;
        const colorSwatchPos = (this as any).plugin?.settings?.colorSwatchPosition ?? 'under-title';
        if (colorSwatchPos === 'under-title') {
            colorRow = createColorRow();
        }
        
        const ruleRow = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        ruleRow.addClass('db-modal-row');
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.addClass('db-label');
        categoryLabel.style.textAlign = 'center';
        let selectedCategoryId = this.ev?.categoryId;
        const categorySelect = ruleRow.createEl('select', { cls: 'dayble-input dayble-category-select' });
        categorySelect.addClass('db-select');
        const emptyOpt = categorySelect.createEl('option'); emptyOpt.value=''; emptyOpt.text='Default';
        const categories = (this as any).categories || [];
        categories.forEach((c: EventCategory) => { const opt = categorySelect.createEl('option'); opt.value = c.id; opt.text = c.name; });
        categorySelect.value = selectedCategoryId ?? '';
        
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
        startTime.value = this.ev?.time?.split('-')[0] ?? '';
        const startDate = row2.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.addClass('db-input');
        startDate.value = this.ev?.date ?? this.ev?.startDate ?? this.date ?? '';
        
        // End time/date row (only for multi-day events)
        let endTime: HTMLInputElement | undefined;
        let endDateInput: HTMLInputElement | undefined;
        if (isMultiDay) {
            const row3 = c.createDiv({ cls: 'dayble-modal-row' });
            row3.addClass('db-modal-row');
            endTime = row3.createEl('input', { type: 'time', cls: 'dayble-input' });
            endTime.addClass('db-input');
            endTime.value = this.ev?.time?.split('-')[1] ?? '';
            endDateInput = row3.createEl('input', { type: 'date', cls: 'dayble-input' });
            endDateInput.addClass('db-input');
            endDateInput.value = this.endDate ?? '';
        }
        
        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.addClass('db-textarea');
        descInput.value = this.ev?.description ?? '';
        
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
            setIcon(del, 'trash-2');
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
            const payload: Partial<DaybleEvent> = {
                title: titleInput.value,
                description: descInput.value,
                icon: this.icon,
                categoryId: selectedCategoryId,
                color: this.selectedColor,
                textColor: this.selectedTextColor
            };
            if (!payload.categoryId) {
                const triggers = (this as any).plugin?.settings?.triggers || [];
                const txt = ((payload.title || '') + ' ' + (payload.description || '')).toLowerCase();
                const found = triggers.find((t: any) => (t.pattern || '').toLowerCase() && txt.includes((t.pattern || '').toLowerCase()));
                if (found && found.categoryId) payload.categoryId = found.categoryId;
            }
            
            if (isMultiDay && endTime && endDateInput) {
                // Multi-day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.startDate = startDate.value || this.ev?.startDate || undefined;
                payload.endDate = endDateInput.value || this.ev?.endDate || undefined;
            } else {
                // Single day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime?.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                const fallbackDate = this.ev?.date || this.ev?.startDate || this.date || undefined;
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
                new Notice('Error saving event: ' + (e instanceof Error ? e.message : String(e)));
            });
        };
        // Prevent modal open when clicking markdown links inside event items; open note in new tab
        this.contentEl.addEventListener('click', (ev) => {
            const a = (ev.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (leaf as any).openFile?.(file);
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
        setIcon(removeIcon, 'x');
        removeIcon.style.display = 'inline-flex';
        removeBtn.onclick = () => { if (this.onRemove) this.onRemove(); this.close(); };
        
        // Load icons lazily
        if (!this.allIcons.length) {
            this.allIcons = getIconIdsSafe();
        }
        
        let filtered = this.allIcons.slice(0, 96); // Only show first 100 initially
        let fullFiltered = this.allIcons.slice();
        
        const renderList = (icons: string[]) => {
            list.empty();
            icons.slice(0, 200).forEach(id => {
                const btn = list.createEl('button', { cls: 'dayble-icon-btn' });
                btn.addClass('db-icon-btn');
                btn.style.padding = '6px';
                btn.title = id;
                setIcon(btn, id);
                btn.onclick = () => { this.onPick(id); this.close(); };
            });
        };
        
        const applyFilter = () => {
            const q = (searchInput.value || '').toLowerCase();
            if (!q) {
                fullFiltered = this.allIcons.slice(0, 150);
            } else {
                fullFiltered = this.allIcons.filter(id => id.toLowerCase().includes(q));
            }
            renderList(fullFiltered);
        };
        
        searchInput.oninput = applyFilter;
        renderList(filtered);
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
        } catch {}
    }
    onOpen() {
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
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { this.selectedIndex = Math.min(this.results.length - 1, this.selectedIndex + 1); render(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { this.selectedIndex = Math.max(0, this.selectedIndex - 1); render(); e.preventDefault(); }
            else if (e.key === 'Enter') { this.choose(this.selectedIndex); e.preventDefault(); }
            else if (e.key === 'Escape') { this.close(); e.preventDefault(); }
        };
        input.oninput = update;
        input.onkeydown = onKey;
        input.focus();
        update();
    }
    choose(idx: number) {
        const ev = this.results[idx];
        if (!ev) return;
        const dateStr = ev.date || ev.startDate;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            this.view.currentDate = new Date(y, (m || 1) - 1, d || 1);
            this.view.render();
            setTimeout(() => {
                const nodes = Array.from(this.view.containerEl.querySelectorAll(`.dayble-event[data-id="${ev.id}"]`)) as HTMLElement[];
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
    
    constructor(app: App, date: string, events: DaybleEvent[], view?: DaybleCalendarView) {
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
        } else {
            dayEvents.forEach(ev => {
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
                renderMarkdown(ev.title || '', titleEl, this.view?.plugin?.app);
                
                // Apply event colors if available
                const plugin = this.view?.plugin;
                const categories = plugin?.settings?.eventCategories ?? [];
                const category = categories.find(c => c.id === ev.categoryId);
                let bgColor = '';
                let textColor = '';
                if (ev.color) {
                    bgColor = ev.color;
                    textColor = ev.textColor || chooseTextColor(ev.color);
                } else if (category && category.bgColor) {
                    bgColor = category.bgColor;
                    textColor = category.textColor;
                }
                if (bgColor) {
                    const opacity = plugin?.settings?.eventBgOpacity ?? 1;
                    const rgbaColor = hexToRgba(bgColor, opacity);
                    row.style.backgroundColor = rgbaColor;
                    titleEl.style.color = textColor || titleEl.style.color;
                    row.classList.add('dayble-event-colored');
                }
                if (category) {
                    if (category.effect && category.effect !== '') row.addClass(`dayble-effect-${category.effect}`);
                    const onlyToday = plugin?.settings?.onlyAnimateToday ?? false;
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
                    const fmt = this.view?.plugin?.settings?.timeFormat ?? '24h';
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
                    renderMarkdown(ev.description, descEl, this.view?.plugin?.app);
                }
                
                // Optional completed indicator
                if (ev.completed) {
                    const behavior = this.view?.plugin?.settings?.completeBehavior ?? 'none';
                    if (behavior === 'dim') row.style.opacity = '0.6';
                    else if (behavior === 'strikethrough') titleEl.style.textDecoration = 'line-through';
                    else if (behavior === 'hide') row.style.display = 'none';
                }
                
                eventsContainer.appendChild(row);
                // Drag handlers for reordering
                row.ondragstart = e => {
                    e.dataTransfer?.setData('text/plain', ev.id);
                    (e.dataTransfer as DataTransfer)?.setData('dayble-source','today');
                    try {
                        const dragImg = row.cloneNode(true) as HTMLElement;
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
                        e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                        (row as any).__dragImg = dragImg;
                    } catch {}
                    row.addClass('dayble-dragging');
                };
                row.ondragend = () => {
                    row.removeClass('dayble-dragging');
                    const di = (row as any).__dragImg as HTMLElement | undefined;
                    if (di && di.parentElement) di.remove();
                    (row as any).__dragImg = undefined;
                };
                // Click to edit
                row.onclick = (e) => {
                    e.stopPropagation();
                    this.view?.openEventModal(ev.id, ev.date ?? this.date);
                };
                // Right-click context menu
                row.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menu = new Menu();
                    menu.addItem(i => i.setTitle('Duplicate').setIcon('copy').onClick(() => {
                        const newEv: DaybleEvent = { ...ev, id: randomId() };
                        if (this.view) {
                            this.view.events.push(newEv);
                            this.view.saveAllEntries().then(() => this.view?.render());
                        }
                    }));
                    menu.addItem(i => i.setTitle(ev.completed ? 'Mark incomplete' : 'Mark complete').setIcon('check').onClick(() => {
                        ev.completed = !ev.completed;
                        if (this.view) this.view.saveAllEntries().then(() => this.view?.render());
                    }));
                    menu.addItem(i => i.setTitle('Delete').setIcon('trash').onClick(() => {
                        if (this.view) {
                            this.view.events = this.view.events.filter(e2 => e2.id !== ev.id);
                            this.view.saveAllEntries().then(() => this.view?.render());
                        }
                    }));
                    menu.showAtMouseEvent(e);
                };
            });
            // Enable reordering in today modal
            eventsContainer.ondragover = (e) => {
                e.preventDefault();
                const targetRow = (e.target as HTMLElement).closest('.dayble-today-event-row') as HTMLElement | null;
                const rowsCount = eventsContainer.querySelectorAll('.dayble-today-event-row').length;
                if (targetRow && rowsCount > 1) {
                    const rect = targetRow.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const h = rect.height;
                    eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                    const indicator = document.createElement('div');
                    indicator.className = 'dayble-drop-indicator';
                    if (relativeY < h / 2) {
                        targetRow.parentElement?.insertBefore(indicator, targetRow);
                    } else {
                        targetRow.after(indicator);
                    }
                }
            };
            eventsContainer.ondragleave = (e) => {
                if (e.target === eventsContainer) eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
            };
            eventsContainer.ondrop = async (e) => {
                e.preventDefault();
                eventsContainer.querySelectorAll('.dayble-drop-indicator').forEach(el => el.remove());
                const id = e.dataTransfer?.getData('text/plain');
                const src = e.dataTransfer?.getData('dayble-source');
                if (!id) return;
                const draggedEl = eventsContainer.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
                if (!draggedEl) return;
                const targetRow = (e.target as HTMLElement).closest('.dayble-today-event-row') as HTMLElement | null;
                if (!targetRow || targetRow === draggedEl) return;
                const rect = targetRow.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const h = rect.height;
                if (relativeY < h / 2) {
                    eventsContainer.insertBefore(draggedEl, targetRow);
                } else {
                    targetRow.after(draggedEl);
                }
                if (!targetRow) {
                    eventsContainer.appendChild(draggedEl);
                }
                // Persist order for this date
                if (this.view) {
                    const date = this.date;
                    const dayIds: string[] = [];
                    eventsContainer.querySelectorAll('.dayble-today-event-row').forEach(el => {
                        const eid = (el as HTMLElement).dataset.id!;
                        dayIds.push(eid);
                    });
                    const original = this.view.events.filter(ev => ev.date === date);
                    const others = this.view.events.filter(ev => ev.date !== date);
                    const reorderedDay = dayIds.map(id => original.find(e => e.id === id)!).filter(Boolean);
                    this.view.events = others.concat(reorderedDay);
                    await this.view.saveAllEntries();
                    this.view.render();
                }
            };
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
            this.close();
            this.view?.openEventModal(undefined, this.date);
        };
        
        // Enable internal link clicks inside today modal content
        this.contentEl.addEventListener('click', (ev) => {
            const a = (ev.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
            if (!a) return;
            const wiki = a.getAttribute('data-href');
            if (wiki) {
                ev.preventDefault();
                ev.stopPropagation();
                const file = resolveNoteFile(this.app, wiki);
                if (file) {
                    const leaf = this.app.workspace.getLeaf(true);
                    (leaf as any).openFile?.(file);
                }
            }
        }, { capture: true });
    }
}

class StorageFolderNotSetModal extends Modal {
    constructor(app: App) {
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
            try { 
                const s = (this.app as any).setting;
                s?.open?.();
                s?.openTabById?.('dayble-calendar');
            } catch {}
            this.close();
        };
        const closeBtn = btns.createEl('button', { cls: 'dayble-btn' });
        closeBtn.setText('Close');
        closeBtn.onclick = () => this.close();
    }
}

class ConfirmModal extends Modal {
    message: string;
    onConfirm: () => void;
    constructor(app: App, message: string, onConfirm: () => void) {
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
        ok.onclick = () => { try { this.onConfirm(); } finally { this.close(); } };
    }
}

function getIconIdsSafe(): string[] {
    const anyOb = (window as any).obsidian;
    const api = (apiName: string) => (require?.('obsidian') as any)?.[apiName] ?? anyOb?.[apiName];
    const ids = api('getIconIds');
    if (typeof ids === 'function') return ids();
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

function formatTimeValue(value: string | undefined, fmt: '24h' | '12h'): string {
    if (!value) return '';
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

function formatTimeRange(range: string | undefined, fmt: '24h' | '12h'): string {
    if (!range) return '';
    const parts = range.split('-');
    if (parts.length === 2) {
        const s = formatTimeValue(parts[0], fmt);
        const e = formatTimeValue(parts[1], fmt);
        if (s && e) return `${s}-${e}`;
        return s || e || '';
    }
    return formatTimeValue(parts[0], fmt);
}

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

function resolveImagePath(imagePath: string, app: App): string {
    const raw = String(imagePath || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof TFile) return app.vault.getResourcePath(byPath);
    const files = app.vault.getFiles();
    const extTarget = target.endsWith('.md') ? target.slice(0, -3) : target;
    const found = files.find((f: any) => f.path.endsWith(target))
        || files.find((f: any) => f.name === target)
        || files.find((f: any) => f.basename === extTarget)
        || files.find((f: any) => f.path.endsWith(`${extTarget}.md`));
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
    const found = files.find((f: any) => f.path.endsWith(target))
        || files.find((f: any) => f.name === target)
        || files.find((f: any) => f.basename === withoutMd)
        || files.find((f: any) => f.path.endsWith(`${withoutMd}.md`));
    return found || null;
}

class DaybleSettingTab extends PluginSettingTab {
    plugin: DaybleCalendarPlugin;
    constructor(app: App, plugin: DaybleCalendarPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h1', { text: 'Dayble Calendar' });
        // containerEl.createEl('h3', { text: 'General' });
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
                        view?.render();
                    });
            });
        new Setting(containerEl)
            .setName('Storage folder')
            .setDesc('Folder to store calendar events. Data is stored in JSON files.')
            .addButton(b => {
                b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'unset')
                    .onClick(() => {
                        const folders = this.app.vault.getAllFolders()
                            .map(f => f.path)
                            .sort();
                        const FuzzySuggest = (require('obsidian') as any).FuzzySuggestModal;
                        const suggest = new FuzzySuggest(this.app);
                        suggest.setPlaceholder('Select storage folder...');
                        suggest.getSuggestions = (q: string) => {
                            if (!q) return folders;
                            return folders.filter(f => f.toLowerCase().includes(q.toLowerCase()));
                        };
                        suggest.renderSuggestion = (folder: string, el: HTMLElement) => {
                            el.setText(folder || '(Vault root)');
                        };
                        suggest.onChooseSuggestion = async (folder: string) => {
                            this.plugin.settings.entriesFolder = folder || '';
                            await this.plugin.saveSettings();
                            await this.plugin.ensureEntriesFolder();
                            b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'unset');
                            const view = this.plugin.getCalendarView();
                            if (view) {
                                await view.loadAllEntries();
                                view.render();
                            }
                        };
                        suggest.open();
                    });
            });
        new Setting(containerEl)
            .setName('Time format')
            .setDesc('Display times in 24h or 12h format')
            .addDropdown(d => {
                d.addOption('24h', '24-hour')
                    .addOption('12h', '12-hour')
                    .setValue(this.plugin.settings.timeFormat ?? '24h')
                    .onChange(async v => {
                        this.plugin.settings.timeFormat = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });

        containerEl.createEl('h3', { text: 'Appearance' });

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
                    .setValue(this.plugin.settings.iconPlacement ?? 'left')
                    .onChange(async v => {
                        this.plugin.settings.iconPlacement = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Event title alignment')
            .setDesc('Alignment of event titles')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .setValue(this.plugin.settings.eventTitleAlign ?? 'left')
                    .onChange(async v => {
                        this.plugin.settings.eventTitleAlign = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });
        new Setting(containerEl)
            .setName('Event description alignment')
            .setDesc('Alignment of event descriptions')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .setValue(this.plugin.settings.eventDescAlign ?? 'left')
                    .onChange(async v => {
                        this.plugin.settings.eventDescAlign = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });
        
            new Setting(containerEl)
                .setName('Event background opacity')
                .setDesc('Controls transparency of event backgrounds.')
                .addSlider(s => {
                    s.setLimits(0, 1, 0.1)
                        .setValue(this.plugin.settings.eventBgOpacity ?? 1)
                        .onChange(async v => {
                            this.plugin.settings.eventBgOpacity = v;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view?.render();
                        })
                        .setDynamicTooltip();
                });
        new Setting(containerEl)
            .setName('Event border thickness')
            .setDesc('Controls event border thickness (0-5px)')
            .addSlider(s => {
                s.setLimits(0, 5, 0.5)
                    .setValue(this.plugin.settings.eventBorderWidth ?? 2)
                    .onChange(async v => {
                        this.plugin.settings.eventBorderWidth = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border radius')
            .setDesc('Controls event corner roundness (px)')
            .addSlider(s => {
                s.setLimits(0, 24, 1)
                    .setValue(this.plugin.settings.eventBorderRadius ?? 6)
                    .onChange(async v => {
                        this.plugin.settings.eventBorderRadius = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
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
                        .setValue(this.plugin.settings.completeBehavior ?? 'none')
                        .onChange(async v => {
                            this.plugin.settings.completeBehavior = v as any;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view?.render();
                        });
                });
            new Setting(containerEl)
                .setName(`Only animate today's events`)
                .setDesc('Stop animation for all events except today')
                .addToggle(t => {
                    t.setValue(this.plugin.settings.onlyAnimateToday ?? false)
                        .onChange(async v => {
                            this.plugin.settings.onlyAnimateToday = v;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view?.render();
                        });
                });

        new Setting(containerEl)
            .setName('Holder placement')
            .setDesc('Place the Holder toggle (left, right, or hidden)')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                 .addOption('right', 'Right')
                 .addOption('hidden', 'Hidden')
                 .setValue(this.plugin.settings.holderPlacement ?? 'left')
                 .onChange(async v => {
                    this.plugin.settings.holderPlacement = v as any;
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) {
                        // Clear the container and rebuild
                        view.containerEl.empty();
                        await view.onOpen();
                    }
                 });
            });
            
        new Setting(containerEl)
            .setName('Max day cell height (px)')
            .setDesc('If set, day cells cap at this height and events scroll vertically')
            .addText(t => {
                t.setPlaceholder('0 (disabled)');
                t.setValue(String(this.plugin.settings.dayCellMaxHeight ?? 0));
                t.onChange(async v => {
                    const num = parseInt(v || '0', 10);
                    this.plugin.settings.dayCellMaxHeight = isNaN(num) ? 0 : Math.max(0, num);
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    view?.render();
                });
                (t.inputEl as HTMLInputElement).type = 'number';
                (t.inputEl as HTMLInputElement).min = '0';
            });
            new Setting(containerEl)
                .setName('Color swatch position')
                .setDesc('Position of color swatches in event modal')
                .addDropdown(d => {
                    d.addOption('under-title', 'Under title')
                        .addOption('under-description', 'Under description')
                        .addOption('none', 'Do not show')
                        .setValue(this.plugin.settings.colorSwatchPosition ?? 'under-title')
                        .onChange(async v => {
                            this.plugin.settings.colorSwatchPosition = v as any;
                            await this.plugin.saveSettings();
                        });
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
            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' as const }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' as const }));
            const combined: { name: string, color: string, textColor: string, source: 'built'|'custom' }[] = [...built, ...customs];
            const makeItem = (entry: { name: string, color: string, textColor: string, source: 'built'|'custom' }, idx: number) => {
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
                const updateAll = async () => {
                    const newBuilt: { name: string, color: string, textColor?: string }[] = [];
                    const newCustom: { name: string, color: string, textColor?: string }[] = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                        const src = (w as HTMLElement).dataset.source;
                        const nm = (w as HTMLElement).dataset.name || '';
                        const bg = (w.querySelectorAll('input[type="color"]')[1] as HTMLInputElement).value;
                        const tx = (w.querySelectorAll('input[type="color"]')[0] as HTMLInputElement).value;
                        if (src === 'built') newBuilt.push({ name: nm, color: bg, textColor: tx });
                        else newCustom.push({ name: '', color: bg, textColor: tx });
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    view?.render();
                };
                textPicker.onchange = updateAll;
                bgPicker.onchange = updateAll;
                const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                (del as HTMLButtonElement).style.background = 'none';
                (del as HTMLButtonElement).style.boxShadow = 'none';
                (del as HTMLButtonElement).style.border = 'none';
                (del as HTMLButtonElement).style.padding = '2px 4px';
                setIcon(del, 'x');
                del.setAttr('draggable','false');
                del.onmousedown = (e) => { e.stopPropagation(); };
                del.ontouchstart = (e) => { e.stopPropagation(); };
                del.onclick = async () => {
                    const modal = new ConfirmModal(this.app, 'Delete this color swatch?', async () => {
                        wrap.remove();
                        await updateAll();
                    });
                    modal.open();
                };
                wrap.ondragstart = e => {
                    e.dataTransfer?.setData('text/plain', 'drag');
                    (e.dataTransfer as DataTransfer).effectAllowed = 'move';
                };
                row.ondragover = e => { e.preventDefault(); };
                row.ondrop = async e => {
                    e.preventDefault();
                    const target = (e.target as HTMLElement).closest('div[draggable="true"]') as HTMLElement | null;
                    if (!target || target.parentElement !== row) return;
                    const rect = target.getBoundingClientRect();
                    const before = (e.clientX - rect.left) < rect.width / 2;
                    if (before) row.insertBefore(wrap, target);
                    else target.after(wrap);
                    await updateAll();
                };
                return wrap;
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new Setting(colorsListTop);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.style.display = 'flex';
            (controlsBottom.settingEl as HTMLElement).style.alignItems = 'center';
            (controlsBottom.settingEl as HTMLElement).style.gap = '8px';
            (controlsBottom.settingEl as HTMLElement).style.width = '100%';
            (controlsBottom.settingEl as HTMLElement).style.justifyContent = 'flex-start';
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to Default Colors').onClick(async () => {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', async () => {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: (s as any).textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        await this.plugin.saveSettings();
                        renderColorsTop();
                    });
                    modal.open();
                });
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ Add Color').onClick(async () => {
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
                    (del as HTMLButtonElement).style.background = 'none';
                    (del as HTMLButtonElement).style.boxShadow = 'none';
                    (del as HTMLButtonElement).style.border = 'none';
                    (del as HTMLButtonElement).style.padding = '2px 4px';
                    setIcon(del, 'x');
                    del.setAttr('draggable','false');
                    del.onmousedown = (e) => { e.stopPropagation(); };
                    del.ontouchstart = (e) => { e.stopPropagation(); };
                    const updateAll = async () => {
                        const newBuilt: { name: string, color: string, textColor?: string }[] = [];
                        const newCustom: { name: string, color: string, textColor?: string }[] = [];
                        colorsListTop.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                            const src = (w as HTMLElement).dataset.source;
                            const nm = (w as HTMLElement).dataset.name || '';
                            const bg = (w.querySelectorAll('input[type="color"]')[1] as HTMLInputElement).value;
                            const tx = (w.querySelectorAll('input[type="color"]')[0] as HTMLInputElement).value;
                            if (src === 'built') newBuilt.push({ name: nm, color: bg, textColor: tx });
                            else newCustom.push({ name: '', color: bg, textColor: tx });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        await this.plugin.saveSettings();
                        const prevBuilt = (this.plugin.settings.swatches || []);
                        const prevByName = new Map<string, { name: string, color: string, textColor?: string }>();
                        prevBuilt.forEach(s => prevByName.set(s.name, { name: s.name, color: s.color, textColor: s.textColor }));
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            const root = view.containerEl;
                            newBuilt.forEach(nb => {
                                const prev = prevByName.get(nb.name);
                                if (!prev) return;
                                const changed = prev.color !== nb.color || (prev.textColor || '') !== (nb.textColor || '');
                                if (!changed) return;
                                const rgba = hexToRgba(nb.color, this.plugin.settings.eventBgOpacity ?? 1);
                                root.querySelectorAll(`.dayble-event[data-color="${prev.color}"]`).forEach(el => {
                                    const h = el as HTMLElement;
                                    h.style.setProperty('--event-bg-color', rgba);
                                    h.style.setProperty('--event-text-color', nb.textColor || chooseTextColor(nb.color));
                                    h.dataset.color = nb.color;
                                    h.classList.add('dayble-event-colored');
                                });
                            });
                        }
                    };
                    textPicker.onchange = updateAll;
                    bgPicker.onchange = updateAll;
                    del.onclick = async () => {
                        const modal = new ConfirmModal(this.app, 'Delete this color swatch?', async () => {
                            wrap.remove();
                            await updateAll();
                        });
                        modal.open();
                    };
                });
            });
        };
        renderColorsTop();
        containerEl.createEl('h4', { text: 'Event Categories' });
        const rulesWrap = containerEl.createDiv();
        const renderRules = () => {
            rulesWrap.empty();
            (this.plugin.settings.eventCategories || []).forEach((category: EventCategory) => {
                const row = new Setting(rulesWrap);
                // Remove the left-side setting title element
                row.settingEl.querySelector('.setting-item-name')?.remove();
                row.settingEl.style.display = 'flex';
                (row.settingEl as HTMLElement).style.gridTemplateColumns = 'unset';
                row.controlEl.style.display = 'flex';
                (row.controlEl as HTMLElement).style.gap = '8px';
                row.controlEl.style.flex = '1';
                row.settingEl.classList.add('db-category-row');
                // Icon button
                row.addButton(b => {
                    (b.buttonEl as HTMLButtonElement).classList.add('dayble-btn','dayble-icon-add','db-btn');
                    setIcon(b.buttonEl, category.icon ?? 'plus');
                    b.onClick(() => {
                        const picker = new IconPickerModal(this.app, async (icon) => {
                            category.icon = icon;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view?.render();
                            renderRules();
                        }, async () => {
                            category.icon = undefined;
                            await this.plugin.saveSettings();
                            const view = this.plugin.getCalendarView();
                            view?.render();
                            renderRules();
                        });
                        picker.open();
                    });
                });
                // Category name input
                row.addText(t => { t.setValue(category.name).onChange(v => { category.name = v; }); (t.inputEl as HTMLInputElement).classList.add('db-input','db-category-name'); });
                // Text color first
                row.addColorPicker(cp => { cp.setValue(category.textColor).onChange(v => { 
                    category.textColor = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }); (cp as any).inputEl?.classList?.add('db-color','db-text-color'); });
                // Background color next
                row.addColorPicker(cp => { cp.setValue(category.bgColor).onChange(v => { 
                    category.bgColor = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }); (cp as any).inputEl?.classList?.add('db-color','db-bg-color'); });
                row.addDropdown(d => { d.addOptions({
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
                        if (view) view.render();
                    });
                }); (d.selectEl as HTMLSelectElement).classList.add('db-select','db-effect'); });
                row.addDropdown(d => { d.addOptions({
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
                        if (view) view.render();
                    });
                }); (d.selectEl as HTMLSelectElement).classList.add('db-select','db-animation'); });
                row.addDropdown(d => { d.addOptions({
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
                        if (view) view.render();
                    });
                }); (d.selectEl as HTMLSelectElement).classList.add('db-select','db-animation2'); });
                row.addExtraButton(btn => { btn.setIcon('x').setTooltip('Delete').onClick(() => { this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).filter(c => c.id !== category.id); renderRules(); }); (btn as any).extraButtonEl?.classList?.add('db-btn','db-delete-category'); });
            });
        };
        new Setting(containerEl).addButton(b => {
            b.setButtonText('+ Add Category');
            (b.buttonEl as HTMLButtonElement).addClass('mod-cta');
            b.onClick(async () => {
                const category: EventCategory = { id: randomId(), name: 'New Category', bgColor: '#8392a4', textColor: '#ffffff', effect: 'embossed', animation: '', animation2: '', icon: undefined };
                this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).concat(category);
                await this.plugin.saveSettings();
                renderRules();
            });
        });
        renderRules();

        const triggersTitle = containerEl.createEl('h4', { text: 'Triggers' });
        const triggersWrap = containerEl.createDiv();
        const renderTriggers = () => {
            triggersWrap.empty();
            const items = this.plugin.settings.triggers || [];
            items.forEach((tr, idx) => {
                const row = new Setting(triggersWrap);
                row.settingEl.querySelector('.setting-item-name')?.remove();
                row.settingEl.classList.add('db-triggers-row');
                row.controlEl.style.display = 'flex';
                (row.controlEl as HTMLElement).style.gap = '8px';
                (row.controlEl as HTMLElement).style.flex = '1';
                row.addText(t => {
                    t.setPlaceholder('Text in title or description');
                    t.setValue(tr.pattern);
                    t.onChange(async v => {
                        items[idx].pattern = v || '';
                        this.plugin.settings.triggers = items;
                        await this.plugin.saveSettings();
                    });
                    (t.inputEl as HTMLInputElement).classList.add('db-input');
                    (t.inputEl as HTMLInputElement).style.flex = '1';
                });
                row.addDropdown(d => {
                    const cats = this.plugin.settings.eventCategories || [];
                    d.addOption('', 'Default');
                    cats.forEach(c => d.addOption(c.id, c.name));
                    d.setValue(tr.categoryId || '');
                    d.onChange(async v => {
                        items[idx].categoryId = v || '';
                        this.plugin.settings.triggers = items;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
                    (d.selectEl as HTMLSelectElement).classList.add('db-select');
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
            new Setting(triggersWrap).addButton(b => {
                b.setButtonText('+ Add Trigger').onClick(async () => {
                    const items2 = (this.plugin.settings.triggers || []).slice();
                    items2.push({ pattern: '', categoryId: '' });
                    this.plugin.settings.triggers = items2;
                    await this.plugin.saveSettings();
                    renderTriggers();
                });
            });
        };
        renderTriggers();

        // containerEl.createEl('h4', { text: 'Custom Swatches' });
        const swatchesSection = containerEl.createDiv();
        (swatchesSection as HTMLElement).style.display = 'none';
        new Setting(swatchesSection)
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
            const built = (this.plugin.settings.swatches || []).map(s => ({ name: s.name, color: s.color, source: 'built' as const }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map(s => ({ name: s.name || '', color: s.color || '#ff0000', source: 'custom' as const }));
            const combined: { name: string, color: string, source: 'built'|'custom' }[] = [...built, ...customs];
            const makeItem = (entry: { name: string, color: string, source: 'built'|'custom' }, idx: number) => {
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
                input.onchange = async () => {
                    const newBuilt: { name: string, color: string }[] = [];
                    const newCustom: { name: string, color: string }[] = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                        const src = (w as HTMLElement).dataset.source;
                        const nm = (w as HTMLElement).dataset.name || '';
                        const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                        if (src === 'built') newBuilt.push({ name: nm, color: val });
                        else newCustom.push({ name: '', color: val });
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                };
                const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                (del as HTMLButtonElement).style.background = 'none';
                (del as HTMLButtonElement).style.boxShadow = 'none';
                (del as HTMLButtonElement).style.border = 'none';
                (del as HTMLButtonElement).style.padding = '2px 4px';
                setIcon(del, 'x');
                del.setAttr('draggable','false');
                del.onmousedown = (e) => { e.stopPropagation(); };
                del.ontouchstart = (e) => { e.stopPropagation(); };
                del.onclick = async () => {
                    const modal = new ConfirmModal(this.app, 'Delete this color swatch?', async () => {
                        wrap.remove();
                        const newBuilt: { name: string, color: string }[] = [];
                        const newCustom: { name: string, color: string }[] = [];
                        row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                            const src = (w as HTMLElement).dataset.source;
                            const nm = (w as HTMLElement).dataset.name || '';
                            const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                            if (src === 'built') newBuilt.push({ name: nm, color: val });
                            else newCustom.push({ name: '', color: val });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        await this.plugin.saveSettings();
                    });
                    modal.open();
                };
                wrap.ondragstart = e => {
                    e.dataTransfer?.setData('text/plain', 'drag');
                    (e.dataTransfer as DataTransfer).effectAllowed = 'move';
                };
                row.ondragover = e => { e.preventDefault(); };
                row.ondrop = async e => {
                    e.preventDefault();
                    const target = (e.target as HTMLElement).closest('div[draggable="true"]') as HTMLElement | null;
                    if (!target || target.parentElement !== row) return;
                    const rect = target.getBoundingClientRect();
                    const before = (e.clientX - rect.left) < rect.width / 2;
                    if (before) row.insertBefore(wrap, target);
                    else target.after(wrap);
                    const newBuilt: { name: string, color: string }[] = [];
                    const newCustom: { name: string, color: string }[] = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                        const src = (w as HTMLElement).dataset.source;
                        const nm = (w as HTMLElement).dataset.name || '';
                        const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                        if (src === 'built') newBuilt.push({ name: nm, color: val });
                        else newCustom.push({ name: '', color: val });
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                };
                return wrap;
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new Setting(colorsList);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.style.display = 'flex';
            (controlsBottom.settingEl as HTMLElement).style.alignItems = 'center';
            (controlsBottom.settingEl as HTMLElement).style.gap = '8px';
            (controlsBottom.settingEl as HTMLElement).style.width = '100%';
            (controlsBottom.settingEl as HTMLElement).style.justifyContent = 'flex-start';
            controlsBottom.addButton(b => {
                b.setButtonText('Reset to Default Colors').onClick(async () => {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', async () => {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: (s as any).textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        await this.plugin.saveSettings();
                        renderColors();
                    });
                    modal.open();
                });
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ Add Color').onClick(async () => {
                    const wrap = row.createDiv();
                    wrap.style.display = 'flex';
                    wrap.style.alignItems = 'center';
                    wrap.style.gap = '6px';
                    wrap.setAttr('draggable', 'true');
                    wrap.dataset.source = 'custom';
                    wrap.dataset.name = '';
                    const input = wrap.createEl('input', { type: 'color' });
                    input.value = '#ff0000';
                    input.onchange = async () => {
                        const newBuilt: { name: string, color: string }[] = [];
                        const newCustom: { name: string, color: string }[] = [];
                        row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                            const src = (w as HTMLElement).dataset.source;
                            const nm = (w as HTMLElement).dataset.name || '';
                            const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                            if (src === 'built') newBuilt.push({ name: nm, color: val });
                            else newCustom.push({ name: '', color: val });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        await this.plugin.saveSettings();
                    };
                    const del = wrap.createEl('button', { cls: 'dayble-btn db-color-del' });
                    (del as HTMLButtonElement).style.background = 'none';
                    (del as HTMLButtonElement).style.boxShadow = 'none';
                    (del as HTMLButtonElement).style.border = 'none';
                    (del as HTMLButtonElement).style.padding = '2px 4px';
                    setIcon(del, 'x');
                    del.setAttr('draggable','false');
                    del.onmousedown = (e) => { e.stopPropagation(); };
                    del.ontouchstart = (e) => { e.stopPropagation(); };
                    del.onclick = async () => {
                        const modal = new ConfirmModal(this.app, 'Delete this color swatch?', async () => {
                            wrap.remove();
                            const newBuilt: { name: string, color: string }[] = [];
                            const newCustom: { name: string, color: string }[] = [];
                            row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                                const src = (w as HTMLElement).dataset.source;
                                const nm = (w as HTMLElement).dataset.name || '';
                                const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                                if (src === 'built') newBuilt.push({ name: nm, color: val });
                                else newCustom.push({ name: '', color: val });
                            });
                            this.plugin.settings.swatches = newBuilt;
                            this.plugin.settings.userCustomSwatches = newCustom;
                            await this.plugin.saveSettings();
                        });
                        modal.open();
                    };
                    wrap.ondragstart = e => {
                        e.dataTransfer?.setData('text/plain', 'drag');
                        (e.dataTransfer as DataTransfer).effectAllowed = 'move';
                    };
                    row.ondragover = e => { e.preventDefault(); };
                    row.ondrop = async e => {
                        e.preventDefault();
                        const target = (e.target as HTMLElement).closest('div[draggable="true"]') as HTMLElement | null;
                        if (!target || target.parentElement !== row) return;
                        const rect = target.getBoundingClientRect();
                        const before = (e.clientX - rect.left) < rect.width / 2;
                        if (before) row.insertBefore(wrap, target);
                        else target.after(wrap);
                        const newBuilt: { name: string, color: string }[] = [];
                        const newCustom: { name: string, color: string }[] = [];
                        row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                            const src = (w as HTMLElement).dataset.source;
                            const nm = (w as HTMLElement).dataset.name || '';
                            const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                            if (src === 'built') newBuilt.push({ name: nm, color: val });
                            else newCustom.push({ name: '', color: val });
                        });
                        this.plugin.settings.swatches = newBuilt;
                        this.plugin.settings.userCustomSwatches = newCustom;
                        await this.plugin.saveSettings();
                    };
                    const newBuilt: { name: string, color: string }[] = [];
                    const newCustom: { name: string, color: string }[] = [];
                    row.querySelectorAll('div[draggable="true"]').forEach((w: any) => {
                        const src = (w as HTMLElement).dataset.source;
                        const nm = (w as HTMLElement).dataset.name || '';
                        const val = (w.querySelector('input[type="color"]') as HTMLInputElement).value;
                        if (src === 'built') newBuilt.push({ name: nm, color: val });
                        else newCustom.push({ name: '', color: val });
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                });
                (b.buttonEl as HTMLButtonElement).style.marginLeft = 'auto';
            });
        };
        ;

        containerEl.createEl('h4', { text: 'Data Management' });
        new Setting(containerEl)
            .setName('Export Data')
            .addButton(b => {
                b.setButtonText('Export Data')
                 .onClick(async () => {
                    try {
                        const vaultName = (this.app.vault as any)?.getName?.() 
                            || (this.app.vault.adapter as any)?.basePath?.split(/[\\/]/).filter(Boolean).pop() 
                            || 'Vault';
                        const exportObj: any = {
                            vaultName,
                            exportedAt: new Date().toISOString(),
                            settings: this.plugin.settings,
                            months: [] as Array<{ file: string, data: any }>
                        };
                        const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                        let files: string[] = [];
                        try {
                            const listing = await this.app.vault.adapter.list(folder);
                            files = (listing.files || []).filter((f: string) => f.toLowerCase().endsWith('.json'));
                        } catch (_) {
                            files = [];
                        }
                        for (const f of files) {
                            try {
                                const txt = await this.app.vault.adapter.read(f);
                                const data = JSON.parse(txt);
                                exportObj.months.push({ file: f, data });
                            } catch (e) {}
                        }
                        const fname = `${folder}/DaybleExport_${vaultName}_${Date.now()}.json`;
                        await this.app.vault.adapter.write(fname, JSON.stringify(exportObj, null, 2));
                        new Notice(`Exported: ${fname}`);
                    } catch (e) {
                        new Notice('Export failed');
                    }
                 });
            });
        new Setting(containerEl)
            .setName('Import Data')
            .addButton(b => {
                b.setButtonText('Import Data')
                 .onClick(async () => {
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
                                try { await this.app.vault.adapter.stat(folder); } catch { try { await this.app.vault.createFolder(folder); } catch {} }
                                for (const m of obj.months) {
                                    const path = typeof m.file === 'string' ? m.file : `${folder}/Imported_${Date.now()}.json`;
                                    await this.app.vault.adapter.write(path, JSON.stringify(m.data ?? {}, null, 2));
                                }
                            }
                            const view = this.plugin.getCalendarView();
                            if (view) { await view.loadAllEntries(); view.render(); }
                            new Notice('Import completed');
                        } catch (e) {
                            new Notice('Import failed');
                        }
                    };
                    input.click();
                 });
            });
    }
}
function randomId(): string {
    const anyCrypto = (window as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return 'ev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
