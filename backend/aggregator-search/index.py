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
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "ru-RU,ru;q=0.9",
    "Accept-Encoding": "identity",
    "Connection": "close",
}

SEARCH_TOPICS = [
    {
        "id": "mining",
        "label": "Горное оборудование",
        "queries": ["горное оборудование ремонт", "горношахтное оборудование поставка"],
        "category": "Горное оборудование",
    },
    {
        "id": "crusher",
        "label": "Дробильное оборудование",
        "queries": ["дробильное оборудование", "дробилка запчасти ремонт"],
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
        "queries": ["отделочные работы", "ремонт отделка помещений"],
        "category": "Отделочные работы",
    },
]


def fetch_url(scheme: str, host: str, path: str, timeout=9) -> tuple:
    try:
        if scheme == "https":
            conn = http.client.HTTPSConnection(host, timeout=timeout)
        else:
            conn = http.client.HTTPConnection(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        if res.status in (301, 302, 303, 307, 308):
            loc = res.getheader("Location", "")
            conn.close()
            if loc.startswith("http"):
                p = urllib.parse.urlparse(loc)
                s = "https" if p.scheme == "https" else "http"
                return fetch_url(s, p.netloc, p.path + ("?" + p.query if p.query else ""), timeout)
            return "", res.status
        raw = res.read(150_000).decode("utf-8", errors="replace")
        conn.close()
        return raw, res.status
    except Exception as e:
        print(f"[fetch ERROR] {host}: {e}")
        return "", 0


def strip_html(html: str, max_len=8000) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-z#0-9]+;', '', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()[:max_len]


# ─── Площадки ─────────────────────────────────────────────────────────────────

def scrape_zakupki_44(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "zakupki.gov.ru",
        f"/epz/order/extendedsearch/results.html?searchString={enc}&morphology=on&fz44=on&pageNumber=1&sortBy=UPDATE_DATE&sortDirection=false&recordsPerPage=_10")
    print(f"[zakupki-44] status={status}, len={len(html)}")
    return strip_html(html), "zakupki.gov.ru (44-ФЗ)"


def scrape_zakupki_223(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "zakupki.gov.ru",
        f"/epz/order/extendedsearch/results.html?searchString={enc}&morphology=on&fz223=on&pageNumber=1&sortBy=UPDATE_DATE&sortDirection=false&recordsPerPage=_10")
    print(f"[zakupki-223] status={status}, len={len(html)}")
    return strip_html(html), "zakupki.gov.ru (223-ФЗ)"


def scrape_tendery(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "www.tendery.ru", f"/search/?q={enc}")
    print(f"[tendery.ru] status={status}, len={len(html)}")
    return strip_html(html), "tendery.ru"


def scrape_bicotender(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "bicotender.ru", f"/?search={enc}")
    print(f"[bicotender] status={status}, len={len(html)}")
    return strip_html(html), "bicotender.ru"


def scrape_sbast(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "tender.sberbank-ast.ru",
        f"/public/tender/list?q={enc}&status=active")
    print(f"[sberbank-ast] status={status}, len={len(html)}")
    return strip_html(html), "sberbank-ast.ru"


def scrape_tektorg(q: str) -> tuple:
    enc = urllib.parse.quote(q)
    html, status = fetch_url("https", "www.tektorg.ru",
        f"/procedures?searchText={enc}")
    print(f"[tektorg] status={status}, len={len(html)}")
    return strip_html(html), "tektorg.ru"


SCRAPERS = [
    scrape_zakupki_44,
    scrape_zakupki_223,
    scrape_tendery,
    scrape_bicotender,
    scrape_sbast,
    scrape_tektorg,
]


def scrape_all(query: str) -> list:
    pages = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(fn, query): fn.__name__ for fn in SCRAPERS}
        for fut in as_completed(futs, timeout=12):
            try:
                text, src = fut.result()
                if len(text.strip()) > 300:
                    pages.append((text, src))
                    print(f"[OK] {src}: {len(text)} chars")
                else:
                    print(f"[EMPTY] {futs[fut]}: {len(text)} chars")
            except Exception as e:
                print(f"[ERR] {futs[fut]}: {e}")
    return pages


# ─── DeepSeek ─────────────────────────────────────────────────────────────────

def deepseek_extract(topic: dict, pages: list) -> list:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        print("[deepseek] NO API KEY")
        return []
    if not pages:
        print("[deepseek] no pages")
        return []

    context = "\n\n".join(f"=== {src} ===\n{txt[:2000]}" for txt, src in pages[:6])
    print(f"[deepseek] {len(context)} chars, {len(pages)} sources, key={api_key[:8]}...")

    prompt = f"""Направление: {topic['label']}

Из текста ниже извлеки ВСЕ конкретные тендеры/закупки по теме "{topic['label']}".
Только конкретный тендер с номером или названием — НЕ каталоги и рекламу.
URL — прямая ссылка на тендер. Если не видно — составь из домена + номера.

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
            "max_tokens": 3000,
        })
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=25)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        raw = res.read(200_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        print(f"[deepseek] http={res.status}, keys={list(data.keys())}")
        if "error" in data:
            print(f"[deepseek API ERROR] {data['error']}")
            return []
        content = data["choices"][0]["message"]["content"]
        tenders = json.loads(content).get("tenders", [])
        print(f"[deepseek] extracted {len(tenders)} tenders")
        return tenders
    except Exception as e:
        print(f"[deepseek EXCEPTION] {e}")
        return []


def process_topic(topic: dict) -> list:
    all_pages = []
    seen = set()
    for q in topic["queries"][:2]:
        pages = scrape_all(q)
        for text, src in pages:
            key = f"{src}||{q}"
            if key not in seen:
                seen.add(key)
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
    """Поиск тендеров: скрапинг zakupki.gov + агрегаторов → DeepSeek извлекает тендеры."""
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

    topic = topics[0]
    print(f"[handler] topic={topic['id']}")

    try:
        results = process_topic(topic)
    except Exception as e:
        print(f"[handler ERROR] {e}")
        results = []

    for i, r in enumerate(results):
        r["id"] = 1000 + i + 1

    print(f"[handler] done: {len(results)} results")
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
