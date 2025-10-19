# 🦙 Ollama Local AI Setup Guide

## Overview

Use **Ollama** to run AI models locally for **FREE, UNLIMITED** testing of the advanced puzzle generation system. No API keys, no costs, complete privacy.

---

## 🎯 Why Ollama for Testing?

### **Cloud AI (Groq/OpenAI/xAI)**
- ❌ Requires API keys
- ❌ Costs money ($0.017/puzzle)
- ❌ Rate limits
- ❌ Internet required
- ❌ Data sent to cloud

### **Ollama (Local)**
- ✅ **FREE** - No API keys, no costs
- ✅ **UNLIMITED** - Generate 1000s of puzzles
- ✅ **PRIVATE** - Data stays local
- ✅ **FAST** - No network latency (on good hardware)
- ✅ **OFFLINE** - Works without internet

**Perfect for development and testing!**

---

## 🚀 Quick Start

### 1. Install Ollama

**macOS:**
```bash
# Download from ollama.com or use brew
brew install ollama

# Or download: https://ollama.com/download
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

### 2. Start Ollama Server

```bash
ollama serve
```

This runs on `http://localhost:11434` by default.

### 3. Pull Recommended Models

```bash
# Fast model for quick testing
ollama pull llama3.2

# Smart model for better quality
ollama pull qwen2.5:14b

# Creative model for puzzle generation
ollama pull llama3.1

# Optional: Excellent reasoning model
ollama pull deepseek-r1
```

### 4. Configure Rebuzzle

Add to `.env.local`:

```env
# Use Ollama for AI
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

# Enable features
AI_PUZZLE_GENERATION=true
AI_ADVANCED_GENERATION=true
AI_QUALITY_PIPELINE=true
AI_UNIQUENESS_TRACKING=true
```

### 5. Test It!

```bash
npm run dev

# Test puzzle generation
curl -X POST http://localhost:3000/api/ai/generate-puzzle \
  -H "Content-Type: application/json" \
  -d '{"difficulty": 5}'

# Test advanced generation
curl -X POST http://localhost:3000/api/ai/advanced/generate-master-puzzle \
  -H "Content-Type: application/json" \
  -d '{"targetDifficulty": 7, "requireNovelty": true}'
```

---

## 🎨 Recommended Models

### For Different Use Cases

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.2** | 2GB | ⚡⚡⚡ | ⭐⭐⭐ | Quick testing |
| **phi3** | 2.3GB | ⚡⚡⚡ | ⭐⭐⭐ | Fast validation |
| **qwen2.5:14b** | 9GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Best puzzles |
| **llama3.1** | 4.7GB | ⚡⚡ | ⭐⭐⭐⭐ | Creative generation |
| **mistral** | 4.1GB | ⚡⚡ | ⭐⭐⭐⭐ | Good balance |
| **deepseek-r1** | 14GB | ⚡ | ⭐⭐⭐⭐⭐ | Complex reasoning |
| **gemma2** | 5.4GB | ⚡⚡ | ⭐⭐⭐⭐ | Google's model |

### Our Defaults

```typescript
// ai/config.ts
ollama: {
  fast: "llama3.2:latest",      // 2GB - Quick responses
  smart: "qwen2.5:14b",          // 9GB - Best quality
  creative: "llama3.1:latest",   // 4.7GB - Most creative
}
```

### Installation Commands

```bash
# Lightweight setup (fast testing)
ollama pull llama3.2
ollama pull phi3

# Recommended setup (balanced)
ollama pull llama3.2
ollama pull llama3.1
ollama pull qwen2.5:14b

# Maximum quality (powerful hardware)
ollama pull qwen2.5:14b
ollama pull deepseek-r1
ollama pull llama3.1
```

---

## ⚙️ Configuration

### AI Provider Settings

```env
# .env.local

# Provider selection
AI_PROVIDER=ollama              # Use local Ollama
# AI_PROVIDER=groq              # Or cloud Groq
# AI_PROVIDER=xai               # Or cloud xAI
# AI_PROVIDER=openai            # Or cloud OpenAI

# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434

# Or custom:
# OLLAMA_BASE_URL=http://192.168.1.100:11434  # Remote Ollama
```

### Model Selection

Override default models:

```env
# Use different models for each task type
OLLAMA_FAST_MODEL=phi3
OLLAMA_SMART_MODEL=qwen2.5:14b
OLLAMA_CREATIVE_MODEL=llama3.1
```

---

## 🎯 Performance Comparison

### Generation Speed

