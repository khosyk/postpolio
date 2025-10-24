import { createClient } from '@supabase/supabase-js';

// .env 파일에서 환경 변수를 가져옵니다.
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Service Role Key를 사용하여 클라이언트를 생성합니다.
// { auth: { persistSession: false } } 옵션을 추가하면 Express 서버에서
// 불필요한 세션 지속성을 방지할 수 있습니다.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export default supabase;
