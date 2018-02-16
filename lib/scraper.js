'use strict';
//  This is where the puppeterr scraper will go!
const puppeteer = require('puppeteer');

const currentForumPostCountStr = '748 topics in this forum'

let getForumPostCount = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');

    const result = await page.evaluate(() => {
        let topicString = document.getElementsByClassName('ipsType_sectionTitle ipsType_medium ipsType_reset ipsClear')[0].innerHTML;
        return topicString;
    })
    browser.close();
    return result; // Return the data
};

//  Check if there's an update to the forums
function evaluatePostCount() {
    return getForumPostCount()
        .then((postCountStr) => {
            console.log(postCountStr);
            if (postCountStr == currentForumPostCountStr) {
                return true;
            } else {
                return false;
            }
        });
}


function retrieveUpdates() {
    // get the first forum link, follow it and get the post's contents
}

// We want our bot to have a !subscribe command for dealing with
// checking for updates!
module.exports.getForumPostCount = getForumPostCount;