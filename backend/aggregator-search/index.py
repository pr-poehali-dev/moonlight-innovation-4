"""
Поиск тендеров через DeepSeek по 4 направлениям бизнеса.
Скрапим несколько площадок параллельно, DeepSeek извлекает тендеры.
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

SEARCH_TOPICS = [
    {
        "id": "mining",
        "label": "Горное оборудование",
        "queries": [
            "ремонт горного оборудования",
            "поставка горного оборудования запчасти",
            "горношахтное оборудование ремонт",
        ],
        "category": "Горное оборудование",
    },
    {
        "id": "crusher",
        "label": "Дробильное оборудование",
        "queries": [
            "ремонт дробилки щековой конусной",
            "поставка дробильного оборудования",
            "запчасти дробилки грохот",
        ],
        "category": "Дробильное оборудование",
    },
    {
        "id": "smr",
        "label": "СМР",
        "queries": [
            "строительно-монтажные работы",
            "монтаж оборудования подряд",
            "строительный подряд смр",
        ],
        "category": "СМР (строительно-монтажные работы)",
    },
    {
        "id": "finishing",
        "label": "Отделочные работы",
        "queries": [
            "отделочные работы тендер",
            "ремонт отделка помещений подряд",
            "внутренняя отделка фасад",
        ],
        "category": "Отделочные работы",
    },
]


def fetch_page(host: str, path: str, timeout=8) -> str:
    try:
        conn = http.client.HTTPSConnection(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        if res.status in (301, 302, 303, 307, 308):
            loc = res.getheader("Location", "")
            conn.close()
            if loc.startswith("http"):
                p = urllib.parse.urlparse(loc)
                return fetch_page(p.netloc, p.path + ("?" + p.query if p.query else ""), timeout)
        raw = res.read(80_000).decode("utf-8", errors="replace")
        conn.close()
        print(f"[scrape] {host}{path[:60]} -> {len(raw)} bytes, status={res.status}")
        return raw
    except Exception as e:
        print(f"[scrape ERROR] {host}{path[:60]}: {e}")
        return ""


def strip_html(html: str, max_len=6000) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-z#0-9]+;', ' ', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()[:max_len]


# ─── Площадки (выбраны самые быстрые и открытые) ──────────────────────────────

def scrape_bicotender(q: str) -> tuple[str, str]:
    enc = urllib.parse.quote(q)
    html = fetch_page("bicotender.ru", f"/tender-search/?q={enc}")
    return strip_html(html), "bicotender.ru"


def scrape_fabrikant(q: str) -> tuple[str, str]:
    enc = urllib.parse.quote(q)
    html = fetch_page("www.fabrikant.ru", f"/trades/search/?q={enc}&type=buy&per_page=30")
    return strip_html(html), "fabrikant.ru"


def scrape_b2b(q: str) -> tuple[str, str]:
    enc = urllib.parse.quote(q)
    html = fetch_page("www.b2b-center.ru", f"/market/find.asp?what=0&search={enc}")
    return strip_html(html), "b2b-center.ru"


def scrape_tenderpro(q: str) -> tuple[str, str]:
    enc = urllib.parse.quote(q)
    html = fetch_page("www.tender.pro", f"/tenders?q={enc}&status=open")
    return strip_html(html), "tender.pro"


def scrape_rts(q: str) -> tuple[str, str]:
    enc = urllib.parse.quote(q)
    html = fetch_page("www.rts-tender.ru", f"/tender/procedure/list?searchText={enc}&pageSize=20")
    return strip_html(html), "rts-tender.ru"


SCRAPERS = [scrape_bicotender, scrape_fabrikant, scrape_b2b, scrape_tenderpro, scrape_rts]


def scrape_all(query: str) -> list[tuple[str, str]]:
    """Скрапим все площадки параллельно по одному запросу."""
    pages = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futs = {ex.submit(fn, query): fn.__name__ for fn in SCRAPERS}
        for fut in as_completed(futs, timeout=10):
            try:
                text, src = fut.result()
                if len(text.strip()) > 200:
                    pages.append((text, src))
                    print(f"[ok] {src}: {len(text)} chars")
                else:
                    print(f"[empty] {futs[fut]}: too short ({len(text)} chars)")
            except Exception as e:
                print(f"[err] {futs[fut]}: {e}")
    return pages


# ─── DeepSeek ─────────────────────────────────────────────────────────────────

def deepseek_extract(topic: dict, pages: list[tuple[str, str]]) -> list[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        print("[deepseek] NO API KEY")
        return []
    if not pages:
        print("[deepseek] no pages to analyze")
        return []

    context = "\n\n".join(f"=== {src} ===\n{txt[:2500]}" for txt, src in pages[:5])
    print(f"[deepseek] sending {len(context)} chars, {len(pages)} sources")

    prompt = f"""Направление бизнеса: {topic['label']}

