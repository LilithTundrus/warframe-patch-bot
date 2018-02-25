'use strict';
const fs = require('fs');
const path = require('path');

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

// Compare the current JSON file to a backup from last run
function validateListIntegrity() {

    // Get the old backup array length

    // Get the registeredServers master JSON and compare additions/subtractions
}


/**
 * Explores recursively a directory and returns all the filepaths and folderpaths in the callback.
 *  (Ew this is a callback)
 * @see http://stackoverflow.com/a/5827895/4241030
 * @param {String} dir 
 * @param {Function} done 
 */
function filewalker(dir, done) {
    let results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                // If directory, execute a recursive call
                if (stat && stat.isDirectory()) {
                    // Add directory to array [comment if you need to remove the directories from the array]
                    results.push(file);
                    filewalker(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

module.exports.readServerFile = readServerFile;
module.exports.checkIfServerIsRegistered = checkIfServerIsRegistered;
module.exports.registerServer = registerServer;
module.exports.unregisterServer = unregisterServer;