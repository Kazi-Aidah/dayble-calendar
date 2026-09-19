import { App, Modal, Setting, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS } from '../types';
import { addTouchDragListeners } from '../utils';
import type DaybleCalendarPlugin from '../plugin';
import ConfirmModal from './ConfirmModal';

export default class ColorSwatchesModal extends Modal {
    plugin: DaybleCalendarPlugin;

    constructor(app: App, plugin: DaybleCalendarPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        this.modalEl.addClass('dayble-modal');
        this.modalEl.addClass('dayble-color-swatches-modal');
        this.modalEl.style.maxWidth = '700px';

        // Heading
        const header = contentEl.createDiv();
        const title = header.createEl('h2', { text: 'Color Swatches' });
        title.style.margin = '0 0 4px 0';
        const desc = header.createEl('p', { text: 'Add, edit and preview your color swatches.' });
        desc.style.margin = '0 0 16px 0';
        desc.style.opacity = '0.7';
        desc.style.fontSize = '14px';

        // Colors container
        const colorsList = contentEl.createDiv();
        const renderColors = () => {
            colorsList.empty();
            const row = colorsList.createDiv();
            row.addClass('dayble-settings-colors-row');
            row.setAttr('style', 'margin-top: -10px !important; margin-bottom: 0px; display: flex; flex-wrap: wrap;');

            const built = (this.plugin.settings.swatches || []).map((s: { name: string, color: string, textColor?: string }) => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' as const }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }) => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' as const }));
            const combined: { name: string, color: string, textColor: string, source: 'built' | 'custom' }[] = [...built, ...customs];

            const makeItem = (entry: { name: string, color: string, textColor: string, source: 'built' | 'custom' }, idx: number) => {
                const wrap = row.createDiv();
                wrap.addClass('dayble-color-group');
                wrap.setAttr('data-qc-index', String(idx));
                wrap.setAttr('style', 'display: inline-flex; align-items: center; gap: 8px; margin: 4px !important; border: 1px solid var(--background-modifier-border); border-radius: var(--setting-items-radius); background-color: var(--setting-items-background); padding: 6px; flex: 0 0 auto; transition: transform 0.2s ease, box-shadow 0.2s ease;');

                wrap.setAttr('draggable', 'false');
                wrap.dataset.source = entry.source;
                wrap.dataset.index = String(idx);
                wrap.dataset.name = entry.name;

                // Drag Handle
                const dragBtn = wrap.createEl('button', {
                    attr: {
                        'aria-label': 'Drag to reorder',
                        'style': 'padding: 0px; border: none; background: transparent; box-shadow: none; cursor: grab; color: var(--text-muted); flex-shrink: 0; display: flex; align-items: center; justify-content: center;'
                    }
                });
                setIcon(dragBtn, 'menu');

                // Text Color Picker
                const textPicker = wrap.createEl('input', {
                    type: 'color',
                    attr: {
                        'title': 'Text color',
                        'style': 'width: 30px; height: 30px; border-radius: 50%; border: none; padding: 0px; overflow: hidden; background: transparent; cursor: pointer;'
                    }
                });
                textPicker.value = entry.textColor || '#ffffff';

                // Background Color Picker
                const bgPicker = wrap.createEl('input', {
                    type: 'color',
                    attr: {
                        'title': 'Highlight color',
                        'style': 'width: 30px; height: 30px; border-radius: 50%; border: none; padding: 0px; overflow: hidden; background: transparent; cursor: pointer;'
                    }
                });
                bgPicker.value = entry.color;

                // Name input
                const nameInput = wrap.createEl('input', {
                    type: 'text',
                    cls: 'db-input',
                    attr: {
                        'placeholder': 'Name',
                        'style': 'width: 80px; height: 30px; margin-left: 4px;'
                    }
                });
                nameInput.value = entry.name;
                nameInput.onchange = () => updateAll();

                const updateAll = async () => {
                    const newBuilt: { name: string, color: string, textColor?: string }[] = [];
                    const newCustom: { name: string, color: string, textColor?: string }[] = [];
                    row.querySelectorAll('.dayble-color-group').forEach((w) => {
                        const el = w as HTMLElement;
                        const src = el.dataset.source;
                        const bg = (el.querySelectorAll('input[type="color"]')[1] as HTMLInputElement).value;
                        const tx = (el.querySelectorAll('input[type="color"]')[0] as HTMLInputElement).value;
                        const nInput = el.querySelector<HTMLInputElement>('input[type="text"]');
                        const finalName = nInput?.value || '';
                        if (src === 'built') {
                            newBuilt.push({ name: finalName, color: bg, textColor: tx });
                        } else {
                            newCustom.push({ name: finalName, color: bg, textColor: tx });
                        }
                    });
                    this.plugin.settings.swatches = newBuilt;
                    this.plugin.settings.userCustomSwatches = newCustom;
                    await this.plugin.saveSettings();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                    // Update all color dropdowns on the page
                    document.querySelectorAll('.dayble-trigger-color-select, .dayble-default-color-select, .dayble-complete-color-select').forEach(t => {
                        const select = t as HTMLSelectElement;
                        const current = select.value;
                        const isDefaultColorSelect = select.classList.contains('dayble-default-color-select');
                        select.empty();
                        select.add(new Option(isDefaultColorSelect ? 'No default color' : 'Default color', ''));
                        [...newBuilt, ...newCustom].forEach((s) => {
                            const name = s.name;
                            const opt = new Option(name, name);
                            opt.setCssProps({
                                'background-color': s.color,
                                'color': s.textColor || chooseTextColor(s.color)
                            });
                            select.add(opt);
                        });
                        select.value = current;
                        const selectedSwatch = [...newBuilt, ...newCustom].find((s) => s.name === select.value);
                        if (selectedSwatch) {
                            select.setCssProps({
                                'background-color': selectedSwatch.color,
                                'color': selectedSwatch.textColor || chooseTextColor(selectedSwatch.color)
                            });
                        } else {
                            select.setCssProps({ 'background-color': '', 'color': '' });
                        }
                    });
                };

                textPicker.oninput = async () => { await updateAll(); };
                bgPicker.oninput = async () => { await updateAll(); };
                nameInput.oninput = async () => { await updateAll(); };

                // Delete button
                const delWrap = wrap.createDiv({
                    cls: 'clickable-icon',
                    attr: { 'aria-label': 'Delete color swatch' }
                });
                setIcon(delWrap, 'x');
                delWrap.setCssProps({ 'flex-shrink': '0' });

                delWrap.onclick = async () => {
                    wrap.remove();
                    await updateAll();
                };

                // Drag-to-reorder
                const startColorDrag = (startX: number, startY: number) => {
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(50);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;

                    const originalInputs = wrap.querySelectorAll('input');
                    const clonedInputs = clone.querySelectorAll('input');
                    originalInputs.forEach((el, i) => {
                        if (clonedInputs[i]) clonedInputs[i].value = el.value;
                    });

                    ghost.appendChild(clone);
                    ghost.setCssProps({
                        'width': `${rect.width}px`,
                        'height': `${rect.height}px`,
                        'left': `${rect.left}px`,
                        'top': `${rect.top}px`,
                        'position': 'fixed',
                        'z-index': '9999',
                        'pointer-events': 'none',
                        'opacity': '0.8',
                        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.2)',
                        'border-radius': '4px'
                    });

                    wrap.classList.add('drag-ghost-hidden');
                    ghost.addClass('dayble-drag-ghost');

                    const moveGhost = (currentX: number, currentY: number) => {
                        ghost.setCssProps({
                            'left': `${currentX - offsetX}px`,
                            'top': `${currentY - offsetY}px`
                        });

                        const target = document.elementFromPoint(currentX, currentY);
                        const targetRow = target ? target.closest('.dayble-color-group') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === row) {
                            const targetRect = targetRow.getBoundingClientRect();
                            const next = (currentX - targetRect.left) > (targetRect.width * 0.2);
                            if (next) {
                                if (targetRow.nextSibling !== wrap) targetRow.parentNode?.insertBefore(wrap, targetRow.nextSibling);
                            } else {
                                if (targetRow !== wrap) targetRow.parentNode?.insertBefore(wrap, targetRow);
                            }
                        }
                    };

