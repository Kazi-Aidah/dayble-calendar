import { App, PluginSettingTab, Setting, Notice, setIcon, TFolder, Vault, DataAdapter, moment } from 'obsidian';
import type { DaybleSettings, EventCategory } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { chooseTextColor, randomId, addTouchDragListeners } from '../utils';
import { VIEW_TYPE } from '../constants';
import ChangelogModal from '../modals/ChangelogModal';
import ConfirmModal from '../modals/ConfirmModal';
import FolderSuggestModal from '../modals/FolderSuggestModal';
import IconPickerModal from '../modals/IconPickerModal';
import type DaybleCalendarPlugin from '../plugin';
import type EventStyleSettingsModal from './EventStyleSettingsModal';

type EventStyleSettingsModalCtor = typeof EventStyleSettingsModal;

export default class DaybleSettingTab extends PluginSettingTab {
    plugin: DaybleCalendarPlugin;
    EventStyleSettingsModal?: EventStyleSettingsModalCtor;

    constructor(app: App, plugin: DaybleCalendarPlugin, EventStyleSettingsModal?: EventStyleSettingsModalCtor) {
        super(app, plugin);
        this.plugin = plugin;
        this.EventStyleSettingsModal = EventStyleSettingsModal;
    }
    display(): void {
        const scrollPos = this.containerEl.scrollTop;
        const { containerEl } = this;
        containerEl.empty();

        ;
        // new Setting(containerEl).setName('').setHeading();
        ;

        new Setting(containerEl)
            .setName('Event styling shortcut')
            .setDesc('Quickly jump to styling settings.')
            .addButton(b => {
                b.setButtonText('Scroll to event styling').onClick(() => {
                    const el = containerEl.querySelector('.dayble-event-styles-heading');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                });
            });

        new Setting(containerEl)
            .setName('Latest release notes')
            .setDesc('View the most recent plugin release notes.')
            .addButton(b => {
                b.setButtonText('Open changelog')
                    .onClick(() => {
                        new ChangelogModal(this.app, this.plugin).open();
                    });
            });

        new Setting(containerEl)
            .setName('Storage folder')
            .setDesc('Folder to store calendar events. Data is stored in monthly JSON files.')
            .addButton(b => {
                b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'Unset')
                    .onClick(() => {
                        const folders = this.app.vault.getAllLoadedFiles()
                            .filter((f): f is TFolder => f instanceof TFolder)
                            .map(f => f.path)
                            .sort();
                        const suggest = new FolderSuggestModal(this.app, folders, async (folder) => {
                            await this.plugin.onStorageFolderChange(folder || '');
                            b.setButtonText(this.plugin.settings.entriesFolder?.trim() ? this.plugin.settings.entriesFolder : 'Unset');
                        });
                        suggest.setPlaceholder('Select storage folder...');
                        suggest.open();
                    });
            });

