/**
	This function is created to make firing a function easy, when both the document and your
	asynchronous function are ready.

	Use it as following:
	1.  add(<FUNCTION>,<ID>,<OPTIONS>) your function. <OPTIONS> is an object that allows for three
		variables:
		-- type
			omitted or 0	- automatic with arguments (default)
			1				- automatic without arguments
			2				- manual
		-- readyState
			"interactive"	- wait for DOMContentLoaded event (default)
			"complete"		- wait for load event
		-- returnOnFire		// (only used for type 1)
			false			- Call function immediately when fired (default)
			true			- Do not fire function but return it instead

	2a. add args(<ID>,<ARGS>) when your asynchronous function is ready. this will attempt to fire
		your function automatically.
	OR
	2b. you do not add args and instead fire(<ID>) manually
	3.  in case the doc was not ready yet, the fuction will automatically fire once the document is
		ready.
*/

var whenDocReady = {

	timestamp: {},

	lookup: {},

	add: function(callback,id,options){
		if (!options)
			options = {};
		options.type = options.type || 0;
		options.readyState = options.readyState || "interactive";
		options.returnOnFire = options.returnOnFire || false;
		this.lookup[id] = {
			callback: callback,
			id: id,
			type: options.type,
			readyState: options.readyState,
			returnOnFire: options.returnOnFire,
			fired: false,
			args: null
		}
	},

	args: function(id,...args){
		this.lookup[id].args = args;
		this.fire(id,true);
	},

	fire: function(id,withArguments){
		if (
			this.lookup[id] &&	// This id exists AND
			!this.lookup[id].fired && ( // It hasn't been fired yet AND
				( this.lookup[id].readyState === "interactive" && this.docReady() ) ||
				( this.lookup[id].readyState === "complete" && this.docDone() )
			) && ( // The document is ready AND
				!withArguments ||
				( this.lookup[id].args && this.lookup[id].args.length > 0 )
			) // In case it's being called with arguments, there are arguments
		){
			this.lookup[id].fired = true;
			if (withArguments){
				return this.lookup[id].callback(...this.lookup[id].args);
			} else {
				if (this.lookup[id].returnOnFire){
					return this.lookup[id].callback;
				} else {
					return this.lookup[id].callback();
				}
			}
		} else {
			if (!this.lookup[id])
				console.warn("No such ID:",id);
			return (withArguments ? null : ()=>{return null});
		}
	},

	fireAll: function(readyState){
		for (let id in this.lookup){
			if (
				!this.lookup[id].fired &&
				this.lookup[id].type !== 2 &&
				this.lookup[id].readyState === readyState
			){
				/* console.log(id); */
				this.fire(id,(this.lookup[id].type === 0));
			}
		}
	},

	docReady: function(){
		return (document.readyState === "interactive" || document.readyState === "complete");
	},

	docDone: function(){
		return document.readyState === "complete";
	}

}

window.addEventListener("DOMContentLoaded", function(){
	whenDocReady.timestamp.interactive = (new Date()).getTime();
	whenDocReady.fireAll("interactive");
},false);

window.addEventListener("load", function(){
	whenDocReady.timestamp.complete = (new Date()).getTime();
	whenDocReady.fireAll("complete");
},false);
