import gradeRepository from '../repositories/gradeRepository';
import {
  Exam,
  ExamWithGrades,
  GradeRecord,
  CreateExamRequest,
  CreateGradeRequest,
  UpdateGradeRequest,
  ExamTemplate,
  CreateExamTemplateRequest,
  UpdateExamTemplateRequest,
} from '../types';

class GradeService {
  // 시험 생성
  async createExam(userId: string, examData: CreateExamRequest): Promise<Exam> {
    try {
      return await gradeRepository.createExam(userId, examData);
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  // 사용자 시험 목록 조회
  async getUserExams(userId: string): Promise<Exam[]> {
    try {
      return await gradeRepository.getUserExams(userId);
    } catch (error) {
      console.error('Error fetching user exams:', error);
      throw error;
    }
  }

  // 시험 상세 조회 (과목별 성적 포함)
  async getExamById(examId: string, userId: string): Promise<ExamWithGrades | null> {
    try {
      const exam = await gradeRepository.getExamById(examId);
      if (!exam) {
        return null;
      }

      // 소유자 확인
      if (exam.user_id !== userId) {
        throw new Error('본인의 시험만 조회할 수 있습니다.');
      }

      // 과목별 성적 조회 (에러 발생 시 빈 배열 반환)
      let grades: GradeRecord[] = [];
      try {
        grades = await gradeRepository.getGradesByExamId(examId);
      } catch (gradeError) {
        console.error('Error fetching grades for exam:', gradeError);
        // grades 조회 실패해도 시험 정보는 반환
        grades = [];
      }

      return {
        ...exam,
        grades: grades || [],
      };
    } catch (error) {
      console.error('Error fetching exam:', error);
      throw error;
    }
  }

  // 시험 삭제
  async deleteExam(examId: string, userId: string): Promise<void> {
    try {
      const exam = await gradeRepository.getExamById(examId);
      if (!exam) {
        throw new Error('시험을 찾을 수 없습니다.');
      }

      if (exam.user_id !== userId) {
        throw new Error('본인의 시험만 삭제할 수 있습니다.');
      }

      await gradeRepository.deleteExam(examId);
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  }
  // 성적표 항목 생성
  async createGradeRecord(userId: string, gradeData: CreateGradeRequest): Promise<GradeRecord> {
    try {
      return await gradeRepository.createGradeRecord(userId, gradeData);
    } catch (error) {
      console.error('Error creating grade record:', error);
      throw error;
    }
  }

  // 사용자 성적표 목록 조회
  async getUserGradeRecords(userId: string): Promise<GradeRecord[]> {
    try {
      return await gradeRepository.getUserGradeRecords(userId);
    } catch (error) {
      console.error('Error fetching user grade records:', error);
      throw error;
    }
  }

  // 성적표 항목 수정
  async updateGradeRecord(
    recordId: string,
    userId: string,
    updates: UpdateGradeRequest
  ): Promise<GradeRecord> {
    try {
      // 소유자 확인
      const record = await gradeRepository.getGradeRecordById(recordId);
      if (!record) {
        throw new Error('성적표 항목을 찾을 수 없습니다.');
      }
      if (record.user_id !== userId) {
        throw new Error('본인의 성적표만 수정할 수 있습니다.');
      }

      return await gradeRepository.updateGradeRecord(recordId, updates);
    } catch (error) {
      console.error('Error updating grade record:', error);
      throw error;
    }
  }

  // 성적표 항목 삭제
  async deleteGradeRecord(recordId: string, userId: string): Promise<void> {
    try {
      // 소유자 확인
      const record = await gradeRepository.getGradeRecordById(recordId);
      if (!record) {
        throw new Error('성적표 항목을 찾을 수 없습니다.');
      }
      if (record.user_id !== userId) {
        throw new Error('본인의 성적표만 삭제할 수 있습니다.');
      }

      await gradeRepository.deleteGradeRecord(recordId);
    } catch (error) {
      console.error('Error deleting grade record:', error);
      throw error;
    }
  }

  // 성적표 항목 상세 조회
  async getGradeRecordById(recordId: string, userId: string): Promise<GradeRecord | null> {
    try {
      const record = await gradeRepository.getGradeRecordById(recordId);
      if (!record) return null;

      // 소유자 확인
      if (record.user_id !== userId) {
        throw new Error('본인의 성적표만 조회할 수 있습니다.');
      }

      return record;
    } catch (error) {
      console.error('Error fetching grade record:', error);
      throw error;
    }
  }

  // 다가오는 시험 조회 (과목별 성적 포함)
  async getUpcomingExams(userId: string, limit: number = 7): Promise<ExamWithGrades[]> {
    try {
      const exams = await gradeRepository.getUpcomingExams(userId, limit);

      const examsWithGrades: ExamWithGrades[] = await Promise.all(
        exams.map(async exam => {
          let grades: GradeRecord[] = [];
          try {
            grades = await gradeRepository.getGradesByExamId(exam.id);
          } catch (gradeError) {
            console.error('Error fetching grades for upcoming exam:', gradeError);
            grades = [];
          }

          return {
            ...exam,
            grades: grades || [],
          };
        })
      );

      return examsWithGrades;
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      throw error;
    }
  }

  // 시험 템플릿 목록 조회
  async getExamTemplates(activeOnly: boolean = true): Promise<ExamTemplate[]> {
    try {
      return await gradeRepository.getExamTemplates(activeOnly);
    } catch (error) {
      console.error('Error fetching exam templates:', error);
      throw error;
    }
  }

  // 시험 템플릿 ID로 조회
  async getExamTemplateById(templateId: string): Promise<ExamTemplate | null> {
    try {
      return await gradeRepository.getExamTemplateById(templateId);
    } catch (error) {
      console.error('Error fetching exam template:', error);
      throw error;
    }
  }

  // 시험 템플릿 생성
  async createExamTemplate(templateData: CreateExamTemplateRequest): Promise<ExamTemplate> {
    try {
      return await gradeRepository.createExamTemplate(templateData);
    } catch (error) {
      console.error('Error creating exam template:', error);
      throw error;
    }
  }

  // 시험 템플릿 수정
  async updateExamTemplate(
    templateId: string,
    updates: UpdateExamTemplateRequest,
  ): Promise<ExamTemplate> {
    try {
      return await gradeRepository.updateExamTemplate(templateId, updates);
    } catch (error) {
      console.error('Error updating exam template:', error);
      throw error;
    }
  }

  // 시험 템플릿 삭제
  async deleteExamTemplate(templateId: string): Promise<void> {
    try {
      return await gradeRepository.deleteExamTemplate(templateId);
    } catch (error) {
      console.error('Error deleting exam template:', error);
      throw error;
    }
  }
}

export default new GradeService();
