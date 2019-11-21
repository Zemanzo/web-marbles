import domReady from "../dom-ready";

const notifications = [];
const domNodes = domReady.then(() => {
	return {
		template: document.getElementById("notification-template"),
		notifications: document.getElementById("notifications")
	};
});

// "Notification" already exists as a JavaScript object
function HUDNotification(notificationOptions) {
	// Text that should be in the notification
	this.content = notificationOptions.content;

	// Custom styles that the notification should have
	this.styles = notificationOptions.styles;

	// Time the notification stays on screen. -1 or `false` equal an infinite lifetime
	if (
		notificationOptions.lifetime === -1
		|| notificationOptions.lifetime === false
	) {
		this.lifetime = false;
	} else if (!isNaN(notificationOptions.lifetime)) {
		this.lifetime = notificationOptions.lifetime;
	} else {
		this.lifetime = 5;
	}

	// Class names that will be appended to the notification element node
	this.classNames = (notificationOptions.classNames || "").trim();

	// Number of progress steps the notification displays as part of a loading notification.
	this.progressTarget = notificationOptions.progressTarget;
	this.currentProgress = 0;
	this.hideProgressWhenDone = notificationOptions.hideProgressWhenDone || false;

	domNodes.then((elements) => {
		// Create elementNode
		this.node = elements.template.cloneNode(true);
		this.node.removeAttribute("id");
		this.node.className += ` ${this.classNames}`;
		this.contentNode = this.node.getElementsByClassName("notification-content")[0];
		this.contentNode.innerText = this.content;

		// Add custom styles
		for (let key in this.styles) {
			this.node.style[key] = this.styles[key];
		}

		// Add (or remove) progress elements
		this.progressNode = this.node.getElementsByClassName("notification-progress")[0];
		if (this.progressTarget > 0) {
			for (let i = 1; i < this.progressTarget; i++) {
				let cloneNode = this.progressNode.children[0].cloneNode(true);
				// The cloned node is also used (as the first step), and has a "loading" class by default.
				cloneNode.classList.remove("loading");
				cloneNode.classList.add("pending");
				this.progressNode.appendChild(cloneNode);
			}
		} else {
			this.node.removeChild(this.progressNode);
		}

		// Add node to DOM
		elements.notifications.appendChild(this.node);
	});

	// Start lifetime timeout
	if (this.lifetime) {
		this.removalTimeout = setTimeout(() => {
			this.remove();
		}, Math.floor(this.lifetime * 1000));
	}

	notifications.push(this);
}

// Change the text contents
HUDNotification.prototype.changeContent = function(newContent) {
	if (newContent) {
		this.contentNode.innerText = this.content = newContent;
	}
};

// Change classnames
HUDNotification.prototype.changeClassNames = function(newClassNames) {
	this.classNames = (newClassNames || "").trim();
	this.node.className = `notification ${this.classNames}`;
};

// Increment the progress by 1, and optionally change the text
HUDNotification.prototype.incrementProgress = function(newContent) {
	if (this.progressNode) {
		this.changeContent(newContent);
		this.progressNode.children[this.currentProgress].classList.remove("loading");
		this.progressNode.children[this.currentProgress].classList.add("completed");

		if (this.currentProgress < this.progressTarget - 1) {
			this.progressNode.children[this.currentProgress + 1].classList.remove("pending");
			this.progressNode.children[this.currentProgress + 1].classList.add("loading");
		}

		// Increment the progress value
		this.currentProgress++;
		if (this.currentProgress >= this.progressTarget && this.hideProgressWhenDone) {
			this.progressNode.style.display = "none";
		}
	}
};

HUDNotification.prototype.remove = function(delay = 0) {
	// Clear possibly already existing timeout
	clearTimeout(this.removalTimeout);

	// New potential delay timeout (can also be 0)
	this.removalTimeout = setTimeout(() => {
		domNodes.then((elements) => {
			// Fade out
			this.node.style.opacity = 0;
			this.node.style.marginTop = `-${this.node.clientHeight}px`;

			// Remove node
			setTimeout( () => {
				elements.notifications.removeChild(this.node);
			}, 1000);
		});
	}, Math.floor(delay * 1000));
};

export { HUDNotification };
