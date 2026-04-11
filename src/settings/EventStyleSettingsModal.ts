import { App, Modal, Menu, setIcon, setTooltip } from 'obsidian';
import type { EventCategory, EventState } from '../types';
import { chooseTextColor, randomId } from '../utils';
import IconPickerModal from '../modals/IconPickerModal';
import ConfirmModal from '../modals/ConfirmModal';

export default class EventStyleSettingsModal extends Modal {
    plugin: unknown;
    category: EventCategory;
    onSave: () => void;
    tempTriggers: unknown[];
    tempStates: EventState[];
    isDeleted = false;
    isSaved = false;

    constructor(app: App, plugin: unknown, category: EventCategory, onSave: () => void) {
        super(app);
        this.plugin = plugin;
        this.category = { ...category }; // Work on a copy
        this.onSave = onSave;

        // Filter triggers and states for this category
        this.tempTriggers = (this.plugin.settings.triggers || [])
            .filter((t: unknown) => t.categoryId === category.id)
            .map((t: unknown) => ({ ...t }));

        this.tempStates = (this.plugin.settings.eventStates || [])
            .filter((s: EventState) => s.categoryId === category.id)
            .map((s: EventState) => ({ ...s }));
    }

    async save() {
        if (this.isDeleted || this.isSaved) return;
        this.isSaved = true;

        // Update the category
        const idx = this.plugin.settings.eventCategories.findIndex((c: EventCategory) => c.id === this.category.id);
        if (idx !== -1) {
            this.plugin.settings.eventCategories[idx] = this.category;
        }

        // Update triggers
        // 1. Remove old triggers for this category
        this.plugin.settings.triggers = (this.plugin.settings.triggers || []).filter((t: unknown) => t.categoryId !== this.category.id);
        // 2. Add new/updated triggers
        this.plugin.settings.triggers.push(...this.tempTriggers);

        // Ensure triggers follow global category order
        this.plugin.reorderTriggersGlobally();

        // Update states
        // 1. Remove old states for this category
        this.plugin.settings.eventStates = (this.plugin.settings.eventStates || []).filter((s: EventState) => s.categoryId !== this.category.id);
        // 2. Add new/updated states
        this.plugin.settings.eventStates.push(...this.tempStates);

        await this.plugin.saveSettings();
        this.onSave();

        // Refresh calendar view to apply new styles
        const view = this.plugin.getCalendarView();
        if (view) {
            await view.render();
        }
    }

    onClose() {
        void this.save();
        this.contentEl.empty();
    }

