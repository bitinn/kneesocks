#!/usr/bin/env node

/**
 * index.js
 *
 * A http proxy that wraps around your socks4/5 proxy
 */

var socks = require('socksv5');
var Agent = socks.HttpAgent;
var http = require('http');
var https = require('https');
var url = require('url');

var args = process.argv.slice(2);
var opts = {
	http: 10001
	, socks: 10002
};

if (args[0]) {
	opts.http = args[0];
}

if (args[1]) {
	opts.socks = args[1];
}

var agent = new Agent({
	proxyHost: '127.0.0.1'
	, proxyPort: opts.socks
	, auths: [ socks.auth.None() ]
});

var server = http.createServer(function(req, res) {
	var request;
	if (req.url.indexOf('https') === 0) {
		request = https.request;
	} else {
		request = http.request;
	}

	var options = url.parse(req.url);
	options.method = req.method;
	options.headers = req.headers;
	options.agent = agent;

	var proxy = request(options, function(result) {
		console.log('load:', req.url);
		res.writeHead(result.statusCode, result.headers);

		result.on('end', function() {
			console.log('done:', req.url);
		});
		result.pipe(res);
	});

	proxy.on('error', function(err) {
		console.log('error:', req.url, err.stack);
	});

	console.log('start:', req.url);
	req.pipe(proxy);
});

server.listen(opts.http);

console.log('http proxy listening on port:', opts.http);
console.log('connected socks proxy on port:', opts.socks);
