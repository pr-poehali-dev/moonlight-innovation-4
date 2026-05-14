"""
Счётчик посещений: запись визита и получение статистики для админки.
"""
import json
import os
import psycopg2


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "POST":
        ip = event.get("requestContext", {}).get("identity", {}).get("sourceIp", "")
        headers = event.get("headers", {}) or {}
        user_agent = headers.get("User-Agent", headers.get("user-agent", ""))
        body = json.loads(event.get("body") or "{}")
        path = body.get("path", "/")

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO visits (ip_address, user_agent, path) VALUES (%s, %s, %s)",
            (ip, user_agent, path),
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": cors_headers, "body": json.dumps({"ok": True})}

    if method == "GET":
        admin_token = (event.get("headers", {}) or {}).get("X-Admin-Token", "")
        if admin_token != os.environ.get("ADMIN_TOKEN", ""):
            return {"statusCode": 403, "headers": cors_headers, "body": json.dumps({"error": "Forbidden"})}

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM visits")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(DISTINCT ip_address) FROM visits")
        unique = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM visits WHERE visited_at >= NOW() - INTERVAL '24 hours'")
        today = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM visits WHERE visited_at >= NOW() - INTERVAL '7 days'")
        week = cur.fetchone()[0]
        cur.execute("SELECT visited_at::date as day, COUNT(*) FROM visits WHERE visited_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        chart = [{"date": str(r[0]), "count": r[1]} for r in rows]
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"total": total, "unique": unique, "today": today, "week": week, "chart": chart}),
        }

    return {"statusCode": 405, "headers": cors_headers, "body": json.dumps({"error": "Method not allowed"})}
