import { App, FuzzySuggestModal, TFile } from 'obsidian';

export default class ImageSuggestModal extends FuzzySuggestModal<TFile> {
    onChoose: (file: TFile) => void | Promise<void>;

    constructor(app: App, onChoose: (file: TFile) => void | Promise<void>) {
        super(app);
        this.onChoose = onChoose;
        this.setPlaceholder('Search for an image...');
    }

    getItems(): TFile[] {
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        return this.app.vault.getFiles().filter(f =>
            imageExts.includes(f.extension.toLowerCase())
        );
    }

    getItemText(file: TFile): string {
        return file.path;
    }

    onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
        void Promise.resolve(this.onChoose(file));
    }
}
