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
	var data = [];
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
	data.push({'.coordinates': event.pageX + ', ' + event.pageY}, {'.move-cell': cellId});
	if (symbolId != '') {
		data.push({'.click-cell': symbolId + ' on ' + cellId});
	}
	else {
		data.push({'.click-cell': cellId});
	}
	setText(data);
	lastCellClick = cellId;
});

// on mouseup on chess board send move information to server or do nothing
$('.board-cell').mouseup(function() {
	drag = false;
	var name = $('.chess-symbol.active').data('name');
	var newPosition = getElementByPosition(event.pageX, event.pageY);
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
				ws.send(JSON.stringify({"type": "captured", "gameName": gameName, "message": removeName}));
			}
			chessSymbolsGame[name].position[lastCellClickPos] = newPosition;
		}

		// send board to server
		ws.send(JSON.stringify({"type": "board", "gameName": gameName, "message": chessSymbolsGame}));

		// send last move to server
		var lastMoveServer = {"name": name, "prevPosition": lastCellClick, "newPosition": newPosition}
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

// on mousemove on chess board show mouse coordinates
$('.board-cell').mousemove(function(e) {
	var data = [];
	if (drag) {
		var cellId = getElementByPosition(event.pageX, event.pageY);
		data.push({'.coordinates': event.pageX + ', ' + event.pageY}, {'.move-cell': cellId});
	}
	else {
		data.push({'.coordinates': ''}, {'.move-cell': ''});
	}
	setText(data);
	$('.chess-symbol.active').css({'top': event.pageY + Y, 'left': event.pageX + X});
});

// on mouseleave from chess board stop symbol moving
$('.board').mouseleave(function(e) {
	drag = false;
	var data = [];
	data.push({'.coordinates': ''}, {'.move-cell': ''});
	setText(data);
});

// show/hide pop-up to add new game
$('.show-popup').click(function(e) {
	$('.create-game-popup').removeClass('hidden');
});
$('.close-popup').click(function(e) {
	$('.create-game-popup').addClass('hidden');
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

//  set text on status board
var setText = function(data) {
	$.each(data, function(index, value) {
		$.each(value, function(className, text) {
			$(className).text(text);
		})	
	})
};

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

// connection with server
var reconnect = function() {
	var url = 'ws://' + location.host + '/ws';
	ws = new WebSocket(url);
	ws.onopen = function(ev) {
		
	};

	ws.onmessage = function(ev) {
		var serverMessage = (JSON.parse(ev.data));

		// set symbols on board from server message
		if (serverMessage.type == 'board') {
			chessSymbolsGame = serverMessage.message;
			setSymbols();
		}

		// set text on status board from server message
		else if (serverMessage.type == 'move') {
			if (serverMessage.message) {
				var lastMove = serverMessage.message['name'] + ': ' + 
					serverMessage.message['prevPosition'] + ' - ' + 
					serverMessage.message['newPosition'];
				var lastClick = serverMessage.message['name'] + ': ' + 
					serverMessage.message['prevPosition'];
				var data = [{'.last-move': lastMove}, {'.click-cell': lastClick}];
			}
			// clear status board if game was deleted
			else {
				var data = [{'.last-move': ''}, {'.click-cell': ''}];
				$('.game-label').html('');
				$('.user-role').html('');
			}
			setText(data);
		}

		else if (serverMessage.type == 'captured') {
			$('.white-captured').html('');
			if (serverMessage.message['white'].length > 0) {
				$.each(serverMessage.message['white'], function() {
					$('.white-captured').append('<span>' + this + '</span>');
				});
			}
			$('.black-captured').html('');
			if (serverMessage.message['black'].length > 0) {
				$.each(serverMessage.message['black'], function() {
					$('.black-captured').append('<span>' + this + '</span>');
				});
			}
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
			$('.create-game-popup').addClass('hidden');
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
			console.log(myColor);
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
			console.log(gameName);
			$('.game-label').html('Game: ' + serverMessage.message);
		}
		else if (serverMessage.type === 'nameError') {
			$('.warning-message').text(serverMessage.message);
		}
	};
}();