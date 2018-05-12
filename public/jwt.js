/**
	Parameters:
		jwt				JSON Web Token (string)
		save			Whether to save the parsed JWT to localStorage (boolean)
		callback(		Callback function (function)
			isValid		Validity of the JWT (boolean)
			result		Parsed JWT (object)
		)
*/

function verifyAndParseJWT(jwt,save,callback){
	
	// Get the public key on Twitch
	var xmlhttp;
	xmlhttp=new XMLHttpRequest();
	xmlhttp.onreadystatechange=function() {
		if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			// Check validity
			let isValid = KJUR.jws.JWS.verifyJWT(
				jwt,
				KEYUTIL.getKey(xmlhttp.response.keys[0]),
				{alg: ['RS256']}
			);
			
			// If valid, parse the result
			let result;
			if (isValid){
				let jws = new KJUR.jws.JWS();
				jws.parseJWS(jwt);
				if (save) localStorage.parsedJWT = jws.parsedJWS.payloadS;
				result = JSON.parse(jws.parsedJWS.payloadS);
			}
			
			// Return the results in the callback
			callback(isValid,result);
  		}
	}
	xmlhttp.open("GET","https://id.twitch.tv/oauth2/keys",true);
	xmlhttp.responseType = "json";
	xmlhttp.setRequestHeader("Accept", "application/json");
	xmlhttp.send();
}