| Provider | Model | Time | Cost |
|----------|-------|------|------|
| **Ollama (Local)** | llama3.2 | 2-5s | $0.00 |
| **Ollama (Local)** | qwen2.5:14b | 5-10s | $0.00 |
| **Groq (Cloud)** | llama-3.3-70b | 1-2s | $0.002 |
| **OpenAI (Cloud)** | gpt-4o | 2-3s | $0.01 |

### Hardware Requirements

**Minimum (Fast Models):**
- CPU: Any modern processor
- RAM: 8GB
- Disk: 5GB free
- Models: llama3.2, phi3

**Recommended (Smart Models):**
- CPU: Apple Silicon or modern x86
- RAM: 16GB
- Disk: 20GB free
- Models: qwen2.5:14b, llama3.1

**Optimal (All Models):**
- CPU: Apple Silicon M1+ or RTX GPU
- RAM: 32GB
- VRAM: 8GB+ (for GPU acceleration)
- Disk: 50GB free
- Models: All models including deepseek-r1

---

## 🧪 Testing Examples

### Test Basic Generation

```bash
curl -X POST http://localhost:3000/api/ai/generate-puzzle \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": 5,
    "category": "compound_words",
    "theme": "nature"
  }'
```

### Test Advanced Generation

```bash
curl -X POST http://localhost:3000/api/ai/advanced/generate-master-puzzle \
  -H "Content-Type: application/json" \
  -d '{
    "targetDifficulty": 7,
    "requireNovelty": true,
    "qualityThreshold": 85,
    "maxAttempts": 2
  }'
```

### Test Validation

```bash
curl -X POST http://localhost:3000/api/ai/validate-answer \
  -H "Content-Type: application/json" \
  -d '{
    "guess": "sunfower",
    "correctAnswer": "sunflower",
    "useAI": true
  }'
```

### Test Hints

```bash
curl -X POST http://localhost:3000/api/ai/generate-hints \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "progressive",
    "puzzle": "☀️ 🌻",
    "answer": "sunflower",
    "difficulty": 3
  }'
```

---

## 🔧 Troubleshooting

### "Connection refused" Error

**Problem:** Ollama server not running

**Solution:**
```bash
# Start Ollama
ollama serve

# Or check if running
curl http://localhost:11434/api/tags
```

### "Model not found" Error

**Problem:** Model not pulled

**Solution:**
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.2
```

### Slow Generation

**Problem:** Model too large for hardware

**Solution:**
```bash
# Use smaller, faster model
ollama pull llama3.2  # Only 2GB

# Or use quantized version
ollama pull qwen2.5:7b  # Smaller version
```

### Out of Memory

**Problem:** Not enough RAM

**Solutions:**
1. Close other applications
2. Use smaller model (llama3.2, phi3)
3. Add more RAM
4. Use GPU acceleration

---

## 💡 Best Practices

### Development Workflow

```env
# .env.local for development
AI_PROVIDER=ollama                    # FREE local testing
OLLAMA_BASE_URL=http://localhost:11434

# .env.production for deployment
AI_PROVIDER=groq                      # Fast cloud inference
GROQ_API_KEY=gsk_your_key_here
```

### Model Selection Strategy

**For Testing:**
- Use `llama3.2` (fast, free, good enough)

**For Quality:**
- Use `qwen2.5:14b` (best local quality)

**For Production:**
- Use `groq` with `llama-3.3-70b` (fastest cloud)
- Or `openai` with `gpt-4o` (best quality)

### Switch Providers Easily

```typescript
// No code changes needed!
// Just update .env.local:

# Testing locally
AI_PROVIDER=ollama

# Deploy to production
AI_PROVIDER=groq
```

---

## 📊 Cost Comparison

### Monthly Costs (1000 puzzles)

| Provider | Model | Cost |
|----------|-------|------|
| **Ollama** | Any | **$0.00** 🎉 |
| Groq | llama-3.3-70b | $0.20 |
| OpenAI | gpt-4o-mini | $15.00 |
| OpenAI | gpt-4o | $170.00 |
| xAI | grok-2 | $50.00 |

**Ollama = FREE unlimited testing!**

---

## 🎯 Advanced Usage

### Custom Ollama Server

If running Ollama on different machine:

```env
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

### Multiple Models

Switch models dynamically:

```typescript
import { getAIProvider } from "@/ai"

// Use fast model
const provider = getAIProvider()
const fastModel = provider.getModel("fast")  // llama3.2

// Use smart model
const smartModel = provider.getModel("smart")  // qwen2.5:14b
```

### GPU Acceleration

If you have NVIDIA GPU:

```bash
# Ollama automatically uses GPU if available
# Check GPU usage:
nvidia-smi

# Or AMD GPU:
# Ollama supports AMD ROCm
```

