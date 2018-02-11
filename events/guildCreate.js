// This event executes when a new guild (server) is joined.

module.exports = (client, guild) => {
  // We need to add this guild to our settings!
  client.settings.set(guild.id, client.config.defaultSettings);
  client.user.setActivity("Techno World. Use a!help. Serving " + client.users.size + " in " + client.guilds.size + " servers." , "Hi.", "https://www.roblox.com/My/Groups.aspx?gid=3643510", "PLAYING")
};
