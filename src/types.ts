export interface EventRecurrence {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    monthDate?: number;
    startDate?: string;
    endDate?: string;
    monthlyMode?: 'days' | 'date';
}

export interface DaybleEvent {
    id: string;
    title: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    time?: string;
    description?: string;
    icon?: string;
    completed?: boolean;
    pinned?: boolean;
    color?: string; // user-set color (hex)
    textColor?: string; // user-set text color (hex)
    colorName?: string; // swatch name
    categoryId?: string;
    stateId?: string;
    effect?: string;
    animation?: string;
    animation2?: string;
    recurrence?: EventRecurrence;
    isOccurrence?: boolean;
    settings?: {
        titleAlign?: 'left' | 'center' | 'right' | 'center-left';
        descAlign?: 'left' | 'center' | 'right' | 'center-left';
        layout?: string;
    };
}

export interface EventCategory {
    id: string;
    name: string;
    bgColor: string;
    textColor: string;
    colorName?: string;
    effect: string;
    animation: string;
    animation2: string;
    icon?: string;
}

export interface EventState {
    id: string;
    name: string;
    icon: string;
    colorName: string;
    effect: string;
    animation: string;
    animation2: string;
    categoryId?: string;
}

export interface DaybleSettings {
    weekStartDay: number;
    entriesFolder: string;
    iconPlacement?: 'left' | 'right' | 'none' | 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';
    eventTitleAlign?: 'left' | 'center' | 'right' | 'center-left';
    eventDescAlign?: 'left' | 'center' | 'right' | 'center-left';
    timeFormat?: '24h' | '12h' | 'system';
    holderOpen?: boolean;
    holderWidth?: number; // in pixels
    weeklyNotesHeight?: number; // in pixels
    eventCategories?: EventCategory[];
    preferUserColors?: boolean; // prefer user-set event colors over category colors
    eventBgOpacity?: number; // 0-1, controls background opacity
    eventBorderWidth?: number; // 0-5px, controls border thickness
    eventBorderRadius?: number; // px, controls border radius
    eventBorderOpacity?: number; // 0-1, controls border color opacity (for colored events)
    dayCellRadius?: number; // px, controls day cell border radius
    eventVerticalPadding?: number; // px, controls event vertical padding
    colorSwatchPosition?: 'under-title' | 'under-description' | 'none'; // position of color swatches in modal
    onlyAnimateToday?: boolean;
    completeBehavior?: 'none' | 'dim' | 'strikethrough' | 'hide' | 'color';
    completeColor?: string;
    customSwatchesEnabled?: boolean;
    replaceDefaultSwatches?: boolean;
    swatches?: { name: string, color: string, textColor?: string }[];
    userCustomSwatches?: { name: string, color: string, textColor?: string }[];
    defaultColorsFolded?: boolean;
    customSwatchesFolded?: boolean;
    dayCellMaxHeight?: number;
    dayCellMinWidth?: number;
    holderPlacement?: 'left' | 'right' | 'hidden';
    calendarWeekActive?: boolean;
    calendarView?: 'Month' | 'Week' | '3day' | 'Day' | 'Agenda';
    triggers?: { id?: string, pattern: string, categoryId: string, color?: string, textColor?: string, colorName?: string, icon?: string }[];
    weeklyNotesEnabled?: boolean;
    scrollToCurrentTime?: boolean;
    showCurrentTimeLine?: boolean;
    todayModalSplitView?: boolean;
    tooltipEnabled?: boolean;
    showCopyTextOption?: boolean;
    showCopyCalendarIcon?: boolean;
    showSaveImageIcon?: boolean;
    saveImageFolder?: string;
    onlyShowPinnedEventsMonth?: boolean;
    onlyShowPinnedEventsWeek?: boolean;
    onlyShowPinnedEventsAgenda?: boolean;
    defaultEventColorName?: string;
    eventStates?: EventState[];
    weekTitleFormat?: 'month_year' | 'week_number' | 'full_range' | 'short_range';
    dayTitleFormat?: string;
    threeDayTitleFormat?: 'month_year' | 'full_range' | 'short_range' | 'full_range_hyphen' | 'short_range_hyphen' | 'd_mmmm_range' | 'd_mmm_range';
    threeDayDateFormat?: string;
    agendaTitleFormat?: string;
    agendaDateFormat?: string;
    dimPastEvents?: number;
    soundMarkComplete?: string;
    soundNextEvent?: string;
    soundMarkCompleteName?: string;
    soundNextEventName?: string;
    enableFiveMinIntervals?: boolean;
    replaceHomepageWithSidecards?: boolean;
}

