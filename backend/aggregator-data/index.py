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
    """Преобразует дату любого формата в YYYY-MM-DD или None."""
    if not val:
        return None
    s = str(val).strip()
    # Уже YYYY-MM-DD
    import re
    m = re.search(r'(\d{4}-\d{2}-\d{2})', s)
    if m:
        return m.group(1)
    # DD.MM.YYYY
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
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
            orders = body.get("orders", [])
            added = 0
            skipped = 0
            errors = 0
            for o in orders:
                url = (o.get("url") or "").strip()
                if not url:
                    skipped += 1
                    continue
                try:
                    cur.execute(f"SELECT id FROM {T} WHERE url = %s LIMIT 1", (url,))
                    if cur.fetchone():
                        skipped += 1
                        continue
                    cur.execute(f"""
                        INSERT INTO {T} (external_id, source, title, description, customer_name,
                            processing_types, materials, region, price_from, price_to,
                            currency, deadline, published_at, status, contact_info,
                            payment_terms, category, platform_type, url,
                            user_status, comments, favorite, archived)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        str(o.get("external_id") or "")[:100],
                        str(o.get("source") or "")[:100],
                        str(o.get("title") or "")[:500],
                        str(o.get("description") or "")[:2000],
                        str(o.get("customer_name") or "")[:300],
                        str(o.get("processing_types") or "")[:300],
                        str(o.get("materials") or "")[:200],
                        str(o.get("region") or "")[:100],
                        o.get("price_from"),
                        o.get("price_to"),
                        str(o.get("currency") or "RUB")[:10],
                        safe_date(o.get("deadline")),
                        safe_date(o.get("published_at")),
                        str(o.get("status") or "active")[:20],
                        str(o.get("contact_info") or "")[:300],
                        str(o.get("payment_terms") or "")[:100],
                        str(o.get("category") or "")[:100],
                        str(o.get("platform_type") or "tender")[:20],
                        url,
                        str(o.get("user_status") or "Новый")[:50],
                        str(o.get("comments") or "")[:1000],
                        bool(o.get("favorite", False)),
                        bool(o.get("archived", False)),
                    ))
                    added += 1
                except Exception as e:
                    errors += 1
                    print(f"[upsert err] url={url[:60]}: {e}")
                    conn.rollback()
            conn.commit()
            conn.close()
            print(f"[upsert_many] added={added}, skipped={skipped}, errors={errors}")
            return {
                "statusCode": 200,
                "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True, "added": added, "skipped": skipped, "errors": errors}, ensure_ascii=False),
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