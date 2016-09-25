"use strict";

var webSocketsServerPort = 1337;
var webSocketServer = require('websocket').server;
var http = require('http');
var path = require("path"); 
var fs = require('fs');

// HTTP server
var server = http.createServer(function(request, response) {

	var filename = request.url || "/chess.html";
	if (filename == '/') {
		filename = "/chess.html";
	};
	console.log(filename);
	var ext = path.extname(filename);
	var localPath = __dirname;
	var validExtensions = {
		".html" : "text/html",			
		".js": "application/javascript", 
		".css": "text/css",
		".txt": "text/plain",
		".jpg": "image/jpeg",
		".gif": "image/gif",
		".png": "image/png"
	};
	var isValidExt = validExtensions[ext];

	if (isValidExt) {
		localPath += filename;
		fs.exists(localPath, function(exists) {
			if(exists) {
				console.log("Serving file: " + localPath);
				fs.readFile(localPath, function(err, contents) {
					if(!err) {
						response.setHeader("Content-Length", contents.length);
						response.setHeader("Content-Type", isValidExt);
						response.statusCode = 200;
						response.end(contents);
					} else {
						response.writeHead(500);
						response.end();
					}
				});
			} else {
				console.log("File not found: " + localPath);
				response.writeHead(404);
				response.end();
			}
		});

	} else {
		console.log("Invalid file extension detected: " + ext)
	}
});
server.listen(webSocketsServerPort, function() {
	console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

//WebSocket server
var wsServer = new webSocketServer({
	// WebSocket server is tied to a HTTP server. WebSocket request is just
	// an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
	httpServer: server
});