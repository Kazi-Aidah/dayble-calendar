import { App, Modal, setIcon, setTooltip } from 'obsidian';
import { getIconIdsSafe } from '../utils';

export default class IconPickerModal extends Modal {
    onPick: (icon: string) => void;
    onRemove?: () => void;
    allIcons: string[] = [];

    constructor(app: App, onPick: (icon: string) => void, onRemove?: () => void) {
        super(app);
        this.onPick = onPick;
        this.onRemove = onRemove;
    }

    onOpen() {
        const c = this.contentEl;
        c.empty();
        c.addClass('dayble-modal-column');
        c.addClass('dayble-modal-full-height');
        c.addClass('db-modal');

        const searchRow = c.createDiv({ cls: 'dayble-modal-row' });
        searchRow.addClass('db-modal-row');
        const searchInput = searchRow.createEl('input', { type: 'text', cls: 'dayble-input', attr: { placeholder: 'Search icons' } });
        searchInput.addClass('db-input');
        searchInput.addClass('dayble-icon-picker-search');

        const list = c.createDiv({ cls: 'dayble-icon-list' });
        list.addClass('dayble-icon-picker-list');
        list.addClass('db-icon-list');

        // Footer with remove button
        const footer = c.createDiv();
        footer.addClass('db-modal-footer');
        footer.addClass('dayble-icon-picker-footer');
        const removeBtn = footer.createEl('button', { cls: 'dayble-btn', text: 'Remove icon' });
        removeBtn.addClass('db-btn');
        removeBtn.addClass('dayble-icon-picker-remove-btn');
        const removeIcon = removeBtn.createDiv();
        removeIcon.addClass('dayble-inline-flex');
        removeBtn.onclick = () => { if (this.onRemove) this.onRemove(); this.close(); };

        // Load icons lazily
        if (!this.allIcons.length) {
            this.allIcons = getIconIdsSafe();
        }

        const renderList = (icons: string[], limit: number = 98) => {
            list.empty();
            const toShow = limit > 0 ? icons.slice(0, limit) : icons;
            toShow.forEach(id => {
                const btn = list.createDiv({ cls: 'clickable-icon' });
                setTooltip(btn, id);
                setIcon(btn, id);
                btn.onclick = () => { this.onPick(id); this.close(); };
            });
        };

        const applyFilter = () => {
            const q = (searchInput.value || '').toLowerCase();
            if (!q) {
                renderList(this.allIcons, 98);
            } else {
                const filtered = this.allIcons.filter(id => id.toLowerCase().includes(q));
                renderList(filtered, 500); // Show more when searching
            }
        };

        searchInput.oninput = applyFilter;
        renderList(this.allIcons, 98);
    }
}