export const DEFAULT_SETTINGS: DaybleSettings = {
    weekStartDay: 0,
    entriesFolder: '',
    iconPlacement: 'left',
    eventTitleAlign: 'center-left',
    eventDescAlign: 'center-left',
    timeFormat: 'system',
    holderOpen: true,
    weeklyNotesHeight: 200,
    preferUserColors: false,
    eventBgOpacity: 0.50,
    eventBorderWidth: 2,
    eventBorderRadius: 6,
    eventBorderOpacity: 0.25,
    dayCellRadius: 8,
    eventVerticalPadding: 9,
    colorSwatchPosition: 'under-title',
    onlyAnimateToday: false,
    completeBehavior: 'dim',
    completeColor: '',
    customSwatchesEnabled: false,
    replaceDefaultSwatches: false,
    defaultColorsFolded: true,
    customSwatchesFolded: false,
    dayCellMaxHeight: 0,
    dayCellMinWidth: 0,
    holderPlacement: 'left',
    calendarWeekActive: false,
    calendarView: 'Month',
    weeklyNotesEnabled: false,
    scrollToCurrentTime: true,
    showCurrentTimeLine: true,
    todayModalSplitView: true,
    tooltipEnabled: true,
    showCopyTextOption: false,
    showCopyCalendarIcon: false,
    showSaveImageIcon: false,
    saveImageFolder: '',
    onlyShowPinnedEventsMonth: false,
    onlyShowPinnedEventsWeek: false,
    onlyShowPinnedEventsAgenda: false,
    defaultEventColorName: '',
    eventStates: [],
    weekTitleFormat: 'month_year',
    dayTitleFormat: 'dddd, D MMMM',
    threeDayTitleFormat: 'full_range',
    threeDayDateFormat: 'ddd D',
    agendaTitleFormat: 'MMMM YYYY',
    agendaDateFormat: 'dddd, D MMMM',
    dimPastEvents: 0.75,
    soundMarkComplete: '',
    soundNextEvent: '',
    soundMarkCompleteName: '',
    soundNextEventName: '',
    enableFiveMinIntervals: true,
    replaceHomepageWithSidecards: false,
    swatches: [
        { name: 'Red',       color: '#952237', textColor: '#e9b7c1' },
        { name: 'Orange',    color: '#ae581e', textColor: '#eec7ad' },
        { name: 'Amber',     color: '#a97714', textColor: '#e8d7ad' },
        { name: 'Green',     color: '#1d9356', textColor: '#b2dbc8' },
        { name: 'Teal',      color: '#1d9993', textColor: '#a9d9d6' },
        { name: 'Blue',      color: '#24709f', textColor: '#b2d2ea' },
        { name: 'Dark Blue', color: '#25499d', textColor: '#b7c4ea' },
        { name: 'Indigo',    color: '#353597', textColor: '#c1c1ea' },
        { name: 'Purple',    color: '#5d33a1', textColor: '#d4c4ea' },
        { name: 'Violet',    color: '#77328e', textColor: '#e0c4ea' },
        { name: 'Magenta',   color: '#9d2383', textColor: '#eab3de' },
        { name: 'Hot Pink',  color: '#a42661', textColor: '#eab3cc' },
        { name: 'Brown',     color: '#653c26', textColor: '#d8c6bb' },
        { name: 'Gray',      color: '#515d6b', textColor: '#d5d9de' }
    ],
    userCustomSwatches: [],
    eventCategories: [],
    triggers: []
};
