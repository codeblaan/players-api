const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
console.log('PORT:', PORT);
const wss = new WebSocket.Server({ port: PORT });

let i = 0;
let matches = {};

function addToMatch(ws) {
  if (matches[i] === undefined) {
    matches[i] = {
      players: [ws],
    };
    send(ws, {event: 'AWAITING_PLAYER', id: i});
  } else {
    if (matches[i].players.length === 1) {
      matches[i].players.push(ws);
      matches[i].players.forEach((player, j) => {
        send(player, {event: 'CONNECTED', id: i, playerNumber: j});
      })
    } else {
      i++;
      matches[i] = {
        players: [ws]
      };
      send(ws, {event: 'AWAITING_PLAYER', id: i});
    }
  }
}

function send(ws, obj) {
  ws.send(JSON.stringify(obj));
}

wss.on('connection', ws => {
  addToMatch(ws);

  ws.on('message', message => {
    try {
      let data = JSON.parse(message);
      console.log(data);
      if (matches[data.id] !== undefined) {
        let nextPlayer = (data.playerNumber + 1) % matches[data.id].players.length;
        send(matches[data.id].players[nextPlayer], {
          event: 'ACTIVE_TURN',
          board: data.board
        });
      }
    } catch (err) {
      console.log(err);
    }
  });
  console.log(matches);
});