                    const endDrag = async () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        ghost.remove();
                        wrap.classList.remove('drag-ghost-hidden');
                        await updateAll();
                    };

                    const onMouseMove = (moveEvent: MouseEvent) => { moveEvent.preventDefault(); moveGhost(moveEvent.clientX, moveEvent.clientY); };
                    const onMouseUp = () => { void endDrag(); };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);

                    return { moveGhost, endDrag };
                };

                let colorDragState: ReturnType<typeof startColorDrag> | null = null;

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    colorDragState = startColorDrag(e.clientX, e.clientY);
                });

                if (!this.plugin.settings.disableTouchSupport) {
                    addTouchDragListeners(
                        dragBtn,
                        (cx, cy, e) => { e.preventDefault(); e.stopPropagation(); colorDragState = startColorDrag(cx, cy); },
                        (cx, cy, e) => { e.preventDefault(); colorDragState?.moveGhost(cx, cy); },
                        (e) => { e.preventDefault(); void colorDragState?.endDrag(); colorDragState = null; }
                    );
                }
            };

            combined.forEach((entry, idx) => { makeItem(entry, idx); });

            // Control buttons
            const controlsBottom = new Setting(colorsList);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.addClass('dayble-transparent-setting');
            controlsBottom.addButton(b => {
                b.setButtonText('Reset colors').onClick(() => {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', async () => {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        await this.plugin.saveSettings();
                        renderColors();
                        const pluginManager = (this.plugin.app as App & { plugins: { disablePlugin: (id: string) => Promise<void>; enablePlugin: (id: string) => Promise<void>; } }).plugins;
                        if (pluginManager) {
                            await pluginManager.disablePlugin(this.plugin.manifest.id);
                            await pluginManager.enablePlugin(this.plugin.manifest.id);
                        }
                    }, { danger: true });
                    void modal.open();
                });
            });
            controlsBottom.addButton(b => {
                b.setButtonText('+ add color').onClick(async () => {
                    (b.buttonEl).addClass('mod-cta');
                    if (!this.plugin.settings.userCustomSwatches) this.plugin.settings.userCustomSwatches = [];
                    const nextIndex = this.plugin.settings.userCustomSwatches.length + 1;
                    this.plugin.settings.userCustomSwatches.push({
                        name: `custom-${nextIndex}`,
                        color: '#ff0000',
                        textColor: '#ffffff'
                    });
                    await this.plugin.saveSettings();
                    renderColors();
                });
                (b.buttonEl).addClass('mod-cta');
            });
        };

        renderColors();
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

function chooseTextColor(hexColor: string): string {
    if (!hexColor) return '#ffffff';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}
