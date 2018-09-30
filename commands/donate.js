// donations

exports.run = (client, message, args, level) => {
	let user = message.mentions.members.first()
	let amount = parseInt(args[1])
	if (!amount && amount != "all") {
		return message.channel.send("Please send a proper amount!")
	}
	if (!user) {
		return message.channel.send("Please tag a user you want to donate to!")
	}
	if (user.id == message.author.id) {
		return message.channel.send("You tryin' to pull a fast one on me?")
	}
	if (user.user.bot) {
		return message.channel.send("You can't donate to bots! Not like they'll use the money...")
	}
	let playerCoinsKey = message.author.id + '-' + guild.id + '-coins'
	let friendCoinsKey = user.id + '-' + guild.id + '-coins'
	client.redisClient.get(playerCoinsKey, function(err, reply) {
		if (reply) {
			let coins = parseInt(reply)
			if (amount == 'all') {
				client.redisClient.set(playerCoinsKey, 0, function(err, reply) {
					client.redisClient.incrby(friendCoinsKey, coins)
					message.channel.send("Donated `" + coins + "` to **" + user.user.tag + "**!" )
				})
				return
			}
			if (coins - amount >= 0) {
				client.redisClient.decrby(playerCoinsKey, amount)
				client.redisClient.incrby(friendCoinsKey, amount)
				message.channel.send("Donated `" + amount + "` to **" + user.user.tag + "**!" )
			}
		} else {
			message.channel.send("You don't have any money... I respect your generosity, but the law won't let me do that.")
		}
	})
};

exports.conf = {
		enabled: true,
		guildOnly: true,
		aliases: ["give"],
		permLevel: "User"
};

exports.help = {
		name: "donate",
		category: "Economy",
		description: "Lend a helping hand!",
		usage: "donate @Friend 1000"
};