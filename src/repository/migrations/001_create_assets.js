/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('assets', (table) => {
    table.uuid('id').primary();
    table.string('provider').notNullable();
    table.string('external_id').notNullable();
    table.text('public_url').notNullable();
    table.string('filename').notNullable();
    table.string('mime_type').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('assets');
};
