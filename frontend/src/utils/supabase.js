// ============================================================
// CLIENTE SUPABASE — Frontend
//
// Usado para autenticação diretamente no navegador.
// As chaves aqui são PÚBLICAS (anon key) — seguro commitar.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://kajebqadlpxufqdhchxy.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthamVicWFkbHB4dWZxZGhjaHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDE5OTUsImV4cCI6MjA5MDIxNzk5NX0.p0osGma-lkxkFBGAGwP18091RKcl6QIMk4Qafsl0P3Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
