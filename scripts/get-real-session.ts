import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
for (const line of fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (v && v !== '[SENSITIVE]') process.env[k] = v;
}

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'shriyanshchandrakar@gmail.com'
  });

  if (linkErr || !linkData?.properties?.email_otp) {
    console.error('Link gen error:', linkErr);
    return;
  }

  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    email: 'shriyanshchandrakar@gmail.com',
    token: linkData.properties.email_otp,
    type: 'email'
  });

  if (otpErr || !sessionData?.session) {
    console.error('OTP error:', otpErr);
    return;
  }

  const session = sessionData.session;
  console.log('Successfully acquired real user session!');
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
  
  // Format cookie value as @supabase/ssr expects
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = JSON.stringify(session);
  const base64CookieValue = Buffer.from(cookieValue).toString('base64');
  console.log('Cookie name:', cookieName);
  console.log('Cookie raw JSON length:', cookieValue.length);
}

main().catch(console.error);
