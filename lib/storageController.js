'use strict';

// This is where we will be handling CRUD operations
// for this type of project a DB _shouldn't_ be needed?

function readServerFile() {
    // read the registeredServers.json file
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