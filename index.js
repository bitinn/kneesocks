#!/usr/bin/env node

/**
 * index.js
 *
 * A http proxy that wraps around your socks4/5 proxy
 */

var Socks = require('socksv5');
var Agent = Socks.HttpAgent;
var HTTP = require('http');
var URL = require('url');

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
	, auths: [ Socks.auth.None() ]
});

// proxy http requests
var proxy = HTTP.createServer(function(req, res) {
	console.log('start:', req.url);

	// construct request using socks agent
	var options = URL.parse(req.url);
	options.method = req.method;
	options.headers = req.headers;
	options.agent = agent;

	var request = HTTP.request(options, function(result) {
		console.log('load:', req.url);
		res.writeHead(result.statusCode, result.headers);

		result.on('end', function() {
			console.log('done:', req.url);
		});
		result.pipe(res);
	});

	request.on('error', function(err) {
		console.log('error:', req.url, err.stack);
	});

	req.pipe(request);
});

// proxy https requests
proxy.on('connect', function(req, inputSocket, head) {
	// handle CONNECT, assume https
	var options = URL.parse('https://' + req.url);

	var url = 'https://' + options.hostname;
	console.log('start:', url);

	options = {
		host: options.hostname
		, port: options.port
		, proxyHost: '127.0.0.1'
		, proxyPort: opts.socks
		, auths: [ Socks.auth.None() ]
	};

	var outputSocket = Socks.connect(options);

	outputSocket.on('connect', function(socket) {
		inputSocket.write('HTTP/1.1 200 Connection established.\r\n');
		inputSocket.write('Proxy-Connection: close\r\n');
		inputSocket.write('Proxy-Agent: Kneesocks\r\n');
		inputSocket.write('\r\n');

		socket.write(head);
		console.log('load:', url);

		socket.pipe(inputSocket);
		inputSocket.pipe(socket);
	});

	outputSocket.on('error', function(err) {
		console.log('error:', url, err.stack);
	});

	outputSocket.on('close', function() {
		console.log('done:', url);
	});
});

// start proxy
proxy.listen(opts.http);

console.log('http proxy listening on port:', opts.http);
console.log('connected socks proxy on port:', opts.socks);
