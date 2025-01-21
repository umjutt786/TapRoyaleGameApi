/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {country_id:1,username : "player1"},
    {country_id:1,username : "player2"},
    {country_id:1,username : "player3"},
    {country_id:1,username : "player4"},
    {country_id:1,username : "player5"},
    {country_id:1,username : "player6"},
    {country_id:1,username : "player7"},
    {country_id:1,username : "player8"},
    {country_id:1,username : "player9"},
    {country_id:1,username : "player10"},
    {country_id:1,username : "player11"},
    {country_id:1,username : "player12"},
    {country_id:1,username : "player13"},
    {country_id:1,username : "player14"},
    {country_id:1,username : "player15"},
    {country_id:1,username : "player16"},
    {country_id:1,username : "player17"},
    {country_id:1,username : "player18"},
    {country_id:1,username : "player19"},
    {country_id:1,username : "player20"},
    {country_id:1,username : "player21"},
    {country_id:1,username : "player22"},
    {country_id:1,username : "player23"},
    {country_id:1,username : "player24"},
    {country_id:1,username : "player25"},
    {country_id:1,username : "player26"},
    {country_id:1,username : "player27"},
    {country_id:1,username : "player28"},
    {country_id:1,username : "player29"},
    {country_id:1,username : "player30"},
  ]);
};
