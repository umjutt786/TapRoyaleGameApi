/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('match_stats', (table) => {
        table.integer('assist').defaultTo(0); 
        table.integer('rank').defaultTo(1);
        table.integer('health').defaultTo(100);
        table.integer('death').defaultTo(0);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('match_stats', (table) => {
        table.dropColumn('assist'); 
        table.dropColumn('rank');
        table.dropColumn('health');
        table.dropColumn('death');
    });
};
