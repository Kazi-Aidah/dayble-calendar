import { ItemView, WorkspaceLeaf, setIcon, setTooltip, Notice, Menu, normalizePath, moment, TFolder } from 'obsidian';
import * as htmlToImage from 'html-to-image';
import type DaybleCalendarPlugin from '../main';
import type { DaybleEvent, EventRecurrence } from './types';
import { VIEW_TYPE, timeToMinutes } from './constants';
import { chooseTextColor, hexToRgba, renderMarkdown, resolveNoteFile, randomId } from './utils';
import PromptSearchModal from './modals/PromptSearchModal';
import StorageFolderNotSetModal from './modals/StorageFolderNotSetModal';
import IconPickerModal from './modals/IconPickerModal';
import EventModal from './EventModal';
import TodayModal from './TodayModal';

export default class DaybleCalendarView extends ItemView {
    plugin: DaybleCalendarPlugin;
    rootEl: HTMLElement;
    headerEl: HTMLElement;
    monthTitleEl: HTMLElement;
    navRightEl?: HTMLElement;
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
    _dayMode3ROs?: ResizeObserver[];
    viewSelectEl: HTMLSelectElement;
    copyBtn?: HTMLButtonElement;
    saveImageBtn?: HTMLButtonElement;
    saveTimeout: unknown;
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

    matchesRecurrence(rec: EventRecurrence, date: moment.Moment, start: moment.Moment): boolean {
        if (!rec || rec.type === 'none') return false;
        
        if (rec.type === 'daily') {
            const diff = date.diff(start, 'days');
            return diff >= 0 && diff % (rec.interval || 1) === 0;
        }
        
        if (rec.type === 'weekly') {
            const diffWeeks = date.clone().startOf('week').diff(start.clone().startOf('week'), 'weeks');
            if (diffWeeks < 0 || diffWeeks % (rec.interval || 1) !== 0) return false;
            return (rec.daysOfWeek || []).includes(date.day());
        }
        
        if (rec.type === 'monthly') {
            const matchesDayOfWeek = (rec.daysOfWeek || []).length > 0 ? (rec.daysOfWeek || []).includes(date.day()) : false;
            const matchesDate = rec.monthDate ? date.date() === rec.monthDate : false;
            
            if (rec.monthlyMode === 'days') return matchesDayOfWeek;
            if (rec.monthlyMode === 'date') return matchesDate;
            
            return matchesDayOfWeek || matchesDate;
        }
        
        if (rec.type === 'yearly') {
            return date.month() === start.month() && date.date() === (rec.monthDate || start.date());
        }
        
        return false;
    }

    getExpandedEvents(startRange: moment.Moment, endRange: moment.Moment): DaybleEvent[] {
        const expanded: DaybleEvent[] = [];
        this.events.forEach(ev => {
            if (!ev.recurrence || ev.recurrence.type === 'none') {
                expanded.push(ev);
                return;
            }
            
            const rec = ev.recurrence;
            const recStart = moment(rec.startDate || ev.date || ev.startDate);
            const recEnd = rec.endDate ? moment(rec.endDate) : null;
            
            if (recStart.isAfter(endRange)) return;
            if (recEnd && recEnd.isBefore(startRange)) return;

            const checkStart = moment.max(recStart, startRange.clone().startOf('day'));
            const checkEnd = recEnd ? moment.min(recEnd, endRange.clone().endOf('day')) : endRange.clone().endOf('day');
            
            let limit = 500;
            const checkCur = checkStart.clone();
            
            while (checkCur.isSameOrBefore(checkEnd) && limit-- > 0) {
                if (this.matchesRecurrence(rec, checkCur, recStart)) {
                    const occurrence = { ...ev, id: `${ev.id}-${checkCur.format('YYYY-MM-DD')}`, isOccurrence: true };
                    const dateStr = checkCur.format('YYYY-MM-DD');
                    if (ev.date) occurrence.date = dateStr;
                    if (ev.startDate) {
                        const diff = moment(ev.endDate).diff(moment(ev.startDate), 'days');
                        occurrence.startDate = dateStr;
                        occurrence.endDate = checkCur.clone().add(diff, 'days').format('YYYY-MM-DD');
                    }
                    expanded.push(occurrence);
                }
                checkCur.add(1, 'days');
            }
        });
        return expanded;
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
        return this.plugin.getDataFilePath(filename);
    }

