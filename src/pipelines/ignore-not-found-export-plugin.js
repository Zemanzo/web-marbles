// Source: https://github.com/TypeStrong/ts-loader/issues/653#issuecomment-444266993

const ModuleDependencyWarning = require('webpack/lib/ModuleDependencyWarning');

// ↓ Based on https://github.com/sindresorhus/escape-string-regexp
const escapeStringForRegExp = string => string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

module.exports = class IgnoreNotFoundExportPlugin {
	constructor(exportsToIgnore) {
		this.exportsToIgnore = exportsToIgnore || [];
	}

	getMessageRegExp() {
		if (this.exportsToIgnore.length > 0) {
			const exportsPattern = '(' + this.exportsToIgnore.map(escapeStringForRegExp).join('|') + ')';
			return new RegExp( `export '${this.exportsToIgnore}'( \\(imported as '.*'\\))? was not found in`, );
		} else {
			return /export '.*'( \(imported as '.*'\))? was not found in/;
		}
	}

	apply(compiler) {
		const messageRegExp = this.getMessageRegExp();
		
		const doneHook = stats => {
			stats.compilation.warnings = stats.compilation.warnings.filter( warn => {
				if ( warn instanceof ModuleDependencyWarning && messageRegExp.test(warn.message) ) {
					return false;
				}
			return true;
			}, );
		};

		if (compiler.hooks) {
			compiler.hooks.done.tap('IgnoreNotFoundExportPlugin', doneHook);
		} else {
			compiler.plugin('done', doneHook);
		}
	} 
};