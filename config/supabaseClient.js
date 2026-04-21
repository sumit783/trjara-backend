// services/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./serverConfig');

const supabase = createClient(
  config.supabase.url,
  config.supabase.key
);

// Admin client that bypasses RLS, using the Service Role Key
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

module.exports = { supabase, supabaseAdmin };

