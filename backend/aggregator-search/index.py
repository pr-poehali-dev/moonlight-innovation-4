"""
Поиск тендеров через RSS zakupki.gov.ru и другие источники.
"""
import json
import os
import http.client
import urllib.parse
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import xml.etree.ElementTree as ET

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
BASE_HEADERS = {
    "User-Agent": UA,
    "Accept": "*/*",
    "Accept-Language": "ru-RU,ru;q=0.9",
    "Connection": "close",
}

SEARCH_TOPICS = [
    {"id": "mining",    "label": "Горное оборудование",    "queries": ["горное оборудование",          "горношахтное оборудование"],    "category": "Горное оборудование"},
    {"id": "crusher",   "label": "Дробильное оборудование", "queries": ["дробильное оборудование",      "дробилка"],                     "category": "Дробильное оборудование"},
    {"id": "smr",       "label": "СМР",                    "queries": ["строительно-монтажные работы", "монтаж оборудования"],          "category": "СМР"},
    {"id": "finishing", "label": "Отделочные работы",      "queries": ["отделочные работы",            "ремонт отделка помещений"],      "category": "Отделочные работы"},
]


def http_get(host: str, path: str, timeout=10) -> tuple:
    try:
        conn = http.client.HTTPSConnection(host, timeout=timeout)
        conn.request("GET", path, headers=BASE_HEADERS)
        res = conn.getresponse()
        if res.status in (301, 302, 303, 307, 308):
            loc = res.getheader("Location", "")
            conn.close()
            if loc.startswith("http"):
                p = urllib.parse.urlparse(loc)
                return http_get(p.netloc, p.path + ("?" + p.query if p.query else ""), timeout)
            return "", res.status
        raw = res.read(500_000).decode("utf-8", errors="replace")
        conn.close()
        print(f"[GET] {host}{path[:60]} -> {res.status}, {len(raw)}b")
        return raw, res.status
    except Exception as e:
        print(f"[GET ERR] {host}: {e}")
        return "", 0


def parse_rss(xml_text: str, source_label: str) -> list:
    """Парсим стандартный RSS — работает для zakupki.gov.ru и других."""
    results = []
    try:
        root = ET.fromstring(xml_text)
        channel = root.find("channel") or root
        items = channel.findall("item")
        print(f"[rss] {source_label}: {len(items)} items")
        for item in items:
            def g(tag):
                el = item.find(tag)
                return el.text.strip() if el is not None and el.text else ""

            title = g("title")
            link = g("link")
            desc = g("description")
            pub = g("pubDate")

            if not title:
                continue

            num_m = re.search(r'regNumber=([0-9A-Z\-/]+)', link + desc)
            number = num_m.group(1) if num_m else ""

            price_m = re.search(r'([\d\s]+[\.,]\d{2})\s*руб', desc)
            price = None
            if price_m:
                try:
                    price = float(price_m.group(1).replace(" ", "").replace(",", "."))
                except Exception:
                    pass

            region_m = re.search(r'(?:Регион|Место поставки)[:\s]+([^\n\r<|,]+)', desc)
            region = region_m.group(1).strip()[:80] if region_m else "Россия"

            cust_m = re.search(r'(?:Организация|Заказчик)[:\s]+([^\n\r<|]+)', desc)
            customer = cust_m.group(1).strip()[:150] if cust_m else "—"

            deadline_m = re.search(r'(?:Дата окончания|Срок)[:\s]+([\d\.]{8,10})', desc)
            deadline = deadline_m.group(1) if deadline_m else None

            results.append({
                "title": title[:200],
                "number": number or "—",
                "url": link or "",
                "customer": customer,
                "region": region,
                "price": price,
                "deadline": deadline,
                "published": pub[:10] if len(pub) >= 10 else None,
                "source": source_label,
                "proc_type": "",
            })
    except Exception as e:
        print(f"[rss parse err] {source_label}: {e}")
    return results


def search_zakupki_rss(query: str, fz: str = "44") -> list:
    enc = urllib.parse.quote(query)
    raw, status = http_get(
        "zakupki.gov.ru",
        f"/epz/order/extendedsearch/rss.html?searchString={enc}&morphology=on"
        f"&fz{fz}=on&pageNumber=1&sortBy=UPDATE_DATE&sortDirection=false&recordsPerPage=_20"
    )
    if status == 200 and "<item>" in raw:
        return parse_rss(raw, f"zakupki.gov.ru ({fz}-ФЗ)")
    print(f"[zakupki {fz}] no rss items, status={status}")
    return []


def strip_tags(html: str) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-z#0-9]+;', '', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()


def search_text_source(host: str, path: str, label: str) -> dict:
    raw, status = http_get(host, path)
    if status == 200 and len(raw) > 500:
        # Если RSS — тоже парсим
        if "<item>" in raw:
            items = parse_rss(raw, label)
            if items:
                return {"structured": items}
        text = strip_tags(raw)[:4000]
        if len(text) > 200:
            return {"text": text, "source": label}
    return {}


