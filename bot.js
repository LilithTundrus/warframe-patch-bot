'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                              // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');                                             // used to read helpNotes.txt
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');
let logger = new Logger;


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
