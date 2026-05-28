import json
import os
import base64
import boto3

ADMIN_LOGIN = "das-service@inbox.ru"
ADMIN_PASS = "autoremex2012"
S3_KEY = "aggregator/index.html"
BUCKET = "files"


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def handler(event: dict, context) -> dict:
    """Агрегатор: загрузка и получение HTML-файла администратором."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET — вернуть текущий HTML
    if method == "GET":
        try:
            s3 = get_s3()
            obj = s3.get_object(Bucket=BUCKET, Key=S3_KEY)
            html = obj["Body"].read().decode("utf-8")
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"html": html}),
            }
        except Exception:
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"html": None}),
            }

    # POST — загрузить новый HTML (требует авторизации)
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "login":
            ok = body.get("login") == ADMIN_LOGIN and body.get("password") == ADMIN_PASS
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"ok": ok}),
            }

        if action == "upload":
            if body.get("login") != ADMIN_LOGIN or body.get("password") != ADMIN_PASS:
                return {
                    "statusCode": 403,
                    "headers": {**cors, "Content-Type": "application/json"},
                    "body": json.dumps({"error": "Не авторизован"}),
                }
            html_content = body.get("html", "")
            s3 = get_s3()
            s3.put_object(
                Bucket=BUCKET,
                Key=S3_KEY,
                Body=html_content.encode("utf-8"),
                ContentType="text/html; charset=utf-8",
            )
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True}),
            }

    return {
        "statusCode": 400,
        "headers": {**cors, "Content-Type": "application/json"},
        "body": json.dumps({"error": "Неверный запрос"}),
    }
