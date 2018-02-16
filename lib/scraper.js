'use strict';
//  This is where the puppeterr scraper will go!
const puppeteer = require('puppeteer');
let Logger = require('./loggerClass');
let logger = new Logger;
const currentForumPostCountStr = '747 topics in this forum'

let getForumPostCount = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    logger.debug('Getting forum page...');
    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');

    const result = await page.evaluate(() => {
        let topicString = document.getElementsByClassName('ipsType_sectionTitle ipsType_medium ipsType_reset ipsClear')[0].innerHTML;
        return topicString;
    })
    browser.close();
    return result; // Return the data
};

//  Check if there's an update to the forums
let evaluatePostCount = async () => {
    let statusBool = await getForumPostCount()
        .then((postCountStr) => {
            logger.debug(postCountStr);
            if (postCountStr == currentForumPostCountStr) {
                logger.debug('Forum post count matches currently stored count');
                return false;
            } else {
                logger.debug('Forum post count DOES NOT matches currently stored count');
                return true;
            }
        });
    return statusBool;
}


function retrieveUpdates() {
    logger.debug(`Update check started at ${new Date().toTimeString()}...`);
    // get the first forum link, follow it and get the post's contents
    return evaluatePostCount()
        .then((changeBool) => {
            logger.debug(changeBool)
            if (changeBool == true) {
                // crawl for the update post
                console.log('Update found! Crawling page for text...');
                return('updates!!!!')
            } else {
                // do nothing but log
                logger.info(`Check completed at ${new Date().toTimeString()}`);
                // Placeholder
                return ('No updates')
            }
        })
}

// We want our bot to have a !subscribe command for dealing with
// checking for updates!
module.exports.getForumPostCount = getForumPostCount;
module.exports.retrieveUpdates = retrieveUpdates;