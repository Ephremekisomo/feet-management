let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });

    // Optional: handle driver-emitted events from socket clients
    socket.on('location:update', (payload) => {
      // Broadcast to managers
      io.emit('location:update', payload);
    });

    socket.on('trip:event', (payload) => {
      io.emit('trip:event', payload);
    });

    socket.on('fuel:added', (payload) => {
      io.emit('fuel:added', payload);
    });

    socket.on('incident:reported', (payload) => {
      io.emit('incident:reported', payload);
    });

    socket.on('alert:created', (payload) => {
      console.log('Received alert:created event from client:', payload);
      console.log('Broadcasting alert:created to all clients');
      io.emit('alert:created', payload);
      console.log('Alert broadcasted successfully');
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };