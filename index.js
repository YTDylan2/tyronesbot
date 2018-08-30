// This will check if the node version you are running is the required
// Node version, if it isn't it will throw the following error to inform
// you.
if (process.version.slice(1).split(".")[0] < 8) throw new Error("Node 8.0.0 or higher is required. Update Node on your system.");

// Load up the discord.js library
const Discord = require("discord.js");
const Roblox = require("roblox-js");
const express = require("express");
const bodyParser = require('body-parser')
const validator = require('validator')
const http = require('http')
var app = express();
var key = process.env.key
// We also load the rest of the things we need in this file:
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const rethink = require("rethinkdb")
const EnmapRethink = require('enmap-rethink')


// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`,
// or `bot.something`, this is what we're refering to. Your client.
const client = new Discord.Client();


// Here we load the config file that contains our token and our prefix values.
client.config = require("./config.js");
// client.config.token contains the bot's token
// client.config.prefix contains the message prefix

// Require our logger
client.logger = require("./util/Logger");


// Let's start by getting some useful functions that we'll use throughout
// the bot, like logs and elevation features.
require("./modules/functions.js")(client);

app.set('env', 'production')
function sendErr(res, json, status) {
    res.json(json);
}
Roblox.login({username: "GCRBOT", password: process.env.rbxpass})
    .then(function () {
        console.log("Logged in to ROBLOX")
        client.channels.get('434477311497076739').send("Logged into ROBLOX as **'GCRBOT'**")
    })
    .catch(function(err) {
        console.log("login error: " + err)
    });
client.caseLegendsPlayerData = []
client.savedPlayerData = new Enmap({ provider: new EnmapLevel({ name: 'playerData' }) });
client.lastCommand = "None"



var groupBanned = {
    '294976424' : true,
    '620089904' : true,
}

function validatorType(type) {
    switch (type) {
        case 'int':
            return validator.isInt;
        case 'safe_string':
            return validator.isAlphanumeric;
        case 'boolean':
            return validator.isBoolean;
        case 'string':
            return function (value) {
                return typeof value === 'string';
            };
        default:
            return function () {
                return true;
            };
    }
}

function processType(type, value) {
    switch (type) {
        case 'int':
            return parseInt(value, 10);
        case 'boolean':
            return (value === 'true');
        default:
            return value;
    }
}

function verifyParameters(res, validate, requiredFields, optionalFields) {
    var result = {};
    if (requiredFields) {
        for (var index in requiredFields) {
            var type = requiredFields[index];
            var use = validatorType(type);

            var found = false;
            for (var i = 0; i < validate.length; i++) {
                var value = validate[i][index];
                if (value) {
                    if (use(value)) {
                        result[index] = processType(type, value);
                        found = true;
                    } else {
                        sendErr(res, { error: 'Parameter "' + index + '" is not the correct data type.', id: null });
                        return false;
                    }
                    break;
                }
            }
            if (!found) {
                sendErr(res, { error: 'Parameter "' + index + '" is required.', id: null });
                return false;
            }
        }
    }
    if (optionalFields) {
        for (index in optionalFields) {
            type = optionalFields[index];
            use = validatorType(type);
            for (i = 0; i < validate.length; i++) {
                value = validate[i][index];
                if (value) {
                    if (use(value)) {
                        result[index] = processType(type, value);
                    } else {
                        sendErr(res, { error: 'Parameter "' + index + '" is not the correct data type.', id: null });
                        return false;
                    }
                    break;
                }
            }
        }
    }
    return result;
}

function authenticate(req, res, next) {
    if (req.body.key === key) {
        next();
    } else {
        sendErr(res, { error: 'Incorrect authentication key', id: null }, 401);
    }
}

function findUserIdMatch(id, array) {
    for (x in array) {
        if (array.userId == id) {
            return true, array[x]
        }
    }
    return false;
}

function checkScammer(userId) {
    var https = require('request')
    var result = false
    https('https://avatar.roblox.com/v1/users/' + userId +'/currently-wearing', {json: true}, (err, res, body) => {
        if (body) {
            for (x in body.assetIds) {
                var id = body.assetIds[x]
                if (id == 6340101) {
                    console.log(`UserId ${userId} is not allowed.`)
                    Roblox.setRank(process.env.groupid, userId, 4)
                     .catch(function (err) {
                         console.log(err)
                     })
                   result = true
                   break;
                }
            }
        }
    });
    if (result == false) {
         client.channels.get('449982070597353472').send("Promoting **" + userId + "**...")
         Roblox.setRank(process.env.groupid, userId, 2)
          .then(function (newRole){
            client.channels.get('449982070597353472').send("Success! Promoted to " + newRole.Name);
         })
         .catch(function (err) {
            console.log("ERROR RANKING: " + err)
         }) 
    }
}

// Aliases and commands are put in collections where they can be read from,
// catalogued, listed, etc.
client.commands = new Enmap();
client.aliases = new Enmap();

