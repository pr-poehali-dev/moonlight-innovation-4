"""
CRUD для заказов агрегатора — хранение в PostgreSQL.
Действия: get_all, upsert_many, update_order, delete_order, bulk_import
"""
import json
import os
import psycopg2
from datetime import date

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def row_to_dict(row, cols):
    d = dict(zip(cols, row))
    for k in ("deadline", "published_at", "created_at", "updated_at"):
        if k in d and d[k] is not None:
            d[k] = str(d[k])[:10]
    for k in ("price_from", "price_to"):
        if k in d and d[k] is not None:
            d[k] = float(d[k])
    d["favorite"] = bool(d.get("favorite"))
    d["archived"] = bool(d.get("archived"))
    return d


def safe_date(val):
    if not val:
        return None
    try:
        return str(val)[:10]
    except Exception:
        return None


def handler(event: dict, context) -> dict:
    """Хранение заказов агрегатора в БД — синхронизация между устройствами."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "get_all")
    conn = get_db()
    cur = conn.cursor()
    T = f"{SCHEMA}.aggregator_orders"

    try:
        if action == "get_all":
            # Возвращаем все не удалённые заказы, новые сверху
            cur.execute(f"""
                SELECT id, external_id, source, title, description, customer_name,
                       processing_types, materials, region, price_from, price_to,
                       currency, deadline, published_at, status, contact_info,
                       payment_terms, category, platform_type, url,
                       user_status, comments, favorite, archived, created_at
                FROM {T}
                ORDER BY created_at DESC
            """)
            cols = [d[0] for d in cur.description]
            rows = [row_to_dict(r, cols) for r in cur.fetchall()]
            conn.close()
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"orders": rows, "total": len(rows)}, ensure_ascii=False),
            }

        elif action == "upsert_many":
            # Добавляем новые заказы (по url), игнорируем дубли
            orders = body.get("orders", [])
            added = 0
            for o in orders:
                url = o.get("url", "")
                if not url:
                    continue
                cur.execute(f"SELECT id FROM {T} WHERE url = %s LIMIT 1", (url,))
                if cur.fetchone():
                    continue  # уже есть
                cur.execute(f"""
                    INSERT INTO {T} (external_id, source, title, description, customer_name,
                        processing_types, materials, region, price_from, price_to,
                        currency, deadline, published_at, status, contact_info,
                        payment_terms, category, platform_type, url,
                        user_status, comments, favorite, archived)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    o.get("external_id", ""),
                    o.get("source", ""),
                    o.get("title", "")[:500],
                    o.get("description", "")[:2000],
                    o.get("customer_name", ""),
                    o.get("processing_types", ""),
                    o.get("materials", ""),
                    o.get("region", ""),
                    o.get("price_from"),
                    o.get("price_to"),
                    o.get("currency", "RUB"),
                    safe_date(o.get("deadline")),
                    safe_date(o.get("published_at")),
                    o.get("status", "active"),
                    o.get("contact_info", ""),
                    o.get("payment_terms", ""),
                    o.get("category", ""),
                    o.get("platform_type", "tender"),
                    url,
                    o.get("user_status", "Новый"),
                    o.get("comments", ""),
                    bool(o.get("favorite", False)),
                    bool(o.get("archived", False)),
                ))
                added += 1
            conn.commit()
            conn.close()
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True, "added": added}, ensure_ascii=False),
            }

        elif action == "update_order":
            # Обновляем поля пользователя: статус, комментарий, избранное, архив, контакты
            order_id = body.get("id")
            fields = {}
            for f in ("user_status", "comments", "favorite", "archived", "contact_info"):
                if f in body:
                    fields[f] = body[f]
            if not order_id or not fields:
                conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных"})}
            set_parts = ", ".join(f"{k} = %s" for k in fields)
            set_parts += ", updated_at = NOW()"
            cur.execute(
                f"UPDATE {T} SET {set_parts} WHERE id = %s",
                list(fields.values()) + [order_id]
            )
            conn.commit()
            conn.close()
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True}),
            }

        elif action == "delete_order":
            order_id = body.get("id")
            if not order_id:
                conn.close()
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет id"})}
            cur.execute(f"DELETE FROM {T} WHERE id = %s", (order_id,))
            conn.commit()
            conn.close()
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True}),
            }

        elif action == "clear_all":
            cur.execute(f"DELETE FROM {T}")
            cur.execute(f"ALTER SEQUENCE {SCHEMA}.aggregator_orders_id_seq RESTART WITH 1")
            conn.commit()
            conn.close()
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True}),
            }

        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}

    except Exception as e:
        conn.close()
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"error": str(e)}),
        }