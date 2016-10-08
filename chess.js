//variables
var size = 8;
var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
var drag = false;
var X, Y, lastCellClick, lastMoveColor, myColor, gameName;
var movesList = {};
var chessSymbolsGame = {};

//create chess board
for (var i = size; i >= 0; i--) {
	if (i != 0) {
		$('.board').append('<tr class="board-row row-' + i + '"></tr>');
		$('.row-' + i).append('<td class="board-num">' + i + '</td>');
		$.each(letters, function(num, letter) {
			$('.row-' + i).append('<td class="board-cell" id="' + letter + i + '"></td>');
		});
	}
	else {
		$('.board').append('<tr class="board-row-num"></tr>');
		$('.board-row-num').append('<td class="board-num"></td>');
		$.each(letters, function(num, letter) {
			$('.board-row-num').append('<td class="board-num">' + letter + '</td>');
		});
	}
};

// create status board
var createStatusBoard = function(moves) {
	$('.status-board').html('');
	if (moves) {
		var length = moves['white'].length;
		for (var i = 1; i <= length; i++) {
			var black = moves.black[i - 1] || '';
			$('.status-board').append('<tr class="status-board-row row_' + i + '"></tr>');
			$('.row_' + i).append('<td class="status-board-cell cell-num">'  + i + '</td>');
			$('.row_' + i).append('<td class="status-board-cell">' + moves.white[i - 1] + '</td>');
			$('.row_' + i).append('<td class="status-board-cell cell-black">' + black + '</td>');
		}
	}
}

// symbols on board
var setSymbols = function() {
	$('.board-cell').html('');
	$.each (chessSymbolsGame, function(name, value){
		$.each(value.position, function(k, id) {
			$('#' + id).append('<div class="chess-symbol"></div>');
			$('#' + id).find('.chess-symbol').html(value.symbol).addClass(name).data({'type': value.type, 'name': name, 'color': value.color});
		})
	})
}

// on mousedown on chess board show possible moves
$('.board-cell').mousedown(function() {
	drag = true;
	if ($(event.target).hasClass('chess-symbol') && $(event.target).data('color') != lastMoveColor && $(event.target).data('color') != '' && $(event.target).data('color') == myColor) {
		var cellId = $(event.target).parent('.board-cell')[0].id;
		var symbolId = $(event.target).data('name');
		var top = event.target.offsetTop;
		var left = event.target.offsetLeft;
		Y = top - event.pageY;
		X = left - event.pageX;
		$(event.target).css({'position': 'absolute', 'top': top, 'left': left}).addClass('active');
		var possibleMovesIds = possibleMoves(cellId);
		$.each(possibleMovesIds.moves, function() {
			$('#' + this + ':not(#' + cellId +')').addClass('possible-move');
		});
		$.each(possibleMovesIds.captures, function() {
			$('#' + this + ':not(#' + cellId +')').addClass('possible-captures');
		});
	}
	else {
		var cellId = event.target.id;
		var symbolId = '';
	}
	lastCellClick = cellId;
});

// on mouseup on chess board send move information to server or do nothing
$('.board-cell').mouseup(function() {
	drag = false;
	var name = $('.chess-symbol.active').data('name');
	var newPosition = getElementByPosition(event.pageX, event.pageY);
	var captured = ''
	if ($.inArray(newPosition, movesList['moves']) != -1 || $.inArray(newPosition, movesList['captures']) != -1) {

		// send last move color to server
		var color = $('.chess-symbol.active').data('color');
		ws.send(JSON.stringify({"type": "color", "gameName": gameName, "message": color}));

		//create new board
		var lastCellClickPos = $.inArray(lastCellClick, chessSymbolsGame[name].position);
		if (lastCellClickPos != -1) {
			// remove captured symbol
			if ($('#' + newPosition).find('.chess-symbol').length != 0) {
				var removeName = $('#' + newPosition).find('.chess-symbol').data('name');
				var index = chessSymbolsGame[removeName].position.indexOf(newPosition);
				chessSymbolsGame[removeName].position.splice(index, 1);
				captured = 'x'
			}
			chessSymbolsGame[name].position[lastCellClickPos] = newPosition;
		}

		// send board to server
		ws.send(JSON.stringify({"type": "board", "gameName": gameName, "message": chessSymbolsGame}));

		// send last move to server
		var lastMoveServer = {"name": name, "newPosition": newPosition, "captured": captured};
		ws.send(JSON.stringify({"type": "move", "gameName": gameName, "message": lastMoveServer}));

		// board changes on client
		$('#' + newPosition).remove('.chess-symbol');
		$('.chess-symbol.active').appendTo('#' + newPosition);
	}
	else {
		$('#' + lastCellClick).append($('.chess-symbol.active'));
		movesList = {};
	}

	$('.chess-symbol').removeAttr('style').removeClass('active');
	$('.board-cell').removeClass('possible-move');
	$('.board-cell').removeClass('possible-captures');
});

