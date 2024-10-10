exports.up = function(knex) {
    return knex.schema.createTable('games', (table) => {
        table.increments('id').primary();
        table.timestamp('started_at').defaultTo(knex.fn.now());
        table.timestamp('ended_at').nullable();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('games');
};
