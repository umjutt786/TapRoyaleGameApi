exports.up = function (knex) {
  return knex.schema.createTable('loadouts', function (table) {
    table.increments('id').primary() // Unique identifier for each loadout
    table.string('name').notNullable() // Name of the loadout (e.g., 'Shield Loadout')
    table.integer('price').notNullable() // Type of loadout (e.g., 'Defensive', 'Special', etc.)
    table.boolean('prevents_damage').defaultTo(false) // For Shield Loadout
    table.integer('damage_points').defaultTo(1) // For Thief Loadout
    table.integer('duration')
    table.timestamps(true, true) // Timestamps for created_at and updated_at
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('loadouts') // Drop the loadouts table
}