// Now we integrate the use of Evie's awesome Enhanced Map module, which
// essentially saves a collection to disk. This is great for per-server configs,
// and makes things extremely easy for this purpose.
client.settings = new Enmap({provider: new EnmapLevel({name: "settings"})});

client.collection = new Enmap({provider: new EnmapLevel({name: "enmapTest"})});

// We're doing real fancy node 8 async/await stuff here, and to do that
// we need to wrap stuff in an anonymous function. It's annoying but it works.

const init = async () => {
   // Roblox.post(4044556, "Second test: Hello world!")
  // Here we load **commands** into memory, as a collection, so they're accessible
  // here and everywhere else.
  const cmdFiles = await readdir("./commands/");
  client.logger.log(`Loading a total of ${cmdFiles.length} commands.`);
  cmdFiles.forEach(f => {
    if (!f.endsWith(".js")) return;
    const response = client.loadCommand(f);
    if (response) console.log(response);
  });

  // Then we load events, which will include our message and ready event.
  const evtFiles = await readdir("./events/");
  client.logger.log(`Loading a total of ${evtFiles.length} events.`);
  evtFiles.forEach(file => {
    const eventName = file.split(".")[0];
    const event = require(`./events/${file}`);
    // This line is awesome by the way. Just sayin'.
    client.on(eventName, event.bind(null, client));
    delete require.cache[require.resolve(`./events/${file}`)];
  });
  
   // app stuff
  app.use(bodyParser.json())
  app.post('/feedback/:message/:player/:userId', authenticate, function (req, res, next) {
      var fields = {
          'message' : 'string',
          'player' : 'string',
          'userId' : 'int'
      }
      var checking = [req.params]
      var params = verifyParameters(res, checking, fields)
      if (!params) {
          client.channels.get('425822679958945792').send("Error getting message data. Please check parameters provided.")
          sendErr(res, {error : 'The parameters given do not match what is required.', id: null})
          return;
      }
      const embed = new Discord.RichEmbed()
        .addField(`**Message Body**`, params.message)
        .setTitle("**Feedback Received!**")
        .setDescription("Feedback received from " + params.player + '.')
        .setColor(6605055)
        // .setImage('https://i.imgur.com/zwMrlQT.png')
        .setThumbnail('https://www.roblox.com/bust-thumbnail/image?userId='+ params.userId + '&width=420&height=420&format=png')
        .setAuthor("Aureum Studios | techno turret", 'https://i.imgur.com/WcypWFd.png')
        .setFooter("Provided by Aureum Studios", 'https://i.imgur.com/WcypWFd.png')
        .setTimestamp()
        client.channels.get('425822679958945792').send({embed})
        res.send("Successfully sent message!")
  })
    
  app.post('/ping', authenticate, function(req, res, next) {
      let senderTime = req.body.sendTime
      let now = Date.now()
      let ping = now - senderTime
      res.send([ping, client.lastCommand])
  })
  
  app.post('/groupVerify', authenticate, function(req, res, next) {
      console.log(req.body)
      let userId = req.body.userId
      let success = false
      var rank = Roblox.getRankInGroup(process.env.groupid, userId)

      Roblox.setRank(process.env.groupid, userId, 3)
      .then(function (n) {
          success = true
      })
          
      if (rank >= 4) {
          success = true
      }
      res.send(success)
  })
  
  app.post('/getGCRBAN', authenticate, function (req, res, next) {
    //   client.channels.get('425822679958945792').send("BODY: " + req.body + ". PARAMS: " + req.body)
      var dataString = [`CaseBux: **${req.body.CB}**`,
      `RAP: **${req.body.RAP}**`,
      `User ID: **${req.body.userId}**`,
      `Name: **${req.body.player}**`,
      `Note: **${req.body.Note}**`
                            
      ].join('\n')
      const embed = new Discord.RichEmbed()
        .addField(`**Ban Report**`, dataString )
        .setTitle("**User banned!**")
        .setDescription("This ban is for " + req.body.player + '.')
        .setColor(6605055)
        // .setImage('https://i.imgur.com/zwMrlQT.png')
        .setThumbnail('https://www.roblox.com/bust-thumbnail/image?userId='+ req.body.userId + '&width=420&height=420&format=png')
        .setAuthor("Galactic Games | water", 'https://i.imgur.com/kuAJC50.png')
        .setFooter("Provided by Galactic Games", 'https://i.imgur.com/kuAJC50.png')
        .setTimestamp()
        client.channels.get('447790444588433431').send({embed})
        res.send("Successfully sent data!")
  })
   app.post('/getGCRUNBAN', authenticate, function (req, res, next) {
     // client.channels.get('425822679958945792').send("BODY: " + req.body + ". PARAMS: " + req.body)
      var dataString = [`CaseBux: **${req.body.CB}**`,
      `RAP: **${req.body.RAP}**`,
      `User ID: **${req.body.userId}**`,
      `Name: **${req.body.player}**`,
      `Note: **${req.body.Note}**`

      ].join('\n')
      const embed = new Discord.RichEmbed()
        .addField(`**Unban Report**`, dataString )
        .setTitle("**User unbanned!**")
        .setDescription("This unban log is for " + req.body.player + '.')
        .setColor(6605055)
        // .setImage('https://i.imgur.com/zwMrlQT.png')
        .setThumbnail('https://www.roblox.com/bust-thumbnail/image?userId='+ req.body.userId + '&width=420&height=420&format=png')
        .setAuthor("Galactic Games | water", 'https://i.imgur.com/kuAJC50.png')
        .setFooter("Provided by Galactic Games", 'https://i.imgur.com/kuAJC50.png')
        .setTimestamp()
        client.channels.get('447790444588433431').send({embed})
        res.send("Successfully sent data!")
    })
    
    var idsLogged = {}
    app.post('/getCaseLegendsData', authenticate, function (req, res, next) {
        if (!req.body) {
            // ("Error getting data. Please check parameters provided.")
            sendErr(res, {error : 'The parameters given do not match what is required.', id: null})
            return;
        }
        var data = req.body.info
        if (data.length == 0) {
           // console.log("There's an error here.")
        }
        //console.log(req.body.info)
        
        for (x in data) {
            var pData = data[x]
           // console.log(pData)
            // console.log(data.userId)
            if (!idsLogged[pData.userId]) {
                idsLogged[pData.userId] = true
                client.caseLegendsPlayerData[client.caseLegendsPlayerData.length + 1] = pData
               // console.log("Added a new data entry for Case Legends " + pData.userId)
            }
            if (idsLogged[pData.userId] && client.caseLegendsPlayerData.length > 0) {
                if (findUserIdMatch(pData.userId, client.caseLegendsPlayerData)) {
                    var result, oldData = findUserIdMatch(pData.userId, client.caseLegendsPlayerData)
                    oldData = pData
                }
            }
        }
        client.savedPlayerData.set("Case Legends", client.caseLegendsPlayerData)
        
        res.send("Data was successfully received and uploaded to memory.")
    })

  app.listen(process.env.PORT)
    
  // this keeps the app alive
    app.get("/", (request, response) => {
     // console.log(Date.now() + " Ping Received");
      response.sendStatus(200);
    });
    
    setInterval(() => {
      http.get(`http://technoturret.herokuapp.com/`);
    }, 120000);
    
    
    
    setInterval(() => { // auto rank users
      var https = require('request')
      var roblox = require('noblox.js')
      https('https://groups.roblox.com/v1/groups/'+ process.env.groupid +'/roles/28699298/users?sortOrder=Asc&limit=100', { json: true }, (err, res, body) => {
       
         if (err) {
             return;
         }
         if (body.data.length == 0) {
            // client.channels.get('449982070597353472').send("No users to promote!")
            return;
         }
         for (x in body.data) {
             var userData = body.data[x]
             if (!groupBanned[userData.userId]) {
                if (!userData.userId) {
                    // client.channels.get('449982070597353472').send("Could not promote a user!")
                    return;
                }
               var scammer = checkScammer(userData.userId)        
             };
             if (groupBanned[userData.userId]) {
                client.channels.get('449982070597353472').send(userData.username + " is not allowed into the WaterIsIceSoup group!")
             };
         };
      });
    }, 5000);
    
    setInterval(() => {
        roblox.login("GCRBOT", process.env.rbxpass)
         .then(function () {
            console.log("Logged in!")
        });
    }, 8640000);
        
  
    

  var botMessaged = Roblox.onMessage();
  botMessaged.on('data', function(message) {
      let name = message.sender.name
      let subject = message.subject
      let body = message.body
      let userId = message.sender.userId
      var messageString = [`User: **${name}**`,
      `User ID: **${userId}**`,
      `Message Id: **${message.id}**`,
      "```\n" + name + "'s Message\nSubject: " + subject + "\n\n" + body + "```"

      ].join('\n')
      const embed = new Discord.RichEmbed()
        .addField(`**Messaged**`, messageString)
        .setTitle("**Bot Message**")
        .setDescription(`Message received from ${name}!`)
        .setColor(6605055)
        // .setImage('https://i.imgur.com/zwMrlQT.png')
        .setThumbnail('https://www.roblox.com/bust-thumbnail/image?userId='+ userId + '&width=420&height=420&format=png')
        .setAuthor("Galactic Games | water", 'https://i.imgur.com/kuAJC50.png')
        .setFooter("Provided by Galactic Games", 'https://i.imgur.com/kuAJC50.png')
        .setTimestamp()
        client.channels.get('434477311497076739').send({embed})
  });
  // Generate a cache of client permissions for pretty perms
  client.levelCache = {};
  for (let i = 0; i < client.config.permLevels.length; i++) {
    const thisLevel = client.config.permLevels[i];
    client.levelCache[thisLevel.name] = thisLevel.level;
  }

  // Here we login the client.
  client.login(process.env.BOT_TOKEN);

// End top-level async/await function
    
};

init();
//await client.collection.defer;
//console.log(client.collection.size + " keys were loaded")

