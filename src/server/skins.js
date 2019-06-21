const fs = require("fs");
const log = require("../log");

const skins = function() {
	return {
		idList: null,

		readyPromise: new Promise((resolve, reject) => {
			fs.readdir("public/resources/skins",
				undefined,
				function(error, files) {
					if (error) {
						log.error(error);
					}

					if (files && Array.isArray(files)) {
						// Only read files that have the correct extension
						skins.idList = files.filter(file => file.endsWith(".png"));

						// Remove extension
						skins.idList = skins.idList.map(
							(skinId) => { return skinId.substring(0, skinId.lastIndexOf(".")); }
						);

						return resolve(skins.idList);
					}

					log.error("No files found");
					reject("No files found");
				}
			);
		})
	};
}();

module.exports = skins;
