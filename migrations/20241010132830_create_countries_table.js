// migrations/<timestamp>_create_countries_table.js
exports.up = function(knex) {
    return knex.schema.createTable('countries', (table) => {
      table.increments('id').primary(); // Primary key
      table.string('name').notNullable(); // Country name
      table.string('code', 3).notNullable(); // ISO 3166-1 alpha-3 country code
      table.timestamps(true, true); // created_at and updated_at timestamps
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('countries'); // Rollback
  };
  