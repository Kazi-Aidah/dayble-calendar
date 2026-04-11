import { App, TFile, getIconIds } from 'obsidian';

export function getIconIdsSafe(): string[] {
    try {
        const ids = getIconIds();
        if (ids && ids.length > 0) return ids;
    } catch { /* intentional */ }
    return ['calendar','clock','star','bookmark','flag','bell','check','pencil','book','zap'];
}

export function hexToRgb(hex: string): {r:number,g:number,b:number}|null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}

export function chooseTextColor(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return 'var(--text-normal)';
    const yiq = ((rgb.r*299)+(rgb.g*587)+(rgb.b*114))/1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
}

export function hexToRgba(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function renderMarkdown(text: string, element: HTMLElement, app?: App): void {
    // Simple markdown rendering: headings, bold, italic, links, code, strikethrough, highlight, blockquote, images
    // NOTE: We do NOT escape HTML to allow users to use HTML tags directly (e.g., <u>underline</u>)
    let html = text
        // Obsidian wiki-style images ![[image.png]]
        .replace(/!\[\[([^\]]+)\]\]/g, (match, filename) => {
            const imageUrl = app ? resolveImagePath(filename, app) : filename;
            return `<img src="${imageUrl}" alt="${filename}" class="dayble-embed-image">`;
        })
        // Markdown images ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            const imageUrl = app ? resolveImagePath(src, app) : src;
            return `<img src="${imageUrl}" alt="${alt}" class="dayble-embed-image">`;
        })
        // Headings #..######
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // Bold **text** and __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic *text* and _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough ~~text~~
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Highlight ==text==
        .replace(/==(.+?)==/g, '<mark>$1</mark>')
        // Blockquote lines starting with >
        .replace(/^&gt;[ \t]*(.+)$/gm, '<blockquote>$1</blockquote>')
        // Code `text` and ```blocks```
        .replace(/`([^`]+)`/g, '<code class="dayble-inline-code">$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre class="dayble-code-block"><code>$1</code></pre>')
        // Links [[target|alias]] and [text](url)
        .replace(/\[\[([^[\]]+)\]\]/g, (m, inner) => {
            const parts = String(inner).split('|');
            const target = parts[0];
            const alias = parts[1] || parts[0];
            return `<a class="internal-link dayble-internal-link" data-href="${target}">${alias}</a>`;
        })
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="dayble-external-link">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
    
    const range = document.createRange();
    range.selectNodeContents(element);
    element.replaceChildren(range.createContextualFragment(html));
}

export function resolveImagePath(imagePath: string, app: App): string {
    const raw = String(imagePath || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof TFile) return app.vault.getResourcePath(byPath);
    const files = app.vault.getFiles();
    const extTarget = target.endsWith('.md') ? target.slice(0, -3) : target;
    const found = files.find((f: TFile) => f.path.endsWith(target))
        || files.find((f: TFile) => f.name === target)
        || files.find((f: TFile) => f.basename === extTarget)
        || files.find((f: TFile) => f.path.endsWith(`${extTarget}.md`));
    if (found) return app.vault.getResourcePath(found);
    return target;
}

export function resolveNoteFile(app: App, linktext: string): TFile | null {
    const raw = String(linktext || '');
    const target = raw.split('|')[0].split('#')[0].trim();
    const withoutMd = target.endsWith('.md') ? target.slice(0, -3) : target;
    const byPath = app.vault.getFileByPath(target);
    if (byPath && byPath instanceof TFile) return byPath;
    const files = app.vault.getFiles();
    const found = files.find((f: TFile) => f.path.endsWith(target))
        || files.find((f: TFile) => f.name === target)
        || files.find((f: TFile) => f.basename === withoutMd)
        || files.find((f: TFile) => f.path.endsWith(`${withoutMd}.md`));
    return found || null;
}

export function randomId(): string {
    const anyCrypto = window.crypto as unknown as { randomUUID?: () => string };
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return 'ev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
