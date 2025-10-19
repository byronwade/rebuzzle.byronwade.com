## 🤖 AI System

Comprehensive AI-powered features for Rebuzzle using Vercel AI SDK with multiple provider support.

## 📁 Structure

```
/ai
├── config.ts                    # AI configuration and settings
├── client.ts                    # Provider-agnostic AI client
├── cache.ts                     # Response caching system
├── monitor.ts                   # Usage monitoring and analytics
├── index.ts                     # Central exports
└── services/
    ├── puzzle-generator.ts      # AI puzzle generation
    ├── answer-validation.ts     # Smart answer validation
    └── hint-generator.ts        # Progressive hint generation
```

## 🚀 Quick Start

### Setup

1. **Install dependencies** (already done):
```bash
npm install ai @ai-sdk/groq @ai-sdk/xai
```

2. **Set environment variables**:
```env
# Choose your provider
AI_PROVIDER=groq  # or 'xai' or 'openai'

# API Keys (set at least one)
GROQ_API_KEY=your_groq_key_here
XAI_API_KEY=your_xai_key_here
OPENAI_API_KEY=your_openai_key_here

# Feature flags (optional)
AI_PUZZLE_GENERATION=true
AI_SMART_VALIDATION=true
AI_DYNAMIC_HINTS=true
AI_DIFFICULTY_ADJUSTMENT=true
```

3. **Validate setup**:
```typescript
import { validateApiKeys } from "@/ai"

const validation = validateApiKeys()
console.log(validation)
// { valid: true, missing: [], provider: "groq" }
```

## 🎯 Features

### 1. **AI Puzzle Generation**

Generate creative, unique rebus puzzles dynamically:

```typescript
import { generateRebusPuzzle } from "@/ai"

// Generate single puzzle
const puzzle = await generateRebusPuzzle({
  difficulty: 5,
  category: "compound_words",
  theme: "nature",
})

// Generate multiple puzzles
const puzzles = await generatePuzzleBatch({
  count: 10,
  difficulty: 5,
  theme: "technology",
})

// Generate for specific answer
const custom = await generatePuzzleForAnswer({
  answer: "butterfly",
  difficulty: 4,
  style: "emoji",
})

// Generate themed set
const holiday = await generateThemedSet({
  theme: "Christmas",
  count: 5,
  difficulty: 3,
})
```

**Output:**
```typescript
{
  rebusPuzzle: "☀️ 🌻",
  answer: "sunflower",
  difficulty: 3,
  explanation: "Sun (☀️) + Flower (🌻) = Sunflower",
  category: "compound_words",
  hints: [
    "Think about nature",
    "A bright celestial body combines with a plant",
    "This yellow flower literally describes what it does"
  ]
}
```

### 2. **Intelligent Answer Validation**

Smart validation with fuzzy matching and AI fallback:

```typescript
import { validateAnswer, quickValidateAnswer } from "@/ai"

// Quick validation (no AI)
const quick = quickValidateAnswer("sunfower", "sunflower")
// { isCorrect: false, similarity: 0.89 }

// Smart validation (with AI for close matches)
const smart = await validateAnswer({
  guess: "sunfower",  // typo
  correctAnswer: "sunflower",
  useAI: true,
})
// {
//   isCorrect: true,  // AI recognizes it's a typo
//   confidence: 0.95,
//   method: "ai",
//   reasoning: "Minor spelling error, clearly meant sunflower"
// }

// Generate helpful feedback
const feedback = await generateFeedback({
  guess: "sunfower",
  correctAnswer: "sunflower",
  similarity: 0.89,
  attemptsLeft: 2,
})
// "So close! Check your spelling. 2 attempts left."
```

### 3. **Progressive Hint Generation**

Generate hints that guide without giving away:

```typescript
import {
  generateHints,
  generateContextualHint,
  generateAdaptiveHint,
} from "@/ai"

// Generate progressive hints
const hints = await generateHints({
  puzzle: "☀️ 🌻",
  answer: "sunflower",
  explanation: "Sun + Flower = Sunflower",
  difficulty: 3,
  count: 5,
})
// [
//   { level: 1, text: "Think about nature", reveals: 15 },
//   { level: 2, text: "Combine a celestial body with a garden plant", reveals: 40 },
//   { level: 3, text: "The first element represents something bright in the sky", reveals: 60 },
//   { level: 4, text: "It's a yellow flower that follows the sun", reveals: 80 },
//   { level: 5, text: "This flower's name literally describes what it does", reveals: 95 }
// ]

// Contextual hint based on progress
const contextHint = await generateContextualHint({
  puzzle: "☀️ 🌻",
  answer: "sunflower",
  previousGuesses: ["daisy", "rose"],
  hintsUsed: 2,
})

// Adaptive hint based on time spent
const adaptive = await generateAdaptiveHint({
  puzzle: "☀️ 🌻",
  answer: "sunflower",
  difficulty: 3,
  timeSpentSeconds: 180, // 3 minutes
  attemptsUsed: 4,
})
// { hint: "...", urgency: "high" }
```

