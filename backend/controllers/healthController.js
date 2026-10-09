import mongoose from 'mongoose';

export const getHealth = async (req, res, next) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        version: '1.0.0'
      }
    });
  } catch (error) {
    next(error);
  }
};
