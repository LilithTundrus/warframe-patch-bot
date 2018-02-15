'use strict';
//  This is where the puppeterr scraper will go!


const puppeteer = require('puppeteer');

const currentForumPostCountStr = '745 topics in this forum'

let scrape = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://forums.warframe.com/forum/3-pc-update-build-notes/');

    const result = await page.evaluate(() => {
        let test = document.getElementsByClassName('ipsType_sectionTitle ipsType_medium ipsType_reset ipsClear')[0].innerHTML;
        return test;
    })


    browser.close();
    return result; // Return the data
};

function test() {
    return scrape().then((value) => {
        console.log(value); // Success!
        if (value !== currentForumPostCountStr) {
            console.log('THERE HAS BEEN A CHANGE, FOLLOWING THE URL...')
            return 'THERE HAS BEEN A CHANGE, FOLLOWING THE URL...'
            // return getTheUpdate function
        } else {
            console.log('Up to date!');
            return 'Up to date!'
        }
    });
    
}

// We want our bot to have a !subscribe command for dealing with
// checking for updates!
module.exports.test = test;