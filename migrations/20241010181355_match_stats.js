exports.up = function(knex) {
    return knex.schema.createTable('match_stats', (table) => {
        table.increments('id').primary();
        table.integer('player_id').notNullable();
        table.integer('game_id').notNullable();
        table.integer('kills').defaultTo(0);
        table.float('damage_dealt').defaultTo(0.0);
        table.boolean('is_winner').defaultTo(false);
        table.boolean('is_bot').defaultTo(false); 
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('match_stats');
};
