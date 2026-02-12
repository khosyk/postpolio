import supabase from '../supabaseClient';
import {
  Exam,
  GradeRecord,
  CreateExamRequest,
  CreateGradeRequest,
  UpdateGradeRequest,
  ExamTemplate,
  CreateExamTemplateRequest,
  UpdateExamTemplateRequest,
} from '../types';

class GradeRepository {
  // 시험 생성
  async createExam(userId: string, examData: CreateExamRequest): Promise<Exam> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([
          {
            user_id: userId,
            exam_name: examData.exam_name,
            exam_date: examData.exam_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  // 사용자의 시험 목록 조회
  async getUserExams(userId: string): Promise<Exam[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .order('exam_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user exams:', error);
      throw error;
    }
  }

  // 시험 삭제
  async deleteExam(examId: string): Promise<void> {
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  }

  // 시험 ID로 조회 (과목별 성적 포함)
  async getExamById(examId: string): Promise<Exam | null> {
    try {
      const { data, error } = await supabase.from('exams').select('*').eq('id', examId).single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching exam:', error);
      throw error;
    }
  }

  // 시험의 과목별 성적 목록 조회
  async getGradesByExamId(examId: string): Promise<GradeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('grade_records')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching grades by exam id:', error);
      throw error;
    }
  }
  // 성적표 항목 생성
  async createGradeRecord(userId: string, gradeData: CreateGradeRequest): Promise<GradeRecord> {
    try {
      // max_score가 없거나 유효하지 않으면 기본값 100 설정
      const maxScore =
        typeof gradeData.max_score === 'number' && gradeData.max_score > 0
          ? gradeData.max_score
          : 100;

      const { data, error } = await supabase
        .from('grade_records')
        .insert([
          {
            user_id: userId,
            exam_id: gradeData.exam_id,
            subject_name: gradeData.subject_name,
            max_score: maxScore,
            target_score: gradeData.target_score,
            current_score: gradeData.current_score || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating grade record:', error);
      throw error;
    }
  }

  // 사용자의 성적표 목록 조회
  async getUserGradeRecords(userId: string): Promise<GradeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('grade_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user grade records:', error);
      throw error;
    }
  }

  // 성적표 항목 ID로 조회
  async getGradeRecordById(recordId: string): Promise<GradeRecord | null> {
    try {
      const { data, error } = await supabase
        .from('grade_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching grade record:', error);
      throw error;
    }
  }

  // 성적표 항목 수정
  async updateGradeRecord(recordId: string, updates: UpdateGradeRequest): Promise<GradeRecord> {
    try {
      const updateData: Partial<GradeRecord> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.subject_name !== undefined) {
        updateData.subject_name = updates.subject_name;
      }
      if (updates.current_score !== undefined) {
        updateData.current_score = updates.current_score;
      }
      if (updates.target_score !== undefined) {
        updateData.target_score = updates.target_score;
      }
      if (updates.max_score !== undefined) {
        updateData.max_score = updates.max_score;
      }

      const { data, error } = await supabase
        .from('grade_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating grade record:', error);
      throw error;
    }
  }

  // 성적표 항목 삭제
  async deleteGradeRecord(recordId: string): Promise<void> {
    try {
      const { error } = await supabase.from('grade_records').delete().eq('id', recordId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting grade record:', error);
      throw error;
    }
  }

  // 다가오는 시험 조회 (exams 테이블에서 조회)
  async getUpcomingExams(userId: string, limit: number = 7): Promise<Exam[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      throw error;
    }
  }

  // 시험 템플릿 목록 조회
  async getExamTemplates(activeOnly: boolean = true): Promise<ExamTemplate[]> {
    try {
      let query = supabase.from('exam_templates').select('*');
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      query = query.order('template_name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // JSONB를 파싱 (Supabase는 보통 자동으로 파싱하지만, 안전하게 처리)
      return (data || []).map(template => {
        let subjects = template.subjects;
        if (typeof subjects === 'string') {
          try {
            subjects = JSON.parse(subjects);
          } catch (e) {
            console.error('Error parsing template subjects:', e, template);
            subjects = [];
          }
        }
        // subjects가 배열이 아니거나 각 항목에 max_score가 없으면 기본값 설정
        if (Array.isArray(subjects)) {
          subjects = subjects.map((subject: any) => {
            const maxScore =
              typeof subject.max_score === 'number' && subject.max_score > 0
                ? subject.max_score
                : 100;
            return {
              subject_name: subject.subject_name || '',
              max_score: maxScore,
            };
          });
        }
        const result = {
          ...template,
          subjects: subjects || [],
        };
        // 디버깅: 파싱된 템플릿 데이터 확인
        console.log(`Parsed template ${result.template_name}:`, result.subjects);
        return result;
      });
    } catch (error) {
      console.error('Error fetching exam templates:', error);
      throw error;
    }
  }

  // 시험 템플릿 ID로 조회
  async getExamTemplateById(templateId: string): Promise<ExamTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('exam_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        ...data,
        subjects: typeof data.subjects === 'string' 
          ? JSON.parse(data.subjects) 
          : data.subjects,
      };
    } catch (error) {
      console.error('Error fetching exam template:', error);
      throw error;
    }
  }

  // 시험 템플릿 생성
  async createExamTemplate(templateData: CreateExamTemplateRequest): Promise<ExamTemplate> {
    try {
      const { data, error } = await supabase
        .from('exam_templates')
        .insert([
          {
            template_name: templateData.template_name,
            description: templateData.description || null,
            subjects: templateData.subjects,
            is_active: templateData.is_active ?? true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        subjects: typeof data.subjects === 'string' 
          ? JSON.parse(data.subjects) 
          : data.subjects,
      };
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
      const updateData: Partial<ExamTemplate> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.template_name !== undefined) {
        updateData.template_name = updates.template_name;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.subjects !== undefined) {
        updateData.subjects = updates.subjects as any;
      }
      if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
      }

      const { data, error } = await supabase
        .from('exam_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        subjects: typeof data.subjects === 'string' 
          ? JSON.parse(data.subjects) 
          : data.subjects,
      };
    } catch (error) {
      console.error('Error updating exam template:', error);
      throw error;
    }
  }

  // 시험 템플릿 삭제
  async deleteExamTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await supabase.from('exam_templates').delete().eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting exam template:', error);
      throw error;
    }
  }
}

export default new GradeRepository();
