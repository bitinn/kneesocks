
/**
 * kneesocks.js
 *
 * A http proxy that wraps around your socks4/5 proxy
 */

var Socks = require('socksv5');
var Agent = Socks.HttpAgent;
var HTTP = require('http');
var URL = require('url');
var debug = require('debug')('proxy');

module.exports = Kneesocks;

/**
 * Kneesocks server
 *
 * @param   Object  opts  Config
 * @return  Void
 */
function Kneesocks(opts) {

	this.opts = {
		http: opts.http || 10001
		, socks: opts.socks || 10002
	};

	// agent with socks support
	this.agent = new Agent({
		proxyHost: '127.0.0.1'
		, proxyPort: this.opts.socks
		, auths: [ Socks.auth.None() ]
	});

}

/**
 * Start HTTP Proxy
 *
 * @param   Function  cb  Callback
 * @return  Void
 */
Kneesocks.prototype.start = function(cb) {

	if (this.running) {
		return;
	}

	var self = this;
	var opts = this.opts;

	// proxy http requests
	this.server = HTTP.createServer(function(req, res) {
		debug('start: ' + req.url);

		// construct request using socks agent
		var options = URL.parse(req.url);
		options.method = req.method;
		options.headers = req.headers;
		options.agent = self.agent;

		var request = HTTP.request(options, function(result) {
			debug('load: ' + req.url);
			res.writeHead(result.statusCode, result.headers);

			result.on('end', function() {
				debug('done: ' + req.url);
			});
			result.pipe(res);
		});

		request.on('error', function(err) {
			debug('error: ' + req.url);
			debug(err.stack);
		});

		req.pipe(request);
	});

	// proxy https requests
	this.server.on('connect', function(req, inputSocket, head) {
		// handle CONNECT, assume https
		var options = URL.parse('https://' + req.url);

		var url = 'https://' + options.hostname + '/';
		debug('start: ' + url);

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
			debug('load: ' + url);

			socket.pipe(inputSocket);
			inputSocket.pipe(socket);
		});

		outputSocket.on('error', function(err) {
			debug('error: ' + url);
			debug(err.stack);
		});

		outputSocket.on('close', function() {
			debug('done: ' + url);
		});
	});

	// start proxy
	this.running = true;
	this.server.listen(opts.http, cb);

	debug('http proxy listening on port: ' + opts.http);
	debug('connected socks proxy on port: ' + opts.socks);

};

/**
 * Stop HTTP Proxy
 *
 * @param   Function  cb  Callback
 * @return  Void
 */
Kneesocks.prototype.stop = function(cb) {

	if (this.running) {
		this.running = false;
		this.server.close(cb);
	}

};
