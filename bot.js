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

*/
let bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

logger.debug('Attempting to connect to Discord');
bot.on('ready', function (evt) {                                    // do some logging and start ensure bot is running
    logger.info('Connected to Discord...');
    logger.info(`Logged in as: ${bot.username} - (${bot.id})`);
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
        logger.error('Reconnect failed...');
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
                    .then((test) => {
                        // this isn't intelligently parsing!
                        if (test.length > 1999) {
                            return paginateDiscordMessage(channelID, test)
                        } else {
                            bot.sendMessage({
                                to: channelID,
                                message: test
                            });
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