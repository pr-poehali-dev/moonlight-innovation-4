"""
Управление проектами галереи: получение, создание, удаление, загрузка фото в S3.
"""
import json
import os
import base64
import uuid
import psycopg2
import boto3
from botocore.exceptions import ClientError


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_schema():
    return os.environ.get("MAIN_DB_SCHEMA", "public")


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    }


def check_admin(event):
    token = event.get("headers", {}).get("X-Admin-Token", "")
    return token == os.environ.get("ADMIN_TOKEN", "amg-admin-2024")


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    headers = cors_headers()

    # GET /projects — список проектов
    if method == "GET":
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, title, description, stage, images, created_at FROM {get_schema()}.projects WHERE hidden IS NOT TRUE ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        conn.close()
        projects = [
            {
                "id": r[0],
                "title": r[1],
                "description": r[2],
                "stage": r[3],
                "images": r[4] or [],
                "created_at": r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": headers, "body": json.dumps(projects, ensure_ascii=False)}

    # POST /projects — создать проект (только для админа)
    if method == "POST" and not path.endswith("/upload"):
        if not check_admin(event):
            return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Forbidden"})}
        body = json.loads(event.get("body") or "{}")
        title = body.get("title", "")
        description = body.get("description", "")
        stage = body.get("stage", "В производстве")
        images = body.get("images", [])
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {get_schema()}.projects (title, description, stage, images) VALUES (%s, %s, %s, %s) RETURNING id",
            (title, description, stage, images),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": headers, "body": json.dumps({"id": new_id})}

    # POST /projects/upload — загрузить фото в S3
    if method == "POST" and path.endswith("/upload"):
        if not check_admin(event):
            return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Forbidden"})}
        body = json.loads(event.get("body") or "{}")
        file_data = body.get("file")
        content_type = body.get("content_type", "image/jpeg")
        if not file_data:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "No file"})}
        image_bytes = base64.b64decode(file_data)
        ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
        key = f"gallery/{uuid.uuid4()}.{ext}"
        s3 = s3_client()
        s3.put_object(Bucket="files", Key=key, Body=image_bytes, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"url": cdn_url})}

    # DELETE /projects/{id} — удалить проект
    if method == "DELETE":
        if not check_admin(event):
            return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Forbidden"})}
        parts = path.rstrip("/").split("/")
        project_id = int(parts[-1]) if parts[-1].isdigit() else None
        if not project_id:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "No id"})}
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {get_schema()}.projects WHERE id = %s", (project_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

    return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}