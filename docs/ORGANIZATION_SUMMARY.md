# Project Organization Summary

## ✅ Completed Improvements

### 1. Knip Setup
- ✅ Installed Knip as dev dependency
- ✅ Created `knip.json` configuration
- ✅ Created `.knipignore` for intentionally unused files
- ✅ Added scripts to `package.json`:
  - `npm run knip` - Check for unused code
  - `npm run knip:fix` - Auto-fix issues

### 2. Component Organization
- ✅ Removed duplicate UI components from `src/components/`:
  - `button.tsx` (use `src/components/ui/button.tsx`)
  - `card.tsx` (use `src/components/ui/card.tsx`)
  - `input.tsx` (use `src/components/ui/input.tsx`)
  - `dialog.tsx` (use `src/components/ui/dialog.tsx`)
  - `label.tsx` (use `src/components/ui/label.tsx`)
  - `separator.tsx` (use `src/components/ui/separator.tsx`)
  - `radio-group.tsx` (use `src/components/ui/radio-group.tsx`)
  - `dropdown-menu.tsx` (use `src/components/ui/dropdown-menu.tsx`)

### 3. Hooks Consolidation
- ✅ Moved `useEmailNotifications.ts` from `src/lib/hooks/` → `src/hooks/`
- ✅ Removed duplicate `useNotifications.ts` from `src/hooks/`
- ✅ Updated all imports to use new hook locations:
  - `@/lib/hooks/useEmailNotifications` → `@/hooks/useEmailNotifications`
- ✅ Removed empty `src/lib/hooks/` directory

### 4. Documentation
- ✅ Created `PROJECT_ORGANIZATION.md` with organization guidelines
- ✅ Created this summary document

## 📋 Recommendations for Further Cleanup

### Files to Review
Based on Knip output, these files are unused but may be intentional:

1. **Scripts** (utility scripts, not imported):
   - `scripts/generate-migrations.ts`
   - `scripts/setup-database.ts`
   - `scripts/setup-neon-auth.ts`
   - `scripts/setup-neon.ts`
   - `scripts/test-database.ts`
   - ✅ Keep - these are utility scripts

2. **Unused Components** (review if needed):
   - `src/components/AuthCheck.tsx`
   - `src/components/DonateButton.tsx`
   - `src/components/GameOverContent.tsx`
   - `src/components/NewLeaderboard.tsx`
   - `src/components/Settings.tsx`
   - `src/components/ShareButton.tsx`
   - `src/components/LoadingSpinner.tsx`
   - Review if these are truly unused or if they should be kept

3. **Unused Hook**:
   - `src/lib/hooks/useNotifications.ts` - Appears unused but may be legacy code
   - Recommend: Move to `src/hooks/` if needed, or remove if truly unused

### Dependencies to Review

Knip identified 30 unused dependencies. Many are UI component dependencies that are part of a component library. Review carefully:

**Safe to Remove** (if confirmed unused):
- `@types/bcryptjs` - if bcryptjs not used
- `js-cookie` - if not using cookies
- `react-day-picker` - if calendar not used

**Keep** (part of component library):
- All `@radix-ui/*` packages (even if specific components unused)
- `@hookform/resolvers` (for forms)
- UI library dependencies

## 🚀 Next Steps

1. **Run Knip regularly**:
   ```bash
   npm run knip
   ```

2. **Review unused files** and decide what to keep/remove

3. **Consider consolidating scripts** - convert all to TypeScript

4. **Document component usage** - create a component registry

## 📝 File Locations

- **Hooks**: `src/hooks/` (consolidated)
- **UI Components**: `src/components/ui/`
- **Feature Components**: `src/components/`
- **Utilities**: `src/lib/`
- **Scripts**: `scripts/`



