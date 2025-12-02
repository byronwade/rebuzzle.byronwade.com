# Project Organization Guide

This document outlines the organizational structure and conventions for the Rebuzzle project.

## 📁 Directory Structure

```
rebuzzle/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions/           # Server actions
│   │   ├── api/               # API routes (organized by feature)
│   │   └── [pages]/           # Route pages
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components (shadcn/ui)
│   │   └── [feature].tsx     # Feature-specific components
│   ├── hooks/                 # React hooks (consolidated location)
│   ├── lib/                   # Utility libraries & shared code
│   │   ├── hooks/            # ⚠️ Deprecated - use src/hooks/ instead
│   │   └── [utilities].ts    # Utility functions
│   ├── db/                    # Database layer
│   │   ├── repositories/     # Data access layer
│   │   └── migrations/       # Database migrations
│   └── ai/                    # AI services
├── scripts/                   # Build and utility scripts
├── emails/                    # Email templates
└── public/                    # Static assets
```

## 🎯 Organization Principles

### 1. Component Organization

- **UI Components**: All reusable UI components go in `src/components/ui/`
- **Feature Components**: Feature-specific components go directly in `src/components/`
- **Client Components**: Use `-client.tsx` suffix when extracting client parts from server components
- **Naming**: Use PascalCase for component files (e.g., `GameBoard.tsx`)

### 2. Hooks Location

- **All hooks**: `src/hooks/` (consolidated location)
- ⚠️ Avoid creating hooks in `src/lib/hooks/` - use `src/hooks/` instead

### 3. File Naming Conventions

- **Components**: `PascalCase.tsx` (e.g., `GameBoard.tsx`, `Header.tsx`)
- **Hooks**: `use-camelCase.tsx` (e.g., `use-toast.ts`, `use-mobile.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `gameLogic.ts`, `utils.ts`)
- **Types**: Co-located with usage or in `types/` directory

### 4. Code Organization

- **Server Actions**: `src/app/actions/`
- **API Routes**: `src/app/api/[feature]/`
- **Database**: `src/db/`
- **AI Services**: `src/ai/services/`
- **Utilities**: `src/lib/`

## 🧹 Cleanup Tasks

### Completed
- ✅ Removed duplicate UI components from `src/components/` (use `src/components/ui/`)
- ✅ Consolidated hooks to `src/hooks/`
- ✅ Installed and configured Knip

### To Do
- [ ] Review unused UI components in `src/components/ui/` - keep if part of design system
- [ ] Remove unused dependencies identified by Knip
- [ ] Consolidate scripts folder (mix of .js and .ts files)

## 🔍 Knip Usage

Knip helps identify unused code and dependencies:

```bash
# Check for unused files and exports
npm run knip

# Fix auto-fixable issues
npm run knip:fix
```

**Note**: Some files flagged by Knip are intentionally unused:
- Script files in `scripts/` (utility scripts, not imported)
- Email templates (used dynamically)
- Unused UI components (kept as part of component library)
- Setup scripts (one-time use)

## 📝 Import Paths

Use TypeScript path aliases consistently:

```typescript
// ✅ Good
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"

// ❌ Bad - avoid relative imports
import { Button } from "../../components/ui/button"
```

## 🔄 Migration Notes

### Hooks Migration
- Moved `src/lib/hooks/useEmailNotifications.ts` → `src/hooks/useEmailNotifications.ts`
- Update imports: `@/lib/hooks/useEmailNotifications` → `@/hooks/useEmailNotifications`

### Component Migration
- Removed duplicate components from `src/components/`
- All UI components should be imported from `@/components/ui/*`



