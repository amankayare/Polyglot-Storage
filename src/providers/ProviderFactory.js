const ApiError = require('../utils/ApiError');

const providers = {};

/**
 * ProviderFactory — resolves a provider name string to an IStorageProvider instance.
 * Providers register themselves at startup; AssetService never imports concrete classes.
 */
const ProviderFactory = {
  /**
   * Register a provider instance under a name.
   * @param {string} name
   * @param {import('./IStorageProvider')} instance
   */
  register(name, instance) {
    providers[name.toLowerCase()] = instance;
  },

  /**
   * Resolve a provider by name.
   * @param {string} name
   * @returns {import('./IStorageProvider')}
   */
  resolve(name) {
    const provider = providers[name.toLowerCase()];
    if (!provider) {
      throw ApiError.badRequest(`Unknown storage provider: "${name}"`);
    }
    return provider;
  },

  /**
   * List all registered provider names.
   * @returns {string[]}
   */
  list() {
    return Object.keys(providers);
  },
};

module.exports = ProviderFactory;
