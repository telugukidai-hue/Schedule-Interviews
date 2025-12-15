
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://majghuuvzjfkfpuwqybc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hamdodXV2empma2ZwdXdxeWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMDY4MjEsImV4cCI6MjA4MDY4MjgyMX0.-qYWPK4UpaKYr0JA7j9xTekMxyYKpUAbpVJdu6iVfFs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
