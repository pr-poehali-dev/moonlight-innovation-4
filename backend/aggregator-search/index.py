"""
Автоматический поиск тендеров по 4 направлениям бизнеса:
1. Горное оборудование — ремонт и поставка
2. Дробильное оборудование — ремонт и поставка
3. Строительно-монтажные работы (СМР)
4. Отделочные работы

Процесс: скрапинг 5 тендерных площадок → DeepSeek извлекает конкретные тендеры
Без сторонних платных API.
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

# ─── 4 направления бизнеса — фиксированные поисковые запросы ──────────────────

SEARCH_TOPICS = [
    {
        "id": "mining",
        "label": "Горное оборудование",
        "queries": [
            "ремонт горного оборудования",
            "поставка горного оборудования",
            "ремонт шахтного оборудования",
        ],
        "category": "Горное оборудование",
    },
    {
        "id": "crusher",
        "label": "Дробильное оборудование",
        "queries": [
            "ремонт дробильного оборудования",
            "поставка дробилки щековой конусной",
            "ремонт дробилки запчасти",
        ],
        "category": "Дробильное оборудование",
    },
    {
        "id": "smr",
        "label": "СМР",
        "queries": [
            "строительно-монтажные работы тендер",
            "СМР подряд",
            "монтаж оборудования строительство",
        ],
        "category": "СМР (строительно-монтажные работы)",
    },
    {
        "id": "finishing",
        "label": "Отделочные работы",
        "queries": [
            "отделочные работы тендер",
            "ремонт отделка помещений подряд",
            "отделка фасада внутренняя отделка",
        ],
        "category": "Отделочные работы",
    },
]


# ─── Скрапинг тендерных площадок ──────────────────────────────────────────────

def fetch_page(host: str, path: str, timeout=10) -> str:
    try:
        conn = http.client.HTTPSConnection(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        if res.status in (301, 302, 303, 307, 308):
            loc = res.getheader("Location", "")
            conn.close()
            if loc.startswith("http"):
                p = urllib.parse.urlparse(loc)
                return fetch_page(p.netloc, p.path + ("?" + p.query if p.query else ""))
        raw = res.read(60_000).decode("utf-8", errors="replace")
        conn.close()
        return raw
    except Exception:
        return ""


def strip_html(html: str, max_len=4000) -> str:
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-z#0-9]+;', ' ', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()[:max_len]


def scrape_query(q: str) -> list[tuple[str, str]]:
    """Скрапит 5 площадок по одному запросу, возвращает [(text, source), ...]."""
    enc = urllib.parse.quote(q)
    targets = [
        ("bicotender.ru",      f"/tender-search/?q={enc}",                    "bicotender.ru"),
        ("zakupki.kontur.ru",  f"/search?query={enc}&status=application",      "zakupki.kontur.ru"),
        ("www.fabrikant.ru",   f"/trades/search/?q={enc}&type=buy",            "fabrikant.ru"),
        ("www.rts-tender.ru",  f"/tender/procedure/list?searchText={enc}",     "rts-tender.ru"),
        ("www.b2b-center.ru",  f"/rss/trade/?search={enc}&deal_type=buy",      "b2b-center.ru"),
    ]
    results = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futs = {ex.submit(fetch_page, host, path): src for host, path, src in targets}
        for fut in as_completed(futs):
            src = futs[fut]
            try:
                html = fut.result()
                text = strip_html(html)
                if len(text) > 100:
                    results.append((text, src))
            except Exception:
                pass
    return results


# ─── DeepSeek: извлекает тендеры из текста площадок ──────────────────────────

def deepseek_extract(topic: dict, pages: list[tuple[str, str]]) -> list[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY не задан — добавьте ключ в секреты проекта")
    if not pages:
        return []

    context = "\n\n".join(
        f"=== {src} ===\n{txt[:2500]}" for txt, src in pages
    )

    prompt = f"""Направление бизнеса: {topic['label']}
Категория поиска: {topic['category']}

Ниже — текст страниц поиска с тендерных площадок. Твоя задача: извлечь ТОЛЬКО конкретные тендеры/закупки/заказы, которые относятся к направлению "{topic['label']}".

