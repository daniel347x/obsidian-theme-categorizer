# Obsidian Theme Categorizer - Updated Files

## Instructions

Copy these files to your WSL project directory:

```bash
cd ~/obsidian-theme-categorizer

# Copy main.ts (overwrites existing)
cp /mnt/e/__daniel347x/__Obsidian/__Inking\ into\ Mind/--TypingMind/Projects\ -\ All/Projects\ -\ Individual/TODO/Projects/obsidian-theme-categorizer/main.ts ./main.ts

# Copy theme-categorizer-modal.ts (new file)
cp /mnt/e/__daniel347x/__Obsidian/__Inking\ into\ Mind/--TypingMind/Projects\ -\ All/Projects\ -\ Individual/TODO/Projects/obsidian-theme-categorizer/theme-categorizer-modal.ts ./theme-categorizer-modal.ts

# Remove old modal file
rm theme-picker-modal.ts

# Rebuild
npm run build

# Commit and push
git add -A
git commit -m "Add category support - settings tab, category filter, multi-tag per theme"
git push origin main
```

## What Changed

### main.ts
- Added `ThemeCategorizerSettings` interface for storing theme categories
- Added settings tab (`ThemeCategorizerSettingTab`) - lists all themes with "Manage Categories" button
- Added category manager modal (`CategoryManagerModal`) - add/remove categories for individual themes
- Plugin now loads/saves category data to `data.json`
- Helper methods: `addCategoryToTheme()`, `removeCategoryFromTheme()`, `getAllCategories()`

### theme-categorizer-modal.ts (renamed from theme-picker-modal.ts)
- Added category filter buttons at top of modal
- Filter themes by selected category
- Display theme categories inline with theme names `[Category1, Category2]`
- Maintains theme preview on arrow key navigation (preserved from original)

## Features

1. **Settings Tab** - Manage categories for each installed theme
2. **Category Filter** - Filter theme picker by category
3. **Multiple Categories per Theme** - Themes can have multiple category tags
4. **Persistent Storage** - Categories saved in plugin data.json

## Next Steps

After copying files and building:

1. Install plugin in Obsidian via BRAT or manual installation
2. Go to Settings → Theme Categorizer
3. Assign categories to your themes (e.g., "Late Night", "TODO List", "Printing")
4. Use command palette → "Open Theme Categorizer" to switch themes with category filtering
