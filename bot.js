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
    logger.warn(`Bot DISCONNECTED at ${new Date().toISOString()}`);
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
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        // log any messages sent to the bot for debugging
        logger.debug(`${user} sent: ${message} at ${Date.now()}`);
        args = args.splice(1);
        switch (cmd) {                                              // bot needs to know if it will execute a command
            case 'help':                                            // display the help file
                bot.sendMessage({
                    to: channelID,
                    message: 'PlaceHolder'
                });
                break;
            // Eventually format this to be pretty and show a LOT more stats
            case 'ver':
                bot.sendMessage({
                    to: channelID,
                    message: `Version: ${ver} Running on server: ${os.type()} ${os.hostname()} ${os.platform()} ${os.cpus()[0].model}`
                });
                break;
            case 'scrape':
                return scraper.getForumPostCount()
                    .then((postCountStr) => {
                        bot.sendMessage({
                            to: channelID,
                            message: postCountStr
                        });
                    })
                break;
            case 'test':
                return scraper.retrieveUpdates()
                    .then((test) => {
                        bot.sendMessage({
                            to: channelID,
                            message: test
                        });
                    })
                break;
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
    console.log(bot.servers)
}


// Put the scheduler here!
