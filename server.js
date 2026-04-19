import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { runDuePromotions } from './src/services/studentPromotionService.js';
import { initChatSocket } from './src/socket/chatSocket.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const ENABLE_PROMOTION_RUNNER = String(process.env.ENABLE_PROMOTION_RUNNER || 'false').toLowerCase() === 'true';

const runDuePromotionsSafely = async () => {
  try {
    const results = await runDuePromotions();
    if (results.length > 0) {
      console.log(`[PromotionRunner] processed ${results.length} organization(s)`);
    }
  } catch (error) {
    console.error('[PromotionRunner] failed:', error.message);
  }
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initChatSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  if (ENABLE_PROMOTION_RUNNER) {
    runDuePromotionsSafely();
    setInterval(runDuePromotionsSafely, 24 * 60 * 60 * 1000);
    console.log('[PromotionRunner] enabled (runs every 24 hours)');
  }
});
