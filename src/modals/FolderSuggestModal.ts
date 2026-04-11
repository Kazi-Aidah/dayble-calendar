import { App, FuzzySuggestModal } from 'obsidian';

export default class FolderSuggestModal extends FuzzySuggestModal<string> {
    folders: string[];
    onChoose: (folder: string) => void | Promise<void>;

    constructor(app: App, folders: string[], onChoose: (folder: string) => void | Promise<void>) {
        super(app);
        this.folders = folders;
        this.onChoose = onChoose;
    }

    getItems(): string[] {
        return this.folders;
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, _evt: MouseEvent | KeyboardEvent): void {
        void Promise.resolve(this.onChoose(item));
    }
}
