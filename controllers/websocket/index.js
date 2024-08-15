const initWebSocket = require('./registration');

function setupWebSocket(server) {
    initWebSocket(server);
}

module.exports = setupWebSocket;
