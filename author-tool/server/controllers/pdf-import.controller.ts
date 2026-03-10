import { PdfImportService } from '../services/pdf-import.service.js';
import type { Request, Response } from 'express';

export const PdfImportController = {
  parse: async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, error: 'PDF 파일이 없습니다.' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx
    res.flushHeaders();

    const send = (type: string, data: unknown) => {
      const payload = typeof data === 'string' ? { message: data } : (data as Record<string, unknown>);
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    };

    const onProgress = (message: string) => {
      send('progress', message);
    };

    try {
      const model = req.body?.model as string | undefined;
      const examNumber = req.body?.examNumber ? parseInt(req.body.examNumber, 10) : undefined;

      const questions = await PdfImportService.parse(file.buffer, model, examNumber, onProgress);

      send('done', { data: questions });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      send('error', { error: message });
    } finally {
      res.end();
    }
  },
};
