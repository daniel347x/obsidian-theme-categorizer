'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class ThemeCategorizerModal extends obsidian.FuzzySuggestModal {
    constructor(app, settings, saveSettings) {
        super(app);
        this.DEFAULT_THEME_KEY = "";
        this.DEFAULT_THEME_TEXT = "None";
        this.selectedCategory = null;
        this.previewing = false;
        this.currentPreviewTheme = null;
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
        const wrapWithPreview = (originalFunc, modal) => {
            return function (e) {
                const oldPreviewTheme = modal.currentPreviewTheme;
                originalFunc(e, {});
                //@ts-ignore
                const selectedTheme = modal.chooser.values[modal.chooser.selectedItem].item;
                modal.currentPreviewTheme = selectedTheme;
                modal.setTheme(selectedTheme);
                modal.previewing = true;
                // Update button states without refreshing (to avoid chooser reset)
                modal.updatePreviewButtonStates(oldPreviewTheme, selectedTheme);
            };
        };
        if (originalArrowUpEvent) {
            originalArrowUpEvent.func = wrapWithPreview(originalArrowUpEvent.func, this);
        }
        if (originalArrowDownEvent) {
            originalArrowDownEvent.func = wrapWithPreview(originalArrowDownEvent.func, this);
        }
    }
    onOpen() {
        var _a;
        console.log('Theme Categorizer v2.0.7 (Rollup Build Test - Nov 13, 2025): Modal opened.');
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
            (_a = this.chooser.suggestions[this.chooser.selectedItem]) === null || _a === void 0 ? void 0 : _a.scrollIntoViewIfNeeded();
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
        allBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            console.log('Theme Categorizer: All button clicked');
            this.selectedCategory = null;
            this.settings.lastSelectedCategory = null;
            console.log('Theme Categorizer: Saving settings with lastSelectedCategory = null');
            yield this.saveSettings();
            console.log('Theme Categorizer: Settings saved');
            this.updateCategoryButtons();
            //@ts-ignore
            this.updateSuggestions();
        });
        // Category buttons
        const categories = this.getAllCategories();
        categories.forEach(cat => {
            const btn = filterContainer.createEl('button', {
                text: cat,
                cls: this.selectedCategory === cat ? 'is-active' : ''
            });
            btn.style.marginRight = '4px';
            btn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                console.log('Theme Categorizer: Category button clicked:', cat);
                this.selectedCategory = cat;
                this.settings.lastSelectedCategory = cat;
                console.log('Theme Categorizer: Saving settings with lastSelectedCategory =', cat);
                yield this.saveSettings();
                console.log('Theme Categorizer: Settings saved');
                this.updateCategoryButtons();
                //@ts-ignore
                this.updateSuggestions();
            });
        });
    }
    updateCategoryButtons() {
        const buttons = this.modalEl.querySelectorAll('.category-filter button');
        buttons.forEach((btn, idx) => {
            btn.classList.remove('is-active');
            if (idx === 0 && this.selectedCategory === null) {
                btn.classList.add('is-active');
            }
            else {
                this.getAllCategories();
                if (btn.textContent === this.selectedCategory) {
                    btn.classList.add('is-active');
                }
            }
        });
    }
    getAllCategories() {
        const categories = new Set();
        Object.values(this.settings.themeCategories).forEach(cats => {
            cats.forEach(cat => categories.add(cat));
        });
        return Array.from(categories).sort();
    }
    getItems() {
        //@ts-ignore
        let themes = [this.DEFAULT_THEME_KEY, ...Object.keys(this.app.customCss.themes || {}), ...(this.app.customCss.oldThemes || [])];
        // Filter by selected category
        if (this.selectedCategory) {
            themes = themes.filter(theme => {
                if (theme === this.DEFAULT_THEME_KEY)
                    return true;
                const cats = this.settings.themeCategories[theme] || [];
                return cats.includes(this.selectedCategory);
            });
        }
        return themes;
    }
    getItemText(item) {
        if (item === this.DEFAULT_THEME_KEY) {
            return this.DEFAULT_THEME_TEXT;
        }
        // Just return theme name - categories rendered separately in renderSuggestion
        return item;
    }
    // Override renderSuggestion to add category management and preview buttons
    renderSuggestion(match, el) {
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
                catTag.addEventListener('click', (event) => __awaiter(this, void 0, void 0, function* () {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    // Remove category
                    this.settings.themeCategories[match.item] =
                        this.settings.themeCategories[match.item].filter(c => c !== cat);
                    yield this.saveSettings();
                    // Get current scroll position and selected item before refresh
                    //@ts-ignore
                    const scrollContainer = this.modalEl.querySelector('.prompt-results');
                    const scrollTop = (scrollContainer === null || scrollContainer === void 0 ? void 0 : scrollContainer.scrollTop) || 0;
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
                    new obsidian.Notice(`Removed "${cat}" from ${match.item}`);
                }));
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
        }
        else {
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
            }
            else {
                previewBtn.style.backgroundColor = 'var(--background-modifier-hover)';
            }
        });
        previewBtn.addEventListener('mouseleave', () => {
            if (isPreviewing) {
                previewBtn.style.backgroundColor = '#4CAF50';
            }
            else {
                previewBtn.style.backgroundColor = 'var(--background-primary)';
            }
        });
        // Click handler for preview/apply button
        previewBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (isPreviewing) {
                // Apply and close
                this.previewing = false;
                this.currentPreviewTheme = null;
                this.setTheme(match.item);
                this.close();
            }
            else {
                // Store old preview theme before changing
                this.currentPreviewTheme;
                // Preview this theme
                this.currentPreviewTheme = match.item;
                this.setTheme(match.item);
                this.previewing = true;
                // Get current scroll position before refresh
                //@ts-ignore
                const scrollContainer = this.modalEl.querySelector('.prompt-results');
                const scrollTop = (scrollContainer === null || scrollContainer === void 0 ? void 0 : scrollContainer.scrollTop) || 0;
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
        menuBtn.addEventListener('click', (event) => {
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
    showContextMenu(event, themeName) {
        const menu = new obsidian.Menu();
        // Don't auto-close menu on item click - let user select multiple categories
        //@ts-ignore
        menu.dom.addEventListener('click', (e) => {
            var _a, _b;
            // Only close if clicking outside menu items or on specific close actions
            if (e.target.classList.contains('menu-item-icon') ||
                ((_a = e.target.textContent) === null || _a === void 0 ? void 0 : _a.includes('Add new category')) ||
                ((_b = e.target.textContent) === null || _b === void 0 ? void 0 : _b.includes('Remove all'))) ;
            else {
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
                    menuItem.onClick(() => __awaiter(this, void 0, void 0, function* () {
                        // Only add - never remove
                        if (!this.settings.themeCategories[themeName]) {
                            this.settings.themeCategories[themeName] = [];
                        }
                        // Add only if not already present
                        if (!this.settings.themeCategories[themeName].includes(category)) {
                            this.settings.themeCategories[themeName].push(category);
                            yield this.saveSettings();
                            // Get current scroll position and selected item before refresh
                            //@ts-ignore
                            const scrollContainer = this.modalEl.querySelector('.prompt-results');
                            const scrollTop = (scrollContainer === null || scrollContainer === void 0 ? void 0 : scrollContainer.scrollTop) || 0;
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
                            new obsidian.Notice(`Added "${category}" to ${themeName}`);
                        }
                        // Don't close menu - let user continue selecting
                        return false;
                    }));
                    // Clicking the X icon deletes the category globally
                    //@ts-ignore
                    const iconEl = item.dom.querySelector('.menu-item-icon');
                    if (iconEl) {
                        iconEl.addEventListener('click', (e) => __awaiter(this, void 0, void 0, function* () {
                            console.log('X icon clicked for category:', category);
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            // Confirm deletion
                            const confirmed = confirm(`Delete category "${category}" from ALL themes?`);
                            if (!confirmed)
                                return;
                            // Remove category from all themes
                            Object.keys(this.settings.themeCategories).forEach(theme => {
                                this.settings.themeCategories[theme] =
                                    this.settings.themeCategories[theme].filter(c => c !== category);
                            });
                            yield this.saveSettings();
                            // Get current scroll position and selected item before refresh
                            //@ts-ignore
                            const scrollContainer = this.modalEl.querySelector('.prompt-results');
                            const scrollTop = (scrollContainer === null || scrollContainer === void 0 ? void 0 : scrollContainer.scrollTop) || 0;
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
                            new obsidian.Notice(`Deleted category "${category}" from all themes`);
                        }));
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
                .onClick(() => __awaiter(this, void 0, void 0, function* () {
                // Close context menu and prompt for new category
                const newCategory = yield this.promptForCategory();
                if (newCategory && newCategory.trim()) {
                    if (!this.settings.themeCategories[themeName]) {
                        this.settings.themeCategories[themeName] = [];
                    }
                    if (!this.settings.themeCategories[themeName].includes(newCategory.trim())) {
                        this.settings.themeCategories[themeName].push(newCategory.trim());
                        yield this.saveSettings();
                        this.refreshSuggestions();
                        new obsidian.Notice(`Added category "${newCategory.trim()}" to ${themeName}`);
                    }
                    else {
                        new obsidian.Notice(`Theme already has category "${newCategory.trim()}"`);
                    }
                }
            }));
        });
        // Remove all categories
        if (currentCategories.length > 0) {
            menu.addSeparator();
            menu.addItem((item) => {
                item
                    .setTitle("Remove all categories")
                    .setIcon('trash')
                    .onClick(() => __awaiter(this, void 0, void 0, function* () {
                    this.settings.themeCategories[themeName] = [];
                    yield this.saveSettings();
                    this.refreshSuggestions();
                    new obsidian.Notice(`Removed all categories from ${themeName}`);
                }));
            });
        }
        menu.showAtMouseEvent(event);
    }
    promptForCategory() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const promptModal = new CategoryPromptModal(this.app, (category) => {
                    resolve(category);
                });
                promptModal.open();
            });
        });
    }
    updatePreviewButtonStates(oldTheme, newTheme) {
        console.log('updatePreviewButtonStates called:', { oldTheme, newTheme });
        // Find all preview buttons by data-theme attribute
        const allButtons = this.modalEl.querySelectorAll('.theme-preview-btn');
        console.log('Found buttons:', allButtons.length);
        allButtons.forEach((btn) => {
            const themeName = btn.getAttribute('data-theme');
            if (!themeName)
                return;
            if (themeName === newTheme) {
                console.log('Setting green button for:', themeName);
                // This is now the previewed theme - make it green Apply button
                btn.textContent = '✓ Apply';
                btn.setAttribute('title', 'Apply this theme and close');
                btn.style.backgroundColor = '#4CAF50';
                btn.style.color = 'white';
                btn.style.border = '1px solid #4CAF50';
                btn.style.fontWeight = '600';
            }
            else if (oldTheme && themeName === oldTheme) {
                console.log('Reverting button for:', themeName);
                // This was the old preview - revert to Preview button
                btn.textContent = '👁 Preview';
                btn.setAttribute('title', 'Preview this theme');
                btn.style.backgroundColor = 'var(--background-primary)';
                btn.style.color = 'var(--text-normal)';
                btn.style.border = '1px solid var(--background-modifier-border)';
                btn.style.fontWeight = '400';
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
    onChooseItem(item, evt) {
        this.previewing = false;
        this.currentPreviewTheme = null;
        this.setTheme(item);
    }
    setTheme(themeName) {
        //@ts-ignore
        this.app.customCss.setTheme(themeName);
    }
}
// Simple modal to prompt for category name
class CategoryPromptModal extends obsidian.Modal {
    constructor(app, onSubmit) {
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
            }
            else if (e.key === 'Escape') {
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

const DEFAULT_SETTINGS = {
    themeCategories: {},
    categoryColors: {},
    lastSelectedCategory: null
};
class ThemeCategorizerPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.addCommand({
                id: 'open-theme-categorizer',
                name: 'Open Theme Categorizer',
                callback: () => new ThemeCategorizerModal(this.app, this.settings, this.saveSettings.bind(this)).open()
            });
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}

module.exports = ThemeCategorizerPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInRoZW1lLWNhdGVnb3JpemVyLW1vZGFsLnRzIiwibWFpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sLCBJdGVyYXRvciAqL1xyXG5cclxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XHJcbiAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XHJcbiAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxyXG4gICAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XHJcbiAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xyXG4gICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XHJcbiAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcclxuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIF9fYXNzaWduLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jlc3QocywgZSkge1xyXG4gICAgdmFyIHQgPSB7fTtcclxuICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxyXG4gICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgfVxyXG4gICAgcmV0dXJuIHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2RlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XHJcbiAgICBmdW5jdGlvbiBhY2NlcHQoZikgeyBpZiAoZiAhPT0gdm9pZCAwICYmIHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGdW5jdGlvbiBleHBlY3RlZFwiKTsgcmV0dXJuIGY7IH1cclxuICAgIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XHJcbiAgICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcclxuICAgIHZhciBkZXNjcmlwdG9yID0gZGVzY3JpcHRvckluIHx8ICh0YXJnZXQgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgY29udGV4dEluLm5hbWUpIDoge30pO1xyXG4gICAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcclxuICAgIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcclxuICAgICAgICBjb250ZXh0LmFkZEluaXRpYWxpemVyID0gZnVuY3Rpb24gKGYpIHsgaWYgKGRvbmUpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgYWRkIGluaXRpYWxpemVycyBhZnRlciBkZWNvcmF0aW9uIGhhcyBjb21wbGV0ZWRcIik7IGV4dHJhSW5pdGlhbGl6ZXJzLnB1c2goYWNjZXB0KGYgfHwgbnVsbCkpOyB9O1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xyXG4gICAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdm9pZCAwKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuc2V0KSkgZGVzY3JpcHRvci5zZXQgPSBfO1xyXG4gICAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChfID0gYWNjZXB0KHJlc3VsdCkpIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XHJcbiAgICBkb25lID0gdHJ1ZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3J1bkluaXRpYWxpemVycyh0aGlzQXJnLCBpbml0aWFsaXplcnMsIHZhbHVlKSB7XHJcbiAgICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFsdWUgPSB1c2VWYWx1ZSA/IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcsIHZhbHVlKSA6IGluaXRpYWxpemVyc1tpXS5jYWxsKHRoaXNBcmcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJzeW1ib2xcIiA/IHggOiBcIlwiLmNvbmNhdCh4KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NldEZ1bmN0aW9uTmFtZShmLCBuYW1lLCBwcmVmaXgpIHtcclxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcclxuICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5tZXRhZGF0YSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gUmVmbGVjdC5tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0ZXIodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xyXG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZyA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSk7XHJcbiAgICByZXR1cm4gZy5uZXh0ID0gdmVyYigwKSwgZ1tcInRocm93XCJdID0gdmVyYigxKSwgZ1tcInJldHVyblwiXSA9IHZlcmIoMiksIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XHJcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgX19jcmVhdGVCaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcclxuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XHJcbiAgICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcclxuICAgIH1cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkKCkge1xyXG4gICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xyXG4gICAgZm9yICh2YXIgcyA9IDAsIGkgPSAwLCBpbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpbDsgaSsrKSBzICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgIHJba10gPSBhW2pdO1xyXG4gICAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XHJcbiAgICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgIGlmIChhciB8fCAhKGkgaW4gZnJvbSkpIHtcclxuICAgICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcclxuICAgICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XHJcbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNHZW5lcmF0b3IodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgIHJldHVybiBpID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEFzeW5jSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEFzeW5jSXRlcmF0b3IgOiBPYmplY3QpLnByb3RvdHlwZSksIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiwgYXdhaXRSZXR1cm4pLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiBhd2FpdFJldHVybihmKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZiwgcmVqZWN0KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlmIChnW25dKSB7IGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IGlmIChmKSBpW25dID0gZihpW25dKTsgfSB9XHJcbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cclxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xyXG4gICAgdmFyIGksIHA7XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XHJcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xyXG4gICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cclxuICAgIHJldHVybiBjb29rZWQ7XHJcbn07XHJcblxyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59O1xyXG5cclxudmFyIG93bktleXMgPSBmdW5jdGlvbihvKSB7XHJcbiAgICBvd25LZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgYXIgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIG8pIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgaykpIGFyW2FyLmxlbmd0aF0gPSBrO1xyXG4gICAgICAgIHJldHVybiBhcjtcclxuICAgIH07XHJcbiAgICByZXR1cm4gb3duS2V5cyhvKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrID0gb3duS2V5cyhtb2QpLCBpID0gMDsgaSA8IGsubGVuZ3RoOyBpKyspIGlmIChrW2ldICE9PSBcImRlZmF1bHRcIikgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrW2ldKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBkZWZhdWx0OiBtb2QgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRHZXQocmVjZWl2ZXIsIHN0YXRlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiBraW5kID09PSBcIm1cIiA/IGYgOiBraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlcikgOiBmID8gZi52YWx1ZSA6IHN0YXRlLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBzdGF0ZSwgdmFsdWUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHdyaXRlIHByaXZhdGUgbWVtYmVyIHRvIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcclxuICAgIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xyXG4gICAgcmV0dXJuIHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgPT09IHN0YXRlIDogc3RhdGUuaGFzKHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlKGVudiwgdmFsdWUsIGFzeW5jKSB7XHJcbiAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xyXG4gICAgICAgIHZhciBkaXNwb3NlLCBpbm5lcjtcclxuICAgICAgICBpZiAoYXN5bmMpIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuYXN5bmNEaXNwb3NlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRpc3Bvc2UgPT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xyXG4gICAgICAgICAgICBpZiAoYXN5bmMpIGlubmVyID0gZGlzcG9zZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBkaXNwb3NlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qgbm90IGRpc3Bvc2FibGUuXCIpO1xyXG4gICAgICAgIGlmIChpbm5lcikgZGlzcG9zZSA9IGZ1bmN0aW9uKCkgeyB0cnkgeyBpbm5lci5jYWxsKHRoaXMpOyB9IGNhdGNoIChlKSB7IHJldHVybiBQcm9taXNlLnJlamVjdChlKTsgfSB9O1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgdmFsdWU6IHZhbHVlLCBkaXNwb3NlOiBkaXNwb3NlLCBhc3luYzogYXN5bmMgfSk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChhc3luYykge1xyXG4gICAgICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59XHJcblxyXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xyXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICByZXR1cm4gZS5uYW1lID0gXCJTdXBwcmVzc2VkRXJyb3JcIiwgZS5lcnJvciA9IGVycm9yLCBlLnN1cHByZXNzZWQgPSBzdXBwcmVzc2VkLCBlO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGlzcG9zZVJlc291cmNlcyhlbnYpIHtcclxuICAgIGZ1bmN0aW9uIGZhaWwoZSkge1xyXG4gICAgICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcclxuICAgICAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHIsIHMgPSAwO1xyXG4gICAgZnVuY3Rpb24gbmV4dCgpIHtcclxuICAgICAgICB3aGlsZSAociA9IGVudi5zdGFjay5wb3AoKSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyLmFzeW5jICYmIHMgPT09IDEpIHJldHVybiBzID0gMCwgZW52LnN0YWNrLnB1c2gociksIFByb21pc2UucmVzb2x2ZSgpLnRoZW4obmV4dCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoci5kaXNwb3NlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHIuZGlzcG9zZS5jYWxsKHIudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyLmFzeW5jKSByZXR1cm4gcyB8PSAyLCBQcm9taXNlLnJlc29sdmUocmVzdWx0KS50aGVuKG5leHQsIGZ1bmN0aW9uKGUpIHsgZmFpbChlKTsgcmV0dXJuIG5leHQoKTsgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHMgfD0gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgZmFpbChlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocyA9PT0gMSkgcmV0dXJuIGVudi5oYXNFcnJvciA/IFByb21pc2UucmVqZWN0KGVudi5lcnJvcikgOiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBpZiAoZW52Lmhhc0Vycm9yKSB0aHJvdyBlbnYuZXJyb3I7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV4dCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24ocGF0aCwgcHJlc2VydmVKc3gpIHtcclxuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJiAvXlxcLlxcLj9cXC8vLnRlc3QocGF0aCkpIHtcclxuICAgICAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXC4odHN4KSR8KCg/OlxcLmQpPykoKD86XFwuW14uL10rPyk/KVxcLihbY21dPyl0cyQvaSwgZnVuY3Rpb24gKG0sIHRzeCwgZCwgZXh0LCBjbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHN4ID8gcHJlc2VydmVKc3ggPyBcIi5qc3hcIiA6IFwiLmpzXCIgOiBkICYmICghZXh0IHx8ICFjbSkgPyBtIDogKGQgKyBleHQgKyBcIi5cIiArIGNtLnRvTG93ZXJDYXNlKCkgKyBcImpzXCIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhdGg7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICAgIF9fZXh0ZW5kczogX19leHRlbmRzLFxyXG4gICAgX19hc3NpZ246IF9fYXNzaWduLFxyXG4gICAgX19yZXN0OiBfX3Jlc3QsXHJcbiAgICBfX2RlY29yYXRlOiBfX2RlY29yYXRlLFxyXG4gICAgX19wYXJhbTogX19wYXJhbSxcclxuICAgIF9fZXNEZWNvcmF0ZTogX19lc0RlY29yYXRlLFxyXG4gICAgX19ydW5Jbml0aWFsaXplcnM6IF9fcnVuSW5pdGlhbGl6ZXJzLFxyXG4gICAgX19wcm9wS2V5OiBfX3Byb3BLZXksXHJcbiAgICBfX3NldEZ1bmN0aW9uTmFtZTogX19zZXRGdW5jdGlvbk5hbWUsXHJcbiAgICBfX21ldGFkYXRhOiBfX21ldGFkYXRhLFxyXG4gICAgX19hd2FpdGVyOiBfX2F3YWl0ZXIsXHJcbiAgICBfX2dlbmVyYXRvcjogX19nZW5lcmF0b3IsXHJcbiAgICBfX2NyZWF0ZUJpbmRpbmc6IF9fY3JlYXRlQmluZGluZyxcclxuICAgIF9fZXhwb3J0U3RhcjogX19leHBvcnRTdGFyLFxyXG4gICAgX192YWx1ZXM6IF9fdmFsdWVzLFxyXG4gICAgX19yZWFkOiBfX3JlYWQsXHJcbiAgICBfX3NwcmVhZDogX19zcHJlYWQsXHJcbiAgICBfX3NwcmVhZEFycmF5czogX19zcHJlYWRBcnJheXMsXHJcbiAgICBfX3NwcmVhZEFycmF5OiBfX3NwcmVhZEFycmF5LFxyXG4gICAgX19hd2FpdDogX19hd2FpdCxcclxuICAgIF9fYXN5bmNHZW5lcmF0b3I6IF9fYXN5bmNHZW5lcmF0b3IsXHJcbiAgICBfX2FzeW5jRGVsZWdhdG9yOiBfX2FzeW5jRGVsZWdhdG9yLFxyXG4gICAgX19hc3luY1ZhbHVlczogX19hc3luY1ZhbHVlcyxcclxuICAgIF9fbWFrZVRlbXBsYXRlT2JqZWN0OiBfX21ha2VUZW1wbGF0ZU9iamVjdCxcclxuICAgIF9faW1wb3J0U3RhcjogX19pbXBvcnRTdGFyLFxyXG4gICAgX19pbXBvcnREZWZhdWx0OiBfX2ltcG9ydERlZmF1bHQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZFNldDogX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRJbjogX19jbGFzc1ByaXZhdGVGaWVsZEluLFxyXG4gICAgX19hZGREaXNwb3NhYmxlUmVzb3VyY2U6IF9fYWRkRGlzcG9zYWJsZVJlc291cmNlLFxyXG4gICAgX19kaXNwb3NlUmVzb3VyY2VzOiBfX2Rpc3Bvc2VSZXNvdXJjZXMsXHJcbiAgICBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbjogX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb24sXHJcbn07XHJcbiIsImltcG9ydCB7IEFwcCwgRnV6enlTdWdnZXN0TW9kYWwsIEZ1enp5TWF0Y2gsIE1lbnUsIE5vdGljZSwgS2V5bWFwRXZlbnRMaXN0ZW5lciwgS2V5bWFwQ29udGV4dCB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5pbnRlcmZhY2UgVGhlbWVDYXRlZ29yaXplclNldHRpbmdzIHtcbiAgICB0aGVtZUNhdGVnb3JpZXM6IHsgW3RoZW1lTmFtZTogc3RyaW5nXTogc3RyaW5nW10gfTtcbiAgICBjYXRlZ29yeUNvbG9yczogeyBbY2F0ZWdvcnlOYW1lOiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgICBsYXN0U2VsZWN0ZWRDYXRlZ29yeTogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGhlbWVDYXRlZ29yaXplck1vZGFsIGV4dGVuZHMgRnV6enlTdWdnZXN0TW9kYWw8c3RyaW5nPiB7XG4gICAgREVGQVVMVF9USEVNRV9LRVkgPSBcIlwiO1xuICAgIERFRkFVTFRfVEhFTUVfVEVYVCA9IFwiTm9uZVwiO1xuICAgIC8vIHYxLjMuMSAtIENhdGVnb3J5IGRlbGV0aW9uIGZlYXR1cmUgd2l0aCBYIGljb25zXG4gICAgc2V0dGluZ3M6IFRoZW1lQ2F0ZWdvcml6ZXJTZXR0aW5ncztcbiAgICBzZWxlY3RlZENhdGVnb3J5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBzYXZlU2V0dGluZ3M6ICgpID0+IFByb21pc2U8dm9pZD47XG5cbiAgICBpbml0aWFsVGhlbWUhOiBzdHJpbmc7XG4gICAgcHJldmlld2luZyA9IGZhbHNlO1xuICAgIGN1cnJlbnRQcmV2aWV3VGhlbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIFxuXG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgc2V0dGluZ3M6IFRoZW1lQ2F0ZWdvcml6ZXJTZXR0aW5ncywgc2F2ZVNldHRpbmdzOiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MgPSBzYXZlU2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgdGhpcy5iZ0VsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnRcIik7XG4gICAgICAgIHRoaXMubW9kYWxFbC5jbGFzc0xpc3QuYWRkKFwidGhlbWUtY2F0ZWdvcml6ZXItbW9kYWxcIik7XG5cbiAgICAgICAgLy8gQWRkIHRoZW1lIHByZXZpZXcgb24gYXJyb3cga2V5IG5hdmlnYXRpb25cbiAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQXJyb3dVcEV2ZW50ID0gdGhpcy5zY29wZS5rZXlzLmZpbmQoKGtleSkgPT4ga2V5LmtleSA9PT0gXCJBcnJvd1VwXCIpO1xuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxBcnJvd0Rvd25FdmVudCA9IHRoaXMuc2NvcGUua2V5cy5maW5kKChrZXkpID0+IGtleS5rZXkgPT09IFwiQXJyb3dEb3duXCIpO1xuXG4gICAgICAgIGNvbnN0IHdyYXBXaXRoUHJldmlldyA9IChvcmlnaW5hbEZ1bmM6IEtleW1hcEV2ZW50TGlzdGVuZXIsIG1vZGFsOiBUaGVtZUNhdGVnb3JpemVyTW9kYWwpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihlOiBLZXlib2FyZEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkUHJldmlld1RoZW1lID0gbW9kYWwuY3VycmVudFByZXZpZXdUaGVtZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvcmlnaW5hbEZ1bmMoZSwge30gYXMgS2V5bWFwQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRUaGVtZSA9IG1vZGFsLmNob29zZXIudmFsdWVzW21vZGFsLmNob29zZXIuc2VsZWN0ZWRJdGVtXS5pdGVtO1xuICAgICAgICAgICAgICAgIG1vZGFsLmN1cnJlbnRQcmV2aWV3VGhlbWUgPSBzZWxlY3RlZFRoZW1lO1xuICAgICAgICAgICAgICAgIG1vZGFsLnNldFRoZW1lKHNlbGVjdGVkVGhlbWUpO1xuICAgICAgICAgICAgICAgIG1vZGFsLnByZXZpZXdpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gc3RhdGVzIHdpdGhvdXQgcmVmcmVzaGluZyAodG8gYXZvaWQgY2hvb3NlciByZXNldClcbiAgICAgICAgICAgICAgICBtb2RhbC51cGRhdGVQcmV2aWV3QnV0dG9uU3RhdGVzKG9sZFByZXZpZXdUaGVtZSwgc2VsZWN0ZWRUaGVtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3JpZ2luYWxBcnJvd1VwRXZlbnQpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQXJyb3dVcEV2ZW50LmZ1bmMgPSB3cmFwV2l0aFByZXZpZXcob3JpZ2luYWxBcnJvd1VwRXZlbnQuZnVuYywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9yaWdpbmFsQXJyb3dEb3duRXZlbnQpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsQXJyb3dEb3duRXZlbnQuZnVuYyA9IHdyYXBXaXRoUHJldmlldyhvcmlnaW5hbEFycm93RG93bkV2ZW50LmZ1bmMsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnVGhlbWUgQ2F0ZWdvcml6ZXIgdjIuMC43IChSb2xsdXAgQnVpbGQgVGVzdCAtIE5vdiAxMywgMjAyNSk6IE1vZGFsIG9wZW5lZC4nKTtcbiAgICAgICAgLy8gUmVzdG9yZSBsYXN0IHNlbGVjdGVkIGNhdGVnb3J5IGZyb20gc2V0dGluZ3MgQkVGT1JFIGNhbGxpbmcgc3VwZXIub25PcGVuKClcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIGdldEl0ZW1zKCkgdXNlcyB0aGUgY29ycmVjdCBmaWx0ZXIgd2hlbiBidWlsZGluZyBpbml0aWFsIGxpc3RcbiAgICAgICAgY29uc29sZS5sb2coJ1RoZW1lIENhdGVnb3JpemVyOiBvbk9wZW4oKSAtIGxhc3RTZWxlY3RlZENhdGVnb3J5IGZyb20gc2V0dGluZ3M6JywgdGhpcy5zZXR0aW5ncy5sYXN0U2VsZWN0ZWRDYXRlZ29yeSk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRDYXRlZ29yeSA9IHRoaXMuc2V0dGluZ3MubGFzdFNlbGVjdGVkQ2F0ZWdvcnk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdUaGVtZSBDYXRlZ29yaXplcjogb25PcGVuKCkgLSBzZWxlY3RlZENhdGVnb3J5IHNldCB0bzonLCB0aGlzLnNlbGVjdGVkQ2F0ZWdvcnkpO1xuICAgICAgICBcbiAgICAgICAgc3VwZXIub25PcGVuKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2F0ZWdvcnkgZmlsdGVyIFVJIGF0IHRvcCBvZiBtb2RhbFxuICAgICAgICB0aGlzLmFkZENhdGVnb3J5RmlsdGVyKCk7XG4gICAgICAgIFxuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgdGhpcy5pbml0aWFsVGhlbWUgPSB0aGlzLmFwcC5jdXN0b21Dc3MudGhlbWU7XG4gICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICBjb25zdCBjdXJyZW50SW5kZXggPSB0aGlzLmdldEl0ZW1zKCkuZmluZEluZGV4KHRoZW1lID0+IHRoZW1lID09PSB0aGlzLmFwcC5jdXN0b21Dc3MudGhlbWUpO1xuICAgICAgICBpZiAoY3VycmVudEluZGV4ID49IDApIHtcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgdGhpcy5jaG9vc2VyLnNldFNlbGVjdGVkSXRlbShjdXJyZW50SW5kZXgpO1xuICAgICAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgICAgICB0aGlzLmNob29zZXIuc3VnZ2VzdGlvbnNbdGhpcy5jaG9vc2VyLnNlbGVjdGVkSXRlbV0/LnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHN1cGVyLm9uQ2xvc2UoKTtcbiAgICAgICAgaWYgKHRoaXMucHJldmlld2luZykge1xuICAgICAgICAgICAgdGhpcy5zZXRUaGVtZSh0aGlzLmluaXRpYWxUaGVtZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50UHJldmlld1RoZW1lID0gbnVsbDtcbiAgICB9XG5cbiAgICBhZGRDYXRlZ29yeUZpbHRlcigpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyQ29udGFpbmVyID0gdGhpcy5tb2RhbEVsLmNyZWF0ZURpdih7IGNsczogJ2NhdGVnb3J5LWZpbHRlcicgfSk7XG4gICAgICAgIFxuICAgICAgICBmaWx0ZXJDb250YWluZXIuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6ICdGaWx0ZXI6ICcgfSk7XG4gICAgICAgIGZpbHRlckNvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSAnMjBweCc7IC8vIEFkZCBzcGFjaW5nIGFib3ZlIGNhdGVnb3J5IGJ1dHRvbnNcbiAgICAgICAgZmlsdGVyQ29udGFpbmVyLnN0eWxlLm1hcmdpbkJvdHRvbSA9ICc4cHgnOyAvLyBBZGQgc3BhY2luZyBiZWxvdyBjYXRlZ29yeSBidXR0b25zXG4gICAgICAgIGZpbHRlckNvbnRhaW5lci5zdHlsZS5tYXJnaW5MZWZ0ID0gJzEycHgnOyAvLyBBZGQgc3BhY2luZyBvbiBsZWZ0XG4gICAgICAgIGZpbHRlckNvbnRhaW5lci5zdHlsZS5wYWRkaW5nVG9wID0gJzEycHgnOyAvLyBFeHRyYSBwYWRkaW5nIGZvciB2aXN1YWwgc2VwYXJhdGlvblxuICAgICAgICBcbiAgICAgICAgLy8gXCJBbGxcIiBidXR0b25cbiAgICAgICAgY29uc3QgYWxsQnRuID0gZmlsdGVyQ29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IFxuICAgICAgICAgICAgdGV4dDogJ0FsbCcsXG4gICAgICAgICAgICBjbHM6IHRoaXMuc2VsZWN0ZWRDYXRlZ29yeSA9PT0gbnVsbCA/ICdpcy1hY3RpdmUnIDogJydcbiAgICAgICAgfSk7XG4gICAgICAgIGFsbEJ0bi5zdHlsZS5tYXJnaW5SaWdodCA9ICc0cHgnO1xuICAgICAgICBhbGxCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGVtZSBDYXRlZ29yaXplcjogQWxsIGJ1dHRvbiBjbGlja2VkJyk7XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ2F0ZWdvcnkgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0U2VsZWN0ZWRDYXRlZ29yeSA9IG51bGw7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVGhlbWUgQ2F0ZWdvcml6ZXI6IFNhdmluZyBzZXR0aW5ncyB3aXRoIGxhc3RTZWxlY3RlZENhdGVnb3J5ID0gbnVsbCcpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGVtZSBDYXRlZ29yaXplcjogU2V0dGluZ3Mgc2F2ZWQnKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2F0ZWdvcnlCdXR0b25zKCk7XG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYXRlZ29yeSBidXR0b25zXG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSB0aGlzLmdldEFsbENhdGVnb3JpZXMoKTtcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBmaWx0ZXJDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgXG4gICAgICAgICAgICAgICAgdGV4dDogY2F0LFxuICAgICAgICAgICAgICAgIGNsczogdGhpcy5zZWxlY3RlZENhdGVnb3J5ID09PSBjYXQgPyAnaXMtYWN0aXZlJyA6ICcnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJ0bi5zdHlsZS5tYXJnaW5SaWdodCA9ICc0cHgnO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RoZW1lIENhdGVnb3JpemVyOiBDYXRlZ29yeSBidXR0b24gY2xpY2tlZDonLCBjYXQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRDYXRlZ29yeSA9IGNhdDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RTZWxlY3RlZENhdGVnb3J5ID0gY2F0O1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGVtZSBDYXRlZ29yaXplcjogU2F2aW5nIHNldHRpbmdzIHdpdGggbGFzdFNlbGVjdGVkQ2F0ZWdvcnkgPScsIGNhdCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVGhlbWUgQ2F0ZWdvcml6ZXI6IFNldHRpbmdzIHNhdmVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVDYXRlZ29yeUJ1dHRvbnMoKTtcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB1cGRhdGVDYXRlZ29yeUJ1dHRvbnMoKSB7XG4gICAgICAgIGNvbnN0IGJ1dHRvbnMgPSB0aGlzLm1vZGFsRWwucXVlcnlTZWxlY3RvckFsbCgnLmNhdGVnb3J5LWZpbHRlciBidXR0b24nKTtcbiAgICAgICAgYnV0dG9ucy5mb3JFYWNoKChidG4sIGlkeCkgPT4ge1xuICAgICAgICAgICAgYnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAgICAgaWYgKGlkeCA9PT0gMCAmJiB0aGlzLnNlbGVjdGVkQ2F0ZWdvcnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBidG4uY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSB0aGlzLmdldEFsbENhdGVnb3JpZXMoKTtcbiAgICAgICAgICAgICAgICBpZiAoYnRuLnRleHRDb250ZW50ID09PSB0aGlzLnNlbGVjdGVkQ2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0QWxsQ2F0ZWdvcmllcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgT2JqZWN0LnZhbHVlcyh0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllcykuZm9yRWFjaChjYXRzID0+IHtcbiAgICAgICAgICAgIGNhdHMuZm9yRWFjaChjYXQgPT4gY2F0ZWdvcmllcy5hZGQoY2F0KSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShjYXRlZ29yaWVzKS5zb3J0KCk7XG4gICAgfVxuXG4gICAgZ2V0SXRlbXMoKTogc3RyaW5nW10ge1xuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgbGV0IHRoZW1lcyA9IFt0aGlzLkRFRkFVTFRfVEhFTUVfS0VZLCAuLi5PYmplY3Qua2V5cyh0aGlzLmFwcC5jdXN0b21Dc3MudGhlbWVzIHx8IHt9KSwgLi4uKHRoaXMuYXBwLmN1c3RvbUNzcy5vbGRUaGVtZXMgfHwgW10pXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbHRlciBieSBzZWxlY3RlZCBjYXRlZ29yeVxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZENhdGVnb3J5KSB7XG4gICAgICAgICAgICB0aGVtZXMgPSB0aGVtZXMuZmlsdGVyKHRoZW1lID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhlbWUgPT09IHRoaXMuREVGQVVMVF9USEVNRV9LRVkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdHMgPSB0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1t0aGVtZV0gfHwgW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhdHMuaW5jbHVkZXModGhpcy5zZWxlY3RlZENhdGVnb3J5ISk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoZW1lcztcbiAgICB9XG5cbiAgICBnZXRJdGVtVGV4dChpdGVtOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBpZiAoaXRlbSA9PT0gdGhpcy5ERUZBVUxUX1RIRU1FX0tFWSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuREVGQVVMVF9USEVNRV9URVhUO1xuICAgICAgICB9XG4gICAgICAgIC8vIEp1c3QgcmV0dXJuIHRoZW1lIG5hbWUgLSBjYXRlZ29yaWVzIHJlbmRlcmVkIHNlcGFyYXRlbHkgaW4gcmVuZGVyU3VnZ2VzdGlvblxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG5cbiAgICAvLyBPdmVycmlkZSByZW5kZXJTdWdnZXN0aW9uIHRvIGFkZCBjYXRlZ29yeSBtYW5hZ2VtZW50IGFuZCBwcmV2aWV3IGJ1dHRvbnNcbiAgICByZW5kZXJTdWdnZXN0aW9uKG1hdGNoOiBGdXp6eU1hdGNoPHN0cmluZz4sIGVsOiBIVE1MRWxlbWVudCkge1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBidXR0b25zIGZvciBcIk5vbmVcIiBkZWZhdWx0IHRoZW1lXG4gICAgICAgIGlmIChtYXRjaC5pdGVtID09PSB0aGlzLkRFRkFVTFRfVEhFTUVfS0VZKSB7XG4gICAgICAgICAgICBlbC5jcmVhdGVEaXYoeyB0ZXh0OiB0aGlzLmdldEl0ZW1UZXh0KG1hdGNoLml0ZW0pIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGNvbnRhaW5lciB3aXRoIGZsZXhib3ggbGF5b3V0XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGVsLmNyZWF0ZURpdih7IGNsczogJ3RoZW1lLWl0ZW0tY29udGFpbmVyJyB9KTtcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIGNvbnRhaW5lci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdzcGFjZS1iZXR3ZWVuJztcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmFsaWduSXRlbXMgPSAnY2VudGVyJztcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICBcbiAgICAgICAgLy8gTGVmdCBzaWRlIGNvbnRhaW5lciAodGhlbWUgbmFtZSArIGNhdGVnb3JpZXMpXG4gICAgICAgIGNvbnN0IGxlZnRDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAndGhlbWUtaXRlbS1sZWZ0JyB9KTtcbiAgICAgICAgbGVmdENvbnRhaW5lci5zdHlsZS5mbGV4ID0gJzEnO1xuICAgICAgICBsZWZ0Q29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICAgIGxlZnRDb250YWluZXIuc3R5bGUuZmxleFdyYXAgPSAnd3JhcCc7XG4gICAgICAgIGxlZnRDb250YWluZXIuc3R5bGUuYWxpZ25JdGVtcyA9ICdjZW50ZXInO1xuICAgICAgICBsZWZ0Q29udGFpbmVyLnN0eWxlLmdhcCA9ICc2cHgnO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlbWUgbmFtZVxuICAgICAgICBjb25zdCBuYW1lRWwgPSBsZWZ0Q29udGFpbmVyLmNyZWF0ZURpdih7IFxuICAgICAgICAgICAgdGV4dDogdGhpcy5nZXRJdGVtVGV4dChtYXRjaC5pdGVtKSxcbiAgICAgICAgICAgIGNsczogJ3RoZW1lLWl0ZW0tbmFtZSdcbiAgICAgICAgfSk7XG4gICAgICAgIG5hbWVFbC5zdHlsZS5mb250V2VpZ2h0ID0gJzUwMCc7XG4gICAgICAgIFxuICAgICAgICAvLyBDYXRlZ29yaWVzIGFzIGluZGl2aWR1YWwgdGFnc1xuICAgICAgICBjb25zdCBjYXRzID0gdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbbWF0Y2guaXRlbV0gfHwgW107XG4gICAgICAgIGlmIChjYXRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNhdENvbnRhaW5lciA9IGxlZnRDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAndGhlbWUtY2F0ZWdvcmllcycgfSk7XG4gICAgICAgICAgICBjYXRDb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgICAgIGNhdENvbnRhaW5lci5zdHlsZS5mbGV4V3JhcCA9ICd3cmFwJztcbiAgICAgICAgICAgIGNhdENvbnRhaW5lci5zdHlsZS5nYXAgPSAnNHB4JztcbiAgICAgICAgICAgIGNhdENvbnRhaW5lci5zdHlsZS5hbGlnbkl0ZW1zID0gJ2NlbnRlcic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNhdHMuZm9yRWFjaChjYXQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdFRhZyA9IGNhdENvbnRhaW5lci5jcmVhdGVFbCgnc3BhbicsIHsgXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGNhdCxcbiAgICAgICAgICAgICAgICAgICAgY2xzOiAndGhlbWUtY2F0ZWdvcnktdGFnJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5mb250U2l6ZSA9ICcxMXB4JztcbiAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUucGFkZGluZyA9ICcycHggNnB4JztcbiAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzNweCc7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgZ29vZCBjb250cmFzdCAtIHNlbWktdHJhbnNwYXJlbnQgZ3JheSB0aGF0IHdvcmtzIG9uIGxpZ2h0IGFuZCBkYXJrXG4gICAgICAgICAgICAgICAgY2F0VGFnLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDEyOCwgMTI4LCAxMjgsIDAuNCknO1xuICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5jb2xvciA9ICdyZ2JhKDIwMCwgMjAwLCAyMDAsIDEpJztcbiAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCByZ2JhKDEyOCwgMTI4LCAxMjgsIDAuNSknO1xuICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XG4gICAgICAgICAgICAgICAgY2F0VGFnLnN0eWxlLnRyYW5zaXRpb24gPSAnYWxsIDAuMTVzIGVhc2UnO1xuICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5taW5XaWR0aCA9ICc2MHB4JzsgLy8gTWFrZSB0YWdzIG1vcmUgY2xpY2thYmxlXG4gICAgICAgICAgICAgICAgY2F0VGFnLnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuICAgICAgICAgICAgICAgIGNhdFRhZy50aXRsZSA9IGBDbGljayB0byByZW1vdmUgXCIke2NhdH1cIiBjYXRlZ29yeWA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSG92ZXIgZWZmZWN0IC0gcmVkIHdpdGggd2hpdGUgdGV4dCBmb3IgbWF4aW11bSBjb250cmFzdFxuICAgICAgICAgICAgICAgIGNhdFRhZy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNkYzM1NDUnO1xuICAgICAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUuY29sb3IgPSAnI2ZmZmZmZic7XG4gICAgICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICNkYzM1NDUnO1xuICAgICAgICAgICAgICAgICAgICBjYXRUYWcudGV4dENvbnRlbnQgPSBgw5cgJHtjYXR9YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjYXRUYWcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY2F0VGFnLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDEyOCwgMTI4LCAxMjgsIDAuNCknO1xuICAgICAgICAgICAgICAgICAgICBjYXRUYWcuc3R5bGUuY29sb3IgPSAncmdiYSgyMDAsIDIwMCwgMjAwLCAxKSc7XG4gICAgICAgICAgICAgICAgICAgIGNhdFRhZy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHJnYmEoMTI4LCAxMjgsIDEyOCwgMC41KSc7XG4gICAgICAgICAgICAgICAgICAgIGNhdFRhZy50ZXh0Q29udGVudCA9IGNhdDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbGljayBlbnRpcmUgdGFnIHRvIHJlbW92ZSBjYXRlZ29yeSAobm90IGp1c3QgWClcbiAgICAgICAgICAgICAgICBjYXRUYWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MudGhlbWVDYXRlZ29yaWVzW21hdGNoLml0ZW1dID0gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1ttYXRjaC5pdGVtXS5maWx0ZXIoYyA9PiBjICE9PSBjYXQpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIGFuZCBzZWxlY3RlZCBpdGVtIGJlZm9yZSByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JvbGxDb250YWluZXIgPSB0aGlzLm1vZGFsRWwucXVlcnlTZWxlY3RvcignLnByb21wdC1yZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IHNjcm9sbENvbnRhaW5lcj8uc2Nyb2xsVG9wIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gdGhpcy5jaG9vc2VyLnNlbGVjdGVkSXRlbTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFN1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHNjcm9sbCBwb3NpdGlvbiBhbmQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AgPSBzY3JvbGxUb3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEluZGV4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaG9vc2VyLnNldFNlbGVjdGVkSXRlbShzZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgUmVtb3ZlZCBcIiR7Y2F0fVwiIGZyb20gJHttYXRjaC5pdGVtfWApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1dHRvbiBjb250YWluZXJcbiAgICAgICAgY29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ3RoZW1lLWJ1dHRvbnMnIH0pO1xuICAgICAgICBidXR0b25Db250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICAgICAgYnV0dG9uQ29udGFpbmVyLnN0eWxlLmdhcCA9ICc0cHgnO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFByZXZpZXcvQXBwbHkgYnV0dG9uIC0gd2lkZXIgYW5kIG1vcmUgcHJvbWluZW50XG4gICAgICAgIGNvbnN0IHByZXZpZXdCdG4gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgXG4gICAgICAgICAgICBjbHM6ICd0aGVtZS1wcmV2aWV3LWJ0bidcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFN0b3JlIHRoZW1lIG5hbWUgYXMgZGF0YSBhdHRyaWJ1dGUgZm9yIGVhc3kgbG9va3VwXG4gICAgICAgIHByZXZpZXdCdG4uc2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJywgbWF0Y2guaXRlbSk7XG4gICAgICAgIHByZXZpZXdCdG4uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLnBhZGRpbmcgPSAnNHB4IDEycHgnO1xuICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmZvbnRTaXplID0gJzEzcHgnO1xuICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHgnO1xuICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpJztcbiAgICAgICAgcHJldmlld0J0bi5zdHlsZS50cmFuc2l0aW9uID0gJ2FsbCAwLjE1cyBlYXNlJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgdGhlbWUgaXMgY3VycmVudGx5IGJlaW5nIHByZXZpZXdlZFxuICAgICAgICBjb25zdCBpc1ByZXZpZXdpbmcgPSB0aGlzLmN1cnJlbnRQcmV2aWV3VGhlbWUgPT09IG1hdGNoLml0ZW07XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNQcmV2aWV3aW5nKSB7XG4gICAgICAgICAgICAvLyBBUFBMWSBtb2RlIC0gY2xlYXIgZGlzdGluY3Rpb25cbiAgICAgICAgICAgIHByZXZpZXdCdG4udGV4dENvbnRlbnQgPSAn4pyTIEFwcGx5JztcbiAgICAgICAgICAgIHByZXZpZXdCdG4udGl0bGUgPSAnQXBwbHkgdGhpcyB0aGVtZSBhbmQgY2xvc2UnO1xuICAgICAgICAgICAgcHJldmlld0J0bi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzRDQUY1MCc7XG4gICAgICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmNvbG9yID0gJ3doaXRlJztcbiAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCAjNENBRjUwJztcbiAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUFJFVklFVyBtb2RlXG4gICAgICAgICAgICBwcmV2aWV3QnRuLnRleHRDb250ZW50ID0gJ/CfkYEgUHJldmlldyc7XG4gICAgICAgICAgICBwcmV2aWV3QnRuLnRpdGxlID0gJ1ByZXZpZXcgdGhpcyB0aGVtZSc7XG4gICAgICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpJztcbiAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuY29sb3IgPSAndmFyKC0tdGV4dC1ub3JtYWwpJztcbiAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuZm9udFdlaWdodCA9ICc0MDAnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIb3ZlciBlZmZlY3RcbiAgICAgICAgcHJldmlld0J0bi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzUHJldmlld2luZykge1xuICAgICAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyM0NWEwNDknO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcmV2aWV3QnRuLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICd2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWhvdmVyKSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwcmV2aWV3QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNQcmV2aWV3aW5nKSB7XG4gICAgICAgICAgICAgICAgcHJldmlld0J0bi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzRDQUY1MCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZXZpZXdCdG4uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsaWNrIGhhbmRsZXIgZm9yIHByZXZpZXcvYXBwbHkgYnV0dG9uXG4gICAgICAgIHByZXZpZXdCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNQcmV2aWV3aW5nKSB7XG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgYW5kIGNsb3NlXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aWV3aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJldmlld1RoZW1lID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRoZW1lKG1hdGNoLml0ZW0pO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgb2xkIHByZXZpZXcgdGhlbWUgYmVmb3JlIGNoYW5naW5nXG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkUHJldmlld1RoZW1lID0gdGhpcy5jdXJyZW50UHJldmlld1RoZW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFByZXZpZXcgdGhpcyB0aGVtZVxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByZXZpZXdUaGVtZSA9IG1hdGNoLml0ZW07XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUaGVtZShtYXRjaC5pdGVtKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpZXdpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiBiZWZvcmUgcmVmcmVzaFxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgIGNvbnN0IHNjcm9sbENvbnRhaW5lciA9IHRoaXMubW9kYWxFbC5xdWVyeVNlbGVjdG9yKCcucHJvbXB0LXJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBzY3JvbGxDb250YWluZXI/LnNjcm9sbFRvcCB8fCAwO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIGluZGV4IG9mIHRoaXMgaXRlbSBpbiB0aGUgY3VycmVudCBsaXN0XG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbUluZGV4ID0gdGhpcy5jaG9vc2VyLnZhbHVlcy5maW5kSW5kZXgodiA9PiB2Lml0ZW0gPT09IG1hdGNoLml0ZW0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggc3VnZ2VzdGlvbnMgdG8gdXBkYXRlIGFsbCBidXR0b24gc3RhdGVzIEFORCBib3JkZXJzXG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHNjcm9sbCBwb3NpdGlvbiBhbmQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNob29zZXIuc2V0U2VsZWN0ZWRJdGVtKGl0ZW1JbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AgPSBzY3JvbGxUb3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2F0ZWdvcnkgbWVudSBidXR0b24gKHRocmVlIGRvdHMpXG4gICAgICAgIGNvbnN0IG1lbnVCdG4gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoJ3NwYW4nLCB7IFxuICAgICAgICAgICAgdGV4dDogJ+KLricsXG4gICAgICAgICAgICBjbHM6ICd0aGVtZS1jYXRlZ29yeS1idG4nXG4gICAgICAgIH0pO1xuICAgICAgICBtZW51QnRuLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcbiAgICAgICAgbWVudUJ0bi5zdHlsZS5wYWRkaW5nID0gJzAgNnB4JztcbiAgICAgICAgbWVudUJ0bi5zdHlsZS5mb250U2l6ZSA9ICcxOHB4JztcbiAgICAgICAgbWVudUJ0bi5zdHlsZS5vcGFjaXR5ID0gJzAuNSc7XG4gICAgICAgIG1lbnVCdG4udGl0bGUgPSAnTWFuYWdlIGNhdGVnb3JpZXMnO1xuICAgICAgICBcbiAgICAgICAgLy8gSG92ZXIgZWZmZWN0IGZvciBtZW51IGJ1dHRvblxuICAgICAgICBtZW51QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCAoKSA9PiB7XG4gICAgICAgICAgICBtZW51QnRuLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIH0pO1xuICAgICAgICBtZW51QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG4gICAgICAgICAgICBtZW51QnRuLnN0eWxlLm9wYWNpdHkgPSAnMC41JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGljayBoYW5kbGVyIGZvciBtZW51IGJ1dHRvblxuICAgICAgICBtZW51QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmlldyB0aGlzIHRoZW1lIHdoZW4gb3BlbmluZyBjYXRlZ29yeSBtZW51XG4gICAgICAgICAgICBjb25zdCBvbGRQcmV2aWV3VGhlbWUgPSB0aGlzLmN1cnJlbnRQcmV2aWV3VGhlbWU7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcmV2aWV3VGhlbWUgPSBtYXRjaC5pdGVtO1xuICAgICAgICAgICAgdGhpcy5zZXRUaGVtZShtYXRjaC5pdGVtKTtcbiAgICAgICAgICAgIHRoaXMucHJldmlld2luZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByZXZpZXdCdXR0b25TdGF0ZXMob2xkUHJldmlld1RoZW1lLCBtYXRjaC5pdGVtKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zaG93Q29udGV4dE1lbnUoZXZlbnQsIG1hdGNoLml0ZW0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzaG93Q29udGV4dE1lbnUoZXZlbnQ6IE1vdXNlRXZlbnQsIHRoZW1lTmFtZTogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9uJ3QgYXV0by1jbG9zZSBtZW51IG9uIGl0ZW0gY2xpY2sgLSBsZXQgdXNlciBzZWxlY3QgbXVsdGlwbGUgY2F0ZWdvcmllc1xuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgbWVudS5kb20uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgLy8gT25seSBjbG9zZSBpZiBjbGlja2luZyBvdXRzaWRlIG1lbnUgaXRlbXMgb3Igb24gc3BlY2lmaWMgY2xvc2UgYWN0aW9uc1xuICAgICAgICAgICAgaWYgKChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xhc3NMaXN0LmNvbnRhaW5zKCdtZW51LWl0ZW0taWNvbicpIHx8XG4gICAgICAgICAgICAgICAgKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS50ZXh0Q29udGVudD8uaW5jbHVkZXMoJ0FkZCBuZXcgY2F0ZWdvcnknKSB8fFxuICAgICAgICAgICAgICAgIChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkudGV4dENvbnRlbnQ/LmluY2x1ZGVzKCdSZW1vdmUgYWxsJykpIHtcbiAgICAgICAgICAgICAgICAvLyBMZXQgdGhlc2UgY2xvc2Ugbm9ybWFsbHlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJldmVudCBtZW51IGZyb20gY2xvc2luZ1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBjb250ZXh0IG1lbnUgZm9yIFwiTm9uZVwiIGRlZmF1bHQgdGhlbWVcbiAgICAgICAgaWYgKHRoZW1lTmFtZSA9PT0gdGhpcy5ERUZBVUxUX1RIRU1FX0tFWSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudENhdGVnb3JpZXMgPSB0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1t0aGVtZU5hbWVdIHx8IFtdO1xuICAgICAgICBjb25zdCBhbGxDYXRlZ29yaWVzID0gdGhpcy5nZXRBbGxDYXRlZ29yaWVzKCk7XG5cbiAgICAgICAgLy8gU2VjdGlvbjogQWRkIGV4aXN0aW5nIGNhdGVnb3JpZXMgKG5vIGNoZWNrbWFya3MsIG9ubHkgYWRkcyBpZiBub3QgcHJlc2VudClcbiAgICAgICAgaWYgKGFsbENhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRUaXRsZShcIkFkZCBDYXRlZ29yeTpcIik7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXREaXNhYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBhbGxDYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW51SXRlbSA9IGl0ZW0uc2V0VGl0bGUoY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIFggYnV0dG9uIHRvIGRlbGV0ZSBjYXRlZ29yeSBlbnRpcmVseVxuICAgICAgICAgICAgICAgICAgICBtZW51SXRlbS5zZXRJY29uKCdjcm9zcycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVudUl0ZW0ub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCAtIG5ldmVyIHJlbW92ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1t0aGVtZU5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbdGhlbWVOYW1lXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgb25seSBpZiBub3QgYWxyZWFkeSBwcmVzZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MudGhlbWVDYXRlZ29yaWVzW3RoZW1lTmFtZV0uaW5jbHVkZXMoY2F0ZWdvcnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbdGhlbWVOYW1lXS5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHNjcm9sbCBwb3NpdGlvbiBhbmQgc2VsZWN0ZWQgaXRlbSBiZWZvcmUgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcm9sbENvbnRhaW5lciA9IHRoaXMubW9kYWxFbC5xdWVyeVNlbGVjdG9yKCcucHJvbXB0LXJlc3VsdHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBzY3JvbGxDb250YWluZXI/LnNjcm9sbFRvcCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW5kZXggPSB0aGlzLmNob29zZXIuc2VsZWN0ZWRJdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaFN1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSBzY3JvbGwgcG9zaXRpb24gYW5kIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCA9IHNjcm9sbFRvcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSW5kZXggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaG9vc2VyLnNldFNlbGVjdGVkSXRlbShzZWxlY3RlZEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQWRkZWQgXCIke2NhdGVnb3J5fVwiIHRvICR7dGhlbWVOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBjbG9zZSBtZW51IC0gbGV0IHVzZXIgY29udGludWUgc2VsZWN0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xpY2tpbmcgdGhlIFggaWNvbiBkZWxldGVzIHRoZSBjYXRlZ29yeSBnbG9iYWxseVxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWNvbkVsID0gaXRlbS5kb20ucXVlcnlTZWxlY3RvcignLm1lbnUtaXRlbS1pY29uJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpY29uRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25FbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jIChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1ggaWNvbiBjbGlja2VkIGZvciBjYXRlZ29yeTonLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb25maXJtIGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlybWVkID0gY29uZmlybShgRGVsZXRlIGNhdGVnb3J5IFwiJHtjYXRlZ29yeX1cIiBmcm9tIEFMTCB0aGVtZXM/YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb25maXJtZWQpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgY2F0ZWdvcnkgZnJvbSBhbGwgdGhlbWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXModGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXMpLmZvckVhY2godGhlbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1t0aGVtZV0gPSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MudGhlbWVDYXRlZ29yaWVzW3RoZW1lXS5maWx0ZXIoYyA9PiBjICE9PSBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCBzY3JvbGwgcG9zaXRpb24gYW5kIHNlbGVjdGVkIGl0ZW0gYmVmb3JlIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JvbGxDb250YWluZXIgPSB0aGlzLm1vZGFsRWwucXVlcnlTZWxlY3RvcignLnByb21wdC1yZXN1bHRzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gc2Nyb2xsQ29udGFpbmVyPy5zY3JvbGxUb3AgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEluZGV4ID0gdGhpcy5jaG9vc2VyLnNlbGVjdGVkSXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDbG9zZSBtZW51XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVudS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHNjcm9sbCBwb3NpdGlvbiBhbmQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbENvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wID0gc2Nyb2xsVG9wO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRJbmRleCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNob29zZXIuc2V0U2VsZWN0ZWRJdGVtKHNlbGVjdGVkSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBEZWxldGVkIGNhdGVnb3J5IFwiJHtjYXRlZ29yeX1cIiBmcm9tIGFsbCB0aGVtZXNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWVudS5hZGRTZXBhcmF0b3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBuZXcgY2F0ZWdvcnlcbiAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgICAgLnNldFRpdGxlKFwiQWRkIG5ldyBjYXRlZ29yeS4uLlwiKVxuICAgICAgICAgICAgICAgIC5zZXRJY29uKCdwbHVzJylcbiAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENsb3NlIGNvbnRleHQgbWVudSBhbmQgcHJvbXB0IGZvciBuZXcgY2F0ZWdvcnlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q2F0ZWdvcnkgPSBhd2FpdCB0aGlzLnByb21wdEZvckNhdGVnb3J5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdDYXRlZ29yeSAmJiBuZXdDYXRlZ29yeS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbdGhlbWVOYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MudGhlbWVDYXRlZ29yaWVzW3RoZW1lTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbdGhlbWVOYW1lXS5pbmNsdWRlcyhuZXdDYXRlZ29yeS50cmltKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy50aGVtZUNhdGVnb3JpZXNbdGhlbWVOYW1lXS5wdXNoKG5ld0NhdGVnb3J5LnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2hTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEFkZGVkIGNhdGVnb3J5IFwiJHtuZXdDYXRlZ29yeS50cmltKCl9XCIgdG8gJHt0aGVtZU5hbWV9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFRoZW1lIGFscmVhZHkgaGFzIGNhdGVnb3J5IFwiJHtuZXdDYXRlZ29yeS50cmltKCl9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZW1vdmUgYWxsIGNhdGVnb3JpZXNcbiAgICAgICAgaWYgKGN1cnJlbnRDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1lbnUuYWRkU2VwYXJhdG9yKCk7XG4gICAgICAgICAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgICAgICAgIC5zZXRUaXRsZShcIlJlbW92ZSBhbGwgY2F0ZWdvcmllc1wiKVxuICAgICAgICAgICAgICAgICAgICAuc2V0SWNvbigndHJhc2gnKVxuICAgICAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnRoZW1lQ2F0ZWdvcmllc1t0aGVtZU5hbWVdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlbW92ZWQgYWxsIGNhdGVnb3JpZXMgZnJvbSAke3RoZW1lTmFtZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcHJvbXB0Rm9yQ2F0ZWdvcnkoKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvbXB0TW9kYWwgPSBuZXcgQ2F0ZWdvcnlQcm9tcHRNb2RhbCh0aGlzLmFwcCwgKGNhdGVnb3J5KSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShjYXRlZ29yeSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHByb21wdE1vZGFsLm9wZW4oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIHVwZGF0ZVByZXZpZXdCdXR0b25TdGF0ZXMob2xkVGhlbWU6IHN0cmluZyB8IG51bGwsIG5ld1RoZW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3VwZGF0ZVByZXZpZXdCdXR0b25TdGF0ZXMgY2FsbGVkOicsIHsgb2xkVGhlbWUsIG5ld1RoZW1lIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbGwgcHJldmlldyBidXR0b25zIGJ5IGRhdGEtdGhlbWUgYXR0cmlidXRlXG4gICAgICAgIGNvbnN0IGFsbEJ1dHRvbnMgPSB0aGlzLm1vZGFsRWwucXVlcnlTZWxlY3RvckFsbCgnLnRoZW1lLXByZXZpZXctYnRuJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZygnRm91bmQgYnV0dG9uczonLCBhbGxCdXR0b25zLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICBhbGxCdXR0b25zLmZvckVhY2goKGJ0bikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGhlbWVOYW1lID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS10aGVtZScpO1xuICAgICAgICAgICAgaWYgKCF0aGVtZU5hbWUpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoZW1lTmFtZSA9PT0gbmV3VGhlbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBncmVlbiBidXR0b24gZm9yOicsIHRoZW1lTmFtZSk7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBub3cgdGhlIHByZXZpZXdlZCB0aGVtZSAtIG1ha2UgaXQgZ3JlZW4gQXBwbHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgYnRuLnRleHRDb250ZW50ID0gJ+KckyBBcHBseSc7XG4gICAgICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZSgndGl0bGUnLCAnQXBwbHkgdGhpcyB0aGVtZSBhbmQgY2xvc2UnKTtcbiAgICAgICAgICAgICAgICAoYnRuIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnIzRDQUY1MCc7XG4gICAgICAgICAgICAgICAgKGJ0biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuY29sb3IgPSAnd2hpdGUnO1xuICAgICAgICAgICAgICAgIChidG4gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzRDQUY1MCc7XG4gICAgICAgICAgICAgICAgKGJ0biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvbGRUaGVtZSAmJiB0aGVtZU5hbWUgPT09IG9sZFRoZW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JldmVydGluZyBidXR0b24gZm9yOicsIHRoZW1lTmFtZSk7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyB3YXMgdGhlIG9sZCBwcmV2aWV3IC0gcmV2ZXJ0IHRvIFByZXZpZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgYnRuLnRleHRDb250ZW50ID0gJ/CfkYEgUHJldmlldyc7XG4gICAgICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZSgndGl0bGUnLCAnUHJldmlldyB0aGlzIHRoZW1lJyk7XG4gICAgICAgICAgICAgICAgKGJ0biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3ZhcigtLWJhY2tncm91bmQtcHJpbWFyeSknO1xuICAgICAgICAgICAgICAgIChidG4gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmNvbG9yID0gJ3ZhcigtLXRleHQtbm9ybWFsKSc7XG4gICAgICAgICAgICAgICAgKGJ0biBhcyBIVE1MRWxlbWVudCkuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlciknO1xuICAgICAgICAgICAgICAgIChidG4gYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmZvbnRXZWlnaHQgPSAnNDAwJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVmcmVzaFN1Z2dlc3Rpb25zKCkge1xuICAgICAgICAvLyBSZWZyZXNoIHRoZSBjYXRlZ29yeSBmaWx0ZXIgYnV0dG9uc1xuICAgICAgICBjb25zdCBvbGRGaWx0ZXIgPSB0aGlzLm1vZGFsRWwucXVlcnlTZWxlY3RvcignLmNhdGVnb3J5LWZpbHRlcicpO1xuICAgICAgICBpZiAob2xkRmlsdGVyKSB7XG4gICAgICAgICAgICBvbGRGaWx0ZXIucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRDYXRlZ29yeUZpbHRlcigpO1xuXG4gICAgICAgIC8vIFJlZnJlc2ggdGhlIHN1Z2dlc3Rpb24gbGlzdFxuICAgICAgICAvL0B0cy1pZ25vcmVcbiAgICAgICAgdGhpcy51cGRhdGVTdWdnZXN0aW9ucygpO1xuICAgIH1cblxuICAgIG9uQ2hvb3NlSXRlbShpdGVtOiBzdHJpbmcsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wcmV2aWV3aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudFByZXZpZXdUaGVtZSA9IG51bGw7XG4gICAgICAgIHRoaXMuc2V0VGhlbWUoaXRlbSk7XG4gICAgfVxuXG4gICAgc2V0VGhlbWUodGhlbWVOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgLy9AdHMtaWdub3JlXG4gICAgICAgIHRoaXMuYXBwLmN1c3RvbUNzcy5zZXRUaGVtZSh0aGVtZU5hbWUpO1xuICAgIH1cbn1cblxuLy8gU2ltcGxlIG1vZGFsIHRvIHByb21wdCBmb3IgY2F0ZWdvcnkgbmFtZVxuY2xhc3MgQ2F0ZWdvcnlQcm9tcHRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBvblN1Ym1pdDogKGNhdGVnb3J5OiBzdHJpbmcgfCBudWxsKSA9PiB2b2lkO1xuICAgIGlucHV0RWwhOiBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG9uU3VibWl0OiAoY2F0ZWdvcnk6IHN0cmluZyB8IG51bGwpID0+IHZvaWQpIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5vblN1Ym1pdCA9IG9uU3VibWl0O1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdBZGQgbmV3IGNhdGVnb3J5JyB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaW5wdXRFbCA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnaW5wdXQnLCB7IFxuICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdDYXRlZ29yeSBuYW1lJ1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5pbnB1dEVsLmZvY3VzKCk7XG5cbiAgICAgICAgY29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogJ21vZGFsLWJ1dHRvbi1jb250YWluZXInIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3VibWl0QnRuID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IFxuICAgICAgICAgICAgdGV4dDogJ0FkZCcsXG4gICAgICAgICAgICBjbHM6ICdtb2QtY3RhJ1xuICAgICAgICB9KTtcbiAgICAgICAgc3VibWl0QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uU3VibWl0KHRoaXMuaW5wdXRFbC52YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY2FuY2VsQnRuID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdDYW5jZWwnIH0pO1xuICAgICAgICBjYW5jZWxCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25TdWJtaXQobnVsbCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU3VibWl0IG9uIEVudGVyIGtleVxuICAgICAgICB0aGlzLmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uU3VibWl0KHRoaXMuaW5wdXRFbC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uU3VibWl0KG51bGwpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuLy8gSW1wb3J0IE1vZGFsIGNsYXNzXG5pbXBvcnQgeyBNb2RhbCB9IGZyb20gXCJvYnNpZGlhblwiO1xuIiwiaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFRoZW1lQ2F0ZWdvcml6ZXJNb2RhbCBmcm9tICcuL3RoZW1lLWNhdGVnb3JpemVyLW1vZGFsJztcblxuaW50ZXJmYWNlIFRoZW1lQ2F0ZWdvcml6ZXJTZXR0aW5ncyB7XG4gICAgdGhlbWVDYXRlZ29yaWVzOiB7IFt0aGVtZU5hbWU6IHN0cmluZ106IHN0cmluZ1tdIH07XG4gICAgY2F0ZWdvcnlDb2xvcnM6IHsgW2NhdGVnb3J5TmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG4gICAgbGFzdFNlbGVjdGVkQ2F0ZWdvcnk6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFRoZW1lQ2F0ZWdvcml6ZXJTZXR0aW5ncyA9IHtcbiAgICB0aGVtZUNhdGVnb3JpZXM6IHt9LFxuICAgIGNhdGVnb3J5Q29sb3JzOiB7fSxcbiAgICBsYXN0U2VsZWN0ZWRDYXRlZ29yeTogbnVsbFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGhlbWVDYXRlZ29yaXplclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3MhOiBUaGVtZUNhdGVnb3JpemVyU2V0dGluZ3M7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdvcGVuLXRoZW1lLWNhdGVnb3JpemVyJyxcbiAgICAgICAgICAgIG5hbWU6ICdPcGVuIFRoZW1lIENhdGVnb3JpemVyJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgVGhlbWVDYXRlZ29yaXplck1vZGFsKFxuICAgICAgICAgICAgICAgIHRoaXMuYXBwLCBcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLCBcbiAgICAgICAgICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncy5iaW5kKHRoaXMpXG4gICAgICAgICAgICApLm9wZW4oKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICAgIH1cblxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiRnV6enlTdWdnZXN0TW9kYWwiLCJOb3RpY2UiLCJNZW51IiwiTW9kYWwiLCJQbHVnaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEgsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDL0QsUUFBUSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25HLFFBQVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RHLFFBQVEsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUE2TUQ7QUFDdUIsT0FBTyxlQUFlLEtBQUssVUFBVSxHQUFHLGVBQWUsR0FBRyxVQUFVLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFO0FBQ3ZILElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFVBQVUsR0FBRyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGOztBQ25VYyxNQUFPLHFCQUFzQixTQUFRQSwwQkFBeUIsQ0FBQTtBQWN4RSxJQUFBLFdBQUEsQ0FBWSxHQUFRLEVBQUUsUUFBa0MsRUFBRSxZQUFpQyxFQUFBO1FBQ3ZGLEtBQUssQ0FBQyxHQUFHLENBQUM7UUFkZCxJQUFBLENBQUEsaUJBQWlCLEdBQUcsRUFBRTtRQUN0QixJQUFBLENBQUEsa0JBQWtCLEdBQUcsTUFBTTtRQUczQixJQUFBLENBQUEsZ0JBQWdCLEdBQWtCLElBQUk7UUFJdEMsSUFBQSxDQUFBLFVBQVUsR0FBRyxLQUFLO1FBQ2xCLElBQUEsQ0FBQSxtQkFBbUIsR0FBa0IsSUFBSTtBQU1yQyxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUTtBQUN4QixRQUFBLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWTs7UUFHaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLCtCQUErQixDQUFDO1FBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQzs7O1FBSXJELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDOztRQUVqRixNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLFdBQVcsQ0FBQztBQUVyRixRQUFBLE1BQU0sZUFBZSxHQUFHLENBQUMsWUFBaUMsRUFBRSxLQUE0QixLQUFJO0FBQ3hGLFlBQUEsT0FBTyxVQUFTLENBQWdCLEVBQUE7QUFDNUIsZ0JBQUEsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLG1CQUFtQjtBQUVqRCxnQkFBQSxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQW1CLENBQUM7O0FBRXBDLGdCQUFBLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSTtBQUMzRSxnQkFBQSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsYUFBYTtBQUN6QyxnQkFBQSxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztBQUM3QixnQkFBQSxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUk7O0FBR3ZCLGdCQUFBLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDO0FBQ25FLFlBQUEsQ0FBQztBQUNMLFFBQUEsQ0FBQztRQUVELElBQUksb0JBQW9CLEVBQUU7WUFDdEIsb0JBQW9CLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQ2hGO1FBQ0EsSUFBSSxzQkFBc0IsRUFBRTtZQUN4QixzQkFBc0IsQ0FBQyxJQUFJLEdBQUcsZUFBZSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7UUFDcEY7SUFDSjtJQUVBLE1BQU0sR0FBQTs7QUFDRixRQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEVBQTRFLENBQUM7OztRQUd6RixPQUFPLENBQUMsR0FBRyxDQUFDLG1FQUFtRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUM7UUFDcEgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CO1FBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0RBQXdELEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBRTVGLEtBQUssQ0FBQyxNQUFNLEVBQUU7O1FBR2QsSUFBSSxDQUFDLGlCQUFpQixFQUFFOztRQUd4QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUs7O1FBRTVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7QUFDM0YsUUFBQSxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUU7O0FBRW5CLFlBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDOztBQUUxQyxZQUFBLENBQUEsRUFBQSxHQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxNQUFBLEdBQUEsTUFBQSxHQUFBLEVBQUEsQ0FBRSxzQkFBc0IsRUFBRTtRQUNqRjtJQUNKO0lBRUEsT0FBTyxHQUFBO1FBQ0gsS0FBSyxDQUFDLE9BQU8sRUFBRTtBQUNmLFFBQUEsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO0FBQ2pCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQ3BDO0FBQ0EsUUFBQSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSTtJQUNuQztJQUVBLGlCQUFpQixHQUFBO0FBQ2IsUUFBQSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1FBRTFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDO1FBQ3RELGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztRQUN6QyxlQUFlLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDM0MsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO1FBQzFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQzs7QUFHMUMsUUFBQSxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtBQUM5QyxZQUFBLElBQUksRUFBRSxLQUFLO0FBQ1gsWUFBQSxHQUFHLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixLQUFLLElBQUksR0FBRyxXQUFXLEdBQUc7QUFDdkQsU0FBQSxDQUFDO0FBQ0YsUUFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFLO0FBQ2hDLFFBQUEsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxhQUFBO0FBQ3hCLFlBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQztBQUNwRCxZQUFBLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJO0FBQzVCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsR0FBRyxJQUFJO0FBQ3pDLFlBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxRUFBcUUsQ0FBQztBQUNsRixZQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRTtBQUN6QixZQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUM7WUFDaEQsSUFBSSxDQUFDLHFCQUFxQixFQUFFOztZQUU1QixJQUFJLENBQUMsaUJBQWlCLEVBQUU7QUFDNUIsUUFBQSxDQUFDLENBQUE7O0FBR0QsUUFBQSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7QUFDMUMsUUFBQSxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBRztBQUNyQixZQUFBLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO0FBQzNDLGdCQUFBLElBQUksRUFBRSxHQUFHO0FBQ1QsZ0JBQUEsR0FBRyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxHQUFHLEdBQUcsV0FBVyxHQUFHO0FBQ3RELGFBQUEsQ0FBQztBQUNGLFlBQUEsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSztBQUM3QixZQUFBLEdBQUcsQ0FBQyxPQUFPLEdBQUcsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsYUFBQTtBQUNyQixnQkFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsQ0FBQztBQUMvRCxnQkFBQSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsR0FBRztBQUMzQixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixHQUFHLEdBQUc7QUFDeEMsZ0JBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLENBQUM7QUFDbEYsZ0JBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3pCLGdCQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUM7Z0JBQ2hELElBQUksQ0FBQyxxQkFBcUIsRUFBRTs7Z0JBRTVCLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtBQUM1QixZQUFBLENBQUMsQ0FBQTtBQUNMLFFBQUEsQ0FBQyxDQUFDO0lBQ047SUFFQSxxQkFBcUIsR0FBQTtRQUNqQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1FBQ3hFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFJO0FBQ3pCLFlBQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQ2pDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFFO0FBQzdDLGdCQUFBLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztZQUNsQztpQkFBTztBQUNILGdCQUFtQixJQUFJLENBQUMsZ0JBQWdCO2dCQUN4QyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQzNDLG9CQUFBLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztnQkFDbEM7WUFDSjtBQUNKLFFBQUEsQ0FBQyxDQUFDO0lBQ047SUFFQSxnQkFBZ0IsR0FBQTtBQUNaLFFBQUEsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQVU7QUFDcEMsUUFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBRztBQUN4RCxZQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUMsUUFBQSxDQUFDLENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFFO0lBQ3hDO0lBRUEsUUFBUSxHQUFBOztBQUVKLFFBQUEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQzs7QUFHL0gsUUFBQSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtBQUN2QixZQUFBLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBRztBQUMzQixnQkFBQSxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsaUJBQWlCO0FBQUUsb0JBQUEsT0FBTyxJQUFJO0FBQ2pELGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0JBQWlCLENBQUM7QUFDaEQsWUFBQSxDQUFDLENBQUM7UUFDTjtBQUVBLFFBQUEsT0FBTyxNQUFNO0lBQ2pCO0FBRUEsSUFBQSxXQUFXLENBQUMsSUFBWSxFQUFBO0FBQ3BCLFFBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ2pDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQjtRQUNsQzs7QUFFQSxRQUFBLE9BQU8sSUFBSTtJQUNmOztJQUdBLGdCQUFnQixDQUFDLEtBQXlCLEVBQUUsRUFBZSxFQUFBOztRQUd2RCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFO0FBQ3ZDLFlBQUEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3BEO1FBQ0o7O0FBR0EsUUFBQSxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLENBQUM7QUFDL0QsUUFBQSxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNO0FBQ2hDLFFBQUEsU0FBUyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsZUFBZTtBQUNoRCxRQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFFBQVE7QUFDckMsUUFBQSxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNOztBQUc5QixRQUFBLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztBQUNyRSxRQUFBLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUc7QUFDOUIsUUFBQSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNO0FBQ3BDLFFBQUEsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBTTtBQUNyQyxRQUFBLGFBQWEsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFFBQVE7QUFDekMsUUFBQSxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLOztBQUcvQixRQUFBLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNsQyxZQUFBLEdBQUcsRUFBRTtBQUNSLFNBQUEsQ0FBQztBQUNGLFFBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSzs7QUFHL0IsUUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtBQUM1RCxRQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDakIsWUFBQSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLENBQUM7QUFDekUsWUFBQSxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNO0FBQ25DLFlBQUEsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBTTtBQUNwQyxZQUFBLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUs7QUFDOUIsWUFBQSxZQUFZLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRO0FBRXhDLFlBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUc7QUFDZixnQkFBQSxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtBQUN6QyxvQkFBQSxJQUFJLEVBQUUsR0FBRztBQUNULG9CQUFBLEdBQUcsRUFBRTtBQUNSLGlCQUFBLENBQUM7QUFDRixnQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxNQUFNO0FBQzlCLGdCQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFNBQVM7QUFDaEMsZ0JBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSzs7QUFFakMsZ0JBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsMEJBQTBCO0FBQ3pELGdCQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLHdCQUF3QjtBQUM3QyxnQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxvQ0FBb0M7QUFDMUQsZ0JBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUztBQUMvQixnQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxnQkFBZ0I7Z0JBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztBQUMvQixnQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxRQUFRO0FBQ2pDLGdCQUFBLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQSxpQkFBQSxFQUFvQixHQUFHLFlBQVk7O0FBR2xELGdCQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsTUFBSztBQUN2QyxvQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTO0FBQ3hDLG9CQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFNBQVM7QUFDOUIsb0JBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsbUJBQW1CO0FBQ3pDLG9CQUFBLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQSxFQUFBLEVBQUssR0FBRyxFQUFFO0FBQ25DLGdCQUFBLENBQUMsQ0FBQztBQUNGLGdCQUFBLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsTUFBSztBQUN2QyxvQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRywwQkFBMEI7QUFDekQsb0JBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsd0JBQXdCO0FBQzdDLG9CQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLG9DQUFvQztBQUMxRCxvQkFBQSxNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUc7QUFDNUIsZ0JBQUEsQ0FBQyxDQUFDOztnQkFHRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQU8sS0FBaUIsS0FBSSxTQUFBLENBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsYUFBQTtvQkFDekQsS0FBSyxDQUFDLGNBQWMsRUFBRTtvQkFDdEIsS0FBSyxDQUFDLGVBQWUsRUFBRTtvQkFDdkIsS0FBSyxDQUFDLHdCQUF3QixFQUFFOztvQkFHaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUNwRSxvQkFBQSxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUU7OztvQkFJekIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7QUFDckUsb0JBQUEsTUFBTSxTQUFTLEdBQUcsQ0FBQSxlQUFlLEtBQUEsSUFBQSxJQUFmLGVBQWUsS0FBQSxNQUFBLEdBQUEsTUFBQSxHQUFmLGVBQWUsQ0FBRSxTQUFTLEtBQUksQ0FBQzs7QUFFakQsb0JBQUEsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZO29CQUUvQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7O29CQUd6QixJQUFJLGVBQWUsRUFBRTtBQUNqQix3QkFBQSxlQUFlLENBQUMsU0FBUyxHQUFHLFNBQVM7b0JBQ3pDOztBQUVBLG9CQUFBLElBQUksYUFBYSxJQUFJLENBQUMsRUFBRTs7QUFFcEIsd0JBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO29CQUMvQztvQkFFQSxJQUFJQyxlQUFNLENBQUMsQ0FBQSxTQUFBLEVBQVksR0FBRyxDQUFBLE9BQUEsRUFBVSxLQUFLLENBQUMsSUFBSSxDQUFBLENBQUUsQ0FBQztnQkFDckQsQ0FBQyxDQUFBLENBQUM7QUFDTixZQUFBLENBQUMsQ0FBQztRQUNOOztBQUdBLFFBQUEsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsQ0FBQztBQUNyRSxRQUFBLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU07QUFDdEMsUUFBQSxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLOztBQUlqQyxRQUFBLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO0FBQ2xELFlBQUEsR0FBRyxFQUFFO0FBQ1IsU0FBQSxDQUFDOztRQUVGLFVBQVUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDakQsUUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTO0FBQ25DLFFBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsVUFBVTtBQUNyQyxRQUFBLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU07QUFDbEMsUUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxLQUFLO0FBQ3JDLFFBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsNkNBQTZDO0FBQ3ZFLFFBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCOztRQUc5QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLEtBQUssS0FBSyxDQUFDLElBQUk7UUFFNUQsSUFBSSxZQUFZLEVBQUU7O0FBRWQsWUFBQSxVQUFVLENBQUMsV0FBVyxHQUFHLFNBQVM7QUFDbEMsWUFBQSxVQUFVLENBQUMsS0FBSyxHQUFHLDRCQUE0QjtBQUMvQyxZQUFBLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVM7QUFDNUMsWUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPO0FBQ2hDLFlBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsbUJBQW1CO0FBQzdDLFlBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSztRQUN2QzthQUFPOztBQUVILFlBQUEsVUFBVSxDQUFDLFdBQVcsR0FBRyxZQUFZO0FBQ3JDLFlBQUEsVUFBVSxDQUFDLEtBQUssR0FBRyxvQkFBb0I7QUFDdkMsWUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRywyQkFBMkI7QUFDOUQsWUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxvQkFBb0I7QUFDN0MsWUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLO1FBQ3ZDOztBQUdBLFFBQUEsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFLO1lBQzNDLElBQUksWUFBWSxFQUFFO0FBQ2QsZ0JBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsU0FBUztZQUNoRDtpQkFBTztBQUNILGdCQUFBLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGtDQUFrQztZQUN6RTtBQUNKLFFBQUEsQ0FBQyxDQUFDO0FBQ0YsUUFBQSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE1BQUs7WUFDM0MsSUFBSSxZQUFZLEVBQUU7QUFDZCxnQkFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTO1lBQ2hEO2lCQUFPO0FBQ0gsZ0JBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsMkJBQTJCO1lBQ2xFO0FBQ0osUUFBQSxDQUFDLENBQUM7O1FBR0YsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQWlCLEtBQUk7WUFDdkQsS0FBSyxDQUFDLGNBQWMsRUFBRTtZQUN0QixLQUFLLENBQUMsZUFBZSxFQUFFO1lBQ3ZCLEtBQUssQ0FBQyx3QkFBd0IsRUFBRTtZQUVoQyxJQUFJLFlBQVksRUFBRTs7QUFFZCxnQkFBQSxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUs7QUFDdkIsZ0JBQUEsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUk7QUFDL0IsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUN6QixJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hCO2lCQUFPOztBQUVILGdCQUF3QixJQUFJLENBQUM7O0FBRzdCLGdCQUFBLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsSUFBSTtBQUNyQyxnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDekIsZ0JBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJOzs7Z0JBSXRCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0FBQ3JFLGdCQUFBLE1BQU0sU0FBUyxHQUFHLENBQUEsZUFBZSxLQUFBLElBQUEsSUFBZixlQUFlLEtBQUEsTUFBQSxHQUFBLE1BQUEsR0FBZixlQUFlLENBQUUsU0FBUyxLQUFJLENBQUM7OztnQkFJakQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUM7O2dCQUczRSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7O0FBR3pCLGdCQUFBLElBQUksU0FBUyxJQUFJLENBQUMsRUFBRTs7QUFFaEIsb0JBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDO29CQUN2QyxJQUFJLGVBQWUsRUFBRTtBQUNqQix3QkFBQSxlQUFlLENBQUMsU0FBUyxHQUFHLFNBQVM7b0JBQ3pDO2dCQUNKO1lBQ0o7QUFDSixRQUFBLENBQUMsQ0FBQzs7QUFHRixRQUFBLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO0FBQzdDLFlBQUEsSUFBSSxFQUFFLEdBQUc7QUFDVCxZQUFBLEdBQUcsRUFBRTtBQUNSLFNBQUEsQ0FBQztBQUNGLFFBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUztBQUNoQyxRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU87QUFDL0IsUUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxNQUFNO0FBQy9CLFFBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSztBQUM3QixRQUFBLE9BQU8sQ0FBQyxLQUFLLEdBQUcsbUJBQW1COztBQUduQyxRQUFBLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsTUFBSztBQUN4QyxZQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEdBQUc7QUFDL0IsUUFBQSxDQUFDLENBQUM7QUFDRixRQUFBLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsTUFBSztBQUN4QyxZQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUs7QUFDakMsUUFBQSxDQUFDLENBQUM7O1FBR0YsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQWlCLEtBQUk7WUFDcEQsS0FBSyxDQUFDLGNBQWMsRUFBRTtZQUN0QixLQUFLLENBQUMsZUFBZSxFQUFFO1lBQ3ZCLEtBQUssQ0FBQyx3QkFBd0IsRUFBRTs7QUFHaEMsWUFBQSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CO0FBQ2hELFlBQUEsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJO0FBQ3JDLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ3pCLFlBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJO1lBQ3RCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQztZQUUzRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQzNDLFFBQUEsQ0FBQyxDQUFDO0lBQ047SUFFQSxlQUFlLENBQUMsS0FBaUIsRUFBRSxTQUFpQixFQUFBO0FBQ2hELFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSUMsYUFBSSxFQUFFOzs7UUFJdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFhLEtBQUk7OztZQUVqRCxJQUFLLENBQUMsQ0FBQyxNQUFzQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7aUJBQzlELENBQUEsRUFBQSxHQUFDLENBQUMsQ0FBQyxNQUFzQixDQUFDLFdBQVcsMENBQUUsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDbkUsaUJBQUEsQ0FBQSxFQUFBLEdBQUMsQ0FBQyxDQUFDLE1BQXNCLENBQUMsV0FBVyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsTUFBQSxHQUFBLE1BQUEsR0FBQSxFQUFBLENBQUUsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBLEVBQUU7aUJBRTVEOztnQkFFSCxDQUFDLENBQUMsZUFBZSxFQUFFO1lBQ3ZCO0FBQ0osUUFBQSxDQUFDLENBQUM7O0FBR0YsUUFBQSxJQUFJLFNBQVMsS0FBSyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7WUFDdEM7UUFDSjtBQUVBLFFBQUEsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO0FBQ3hFLFFBQUEsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFOztBQUc3QyxRQUFBLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDMUIsWUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ2xCLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO0FBQzlCLGdCQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQzFCLFlBQUEsQ0FBQyxDQUFDO0FBRUYsWUFBQSxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBRztBQUM3QixnQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJO29CQUNsQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQzs7QUFHeEMsb0JBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFFekIsb0JBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxhQUFBOzt3QkFFeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFOzRCQUMzQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO3dCQUNqRDs7QUFHQSx3QkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQzlELDRCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDdkQsNEJBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFOzs7NEJBSXpCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0FBQ3JFLDRCQUFBLE1BQU0sU0FBUyxHQUFHLENBQUEsZUFBZSxLQUFBLElBQUEsSUFBZixlQUFlLEtBQUEsTUFBQSxHQUFBLE1BQUEsR0FBZixlQUFlLENBQUUsU0FBUyxLQUFJLENBQUM7O0FBRWpELDRCQUFBLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTs0QkFFL0MsSUFBSSxDQUFDLGtCQUFrQixFQUFFOzs0QkFHekIsSUFBSSxlQUFlLEVBQUU7QUFDakIsZ0NBQUEsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTOzRCQUN6Qzs7QUFFQSw0QkFBQSxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUU7O0FBRXBCLGdDQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQzs0QkFDL0M7NEJBRUEsSUFBSUQsZUFBTSxDQUFDLENBQUEsT0FBQSxFQUFVLFFBQVEsUUFBUSxTQUFTLENBQUEsQ0FBRSxDQUFDO3dCQUNyRDs7QUFHQSx3QkFBQSxPQUFPLEtBQUs7b0JBQ2hCLENBQUMsQ0FBQSxDQUFDOzs7b0JBSUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7b0JBQ3hELElBQUksTUFBTSxFQUFFO3dCQUNSLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBTyxDQUFhLEtBQUksU0FBQSxDQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLGFBQUE7QUFDckQsNEJBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxRQUFRLENBQUM7NEJBQ3JELENBQUMsQ0FBQyxjQUFjLEVBQUU7NEJBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUU7NEJBQ25CLENBQUMsQ0FBQyx3QkFBd0IsRUFBRTs7NEJBRzVCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsUUFBUSxDQUFBLGtCQUFBLENBQW9CLENBQUM7QUFDM0UsNEJBQUEsSUFBSSxDQUFDLFNBQVM7Z0NBQUU7O0FBR2hCLDRCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFHO0FBQ3ZELGdDQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztBQUNoQyxvQ0FBQSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLENBQUM7QUFDeEUsNEJBQUEsQ0FBQyxDQUFDO0FBRUYsNEJBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFOzs7NEJBSXpCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0FBQ3JFLDRCQUFBLE1BQU0sU0FBUyxHQUFHLENBQUEsZUFBZSxLQUFBLElBQUEsSUFBZixlQUFlLEtBQUEsTUFBQSxHQUFBLE1BQUEsR0FBZixlQUFlLENBQUUsU0FBUyxLQUFJLENBQUM7O0FBRWpELDRCQUFBLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTs7NEJBRy9DLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBRVgsSUFBSSxDQUFDLGtCQUFrQixFQUFFOzs0QkFHekIsSUFBSSxlQUFlLEVBQUU7QUFDakIsZ0NBQUEsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTOzRCQUN6Qzs7QUFFQSw0QkFBQSxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUU7O0FBRXBCLGdDQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQzs0QkFDL0M7QUFFQSw0QkFBQSxJQUFJQSxlQUFNLENBQUMsQ0FBQSxrQkFBQSxFQUFxQixRQUFRLENBQUEsaUJBQUEsQ0FBbUIsQ0FBQzt3QkFDaEUsQ0FBQyxDQUFBLENBQUM7b0JBQ047QUFDSixnQkFBQSxDQUFDLENBQUM7QUFDTixZQUFBLENBQUMsQ0FBQztZQUVGLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDdkI7O0FBR0EsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJO1lBQ2xCO2lCQUNLLFFBQVEsQ0FBQyxxQkFBcUI7aUJBQzlCLE9BQU8sQ0FBQyxNQUFNO2lCQUNkLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxhQUFBOztBQUVoQixnQkFBQSxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtBQUNsRCxnQkFBQSxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDM0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtvQkFDakQ7QUFDQSxvQkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO0FBQ3hFLHdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDakUsd0JBQUEsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFO3dCQUN6QixJQUFJLENBQUMsa0JBQWtCLEVBQUU7d0JBQ3pCLElBQUlBLGVBQU0sQ0FBQyxDQUFBLGdCQUFBLEVBQW1CLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxLQUFBLEVBQVEsU0FBUyxDQUFBLENBQUUsQ0FBQztvQkFDeEU7eUJBQU87d0JBQ0gsSUFBSUEsZUFBTSxDQUFDLENBQUEsNEJBQUEsRUFBK0IsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUEsQ0FBRyxDQUFDO29CQUNwRTtnQkFDSjtZQUNKLENBQUMsQ0FBQSxDQUFDO0FBQ1YsUUFBQSxDQUFDLENBQUM7O0FBR0YsUUFBQSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksRUFBRTtBQUNuQixZQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUk7Z0JBQ2xCO3FCQUNLLFFBQVEsQ0FBQyx1QkFBdUI7cUJBQ2hDLE9BQU8sQ0FBQyxPQUFPO3FCQUNmLE9BQU8sQ0FBQyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxhQUFBO29CQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO0FBQzdDLG9CQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRTtvQkFDekIsSUFBSSxDQUFDLGtCQUFrQixFQUFFO0FBQ3pCLG9CQUFBLElBQUlBLGVBQU0sQ0FBQyxDQUFBLDRCQUFBLEVBQStCLFNBQVMsQ0FBQSxDQUFFLENBQUM7Z0JBQzFELENBQUMsQ0FBQSxDQUFDO0FBQ1YsWUFBQSxDQUFDLENBQUM7UUFDTjtBQUVBLFFBQUEsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztJQUNoQztJQUVNLGlCQUFpQixHQUFBOztBQUNuQixZQUFBLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUk7QUFDM0IsZ0JBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxLQUFJO29CQUMvRCxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ3JCLGdCQUFBLENBQUMsQ0FBQztnQkFDRixXQUFXLENBQUMsSUFBSSxFQUFFO0FBQ3RCLFlBQUEsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFBO0FBQUEsSUFBQTtJQUlELHlCQUF5QixDQUFDLFFBQXVCLEVBQUUsUUFBZ0IsRUFBQTtRQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDOztRQUd4RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDO1FBRXRFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQztBQUVoRCxRQUFBLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUk7WUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7QUFDaEQsWUFBQSxJQUFJLENBQUMsU0FBUztnQkFBRTtBQUVoQixZQUFBLElBQUksU0FBUyxLQUFLLFFBQVEsRUFBRTtBQUN4QixnQkFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsQ0FBQzs7QUFFbkQsZ0JBQUEsR0FBRyxDQUFDLFdBQVcsR0FBRyxTQUFTO0FBQzNCLGdCQUFBLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLDRCQUE0QixDQUFDO0FBQ3RELGdCQUFBLEdBQW1CLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTO0FBQ3JELGdCQUFBLEdBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPO0FBQ3pDLGdCQUFBLEdBQW1CLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxtQkFBbUI7QUFDdEQsZ0JBQUEsR0FBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUs7WUFDakQ7QUFBTyxpQkFBQSxJQUFJLFFBQVEsSUFBSSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzNDLGdCQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDOztBQUUvQyxnQkFBQSxHQUFHLENBQUMsV0FBVyxHQUFHLFlBQVk7QUFDOUIsZ0JBQUEsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUM7QUFDOUMsZ0JBQUEsR0FBbUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLDJCQUEyQjtBQUN2RSxnQkFBQSxHQUFtQixDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsb0JBQW9CO0FBQ3RELGdCQUFBLEdBQW1CLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyw2Q0FBNkM7QUFDaEYsZ0JBQUEsR0FBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUs7WUFDakQ7QUFDSixRQUFBLENBQUMsQ0FBQztJQUNOO0lBRUEsa0JBQWtCLEdBQUE7O1FBRWQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUM7UUFDaEUsSUFBSSxTQUFTLEVBQUU7WUFDWCxTQUFTLENBQUMsTUFBTSxFQUFFO1FBQ3RCO1FBQ0EsSUFBSSxDQUFDLGlCQUFpQixFQUFFOzs7UUFJeEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFO0lBQzVCO0lBRUEsWUFBWSxDQUFDLElBQVksRUFBRSxHQUErQixFQUFBO0FBQ3RELFFBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUk7QUFDL0IsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztJQUN2QjtBQUVBLElBQUEsUUFBUSxDQUFDLFNBQWlCLEVBQUE7O1FBRXRCLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7SUFDMUM7QUFDSDtBQUVEO0FBQ0EsTUFBTSxtQkFBb0IsU0FBUUUsY0FBSyxDQUFBO0lBSW5DLFdBQUEsQ0FBWSxHQUFRLEVBQUUsUUFBMkMsRUFBQTtRQUM3RCxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQ1YsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVE7SUFDNUI7SUFFQSxNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJO1FBQzFCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLENBQUM7UUFFdEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtBQUN2QyxZQUFBLElBQUksRUFBRSxNQUFNO0FBQ1osWUFBQSxXQUFXLEVBQUU7QUFDaEIsU0FBQSxDQUFDO0FBQ0YsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtBQUVwQixRQUFBLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQztBQUU5RSxRQUFBLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO0FBQ2pELFlBQUEsSUFBSSxFQUFFLEtBQUs7QUFDWCxZQUFBLEdBQUcsRUFBRTtBQUNSLFNBQUEsQ0FBQztBQUNGLFFBQUEsU0FBUyxDQUFDLE9BQU8sR0FBRyxNQUFLO1lBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDakMsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUNoQixRQUFBLENBQUM7QUFFRCxRQUFBLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQ3hFLFFBQUEsU0FBUyxDQUFDLE9BQU8sR0FBRyxNQUFLO0FBQ3JCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDbkIsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUNoQixRQUFBLENBQUM7O1FBR0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEtBQUk7QUFDM0MsWUFBQSxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssT0FBTyxFQUFFO2dCQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hCO0FBQU8saUJBQUEsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLFFBQVEsRUFBRTtBQUMzQixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDbkIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNoQjtBQUNKLFFBQUEsQ0FBQyxDQUFDO0lBQ047SUFFQSxPQUFPLEdBQUE7QUFDSCxRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJO1FBQzFCLFNBQVMsQ0FBQyxLQUFLLEVBQUU7SUFDckI7QUFDSDs7QUM5c0JELE1BQU0sZ0JBQWdCLEdBQTZCO0FBQy9DLElBQUEsZUFBZSxFQUFFLEVBQUU7QUFDbkIsSUFBQSxjQUFjLEVBQUUsRUFBRTtBQUNsQixJQUFBLG9CQUFvQixFQUFFO0NBQ3pCO0FBRWEsTUFBTyxzQkFBdUIsU0FBUUMsZUFBTSxDQUFBO0lBR2hELE1BQU0sR0FBQTs7QUFDUixZQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRTtZQUV6QixJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ1osZ0JBQUEsRUFBRSxFQUFFLHdCQUF3QjtBQUM1QixnQkFBQSxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixRQUFRLEVBQUUsTUFBTSxJQUFJLHFCQUFxQixDQUNyQyxJQUFJLENBQUMsR0FBRyxFQUNSLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQy9CLENBQUMsSUFBSTtBQUNULGFBQUEsQ0FBQztRQUNOLENBQUMsQ0FBQTtBQUFBLElBQUE7SUFFSyxZQUFZLEdBQUE7O0FBQ2QsWUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlFLENBQUMsQ0FBQTtBQUFBLElBQUE7SUFFSyxZQUFZLEdBQUE7O1lBQ2QsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDdEMsQ0FBQyxDQUFBO0FBQUEsSUFBQTtBQUNKOzs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXX0=
