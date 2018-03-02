'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../config/config.js');
let registeredServerFile = config.serverRegistryLocation;
// This is where we will be handling CRUD operations, for this type of project a DB _shouldn't_ be needed?

function readServerFile() {
    // read the registeredServers.json file and return contents
    // TODO: Make this async!
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
    fs.writeFileSync(registeredServerFile, JSON.stringify(workingArray, null, 2));
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
    fs.writeFileSync(registeredServerFile, JSON.stringify(workingArray, null, 2));
    // Debugging
    return console.log('Done!');
}

function updaterServerRegisteredChannel() {
    // Update a server's registered channel to send update messages to
}

function changeServerCommandChar({ channelID, newCharacter }) {
    // Find the server to update
    let workingArray = this.readServerFile();
    workingArray.forEach((entry, index) => {
        if (entry.registeredChannelID == channelID) {
            entry.commandCharacter = newCharacter;
        }
    })
    fs.writeFileSync(registeredServerFile, JSON.stringify(workingArray, null, 2));
}

function getServerDataByChannelID({ channelID }) {
    // Return a single server's data by the serverID
    let serverList = this.readServerFile();
    let returnData = {};
    for (let serverNode of serverList) {
        if (serverNode.registeredChannelID == channelID) {
            returnData = serverNode;
            break;
        }
    }
    return returnData;
}

function getServerDataByServerID({ serverID }) {
    // Return a single server's data by the serverID
    let serverList = this.readServerFile();
    let returnData = {};
    for (let serverNode of serverList) {
        if (serverNode.serverID == serverID) {
            returnData = serverNode;
            break;
        }
    }
    return returnData;
}

function checkIfServerIsRegistered({ serverID }) {
    // Read the current list and iterate until match
    let serverList = this.readServerFile();
    let returnBool = false;
    for (let serverNode of serverList) {
        if (serverNode.serverID == serverID) {
            returnBool = true;
            break;
        }
    }
    return returnBool;
}

function checkIfServerIsRegisteredByChannelID({ channelID }) {
    // Read the current list and iterate until match
    let serverList = this.readServerFile();
    let returnBool = false;
    for (let serverNode of serverList) {
        if (serverNode.registeredChannelID == channelID) {
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
module.exports.checkIfServerIsRegisteredByChannelID = checkIfServerIsRegisteredByChannelID;
module.exports.getServerDataByChannelID = getServerDataByChannelID;
module.exports.getServerDataByServerID = getServerDataByServerID;
module.exports.changeServerCommandChar = changeServerCommandChar;