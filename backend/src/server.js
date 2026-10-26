import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { app } from './app.js';
import { seedInitialProduct } from './services/productSeed.js';

const startServer = async () => {
  await connectDB();
  await seedInitialProduct();

  const server = app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Failed to start the backend server.');
  console.error(error.message);
  process.exit(1);
});
