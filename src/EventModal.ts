import { App, Modal, Notice, setIcon, setTooltip } from 'obsidian';
import type { DaybleEvent, EventCategory, EventRecurrence } from './types';
import { resolveNoteFile } from './utils';
import EventRepeatModal from './EventRepeatModal';

export default class EventModal extends Modal {
    plugin: unknown;
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
    selectedLayout?: string;
    recurrence: EventRecurrence = { type: 'none' };
    _suggestionKeydownHandler?: (e: KeyboardEvent) => void;

    constructor(
        app: App,
        plugin: unknown,
        ev: DaybleEvent | undefined,
        date: string | undefined,
        endDate: string | undefined,
        defaultStartTime: string | undefined,
        defaultEndTime: string | undefined,
        onSubmit: (ev: Partial<DaybleEvent>) => Promise<void>,
        onDelete: () => Promise<void>,
        onPickIcon: () => Promise<void>
    ) {
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
        this.selectedLayout = ev?.settings?.layout;
        this.recurrence = ev?.recurrence || { type: 'none' };
    }

    setIcon(icon: string) { this.icon = icon; if (this.iconBtnEl) setIcon(this.iconBtnEl, icon || 'plus'); }

    getRecurrenceText(rec: EventRecurrence): string {
        if (!rec || rec.type === 'none') return 'Never Repeat';
        let text = '';
        if (rec.type === 'daily') text = `Repeat every ${rec.interval || 1} day${(rec.interval || 1) > 1 ? 's' : ''}`;
        else if (rec.type === 'weekly') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const selectedDays = (rec.daysOfWeek || []).map(i => days[i]).join(', ');
            text = `Repeat every ${rec.interval || 1} week${(rec.interval || 1) > 1 ? 's' : ''}${selectedDays ? ' on ' + selectedDays : ''}`;
        }
        else if (rec.type === 'monthly') {
            if (rec.monthlyMode === 'days') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const selectedDays = (rec.daysOfWeek || []).map(i => days[i]).join(', ');
                text = `Repeat every month on ${selectedDays || 'weekdays'}`;
            } else {
                text = `Repeat every month on date ${rec.monthDate || 1}`;
            }
        }
        else if (rec.type === 'yearly') text = 'Repeat every year';

        if (rec.endDate) {
            text += ` until ${rec.endDate}`;
        }
        return text || 'Never Repeat';
    }

    createCustomTimeInput(parent: HTMLElement, initialValue: string, format: '12h' | '24h') {
        const wrap = parent.createDiv({ cls: 'dayble-custom-time-input' });

        const hInput = wrap.createEl('input', { type: 'text', cls: 'dayble-time-segment', attr: { maxlength: '2', placeholder: '00' } });
        wrap.createSpan({ cls: 'dayble-time-separator', text: ':' });
        const mInput = wrap.createEl('input', { type: 'text', cls: 'dayble-time-segment', attr: { maxlength: '2', placeholder: '00' } });

        let ampmInput: HTMLInputElement | null = null;
        if (format === '12h') {
            ampmInput = wrap.createEl('input', { type: 'text', cls: 'dayble-time-segment dayble-time-segment-ampm', attr: { readonly: 'true', value: 'AM' } });
        }

        const setValue = (val: string) => {
            if (!val) {
                hInput.value = '';
                mInput.value = '';
                if (ampmInput) ampmInput.value = 'AM';
                return;
            }
            const parts = val.split(':');
            let h = parseInt(parts[0] || '0', 10);
            const m = parseInt(parts[1] || '0', 10);

            if (format === '12h') {
                const isPM = h >= 12;
                if (ampmInput) {
                    ampmInput.value = isPM ? 'PM' : 'AM';
                }
                h = h % 12 || 12;
                hInput.value = String(h).padStart(2, '0');
            } else {
                hInput.value = String(h).padStart(2, '0');
            }
            mInput.value = String(m).padStart(2, '0');
        };

        if (initialValue) setValue(initialValue);

        const getValue = () => {
            if (!hInput.value && !mInput.value) return undefined;
            let h = parseInt(hInput.value || '0', 10);
            const m = parseInt(mInput.value || '0', 10);

            if (format === '12h') {
                const isPM = ampmInput?.value === 'PM';
                if (isPM && h < 12) h += 12;
                if (!isPM && h === 12) h = 0;
            }

            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const setupSegment = (el: HTMLInputElement, max: number, min: number = 0) => {
            el.onfocus = () => el.select();
            el.oninput = () => {
                el.value = el.value.replace(/[^\d]/g, '');
                if (el.value.length === 2) {
                    if (el === hInput) mInput.focus();
                    else if (el === mInput && ampmInput) ampmInput.focus();
                }
            };
            el.onblur = () => {
                if (el.value === '') return;
                let v = parseInt(el.value, 10);
                if (isNaN(v)) v = min;
                if (v > max) v = max;
                if (v < min) v = min;
                el.value = String(v).padStart(2, '0');
            };
            el.onkeydown = (e) => {
                if (e.key === 'ArrowRight' && el === hInput) { e.preventDefault(); mInput.focus(); }
                if (e.key === 'ArrowRight' && el === mInput && ampmInput) { e.preventDefault(); ampmInput.focus(); }
                if (e.key === 'ArrowLeft' && el === mInput) { e.preventDefault(); hInput.focus(); }
                if (e.key === 'ArrowLeft' && el === ampmInput) { e.preventDefault(); mInput.focus(); }

                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    let v = parseInt(el.value, 10);
                    if (isNaN(v)) v = 0;
                    if (e.key === 'ArrowUp') v++; else v--;
                    if (v > max) v = min;
                    if (v < min) v = max;
                    el.value = String(v).padStart(2, '0');
                    el.select();
                }

                if (e.key === 'Backspace' && el.value === '' && el === mInput) { e.preventDefault(); hInput.focus(); }
                if (e.key === 'Backspace' && el === ampmInput) { e.preventDefault(); mInput.focus(); }
            };
        };

        setupSegment(hInput, format === '12h' ? 12 : 23, format === '12h' ? 1 : 0);
        setupSegment(mInput, 59);

        if (ampmInput) {
            ampmInput.onfocus = () => ampmInput?.select();
            ampmInput.onkeydown = (e) => {
                if (e.key === 'ArrowLeft') { e.preventDefault(); mInput.focus(); }
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
                    e.preventDefault();
                    ampmInput.value = ampmInput.value === 'AM' ? 'PM' : 'AM';
                    ampmInput?.select();
                }
                if (e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    ampmInput.value = 'AM';
                    ampmInput?.select();
                }
                if (e.key.toLowerCase() === 'p') {
                    e.preventDefault();
                    ampmInput.value = 'PM';
                    ampmInput?.select();
                }
            };
        }

        setValue(initialValue);

        return { getValue, setValue };
    }

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

        const focusTitle = () => { try { titleInput.focus({ preventScroll: true }); } catch { /* intentional */ } };
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
                .filter((f: unknown) => f.name && f.name.toLowerCase().includes(query) && !f.name.startsWith('.'))
                .slice(0, 10);
            if (files.length === 0) return;
            suggestionTarget = target;
            suggestionSelectedIndex = 0;
            suggestionContainer = document.createElement('div');
            suggestionContainer.className = 'dayble-link-suggestions dayble-suggestion-container';
            files.forEach((file: unknown, i: number) => {
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
        this._suggestionKeydownHandler = (e: KeyboardEvent) => {
            if (!suggestionContainer) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggestionSelection(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggestionSelection(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); chooseCurrentSuggestion(); }
            else if (e.key === 'Escape') { e.preventDefault(); closeSuggestions(); }
        };
        document.addEventListener('keydown', this._suggestionKeydownHandler as EventListener, { capture: true });
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
        let selectedCategoryId = this.ev?.categoryId;
        const categorySelect = ruleRow.createEl('select', { cls: 'dayble-input dayble-category-select' });
        categorySelect.addClass('db-select');
        const emptyOpt = categorySelect.createEl('option'); emptyOpt.value = ''; emptyOpt.text = 'Choose category';
        const categories = this.plugin.settings.eventCategories || [];
        categories.forEach((cat: EventCategory) => { const opt = categorySelect.createEl('option'); opt.value = cat.id; opt.text = cat.name; });
        categorySelect.value = selectedCategoryId ?? '';

        categorySelect.onchange = () => {
            selectedCategoryId = categorySelect.value || undefined;
        };

        // Date row (above times)
        const rowDate = c.createDiv({ cls: 'dayble-modal-row dayble-modal-row-center' });
        rowDate.addClass('db-modal-row');

        rowDate.createSpan({ text: 'Start:', cls: 'dayble-modal-label' });
        const startDate = rowDate.createEl('input', { type: 'date', cls: 'dayble-input' });
        startDate.addClass('db-input');
        (startDate as unknown).setCssProps({ 'margin-right': '6px !important' });
        startDate.value = this.ev?.date ?? this.ev?.startDate ?? this.date ?? '';

        rowDate.createSpan({ text: 'End:', cls: 'dayble-modal-label' });
        // End date in same row
        const endDateInput = rowDate.createEl('input', { type: 'date', cls: 'dayble-input' });
        endDateInput.addClass('db-input');
        endDateInput.value = this.ev?.endDate ?? this.endDate ?? startDate.value;

        // Time row (start and end on same row)
        const rowTime = c.createDiv({ cls: 'dayble-modal-row' });
        rowTime.addClass('db-modal-row');

        const timeFmt = this.plugin.getTimeFormat();
        const startVal = this.ev?.time?.split('-')[0] ?? (this.defaultStartTime ?? '');
        const endVal = this.ev?.time?.split('-')[1] ?? (this.defaultEndTime ?? '');

        const customStart = this.createCustomTimeInput(rowTime, startVal, timeFmt);
        const customEnd = this.createCustomTimeInput(rowTime, endVal, timeFmt);

        const repeatBtn = c.createEl('button', { cls: 'dayble-btn dayble-repeat-btn' });
        repeatBtn.addClass('db-btn');
        setIcon(repeatBtn, 'refresh-cw');
        repeatBtn.createSpan({ text: this.getRecurrenceText(this.recurrence), cls: 'dayble-repeat-btn-text' });

        repeatBtn.onclick = (e) => {
            e.preventDefault();
            new EventRepeatModal(this.app, this.recurrence, startDate.value, (newRec) => {
                this.recurrence = newRec;
                (repeatBtn.querySelector('.dayble-repeat-btn-text')).textContent = this.getRecurrenceText(newRec);
            }).open();
        };

        const descInput = c.createEl('textarea', { cls: 'dayble-textarea', attr: { placeholder: 'Description' } });
        descInput.addClass('db-textarea');
        descInput.value = this.ev?.description ?? '';

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
                recurrence: this.recurrence,
                settings: {
                    titleAlign: this.ev?.settings?.titleAlign,
                    descAlign: this.ev?.settings?.descAlign,
                    layout: this.selectedLayout
                }
            };
            if (!payload.categoryId && !payload.color && !payload.colorName) {
                const triggers = this.plugin.settings.triggers || [];
                const txt = ((payload.title || '') + ' ' + (payload.description || '')).toLowerCase();
                const found = triggers.find((t: { pattern: string, categoryId: string, color?: string, textColor?: string, colorName?: string }) => {
                    const pattern = (t.pattern || '').toLowerCase();
                    if (!pattern) return false;
                    const parts = pattern.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                    return parts.some((p: string) => txt.includes(p));
                });
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
            const startTimeVal = customStart.getValue();
            const endTimeVal = customEnd.getValue();
            payload.time = (startTimeVal && endTimeVal) ? `${startTimeVal}-${endTimeVal}` : (startTimeVal || '');

            if (finalIsMultiDay) {
                // Multi-day event
                payload.startDate = startDate.value;
                payload.endDate = endDateInput.value;
                payload.date = undefined;
            } else {
                // Single day event
                payload.date = startDate.value;
                payload.startDate = startDate.value;
                payload.endDate = startDate.value;
            }

            try {
                await this.onSubmit(payload);
                this.close();
            } catch (e) { /* intentional */
                new Notice('Error saving event: ' + (e instanceof Error ? e.message : String(e)));
            }
        };

        ok.onclick = () => { void handleSave(); };

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !suggestionContainer) {
                e.preventDefault();
                void handleSave();
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
                    void (leaf).openFile(file);
                }
            }
        }, { capture: true });
    }

    onClose() {
        if (this._suggestionKeydownHandler) {
            document.removeEventListener('keydown', this._suggestionKeydownHandler as EventListener);
            this._suggestionKeydownHandler = undefined;
        }
        document.querySelectorAll('.dayble-suggestion-container').forEach(el => el.remove());
    }
}
