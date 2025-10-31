import { App, FuzzySuggestModal, FuzzyMatch, Menu, Notice } from "obsidian";

interface ThemeCategorizerSettings {
    themeCategories: { [themeName: string]: string[] };
    categoryColors: { [categoryName: string]: string };
}

export default class ThemeCategorizerModal extends FuzzySuggestModal<string> {
    DEFAULT_THEME_KEY = "";
    DEFAULT_THEME_TEXT = "None";
    settings: ThemeCategorizerSettings;
    selectedCategory: string | null = null;
    saveSettings: () => Promise<void>;

    initialTheme: string;
    previewing = false;

    constructor(app: App, settings: ThemeCategorizerSettings, saveSettings: () => Promise<void>) {
        super(app);
        this.settings = settings;
        this.saveSettings = saveSettings;
        
        //@ts-ignore
        this.bgEl.setAttribute("style", "background-color: transparent");
        this.modalEl.classList.add("theme-categorizer-modal");
    }

    onOpen() {
        super.onOpen();
        
        // Add category filter UI at top of modal
        this.addCategoryFilter();
        
        //@ts-ignore
        this.initialTheme = this.app.customCss.theme;
        //@ts-ignore
        const currentIndex = this.getItems().findIndex(theme => theme === this.app.customCss.theme);
        if (currentIndex >= 0) {
            //@ts-ignore
            this.chooser.setSelectedItem(currentIndex);
            //@ts-ignore
            this.chooser.suggestions[this.chooser.selectedItem]?.scrollIntoViewIfNeeded();
        }
    }

    onClose() {
        super.onClose();
        if (this.previewing) {
            this.setTheme(this.initialTheme);
        }
    }

    addCategoryFilter() {
        const filterContainer = this.modalEl.createDiv({ cls: 'category-filter' });
        filterContainer.createEl('span', { text: 'Filter: ' });
        
        // "All" button
        const allBtn = filterContainer.createEl('button', { 
            text: 'All',
            cls: this.selectedCategory === null ? 'is-active' : ''
        });
        allBtn.onclick = () => {
            this.selectedCategory = null;
            this.updateCategoryButtons();
            //@ts-ignore
            this.updateSuggestions();
        };

        // Category buttons
        const categories = this.getAllCategories();
        categories.forEach(cat => {
            const btn = filterContainer.createEl('button', { 
                text: cat,
                cls: this.selectedCategory === cat ? 'is-active' : ''
            });
            btn.onclick = () => {
                this.selectedCategory = cat;
                this.updateCategoryButtons();
                //@ts-ignore
                this.updateSuggestions();
            };
        });
    }

    updateCategoryButtons() {
        const buttons = this.modalEl.querySelectorAll('.category-filter button');
        buttons.forEach((btn, idx) => {
            btn.classList.remove('is-active');
            if (idx === 0 && this.selectedCategory === null) {
                btn.classList.add('is-active');
            } else {
                const categories = this.getAllCategories();
                if (btn.textContent === this.selectedCategory) {
                    btn.classList.add('is-active');
                }
            }
        });
    }

    getAllCategories(): string[] {
        const categories = new Set<string>();
        Object.values(this.settings.themeCategories).forEach(cats => {
            cats.forEach(cat => categories.add(cat));
        });
        return Array.from(categories).sort();
    }

    getItems(): string[] {
        //@ts-ignore
        let themes = [this.DEFAULT_THEME_KEY, ...Object.keys(this.app.customCss.themes || {}), ...(this.app.customCss.oldThemes || [])];
        
        // Filter by selected category
        if (this.selectedCategory) {
            themes = themes.filter(theme => {
                if (theme === this.DEFAULT_THEME_KEY) return true;
                const cats = this.settings.themeCategories[theme] || [];
                return cats.includes(this.selectedCategory!);
            });
        }
        
        return themes;
    }

    getItemText(item: string): string {
        if (item === this.DEFAULT_THEME_KEY) {
            return this.DEFAULT_THEME_TEXT;
        }
        
        // Show categories in theme name
        const cats = this.settings.themeCategories[item] || [];
        if (cats.length > 0) {
            return `${item} [${cats.join(', ')}]`;
        }
        return item;
    }

