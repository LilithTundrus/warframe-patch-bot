'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                              // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');
let scraper = require('./lib/scraper');
const logger = new Logger;
let commonLib = require('./lib/common');
/* 
Parts of the bot that we need to get working:
- At first, handle one server (for testing)
- Create a scheduler to preiodically check the warframe forum's update section
- If the header with the number of posts increases, follow the page
- Get the text of the post
- if < 2000 characters, paginate and or show a link!
- Send the message to all registered servers
- Create a remote restart ability
*/
let bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

logger.debug('Attempting to connect to Discord...');
bot.on('ready', function (evt) {                                    // do some logging and start ensure bot is running
    logger.info('Connected to Discord');
    logger.info(`Logged in as: ${bot.username} ID: (${bot.id})`);
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
            // Debugging command
            case 'servers':
                bot.sendMessage({
                    to: channelID,
                    message: 'AAAAA'
                });
                bot.getServers();
                break;
        }
    }
});

// this is how we can attach function to the bot!
bot.getServers = function () {
    console.log(this.servers);
}

bot.initScheduler = function () {
    logger.info('Initialized Warframe update check scheduler');
    setInterval(checkForUpdates, 30 * 1000);
}

bot.initScheduler();

function checkForUpdates() {
    // We're going to want to have this function below
    // return an object with an update? boolean
    return scraper.retrieveUpdates()
        .then((responseObj) => {
            if (responseObj.changeBool == true) {
                // Updates!!!
                logger.debug(JSON.stringify(responseObj, null, 2));
                commonLib.updateForumPostCountJSON()
            } else {
                logger.debug('No Updates...');
            }
            // Logical steps:
            // IF UPDATE, GO THROUGH THE MESSAGING PROCESS
            // ELSE, DO NOTHING
            // ON UPDATE, get list of servers and their designated 
            // channel for providing update announcements
            // If the bot cannot send the message due to permissions, PM an admin
            // Else, send the update to ALL servers and change the forum post string so
            // on next update check it's not double announced
        })
        .catch((err) => {
            logger.error(err);
        })
    logger.debug(Date.now())

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
        // Or else we have to get fancy
    } else {
        logger.debug('Message is over 2,000 characters, setting up paging process...');
        let chunkedMessage = commonLib.createTextChunksArrayByNewline(forumPostMarkdown);
        // Shove as many 'chunks' as we can until the message length is again too long
        return createForumPostMessageTail(channelIDArg, 0, chunkedMessage);
    }
}

// Recursive
function createForumPostMessageTail(channelIDArg, chunkIndexStart, chunkedMessageArr) {
    let chunkingObj = commonLib.addChunksUntilLimit(chunkedMessageArr, chunkIndexStart);
    if (chunkingObj.lastCompletedChunkIndex <= chunkedMessageArr.length) {
        logger.debug('Message did not finish!');
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
        logger.info('Finished message recursion loop');
        return wait(1.5).then(() => {
            bot.sendMessage({
                to: channelIDArg,
                message: chunkingObj.chunkString
            });
        })
    }
}

