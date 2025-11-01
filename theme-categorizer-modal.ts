import { App, FuzzySuggestModal, FuzzyMatch, Menu, Notice, KeymapEventListener } from "obsidian";

interface ThemeCategorizerSettings {
    themeCategories: { [themeName: string]: string[] };
    categoryColors: { [categoryName: string]: string };
    lastSelectedCategory: string | null;
}

export default class ThemeCategorizerModal extends FuzzySuggestModal<string> {
    DEFAULT_THEME_KEY = "";
    DEFAULT_THEME_TEXT = "None";
    // v1.3.1 - Category deletion feature with X icons
    settings: ThemeCategorizerSettings;
    selectedCategory: string | null = null;
    saveSettings: () => Promise<void>;

    initialTheme: string;
    previewing = false;
    currentPreviewTheme: string | null = null;
    


    constructor(app: App, settings: ThemeCategorizerSettings, saveSettings: () => Promise<void>) {
        super(app);
        this.settings = settings;
        this.saveSettings = saveSettings;
        
        //@ts-ignore
        this.bgEl.setAttribute("style", "background-color: transparent");
        this.modalEl.classList.add("theme-categorizer-modal");

        // Add theme preview on arrow key navigation
        //@ts-ignore
        const originalArrowUpEvent = this.scope.keys.find((key) => key.key === "ArrowUp");
        //@ts-ignore
        const originalArrowDownEvent = this.scope.keys.find((key) => key.key === "ArrowDown");

        const wrapWithPreview = (originalFunc: KeymapEventListener, modal: ThemeCategorizerModal) => {
            return function(e: KeyboardEvent) {
                const oldPreviewTheme = modal.currentPreviewTheme;
                
                originalFunc(e, null);
                //@ts-ignore
                const selectedTheme = modal.chooser.values[modal.chooser.selectedItem].item;
                modal.currentPreviewTheme = selectedTheme;
                modal.setTheme(selectedTheme);
                modal.previewing = true;
                
                // Update button states without refreshing (to avoid chooser reset)
                modal.updatePreviewButtonStates(oldPreviewTheme, selectedTheme);
            }
        }

        if (originalArrowUpEvent) {
            originalArrowUpEvent.func = wrapWithPreview(originalArrowUpEvent.func, this);
        }
        if (originalArrowDownEvent) {
            originalArrowDownEvent.func = wrapWithPreview(originalArrowDownEvent.func, this);
        }
    }

    onOpen() {
        // Restore last selected category from settings BEFORE calling super.onOpen()
        // This ensures getItems() uses the correct filter when building initial list
        console.log('Theme Categorizer: onOpen() - lastSelectedCategory from settings:', this.settings.lastSelectedCategory);
        this.selectedCategory = this.settings.lastSelectedCategory;
        console.log('Theme Categorizer: onOpen() - selectedCategory set to:', this.selectedCategory);
        
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
        this.currentPreviewTheme = null;
    }

