import mongoose from 'mongoose';
import dns from 'dns';
import logger from '../utils/logger.js';

// Set DNS servers to resolve MongoDB Atlas SRV records on Windows/local ISP DNS configurations
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  // Ignore if custom DNS cannot be set
}

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
