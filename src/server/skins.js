const fsPromises = require("fs").promises;
const log = require("../log");

const skins = function() {
	return {
		idList: null,
		skinList: null,

		updateIdList: function() {
			// Get list of folders in the skin directory
			return fsPromises.readdir(
				`${__dirname}/../../public/resources/skins`
			)
				.then((folders) => {
					if (folders && Array.isArray(folders)) {
						return folders;
					}

					return Promise.reject("No files found");
				})
				.then((folders) => {
					let skinMetaFilePromises = [];

					// Get the meta.json file for every skin folder
					for (let folder of folders) {
						skinMetaFilePromises.push(
							fsPromises.readFile(
								`${__dirname}/../../public/resources/skins/${folder}/meta.json`,
								"utf8"
							)
								.then((file) => {
									if (file) {
										let parsed = JSON.parse(file); // Errors here will also be caught by the promise chain
										parsed.id = folder; // Add folder as an ID
										return parsed;
									}

									return Promise.reject(`Something went wrong when attempting to parse the folder's meta.json (${folder})`);
								})
								.catch((error) => {
									log.warn(error);

									// Do still return a resolved promise, so that it does not block the rest of the skin list update.
									return Promise.resolve(null);
								})
						);
					}

					return Promise.all(skinMetaFilePromises);
				})
				.then((metaFiles) => {
					this.idList = {};
					this.skinList = {};

					for (let meta of metaFiles) {
						// Check for potential null, due to failed loading / parsing of the meta file.
						if (meta && meta.enabled) {
							for (let alias of meta.aliases) {
								this.idList[alias] = meta.id;
								this.skinList[meta.id] = meta;
							}
						}
					}
				})
				.catch((error) => {
					log.warn(error);
				});
		}
	};
}();

module.exports = skins;
