"use strict";

//variables
var webSocketsServerPort = 1337;
var WebSocketServer = require('ws').Server;
var http = require('http');
var path = require("path"); 
var fs = require('fs');
var games = {};
var faces = ['&#128045;', '&#128046;', '&#128047;', '&#128048;', '&#128049;', '&#128054;', '&#128053;', '&#128055;', '&#128056;', '&#128057;', '&#128059;', '&#128060;', '&#128052;'];

var chessSymbols = {
	"White Queen": {
		"symbol": "\u2655",
		"type": "queen",
		"short": "Q",
		"color": "white",
		"position": ["D1"]
	},
	"White Pawn": {
		"symbol": "\u2659",
		"type": "pawn",
		"short": "",
		"color": "white",
		"position": ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2"]
	},
	"White Knight": {
		"symbol": "\u2658",
		"type": "knight",
		"short": "N",
		"color": "white",
		"position": ["B1", "G1"]
	},
	"White Bishop": {
		"symbol": "\u2657",
		"type": "bishop",
		"short": "B",
		"color": "white",
		"position": ["C1", "F1"]
	},
	"White Rook": {
		"symbol": "\u2656",
		"type": "rook",
		"short": "R",
		"color": "white",
		"position": ["A1", "H1"]
	},
	"White King": {
		"symbol": "\u2654",
		"type": "king",
		"short": "K",
		"color": "white",
		"position": ["E1"]
	},

	"Black Queen": {
		"symbol": "\u265B",
		"type": "queen",
		"short": "Q",
		"color": "black",
		"position": ["D8"]
	},
	"Black Pawn": {
		"symbol": "\u265F",
		"type": "pawn",
		"short": "",
		"color": "black",
		"position": ["A7", "B7", "C7", "D7", "E7", "F7", "G7", "H7"]
	},
	"Black Knight": {
		"symbol": "\u265E",
		"type": "knight",
		"short": "N",
		"color": "black",
		"position": ["B8", "G8"]
	},
	"Black Bishop": {
		"symbol": "\u265D",
		"type": "bishop",
		"short": "B",
		"color": "black",
		"position": ["C8", "F8"]
	},
	"Black Rook": {
		"symbol": "\u265C",
		"type": "rook",
		"short": "R",
		"color": "black",
		"position": ["A8", "H8"]
	},
	"Black King": {
		"symbol": "\u265A",
		"type": "king",
		"short": "K",
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
	if (ws.upgradeReq.headers.cookie) {
		var id = parseCookie('userName', ws.upgradeReq.headers.cookie);
		var face = parseCookie('face', ws.upgradeReq.headers.cookie);
	}
	else {
		var userId = randomId();
		var id = 'user_' + userId;
		var face = faces[Math.floor(Math.random() * faces.length)]
	}

	// send user list to clients on new connection
	ws.info = {id: id, face: face};
	ws.send(JSON.stringify({"type": "newGame", "message": games}));
	ws.send(JSON.stringify({"type": "userName", "message": {"userName": ws.info.id, "face": ws.info.face}}));
	sendUsers();

	ws.on('message', function incoming(message) {
		message = JSON.parse(message);

		// send board to clients
		if (message.type == 'board') {
			var gn = games[message.gameName];
			gn.chessSymbolsGame = message.message;
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "board", "message": gn.chessSymbolsGame}));
			});
		}

		// send last move to clients message = {"name": name, "newPosition": newPosition}
		else if (message.type == 'move') {
			var gn = games[message.gameName];
			var color = chessSymbols[message.message.name].color;
			var short = chessSymbols[message.message.name].short;
			gn.moves[color].push(short + message.message.captured + message.message.newPosition);
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "move", "message": gn.moves}));
			});
		}

		// send last move color to clients
		else if (message.type == 'color') {
			var gn = games[message.gameName];
			gn.lastMoveColor = message.message;
			sendList(message.gameName).forEach(function each(client) {
				client.send(JSON.stringify({"type": "color", "message": gn.lastMoveColor}));
			});
		}

		// when new game created send games list to clients and board for first client
		else if (message.type == 'createGame') {
			if (!(message.message in games)) {
				var g = games[message.message] = {"white": ws.info.id, "black": null, "observers": [], "chessSymbolsGame": chessSymbols, "moves": {"white": [], "black": []}, "lastMoveColor": "black"};
				sendGames();
				ws.send(JSON.stringify({"type": "userColor", "message": "white"}));
				ws.send(JSON.stringify({"type": "gameName", "message": message.message}));
				ws.send(JSON.stringify({"type": "board", "message": g.chessSymbolsGame}));
				ws.send(JSON.stringify({"type": "color", "message": g.lastMoveColor}));
				clientsList();
			}
			else {
				ws.send(JSON.stringify({"type": "nameError", "message": "Game with this name exists"}));
			}
		}
		else if (message.type == 'openGame') {
			var g = games[message.message];
			if (g) {
				clientsList();
				sendUsers();
				ws.send(JSON.stringify({"type": "board", "message": g.chessSymbolsGame}));
				ws.send(JSON.stringify({"type": "color", "message": g.lastMoveColor}));
				ws.send(JSON.stringify({"type": "gameName", "message": message.message}));
				ws.send(JSON.stringify({"type": "move", "message": g.moves}));

				if ((!g.white && g.black != ws.info.id) || g.white === ws.info.id) {
					g.white = ws.info.id;
					ws.send(JSON.stringify({"type": "userColor", "message": "white"}));
				}
				else if ((!g.black && g.white != ws.info.id) || g.black === ws.info.id) {
					g.black = ws.info.id;
					ws.send(JSON.stringify({"type": "userColor", "message": "black"}));
				}
				else {
					if (g.observers.indexOf(ws.info.id) == -1 && g.white != ws.info.id && g.black != ws.info.id) {
						g.observers.push(ws.info.id);
						ws.send(JSON.stringify({"type": "userColor", "message": null}));
					}
				}
				ws.send(JSON.stringify({"type": "color", "message": g.lastMoveColor}));
				sendGames();
			}
		}
	});

	ws.on('close', function() {
		var id = ws.info.id;
		clientsList();
		sendUsers();
		var userExists = false;
		setTimeout(function(){ 
			wsServer.clients.forEach(function each(client) {
				if (client.info.id === ws.info.id) {
					userExists = true;
				}
			});
			if (!userExists) {
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
							client.send(JSON.stringify({"type": "gameName", "message": null}));
						});
						delete games[key];
					}
					sendUsers();
					sendGames();
				}
			}
		}, 3000);
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

// create user list
var clientsList = function() {
	var clients = [];
	wsServer.clients.forEach(function each(client) {
		clients.push({id: client.info.id, face: client.info.face});
	});
	return clients;
}

// parse cookie
var parseCookie = function(name, cookie) {
	var x, y;
	var cookiesArr = cookie.split(";");

	for (var i = 0;i < cookiesArr.length; i++) {
		x = cookiesArr[i].substr(0, cookiesArr[i].indexOf("="));
		y = cookiesArr[i].substr(cookiesArr[i].indexOf("=") + 1);
		x = x.replace(/^\s+|\s+$/g,"");
		if (x == name) {
			return unescape(y);
		}
	}
	return null;
};

var randomId = function() {
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
	var length = 8;
	var str = '';
	for (var i = 0; i < length; i++) {
		str += chars[Math.floor(Math.random() * chars.length)];
	}
	return str;
}