Из текста ниже извлеки ВСЕ конкретные тендеры/закупки/заказы по теме "{topic['label']}".

ПРАВИЛА:
- Только конкретный тендер с названием и/или номером — НЕ каталоги, списки компаний, рекламу
- URL должен вести на страницу конкретного тендера (содержит числовой ID или номер)
- Если URL не виден — составь из домена + номера (например https://bicotender.ru/tender123456.html)
- Нерелевантные тендеры — пропускай

Верни ТОЛЬКО JSON без пояснений:
{{"tenders":[{{"title":"название тендера","number":"номер/ID","url":"https://прямая-ссылка","customer":"заказчик","region":"регион России","price":null,"deadline":"YYYY-MM-DD или null","published":"YYYY-MM-DD или null","source":"bicotender.ru/fabrikant.ru/b2b-center.ru/tender.pro/rts-tender.ru","proc_type":"Ремонт оборудования/Поставка/СМР/Отделочные работы"}}]}}

Текст страниц:
{context}"""

    try:
        payload = json.dumps({
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "max_tokens": 3000,
        })
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=25)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        raw = res.read(150_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        print(f"[deepseek] usage: {data.get('usage')}")
        content = data["choices"][0]["message"]["content"]
        tenders = json.loads(content).get("tenders", [])
        print(f"[deepseek] extracted {len(tenders)} tenders")
        return tenders
    except Exception as e:
        print(f"[deepseek ERROR] {e}")
        return []


def process_topic(topic: dict) -> list[dict]:
    # Берём 2 разных запроса → скрапим по каждому → объединяем страницы
    all_pages = []
    seen_srcs = set()
    for q in topic["queries"][:2]:
        pages = scrape_all(q)
        for text, src in pages:
            key = f"{src}-{q}"
            if key not in seen_srcs:
                seen_srcs.add(key)
                all_pages.append((text, src))

    tenders = deepseek_extract(topic, all_pages)

    results = []
    seen_keys = set()
    for t in tenders:
        url = (t.get("url") or "").strip()
        key = url or (t.get("title") or "").strip()
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
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
    """Поиск тендеров: скрапинг 5 площадок → DeepSeek извлекает конкретные тендеры."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if not os.environ.get("DEEPSEEK_API_KEY", "").strip():
        return {
            "statusCode": 503,
            "headers": CORS,
            "body": json.dumps({
                "error": "DEEPSEEK_API_KEY не задан. Добавьте в Ядро → Секреты.",
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
    topics = [t for t in SEARCH_TOPICS if t["id"] == topic_id] if topic_id else SEARCH_TOPICS

    if not topics:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "Неизвестное направление", "results": [], "total": 0}, ensure_ascii=False),
        }

    # Обрабатываем одно направление за вызов (укладываемся в таймаут)
    topic = topics[0]
    print(f"[handler] topic={topic['id']}, label={topic['label']}")

    try:
        results = process_topic(topic)
    except Exception as e:
        print(f"[handler ERROR] {e}")
        results = []

    for i, r in enumerate(results):
        r["id"] = 1000 + i + 1

    print(f"[handler] done, {len(results)} results")
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
