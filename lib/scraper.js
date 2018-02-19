'use strict';
//  Puppeteer is actually getting the data
const puppeteer = require('puppeteer');
// Our custom logger class
let Logger = require('./loggerClass');
let logger = new Logger;
// turndown will take HTML and turn it into markdown
var TurndownService = require('turndown');
var turndownService = new TurndownService();
let fs = require('fs');

let getForumPostCount = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    logger.debug('Getting update forum page post count...');
    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');
    const result = await page.evaluate(() => {
        let topicString = document.getElementsByClassName('ipsType_sectionTitle ipsType_medium ipsType_reset ipsClear')[0].innerHTML;
        return topicString;
    })
    browser.close();
    return result;
};

// this is the function we call when there is an update!! 
let getForumUpdateText = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    logger.debug('Getting forum post text...');
    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');
    const result = await page.evaluate(() => {
        let returnObj = {}
        returnObj.firstPostTitle = document.getElementsByClassName('ipsType_break ipsContained')[0].getElementsByTagName('a')[0].innerText;
        returnObj.firtPostLink = document.getElementsByClassName('ipsType_break ipsContained')[0].getElementsByTagName('a')[0].getAttribute('href');
        return returnObj;
    })
    browser.close();
    return result;
}

let getForumPostTextByLink = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    logger.debug('Getting forum post text...');
    await page.goto(url);
    const result = await page.evaluate(() => {
        let postText = document.getElementsByClassName('ipsType_normal ipsType_richText ipsContained')[0].innerHTML;
        return postText
    })
    browser.close();
    return result;
}

//  Check if there's an update to the forums
let evaluatePostCount = async () => {
    let statusBool = await getForumPostCount()
        .then((postCountStr) => {
            let currentForumPostCountStr = JSON.parse(fs.readFileSync('./topicCount.json'));
            logger.debug(postCountStr);
            if (postCountStr == currentForumPostCountStr.forumPostCount) {
                logger.debug('Forum post count matches currently stored count');
                return false;
            } else {
                logger.debug('Forum post count DOES NOT matches currently stored count');
                return true;
            }
        });
    return statusBool;
}

// This will now return an Object
function retrieveUpdates() {
    let objectToReturn = {};
    logger.info(`Update check started at ${new Date().toTimeString()}...`);
    // get the first forum link, follow it and get the post's contents
    return evaluatePostCount()
        .then((changeBool) => {
            logger.debug(changeBool)
            if (changeBool == true) {
                objectToReturn.changeBool = true;
                // crawl for the update post
                logger.info('Update found! Crawling page for text...');
                return getForumUpdateText()
                    .then((htmlResponse) => {
                        // pull the URL to follow out of the response and the title
                        // Crawl htmlresponse.firstPostLink
                        return getForumPostTextByLink(htmlResponse.firtPostLink)
                            .then((forumPostHTML) => {
                                objectToReturn.postURL = htmlResponse.firtPostLink;
                                objectToReturn.formattedMessage = turndownService.turndown(forumPostHTML);
                                return objectToReturn;
                            })
                    })
            } else {
                // do nothing but log
                logger.info(`Check completed at ${new Date().toTimeString()}`);
                // Placeholder
                objectToReturn.changeBool = false;
                objectToReturn.formattedMessage = 'No updates..';
                return objectToReturn;
            }
        })
}

// We want our bot to have a !subscribe command for dealing with
// checking for updates!
module.exports.getForumPostCount = getForumPostCount;
module.exports.retrieveUpdates = retrieveUpdates;