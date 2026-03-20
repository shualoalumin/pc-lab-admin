import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

const headers = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
}

export async function supabaseSelect(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`SELECT ${table} failed: ${res.status}`)
  return res.json()
}

export async function supabaseInsert(table, rows) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`INSERT ${table} failed: ${res.status}`)
  return res.json()
}

export async function supabaseUpdate(table, match, data) {
  const params = Object.entries(match)
    .map(([k, v]) => `${k}=eq.${v}`)
    .join('&')
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`UPDATE ${table} failed: ${res.status}`)
  return res.json()
}
