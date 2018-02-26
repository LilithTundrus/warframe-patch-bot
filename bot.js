'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
let scraper = require('./lib/scraper');
let dsTemplates = require('./lib/discord-templates');
const logger = new Logger;
let commonLib = require('./lib/common');
let controller = require('./lib/storageController');
/* Parts of the bot that we need to get working:
- Server-unique command character support (! vs. ^/~/etc.)
- A way for the on 'message' event to get the server's custom command character
*/
let bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

bot.initScheduler = function () {
    setInterval(checkForUpdates, 5 * 60 * 1000);
    logger.info('Initialized Warframe update check scheduler');
}

logger.debug('Attempting to connect to Discord...');
bot.on('ready', function (evt) {                                    // do some logging and start ensure bot is running
    logger.info('Connected to Discord', `Logged in as: ${bot.username} ID: (${bot.id})`);
    bot.setPresence({                                               // make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Debug mode' }
    });
    bot.initScheduler();
});

bot.on('disconnect', function (evt) {
    logger.warn(`Bot DISCONNECTED at ${new Date().toTimeString()}`);
    logger.debug('Attempting reconnect...');
    bot.connect();
    if (bot.connected == true) {
        logger.info('Reconnected to Discord!');
    } else {
        logger.error(new Error('Reconnect failed'));
    }
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // check for channel ID in list of servers
    if (controller.checkIfServerIsRegisteredByChannelID({ channelID })) {
        console.log('beh');
        return main(user, userID, channelID, message, evt);
    }
    else if (message.substring(0, 1) == config.commandCharDefault) {                           // listen for messages that will start with `~`
        return main(user, userID, channelID, message, evt);
    }
});

// When the bot 'joins' a server, this also happens on bot restart so that sucks
bot.on('guildCreate', function (server) {
    logger.auth(`Joined server named ${server.name} with ${server.member_count} members`)
    // Check if this server is in the registeredServers JSON. If not, send a message
    if (controller.checkIfServerIsRegistered({ serverID: server.id })) {
        // We don't need to do anything
        logger.info(`Server ${server.name} is already registered`);
    } else {
        logger.warn(`Server ${server.name} is NOT registered`);
        // Display the intro message here (THIS NEEDS TO BE UPDATED)
        let embed = new dsTemplates.baseEmbedTemplate({ title: 'Welcome', description: `Hello! It seems that you or another admin on your server '**${server.name}**' has added me.\n\nPlease use the **^register** command to receive updates for Warframe when they are posted` });
        bot.sendMessage({
            to: server.owner_id,
            message: '',
            embed: embed,
        });
    }
});

bot.on('guildDelete', function (server) {
    logger.auth(`Left server with ID ${server.id} (${server.name})`);
    controller.unregisterServer({ serverID: server.id });
})

bot.getServers = function () {
    let serversArray = [];
    Object.keys(this.servers).forEach(function (key) {
        return serversArray.push(bot.servers[key]);
    })
    return serversArray;
}

bot.getServerChannelsByID = function (serverID) {
    let channelArray = [];
    let serverList = this.getServers();
    for (let server of serverList) {
        if (server.id == serverID) {
            // check for the channel
            Object.keys(server.channels).forEach(function (key) {
                channelArray.push(server.channels[key]);
            })
        }
    }
    return channelArray;
}

bot.sendErrMessage = function ({ channelID, errorMessage }) {
    let errorTemplate = new dsTemplates.errorMessageEmbedTemplate({
        description: errorMessage
    })
    this.sendMessage({
        to: channelID,
        message: '',
        embed: errorTemplate
    });
}

bot.sendInfoMessage = function ({ channelID, infoMessage }) {
    let messageTemplate = new dsTemplates.baseEmbedTemplate({
        title: 'Info',
        description: infoMessage
    })
    this.sendMessage({
        to: channelID,
        message: '',
        embed: messageTemplate
    });
}

function main(user, userID, channelID, message, evt) {
    let args = message.substring(1).split(' ');
    let cmd = args[0];
    // log any messages sent to the bot for debugging
    logger.debug(`${user} sent: ${message} at ${Date.now()}`);
    args = args.splice(1);
    switch (cmd) {                                              // bot needs to know if it will execute a command
        case 'help':
            return helpHandler(channelID);
            break;
        // Eventually format this to be pretty and show a LOT more stats
        // about the bot and what it's for
        case 'ver':
            bot.sendMessage({
                to: channelID,
                message: `Version: ${ver} Running on server: ${os.type()} ${os.hostname()} ${os.platform()} ${os.cpus()[0].model}`
            });
            break;
        case 'register':
            if (args[0] == undefined) {
                bot.sendErrMessage({
                    channelID: channelID,
                    errorMessage: `Please give a channel name you want me to send messages to!\n\nExample: **^register announcements**`,
                });
            } else {
                return registrationHandler(userID, channelID, args[0], args[1]);
            }
            break;
        case 'changeSymbol':
            if (args[0] == undefined || args[0].length > 1) {
                bot.sendErrMessage({
                    channelID: channelID,
                    errorMessage: `Please give a single character to change.`,
                });
            } else if (args[0].match(/^[a-z0-9]+$/i)) {
                bot.sendErrMessage({
                    channelID: channelID,
                    errorMessage: `You must us a character that is not a number or letter.`,
                });
            } else {
                return changeSymbolHandler(channelID, args[0]);
            }
            break;
    }
}

