import { Plugin, PluginSettingTab, Setting, App, Modal, TextComponent } from 'obsidian';
import ThemeCategorizerModal from './theme-categorizer-modal';

interface ThemeCategorizerSettings {
    themeCategories: { [themeName: string]: string[] };
    categoryColors: { [categoryName: string]: string };
}

const DEFAULT_SETTINGS: ThemeCategorizerSettings = {
    themeCategories: {},
    categoryColors: {}
};

export default class ThemeCategorizerPlugin extends Plugin {
    settings: ThemeCategorizerSettings;

    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: 'open-theme-categorizer',
            name: 'Open Theme Categorizer',
            callback: () => new ThemeCategorizerModal(this.app, this.settings).open()
        });
        this.addSettingTab(new ThemeCategorizerSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getInstalledThemes(): string[] {
        //@ts-ignore
        return [...Object.keys(this.app.customCss.themes || {}), ...(this.app.customCss.oldThemes || [])];
    }

    getAllCategories(): string[] {
        const categories = new Set<string>();
        Object.values(this.settings.themeCategories).forEach(cats => {
            cats.forEach(cat => categories.add(cat));
        });
        return Array.from(categories).sort();
    }

    addCategoryToTheme(theme: string, category: string) {
        if (!this.settings.themeCategories[theme]) {
            this.settings.themeCategories[theme] = [];
        }
        if (!this.settings.themeCategories[theme].includes(category)) {
            this.settings.themeCategories[theme].push(category);
            this.saveSettings();
        }
    }

    removeCategoryFromTheme(theme: string, category: string) {
        if (this.settings.themeCategories[theme]) {
            this.settings.themeCategories[theme] = this.settings.themeCategories[theme].filter(c => c !== category);
            if (this.settings.themeCategories[theme].length === 0) {
                delete this.settings.themeCategories[theme];
            }
            this.saveSettings();
        }
    }
}

class ThemeCategorizerSettingTab extends PluginSettingTab {
    plugin: ThemeCategorizerPlugin;

    constructor(app: App, plugin: ThemeCategorizerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Theme Categorizer Settings' });

        const themes = this.plugin.getInstalledThemes();
        if (themes.length === 0) {
            containerEl.createEl('p', { text: 'No themes installed.' });
            return;
        }

        themes.forEach(theme => {
            new Setting(containerEl)
                .setName(theme)
                .setDesc(this.getCategoriesDesc(theme))
                .addButton(button => button.setButtonText('Manage Categories').onClick(() => this.openCategoryManager(theme)));
        });
    }

    getCategoriesDesc(theme: string): string {
        const cats = this.plugin.settings.themeCategories[theme] || [];
        return cats.length > 0 ? `Categories: ${cats.join(', ')}` : 'No categories';
    }

    openCategoryManager(theme: string) {
        new CategoryManagerModal(this.app, this.plugin, theme).open();
    }
}

class CategoryManagerModal extends Modal {
    plugin: ThemeCategorizerPlugin;
    theme: string;

    constructor(app: App, plugin: ThemeCategorizerPlugin, theme: string) {
        super(app);
        this.plugin = plugin;
        this.theme = theme;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: `Manage categories for: ${this.theme}` });

        const currentCats = this.plugin.settings.themeCategories[this.theme] || [];
        const catContainer = contentEl.createDiv({ cls: 'category-list' });
        this.renderCategories(catContainer, currentCats);

        contentEl.createEl('h4', { text: 'Add Category' });
        const inputContainer = contentEl.createDiv();
        const input = new TextComponent(inputContainer);
        input.setPlaceholder('Category name');
        
        const addButton = inputContainer.createEl('button', { text: 'Add' });
        addButton.onclick = () => {
            const category = input.getValue().trim();
            if (category) {
                this.plugin.addCategoryToTheme(this.theme, category);
                input.setValue('');
                this.renderCategories(catContainer, this.plugin.settings.themeCategories[this.theme] || []);
            }
        };
    }

    renderCategories(container: HTMLElement, categories: string[]) {
        container.empty();
        if (categories.length === 0) {
            container.createEl('p', { text: 'No categories assigned', cls: 'muted' });
            return;
        }

        categories.forEach(cat => {
            const catEl = container.createDiv({ cls: 'category-item' });
            catEl.createSpan({ text: cat });
            const removeBtn = catEl.createEl('button', { text: '×', cls: 'category-remove' });
            removeBtn.onclick = () => {
                this.plugin.removeCategoryFromTheme(this.theme, cat);
                this.renderCategories(container, this.plugin.settings.themeCategories[this.theme] || []);
            };
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
