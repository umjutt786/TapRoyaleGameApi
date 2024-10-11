exports.up = function(knex) {
    return knex.schema.createTable('player_game_loadouts', function(table) {
      table.increments('id').primary(); // Unique identifier for each record
      table.integer('player_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE'); // Foreign key referencing players
      table.integer('game_id').unsigned().notNullable()
        .references('id').inTable('games').onDelete('CASCADE'); // Foreign key referencing games
      table.integer('loadout_id').unsigned().notNullable()
        .references('id').inTable('loadouts').onDelete('CASCADE'); // Foreign key referencing loadouts
      table.timestamps(true, true); // Timestamps for created_at and updated_at
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('player_game_loadouts'); // Drop the player_game_loadouts table
  };
  