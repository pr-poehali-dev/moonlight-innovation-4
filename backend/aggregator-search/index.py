"""
Поиск тендеров через DeepSeek:
1. DeepSeek получает запрос пользователя
2. Скрапим страницы поиска тендерных площадок (bicotender, zakupki.kontur, fabrikant и др.)
3. DeepSeek разбирает HTML → извлекает конкретные тендеры с номерами и прямыми ссылками
4. Возвращаем структурированный список — каждая строка = один тендер

Без сторонних API (Serper, zakupki.gov API, tender.pro API и т.д.)
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


# ─── Скрапинг страниц поиска тендерных площадок ───────────────────────────────

def fetch_page(host: str, path: str, timeout=12) -> str:
    """Загружает HTML страницу и возвращает текст (до 80 Кб)."""
    try:
        conn = http.client.HTTPSConnection(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        if res.status in (301, 302, 303, 307, 308):
            loc = res.getheader("Location", "")
            conn.close()
            if loc.startswith("http"):
                parsed = urllib.parse.urlparse(loc)
                return fetch_page(parsed.netloc, parsed.path + ("?" + parsed.query if parsed.query else ""))
        raw = res.read(80_000).decode("utf-8", errors="replace")
        conn.close()
        return raw
    except Exception:
        return ""


def strip_html(html: str) -> str:
    """Убирает теги, лишние пробелы — оставляет читаемый текст."""
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-z]+;', ' ', text)
    text = re.sub(r'\s{3,}', '\n', text)
    return text.strip()[:15_000]


def scrape_bicotender(query: str) -> tuple[str, str]:
    enc = urllib.parse.quote(query)
    url = f"https://bicotender.ru/tender-search/?q={enc}"
    html = fetch_page("bicotender.ru", f"/tender-search/?q={enc}")
    return strip_html(html), "bicotender.ru"


def scrape_kontur(query: str) -> tuple[str, str]:
    enc = urllib.parse.quote(query)
    html = fetch_page("zakupki.kontur.ru", f"/search?query={enc}&status=application")
    return strip_html(html), "zakupki.kontur.ru"


def scrape_fabrikant(query: str) -> tuple[str, str]:
    enc = urllib.parse.quote(query)
    html = fetch_page("www.fabrikant.ru", f"/trades/search/?q={enc}&type=buy")
    return strip_html(html), "fabrikant.ru"


def scrape_rts(query: str) -> tuple[str, str]:
    enc = urllib.parse.quote(query)
    html = fetch_page("www.rts-tender.ru", f"/tender/procedure/list?searchText={enc}")
    return strip_html(html), "rts-tender.ru"


def scrape_b2b(query: str) -> tuple[str, str]:
    enc = urllib.parse.quote(query)
    html = fetch_page("www.b2b-center.ru", f"/rss/trade/?search={enc}&deal_type=buy")
    return strip_html(html), "b2b-center.ru"


SCRAPERS = [scrape_bicotender, scrape_kontur, scrape_fabrikant, scrape_rts, scrape_b2b]


# ─── DeepSeek: разбирает HTML → список тендеров ───────────────────────────────

def deepseek_extract(query: str, pages: list[tuple[str, str]]) -> list[dict]:
    """
    Отправляет DeepSeek текст страниц поиска.
    DeepSeek извлекает конкретные тендеры и возвращает структурированный JSON.
    """
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return []

    # Собираем контекст из всех страниц
    context_parts = []
    for text, source in pages:
        if text.strip():
            context_parts.append(f"=== Источник: {source} ===\n{text[:3000]}\n")
    context = "\n".join(context_parts)

    if not context.strip():
        return []

    prompt = f"""Запрос пользователя: "{query}"

Ниже — текст страниц поиска с тендерных площадок. Извлеки ВСЕ конкретные тендеры/закупки/заказы, которые соответствуют запросу.

ПРАВИЛА:
- Каждый тендер — это конкретный лот с номером или названием
- НЕ включай каталоги, списки компаний, статьи, рекламу
- Если номер тендера есть в тексте — включи его
- URL тендера должен вести на конкретную страницу (с ID/номером), а не на поиск
- Если URL не видно — сконструируй его из домена + номера тендера (например bicotender.ru/tender12345.html)

Верни ТОЛЬКО JSON (без пояснений):
{{
  "tenders": [
    {{
      "title": "Название тендера",
      "number": "номер закупки или ID",
      "url": "прямая ссылка на тендер",
      "customer": "заказчик",
      "region": "регион",
      "price": null или число,
      "deadline": "дата в формате YYYY-MM-DD или null",
      "published": "дата публикации YYYY-MM-DD или null",
      "source": "площадка (bicotender.ru / zakupki.kontur.ru и т.д.)",
      "category": "Металлообработка | СМР | Поставка оборудования | Другое",
      "proc_type": "тип работ (Токарные работы / Изготовление деталей / Поставка / и т.п.)"
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
            "max_tokens": 4000,
        })
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=40)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        raw = res.read(200_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return parsed.get("tenders", [])
    except Exception:
        return []


# ─── Формирование финального результата ───────────────────────────────────────

def make_order(t: dict, idx: int) -> dict:
    url = t.get("url") or ""
    number = t.get("number") or "—"
    source = t.get("source") or url.split("/")[2] if url.startswith("http") else "—"
    price = t.get("price")
    return {
        "id": 1000 + idx,
        "external_id": number,
        "source": source,
        "title": (t.get("title") or "Без названия")[:200],
        "description": t.get("title") or "",
        "customer_name": t.get("customer") or "Заказчик",
        "processing_types": t.get("proc_type") or "Тендер",
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
        "category": t.get("category") or "Металлообработка",
        "platform_type": "tender",
        "url": url,
        "user_status": "Новый",
        "comments": "",
        "favorite": False,
        "archived": False,
    }


# ─── Handler ──────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Поиск тендеров: скрапинг площадок + DeepSeek извлекает конкретные тендеры."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "Введите запрос"}, ensure_ascii=False),
        }

    # Параллельно скрапим все площадки
    pages = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(scrape, query): scrape.__name__ for scrape in SCRAPERS}
        for future in as_completed(futures):
            try:
                text, source = future.result()
                if text.strip():
                    pages.append((text, source))
            except Exception:
                pass

    # DeepSeek разбирает результаты
    tenders = deepseek_extract(query, pages)

    # Дедупликация по URL
    seen = set()
    results = []
    for t in tenders:
        url = t.get("url", "")
        key = url or t.get("title", "")
        if key and key not in seen:
            seen.add(key)
            results.append(make_order(t, len(results)))

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": results,
            "total": len(results),
            "query": query,
            "sources_scraped": [s for _, s in pages],
            "ai_powered": True,
        }, ensure_ascii=False),
    }
