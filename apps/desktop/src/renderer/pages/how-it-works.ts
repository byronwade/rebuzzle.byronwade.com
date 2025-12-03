/**
 * How It Works Page
 * Explains how Rebuzzle puzzles are generated and how to play
 */

export async function createHowItWorksPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page how-it-works-page';

  page.innerHTML = `
    ${getStyles()}
    <div class="page-header">
      <h1 class="page-title">How It Works</h1>
      <p class="page-subtitle">Learn how Rebuzzle creates unique puzzles every day</p>
    </div>

    <!-- Intro Section -->
    <section class="hiw-section">
      <div class="hiw-intro">
        <div class="hiw-intro-icon">🧩</div>
        <h2>AI-Powered Daily Puzzles</h2>
        <p>Rebuzzle uses advanced AI to generate unique, challenging puzzles every day. Each puzzle is carefully crafted to be fun, fair, and thought-provoking.</p>
      </div>
    </section>

    <!-- How to Play -->
    <section class="hiw-section">
      <h2 class="hiw-section-title">How to Play</h2>
      <div class="hiw-steps">
        <div class="hiw-step">
          <div class="hiw-step-number">1</div>
          <div class="hiw-step-content">
            <h3>Read the Puzzle</h3>
            <p>Each day, you'll get a new puzzle. It could be a rebus, riddle, word puzzle, or logic challenge.</p>
          </div>
        </div>
        <div class="hiw-step">
          <div class="hiw-step-number">2</div>
          <div class="hiw-step-content">
            <h3>Enter Your Answer</h3>
            <p>Type your answer in the input field. Don't worry about capitalization - we'll figure it out!</p>
          </div>
        </div>
        <div class="hiw-step">
          <div class="hiw-step-number">3</div>
          <div class="hiw-step-content">
            <h3>Use Hints Wisely</h3>
            <p>Stuck? Use hints to help, but remember - each hint costs 10 points from your score.</p>
          </div>
        </div>
        <div class="hiw-step">
          <div class="hiw-step-number">4</div>
          <div class="hiw-step-content">
            <h3>Build Your Streak</h3>
            <p>Solve puzzles daily to build your streak. Longer streaks mean bonus points!</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Scoring System -->
    <section class="hiw-section">
      <h2 class="hiw-section-title">Scoring System</h2>
      <div class="hiw-scoring">
        <div class="hiw-score-card">
          <div class="hiw-score-icon">🎯</div>
          <h4>Base Score</h4>
          <p class="hiw-score-value">100 pts</p>
          <p class="hiw-score-desc">For completing any puzzle</p>
        </div>
        <div class="hiw-score-card">
          <div class="hiw-score-icon">⚡</div>
          <h4>Speed Bonus</h4>
          <p class="hiw-score-value">+50 max</p>
          <p class="hiw-score-desc">Solve faster for more points</p>
        </div>
        <div class="hiw-score-card">
          <div class="hiw-score-icon">🔥</div>
          <h4>Streak Bonus</h4>
          <p class="hiw-score-value">+5/day</p>
          <p class="hiw-score-desc">Per consecutive day played</p>
        </div>
        <div class="hiw-score-card">
          <div class="hiw-score-icon">💎</div>
          <h4>Difficulty Bonus</h4>
          <p class="hiw-score-value">+10/level</p>
          <p class="hiw-score-desc">Harder puzzles = more points</p>
        </div>
      </div>
      <div class="hiw-penalties">
        <h4>Penalties</h4>
        <ul>
          <li><strong>Wrong Guess:</strong> -15 points per incorrect attempt</li>
          <li><strong>Hints Used:</strong> -10 points per hint revealed</li>
        </ul>
      </div>
    </section>

    <!-- Puzzle Types -->
    <section class="hiw-section">
      <h2 class="hiw-section-title">Puzzle Types</h2>
      <div class="hiw-puzzles">
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">🖼️</span>
          <div class="hiw-puzzle-info">
            <h4>Rebus</h4>
            <p>Visual word puzzles using pictures, symbols, and text positioning</p>
          </div>
        </div>
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">❓</span>
          <div class="hiw-puzzle-info">
            <h4>Riddles</h4>
            <p>Classic brain teasers that challenge your thinking</p>
          </div>
        </div>
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">🔤</span>
          <div class="hiw-puzzle-info">
            <h4>Word Puzzles</h4>
            <p>Anagrams, word ladders, and letter-based challenges</p>
          </div>
        </div>
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">🔢</span>
          <div class="hiw-puzzle-info">
            <h4>Number Sequences</h4>
            <p>Find the pattern and predict the next number</p>
          </div>
        </div>
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">🧠</span>
          <div class="hiw-puzzle-info">
            <h4>Logic Puzzles</h4>
            <p>Deductive reasoning challenges</p>
          </div>
        </div>
        <div class="hiw-puzzle-type">
          <span class="hiw-puzzle-icon">🔐</span>
          <div class="hiw-puzzle-info">
            <h4>Cryptic Clues</h4>
            <p>Encrypted messages and cipher puzzles</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tips Section -->
    <section class="hiw-section">
      <h2 class="hiw-section-title">Pro Tips</h2>
      <div class="hiw-tips">
        <div class="hiw-tip">
          <span class="hiw-tip-icon">💡</span>
          <p>Think about common phrases, idioms, and expressions - they're often the answer!</p>
        </div>
        <div class="hiw-tip">
          <span class="hiw-tip-icon">💡</span>
          <p>Pay attention to positioning - words above, below, or inside other words often matter.</p>
        </div>
        <div class="hiw-tip">
          <span class="hiw-tip-icon">💡</span>
          <p>Don't rush your first guess. Take time to analyze the puzzle before answering.</p>
        </div>
        <div class="hiw-tip">
          <span class="hiw-tip-icon">💡</span>
          <p>Set a daily reminder to maintain your streak - consistency is key!</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="hiw-cta">
      <h3>Ready to Play?</h3>
      <button class="btn btn-primary btn-lg" onclick="window.location.hash='#/'">
        Start Today's Puzzle
      </button>
    </section>
  `;

  return page;
}