### 4. **Caching System**

Automatic caching to reduce costs and improve performance:

```typescript
import { cachedPuzzleGeneration, getCacheStats, clearAICache } from "@/ai"

// Cached operations
const puzzle = await cachedPuzzleGeneration(
  { difficulty: 5, theme: "nature" },
  () => generateRebusPuzzle({ difficulty: 5, theme: "nature" })
)

// Check cache stats
const stats = getCacheStats()
// { size: 42, enabled: true }

// Clear cache
clearAICache()
```

**Cache Configuration:**
- Puzzle generation: 24 hours
- Validation: 1 hour
- Hints: 12 hours

### 5. **Monitoring & Analytics**

Track usage, costs, and performance:

```typescript
import { getAIMetrics, getAIReport } from "@/ai"

// Get metrics
const metrics = getAIMetrics()
// {
//   totalRequests: 150,
//   successfulRequests: 148,
//   totalTokens: 45000,
//   totalCost: 0.0225,
//   averageLatency: 850,
//   cacheHits: 42,
//   cacheMisses: 108
// }

// Generate report
const report = getAIReport()
console.log(report)
```

**Output:**
```
AI Performance Report
====================

Requests:
  Total: 150
  Successful: 148 (98.7%)
  Failed: 2

Tokens:
  Total: 45,000
  Prompt: 30,000
  Completion: 15,000

Performance:
  Average Latency: 850ms
  Cache Hit Rate: 28.0%

Costs:
  Total: $0.0225
  Per Request: $0.0002
  Cache Savings: $0.0042
```

## 🎨 Advanced Usage

### Custom Temperature & Model Selection

```typescript
import { generateAIText } from "@/ai"

const result = await generateAIText({
  prompt: "Generate a creative puzzle hint",
  temperature: 0.9,  // More creative
  modelType: "creative",  // Use creative model
  maxTokens: 256,
})
```

### Retry Logic

```typescript
import { withRetry } from "@/ai"

const result = await withRetry(
  async () => {
    // Your AI operation
    return await someAIFunction()
  },
  3  // Max attempts
)
```

### Streaming Responses

```typescript
import { streamAIText } from "@/ai"

const stream = await streamAIText({
  prompt: "Generate a long explanation",
  modelType: "smart",
})

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk)
}
```

## ⚙️ Configuration

### AI Providers

Supported providers:
- **Groq**: Fast, cost-effective (currently free)
- **xAI**: Grok models, creative and smart
- **OpenAI**: GPT-4o models, highly capable

### Model Selection

Each provider has 3 model tiers:
- **fast**: Quick responses, simple tasks
- **smart**: Best quality, complex reasoning
- **creative**: Most creative outputs

### Rate Limits

```typescript
rateLimits: {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  requestsPerDay: 10000,
}
```

### Timeouts

```typescript
timeouts: {
  default: 30000,    // 30 seconds
  streaming: 60000,  // 60 seconds
}
```

## 🔒 Security

- ✅ API keys never exposed to client
- ✅ All AI calls are server-side only
- ✅ Input validation with Zod schemas
- ✅ Content moderation ready
- ✅ Rate limiting built-in

## 📊 Performance

- **Caching**: Reduces duplicate requests by ~30%
- **Retry Logic**: Handles transient failures
- **Timeouts**: Prevents hanging requests
- **Monitoring**: Track costs and performance

## 🧪 Testing

```typescript
// Test AI functionality
import { validateApiKeys, generateRebusPuzzle } from "@/ai"

// Check configuration
const valid = validateApiKeys()
expect(valid.valid).toBe(true)

// Test generation
const puzzle = await generateRebusPuzzle({ difficulty: 3 })
expect(puzzle.answer).toBeDefined()
expect(puzzle.rebusPuzzle).toBeDefined()
```

## 💰 Cost Optimization

1. **Enable Caching**: Saves ~$0.001 per cached request
2. **Use Fast Models**: For simple validations
3. **Batch Operations**: Generate multiple puzzles at once
4. **Monitor Usage**: Track with `getAIReport()`

## 🐛 Troubleshooting

### "Missing API keys" error

```typescript
import { validateApiKeys } from "@/ai"
const check = validateApiKeys()
console.log(check.missing) // Shows which keys are missing
```

### Slow responses

- Check network connection
- Try 'fast' model type
- Enable caching
- Check monitor metrics

### High costs

- Enable caching (default)
- Use 'fast' models where appropriate
- Review `getAIReport()` for insights

## 📚 Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [xAI API Docs](https://docs.x.ai/)

---

**Last Updated:** 2025-01-18
