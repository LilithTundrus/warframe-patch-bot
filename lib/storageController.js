'use strict';
let fs = require('fs');
const config = require('../config/config.js');
let registeredServerFile = config.serverRegistryLocation;
// This is where we will be handling CRUD operations
// for this type of project a DB _shouldn't_ be needed?

function readServerFile() {
    // read the registeredServers.json file and return get contents
    return JSON.parse(fs.readFileSync(registeredServerFile, 'UTF-8'));
}

function registerServer({ serverID, registeredChannelID, commandCharacter = '^' }) {
    // Add a server to the JSON file
}

function unregisterServer() {
    // Remove a server from the JSON file
}

function updaterServerRegisteredChannel() {
    // Update a server's registered channel to send update messages to
}

function getServerDataByServerID({ serverID }) {
    // Return a single server's data by the serverID
}

module.exports.readServerFile = readServerFile;