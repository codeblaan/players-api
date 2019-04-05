const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log('PORT:', PORT);

const SOCKET_REFRESH_RATE = 30000;
const TOTAL_PLAYERS = 2;

const matches = {};
let matchId = 0;

const EVENT = {
  'ACTIVE_TURN': 'ACTIVE_TURN',
  'AWAITING_PLAYER': 'AWAITING_PLAYER',
  'CONNECTED': 'CONNECTED',
  'DISCONNECTED': 'DISCONNECTED'
};


startRefreshSocketsInterval();

wss.on('connection', ws => {
  addToMatch(ws);
  ws.on('message', handleClientMessage);
});


function handleClientMessage(message) {
  try {
    let data = JSON.parse(message);
    console.log(data);
    if (matches[data.id] !== undefined) {
      let nextPlayer = (data.playerNumber + 1) % matches[data.id].players.length;
      sendMessage(matches[data.id].players[nextPlayer], {
        event: EVENT.ACTIVE_TURN,
        board: data.board
      });
    }
  } catch (err) {
    console.log(err);
  }
}

function addToMatch(ws) {
  if (matches[matchId] === undefined) {
    matches[matchId] = {
      players: [ws],
      id: matchId,
    };
    sendMessage(ws, {event: EVENT.AWAITING_PLAYER, id: matchId});
  } else if (matches[matchId].players.length === TOTAL_PLAYERS) {
    matchId++;
    matches[matchId] = {
      players: [ws],
      id: matchId
    };
    sendMessage(ws, {event: EVENT.AWAITING_PLAYER, id: matchId});
  } else {
    matches[matchId].players.push(ws);
    matches[matchId].players.forEach((player, i) => {
      sendMessage(player, {event: EVENT.CONNECTED, id: matchId, playerNumber: i});
    })
  }
  console.log(matches);
}

function sendMessage(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } else {
    console.log('socket not open...');
    if (matches[obj.id] !== undefined) {
      console.log(`web socket no longer open for game ${obj.id}`);
    }
  }
}

function startRefreshSocketsInterval() {
  setInterval(() => {
    console.log('Checking web socket states...');
    const ids = [];
    for (let id in matches) {
      matches[id].players.forEach(player => {
        if (player.readyState !== WebSocket.OPEN) {
          ids.push(id);
          console.log(`Game ${id} disconnected due to unopened socket`);
          matches[id].players.forEach(p => {
            if (p.readyState === WebSocket.OPEN) {
              sendMessage(p, {event: EVENT.DISCONNECTED});
            }
          });
        }
      });
    }
    ids.forEach(id => {
      delete matches[id];
    })
  }, SOCKET_REFRESH_RATE);
}
