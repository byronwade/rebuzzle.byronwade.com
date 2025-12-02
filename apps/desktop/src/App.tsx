import { useState, useEffect } from "react";

function App() {
  const [platformInfo, setPlatformInfo] = useState<{
    platform: string;
    versions: { node: string; chrome: string; electron: string };
  } | null>(null);

  useEffect(() => {
    // Get platform info from Electron API
    if (window.electronAPI) {
      setPlatformInfo({
        platform: window.electronAPI.platform,
        versions: window.electronAPI.versions,
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Title bar drag region for macOS */}
      <div className="h-8 w-full app-drag-region" />

      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Rebuzzle
          </h1>
          <p className="text-xl text-gray-300">Desktop Edition</p>
        </header>

        <main className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Welcome to Rebuzzle Desktop
            </h2>

            <p className="text-gray-300 text-center mb-8">
              The desktop version is loading. This app connects to rebuzzle.com
              for puzzles and game data.
            </p>

            {platformInfo && (
              <div className="bg-black/20 rounded-lg p-4 text-sm font-mono">
                <p className="text-gray-400 mb-2">Platform Info:</p>
                <p>OS: {platformInfo.platform}</p>
                <p>Node: {platformInfo.versions.node}</p>
                <p>Chrome: {platformInfo.versions.chrome}</p>
                <p>Electron: {platformInfo.versions.electron}</p>
              </div>
            )}

            <div className="mt-8 text-center">
              <button
                type="button"
                className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-full hover:scale-105 transition-transform"
                onClick={() => {
                  // TODO: Navigate to game or load puzzle
                  console.log("Start game clicked");
                }}
              >
                Start Playing
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>© 2024 Rebuzzle. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
