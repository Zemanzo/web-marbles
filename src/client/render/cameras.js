import "three/examples/js/controls/PointerLockControls";
import { PerspectiveCamera, Vector3, PointerLockControls, Math as ThreeMath, Euler, Quaternion } from "three";

let addRegisteredEventListener = function(scope, event, func, capture) {
	scope.addEventListener(event, func, capture);
	return () => {
		scope.removeEventListener(event, func, capture);
	};
};

/**
	Generates a pointerlock camera with WASD / arrow keys fly controls.

	The constructor takes the following arguments:
	@constructor
	@param {THREE.Scene} scene THREE scene object to add the camera to
	@param {THREE.Renderer} renderer THREE renderer the camera should use
	@param {Object} options Options object
	@param {Object} options.defaultPosition Sets the camera at this location ({x: Number, y: Number, z: Number})
	@param {HTMLElement} options.pointerLockElement Element to use for pointerlock. Will be renderer.domElement by default
	@param {THREE.Camera} options.camera THREE camera to use for applying controls to. Will generate new camera by default.
	@param {Number} options.speed Fly control speed. Can be changed afterwards. 150 by default.
	@param {Boolean} options.disableOnBlur Whether to disable camera on tabbing out. true by default.

	Methods:
	@method enable Enables the controls.
	@method disable Disables the controls.
	@method update Updates the controls. Should be called in some update loop.
	@method toDefaults Sets the camera back to its default position.
*/
function FreeCamera(
	scene,
	renderer,
	options = {}
) {
	if (!options.pointerLockElement)
		options.pointerLockElement = renderer.domElement;

	if (!options.camera)
		options.camera = new PerspectiveCamera(
			75, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 5000
		);

	if (!options.speed)
		options.speed = 150;

	if (!options.disableOnBlur)
		options.disableOnBlur = true;

	if (!options.defaultPosition)
		options.defaultPosition = { x: -8, y: 57, z: 30 };

	if (!options.defaultRotation)
		options.defaultRotation = { x: -0.35, y: 0, z: 0 };

	this.pointerLockElement = options.pointerLockElement;
	this.camera = options.camera;
	this.speed = options.speed;

	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;
	this.moveUp = false;
	this.moveDown = false;

	this.velocity = new Vector3();
	this.direction = new Vector3();

	this.controls = new PointerLockControls(options.camera, renderer.domElement);
	let _listeners = [];

	let self = this;

	/**
	 * Halts the camera in place
	 */
	this.stop = (function() {
		this.velocity.x = 0;
		this.velocity.y = 0;
		this.velocity.z = 0;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;
		this.moveUp = false;
		this.moveDown = false;
	}).bind(this);

	/**
	 * Enables the controls
	 */
	this.enable = function() {
		this.enabled = true;
		let func;

		// Hook pointer lock state change events
		func = function() {
			// document.pointerLockElement is null if pointerlock is inactive
			if (document.pointerLockElement !== options.pointerLockElement) self.stop();
		};
		_listeners.push( addRegisteredEventListener(document, "pointerlockchange", func, false) );

		// Request pointerlock
		func = function() {
			self.controls.lock();
		};
		_listeners.push( addRegisteredEventListener(options.pointerLockElement, "mousedown", func, false) );

		// Release pointerlock
		func = function() {
			self.controls.unlock();
		};
		_listeners.push( addRegisteredEventListener(document, "mouseup", func, false) );


		// Using the scrolling wheel allows a user to speed up or slow down.
		let _speedStep = -5;
		func = function(event) {
			let newSpeed = self.speed + _speedStep * event.deltaY;
			if (self.controls.isLocked === true && newSpeed > 10 && newSpeed < 1000) {
				self.speed = newSpeed;
			}
		};
		_listeners.push( addRegisteredEventListener(window, "wheel", func, false) );

		// Movement keys
		func = function(event) {
			let bool;
			if (event.type === "keydown") {
				bool = true;
			} else if (event.type === "keyup") {
				bool = false;
			}

			// Test keyCode
			switch(event.keyCode) {
			case 38: // up
			case 87: // w
				this.moveForward = bool;
				break;

			case 37: // left
			case 65: // a
				this.moveLeft = bool;
				break;

			case 40: // down
			case 83: // s
				this.moveBackward = bool;
				break;

			case 39: // right
			case 68: // d
				this.moveRight = bool;
				break;

			case 81: // q
				this.moveDown = bool;
				break;

			case 69: // e
				this.moveUp = bool;
				break;
			}
		};

		_listeners.push( addRegisteredEventListener(document, "keydown", func.bind(this), false) );
		_listeners.push( addRegisteredEventListener(document, "keyup", func.bind(this), false) );

		this.update = function(deltaTime) {
			update.bind(this)(deltaTime);
		};
	};

	/**
	 * Disables the controls
	 */
	this.disable = function() {
		this.enabled = false;

		self.stop();

		// remove listeners
		_listeners.forEach((el)=>{
			el();
		});

		// null update function
		this.update = () => void 0;
	};

	if (options.disableOnBlur === true) {
		document.addEventListener("visibilitychange", (function() {
			if (document.hidden) {
				this.disable();
			} else {
				this.enable();
			}
		}).bind(this), false);
	}

	this.toDefaults = function() {
		self.controls.getObject().position.x = options.defaultPosition.x;
		self.controls.getObject().position.y = options.defaultPosition.y;
		self.controls.getObject().position.z = options.defaultPosition.z;

		self.controls.getObject().rotation.x = options.defaultRotation.x;
		self.controls.getObject().rotation.y = options.defaultRotation.y;
		self.controls.getObject().rotation.z = options.defaultRotation.z;
	};
	this.toDefaults();

	scene.add(self.controls.getObject());

	// Call this function in the update loop to update the controls.
	let update = function(deltaTime) {
		this.velocity.x -= this.velocity.x * Math.min(1, 10.0 * deltaTime);
		this.velocity.y -= this.velocity.y * Math.min(1, 10.0 * deltaTime);
		this.velocity.z -= this.velocity.z * Math.min(1, 10.0 * deltaTime);

		this.direction.z = Number( this.moveForward ) - Number( this.moveBackward );
		this.direction.y = (this.moveDown || this.moveUp)
			? Number(this.moveDown) - Number(this.moveUp)
			: Number(this.moveForward) - Number(this.moveBackward);
		this.direction.x = Number( this.moveLeft ) - Number( this.moveRight );
		this.direction.normalize(); // this ensures consistent movements in all directions

		if ( this.controls.isLocked === true ) {
			if ( this.moveForward || this.moveBackward ) {
				this.velocity.z -= this.direction.z * this.speed * deltaTime;
			}

			if ( this.moveDown || this.moveUp ) {
				this.velocity.y -= this.direction.y * this.speed * deltaTime;
			} else if ( this.moveForward || this.moveBackward ) {
				this.velocity.y -= this.direction.y * this.speed * deltaTime * (-this.camera.parent.rotation.x * Math.PI * .5);
			}

			if ( this.moveLeft || this.moveRight ) {
				this.velocity.x -= this.direction.x * this.speed * deltaTime;
			}
		}
		self.controls.getObject().translateX( this.velocity.x * deltaTime );
		self.controls.getObject().translateY( this.velocity.y * deltaTime );
		self.controls.getObject().translateZ( this.velocity.z * deltaTime );
	};

	this.enable();
}


