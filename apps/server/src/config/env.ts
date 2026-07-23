import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const env = {
  port: parseInt(process.env.SERVER_PORT || '5000'),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  corsOrigin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.6'),
};
