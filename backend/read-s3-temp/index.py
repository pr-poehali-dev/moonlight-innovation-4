"""Временная функция для чтения файла из S3. v4"""
import os
import boto3
import json

def handler(event: dict, context) -> dict:
    """Ищет calculator 1.2.html в bucket 'files' по разным префиксам."""
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    prefixes = ['', 'uploads/', 'files/', 'documents/', 'user/', 'public/']
    all_found = []

    for prefix in prefixes:
        try:
            resp = s3.list_objects_v2(Bucket='files', Prefix=prefix, MaxKeys=100)
            keys = [obj['Key'] for obj in resp.get('Contents', [])]
            if keys:
                print(f"[prefix={prefix!r}] {keys}")
                all_found.extend(keys)
        except Exception as e:
            print(f"[prefix={prefix!r}] ERROR: {e}")

    print(f"[all found] {all_found}")

    for f in all_found:
        if 'calculator' in f.lower() or 'calc' in f.lower():
            obj = s3.get_object(Bucket='files', Key=f)
            content = obj['Body'].read().decode('utf-8', errors='replace')
            print(f"[found] key={f}, len={len(content)}")
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain'},
                'body': content[:60000]
            }

    return {
        'statusCode': 404,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'all_found': list(set(all_found))}, ensure_ascii=False)
    }