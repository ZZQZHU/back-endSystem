function initWebSocket(server) {
  const socketIO = require('socket.io');
  const io = socketIO(server, {
    // 允许跨域
    cors: {
      origin: '*'
    }
  });

  // 用于存储 WebSocket 连接的映射表，连接标识 -> WebSocket 连接
  const webSocketConnections = {};

  // WebSocket 中间层监听连接事件
  io.on('connect', (socket) => {
    console.log('用户连接成功');

    // 根据事件名接收客户端返回的数据
    socket.on('msg222', (...msgs) => {
      console.log(msgs)
    })

    // 监听标识请求事件
    socket.on('identify', (data) => {
      const { identification, clientType } = data;

      // 将 WebSocket 连接与标识关联
      webSocketConnections[identification] = { socket, clientType };
      console.log(`标识 ${identification} 关联成功`);
    });

    // 监听小程序端注册成功事件
    socket.on('registrationComplete', (data) => {
      const { identification, registrationData, clientType } = data;

      // 根据标识找到对应的 WebSocket 连接
      const webSocketConnection = webSocketConnections[identification];

      if (webSocketConnection && webSocketConnection.clientType === 'webPage') {
        // 向对应的 WebSocket 连接发送注册成功消息
        webSocketConnection.socket.emit('registrationComplete', registrationData);
      }
    });

    // 监听断开连接事件
    socket.on('disconnect', () => {
      console.log('用户断开连接');
    });
  });

  // 无需返回 Express 实例，因为我们只需要与 HTTP 服务器关联
}

module.exports = initWebSocket;
