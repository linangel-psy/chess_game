"use strict";

//variables
var webSocketsServerPort = 1337;
var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require("path"); 
var fs = require('fs');
var lastMoveColor = '';
var lastMove = {};
var games = {};
var userId = 0;
var faces = ['&#128045;', '&#128046;', '&#128047;', '&#128048;', '&#128049;', '&#128054;', '&#128053;', '&#128055;', '&#128056;', '&#128057;', '&#128059;', '&#128060;', '&#128052;'];

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
	userId += 1
	ws.info = {id: 'user_' + userId, face: faces[Math.floor(Math.random()*faces.length)]};
	ws.send(JSON.stringify({"type": "newGame", "message": games}));
	
	// send user list to clients on new connection
	sendUsers();

	ws.on('message', function incoming(message) {
		message = JSON.parse(message);

		// send board to clients
		if (message.type == 'board') {
			games[message.gameName].chessSymbolsGame = message.message;
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "board", "message": games[message.gameName].chessSymbolsGame}));
			});
		}

		// send last move to clients
		else if (message.type == 'move') {
			games[message.gameName].lastMove = message.message;
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "move", "message": games[message.gameName].lastMove}));
			});
		}

		else if (message.type == 'captured') {
			var color = chessSymbols[message.message].color;
			var symbol = chessSymbols[message.message].symbol;
			games[message.gameName].captured[color].push(symbol);
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "captured", "message": games[message.gameName].captured}));
			});
		}

		// send last move color to clients
		else if (message.type == 'color') {
			games[message.gameName].lastMoveColor = message.message;
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "color", "message": games[message.gameName].lastMoveColor}));
			});
		}

		// when new game created send games list to clients and board for first client
		else if (message.type == 'createGame') {
			if (!(message.message in games)) {
				games[message.message] = {"white": ws.info.id, "black": null, "observers": [], "chessSymbolsGame": chessSymbols, "lastMove": null, "lastMoveColor": "black", "captured": {"white": [], "black": []}};
				sendGames();
				ws.send(JSON.stringify({"type": "userColor", "message": "white"}));
				ws.send(JSON.stringify({"type": "gameName", "message": message.message}));
				sendBoard(ws, message.message);				
				clientsList();
			}
			else {
				ws.send(JSON.stringify({"type": "nameError", "message": "Game with this name exists"}));
			}
		}
		else if (message.type == 'openGame') {
			if (canOpenGame(ws, message.message)) {
				clientsList();
				sendUsers();
				sendBoard(ws, message.message);
				ws.send(JSON.stringify({"type": "move", "message": games[message.message].lastMove}));
				ws.send(JSON.stringify({"type": "gameName", "message": message.message}));
				ws.send(JSON.stringify({"type": "color", "message": games[message.message].lastMoveColor}));
				ws.send(JSON.stringify({"type": "captured", "message": games[message.message].captured}));

				if (!games[message.message].white && games[message.message].black != ws.info.id) {
					games[message.message].white = ws.info.id;
					ws.send(JSON.stringify({"type": "userColor", "message": "white"}));
				}
				else if (!games[message.message].black && games[message.message].white != ws.info.id) {
					games[message.message].black = ws.info.id;
					ws.send(JSON.stringify({"type": "userColor", "message": "black"}));
				}
				else {
					if (games[message.message].observers.indexOf(ws.info.id) == -1 && games[message.message].white != ws.info.id && games[message.message].black != ws.info.id) {
						games[message.message].observers.push(ws.info.id);
						ws.send(JSON.stringify({"type": "userColor", "message": null}));
					}
				}
				sendGames();
			}
		}
	});

	ws.on('close', function() {
		var id = ws.info.id;
		clientsList();
		sendUsers();
		for (var key in games) {
			if (games[key].white === id) {
				games[key].white = null;
			}
			else if (games[key].black === id) {
				games[key].black = null;
			}
			else if (games[key].observers.indexOf(id) != -1) {
				var index = games[key].observers.indexOf(id);
				games[key].observers.splice(index, 1);
			}
			if (games[key].white === null && games[key].black === null) {
				sendList(key).forEach(function each(client) {
					client.send(JSON.stringify({"type": "board", "message": {}}));
					client.send(JSON.stringify({"type": "move", "message": null}));
					client.send(JSON.stringify({"type": "captured", "message": {"white": [], "black": []}}));
				});
				delete games[key];
			}
		sendGames();
		}
	})

});

var sendList = function(gameName) {
	var idList = games[gameName].observers.slice();
	if (games[gameName].white) {
		idList.push(games[gameName].white);
	}
	if (games[gameName].black) {
		idList.push(games[gameName].black);
	}
	var list = [];
	wsServer.clients.forEach(function each(client) {
		if(idList.indexOf(client.info.id) != -1) {
			list.push(client)
		}
	});
	return list;
}
var sendBoard = function(ws, gameName) {
	ws.send(JSON.stringify({"type": "board", "message": games[gameName].chessSymbolsGame}));
	ws.send(JSON.stringify({"type": "color", "message": games[gameName].lastMoveColor}));
}
var sendGames = function() {
	wsServer.clients.forEach(function each(client) {
		client.send(JSON.stringify({"type": "newGame", "message": games}));
	});
}
var sendUsers = function() {
	wsServer.clients.forEach(function each(client) {
		client.send(JSON.stringify({"type": "clients", "message": clientsList()}));
	});
}
var canOpenGame = function(ws, gameName) {
	var list = sendList(gameName);
	for (var i = 0; i < list.length; i++) {
		if (ws === list[i]){
			return false;
		}
	}
	return true;
}

// create user list
var clientsList = function() {
	var clients = [];
	wsServer.clients.forEach(function each(client) {
		clients.push({id: client.info.id, face: client.info.face});
	});
	return clients;
}