    // Override renderSuggestion to add right-click handler
    renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement) {
        // Default rendering - show theme name with categories
        el.createDiv({ text: this.getItemText(match.item) });
        
        // Add right-click context menu handler with capture phase
        el.addEventListener('contextmenu', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.showContextMenu(event, match.item);
            return false;
        }, true);
        
        // Also prevent mousedown on right-click from triggering selection
        el.addEventListener('mousedown', (event: MouseEvent) => {
            if (event.button === 2) { // Right mouse button
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return false;
            }
        }, true);
    }

    showContextMenu(event: MouseEvent, themeName: string) {
        const menu = new Menu();
        
        // Skip context menu for "None" default theme
        if (themeName === this.DEFAULT_THEME_KEY) {
            return;
        }

        const currentCategories = this.settings.themeCategories[themeName] || [];
        const allCategories = this.getAllCategories();

        // Section: Toggle existing categories
        if (allCategories.length > 0) {
            menu.addItem((item) => {
                item.setTitle("Categories:");
                item.setDisabled(true);
            });

            allCategories.forEach(category => {
                const isActive = currentCategories.includes(category);
                menu.addItem((item) => {
                    item
                        .setTitle(`${isActive ? '✓ ' : ''}${category}`)
                        .setIcon(isActive ? 'checkbox-glyph' : 'circle')
                        .onClick(async () => {
                            if (isActive) {
                                // Remove category
                                this.settings.themeCategories[themeName] = currentCategories.filter(c => c !== category);
                            } else {
                                // Add category
                                if (!this.settings.themeCategories[themeName]) {
                                    this.settings.themeCategories[themeName] = [];
                                }
                                this.settings.themeCategories[themeName].push(category);
                            }
                            await this.saveSettings();
                            this.refreshSuggestions();
                        });
                });
            });

            menu.addSeparator();
        }

        // Add new category
        menu.addItem((item) => {
            item
                .setTitle("Add new category...")
                .setIcon('plus')
                .onClick(async () => {
                    // Close context menu and prompt for new category
                    const newCategory = await this.promptForCategory();
                    if (newCategory && newCategory.trim()) {
                        if (!this.settings.themeCategories[themeName]) {
                            this.settings.themeCategories[themeName] = [];
                        }
                        if (!this.settings.themeCategories[themeName].includes(newCategory.trim())) {
                            this.settings.themeCategories[themeName].push(newCategory.trim());
                            await this.saveSettings();
                            this.refreshSuggestions();
                            new Notice(`Added category "${newCategory.trim()}" to ${themeName}`);
                        } else {
                            new Notice(`Theme already has category "${newCategory.trim()}"`);
                        }
                    }
                });
        });

        // Remove all categories
        if (currentCategories.length > 0) {
            menu.addSeparator();
            menu.addItem((item) => {
                item
                    .setTitle("Remove all categories")
                    .setIcon('trash')
                    .onClick(async () => {
                        this.settings.themeCategories[themeName] = [];
                        await this.saveSettings();
                        this.refreshSuggestions();
                        new Notice(`Removed all categories from ${themeName}`);
                    });
            });
        }

        menu.showAtMouseEvent(event);
    }

    async promptForCategory(): Promise<string | null> {
        return new Promise((resolve) => {
            const promptModal = new CategoryPromptModal(this.app, (category) => {
                resolve(category);
            });
            promptModal.open();
        });
    }

    refreshSuggestions() {
        // Refresh the category filter buttons
        const oldFilter = this.modalEl.querySelector('.category-filter');
        if (oldFilter) {
            oldFilter.remove();
        }
        this.addCategoryFilter();

        // Refresh the suggestion list
        //@ts-ignore
        this.updateSuggestions();
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        this.previewing = false;
        this.setTheme(item);
    }

    setTheme(themeName: string) {
        //@ts-ignore
        this.app.customCss.setTheme(themeName);
    }
}

// Simple modal to prompt for category name
class CategoryPromptModal extends Modal {
    onSubmit: (category: string | null) => void;
    inputEl: HTMLInputElement;

    constructor(app: App, onSubmit: (category: string | null) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: 'Add new category' });
        
        this.inputEl = contentEl.createEl('input', { 
            type: 'text',
            placeholder: 'Category name'
        });
        this.inputEl.focus();

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        const submitBtn = buttonContainer.createEl('button', { 
            text: 'Add',
            cls: 'mod-cta'
        });
        submitBtn.onclick = () => {
            this.onSubmit(this.inputEl.value);
            this.close();
        };

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => {
            this.onSubmit(null);
            this.close();
        };

        // Submit on Enter key
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.onSubmit(this.inputEl.value);
                this.close();
            } else if (e.key === 'Escape') {
                this.onSubmit(null);
                this.close();
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Import Modal class
import { Modal } from "obsidian";
