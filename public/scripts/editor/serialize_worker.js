let serialize = {};

onmessage = function(message) {
	serialize.start = new Date();
	switch(message.data.type){
		case 'exportPublishBinary':
			postMessage({
				type: 'log',
				payload: {
					message: 'Exporting publish ready binary...',
					type: 'info'
				}
			});
			exportPublishBinary(message.data.payload);
			break;
		default:
			postMessage({
				type: 'log',
				payload: {
					message: `No such serialization type is available (${message.data.type})`,
					type: 'error'
				}
			});
			break;
	}
}

let exportPublishBinary = function(data){
	console.log(data)
	postMessage({
		type: 'log',
		payload: {
			message: `Serialization succesful! (${(new Date()) - serialize.start}ms)`,
			type: 'success'
		}
	});
	postMessage({
		type: 'publishBinarySuccess',
		payload: result
	});
}
