import { App, Modal, moment } from 'obsidian';
import type { EventRecurrence } from './types';

export default class EventRepeatModal extends Modal {
    recurrence: EventRecurrence;
    onSave: (recurrence: EventRecurrence) => void;
    currentDate: string;
    isSaved: boolean = false;

    constructor(app: App, recurrence: EventRecurrence | undefined, currentDate: string, onSave: (recurrence: EventRecurrence) => void) {
        super(app);
        this.recurrence = recurrence ? JSON.parse(JSON.stringify(recurrence)) : { type: 'none', startDate: currentDate };
        if (!this.recurrence.startDate) this.recurrence.startDate = currentDate;
        this.currentDate = currentDate;
        this.onSave = onSave;
    }

    onClose() {
        if (!this.isSaved) {
            this.onSave(this.recurrence);
        }
        this.contentEl.empty();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('db-modal');
        const heading = contentEl.createEl('h3', { text: 'Event repeat', cls: 'db-modal-title' });
        heading.setCssProps({ 'margin-bottom': '0px' });

        const container = contentEl.createDiv({ cls: 'dayble-repeat-modal-container' });

        // Start and End dates for recurrence
        const rangeRow = container.createDiv({ cls: 'db-modal-row', attr: { style: 'margin-bottom: 15px; gap: 10px; display: flex; align-items: center;' } });
        rangeRow.createSpan({ text: 'From:' });
        const startInput = rangeRow.createEl('input', { type: 'date', value: this.recurrence.startDate || this.currentDate });
        startInput.addClass('db-input');
        startInput.onchange = () => { this.recurrence.startDate = startInput.value; };

        rangeRow.createSpan({ text: 'To:' });
        const endInput = rangeRow.createEl('input', { type: 'date', value: this.recurrence.endDate || '' });
        endInput.addClass('db-input');
        endInput.onchange = () => { this.recurrence.endDate = endInput.value; };

        const options = [
            { label: 'Never Repeat', value: 'none' },
            { label: 'Repeat everyday', value: 'daily' },
            { label: 'Repeat weekly', value: 'weekly' },
            { label: 'Repeat monthly', value: 'monthly' },
            { label: 'Repeat yearly', value: 'yearly' },
        ];

        const selectEl = container.createEl('select', { cls: 'db-select dayble-repeat-type-select' });
        options.forEach(opt => {
            const o = selectEl.createEl('option', { text: opt.label, value: opt.value });
            if (this.recurrence.type === opt.value) o.selected = true;
        });

        const optionsContainer = container.createDiv({ cls: 'dayble-repeat-options' });

        const renderOptions = () => {
            optionsContainer.empty();
            const type = selectEl.value as EventRecurrence['type'];
            this.recurrence.type = type;

            if (type === 'daily') {
                const row = optionsContainer.createDiv({ cls: 'db-modal-row' });
                row.createSpan({ text: 'Repeat every ' });
                const input = row.createEl('input', { type: 'number', value: String(this.recurrence.interval || 1), attr: { min: '1', style: 'width: 60px;' } });
                input.addClass('db-input');
                input.onchange = () => { this.recurrence.interval = parseInt(input.value); };
                row.createSpan({ text: ' days' });
            } else if (type === 'weekly') {
                const rowDays = optionsContainer.createDiv({ cls: 'db-modal-row dayble-repeat-days-row' });
                rowDays.createSpan({ text: 'Repeat every: ' });
                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                this.recurrence.daysOfWeek = this.recurrence.daysOfWeek || [];
                days.forEach((day, i) => {
                    const btn = rowDays.createEl('button', { text: day, cls: 'db-btn dayble-repeat-day-btn' });
                    if (this.recurrence.daysOfWeek?.includes(i)) btn.addClass('mod-cta');
                    btn.onclick = () => {
                        if (this.recurrence.daysOfWeek?.includes(i)) {
                            this.recurrence.daysOfWeek = this.recurrence.daysOfWeek.filter(d => d !== i);
                            btn.removeClass('mod-cta');
                        } else {
                            this.recurrence.daysOfWeek?.push(i);
                            btn.addClass('mod-cta');
                        }
                    };
                });

                const rowInterval = optionsContainer.createDiv({ cls: 'db-modal-row' });
                rowInterval.createSpan({ text: 'Repeat every ' });
                const input = rowInterval.createEl('input', { type: 'number', value: String(this.recurrence.interval || 1), attr: { min: '1', max: '52', style: 'width: 60px;' } });
                input.addClass('db-input');
                input.onchange = () => { this.recurrence.interval = parseInt(input.value); };
                rowInterval.createSpan({ text: ' weeks' });
            } else if (type === 'monthly') {
                this.recurrence.monthlyMode = this.recurrence.monthlyMode || 'days';

                const rowRadioDays = optionsContainer.createDiv({ cls: 'db-modal-row', attr: { style: 'display: flex; align-items: center; gap: 10px;' } });
                const radioDays = rowRadioDays.createEl('input', { type: 'radio', attr: { name: 'monthly-mode', id: 'monthly-mode-days' } });
                if (this.recurrence.monthlyMode === 'days') radioDays.checked = true;
                rowRadioDays.createEl('label', { text: 'On weekdays:', attr: { for: 'monthly-mode-days' } });

                const daysRow = optionsContainer.createDiv({ cls: 'db-modal-row dayble-repeat-days-row', attr: { style: 'margin-left: 25px;' } });
                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                this.recurrence.daysOfWeek = this.recurrence.daysOfWeek || [];
                days.forEach((day, i) => {
                    const btn = daysRow.createEl('button', { text: day, cls: 'db-btn dayble-repeat-day-btn' });
                    if (this.recurrence.daysOfWeek?.includes(i)) btn.addClass('mod-cta');
                    btn.onclick = () => {
                        if (this.recurrence.monthlyMode !== 'days') {
                            this.recurrence.monthlyMode = 'days';
                            radioDays.checked = true;
                        }
                        if (this.recurrence.daysOfWeek?.includes(i)) {
                            this.recurrence.daysOfWeek = this.recurrence.daysOfWeek.filter(d => d !== i);
                            btn.removeClass('mod-cta');
                        } else {
                            this.recurrence.daysOfWeek?.push(i);
                            btn.addClass('mod-cta');
                        }
                    };
                });

                const rowRadioDate = optionsContainer.createDiv({ cls: 'db-modal-row', attr: { style: 'display: flex; align-items: center; gap: 10px; margin-top: 10px;' } });
                const radioDate = rowRadioDate.createEl('input', { type: 'radio', attr: { name: 'monthly-mode', id: 'monthly-mode-date' } });
                if (this.recurrence.monthlyMode === 'date') radioDate.checked = true;
                rowRadioDate.createEl('label', { text: 'Repeat on:', attr: { for: 'monthly-mode-date' } });

                const dateInput = rowRadioDate.createEl('input', { type: 'number', value: String(this.recurrence.monthDate || moment(this.currentDate).date()), attr: { min: '1', max: '31', style: 'width: 60px;' } });
                dateInput.addClass('db-input');
                dateInput.onchange = () => {
                    this.recurrence.monthlyMode = 'date';
                    radioDate.checked = true;
                    this.recurrence.monthDate = parseInt(dateInput.value);
                };

                radioDays.onchange = () => { if (radioDays.checked) this.recurrence.monthlyMode = 'days'; };
                radioDate.onchange = () => { if (radioDate.checked) this.recurrence.monthlyMode = 'date'; };

            } else if (type === 'yearly') {
                const row = optionsContainer.createDiv({ cls: 'db-modal-row' });
                row.createSpan({ text: 'Repeat on: ' });
                const dateInput = row.createEl('input', { type: 'date', value: this.recurrence.monthDate ? moment(this.currentDate).date(this.recurrence.monthDate).format('YYYY-MM-DD') : this.currentDate });
                dateInput.addClass('db-input');
                dateInput.onchange = () => {
                    const d = moment(dateInput.value);
                    this.recurrence.monthDate = d.date();
                };
            }
        };

        selectEl.onchange = renderOptions;
        renderOptions();

        const footer = contentEl.createDiv({ cls: 'db-modal-footer', attr: { style: 'display: flex; gap: 10px; justify-content: flex-end;' } });
        const cancelBtn = footer.createEl('button', { text: 'Cancel', cls: 'db-btn' });
        cancelBtn.onclick = () => {
            this.isSaved = true; // Prevent onClose from saving
            this.close();
        };
        const saveBtn = footer.createEl('button', { text: 'Save', cls: 'mod-cta db-btn' });
        saveBtn.onclick = () => {
            this.isSaved = true;
            this.onSave(this.recurrence);
            this.close();
        };
    }
}
