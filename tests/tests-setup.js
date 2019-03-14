// Webdriver
require("chromedriver");

// Selenium
const selenium = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

let chromeOptions = new chrome.Options();
chromeOptions.addArguments([
	"--headless",
	"--no-sandbox",
	"--disable-dev-shm-usage"
]);

const Driver = function() {
	return new selenium.Builder()
		.withCapabilities(selenium.Capabilities.chrome())
		.setChromeOptions(chromeOptions)
		.build();
};

// Assertion engine
const chai = require("chai");

module.exports = {
	selenium,
	chai,
	Driver
};
