// Setup
let { selenium, chai, Driver } = require("./tests-setup");
let By = selenium.By,
	until = selenium.until,
	driver = Driver();

// Prepare test environment
const config = require("../src/server/config");

before(async function() {
	await driver.get("http://localhost:3004/chat");
});

// Start testing
describe("Chat", function() {
	this.slow(5000);

	it("displays a successful connection message", async function() {
		await driver.wait(until.elementLocated(By.id("chatMessages")), 10000);
		await driver.sleep(1000);
		let chatMessagesText = await driver.findElement(By.id("chatMessages")).getText();
		chai.expect(chatMessagesText).to.contain("Successfully connected to chat. Say !marble to join the race!");
	});

	it("has the correct link to the Discord", async function() {
		await driver.wait(until.elementLocated(By.css("header a")), 10000);
		let discordLink = await driver.findElement(By.css("header a")).getAttribute("href");
		chai.expect(discordLink).to.equal(config.discord.inviteLink);
	});
});

// Clean up test environment
after(async function() {
	driver.quit();
});
