import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vyrrwtsdmahlarkmfqac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cnJ3dHNkbWFobGFya21mcWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTc2MTksImV4cCI6MjEwOTA3MzYxOX0.qgta_t3z2NoJVSp3URj9rMbNSYDScduVC4IY-oTvNEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
