exports.up = function(knex) {
    return knex.schema.createTable('loadouts', function(table) {
      table.increments('id').primary();  // Unique identifier for each loadout
      table.string('name').notNullable(); // Name of the loadout (e.g., 'Shield Loadout')
      table.string('type').notNullable(); // Type of loadout (e.g., 'Defensive', 'Special', etc.)
      table.boolean('prevents_damage').defaultTo(false); // For Shield Loadout
      table.boolean('thief_effect').defaultTo(false); // For Thief Loadout
      table.decimal('money_multiplier', 2, 1).defaultTo(1.0); // For Money Multiplier Loadout
      table.timestamps(true, true); // Timestamps for created_at and updated_at
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('loadouts'); // Drop the loadouts table
  };
  