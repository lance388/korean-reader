const greet = require('./login');
const puppeteer = require('puppeteer');
const webAddress = 'https://koreanreader.com/rdr/login.html';


describe('Sign In button', () => {
    test('is active on load', async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate to your website
        await page.goto(webAddress); // Replace with your actual url

        // Get the Sign In button
        const signInButton = await page.$('#signin-button');

        // Check that the button is not disabled
        const isDisabled = await page.evaluate(button => button.disabled, signInButton);
        expect(isDisabled).toBe(false);

        await browser.close();
    });
});