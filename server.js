"use strict";

var webSocketsServerPort = 1337;
var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require("path"); 
var fs = require('fs');

// HTTP server
var server = http.createServer(function(request, response) {

	var filename = request.url || "/chess.html";
	if (filename == '/') {
		filename = "/chess.html";
	};
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
	var isValidExt = validExtensions[ext] || 'text/html';

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
var wsServer = new WebSocketServer({ server: server });

wsServer.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);
	});
});