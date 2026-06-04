"""Временная функция для чтения файла из S3."""
import os
import boto3

def handler(event: dict, context) -> dict:
    """Читает calculator 1.2.html из S3 и возвращает содержимое."""
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

    # Список всех файлов включая вложенные папки
    all_files = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket='files'):
        for obj in page.get('Contents', []):
            all_files.append(obj['Key'])
    print(f"[s3 all files] {all_files}")

    # Ищем калькулятор
    calc_key = None
    for f in all_files:
        if 'calculator' in f.lower() or 'Calculator' in f:
            calc_key = f
            break

    if not calc_key:
        return {'statusCode': 404, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': f'Not found. All files: {all_files}'}

    obj = s3.get_object(Bucket='files', Key=calc_key)
    content = obj['Body'].read().decode('utf-8', errors='replace')
    print(f"[s3 found] key={calc_key}, len={len(content)}")
    return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain'}, 'body': content[:60000]}
