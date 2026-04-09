/**
 * PluginRegistry — Extensible Feature Module System
 * ====================================================
 * Provides a simple registration mechanism for feature plugins.
 * Each plugin is an object with lifecycle hooks:
 *   - init(context)          called when plugin is registered
 *   - onSceneChange(scene)   called when the active scene changes
 *   - destroy()              called on cleanup
 *
 * The context object provides shared state:
 *   { scenes, currentScene, cameraRef, emitEvent }
 */

class PluginRegistry {
  constructor() {
    this._plugins = new Map();
    this._context = {};
  }

  /**
   * Set the shared context object available to all plugins.
   */
  setContext(context) {
    this._context = { ...this._context, ...context };
  }

  /**
   * Register a plugin by name.
   * @param {string} name - Unique plugin identifier
   * @param {Object} plugin - Plugin object with lifecycle hooks
   */
  register(name, plugin) {
    if (this._plugins.has(name)) {
      console.warn(`[PluginRegistry] Plugin "${name}" already registered, replacing.`);
      this._plugins.get(name).destroy?.();
    }
    this._plugins.set(name, plugin);
    plugin.init?.(this._context);
  }

  /**
   * Get a plugin by name.
   */
  get(name) {
    return this._plugins.get(name) || null;
  }

  /**
   * Get all registered plugins.
   */
  getAll() {
    return Array.from(this._plugins.entries()).map(([name, plugin]) => ({
      name,
      plugin,
    }));
  }

  /**
   * Notify all plugins of a scene change.
   */
  notifySceneChange(scene) {
    for (const [, plugin] of this._plugins) {
      plugin.onSceneChange?.(scene);
    }
  }

  /**
   * Destroy all plugins and clear the registry.
   */
  destroyAll() {
    for (const [, plugin] of this._plugins) {
      plugin.destroy?.();
    }
    this._plugins.clear();
  }
}

// Singleton instance
const registry = new PluginRegistry();
export default registry;
