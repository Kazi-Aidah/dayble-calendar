import { Plugin, WorkspaceLeaf, Notice, TFile, requestUrl, moment } from 'obsidian';
import type { DaybleSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { VIEW_TYPE } from './constants';
import { chooseTextColor } from './utils';
import DaybleCalendarView from './CalendarView';
import DaybleSettingTab from './settings/SettingTab';
import EventStyleSettingsModal from './settings/EventStyleSettingsModal';
import PromptSearchModal from './modals/PromptSearchModal';

export default class DaybleCalendarPlugin extends Plugin {
    settings: DaybleSettings;

    getTimeFormat(): '12h' | '24h' {
        const setting = this.settings.timeFormat;
        if (setting === '12h') return '12h';
        if (setting === '24h') return '24h';
        // System or default
        const is12h = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
        if (is12h !== undefined) return is12h ? '12h' : '24h';

        const isMoment12h = moment.localeData().longDateFormat('LT').includes('A');
        return isMoment12h ? '12h' : '24h';
    }

    resolveSoundSrc(src?: string): string {
        const s = String(src || '');
        if (!s) return '';
        if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s;
        const file = this.app.vault.getFileByPath(s);
        if (file && file instanceof TFile) return this.app.vault.getResourcePath(file);
        return s;
    }

    playSoundMarkComplete(): void {
        const url = this.resolveSoundSrc(this.settings.soundMarkComplete);
        if (!url) return;
        try { const a = new Audio(url); void a.play(); } catch { /* intentional */ }
    }

    playSoundNextEvent(): void {
        const url = this.resolveSoundSrc(this.settings.soundNextEvent);
        if (!url) return;
        try { const a = new Audio(url); void a.play(); } catch { /* intentional */ }
    }

    // Fetches release info from GitHub - only called when user manually opens ChangelogModal
    // No periodic/background network activity - this is a user-initiated one-time request
    async fetchAllReleases() {
        const allReleases = [];
        let page = 1;
        let hasMorePages = true;
        while (hasMorePages) {
            const url = `https://api.github.com/repos/Kazi-Aidah/dayble-calendar/releases?page=${page}&per_page=100`;
            try {
                let data = null;
                if (typeof requestUrl === 'function') {
                    try {
                        const res = await requestUrl({
                            url,
                            headers: {
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'Obsidian-Dayble-Calendar'
                            }
                        });
                        data = res.json || (res.text ? JSON.parse(res.text) : null);
                    } catch { /* ignore */ }
                }
                if (!data) {
                    try {
                        const r = await requestUrl({
                            url,
                            headers: {
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'Obsidian-Dayble-Calendar'
                            }
                        });
                        data = r.json;
                    } catch {
                        hasMorePages = false;
                        break;
                    }
                }
                if (!Array.isArray(data) || data.length === 0) {
                    hasMorePages = false;
                } else {
                    allReleases.push(...data);
                    if (data.length < 100) {
                        hasMorePages = false;
                    } else {
                        page++;
                    }
                }
            } catch {
                hasMorePages = false;
            }
        }
        return allReleases;
    }

    getDataFilePath(filename: string): string {
        const folder = this.settings.entriesFolder?.trim() || '';
        if (!folder) return filename;
        if (folder.endsWith('/')) return `${folder}${filename}`;
        return `${folder}/${filename}`;
    }

    async onStorageFolderChange(newFolder: string) {
        this.settings.entriesFolder = newFolder;
        await this.saveSettings();
        await this.ensureEntriesFolder();

        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        for (const leaf of leaves) {
            if (leaf.view instanceof DaybleCalendarView) {
                await leaf.view.loadAllEntries();
                await leaf.view.render();
            }
        }

        new Notice(`Storage folder updated to: ${newFolder || 'root'}`);
    }

    reorderTriggersGlobally() {
        const categories = this.settings.eventCategories || [];
        const allTriggers = this.settings.triggers || [];

        const sortedTriggers: unknown[] = [];
        for (const cat of categories) {
            const catTriggers = allTriggers.filter(t => t.categoryId === cat.id);
            sortedTriggers.push(...catTriggers);
        }

        // Add any orphan triggers (triggers with a categoryId that no longer exists or is missing)
        const orphanTriggers = allTriggers.filter(t => !categories.some(c => c.id === t.categoryId));
        sortedTriggers.push(...orphanTriggers);

        this.settings.triggers = sortedTriggers;
    }

    async onload() {
        await this.loadSettings();
        this.reorderTriggersGlobally(); // Ensure triggers follow category order from start

        this.registerView(VIEW_TYPE, leaf => new DaybleCalendarView(leaf, this));

        this.addRibbonIcon('calendar-heart', 'Dayble calendar', () => {
            void this.openDayble();
        });

        this.addCommand({ id: 'open-calendar', name: 'Open calendar', callback: () => void this.openDayble() });
        this.addCommand({
            id: 'open-monthly-view',
            name: 'Open month view',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Month';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'open-weekly-view',
            name: 'Open week view',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Week';
                    this.settings.calendarWeekActive = true;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'open-3day-view',
            name: 'Open 3-day view',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = '3day';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'open-daily-view',
            name: 'Open day view',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Day';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'open-agenda-view',
            name: 'Open agenda',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    this.settings.calendarView = 'Agenda';
                    this.settings.calendarWeekActive = false;
                    await this.saveSettings();
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'toggle-pinned-month',
            name: 'Show only pinned events in month view',
            callback: async () => {
                this.settings.onlyShowPinnedEventsMonth = !this.settings.onlyShowPinnedEventsMonth;
                await this.saveSettings();
                const view = this.getCalendarView();
                if (view) {
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'toggle-pinned-week',
            name: 'Show only pinned events in week view',
            callback: async () => {
                this.settings.onlyShowPinnedEventsWeek = !this.settings.onlyShowPinnedEventsWeek;
                await this.saveSettings();
                const view = this.getCalendarView();
                if (view) {
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'toggle-pinned-agenda',
            name: 'Show only pinned events in agenda view',
            callback: async () => {
                this.settings.onlyShowPinnedEventsAgenda = !this.settings.onlyShowPinnedEventsAgenda;
                await this.saveSettings();
                const view = this.getCalendarView();
                if (view) {
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'refresh-calendar',
            name: 'Refresh calendar',
            callback: async () => {
                const view = this.getCalendarView();
                if (view) {
                    await view.loadAllEntries();
                    try { await view.render(); } catch { /* intentional */ }
                }
            }
        });
        this.addCommand({
            id: 'add-new-event',
            name: 'Add new event',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    void view.openEventModal(undefined, moment().format('YYYY-MM-DD'));
                }
            }
        });
        this.addCommand({
            id: 'search-events',
            name: 'Search events',
            callback: async () => {
                await this.openDayble();
                const view = this.getCalendarView();
                if (view) {
                    const modal = new PromptSearchModal(this.app, view);
                    void modal.open();
                }
            }
        });
        this.addCommand({ id: 'focus-today', name: 'Focus on today', callback: () => void this.focusToday() });
        this.addCommand({
            id: 'show-current-time-line',
            name: 'Show current time line',
            checkCallback: (checking) => {
                const enabled = this.settings.showCurrentTimeLine ?? true;
                if (enabled) return false;
                if (!checking) {
                    this.settings.showCurrentTimeLine = true;
                    void this.saveSettings().then(async () => {
                        const view = this.getCalendarView();
                        if (view) {
                            await view.render();
                        }
                    });
                }
                return true;
            }
        });
        this.addCommand({
            id: 'hide-current-time-line',
            name: 'Hide current time line',
            checkCallback: (checking) => {
                const enabled = this.settings.showCurrentTimeLine ?? true;
                if (!enabled) return false;
                if (!checking) {
                    this.settings.showCurrentTimeLine = false;
                    void this.saveSettings().then(async () => {
                        const view = this.getCalendarView();
                        if (view) {
                            await view.render();
                        }
                    });
                }
                return true;
            }
        });
        this.addSettingTab(new DaybleSettingTab(this.app, this, EventStyleSettingsModal));

        // Replace new tab with homepage when enabled
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
                if (!this.settings.replaceHomepageWithSidecards) return;
                if (!leaf) return;
                try {
                    const viewType = (leaf.view as unknown)?.getViewType?.();
                    if (viewType === VIEW_TYPE) return;
                    const state = leaf.getViewState?.();
                    if (state?.type === 'empty' && !state?.state?.file) {
                        void this.replaceWithHomepage(leaf);
                    }
                } catch { /* leaf state may not be accessible */ }
            })
        );

        try { await this.ensureEntriesFolder(); } catch { /* intentional */ }
        void this.openDayble();
    }

    onunload() {
        // Do not detach leaves here to respect user layout
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

        // Migration: split onlyShowPinnedEvents into Month and Week settings
        if (data && data.onlyShowPinnedEvents !== undefined) {
            if (data.onlyShowPinnedEventsMonth === undefined) {
                this.settings.onlyShowPinnedEventsMonth = data.onlyShowPinnedEvents;
            }
            if (data.onlyShowPinnedEventsWeek === undefined) {
                this.settings.onlyShowPinnedEventsWeek = data.onlyShowPinnedEvents;
            }
        }

        await this.migrateSettings();
    }

    async migrateSettings() {
        let modified = false;
        const settings = this.settings;
        const swatches = [
            ...(settings.swatches || []),
            ...(settings.userCustomSwatches || [])
        ];

        if (settings.eventCategories) {
            for (const category of settings.eventCategories) {
                // If it doesn't have a colorName, try to find or create one
                if (!category.colorName && category.bgColor) {
                    let matchingSwatch = swatches.find(s => s.color === category.bgColor && (!s.textColor || s.textColor === category.textColor));

                    if (!matchingSwatch) {
                        const swatchName = `Category: ${category.name}`;
                        let uniqueName = swatchName;
                        let counter = 1;
                        while (swatches.some(s => s.name === uniqueName)) {
                            uniqueName = `${swatchName} ${counter++}`;
                        }

                        const newSwatch = {
                            name: uniqueName,
                            color: category.bgColor,
                            textColor: category.textColor || chooseTextColor(category.bgColor)
                        };
                        if (!settings.userCustomSwatches) settings.userCustomSwatches = [];
                        settings.userCustomSwatches.push(newSwatch);
                        swatches.push(newSwatch);
                        matchingSwatch = newSwatch;
                    }

                    category.colorName = matchingSwatch.name;
                    modified = true;
                }
            }
        }

        // Also check triggers for inline colors
        if (settings.triggers) {
            for (const trigger of settings.triggers) {
                if (!trigger.colorName && trigger.color) {
                    let matchingSwatch = swatches.find(s => s.color === trigger.color && (!s.textColor || s.textColor === trigger.textColor));
                    if (!matchingSwatch) {
                        const swatchName = `Trigger: ${trigger.pattern}`;
                        let uniqueName = swatchName;
                        let counter = 1;
                        while (swatches.some(s => s.name === uniqueName)) {
                            uniqueName = `${swatchName} ${counter++}`;
                        }
                        const newSwatch = {
                            name: uniqueName,
                            color: trigger.color,
                            textColor: trigger.textColor || chooseTextColor(trigger.color)
                        };
                        if (!settings.userCustomSwatches) settings.userCustomSwatches = [];
                        settings.userCustomSwatches.push(newSwatch);
                        swatches.push(newSwatch);
                        matchingSwatch = newSwatch;
                    }
                    trigger.colorName = matchingSwatch.name;
                    modified = true;
                }
            }
        }

        if (modified) {
            await this.saveSettings();
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async openDayble() {
        const leaf = this.getOrCreateLeaf();
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
        void this.app.workspace.revealLeaf(leaf);
    }

    focusToday() {
        const view = this.getCalendarView();
        if (view) view.focusToday();
        else void this.openDayble();
    }

    getCalendarView(): DaybleCalendarView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        for (const leaf of leaves) {
            if (leaf.view instanceof DaybleCalendarView) return leaf.view;
        }
        return null;
    }

    getOrCreateLeaf(): WorkspaceLeaf {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length) return leaves[0];
        try {
            const leaf = this.app.workspace.getLeaf(true);
            if (leaf) return leaf;
        } catch { /* no tab group available */ }
        // Fallback: use the most-recently-active leaf or create one in the right sidebar
        return this.app.workspace.getLeaf(false)
            ?? (this.app.workspace as unknown as { getRightLeaf: (split: boolean) => WorkspaceLeaf }).getRightLeaf(false);
    }

    async ensureEntriesFolder() {
        const folder = this.settings.entriesFolder;
        if (!folder || folder.trim() === '') {
            return;
        }
        try {
            await this.app.vault.adapter.stat(folder);
        } catch {
            try {
                await this.app.vault.createFolder(folder);
            } catch {
                // Ignore folder exists error
            }
        }
    }

    private async replaceWithHomepage(leaf: WorkspaceLeaf) {
        try {
            await leaf.setViewState({ type: VIEW_TYPE, active: true });
        } catch { /* leaf may have been detached */ }
    }
}
