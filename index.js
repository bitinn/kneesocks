#!/usr/bin/env node

/**
 * index.js
 *
 * A http proxy that wraps around your socks4/5 proxy
 */

var Kneesocks = require('./lib/kneesocks');

// command line mode
if (!module.parent) {
	var ks = factory(false);
	ks.start();
}

/**
 * Create a Kneesocks server instance
 *
 * @param   Mixed  opts  Config
 * @return  Object
 */
function factory(opts) {

	if (opts === false) {
		// command line arguments, eg: kneesocks 10001 10002
		var args = process.argv.slice(2);
		opts = {};

		if (args[0]) {
			opts.http = args[0];
		}

		if (args[1]) {
			opts.socks = args[1];
		}
	}

	return new Kneesocks(opts);

};
