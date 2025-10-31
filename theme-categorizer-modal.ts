import { App, FuzzySuggestModal } from "obsidian";

interface ThemeCategorizerSettings {
    themeCategories: { [themeName: string]: string[] };
    categoryColors: { [categoryName: string]: string };
}

export default class ThemeCategorizerModal extends FuzzySuggestModal<string> {
    DEFAULT_THEME_KEY = "";
    DEFAULT_THEME_TEXT = "None";
    settings: ThemeCategorizerSettings;
    selectedCategory: string | null = null;

    initialTheme: string;
    previewing = false;

    constructor(app: App, settings: ThemeCategorizerSettings) {
        super(app);
        this.settings = settings;
        
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

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        this.previewing = false;
        this.setTheme(item);
    }

    setTheme(themeName: string) {
        //@ts-ignore
        this.app.customCss.setTheme(themeName);
    }
}
