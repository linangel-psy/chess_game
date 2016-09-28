"use strict";

var webSocketsServerPort = 1337;
var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require("path"); 
var fs = require('fs');
var lastMoveColor = "black";
var lastMove = {};

var chessSymbols = {
	"White Queen": {
		"symbol": "\u2655",
		"type": "queen",
		"color": "white",
		"position": ["D1"]
	},
	"White Pawn": {
		"symbol": "\u2659",
		"type": "pawn",
		"color": "white",
		"position": ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2"]
	},
	"White Knight": {
		"symbol": "\u2658",
		"type": "knight",
		"color": "white",
		"position": ["B1", "G1"]
	},
	"White Bishop": {
		"symbol": "\u2657",
		"type": "bishop",
		"color": "white",
		"position": ["C1", "F1"]
	},
	"White Rook": {
		"symbol": "\u2656",
		"type": "rook",
		"color": "white",
		"position": ["A1", "H1"]
	},
	"White King": {
		"symbol": "\u2654",
		"type": "king",
		"color": "white",
		"position": ["E1"]
	},

	"Black Queen": {
		"symbol": "\u265B",
		"type": "queen",
		"color": "black",
		"position": ["D8"]
	},
	"Black Pawn": {
		"symbol": "\u265F",
		"type": "pawn",
		"color": "black",
		"position": ["A7", "B7", "C7", "D7", "E7", "F7", "G7", "H7"]
	},
	"Black Knight": {
		"symbol": "\u265E",
		"type": "knight",
		"color": "black",
		"position": ["B8", "G8"]
	},
	"Black Bishop": {
		"symbol": "\u265D",
		"type": "bishop",
		"color": "black",
		"position": ["C8", "F8"]
	},
	"Black Rook": {
		"symbol": "\u265C",
		"type": "rook",
		"color": "black",
		"position": ["A8", "H8"]
	},
	"Black King": {
		"symbol": "\u265A",
		"type": "king",
		"color": "black",
		"position": ["E8"]
	},
};

var chessSymbolsGame = chessSymbols;

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
	ws.send(JSON.stringify({"type": "board", "message": chessSymbolsGame}));
	ws.send(JSON.stringify({"type": "color", "message": lastMoveColor}));
	ws.send(JSON.stringify({"type": "move", "message": lastMove}));
	ws.on('message', function incoming(message) {
		message = JSON.parse(message);
		if (message.type == 'board') {
			chessSymbolsGame = message.message;
			wsServer.clients.forEach(function each(client) {
				client.send(JSON.stringify({"type": "board", "message": chessSymbolsGame}));
			});
		}
		if (message.type == 'move') {
			lastMove = message.message;
			wsServer.clients.forEach(function each(client) {
				client.send(JSON.stringify({"type": "move", "message": lastMove}));
			});
		}
		if (message.type == 'color') {
			lastMoveColor = message.message;
			wsServer.clients.forEach(function each(client) {
				client.send(JSON.stringify({"type": "color", "message": lastMoveColor}));
			});
		}
	});
});

