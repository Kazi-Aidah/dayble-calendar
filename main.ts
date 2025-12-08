import { App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, setIcon } from 'obsidian';

const VIEW_TYPE = 'dayble-calendar-view';

interface DaybleSettings {
    weekStartDay: number;
    entriesFolder: string;
    iconPlacement?: 'left' | 'right' | 'none' | 'top' | 'top-left' | 'top-right';
    eventTextAlign?: 'left' | 'center' | 'right';
    holderOpen?: boolean;
    holderWidth?: number; // in pixels
    eventCategories?: EventCategory[];
    preferUserColors?: boolean; // prefer user-set event colors over category colors
    eventBgOpacity?: number; // 0-1, controls background opacity
    eventBorderWidth?: number; // 0-5px, controls border thickness
    colorSwatchPosition?: 'under-title' | 'under-description'; // position of color swatches in modal
}

const DEFAULT_SETTINGS: DaybleSettings = {
    weekStartDay: 0,
    entriesFolder: 'DaybleCalendar',
    iconPlacement: 'left',
    eventTextAlign: 'left',
    holderOpen: true,
    preferUserColors: false,
    eventBgOpacity: 1,
    eventBorderWidth: 2,
    colorSwatchPosition: 'under-title',
    eventCategories: [
        { id: 'default', name: 'Default', bgColor: '', textColor: '', effect: 'embossed', animation: '' }
    ]
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

    constructor(leaf: WorkspaceLeaf, plugin: DaybleCalendarPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentDate = new Date();
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
        const holderToggle = left.createEl('button', { cls: 'dayble-btn dayble-header-buttons dayble-holder-toggle' });
        setIcon(holderToggle, 'menu');
        holderToggle.onclick = async () => { this.holderEl.classList.toggle('open'); this.plugin.settings.holderOpen = this.holderEl.classList.contains('open'); await this.plugin.saveSettings(); };
        this.monthTitleEl = this.headerEl.createEl('h1', { cls: 'dayble-month-title' });
        const right = this.headerEl.createDiv({ cls: 'dayble-nav-right' });
        const prevBtn = right.createEl('button', { cls: 'dayble-btn dayble-header-buttons' });
        setIcon(prevBtn, 'chevron-left');
        prevBtn.onclick = () => { this.shiftMonth(-1); };
        const todayBtn = right.createEl('button', { cls: 'dayble-btn dayble-header-buttons' });
        setIcon(todayBtn, 'dot');
        todayBtn.onclick = () => { this.focusToday(); };
        const nextBtn = right.createEl('button', { cls: 'dayble-btn dayble-header-buttons' });
        setIcon(nextBtn, 'chevron-right');
        nextBtn.onclick = () => { this.shiftMonth(1); };
        this.bodyEl = this.rootEl.createDiv({ cls: 'dayble-body' });
        this.holderEl = this.bodyEl.createDiv({ cls: 'dayble-holder' });
        const holderHeader = this.holderEl.createDiv({ cls: 'dayble-holder-header', text: 'Holder' });
        const holderAdd = holderHeader.createEl('button', { cls: 'dayble-btn dayble-holder-add-btn' });
        setIcon(holderAdd, 'plus');
        holderAdd.onclick = () => this.openEventModal();
        
        // Add resize handle to holder
        const resizeHandle = holderHeader.createDiv({ cls: 'dayble-holder-resize-handle' });
        
        this._boundHolderMouseMove = (e: MouseEvent) => {
            if (!this.isResizingHolder) return;
            const diff = e.clientX - this.holderResizeStartX;
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
        const file = this.getMonthDataFilePath();
        try {
            // Ensure folder exists before saving
            const folder = this.plugin.settings.entriesFolder;
            try {
                await this.app.vault.adapter.stat(folder);
            } catch (_) {
                console.log('[Dayble] Folder does not exist, creating:', folder);
                try {
                    await this.app.vault.createFolder(folder);
                    console.log('[Dayble] Folder created successfully');
                } catch (e) {
                    console.error('[Dayble] Failed to create folder:', e);
                }
            }
            
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
                setIcon(searchBtn, 'focus');
                searchBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openTodayModal(fullDate);
                    return false;
                };
            }
            const container = cell.createDiv({ cls: 'dayble-event-container' });
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
        this.renderLongEvents();
        this.renderHolder();
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

    openEventModalForRange(start: string, end: string) { const modal = new EventModal(this.app, undefined, start, end, async result => { const ev: DaybleEvent = { id: randomId(), ...result } as DaybleEvent; this.events.push(ev); await this.saveAllEntries(); this.render(); }, async () => {}, async () => {}); (modal as any).categories = this.plugin.settings.eventCategories || []; (modal as any).plugin = this.plugin; modal.open(); }

    renderLongEvents() {
        // Remove old long event elements first
        this.gridEl.querySelectorAll('.dayble-long-event').forEach(el => el.remove());
        
        const cells = Array.from(this.gridEl.children).filter(el => (el as HTMLElement).hasClass?.('dayble-day')) as HTMLElement[];
        const todayNum = (el: HTMLElement) => {
            const n = el.querySelector('.dayble-day-number') as HTMLElement | null;
            return n ? n.getBoundingClientRect().height + parseFloat(getComputedStyle(n).marginBottom || '0') : 24;
        };
        const getCellWidth = () => {
            if (cells.length === 0) return 100;
            const rect = cells[0].getBoundingClientRect();
            return rect.width;
        };
        
        this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate).forEach(ev => {
            const startIdx = cells.findIndex(c => c.getAttr('data-date') === ev.startDate);
            if (startIdx === -1) return;
            const start = new Date(ev.startDate!);
            const end = new Date(ev.endDate!);
            const overlap = this.events.filter(e => e.startDate && e.endDate && e.startDate !== e.endDate && new Date(e.startDate!) <= start && new Date(e.endDate!) >= start).sort((a,b) => a.id.localeCompare(b.id));
            const stackIndex = overlap.findIndex(e => e.id === ev.id);
            const span = Math.floor((end.getTime() - start.getTime())/86400000) + 1;
            
            // Handle multi-row spans by calculating positions for each row
            const cellsPerRow = 7;
            const startRow = Math.floor(startIdx / cellsPerRow);
            const endIdx = startIdx + span - 1;
            const endRow = Math.floor(endIdx / cellsPerRow);
            
            const cellWidth = getCellWidth();
            
            // For multi-row events, we need to render them per row
            if (startRow === endRow) {
                // Simple case: event within same row
                const first = cells[startIdx];
                const last = cells[endIdx];
                if (!first || !last) return;
                const gridRect = this.gridEl.getBoundingClientRect();
                const fr = first.getBoundingClientRect();
                const lr = last.getBoundingClientRect();
                const topOffset = todayNum(first) + 9 + stackIndex * 40;
                const left = fr.left - gridRect.left + this.gridEl.scrollLeft - 4;
                const top = fr.top - gridRect.top + this.gridEl.scrollTop + topOffset;
                const width = cellWidth * span - 8;
                const item = this.createEventItem(ev);
                item.addClass('dayble-long-event');
                item.style.position = 'absolute';
                item.style.left = `${left}px`;
                item.style.top = `${top}px`;
                item.style.width = `${width}px`;
                item.style.height = '2.2em';
                item.style.zIndex = '10';
                item.style.boxSizing = 'border-box';
                item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                this.gridEl.appendChild(item);
            } else {
                // Complex case: event spans multiple rows
                for (let row = startRow; row <= endRow; row++) {
                    const rowStartIdx = row * cellsPerRow;
                    const rowEndIdx = Math.min(rowStartIdx + cellsPerRow - 1, cells.length - 1);
                    
                    // Determine which cells of this row are covered by the event
                    const eventStartInRow = row === startRow ? startIdx : rowStartIdx;
                    const eventEndInRow = row === endRow ? endIdx : rowEndIdx;
                    
                    if (eventStartInRow > rowEndIdx || eventEndInRow < rowStartIdx) continue; // Event doesn't touch this row
                    
                    const first = cells[eventStartInRow];
                    const last = cells[eventEndInRow];
                    if (!first || !last) continue;
                    
                    const gridRect = this.gridEl.getBoundingClientRect();
                    const fr = first.getBoundingClientRect();
                    const lr = last.getBoundingClientRect();
                    const topOffset = todayNum(first) + 9 + stackIndex * 40;
                    const left = fr.left - gridRect.left + this.gridEl.scrollLeft - 4;
                    const top = fr.top - gridRect.top + this.gridEl.scrollTop + topOffset;
                    const cellsInThisRow = eventEndInRow - eventStartInRow + 1;
                    const width = cellWidth * cellsInThisRow - 8;
                    
                    const item = this.createEventItem(ev);
                    item.addClass('dayble-long-event');
                    if (row === startRow) item.addClass('dayble-long-event-start');
                    if (row === endRow) item.addClass('dayble-long-event-end');
                    item.style.position = 'absolute';
                    item.style.left = `${left}px`;
                    item.style.top = `${top}px`;
                    item.style.width = `${width}px`;
                    item.style.height = '2.2em';
                    item.style.zIndex = '10';
                    item.style.boxSizing = 'border-box';
                    item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id!, ev.startDate!, ev.endDate!); };
                    this.gridEl.appendChild(item);
                }
            }
        });
    }

    createEventItem(ev: DaybleEvent): HTMLElement {
        const item = document.createElement('div');
        item.className = 'dayble-event';
        item.setAttribute('draggable', 'true');
        item.dataset.id = ev.id;
        item.dataset.categoryId = ev.categoryId || '';
        
        // Apply text alignment
        const textAlign = this.plugin.settings.eventTextAlign || 'left';
        item.addClass(`dayble-text-align-${textAlign}`);
        
        // Determine which colors to use: user-set or category
        const preferUserColors = this.plugin.settings.preferUserColors;
        const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
        const isDefaultCategory = !ev.categoryId || ev.categoryId === 'default';
        
        let bgColor = '';
        let textColor = '';
        
        // Color selection logic:
        // 1. If default category and color is picked -> use user color
        // 2. If non-default category with colors:
        //    a. If prefer user colors and color picked -> use user color
        //    b. Else -> use category color
        if (isDefaultCategory && ev.color) {
            // Default category: use user-set color if picked
            bgColor = ev.color;
            textColor = ev.textColor || chooseTextColor(ev.color);
        } else if (!isDefaultCategory && category && category.bgColor) {
            // Non-default category with colors
            if (preferUserColors && ev.color) {
                // Use user-set colors
                bgColor = ev.color;
                textColor = ev.textColor || chooseTextColor(ev.color);
            } else {
                // Use category colors
                bgColor = category.bgColor;
                textColor = category.textColor;
            }
        } else if (isDefaultCategory && !ev.color && category && category.bgColor) {
            // Default category but no user color picked, and category has colors
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
        
        // Apply effect and animation from category (always, regardless of color choice)
        if (category) {
            if (category.effect && category.effect !== '') item.addClass(`dayble-effect-${category.effect}`);
            if (category.animation && category.animation !== '') item.addClass(`dayble-anim-${category.animation}`);
        }
        
        const title = item.createDiv({ cls: 'dayble-event-title', text: ev.title });
        if (ev.time) title.setText(`${ev.title} (${ev.time})`);
        if (this.plugin.settings.iconPlacement !== 'none' && ev.icon) {
            const iconEl = item.createDiv({ cls: 'dayble-event-icon' });
            setIcon(iconEl, ev.icon);
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
            renderMarkdown(ev.description, desc);
        }
        item.ondragstart = e => {
            console.log('[Dayble] Drag started on event:', ev.id);
            this.isSelecting = false;
            this.isDragging = true;
            this.clearSelection();
            e.dataTransfer?.setData('text/plain', ev.id);
            (e.dataTransfer as DataTransfer)?.setData('dayble-source','calendar');
            item.addClass('dayble-dragging');
        };
        item.ondragend = () => {
            console.log('[Dayble] Drag ended');
            item.removeClass('dayble-dragging');
            this.isDragging = false;
        };
        item.onclick = (e) => { e.stopPropagation(); this.openEventModal(ev.id); };
        item.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = document.createElement('div');
            menu.style.position = 'fixed';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.style.zIndex = '10000';
            menu.style.backgroundColor = 'var(--background-primary)';
            menu.style.border = '1px solid var(--background-modifier-border)';
            menu.style.borderRadius = '6px';
            menu.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            menu.style.minWidth = '180px';
            
            // Duplicate
            const dupBtn = document.createElement('div');
            dupBtn.textContent = 'Duplicate';
            dupBtn.style.padding = '8px 12px';
            dupBtn.style.cursor = 'pointer';
            dupBtn.style.color = 'var(--text-normal)';
            dupBtn.onmouseenter = () => dupBtn.style.backgroundColor = 'var(--background-primary-alt)';
            dupBtn.onmouseleave = () => dupBtn.style.backgroundColor = 'transparent';
            dupBtn.onclick = () => {
                const newEv: DaybleEvent = { ...ev, id: randomId() };
                this.events.push(newEv);
                this.saveAllEntries().then(() => this.render());
                document.body.removeChild(menu);
            };
            menu.appendChild(dupBtn);
            
            // Mark as done
            const doneBtn = document.createElement('div');
            doneBtn.textContent = ev.completed ? 'Mark incomplete' : 'Mark complete';
            doneBtn.style.padding = '8px 12px';
            doneBtn.style.cursor = 'pointer';
            doneBtn.style.color = 'var(--text-normal)';
            doneBtn.onmouseenter = () => doneBtn.style.backgroundColor = 'var(--background-primary-alt)';
            doneBtn.onmouseleave = () => doneBtn.style.backgroundColor = 'transparent';
            doneBtn.onclick = () => {
                ev.completed = !ev.completed;
                this.saveAllEntries().then(() => this.render());
                document.body.removeChild(menu);
            };
            menu.appendChild(doneBtn);
            
            // Delete
            const delBtn = document.createElement('div');
            delBtn.textContent = 'Delete';
            delBtn.style.padding = '8px 12px';
            delBtn.style.cursor = 'pointer';
            delBtn.style.color = 'var(--text-danger)';
            delBtn.onmouseenter = () => delBtn.style.backgroundColor = 'var(--background-primary-alt)';
            delBtn.onmouseleave = () => delBtn.style.backgroundColor = 'transparent';
            delBtn.onclick = () => {
                this.events = this.events.filter(e => e.id !== ev.id);
                this.saveAllEntries().then(() => this.render());
                document.body.removeChild(menu);
            };
            menu.appendChild(delBtn);
            
            document.body.appendChild(menu);
            
            // Close menu on click outside
            const closeMenu = () => {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 100);
        };
        return item;
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
                item.addClass('dayble-dragging');
            };
            item.ondragend = () => {
                console.log('[Dayble] Drag ended from holder');
                item.removeClass('dayble-dragging');
                this.isDragging = false;
            };
            list.appendChild(item);
        });
    }

    async openEventModal(id?: string, date?: string, endDate?: string) {
        const existing = id ? this.events.find(e => e.id === id) : undefined;
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
        }, async () => {
            if (existing) {
                console.log('[Dayble] Deleting event:', existing.id);
                this.events = this.events.filter(e => e.id !== existing.id);
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
        heading.textContent = this.ev ? 'Edit Event' : 'Add New Event';
        const row1 = c.createDiv({ cls: 'dayble-modal-row' });
        const iconBtn = row1.createEl('button', { cls: 'dayble-btn dayble-icon-add' });
        setIcon(iconBtn, this.icon ?? 'plus');
        iconBtn.onclick = () => this.onPickIcon();
        this.iconBtnEl = iconBtn;
        const titleInput = row1.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Event title' } });
        titleInput.value = this.ev?.title ?? '';
        
        // Create color swatch row (will be positioned based on setting)
        const createColorRow = () => {
            const colorRow = c.createDiv({ cls: 'dayble-modal-row dayble-color-swatches-row' });
            
            const swatchesContainer = colorRow.createDiv({ cls: 'dayble-color-swatches' });
            const defaultSwatch = swatchesContainer.createEl('button', { cls: 'dayble-color-swatch dayble-color-swatch-none' });
            defaultSwatch.title = 'None (default)';
            defaultSwatch.onclick = () => {
                this.selectedColor = undefined;
                this.selectedTextColor = undefined;
                document.querySelectorAll('.dayble-color-swatch').forEach(s => s.removeClass('dayble-color-swatch-selected'));
                defaultSwatch.addClass('dayble-color-swatch-selected');
            };
            if (!this.selectedColor) defaultSwatch.addClass('dayble-color-swatch-selected');
            
            const colors = ['#eb3b5a', '#fa8231', '#e5a216', '#20bf6b', '#0fb9b1', '#2d98da', '#3867d6', '#5454d0', '#8854d0', '#b554d0', '#e832c1', '#e83289', '#965b3b', '#8392a4'];
            colors.forEach(color => {
                const swatch = swatchesContainer.createEl('button', { cls: 'dayble-color-swatch' });
                swatch.style.backgroundColor = color;
                swatch.style.borderColor = color;
                swatch.title = color;
                swatch.onclick = () => {
                    this.selectedColor = color;
                    this.selectedTextColor = chooseTextColor(color);
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
        const categoryLabel = ruleRow.createEl('label', { text: 'Category:' });
        categoryLabel.style.textAlign = 'center';
        let selectedCategoryId = this.ev?.categoryId;
        const categorySelect = ruleRow.createEl('select', { cls: 'dayble-input dayble-category-select' });
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
        const startTime = row2.createEl('input', { type: 'time', cls: 'dayble-input' });
        startTime.value = this.ev?.time?.split('-')[0] ?? '';
        const startDate = row2.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.value = this.ev?.startDate ?? this.date ?? '';
        
        // End time/date row (only for multi-day events)
        let endTime: HTMLInputElement | undefined;
        let endDateInput: HTMLInputElement | undefined;
        if (isMultiDay) {
            const row3 = c.createDiv({ cls: 'dayble-modal-row' });
            endTime = row3.createEl('input', { type: 'time', cls: 'dayble-input' });
            endTime.value = this.ev?.time?.split('-')[1] ?? '';
            endDateInput = row3.createEl('input', { type: 'date', cls: 'dayble-input' });
            endDateInput.value = this.endDate ?? '';
        }
        
        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.value = this.ev?.description ?? '';
        
        // Add autocomplete for [[links]]
        let suggestionContainer: HTMLElement | null = null;
        const showSuggestions = (input: string) => {
            // Remove existing suggestion container
            if (suggestionContainer) suggestionContainer.remove();
            
            const match = input.match(/\[\[([^\[\]]*?)$/);
            if (!match) return;
            
            const query = match[1].toLowerCase();
            const files = this.app.vault.getFiles()
                .filter((f: any) => f.name && f.name.toLowerCase().includes(query) && !f.name.startsWith('.'))
                .slice(0, 5);
            
            if (files.length === 0) return;
            
            suggestionContainer = c.createDiv({ cls: 'dayble-link-suggestions' });
            suggestionContainer.style.position = 'absolute';
            suggestionContainer.style.backgroundColor = 'var(--background-primary)';
            suggestionContainer.style.border = '1px solid var(--background-modifier-border)';
            suggestionContainer.style.borderRadius = '4px';
            suggestionContainer.style.maxHeight = '150px';
            suggestionContainer.style.overflowY = 'auto';
            suggestionContainer.style.zIndex = '1000';
            suggestionContainer.style.minWidth = '200px';
            
            files.forEach((file: any) => {
                const item = suggestionContainer!.createDiv({ text: file.name });
                item.style.padding = '8px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid var(--background-modifier-border)';
                item.onmouseenter = () => item.style.backgroundColor = 'var(--background-primary-alt)';
                item.onmouseleave = () => item.style.backgroundColor = 'transparent';
                item.onclick = () => {
                    const text = descInput.value;
                    const beforeMatch = text.substring(0, text.lastIndexOf('[['));
                    descInput.value = beforeMatch + '[[' + file.name + ']]';
                    suggestionContainer?.remove();
                    suggestionContainer = null;
                };
            });
            
            c.appendChild(suggestionContainer);
        };
        
        descInput.oninput = () => {
            showSuggestions(descInput.value);
        };
        
        // Add color swatches under description if setting says so
        if (colorSwatchPos === 'under-description') {
            colorRow = createColorRow();
        }
        
        const footer = c.createDiv({ cls: 'dayble-modal-footer' });
        
        // Delete button on left (only for existing events)
        if (this.ev) {
            const del = footer.createEl('button', { cls: 'dayble-btn dayble-delete' });
            setIcon(del, 'trash-2');
            del.onclick = () => this.onDelete().then(() => this.close());
        }
        
        // Cancel and Save buttons on right
        const rightButtons = footer.createDiv({ cls: 'dayble-modal-footer-right' });
        const cancel = rightButtons.createEl('button', { cls: 'dayble-btn dayble-cancel' });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();
        const ok = rightButtons.createEl('button', { cls: 'dayble-btn dayble-save mod-cta' });
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
            
            if (isMultiDay && endTime && endDateInput) {
                // Multi-day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.startDate = startDate.value || undefined;
                payload.endDate = endDateInput.value || undefined;
            } else {
                // Single day event
                const startTimeVal = startTime.value || '';
                const endTimeVal = endTime?.value || '';
                payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');
                payload.date = startDate.value || undefined;
                payload.startDate = startDate.value || undefined;
                payload.endDate = startDate.value || undefined;
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
        
        const searchRow = c.createDiv({ cls: 'dayble-modal-row' });
        searchRow.style.marginTop = '8px';
        const searchInput = searchRow.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Search icons' } });
        searchInput.style.flexGrow = '1';
        
        const list = c.createDiv({ cls: 'dayble-icon-list' });
        list.style.flex = '1';
        list.style.overflowY = 'auto';
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(40px, 1fr))';
        list.style.gap = '4px';
        list.style.marginTop = '8px';
        
        // Footer with remove button
        const footer = c.createDiv();
        footer.style.display = 'flex';
        footer.style.marginTop = 'auto';
        footer.style.paddingTop = '8px';
        footer.style.borderTop = '1px solid var(--background-modifier-border)';
        const removeBtn = footer.createEl('button', { cls: 'dayble-btn', text: 'Remove Icon' });
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
        
        let filtered = this.allIcons.slice(0, 100); // Only show first 100 initially
        let fullFiltered = this.allIcons.slice();
        
        const renderList = (icons: string[]) => {
            list.empty();
            icons.slice(0, 200).forEach(id => {
                const btn = list.createEl('button', { cls: 'dayble-icon-btn' });
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
        c.style.maxWidth = '500px';
        
        // Parse date
        const [year, month, day] = this.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[dateObj.getMonth()];
        
        // Title with date
        const title = c.createEl('h3', { text: `${monthName} ${day}` });
        title.style.marginBottom = '16px';
        
        // Get events for this date
        const dayEvents = this.events.filter(e => e.date === this.date).sort((a, b) => {
            const timeA = a.time ? a.time.split('-')[0] : '99:99';
            const timeB = b.time ? b.time.split('-')[0] : '99:99';
            return timeA.localeCompare(timeB);
        });
        
        // Events container (scrollable)
        const eventsContainer = c.createDiv({ cls: 'dayble-today-events-container' });
        eventsContainer.style.flex = '1';
        eventsContainer.style.overflowY = 'auto';
        eventsContainer.style.marginBottom = '12px';
        eventsContainer.style.paddingRight = '8px';
        
        if (dayEvents.length === 0) {
            eventsContainer.createEl('p', { text: 'No events for this day' });
        } else {
            dayEvents.forEach(ev => {
                const row = c.createDiv({ cls: 'dayble-today-event-row' });
                row.style.display = 'flex';
                row.style.gap = '12px';
                row.style.marginBottom = '12px';
                row.style.padding = '8px';
                row.style.backgroundColor = 'var(--background-primary-alt)';
                row.style.borderRadius = '6px';
                row.style.alignItems = 'flex-start';
                
                // Apply event colors if available
                if (ev.color) {
                    const opacity = this.view?.plugin?.settings?.eventBgOpacity ?? 1;
                    const rgbaColor = hexToRgba(ev.color, opacity);
                    row.style.backgroundColor = rgbaColor;
                }
                
                // Time
                const timeEl = row.createDiv({ cls: 'dayble-today-time' });
                timeEl.style.minWidth = '60px';
                timeEl.style.fontWeight = '600';
                timeEl.style.color = 'var(--text-muted)';
                timeEl.textContent = ev.time ? ev.time.split('-')[0] : '—';
                
                // Event title and description
                const contentEl = row.createDiv();
                contentEl.style.flex = '1';
                contentEl.style.display = 'flex';
                contentEl.style.flexDirection = 'column';
                contentEl.style.gap = '4px';
                
                const titleEl = contentEl.createDiv({ cls: 'dayble-today-event-title' });
                titleEl.style.fontWeight = '500';
                titleEl.style.color = ev.color ? (ev.textColor || 'var(--text-normal)') : 'var(--text-normal)';
                titleEl.textContent = ev.title;
                
                if (ev.description) {
                    const descEl = contentEl.createDiv({ cls: 'dayble-today-event-desc' });
                    descEl.style.fontSize = '0.9em';
                    descEl.style.color = 'var(--text-muted)';
                    renderMarkdown(ev.description, descEl);
                }
                
                // Optional completed indicator
                if (ev.completed) {
                    row.style.opacity = '0.6';
                    titleEl.style.textDecoration = 'line-through';
                }
                
                eventsContainer.appendChild(row);
            });
        }
        
        // Fixed +Add Event button at bottom
        const addBtn = c.createEl('button', { cls: 'dayble-today-add-btn', text: '+ Add Event' });
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

function renderMarkdown(text: string, element: HTMLElement): void {
    // Simple markdown rendering: bold, italic, links, code, strikethrough
    let html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Bold **text** and __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic *text* and _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough ~~text~~
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Code `text`
        .replace(/`([^`]+)`/g, '<code style="background: var(--background-secondary); padding: 2px 4px; border-radius: 3px;">$1</code>')
        // Links [[text]] and [text](url)
        .replace(/\[\[([^\[\]]+)\]\]/g, '<a href="#" style="color: var(--link-color);">$1</a>')
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" style="color: var(--link-color);">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
    
    element.innerHTML = html;
}

class DaybleSettingTab extends PluginSettingTab {
    plugin: DaybleCalendarPlugin;
    constructor(app: App, plugin: DaybleCalendarPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        // Week start day - Native dropdown
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
        
        // Storage folder - Native FuzzySuggestModal
        new Setting(containerEl)
            .setName('Storage folder')
            .setDesc('Folder to store calendar events')
            .addButton(b => {
                b.setButtonText(this.plugin.settings.entriesFolder)
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
                            this.plugin.settings.entriesFolder = folder || 'DaybleCalendar';
                            await this.plugin.saveSettings();
                            await this.plugin.ensureEntriesFolder();
                            b.setButtonText(this.plugin.settings.entriesFolder);
                            const view = this.plugin.getCalendarView();
                            if (view) {
                                await view.loadAllEntries();
                                view.render();
                            }
                        };
                        suggest.open();
                    });
            });
        
        // Event text alignment
        new Setting(containerEl)
            .setName('Event text alignment')
            .setDesc('Alignment of event titles and descriptions')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .setValue(this.plugin.settings.eventTextAlign ?? 'left')
                    .onChange(async v => {
                        this.plugin.settings.eventTextAlign = v as any;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });
        
        // Icon placement - Native dropdown
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
        
        // Prefer user colors
        new Setting(containerEl)
            .setName('Prefer user colors')
            .setDesc('Use event colors set in the modal instead of category colors')
            .addToggle(t => {
                t.setValue(this.plugin.settings.preferUserColors ?? false)
                    .onChange(async v => {
                        this.plugin.settings.preferUserColors = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        view?.render();
                    });
            });
        
        // Color swatch position
        new Setting(containerEl)
            .setName('Color swatch position')
            .setDesc('Position of color swatches in event modal')
            .addDropdown(d => {
                d.addOption('under-title', 'Under title')
                    .addOption('under-description', 'Under description')
                    .setValue(this.plugin.settings.colorSwatchPosition ?? 'under-title')
                    .onChange(async v => {
                        this.plugin.settings.colorSwatchPosition = v as any;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Event background opacity slider
        new Setting(containerEl)
            .setName('Event background opacity')
            .setDesc('Controls transparency of event backgrounds (0 = fully transparent, 1 = fully opaque)')
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
        
        // Event border thickness slider
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
        
        containerEl.createEl('h4', { text: 'Event Categories' });
        const rulesWrap = containerEl.createDiv();
        const renderRules = () => {
            rulesWrap.empty();
            (this.plugin.settings.eventCategories || []).forEach((category: EventCategory) => {
                const row = new Setting(rulesWrap).setName(category.name);
                row.addText(t => t.setValue(category.name).onChange(v => { category.name = v; }));
                row.addColorPicker(cp => cp.setValue(category.bgColor).onChange(v => { 
                    category.bgColor = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }));
                row.addColorPicker(cp => cp.setValue(category.textColor).onChange(v => { 
                    category.textColor = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }));
                row.addDropdown(d => d.addOptions({
                    'striped-1': 'Striped (45°)',
                    'striped-2': 'Striped (-45°)',
                    'thin-textured-stripes': 'Thin Textured Stripes',
                    'crosshatched': 'Crosshatched',
                    'checkerboard': 'Checkerboard',
                    'wavy-lines': 'Wavy Lines',
                    'dotted': 'Dotted',
                    'argyle': 'Argyle',
                    'teeth': 'Teeth',
                    'embossed': 'Embossed',
                    'retro-button': 'Retro Button'
                }).setValue(category.effect).onChange(v => { 
                    category.effect = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }));
                row.addDropdown(d => d.addOptions({
                    '': 'None',
                    'move-horizontally': 'Move Horizontally',
                    'move-vertically': 'Move Vertically',
                    'particles': 'Particles',
                    'snow-falling': 'Snow Falling',
                    'animated-gradient': 'Animated Gradient'
                }).setValue(category.animation).onChange(v => { 
                    category.animation = v; 
                    this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) view.render();
                    });
                }));
                // Don't allow deleting the default category
                if (category.id !== 'default') {
                    row.addExtraButton(btn => btn.setIcon('x').setTooltip('Delete').onClick(() => { this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).filter(c => c.id !== category.id); renderRules(); }));
                }
            });
        };
        new Setting(containerEl).addButton(b => b.setButtonText('Add Category').onClick(async () => {
            const category: EventCategory = { id: randomId(), name: 'New Category', bgColor: '#8392a4', textColor: '#ffffff', effect: 'embossed', animation: '' };
            this.plugin.settings.eventCategories = (this.plugin.settings.eventCategories || []).concat(category);
            await this.plugin.saveSettings();
            renderRules();
        }));
        renderRules();
    }
}
function randomId(): string {
    const anyCrypto = (window as any).crypto;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return 'ev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