    async onOpen() {
        this.rootEl = this.containerEl.createDiv({ cls: 'dayble-root' });
        this.rootEl.setCssProps({
            '--event-border-radius': `${this.plugin.settings.eventBorderRadius ?? 6}px`,
            '--day-cell-radius': `${this.plugin.settings.dayCellRadius ?? 8}px`,
            '--event-vertical-padding': `${this.plugin.settings.eventVerticalPadding ?? 2}px`
        });
        const initialMinW = this.plugin.settings.dayCellMinWidth ?? 0;
        if (initialMinW > 0) {
            this.rootEl.setCssProps({ '--dayble-cell-min-width': `${initialMinW}px` });
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
        ['Month', 'Week', '3day', 'Day', 'Agenda'].forEach(mode => {
            const opt = viewSelect.createEl('option', { text: mode, value: mode });
            if (this.plugin.settings.calendarView === mode) opt.selected = true;
        });
        viewSelect.onchange = async () => {
            this.plugin.settings.calendarView = viewSelect.value as unknown;
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
                this.plugin.settings.calendarView = viewSelect.value as unknown;
                this.plugin.settings.calendarWeekActive = viewSelect.value === 'Week';
                await this.plugin.saveSettings();
                void this.render();
            }
        };

        this.monthTitleEl = this.headerEl.createEl('h1', { cls: 'dayble-month-title' });
        const right = this.headerEl.createDiv({ cls: 'dayble-nav-right' });
        this.navRightEl = right;
        const prevBtn = document.createElement('button'); prevBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(prevBtn, 'chevron-left');
        prevBtn.onclick = () => { this.shiftMonth(-1); };
        prevBtn.onwheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 1 : -1;
            this.shiftMonth(delta);
        };
        const todayBtn = document.createElement('button'); todayBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(todayBtn, 'dot');
        todayBtn.onclick = () => { this.focusToday(); };
        const nextBtn = document.createElement('button'); nextBtn.className = 'dayble-btn dayble-header-buttons';
        setIcon(nextBtn, 'chevron-right');
        nextBtn.onclick = () => { this.shiftMonth(1); };
        nextBtn.onwheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 1 : -1;
            this.shiftMonth(delta);
        };
        const placement = this.plugin.settings.holderPlacement ?? 'left';
        
        if (placement === 'left') left.appendChild(holderToggle);
        
        left.appendChild(prevBtn);
        left.appendChild(todayBtn);
        left.appendChild(nextBtn);
        // left.appendChild(weekToggle);
        
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'dayble-btn dayble-header-buttons dayble-settings-toggle';
        setIcon(settingsBtn, 'settings');
        settingsBtn.onclick = () => {
            (this.app as unknown).setting.open();
            (this.app as unknown).setting.openTabById(this.plugin.manifest.id);
        };
        const copyBtn = document.createElement('button');
        copyBtn.className = 'dayble-btn dayble-header-buttons dayble-copy-toggle';
        setIcon(copyBtn, 'copy');
        copyBtn.onclick = () => { void this.copyCalendarAsMarkdown(); };
        this.copyBtn = copyBtn;

        const saveImageBtn = document.createElement('button');
        saveImageBtn.className = 'dayble-btn dayble-header-buttons dayble-save-image-toggle';
        setIcon(saveImageBtn, 'image');
        saveImageBtn.onclick = () => { void this.saveCalendarAsImage(); };
        this.saveImageBtn = saveImageBtn;
        
        right.appendChild(viewSelect);
        right.appendChild(settingsBtn);
        right.appendChild(searchBtn);
        this.updateCopyCalendarButtonVisibility();
        if (placement === 'right') right.appendChild(holderToggle);
        
        const navRow = document.createElement('div');
        navRow.className = 'dayble-nav-row';
        
        const applyHeaderLayout = () => {
            const isMobile = window.innerWidth <= 700;
            if (isMobile) {
                if (this.monthTitleEl.parentElement !== this.headerEl) {
                    this.headerEl.appendChild(this.monthTitleEl);
                }
                if (navRow.parentElement !== this.headerEl) {
                    this.headerEl.appendChild(navRow);
                }
                if (left.parentElement !== navRow) navRow.appendChild(left);
                if (right.parentElement !== navRow) navRow.appendChild(right);
                
                // Ensure title is at the top
                if (this.headerEl.firstChild !== this.monthTitleEl) {
                    this.headerEl.insertBefore(this.monthTitleEl, this.headerEl.firstChild);
                }
            } else {
                if (left.parentElement !== this.headerEl) {
                    this.headerEl.insertBefore(left, this.monthTitleEl);
                }
                if (right.parentElement !== this.headerEl) {
                    this.headerEl.appendChild(right);
                }
                if (navRow.parentElement) navRow.remove();
            }
        };
        
        applyHeaderLayout();
        this.plugin.registerDomEvent(window, 'resize', applyHeaderLayout);

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
        
        this._boundHolderMouseUp = (e: MouseEvent) => {
        if (this.isResizingHolder) {
            this.isResizingHolder = false;
            document.removeEventListener('mousemove', this._boundHolderMouseMove);
            document.removeEventListener('mouseup', this._boundHolderMouseUp);
            this.plugin.settings.holderWidth = this.holderEl.offsetWidth;
            void this.plugin.saveSettings();
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

        resizeHandle.addEventListener('touchstart', (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            e.preventDefault();
            e.stopPropagation();
            this.isResizingHolder = true;
            this.holderResizeStartX = t.clientX;
            this.holderResizeStartWidth = this.holderEl.offsetWidth;
            const onTouchMove = (te: TouchEvent) => {
                const tt = te.touches[0];
                if (!tt || !this.isResizingHolder) return;
                te.preventDefault();
                let diff = tt.clientX - this.holderResizeStartX;
                if (placement === 'right') diff = -diff;
                const newWidth = Math.max(200, this.holderResizeStartWidth + diff);
                this.holderEl.setCssProps({ 'width': newWidth + 'px' });
            };
            const onTouchEnd = () => {
                this.isResizingHolder = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                this.plugin.settings.holderWidth = this.holderEl.offsetWidth;
                void this.plugin.saveSettings();
            };
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }, { passive: false });
        
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
        
        // Improve horizontal scrolling sensitivity
        this.calendarEl.addEventListener('wheel', (e: WheelEvent) => {
            if (e.deltaX !== 0) return; // Already horizontal
            if (e.shiftKey) return; // Standard horizontal scroll
            
            const view = this.plugin.settings.calendarView;
            // For Month/Week, we often prefer horizontal scroll if min-width is set
            const isMostlyHorizontalView = view === 'Month' || view === 'Week';
            
            if (isMostlyHorizontalView) {
                const isHorizontalPossible = this.calendarEl.scrollWidth > this.calendarEl.clientWidth;
                const isVerticalPossible = this.calendarEl.scrollHeight > this.calendarEl.clientHeight;
                
                // If horizontal is possible and vertical is NOT, or if we want to prioritize horizontal
                if (isHorizontalPossible && !isVerticalPossible) {
                    this.calendarEl.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
            }
        }, { passive: false });

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
            try { this._longRO.disconnect(); } catch { /* intentional */ }
            this._longRO = undefined;
        }
        if (this._longOverlayEl && this._longOverlayEl.isConnected) {
            try { this._longOverlayEl.remove(); } catch { /* intentional */ }
        }
        this._longEls.forEach(el => {
            try { if (el && el.parentElement) el.remove(); } catch { /* intentional */ }
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
            const holderFile = this.plugin.getDataFilePath('holder.json');
            const hjson = await this.app.vault.adapter.read(holderFile);
            const hdata = JSON.parse(hjson);
            if (Array.isArray(hdata?.holder)) {
                holderFromGlobal = hdata.holder;
            }
        } catch { /* intentional */ }

        const holderAggregate: DaybleEvent[] = [];
        for (const filename of files) {
            const file = this.plugin.getDataFilePath(filename);
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
            
            const file = this.plugin.getDataFilePath(filename);
            
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
            } catch { /* intentional */ }
        }

        const holderFile = this.plugin.getDataFilePath('holder.json');
        try {
            const hdata = {
                holder: this.holderEvents,
                lastModified: new Date().toISOString()
            };
            const hjsonStr = JSON.stringify(hdata, null, 2);
            await this.app.vault.adapter.write(holderFile, hjsonStr);
        } catch { /* intentional */ }
    }

    focusToday() {
        this.currentDate = new Date();
        void this.loadAllEntries().then(() => { void this.render(); });
    }

    shiftMonth(delta: number) {
        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        if (view === 'Week') {
            this.currentDate.setDate(this.currentDate.getDate() + (delta * 7));
        } else if (view === '3day') {
            this.currentDate.setDate(this.currentDate.getDate() + delta);
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
        if (this.dayModeTodayModal) {
            this.dayModeTodayModal.onClose();
            this.dayModeTodayModal = undefined;
        }
        if (this._dayModeRO) {
            this._dayModeRO.disconnect();
            this._dayModeRO = undefined;
        }
        if (this._dayMode3ROs) {
            this._dayMode3ROs.forEach(ro => ro.disconnect());
            this._dayMode3ROs = [];
        }
        if (this.rootEl) {
            this.rootEl.setCssProps({
                '--event-border-radius': `${this.plugin.settings.eventBorderRadius ?? 6}px`,
                '--day-cell-radius': `${this.plugin.settings.dayCellRadius ?? 8}px`,
                '--event-vertical-padding': `${this.plugin.settings.eventVerticalPadding ?? 2}px`
            });
            const minW = this.plugin.settings.dayCellMinWidth ?? 0;
            if (minW > 0) {
                this.rootEl.setCssProps({ '--dayble-cell-min-width': `${minW}px` });
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

        const viewClasses = ['dayble-week-mode', 'dayble-3day-mode', 'dayble-day-mode', 'dayble-agenda-mode', 'dayble-month-mode'];
        this.gridEl.removeClass(...viewClasses);
        this.calendarEl.removeClass(...viewClasses);

        if (view === 'Week') {
            this.gridEl.addClass('dayble-week-mode');
            this.calendarEl.addClass('dayble-week-mode');
            await this.renderWeekView(titleEl);
        } else if (view === '3day') {
            this.gridEl.addClass('dayble-3day-mode');
            this.calendarEl.addClass('dayble-3day-mode');
            this.render3DayView(titleEl);
        } else if (view === 'Day') {
            this.gridEl.addClass('dayble-day-mode');
            this.calendarEl.addClass('dayble-day-mode');
            this.renderDayView(titleEl);
        } else if (view === 'Agenda') {
            this.gridEl.addClass('dayble-agenda-mode');
            this.calendarEl.addClass('dayble-agenda-mode');
            this.renderAgendaView(titleEl);
        } else {
            this.gridEl.addClass('dayble-month-mode');
            this.calendarEl.addClass('dayble-month-mode');
            this.renderMonthView(titleEl);
        }

        // Post-render: The lane walls inside the event container act as spacers,
        // so we don't need manual margin adjustments anymore.
    }

    calculateLongEventLanes(longEvents: DaybleEvent[], unitParams?: { lanesPerEvent: number, lanesPerGap: number, lanesPerDesc: number, lanesPerIcon: number, liBottomGapReduceUnits?: number }): { eventLanes: Map<string, number>, maxLanesByDate: Record<string, number> } {
        const eventLanes = new Map<string, number>();
        const maxLanesByDate: Record<string, number> = {};
        const occupiedLanesByDate = new Map<string, Set<number>>();
        
        const { 
            lanesPerEvent = 7, // LN
            lanesPerGap = 1, // LN
            lanesPerDesc = 5, // LN
            lanesPerIcon = 0, // LN
            liBottomGapReduceUnits = 1 // LN new: reduce bottom gap units for LI
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
            const hasIcon = !!iconToUse; // LN

            let extraLanes = 0;
            if (hasDescription) extraLanes += lanesPerDesc; // LN
            if (hasVerticalIcon) extraLanes += lanesPerIcon; // LN

            let gapUnits = lanesPerGap; // LN
            if (hasIcon && !hasDescription) {
                gapUnits = Math.max(0, lanesPerGap - liBottomGapReduceUnits); // LN
            }
            const lanesNeeded = lanesPerEvent + gapUnits + extraLanes; // LN

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
                const occupied = occupiedLanesByDate.get(date);
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
        const expandedEvents = this.getExpandedEvents(moment(start), moment(endOfWeek));

        // Header
        const header = this.weekHeaderEl.createDiv({ cls: 'dayble-grid-header' });
        const days = ['sun','mon','tue','wed','thu','fri','sat'];
        const ordered = days.slice(weekStart).concat(days.slice(0, weekStart));
        ordered.forEach(d => header.createDiv({ text: d, cls: 'dayble-grid-header-cell' }));

        // Filter long events for week view
        // let longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        // if (this.plugin.settings.onlyShowPinnedEventsWeek) {
        //     longEventsPreset = longEventsPreset.filter(ev => ev.pinned);
        // }

        // Pre-calculate long event lanes (reused from month view logic)
        // const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        // const segmentHeight = 24 + (vPadding * 2);
        // const segmentGap = 4;
        // const LANE_UNIT_HEIGHT = 4;
        // const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT);
        // const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT);
        // const lanesPerDesc = 5;
        // const lanesPerIcon = 7;

        // const { maxLanesByDate } = this.calculateLongEventLanes(longEventsPreset, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon });
        // const countsByDate = maxLanesByDate;

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

            let dayEvents = expandedEvents.filter(e => e.date === fullDate);
            if (this.plugin.settings.onlyShowPinnedEventsWeek) {
                dayEvents = dayEvents.filter(e => e.pinned);
            }
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e, false, false, false)));
            
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
                    await this.openEventModal(undefined, fullDate, undefined, undefined, undefined, this.plugin.settings.onlyShowPinnedEventsWeek);
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
                this.weeklyNotesEl.setCssProps({ 'height': `${newH}px !important` });
            };
            this._boundWeeklyNotesMouseUp = () => {
            if (!this.isResizingWeeklyNotes) return;
            this.isResizingWeeklyNotes = false;
            document.removeEventListener('mousemove', this._boundWeeklyNotesMouseMove as EventListener);
            document.removeEventListener('mouseup', this._boundWeeklyNotesMouseUp as EventListener);
            if (this.weeklyNotesEl) {
                this.plugin.settings.weeklyNotesHeight = this.weeklyNotesEl.offsetHeight;
                void this.plugin.saveSettings();
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

            dragHandle.addEventListener('touchstart', (e: TouchEvent) => {
                const t = e.touches[0];
                if (!t || !this.weeklyNotesEl) return;
                e.preventDefault();
                e.stopPropagation();
                this.isResizingWeeklyNotes = true;
                this.weeklyNotesResizeStartY = t.clientY;
                this.weeklyNotesResizeStartHeight = this.weeklyNotesEl.offsetHeight;
                const onTouchMove = (te: TouchEvent) => {
                    const tt = te.touches[0];
                    if (!tt || !this.isResizingWeeklyNotes || !this.weeklyNotesEl) return;
                    te.preventDefault();
                    const dy = tt.clientY - this.weeklyNotesResizeStartY;
                    const newH = Math.max(100, this.weeklyNotesResizeStartHeight - dy);
                    this.weeklyNotesEl.setCssProps({ 'height': `${newH}px !important` });
                };
                const onTouchEnd = () => {
                    this.isResizingWeeklyNotes = false;
                    document.removeEventListener('touchmove', onTouchMove);
                    document.removeEventListener('touchend', onTouchEnd);
                    if (this.weeklyNotesEl) {
                        this.plugin.settings.weeklyNotesHeight = this.weeklyNotesEl.offsetHeight;
                        void this.plugin.saveSettings();
                    }
                };
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            }, { passive: false });

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

    renderMonthView(titleEl?: HTMLElement): void {
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

        const gridStart = moment(new Date(y, m, 1)).subtract(leading, 'days');
        const gridEnd = gridStart.clone().add(41, 'days');
        const expandedEvents = this.getExpandedEvents(gridStart, gridEnd);

        // Filter long events for month view
        // let longEventsPreset = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        // if (this.plugin.settings.onlyShowPinnedEventsMonth) {
        //     longEventsPreset = longEventsPreset.filter(ev => ev.pinned);
        // }

        // const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        // const segmentHeight = 24 + (vPadding * 2);
        // const segmentGap = 4;
        // const LANE_UNIT_HEIGHT = 4;
        // const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT);
        // const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT);
        // const lanesPerDesc = 5;
        // const lanesPerIcon = 7;

        // const { maxLanesByDate } = this.calculateLongEventLanes(longEventsPreset, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon });
        // const countsByDate = maxLanesByDate;

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
            
            let dayEvents = expandedEvents.filter(e => e.date === fullDate);
            if (this.plugin.settings.onlyShowPinnedEventsMonth) {
                dayEvents = dayEvents.filter(e => e.pinned);
            }
            dayEvents.forEach(e => container.appendChild(this.createEventItem(e, false, false, false)));
            
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
                            await this.openEventModal(undefined, fullDate, undefined, undefined, undefined, this.plugin.settings.onlyShowPinnedEventsMonth);
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
                            this.renderHolder();
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
                    this.renderHolder();
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
        this.renderHolder();

        if (!this._longRO && 'ResizeObserver' in window) {
            this._longRO = new ResizeObserver(() => {
                this.renderLongEvents();
            });
            if (this._longRO && this.gridEl) this._longRO.observe(this.gridEl);
        }
    }

    renderDayView(titleEl?: HTMLElement): void {
        this.gridEl.empty();
        this.weekHeaderEl.empty();
        
        const d = new Date(this.currentDate);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const fullDate = `${yy}-${mm}-${dd}`;

        const dayContainer = this.gridEl.createDiv({ cls: 'dayble-day-mode-container' });

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
        });
        
        // Remove the default title added by TodayModal if we want to use the main title
        const modalTitle = dayContainer.querySelector('.dayble-modal-title');
        if (modalTitle) modalTitle.remove();

        const [year, month, dayNum] = fullDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, dayNum);
        const dayLabel = moment(dateObj).format(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM');
        if (this.monthTitleEl) this.monthTitleEl.setText(dayLabel);

        this.renderHolder();
    }

    render3DayView(titleEl?: HTMLElement): void {
        this.gridEl.empty();
        this.weekHeaderEl.empty();
        
        const baseDate = new Date(this.currentDate);
        const dates: string[] = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates.push(`${yy}-${mm}-${dd}`);
        }

        const mainContainer = this.gridEl.createDiv({ cls: 'dayble-3day-container' });

        // Clean up old observers
        if (this._dayMode3ROs) {
            this._dayMode3ROs.forEach(ro => ro.disconnect());
        }
        this._dayMode3ROs = [];

        const dayModeModal = new TodayModal(this.app, dates, this.events, this);
        
        // Mock contentEl to our mainContainer
        // @ts-ignore
        dayModeModal.contentEl = mainContainer;
        // @ts-ignore
        dayModeModal.modalEl = mainContainer;
        
        dayModeModal.onOpen();

        const ro = new ResizeObserver(() => {
            dayModeModal.renderEvents();
        });
        ro.observe(mainContainer);
        this._dayMode3ROs.push(ro);

        requestAnimationFrame(() => {
            dayModeModal.renderEvents();
        });

        const startMoment = moment(dates[0]);
        const endMoment = moment(dates[2]);
        let rangeLabel = '';
        const format = this.plugin.settings.threeDayTitleFormat || 'full_range';
        
        if (format === 'month_year') {
            rangeLabel = startMoment.format('MMMM YYYY');
        } else if (format === 'short_range') {
            rangeLabel = `${startMoment.format('MMM D')} to ${endMoment.format('MMM D')}`;
        } else if (format === 'full_range_hyphen') {
            rangeLabel = `${startMoment.format('MMMM D')} - ${endMoment.format('MMMM D')}`;
        } else if (format === 'short_range_hyphen') {
            rangeLabel = `${startMoment.format('MMM D')} - ${endMoment.format('MMM D')}`;
        } else if (format === 'd_mmmm_range') {
            rangeLabel = `${startMoment.format('D MMMM')} - ${endMoment.format('D MMMM')}`;
        } else if (format === 'd_mmm_range') {
            rangeLabel = `${startMoment.format('D MMM')} - ${endMoment.format('D MMM')}`;
        } else {
            rangeLabel = `${startMoment.format('MMMM D')} to ${endMoment.format('MMMM D')}`;
        }
        
        if (this.monthTitleEl) this.monthTitleEl.setText(rangeLabel);

        this.renderHolder();
    }

    renderAgendaView(titleEl?: HTMLElement): void {
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
            'padding': '15px'
        });

        const startOfMonth = moment(this.currentDate).startOf('month');
        const endOfMonth = moment(this.currentDate).endOf('month');
        const expandedEvents = this.getExpandedEvents(startOfMonth, endOfMonth);

        // Filter and sort all events by their dates (including each day of multi-day events)
        const dayMap = new Map<string, DaybleEvent[]>();
        
        expandedEvents.forEach(ev => {
            if (this.plugin.settings.onlyShowPinnedEventsAgenda && !ev.pinned) return;
            if (ev.date) {
                if (!dayMap.has(ev.date)) dayMap.set(ev.date, []);
                dayMap.get(ev.date)?.push(ev);
            } else if (ev.startDate && ev.endDate) {
                // For multi-day events, add them to each day in the range
                let curr = moment(ev.startDate, 'YYYY-MM-DD');
                const end = moment(ev.endDate, 'YYYY-MM-DD');
                
                // If an event ends exactly at 00:00 on its end day, we shouldn't show it on that end day.
                let effectiveEnd = end.clone();
                if (ev.time) {
                    const parts = String(ev.time).split('-');
                    const endStr = parts[1] || '';
                    if (endStr === '00:00' && ev.startDate !== ev.endDate) {
                        effectiveEnd.subtract(1, 'day'); // Move back to previous day
                    }
                }

                while (curr.isSameOrBefore(effectiveEnd, 'day')) {
                    const dStr = curr.format('YYYY-MM-DD');
                    if (!dayMap.has(dStr)) dayMap.set(dStr, []);
                    dayMap.get(dStr)?.push(ev);
                    curr.add(1, 'day');
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
                    const isMultiDay = ev.startDate && ev.endDate && ev.startDate !== ev.endDate;
                    const isAllDay = !ev.time || isMultiDay;
                    const item = agendaContainer.appendChild(this.createEventItem(ev, false, false, isAllDay, true));
                    const itemEl = item;
                    itemEl.setCssProps({ 'width': '100%' });
                    
                    if (isAllDay) {
                        itemEl.addClass('dayble-agenda-all-day');
                        itemEl.addClass('dayble-agenda-long-events');
                    }
                });
            });
        }

        this.renderHolder();
    }

    updateCopyCalendarButtonVisibility() {
        if (!this.navRightEl || !this.copyBtn || !this.saveImageBtn) return;
        
        const searchBtn = this.navRightEl.querySelector('.dayble-search-toggle');

        if (this.plugin.settings.showCopyCalendarIcon) {
            if (!this.copyBtn.parentElement) {
                this.navRightEl.insertBefore(this.copyBtn, searchBtn || null);
            }
        } else {
            if (this.copyBtn.parentElement === this.navRightEl) {
                this.navRightEl.removeChild(this.copyBtn);
            }
        }

        if (this.plugin.settings.showSaveImageIcon) {
            if (!this.saveImageBtn.parentElement) {
                this.navRightEl.insertBefore(this.saveImageBtn, searchBtn || null);
            }
        } else {
            if (this.saveImageBtn.parentElement === this.navRightEl) {
                this.navRightEl.removeChild(this.saveImageBtn);
            }
        }
    }

    async saveCalendarAsImage() {
        const folderPath = this.plugin.settings.saveImageFolder || '';
        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        const fileName = `Dayble-Calendar-${view}-${moment().format('YYYY-MM-DD-HHmmss')}.png`;
        const fullPath = normalizePath(folderPath ? `${folderPath}/${fileName}` : fileName);

        // Find the calendar container to capture
        const container = this.rootEl;
        if (!container) {
            new Notice('Calendar container not found');
            return;
        }

        const notice = new Notice('Generating image...', 0);
        try {
            // Ensure folder exists
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder || !(folder instanceof TFolder)) {
                    try {
                        await this.app.vault.createFolder(folderPath);
                    } catch {
                        // Folder might already exist or be invalid
                    }
                }
            }

            // Add capture class to expand everything and hide scrollbars
            container.addClass('dayble-capturing');
            
            // Get dimensions after class is added to see how much it wants to expand
            // but we'll cap the width to the current scrollWidth to prevent unnecessary stretching
            const captureWidth = container.scrollWidth;
            const captureHeight = container.scrollHeight;

            // Wait for layout to update and styles to apply
            await new Promise(resolve => setTimeout(resolve, 200));

            // Use htmlToImage to convert to Blob
            const blob = await htmlToImage.toBlob(container, {
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--background-primary'),
                width: captureWidth,
                height: captureHeight,
                style: {
                    color: getComputedStyle(document.body).getPropertyValue('--text-normal'),
                    // Let CSS handle the dimensions via .dayble-capturing
                    height: `${captureHeight}px`,
                    width: `${captureWidth}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    overflow: 'visible'
                },
                filter: (node: unknown) => {
                    if (node && node.classList && typeof node.classList.contains === 'function') {
                        if (
                            node.classList.contains('dayble-header-buttons') || 
                            node.classList.contains('dayble-holder-toggle') ||
                            node.classList.contains('dayble-settings-toggle') ||
                            node.classList.contains('dayble-search-toggle') ||
                            node.classList.contains('dayble-copy-toggle') ||
                            node.classList.contains('dayble-save-image-toggle')
                        ) {
                            return false;
                        }
                    }
                    return true;
                }
            });

            // Remove capture class
            container.removeClass('dayble-capturing');

            if (!blob) {
                throw new Error('Failed to generate image blob');
            }

            const buffer = await blob.arrayBuffer();

            // Save to vault
            await this.app.vault.adapter.writeBinary(fullPath, buffer);
            
            notice.hide();
            new Notice(`Calendar image saved to: ${fullPath}`);
        } catch (error) {
            console.error('Dayble Calendar: Failed to save image', error);
            container.removeClass('dayble-capturing');
            notice.hide();
            new Notice('Failed to save calendar image');
        }
    }

    async copyCalendarAsMarkdown() {
        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        let text = '';
        if (view === 'Week') {
            text = this.buildWeekMarkdown();
        } else if (view === '3day') {
            text = this.buildThreeDayMarkdown();
        } else if (view === 'Day') {
            text = this.buildSingleDayMarkdown();
        } else if (view === 'Agenda') {
            text = this.buildAgendaMarkdownTable();
        } else {
            text = this.buildMonthMarkdown();
        }
        if (!text) {
            new Notice('Nothing to copy for this view');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            new Notice('Calendar copied as Markdown');
        } catch {
            new Notice('Failed to copy calendar');
        }
    }

    getCurrentDateString(): string {
        const d = this.currentDate;
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    }

    getMonthDates(): string[] {
        const y = this.currentDate.getFullYear();
        const m = this.currentDate.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const dates: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dates.push(fullDate);
        }
        return dates;
    }

    getWeekDates(): string[] {
        const weekStartSetting = this.plugin.settings.weekStartDay;
        const baseDate = new Date(this.currentDate);
        const tDow = baseDate.getDay();
        const diffDays = ((tDow - weekStartSetting) + 7) % 7;
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - diffDays);
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates.push(`${yy}-${mm}-${dd}`);
        }
        return dates;
    }

    get3DayDates(): string[] {
        const baseDate = new Date(this.currentDate);
        const dates: string[] = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates.push(`${yy}-${mm}-${dd}`);
        }
        return dates;
    }

    buildMonthMarkdown(): string {
        const dates = this.getMonthDates();
        if (!dates.length) return '';
        const heading = this.monthTitleEl?.textContent?.trim() || '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekStart = this.plugin.settings.weekStartDay ?? 0;
        const orderedDays = [...days.slice(weekStart), ...days.slice(0, weekStart)];

        const monthRow = `| ${heading || ''} |  |  |  |  |  |  |`;
        const monthSep = '| --- | --- | --- | --- | --- | --- | --- |';
        const headerRow = '| ' + orderedDays.join(' | ') + ' |';

        const startDate = new Date(dates[0] + 'T00:00:00');
        let offset = (startDate.getDay() - weekStart + 7) % 7;
        const weeks: string[][] = [];
        let currentRow: string[] = [];
        for (let i = 0; i < offset; i++) currentRow.push('');

        const eventsByDate = this.groupEventsByDate();

        dates.forEach(dateStr => {
            const cellText = this.formatMonthCell(dateStr, eventsByDate[dateStr] || []);
            currentRow.push(cellText);
            if (currentRow.length === 7) {
                weeks.push(currentRow);
                currentRow = [];
            }
        });

        if (currentRow.length) {
            while (currentRow.length < 7) currentRow.push('');
            weeks.push(currentRow);
        }

        const weekRows = weeks.map(row => '| ' + row.join(' | ') + ' |');
        const lines = [monthRow, monthSep, headerRow, ...weekRows];
        return lines.join('\n');
    }

    buildSingleDayMarkdown(): string {
        const dateStr = this.getCurrentDateString();
        const eventsByDate = this.groupEventsByDate();
        const events = (eventsByDate[dateStr] || []).slice();
        if (!events.length) return '';
        events.sort((a, b) => this.compareEventsByTime(a, b));

        const label = moment(dateStr + 'T00:00:00').format('dddd, D MMMM YYYY');
        const rows: string[] = [];
        rows.push(`| Date | ${label} |`);
        rows.push('| --- | --- |');
        rows.push('| Time | Event |');
        events.forEach(ev => {
            const time = this.getEventTimeRange(ev);
            const title = (ev.title || '').replace(/\n/g, ' ').trim();
            const description = (ev.description || '').replace(/\n/g, ' ').trim();
            let text = title;
            if (description) text += ` - ${description}`;
            rows.push(`| ${time} | ${text} |`);
        });
        return rows.join('\n');
    }

    buildThreeDayMarkdown(): string {
        const dates = this.get3DayDates();
        if (!dates.length) return '';
        const eventsByDate = this.groupEventsByDate();
        const perDayEvents = dates.map(d => {
            const list = (eventsByDate[d] || []).slice();
            list.sort((a, b) => this.compareEventsByTime(a, b));
            return list;
        });
        const labels = dates.map(d => moment(d + 'T00:00:00').format('dddd, D MMMM YYYY'));
        const rows: string[] = [];

        const headerCells: string[] = [];
        for (let i = 0; i < dates.length; i++) {
            headerCells.push('Date', labels[i]);
        }
        rows.push('| ' + headerCells.join(' | ') + ' |');

        const sepCells: string[] = [];
        for (let i = 0; i < dates.length; i++) {
            sepCells.push('---', '---');
        }
        rows.push('| ' + sepCells.join(' | ') + ' |');

        const labelCells: string[] = [];
        for (let i = 0; i < dates.length; i++) {
            labelCells.push('Time', 'Event');
        }
        rows.push('| ' + labelCells.join(' | ') + ' |');

        const maxRows = Math.max(...perDayEvents.map(list => list.length));
        for (let row = 0; row < maxRows; row++) {
            const cells: string[] = [];
            for (let i = 0; i < dates.length; i++) {
                const ev = perDayEvents[i][row];
                if (ev) {
                    const time = this.getEventTimeRange(ev);
                    const title = (ev.title || '').replace(/\n/g, ' ').trim();
                    const description = (ev.description || '').replace(/\n/g, ' ').trim();
                    let text = title;
                    if (description) text += ` - ${description}`;
                    cells.push(time, text);
                } else {
                    cells.push('', '');
                }
            }
            rows.push('| ' + cells.join(' | ') + ' |');
        }
        return rows.join('\n');
    }

    buildWeekMarkdown(): string {
        const dates = this.getWeekDates();
        if (!dates.length) return '';
        const eventsByDate = this.groupEventsByDate();
        const perDayEvents = dates.map(d => {
            const list = (eventsByDate[d] || []).slice();
            list.sort((a, b) => this.compareEventsByTime(a, b));
            return list;
        });
        const datesRowCells = dates.map(d => {
            const m = moment(d + 'T00:00:00');
            return m.format('MMM D');
        });
        const dayNames = dates.map(d => moment(d + 'T00:00:00').format('ddd'));

        const rows: string[] = [];
        rows.push('| ' + datesRowCells.join(' | ') + ' |');
        rows.push('| ' + datesRowCells.map(() => '---').join(' | ') + ' |');
        rows.push('| ' + dayNames.join(' | ') + ' |');

        const maxRows = Math.max(...perDayEvents.map(list => list.length));
        for (let row = 0; row < maxRows; row++) {
            const cells: string[] = [];
            for (let i = 0; i < dates.length; i++) {
                const ev = perDayEvents[i][row];
                if (ev) {
                    const time = this.getEventTimeRange(ev);
                    const title = (ev.title || '').replace(/\n/g, ' ').trim();
                    const description = (ev.description || '').replace(/\n/g, ' ').trim();
                    let text = `${time} - ${title}`;
                    if (description) text += ` - ${description}`;
                    cells.push(text);
                } else {
                    cells.push('');
                }
            }
            rows.push('| ' + cells.join(' | ') + ' |');
        }
        return rows.join('\n');
    }

    buildAgendaMarkdownTable(): string {
        const heading = this.monthTitleEl?.textContent?.trim() || '';
        const dayMap = new Map<string, DaybleEvent[]>();
        this.events.forEach(ev => {
            if (this.plugin.settings.onlyShowPinnedEventsAgenda && !ev.pinned) return;
            if (ev.date) {
                if (!dayMap.has(ev.date)) dayMap.set(ev.date, []);
                dayMap.get(ev.date).push(ev);
            } else if (ev.startDate && ev.endDate) {
                let curr = moment(ev.startDate, 'YYYY-MM-DD');
                const end = moment(ev.endDate, 'YYYY-MM-DD');
                
                // If an event ends exactly at 00:00 on its end day, we shouldn't show it on that end day.
                let effectiveEnd = end.clone();
                if (ev.time) {
                    const parts = String(ev.time).split('-');
                    const endStr = parts[1] || '';
                    if (endStr === '00:00' && ev.startDate !== ev.endDate) {
                        effectiveEnd.subtract(1, 'day'); // Move back to previous day
                    }
                }

                while (curr.isSameOrBefore(effectiveEnd, 'day')) {
                    const dStr = curr.format('YYYY-MM-DD');
                    if (!dayMap.has(dStr)) dayMap.set(dStr, []);
                    dayMap.get(dStr).push(ev);
                    curr.add(1, 'day');
                }
            }
        });
        const sortedDates = Array.from(dayMap.keys()).sort();
        if (!sortedDates.length) return '';
        const rows: string[] = [];
        rows.push(`| Agenda | ${heading} |`);
        rows.push('| --- | --- |');
        sortedDates.forEach(dateStr => {
            const label = moment(dateStr + 'T00:00:00').format(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM');
            const events = dayMap.get(dateStr) || [];
            const texts: string[] = [];
            events.sort((a, b) => this.compareEventsByTime(a, b));
            events.forEach(ev => {
                const title = (ev.title || '').replace(/\n/g, ' ').trim();
                const description = (ev.description || '').replace(/\n/g, ' ').trim();
                const time = this.getEventTimeRange(ev);
                let text = title;
                if (description) text += ` - ${description}`;
                if (time) text += `, ${time}`;
                if (text) texts.push(text);
            });
            rows.push(`| ${label} | ${texts.join('<br>')} |`);
        });
        return rows.join('\n');
    }

    groupEventsByDate(): Record<string, DaybleEvent[]> {
        const map: Record<string, DaybleEvent[]> = {};
        this.events.forEach(ev => {
            const addForDate = (d: string) => {
                if (!map[d]) map[d] = [];
                map[d].push(ev);
            };
            if (ev.date) {
                addForDate(ev.date);
            } else if (ev.startDate && ev.endDate) {
                let curr = moment(ev.startDate, 'YYYY-MM-DD');
                const end = moment(ev.endDate, 'YYYY-MM-DD');

                // If an event ends exactly at 00:00 on its end day, we shouldn't show it on that end day.
                let effectiveEnd = end.clone();
                if (ev.time) {
                    const parts = String(ev.time).split('-');
                    const endStr = parts[1] || '';
                    if (endStr === '00:00' && ev.startDate !== ev.endDate) {
                        effectiveEnd.subtract(1, 'day'); // Move back to previous day
                    }
                }

                while (curr.isSameOrBefore(effectiveEnd, 'day')) {
                    const dStr = curr.format('YYYY-MM-DD');
                    addForDate(dStr);
                    curr.add(1, 'day');
                }
            }
        });
        return map;
    }

    formatMonthCell(dateStr: string, events: DaybleEvent[]): string {
        const d = moment(dateStr + 'T00:00:00');
        const dayNum = d.date();
        if (!events.length) return String(dayNum);
        const texts: string[] = [];
        events.slice().sort((a, b) => this.compareEventsByTime(a, b)).forEach(ev => {
            const title = (ev.title || '').replace(/\n/g, ' ').trim();
            const description = (ev.description || '').replace(/\n/g, ' ').trim();
            const time = this.getEventTimeRange(ev);
            let text = title;
            if (description) text += `, ${description}`;
            if (time) text += `, ${time}`;
            if (text) texts.push(text);
        });
        return `${dayNum}. ${texts.join('; ')}`;
    }

    getEventTimeRange(ev: DaybleEvent): string {
        const timeFormatSetting = this.plugin.getTimeFormat();
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
        if (ev.time) {
            const segs = ev.time.split('-');
            const s = parseTime(segs[0]);
            const e = segs[1] ? parseTime(segs[1]) : null;
            if (s && e) {
                return `${formatTime(s.h, s.m)} to ${formatTime(e.h, e.m)}`;
            } else if (s) {
                return formatTime(s.h, s.m);
            }
        }
        if (ev.startDate && ev.endDate && ev.startDate !== ev.endDate) return 'all day';
        if (!ev.time) return 'all day';
        return '';
    }

    compareEventsByTime(a: DaybleEvent, b: DaybleEvent): number {
        const timeToMinutesLocal = (t: string | undefined) => {
            if (!t) return 0;
            const parts = t.split('-')[0].split(':').map(Number);
            const h = parts[0] || 0;
            const m = parts[1] || 0;
            return h * 60 + m;
        };
        const ta = timeToMinutesLocal(a.time);
        const tb = timeToMinutesLocal(b.time);
        return ta - tb;
    }

    startSelection(date: string, el: HTMLElement) {
        this.isSelecting = true;
        this.selectionStartDate = date;
        this.selectionEndDate = date;
        this.highlightSelectionRange();
        document.addEventListener('mouseup', this._endSelOnce);
        document.addEventListener('touchend', this._endSelOnceTouchEnd);
    }
    _endSelOnce = () => { document.removeEventListener('mouseup', this._endSelOnce); document.removeEventListener('touchend', this._endSelOnceTouchEnd); void this.endSelection(); };
    _endSelOnceTouchEnd = () => { document.removeEventListener('touchend', this._endSelOnceTouchEnd); document.removeEventListener('mouseup', this._endSelOnce); void this.endSelection(); };
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
    scrollEventIntoView(eventId: string) {
        const el = this.containerEl.querySelector(`.dayble-event[data-id="${eventId}"]`);
        if (!el) return;
        const view = this.plugin.settings.calendarView || (this.plugin.settings.calendarWeekActive ? 'Week' : 'Month');
        let scrollEl: HTMLElement | null = null;
        if (view === 'Day' || view === '3day') {
            scrollEl = this.dayModeTodayModal?.scroller || null;
        } else if (view === 'Agenda') {
            scrollEl = this.gridEl.querySelector('.dayble-agenda-container');
        } else {
            const cont = el.closest('.dayble-event-container');
            if (cont && cont.scrollHeight > cont.clientHeight) scrollEl = cont;
        }
        if (scrollEl) {
            const r = el.getBoundingClientRect();
            const sr = scrollEl.getBoundingClientRect();
            const offset = (r.top - sr.top) + scrollEl.scrollTop;
            const target = Math.max(0, offset - (scrollEl.clientHeight / 2 - r.height / 2));
            scrollEl.scrollTop = target;
        } else {
            el.scrollIntoView({ block: 'center' });
        }
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
        const view = this.plugin.settings.calendarView;
        const isMonth = view === 'Month' || (!view && !this.plugin.settings.calendarWeekActive);
        const isWeek = view === 'Week' || (!view && this.plugin.settings.calendarWeekActive);
        if ((isMonth && this.plugin.settings.onlyShowPinnedEventsMonth) || (isWeek && this.plugin.settings.onlyShowPinnedEventsWeek)) {
            modal.isPinned = true;
        }
        void modal.open();
    }

    renderLongEvents() {
        if (!this._longOverlayEl || !this._longOverlayEl.isConnected) {
            this._longOverlayEl = this.gridEl.createDiv({ cls: 'dayble-long-overlay' });
            this._longOverlayEl.addClass('dayble-long-overlay-box');
        }
        const cells = Array.from(this.gridEl.children).filter(el => (el as HTMLElement).hasClass?.('dayble-day')) as HTMLElement[];
        
        // Fixed buffer from the top of the day cell to the first long event
        const HEADER_BUFFER = 38; // LN
        const vPadding = this.plugin.settings.eventVerticalPadding ?? 2;
        const segmentHeight = 24 + (vPadding * 2); // LN
        const segmentGap = 4; // LN
        
        // Fine-grained lane system using units
        const LANE_UNIT_HEIGHT = 4; // LN
        const lanesPerEvent = Math.ceil(segmentHeight / LANE_UNIT_HEIGHT); // LN
        const lanesPerGap = Math.ceil(segmentGap / LANE_UNIT_HEIGHT); // LN
        const lanesPerDesc = 3; // 20px extra for description // LN
        const lanesPerIcon = 0; // 28px extra for top/bottom icons // LN
        const COMPLEX_ICON_DESC_ADJUST_PX = 4; // LN new: reduce spacer by 2px when icon+description
        const ICON_ONLY_TOP_ADJUST_PX = 0; // LN new: title + icon (top) adjustment
        const ICON_ONLY_BOTTOM_ADJUST_PX = -7; // LN new: title + icon (bottom) adjustment
        const TYPE_OFFSET_LD_PX = 0; // LN new: type offset for long+desc
        const TYPE_OFFSET_LI_PX = 0; // LN new: type offset for long+icon
        const TYPE_OFFSET_LB_PX = -4; // LN new: type offset for long+icon+desc (bring LB 4px lower)
        const LI_BOTTOM_GAP_REDUCE_UNITS = 6; // LN new: reduce bottom gap units for LI

        // const ICON_ONLY_TOP_LANE_ADJUST_PX = 60; // LN new: title + icon at top lane
        // const ICON_ONLY_BOTTOM_LANE_ADJUST_PX = 6; // LN new: title + icon at bottom lane

        let longEvents = this.events.filter(ev => ev.startDate && ev.endDate && ev.startDate !== ev.endDate);
        const isMonth = this.plugin.settings.calendarView === 'Month' || (!this.plugin.settings.calendarView && !this.plugin.settings.calendarWeekActive);
        const isWeek = this.plugin.settings.calendarView === 'Week' || (!this.plugin.settings.calendarView && this.plugin.settings.calendarWeekActive);
        
        if ((isMonth && this.plugin.settings.onlyShowPinnedEventsMonth) || (isWeek && this.plugin.settings.onlyShowPinnedEventsWeek)) {
            longEvents = longEvents.filter(ev => ev.pinned);
        }

        const { eventLanes, maxLanesByDate } = this.calculateLongEventLanes(longEvents, { lanesPerEvent, lanesPerGap, lanesPerDesc, lanesPerIcon, liBottomGapReduceUnits: LI_BOTTOM_GAP_REDUCE_UNITS });
        const countsByDate = maxLanesByDate;

        // Compute per-date adjustment for complex long events (icon + description)
        const cellDateSet = new Set(cells.map(c => c.getAttr('data-date')));
        const complexAdjustByDate: Record<string, number> = {};
        const adjustByEventId: Record<string, number> = {}; // LN
        longEvents.forEach(ev => {
            // const stackIndex = eventLanes.get(ev.id) ?? 0; // LN
            const hasDescription = !!(ev.description && ev.description.trim().length > 0);
            const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
            const state = ev.stateId ? (this.plugin.settings.eventStates || []).find(s => s.id === ev.stateId) : null;
            const iconToUse = (state && state.icon) || ev.icon || (category?.icon || '');
            const hasIcon = !!iconToUse;
            const iconPlacement = this.plugin.settings.iconPlacement || 'left';
            const isTopIcon = iconPlacement.startsWith('top');
            const isBottomIcon = iconPlacement.startsWith('bottom');
            // Clamp to visible grid range
            const gridStartStr = cells[0]?.getAttr('data-date');
            const gridEndStr = cells[cells.length - 1]?.getAttr('data-date');
            if (!gridStartStr || !gridEndStr) return;
            const evStartFull = new Date(ev.startDate);
            const evEndFull = new Date(ev.endDate);
            const gridStart = new Date(gridStartStr);
            const gridEnd = new Date(gridEndStr);
            const clampedStart = evStartFull < gridStart ? gridStart : evStartFull;
            const clampedEnd = evEndFull > gridEnd ? gridEnd : evEndFull;
            if (clampedStart > clampedEnd) return;
            for (let d = new Date(clampedStart); d <= clampedEnd; d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${dd}`;
                if (!cellDateSet.has(dateStr)) continue;
                // icon + description
                if (hasIcon && hasDescription) {
                    complexAdjustByDate[dateStr] = (complexAdjustByDate[dateStr] || 0) + (COMPLEX_ICON_DESC_ADJUST_PX + TYPE_OFFSET_LB_PX); // LN
                    adjustByEventId[ev.id] = (adjustByEventId[ev.id] || 0) + (COMPLEX_ICON_DESC_ADJUST_PX + TYPE_OFFSET_LB_PX); // LN
                }
                // title + just icon (no description)
                if (hasIcon && !hasDescription) {
                    if (isTopIcon) {
                        complexAdjustByDate[dateStr] = (complexAdjustByDate[dateStr] || 0) + (ICON_ONLY_TOP_ADJUST_PX + TYPE_OFFSET_LI_PX); // LN
                        adjustByEventId[ev.id] = (adjustByEventId[ev.id] || 0) + (ICON_ONLY_TOP_ADJUST_PX + TYPE_OFFSET_LI_PX); // LN
                    } else if (isBottomIcon) {
                        complexAdjustByDate[dateStr] = (complexAdjustByDate[dateStr] || 0) + (ICON_ONLY_BOTTOM_ADJUST_PX + TYPE_OFFSET_LI_PX); // LN
                        adjustByEventId[ev.id] = (adjustByEventId[ev.id] || 0) + (ICON_ONLY_BOTTOM_ADJUST_PX + TYPE_OFFSET_LI_PX); // LN
                    } else {
                        // Side icon case: apply type offset only
                        complexAdjustByDate[dateStr] = (complexAdjustByDate[dateStr] || 0) + TYPE_OFFSET_LI_PX; // LN
                        adjustByEventId[ev.id] = (adjustByEventId[ev.id] || 0) + TYPE_OFFSET_LI_PX; // LN
                    }
                }
                // long + description only
                if (!hasIcon && hasDescription) {
                    complexAdjustByDate[dateStr] = (complexAdjustByDate[dateStr] || 0) + TYPE_OFFSET_LD_PX; // LN
                    adjustByEventId[ev.id] = (adjustByEventId[ev.id] || 0) + TYPE_OFFSET_LD_PX; // LN
                }
            }
        });

        // Pairwise gap adjustment (prevType -> currType)
        const PAIR_ADJUST: Record<string, Record<string, number>> = {
            LD: { LI: -1, LB: -1 },
            LI: { LD: +2, LI: 0, LB: 0 },
            LB: { LI: 0, LD: 0, LB: 0 }
        }; // LN

        const getEventType = (ev: DaybleEvent): 'LD' | 'LI' | 'LB' | 'N' => {
            const hasDescription = !!(ev.description && ev.description.trim().length > 0);
            const category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
            const state = ev.stateId ? (this.plugin.settings.eventStates || []).find(s => s.id === ev.stateId) : null;
            const iconToUse = (state && state.icon) || ev.icon || (category?.icon || '');
            const hasIcon = !!iconToUse && this.plugin.settings.iconPlacement !== 'none';
            if (hasIcon && hasDescription) return 'LB';
            if (hasIcon && !hasDescription) return 'LI';
            if (!hasIcon && hasDescription) return 'LD';
            return 'N';
        }; // LN

        // Build prev-type mapping per visible date
        const prevTypeByEventDateKey: Record<string, string> = {}; // LN
        const visibleDates = cells.map(c => c.getAttr('data-date')).filter(Boolean); // LN
        visibleDates.forEach(dateStr => {
            const evsOnDate = longEvents
                .filter(ev => {
                    if (!ev.startDate || !ev.endDate) return false;
                    const d = new Date(dateStr);
                    const s = new Date(ev.startDate);
                    const e = new Date(ev.endDate);
                    return d >= s && d <= e;
                })
                .sort((a, b) => (eventLanes.get(a.id) ?? 0) - (eventLanes.get(b.id) ?? 0));
            let prevType: string | null = null;
            evsOnDate.forEach(ev => {
                const key = `${ev.id}|${dateStr}`;
                if (prevType) prevTypeByEventDateKey[key] = prevType;
                prevType = getEventType(ev);
            });
        }); // LN

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
            const baseHeight = unitsCount * LANE_UNIT_HEIGHT; // LN
            const adjustPx = complexAdjustByDate[date] || 0; // LN
            const totalHeight = Math.max(0, baseHeight - adjustPx); // LN
            
            // Use a single spacer wall for efficiency and smoother layout
            let wall = wallsContainer.firstElementChild as HTMLElement;
            if (!wall) wall = wallsContainer.createDiv({ cls: 'dayble-lane-wall' });
            wall.setCssProps({ 'height': `${totalHeight}px` }); // LN
            
            while (wallsContainer.children.length > 1) {
                wallsContainer.lastElementChild?.remove();
            }
        });

        // Function to position a single event segment using fixed calculations
        const positionEventSegment = (item: HTMLElement, first: HTMLElement, last: HTMLElement, stackIndex: number, evId?: string) => {
            const frLeft = first.offsetLeft;
            const frTop = first.offsetTop;
            const lrRight = last.offsetLeft + last.offsetWidth;
            
            // Fixed top offset calculation based on lane unit index
            const baseTopOffset = HEADER_BUFFER + (stackIndex * LANE_UNIT_HEIGHT); // LN
            const perEventAdjust = (evId && adjustByEventId[evId]) ? adjustByEventId[evId] : 0; // LN
            // Pairwise adjustment based on previous event on the same date
            let pairAdjustPx = 0; // LN
            // Lane-sequence compression to prevent drift in LI/LB sequences
            let seqCompressPx = 0; // LN
            if (evId) {
                const dateStr = first.getAttr('data-date');
                if (dateStr) {
                    const prevType = prevTypeByEventDateKey[`${evId}|${dateStr}`];
                    if (prevType) {
                        const currType = getEventType(this.events.find(e => e.id === evId));
                        pairAdjustPx = (PAIR_ADJUST[prevType]?.[currType] ?? 0);
                        if (stackIndex >= 1) {
                            if (currType === 'LI') seqCompressPx = 2; // LN
                            else if (currType === 'LB') seqCompressPx = 1; // LN
                        }
                    }
                }
            }
            const topOffset = Math.max(0, baseTopOffset - (perEventAdjust + pairAdjustPx + seqCompressPx)); // LN
            
            const left = frLeft;
            const top = frTop + topOffset; // LN
            const width = (lrRight - frLeft);
            
            item.setCssProps({
                'left': `${left}px`,
                'top': `${top}px`,
                'width': `${width}px`
            });
            
            return { top, left, width };
        };

        sortedLongEvents.forEach(ev => {
            // Determine the visible date range in the current grid
            const gridStartStr = cells[0]?.getAttr('data-date');
            const gridEndStr = cells[cells.length - 1]?.getAttr('data-date');
            if (!gridStartStr || !gridEndStr) return;

            const evStartFull = new Date(ev.startDate);
            const evEndFull = new Date(ev.endDate);
            const gridStart = new Date(gridStartStr);
            const gridEnd = new Date(gridEndStr);

            // Clamp event range to the visible grid range (supports events starting in previous/next week)
            const clampedStart = evStartFull < gridStart ? gridStart : evStartFull;
            const clampedEnd = evEndFull > gridEnd ? gridEnd : evEndFull;

            // If no overlap with current grid, skip
            if (clampedStart > clampedEnd) return;

            const clampedStartStr = `${clampedStart.getFullYear()}-${String(clampedStart.getMonth() + 1).padStart(2, '0')}-${String(clampedStart.getDate()).padStart(2, '0')}`;

            const startIdx = cells.findIndex(c => c.getAttr('data-date') === clampedStartStr);
            if (startIdx === -1) return;
            const start = clampedStart;
            const end = clampedEnd;
            
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
                    item = this.createEventItem(ev, true, false, true); // isLong=true hides description, isAllDay=true for formatting
                    item.addClass('dayble-long-event', 'dayble-long-event-single', 'dayble-absolute-box');
                    item.dataset.longKey = key;
                    item.dataset.styleSig = styleSig;
                    item.dataset.contentSig = contentSig;
                    item.onclick = async (e) => { e.stopPropagation(); await this.openEventModal(ev.id, ev.startDate, ev.endDate); };
                    this.gridEl.appendChild(item);
                    this._longEls.set(key, item);
                }
                
                if (!item.isConnected) this.gridEl.appendChild(item);
                positionEventSegment(item, first, last, stackIndex, ev.id);

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
                        item = this.createEventItem(ev, true, false, true);
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
                    positionEventSegment(item, first, last, stackIndex, ev.id);
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
                const container = cell.querySelector('.dayble-event-container');
                if (container) {
                    const maxH = this.plugin.settings.dayCellMaxHeight ?? 0;
                    if (maxH > 0) {
                        (cell).setCssProps({ '--dayble-cell-max-height': `${maxH}px` });
                        (cell).addClass('dayble-cell-max');
                        container.removeClass('dayble-overflow-visible');
                        container.addClass('dayble-scroll-y', 'dayble-scroll-x-hidden');
                    } else {
                        (cell).style.removeProperty('--dayble-cell-max-height');
                        (cell).removeClass('dayble-cell-max');
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
        const timeFormatSetting = this.plugin.getTimeFormat();
        
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

    createEventItem(ev: DaybleEvent, isLong = false, isDayMode = false, isAllDay = false, isAgenda = false): HTMLElement {
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
        const globalSettings = this.plugin.settings;
        
        const isAllDaySection = isAllDay;

        let titleAlign = eventSettings.titleAlign || globalSettings.eventTitleAlign || 'center';
        let descAlign = eventSettings.descAlign || globalSettings.eventDescAlign || 'center';

        // Agenda override: Force center ALWAYS
        if (isAgenda) {
            titleAlign = 'center';
            descAlign = 'center';
        }

        // FORCE LEFT for all-day sections (except in agenda mode)
        if (isAllDaySection && !isAgenda) {
            titleAlign = 'left';
            descAlign = 'left';
        }

        const isCenterLeftMode = titleAlign === 'center-left' && descAlign === 'center-left';

        // Strip '-left' for actual alignment classes
        let actualTitleAlign = titleAlign.replace('-left', '') as 'left' | 'center' | 'right';

        // If in center-left mode, description MUST follow title's alignment
        if (isCenterLeftMode) {
            // actualDescAlign = actualTitleAlign;
        }

        item.addClass(`dayble-title-align-${titleAlign}`);
        item.addClass(`dayble-desc-align-${descAlign}`);
        
        // CRITICAL: Add layout class when title is centered OR in center-left mode
        if (actualTitleAlign === 'center' || titleAlign === 'center-left') {
            item.addClass('dayble-layout-center-flex');
        }

        // Dynamic "center-left" transition logic
        if (titleAlign === 'center-left') {
            const checkAlignment = () => {
                const titleEl = item.querySelector('.dayble-event-title');
                if (!titleEl) return;
                // Measure natural single-line width
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) return;
                const computedStyle = window.getComputedStyle(titleEl);
                context.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
                const naturalWidth = context.measureText(titleEl.innerText).width;
                const containerWidth = item.getBoundingClientRect().width;
                const iconEl = item.querySelector('.dayble-event-icon');
                let iconWidth = 0;
                const isSideIcon = item.classList.contains('dayble-icon-placement-left') || item.classList.contains('dayble-icon-placement-right');
                
                if (iconEl && iconEl.offsetParent && isSideIcon) {
                    iconWidth = iconEl.getBoundingClientRect().width;
                    const iconStyle = window.getComputedStyle(iconEl);
                    iconWidth += parseFloat(iconStyle.marginLeft) + parseFloat(iconStyle.marginRight);
                }
                const eventStyle = window.getComputedStyle(item);
                const padding = parseFloat(eventStyle.paddingLeft) + parseFloat(eventStyle.paddingRight);
                const gap = parseFloat(eventStyle.gap) || 0;
                const availableWidth = containerWidth - padding - (iconWidth > 0 ? iconWidth + gap : 0) - 4; // 4px extra buffer
                if (naturalWidth >= availableWidth) {
                    item.addClass('dayble-force-left');
                } else {
                    item.removeClass('dayble-force-left');
                }
            };

            // Initial check
            checkAlignment();
            // Use a slightly longer timeout and a more robust measurement
            setTimeout(() => {
                checkAlignment();
                // Observe for size changes (e.g., window resize)
                const observer = new ResizeObserver(() => checkAlignment());
                observer.observe(item);
            }, 0);
        }

        // Determine which colors to use: user-set or category
        let category = this.plugin.settings.eventCategories?.find(c => c.id === ev.categoryId);
        
        // Trigger matching for icon and color
        let triggerIcon = '';
        let triggerColorName = '';
        
        const fullText = `${ev.title || ''} ${ev.description || ''}`.toLowerCase();

        // If no category is assigned, check triggers globally to find a category
        if (!category && this.plugin.settings.triggers) {
            for (const trigger of this.plugin.settings.triggers) {
                const patterns = (trigger.pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
                if (patterns.some(p => fullText.includes(p))) {
                    category = this.plugin.settings.eventCategories?.find(c => c.id === trigger.categoryId);
                    if (category) {
                        triggerIcon = trigger.icon || '';
                        triggerColorName = trigger.colorName || '';
                        break;
                    }
                }
            }
        } else if (category && this.plugin.settings.triggers) {
            // If category IS assigned, check triggers within that category for overrides
            const catTriggers = this.plugin.settings.triggers.filter(t => t.categoryId === category.id);
            for (const trigger of catTriggers) {
                const patterns = (trigger.pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
                if (patterns.some(p => fullText.includes(p))) {
                    triggerIcon = trigger.icon || '';
                    triggerColorName = trigger.colorName || '';
                    break;
                }
            }
        }

        let bgColor = '';
        let textColor = '';
        let colorName = ev.colorName || (!ev.color && !category ? this.plugin.settings.defaultEventColorName : (category?.colorName || undefined));

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
                
                item.setCssProps({
                    '--event-bg-color': hexToRgba(swatchBg, opacity),
                    '--event-text-color': swatchText,
                    '--event-border-color': hexToRgba(swatchText, bOpacity)
                });
                
                bgColor = swatchBg;
                textColor = swatchText;
            }
        }
        
        // If still no color (no colorName or swatch not found), fallback to inline colors
        if (!bgColor) {
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
                item.setCssProps({ '--event-bg-color': rgbaColor, '--event-text-color': textColor });
                const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                const borderColor = hexToRgba(textColor, bOpacity);
                item.setCssProps({ '--event-border-color': borderColor });
                item.classList.add('dayble-event-colored');
            }
        }
        
        // Use background-primary-alt for focus scroll modes if no color is set
        if (!bgColor && isDayMode) {
            item.setCssProps({ '--event-bg-color': 'var(--dayble-focus-event-default-bg)' });
        }
        
        // Apply border width settings
        item.setCssProps({
            '--event-border-width': `${this.plugin.settings.eventBorderWidth ?? 2}px`,
            '--event-border-radius': `${this.plugin.settings.eventBorderRadius ?? 6}px`,
            '--event-vertical-padding': `${this.plugin.settings.eventVerticalPadding ?? 2}px`
        });
        
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

        const iconToUse = (state && state.icon) || triggerIcon || ev.icon || (category?.icon || '');
        
        // Apply trigger color if found and user hasn't set a manual color/colorName
        if (triggerColorName && !ev.colorName && !ev.color) {
            const allSwatches = [...(this.plugin.settings.swatches || []), ...(this.plugin.settings.userCustomSwatches || [])];
            const swatch = allSwatches.find(s => (s.name || '').toLowerCase() === triggerColorName.toLowerCase());
            if (swatch) {
                const opacity = this.plugin.settings.eventBgOpacity ?? 1;
                const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                const textColorToUse = swatch.textColor || chooseTextColor(swatch.color);
                item.setCssProps({
                    '--event-bg-color': hexToRgba(swatch.color, opacity),
                    '--event-text-color': textColorToUse,
                    '--event-border-color': hexToRgba(textColorToUse, bOpacity)
                });
                item.classList.add('dayble-event-colored');
            }
        }

        const hasDescription = ev.description && ev.description.trim().length > 0;
        const hasIcon = this.plugin.settings.iconPlacement !== 'none' && iconToUse;

        if (isLong && hasDescription && hasIcon) {
            item.addClass('dayble-long-event-complex');
        }

        if ((isAllDaySection || this.plugin.settings.iconPlacement !== 'none') && iconToUse) {
            let place = isAllDaySection ? 'left' : (this.plugin.settings.iconPlacement ?? 'left');
            if (!isAllDaySection && isDayMode) place = 'top'; // Force top in day mode
            


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
                    const bOpacity = this.plugin.settings.eventBorderOpacity ?? 1;
                    const borderColor = hexToRgba(bgColor, bOpacity);
                    item.setCssProps({
                        '--event-bg-color': bgColor,
                        '--event-text-color': textColor,
                        '--event-border-color': borderColor
                    });
                    item.classList.add('dayble-event-colored');
                    // Update desc text color if present
                    const desc = item.querySelector('.dayble-event-desc');
                    if (desc) (desc).setCssProps({ 'color': textColor });
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
                    void (leaf).openFile(file);
                }
            }
        }, { capture: true });
        item.ondragstart = e => {
            this.isSelecting = false;
            this.isDragging = true;
            this.clearSelection();
            e.dataTransfer?.setData('text/plain', ev.id);
            (e.dataTransfer)?.setData('dayble-source','calendar');
            try {
                const dragImg = item.cloneNode(true) as HTMLElement;
                dragImg.addClass('dayble-drag-ghost');
                // Ensure ghost is "visible" for browser capture but off-screen or behind
                dragImg.setCssProps({
                    'position': 'fixed',
                    'top': '0',
                    'left': '0',
                    'z-index': '-10000'
                });
                const rect = item.getBoundingClientRect();
                dragImg.setCssProps({
                    'width': `${rect.width}px`,
                    'height': `${rect.height}px`,
                    'border-radius': getComputedStyle(item).borderRadius
                });
                document.body.appendChild(dragImg);
                e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = dragImg;
            } catch { /* intentional */ }
            item.addClass('dayble-dragging');
        };
        item.ondragend = () => {
            item.removeClass('dayble-dragging');
            const di = (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg;
            if (di && di.parentElement) di.remove();
            (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = undefined;
            this.isDragging = false;
        };

        // Touch drag support for mobile (month/week view)
        let touchDragTimer: ReturnType<typeof setTimeout> | null = null;
        let touchDragging = false;
        let touchGhost: HTMLElement | null = null;
        item.addEventListener('touchstart', (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            touchDragging = false;
            touchDragTimer = setTimeout(() => {
                touchDragging = true;
                this.isSelecting = false;
                this.isDragging = true;
                this.clearSelection();
                if (navigator.vibrate) navigator.vibrate(50);
                item.addClass('dayble-dragging');
                // Create ghost
                const rect = item.getBoundingClientRect();
                touchGhost = document.body.createDiv({ cls: 'dayble-drag-ghost' });
                const clone = item.cloneNode(true) as HTMLElement;
                clone.setCssProps({ 'width': `${rect.width}px`, 'height': `${rect.height}px` });
                touchGhost.appendChild(clone);
                touchGhost.setCssProps({
                    'position': 'fixed', 'z-index': '9999', 'pointer-events': 'none',
                    'opacity': '0.8', 'left': `${rect.left}px`, 'top': `${rect.top}px`,
                    'width': `${rect.width}px`, 'height': `${rect.height}px`
                });
            }, 400);
        }, { passive: true });

        item.addEventListener('touchmove', (e: TouchEvent) => {
            if (touchDragTimer) { clearTimeout(touchDragTimer); touchDragTimer = null; }
            if (!touchDragging || !touchGhost) return;
            e.preventDefault();
            const t = e.touches[0];
            if (!t) return;
            touchGhost.setCssProps({ 'left': `${t.clientX - 20}px`, 'top': `${t.clientY - 20}px` });
            // Highlight drop target
            touchGhost.setCssProps({ 'pointer-events': 'none' });
            const target = document.elementFromPoint(t.clientX, t.clientY);
            this.gridEl.querySelectorAll('.dayble-drag-over').forEach(el => el.removeClass('dayble-drag-over'));
            const cell = target?.closest('[data-date]');
            if (cell) (cell as HTMLElement).addClass('dayble-drag-over');
        }, { passive: false });

        item.addEventListener('touchend', (e: TouchEvent) => {
            if (touchDragTimer) { clearTimeout(touchDragTimer); touchDragTimer = null; }
            if (!touchDragging) return;
            e.preventDefault();
            touchDragging = false;
            item.removeClass('dayble-dragging');
            if (touchGhost) { touchGhost.remove(); touchGhost = null; }
            this.gridEl.querySelectorAll('.dayble-drag-over').forEach(el => el.removeClass('dayble-drag-over'));
            this.isDragging = false;

            const t = e.changedTouches[0];
            if (!t) return;
            const target = document.elementFromPoint(t.clientX, t.clientY);
            const cell = target?.closest('[data-date]');
            if (!cell) return;
            const newDate = (cell as HTMLElement).dataset.date;
            if (!newDate) return;

            void (async () => {
                try {
                    const idx = this.events.findIndex(event => event.id === ev.id);
                    if (idx === -1) return;
                    const original = this.events[idx];
                    const updated = JSON.parse(JSON.stringify(original));
                    if (original.startDate && original.endDate && original.startDate !== original.endDate) {
                        const diffMs = new Date(original.endDate).getTime() - new Date(original.startDate).getTime();
                        const diffDays = Math.round(diffMs / 86400000);
                        const newStart = new Date(newDate + 'T00:00:00');
                        const newEnd = new Date(newStart);
                        newEnd.setDate(newEnd.getDate() + diffDays);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        updated.startDate = newDate;
                        updated.endDate = `${newEnd.getFullYear()}-${pad(newEnd.getMonth()+1)}-${pad(newEnd.getDate())}`;
                        updated.date = newDate;
                    } else {
                        updated.date = newDate;
                        updated.startDate = newDate;
                        updated.endDate = newDate;
                    }
                    this.events[idx] = updated;
                    await this.saveAllEntries();
                    await this.render();
                } catch { /* intentional */ }
            })();
        }, { passive: false });
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
                const wasCompleted = !!ev.completed;
                ev.completed = !ev.completed;
                await this.saveAllEntries();
                await this.render();
                if (!wasCompleted && ev.completed) { try { this.plugin.playSoundMarkComplete(); } catch { /* intentional */ } }
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
            if (ev.time) {
                const parts = String(ev.time).split('-');
                const endStr = parts[1] || '';
                if (endStr === '00:00') {
                    // If it ends exactly at 00:00, the event does not occur on the end date
                    if (todayStr === ev.endDate) return false;
                }
            }
            return ev.startDate <= todayStr && ev.endDate >= todayStr;
        }
        if (ev.startDate && !ev.endDate) {
            return ev.startDate === todayStr;
        }
        return false;
    }

    renderHolder() {
        const list = this.holderEl?.querySelector('.dayble-holder-list');
        if (!list) return;
        list.empty();
        this.holderEvents.forEach(ev => {
            const item = this.createEventItem(ev, false, false, false);
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
                    dragImg.setCssProps({
                        'position': 'fixed',
                        'top': '0',
                        'left': '0',
                        'z-index': '-10000'
                    });
                    const rect = item.getBoundingClientRect();
                    dragImg.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'border-radius': getComputedStyle(item).borderRadius
                    });
                    document.body.appendChild(dragImg);
                    e.dataTransfer?.setDragImage(dragImg, Math.min(8, rect.width / 4), Math.min(8, rect.height / 4));
                    (item as HTMLElement & { __dragImg?: HTMLElement }).__dragImg = dragImg;
                } catch { /* intentional */ }
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

    async openEventModal(id?: string, date?: string, endDate?: string, startTime?: string, endTime?: string, defaultPinned?: boolean): Promise<void> {
        const folder = this.plugin.settings.entriesFolder?.trim();
        if (!folder) { new StorageFolderNotSetModal(this.app).open(); return; }
        try { await this.app.vault.adapter.stat(folder); }
        catch { new StorageFolderNotSetModal(this.app).open(); return; }
        
        let originalId = id;
        if (id && id.includes('-')) {
            const parts = id.split('-');
            const lastPart = parts[parts.length - 1];
            if (/^\d{4}-\d{2}-\d{2}$/.test(lastPart)) {
                originalId = id.substring(0, id.lastIndexOf('-'));
            }
        }
        
        const existing = originalId ? (this.events.find(e => e.id === originalId) ?? this.holderEvents.find(e => e.id === originalId)) : undefined;
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
            } catch { /* intentional */ }
            this.renderHolder();
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
        }, () => {
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
        if (!existing && defaultPinned) modal.isPinned = true;
        void modal.open();
    }

    openTodayModal(date: string) {
        const modal = new TodayModal(this.app, date, this.events, this);
        this.currentTodayModal = modal;
        modal.onClose = () => { this.currentTodayModal = undefined; };
        void modal.open();
    }
}


