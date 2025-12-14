import { supabase } from '../lib/supabase'; // NOTE: Adjust '../lib/supabase' path if your file structure is different
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initialize the Supabase client using the keys stored in Vercel
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
