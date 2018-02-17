'use strict';
//  Puppeteer is actually getting the data
const puppeteer = require('puppeteer');
// Our custom logger class
let Logger = require('./loggerClass');
let logger = new Logger;
// turndown will take HTML and turn it into markdown
var TurndownService = require('turndown');
var turndownService = new TurndownService();
const currentForumPostCountStr = '747 topics in this forum';

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

// this is the function we call when there is an update!! 
let getForumUpdateText = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    logger.debug('Getting forum page...');
    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');

    const result = await page.evaluate(() => {
        let returnObj = {}
        returnObj.firstPostTitle = document.getElementsByClassName('ipsType_break ipsContained')[0].getElementsByTagName('a')[0].innerText;
        returnObj.firtPostLink = document.getElementsByClassName('ipsType_break ipsContained')[0].getElementsByTagName('a')[0].getAttribute('href')
        return returnObj;
    })
    browser.close();
    return result; // Return the data
}

let getForumPostTextByLink = async (url) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    logger.debug('Getting forum page...');
    await page.goto(url);
    const result = await page.evaluate(() => {
        let postText = document.getElementsByClassName('ipsType_normal ipsType_richText ipsContained')[0].innerHTML;
        return postText
    })
    browser.close();
    return result; // Return the data
}

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
                return getForumUpdateText()
                    .then((htmlResponse) => {
                        // pull the URL to follow out of the response and the title
                        logger.debug(JSON.stringify(htmlResponse))
                        // Crawl htmlresponse.firstPostLink
                        return getForumPostTextByLink(htmlResponse.firtPostLink)
                        .then((forumPostHTML) => {
                            // console.log(forumPostHTML)
                            let formattedMessage = turndownService.turndown(forumPostHTML);
                            return formattedMessage;
                        })
                        // return htmlResponse;
                    })
            } else {
                // do nothing but log
                logger.info(`Check completed at ${new Date().toTimeString()}`);
                // Placeholder
                return ('No updates');
            }
        })
}

// We want our bot to have a !subscribe command for dealing with
// checking for updates!
module.exports.getForumPostCount = getForumPostCount;
module.exports.retrieveUpdates = retrieveUpdates;