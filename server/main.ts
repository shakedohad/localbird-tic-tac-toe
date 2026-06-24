import { loadConfig } from './config.js';
import { startServer } from './server.js';

const config = loadConfig();

startServer(config).catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
