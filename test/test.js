
// test tools
var chai = require('chai');
var expect = chai.expect;

// dependencies
var http = require('http');
var net = require('net');

// fake socks proxy
var Socks = require('socksv5');

// test subject
var Kneesocks = require('../lib/kneesocks.js');
var proxy = new Kneesocks({ http: 10001, socks: 10002 });

describe('kneesocks', function() {

	before(function(done) {
		var server = Socks.createServer(function(info, accept, deny) {
			var body = 'hello world';
			var socket = accept(true);

			if (info.dstPort == 80) {
				socket.write('HTTP/1.1 200 OK\r\n');
				socket.write('Connection: close\r\n');
				socket.write('Content-Type: text/plain\r\n');
				socket.write('Content-Length: ' + Buffer.byteLength(body) + '\r\n');
				socket.write(body + '\r\n');
				socket.write('\r\n');
			}

			socket.end();
		});
		server.useAuth(Socks.auth.None());
		server.listen(10002, '127.0.0.1', done);
	});

	describe('constructor', function() {
		it('should setup http proxy server', function() {
			expect(proxy.opts.http).to.equal(10001);
			expect(proxy.opts.socks).to.equal(10002);
			expect(proxy.agent).to.be.an.instanceof(Socks.HttpAgent);
		});
	});

	describe('start', function() {
		it('should start http proxy', function(done) {
			proxy.start(function() {
				expect(proxy.server).to.be.an.instanceof(http.Server);
				expect(proxy.running).to.be.true;
				done();
			});
		});
	});

	describe('stop', function() {
		it('should stop http proxy', function(done) {
			proxy.stop(function() {
				expect(proxy.running).to.be.false;
				done();
			});
		});
	});

	describe('proxy', function() {
		it('should accept http request', function(done) {
			proxy.start(function() {
				var req = http.request({
					host: '127.0.0.1'
					, port: 10001
					, method: 'GET'
					, path: 'http://localhost/'
				}, function(res) {
					expect(res.statusCode).to.equal(200);
					proxy.stop(function() {
						done();
					});
				});
				req.end();
			});
		});

		it('should accept CONNECT request', function(done) {
			proxy.start(function() {
				var req = http.request({
					host: '127.0.0.1'
					, port: 10001
					, method: 'CONNECT'
					, path: 'localhost:443'
				});

				req.on('connect', function(res, socket, head) {
					expect(res.statusCode).to.equal(200);
					proxy.stop(function() {
						done();
					});
				});

				req.end();
			});
		});
	});

});
