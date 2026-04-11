import { App, Modal } from 'obsidian';

export default class ConfirmModal extends Modal {
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