function checkForUpdates() {
    return scraper.retrieveUpdates()
        .then((responseObj) => {
            if (responseObj.changeBool == true) {
                // Updates!!!
                let serverList = bot.getServers();
                commonLib.updateForumPostCountJSON();
                let serverQueue = controller.readServerFile();
                // This is probably fine... could be unsafe in the future
                serverQueue.forEach((entry, index) => {
                    // Add an icon here!
                    logger.info(`Notifying server with ID ${entry.serverID}`);
                    let updateEmbed = new dsTemplates.baseEmbedTemplate({ title: 'Warframe Update', description: `[Forum Post](${responseObj.postURL})\n\n${responseObj.formattedMessage.substring(0, 100)}...` });
                    bot.sendMessage({
                        to: entry.registeredChannelID,
                        message: '',
                        embed: updateEmbed
                    });
                    return constructWarframeUpdateMessageQueue(entry.registeredChannelID, responseObj.formattedMessage);
                })
            } else {
                logger.info('No Updates...');
            }
        })
        .catch((err) => {
            // This should never happen
            logger.error(err);
        })
}

/**
 * @param {number} timeArg time (in seconds) to wait, holding the main call stack
 * @returns {promise}
 */
function wait(timeArg) {
    return new Promise((resolve) => {
        setTimeout(function () {
            resolve('Promise resolved!!');
        }, timeArg * 1000);
    });
}

// Specifically handle forum posts and make the messages look pretty if over 2000 characters
function constructWarframeUpdateMessageQueue(channelIDArg, forumPostMarkdown) {
    // If forum post size is under the max size, just send it
    if (forumPostMarkdown.length < 1999) {
        return bot.sendMessage({
            to: channelIDArg,
            message: forumPostMarkdown
        });
    } else {
        logger.debug('Message is over 2,000 characters, setting up paging process...');
        let chunkedMessage = commonLib.createTextChunksArrayByNewline(forumPostMarkdown);
        logger.info(`Starting recursive update message function at ${Date.now()}`)
        return createForumPostMessageTail(channelIDArg, 0, chunkedMessage);
    }
}

// Recursive
function createForumPostMessageTail(channelIDArg, chunkIndexStart, chunkedMessageArr) {
    let chunkingObj = commonLib.addChunksUntilLimit(chunkedMessageArr, chunkIndexStart);
    if (chunkingObj.lastCompletedChunkIndex <= chunkedMessageArr.length) {
        // Wait a small amount of time to avoid the messages sending out of order
        return wait(1.5).then(() => {
            bot.simulateTyping(channelIDArg);
            bot.sendMessage({
                to: channelIDArg,
                message: chunkingObj.chunkString
            });
            return createForumPostMessageTail(channelIDArg, chunkingObj.lastCompletedChunkIndex, chunkedMessageArr);
        })
    } else {
        // End the loop, but still wait to make sure these send correctly
        logger.info(`Finished message recursion loop for channel: ${channelIDArg}`);
        return wait(1.5).then(() => {
            bot.sendMessage({
                to: channelIDArg,
                message: chunkingObj.chunkString
            });
        })
    }
}

