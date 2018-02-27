'use strict';                                                       // more stringent error reporting for small things
const config = require('./config/config.js');                       // conifg/auth data
const ver = config.botVersion;
let Discord = require('discord.io');                                // discord API wrapper
let fs = require('fs');
let os = require('os');                                             // os info lib built into node
let Logger = require('./lib/loggerClass');                          // Custom (basic) logger solution
let scraper = require('./lib/scraper');
let dsTemplates = require('./lib/discord-templates');
const logger = new Logger;
let commonLib = require('./lib/common');
let PatchBot = require('./patchBotClass');
let controller = require('./lib/storageController');

let patchBot = new PatchBot(config.token);

