'use strict';
// All non-bot related functions go here
let Logger = require('./loggerClass');
const logger = new Logger;

/**
 * Create an array of strings from a string, using a \n as seprator
 * @param {String} string 
 * @returns {Array<String>}
 */
function createTextChunksArrayByNewline(string) {
    return string.split('\n');
}

/**
 * Add chunks of a string until a limit is reached (1,000 + the last string)
 * @param {Array<string>} arrayOFChunkStrings 
 * @param {Number} startIndex 
 * @returns {Object}
 */
function addChunksUntilLimit(arrayOFChunkStrings, startIndex) {
    let returnObj = {};
    let chunkStr = '';
    for (const [index, chunk] of arrayOFChunkStrings.entries()) {
        if (index < startIndex) {
            // do nothing
        } else {
            if (chunkStr.length < 1000) {
                chunkStr += `${chunk}\n`;
            } else {
                returnObj.lastCompletedChunkIndex = index;
                break;
            }
        }
    }
    // Always make sure we return the string
    returnObj.chunkString = chunkStr;
    logger.debug(returnObj.chunkString.length);
    return returnObj;
}

module.exports.createTextChunksArrayByNewline = createTextChunksArrayByNewline;
module.exports.addChunksUntilLimit = addChunksUntilLimit;

