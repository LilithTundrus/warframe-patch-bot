'use strict';
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
const Discord = require('discord.io');                              // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
let scraper = require('./lib/scraper');
let dsTemplates = require('./lib/discord-templates');
const logger = new Logger;
let commonLib = require('./lib/common');
let controller = require('./lib/storageController');

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

        this.client.getServerChannelsByID = function (serverID) {
            let channelArray = [];
            let serverList = this.getServers();
            for (let server of serverList) {
                if (server.id == serverID) {
                    // check for the channel
                    Object.keys(server.channels).forEach(function (key) {
                        channelArray.push(server.channels[key]);
                    });
                }
            }
            return channelArray;
        }

        this.client.sendErrMessage = function ({ channelID, errorMessage }) {
            let errorTemplate = new dsTemplates.errorMessageEmbedTemplate({ description: errorMessage });
            this.sendMessage({
                to: channelID,
                message: '',
                embed: errorTemplate
            });
        }

        this.client.sendInfoMessage = function ({ channelID, infoMessage }) {
            let messageTemplate = new dsTemplates.baseEmbedTemplate({
                title: 'Info',
                description: infoMessage
            });
            this.sendMessage({
                to: channelID,
                message: '',
                embed: messageTemplate
            });
        }

        this.client.resolveServerIDByChannelID = function (channelID) {
            // Check what server a channel belongs to
            let serverList = this.getServers();
            let serverID = '';
            for (let server of serverList) {
                Object.keys(server.channels).forEach(function (key) {
                    if (server.channels[key].id == channelID) {
                        serverID = server.id;
                    }
                });
            }
            return serverID;
        }
    }
    // Methods
    initScheduler() {
        setInterval(this.checkForUpdates.bind(this), 1 * 60 * 1000);
        logger.info('Initialized Warframe update check scheduler');
    }

    checkForUpdates() {
        return scraper.retrieveUpdates()
            .then((responseObj) => {
                if (responseObj.changeBool) {
                    // Updates!!!
                    commonLib.updateForumPostCountJSON();
                    let serverQueue = controller.readServerFile();
                    // This is probably fine... could be unsafe in the future
                    serverQueue.forEach((entry, index) => {
                        // Add an icon here!
                        logger.info(`Notifying server with ID ${entry.serverID}`);
                        let updateEmbed = new dsTemplates.baseEmbedTemplate({ title: 'Warframe Update', description: `[Forum Post](${responseObj.postURL})\n\n${responseObj.formattedMessage.substring(0, 100)}...` });
                        this.client.sendMessage({
                            to: entry.registeredChannelID,
                            message: '',
                            embed: updateEmbed
                        });
                        return constructWarframeUpdateMessageQueue(entry.registeredChannelID, responseObj.formattedMessage, this);
                    })
                } else {
                    logger.info('No Updates...');
                }
            })
            .catch((err) => {
                // This should never happen
                logger.error(err);
            })
    }
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

function constructWarframeUpdateMessageQueue(channelIDArg, forumPostMarkdown, thisArg) {
    // If forum post size is under the max size, just send it
    if (forumPostMarkdown.length < 1999) {
        return thisArg.client.sendMessage({
            to: channelIDArg,
            message: forumPostMarkdown
        });
    } else {
        logger.debug('Message is over 2,000 characters, setting up paging process...');
        let chunkedMessage = commonLib.createTextChunksArrayByNewline(forumPostMarkdown);
        logger.info(`Starting recursive update message function at ${Date.now()}`)
        return createForumPostMessageTail(channelIDArg, 0, chunkedMessage, thisArg);
    }
}

// Recursive
function createForumPostMessageTail(channelIDArg, chunkIndexStart, chunkedMessageArr, thisArg) {
    let chunkingObj = commonLib.addChunksUntilLimit(chunkedMessageArr, chunkIndexStart);
    if (chunkingObj.lastCompletedChunkIndex <= chunkedMessageArr.length) {
        // Wait a small amount of time to avoid the messages sending out of order
        return wait(1.5)
            .then(() => {
                thisArg.client.simulateTyping(channelIDArg);
                thisArg.client.sendMessage({
                    to: channelIDArg,
                    message: chunkingObj.chunkString
                });
                return createForumPostMessageTail(channelIDArg, chunkingObj.lastCompletedChunkIndex, chunkedMessageArr, thisArg);
            })
            .catch((err) => {
                console.log(err)
            })
    } else {
        // End the loop, but still wait to make sure these send correctly
        logger.info(`Finished message recursion loop for channel: ${channelIDArg}`);
        return wait(1.5)
            .then(() => {
                thisArg.client.sendMessage({
                    to: channelIDArg,
                    message: chunkingObj.chunkString
                });
            })
            .catch((err) => {
                console.log(err)
            })
    }
}

module.exports = PatchBot;