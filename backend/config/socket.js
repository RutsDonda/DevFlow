import logger from '../utils/logger.js';

let ioInstance = null;

export const initializeSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join-project', (projectId) => {
      socket.join(`project:${projectId}`);
      logger.debug(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on('leave-project', (projectId) => {
      socket.leave(`project:${projectId}`);
      logger.debug(`Socket ${socket.id} left project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized');
  }
  return ioInstance;
};

export default { initializeSocket, getIO };
