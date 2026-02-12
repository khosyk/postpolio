// 성적표 관련 타입 정의

// 시험 정보
export interface Exam {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  created_at: string;
  updated_at: string;
}

// 과목별 성적 기록
export interface GradeRecord {
  id: string;
  exam_id: string;
  subject_name: string;
  max_score: number;
  target_score: number;
  current_score: number | null;
  created_at: string;
  updated_at: string;
}

// 시험 템플릿 관련 타입
export interface ExamTemplateSubject {
  subject_name: string;
  max_score: number;
}

export interface ExamTemplate {
  id: string;
  template_name: string;
  description: string | null;
  subjects: ExamTemplateSubject[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 시험과 과목 정보를 함께 포함하는 타입
export interface ExamWithGrades extends Exam {
  grades: GradeRecord[];
}

// 시험 생성 요청
export interface CreateExamRequest {
  exam_name: string;
  exam_date: string;
  max_score?: number;
}

// 과목별 성적 생성 요청
export interface CreateGradeRequest {
  exam_id: string;
  subject_name: string;
  max_score: number;
  target_score: number;
  current_score?: number;
}

// 과목별 성적 수정 요청
export interface UpdateGradeRequest {
  current_score?: number;
  target_score?: number;
  max_score?: number;
  subject_name?: string;
}