/**
	Generates a camera that automatically tracks the supplied target object.

	The constructor takes the following arguments:
	@constructor
	@param {THREE.Scene} scene THREE scene object to add the camera to
	@param {THREE.Renderer} renderer THREE renderer the camera should use
	@param {THREE.Object3D} target THREE object that should be tracked

	Methods:
	@method enable Enables the controls.
	@method disable Disables the controls.
	@method update Updates the controls. Should be called in some update loop.
	@method setTarget Sets the target object that needs to be tracked.
*/
function TrackingCamera(
	scene,
	renderer,
	options = {}
) {
	if (!options.pointerLockElement)
		options.pointerLockElement = renderer.domElement;

	if (!options.camera)
		options.camera = new PerspectiveCamera(
			75, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 5000
		);

	if (!options.defaultPosition)
		options.defaultPosition = { x: -3, y: 60, z: -7 };

	if (!options.defaultRotation)
		options.defaultRotation = { x: -0.45, y: Math.PI * .8, z: 0 };

	let defaultQuaternion = new Quaternion().setFromEuler(
		new Euler(
			options.defaultRotation.x,
			options.defaultRotation.y,
			options.defaultRotation.z,
			"YXZ"
		)
	);

	this.camera = options.camera;
	this.target = null;

	/**
	 * Enables the controls
	 */
	this.enable = function() {
		this.enabled = true;

		this.update = function() {
			update.bind(this)();
		};
	};

	/**
	 * Disables the controls
	 */
	this.disable = function() {
		this.enabled = false;

		// null update function
		this.update = () => void 0;
	};

	this.setTarget = function(target) {
		this.target = target;
	};

	document.addEventListener("visibilitychange", (function() {
		if (document.hidden) {
			this.disable();
		} else {
			this.enable();
		}
	}).bind(this), false);

	this.toDefaults = function() {
		this.camera.position.x = options.defaultPosition.x;
		this.camera.position.y = options.defaultPosition.y;
		this.camera.position.z = options.defaultPosition.z;

		this.camera.quaternion.copy(defaultQuaternion);
	};
	this.toDefaults();

	scene.add(this.camera);

	// Call this function in the update loop to update the controls.
	let update = function() {
		if (this.target) {
			if (Math.abs(this.camera.position.x - this.target.position.x) > 2) {
				this.camera.position.x = ThreeMath.lerp(this.camera.position.x, this.target.position.x, .01);
			}

			this.camera.position.y = ThreeMath.lerp(this.camera.position.y, this.target.position.y + 7, .01) || this.camera.position.y;

			if (Math.abs(this.camera.position.z - this.target.position.z) > 2) {
				this.camera.position.z = ThreeMath.lerp(this.camera.position.z, this.target.position.z, .01);
			}

			if (isNaN(this.camera.rotation._x) || isNaN(this.camera.rotation._y) || isNaN(this.camera.rotation._z)) {
				this.camera.setRotationFromEuler(new Euler());
				console.log(this.camera.rotation, this.camera.position);
			} else {
				//this.camera.quaternion.slerp(targetQuaternion, .1);
				this.camera.lookAt(this.target.position);
			}
		} else {
			this.camera.position.x = ThreeMath.lerp(this.camera.position.x, options.defaultPosition.x, .01);
			this.camera.position.y = ThreeMath.lerp(this.camera.position.y, options.defaultPosition.y, .01);
			this.camera.position.z = ThreeMath.lerp(this.camera.position.z, options.defaultPosition.z, .01);

			if (this.camera.quaternion.angleTo(defaultQuaternion) > .01) {
				console.log("slerp!");
				this.camera.quaternion.copy(
					this.camera.quaternion.slerp(defaultQuaternion, .01)
				);
			}
		}
	};

	this.enable();
}

export { FreeCamera, TrackingCamera };
