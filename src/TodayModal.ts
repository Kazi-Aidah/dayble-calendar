import { App, Modal, setTooltip, moment } from 'obsidian';
import type { DaybleEvent } from './types';
import { timeToMinutes } from './constants';
import { resolveNoteFile } from './utils';

export default class TodayModal extends Modal {
    date: string | string[];
    events: DaybleEvent[];
    view?: unknown;
    dragId?: string;
    dragDuration?: number;
    dragEl?: HTMLElement;
    dragOffsetY?: number;
    lastScrollTop?: number;
    _dayMode3ROs: ResizeObserver[] = [];

    gridContainer: HTMLElement;
    morningGrid: HTMLElement;
    afternoonGrid: HTMLElement;
    overlay: HTMLElement;
    scroller: HTMLElement;
    currentTimeInterval?: unknown;
    lastCurrentEventId?: string;

    constructor(app: App, date: string | string[], events: DaybleEvent[], view?: unknown) {
        super(app);
        this.date = date;
        this.events = events;
        this.view = view;
    }

    onOpen() {
        const c = this.contentEl;
        const isMobile = window.innerWidth <= 700;
        const split = (!isMobile) && (this.view?.plugin?.settings?.todayModalSplitView ?? true);
        const isMulti = Array.isArray(this.date);
        const dates = isMulti ? (this.date as string[]) : [this.date as string];
        const primaryDate = dates[0];

        const expandedEvents = this.view ? this.view.getExpandedEvents(moment(dates[0]), moment(dates[dates.length - 1])) : this.events;

        if (split && !isMulti) this.modalEl.addClass('dayble-modal-wide');
        c.empty();
        c.addClass('dayble-modal-column');
        c.addClass('dayble-modal-full-height');
        c.addClass('db-modal');

        const [year, month, day] = primaryDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        if (!isMulti) {
            const title = c.createEl('h3', { text: `${monthNames[dateObj.getMonth()]} ${day}` });
            title.addClass('db-modal-title');
            title.addClass('dayble-modal-title');
        }

        const fmt = this.view?.plugin?.getTimeFormat() ?? '24h';
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
        const startHour = 0;
        const endHour = 23;
        for (let h = startHour; h <= endHour; h++) {
            slots.push({ hour: h, minute: 0 });
            slots.push({ hour: h, minute: 30 });
        }

        let allDaySection: HTMLElement | null = null;
        if (isMulti) {
            const header = c.createDiv({ cls: 'dayble-3day-header' });
            allDaySection = document.createElement('div');
            allDaySection.className = 'dayble-3day-all-day-section';

            const syncWidths = () => {
                const grid = c.querySelector('.dayble-focus-grid');
                if (grid && allDaySection) {
                    const style = window.getComputedStyle(grid);
                    const gridTemplate = style.getPropertyValue('grid-template-columns');
                    if (gridTemplate) {
                        header.setCssProps({ 'grid-template-columns': gridTemplate });
                        allDaySection.setCssProps({ 'grid-template-columns': gridTemplate });
                    }
                }
            };

            header.createDiv({ cls: 'dayble-3day-header-spacer', text: '' });
            dates.forEach(dStr => {
                const [y, m, d] = dStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const label = moment(dateObj).format(this.view?.plugin?.settings?.threeDayDateFormat || 'ddd D');
                const headerDay = header.createDiv({ cls: 'dayble-3day-header-day', text: label });
                headerDay.setCssProps({ cursor: 'pointer' });
                headerDay.onclick = () => {
                    this.view?.openEventModal(undefined, dStr, dStr);
                };
            });

            const allDaySpacer = allDaySection.createDiv({ cls: 'dayble-3day-all-day-spacer', text: '' });
            let maxAllDayEvents = 0;

            dates.forEach(dStr => {
                const dayCol = allDaySection.createDiv({ cls: 'dayble-3day-all-day-day' });
                dayCol.setAttr('data-date', dStr);
                dayCol.onclick = (e) => {
                    if ((e.target as HTMLElement).closest('.dayble-event')) return;
                    this.view?.openEventModal(undefined, dStr);
                };

                dayCol.ondragover = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.dragId) {
                        e.dataTransfer.dropEffect = 'move';
                        dayCol.addClass('drop-target');
                    }
                };
                dayCol.ondragleave = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dayCol.removeClass('drop-target');
                };
                dayCol.ondrop = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dayCol.removeClass('drop-target');
                    const id = this.dragId;
                    if (!id) return;
                    try {
                        const evIdx = (this.view?.events || []).findIndex((ev: DaybleEvent) => ev.id === id);
                        if (evIdx !== -1 && this.view) {
                            const originalEv = this.view.events[evIdx];
                            const updatedEv = JSON.parse(JSON.stringify(originalEv));
                            updatedEv.date = dStr;
                            updatedEv.startDate = dStr;
                            updatedEv.endDate = dStr;
                            updatedEv.time = undefined;
                            this.view.events[evIdx] = updatedEv;
                            await this.view.saveAllEntries();
                            await this.view.render();
                            this.onOpen();
                        }
                    } catch { /* intentional */ }
                    this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
                };

                const dayEvents = (expandedEvents || []).filter((e: DaybleEvent) => {
                    let isToday = (e.date === dStr) || (e.startDate === dStr) ||
                                    (e.startDate && e.endDate && dStr >= e.startDate && dStr <= e.endDate);
                    if (isToday && e.time && e.startDate && e.endDate && dStr === e.endDate) {
                        const parts = String(e.time).split('-');
                        const endStr = parts[1] || '';
                        if (endStr === '00:00' && e.startDate !== e.endDate) {
                            isToday = false;
                        }
                    }
                    if (!isToday) return false;
                    return !e.time;
                }).sort((a: DaybleEvent, b: DaybleEvent) => {
                    const ad = a.startDate && a.endDate ? (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) : 0;
                    const bd = b.startDate && b.endDate ? (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) : 0;
                    if (ad !== bd) return bd - ad;
                    return (a.title || '').localeCompare(b.title || '');
                });

                maxAllDayEvents = Math.max(maxAllDayEvents, dayEvents.length);

