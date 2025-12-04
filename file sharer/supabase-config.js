// supabase-config.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://xvuhldfcjzqpxjnntenk.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dWhsZGZjanpxcHhqbm50ZW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODMwOTQsImV4cCI6MjA4MDE1OTA5NH0.KAc1dBjuwdmo8u9nB2Qdzu_JQ4IGkwPUGEGEj6rcNZU";

export const BUCKET_NAME = "files"; // your bucket

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
