import { createClient } from '@supabase/supabase-js';

// Chaves do Supabase fornecidas
// Nota: Em produção idealmente usaríamos variáveis de ambiente,
// mas para garantir funcionamento imediato no Vercel sem configuração extra, usamos aqui.
const supabaseUrl = 'https://libkxkksgzovyqhgldls.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYmt4a2tzZ3pvdnlxaGdsZGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTI5OTgsImV4cCI6MjA3OTcyODk5OH0.xs0FdK-U2UtwwUIhCUE8I4PvB2XPjI_OnI22S3CnoVI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});