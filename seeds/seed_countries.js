// seeds/seed_countries.js
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('countries').del();
  
  // Inserts seed entries
  await knex('countries').insert([
    { name: 'United States', code: 'USA' },
    { name: 'Canada', code: 'CAN' },
    { name: 'United Kingdom', code: 'GBR' },
    { name: 'Australia', code: 'AUS' },
    { name: 'Germany', code: 'DEU' },
    { name: 'France', code: 'FRA' },
    { name: 'India', code: 'IND' },
    { name: 'Japan', code: 'JPN' },
    { name: 'Brazil', code: 'BRA' },
    { name: 'South Africa', code: 'ZAF' },
  ]);
};