---

## 🚀 Production Deployment

### Hybrid Approach (Recommended)

**Development/Testing:**
```env
AI_PROVIDER=ollama
```

**Production:**
```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
```

### Why This Works

- **Development:** Free unlimited testing with Ollama
- **Production:** Fast, reliable cloud inference
- **Code:** Identical (just env variable)
- **Best of both worlds!**

---

## 📈 Performance Tips

### Optimize Ollama Performance

1. **Use SSD** - Models load faster from SSD
2. **Allocate RAM** - Give Ollama priority
3. **GPU** - Use GPU if available
4. **Keep models loaded** - First run loads model (slow), subsequent runs are fast
5. **Use appropriate model size** - Smaller models are faster

### Benchmark Your Setup

```bash
# Test generation speed
time curl -X POST http://localhost:3000/api/ai/generate-puzzle \
  -H "Content-Type: application/json" \
  -d '{"difficulty": 5}'

# Should be:
# llama3.2: 2-5 seconds
# qwen2.5:14b: 5-10 seconds
# deepseek-r1: 10-20 seconds
```

---

## 🎨 Model Recommendations

### For Advanced Puzzle Generation

**Best Overall:** `qwen2.5:14b`
- Excellent reasoning
- Good creativity
- Balanced speed
- 9GB size

**Fastest:** `llama3.2`
- Quick responses
- Good for iteration
- Lower quality but acceptable
- 2GB size

**Most Creative:** `llama3.1`
- Best for novel puzzles
- Good quality
- Medium speed
- 4.7GB size

**Best Reasoning:** `deepseek-r1`
- Exceptional chain-of-thought
- Best difficulty calibration
- Slower but worth it
- 14GB size

### Example Configuration

```typescript
// For maximum quality (if you have RAM):
ollama: {
  fast: "llama3.2:latest",       // Quick tasks
  smart: "deepseek-r1:latest",   // Complex reasoning
  creative: "llama3.1:latest",   // Puzzle generation
}

// For balanced performance:
ollama: {
  fast: "phi3:latest",           // Very fast
  smart: "qwen2.5:14b",          // Great quality
  creative: "llama3.1:latest",   // Good creativity
}

// For lightweight setup:
ollama: {
  fast: "llama3.2:latest",
  smart: "llama3.2:latest",
  creative: "llama3.2:latest",
}
```

---

## 🧪 Testing Workflow

### Step 1: Start Ollama

```bash
# Terminal 1
ollama serve
```

### Step 2: Pull Models

```bash
# Terminal 2
ollama pull llama3.2
ollama pull qwen2.5:14b
```

### Step 3: Configure Rebuzzle

```env
# .env.local
AI_PROVIDER=ollama
AI_ADVANCED_GENERATION=true
```

### Step 4: Test Generation

```bash
npm run dev

# Test in Terminal 3
curl -X POST http://localhost:3000/api/ai/advanced/generate-master-puzzle \
  -d '{"targetDifficulty":7}' \
  -H "Content-Type: application/json"
```

### Step 5: Monitor Quality

```bash
# Check quality metrics
curl http://localhost:3000/api/ai/metrics

# Should show:
# - Provider: ollama
# - Model: qwen2.5:14b
# - Cost: $0.00 (FREE!)
# - Success rate
```

---

## 📊 Quality Comparison

### Ollama vs Cloud AI

| Metric | Ollama (qwen2.5) | Groq (llama-3.3) | OpenAI (gpt-4o) |
|--------|------------------|------------------|-----------------|
| **Quality** | ⭐⭐⭐⭐ (85-95) | ⭐⭐⭐⭐ (85-95) | ⭐⭐⭐⭐⭐ (90-100) |
| **Speed** | 5-10s | 1-2s | 2-3s |
| **Cost** | **FREE** | $0.002 | $0.01 |
| **Limit** | **UNLIMITED** | 14,400/day | Limited by cost |

**For testing:** Ollama is perfect!
**For production:** Cloud AI is faster

---

## 🎯 Usage Examples

### Basic Puzzle Generation

```typescript
// Works identically with Ollama or cloud AI
import { generateRebusPuzzle } from "@/ai"

const puzzle = await generateRebusPuzzle({
  difficulty: 5,
  category: "compound_words"
})

// With Ollama: FREE, local, private
// With Groq: Fast, cloud, costs $0.002
```

### Advanced Master Generation

```typescript
import { generateMasterPuzzle } from "@/ai/advanced"

const result = await generateMasterPuzzle({
  targetDifficulty: 8,
  requireNovelty: true,
  qualityThreshold: 85
})

// Ollama will:
// - Use local qwen2.5:14b model
// - Generate 5 candidates (ensemble)
// - Run quality pipeline
// - All FREE and local!
```

