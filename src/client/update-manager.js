import domReady from "./dom-ready";

let updateManager = function() {
	let _previousTime = Date.now();
	let _updateFunctions = [];

	domReady.then(() => {
		_previousTime = Date.now(); // Update loop starts from this point in time, ignore load time
	});

	return {
		addUpdateCallback: function(func) {
			_updateFunctions.push(func);
		},

		triggerUpdate: function() {
			let now = Date.now();
			let deltaTime = (now - _previousTime) * 0.001; // Time in seconds
			_previousTime = now;

			for(let i = 0; i < _updateFunctions.length; i++) {
				_updateFunctions[i](deltaTime);
			}
			return deltaTime;
		}
	};
}();

export { updateManager };
