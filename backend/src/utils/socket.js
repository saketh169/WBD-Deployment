let io;
const dietitianSockets = new Map(); // Map dietitianId -> array of socketIds

module.exports = {
  init: (httpServer, allowedOrigins) => {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('register_dietitian', (dietitianId) => {
        if (!dietitianId) return;

        console.log(`Dietitian ${dietitianId} registered their socket ${socket.id}`);
        // Add to mapped sockets
        if (!dietitianSockets.has(dietitianId)) {
          dietitianSockets.set(dietitianId, []);
        }
        dietitianSockets.get(dietitianId).push(socket.id);

        // Also enter a room for easier broadcasting to this specific dietitian's devices
        socket.join(`dietitian_${dietitianId}`);
      });

      // Dedicated chat room handling
      socket.on('join_conversation', (conversationId) => {
        if (!conversationId) return;
        socket.join(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
      });

      // Realtime booking UI viewing room
      socket.on('viewing_dietitian', (dietitianId) => {
        if (!dietitianId) return;
        socket.join(`viewing_dietitian_${dietitianId}`);
        console.log(`Socket ${socket.id} joined viewing room for dietitian ${dietitianId}`);
      });

      socket.on('leave_dietitian', (dietitianId) => {
        if (!dietitianId) return;
        socket.leave(`viewing_dietitian_${dietitianId}`);
        console.log(`Socket ${socket.id} left viewing room for dietitian ${dietitianId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove from tracked sockets
        dietitianSockets.forEach((sockets, dietitianId) => {
          const index = sockets.indexOf(socket.id);
          if (index !== -1) {
            sockets.splice(index, 1);
            if (sockets.length === 0) {
              dietitianSockets.delete(dietitianId);
            }
          }
        });
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  notifyDietitianNewBooking: (dietitianId, bookingData) => {
    if (io) {
      io.to(`dietitian_${dietitianId}`).emit('new_booking', bookingData);
    }
  },

  notifyNewMessage: (conversationId, messageData) => {
    if (io) {
      io.to(`conversation_${conversationId}`).emit('new_message', messageData);
    }
  },

  notifyBookingUpdate: (dietitianId, bookingData) => {
    if (io) {
      io.to(`dietitian_${dietitianId}`).emit('booking_updated', bookingData);
    }
  },

  notifyUserUpdate: (userId, bookingData) => {
    if (io) {
      // Assuming users join a room like 'user_id'
      io.to(`user_${userId}`).emit('booking_updated', bookingData);
    }
  },

  notifySlotLockChange: (dietitianId, lockData) => {
    // lockData: { date, time, action: 'hold' | 'release' }
    if (io) {
      io.to(`viewing_dietitian_${dietitianId}`).emit('slot_lock_change', lockData);
    }
  }
};
