'use strict';                                                       // more stringent error reporting for small things
const config = require('./config.js');                              // conifg/auth data
const ver = config.botVersion;
var Discord = require('discord.io');                                // discord API wrapper
var fs = require('fs');                                             // used to read helpNotes.txt
var os = require('os');                                             // os info lib built into node

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

console.log('Attempting to connect to Discord')
bot.on('ready', function (evt) {                                    // do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    bot.setPresence({                                               // make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Debug mode' }
    });
});
