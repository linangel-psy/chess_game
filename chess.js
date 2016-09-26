//variables

var size = 8;
var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
var drag = false;
var X, Y, lastCellClick;
var movesList = [];
var lastMoveColor = 'black';
var drag = false;

var chessSymbols = {
	'White Queen': {
		symbol: '\u2655',
		type: 'queen',
		color: 'white',
		position: ['D1']
	},
	'White Pawn': {
		symbol: '\u2659',
		type: 'pawn',
		color: 'white',
		position: ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2']
	},
	'White Knight': {
		symbol: '\u2658',
		type: 'knight',
		color: 'white',
		position: ['B1', 'G1']
	},
	'White Bishop': {
		symbol: '\u2657',
		type: 'bishop',
		color: 'white',
		position: ['C1', 'F1']
	},
	'White Rook': {
		symbol: '\u2656',
		type: 'rook',
		color: 'white',
		position: ['A1', 'H1']
	},
	'White King': {
		symbol: '\u2654',
		type: 'king',
		color: 'white',
		position: ['E1']
	},

	'Black Queen': {
		symbol: '\u265B',
		type: 'queen',
		color: 'black',
		position: ['D8']
	},
	'Black Pawn': {
		symbol: '\u265F',
		type: 'pawn',
		color: 'black',
		position: ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7']
	},
	'Black Knight': {
		symbol: '\u265E',
		type: 'knight',
		color: 'black',
		position: ['B8', 'G8']
	},
	'Black Bishop': {
		symbol: '\u265D',
		type: 'bishop',
		color: 'black',
		position: ['C8', 'F8']
	},
	'Black Rook': {
		symbol: '\u265C',
		type: 'rook',
		color: 'black',
		position: ['A8', 'H8']
	},
	'Black King': {
		symbol: '\u265A',
		type: 'king',
		color: 'black',
		position: ['E8']
	},
};

var chessSymbolsGame = $.extend(true, {}, chessSymbols);

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

//symbols on board

$.each (chessSymbolsGame, function(name, value){
	$.each(value.position, function(k, id) {
		$('#' + id).append('<div class="chess-symbol"></div>');
		$('#' + id).find('.chess-symbol').html(value.symbol).addClass(name).data({'type': value.type, 'name': name, 'color': value.color});
	})
})



$('.board-cell').mousedown(function() {
	drag = true;
	var data = [];
	if ($(event.target).hasClass('chess-symbol') && $(event.target).data('color') != lastMoveColor) {
		var cellId = $(event.target).parent('.board-cell')[0].id;
		var symbolId = $(event.target).data('name');
		var top = event.target.offsetTop;
		var left = event.target.offsetLeft;
		Y = top - event.pageY;
		X = left - event.pageX;
		$(event.target).css({'position': 'absolute', 'top': top, 'left': left}).addClass('active');
		var possibleMovesIds = possibleMoves(cellId);
		$.each(possibleMovesIds, function() {
			$('#' + this + ':not(#' + cellId +')').addClass('possible-move');
		})
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
$('.board-cell').mouseup(function() {
	drag = false;
	var data = [];
	var lastMove = '';
	var name = $('.chess-symbol.active').data('name');
	data.push({'.coordinates': ''}, {'.move-cell': ''});
	var newPosition = getElementByPosition(event.pageX, event.pageY);
	if ($.inArray(newPosition, movesList) != -1) {
		$('#' + newPosition).append($('.chess-symbol.active'))
		lastMove = name + ': ' + lastCellClick + ' - ' + newPosition;
		data.push({'.last-move': lastMove});
		lastMoveColor = $('.chess-symbol.active').data('color');

		//sent lastMove to server
		ws.send(lastMove);
	}
	else {
		$('#' + lastCellClick).append($('.chess-symbol.active'));
		movesList = [];
	}

	$('.chess-symbol').removeAttr('style').removeClass('active');
	$('.board-cell').removeClass('possible-move');
	
	setText(data);
});
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
$('.board').mouseleave(function(e) {
	drag = false;
	var data = [];
	data.push({'.coordinates': ''}, {'.move-cell': ''});
	setText(data);
});

var setText = function(data) {
	$.each(data, function(index, value) {
		$.each(value, function(className, text) {
			$(className).text(text);
		})	
	})
};
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

var possibleMoves = function(id) {
	movesList = [];
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
					movesList.push(newPosition);
				}
				else {
					break;
				}
			}
		}
	}
	else if (type === 'pawn') {
		var color = $('#' + id).find('.chess-symbol').data('color');
		if (color === 'white') {
			var newPosition = idArr[0] + (parseInt(idArr[1]) + 1);
		}
		else {
			var newPosition = idArr[0] + (parseInt(idArr[1]) - 1);
		}
		if ($('#' + newPosition).find('.chess-symbol').length === 0) {
			movesList.push(newPosition);
		}
	}
	else if (type === 'knight') {
		var directions = [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
		for (var i = 0; i < directions.length; i++) {
			var letterNum = letters.indexOf(idArr[0]) + directions[i][0];
			var num = parseInt(idArr[1]) + directions[i][1];
			var newPosition = letters[letterNum] + num;
			if (letterNum >= 0 && letterNum < size && num > 0 && $('#' + newPosition).find('.chess-symbol').length === 0) {
				movesList.push(newPosition);
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
					movesList.push(newPosition);
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
					movesList.push(newPosition);
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
				movesList.push(newPosition);
			}
		}
	}
	return movesList;
}

//connection with server
var reconnect = function() {
	var url = 'ws://' + location.host + '/ws';
	ws = new WebSocket(url);
	ws.onopen = function(ev) {
		
	};
	ws.onmessage = function(ev) {
		console.log('message: ', ev.data);
	};
}();