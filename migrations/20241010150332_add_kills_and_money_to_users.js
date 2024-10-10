exports.up = function(knex) {
    return knex.schema.table('users', (table) => {
        table.integer('total_kills').defaultTo(0); // Adding total_kills column
        table.float('total_extracted_money').defaultTo(0.0); // Adding total_extracted_money column
    });
};

exports.down = function(knex) {
    return knex.schema.table('users', (table) => {
        table.dropColumn('total_kills'); // Rollback
        table.dropColumn('total_extracted_money'); // Rollback
    });
};
