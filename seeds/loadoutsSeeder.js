// seeds/loadoutsSeeder.js
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('loadouts').del()

  // Inserts seed entries
  await knex('loadouts').insert([
    {
      name: 'Attack',
      price: 20,
      prevents_damage: false,
      damage_points: 2,
      duration: 10,
    },
    {
      name: 'Shield',
      price: 50,
      prevents_damage: true,
      damage_points: 1,
      duration: 5,
    },
    {
      name: 'Extra Cash',
      price: 10,
      prevents_damage: false,
      damage_points: 2,
      duration: 10,
    },
    {
      name: 'Air Strike',
      price: 100,
      prevents_damage: false,
      damage_points: 50,
      duration: null,
    },
  ])
}
