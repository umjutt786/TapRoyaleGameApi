// seeds/loadoutsSeeder.js
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('loadouts').del();
  
  // Inserts seed entries
  await knex('loadouts').insert([
      {
          name: 'Shield Loadout',
          type: 'Defensive',
          prevents_damage: true, // Prevents others from earning money when they attack
          thief_effect: false, // Not applicable
          money_multiplier: 1.0, // No money multiplier
      },
      {
          name: 'Thief Loadout',
          type: 'Special',
          prevents_damage: false, // Not applicable
          thief_effect: true, // Causes attackers to lose money
          money_multiplier: 1.0, // No money multiplier
      },
      {
          name: 'Money Multiplier Loadout',
          type: 'Special',
          prevents_damage: false, // Not applicable
          thief_effect: false, // Not applicable
          money_multiplier: 2.0, // Doubles the money earned per damage
      },
      {
          name: 'Double Attack',
          type: 'Special',
          prevents_damage: false, // Not applicable
          thief_effect: false, // Not applicable
          money_multiplier: 2.0, // Doubles the money earned per damage
      }
  ]);
};
