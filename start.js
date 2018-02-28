'use strict';
const fs = require('fs');
const spawn = require('child_process').spawn;

const bot = spawn('node', ['bot.js']);
bot.stdout.pipe(process.stdout);