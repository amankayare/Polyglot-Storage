const ApiError = require('../utils/ApiError');

class AssetRepository {
  /**
   * @param {import('knex').Knex} knex
   */
  constructor(knex) {
    this.knex = knex;
  }

  async create(record) {
    const [asset] = await this.knex('assets').insert(record).returning('*');
    // SQLite doesn't support returning() — fall back to a read
    return asset || this.findById(record.id);
  }

  async findById(assetId) {
    const asset = await this.knex('assets')
      .where({ id: assetId })
      .whereNull('deleted_at')
      .first();

    if (!asset) {
      throw ApiError.notFound(`Asset not found: ${assetId}`);
    }
    return asset;
  }

  async delete(assetId) {
    const updated = await this.knex('assets')
      .where({ id: assetId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date().toISOString() });

    if (!updated) {
      throw ApiError.notFound(`Asset not found: ${assetId}`);
    }
  }

  async list(filters = {}) {
    const query = this.knex('assets').whereNull('deleted_at');

    if (filters.provider) {
      query.where('provider', filters.provider);
    }
    if (filters.limit) {
      query.limit(filters.limit);
    }
    if (filters.offset) {
      query.offset(filters.offset);
    }

    return query.orderBy('created_at', 'desc');
  }
}

module.exports = AssetRepository;