// This is getting to be too long
function registrationHandler(userID, channelIDArg, channelNameToRegister, serverNameOptional) {
    logger.auth(`Registration started by ${userID}`);
    let workingList = bot.getServers();
    let serversOwned = [];
    workingList.forEach((serverObj, index) => {
        if (serverObj.owner_id == userID) {
            serversOwned.push(serverObj);
        }
    });
    if (serversOwned.length < 1) {
        return bot.sendErrMessage({
            channelID: channelIDArg,
            errorMessage: `Sorry, it doesn't seem like you are the owner of any servers`
        });
    } else if (serversOwned.length > 1) {
        // Ask for which server they want to register
        if (serverNameOptional == null) {
            logger.warn(`Multi-server user with ID ${userID} tried to register without giving a server name`);
            return bot.sendErrMessage({
                channelID: channelIDArg,
                errorMessage: `Since you own multple servers. Please run this command again with a server argument: **^register channel_name server_name**`
            });
        } else {
            // get the server index by matching the passed name
            let serverObjMatched = commonLib.matchServerByName(serversOwned, serverNameOptional);
            if (Object.keys(serverObjMatched).length === 0 && serverObjMatched.constructor === Object) {
                bot.sendErrMessage({
                    channelID: channelIDArg,
                    errorMessage: `Sorry, I can't seem to find a server you own named **${serverNameOptional}**. Make sure your spelling is correct and the server contains no special characters`
                });
            } else {
                if (serverIsRegisteredHandler(serverObjMatched.id, serverObjMatched.name, channelIDArg)) {
                    return;
                } else {
                    //  check for the channel
                    let channelsToCheck = bot.getServerChannelsByID(serverObjMatched.id);
                    let channelIDToRegister = commonLib.getChannelIDByName(channelsToCheck, channelNameToRegister);
                    if (channelIDToRegister.length < 1) {
                        logger.debug('Null channelIDToRegister value');
                        return wait(1)
                            .then(() => {
                                bot.sendErrMessage({
                                    channelID: channelIDArg,
                                    errorMessage: `Looks like I couldn't find a channel titled **${channelNameToRegister}**, make sure you use the lowercase (official) name of the channel.`
                                });
                            })
                    } else {
                        registerServer(serverObjMatched.id, channelIDToRegister, '^', serverObjMatched.owner_id, serverObjMatched.name, channelIDArg)
                    }
                }
            }
        }
    } else {
        if (serverIsRegisteredHandler(serversOwned[0].id, serversOwned[0].name, channelIDArg)) {
            return;
        } else {
            bot.sendInfoMessage({
                channelID: channelIDArg,
                infoMessage: `It looks like you are the owner of 1 server. Attempting to register **${serversOwned[0].name}** on channel **${channelNameToRegister}**...`
            });
            let channelsToCheck = bot.getServerChannelsByID(serversOwned[0].id);
            // Check the channel's for a name match
            let channelIDToRegister = commonLib.getChannelIDByName(channelsToCheck, channelNameToRegister);
            if (channelIDToRegister.length < 1) {
                logger.debug('Null channelIDToRegister value');
                return wait(1)
                    .then(() => {
                        bot.sendErrMessage({
                            channelID: channelIDArg,
                            errorMessage: `Looks like I couldn't find a channel titled **${channelNameToRegister}**, make sure you use the lowercase (official) name of the channel.`
                        });
                    })
            } else {
                registerServer(serversOwned[0].id, channelIDToRegister, '^', serversOwned[0].owner_id, serversOwned[0].name, channelIDArg);
            }
        }
    }
}

function registerServer(serverID, channelIDToRegister, commandCharacter, ownerID, serverName, channelIDArg) {
    logger.auth(`Attempting to register ${serverName} on channel ${channelIDToRegister}`);
    // This should just send the intro/help message
    // Check permissions on the channel
    bot.sendInfoMessage({
        channelID: channelIDToRegister,
        infoMessage: `This is a permissions test to ensure I have access to this channel.\n\nIf you'd like to know more, use the ^help command`
    }, function (err, response) {
        if (err) {
            logger.error(err);
            return bot.sendErrMessage({
                channelID: channelIDArg,
                errorMessage: `Permissions message check failed to send, make sure you've set permissions correctly on the channel`
            });
        } else {
            controller.registerServer({ serverID: serverID, registeredChannelID: channelIDToRegister, commandCharacter: commandCharacter, ownerID: ownerID, name: serverName });
            return wait(1)
                .then(() => {
                    bot.sendInfoMessage({
                        channelID: channelIDArg,
                        infoMessage: `Done! This channel should receive update text on the next Warframe update! \n\nBy default the character to call the bot is **^**`
                    });
                })
                .catch((err) => {
                    logger.error(err);
                })
        }
    })

}

function serverIsRegisteredHandler(serverID, serverName, channelIDArg) {
    // Make sure the server is not alredy registered
    if (controller.checkIfServerIsRegistered({ serverID: serverID })) {
        bot.sendErrMessage({
            channelID: channelIDArg,
            errorMessage: `It looks like the server you contain ownership of is already registered: **${serverName}**`
        });
        return true;
    } else {
        logger.debug(`Server ${serverName} is NOT registered`);
        return false;
    }
}

function helpHandler(channelIDArg) {
    // Construct the help message from file
    let helpMsg = fs.readFileSync('./helpNotes.txt');
    let helpEmbed = new dsTemplates.baseEmbedTemplate({ title: 'Help & Info' });
    helpEmbed.author = {
        name: `Waframe Patch bot v${ver}`,
        icon_url: 'http://store-images.s-microsoft.com/image/apps.6898.13510798882949700.e37ba52d-3f01-4d8a-b1c2-16eaeb35dd26.673a8aef-410d-4801-b7e4-fd61a5522abd'
    };
    helpEmbed.description = `**Available commands:** \n\n${helpMsg.toString()}`;
    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: helpEmbed
    });
}

function changeSymbolHandler(channelIDArg, symbolToUpdate) {
    // Check user permissions on the server, they must be the owner

    controller.changeServerCommandChar({ channelID: channelIDArg, newCharacter: symbolToUpdate })
}