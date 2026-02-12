import express, { Request, Response } from 'express';
import gradeService from '../services/gradeService';
import { isZodError, getErrorMessage } from '../utils/error';
import {
  CreateExamSchema,
  CreateGradeSchema,
  UpdateGradeSchema,
} from '../../../shared/schemas/grade';
import { expressAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(expressAuthMiddleware);

// 사용자 ID 추출 헬퍼
interface AuthenticatedRequest extends Request {
  user: { id: string; email: string | null };
}

const getUserId = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || !authReq.user.id) {
    throw new Error('User ID is missing');
  }
  return authReq.user.id;
};

// 성적표 ID 추출 헬퍼
const getGradeId = (req: Request): string => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Grade ID is required');
  }
  return id;
};

// 성적표 항목 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    // max_score가 없거나 유효하지 않으면 기본값 100 설정
    let maxScore = 100;
    if (req.body.max_score !== undefined && req.body.max_score !== null) {
      const parsedMaxScore = Number(req.body.max_score);
      if (!isNaN(parsedMaxScore) && parsedMaxScore > 0) {
        maxScore = parsedMaxScore;
      }
    }

    // subject_name 길이 제한 완화 (50자까지 허용)
    const subjectName = String(req.body.subject_name || '').trim();
    if (subjectName.length > 50) {
      res.status(400).json({
        success: false,
        message: '과목명은 50자 이하여야 합니다.',
      });
      return;
    }

    const body = {
      exam_id: String(req.body.exam_id || ''),
      subject_name: subjectName,
      max_score: maxScore,
      target_score: Number(req.body.target_score || 0),
      current_score: req.body.current_score !== undefined ? Number(req.body.current_score) : undefined,
    };

    // 스키마 검증 (max_score는 이미 설정됨)
    const parsed = CreateGradeSchema.parse(body);
    const userId = getUserId(req);

    // 최종 확인 (스키마 검증 후에도 안전하게)
    if (!parsed.max_score || parsed.max_score <= 0 || isNaN(parsed.max_score)) {
      parsed.max_score = 100;
    }

    const gradeRecord = await gradeService.createGradeRecord(userId, parsed);

    res.status(201).json({
      success: true,
      message: '성적표 항목이 생성되었습니다.',
      data: { gradeRecord },
    });
  } catch (error: unknown) {
    console.error('Create grade record route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 내 성적표 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const gradeRecords = await gradeService.getUserGradeRecords(userId);

    res.json({
      success: true,
      data: { gradeRecords },
    });
  } catch (error: unknown) {
    console.error('Get user grade records route error:', error);

    res.status(500).json({
      success: false,
      message: '성적표 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시험 생성 (exams 엔드포인트는 :id 라우트보다 먼저 정의해야 함)
router.post('/exams', async (req: Request, res: Response) => {
  try {
    const parsed = CreateExamSchema.parse(req.body);
    const userId = getUserId(req);

    const exam = await gradeService.createExam(userId, parsed);

    res.status(201).json({
      success: true,
      message: '시험이 생성되었습니다.',
      data: { exam },
    });
  } catch (error: unknown) {
    console.error('Create exam route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error) ? 400 : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 시험 목록 조회 (exams 엔드포인트는 :id 라우트보다 먼저 정의해야 함)
router.get('/exams', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exams = await gradeService.getUserExams(userId);

    res.json({
      success: true,
      data: { exams },
    });
  } catch (error: unknown) {
    console.error('Get exams route error:', error);

    res.status(500).json({
      success: false,
      message: '시험 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시험 상세 조회 (과목별 성적 포함) - examId 파라미터는 :id 라우트보다 먼저 정의해야 함
router.get('/exams/:examId', async (req: Request, res: Response) => {
  try {
    const examId = req.params['examId'];
    if (!examId) {
      res.status(400).json({
        success: false,
        message: '시험 ID가 필요합니다.',
      });
      return;
    }

    const userId = getUserId(req);
    const exam = await gradeService.getExamById(examId, userId);

    if (!exam) {
      res.status(404).json({
        success: false,
        message: '시험을 찾을 수 없습니다.',
      });
      return;
    }

    res.json({
      success: true,
      data: { exam },
    });
  } catch (error: unknown) {
    console.error('Get exam route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('조회할 수 없습니다')
      ? 403
      : msg.includes('찾을 수 없습니다')
        ? 404
        : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 시험 삭제
router.delete('/exams/:examId', async (req: Request, res: Response) => {
  try {
    const examId = req.params['examId'];
    if (!examId) {
      res.status(400).json({
        success: false,
        message: '시험 ID가 필요합니다.',
      });
      return;
    }

    const userId = getUserId(req);
    await gradeService.deleteExam(examId, userId);

    res.json({
      success: true,
      message: '시험이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Delete exam route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('삭제할 수 없습니다')
      ? 403
      : msg.includes('찾을 수 없습니다')
        ? 404
        : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 다가오는 시험 조회 (upcoming 엔드포인트는 :id 라우트보다 먼저 정의해야 함)
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exams = await gradeService.getUpcomingExams(userId, 7);

    res.json({
      success: true,
      data: { exams },
    });
  } catch (error: unknown) {
    console.error('Get upcoming exams route error:', error);

    res.status(500).json({
      success: false,
      message: '다가오는 시험 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시험 템플릿 목록 조회 (templates 엔드포인트는 :id 라우트보다 먼저 정의해야 함)
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query['activeOnly'] !== 'false';
    const templates = await gradeService.getExamTemplates(activeOnly);

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error: unknown) {
    console.error('Get exam templates route error:', error);

    res.status(500).json({
      success: false,
      message: '시험 템플릿 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시험 템플릿 상세 조회
router.get('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    if (!templateId) {
      res.status(400).json({
        success: false,
        message: '템플릿 ID가 필요합니다.',
      });
      return;
    }

    const template = await gradeService.getExamTemplateById(templateId);

    if (!template) {
      res.status(404).json({
        success: false,
        message: '템플릿을 찾을 수 없습니다.',
      });
      return;
    }

    res.json({
      success: true,
      data: { template },
    });
  } catch (error: unknown) {
    console.error('Get exam template route error:', error);

    res.status(500).json({
      success: false,
      message: '시험 템플릿 조회 중 오류가 발생했습니다.',
    });
  }
});

// 시험 템플릿 생성
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const templateData = req.body;
    const template = await gradeService.createExamTemplate(templateData);

    res.status(201).json({
      success: true,
      message: '시험 템플릿이 생성되었습니다.',
      data: { template },
    });
  } catch (error: unknown) {
    console.error('Create exam template route error:', error);

    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg,
    });
  }
});

// 시험 템플릿 수정
router.put('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    if (!templateId) {
      res.status(400).json({
        success: false,
        message: '템플릿 ID가 필요합니다.',
      });
      return;
    }

    const updates = req.body;
    const template = await gradeService.updateExamTemplate(templateId, updates);

    res.json({
      success: true,
      message: '시험 템플릿이 수정되었습니다.',
      data: { template },
    });
  } catch (error: unknown) {
    console.error('Update exam template route error:', error);

    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg,
    });
  }
});

// 시험 템플릿 삭제
router.delete('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = req.params['templateId'];
    if (!templateId) {
      res.status(400).json({
        success: false,
        message: '템플릿 ID가 필요합니다.',
      });
      return;
    }

    await gradeService.deleteExamTemplate(templateId);

    res.json({
      success: true,
      message: '시험 템플릿이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Delete exam template route error:', error);

    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg,
    });
  }
});

// 성적표 항목 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const gradeId = getGradeId(req);
    const userId = getUserId(req);

    const gradeRecord = await gradeService.getGradeRecordById(gradeId, userId);

    if (!gradeRecord) {
      res.status(404).json({
        success: false,
        message: '성적표 항목을 찾을 수 없습니다.',
      });
      return;
    }

    res.json({
      success: true,
      data: { gradeRecord },
    });
  } catch (error: unknown) {
    console.error('Get grade record route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('조회할 수 없습니다')
      ? 403
      : msg.includes('찾을 수 없습니다')
        ? 404
        : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

// 성적표 항목 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const gradeId = getGradeId(req);
    const parsed = UpdateGradeSchema.parse(req.body);
    const userId = getUserId(req);

    const gradeRecord = await gradeService.updateGradeRecord(gradeId, userId, parsed);

    res.json({
      success: true,
      message: '성적표 항목이 수정되었습니다.',
      data: { gradeRecord },
    });
  } catch (error: unknown) {
    console.error('Update grade record route error:', error);

    const msg = getErrorMessage(error);
    const status = isZodError(error)
      ? 400
      : msg.includes('수정할 수 없습니다')
        ? 403
        : msg.includes('찾을 수 없습니다')
          ? 404
          : 500;

    res.status(status).json({
      success: false,
      message: isZodError(error) ? '요청 본문이 유효하지 않습니다.' : msg,
    });
  }
});

// 성적표 항목 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const gradeId = getGradeId(req);
    const userId = getUserId(req);

    await gradeService.deleteGradeRecord(gradeId, userId);

    res.json({
      success: true,
      message: '성적표 항목이 삭제되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Delete grade record route error:', error);

    const msg = getErrorMessage(error);
    const status = msg.includes('삭제할 수 없습니다')
      ? 403
      : msg.includes('찾을 수 없습니다')
        ? 404
        : 500;

    res.status(status).json({
      success: false,
      message: msg,
    });
  }
});

export default router;