    addContextMenu(inputEl: HTMLInputElement, list: unknown[], index: number, renderFn: () => void) {
        inputEl.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            const menu = new Menu();

            menu.addItem((item) => {
                item.setTitle('Duplicate')
                    .setIcon('copy')
                    .onClick(() => {
                        const newItem = { ...list[index], id: randomId() };
                        list.splice(index + 1, 0, newItem);
                        renderFn();
                    });
            });

            if (index > 0) {
                menu.addItem((item) => {
                    item.setTitle('Move up')
                        .setIcon('arrow-up')
                        .onClick(() => {
                            const item = list[index];
                            list.splice(index, 1);
                            list.splice(index - 1, 0, item);
                            renderFn();
                        });
                });
            }

            if (index < list.length - 1) {
                menu.addItem((item) => {
                    item.setTitle('Move down')
                        .setIcon('arrow-down')
                        .onClick(() => {
                            const item = list[index];
                            list.splice(index, 1);
                            list.splice(index + 1, 0, item);
                            renderFn();
                        });
                });
            }

            menu.showAtMouseEvent(e);
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.addClass('dayble-style-settings-modal');
        this.modalEl.setCssStyles({
            maxWidth: '500px',
            width: '100%',
            padding: '20px'
        });

        contentEl.createEl('h2', { text: 'Event style settings', cls: 'dayble-centered-heading' });

        // Preview Box
        const previewContainer = contentEl.createDiv({ cls: 'dayble-event-preview-container' });
        previewContainer.setCssStyles({
            margin: '10px 0',
            padding: '10px',
            borderRadius: 'var(--setting-items-radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--background-primary-alt)',
            flexShrink: '0'
        });

        const eventBox = previewContainer.createDiv({ cls: 'dayble-event-item' });
        eventBox.setCssStyles({
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: '0'
        });

        const eventIcon = eventBox.createDiv({ cls: 'dayble-event-icon' });
        const eventTextContainer = eventBox.createDiv({ cls: 'dayble-event-text-container' });
        eventTextContainer.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1',
            minWidth: '0'
        });
        const eventTitle = eventTextContainer.createDiv({ text: this.category.name || 'todo', cls: 'dayble-event-title' });
        const eventDesc = eventTextContainer.createDiv({ text: 'description', cls: 'dayble-event-desc' });

        const updatePreview = () => {
            const settings = this.plugin.settings;
            eventTitle.setText(this.category.name || 'todo');

            // Always stay as "description"
            eventDesc.setText('Description');

            const opacity = settings.eventBgOpacity ?? 1;
            const borderOpacity = settings.eventBorderOpacity ?? 1;
            const borderWidth = settings.eventBorderWidth ?? 2;
            const borderRadius = settings.eventBorderRadius ?? 6;
            const titleAlign = settings.eventTitleAlign ?? 'center';
            const descAlign = settings.eventDescAlign ?? 'center';
            const verticalPadding = settings.eventVerticalPadding ?? 2;

            let finalDescAlign = descAlign;
            if (titleAlign === 'center-left' && descAlign === 'center-left') {
                finalDescAlign = titleAlign;
            }

            // Apply style colors - strictly using this.category (no triggers)
            let bgColor = this.category.bgColor;
            let textColor = this.category.textColor;

            if (bgColor.startsWith('var')) {
                eventBox.setCssProps({ 'background-color': `rgba(from ${bgColor} r g b / ${opacity})` });
                if (textColor.startsWith('var')) {
                    eventBox.setCssProps({ 'border': `${borderWidth}px solid rgba(from ${textColor} r g b / ${borderOpacity})` });
                } else {
                    eventBox.setCssProps({ 'border': `${borderWidth}px solid ${textColor}` });
                    if (textColor.startsWith('#')) {
                        const r = parseInt(textColor.slice(1, 3), 16);
                        const g = parseInt(textColor.slice(3, 5), 16);
                        const b = parseInt(textColor.slice(5, 7), 16);
                        eventBox.setCssProps({ 'border-color': `rgba(${r}, ${g}, ${b}, ${borderOpacity})` });
                    }
                }
            } else {
                eventBox.setCssProps({ 'background-color': bgColor });
                eventBox.setCssProps({ 'opacity': String(opacity) });
                if (textColor.startsWith('#')) {
                    const r = parseInt(textColor.slice(1, 3), 16);
                    const g = parseInt(textColor.slice(3, 5), 16);
                    const b = parseInt(textColor.slice(5, 7), 16);
                    eventBox.setCssProps({ 'border': `${borderWidth}px solid rgba(${r}, ${g}, ${b}, ${borderOpacity})` });
                } else {
                    eventBox.setCssProps({ 'border': `${borderWidth}px solid ${textColor}` });
                }
            }
            eventBox.setCssStyles({
                color: textColor,
                borderRadius: `${borderRadius}px`,
                paddingTop: `${verticalPadding}px`,
                paddingBottom: `${verticalPadding}px`
            });

            // Effects & Animations
            // Remove old classes
            Array.from(eventBox.classList).forEach(cls => {
                if (cls.startsWith('dayble-effect-') || cls.startsWith('dayble-anim-') || cls === 'dayble-event-colored') {
                    eventBox.classList.remove(cls);
                }
            });

            // Add dayble-event-colored if we have a background color
            if (bgColor) {
                eventBox.addClass('dayble-event-colored');
            }

            // Add new classes
            if (this.category.effect) eventBox.addClass(`dayble-effect-${this.category.effect}`);
            if (this.category.animation) eventBox.addClass(`dayble-anim-${this.category.animation}`);
            if (this.category.animation2) eventBox.addClass(`dayble-anim-${this.category.animation2}`);

            // Align title and desc
            eventTitle.setCssStyles({
                fontSize: '0.85em',
                fontWeight: '600'
            });
            eventTitle.setCssProps({
                'text-align': `${titleAlign === 'center-left' ? 'left' : titleAlign} !important`,
                'width': '100% !important'
            });

            eventDesc.setCssStyles({
                fontSize: '0.75em',
                opacity: '0.8'
            });
            eventDesc.setCssProps({
                'text-align': `${finalDescAlign === 'center-left' ? 'left' : finalDescAlign} !important`,
                'width': '100% !important'
            });

            // Handle overall flex alignment based on title alignment
            if (titleAlign === 'center' || titleAlign === 'center-left') {
                eventBox.setCssStyles({ justifyContent: 'center' });
            } else if (titleAlign === 'right') {
                eventBox.setCssStyles({ justifyContent: 'flex-end' });
            } else {
                eventBox.setCssStyles({ justifyContent: 'flex-start' });
            }

            // Icon placement
            const placement = settings.iconPlacement ?? 'left';
            const showIcon = placement !== 'none';
            const iconToUse = this.category.icon || 'clock';

            eventIcon.setCssStyles({ display: showIcon ? 'block' : 'none' });
            if (showIcon) {
                setIcon(eventIcon, iconToUse);
            }

            // Reset placement classes
            Array.from(eventBox.classList).forEach(cls => {
                if (cls.startsWith('dayble-icon-placement-')) {
                    eventBox.classList.remove(cls);
                }
            });

            // Re-stack icon based on placement
            if (placement === 'right') {
                eventBox.addClass('dayble-icon-placement-right');
                eventBox.setCssStyles({ flexDirection: 'row', alignItems: 'center' });
                eventBox.appendChild(eventIcon);
            } else if (placement === 'left') {
                eventBox.addClass('dayble-icon-placement-left');
                eventBox.setCssStyles({ flexDirection: 'row', alignItems: 'center' });
                eventBox.prepend(eventIcon);
            } else if (placement.startsWith('top') || placement.startsWith('bottom')) {
                eventBox.setCssStyles({ flexDirection: 'column' });
                if (placement.startsWith('top')) {
                    eventBox.addClass('dayble-icon-placement-top');
                    eventBox.prepend(eventIcon);
                } else {
                    eventBox.addClass('dayble-icon-placement-bottom');
                    eventBox.appendChild(eventIcon);
                }

                if (placement.endsWith('-left')) {
                    eventBox.setCssStyles({ alignItems: 'flex-start' });
                } else if (placement.endsWith('-right')) {
                    eventBox.setCssStyles({ alignItems: 'flex-end' });
                } else {
                    eventBox.setCssStyles({ alignItems: 'center' });
                }

                if (titleAlign === 'center' || titleAlign === 'center-left') {
                    eventTextContainer.setCssStyles({ alignItems: 'center' });
                } else if (titleAlign === 'right') {
                    eventTextContainer.setCssStyles({ alignItems: 'flex-end' });
                } else {
                    eventTextContainer.setCssStyles({ alignItems: 'flex-start' });
                }
            } else {
                eventBox.setCssStyles({ flexDirection: 'row', alignItems: 'center' });
                eventBox.prepend(eventIcon);
            }

            if (!placement.startsWith('top')) {
                eventTextContainer.setCssStyles({ alignItems: 'stretch' });
            }
        };
        updatePreview();

        // Sections Container
        const sectionsEl = contentEl.createDiv({ cls: 'dayble-style-sections' });

        // 1. Event Styling Section
        this.createAccordion(sectionsEl, 'Event Styling', (body) => {
            const row1 = body.createDiv({ cls: 'dayble-modal-row' });
            row1.setCssStyles({ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' });

            // Icon Picker
            const iconBtn = row1.createDiv({ cls: 'clickable-icon' });
            setTooltip(iconBtn, 'Change icon');
            setIcon(iconBtn, this.category.icon || 'plus');
            iconBtn.onclick = () => {
                new IconPickerModal(this.app, (icon) => {
                    this.category.icon = icon;
                    setIcon(iconBtn, icon);
                    updatePreview();
                }, () => {
                    this.category.icon = undefined;
                    setIcon(iconBtn, 'plus');
                    updatePreview();
                }).open();
            };

            // Name Input
            const nameInput = row1.createEl('input', { type: 'text', cls: 'db-input', value: this.category.name });
            nameInput.setCssStyles({ flex: '1', minWidth: '0' });
            nameInput.oninput = () => {
                this.category.name = nameInput.value;
                updatePreview();
            };

            // Color Dropdown
            const swatches = [
                ...(this.plugin.settings.swatches || []),
                ...(this.plugin.settings.userCustomSwatches || []).map((s: unknown, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];
            const colorSelect = row1.createEl('select', { cls: 'db-select' });
            colorSelect.setCssStyles({ flex: '1' });
            colorSelect.add(new Option('No color', ''));
            swatches.forEach((s: unknown) => {
                const opt = new Option(s.name, s.name);
                opt.setCssProps({
                    'background-color': s.color,
                    'color': s.textColor || chooseTextColor(s.color)
                });
                colorSelect.add(opt);
            });
            colorSelect.value = this.category.colorName || '';
            const updateColorSelectStyle = () => {
                const s = swatches.find((sw: unknown) => sw.name === colorSelect.value);
                if (s) {
                    colorSelect.setCssStyles({ backgroundColor: s.color, color: s.textColor || chooseTextColor(s.color) });
                } else {
                    colorSelect.setCssProps({ 'background-color': '', 'color': '' });
                }
            };
            updateColorSelectStyle();
            colorSelect.onchange = () => {
                this.category.colorName = colorSelect.value || undefined;
                const s = swatches.find((sw: unknown) => sw.name === colorSelect.value);
                if (s) {
                    this.category.bgColor = s.color;
                    this.category.textColor = s.textColor || chooseTextColor(s.color);
                }
                updateColorSelectStyle();
                updatePreview();
            };

            // Color options styling
            Array.from(colorSelect.options).forEach(opt => {
                if (!opt.value) {
                    opt.setCssProps({
                        'background-color': 'var(--background-primary)',
                        'color': 'var(--text-normal)'
                    });
                    return;
                }
                const swatch = swatches.find((sw: unknown) => sw.name === opt.value);
                if (swatch) {
                    opt.setCssProps({
                        'background-color': swatch.color,
                        'color': swatch.textColor || chooseTextColor(swatch.color)
                    });
                }
            });

            // Effects & Animations Row
            const row2 = body.createDiv({ cls: 'dayble-modal-row' });
            row2.setCssStyles({ display: 'flex', gap: '8px' });

            const effects: Record<string, string> = {
                '': 'No effect',
                'striped-1': 'Striped (45°)',
                'striped-2': 'Striped (-45°)',
                'vertical-stripes': 'Vertical stripes',
                'thin-textured-stripes': 'Thin textured stripes',
                'crosshatched': 'Crosshatched',
                'checkerboard': 'Checkerboard',
                'hexaboard': 'Hexaboard',
                'wavy-lines': 'Wavy lines',
                'dotted': 'Dotted',
                'argyle': 'Argyle',
                'embossed': 'Embossed',
                'glass': 'Glass',
                'glow': 'Glow',
                'retro-button': 'Outset'
            };
            const effectSelect = row2.createEl('select', { cls: 'db-select' });
            effectSelect.setCssStyles({ flex: '1', minWidth: '0', width: 'auto' });
            Object.entries(effects).forEach(([k, v]) => effectSelect.add(new Option(v, k)));
            effectSelect.value = this.category.effect || '';
            effectSelect.onchange = () => {
                this.category.effect = effectSelect.value;
                updatePreview();
            };

            const animations: Record<string, string> = {
                '': 'No animation',
                'move-horizontally': 'Move horizontally',
                'move-vertically': 'Move vertically',
                'snow-falling': 'Snow Falling',
                'particles': 'Particles',
                'rain-falling': 'Raining',
                'stars': 'Stars',
                'sparkles': 'Sparkles',
                'glowing': 'Glowing',
                'glass-shine': 'Glass Shine',
                'animated-gradient': 'Gradient',
                'shine': 'Shine'
            };
            const anim1Select = row2.createEl('select', { cls: 'db-select' });
            anim1Select.setCssStyles({ flex: '1', minWidth: '0', width: 'auto' });
            Object.entries(animations).forEach(([k, v]) => anim1Select.add(new Option(v, k)));
            anim1Select.value = this.category.animation || '';
            anim1Select.onchange = () => {
                this.category.animation = anim1Select.value;
                updatePreview();
            };

            const anim2Select = row2.createEl('select', { cls: 'db-select' });
            anim2Select.setCssStyles({ flex: '1', minWidth: '0', width: 'auto' });
            Object.entries(animations).forEach(([k, v]) => anim2Select.add(new Option(v, k)));
            anim2Select.value = this.category.animation2 || '';
            anim2Select.onchange = () => {
                this.category.animation2 = anim2Select.value;
                updatePreview();
            };
        }, 'Set the default icon, colors, and animations for this style.');

        // 2. Triggers Section
        this.createAccordion(sectionsEl, 'Triggers', (body) => {
            const triggersList = body.createDiv();
            const renderTriggers = () => {
                triggersList.empty();
                this.tempTriggers.forEach((tr, idx) => {
                    const trRow = triggersList.createDiv({ cls: 'dayble-modal-row' });
                    trRow.setCssStyles({ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' });

                    // Clickable Trigger Icon
                    const stIconBtn = trRow.createDiv({ cls: 'clickable-icon' });
                    setTooltip(stIconBtn, 'Change icon');
                    setIcon(stIconBtn, tr.icon || 'plus');
                    stIconBtn.onclick = () => {
                        new IconPickerModal(this.app, (icon) => {
                            tr.icon = icon;
                            setIcon(stIconBtn, icon);
                            updatePreview();
                        }, () => {
                            tr.icon = undefined;
                            setIcon(stIconBtn, 'plus');
                            updatePreview();
                        }).open();
                    };

                    const trInput = trRow.createEl('input', { type: 'text', cls: 'db-input', value: tr.pattern, placeholder: 'work, pray, eat' });
                    trInput.setCssStyles({ flex: '1', width: 'auto', minWidth: '0' });
                    trInput.oninput = () => {
                        tr.pattern = trInput.value;
                        updatePreview();
                    };
                    this.addContextMenu(trInput, this.tempTriggers, idx, renderTriggers);

                    // Color Dropdown for Trigger
                    const swatches = [
                        ...(this.plugin.settings.swatches || []),
                        ...(this.plugin.settings.userCustomSwatches || []).map((s: unknown, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
                    ];
                    const trColorSelect = trRow.createEl('select', { cls: 'db-select' });
                    trColorSelect.add(new Option('Default', ''));
                    swatches.forEach((s: unknown) => {
                        const opt = new Option(s.name, s.name);
                        opt.setCssProps({
                            'background-color': s.color,
                            'color': s.textColor || chooseTextColor(s.color)
                        });
                        trColorSelect.add(opt);
                    });
                    trColorSelect.value = tr.colorName || '';
                    const updateTrColorStyle = () => {
                        const s = swatches.find((sw: unknown) => sw.name === trColorSelect.value);
                        if (s) {
                            trColorSelect.setCssStyles({ backgroundColor: s.color, color: s.textColor || chooseTextColor(s.color) });
                        } else {
                            trColorSelect.setCssProps({ 'background-color': '', 'color': '' });
                        }
                    };
                    updateTrColorStyle();
                    trColorSelect.onchange = () => {
                        tr.colorName = trColorSelect.value;
                        updateTrColorStyle();
                        updatePreview();
                    };

                    // Color options styling
                    Array.from(trColorSelect.options).forEach(opt => {
                        if (!opt.value) {
                            opt.setCssProps({
                                'background-color': 'var(--background-primary)',
                                'color': 'var(--text-normal)'
                            });
                            return;
                        }
                        const swatch = swatches.find((sw: unknown) => sw.name === opt.value);
                        if (swatch) {
                            opt.setCssProps({
                                'background-color': swatch.color,
                                'color': swatch.textColor || chooseTextColor(swatch.color)
                            });
                        }
                    });

                    const delBtn = trRow.createEl('button', { cls: 'clickable-icon' });
                    setIcon(delBtn, 'x');
                    delBtn.onclick = () => {
                        this.tempTriggers.splice(idx, 1);
                        renderTriggers();
                    };
                });
            };
            renderTriggers();

            const addTrBtn = body.createEl('button', { text: '+ add trigger', cls: 'mod-cta' });
            addTrBtn.setCssStyles({ marginTop: '8px', width: '100%' });
            addTrBtn.onclick = () => {
                this.tempTriggers.push({ id: randomId(), pattern: '', categoryId: this.category.id });
                renderTriggers();
            };
        }, 'Auto-applies style when event title or description contains these keywords.');

        // 3. States Section
        this.createAccordion(sectionsEl, 'States', (body) => {
            const statesList = body.createDiv();
            const renderStates = () => {
                statesList.empty();
                this.tempStates.forEach((st, idx) => {
                    const stRow = statesList.createDiv({ cls: 'dayble-modal-row' });
                    stRow.setCssStyles({ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' });

                    const stIconBtn = stRow.createDiv({ cls: 'clickable-icon' });
                    setTooltip(stIconBtn, 'Change icon');
                    setIcon(stIconBtn, st.icon || 'plus');
                    stIconBtn.onclick = () => {
                        new IconPickerModal(this.app, (icon) => {
                            st.icon = icon;
                            setIcon(stIconBtn, icon);
                        }, () => {
                            st.icon = 'plus';
                            setIcon(stIconBtn, 'plus');
                        }).open();
                    };

                    const stInput = stRow.createEl('input', { type: 'text', cls: 'db-input', value: st.name, placeholder: 'todo' });
                    stInput.setCssStyles({ flex: '1', width: 'auto', minWidth: '0' });
                    stInput.oninput = () => { st.name = stInput.value; };
                    this.addContextMenu(stInput, this.tempStates, idx, renderStates);

                    // Color Dropdown for State
                    const swatches = [
                        ...(this.plugin.settings.swatches || []),
                        ...(this.plugin.settings.userCustomSwatches || []).map((s: unknown, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
                    ];
                    const stColorSelect = stRow.createEl('select', { cls: 'db-select' });
                    stColorSelect.add(new Option('Default', ''));
                    swatches.forEach((s: unknown) => {
                        const opt = new Option(s.name, s.name);
                        opt.setCssProps({
                            'background-color': s.color,
                            'color': s.textColor || chooseTextColor(s.color)
                        });
                        stColorSelect.add(opt);
                    });
                    stColorSelect.value = st.colorName || '';
                    const updateStColorStyle = () => {
                        const s = swatches.find((sw: unknown) => sw.name === stColorSelect.value);
                        if (s) {
                            stColorSelect.setCssStyles({ backgroundColor: s.color, color: s.textColor || chooseTextColor(s.color) });
                        } else {
                            stColorSelect.setCssProps({ 'background-color': '', 'color': '' });
                        }
                    };
                    updateStColorStyle();
                    stColorSelect.onchange = () => {
                        st.colorName = stColorSelect.value;
                        updateStColorStyle();
                    };

                    // Color options styling
                    Array.from(stColorSelect.options).forEach(opt => {
                        if (!opt.value) {
                            opt.setCssProps({
                                'background-color': 'var(--background-primary)',
                                'color': 'var(--text-normal)'
                            });
                            return;
                        }
                        const swatch = swatches.find((sw: unknown) => sw.name === opt.value);
                        if (swatch) {
                            opt.setCssProps({
                                'background-color': swatch.color,
                                'color': swatch.textColor || chooseTextColor(swatch.color)
                            });
                        }
                    });

                    const delBtn = stRow.createEl('button', { cls: 'clickable-icon' });
                    setIcon(delBtn, 'x');
                    delBtn.onclick = () => {
                        this.tempStates.splice(idx, 1);
                        renderStates();
                    };
                });
            };
            renderStates();

            const addStBtn = body.createEl('button', { text: '+ add state', cls: 'mod-cta' });
            addStBtn.setCssStyles({ marginTop: '8px', width: '100%' });
            addStBtn.onclick = () => {
                this.tempStates.push({
                    id: randomId(),
                    name: '',
                    icon: 'check',
                    colorName: '',
                    effect: '',
                    animation: '',
                    animation2: '',
                    categoryId: this.category.id
                });
                renderStates();
            };
        }, 'Quickly apply any predefined style via right-click on an event.');

        // Footer Buttons
        const footer = contentEl.createDiv({ cls: 'dayble-modal-footer' });

        const deleteBtn = footer.createEl('button', { text: 'Delete style', cls: 'mod-warning' });
        deleteBtn.onclick = () => {
            new ConfirmModal(this.app, 'Are you sure you want to delete this style? All events using this style will be left unstyled.', async () => {
                this.isDeleted = true;
                this.plugin.settings.eventCategories = this.plugin.settings.eventCategories.filter((c: EventCategory) => c.id !== this.category.id);
                // We keep triggers and states but they'll have an orphan categoryId.
                this.plugin.reorderTriggersGlobally();
                await this.plugin.saveSettings();
                this.onSave();
                this.close();
            }).open();
        };

        const saveBtn = footer.createEl('button', { text: 'Save style', cls: 'mod-cta' });
        saveBtn.onclick = async () => {
            await this.save();
            this.close();
        };
    }

    createAccordion(container: HTMLElement, title: string, renderBody: (body: HTMLElement) => void, infoText?: string) {
        const wrap = container.createDiv({ cls: 'dayble-accordion' });
        wrap.setCssStyles({ marginBottom: '10px' });

        const header = wrap.createDiv({ cls: 'dayble-accordion-header' });
        header.setCssStyles({
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '5px 0',
            cursor: 'pointer',
            gap: '8px'
        });

        const arrow = header.createSpan({ cls: 'dayble-accordion-arrow' });
        setIcon(arrow, 'chevron-down');

        header.createSpan({ text: title, cls: 'dayble-accordion-title' }).setCssStyles({ fontWeight: 'bold' });

        if (infoText) {
            const spacer = header.createDiv();
            spacer.setCssStyles({ flexGrow: '1' });

            const infoIcon = header.createSpan({ cls: 'clickable-icon dayble-info-icon' });
            setIcon(infoIcon, 'info');

            let tooltipEl: HTMLElement | null = null;

            infoIcon.addEventListener('mouseenter', () => {
                tooltipEl = document.body.createDiv({ cls: 'dayble-custom-tooltip', text: infoText });
                const rect = infoIcon.getBoundingClientRect();

                // Position above the icon
                const tooltipRect = tooltipEl.getBoundingClientRect();
                const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                const top = rect.top - tooltipRect.height - 8;

                tooltipEl.setCssStyles({
                    left: `${left}px`,
                    top: `${top}px`
                });

                // Trigger transition
                setTimeout(() => tooltipEl?.addClass('is-active'), 10);
            });

            infoIcon.addEventListener('mouseleave', () => {
                if (tooltipEl) {
                    tooltipEl.remove();
                    tooltipEl = null;
                }
            });

            infoIcon.onclick = (e) => {
                e.stopPropagation(); // prevent accordion toggle
            };
        }

        const body = wrap.createDiv({ cls: 'dayble-accordion-body' });
        body.setCssStyles({ padding: '10px 0' });
        renderBody(body);

        let open = true;
        header.onclick = () => {
            open = !open;
            body.setCssProps({ 'display': open ? 'block' : 'none' });
            setIcon(arrow, open ? 'chevron-down' : 'chevron-right');
        };
    }
}
