"""
Поиск реальных тендеров через открытые API без ключей:
- zakupki.gov.ru (госзакупки 44-ФЗ + 223-ФЗ) — конкретные закупки с номерами
- metallportal.com, metalloobrabotchiki.ru (RSS — конкретные заявки)
- fabrikant.ru, b2b-center.ru, roseltorg.ru (RSS тендеры с ID)
- tendermedia.ru, bicotender.ru (агрегаторы тендеров)
- Serper.dev — поиск только по тендерным площадкам (если SERPER_API_KEY задан)
- OpenAI — финальная фильтрация (если OPENAI_API_KEY задан)
"""
import json
import os
import http.client
import urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/rss+xml,text/xml,*/*"}

import re

def extract_tender_number(url, title="", desc=""):
    """Извлекает номер тендера из URL, заголовка или описания."""
    # Сначала ищем явные паттерны номеров тендеров
    for text in [desc, title, url]:
        # №12345678 или #12345678
        m = re.search(r'[№#]\s*(\d{5,})', text)
        if m:
            return "№" + m.group(1)
    # Длинные числовые ID в URL (от 7 цифр — номера закупок)
    m = re.search(r'\b(\d{7,})\b', url)
    if m:
        return m.group(1)
    # Fallback — последний сегмент пути без расширения
    slug = url.rstrip("/").split("/")[-1]
    slug = re.sub(r'\.[a-z]{2,4}$', '', slug)
    return slug or "—"


def make_order(source, title, url, desc="", customer="Заказчик", region="Россия",
               price_to=None, deadline=None, published=None,
               proc_type="Металлообработка", category="Металлообработка", platform="tender"):
    return {
        "id": 0,
        "external_id": extract_tender_number(url, title, desc),
        "source": source,
        "title": title[:120],
        "description": desc[:300],
        "customer_name": customer,
        "processing_types": proc_type,
        "materials": "—",
        "region": region,
        "price_from": None,
        "price_to": price_to,
        "currency": "RUB",
        "deadline": deadline,
        "published_at": published,
        "status": "active",
        "contact_info": f"Контакты на {source}",
        "payment_terms": "договорная",
        "category": category,
        "platform_type": platform,
        "url": url,
        "user_status": "Новый",
        "comments": "",
        "favorite": False,
        "archived": False,
    }


def fetch_rss(host, path, use_https=True, timeout=8):
    try:
        cls = http.client.HTTPSConnection if use_https else http.client.HTTPConnection
        conn = cls(host, timeout=timeout)
        conn.request("GET", path, headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(300_000).decode("utf-8", errors="replace")
        conn.close()
        root = ET.fromstring(raw)
        channel = root.find("channel")
        return channel.findall("item") if channel is not None else []
    except Exception:
        return []


CATALOG_URL = re.compile(
    r'(category|tags?|/search\?|catalog|tendery-na|zakupki-na|/results|/list|/extendedsearch|page=)',
    re.IGNORECASE
)

def rss_to_orders(items, source, category, platform, limit=15):
    results = []
    for item in items[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title or not link:
            continue
        # Пропускаем страницы-каталоги без конкретного ID тендера
        if CATALOG_URL.search(link):
            continue
        results.append(make_order(source, title, link, desc, published=pub, category=category, platform=platform))
    return results


# ─── Источники ────────────────────────────────────────────────────────────────

def src_metallportal(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("metallportal.com", f"/zakazi/rss/?search={enc}")
    return rss_to_orders(items, "metallportal.com", "Металлообработка", "service")


def src_metalloobrabotchiki(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("metalloobrabotchiki.ru", f"/orders/rss/?q={enc}")
    return rss_to_orders(items, "metalloobrabotchiki.ru", "Металлообработка", "service")


def src_rusmet(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("rusmet.ru", f"/index.php?do=rss&q={enc}")
    return rss_to_orders(items, "rusmet.ru", "Металлообработка", "service")


def src_tiu(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("tiu.ru", f"/rss/products/?q={enc}")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        if not title:
            continue
        results.append(make_order("tiu.ru", title, link, desc, category="Металлообработка", platform="service"))
    return results


def src_pulscen(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("pulscen.ru", f"/rss/offers/?q={enc}")
    return rss_to_orders(items, "pulscen.ru", "Металлообработка", "service")


def src_fabrikant(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.fabrikant.ru", f"/trades/atom/?searchText={enc}&tradeType=purchase")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("summary") or item.findtext("description") or "").strip()
        pub = (item.findtext("published") or item.findtext("pubDate") or "")[:10]
        if not title:
            continue
        results.append(make_order("fabrikant.ru", title, link, desc, published=pub,
                                  proc_type="Тендер", category="Металлообработка", platform="tender"))
    return results


def src_b2b_center(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.b2b-center.ru", f"/rss/trade/?search={enc}&deal_type=buy")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title:
            continue
        results.append(make_order("b2b-center.ru", title, link, desc, published=pub,
                                  proc_type="Тендер", category="Металлообработка", platform="tender"))
    return results


def src_roseltorg(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.roseltorg.ru", f"/rss/procedures/?q={enc}")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title:
            continue
        results.append(make_order("roseltorg.ru", title, link, desc, published=pub,
                                  proc_type="Тендер / Госзакупка", category="СМР (строительно-монтажные работы)", platform="tender"))
    return results


def src_bicotender(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("bicotender.ru", f"/rss/?q={enc}")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title:
            continue
        results.append(make_order("bicotender.ru", title, link, desc, published=pub,
                                  proc_type="Тендер", category="Металлообработка", platform="tender"))
    return results


def src_tenders_ru(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.tenders.ru", f"/rss/goszakupki/?q={enc}")
    results = []
    for item in items[:15]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title:
            continue
        results.append(make_order("tenders.ru", title, link, desc, published=pub,
                                  proc_type="Тендер / Госзакупка", category="СМР (строительно-монтажные работы)", platform="tender"))
    return results


def src_zakupki_gov(query, limit=25):
    results = []
    try:
        params = urllib.parse.urlencode({
            "searchString": query,
            "morphology": "on",
            "pageNumber": "1",
            "pageSize": str(limit),
            "fz44": "on",
            "fz223": "on",
            "sortDirection": "false",
            "sortBy": "PUBLISH_DATE",
        })
        conn = http.client.HTTPSConnection("zakupki.gov.ru", timeout=15)
        conn.request("GET", f"/epz/order/extendedsearch/results.json?{params}", headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(500_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        is_smr = any(w in query.lower() for w in ["смр", "строит", "монтаж", "подряд", "ремонт"])
        for item in data.get("data", {}).get("list", [])[:limit]:
            price = item.get("maxPrice")
            num = item.get("purchaseNumber", "")
            results.append(make_order(
                "zakupki.gov.ru",
                (item.get("purchaseObjectInfo") or item.get("lotDescription") or "Закупка")[:120],
                f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber={num}",
                (item.get("lotDescription") or "")[:300],
                customer=item.get("organizationName", "—"),
                region=item.get("regionName", "—"),
                price_to=float(price) if price else None,
                deadline=(item.get("applicsAcceptanceDateTo") or "")[:10] or None,
                published=(item.get("publishDate") or "")[:10] or None,
                proc_type="Тендер / Госзакупка",
                category="СМР (строительно-монтажные работы)" if is_smr else "Металлообработка",
                platform="tender",
            ))
            results[-1]["external_id"] = num
            results[-1]["contact_info"] = item.get("contactInfo") or "Контакты через zakupki.gov.ru"
    except Exception:
        pass
    return results


def src_all_biz(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("all.biz", f"/ru/rss/tenders/?search={enc}")
    return rss_to_orders(items, "all.biz", "Металлообработка", "tender")


def src_torgiplaza(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("torgiplaza.ru", f"/rss/orders/?q={enc}")
    return rss_to_orders(items, "torgiplaza.ru", "Металлообработка", "tender")


# ─── Serper.dev + OpenAI ──────────────────────────────────────────────────────

def src_serper(query: str) -> list:
    """Поиск только по тендерным площадкам через Serper.dev (если SERPER_API_KEY задан)."""
    api_key = os.environ.get("SERPER_API_KEY", "")
    if not api_key:
        return []

    # Только конкретные тендерные площадки — без досок объявлений и каталогов
    tender_sites = (
        "site:zakupki.gov.ru OR site:fabrikant.ru OR site:b2b-center.ru "
        "OR site:roseltorg.ru OR site:tendermedia.ru OR site:metallportal.com "
        "OR site:tender.pro OR site:zakupki.kontur.ru OR site:sberbank-ast.ru"
    )
    queries = [
        f"{query} тендер закупка {tender_sites}",
        f"{query} изготовление поставка {tender_sites}",
    ]

    results = []
    seen = set()

    # Паттерны URL страниц-каталогов — отсеиваем
    CATALOG_PATTERNS = re.compile(
        r'(category|tags?|search|catalog|list|tendery-na|zakupki-na|/results|/extendedsearch)',
        re.IGNORECASE
    )

    for q in queries:
        try:
            payload = json.dumps({"q": q, "gl": "ru", "hl": "ru", "num": 10})
            conn = http.client.HTTPSConnection("google.serper.dev", timeout=10)
            conn.request("POST", "/search", payload, {"X-API-KEY": api_key, "Content-Type": "application/json"})
            res = conn.getresponse()
            data = json.loads(res.read().decode("utf-8", errors="replace"))
            conn.close()
            for item in data.get("organic", []):
                link = item.get("link", "")
                if not link or link in seen:
                    continue
                # Пропускаем страницы-каталоги без конкретного ID
                if CATALOG_PATTERNS.search(link):
                    continue
                # Требуем числовой ID в URL (реальный тендер)
                if not re.search(r'\d{4,}', link):
                    continue
                seen.add(link)
                source = item.get("displayLink", link)
                results.append(make_order(
                    source,
                    item.get("title", "")[:120],
                    link,
                    item.get("snippet", "")[:300],
                    proc_type="Тендер",
                    category="Металлообработка",
                    platform="tender",
                ))
        except Exception:
            pass
    return results


def openai_filter(query: str, results: list) -> list:
    """Фильтрует и ранжирует результаты через OpenAI — если OPENAI_API_KEY задан."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or not results:
        return results

    results_text = "\n\n".join([
        f"[{i+1}] {r['title']}\nСайт: {r['source']}\nСсылка: {r['url']}\nОписание: {r['description']}"
        for i, r in enumerate(results[:40])
    ])

    prompt = f"""Запрос пользователя: "{query}"

Найденные результаты:
{results_text}

Оставь только те результаты, которые реально относятся к заказам, тендерам, объявлениям о работах или поставках по теме запроса. Убери новости, статьи, общие страницы сайтов.

Верни JSON: {{"keep": [список номеров из [...] которые нужно оставить], "categories": {{"номер": "токарные работы|тендер|оборудование|подряд|другое"}}}}

Только JSON, без пояснений."""

    try:
        payload = json.dumps({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        })
        conn = http.client.HTTPSConnection("api.openai.com", timeout=20)
        conn.request("POST", "/v1/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        data = json.loads(res.read().decode("utf-8", errors="replace"))
        conn.close()
        parsed = json.loads(data["choices"][0]["message"]["content"])
        keep_nums = set(parsed.get("keep", []))
        categories = parsed.get("categories", {})
        filtered = []
        for i, r in enumerate(results[:40]):
            num = i + 1
            if num in keep_nums:
                cat = categories.get(str(num), "")
                if cat:
                    r["processing_types"] = cat
                filtered.append(r)
        # Добавляем оставшиеся (41+) без фильтрации
        filtered += results[40:]
        return filtered
    except Exception:
        return results


# ─── Handler ──────────────────────────────────────────────────────────────────

SOURCES = [
    src_metallportal,       # RSS конкретных заявок
    src_metalloobrabotchiki,# RSS конкретных заказов
    src_fabrikant,          # RSS тендеров с ID
    src_b2b_center,         # RSS тендеров с ID
    src_roseltorg,          # RSS госзакупок
    src_bicotender,         # RSS тендеров
    src_tenders_ru,         # RSS госзакупок
    src_zakupki_gov,        # API госзакупок — самый надёжный источник
    src_serper,             # Google по тендерным площадкам (если SERPER_API_KEY)
]


def handler(event: dict, context) -> dict:
    """Параллельный поиск заказов по 14 источникам. При наличии ключей подключаются Serper + OpenAI."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите запрос"})}

    all_results = []
    seen_urls = set()

    # Параллельный запрос ко всем источникам
    with ThreadPoolExecutor(max_workers=9) as ex:
        futures = {ex.submit(src, query): src.__name__ for src in SOURCES}
        for future in as_completed(futures):
            try:
                items = future.result()
                for item in items:
                    url = item.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append(item)
            except Exception:
                pass

    # ИИ-фильтрация через OpenAI (если ключ задан)
    all_results = openai_filter(query, all_results)

    # Нумерация
    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    has_serper = bool(os.environ.get("SERPER_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": all_results,
            "total": len(all_results),
            "query": query,
            "sources_used": 13 + (1 if has_serper else 0),
            "ai_filtered": has_openai,
        }, ensure_ascii=False),
    }