// Setup
let { selenium, chai, Driver } = require("./tests-setup");
let By = selenium.By,
	until = selenium.until,
	driver = Driver();

// Prepare test environment
before(async function() {
	await driver.get("http://localhost:3004/client");
});

// Start testing
describe("Client", function() {
	this.slow(5000);

	describe("Rendering", function() {
		it("should generate a canvas that renders our scene", async function() {
			await driver.wait(until.elementLocated(By.css("#viewport canvas")), 10000);
			let viewport = await driver.findElement(By.css("#viewport canvas")).isDisplayed();
			chai.expect(viewport).to.be.true;
		});
	});

	describe("Sidebar", function() {
		it("should display the current game state", async function() {
			await driver.wait(until.elementLocated(By.css("#state")), 10000);
			await driver.sleep(1000);
			let stateText = await driver.findElement(By.css("#state")).getText();
			chai.expect(stateText).to.equal("Enter marbles now!");
		});

		it("should display 0 entries", async function() {
			await driver.wait(until.elementLocated(By.css("#entries")), 10000);
			await driver.sleep(1000);
			let stateText = await driver.findElement(By.css("#entries")).getText();
			chai.expect(stateText).to.equal("0");
		});
	});
});

// Clean up test environment
after(async function() {
	driver.quit();
});
