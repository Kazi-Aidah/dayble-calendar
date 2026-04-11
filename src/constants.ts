export const VIEW_TYPE = 'dayble-calendar-view';

export const timeToMinutes = (s: string): number => {
    if (!s) return 0;
    const parts = s.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return (h * 60) + m;
};
