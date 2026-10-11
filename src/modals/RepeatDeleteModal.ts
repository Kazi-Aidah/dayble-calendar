import { App, Modal, moment } from 'obsidian';

export interface RepeatDeleteHandlers {
    onDeleteOccurrence: () => void | Promise<void>;
    onDeleteFuture: () => void | Promise<void>;
    onDeleteEntire: () => void | Promise<void>;
}

/**
 * Shown when deleting an event that repeats. Asks whether to delete only the
 * selected occurrence, all future repeats, or the entire event.
 */
export default class RepeatDeleteModal extends Modal {
    occDate: string;
    title: string;
    handlers: RepeatDeleteHandlers;

    constructor(app: App, occDate: string, title: string, handlers: RepeatDeleteHandlers) {
        super(app);
        this.occDate = occDate;
        this.title = title;
        this.handlers = handlers;
    }

    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.addClass('dayble-confirm-content');

        c.createEl('h4', { text: 'Delete repeating event', cls: 'dayble-confirm-message' });

        const desc = c.createDiv({ cls: 'dayble-confirm-description' });
        const parsed = moment(this.occDate);
        const pretty = parsed.isValid() ? parsed.format('MMMM D, YYYY') : this.occDate;
        desc.textContent = `"${this.title || 'Untitled Event'}" repeats. Choose what to delete (selected occurrence: ${pretty}).`;
        desc.setCssStyles({ 'margin-bottom': '16px', 'opacity': '0.8', 'font-size': '14px' });

        const row = c.createDiv('dayble-modal-row-end');

        const cancel = row.createEl('button', { cls: 'dayble-btn' });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();

        const occurrence = row.createEl('button', { cls: 'dayble-btn mod-cta' });
        occurrence.textContent = 'Delete this occurrence';
        occurrence.onclick = async () => { this.close(); await this.handlers.onDeleteOccurrence(); };

        const future = row.createEl('button', { cls: 'dayble-btn' });
        future.textContent = 'Delete all future repeats';
        future.onclick = async () => { this.close(); await this.handlers.onDeleteFuture(); };

        const entire = row.createEl('button', { cls: 'dayble-btn mod-warning' });
        entire.textContent = 'Delete entire event';
        entire.onclick = async () => { this.close(); await this.handlers.onDeleteEntire(); };
    }

    onClose() {
        this.contentEl.empty();
    }
}
