import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    salt = "calc_salt_2024"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def make_token(user_id: int) -> str:
    return hashlib.sha256(f"{ADMIN_TOKEN}{user_id}{secrets.token_hex(8)}".encode()).hexdigest()


def ok(data: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(data, ensure_ascii=False)}


def err(msg: str, status: int = 400) -> dict:
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Управление пользователями калькулятора: регистрация, вход, настройки, список для админа."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "")
    headers = event.get("headers") or {}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        # ── POST /register ─────────────────────────────────────────────────
        if method == "POST" and action == "register":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "").strip()
            city = body.get("city", "").strip()
            phone = body.get("phone", "").strip()
            company = body.get("company", "").strip()
            full_name = body.get("full_name", "").strip()

            if not email or not password:
                return err("Email и пароль обязательны")
            if len(password) < 6:
                return err("Пароль минимум 6 символов")

            cur.execute(
                f"SELECT id FROM {SCHEMA}.calc_users WHERE email = %s",
                (email,)
            )
            if cur.fetchone():
                return err("Пользователь с таким email уже существует")

            pw_hash = hash_password(password)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.calc_users (email, password_hash, city, phone, company, full_name)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (email, pw_hash, city, phone, company, full_name)
            )
            user_id = cur.fetchone()[0]
            conn.commit()

            token = make_token(user_id)
            return ok({
                "success": True,
                "user": {"id": user_id, "email": email, "city": city,
                         "phone": phone, "company": company, "full_name": full_name},
                "token": token
            })

        # ── POST /login ─────────────────────────────────────────────────────
        if method == "POST" and action == "login":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "").strip()

            if not email or not password:
                return err("Email и пароль обязательны")

            pw_hash = hash_password(password)
            cur.execute(
                f"""SELECT id, email, city, phone, company, full_name
                    FROM {SCHEMA}.calc_users
                    WHERE email = %s AND password_hash = %s""",
                (email, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return err("Неверный email или пароль", 401)

            user_id, email, city, phone, company, full_name = row
            cur.execute(
                f"UPDATE {SCHEMA}.calc_users SET last_login = NOW() WHERE id = %s",
                (user_id,)
            )
            conn.commit()

            token = make_token(user_id)
            return ok({
                "success": True,
                "user": {"id": user_id, "email": email, "city": city,
                         "phone": phone, "company": company, "full_name": full_name},
                "token": token
            })

        # ── GET /settings — получить настройки пользователя ────────────────
        if method == "GET" and action == "settings":
            user_id = qs.get("user_id")
            if not user_id:
                return err("user_id обязателен")

            cur.execute(
                f"SELECT settings_json FROM {SCHEMA}.calc_settings WHERE user_id = %s",
                (int(user_id),)
            )
            row = cur.fetchone()
            if not row:
                return ok({"settings": None})
            return ok({"settings": json.loads(row[0])})

        # ── POST /settings — сохранить настройки пользователя ──────────────
        if method == "POST" and action == "settings":
            user_id = body.get("user_id")
            settings_data = body.get("settings")
            if not user_id or settings_data is None:
                return err("user_id и settings обязательны")

            settings_json = json.dumps(settings_data, ensure_ascii=False)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.calc_settings (user_id, settings_json, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (user_id)
                    DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = NOW()""",
                (int(user_id), settings_json)
            )
            conn.commit()
            return ok({"success": True})

        # ── GET /users — список пользователей (только для админа) ──────────
        if method == "GET" and action == "users":
            admin_token = headers.get("x-auth-token") or headers.get("X-Auth-Token") or qs.get("admin_token", "")
            if not ADMIN_TOKEN or admin_token != ADMIN_TOKEN:
                return err("Доступ запрещён", 403)

            cur.execute(
                f"""SELECT u.id, u.email, u.full_name, u.city, u.phone, u.company,
                           u.created_at, u.last_login,
                           CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_settings
                    FROM {SCHEMA}.calc_users u
                    LEFT JOIN {SCHEMA}.calc_settings s ON s.user_id = u.id
                    ORDER BY u.created_at DESC"""
            )
            rows = cur.fetchall()
            users = []
            for r in rows:
                users.append({
                    "id": r[0],
                    "email": r[1],
                    "full_name": r[2] or "",
                    "city": r[3] or "",
                    "phone": r[4] or "",
                    "company": r[5] or "",
                    "created_at": r[6].isoformat() if r[6] else None,
                    "last_login": r[7].isoformat() if r[7] else None,
                    "has_settings": r[8],
                })
            return ok({"users": users, "total": len(users)})

        # ── GET /user-settings — настройки конкретного пользователя для админа ──
        if method == "GET" and action == "user-settings":
            admin_token = headers.get("x-auth-token") or headers.get("X-Auth-Token") or qs.get("admin_token", "")
            if not ADMIN_TOKEN or admin_token != ADMIN_TOKEN:
                return err("Доступ запрещён", 403)

            user_id = qs.get("user_id")
            if not user_id:
                return err("user_id обязателен")

            cur.execute(
                f"""SELECT u.email, u.full_name, u.city, u.phone, u.company, s.settings_json
                    FROM {SCHEMA}.calc_users u
                    LEFT JOIN {SCHEMA}.calc_settings s ON s.user_id = u.id
                    WHERE u.id = %s""",
                (int(user_id),)
            )
            row = cur.fetchone()
            if not row:
                return err("Пользователь не найден", 404)

            return ok({
                "email": row[0],
                "full_name": row[1] or "",
                "city": row[2] or "",
                "phone": row[3] or "",
                "company": row[4] or "",
                "settings": json.loads(row[5]) if row[5] else None,
            })

        return err("Неизвестный action", 404)

    finally:
        cur.close()
        conn.close()
