import { createServer } from 'http';
import app from './app';
// import { config } from './config';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initSocket } from './services/socket';

const startServer = async () => {
  await connectDB();
  await connectRedis();

  const httpServer = createServer(app);
  const io = initSocket(httpServer);

  const port = process.env.PORT || 5000;

  httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
