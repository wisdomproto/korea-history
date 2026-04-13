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
import keywordRoutes from './routes/keyword.routes.js';
import cardNewsRoutes from './routes/card-news.routes.js';
import notesRoutes from './routes/notes.routes.js';
import contentRoutes from './routes/content.routes.js';
import projectRoutes from './routes/project.routes.js';
import blogToolsRoutes from './routes/blog-tools.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import cbtRoutes from './routes/cbt.routes.js';
import summaryNoteRoutes from './routes/summary-note.routes.js';
import cardnewsTemplateRoutes from './routes/cardnews-template.routes.js';
import instagramRoutes from './routes/instagram.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // R2 proxy — bypass CORS for Expo dev (localhost:8081 → R2)
  if (config.r2.publicUrl) {
    app.use('/r2', async (req, res) => {
      const r2Url = `${config.r2.publicUrl}${req.path}`;
      try {
        const upstream = await fetch(r2Url);
        if (!upstream.ok) {
          res.status(upstream.status).end();
          return;
        }
        const ct = upstream.headers.get('content-type');
        if (ct) res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=300');
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
      } catch {
        res.status(502).json({ error: 'R2 proxy error' });
      }
    });
  }

  // API routes
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', dataDir: config.dataDir } });
  });

  app.use('/api/exams', examRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/generate', generatorRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/pdf', pdfImportRoutes);
  app.use('/api/keywords', keywordRoutes);
  app.use('/api/card-news', cardNewsRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/contents', contentRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/blog-tools', blogToolsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/cbt', cbtRoutes);
  app.use('/api/summary-notes', summaryNoteRoutes);
  app.use('/api/cardnews-templates', cardnewsTemplateRoutes);
  app.use('/api/instagram', instagramRoutes);

  app.use(errorMiddleware as express.ErrorRequestHandler);

  // --- Static file serving ---
  if (isDev) {
    // Dev: Vite dev server for author tool at /admin
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Prod: serve author tool at /admin, main app at /
    const adminDistPath = path.resolve(__dirname, '../dist');
    const mainDistPath = path.resolve(__dirname, '../../dist');

    // Author tool (admin)
    app.use('/admin', express.static(adminDistPath));
    app.get('/admin/{*path}', (_req, res) => {
      res.sendFile(path.join(adminDistPath, 'index.html'));
    });

    // Main app (Expo web) — catch-all
    app.use(express.static(mainDistPath));
    app.get('{*path}', (_req, res) => {
      res.sendFile(path.join(mainDistPath, 'index.html'));
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
