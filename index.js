#!/usr/bin/env node

/**
 * index.js
 *
 * A http proxy that wraps around your socks4/5 proxy
 */

var socks = require('socksv5');
var Agent = socks.HttpAgent;
var http = require('http');
var TLS = require('tls');
var url = require('url');

// command line arguments: kneesocks 10001 10002
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

// agent with socks support
var agent = new Agent({
	proxyHost: '127.0.0.1'
	, proxyPort: opts.socks
	, auths: [ socks.auth.None() ]
});

// proxy http requests
var server = http.createServer(function(req, res) {
	var options = url.parse(req.url);
	options.method = req.method;
	options.headers = req.headers;
	options.agent = agent;

	var proxy = http.request(options, function(result) {
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

// proxy https requests
server.on('connect', function(req, socket, head) {
	socket.write('HTTP/1.1 200 Connection Established\r\n');
	socket.write('Proxy-agent: Kneesocks\r\n');

	// x.pipe(inputSocket);
	// inputSocket.pipe(x);
});

// start proxy
server.listen(opts.http);

console.log('http proxy listening on port:', opts.http);
console.log('connected socks proxy on port:', opts.socks);
