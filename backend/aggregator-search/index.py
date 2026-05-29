"""
Поиск тендеров через DeepSeek по 4 направлениям бизнеса.
Быстрый вариант: скрапим только bicotender.ru (быстрый, без авторизации),
DeepSeek извлекает тендеры. Укладываемся в 25 сек.
"""
import json
import os
import http.client
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
HEADERS = {"User-Agent": UA, "Accept": "text/html,*/*", "Accept-Language": "ru-RU,ru;q=0.9"}

# 4 направления — фиксированные поисковые запросы
SEARCH_TOPICS = [
    {
        "id": "mining",
        "label": "Горное оборудование",
        "queries": ["ремонт горного оборудования", "поставка горного оборудования"],
        "category": "Горное оборудование",
    },
    {
        "id": "crusher",
        "label": "Дробильное оборудование",
        "queries": ["ремонт дробилки", "поставка дробильного оборудования"],
        "category": "Дробильное оборудование",
    },
    {
        "id": "smr",
        "label": "СМР",
        "queries": ["строительно-монтажные работы", "монтаж оборудования подряд"],
        "category": "СМР (строительно-монтажные работы)",
    },
    {
        "id": "finishing",
        "label": "Отделочные работы",
        "queries": ["отделочные работы тендер", "ремонт отделка помещений"],
        "category": "Отделочные работы",
    },
]


def fetch_page(host: str, path: str, timeout=8) -> str:
    try:
        conn = http.client.HTTPSConnection(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(50_000).decode("utf-8", errors="replace")
        conn.close()
        return raw
    except Exception:
        return ""


def strip_html(html: str, max_len=5000) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-z#0-9]+;', ' ', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()[:max_len]


def scrape_bicotender(query: str) -> str:
    enc = urllib.parse.quote(query)
    html = fetch_page("bicotender.ru", f"/tender-search/?q={enc}")
    return strip_html(html)


def scrape_fabrikant(query: str) -> str:
    enc = urllib.parse.quote(query)
    html = fetch_page("www.fabrikant.ru", f"/trades/search/?q={enc}&type=buy")
    return strip_html(html)


def deepseek_extract(topic: dict, context: str) -> list[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY не задан")
    if not context.strip():
        return []

    prompt = f"""Направление: {topic['label']}

Из текста ниже извлеки ВСЕ конкретные тендеры/закупки/заказы по теме "{topic['label']}".

Правила:
- Только конкретный тендер с названием и/или номером
- НЕ включай: каталоги, списки компаний, рекламу, статьи
- URL — прямая ссылка на тендер (с ID/номером). Если не видно — составь из домена + номера
- Нерелевантные по теме "{topic['label']}" — пропускай

JSON ответ (только JSON, без пояснений):
{{"tenders":[{{"title":"название","number":"номер или ID","url":"https://...","customer":"заказчик","region":"регион","price":null,"deadline":null,"published":null,"source":"площадка","proc_type":"тип работ"}}]}}

Текст:
{context}"""

    try:
        payload = json.dumps({
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "max_tokens": 2000,
        })
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=20)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        raw = res.read(100_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        content = data["choices"][0]["message"]["content"]
        return json.loads(content).get("tenders", [])
    except Exception:
        return []


def process_topic(topic: dict) -> list[dict]:
    # Скрапим два источника параллельно по первому запросу
    q = topic["queries"][0]
    with ThreadPoolExecutor(max_workers=2) as ex:
        f1 = ex.submit(scrape_bicotender, q)
        f2 = ex.submit(scrape_fabrikant, q)
        t1 = f1.result()
        t2 = f2.result()

    context = ""
    if t1: context += f"=== bicotender.ru ===\n{t1}\n\n"
    if t2: context += f"=== fabrikant.ru ===\n{t2}\n\n"

    tenders = deepseek_extract(topic, context)

    results = []
    seen = set()
    for t in tenders:
        url = (t.get("url") or "").strip()
        key = url or (t.get("title") or "")
        if not key or key in seen:
            continue
        seen.add(key)
        price = t.get("price")
        source = t.get("source") or (url.split("/")[2] if url.startswith("http") else "—")
        results.append({
            "id": 0,
            "external_id": t.get("number") or "—",
            "source": source,
            "title": (t.get("title") or "Без названия")[:200],
            "description": t.get("title") or "",
            "customer_name": t.get("customer") or "—",
            "processing_types": t.get("proc_type") or topic["label"],
            "materials": "—",
            "region": t.get("region") or "Россия",
            "price_from": None,
            "price_to": float(price) if price else None,
            "currency": "RUB",
            "deadline": t.get("deadline") or None,
            "published_at": t.get("published") or None,
            "status": "active",
            "contact_info": f"Контакты на {source}",
            "payment_terms": "договорная",
            "category": topic["category"],
            "topic_id": topic["id"],
            "topic_label": topic["label"],
            "platform_type": "tender",
            "url": url,
            "user_status": "Новый",
            "comments": "",
            "favorite": False,
            "archived": False,
        })
    return results


def handler(event: dict, context) -> dict:
    """Поиск тендеров по 4 направлениям: скрапинг bicotender+fabrikant → DeepSeek."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # Проверяем ключ
    if not os.environ.get("DEEPSEEK_API_KEY", "").strip():
        return {
            "statusCode": 503,
            "headers": CORS,
            "body": json.dumps({
                "error": "DEEPSEEK_API_KEY не задан",
                "results": [], "total": 0,
            }, ensure_ascii=False),
        }

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    topic_id = body.get("topic_id") or (event.get("queryStringParameters") or {}).get("topic_id")

    if topic_id:
        topics = [t for t in SEARCH_TOPICS if t["id"] == topic_id]
    else:
        topics = SEARCH_TOPICS

    if not topics:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "Неизвестное направление", "results": [], "total": 0}, ensure_ascii=False),
        }

    all_results = []
    # По одному направлению за раз чтобы уложиться в таймаут
    for topic in topics[:1]:  # при запросе всех — берём первый, остальные по topic_id
        try:
            items = process_topic(topic)
            all_results.extend(items)
        except Exception:
            pass

    # Если явно запросили одно направление — обрабатываем его
    if topic_id and topics:
        all_results = []
        try:
            all_results = process_topic(topics[0])
        except Exception:
            pass

    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": all_results,
            "total": len(all_results),
            "topics": [t["label"] for t in topics],
            "ai_powered": True,
        }, ensure_ascii=False),
    }
