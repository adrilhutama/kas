/**
 * KAS REGU 3 — Pages Functions API router
 * Route: /functions/api/[[path]].js  =>  handles /api/*
 * DB binding: env.DB (D1) | Secret: env.ADMIN_KEY
 */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_FEE = 10000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function isAdmin(request, env) {
  if (!env.ADMIN_KEY) return false;
  const h = request.headers.get("Authorization") || "";
  return h === `Bearer ${env.ADMIN_KEY}`;
}

async function getSummary(url, env) {
  // Available months from data
  const distinct = await env.DB.prepare(
    "SELECT DISTINCT month_period FROM payments ORDER BY month_period ASC"
  ).all();
  let available = (distinct.results || []).map((r) => r.month_period);

  // Parse ?months=2026-07,2026-08 filter
  const q = url.searchParams.get("months");
  let months;
  if (q) {
    months = q.split(",").map((s) => s.trim()).filter((s) => MONTH_RE.test(s));
    // include requested months in available list for chip UI
    for (const m of months) if (!available.includes(m)) available.push(m);
    available.sort();
  } else {
    months = available;
  }
  if (months.length === 0) months = ["2026-07", "2026-08", "2026-09"];

  const incomeRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments"
  ).first();
  const expenseRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM expenses"
  ).first();
  const total_income = incomeRow?.total ?? 0;
  const total_expense = expenseRow?.total ?? 0;

  const membersRes = await env.DB.prepare(
    "SELECT id, name, is_active FROM members ORDER BY id ASC"
  ).all();
  const members = membersRes.results || [];

  let payRows = [];
  if (months.length > 0) {
    const placeholders = months.map(() => "?").join(",");
    payRows = (
      await env.DB.prepare(
        `SELECT member_id, month_period, amount FROM payments WHERE month_period IN (${placeholders})`
      )
        .bind(...months)
        .all()
    ).results || [];
  }
  const paidSet = new Set(payRows.map((r) => `${r.member_id}|${r.month_period}`));

  const matrix = members.map((m) => {
    const paid = {};
    let paid_count = 0;
    for (const mo of months) {
      const ok = paidSet.has(`${m.id}|${mo}`);
      paid[mo] = ok;
      if (ok) paid_count++;
    }
    return {
      id: m.id,
      name: m.name,
      is_active: m.is_active,
      paid,
      paid_count,
      unpaid_count: months.length - paid_count,
    };
  });

  const expRes = await env.DB.prepare(
    "SELECT id, description, amount, expense_date FROM expenses ORDER BY expense_date DESC, id DESC"
  ).all();

  // Per-month income for small stat row
  const perMonth = months.map((mo) => {
    let count = 0;
    for (const r of payRows) if (r.month_period === mo) count++;
    return { month: mo, count, total: count * MONTH_FEE };
  });

  return json({
    total_income,
    total_expense,
    current_balance: total_income - total_expense,
    month_fee: MONTH_FEE,
    months,
    available_months: available,
    per_month: perMonth,
    members: matrix,
    expenses: expRes.results || [],
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  // strip "/api/" prefix; [[path]] may include query already removed
  let path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  try {
    // --- Public: summary ---
    if (method === "GET" && (path === "" || path === "summary")) {
      return await getSummary(url, env);
    }

    // --- Public: member list (for admin dropdowns) ---
    if (method === "GET" && path === "members") {
      const res = await env.DB.prepare(
        "SELECT id, name, is_active FROM members ORDER BY id ASC"
      ).all();
      return json({ members: res.results || [] });
    }

    // --- Auth: login ---
    if (method === "POST" && path === "auth/login") {
      let body = {};
      try {
        body = await request.json();
      } catch {}
      if (!env.ADMIN_KEY) return json({ error: "Server belum dikonfigurasi (ADMIN_KEY)." }, 500);
      if (body.password && body.password === env.ADMIN_KEY) {
        return json({ ok: true, token: env.ADMIN_KEY });
      }
      return json({ error: "Password salah." }, 401);
    }

    // ---- Admin-only routes below ----
    const needsAuth =
      (method === "POST" && path === "payments/toggle") ||
      (method === "POST" && path === "expenses") ||
      (method === "DELETE" && path.startsWith("expenses/")) ||
      (method === "POST" && path === "members") ||
      (method === "PATCH" && path.startsWith("members/"));

    if (needsAuth && !isAdmin(request, env)) {
      return json({ error: "Unauthorized." }, 401);
    }

    // --- Toggle payment ---
    if (method === "POST" && path === "payments/toggle") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body JSON tidak valid." }, 400);
      }
      const member_id = Number(body.member_id);
      const month_period = String(body.month_period || "");
      const status = body.status === true || body.status === 1 || body.status === "true";

      if (!Number.isInteger(member_id) || member_id <= 0)
        return json({ error: "member_id tidak valid." }, 400);
      if (!MONTH_RE.test(month_period))
        return json({ error: "month_period harus format YYYY-MM." }, 400);

      const member = await env.DB.prepare("SELECT id FROM members WHERE id = ?")
        .bind(member_id)
        .first();
      if (!member) return json({ error: "Member tidak ditemukan." }, 404);

      if (status) {
        await env.DB.prepare(
          "INSERT OR IGNORE INTO payments (member_id, month_period, amount) VALUES (?, ?, ?)"
        )
          .bind(member_id, month_period, MONTH_FEE)
          .run();
      } else {
        await env.DB.prepare(
          "DELETE FROM payments WHERE member_id = ? AND month_period = ?"
        )
          .bind(member_id, month_period)
          .run();
      }
      return json({ ok: true, member_id, month_period, status });
    }

    // --- Add expense ---
    if (method === "POST" && path === "expenses") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body JSON tidak valid." }, 400);
      }
      const description = String(body.description || "").trim();
      const amount = Number(body.amount);
      const expense_date = String(body.expense_date || "");

      if (!description) return json({ error: "Deskripsi wajib diisi." }, 400);
      if (!Number.isInteger(amount) || amount <= 0)
        return json({ error: "Nominal harus angka > 0." }, 400);
      if (!DATE_RE.test(expense_date))
        return json({ error: "expense_date harus format YYYY-MM-DD." }, 400);

      const res = await env.DB.prepare(
        "INSERT INTO expenses (description, amount, expense_date) VALUES (?, ?, ?)"
      )
        .bind(description, amount, expense_date)
        .run();
      return json({ ok: true, id: res.meta?.last_row_id ?? null });
    }

    // --- Delete expense ---
    if (method === "DELETE" && path.startsWith("expenses/")) {
      const id = Number(path.split("/")[1]);
      if (!Number.isInteger(id) || id <= 0)
        return json({ error: "ID tidak valid." }, 400);
      await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
      return json({ ok: true, id });
    }

    // --- Add member / toggle active ---
    // POST /api/members { name }  -> add
    // POST /api/members { id, is_active } -> toggle active
    if (method === "POST" && path === "members") {
      let body = {};
      try {
        body = await request.json();
      } catch {
        return json({ error: "Body JSON tidak valid." }, 400);
      }
      if (body.name !== undefined) {
        const name = String(body.name || "").trim().toUpperCase();
        if (!name) return json({ error: "Nama wajib diisi." }, 400);
        const res = await env.DB.prepare(
          "INSERT INTO members (name, is_active) VALUES (?, 1)"
        )
          .bind(name)
          .run();
        return json({ ok: true, id: res.meta?.last_row_id ?? null, name });
      }
      if (body.id !== undefined) {
        const id = Number(body.id);
        const is_active = Number(body.is_active) ? 1 : 0;
        if (!Number.isInteger(id) || id <= 0)
          return json({ error: "ID tidak valid." }, 400);
        await env.DB.prepare("UPDATE members SET is_active = ? WHERE id = ?")
          .bind(is_active, id)
          .run();
        return json({ ok: true, id, is_active });
      }
      return json({ error: "Kirim { name } atau { id, is_active }." }, 400);
    }

    return json({ error: "Not found." }, 404);
  } catch (err) {
    return json({ error: "Server error: " + (err?.message || err) }, 500);
  }
}
