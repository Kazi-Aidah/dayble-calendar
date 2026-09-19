import { App, Modal, Notice, moment } from 'obsidian';
import type DaybleCalendarPlugin from '../plugin';
import type { DaybleEvent } from '../types';
import { randomId } from '../utils';
import StorageFolderNotSetModal from './StorageFolderNotSetModal';

const DURATION_PRESETS = [
    { label: '3m', minutes: 3 },
    { label: '5m', minutes: 5 },
    { label: '10m', minutes: 10 },
    { label: '15m', minutes: 15 },
    { label: '20m', minutes: 20 },
    { label: '25m', minutes: 25 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
];

function createCustomTimeInput(parent: HTMLElement, initialValue: string, format: '12h' | '24h') {
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

export default class QuickAddEventModal extends Modal {
    plugin: DaybleCalendarPlugin;

    constructor(app: App, plugin: DaybleCalendarPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const c = this.contentEl;
        c.empty();

        c.createEl('h2', { text: 'Quick Add Event for Today' });

        const timeFmt = this.plugin.getTimeFormat();

        // Start time row
        const timeRow = c.createDiv({ cls: 'dayble-quick-time-row' });
        timeRow.createEl('label', { text: 'Start time', cls: 'dayble-quick-label' });
        const timeInput = createCustomTimeInput(timeRow, moment().format('HH:mm'), timeFmt);

        // Task name input
        const nameRow = c.createDiv({ cls: 'dayble-quick-name-row' });
        nameRow.createEl('label', { text: 'Task name', cls: 'dayble-quick-label' });
        const nameInput = nameRow.createEl('input', {
            type: 'text',
            cls: 'dayble-quick-name-input',
            attr: { placeholder: 'e.g. Call dentist, Write report...' }
        });

        // Duration dropdown
        const durRow = c.createDiv({ cls: 'dayble-quick-dur-row' });
        durRow.createEl('label', { text: 'Duration', cls: 'dayble-quick-label' });
        const selectEl = durRow.createEl('select', { cls: 'dayble-quick-dur-select' });
        for (const preset of DURATION_PRESETS) {
            selectEl.createEl('option', { value: String(preset.minutes), text: preset.label });
        }
        selectEl.value = '15'; // default 15m

        // Footer buttons
        const footer = c.createDiv({ cls: 'dayble-quick-footer' });
        const cancelBtn = footer.createEl('button', { text: 'Cancel', cls: 'dayble-quick-cancel-btn' });
        const saveBtn = footer.createEl('button', { text: 'Add Event', cls: 'mod-cta dayble-quick-save-btn' });

        cancelBtn.onclick = () => this.close();

        const handleSave = async () => {
            const startTime = timeInput.getValue();
            if (!startTime) {
                new Notice('Please set a start time.');
                return;
            }

            const taskName = nameInput.value.trim();
            if (!taskName) {
                new Notice('Please enter a task name.');
                nameInput.focus();
                return;
            }

            const durationMinutes = parseInt(selectEl.value, 10);
            const [sh, sm] = startTime.split(':').map(Number);
            const totalMinutes = sh * 60 + sm + durationMinutes;
            const endH = Math.floor(totalMinutes / 60) % 24;
            const endM = totalMinutes % 60;
            const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            const today = moment().format('YYYY-MM-DD');

            const ev: DaybleEvent = {
                id: randomId(),
                title: taskName,
                date: today,
                startDate: today,
                endDate: today,
                time: `${startTime}-${endTime}`,
            };

            const folder = this.plugin.settings.entriesFolder?.trim();
            if (!folder) {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }
            try { await this.app.vault.adapter.stat(folder); }
            catch {
                new StorageFolderNotSetModal(this.app).open();
                return;
            }

            // Save the event
            const leaves = this.app.workspace.getLeavesOfType('dayble-calendar-view');
            if (leaves.length) {
                const view = leaves[0].view as any;
                if (view && typeof view.events !== 'undefined') {
                    view.events.push(ev);
                    if (typeof view.saveAllEntries === 'function') {
                        await view.saveAllEntries();
                    }
                    if (typeof view.render === 'function') {
                        await view.render();
                    }
                    if (view.currentTodayModal) {
                        view.currentTodayModal.events = view.events;
                        void view.currentTodayModal.onOpen();
                    }
                }
            }

            new Notice(`Event "${taskName}" added for today`);
            this.close();
        };

        saveBtn.onclick = () => void handleSave();

        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                void handleSave();
            }
        });

        // Auto-focus the name input
        setTimeout(() => nameInput.focus(), 50);
    }

    onClose() {
        this.contentEl.empty();
    }
}
