const socketIo = require('socket.io');

function initSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    // Handle location updates from drivers
    socket.on('location:update', (payload) => {
      // Broadcast to all connected clients (managers)
      io.emit('location:update', payload);
    });

    // Handle incident reports from drivers
    socket.on('incident:reported', (payload) => {
      // Broadcast to all connected clients (managers)
      io.emit('incident:reported', payload);
    });

    // Handle fuel reports from drivers
    socket.on('fuel:added', (payload) => {
      // Broadcast to all connected clients (managers)
      io.emit('fuel:added', payload);
    });

    // Handle alert resolution from managers
    socket.on('alert:resolved', (payload) => {
      // Broadcast to all connected clients (drivers)
      io.emit('alert:resolved', payload);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  return io;
}

module.exports = initSocket;