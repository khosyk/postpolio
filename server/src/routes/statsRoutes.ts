import express, { Request, Response } from 'express';
import statsService from '../services/statsService';
import { expressAuthMiddleware } from '../middleware/authMiddleware';
import { getErrorMessage } from '../utils/error';

const router = express.Router();

// 모든 통계 API는 인증 필요
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

/**
 * 일별 통계 조회
 * GET /api/stats/daily?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
      return;
    }

    const stats = await statsService.getDailyStats(userId, startDate as string, endDate as string);

    res.json({
      success: true,
      message: '일별 통계 조회 성공',
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/stats/daily:', error);
    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg || '일별 통계 조회 실패',
    });
  }
});

/**
 * 주간 통계 조회
 * GET /api/stats/weekly?week=2024-W01
 * 또는 GET /api/stats/weekly?week=2024-01-01
 */
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { week } = req.query;

    if (!week) {
      res.status(400).json({
        success: false,
        message: 'week parameter is required',
      });
      return;
    }

    const stats = await statsService.getWeeklyStats(userId, week as string);

    res.json({
      success: true,
      message: '주간 통계 조회 성공',
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/stats/weekly:', error);
    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg || '주간 통계 조회 실패',
    });
  }
});

/**
 * 월별 통계 조회
 * GET /api/stats/monthly?year=2024&month=1
 */
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        message: 'year and month are required',
      });
      return;
    }

    const yearNum = parseInt(year as string, 10);
    const monthNum = parseInt(month as string, 10);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      res.status(400).json({
        success: false,
        message: 'year and month must be numbers',
      });
      return;
    }

    const stats = await statsService.getMonthlyStats(userId, yearNum, monthNum);

    res.json({
      success: true,
      message: '월별 통계 조회 성공',
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/stats/monthly:', error);
    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg || '월별 통계 조회 실패',
    });
  }
});

/**
 * 전체 요약 통계 조회
 * GET /api/stats/summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const stats = await statsService.getSummaryStats(userId);

    res.json({
      success: true,
      message: '요약 통계 조회 성공',
      data: stats,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/stats/summary:', error);
    const msg = getErrorMessage(error);
    res.status(500).json({
      success: false,
      message: msg || '요약 통계 조회 실패',
    });
  }
});

export default router;
