'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                              // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');                                             // used to read helpNotes.txt
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');
let scraper = require('./lib/scraper');
let logger = new Logger;
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
            case 'scrape':
                return scraper.getForumPostCount()
                    .then((postCountStr) => {
                        bot.sendMessage({
                            to: channelID,
                            message: postCountStr
                        });
                    })
                break;
            // Debugging command
            case 'test':
                return scraper.retrieveUpdates()
                    .then((forumPostMarkdownFull) => {
                        // This function will make the messages sent pretty AND in order
                        return constructWarframeUpdateMessageQueue(channelID, forumPostMarkdownFull);
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

// Put the scheduler here!
/* 
Scheduler should preiodically check the Warframe forums
for a change in count to the number of posts since there's only update
post and nothing else in this section...

The checker will be on a setInterval function and will take these steps:
1. Get the warframe count string
2. Compare it to the current count string
3. If not match, get the data of the new patch
4. Format the data and return it as a whole string
5. The bot will then gather the list of servers it is in
   and post to the 'announcements' channel (or somehwere else for now)
6. The message will be sent out in 1,000 character chunks
7. Update the new forum post count 
*/

// Pulled from another bot I amde
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

// Split messages to 1000 character chunks and send them one by one to ensure they remain 
// in the same order
/**
 * @param {number} channelIDArg 
 * @param {string} stringToPage 
 * @returns {promise}
 */
function paginateDiscordMessage(channelIDArg, stringToPage) {
    let chunks = [];
    for (let i = 0, charsLength = stringToPage.length; i < charsLength; i += 1000) {
        chunks.push(stringToPage.toString().substring(i, i + 1000));
        bot.simulateTyping(channelIDArg, function (errorA, responseA) {
        });
    }
    let promiseTail = Promise.resolve()
    chunks.forEach((entry, index) => {
        bot.simulateTyping(channelIDArg, function (errorA, responseA) {
        });
        promiseTail = promiseTail.then(() => {
            bot.sendMessage({
                to: channelIDArg,
                message: chunks[index]
            });
            // We need to wait since Discord like to send messages out of order
            return wait(1.5);
        })
    })
    return promiseTail;
}

function constructWarframeUpdateMessageQueue(channelIDArg, forumPostMarkdown) {
    // Specifically handle forum posts and make the messages look pretty if over 2000 characters
    logger.debug(JSON.stringify(forumPostMarkdown))
    // If forum post size is under the max size, just send it
    if (forumPostMarkdown.length < 1999) {
        return bot.sendMessage({
            to: channelIDArg,
            message: forumPostMarkdown
        })
        // Dammit we have to do this ALGORITHIMICALLY
    } else {
        // the main annoyance is trying to keep the formatting correct
        logger.debug('Message is over 2,000 characters, setting up paging process...');
        let messageTail = Promise.resolve();
        // Split the string into an array by the \n breaks
        let chunkedMessage = createTextChunksArrayByNewline(forumPostMarkdown);
        // Shove as many 'chunks' as we can until the message length is again too long
        // let chunkingObj = addMessageChunksUntilLimit(chunkedMessage, 2);
        // this needs to be recursive aaa!
        return createForumPostMessageTail(channelIDArg, 0, chunkedMessage)
    }
}

function createTextChunksArrayByNewline(string) {
    let returnArr = string.split('\n');
    console.log(returnArr);
    return returnArr;
}

// Chunk Discord messages while keeping their newlines (I hope, fuck)
function addMessageChunksUntilLimit(arrayOfMessageChunks, startIndex) {
    let returnObj = {};
    let chunkStr = '';
    for (const [index, chunk] of arrayOfMessageChunks.entries()) {
        if (index < startIndex) {
            logger.debug('Skipping this index!')
        } else {
            console.log(`${chunk}`)
            if (chunkStr.length < 1000) {
                chunkStr += `${chunk}\n`;
            } else {
                returnObj.lastCompletedChunkIndex = index;
                returnObj.chunkString = chunkStr;
                break;
            }
        }
    }
    logger.debug(chunkStr.length)
    return returnObj;
}

//  R E C U R S I V E
function createForumPostMessageTail(channelIDArg, chunkIndexStart, chunkedMessageArr) {
    let chunkingObj = addMessageChunksUntilLimit(chunkedMessageArr, chunkIndexStart);
    bot.sendMessage({
        to: channelIDArg,
        message: chunkingObj.chunkString
    })
    if (chunkingObj.lastCompletedChunkIndex < chunkedMessageArr.length - 1) {
        logger.debug('Message did not finish!');
        wait(1).then(() => {
            return createForumPostMessageTail(channelIDArg, chunkingObj.lastCompletedChunkIndex, chunkedMessageArr)
        })
        // Call this function again with a new start index
    }
}

