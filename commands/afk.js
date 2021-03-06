exports.run = async (client, message, args, level) => {
    let text = args.join(" ")
    let date = Date.now()
    if (text === undefined || text.length == 0) {
      text = "Currently away"
    }

    client.getData("AFK").then(reply => {
      let afkList = JSON.parse(reply)
      if (afkList) {
          
          if (!afkList[message.author.id]) {
            text = text.replace("@everyone", "[ping]")
            text = text.replace("@here", "[ping]")
            afkList[message.author.id] = [text, date]
            message.channel.send(client.responseEmojis.wink + " Set your AFK status to: " + text)
            client.setData("AFK", JSON.stringify(afkList))
            
          }
      } else {
       if (level == 999) {
           return message.channel.send("data doesn't exist " + client.responseEmojis.wink)
       }
      }
    })
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [""],
    permLevel: "User"
};

exports.help = {
    name: "afk",
    category: "Info",
    description: "Sets a global AFK status in all the servers Vanessa shares with you.",
    usage: "afk [status]"
};
