/**
 * Hash-based Router for Desktop App
 * Simple, no-dependency routing using URL hashes
 */

import { appStore } from './store';

export type RouteHandler = () => HTMLElement | Promise<HTMLElement>;

export interface Route {
  path: string;
  handler: RouteHandler;
  title: string;
}

class Router {
  private routes: Map<string, Route> = new Map();
  private container: HTMLElement | null = null;
  private currentPath: string = '/';
  private beforeNavigateHooks: Array<(from: string, to: string) => boolean | Promise<boolean>> = [];
  private afterNavigateHooks: Array<(path: string) => void> = [];

  /**
   * Initialize the router with a container element
   */
  init(containerId: string): void {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Router container #${containerId} not found`);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());

    // Handle initial route
    this.handleRoute();
  }

  /**
   * Register a route
   */
  register(path: string, handler: RouteHandler, title: string): void {
    this.routes.set(path, { path, handler, title });
  }

  /**
   * Register multiple routes at once
   */
  registerAll(routes: Array<{ path: string; handler: RouteHandler; title: string }>): void {
    routes.forEach(({ path, handler, title }) => {
      this.register(path, handler, title);
    });
  }

  /**
   * Navigate to a path
   */
  async navigate(path: string): Promise<void> {
    // Run before hooks
    for (const hook of this.beforeNavigateHooks) {
      const canProceed = await hook(this.currentPath, path);
      if (!canProceed) {
        return;
      }
    }

    // Update hash (this will trigger hashchange and handleRoute)
    window.location.hash = path;
  }

  /**
   * Replace current route without adding to history
   */
  replace(path: string): void {
    window.location.replace(`#${path}`);
  }

  /**
   * Go back in history
   */
  back(): void {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward(): void {
    window.history.forward();
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Add a hook that runs before navigation
   * Return false to prevent navigation
   */
  beforeNavigate(hook: (from: string, to: string) => boolean | Promise<boolean>): () => void {
    this.beforeNavigateHooks.push(hook);
    return () => {
      const index = this.beforeNavigateHooks.indexOf(hook);
      if (index > -1) {
        this.beforeNavigateHooks.splice(index, 1);
      }
    };
  }

  /**
   * Add a hook that runs after navigation
   */
  afterNavigate(hook: (path: string) => void): () => void {
    this.afterNavigateHooks.push(hook);
    return () => {
      const index = this.afterNavigateHooks.indexOf(hook);
      if (index > -1) {
        this.afterNavigateHooks.splice(index, 1);
      }
    };
  }

  /**
   * Handle route changes
   */
  private async handleRoute(): Promise<void> {
    if (!this.container) return;

    // Get path from hash, default to '/'
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0]; // Remove query params

    this.currentPath = path;

    // Update store
    appStore.setState({ currentPage: path });

    // Find matching route
    const route = this.routes.get(path) || this.routes.get('*');

    if (!route) {
      console.warn(`No route found for: ${path}`);
      this.renderNotFound();
      return;
    }

    // Update document title
    document.title = `${route.title} - Rebuzzle`;

    try {
      // Show loading state
      this.container.classList.add('route-loading');

      // Get page element
      const element = await route.handler();

      // Clear and render
      this.container.innerHTML = '';
      this.container.appendChild(element);

      // Remove loading state and add transition
      this.container.classList.remove('route-loading');
      this.container.classList.add('route-enter');

      // Remove animation class after transition
      setTimeout(() => {
        this.container?.classList.remove('route-enter');
      }, 300);

      // Run after hooks
      this.afterNavigateHooks.forEach((hook) => hook(path));
    } catch (error) {
      console.error('Route error:', error);
      this.renderError(error);
    }
  }

  /**
   * Render 404 page
   */
  private renderNotFound(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="error-page">
        <h1>404</h1>
        <p>Page not found</p>
        <button onclick="window.router.navigate('/')">Go Home</button>
      </div>
    `;
  }

  /**
   * Render error page
   */
  private renderError(error: unknown): void {
    if (!this.container) return;

    const message = error instanceof Error ? error.message : 'Unknown error';

    this.container.innerHTML = `
      <div class="error-page">
        <h1>Error</h1>
        <p>${message}</p>
        <button onclick="window.router.navigate('/')">Go Home</button>
      </div>
    `;
  }
}

// Export singleton router
export const router = new Router();

// Make router available globally for onclick handlers
declare global {
  interface Window {
    router: Router;
  }
}
window.router = router;

/**
 * Helper function to create links that use the router
 */
export function createLink(path: string, text: string, className?: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${path}`;
  link.textContent = text;
  if (className) {
    link.className = className;
  }
  link.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate(path);
  });
  return link;
}

/**
 * Helper function to check if a path is active
 */
export function isActive(path: string): boolean {
  const current = router.getCurrentPath();
  if (path === '/') {
    return current === '/' || current === '';
  }
  return current === path;
}
