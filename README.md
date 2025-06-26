# 🎯 Rebuzzle - The Ultimate Daily Rebus Puzzle Game

<div align="center">

![Rebuzzle Logo](public/icon.svg)

**Challenge Your Mind with Visual Word Puzzles Every Day**

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Demo](https://img.shields.io/badge/Demo-Live-green?style=for-the-badge)](http://localhost:3001)

*Inspired by Wordle, designed for visual thinkers*

</div>

---

## 🎮 What is Rebuzzle?

**Rebuzzle** is a daily brain-teasing game that challenges players to decode visual rebus puzzles using emojis, words, and creative hints. Like Wordle, you get **one puzzle per day** that resets at midnight, but instead of guessing letters, you're interpreting visual clues to discover hidden words and phrases.

### 🌟 Example Puzzles

- **📱 + 🏠 = ?** → `smartphone` (Smart + Phone)
- **🌧️ + 🎀 = ?** → `rainbow` (Rain + Bow)  
- **🧠 + ⛈️ = ?** → `brainstorm` (Brain + Storm)
- **🐝 + 4️⃣ = ?** → `before` (Bee + Four)

---

## 🎯 How to Play

### Daily Challenge Format
1. **One Puzzle Per Day** - A new rebus puzzle appears every day at midnight
2. **Limited Attempts** - You have a set number of tries to solve each puzzle
3. **Progressive Hints** - Get helpful clues if you're stuck
4. **Track Your Progress** - Build streaks and earn achievements

### Game Mechanics

#### 🎲 Puzzle Types
- **Compound Words**: `☀️ + 🌻 = sunflower`
- **Phonetic Puzzles**: `🐝 + cause = because` (bee sounds like "be")
- **Common Phrases**: `⏰ + 🪰 = time flies`
- **Modern Tech**: `🧠 + 📱 = smartphone`
- **Pop Culture**: `🦇 + 👨 = batman`
- **Visual Concepts**: `⬆️ + side + ⬇️ = upside down`

#### 🎮 Gameplay Flow
1. **Analyze the Clues** - Look at the emoji and word combinations
2. **Type Your Guess** - Use the on-screen keyboard or your physical keyboard
3. **Get Instant Feedback** - See if you're right or wrong immediately
4. **Use Hints Wisely** - Reveal progressive clues if needed
5. **Celebrate Success** - Enjoy confetti and see your stats!

#### 🏆 Scoring System
- **Base Points**: 100 points for solving
- **Attempt Bonus**: More points for fewer attempts
- **Hint Penalty**: Points deducted for using hints
- **Streak Multiplier**: Bonus for consecutive daily solves

---

## 🌟 Key Features

### 🎨 Beautiful Design
- **Wordle-Inspired Interface** - Clean, minimalist design
- **Responsive Layout** - Perfect on desktop, tablet, and mobile
- **Smooth Animations** - Satisfying visual feedback
- **Accessibility First** - Keyboard navigation and screen reader support

### 🧠 Smart Puzzle System
- **30+ Unique Puzzles** - Hand-crafted for optimal difficulty
- **Adaptive Difficulty** - Puzzles range from beginner to expert
- **Variety Categories** - Different themes keep it fresh
- **Daily Rotation** - Consistent puzzle selection based on date

### 📊 Progress Tracking
- **Daily Streaks** - Track consecutive days played
- **Win Statistics** - See your solve rate and improvement
- **Achievement System** - Unlock badges for milestones
- **Level Progression** - Advance through skill levels

### 🎯 Hint System
- **Three-Tier Hints** - Progressive clues that don't spoil the fun
- **Topic Guidance** - Know what category you're working with
- **Difficulty Indicators** - Understand the challenge level
- **Smart Timing** - Hints unlock as you need them

### 📱 Modern Features
- **Progressive Web App** - Install on your device
- **Offline Play** - Works without internet connection
- **Social Sharing** - Share your results (spoiler-free)
- **Push Notifications** - Get reminded of new puzzles

---

## 🎓 Educational Value

### 🧠 Cognitive Benefits
- **Pattern Recognition** - Improve visual processing skills
- **Creative Thinking** - Develop lateral thinking abilities
- **Vocabulary Building** - Learn new words and phrases
- **Memory Enhancement** - Strengthen recall and association

### 📚 Learning Topics
- **Language Arts** - Wordplay and phonetics
- **Pop Culture** - Movies, games, and modern references
- **Science & Nature** - Animals, weather, and natural phenomena
- **Technology** - Modern devices and digital concepts
- **History & Culture** - Common expressions and idioms

---

## 🚀 Getting Started

### 🎮 For Players

#### Quick Start
1. **Visit the Game** - Open [http://localhost:3001](http://localhost:3001)
2. **See Today's Puzzle** - A new rebus appears on the homepage
3. **Start Guessing** - Type your answer using keyboard or clicks
4. **Track Progress** - Watch your stats grow over time
5. **Come Back Tomorrow** - New puzzle every day!

#### Pro Tips
- **Think Literally First** - Many puzzles are straightforward combinations
- **Consider Sounds** - Some clues are phonetic (bee = "be")
- **Look for Patterns** - Compound words are common
- **Use Context** - Category hints help narrow possibilities
- **Don't Rush** - Take time to analyze all elements

### 🛠️ For Developers

#### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/rebuzzle.git
cd rebuzzle

# Install dependencies
bun install

# Start development server
bun run dev

# Open in browser
open http://localhost:3001
```

#### Generate New Puzzles
```bash
# Generate today's puzzle (script method)
node scripts/generateDailyPuzzles.js --today

# Generate 30 days of puzzles (script method)
node scripts/generateDailyPuzzles.js

# Generate a full year (script method)  
node scripts/generateDailyPuzzles.js --year

# Or use the npm scripts
bun run generate:today
bun run generate:puzzles
bun run generate:year
```

#### API Endpoints
```bash
# Get today's puzzle (server-side generated and cached)
GET /api/puzzle/today

# Preview next 7 days of puzzles
GET /api/puzzle/preview

# Get puzzle generation statistics
GET /api/puzzle/stats
```

---

## 🏗️ Technical Architecture

### 🎯 Core Technologies
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Bun** - Fast package manager and runtime

### 📦 Project Structure
```
rebuzzle/
├── app/                    # Next.js App Router
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   ├── blog/              # Blog pages
│   └── game-over/         # Results page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── GameBoard.tsx     # Main game interface
│   ├── Keyboard.tsx      # Virtual keyboard
│   └── GuessBoxes.tsx    # Answer input display
├── lib/                   # Utility libraries
│   ├── gameLogic.ts      # Core game mechanics
│   ├── gameSettings.ts   # Configuration
│   └── fakeBlogData.ts   # Demo content
├── public/               # Static assets
│   ├── puzzles.json      # Puzzle database
│   ├── manifest.json     # PWA configuration
│   └── sw.js             # Service worker
└── scripts/              # Build and utility scripts
    └── generateDailyPuzzles.js
```

### 🎮 Game Logic Flow
1. **Daily Puzzle Selection** - Date-based seeded random selection
2. **Input Processing** - Real-time guess validation
3. **Hint Management** - Progressive reveal system
4. **Score Calculation** - Attempt and hint-based scoring
5. **Progress Persistence** - Local storage for offline play
6. **Completion Tracking** - Daily puzzle state management

### 🔧 Key Components

#### GameBoard.tsx
- Main game interface
- Handles user input and game state
- Manages hints and attempts
- Integrates with completion system

#### Keyboard.tsx
- Virtual keyboard for mobile users
- Physical keyboard event handling
- Visual feedback for key presses
- Accessibility support

#### GuessBoxes.tsx
- Visual representation of current guess
- Letter-by-letter input display
- Animation for correct/incorrect attempts
- Auto-sizing based on answer length

---

## 📊 Puzzle Generation System

### 🎲 Automatic Puzzle Creation

Our advanced puzzle generation system creates unique, engaging rebus puzzles automatically with **server-side caching** for optimal performance:

#### ⚡ **Efficient Serverless Architecture**
- **One API Call Per Day** - Puzzle generated once, cached for 24 hours
- **Vercel Edge Caching** - Lightning-fast delivery to all users
- **No Database Required** - Pure serverless function with smart caching
- **Scales to Millions** - Same performance for 1 or 1,000,000 users

#### 🧩 Puzzle Categories
- **Compound Words** (40+ puzzles) - `sunflower`, `rainbow`, `keyboard`
- **Phonetic Puzzles** (25+ puzzles) - `because`, `before`, `believe`
- **Common Phrases** (30+ puzzles) - `piece of cake`, `break the ice`
- **Visual Concepts** (20+ puzzles) - `upside down`, `inside out`
- **Modern Technology** (15+ puzzles) - `smartphone`, `bluetooth`
- **Pop Culture** (20+ puzzles) - `superman`, `starwars`, `minecraft`

#### 🎯 Smart Difficulty Scaling
- **Beginner (Level 1-2)** - Direct emoji combinations
- **Intermediate (Level 3)** - Mixed emoji and word hints
- **Advanced (Level 4-5)** - Abstract concepts and cultural references

#### 🔄 Daily Rotation Algorithm
```javascript
// Seeded random selection ensures same puzzle for all users
const seed = generateDateSeed(date);
const rng = new SeededRandom(seed);
const puzzle = rng.choice(categoryPuzzles);
```

### 📝 Hint Strategy System

#### Progressive Hint Levels
1. **Category Hint** - "Think about technology"
2. **Difficulty Hint** - "This is an intermediate puzzle"
3. **Structure Hint** - "The answer is a compound word"

#### Visual Enhancement
- **Compound Words** - Add `+` between elements
- **Phrases** - Add directional arrows `➡️`
- **Complex Puzzles** - Add thinking emoji `🤔`

---

## 🎨 Design Philosophy

### 🎯 Wordle-Inspired Elements
- **Daily Ritual** - One puzzle per day builds habit
- **Limited Attempts** - Creates strategic thinking
- **Social Sharing** - Results without spoilers
- **Minimalist Design** - Focus on the puzzle
- **Instant Feedback** - Immediate response to actions

### 🌟 Unique Differentiators
- **Visual Puzzles** - Emojis instead of letter tiles
- **Hint System** - Progressive assistance for accessibility
- **Educational Content** - Blog posts teach puzzle history
- **Variety** - Multiple puzzle types and categories
- **Offline Play** - No internet required

### 🎨 Visual Design Principles
- **Clean Typography** - Easy-to-read fonts
- **Consistent Spacing** - Harmonious layout
- **Color Psychology** - Calming blues and energetic accents
- **Responsive Design** - Seamless across all devices
- **Accessibility** - WCAG 2.1 AA compliance

---

## 📈 SEO & Performance

### 🚀 Performance Optimizations
- **Static Generation** - Pre-built pages for speed
- **Image Optimization** - Automatic WebP conversion
- **Code Splitting** - Minimal JavaScript bundles
- **Caching Strategy** - Smart cache invalidation
- **Service Worker** - Offline functionality

### 🔍 SEO Features
- **Structured Data** - Rich snippets for search engines
- **Meta Tags** - Optimized titles and descriptions
- **Open Graph** - Beautiful social media previews
- **Sitemap** - Automatic generation
- **Robot.txt** - Search engine guidance

### 📊 Analytics & Tracking
- **Game Events** - Puzzle starts, completions, hints used
- **User Journey** - Navigation patterns and engagement
- **Performance Metrics** - Load times and error rates
- **A/B Testing** - Feature optimization

---

## 🔒 Privacy & Security

### 🛡️ Data Protection
- **Local Storage Only** - No personal data collection
- **No Tracking Cookies** - Privacy-first approach
- **Offline Capable** - Works without data connection
- **Open Source** - Transparent codebase

### 🔐 Security Measures
- **Content Security Policy** - XSS protection
- **HTTPS Enforcement** - Secure connections
- **Input Validation** - Sanitized user input
- **Rate Limiting** - API abuse prevention

---

## 🌍 Accessibility

### ♿ Inclusive Design
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Support** - ARIA labels and descriptions
- **High Contrast Mode** - Visual accessibility options
- **Focus Management** - Clear focus indicators
- **Motor Accessibility** - Large touch targets

### 🎯 WCAG 2.1 AA Compliance
- **Color Contrast** - 4.5:1 minimum ratio
- **Text Scaling** - 200% zoom support
- **Alternative Text** - Image descriptions
- **Semantic HTML** - Proper heading structure
- **Error Identification** - Clear error messages

---

## 🚀 Future Roadmap

### 🎮 Planned Features
- **Multiplayer Mode** - Compete with friends
- **Custom Puzzles** - User-generated content
- **Themed Weeks** - Special puzzle collections
- **Achievement Badges** - More milestone rewards
- **Leaderboards** - Global and friend rankings

### 🔧 Technical Improvements
- **Mobile App** - Native iOS and Android versions
- **Real-time Sync** - Cross-device progress
- **Advanced Analytics** - Deeper insights
- **AI Puzzle Generation** - Machine learning puzzles
- **Internationalization** - Multiple language support

### 📚 Content Expansion
- **500+ Puzzles** - Massive puzzle library
- **Educational Series** - Learning-focused puzzles
- **Seasonal Content** - Holiday-themed puzzles
- **User Submissions** - Community-created puzzles
- **Difficulty Modes** - Beginner to expert tracks

---

## 🤝 Contributing

### 🎯 How to Contribute
1. **Fork the Repository** - Create your own copy
2. **Create a Feature Branch** - `git checkout -b feature/amazing-feature`
3. **Make Your Changes** - Add puzzles, fix bugs, improve UI
4. **Test Thoroughly** - Ensure everything works
5. **Submit a Pull Request** - Share your improvements

### 🧩 Puzzle Contributions
- **Follow the Format** - Use existing puzzle structure
- **Test Difficulty** - Ensure appropriate challenge level
- **Check Uniqueness** - Avoid duplicate concepts
- **Include Explanations** - Clear solution descriptions

### 🐛 Bug Reports
- **Detailed Description** - What happened vs. what expected
- **Steps to Reproduce** - How to trigger the issue
- **Screenshots** - Visual evidence helps
- **Environment Info** - Browser, device, OS version

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### 🎮 Inspiration
- **Wordle** - The daily puzzle game that started it all
- **New York Times Games** - Excellence in puzzle design
- **Rebus Puzzle Community** - Traditional puzzle makers

### 🛠️ Technology
- **Vercel** - Deployment and hosting platform
- **Next.js Team** - Amazing React framework
- **Tailwind CSS** - Beautiful utility-first CSS
- **TypeScript** - Type safety and developer experience

### 🎨 Design
- **Emoji Designers** - Unicode Consortium and vendors
- **Open Source Community** - Icons and illustrations
- **Accessibility Advocates** - Inclusive design principles

---

## 📞 Support & Contact

### 🆘 Need Help?
- **Game Issues** - Check the FAQ section
- **Technical Problems** - Open a GitHub issue
- **Feature Requests** - Start a discussion
- **General Questions** - Contact support

### 🌐 Connect With Us
- **Website** - [rebuzzle.com](http://localhost:3001)
- **GitHub** - [github.com/yourusername/rebuzzle](https://github.com)
- **Twitter** - [@RebuzzleGame](https://twitter.com)
- **Discord** - [Join our community](https://discord.gg)

---

<div align="center">

**🎯 Ready to Challenge Your Mind?**

[**Play Rebuzzle Now →**](http://localhost:3001)

*One puzzle a day keeps the doctor away!*

---

Made with ❤️ by puzzle enthusiasts, for puzzle enthusiasts.

**Happy Puzzling! 🧩✨**

</div>
