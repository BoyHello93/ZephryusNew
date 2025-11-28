import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eromesdeupqjbbyuijvl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb21lc2RldXBxamJieXVpanZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODA5MTIsImV4cCI6MjA3OTg1NjkxMn0.00xvs28i62QpMdglKitZAo7lhUWGF-T2nejd_I8Z8SI';

export const supabase = createClient(supabaseUrl, supabaseKey);