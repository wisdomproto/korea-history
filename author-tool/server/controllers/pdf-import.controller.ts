import { PdfImportService } from '../services/pdf-import.service.js';
import { asyncHandler } from '../middleware.js';

export const PdfImportController = {
  parse: asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'PDF 파일이 없습니다.' });
      return;
    }
    const model = req.body?.model as string | undefined;
    const examNumber = req.body?.examNumber ? parseInt(req.body.examNumber, 10) : undefined;
    const questions = await PdfImportService.parse(file.buffer, model, examNumber);
    res.json({ success: true, data: questions });
  }),
};