### Batch Testing

```typescript
// Generate 100 test puzzles with Ollama (FREE!)
const batch = await generateMasterBatch({
  count: 100,
  startDifficulty: 5,
  difficultyProgression: "sine_wave"
})

// Cost with Ollama: $0.00
// Cost with cloud: $1.70
```

---

## 🔄 Switching Providers

### Development → Production

**Development (Free testing with Ollama):**
```env
AI_PROVIDER=ollama
```

**Production (Fast cloud):**
```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key
```

**Code changes needed:** ZERO! Just env variable.

---

## 💡 Pro Tips

### 1. Keep Models Loaded

```bash
# Preload models to avoid cold start
ollama run llama3.2 "test"
ollama run qwen2.5:14b "test"

# Now they stay in memory
# Subsequent calls are instant
```

### 2. Monitor Resource Usage

```bash
# Check which models are loaded
ollama ps

# Check model sizes
ollama list

# Unload models to free RAM
ollama rm llama3.2
```

### 3. Use Appropriate Model for Task

```typescript
// Quick validation (use fast model)
validateAnswer({ ... })  // Uses llama3.2

// Complex generation (use smart model)
generateMasterPuzzle({ ... })  // Uses qwen2.5:14b

// Creative puzzles (use creative model)
generateThemedSet({ ... })  // Uses llama3.1
```

### 4. Batch Operations

```typescript
// Generate many puzzles at once
// Ollama stays loaded, subsequent calls are fast
for (let i = 0; i < 100; i++) {
  const puzzle = await generateRebusPuzzle({ difficulty: i % 10 })
  // First call: 5-10s (load model)
  // Rest: 2-3s (model loaded)
}
```

---

## 🐛 Common Issues

### Issue: "Model not found"

```bash
# Solution: Pull the model
ollama pull qwen2.5:14b
```

### Issue: "Connection refused"

```bash
# Solution: Start Ollama
ollama serve

# Or check if running:
ps aux | grep ollama
```

### Issue: "Out of memory"

```bash
# Solution 1: Use smaller model
ollama pull llama3.2  # Only 2GB

# Solution 2: Unload other models
ollama rm large-model

# Solution 3: Increase swap space
# (OS-specific)
```

### Issue: Very slow generation

```bash
# Solution 1: Use GPU
# Ollama auto-detects GPU

# Solution 2: Use smaller model
ollama pull phi3  # 2.3GB, very fast

# Solution 3: Reduce context
# Use shorter prompts
```

---

## 📚 Useful Commands

### Ollama Management

```bash
# List installed models
ollama list

# Show model info
ollama show llama3.2

# Remove model
ollama rm llama3.2

# Update model
ollama pull llama3.2

# Check running models
ollama ps

# Get model details
curl http://localhost:11434/api/tags
```

### Testing

```bash
# Test Ollama directly
ollama run llama3.2 "Generate a rebus puzzle for 'sunflower'"

# Test via API
curl http://localhost:11434/api/generate \
  -d '{"model": "llama3.2", "prompt": "Test"}'
```

---

## 🎯 Recommended Setup

### For Active Development

```bash
# 1. Install Ollama
brew install ollama

# 2. Pull recommended models
ollama pull llama3.2      # Fast (2GB)
ollama pull qwen2.5:14b   # Quality (9GB)

# 3. Start server
ollama serve

# 4. Configure
echo "AI_PROVIDER=ollama" >> .env.local

# 5. Test
npm run dev
curl -X POST localhost:3000/api/ai/generate-puzzle -d '{"difficulty":5}'
```

### For Production Deployment

```bash
# Use cloud AI for production (faster, more reliable)
# .env.production
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key
```

---

## ✨ Summary

### **Ollama Benefits**

- ✅ **100% FREE** - No API costs ever
- ✅ **Unlimited** - Generate as many as you want
- ✅ **Private** - Data never leaves your machine
- ✅ **Fast** - No network latency (on good hardware)
- ✅ **Offline** - Works without internet

### **Setup Time**

- Install Ollama: 2 minutes
- Pull models: 5-10 minutes
- Configure: 1 minute
- **Total: ~15 minutes**

### **Perfect For**

- ✅ Development and testing
- ✅ Iterating on prompts
- ✅ Generating test data
- ✅ Learning the system
- ✅ Privacy-sensitive applications

### **Production**

- Use Ollama for testing
- Use Groq/OpenAI for production
- Zero code changes needed!

---

**Setup Ollama now and get unlimited FREE AI puzzle generation for testing!** 🦙🎉