// on mousemove move symbol
$('.board-cell').mousemove(function(e) {
	$('.chess-symbol.active').css({'top': event.pageY + Y, 'left': event.pageX + X});
});

// on mouseleave from chess board stop symbol moving
$('.board').mouseleave(function(e) {
	drag = false;
});

// create new game and send to server or show/hide warning message
$('.create-game').click(function(e) {
	gameName = $('#gameName').val();
	if (gameName) {
		ws.send(JSON.stringify({"type": "createGame", "message": gameName}));
	}
	else {
		$('.warning-message').text('Enter game name');
	}
});
$('#gameName').on('input', function(e) {
	$('.warning-message').text('');
});

//open selected game
$('.game-list').click(function(e) {
	var name = e.target.id || $(e.target).parent()[0].id;
	ws.send(JSON.stringify({"type": "openGame", "message": name}));
});

// get id of element by mouse position
var getElementByPosition = function(x, y) {
	var element;
	$('.board-cell').each(function() {
		var position = $(this).offset();
		var cellSize = $(this).width() + 1;
		var top = position.top + 1;
		var left = position.left + 1;
		var bottom = top + cellSize;
		var right = left + cellSize;
		if (x >= left && x < right && y >= top && y < bottom ) {
			element = this.id;
		}
	});
	return element;
};

// calculate possible moves
var possibleMoves = function(id) {
	movesList = {moves: [], captures: []};
	var idArr = id.split('');
	var type = $('#' + id).find('.chess-symbol').data('type');
	if (type === 'queen') {
		var directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
		for (var i = 0; i < directions.length; i++) {
			for (var j = 1; j < size; j++) {
				var letterNum = letters.indexOf(idArr[0]) + directions[i][0] * j;
				var num = parseInt(idArr[1]) + directions[i][1] * j;
				var newPosition = letters[letterNum] + num;
				if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
					movesList['moves'].push(newPosition);
				}
				else if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
					movesList['captures'].push(newPosition);
					break;
				}
				else {
					break;
				}
			}
		}
	}
	else if (type === 'pawn') {
		var color = $('#' + id).find('.chess-symbol').data('color');
		var length = (idArr[1] === '2' || idArr[1] === '7') ? 2 : 1;
		for (var i = 1; i <= length; i++) {
			var newPosition = (color === 'white') ? idArr[0] + (parseInt(idArr[1]) + i) : idArr[0] + (parseInt(idArr[1]) - i);
			if ($('#' + newPosition).find('.chess-symbol').length === 0) {
				movesList['moves'].push(newPosition);
			}
			else {
				break;
			}
		}
		var directions = (color === 'white') ? [[1, 1], [-1, 1]] : [[1, -1], [-1, -1]];
		for (var i = 0; i < directions.length; i++) {
			var letterNum = letters.indexOf(idArr[0]) + directions[i][0];
			var num = parseInt(idArr[1]) + directions[i][1];
			var newPosition = letters[letterNum] + num;
			if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
				movesList['captures'].push(newPosition);
			}
		}
	}
	else if (type === 'knight') {
		var directions = [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
		for (var i = 0; i < directions.length; i++) {
			var letterNum = letters.indexOf(idArr[0]) + directions[i][0];
			var num = parseInt(idArr[1]) + directions[i][1];
			var newPosition = letters[letterNum] + num;
			if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
				movesList['moves'].push(newPosition);
			}
			else if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
				movesList['captures'].push(newPosition);
			}
		}
	}
	else if (type === 'bishop') {
		var directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
		for (var i = 0; i < directions.length; i++) {
			for (var j = 1; j < size; j++) {
				var letterNum = letters.indexOf(idArr[0]) + directions[i][0] * j;
				var num = parseInt(idArr[1]) + directions[i][1] * j;
				var newPosition = letters[letterNum] + num;
				if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
					movesList['moves'].push(newPosition);
				}
				else if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
					movesList['captures'].push(newPosition);
					break;
				}
				else {
					break;
				}
			}
		}
	}
	else if (type === 'rook') {
		var directions = [[0, 1], [0, -1], [-1, 0], [1, 0]];
		for (var i = 0; i < directions.length; i++) {
			for (var j = 1; j < size; j++) {
				var letterNum = letters.indexOf(idArr[0]) + directions[i][0] * j;
				var num = parseInt(idArr[1]) + directions[i][1] * j;
				var newPosition = letters[letterNum] + num;
				if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
					movesList['moves'].push(newPosition);
				}
				else if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
					movesList['captures'].push(newPosition);
					break;
				}
				else {
					break;
				}
			}
		}
	}
	else if (type === 'king') {
		var directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
		for (var i = 0; i < directions.length; i++) {
			var letterNum = letters.indexOf(idArr[0]) + directions[i][0];
			var num = parseInt(idArr[1]) + directions[i][1];
			var newPosition = letters[letterNum] + num;
			if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
				movesList['moves'].push(newPosition);
			}
			else if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length != 0 && $('#' + newPosition).find('.chess-symbol').data('color') != myColor) {
				movesList['captures'].push(newPosition);
			}
		}
	}
	return movesList;
};

