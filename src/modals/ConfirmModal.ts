import { App, Modal } from 'obsidian';

export interface ConfirmModalOptions {
    heading?: boolean;
    danger?: boolean;
    description?: string;
}

export default class ConfirmModal extends Modal {
    message: string;
    onConfirm: () => void | Promise<void>;
    options: ConfirmModalOptions;

    constructor(app: App, message: string, onConfirm: () => void | Promise<void>, options?: ConfirmModalOptions) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
        this.options = options || {};
    }

    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.addClass('dayble-confirm-content');

        if (this.options.heading) {
            c.createEl('h4', { text: this.message, cls: 'dayble-confirm-message' });
        } else {
            const msg = c.createEl('div', { cls: 'dayble-confirm-message' });
            msg.textContent = this.message;
        }

        if (this.options.description) {
            const desc = c.createEl('div', { cls: 'dayble-confirm-description' });
            desc.textContent = this.options.description;
            desc.setCssStyles({ 'margin-bottom': '16px', 'opacity': '0.8', 'font-size': '14px' });
        }

        const row = c.createDiv('dayble-modal-row-end');

        const cancel = row.createEl('button', { cls: 'dayble-btn' });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.close();

        const confirmCls = this.options.danger ? 'dayble-btn mod-warning' : 'dayble-btn mod-cta';
        const ok = row.createEl('button', { cls: confirmCls });
        ok.textContent = 'Confirm';
        ok.onclick = async () => { try { await this.onConfirm(); } finally { this.close(); } };
    }
}
