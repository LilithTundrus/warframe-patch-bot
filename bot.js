'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
let scraper = require('./lib/scraper');
const logger = new Logger;
let commonLib = require('./lib/common');
let controller = require('./lib/storageController');
/* Parts of the bot that we need to get working:
- Discord bot sharding
- Server register system
- Server messaging system on a warframe update (we kind of have one)
- Double checks on forum data
- Server-unique command character support (! vs. ^/~/etc.)
- Registered server data integrity check
- Make messages an embed! (They're pretty)
- Channel permissions check
*/
let bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

logger.debug('Attempting to connect to Discord...');
bot.on('ready', function (evt) {                                    // do some logging and start ensure bot is running
    logger.info('Connected to Discord', `Logged in as: ${bot.username} ID: (${bot.id})`);
    bot.setPresence({                                               // make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Debug mode' }
    });
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
    if (message.substring(0, 1) == config.commandCharDefault) {                           // listen for messages that will start with `~`
        let args = message.substring(1).split(' ');
        let cmd = args[0];
        // log any messages sent to the bot for debugging
        logger.debug(`${user} sent: ${message} at ${Date.now()}`);
        args = args.splice(1);
        switch (cmd) {                                              // bot needs to know if it will execute a command
            // Eventually write up a helpfile
            case 'help':
                bot.sendMessage({
                    to: channelID,
                    message: 'PlaceHolder'
                });
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
                    bot.sendMessage({
                        to: channelID,
                        message: `Please give a channel name you want me to send messages to!\n\nExample: ^register announcements`
                    });
                } else {
                    return registrationHandler(userID, channelID, args[0]);
                }
            // be silent until we can confirm the user who sent the command is an admin
        }
    }
});

// When the bot 'joins' a server, this also happens on bot restart so that sucks
bot.on('guildCreate', function (server) {
    console.log(server)
    // Check if this server is in the registeredServers JSON. If not, add it
    if (controller.checkIfServerIsRegistered({ serverID: server.id }) == true) {
        // We don't need to do anything
        logger.debug(`Server ${server.id} is already registered`);
    } else {
        console.log(`Server ${server.id} is NOT registered`)
        bot.sendMessage({
            to: server.owner_id,
            message: `Hi! It seems that you or another admin on your server ${server.name} has added me.\n\nPlease use the register command (^register) to get started.`
        })
    }
});

// this is how we can attach function to the bot!
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

bot.initScheduler = function () {
    logger.info('Initialized Warframe update check scheduler');
    setInterval(checkForUpdates, 1 * 60 * 1000);
}

bot.initScheduler();

function checkForUpdates() {
    return scraper.retrieveUpdates()
        .then((responseObj) => {
            if (responseObj.changeBool == true) {
                // Updates!!!
                let serverList = bot.getServers();
                console.log(serverList);
                commonLib.updateForumPostCountJSON();
                let serverQueue = controller.readServerFile();
                // This is probably fine... could be unsafe in the future
                serverQueue.forEach((entry, index) => {
                    console.log(entry);
                    bot.sendMessage({
                        to: entry.registeredChannelID,
                        message: `Forum post link: ${responseObj.postURL}`
                    });
                    // This is where we need to message each server
                    return constructWarframeUpdateMessageQueue(entry.registeredChannelID, responseObj.formattedMessage);
                })
            } else {
                logger.debug('No Updates...');
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

function getChannelIDByName(channelArray, nameToMatch) {
    let channelID = '';
    channelArray.forEach((channelObj, index) => {
        if (channelObj.name == nameToMatch) {
            logger.debug('Found a channel match');
            channelID = channelObj.id
            return channelObj.id
        }
    });
    return channelID;
}

function registrationHandler(userID, channelIDArg, channelNameToRegister) {
    logger.debug(`Registration started by ${userID}`);
    let workingList = bot.getServers();
    let serversOwned = [];
    workingList.forEach((serverObj, index) => {
        if (serverObj.owner_id == userID) {
            serversOwned.push(serverObj);
        }
    });
    if (serversOwned.length < 1) {
        // send an error message
        bot.sendMessage({
            to: channelIDArg,
            message: `Sorry, it doesn't seem like you are the owner of any servers`
        })
    } else if (serversOwned.length > 1) {
        // Ask for which server they want to register
    } else {
        // Make sure they aren't alredy registered
        bot.sendMessage({
            to: channelIDArg,
            message: `It looks like you are the owner of 1 server. Attempting to register ${serversOwned[0].name} on channel ${channelNameToRegister}...`
        })
        let channelsToCheck = bot.getServerChannelsByID(serversOwned[0].id);
        // Check the channel's for a name match
        let channelIDToRegister = getChannelIDByName(channelsToCheck, channelNameToRegister);
        if (channelIDToRegister.length < 1) {
            logger.debug('Null channelIDToRegister value');
            bot.sendMessage({
                to: channelIDArg,
                message: `Looks like I couldn't find a channel titled ${channelNameToRegister}, make sure you use the lowercase (official) name of the channel.`
            });
        } else {
            // Check permissions on the channel
            console.log(channelIDToRegister);
            controller.registerServer({ serverID: serversOwned[0].id, registeredChannelID: channelIDToRegister, commandCharacter: '^', ownerID: serversOwned[0].owner_id, name: serversOwned[0].name });
            bot.sendMessage({
                to: channelIDArg,
                message: `Done! This channel should receive update text on the next Warframe update!`
            });
        }
    }
}