// blinking text!
var blink = function() {
	$('.move-message').fadeTo('slow', 0.3).fadeTo('slow', 1.0);
};
setInterval(function(){blink()}, 3000);

// 
var setCookie = function(name, value) {
	deleteCookie(name);
	document.cookie = name + '=' + value;
};
var deleteCookie = function(name) {
	document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};
var getCookie = function(name) {
	var x, y;
	var cookiesArr = document.cookie.split(";");

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

// connection with server
var reconnect = function() {
	var url = 'ws://' + location.host + '/ws';
	ws = new WebSocket(url);
	ws.onopen = function(ev) {
		var name = getCookie('gameName')
		if (name) {
			ws.send(JSON.stringify({"type": "openGame", "message": name}));
		}
	};

	ws.onmessage = function(ev) {
		var serverMessage = (JSON.parse(ev.data));

		// set symbols on board from server message
		if (serverMessage.type == 'userName') {
			$.each(serverMessage.message, function(name, value) {
				setCookie(name, value);
			});
		}
		else if (serverMessage.type == 'board') {
			chessSymbolsGame = serverMessage.message;
			setSymbols();
		}

		// set text on status board from server message
		else if (serverMessage.type == 'move') {
			createStatusBoard(serverMessage.message)
		}

		// set color of last move from server message
		else if (serverMessage.type == 'color') {
			lastMoveColor = serverMessage.message;
			if (myColor && myColor != lastMoveColor && myColor != null) {
				$('.move-message').html('Your move!');
			}
			else {
				$('.move-message').html('');
			}
		}

		// show avaliable games from server message
		else if (serverMessage.type === 'newGame') {
			$('.game-list').html('');
			$.each(serverMessage.message, function(name, value) {
				$('.game-list').append('<div class="game-link" id="' + name + '"><span class="pic">&#127937;</span>' + name + '</div>');
				$('.game-link#' + name).append('<div class="game-user label">Players</div>')
				if (value.white) {
					$('.game-link#' + name).append('<div class="game-user">' + value.white + '</div>')
				}
				if (value.black) {
					$('.game-link#' + name).append('<div class="game-user">' + value.black + '</div>')
				}
				if (value.observers) {
					$('.game-link#' + name).append('<div class="game-user label">Observers</div>')
					$.each(value.observers, function() {
						$('.game-link#' + name).append('<div class="game-user">' + this + '</div>')
					})
				}
			});
		}

		// show users online from server message
		else if (serverMessage.type === 'clients') {
			$('.users-list').html('');
			$.each(serverMessage.message, function(index, value) {
				$('.users-list').append('<div class="user-link" id="' + value.id + '"><span class="pic">' + value.face + '</span>' + value.id + '</div>');
			})
		}

		// set user color in game from server message
		else if (serverMessage.type === 'userColor') {
			myColor = serverMessage.message;
			if (myColor) {
				$('.user-role').html('You are ' + myColor + ' player');
			}
			else {
				$('.user-role').html('You are an observer');
			}
		}

		// set name of the game from server message
		else if (serverMessage.type === 'gameName') {
			gameName = serverMessage.message;
			if (gameName) {
				$('.game-label').html('Game: ' + serverMessage.message);
				$('#gameName').val('');
				setCookie('gameName', gameName);
			}
			else {
				$('.game-label').html('');
				$('.user-role').html('');
				setCookie('gameName', '');
			}
		}
		else if (serverMessage.type === 'nameError') {
			$('.warning-message').text(serverMessage.message);
		}
	};
}();

//document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });