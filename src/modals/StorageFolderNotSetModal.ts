import { App, Modal } from 'obsidian';

export default class StorageFolderNotSetModal extends Modal {
    constructor(app: App) {
        super(app);
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        });

        const title = contentEl.createEl('h2', { text: 'Storage folder not set', cls: 'dayble-modal-title' });
        title.setCssStyles({ margin: '0' });

        contentEl.createEl('p', {
            text: 'You need to set a storage folder to create and save events.',
        }).setCssStyles({ margin: '0' });

        const btns = contentEl.createDiv({ cls: 'dayble-modal-footer' });
        btns.setCssStyles({
            marginTop: '8px',
            justifyContent: 'flex-end'
        });

        const closeBtn = btns.createEl('button', { cls: 'dayble-btn' });
        closeBtn.setText('Close');
        closeBtn.onclick = () => this.close();

        const openSettingsBtn = btns.createEl('button', { cls: 'dayble-btn mod-cta' });
        openSettingsBtn.setText('Open settings');
        openSettingsBtn.onclick = () => {
            try {
                const s = (this.app as App & { setting: { open: () => void; openTabById: (id: string) => void } }).setting;
                s?.open?.();
                s?.openTabById?.('dayble-calendar');
            } catch { /* intentional */ }
            this.close();
        };
    }
}