    addCategoryFilter() {
        const filterContainer = this.modalEl.createDiv({ cls: 'category-filter' });
        
        filterContainer.createEl('span', { text: 'Filter: ' });
        filterContainer.style.marginTop = '20px'; // Add spacing above category buttons
        filterContainer.style.marginBottom = '8px'; // Add spacing below category buttons
        filterContainer.style.marginLeft = '12px'; // Add spacing on left
        filterContainer.style.paddingTop = '12px'; // Extra padding for visual separation
        
        // "All" button
        const allBtn = filterContainer.createEl('button', { 
            text: 'All',
            cls: this.selectedCategory === null ? 'is-active' : ''
        });
        allBtn.style.marginRight = '4px';
        allBtn.onclick = async () => {
            console.log('Theme Categorizer: All button clicked');
            this.selectedCategory = null;
            this.settings.lastSelectedCategory = null;
            console.log('Theme Categorizer: Saving settings with lastSelectedCategory = null');
            await this.saveSettings();
            console.log('Theme Categorizer: Settings saved');
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
            btn.style.marginRight = '4px';
            btn.onclick = async () => {
                console.log('Theme Categorizer: Category button clicked:', cat);
                this.selectedCategory = cat;
                this.settings.lastSelectedCategory = cat;
                console.log('Theme Categorizer: Saving settings with lastSelectedCategory =', cat);
                await this.saveSettings();
                console.log('Theme Categorizer: Settings saved');
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
        // Just return theme name - categories rendered separately in renderSuggestion
        return item;
    }

    // Override renderSuggestion to add category management and preview buttons
    renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement) {
        
        // Skip buttons for "None" default theme
        if (match.item === this.DEFAULT_THEME_KEY) {
            el.createDiv({ text: this.getItemText(match.item) });
            return;
        }

        // Create container with flexbox layout
        const container = el.createDiv({ cls: 'theme-item-container' });
        container.style.display = 'flex';
        container.style.justifyContent = 'space-between';
        container.style.alignItems = 'center';
        container.style.width = '100%';
        
        // Left side container (theme name + categories)
        const leftContainer = container.createDiv({ cls: 'theme-item-left' });
        leftContainer.style.flex = '1';
        leftContainer.style.display = 'flex';
        leftContainer.style.flexWrap = 'wrap';
        leftContainer.style.alignItems = 'center';
        leftContainer.style.gap = '6px';
        
        // Theme name
        const nameEl = leftContainer.createDiv({ 
            text: this.getItemText(match.item),
            cls: 'theme-item-name'
        });
        nameEl.style.fontWeight = '500';
        
        // Categories as individual tags
        const cats = this.settings.themeCategories[match.item] || [];
        if (cats.length > 0) {
            const catContainer = leftContainer.createDiv({ cls: 'theme-categories' });
            catContainer.style.display = 'flex';
            catContainer.style.flexWrap = 'wrap';
            catContainer.style.gap = '4px';
            catContainer.style.alignItems = 'center';
            
            cats.forEach(cat => {
                const catTag = catContainer.createEl('span', { 
                    text: cat,
                    cls: 'theme-category-tag'
                });
                catTag.style.fontSize = '11px';
                catTag.style.padding = '2px 6px';
                catTag.style.borderRadius = '3px';
                // Force good contrast - semi-transparent gray that works on light and dark
                catTag.style.backgroundColor = 'rgba(128, 128, 128, 0.4)';
                catTag.style.color = 'rgba(200, 200, 200, 1)';
                catTag.style.border = '1px solid rgba(128, 128, 128, 0.5)';
                catTag.style.cursor = 'pointer';
                catTag.style.transition = 'all 0.15s ease';
                catTag.style.minWidth = '60px'; // Make tags more clickable
                catTag.style.textAlign = 'center';
                catTag.title = `Click to remove "${cat}" category`;
                
                // Hover effect - red with white text for maximum contrast
                catTag.addEventListener('mouseenter', () => {
                    catTag.style.backgroundColor = '#dc3545';
                    catTag.style.color = '#ffffff';
                    catTag.style.border = '1px solid #dc3545';
                    catTag.textContent = `× ${cat}`;
                });
                catTag.addEventListener('mouseleave', () => {
                    catTag.style.backgroundColor = 'rgba(128, 128, 128, 0.4)';
                    catTag.style.color = 'rgba(200, 200, 200, 1)';
                    catTag.style.border = '1px solid rgba(128, 128, 128, 0.5)';
                    catTag.textContent = cat;
                });
                
                // Click entire tag to remove category (not just X)
                catTag.addEventListener('click', async (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    // Remove category
                    this.settings.themeCategories[match.item] = 
                        this.settings.themeCategories[match.item].filter(c => c !== cat);
                    await this.saveSettings();
                    
                    // Get current scroll position and selected item before refresh
                    //@ts-ignore
                    const scrollContainer = this.modalEl.querySelector('.prompt-results');
                    const scrollTop = scrollContainer?.scrollTop || 0;
                    //@ts-ignore
                    const selectedIndex = this.chooser.selectedItem;
                    
                    this.refreshSuggestions();
                    
                    // Restore scroll position and selection
                    if (scrollContainer) {
                        scrollContainer.scrollTop = scrollTop;
                    }
                    //@ts-ignore
                    if (selectedIndex >= 0) {
                        //@ts-ignore
                        this.chooser.setSelectedItem(selectedIndex);
                    }
                    
                    new Notice(`Removed "${cat}" from ${match.item}`);
                });
            });
        }
        
        // Button container
        const buttonContainer = container.createDiv({ cls: 'theme-buttons' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '4px';
        
        
        // Preview/Apply button - wider and more prominent
        const previewBtn = buttonContainer.createEl('button', { 
            cls: 'theme-preview-btn'
        });
        // Store theme name as data attribute for easy lookup
        previewBtn.setAttribute('data-theme', match.item);
        previewBtn.style.cursor = 'pointer';
        previewBtn.style.padding = '4px 12px';
        previewBtn.style.fontSize = '13px';
        previewBtn.style.borderRadius = '4px';
        previewBtn.style.border = '1px solid var(--background-modifier-border)';
        previewBtn.style.transition = 'all 0.15s ease';
        
        // Check if this theme is currently being previewed
        const isPreviewing = this.currentPreviewTheme === match.item;
        
        if (isPreviewing) {
            // APPLY mode - clear distinction
            previewBtn.textContent = '✓ Apply';
            previewBtn.title = 'Apply this theme and close';
            previewBtn.style.backgroundColor = '#4CAF50';
            previewBtn.style.color = 'white';
            previewBtn.style.border = '1px solid #4CAF50';
            previewBtn.style.fontWeight = '600';
        } else {
            // PREVIEW mode
            previewBtn.textContent = '👁 Preview';
            previewBtn.title = 'Preview this theme';
            previewBtn.style.backgroundColor = 'var(--background-primary)';
            previewBtn.style.color = 'var(--text-normal)';
            previewBtn.style.fontWeight = '400';
        }
        
        // Hover effect
        previewBtn.addEventListener('mouseenter', () => {
            if (isPreviewing) {
                previewBtn.style.backgroundColor = '#45a049';
            } else {
                previewBtn.style.backgroundColor = 'var(--background-modifier-hover)';
            }
        });
        previewBtn.addEventListener('mouseleave', () => {
            if (isPreviewing) {
                previewBtn.style.backgroundColor = '#4CAF50';
            } else {
                previewBtn.style.backgroundColor = 'var(--background-primary)';
            }
        });
        
        // Click handler for preview/apply button
        previewBtn.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            if (isPreviewing) {
                // Apply and close
                this.previewing = false;
                this.currentPreviewTheme = null;
                this.setTheme(match.item);
                this.close();
            } else {
                // Store old preview theme before changing
                const oldPreviewTheme = this.currentPreviewTheme;
                
                // Preview this theme
                this.currentPreviewTheme = match.item;
                this.setTheme(match.item);
                this.previewing = true;
                
                // Get current scroll position before refresh
                //@ts-ignore
                const scrollContainer = this.modalEl.querySelector('.prompt-results');
                const scrollTop = scrollContainer?.scrollTop || 0;
                
                // Find the index of this item in the current list
                //@ts-ignore
                const itemIndex = this.chooser.values.findIndex(v => v.item === match.item);
                
                // Refresh suggestions to update all button states AND borders
                this.refreshSuggestions();
                
                // Restore scroll position and selection
                if (itemIndex >= 0) {
                    //@ts-ignore
                    this.chooser.setSelectedItem(itemIndex);
                    if (scrollContainer) {
                        scrollContainer.scrollTop = scrollTop;
                    }
                }
            }
        });
        
        // Category menu button (three dots)
        const menuBtn = buttonContainer.createEl('span', { 
            text: '⋮',
            cls: 'theme-category-btn'
        });
        menuBtn.style.cursor = 'pointer';
        menuBtn.style.padding = '0 6px';
        menuBtn.style.fontSize = '18px';
        menuBtn.style.opacity = '0.5';
        menuBtn.title = 'Manage categories';
        
        // Hover effect for menu button
        menuBtn.addEventListener('mouseenter', () => {
            menuBtn.style.opacity = '1';
        });
        menuBtn.addEventListener('mouseleave', () => {
            menuBtn.style.opacity = '0.5';
        });
        
        // Click handler for menu button
        menuBtn.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            // Preview this theme when opening category menu
            const oldPreviewTheme = this.currentPreviewTheme;
            this.currentPreviewTheme = match.item;
            this.setTheme(match.item);
            this.previewing = true;
            this.updatePreviewButtonStates(oldPreviewTheme, match.item);
            
            this.showContextMenu(event, match.item);
        });
    }

    showContextMenu(event: MouseEvent, themeName: string) {
        const menu = new Menu();
        
        // Don't auto-close menu on item click - let user select multiple categories
        //@ts-ignore
        menu.dom.addEventListener('click', (e: MouseEvent) => {
            // Only close if clicking outside menu items or on specific close actions
            if ((e.target as HTMLElement).classList.contains('menu-item-icon') ||
                (e.target as HTMLElement).textContent?.includes('Add new category') ||
                (e.target as HTMLElement).textContent?.includes('Remove all')) {
                // Let these close normally
            } else {
                // Prevent menu from closing
                e.stopPropagation();
            }
        });
        
        // Skip context menu for "None" default theme
        if (themeName === this.DEFAULT_THEME_KEY) {
            return;
        }

        const currentCategories = this.settings.themeCategories[themeName] || [];
        const allCategories = this.getAllCategories();

        // Section: Add existing categories (no checkmarks, only adds if not present)
        if (allCategories.length > 0) {
            menu.addItem((item) => {
                item.setTitle("Add Category:");
                item.setDisabled(true);
            });

            allCategories.forEach(category => {
                menu.addItem((item) => {
                    const menuItem = item.setTitle(category);
                    
                    // Add X button to delete category entirely
                    menuItem.setIcon('cross');
                    
                    menuItem.onClick(async () => {
                        // Only add - never remove
                        if (!this.settings.themeCategories[themeName]) {
                            this.settings.themeCategories[themeName] = [];
                        }
                        
                        // Add only if not already present
                        if (!this.settings.themeCategories[themeName].includes(category)) {
                            this.settings.themeCategories[themeName].push(category);
                            await this.saveSettings();
                            
                            // Get current scroll position and selected item before refresh
                            //@ts-ignore
                            const scrollContainer = this.modalEl.querySelector('.prompt-results');
                            const scrollTop = scrollContainer?.scrollTop || 0;
                            //@ts-ignore
                            const selectedIndex = this.chooser.selectedItem;
                            
                            this.refreshSuggestions();
                            
                            // Restore scroll position and selection
                            if (scrollContainer) {
                                scrollContainer.scrollTop = scrollTop;
                            }
                            //@ts-ignore
                            if (selectedIndex >= 0) {
                                //@ts-ignore
                                this.chooser.setSelectedItem(selectedIndex);
                            }
                            
                            new Notice(`Added "${category}" to ${themeName}`);
                        }
                        
                        // Don't close menu - let user continue selecting
                        return false;
                    });
                    
                    // Clicking the X icon deletes the category globally
                    //@ts-ignore
                    const iconEl = item.dom.querySelector('.menu-item-icon');
                    if (iconEl) {
                        iconEl.addEventListener('click', async (e: MouseEvent) => {
                            console.log('X icon clicked for category:', category);
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            // Confirm deletion
                            const confirmed = confirm(`Delete category "${category}" from ALL themes?`);
                            if (!confirmed) return;
                            
                            // Remove category from all themes
                            Object.keys(this.settings.themeCategories).forEach(theme => {
                                this.settings.themeCategories[theme] = 
                                    this.settings.themeCategories[theme].filter(c => c !== category);
                            });
                            
                            await this.saveSettings();
                            
                            // Get current scroll position and selected item before refresh
                            //@ts-ignore
                            const scrollContainer = this.modalEl.querySelector('.prompt-results');
                            const scrollTop = scrollContainer?.scrollTop || 0;
                            //@ts-ignore
                            const selectedIndex = this.chooser.selectedItem;
                            
                            // Close menu
                            menu.hide();
                            
                            this.refreshSuggestions();
                            
                            // Restore scroll position and selection
                            if (scrollContainer) {
                                scrollContainer.scrollTop = scrollTop;
                            }
                            //@ts-ignore
                            if (selectedIndex >= 0) {
                                //@ts-ignore
                                this.chooser.setSelectedItem(selectedIndex);
                            }
                            
                            new Notice(`Deleted category "${category}" from all themes`);
                        });
                    }
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



    updatePreviewButtonStates(oldTheme: string | null, newTheme: string) {
        console.log('updatePreviewButtonStates called:', { oldTheme, newTheme });
        
        // Find all preview buttons by data-theme attribute
        const allButtons = this.modalEl.querySelectorAll('.theme-preview-btn');
        
        console.log('Found buttons:', allButtons.length);
        
        allButtons.forEach((btn) => {
            const themeName = btn.getAttribute('data-theme');
            if (!themeName) return;
            
            if (themeName === newTheme) {
                console.log('Setting green button for:', themeName);
                // This is now the previewed theme - make it green Apply button
                btn.textContent = '✓ Apply';
                btn.setAttribute('title', 'Apply this theme and close');
                (btn as HTMLElement).style.backgroundColor = '#4CAF50';
                (btn as HTMLElement).style.color = 'white';
                (btn as HTMLElement).style.border = '1px solid #4CAF50';
                (btn as HTMLElement).style.fontWeight = '600';
            } else if (oldTheme && themeName === oldTheme) {
                console.log('Reverting button for:', themeName);
                // This was the old preview - revert to Preview button
                btn.textContent = '👁 Preview';
                btn.setAttribute('title', 'Preview this theme');
                (btn as HTMLElement).style.backgroundColor = 'var(--background-primary)';
                (btn as HTMLElement).style.color = 'var(--text-normal)';
                (btn as HTMLElement).style.border = '1px solid var(--background-modifier-border)';
                (btn as HTMLElement).style.fontWeight = '400';
            }
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
        this.currentPreviewTheme = null;
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
