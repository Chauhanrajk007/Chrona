const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const API_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

function supabaseRest(path, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };

    return fetch(url, { ...options, headers });
}

async function supabaseSelect(table, query = '') {
    const res = await supabaseRest(`${table}${query ? '?' + query : ''}`, { method: 'GET' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase SELECT error: ${text}`);
    }
    return res.json();
}

async function supabaseInsert(table, data, returnData = false) {
    const headers = {};
    if (returnData) headers['Prefer'] = 'return=representation';
    else headers['Prefer'] = 'return=minimal';

    const res = await supabaseRest(table, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (![200, 201, 204].includes(res.status)) {
        const text = await res.text();
        throw new Error(`Supabase INSERT error: ${text}`);
    }

    if (returnData) return res.json();
    return true;
}

async function supabaseUpdate(table, query, data) {
    const res = await supabaseRest(`${table}?${query}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(data),
    });

    if (![200, 204].includes(res.status)) {
        const text = await res.text();
        throw new Error(`Supabase UPDATE error: ${text}`);
    }

    return res.json();
}

async function supabaseDelete(table, query) {
    const res = await supabaseRest(`${table}?${query}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
    });

    if (![200, 204].includes(res.status)) {
        const text = await res.text();
        throw new Error(`Supabase DELETE error: ${text}`);
    }

    return true;
}

module.exports = { supabaseRest, supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete };
