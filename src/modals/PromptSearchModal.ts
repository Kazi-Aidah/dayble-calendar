import { App, Modal, setIcon, moment } from 'obsidian';
import type { DaybleEvent } from '../types';
import { renderMarkdown, chooseTextColor, hexToRgba } from '../utils';

export default class PromptSearchModal extends Modal {
    view: unknown; // DaybleCalendarView — typed as any to avoid circular dependency
    query: string = '';
    results: DaybleEvent[] = [];
    selectedIndex: number = 0;
    allEventsCache: DaybleEvent[] = [];
    cacheLoaded: boolean = false;
    debounceTimer?: number;

    constructor(app: App, view: unknown) {
        super(app);
        this.view = view;
        try {
            this.modalEl.classList.remove('modal');
            this.modalEl.className = 'prompt';
            if (this.contentEl && this.contentEl.parentElement === this.modalEl) {
                this.contentEl.remove();
            }
        } catch { /* intentional */ }
    }

    onOpen() {
        const root = this.modalEl;
        while (root.firstChild) root.removeChild(root.firstChild);
        const inputWrap = root.createDiv({ cls: 'prompt-input-container' });
        const input = inputWrap.createEl('input', { cls: 'prompt-input', attr: { autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', type: 'text', placeholder: 'Find events...' } });
        const resultsEl = root.createDiv({ cls: 'prompt-results' });
        const ensureSelectedVisible = () => {
            const sel = resultsEl.querySelector('.suggestion-item.is-selected');
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        };
        const render = () => {
            resultsEl.empty();
            const items = this.results;
            if (!items.length) return;
            items.forEach((ev, i) => {
                const row = resultsEl.createDiv({ cls: 'suggestion-item mod-complex' });
                if (i === this.selectedIndex) row.addClass('is-selected');
                row.onmouseenter = () => { this.selectedIndex = i; render(); ensureSelectedVisible(); };
                const content = row.createDiv({ cls: 'suggestion-content' });

                const preview = document.createElement('div');
                preview.className = 'dayble-event dayble-title-align-left dayble-desc-align-left dayble-icon-placement-left';

                const inner = preview.createDiv({ cls: 'dayble-event-inner' });
                const titleContainer = inner.createDiv({ cls: 'dayble-event-title-container' });
                const titleEl = titleContainer.createDiv({ cls: 'dayble-event-title' });
                renderMarkdown(ev.title || '(untitled)', titleEl, this.app);

                if (ev.description) {
                    const descEl = inner.createDiv({ cls: 'dayble-event-desc' });
                    renderMarkdown(ev.description || '', descEl, this.app);
                }

                const category = this.view.plugin.settings.eventCategories?.find((c: unknown) => c.id === ev.categoryId);
                const state = ev.stateId ? (this.view.plugin.settings.eventStates || []).find((s: unknown) => s.id === ev.stateId) : null;
                const effect = state ? state.effect : (category ? category.effect : null);
                const anim = state ? state.animation : (category ? category.animation : null);
                const anim2 = state ? state.animation2 : (category ? category.animation2 : null);

                if (effect && effect !== '') preview.addClass(`dayble-effect-${effect}`);
                if (anim && anim !== '') preview.addClass(`dayble-anim-${anim}`);
                if (anim2 && anim2 !== '') preview.addClass(`dayble-anim-${anim2}`);

                const iconToUse = (state && state.icon) || ev.icon || (category?.icon || '');
                if (iconToUse) {
                    const iconEl = preview.createDiv({ cls: 'dayble-event-icon' });
                    setIcon(iconEl, iconToUse);
                    preview.insertBefore(iconEl, inner);
                }

                let bgColor = '';
                let textColor = '';
                const colorName = ev.colorName || (!ev.color && !category ? this.view.plugin.settings.defaultEventColorName : undefined);
                if (colorName) {
                    const allSwatches = [...(this.view.plugin.settings.swatches || []), ...(this.view.plugin.settings.userCustomSwatches || [])];
                    const swatch = allSwatches.find((s: unknown) => (s.name || '').toLowerCase() === colorName.toLowerCase());
                    if (swatch) {
                        preview.classList.add('dayble-event-colored');
                        const opacity = this.view.plugin.settings.eventBgOpacity ?? 1;
                        const bOpacity = this.view.plugin.settings.eventBorderOpacity ?? 1;
                        const swatchBg = swatch.color;
                        const swatchText = swatch.textColor || chooseTextColor(swatchBg);
                        preview.setCssProps({
                            '--event-bg-color': hexToRgba(swatchBg, opacity),
                            '--event-text-color': swatchText,
                            '--event-border-color': hexToRgba(swatchText, bOpacity)
                        });
                        bgColor = swatchBg;
                        textColor = swatchText;
                    }
                } else {
                    if (ev.color) {
                        bgColor = ev.color;
                        textColor = ev.textColor || chooseTextColor(ev.color);
                        (preview as HTMLElement).dataset.color = ev.color;
                    } else if (category && category.bgColor) {
                        bgColor = category.bgColor;
                        textColor = category.textColor;
                    }
                    if (bgColor && textColor) {
                        const opacity = this.view.plugin.settings.eventBgOpacity ?? 1;
                        const rgbaColor = hexToRgba(bgColor, opacity);
                        const bOpacity = this.view.plugin.settings.eventBorderOpacity ?? 1;
                        const borderColor = hexToRgba(textColor, bOpacity);
                        preview.setCssProps({
                            '--event-bg-color': rgbaColor,
                            '--event-text-color': textColor,
                            '--event-border-color': borderColor
                        });
                        preview.classList.add('dayble-event-colored');
                        const descEl = preview.querySelector('.dayble-event-desc');
                        if (descEl) descEl.setCssProps({ 'color': textColor });
                    }
                }

                (preview as unknown).setCssProps?.({ 'width': '100%' });
                content.appendChild(preview);

                const note = content.createDiv({ cls: 'suggestion-note' });
                const dateStr = ev.date || ev.startDate || '';
                let formattedDate = dateStr;
                if (dateStr) {
                    const [yy, mm, dd] = dateStr.split('-').map(Number);
                    const dObj = new Date(yy, (mm || 1) - 1, dd || 1);
                    const fmt = this.view.plugin.settings.dayTitleFormat || 'dddd, D MMMM';
                    formattedDate = moment(dObj).format(fmt);
                }
                const timeStr = String(ev.time || '');
                const isMidnightRange = /^0{2}:0{2}\s*-\s*0{2}:0{2}$/.test(timeStr);
                note.textContent = formattedDate + (!isMidnightRange && timeStr ? ' ' + timeStr : '');
                note.addClass('dayble-suggestion-note');

                row.onclick = () => { void this.choose(i); };
                row.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); void this.choose(i); };
            });
            ensureSelectedVisible();
        };
        const update = () => {
            const q = (input.value || '').toLowerCase();
            this.query = q;
            let allEvents: DaybleEvent[] = this.view.events.slice();
            if (q.length > 0 && this.cacheLoaded) {
                allEvents = allEvents.concat(this.allEventsCache);
            }

            const seen = new Set();
            const uniqueEvents = [];
            for (const ev of allEvents) {
                if (!seen.has(ev.id)) {
                    seen.add(ev.id);
                    uniqueEvents.push(ev);
                }
            }

            this.results = uniqueEvents.filter(e => ((e.title || '') + ' ' + (e.description || '')).toLowerCase().includes(q)).slice(0, 50);
            this.selectedIndex = 0;
            render();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { this.selectedIndex = Math.min(this.results.length - 1, this.selectedIndex + 1); render(); ensureSelectedVisible(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { this.selectedIndex = Math.max(0, this.selectedIndex - 1); render(); ensureSelectedVisible(); e.preventDefault(); }
            else if (e.key === 'Enter') { void this.choose(this.selectedIndex); e.preventDefault(); }
            else if (e.key === 'Escape') { this.close(); e.preventDefault(); }
        };
        input.oninput = () => {
            if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
            this.debounceTimer = window.setTimeout(() => { update(); }, 150);
        };
        input.onkeydown = onKey;
        input.focus();
        update();
        const currentFile = this.view.getMonthDataFilePath();
        const folder = this.view.plugin.settings.entriesFolder || 'DaybleCalendar';
        void this.loadAllEventsCache(currentFile, folder).then(() => {
            if (this.query.length > 0) { update(); }
        });
    }

    async loadAllEventsCache(currentFile: string, folder: string) {
        try {
            let listing;
            try {
                const targetFolder = this.view.plugin.settings.entriesFolder?.trim() || '';
                listing = await this.app.vault.adapter.list(targetFolder);
            } catch {
                listing = { files: [] };
            }
            const files = (listing.files || []).filter((f: string) => f.toLowerCase().endsWith('.json'));
            const others = files.filter((f: string) => f !== currentFile && !f.endsWith(currentFile.split('/').pop()));
            const collected: DaybleEvent[] = [];
            for (const f of others) {
                try {
                    const txt = await this.app.vault.adapter.read(f);
                    const data = JSON.parse(txt);
                    if (Array.isArray(data)) {
                        collected.push(...data);
                    } else if (data && Array.isArray(data.events)) {
                        collected.push(...data.events);
                    }
                } catch { /* intentional */ }
            }
            const seen = new Set();
            const dedup: DaybleEvent[] = [];
            for (const ev of collected) {
                if (!seen.has(ev.id)) {
                    seen.add(ev.id);
                    dedup.push(ev);
                }
            }
            this.allEventsCache = dedup;
            this.cacheLoaded = true;
        } catch { /* intentional */ }
    }

    async choose(idx: number) {
        const ev = this.results[idx];
        if (!ev) return;
        const dateStr = ev.date || ev.startDate;
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            this.view.currentDate = new Date(y, (m || 1) - 1, d || 1);
            await this.view.loadAllEntries();
            this.view.render();
            setTimeout(() => {
                const nodes = Array.from(this.view.containerEl.querySelectorAll(`.dayble-event[data-id="${ev.id}"]`));
                nodes.forEach(n => (n as HTMLElement).classList.add('dayble-event-highlight'));
                this.view.scrollEventIntoView(ev.id);
                setTimeout(() => { nodes.forEach(n => (n as HTMLElement).classList.remove('dayble-event-highlight')); }, 2000);
            }, 0);
        }
        this.close();
    }
}
