'use strict';
let fs = require('fs');
const config = require('../config/config.js');
let registeredServerFile = config.serverRegistryLocation;
// This is where we will be handling CRUD operations, for this type of project a DB _shouldn't_ be needed?

function readServerFile() {
    // read the registeredServers.json file and return get contents
    return JSON.parse(fs.readFileSync(registeredServerFile, 'UTF-8'));
}

function registerServer({ serverID, registeredChannelID, commandCharacter = '^', ownerID, name }) {
    // Construct the object to append to the JSON file
    let serverObjtoAppend = {};
    serverObjtoAppend.serverID = serverID;
    serverObjtoAppend.registeredChannelID = registeredChannelID;
    serverObjtoAppend.commandCharacter = commandCharacter;
    serverObjtoAppend.ownerID = ownerID;
    serverObjtoAppend.name = name;
    let workingArray = this.readServerFile();
    workingArray.push(serverObjtoAppend);
    fs.writeFile(registeredServerFile, JSON.stringify(workingArray, null, 2));
}

function unregisterServer({ serverID }) {
    // Remove a server from the JSON file
    let workingArray = this.readServerFile();
    workingArray.forEach((entry, index) => {
        if (entry.serverID == serverID) {
            workingArray.splice(index, 1);
        }
    })
    // Write the new Array set to file
    fs.writeFile(registeredServerFile, JSON.stringify(workingArray, null, 2));
    // Debugging
    return console.log('Done!');
}

function updaterServerRegisteredChannel() {
    // Update a server's registered channel to send update messages to
}

function getServerDataByServerID({ serverID }) {
    // Return a single server's data by the serverID
}

function checkIfServerIsRegistered({ serverID }) {
    // Read the current list and iterate until match
    let serverList = JSON.parse(fs.readFileSync(registeredServerFile, 'UTF-8'));
    let returnBool = false;
    for (let serverNode of serverList) {
        if (serverNode.serverID == serverID) {
            returnBool = true;
            break;
        }
    }
    return returnBool;
}

module.exports.readServerFile = readServerFile;
module.exports.checkIfServerIsRegistered = checkIfServerIsRegistered;
module.exports.registerServer = registerServer;
module.exports.unregisterServer = unregisterServer;