        new Setting(containerEl)
            .setName('Week start day')
            .setDesc('First day of the week')
            .addDropdown(d => {
                d.addOption('0', 'Sunday')
                    .addOption('1', 'Monday')
                    .addOption('2', 'Tuesday')
                    .addOption('3', 'Wednesday')
                    .addOption('4', 'Thursday')
                    .addOption('5', 'Friday')
                    .addOption('6', 'Saturday')
                    .setValue(String(this.plugin.settings.weekStartDay))
                    .onChange(async v => {
                        this.plugin.settings.weekStartDay = parseInt(v, 10);
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Time format')
            .setDesc('Display times in 24h or 12h format')
            .addDropdown(d => {
                d.addOption('system', 'System')
                    .addOption('24h', '24-hour')
                    .addOption('12h', '12-hour')
                    .setValue(this.plugin.settings.timeFormat ?? 'system')
                    .onChange(v => {
                        this.plugin.settings.timeFormat = v as "24h" | "12h" | "system" | undefined;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName('Enable 5 minute intervals')
            .setDesc('Use 5-minute intervals in the day and 3-day views instead of 15-minute intervals.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.enableFiveMinIntervals ?? true)
                    .onChange(async v => {
                        this.plugin.settings.enableFiveMinIntervals = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Replace new tab with calendar')
            .setDesc('Automatically open the dayble calendar instead of the default empty new tab.')
            .addToggle(t => {
                t.setValue(!!this.plugin.settings.replaceHomepageWithSidecards)
                    .onChange(async v => {
                        this.plugin.settings.replaceHomepageWithSidecards = v;
                        await this.plugin.saveSettings();
                    });
            });

        const dateFormatHeading = new Setting(containerEl).setName('Date formats').setHeading();
        dateFormatHeading.descEl.createSpan({ text: 'Customize how dates appear in different views. ' });
        dateFormatHeading.descEl.createEl('a', {
            text: 'Check here for more syntax.',
            href: 'https://momentjs.com/docs/#/displaying/format/'
        });

        // Build dynamic examples using the user's local time
        const now = moment();
        const startOfWeek = now.clone().startOf('week');
        const endOfWeek   = now.clone().endOf('week');

        new Setting(containerEl)
            .setName('Week title')
            .setDesc('Format for the week view title.')
            .addDropdown(d => {
                d.addOption('month_year', now.format('MMMM YYYY'))
                    .addOption('week_number', `Week ${now.week()}`)
                    .addOption('full_range', `${startOfWeek.format('MMMM D')} to ${endOfWeek.format('MMMM D')}`)
                    .addOption('short_range', `${startOfWeek.format('MMM D')} to ${endOfWeek.format('MMM D')}`)
                    .addOption('d_mmmm_rangeto', `${startOfWeek.format('D MMMM')} to ${endOfWeek.format('D MMMM')}`)
                    .addOption('d_mmm_rangeto', `${startOfWeek.format('D MMM')} to ${endOfWeek.format('D MMM')}`)
                    .addOption('full_range_hyphen', `${startOfWeek.format('MMMM D')} - ${endOfWeek.format('MMMM D')}`)
                    .addOption('short_range_hyphen', `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}`)
                    .addOption('d_mmmm_range', `${startOfWeek.format('D MMMM')} - ${endOfWeek.format('D MMMM')}`)
                    .addOption('d_mmm_range', `${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM')}`)
                    .setValue(this.plugin.settings.weekTitleFormat || 'month_year')
                    .onChange(async v => {
                        this.plugin.settings.weekTitleFormat = v as DaybleSettings['weekTitleFormat'];
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.weekTitleFormat = 'month_year';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const threeDayTitleSetting = new Setting(containerEl)
            .setName('3-day title')
            .setDesc('Format for the 3-day view title.');

        const update3DayTitleDesc = (val: string) => {
            threeDayTitleSetting.descEl.empty();
            threeDayTitleSetting.descEl.createSpan({ text: 'Your current format for 3-day view: ' });

            let label = '';
            const d = moment();
            const d2 = moment().add(2, 'days');
            if (val === 'month_year') label = d.format('MMMM YYYY');
            else if (val === 'full_range') label = `${d.format('MMMM D')} to ${d2.format('MMMM D')}`;
            else if (val === 'short_range') label = `${d.format('MMM D')} to ${d2.format('MMM D')}`;
            else if (val === 'd_mmmm_rangeto') label = `${d.format('D MMMM')} to ${d2.format('D MMMM')}`;
            else if (val === 'd_mmm_rangeto') label = `${d.format('D MMM')} to ${d2.format('D MMM')}`;
            else if (val === 'full_range_hyphen') label = `${d.format('MMMM D')} - ${d2.format('MMMM D')}`;
            else if (val === 'short_range_hyphen') label = `${d.format('MMM D')} - ${d2.format('MMM D')}`;
            else if (val === 'd_mmmm_range') label = `${d.format('D MMMM')} - ${d2.format('D MMMM')}`;
            else if (val === 'd_mmm_range') label = `${d.format('D MMM')} - ${d2.format('D MMM')}`;

            const span = threeDayTitleSetting.descEl.createSpan({ text: label });
            span.setCssStyles({ fontWeight: 'bold', color: 'var(--color-accent)' });
        };
        update3DayTitleDesc(this.plugin.settings.threeDayTitleFormat || 'full_range');

        threeDayTitleSetting.addDropdown(d => {
            const d1 = moment();
            const d2 = moment().add(2, 'days');
            d.addOption('month_year', d1.format('MMMM YYYY'))
             .addOption('full_range', `${d1.format('MMMM D')} to ${d2.format('MMMM D')}`)
             .addOption('short_range', `${d1.format('MMM D')} to ${d2.format('MMM D')}`)
             .addOption('d_mmmm_rangeto', `${d1.format('D MMMM')} to ${d2.format('D MMMM')}`)
             .addOption('d_mmm_rangeto', `${d1.format('D MMM')} to ${d2.format('D MMM')}`)
             .addOption('full_range_hyphen', `${d1.format('MMMM D')} - ${d2.format('MMMM D')}`)
             .addOption('short_range_hyphen', `${d1.format('MMM D')} - ${d2.format('MMM D')}`)
             .addOption('d_mmmm_range', `${d1.format('D MMMM')} - ${d2.format('D MMMM')}`)
             .addOption('d_mmm_range', `${d1.format('D MMM')} - ${d2.format('D MMM')}`)
             .setValue(this.plugin.settings.threeDayTitleFormat || 'full_range')
             .onChange(async v => {
                 this.plugin.settings.threeDayTitleFormat = v as DaybleSettings['threeDayTitleFormat'];
                 await this.plugin.saveSettings();
                 update3DayTitleDesc(v);
                 const view = this.plugin.getCalendarView();
                 await view?.render();
             });
        })
        .addExtraButton(b => {
            b.setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.threeDayTitleFormat = 'full_range';
                    await this.plugin.saveSettings();
                    this.display();
                    const view = this.plugin.getCalendarView();
                    await view?.render();
                });
        });

        const threeDayDateSetting = new Setting(containerEl)
            .setName('3-day dates');

        const update3DayDateDesc = (val: string) => {
            threeDayDateSetting.descEl.empty();
            threeDayDateSetting.descEl.createSpan({ text: 'Your current format for 3-day dates: ' });
            const span = threeDayDateSetting.descEl.createSpan({ text: moment().format(val || 'ddd D') });
            span.setCssStyles({ fontWeight: 'bold', color: 'var(--color-accent)' });
        };
        update3DayDateDesc(this.plugin.settings.threeDayDateFormat || 'ddd D');

        threeDayDateSetting.addText(t => {
                t.setValue(this.plugin.settings.threeDayDateFormat || 'ddd D')
                    .setPlaceholder('Enter date format')
                    .onChange(async v => {
                        this.plugin.settings.threeDayDateFormat = v;
                        await this.plugin.saveSettings();
                        update3DayDateDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.threeDayDateFormat = 'ddd D';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const dayTitleSetting = new Setting(containerEl)
            .setName('Day title');

        const updateDayTitleDesc = (val: string) => {
            dayTitleSetting.descEl.empty();
            dayTitleSetting.descEl.createSpan({ text: 'Your current format for Day View: ' });
            const span = dayTitleSetting.descEl.createSpan({ text: moment().format(val || 'dddd, D MMMM') });
            span.setCssStyles({ fontWeight: 'bold', color: 'var(--color-accent)' });
        };
        updateDayTitleDesc(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM');

        dayTitleSetting.addText(t => {
                t.setValue(this.plugin.settings.dayTitleFormat || 'dddd, D MMMM')
                    .setPlaceholder('Dddd, d mmmm')
                    .onChange(async v => {
                        this.plugin.settings.dayTitleFormat = v;
                        await this.plugin.saveSettings();
                        updateDayTitleDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.dayTitleFormat = 'dddd, D MMMM';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const agendaTitleSetting = new Setting(containerEl)
            .setName('Agenda title');

        const updateAgendaTitleDesc = (val: string) => {
            agendaTitleSetting.descEl.empty();
            agendaTitleSetting.descEl.createSpan({ text: 'Your current format for Agenda View: ' });
            const span = agendaTitleSetting.descEl.createSpan({ text: moment().format(val || 'MMMM YYYY') });
            span.setCssStyles({ fontWeight: 'bold', color: 'var(--color-accent)' });
        };
        updateAgendaTitleDesc(this.plugin.settings.agendaTitleFormat || 'MMMM YYYY');

        agendaTitleSetting.addText(t => {
                t.setValue(this.plugin.settings.agendaTitleFormat || 'MMMM YYYY')
                    .setPlaceholder('Mmmm yyyy')
                    .onChange(async v => {
                        this.plugin.settings.agendaTitleFormat = v;
                        await this.plugin.saveSettings();
                        updateAgendaTitleDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.agendaTitleFormat = 'MMMM YYYY';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        const agendaDateSetting = new Setting(containerEl)
            .setName('Agenda dates');

        const updateAgendaDateDesc = (val: string) => {
            agendaDateSetting.descEl.empty();
            agendaDateSetting.descEl.createSpan({ text: 'Your current format for Agenda Date: ' });
            const span = agendaDateSetting.descEl.createSpan({ text: moment().format(val || 'dddd, D MMMM') });
            span.setCssStyles({ fontWeight: 'bold', color: 'var(--color-accent)' });
        };
        updateAgendaDateDesc(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM');

        agendaDateSetting.addText(t => {
                t.setValue(this.plugin.settings.agendaDateFormat || 'dddd, D MMMM')
                    .setPlaceholder('Dddd, d mmmm')
                    .onChange(async v => {
                        this.plugin.settings.agendaDateFormat = v;
                        await this.plugin.saveSettings();
                        updateAgendaDateDesc(v);
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            })
            .addExtraButton(b => {
                b.setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings.agendaDateFormat = 'dddd, D MMMM';
                        await this.plugin.saveSettings();
                        this.display();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        // new Setting(containerEl).setName('Day mode').setHeading();

        new Setting(containerEl).setName('Context menu').setHeading();

        new Setting(containerEl)
            .setName('Show copy text option')
            .setDesc('Show copy text in the event context menu to copy title and description')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showCopyTextOption ?? false)
                    .onChange(async v => {
                        this.plugin.settings.showCopyTextOption = v;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in month view')
            .setDesc('Shows only pinned events in month view. All events still appear in day & agenda views')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsMonth ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsMonth = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in week view')
            .setDesc('Shows only pinned events in week view. All events still appear in day & agenda views')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsWeek ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsWeek = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Only show pinned events in agenda view')
            .setDesc('Shows only pinned events in agenda view. All events still appear in day view')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyShowPinnedEventsAgenda ?? false)
                    .onChange(async v => {
                        this.plugin.settings.onlyShowPinnedEventsAgenda = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl).setName('Event appearance').setHeading();

        const previewContainer = containerEl.createDiv({ cls: 'dayble-event-preview-container' });
        previewContainer.setCssStyles({
            margin: '10px 0',
            padding: '10px',
            borderRadius: 'var(--setting-items-radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--background-primary-alt)'
        });

        const eventBox = previewContainer.createDiv({ cls: 'dayble-event-item' });
        eventBox.setCssStyles({
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: '0'
        });

        const eventIcon = eventBox.createDiv({ cls: 'dayble-event-icon' });
        setIcon(eventIcon, 'clock');

        const eventTextContainer = eventBox.createDiv({ cls: 'dayble-event-text-container' });
        eventTextContainer.setCssStyles({
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1'
        });

        const eventTitle = eventTextContainer.createDiv({ text: 'Customize me :D', cls: 'dayble-event-title' });
        eventTitle.setCssStyles({ fontSize: '0.85em', fontWeight: '600' });

        const eventDesc = eventTextContainer.createDiv({ text: 'I\'m the event description!', cls: 'dayble-event-desc' });
        eventDesc.setCssStyles({ fontSize: '0.75em', opacity: '0.8' });

        const updateEventPreview = () => {
            const settings = this.plugin.settings;
            const defaultColorName = settings.defaultEventColorName;
            const swatches = [
                ...(settings.swatches || []),
                ...(settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];

            const selectedSwatch = swatches.find((s: { name: string }) => s.name === defaultColorName);

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

            if (selectedSwatch) {
                const baseColor = (selectedSwatch as { color: string }).color;
                const textColor = (selectedSwatch as { textColor?: string }).textColor || '#ffffff';

                if (baseColor.startsWith('var')) {
                    eventBox.setCssProps({ 'background-color': `rgba(from ${baseColor} r g b / ${opacity})` });
                    if (textColor.startsWith('var')) {
                        eventBox.setCssProps({ 'border': `${borderWidth}px solid rgba(from ${textColor} r g b / ${borderOpacity})` });
                    } else {
                        eventBox.setCssProps({ 'border': `${borderWidth}px solid ${textColor}`, 'border-color': textColor });
                        if (textColor.startsWith('#')) {
                            const r = parseInt(textColor.slice(1, 3), 16);
                            const g = parseInt(textColor.slice(3, 5), 16);
                            const b = parseInt(textColor.slice(5, 7), 16);
                            eventBox.setCssProps({ 'border-color': `rgba(${r}, ${g}, ${b}, ${borderOpacity})` });
                        }
                    }
                } else {
                    eventBox.setCssProps({ 'background-color': baseColor });
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
                eventBox.setCssStyles({ color: textColor });
            } else {
                eventBox.setCssStyles({
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-normal)',
                    border: `${borderWidth}px solid var(--background-modifier-border)`,
                    opacity: '1'
                });
            }

            eventBox.setCssStyles({
                borderRadius: `${borderRadius}px`,
                paddingTop: `${verticalPadding}px`,
                paddingBottom: `${verticalPadding}px`
            });

            eventTitle.setCssStyles({ fontSize: '0.85em', fontWeight: '600' });
            eventTitle.setCssProps({
                'text-align': `${titleAlign === 'center-left' ? 'left' : titleAlign} !important`,
                'width': '100% !important'
            });

            eventDesc.setCssStyles({ fontSize: '0.75em', opacity: '0.8' });
            eventDesc.setCssProps({
                'text-align': `${finalDescAlign === 'center-left' ? 'left' : finalDescAlign} !important`,
                'width': '100% !important'
            });

            if (titleAlign === 'center' || titleAlign === 'center-left') {
                eventBox.setCssStyles({ justifyContent: 'center' });
            } else if (titleAlign === 'right') {
                eventBox.setCssStyles({ justifyContent: 'flex-end' });
            } else {
                eventBox.setCssStyles({ justifyContent: 'flex-start' });
            }

            const placement = settings.iconPlacement ?? 'left';
            eventIcon.setCssStyles({ display: placement === 'none' ? 'none' : 'block' });

            Array.from(eventBox.classList).forEach(cls => {
                if (cls.startsWith('dayble-icon-placement-')) {
                    eventBox.classList.remove(cls);
                }
            });

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

        updateEventPreview();

        new Setting(containerEl)
            .setName('Default event color')
            .setDesc('Default color for events when no category or user color is set.')
            .addDropdown(d => {
                const swatches = [
                    ...(this.plugin.settings.swatches || []),
                    ...(this.plugin.settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
                ];
                d.addOption('', 'No default color');
                swatches.forEach((s: { name: string }) => { d.addOption(s.name, s.name); });
                d.setValue(this.plugin.settings.defaultEventColorName || '');
                d.onChange(v => {
                    void (async () => {
                        this.plugin.settings.defaultEventColorName = v;
                        await this.plugin.saveSettings();
                        applyColorStyles();
                        updateEventPreview();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    })();
                });

                const applyColorStyles = () => {
                    const currentValue = d.getValue();
                    const selectedSwatch = swatches.find((sw: { name: string }) => sw.name === currentValue);

                    if (selectedSwatch) {
                        (d.selectEl).setCssProps({
                            'background-color': `${(selectedSwatch as { color: string }).color} !important`,
                            'color': `${(selectedSwatch as { textColor?: string }).textColor || chooseTextColor((selectedSwatch as { color: string }).color)} !important`
                        });
                    } else {
                        (d.selectEl).style.removeProperty('background-color');
                        (d.selectEl).style.removeProperty('color');
                    }

                    Array.from(d.selectEl.options).forEach(opt => {
                        if (!opt.value) {
                            opt.setCssProps({
                                'background-color': 'var(--background-primary)',
                                'color': 'var(--text-normal)'
                            });
                            return;
                        }
                        const s = swatches.find((sw: { name: string }) => sw.name === opt.value);
                        if (s) {
                            opt.setCssProps({
                                'background-color': (s as { color: string }).color,
                                'color': (s as { textColor?: string }).textColor || chooseTextColor((s as { color: string }).color)
                            });
                        }
                    });
                };
                applyColorStyles();
                (d.selectEl).classList.add('db-select');
                (d.selectEl).addClass('dayble-default-color-select');
            });

        new Setting(containerEl)
            .setName('Event tooltips')
            .setDesc('Show detailed tooltips when hovering over events.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.tooltipEnabled ?? false)
                    .onChange(async v => {
                        this.plugin.settings.tooltipEnabled = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Icon placement')
            .setDesc('Position of event icon')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('right', 'Right')
                    .addOption('none', 'None')
                    .addOption('top', 'Top center')
                    .addOption('top-left', 'Top left')
                    .addOption('top-right', 'Top right')
                    .addOption('bottom', 'Bottom center')
                    .addOption('bottom-left', 'Bottom left')
                    .addOption('bottom-right', 'Bottom right')
                    .setValue(this.plugin.settings.iconPlacement ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.iconPlacement = v as DaybleSettings['iconPlacement'];
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName('Event title alignment')
            .setDesc('Alignment of event titles')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .addOption('center-left', 'Center-left')
                    .setValue(this.plugin.settings.eventTitleAlign ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.eventTitleAlign = v as DaybleSettings['eventTitleAlign'];
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });
        new Setting(containerEl)
            .setName('Event description alignment')
            .setDesc('Alignment of event descriptions')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                    .addOption('center', 'Center')
                    .addOption('right', 'Right')
                    .addOption('center-left', 'Center-left')
                    .setValue(this.plugin.settings.eventDescAlign ?? 'left')
                    .onChange(v => {
                        this.plugin.settings.eventDescAlign = v as DaybleSettings['eventDescAlign'];
                        void this.plugin.saveSettings().then(() => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            void view?.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName('Event background opacity')
            .setDesc('Controls transparency of event backgrounds.')
            .addSlider(s => {
                s.setLimits(0, 1, 0.1)
                    .setValue(this.plugin.settings.eventBgOpacity ?? 1)
                    .onChange(v => {
                        this.plugin.settings.eventBgOpacity = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border thickness')
            .setDesc('Controls event border thickness (0-5px)')
            .addSlider(s => {
                s.setLimits(0, 5, 0.5)
                    .setValue(this.plugin.settings.eventBorderWidth ?? 2)
                    .onChange(v => {
                        this.plugin.settings.eventBorderWidth = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border opacity')
            .setDesc('Controls border color opacity for colored events (0-1)')
            .addSlider(s => {
                s.setLimits(0, 1, 0.1)
                    .setValue(this.plugin.settings.eventBorderOpacity ?? 1)
                    .onChange(v => {
                        this.plugin.settings.eventBorderOpacity = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });
        new Setting(containerEl)
            .setName('Event border radius')
            .setDesc('Controls event corner roundness (px)')
            .addSlider(s => {
                s.setLimits(0, 24, 1)
                    .setValue(this.plugin.settings.eventBorderRadius ?? 6)
                    .onChange(v => {
                        this.plugin.settings.eventBorderRadius = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Day cell radius')
            .setDesc('Controls day cell corner roundness (px)')
            .addSlider(s => {
                s.setLimits(0, 24, 1)
                    .setValue(this.plugin.settings.dayCellRadius ?? 8)
                    .onChange(v => {
                        this.plugin.settings.dayCellRadius = v;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Event vertical padding')
            .setDesc('Controls vertical space inside events (0-12px)')
            .addSlider(s => {
                s.setLimits(0, 12, 1)
                    .setValue(this.plugin.settings.eventVerticalPadding ?? 2)
                    .onChange(v => {
                        this.plugin.settings.eventVerticalPadding = v;
                        void this.plugin.saveSettings().then(async () => {
                            updateEventPreview();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    })
                    .setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Max day cell height (px)')
            .setDesc('If set, day cells cap at this height and events scroll vertically')
            .addText(t => {
                t.setPlaceholder('0 (disabled)');
                t.setValue(String(this.plugin.settings.dayCellMaxHeight ?? 0));
                t.onChange(v => {
                    const num = parseInt(v || '0', 10);
                    this.plugin.settings.dayCellMaxHeight = isNaN(num) ? 0 : Math.max(0, num);
                    void this.plugin.saveSettings().then(async () => {
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
                });
                (t.inputEl).type = 'number';
                (t.inputEl).min = '0';
            });

        new Setting(containerEl)
            .setName('Day cell min width (px)')
            .setDesc('If set, day cells will not shrink below this width (useful for horizontal scrolling). 0 to disable.')
            .addText(t => {
                t.setPlaceholder('0 (disabled)');
                t.setValue(String(this.plugin.settings.dayCellMinWidth ?? 0));
                t.onChange(v => {
                    const num = parseInt(v || '0', 10);
                    this.plugin.settings.dayCellMinWidth = isNaN(num) ? 0 : Math.max(0, num);
                    void this.plugin.saveSettings().then(async () => {
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
                });
                (t.inputEl).type = 'number';
                (t.inputEl).min = '0';
            });

        new Setting(containerEl)
            .setName('Completed event display')
            .setDesc('How completed events appear')
            .addDropdown(d => {
                d.addOption('none', 'No change')
                    .addOption('dim', 'Dim')
                    .addOption('strikethrough', 'Strikethrough')
                    .addOption('hide', 'Hide')
                    .addOption('color', 'Change color')
                    .setValue(this.plugin.settings.completeBehavior ?? 'none')
                    .onChange(v => {
                        this.plugin.settings.completeBehavior = v as "none" | "hide" | "dim" | "strikethrough" | "color" | undefined;
                        this.display(); // Refresh to show/hide color dropdown
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        if (this.plugin.settings.completeBehavior === 'color') {
            new Setting(containerEl)
                .setName('Change color to')
                .setDesc('Color for completed events')
                .addDropdown(d => {
                    const swatches = [
                        ...(this.plugin.settings.swatches || []),
                        ...(this.plugin.settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
                    ];
                    d.addOption('', 'Default color');
                    swatches.forEach((s: { name: string }) => { d.addOption(s.name, s.name); });
                    d.setValue(this.plugin.settings.completeColor || '');
                    d.onChange(v => {
                        void (async () => {
                            this.plugin.settings.completeColor = v;
                            await this.plugin.saveSettings();
                            applyColorStyles();
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        })();
                    });

                    const applyColorStyles = () => {
                        const currentValue = d.getValue();
                        const selectedSwatch = swatches.find((sw: { name: string }) => sw.name === currentValue);

                        if (selectedSwatch) {
                            (d.selectEl).setCssProps({
                                'background-color': `${(selectedSwatch as { color: string }).color} !important`,
                                'color': `${(selectedSwatch as { textColor?: string }).textColor || chooseTextColor((selectedSwatch as { color: string }).color)} !important`
                            });
                        } else {
                            (d.selectEl).style.removeProperty('background-color');
                            (d.selectEl).style.removeProperty('color');
                        }

                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value) return;
                            const s = swatches.find((sw: { name: string }) => sw.name === opt.value);
                            if (s) {
                                opt.setCssProps({
                                    'background-color': (s as { color: string }).color,
                                    'color': (s as { textColor?: string }).textColor || chooseTextColor((s as { color: string }).color)
                                });
                            }
                        });
                    };
                    applyColorStyles();
                    (d.selectEl).classList.add('db-select');
                    (d.selectEl).addClass('dayble-complete-color-select');
                });
        }

        new Setting(containerEl)
            .setName(`Only animate today's events`)
            .setDesc('Stop animation for all events except today')
            .addToggle(t => {
                t.setValue(this.plugin.settings.onlyAnimateToday ?? false)
                    .onChange(v => {
                        this.plugin.settings.onlyAnimateToday = v;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        new Setting(containerEl).setName('Sounds').setHeading();

        const markCompleteSetting = new Setting(containerEl);
        markCompleteSetting.setName('Sound on mark complete');
        markCompleteSetting.addButton(b => {
            const lbl = (() => {
                const v = this.plugin.settings.soundMarkComplete || '';
                if (!v) return 'Select file';
                if (v.startsWith('data:')) return this.plugin.settings.soundMarkCompleteName || 'Custom audio';
                const parts = v.split('/');
                return parts[parts.length - 1] || 'Select file';
            })();
            b.setButtonText(lbl);
            b.buttonEl.setCssProps({
                'max-width': '220px',
                'text-overflow': 'ellipsis',
                'overflow': 'hidden',
                'white-space': 'nowrap',
            });
            b.buttonEl.title = lbl;
            b.onClick(() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                        this.plugin.settings.soundMarkComplete = dataUrl;
                        this.plugin.settings.soundMarkCompleteName = file.name || '';
                        await this.plugin.saveSettings();
                        this.display();
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            });
        }).addButton(b => {
            b.setButtonText('Reset').onClick(async () => {
                this.plugin.settings.soundMarkComplete = '';
                this.plugin.settings.soundMarkCompleteName = '';
                await this.plugin.saveSettings();
                this.display();
            });
        });

        const nextEventSetting = new Setting(containerEl);
        nextEventSetting.setName('Day view: sound on switching to next event');
        nextEventSetting.addButton(b => {
            const lbl = (() => {
                const v = this.plugin.settings.soundNextEvent || '';
                if (!v) return 'Select file';
                if (v.startsWith('data:')) return this.plugin.settings.soundNextEventName || 'Custom audio';
                const parts = v.split('/');
                return parts[parts.length - 1] || 'Select file';
            })();
            b.setButtonText(lbl);
            b.buttonEl.setCssProps({
                'max-width': '220px',
                'text-overflow': 'ellipsis',
                'overflow': 'hidden',
                'white-space': 'nowrap',
            });
            b.buttonEl.title = lbl;
            b.onClick(() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/*';
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                        this.plugin.settings.soundNextEvent = dataUrl;
                        this.plugin.settings.soundNextEventName = file.name || '';
                        await this.plugin.saveSettings();
                        this.display();
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            });
        }).addButton(b => {
            b.setButtonText('Reset').onClick(async () => {
                this.plugin.settings.soundNextEvent = '';
                this.plugin.settings.soundNextEventName = '';
                await this.plugin.saveSettings();
                this.display();
            });
        });

        new Setting(containerEl).setName('Interface').setHeading();

        new Setting(containerEl)
            .setName('Holder placement')
            .setDesc('Place the holder toggle (left, right, or hidden)')
            .addDropdown(d => {
                d.addOption('left', 'Left')
                 .addOption('right', 'Right')
                 .addOption('hidden', 'Hidden')
                 .setValue(this.plugin.settings.holderPlacement ?? 'left')
                 .onChange(v => {
                    this.plugin.settings.holderPlacement = v as "left" | "right" | "hidden" | undefined;
                    void this.plugin.saveSettings().then(() => {
                        const view = this.plugin.getCalendarView();
                        if (view) {
                            view.containerEl.empty();
                            void view.onOpen();
                        }
                    });
                 });
            });

        new Setting(containerEl)
            .setName('Color swatch position')
            .setDesc('Position of color swatches in event modal')
            .addDropdown(d => {
                d.addOption('under-title', 'Under title')
                    .addOption('under-description', 'Under description')
                    .addOption('none', 'Do not show')
                    .setValue(this.plugin.settings.colorSwatchPosition ?? 'under-title')
                    .onChange(v => {
                        this.plugin.settings.colorSwatchPosition = v as "none" | "under-title" | "under-description" | undefined;
                        void this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Show current time line')
            .setDesc('Show a current time indicator in day and 3-day view.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showCurrentTimeLine ?? true)
                    .onChange(async v => {
                        this.plugin.settings.showCurrentTimeLine = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Scroll to current time in day view')
            .setDesc('Automatically scroll to the current time when opening day or 3-day view.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.scrollToCurrentTime ?? true)
                    .onChange(async v => {
                        this.plugin.settings.scrollToCurrentTime = v;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Day split view')
            .setDesc('Split the day view into morning and afternoon columns on desktop.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.todayModalSplitView ?? true)
                    .onChange(async v => {
                        this.plugin.settings.todayModalSplitView = v;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Dim past events opacity')
            .setDesc('Set the opacity for events that have already passed in day and 3-day view. Set to 1.0 to disable dimming.')
            .addSlider(s => {
                s.setLimits(0.1, 1, 0.05)
                    .setValue(typeof this.plugin.settings.dimPastEvents === 'number' ? this.plugin.settings.dimPastEvents : 0.60)
                    .setDynamicTooltip()
                    .onChange(async v => {
                        this.plugin.settings.dimPastEvents = v;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        await view?.render();
                    });
            });

        new Setting(containerEl)
            .setName('Enable weekly notes')
            .setDesc('Show a notes section below the calendar in weekly view')
            .addToggle(t => {
                t.setValue(this.plugin.settings.weeklyNotesEnabled ?? true)
                    .onChange(v => {
                        this.plugin.settings.weeklyNotesEnabled = v;
                        void this.plugin.saveSettings().then(async () => {
                            const view = this.plugin.getCalendarView();
                            await view?.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName('Copy calendar as Markdown')
            .setDesc('Enable a header button to copy the current calendar view as a Markdown table.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showCopyCalendarIcon ?? false)
                    .onChange(async value => {
                        this.plugin.settings.showCopyCalendarIcon = value;
                        await this.plugin.saveSettings();
                        const view = this.plugin.getCalendarView();
                        if (view && view.updateCopyCalendarButtonVisibility) {
                            view.updateCopyCalendarButtonVisibility();
                        }
                    });
            });

        new Setting(containerEl)
            .setName('Save view as image')
            .setDesc('Enable a header button to save the current calendar view as an image.')
            .addToggle(t => {
                t.setValue(this.plugin.settings.showSaveImageIcon ?? false)
                    .onChange(async value => {
                        this.plugin.settings.showSaveImageIcon = value;
                        await this.plugin.saveSettings();

                        if (value) {
                            imageFolderSetting.settingEl.show();
                        } else {
                            imageFolderSetting.settingEl.hide();
                        }

                        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
                        for (const leaf of leaves) {
                            const view = leaf.view as { updateCopyCalendarButtonVisibility?: () => void };
                            if (view.updateCopyCalendarButtonVisibility) {
                                view.updateCopyCalendarButtonVisibility();
                            }
                        }
                    });
            });

        const imageFolderSetting = new Setting(containerEl)
            .setName('Save image folder')
            .setDesc('The folder where the calendar image will be saved.')
            .addButton(b => {
                b.setButtonText(this.plugin.settings.saveImageFolder?.trim() ? this.plugin.settings.saveImageFolder : 'Root')
                    .onClick(() => {
                        const folders = this.app.vault.getAllLoadedFiles()
                            .filter((f): f is TFolder => f instanceof TFolder)
                            .map(f => f.path)
                            .sort();
                        if (!folders.includes('')) folders.unshift('');
                        new FolderSuggestModal(this.app, folders, async (folder) => {
                            this.plugin.settings.saveImageFolder = folder;
                            await this.plugin.saveSettings();
                            b.setButtonText(folder?.trim() ? folder : 'Root');
                        }).open();
                    });
            });

        // Initial visibility
        if (!this.plugin.settings.showSaveImageIcon) {
            imageFolderSetting.settingEl.hide();
        }

        const swatchesSectionTop = containerEl.createDiv();
        const colorsHeading = new Setting(swatchesSectionTop).setName('Colors').setHeading();
        (colorsHeading.settingEl).setCssProps({ 'margin-top': '18px' });
        const colorsListTop = swatchesSectionTop.createDiv();
        const renderColorsTop = () => {
            colorsListTop.empty();
            const row = colorsListTop.createDiv();
            row.addClass('dayble-settings-colors-row');
            row.setAttr('style', 'margin-top: -10px !important; margin-bottom: 0px; display: flex; flex-wrap: wrap;');

            const built = (this.plugin.settings.swatches || []).map((s: { name: string, color: string, textColor?: string }) => ({ name: s.name, color: s.color, textColor: s.textColor || '', source: 'built' as const }));
            const customs = (this.plugin.settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ name: s.name || '', color: s.color || '#ff0000', textColor: s.textColor || '', source: 'custom' as const }));
            const combined: { name: string, color: string, textColor: string, source: 'built'|'custom' }[] = [...built, ...customs];
            const makeItem = (entry: { name: string, color: string, textColor: string, source: 'built'|'custom' }, idx: number) => {
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
                    const dropdowns = containerEl.querySelectorAll('.dayble-trigger-color-select, .dayble-default-color-select, .dayble-complete-color-select');
                    dropdowns.forEach(t => {
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

                textPicker.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };
                bgPicker.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };
                nameInput.oninput = async () => {
                    await updateAll();
                    const view = this.plugin.getCalendarView();
                    if (view) await view.render();
                };

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

                addTouchDragListeners(
                    dragBtn,
                    (cx, cy, e) => { e.preventDefault(); e.stopPropagation(); colorDragState = startColorDrag(cx, cy); },
                    (cx, cy, e) => { e.preventDefault(); colorDragState?.moveGhost(cx, cy); },
                    (e) => { e.preventDefault(); void colorDragState?.endDrag(); colorDragState = null; }
                );
            };
            combined.forEach((entry, idx) => { makeItem(entry, idx); });
            const controlsBottom = new Setting(colorsListTop);
            controlsBottom.settingEl.addClass('dayble-colors-controls');
            controlsBottom.settingEl.addClass('dayble-transparent-setting');
            controlsBottom.addButton(b => {
                b.setButtonText('Reset colors').onClick(() => {
                    const modal = new ConfirmModal(this.app, 'Reset color swatches to default?', async () => {
                        this.plugin.settings.swatches = (DEFAULT_SETTINGS.swatches || []).map(s => ({ name: s.name, color: s.color, textColor: s.textColor }));
                        this.plugin.settings.userCustomSwatches = [];
                        await this.plugin.saveSettings();
                        this.display();
                    });
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
                    this.display();
                });
                (b.buttonEl).addClass('mod-cta');
            });
        };
        renderColorsTop();

        const stylesHeading = new Setting(containerEl).setName('Event styles').setDesc('Manage event styling, triggers, and states in a unified view.').setHeading();
        stylesHeading.settingEl.addClass('dayble-event-styles-heading');
        const stylesWrap = containerEl.createDiv();
        const renderStyles = () => {
            stylesWrap.empty();
            const categories = this.plugin.settings.eventCategories || [];
            const swatches = [
                ...(this.plugin.settings.swatches || []),
                ...(this.plugin.settings.userCustomSwatches || []).map((s: { name: string, color: string, textColor?: string }, idx: number) => ({ ...s, name: s.name || `custom-${idx}` }))
            ];

            categories.forEach((category: EventCategory) => {
                const row = new Setting(stylesWrap);
                row.settingEl.querySelector('.setting-item-name')?.remove();
                row.settingEl.addClass('db-category-row');
                row.settingEl.addClass('dayble-settings-style-row');
                row.settingEl.dataset.id = category.id;
                (row.controlEl).addClass('dayble-flex-gap-8');

                // Drag Handle
                const dragBtn = row.controlEl.createDiv({
                    cls: 'clickable-icon',
                    attr: { 'aria-label': 'Drag to reorder' }
                });
                dragBtn.setCssProps({
                    'cursor': 'grab',
                    'color': 'var(--text-muted)',
                    'flex-shrink': '0',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'margin-right': '8px'
                });
                setIcon(dragBtn, 'menu');

                const startCategoryDrag = (startX: number, startY: number) => {
                    const wrap = row.settingEl;
                    const rect = wrap.getBoundingClientRect();
                    const offsetX = startX - rect.left;
                    const offsetY = startY - rect.top;

                    if (navigator.vibrate) navigator.vibrate(50);

                    const ghost = document.body.createDiv({ cls: 'drag-reorder-ghost' });
                    const clone = wrap.cloneNode(true) as HTMLElement;

                    const originalInputs = wrap.querySelectorAll('input, select');
                    const clonedInputs = clone.querySelectorAll('input, select');
                    originalInputs.forEach((el, i) => {
                        if (clonedInputs[i]) {
                            (clonedInputs[i] as HTMLInputElement | HTMLSelectElement).value = (el as HTMLInputElement | HTMLSelectElement).value;
                        }
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
                        'background-color': 'var(--background-primary)',
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
                        const targetRow = target ? target.closest('.dayble-settings-style-row') : null;

                        if (targetRow && targetRow !== wrap && targetRow.parentNode === stylesWrap) {
                            const targetRect = targetRow.getBoundingClientRect();
                            const isAfter = (currentY - targetRect.top) > (targetRect.height / 2);
                            if (isAfter) {
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

                        const updatedCategories: EventCategory[] = [];
                        stylesWrap.querySelectorAll('.dayble-settings-style-row').forEach((el) => {
                            const catId = (el as HTMLElement).dataset.id;
                            const cat = this.plugin.settings.eventCategories?.find((c: EventCategory) => c.id === catId);
                            if (cat) updatedCategories.push(cat);
                        });

                        if (updatedCategories.length > 0) {
                            this.plugin.settings.eventCategories = updatedCategories;
                            this.plugin.reorderTriggersGlobally();
                            await this.plugin.saveSettings();
                            renderStyles();
                            const view = this.plugin.getCalendarView();
                            if (view) await view.render();
                        }
                    };

                    const onMouseMove = (moveEvent: MouseEvent) => { moveEvent.preventDefault(); moveGhost(moveEvent.clientX, moveEvent.clientY); };
                    const onMouseUp = () => { void endDrag(); };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);

                    return { moveGhost, endDrag };
                };

                let catDragState: ReturnType<typeof startCategoryDrag> | null = null;

                dragBtn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startCategoryDrag(e.clientX, e.clientY);
                });

                addTouchDragListeners(
                    dragBtn,
                    (cx, cy, e) => { e.preventDefault(); e.stopPropagation(); catDragState = startCategoryDrag(cx, cy); },
                    (cx, cy, e) => { e.preventDefault(); catDragState?.moveGhost(cx, cy); },
                    (e) => { e.preventDefault(); void catDragState?.endDrag(); catDragState = null; }
                );

                // Clickable icon to set icon
                row.addExtraButton(btn => {
                    btn.setIcon(category.icon || 'plus').setTooltip('Change icon').onClick(() => {
                        const picker = new IconPickerModal(this.app, (icon) => {
                            void (async () => {
                                category.icon = icon;
                                await this.plugin.saveSettings();
                                renderStyles();
                            })();
                        }, () => {
                            void (async () => {
                                category.icon = undefined;
                                await this.plugin.saveSettings();
                                renderStyles();
                            })();
                        });
                        void picker.open();
                    });
                });

                // Event category name
                row.addText(t => {
                    t.setValue(category.name).onChange(v => {
                        void (async () => {
                            category.name = v;
                            await this.plugin.saveSettings();
                        })();
                    });
                    (t.inputEl).classList.add('db-input', 'db-category-name');
                });

                // Color list dropdown
                row.addDropdown(d => {
                    d.addOption('', 'No color');
                    swatches.forEach((s: { name: string }) => { d.addOption(s.name, s.name); });

                    d.setValue(category.colorName || '');

                    d.onChange(v => {
                        void (async () => {
                            category.colorName = v || undefined;
                            const s = swatches.find((sw: { name: string }) => sw.name === v);
                            if (s) {
                                category.bgColor = (s as { color: string }).color;
                                category.textColor = (s as { textColor?: string }).textColor || chooseTextColor((s as { color: string }).color);
                            } else {
                                category.bgColor = '#8392a4';
                                category.textColor = '#ffffff';
                            }
                            await this.plugin.saveSettings();
                            applyColorStyles();

                            const view = this.plugin.getCalendarView();
                            if (view) await view.render();
                        })();
                    });

                    const applyColorStyles = () => {
                        const val = d.getValue();
                        const s = swatches.find((sw: { name: string }) => sw.name === val);
                        if (s) {
                            (d.selectEl).setCssProps({
                                'background-color': (s as { color: string }).color,
                                'color': (s as { textColor?: string }).textColor || chooseTextColor((s as { color: string }).color)
                            });
                        } else {
                            (d.selectEl).setCssProps({ 'background-color': '', 'color': '' });
                        }

                        Array.from(d.selectEl.options).forEach(opt => {
                            if (!opt.value) {
                                opt.setCssProps({ 'background-color': 'var(--background-primary)', 'color': 'var(--text-normal)' });
                                return;
                            }
                            const swatch = swatches.find((sw: { name: string }) => sw.name === opt.value);
                            if (swatch) {
                                opt.setCssProps({
                                    'background-color': (swatch as { color: string }).color,
                                    'color': (swatch as { textColor?: string }).textColor || chooseTextColor((swatch as { color: string }).color)
                                });
                            }
                        });
                    };
                    applyColorStyles();
                    (d.selectEl).classList.add('db-select');
                });

                // Copy icon
                row.addExtraButton(btn => {
                    btn.setIcon('copy').setTooltip('Duplicate style').onClick(async () => {
                        const items2 = (this.plugin.settings.eventCategories || []).slice();
                        const copy = { ...category, id: randomId(), name: category.name + ' (copy)' };
                        items2.splice(items2.indexOf(category) + 1, 0, copy);
                        this.plugin.settings.eventCategories = items2;
                        await this.plugin.saveSettings();
                        renderStyles();
                    });
                });

                // Settings icon
                row.addExtraButton(btn => {
                    btn.setIcon('settings').setTooltip('Open style settings').onClick(() => {
                        if (this.EventStyleSettingsModal) {
                            new this.EventStyleSettingsModal(this.app, this.plugin, category, () => {
                                renderStyles();
                                this.display();
                            }).open();
                        }
                    });
                });
            });

            const addStyleBtn = new Setting(stylesWrap);
            addStyleBtn.settingEl.addClass('dayble-transparent-setting');
            addStyleBtn.addButton(b => {
                b.setButtonText('+ add style');
                (b.buttonEl).addClass('mod-cta');
                b.onClick(async () => {
                    const category: EventCategory = {
                        id: randomId(),
                        name: 'New style',
                        bgColor: '#8392a4',
                        textColor: '#ffffff',
                        effect: '',
                        animation: '',
                        animation2: '',
                        icon: undefined
                    };
                    this.plugin.settings.eventCategories.push(category);
                    await this.plugin.saveSettings();
                    renderStyles();
                });
            });
        };
        renderStyles();

        new Setting(containerEl).setName('Data management').setHeading();
        new Setting(containerEl)
            .setName('Export data')
            .addButton(b => {
                b.setButtonText('Export data')
                 .onClick(async () => {
                    try {
                        const vaultName = (this.app.vault as Vault & { getName: () => string }).getName?.()
                            || (this.app.vault.adapter as DataAdapter & { basePath?: string }).basePath?.split(/[\\/]/).filter(Boolean).pop()
                            || 'Vault';
                        const exportObj: {
                            vaultName: string;
                            exportedAt: string;
                            settings: DaybleSettings;
                            months: Array<{ file: string; data: unknown }>;
                        } = {
                            vaultName,
                            exportedAt: new Date().toISOString(),
                            settings: this.plugin.settings,
                            months: []
                        };
                        const folder = this.plugin.settings.entriesFolder?.trim() || 'DaybleCalendar';
                        let files: string[] = [];
                        try {
                            const listing = await this.app.vault.adapter.list(folder);
                            files = (listing.files || []).filter((f: string) => f.toLowerCase().endsWith('.json'));
                        } catch {
                            files = [];
                        }
                        for (const f of files) {
                            try {
                                const txt = await this.app.vault.adapter.read(f);
                                const data = JSON.parse(txt);
                                exportObj.months.push({ file: f, data });
                            } catch { /* ignore */ }
                        }

                        const fileName = `DaybleExport_${vaultName}_${Date.now()}.json`;
                        const jsonStr = JSON.stringify(exportObj, null, 2);

                        const link = document.createElement('a');
                        const blob = new Blob([jsonStr], { type: 'application/json' });
                        link.href = URL.createObjectURL(blob);
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);

                        new Notice(`Export ready: ${fileName}`);
                    } catch {
                        new Notice('Export failed');
                    }
                 });
            });
        new Setting(containerEl)
            .setName('Import data')
            .addButton(b => {
                b.setButtonText('Import data')
                 .onClick(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        try {
                            const text = await file.text();
                            const obj = JSON.parse(text);
                            if (obj?.settings) {
                                this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, obj.settings);
                                await this.plugin.saveSettings();
                            }
                            if (Array.isArray(obj?.months)) {
                                const folder = this.plugin.settings.entriesFolder || 'DaybleCalendar';
                                try { await this.app.vault.adapter.stat(folder); } catch { try { await this.app.vault.createFolder(folder); } catch { /* intentional */ } }
                                for (const m of obj.months) {
                                    const path = typeof m.file === 'string' ? m.file : `${folder}/Imported_${Date.now()}.json`;
                                    await this.app.vault.adapter.write(path, JSON.stringify(m.data ?? {}, null, 2));
                                }
                            }
                            const view = this.plugin.getCalendarView();
                            if (view) { await view.loadAllEntries(); await view.render(); }
                            new Notice('Import completed');

                            // Reload the plugin
                            const pluginManager = (this.plugin.app as App & { plugins: { disablePlugin: (id: string) => Promise<void>; enablePlugin: (id: string) => Promise<void>; } }).plugins;
                            if (pluginManager) {
                                await pluginManager.disablePlugin(this.plugin.manifest.id);
                                await pluginManager.enablePlugin(this.plugin.manifest.id);
                            }
                        } catch {
                            new Notice('Import failed');
                        }
                    };
input.click();
                 });
             });

        // Restore scroll position
        containerEl.scrollTop = scrollPos;
    }
}
