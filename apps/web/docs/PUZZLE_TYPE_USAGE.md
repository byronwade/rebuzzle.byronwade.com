# Puzzle Type Generation Guide

You can now generate specific types of puzzles! Here's how:

## Available Puzzle Types

### 1. Rebus Puzzle (`rebus`)
- **Description**: Visual puzzles using emojis, symbols, and text positioning
- **Default**: Yes (if no type specified)

### 2. Word Puzzle (`word-puzzle`)
- **Description**: Various word-based puzzles including anagrams, word searches, and more

### 3. Riddle (`riddle`)
- **Description**: Text-based puzzles that require lateral thinking, wordplay, and creative problem-solving

### 4. Logic Grid (`logic-grid`)
- **Description**: Einstein-style puzzles requiring deductive reasoning to solve relationships between multiple categories

## API Endpoints

### List Available Types
```bash
GET /api/puzzle/types
```

Returns:
```json
{
  "success": true,
  "types": [
    {
      "id": "rebus",
      "name": "Rebus Puzzle",
      "description": "..."
    },
    {
      "id": "word-puzzle",
      "name": "Word Puzzle",
      "description": "..."
    }
  ],
  "defaultType": "rebus"
}
```

### Regenerate Today's Puzzle (Default Type)
```bash
GET /api/puzzle/regenerate
```

### Regenerate Today's Puzzle (Specific Type)
```bash
# Generate a rebus puzzle
GET /api/puzzle/regenerate?type=rebus

# Generate a word puzzle
GET /api/puzzle/regenerate?type=word-puzzle

# Generate a riddle
GET /api/puzzle/regenerate?type=riddle

# Generate a logic grid puzzle
GET /api/puzzle/regenerate?type=logic-grid
```

### List Types via Regenerate Endpoint
```bash
GET /api/puzzle/regenerate?list=true
```

## Server Actions

### In TypeScript/Server Code

```typescript
import { getTodaysPuzzle, regenerateTodaysPuzzle } from "@/app/actions/puzzleGenerationActions"

// Get today's puzzle (default type)
const result = await getTodaysPuzzle()

// Get today's puzzle (specific type)
const rebusPuzzle = await getTodaysPuzzle("rebus")
const wordPuzzle = await getTodaysPuzzle("word-puzzle")
const riddle = await getTodaysPuzzle("riddle")
const logicGrid = await getTodaysPuzzle("logic-grid")

// Regenerate with specific type
const regenerateResult = await regenerateTodaysPuzzle("logic-grid")
```

## Environment Variable

Set `DEFAULT_PUZZLE_TYPE` in `.env.local` to change the default:

```env
DEFAULT_PUZZLE_TYPE=word-puzzle
```

## Storage

All puzzles are stored with:
- `puzzle` - Generic puzzle display field (works for all types)
- `puzzleType` - Type identifier (e.g., "rebus", "word-puzzle")
- `rebusPuzzle` - Legacy field (only for rebus puzzles, for backward compatibility)
- All other standard fields (answer, explanation, hints, difficulty, etc.)

## Examples

### Generate a Rebus Puzzle
```bash
curl "http://localhost:3000/api/puzzle/regenerate?type=rebus"
```

### Generate a Word Puzzle
```bash
curl "http://localhost:3000/api/puzzle/regenerate?type=word-puzzle"
```

### Generate a Riddle
```bash
curl "http://localhost:3000/api/puzzle/regenerate?type=riddle"
```

### Generate a Logic Grid Puzzle
```bash
curl "http://localhost:3000/api/puzzle/regenerate?type=logic-grid"
```

### Check Available Types
```bash
curl "http://localhost:3000/api/puzzle/types"
```

