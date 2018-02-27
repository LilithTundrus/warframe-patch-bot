'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
let scraper = require('./lib/scraper');
let dsTemplates = require('./lib/discord-templates');
const logger = new Logger;
let commonLib = require('./lib/common');
let PatchBot = require('./patchBotClass');
let controller = require('./lib/storageController');
// Create a new bot, using defualt options
let patchBot = new PatchBot(config.token);


logger.debug('Attempting to connect to Discord...');
patchBot.client.on('ready', function (evt) {                        // do some logging and start ensure bot is running
    logger.info('Connected to Discord', `Logged in as: ${patchBot.client.username} ID: (${patchBot.client.id})`);
    patchBot.client.setPresence({                                   // make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Debug mode' }
    });
    patchBot.initScheduler();
});

patchBot.client.on('disconnect', function (evt) {
    logger.warn(`Client DISCONNECTED at ${new Date().toTimeString()}`);
    logger.debug('Attempting reconnect...');
    patchBot.client.connect();
    if (patchBot.client.connected) {
        logger.info('Reconnected to Discord!');
    } else {
        logger.error(new Error('Reconnect failed'));
    }
});