Строгие правила:
- Каждая позиция = ОДИН конкретный тендер с собственным номером/ID
- НЕ включай: каталоги компаний, статьи, рекламу, страницы организаций, списки без номера
- URL должен вести на страницу конкретного тендера (содержать цифровой ID или номер закупки)
- Если URL тендера не виден явно — попробуй восстановить по шаблону площадки и номеру тендера
- Если тендер нерелевантен направлению "{topic['label']}" — пропусти его

Верни ТОЛЬКО JSON без пояснений:
{{
  "tenders": [
    {{
      "title": "Точное название тендера из текста",
      "number": "номер закупки/ID тендера",
      "url": "https://площадка/конкретная-страница-тендера",
      "customer": "название заказчика",
      "region": "регион России",
      "price": null или число (НМЦ в рублях),
      "deadline": "YYYY-MM-DD или null",
      "published": "YYYY-MM-DD или null",
      "source": "bicotender.ru / zakupki.kontur.ru / fabrikant.ru / rts-tender.ru / b2b-center.ru",
      "proc_type": "краткий тип: Ремонт оборудования / Поставка / СМР / Отделочные работы / и т.п."
    }}
  ]
}}

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
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=45)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        raw = res.read(150_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        content = data["choices"][0]["message"]["content"]
        return json.loads(content).get("tenders", [])
    except Exception:
        return []


# ─── Обработка одного направления ─────────────────────────────────────────────

def process_topic(topic: dict) -> list[dict]:
    """Скрапит площадки по всем запросам темы, затем DeepSeek извлекает тендеры."""
    all_pages = []
    seen_sources = set()

    # Берём первые 2 запроса из темы (не перегружаем)
    for q in topic["queries"][:2]:
        pages = scrape_query(q)
        for text, src in pages:
            key = f"{src}:{q}"
            if key not in seen_sources:
                seen_sources.add(key)
                all_pages.append((text, src))

    tenders = deepseek_extract(topic, all_pages)

    results = []
    seen_urls = set()
    for t in tenders:
        url = (t.get("url") or "").strip()
        title = (t.get("title") or "").strip()
        key = url or title
        if not key or key in seen_urls:
            continue
        seen_urls.add(key)

        price = t.get("price")
        source = t.get("source") or (url.split("/")[2] if url.startswith("http") else "—")

        results.append({
            "id": 0,
            "external_id": t.get("number") or "—",
            "source": source,
            "title": title[:200],
            "description": title,
            "customer_name": t.get("customer") or "Заказчик",
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


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """
    Автопоиск тендеров по 4 направлениям бизнеса через DeepSeek.
    GET / — запускает поиск по всем 4 направлениям.
    POST / с {"topic_id": "mining"} — поиск по одному направлению.
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    # Выбираем направления
    topic_id = body.get("topic_id") or event.get("queryStringParameters", {}).get("topic_id")
    if topic_id:
        topics = [t for t in SEARCH_TOPICS if t["id"] == topic_id]
    else:
        topics = SEARCH_TOPICS  # все 4

    if not topics:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "Неизвестное направление"}, ensure_ascii=False),
        }

    # Проверяем ключ до запуска
    if not os.environ.get("DEEPSEEK_API_KEY", "").strip():
        return {
            "statusCode": 503,
            "headers": CORS,
            "body": json.dumps({
                "error": "DEEPSEEK_API_KEY не задан. Добавьте ключ в Ядро → Секреты → DEEPSEEK_API_KEY. Получить: platform.deepseek.com",
                "results": [],
                "total": 0,
            }, ensure_ascii=False),
        }

    all_results = []
    # Направления обрабатываем параллельно (но ограничиваем 2 за раз — лимит DeepSeek)
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(process_topic, topic): topic["id"] for topic in topics}
        for fut in as_completed(futs):
            try:
                results = fut.result()
                all_results.extend(results)
            except Exception:
                pass

    # Нумерация
    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    # Группировка по направлениям для ответа
    by_topic = {}
    for r in all_results:
        tid = r.get("topic_id", "other")
        by_topic.setdefault(tid, []).append(r)

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": all_results,
            "total": len(all_results),
            "by_topic": {tid: len(items) for tid, items in by_topic.items()},
            "topics": [t["label"] for t in topics],
            "ai_powered": True,
        }, ensure_ascii=False),
    }