                dayEvents.forEach((ev: DaybleEvent) => {
                    const item = this.view?.createEventItem(ev, false, false, true) || document.createElement('div');
                    item.addClass('dayble-all-day-event-item');
                    item.setCssProps({ 'width': '100%', 'cursor': 'pointer', 'overflow': 'hidden' });
                    item.onclick = (e: MouseEvent) => { e.stopPropagation(); this.view?.openEventModal(ev.id, ev.date || ev.startDate, ev.endDate); };

                    item.ondragstart = (e: DragEvent) => {
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        dt.effectAllowed = 'move';
                        this.dragId = ev.id;
                        this.dragEl = item;
                        this.dragDuration = 60;
                        const itemRect = item.getBoundingClientRect();
                        this.dragOffsetY = e.clientY - itemRect.top;
                        item.addClass('dragging');
                        try { const img = new Image(); img.width = 1; img.height = 1; dt.setDragImage(img, 0, 0); } catch { /* intentional */ }
                    };
                    item.ondragend = () => {
                        const currentIndicator = this.contentEl.querySelector('.dayble-focus-drop');
                        if (currentIndicator) currentIndicator.remove();
                        this.gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
                        item.removeClass('dragging');
                        this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
                    };

                    dayCol.appendChild(item);

                    const dimOpacity = this.view?.plugin?.settings?.dimPastEvents ?? 1.0;
                    if (dimOpacity < 1.0) {
                        const todayStr = moment().format('YYYY-MM-DD');
                        if (dStr < todayStr) {
                            item.addClass('dayble-event-past-dim');
                            item.setCssProps({ 'opacity': dimOpacity.toString() });
                        }
                    }
                });
            });

            if (maxAllDayEvents > 0) {
                allDaySpacer.setText('All day');
                allDaySpacer.setCssProps({ fontWeight: 'bold' });
                if (maxAllDayEvents === 1) {
                    allDaySpacer.setCssProps({ fontSize: '0.5em', transform: 'rotate(0deg)' });
                } else if (maxAllDayEvents === 2) {
                    allDaySpacer.setCssProps({ fontSize: '0.7em', transform: 'rotate(270deg)' });
                } else {
                    allDaySpacer.setCssProps({ fontSize: '1em', transform: 'rotate(270deg)' });
                }
            } else {
                allDaySpacer.setText('');
            }

            requestAnimationFrame(syncWidths);
            const obs = new ResizeObserver(syncWidths);
            obs.observe(c);
            if (!this._dayMode3ROs) this._dayMode3ROs = [];
            this._dayMode3ROs.push(obs);
        }

        const scroller = c.createDiv({ cls: 'dayble-focus-scroll' });
        this.scroller = scroller;
        scroller.setCssProps({ '--event-border-radius': `${this.view?.plugin?.settings?.eventBorderRadius ?? 6}px` });

        if (allDaySection) {
            scroller.appendChild(allDaySection);
        }

        scroller.addEventListener('scroll', () => {
            if (this.view) {
                this.view.lastScrollTop = scroller.scrollTop;
            }
        });

        if (this.view && this.view.lastScrollTop !== undefined) {
            requestAnimationFrame(() => {
                scroller.scrollTop = this.view?.lastScrollTop || 0;
            });
        }

        if (!isMulti) {
            const allDayEvents = (this.events || []).filter((e: DaybleEvent) => {
                let isToday = (e.date === primaryDate) || (e.startDate === primaryDate) ||
                                (e.startDate && e.endDate && primaryDate >= e.startDate && primaryDate <= e.endDate);
                if (isToday && e.time && e.startDate && e.endDate && primaryDate === e.endDate) {
                    const parts = String(e.time).split('-');
                    const endStr = parts[1] || '';
                    if (endStr === '00:00' && e.startDate !== e.endDate) {
                        isToday = false;
                    }
                }
                if (!isToday) return false;
                return !e.time;
            }).sort((a: DaybleEvent, b: DaybleEvent) => {
                const ad = a.startDate && a.endDate ? (new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) : 0;
                const bd = b.startDate && b.endDate ? (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) : 0;
                if (ad !== bd) return bd - ad;
                return (a.title || '').localeCompare(b.title || '');
            });

            if (allDayEvents.length > 0) {
                const allDaySectionSingle = c.createDiv({ cls: 'dayble-all-day-section' });
                allDaySectionSingle.setAttr('data-date', primaryDate);
                allDaySectionSingle.onclick = (e) => {
                    if ((e.target as HTMLElement).closest('.dayble-event')) return;
                    this.view?.openEventModal(undefined, primaryDate);
                };

                allDaySectionSingle.ondragover = (e) => {
                    e.preventDefault();
                    allDaySectionSingle.addClass('drop-target');
                };
                allDaySectionSingle.ondragleave = () => {
                    allDaySectionSingle.removeClass('drop-target');
                };
                allDaySectionSingle.ondrop = async (e) => {
                    e.preventDefault();
                    allDaySectionSingle.removeClass('drop-target');
                    const id = this.dragId;
                    if (!id) return;
                    try {
                        const evIdx = (this.view?.events || []).findIndex((ev: DaybleEvent) => ev.id === id);
                        if (evIdx !== -1 && this.view) {
                            const originalEv = this.view.events[evIdx];
                            const updatedEv = JSON.parse(JSON.stringify(originalEv));
                            updatedEv.date = primaryDate;
                            updatedEv.startDate = primaryDate;
                            updatedEv.endDate = primaryDate;
                            updatedEv.time = undefined;
                            this.view.events[evIdx] = updatedEv;
                            await this.view.saveAllEntries();
                            await this.view.render();
                            this.onOpen();
                        }
                    } catch { /* intentional */ }
                    this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
                };

                allDaySectionSingle.setCssProps({
                    'padding': '8px',
                    'border-bottom': '1px solid var(--background-modifier-border)',
                    'display': 'flex',
                    'flex-direction': 'row',
                    'flex-wrap': 'wrap',
                    'gap': '4px',
                    'flex-shrink': '0'
                });
                allDayEvents.forEach((ev: DaybleEvent) => {
                    const item = this.view?.createEventItem(ev, false, false, true) || document.createElement('div');
                    item.addClass('dayble-all-day-event-item');
                    item.setCssProps({ 'flex': '1 1 calc(50% - 4px)', 'min-width': '120px', 'cursor': 'pointer', 'overflow': 'hidden' });
                    item.onclick = (e: MouseEvent) => { e.stopPropagation(); this.view?.openEventModal(ev.id, ev.date || ev.startDate, ev.endDate); };

                    item.ondragstart = (e: DragEvent) => {
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        this.dragId = ev.id;
                        this.dragEl = item;
                        this.dragDuration = 60;
                        const itemRect = item.getBoundingClientRect();
                        this.dragOffsetY = e.clientY - itemRect.top;
                        item.addClass('dragging');
                        try { const img = new Image(); img.width = 1; img.height = 1; dt.setDragImage(img, 0, 0); } catch { /* intentional */ }
                    };
                    item.ondragend = () => {
                        const currentIndicator = this.contentEl.querySelector('.dayble-focus-drop');
                        if (currentIndicator) currentIndicator.remove();
                        this.gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
                        item.removeClass('dragging');
                        this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
                    };

                    allDaySectionSingle.appendChild(item);
                });
            } else {
                scroller.addClass('dayble-no-all-day-margin');
            }
        }
        c.appendChild(scroller);

        const gridContainer = scroller.createDiv({ cls: 'dayble-focus-grid-container' });
        this.gridContainer = gridContainer;
        if (this.view?.plugin.settings.enableFiveMinIntervals) {
            gridContainer.addClass('dayble-5min-mode');
        }

        if (this.view?.plugin.settings.showCurrentTimeLine ?? true) {
            if (this.currentTimeInterval) clearInterval(this.currentTimeInterval);
            this.currentTimeInterval = setInterval(() => this.renderCurrentTimeLine(), 60000);
            requestAnimationFrame(() => this.renderCurrentTimeLine());
            const timeLineObs = new ResizeObserver(() => this.renderCurrentTimeLine());
            timeLineObs.observe(gridContainer);
            if (!this._dayMode3ROs) this._dayMode3ROs = [];
            this._dayMode3ROs.push(timeLineObs);
        }

        let morningGrid: HTMLElement, afternoonGrid: HTMLElement;
        if (split && !isMulti) {
            morningGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid morning' });
            afternoonGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid afternoon' });
            gridContainer.addClass('dayble-split');
        } else {
            morningGrid = gridContainer.createDiv({ cls: 'dayble-focus-grid' });
            afternoonGrid = morningGrid;
        }
        this.morningGrid = morningGrid;
        this.afternoonGrid = afternoonGrid;

        const overlay = gridContainer.createDiv({ cls: 'dayble-focus-overlay' });
        this.overlay = overlay;
        const selectionMirrorContainer = gridContainer.createDiv({ cls: 'dayble-focus-selection-mirror-container' });
        let dropIndicator: HTMLElement | null = null;
        let selectionMirror: HTMLElement | null = null;

        const getSlotInfo = (clientX: number, clientY: number) => {
            const morningRect = morningGrid.getBoundingClientRect();
            const afternoonRect = afternoonGrid.getBoundingClientRect();

            const isAfternoon = !isMulti && split && (clientX > (morningRect.right + (afternoonRect.left - morningRect.right) / 2));
            const targetGrid = isAfternoon ? afternoonGrid : morningGrid;
            const targetRect = targetGrid.getBoundingClientRect();

            const cells = Array.from(targetGrid.querySelectorAll('.dayble-focus-cell'));
            if (cells.length === 0) return null;

            const firstCellRect = cells[0].getBoundingClientRect();
            const pxPer30 = firstCellRect.height;
            const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
            const stepsPerRow = enable5 ? 6 : 2;
            const pxPerStep = pxPer30 / stepsPerRow;
            const stepMin = enable5 ? 5 : 15;

            let targetCell: HTMLElement | null = null;
            let slotIdx = -1;
            let dayIdx = 0;

            for (const cell of cells) {
                const r = cell.getBoundingClientRect();
                if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right) {
                    targetCell = cell;
                    slotIdx = parseInt(cell.getAttribute('data-idx') || '-1', 10);
                    dayIdx = parseInt(cell.getAttribute('data-day') || '0', 10);
                    break;
                }
            }

            if (!targetCell) {
                const relY = clientY - targetRect.top;
                const clampedRelY = Math.max(0, Math.min(relY, targetRect.height - 1));
                const baseIdx = (split && !isMulti && isAfternoon) ? 24 : 0;
                const localSlot = Math.floor(clampedRelY / pxPer30);
                slotIdx = baseIdx + localSlot;
                const rowCells = Array.from(targetGrid.querySelectorAll(`.dayble-focus-cell[data-idx="${slotIdx}"]`));
                let chosen: HTMLElement | null = null;
                for (const rc of rowCells) {
                    const rr = rc.getBoundingClientRect();
                    if (clientX >= rr.left && clientX <= rr.right) { chosen = rc; break; }
                }
                targetCell = chosen || rowCells[0] || cells[0];
                dayIdx = parseInt(targetCell.getAttribute('data-day') || '0', 10);
            }

            const targetCellRect = targetCell.getBoundingClientRect();
            const relYInCell = clientY - targetCellRect.top;
            const stepInCell = Math.floor(relYInCell / pxPerStep);

            const baseIdx = (split && !isMulti && isAfternoon) ? 24 : startHour;
            const n = (slotIdx - baseIdx) * stepsPerRow + stepInCell;

            return { slotIdx, dayIdx, stepInCell, pxPerStep, stepMin, isAfternoon, targetRect, targetCell, relY: clientY - targetRect.top, n };
        };

        const clearTargets = () => {
            gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
        };
        const sel: { active: boolean, start15?: number, end15?: number, startDayIdx?: number, endDayIdx?: number } = { active: false };
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
                sel.startDayIdx = undefined;
                sel.endDayIdx = undefined;
            }
            if (selectionMirror) { selectionMirror.remove(); selectionMirror = null; }
        };
        const applySelection = () => {
            if (sel.active && typeof sel.start15 === 'number' && typeof sel.end15 === 'number' && typeof sel.startDayIdx === 'number' && typeof sel.endDayIdx === 'number') {
                const s15 = Math.min(sel.start15, sel.end15);
                const e15 = Math.max(sel.start15, sel.end15);
                const dIdx = sel.endDayIdx;

                const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
                const stepsPerRow = enable5 ? 6 : 2;
                const stepMin = enable5 ? 5 : 15;

                if (!enable5) {
                    for (let i = s15; i <= e15; i++) {
                        const slotIdx = Math.floor(i / stepsPerRow);
                        const cell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${slotIdx}"][data-day="${dIdx}"]`);
                        if (cell) {
                            if (i % 2 === 0) cell.addClass('sel-top');
                            else cell.addClass('sel-bottom');
                        }
                    }
                }

                if (selectionMirror) { selectionMirror.remove(); selectionMirror = null; }
                selectionMirror = document.createElement('div');
                selectionMirror.className = 'dayble-focus-selection-mirror';
                selectionMirrorContainer.appendChild(selectionMirror);

                const renderMirrorSegment = (startN: number, endN: number, type: 'full'|'start'|'end') => {
                    const startSlotIdx = Math.floor(startN / stepsPerRow);
                    const startCell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${startSlotIdx}"][data-day="${dIdx}"]`);
                    if (!startCell) return;

                    const gRect = gridContainer.getBoundingClientRect();
                    const sRect = startCell.getBoundingClientRect();
                    const rowHeight = startCell.offsetHeight || 60;
                    const pxPerStep = rowHeight / stepsPerRow;

                    const segment = document.createElement('div');
                    segment.className = 'dayble-focus-event-abs dayble-focus-selection-mirror';
                    if (type === 'start') segment.addClass('dayble-focus-event-split-start');
                    if (type === 'end') segment.addClass('dayble-focus-event-split-end');
                    selectionMirror?.appendChild(segment);

                    const left = sRect.left - gRect.left;
                    const top = (sRect.top - gRect.top) + (startN % stepsPerRow) * pxPerStep;
                    const width = startCell.offsetWidth;
                    const height = Math.max(4, ((endN - startN) + 1) * pxPerStep);

                    segment.setCssProps({
                        '--focus-item-left': `${Math.round(left)}px`,
                        '--focus-item-top': `${Math.round(top)}px`,
                        '--focus-item-width': `${Math.round(width)}px`,
                        '--focus-item-height': `${Math.round(height)}px`
                    });
                };

                const boundaryN = 12 * (60 / stepMin);
                if (split && s15 < boundaryN && e15 >= boundaryN) {
                    renderMirrorSegment(s15, boundaryN - 1, 'start');
                    renderMirrorSegment(boundaryN, e15, 'end');
                } else {
                    renderMirrorSegment(s15, e15, 'full');
                }

                if (selectionMirror) {
                    const sTotal = s15 * stepMin;
                    const eTotal = (e15 + 1) * stepMin;
                    const sh_m = Math.floor(sTotal / 60);
                    const sm_m = sTotal % 60;
                    const eh_m = Math.floor(eTotal / 60);
                    const em_m = eTotal % 60;
                    const formatHM = (h: number, m: number) => {
                        const fmt = this.view?.plugin?.settings?.timeFormat ?? 'system';
                        const isPM = h >= 12;
                        const h12 = h % 12 || 12;
                        if (fmt === '24h') return `${pad(h)}:${pad(m)}`;
                        return `${h12}:${pad(m)}${isPM?'pm':'am'}`;
                    };

                    const durationTotalMin = (e15 - s15 + 1) * stepMin;
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

                    const firstSeg = selectionMirror.querySelector('.dayble-focus-selection-mirror');
                    if (firstSeg) {
                        const inner = firstSeg.createDiv({ cls: 'dayble-focus-event-inner' });
                        const h = parseFloat(firstSeg.style.getPropertyValue('--focus-item-height') || '0');
                        if (h < 30) {
                            inner.setCssProps({ 'font-size': '0.7em' });
                        } else if (h < 60) {
                            inner.setCssProps({ 'font-size': '0.9em' });
                        }
                        inner.createDiv().setText(`${formatHM(sh_m, sm_m)} - ${formatHM(eh_m, em_m)}`);
                        if (h >= 40) {
                            inner.createDiv({ cls: 'dayble-selection-duration' }).setText(durationText);
                        }
                    }
                }
            }
        };
        const toTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
        const finalizeSelection = async () => {
            if (typeof sel.start15 !== 'number' || typeof sel.end15 !== 'number' || typeof sel.endDayIdx !== 'number') return;
            const sIdx15 = Math.min(sel.start15, sel.end15);
            const eIdx15 = Math.max(sel.start15, sel.end15);

            const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
            const stepMin = enable5 ? 5 : 15;

            const startTotalMin = sIdx15 * stepMin;
            const endTotalMin = (eIdx15 + 1) * stepMin;

            let sh = Math.floor(startTotalMin / 60);
            let sm = startTotalMin % 60;
            let eh = Math.floor(endTotalMin / 60);
            let em = endTotalMin % 60;

            const endIsMidnightNext = (endTotalMin >= 24 * 60);
            if (endIsMidnightNext) { eh = 0; em = 0; }

            const sTime = toTime(sh, sm);
            const eTime = toTime(eh, em);

            const isMulti = Array.isArray(this.date);
            const dates = isMulti ? (this.date as string[]) : [this.date as string];
            const targetDate = dates[sel.endDayIdx] || dates[0];

            const sDate = targetDate;
            const eDate = endIsMidnightNext ? nextDateStr(targetDate) : targetDate;
            await this.view?.openEventModal(undefined, sDate, eDate, sTime, eTime);
        };
        const onGlobalMouseUp = (e: MouseEvent) => {
            if (!sel.active) return;
            e.stopPropagation();
            sel.active = false;
            void finalizeSelection().then(() => {
                clearSelection();
                window.removeEventListener('mouseup', onGlobalMouseUp);
            });
        };

        const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
        const stepsPerRow = enable5 ? 6 : 2;

        slots.forEach((slot, idx) => {
            const targetGrid = (!isMulti && split && slot.hour >= 12) ? afternoonGrid : morningGrid;
            const row = targetGrid.createDiv({ cls: 'dayble-focus-row' });
            const time = row.createDiv({ cls: 'dayble-focus-time' });
            time.addClass('dayble-time-el-style');
            time.textContent = labelFor(slot.hour, slot.minute);

            time.onmousedown = (e) => {
                if ((e).button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                sel.active = true;
                gridContainer.addClass('dayble-selecting');
                const rect = time.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                const step = Math.floor(relY / (rect.height / stepsPerRow));
                sel.start15 = idx * stepsPerRow + step;
                sel.end15 = sel.start15;
                sel.startDayIdx = 0;
                sel.endDayIdx = 0;
                clearSelection(false);
                applySelection();
                window.addEventListener('mouseup', onGlobalMouseUp);
            };
            time.onmousemove = (e) => {
                if (!sel.active) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = time.getBoundingClientRect();
                const relY = e.clientY - rect.top;
                const step = Math.floor(relY / (rect.height / stepsPerRow));
                sel.end15 = idx * stepsPerRow + step;
                sel.endDayIdx = 0;
                clearSelection(false);
                applySelection();
            };

            dates.forEach((dStr, dIdx) => {
                const cell = row.createDiv({ cls: 'dayble-focus-cell' });
                cell.setAttr('data-idx', String(idx));
                cell.setAttr('data-day', String(dIdx));

                cell.onmousedown = (e) => {
                    if ((e).button !== 0) return;
                    const info = getSlotInfo(e.clientX, e.clientY);
                    if (!info) return;
                    sel.active = true;
                    gridContainer.addClass('dayble-selecting');
                    const boundaryIdx = 24;
                    sel.start15 = info.isAfternoon ? (boundaryIdx * stepsPerRow + (info.n % (boundaryIdx * stepsPerRow))) : info.n;
                    sel.end15 = sel.start15;
                    sel.startDayIdx = info.dayIdx;
                    sel.endDayIdx = info.dayIdx;
                    clearSelection(false);
                    applySelection();
                    window.addEventListener('mouseup', onGlobalMouseUp);
                };
                cell.onmouseover = (e) => {
                    if (!sel.active) return;
                    const info = getSlotInfo(e.clientX, e.clientY);
                    if (!info) return;
                    const boundaryIdx = 24;
                    sel.end15 = info.isAfternoon ? (boundaryIdx * stepsPerRow + (info.n % (boundaryIdx * stepsPerRow))) : info.n;
                    sel.endDayIdx = info.dayIdx;
                    clearSelection(false);
                    applySelection();
                };
            });
        });
        scroller.onmouseleave = () => { if (sel.active) { sel.active = false; clearSelection(); } };

        scroller.onmousemove = (e) => {
            if (!sel.active) return;
            const info = getSlotInfo(e.clientX, e.clientY);
            if (!info) return;
            const boundaryIdx = 24;
            const currentN = info.isAfternoon ? (boundaryIdx * stepsPerRow + (info.n % (boundaryIdx * stepsPerRow))) : info.n;
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
        const cells = Array.from(gridContainer.querySelectorAll('.dayble-focus-cell'));
        if (cells.length > 0) {
            const gRect = gridContainer.getBoundingClientRect();
            const rowHeight = cells[0].offsetHeight || 60;
            const pxPerStep = rowHeight / stepsPerRow;

            const grids = split && !isMulti ? [morningGrid, afternoonGrid] : [morningGrid];
            grids.forEach(grid => {
                const gridRect = grid.getBoundingClientRect();
                const numSlots = slots.length;
                const intervals = numSlots * stepsPerRow;
                for (let i = 1; i < intervals; i++) {
                    const line = quarter.createDiv({ cls: 'dayble-quarter-line' });
                    line.setCssProps({
                        'left': `${gridRect.left - gRect.left}px`,
                        'width': `${gridRect.width}px`,
                        '--quarter-line-top': `${Math.round((gridRect.top - gRect.top) + i * pxPerStep)}px`
                    });
                    if (enable5) {
                        if (i % stepsPerRow === 0) line.setCssProps({ 'opacity': '0.3' });
                        else if (i % (stepsPerRow / 2) === 0) line.setCssProps({ 'opacity': '0.15' });
                        else line.setCssProps({ 'opacity': '0.05' });
                    }
                }
            });
        }
        const footer = c.createDiv({ cls: 'dayble-footer-day-mode' });
        const addBtn = footer.createEl('button', { cls: 'dayble-today-add-btn', text: '+ add event' });
        addBtn.addClass('db-btn');
        addBtn.addClass('dayble-add-btn-full');
        addBtn.onclick = () => { void this.view?.openEventModal(undefined, Array.isArray(this.date) ? this.date[0] : this.date); };
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
                    void (leaf).openFile(file);
                }
            }
        }, { capture: true });

        scroller.ondragover = (e) => {
            const id = this.dragId;
            if (!id) return;
            if ((e.target as HTMLElement).closest('.dayble-3day-all-day-section')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const durationMin = this.dragDuration || 30;
            const info = getSlotInfo(e.clientX, e.clientY - (this.dragOffsetY || 0));
            if (!info || !info.targetCell) return;
            const gRect = gridContainer.getBoundingClientRect();
            const targetCellRect = info.targetCell.getBoundingClientRect();
            const left = targetCellRect.left - gRect.left;
            const topLocal = (targetCellRect.top - gRect.top) + (info.stepInCell * info.pxPerStep);
            const width = info.targetCell.offsetWidth;
            const heightLocal = Math.max(4, Math.round((durationMin / info.stepMin) * info.pxPerStep));
            if (this.dragEl) {
                const mouseY = (e.clientY - gRect.top) - (this.dragOffsetY || 0);
                this.dragEl.setCssProps({
                    '--focus-item-top': `${Math.round(mouseY)}px`,
                    '--focus-item-left': `${Math.round(left)}px`,
                    '--focus-item-width': `${Math.round(width)}px`,
                    '--focus-item-height': `${Math.round(heightLocal)}px`
                });
            }
            if (!dropIndicator) {
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'dayble-focus-drop';
                overlay.appendChild(dropIndicator);
            }
            dropIndicator.setCssProps({
                '--focus-item-left': `${Math.round(left)}px`,
                '--focus-item-top': `${Math.round(topLocal)}px`,
                '--focus-item-width': `${Math.round(width)}px`,
                '--focus-item-height': `${Math.round(heightLocal)}px`
            });
            gridContainer.querySelectorAll('.dayble-focus-cell').forEach(el => el.removeClass('drop-target'));
            info.targetCell.addClass('drop-target');
        };
        scroller.ondragleave = () => {
            if (dropIndicator) { dropIndicator.remove(); dropIndicator = null; }
            clearTargets();
        };
        scroller.ondrop = async (e) => {
            const id = this.dragId;
            const el = this.dragEl;
            if (!id) return;
            if ((e.target as HTMLElement).closest('.dayble-3day-all-day-section')) return;
            e.preventDefault();
            const info = getSlotInfo(e.clientX, e.clientY - (this.dragOffsetY || 0));
            if (!info) return;
            if (el) {
                const gRect = gridContainer.getBoundingClientRect();
                const targetCellRect = info.targetCell.getBoundingClientRect();
                const left = targetCellRect.left - gRect.left;
                const topLocal = (targetCellRect.top - gRect.top) + (info.stepInCell * info.pxPerStep);
                el.removeClass('dragging');
                el.addClass('settling');
                el.setCssProps({
                    '--focus-item-left': `${Math.round(left)}px`,
                    '--focus-item-top': `${Math.round(topLocal)}px`,
                    '--focus-item-width': `${Math.round(info.targetCell.offsetWidth)}px`
                });
            }
            const dates = Array.isArray(this.date) ? (this.date) : [this.date];
            const targetDate = dates[info.dayIdx] || dates[0];
            const startTotalMin = info.n * info.stepMin;
            const newH = Math.floor(startTotalMin / 60);
            const newM = startTotalMin % 60;
            const durationMin = this.dragDuration || 30;
            const endTotalMin = startTotalMin + durationMin;
            let endH = Math.floor(endTotalMin / 60);
            let endM = endTotalMin % 60;
            const pad2 = (n: number) => String(n).padStart(2, '0');
            const startStr = `${pad2(newH)}:${pad2(newM)}`;
            let endStr = `${pad2(endH)}:${pad2(endM)}`;
            let endDate = targetDate;
            if (endTotalMin >= 24 * 60) {
                endH = 0; endM = 0; endStr = '00:00';
                endDate = nextDateStr(targetDate);
            }
            try {
                const currentScroller = this.scroller;
                if (this.view) {
                    this.view.lastScrollTop = currentScroller ? currentScroller.scrollTop : 0;
                }
                const evIdx = (this.view?.events || []).findIndex((ev: DaybleEvent) => ev.id === id);
                if (evIdx !== -1 && this.view) {
                    const originalEv = this.view.events[evIdx];
                    const updatedEv = JSON.parse(JSON.stringify(originalEv));
                    updatedEv.date = targetDate;
                    updatedEv.startDate = targetDate;
                    updatedEv.endDate = endDate;
                    updatedEv.time = `${startStr}-${endStr}`;
                    this.view.events[evIdx] = updatedEv;
                    await new Promise(r => setTimeout(r, 250));
                    await this.view.saveAllEntries();
                    await this.view.render();
                    this.onOpen();
                }
            } catch { /* intentional */ }
            if (dropIndicator) { dropIndicator.remove(); dropIndicator = null; }
            this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
            clearTargets();
        };

        this.renderEvents();

        if ((this.view?.plugin.settings.scrollToCurrentTime ?? true) && this.view.lastScrollTop === undefined) {
            requestAnimationFrame(() => this.scrollToCurrentTime());
        }
    }

    onClose() {
        if (this.currentTimeInterval) {
            clearInterval(this.currentTimeInterval);
            this.currentTimeInterval = undefined;
        }
        if (this._dayMode3ROs) {
            this._dayMode3ROs.forEach(obs => obs.disconnect());
            this._dayMode3ROs = [];
        }
    }

    renderCurrentTimeLine() {
        if (!(this.view?.plugin.settings.showCurrentTimeLine ?? true)) return;
        const gridContainer = this.gridContainer;
        if (!gridContainer) return;

        gridContainer.querySelectorAll('.dayble-current-time-line').forEach(el => el.remove());

        const isMulti = Array.isArray(this.date);
        const dates = isMulti ? (this.date as string[]) : [this.date as string];
        const todayStr = moment().format('YYYY-MM-DD');
        const dayIdx = dates.indexOf(todayStr);

        if (dayIdx === -1) return;

        const now = new Date();
        const hh = now.getHours();
        const mm = now.getMinutes();

        const toIdx = (h: number, m: number) => (h * 2) + (m >= 30 ? 1 : 0);
        const slotIdx = toIdx(hh, mm);

        const cell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${slotIdx}"][data-day="${dayIdx}"]`);
        if (!cell) return;

        const cellRect = cell.getBoundingClientRect();
        const containerRect = gridContainer.getBoundingClientRect();

        if (containerRect.width === 0 || cellRect.width === 0) return;

        const rowHeight = cell.offsetHeight || 60;
        const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
        const stepMin = enable5 ? 5 : 15;
        const stepsPerRow = enable5 ? 6 : 2;
        const pxPerStep = rowHeight / stepsPerRow;
        const withinMin = (mm % 30);

        const top = (cellRect.top - containerRect.top) + (withinMin / stepMin) * pxPerStep;

        const line = gridContainer.createDiv({ cls: 'dayble-current-time-line' });
        line.setCssProps({
            'top': `${Math.round(top)}px`,
            'left': `${cellRect.left - containerRect.left}px`,
            'width': `${cellRect.width}px`
        });

        const timeLabel = line.createDiv({ cls: 'dayble-current-time-label' });
        const fmt = this.view?.plugin?.getTimeFormat() ?? '24h';
        let timeStr = '';
        if (fmt === '12h') {
            const h12 = ((hh % 12) || 12);
            const ampm = hh >= 12 ? 'pm' : 'am';
            timeStr = `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}${ampm}`;
        } else {
            timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }
        timeLabel.textContent = timeStr;

        const todayStr2 = moment().format('YYYY-MM-DD');
        const now2 = new Date();
        const nowMin = (now2.getHours() * 60) + now2.getMinutes();
        const currentEv = (this.events || []).find((e: DaybleEvent) => {
            const isToday = (e.date === todayStr2) || (e.startDate === todayStr2) || (e.startDate && e.endDate && todayStr2 >= e.startDate && todayStr2 <= e.endDate);
            if (!isToday) return false;
            if (!e.time) return false;
            const parts = String(e.time).split('-');
            const startStr = parts[0] || '';
            const endStr = parts[1] || '';
            if (!startStr) return false;
            const startMin = timeToMinutes(startStr);
            const endMin = endStr ? timeToMinutes(endStr) : startMin + 30;
            return nowMin >= startMin && nowMin < endMin;
        });
        const newId = currentEv?.id;
        if (this.lastCurrentEventId && newId && this.lastCurrentEventId !== newId) {
            try { this.view?.plugin.playSoundNextEvent(); } catch { /* intentional */ }
        }
        this.lastCurrentEventId = newId || undefined;
    }

    scrollToCurrentTime() {
        if (!this.scroller || !this.gridContainer) return;

        const isMulti = Array.isArray(this.date);
        const dates = isMulti ? (this.date as string[]) : [this.date as string];
        const todayStr = moment().format('YYYY-MM-DD');
        if (!dates.includes(todayStr)) return;

        const now = new Date();
        const hh = now.getHours();
        const mm = now.getMinutes();

        const toIdx = (h: number, m: number) => (h * 2) + (m >= 30 ? 1 : 0);
        const slotIdx = toIdx(hh, mm);

        const cell = this.gridContainer.querySelector(`.dayble-focus-cell[data-idx="${slotIdx}"]`);
        if (!cell) return;

        const cellRect = cell.getBoundingClientRect();
        const containerRect = this.gridContainer.getBoundingClientRect();

        if (containerRect.width === 0 || cellRect.width === 0) return;

        const rowHeight = cell.offsetHeight || 60;
        const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
        const stepMin = enable5 ? 5 : 15;
        const stepsPerRow = enable5 ? 6 : 2;
        const pxPerStep = rowHeight / stepsPerRow;
        const withinMin = (mm % 30);

        const top = (cellRect.top - containerRect.top) + (withinMin / stepMin) * pxPerStep;

        const scrollerHeight = this.scroller.offsetHeight;
        const scrollAmount = Math.max(0, top - (scrollerHeight / 2));
        this.scroller.scrollTop = scrollAmount;
    }

    renderEvents() {
        const gridContainer = this.gridContainer;
        const overlay = this.overlay;
        if (!gridContainer || !overlay) return;
        overlay.empty();

        const isMulti = Array.isArray(this.date);
        const dates = isMulti ? (this.date as string[]) : [this.date as string];
        const expandedEvents = this.view ? this.view.getExpandedEvents(moment(dates[0]), moment(dates[dates.length - 1])) : this.events;

        try {
            const startHour = 0;
            const toIdx = (hh: number, mm: number) => ((hh - startHour) * 2) + (mm >= 30 ? 1 : 0);
            const parseHM = (s: string) => {
                const [h, m] = s.split(':').map((n: string) => parseInt(n || '0', 10));
                return (h * 60) + m;
            };

            dates.forEach((dStr, dIdx) => {
                const dayEvents = (expandedEvents || []).filter((e: DaybleEvent) => {
                    let isToday = (e.date === dStr) || (e.startDate === dStr) ||
                                    (e.startDate && e.endDate && dStr >= e.startDate && dStr <= e.endDate);
                    if (isToday && e.time && e.startDate && e.endDate && dStr === e.endDate) {
                        const parts = String(e.time).split('-');
                        const endStr = parts[1] || '';
                        if (endStr === '00:00' && e.startDate !== e.endDate) {
                            isToday = false;
                        }
                    }
                    if (!isToday) return false;
                    return !!e.time;
                });

                const processedEvents = dayEvents.map((ev: DaybleEvent) => {
                    const range = String(ev.time || '');
                    const parts = range.split('-');
                    const startStr = parts[0] || '';
                    const endStr = parts[1] || '';
                    if (!startStr) return null;
                    let startTotal = parseHM(startStr);
                    let endTotal = startTotal + 30;
                    if (endStr) {
                        endTotal = parseHM(endStr);
                        if (endTotal === 0 && startTotal > 0) {
                            endTotal = 24 * 60;
                        }
                    }
                    if (ev.startDate && ev.endDate && ev.startDate !== ev.endDate) {
                        if (dStr > ev.startDate) startTotal = 0;
                        if (dStr < ev.endDate) endTotal = 24 * 60;
                    }
                    if (startTotal >= endTotal) return null;
                    return { ev, startTotal, endTotal, column: 0, totalColumns: 1 };
                }).filter((item: { ev: DaybleEvent, startTotal: number, endTotal: number, column: number, totalColumns: number } | null) => item !== null) as { ev: DaybleEvent, startTotal: number, endTotal: number, column: number, totalColumns: number }[];

                processedEvents.sort((a, b) => a.startTotal - b.startTotal || (b.endTotal - b.startTotal) - (a.endTotal - a.startTotal));

                const columns: { endTotal: number }[][] = [];
                processedEvents.forEach(item => {
                    let colIdx = columns.findIndex(col => col.every(placed => placed.endTotal <= item.startTotal));
                    if (colIdx === -1) { colIdx = columns.length; columns.push([]); }
                    item.column = colIdx;
                    columns[colIdx].push(item);
                });

                processedEvents.forEach(item => {
                    const overlaps = processedEvents.filter(other =>
                        (item.startTotal < other.endTotal && item.endTotal > other.startTotal)
                    );
                    const maxCol = Math.max(...overlaps.map(o => o.column));
                    overlaps.forEach(o => o.totalColumns = Math.max(o.totalColumns, maxCol + 1));
                });

                processedEvents.forEach(data => {
                    const { ev, startTotal, endTotal, column, totalColumns } = data;
                    const isMobile = window.innerWidth <= 700;
                    const split = (!isMobile) && (this.view?.plugin?.settings?.todayModalSplitView ?? true);
                    const boundary = 12 * 60;

                    const renderSegment = (sMin: number, eMin: number, segmentType: 'full' | 'start' | 'end') => {
                        let effectiveEMin = eMin;
                        if (segmentType === 'full' && eMin === 0 && sMin > 0) effectiveEMin = 24 * 60;

                        const sh = Math.floor(sMin / 60);
                        const sm = sMin % 60;
                        const startIdx = toIdx(sh, sm);
                        const startCell = gridContainer.querySelector(`.dayble-focus-cell[data-idx="${startIdx}"][data-day="${dIdx}"]`);
                        if (!startCell) return;
                        const sRect = startCell.getBoundingClientRect();
                        const gRect = gridContainer.getBoundingClientRect();

                        const rowHeight = startCell.offsetHeight || 60;
                        const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
                        const stepMin = enable5 ? 5 : 15;
                        const stepsPerRow = enable5 ? 6 : 2;
                        const pxPerStep = rowHeight / stepsPerRow;
                        const withinMin = (sm % 30);

                        const top = (sRect.top - gRect.top) + (withinMin / stepMin) * pxPerStep;
                        const durationMin = effectiveEMin - sMin;
                        const height = Math.max(4, Math.round((durationMin / stepMin) * pxPerStep));

                        const fullWidth = startCell.offsetWidth;
                        const colWidth = fullWidth / totalColumns;
                        const left = (sRect.left - gRect.left) + (column * colWidth);
                        const width = colWidth;

                        const item = this.view?.createEventItem(ev, false, true, false) || document.createElement('div');
                        item.addClass('dayble-focus-event-abs');
                        let isResizingCurrently = false;

                        const dimOpacity = this.view?.plugin?.settings?.dimPastEvents ?? 1.0;
                        if (dimOpacity < 1.0) {
                            const todayStr = moment().format('YYYY-MM-DD');
                            if (dStr === todayStr) {
                                const now = new Date();
                                const currentTotalMin = (now.getHours() * 60) + now.getMinutes();
                                if (endTotal <= currentTotalMin) {
                                    item.addClass('dayble-event-past-dim');
                                    item.setCssProps({ 'opacity': dimOpacity.toString() });
                                }
                            } else if (dStr < todayStr) {
                                item.addClass('dayble-event-past-dim');
                                item.setCssProps({ 'opacity': dimOpacity.toString() });
                            }
                        }

                        if (segmentType === 'start') item.addClass('dayble-focus-event-split-start');
                        if (segmentType === 'end') item.addClass('dayble-focus-event-split-end');

                        item.setCssProps({
                            'background-color': 'var(--event-bg-color, var(--background-primary))',
                            'color': 'var(--event-text-color, var(--text-normal))',
                            'border-color': 'var(--event-border-color, var(--background-modifier-border))',
                            'pointer-events': 'auto'
                        });

                        if (durationMin <= 30) {
                            item.removeClass('dayble-event-compact');
                        } else {
                            item.removeClass('dayble-event-compact');
                            item.addClass('dayble-layout-center-flex');
                        }
                        if (durationMin <= 15) {
                            item.addClass('min15');
                            if (durationMin <= 5) item.addClass('min5');
                        }
                        if (durationMin === 30 && ev.description) {
                            item.removeClass('dayble-event-compact');
                            item.addClass('dayble-layout-center-flex');
                        }

                        if (this.view && this.view.plugin.settings.tooltipEnabled) {
                            setTooltip(item, this.view.getEventTooltipText(ev));
                        }

                        item.setCssProps({
                            '--focus-item-left': `${Math.round(left)}px`,
                            '--focus-item-top': `${Math.round(top)}px`,
                            '--focus-item-width': `${Math.round(width)}px`,
                            '--focus-item-height': `${Math.round(height)}px`
                        });

                        const EDGE_SIZE = 10;
                        item.addEventListener('mousemove', (e: MouseEvent) => {
                            if (this.dragId) return;
                            const rect = item.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            if (y < EDGE_SIZE || y > rect.height - EDGE_SIZE) {
                                (item as HTMLElement).setCssProps({ 'cursor': 'ns-resize' });
                                item.setAttribute('draggable', 'false');
                            } else {
                                (item as HTMLElement).setCssProps({ 'cursor': 'pointer' });
                                item.setAttribute('draggable', 'true');
                            }
                        });

                        item.addEventListener('mousedown', (e: MouseEvent) => {
                            if (e.button !== 0) return;
                            const rect = item.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            let edge: 'top' | 'bottom' | null = null;
                            if (y < EDGE_SIZE) edge = 'top';
                            else if (y > rect.height - EDGE_SIZE) edge = 'bottom';
                            if (!edge) return;

                            e.preventDefault();
                            e.stopPropagation();
                            isResizingCurrently = true;

                            const initialY = e.clientY;
                            const initialTop = parseFloat(item.style.getPropertyValue('--focus-item-top'));
                            const initialHeight = parseFloat(item.style.getPropertyValue('--focus-item-height'));
                            item.addClass('resizing');

                            const enable5 = this.view?.plugin?.settings?.enableFiveMinIntervals;
                            const stepsPerRow = enable5 ? 6 : 2;
                            const pxPerStep = rowHeight / stepsPerRow;
                            const stepMin = enable5 ? 5 : 15;

                            const onMove = (moveEvent: MouseEvent) => {
                                const deltaY = moveEvent.clientY - initialY;
                                let newTop = initialTop;
                                let newHeight = initialHeight;
                                if (edge === 'top') { newTop = initialTop + deltaY; newHeight = initialHeight - deltaY; }
                                else { newHeight = initialHeight + deltaY; }
                                const snappedTop = Math.round(newTop / pxPerStep) * pxPerStep;
                                const snappedHeight = Math.max(pxPerStep, Math.round(newHeight / pxPerStep) * pxPerStep);
                                if (edge === 'top') {
                                    const actualNewTop = snappedTop;
                                    const actualNewHeight = initialHeight - (snappedTop - initialTop);
                                    if (actualNewHeight >= pxPerStep) {
                                        item.setCssProps({
                                            '--focus-item-top': `${Math.round(actualNewTop)}px`,
                                            '--focus-item-height': `${Math.round(actualNewHeight)}px`
                                        });
                                    }
                                } else {
                                    item.setCssProps({ '--focus-item-height': `${Math.round(snappedHeight)}px` });
                                }
                            };

                            const onUpAsync = async () => {
                                window.removeEventListener('mousemove', onMove);
                                window.removeEventListener('mouseup', onUp);
                                item.removeClass('resizing');
                                setTimeout(() => { isResizingCurrently = false; }, 100);

                                const finalTop = parseFloat(item.style.getPropertyValue('--focus-item-top'));
                                const finalHeight = parseFloat(item.style.getPropertyValue('--focus-item-height'));
                                let newStartTotal = startTotal;
                                let newEndTotal = endTotal;

                                if (edge === 'top') {
                                    let segmentStartMins = Math.round(finalTop / pxPerStep) * stepMin;
                                    if (!isMulti && split && sMin >= boundary) segmentStartMins += boundary;
                                    newStartTotal = segmentStartMins;
                                } else {
                                    let segmentEndMins = Math.round((finalTop + finalHeight) / pxPerStep) * stepMin;
                                    if (!isMulti && split && sMin >= boundary) segmentEndMins += boundary;
                                    newEndTotal = segmentEndMins;
                                }

                                if (newStartTotal >= newEndTotal) {
                                    if (edge === 'top') newStartTotal = newEndTotal - stepMin;
                                    else newEndTotal = newStartTotal + stepMin;
                                }

                                const formatTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                let newStartTime = formatTime(Math.floor(newStartTotal / 60), newStartTotal % 60);
                                let newEndTime = formatTime(Math.floor(newEndTotal / 60), newEndTotal % 60);
                                let newEndDate = ev.endDate || ev.date || ev.startDate || dStr;

                                if (newEndTotal >= 24 * 60) {
                                    newEndTime = '00:00';
                                    if (newEndDate === dStr) {
                                        const [yy, mm, dd] = dStr.split('-').map(Number);
                                        const t = new Date(yy, (mm || 1) - 1, dd || 1);
                                        t.setDate(t.getDate() + 1);
                                        const pad = (n: number) => String(n).padStart(2, '0');
                                        newEndDate = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
                                    }
                                }

                                const newTimeRange = `${newStartTime}-${newEndTime}`;
                                try {
                                    const evIdx = (this.view?.events || []).findIndex((event: DaybleEvent) => event.id === ev.id);
                                    if (evIdx !== -1 && this.view) {
                                        const updatedEv = JSON.parse(JSON.stringify(this.view.events[evIdx]));
                                        updatedEv.time = newTimeRange;
                                        updatedEv.endDate = newEndDate;
                                        this.view.events[evIdx] = updatedEv;
                                        await this.view.saveAllEntries();
                                        await this.view.render();
                                        this.onOpen();
                                    }
                                } catch { /* intentional */ }
                            };
                            const onUp = () => { void onUpAsync(); };

                            window.addEventListener('mousemove', onMove);
                            window.addEventListener('mouseup', onUp);
                        });

                        item.onclick = (e: MouseEvent) => {
                            e.stopPropagation();
                            const rect = item.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            if (y < EDGE_SIZE || y > rect.height - EDGE_SIZE || item.hasClass('resizing') || isResizingCurrently) return;
                            void this.view?.openEventModal(ev.id, ev.date || ev.startDate, ev.endDate);
                        };

                        item.ondragstart = (e: DragEvent) => {
                            const dt = e.dataTransfer;
                            if (!dt) return;
                            dt.effectAllowed = 'move';
                            this.dragId = ev.id;
                            this.dragEl = item;
                            const itemRect = item.getBoundingClientRect();
                            this.dragOffsetY = e.clientY - itemRect.top;
                            item.addClass('dragging');
                            try { const img = new Image(); img.width = 1; img.height = 1; dt.setDragImage(img, 0, 0); } catch { /* intentional */ }
                            this.dragDuration = endTotal - startTotal;
                        };
                        item.ondragend = () => {
                            const currentIndicator = this.contentEl.querySelector('.dayble-focus-drop');
                            if (currentIndicator) currentIndicator.remove();
                            this.gridContainer.querySelectorAll('.dayble-focus-cell.drop-target').forEach(el => el.removeClass('drop-target'));
                            item.removeClass('dragging');
                            this.dragId = undefined; this.dragDuration = undefined; this.dragEl = undefined;
                        };
                        overlay.appendChild(item);
                    };

                    if (!isMulti && split && startTotal < boundary && endTotal > boundary) {
                        renderSegment(startTotal, boundary, 'start');
                        renderSegment(boundary, endTotal, 'end');
                    } else {
                        renderSegment(startTotal, endTotal, 'full');
                    }
                });
            });
        } catch { /* intentional */ }
    }
}