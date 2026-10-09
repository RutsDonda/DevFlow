import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION! Shutting down...\n${err.name}: ${err.message}\n${err.stack}`);
  process.exit(1);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Initialize Socket.IO event handlers
initializeSocket(io);

// Make io accessible to route handlers via app.set
app.set('io', io);

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION! Shutting down...\n${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
