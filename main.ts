import { Plugin } from 'obsidian';
import ThemeCategorizerModal from './theme-categorizer-modal';

interface ThemeCategorizerSettings {
    themeCategories: { [themeName: string]: string[] };
    categoryColors: { [categoryName: string]: string };
    lastSelectedCategory: string | null;
}

const DEFAULT_SETTINGS: ThemeCategorizerSettings = {
    themeCategories: {},
    categoryColors: {},
    lastSelectedCategory: null
};

export default class ThemeCategorizerPlugin extends Plugin {
    settings: ThemeCategorizerSettings;

    async onload() {
        await this.loadSettings();
        
        this.addCommand({
            id: 'open-theme-categorizer',
            name: 'Open Theme Categorizer',
            callback: () => new ThemeCategorizerModal(
                this.app, 
                this.settings, 
                this.saveSettings.bind(this)
            ).open()
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
