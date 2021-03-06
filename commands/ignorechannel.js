const discord = require('discord.js')

exports.run = (client, message, args, level) => {
    let guild = message.guild
    let channel = message.mentions.channels.first()
    let option = args[1] || args[0]
   
    if (!option) {
      return message.channel.send("An option is needed!")
    }
    if (!channel && option !== "view") {
      return message.channel.send("A channel is needed!")
    }
    option = option.toLowerCase()
    

    client.getGuildData(guild).then(response => {
      let data = JSON.parse(response)
      if (data) {
        let ignoredChannels = data.data.ignoredChannels
        
        if (option == "view") {
          let channelArray = []
          for (x in ignoredChannels) {
            channelArray.push(`<#${x}>`)
          }
          channelArray = channelArray.join(", ")
          let embed = new discord.RichEmbed()
          .setTitle("Blocked Channels")
          .setDescription("The list of blocked channels by your server.\n\n" + channelArray)
          .setColor(process.env.purple)
          message.channel.send({embed})
          return 
        }
          
        
        let channelID = channel.id || "UNKNOWN_CHANNEL"
        let channelMention = `<#${channelID}>`
        
        if (option == "off") {
          if (ignoredChannels[channel.id]) {
            delete ignoredChannels[channel.id]
            message.channel.send(`${channelMention} is now unblocked! I can speak there now!`)
            client.saveGuildData(guild, JSON.stringify(data))
          }
        }
        if (option == "on") {
          if (!ignoredChannels[channel.id]) {
            ignoredChannels[channel.id] = true
            message.channel.send(`${channelMention} is now blocked! I won't speak there anymore.`)
            client.saveGuildData(guild, JSON.stringify(data))
          } else {
            return message.channel.send("This channel is already blocked!")
          }
        }
        

      }
    })

}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ["ignore-channel"],
    permLevel: "Administrator",
    subCommands: [
      "off - Resumes speaking in this channel.\n`ignorechannel #general off`",
      "on - No longer speaks in this channel. `ignorechannel #bot-commands on`",
      "view - Displays blocked channels for the guild."
    ]
};

exports.help = {
    name: "ignorechannel",
    category: "Moderation",
    description: "The bot will no longer speak, or respond to commands in this channel.\nUsers will be DM'ed of the notice. Administrators bypass this.\n",
    usage: "ignorechannel [channel mention] off/on"
};
