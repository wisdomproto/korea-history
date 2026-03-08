import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorMiddleware } from './middleware.js';
import examRoutes from './routes/exam.routes.js';
import questionRoutes from './routes/question.routes.js';
import generatorRoutes from './routes/generator.routes.js';
import imageRoutes from './routes/image.routes.js';
import pdfImportRoutes from './routes/pdf-import.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', dataDir: config.dataDir } });
  });

  app.use('/api/exams', examRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/generate', generatorRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/pdf', pdfImportRoutes);

  app.use(errorMiddleware as express.ErrorRequestHandler);

  // --- Vite integration ---
  if (isDev) {
    // Dev: use Vite dev server as middleware (HMR, fast refresh etc.)
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Prod: serve built static files
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(config.port, () => {
    console.warn(`[Author Tool] http://localhost:${config.port} (${isDev ? 'dev' : 'prod'})`);
    console.warn(`[Data Directory] ${config.dataDir}`);
  });
}

startServer().catch((err) => {
  console.error('Server start failed:', err);
  process.exit(1);
});