function getStyles(): string {
  return `
    <style>
      .how-it-works-page {
        max-width: 700px;
        margin: 0 auto;
      }

      .hiw-section {
        margin-bottom: var(--spacing-2xl);
      }

      .hiw-section-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-sm);
        border-bottom: 2px solid hsl(var(--border));
      }

      .hiw-intro {
        text-align: center;
        padding: var(--spacing-xl);
        background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
        border-radius: var(--radius-xl);
        border: 1px solid hsl(var(--primary) / 0.2);
      }

      .hiw-intro-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-md);
      }

      .hiw-intro h2 {
        font-size: var(--font-size-xl);
        margin-bottom: var(--spacing-sm);
      }

      .hiw-intro p {
        color: hsl(var(--muted-foreground));
        max-width: 500px;
        margin: 0 auto;
      }

      /* Steps */
      .hiw-steps {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .hiw-step {
        display: flex;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
      }

      .hiw-step-number {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        font-weight: var(--font-weight-bold);
        border-radius: var(--radius-full);
        flex-shrink: 0;
      }

      .hiw-step-content h3 {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        margin-bottom: var(--spacing-xs);
      }

      .hiw-step-content p {
        font-size: var(--font-size-sm);
        color: hsl(var(--muted-foreground));
        margin: 0;
      }

      /* Scoring */
      .hiw-scoring {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
      }

      .hiw-score-card {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        text-align: center;
      }

      .hiw-score-icon {
        font-size: 2rem;
        margin-bottom: var(--spacing-xs);
      }

      .hiw-score-card h4 {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
      }

      .hiw-score-value {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: hsl(var(--primary));
        margin: 0;
      }

      .hiw-score-desc {
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
        margin: var(--spacing-xs) 0 0;
      }

      .hiw-penalties {
        background: hsl(var(--destructive) / 0.1);
        border: 1px solid hsl(var(--destructive) / 0.3);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
      }

      .hiw-penalties h4 {
        color: hsl(var(--destructive));
        font-size: var(--font-size-sm);
        margin-bottom: var(--spacing-sm);
      }

      .hiw-penalties ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .hiw-penalties li {
        font-size: var(--font-size-sm);
        color: hsl(var(--muted-foreground));
        padding: var(--spacing-xs) 0;
      }

      /* Puzzle Types */
      .hiw-puzzles {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm);
      }

      .hiw-puzzle-type {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
      }

      .hiw-puzzle-icon {
        font-size: 1.5rem;
      }

      .hiw-puzzle-info h4 {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        margin-bottom: 2px;
      }

      .hiw-puzzle-info p {
        font-size: var(--font-size-xs);
        color: hsl(var(--muted-foreground));
        margin: 0;
      }

      /* Tips */
      .hiw-tips {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .hiw-tip {
        display: flex;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-lg);
      }

      .hiw-tip-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .hiw-tip p {
        font-size: var(--font-size-sm);
        color: hsl(var(--muted-foreground));
        margin: 0;
      }

      /* CTA */
      .hiw-cta {
        text-align: center;
        padding: var(--spacing-xl);
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius-xl);
      }

      .hiw-cta h3 {
        margin-bottom: var(--spacing-md);
      }

      .btn-lg {
        padding: var(--spacing-md) var(--spacing-xl);
        font-size: var(--font-size-base);
      }

      @media (max-width: 500px) {
        .hiw-scoring,
        .hiw-puzzles {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
}
