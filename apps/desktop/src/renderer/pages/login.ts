/**
 * Login Page
 * Authentication for desktop app
 */

import { api } from '../lib/api';
import { appStore } from '../lib/store';
import { router } from '../lib/router';

export async function createLoginPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page login-page';

  // Check if already authenticated
  const { isAuthenticated } = appStore.getState();
  if (isAuthenticated) {
    router.navigate('/');
    return page;
  }

  page.innerHTML = `
    <div class="login-container">
      <div class="login-header">
        <h1>Welcome Back</h1>
        <p>Sign in to track your progress</p>
      </div>

      <form class="login-form" id="login-form">
        <div class="form-group">
          <label class="label" for="email">Email</label>
          <input
            type="email"
            class="input"
            id="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="label" for="password">Password</label>
          <input
            type="password"
            class="input"
            id="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <div class="form-error" id="form-error" hidden></div>

        <button type="submit" class="btn btn-primary btn-lg" id="submit-btn">
          Sign In
        </button>
      </form>

      <div class="login-footer">
        <p>Don't have an account?</p>
        <a
          href="https://rebuzzle.byronwade.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          class="signup-link"
        >
          Sign up on the web
        </a>
      </div>

      <div class="guest-option">
        <button class="btn btn-ghost" id="guest-btn">
          Continue as Guest
        </button>
      </div>
    </div>
  `;

  // Set up event listeners
  setupLoginListeners(page);

  return page;
}

function setupLoginListeners(container: HTMLElement): void {
  const form = container.querySelector('#login-form') as HTMLFormElement;
  const emailInput = container.querySelector('#email') as HTMLInputElement;
  const passwordInput = container.querySelector('#password') as HTMLInputElement;
  const submitBtn = container.querySelector('#submit-btn') as HTMLButtonElement;
  const errorEl = container.querySelector('#form-error') as HTMLElement;
  const guestBtn = container.querySelector('#guest-btn') as HTMLButtonElement;

  // Focus email input
  emailInput?.focus();

  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError(errorEl, 'Please enter your email and password');
      return;
    }

    // Disable form
    setLoading(submitBtn, true);
    hideError(errorEl);

    try {
      const result = await api.login(email, password);

      if (result.success) {
        window.showToast('Welcome back!', 'success');
        router.navigate('/');
      } else {
        showError(errorEl, 'Invalid email or password');
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(errorEl, 'Login failed. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // Handle guest mode
  guestBtn?.addEventListener('click', () => {
    window.showToast('Playing as guest', 'info');
    router.navigate('/');
  });

  // Handle enter key in password field
  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      form?.requestSubmit();
    }
  });
}

function showError(errorEl: HTMLElement, message: string): void {
  errorEl.textContent = message;
  errorEl.hidden = false;
  errorEl.classList.add('shake');
  setTimeout(() => errorEl.classList.remove('shake'), 500);
}

function hideError(errorEl: HTMLElement): void {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function setLoading(button: HTMLButtonElement, loading: boolean): void {
  button.disabled = loading;
  button.textContent = loading ? 'Signing in...' : 'Sign In';
}

// Add login-specific styles
const loginStyles = document.createElement('style');
loginStyles.textContent = `
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }

  .login-container {
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-lg);
  }

  .login-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
  }

  .login-header h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-xs);
  }

  .login-header p {
    color: hsl(var(--muted-foreground));
  }

  .login-form {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
  }

  .form-group {
    margin-bottom: var(--spacing-md);
  }

  .form-error {
    padding: var(--spacing-sm) var(--spacing-md);
    background: hsl(var(--destructive) / 0.1);
    border: 1px solid hsl(var(--destructive) / 0.3);
    border-radius: var(--radius-md);
    color: hsl(var(--destructive));
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-md);
  }

  .login-form .btn {
    width: 100%;
  }

  .login-footer {
    text-align: center;
    margin-top: var(--spacing-lg);
    color: hsl(var(--muted-foreground));
    font-size: var(--font-size-sm);
  }

  .login-footer p {
    margin-bottom: var(--spacing-xs);
  }

  .signup-link {
    color: hsl(var(--primary));
    text-decoration: none;
  }

  .signup-link:hover {
    text-decoration: underline;
  }

  .guest-option {
    text-align: center;
    margin-top: var(--spacing-lg);
  }

  .guest-option .btn {
    color: hsl(var(--muted-foreground));
  }
`;
document.head.appendChild(loginStyles);
