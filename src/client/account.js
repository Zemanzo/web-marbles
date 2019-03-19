let twitchHash = localStorage.twitchHash = document.location.hash.substr(1); // Remove the hashtag
let parsedHash = parseHash(twitchHash);
let id_token = localStorage.id_token = parsedHash.id_token;
let access_token = localStorage.access_token = parsedHash.access_token;
let scope = localStorage.scope = parsedHash.scope;

verifyAndParseJWT(id_token,true,(isValid,result)=>{
	function feedbackValidation(validity){
		if (validity){
			document.getElementById("load").style.display = "none";
			document.getElementById("verify").style.color = "#2f2";
			document.getElementById("verify").innerHTML = "Verified!";

			document.getElementById("result").style.display = "block";
			document.getElementById("name").innerHTML = result.preferred_username;
		} else {
			let dancers = document.getElementsByClassName("dancer");
			for (let d of dancers){
				d.style.display = "none";
			}
			document.getElementById("load").style.display = "none";
			document.getElementById("verify").style.color = "#d00";
			document.getElementById("verify").innerHTML = "Failed to verify D:";
			document.getElementById("failedResult").style.display = "block";
		}
	}

	if (document.readyState === "interactive" || document.readyState === "complete"){
		feedbackValidation(isValid);
	} else {
		window.addEventListener("DOMContentLoaded",()=>{
			feedbackValidation(isValid);
		},false);
	}
});

function parseHash(hash){
	var arr = hash.split("&");
	var obj = {};
	for (let val of arr){
		var keyval = val.split("=");
		obj[keyval[0]] = keyval[1];
	}
	return obj;
}
