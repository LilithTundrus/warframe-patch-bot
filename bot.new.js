'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
const logger = new Logger;
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

// When the bot 'joins' a server, this also happens on bot restart so that sucks
patchBot.client.on('guildCreate', function (server) {
    logger.auth(`Joined server named ${server.name} with ${server.member_count} members`)
    // Check if this server is in the registeredServers JSON. If not, send a message
    if (controller.checkIfServerIsRegistered({ serverID: server.id })) {
        // We don't need to do anything
        logger.info(`Server ${server.name} is already registered`);
    } else {
        logger.warn(`Server ${server.name} is NOT registered`);
        // Display the intro message here (THIS NEEDS TO BE UPDATED)
        let embed = new patchBot.templates.baseEmbedTemplate({ title: 'Welcome', description: `Hello! It seems that you or another admin on your server '**${server.name}**' has added me.\n\nPlease use the **^register** command to receive updates for Warframe when they are posted` });
        patchBot.client.sendMessage({
            to: server.owner_id,
            message: '',
            embed: embed,
        });
    }
});

patchBot.client.on('guildDelete', function (server) {
    logger.auth(`Left server with ID ${server.id} (${server.name})`);
    controller.unregisterServer({ serverID: server.id });
})

patchBot.client.on('message', function (user, userID, channelID, message, evt) {
    // check for channel ID in list of servers
    let serverFromChannelID = this.resolveServerIDByChannelID(channelID);
    if (controller.checkIfServerIsRegistered({ serverID: serverFromChannelID })) {
        // get the channel's hot-symbol
        let serverData = controller.getServerDataByServerID({ serverID: serverFromChannelID });
        if (message.substring(0, 1) == serverData.commandCharacter) {
            logger.debug(`Message contains the correct symbol, responding`);
            return patchBot.main(user, userID, channelID, message, evt);
        }
    }
    // server is not registered, use default symbol
    else if (message.substring(0, 1) == config.commandCharDefault && controller.checkIfServerIsRegisteredByChannelID({ channelID }) == false) {
        return patchBot.main(user, userID, channelID, message, evt);
    }
});
