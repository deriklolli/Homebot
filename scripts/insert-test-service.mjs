// Usage: node --env-file=.env.local scripts/insert-test-service.mjs
// Seeds one service row due in 3 days, for testing the alert cron jobs.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run with: node --env-file=.env.local scripts/insert-test-service.mjs');
  process.exit(1);
}

const usersRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
  headers: { 'Authorization': 'Bearer ' + SERVICE_KEY, 'apikey': SERVICE_KEY }
});
const usersData = await usersRes.json();
const users = usersData.users || [];
const user = users.find(u => {
  const role = u.user_metadata?.role;
  return !role || role === 'homeowner';
});

if (!user) {
  console.log('No homeowner user found');
  process.exit(1);
}

console.log('User ID:', user.id, 'Email:', user.email);

const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + 3);
const dueDateStr = dueDate.toISOString().split('T')[0];

const res = await fetch(SUPABASE_URL + '/rest/v1/services', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    user_id: user.id,
    name: 'HVAC Filter Replacement',
    provider: 'ABC Heating & Cooling',
    cost: 150,
    frequency_months: 6,
    last_service_date: '2025-08-28',
    next_service_date: dueDateStr,
    phone: '(555) 123-4567',
    notes: 'Test service for alert testing',
  })
});

const result = await res.json();
console.log('Created service due on', dueDateStr);
console.log(JSON.stringify(result, null, 2));
