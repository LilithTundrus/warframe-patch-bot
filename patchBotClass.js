'use strict';
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
const dsTemplates = require('./lib/discord-templates');             // Set of Discord embed tempaltes
const Discord = require('discord.io');                              // discord API wrapper

/**
 * Patch bot and all internally requiured function
 * 
 * @class PatchBot
 */
class PatchBot {
    /**
     * Creates an instance of PatchBot.
     * @param {String} discordToken 
     * @param {Object} [options]
     * @param {Number} [options.shardID]
     * @param {Boolean} [options.autorun]
     * @memberof PatchBot
     */
    constructor(discordToken, {
        shardID = 0,
        autorun = true,
    } = {}) {
        this.templates = dsTemplates;

        this.client = new Discord.Client({                                      // Initialize Discord Bot with token
            token: discordToken,
            autorun: autorun,
            shard: shardID
        });

        this.client.getServers = function () {
            let serversArray = [];
            let servers = this.servers
            Object.keys(this.servers).forEach(function (key) {
                return serversArray.push(servers[key]);
            });
            return serversArray;
        }
    }
    // Methods
    initScheduler() {
        console.log('aaaa')
    }

}





module.exports = PatchBot;