def deepseek_from_texts(topic: dict, chunks: list) -> list:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key or not chunks:
        return []
    context = "\n\n".join(f"=== {c['source']} ===\n{c['text'][:1500]}" for c in chunks[:4])
    prompt = f"""Направление: {topic['label']}

Из текста ниже извлеки ВСЕ конкретные тендеры/закупки по теме "{topic['label']}".
Только конкретный тендер с номером или названием — не каталоги и рекламу сайта.
URL — прямая ссылка с ID. Если не видно — составь из домена + номера.

Верни ТОЛЬКО JSON:
{{"tenders":[{{"title":"...","number":"...","url":"https://...","customer":"...","region":"...","price":null,"deadline":null,"published":null,"source":"домен","proc_type":"тип"}}]}}

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
        raw = res.read(200_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        if "error" in data:
            print(f"[deepseek ERR] {data['error']}")
            return []
        content = data["choices"][0]["message"]["content"]
        items = json.loads(content).get("tenders", [])
        print(f"[deepseek] {len(items)} from text")
        return items
    except Exception as e:
        print(f"[deepseek EX] {e}")
        return []


def normalize(t: dict, topic: dict) -> dict:
    url = (t.get("url") or "").strip()
    source = t.get("source") or (url.split("/")[2] if url.startswith("http") else "—")
    price = t.get("price")
    return {
        "id": 0,
        "external_id": str(t.get("number") or "—")[:60],
        "source": source,
        "title": (t.get("title") or "Без названия")[:200],
        "description": (t.get("title") or "")[:300],
        "customer_name": (t.get("customer") or "—")[:200],
        "processing_types": (t.get("proc_type") or topic["label"])[:200],
        "materials": "—",
        "region": (t.get("region") or "Россия")[:100],
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
    }


def process_topic(topic: dict) -> list:
    structured = []
    text_chunks = []
    queries = topic["queries"][:2]

    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = []
        for q in queries:
            enc = urllib.parse.quote(q)
            futs.append(ex.submit(search_zakupki_rss, q, "44"))
            futs.append(ex.submit(search_zakupki_rss, q, "223"))
            futs.append(ex.submit(search_text_source,
                "bicotender.ru", f"/rss/?search={enc}", "bicotender.ru"))
            futs.append(ex.submit(search_text_source,
                "www.fabrikant.ru", f"/trades/search/?q={enc}&type=buy&per_page=20", "fabrikant.ru"))

        for fut in as_completed(futs, timeout=13):
            try:
                res = fut.result()
                if isinstance(res, list):
                    structured.extend(res)
                elif isinstance(res, dict):
                    if res.get("structured"):
                        structured.extend(res["structured"])
                    elif res.get("text"):
                        text_chunks.append(res)
            except Exception as e:
                print(f"[fut err] {e}")

    print(f"[process] structured={len(structured)}, text_chunks={len(text_chunks)}")

    ai_tenders = deepseek_from_texts(topic, text_chunks) if text_chunks else []

    all_tenders = structured + ai_tenders
    seen = set()
    results = []
    for t in all_tenders:
        key = (t.get("url") or t.get("number") or t.get("title") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        results.append(normalize(t, topic))

    print(f"[process] final={len(results)}")
    return results


def handler(event: dict, context) -> dict:
    """Поиск тендеров: RSS zakupki.gov.ru (44/223-ФЗ) + bicotender + fabrikant."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    # Поддерживаем оба формата: { topic_id } и { query, category }
    topic_id = body.get("topic_id") or (event.get("queryStringParameters") or {}).get("topic_id")
    free_query = body.get("query", "").strip()
    category = body.get("category", "").strip()

    if free_query:
        # Фронтенд прислал произвольный запрос — создаём динамический топик
        topic = {
            "id": "custom",
            "label": category or "Тендеры",
            "queries": [free_query],
            "category": category or "Прочее",
        }
        print(f"[handler] free query: {free_query}")
    elif topic_id:
        matched = [t for t in SEARCH_TOPICS if t["id"] == topic_id]
        if not matched:
            return {
                "statusCode": 400,
                "headers": CORS,
                "body": json.dumps({"error": "Неизвестное направление", "results": [], "total": 0}, ensure_ascii=False),
            }
        topic = matched[0]
        print(f"[handler] topic={topic['id']}: {topic['label']}")
    else:
        # Нет ни query ни topic_id — берём первую тему по умолчанию
        topic = SEARCH_TOPICS[0]
        print(f"[handler] default topic: {topic['id']}")

    try:
        results = process_topic(topic)
    except Exception as e:
        print(f"[handler ERROR] {e}")
        results = []

    for i, r in enumerate(results):
        r["id"] = 1000 + i + 1

    print(f"[handler] DONE: {len(results)}")
    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": results,
            "total": len(results),
            "topic": topic["label"],
            "ai_powered": True,
        }, ensure_ascii=False),
    }