import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import projectRoutes from './routes/project.routes.js';
import logger from '../../utils/logger.js'; // using root utils

dotenv.config({ path: './.env' });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'projects' });
});

app.use('/api/projects', projectRoutes);

const start = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    logger.info(`Project service listening on port ${PORT}`);
  });
};

start();
