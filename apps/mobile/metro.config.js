// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo including pnpm virtual store
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, 'node_modules/.pnpm'),
];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Enable symlink support for pnpm
config.resolver.unstable_enableSymlinks = true;

// 4. Disable hierarchical lookup to prevent Metro from searching parent directories incorrectly
config.resolver.disableHierarchicalLookup = true;

// 5. Extra node modules mapping for critical packages
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      // First try local node_modules
      const localPath = path.join(projectRoot, 'node_modules', name);
      if (fs.existsSync(localPath)) {
        // Resolve symlink to real path
        try {
          return fs.realpathSync(localPath);
        } catch (e) {
          return localPath;
        }
      }
      // Fall back to monorepo root node_modules
      const rootPath = path.join(monorepoRoot, 'node_modules', name);
      if (fs.existsSync(rootPath)) {
        try {
          return fs.realpathSync(rootPath);
        } catch (e) {
          return rootPath;
        }
      }
      return path.join(projectRoot, 'node_modules', name);
    },
  }
);

module.exports = config;
