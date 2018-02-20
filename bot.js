'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');
let scraper = require('./lib/scraper');
const logger = new Logger;
let commonLib = require('./lib/common');
let controller = require('./lib/storageController');
/* 
Parts of the bot that we need to get working:
- Multi-server support
- Discord bot sharding
- Server register system
- Server messaging system on a warframe update (we kind of have one)
- Double checks on forum data
- Server-unique command character support (! vs. ^/~/etc.)
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

// We'll eventually have to have this check from what server this message is from
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
            // Debugging command
            case 'test':
                return scraper.retrieveUpdates()
                    .then((responseObj) => {
                        console.log(responseObj);
                        if (responseObj.changeBool == true) {
                            bot.sendMessage({
                                to: channelID,
                                message: `Forum post link: ${responseObj.postURL}`
                            });
                            // This function will make the messages sent pretty AND in order
                            return constructWarframeUpdateMessageQueue(channelID, responseObj.formattedMessage);
                        } else {
                            logger.debug(responseObj.changeBool);
                        }
                    })
                break;
            case 'register':
                if (args[0] == undefined) {
                    bot.sendMessage({
                        to: channelID,
                        message: `Please give a channel name you want me to send messages to!\n\nExample: ^register announcements`
                    });
                } else {
                    return registrationHandler(userID, channelID, args[0])
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

bot.initScheduler = function () {
    logger.info('Initialized Warframe update check scheduler');
    setInterval(checkForUpdates, 30 * 1000);
}
bot.initScheduler();

function checkForUpdates() {
    return scraper.retrieveUpdates()
        .then((responseObj) => {
            if (responseObj.changeBool == true) {
                // Updates!!!
                // logger.debug(JSON.stringify(responseObj, null, 2));
                let serverList = bot.getServers();
                console.log(serverList);
                commonLib.updateForumPostCountJSON();
                let serverQueue = controller.readServerFile();
                serverQueue.forEach((entry, index) => {
                    console.log(entry);
                    bot.sendMessage({
                        to: entry.registeredChannelID,
                        message: `Forum post link: ${responseObj.postURL}`
                    });
                    // This is where we need to message each server
                    return constructWarframeUpdateMessageQueue(entry.registeredChannelID, responseObj.formattedMessage)
                })
            } else {
                logger.debug('No Updates...');
            }
            // Logical steps:
            // ON UPDATE, get list of servers and their designated 
            // channel for providing update announcements
            // If the bot cannot send the message due to permissions, PM an admin
            // Else, send the update to ALL servers and change the forum post string so
            // on next update check it's not double announced
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


function registrationHandler(userID, channelID, channelNameToRegister) {
    // Stay silent until we confirm the user is an admin for a server
    // If not, send a permission denied message
    logger.debug(`Registration started by ${userID}`);
    let workingList = bot.getServers();
    let serversOwned = [];
    workingList.forEach((serverObj, index) => {
        // Check for more than one server with their owner_id
        if (serverObj.owner_id == userID) {
            serversOwned.push(serverObj);
        }
    })
    console.log(serversOwned.length);
    if (serversOwned.length < 1) {
        // send an error message
    } else if (serversOwned.length > 1) {
        // Ask for which server they want to register
    } else {
        bot.sendMessage({
            to: channelID,
            message: `It looks like you are the owner of 1 server. Attempting to register ${serversOwned[0].name} on channel ${channelNameToRegister}...`
        }, function (err, response) {
            // we want to get the user to respond! 
            console.log(response)
        })
    }
    // Steps: check if user is an admin
    // IF ADMIN, check for MULTIPLE servers
    // IF MULTIPLE, ask the user for which
    // Else, ask them for which channel they want to have annouuncements made
    // Make sure the permissions are correct
    // add the data to the registeredServers.json file
}