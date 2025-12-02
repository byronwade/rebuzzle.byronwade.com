# Config-Driven Puzzle Generation System

This directory contains the configuration system for puzzle generation. The system is designed to be:

- **Extensible**: Easy to add new puzzle types
- **Scalable**: Supports multiple puzzle types with consistent quality
- **Configurable**: All prompts, schemas, and rules are defined in configs
- **Type-safe**: Full TypeScript support

## Structure

```text
src/ai/config/
├── global.ts              # Global AI context (applies to all puzzle types)
├── types.ts               # Shared TypeScript types
└── puzzle-types/
    ├── index.ts           # Registry of all puzzle types
    ├── rebus.ts           # Rebus puzzle configuration
    └── word-puzzle.ts     # Word puzzle configuration (example)
```

## Global Context

The `global.ts` file defines shared configuration that applies to ALL puzzle types:

- **Brand Voice**: Tone, style, and personality guidelines
- **Quality Standards**: Minimum quality thresholds and scoring guidelines
- **Difficulty Calibration**: How difficulty is measured across all types
- **AI Model Preferences**: Which models to use for different tasks
- **Constraints**: Common constraints (family-friendly, educational, etc.)

## Puzzle Type Configs

Each puzzle type has its own configuration file that defines:

- **Schema**: Zod schema for the puzzle data structure
- **Generation**: System prompts, user prompts, temperature, model type
- **Validation**: Required fields, constraints, custom validation
- **Difficulty**: How difficulty is calculated for this type
- **Hints**: Hint generation strategy
- **Quality Metrics**: Type-specific quality scoring

## Adding a New Puzzle Type

1. Create a new config file in `puzzle-types/` (e.g., `logic-puzzle.ts`)
2. Define the schema, generation config, validation, difficulty, hints, and quality metrics
3. Import and add to the registry in `puzzle-types/index.ts`
4. The new type is now available system-wide!

Example:

```typescript
// src/ai/config/puzzle-types/logic-puzzle.ts
import type { PuzzleTypeConfig } from "../types"
import { GLOBAL_CONTEXT } from "../global"

export const LOGIC_PUZZLE_CONFIG: PuzzleTypeConfig = {
  id: "logic-puzzle",
  name: "Logic Puzzle",
  // ... rest of config
}

// src/ai/config/puzzle-types/index.ts
import { LOGIC_PUZZLE_CONFIG } from "./logic-puzzle"

export const PUZZLE_TYPE_REGISTRY = {
  // ... existing types
  "logic-puzzle": LOGIC_PUZZLE_CONFIG,
}
```

## Usage

```typescript
import { getPuzzleTypeConfig } from "@/ai/config/puzzle-types"

// Get config for a puzzle type
const config = getPuzzleTypeConfig("rebus")

// Use in generation
const result = await generateMasterPuzzle({
  puzzleType: "rebus",
  targetDifficulty: 5,
  // ... other params
})
```

## Environment Variables

- `DEFAULT_PUZZLE_TYPE`: Default puzzle type to use (defaults to "rebus")
