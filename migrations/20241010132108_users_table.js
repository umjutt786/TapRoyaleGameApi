// migrations/20241010123456_create_users_table.js

exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
      table.increments('id').primary();
      table.string('username').notNullable();
      table.string('country_id').notNullable();
      table.timestamps(true, true); // Adds created_at and updated_at
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('users');
  };
  