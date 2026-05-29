"""
Поиск конкретных тендеров — каждый результат это один тендер с уникальным ID/номером.
Источники: zakupki.gov.ru API, RSS metallportal/fabrikant/b2b-center/roseltorg/bicotender/tenders.ru
Serper.dev — только если SERPER_API_KEY задан.
"""
import json
import os
import http.client
import urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/rss+xml,text/xml,*/*"
}

# Домены, которые дают СПИСКИ / статьи / обучение — не сами тендеры
BLACKLIST_DOMAINS = re.compile(
    r'(initpro\.ru|tenderbase\.ru|tenderguru\.ru|zakazrf\.ru|findtenders\.ru'
    r'|tenderplan\.ru|tendereasy\.ru|clearspending\.ru|e-disclosure\.ru'
    r'|seldon\.ru|zakupki24\.ru'
    r'|profizakupok\.rts-tender\.ru)',  # учебный портал rts-tender
    re.IGNORECASE
)

# Паттерны URL каталогов / поиска / пагинации / статей / страниц организаций
CATALOG_URL = re.compile(
    r'(/search[/?]|/katalog|/catalog|/category|/tags?[/?]|[?&]page=|/results[/?]'
    r'|/extendedsearch|/list[/?]|/filter|/region-|/tendery|/zakupki-na'
    r'|/company/|/organization/|/supplier/|/customer/|/inn/'
    r'|[?&]inn=|[?&]ogrn=|/tenders/search|/purchases/search'
    r'|/knowledge_db|/article/|/blog/|/news/|/press/|/about|/help'
    r'|/_flysystem/|/webdav/|/mod/resource/)',  # файловые хранилища, CMS
    re.IGNORECASE
)

# Запрещённые расширения файлов — не страница тендера
FILE_EXT = re.compile(r'\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv)([?#]|$)', re.IGNORECASE)

# zakupki.kontur.ru: конкретный тендер — /D{номер} или /P{номер}
KONTUR_TENDER = re.compile(r'zakupki\.kontur\.ru/[A-Z]\d{5,}', re.IGNORECASE)

# metallportal.com: конкретный заказ — /zakazi/{slug-с-цифрами}, остальное — каталог
METALLPORTAL_TENDER = re.compile(r'metallportal\.com/zakazi/[a-z0-9].+-\d{6,}', re.IGNORECASE)

# roseltorg.ru: конкретная процедура — /procedure/{ID} или /lot/{ID}
ROSELTORG_TENDER = re.compile(r'roseltorg\.ru/(procedure|lot|trade)/\d{5,}', re.IGNORECASE)

# ИНН — ровно 10 или 12 цифр в конце пути (страница организации по ИНН)
INN_PATTERN = re.compile(r'(?<![A-Za-z0-9])(\d{10}|\d{12})(?![0-9])')

# Заголовки-мусор — страницы организаций или каталогов
JUNK_TITLES = re.compile(
    r'^(тендеры\s+и\s+закупки\s+|все\s+тендеры\s+|закупки\s+компании\s+'
    r'|тендеры\s+компании\s+|поставщик\s+|закупки\s+по\s+инн'
    r'|список\s+заказов|каталог\s+|услуги\s+.+найдено\s+\d+'
    r'|.+на\s+заказ\s+в\s+|.+найдено\s+\d+\s+компани)',
    re.IGNORECASE
)


def is_real_tender_url(url: str, title: str = "") -> bool:
    """True только если URL ведёт на страницу ОДНОГО конкретного тендера."""
    if not url or len(url) < 10:
        return False
    # Явный файл — не тендер
    if FILE_EXT.search(url):
        return False
    # Заголовок выдаёт страницу-список или каталог
    if title and JUNK_TITLES.search(title.strip()):
        return False
    # Чёрный список доменов
    if BLACKLIST_DOMAINS.search(url):
        return False
    # Паттерны каталогов, статей, файловых хранилищ, страниц организаций
    if CATALOG_URL.search(url):
        return False
    # Площадки с жёсткими правилами URL — проверяем паттерн конкретного тендера
    if 'zakupki.kontur.ru' in url:
        return bool(KONTUR_TENDER.search(url))
    if 'metallportal.com' in url:
        # Принимаем только /zakazi/{slug} — конкретный заказ с цифровым суффиксом
        return bool(METALLPORTAL_TENDER.search(url))
    if 'roseltorg.ru' in url:
        return bool(ROSELTORG_TENDER.search(url))
    # Главная страница или корень домена — не тендер
    path = url.split("?")[0].rstrip("/")
    if path.count("/") < 3:  # https://domain.ru/path — слишком коротко
        return False
    # ИНН в конце пути — страница организации
    path_tail = path.split("/")[-1]
    if INN_PATTERN.fullmatch(path_tail):
        return False
    return True


def extract_tender_number(url, title="", desc=""):
    for text in [desc, title, url]:
        m = re.search(r'[№#]\s*(\d{5,})', text)
        if m:
            return "№" + m.group(1)
    m = re.search(r'\b(\d{7,})\b', url)
    if m:
        return m.group(1)
    slug = url.rstrip("/").split("/")[-1]
    slug = re.sub(r'\.[a-z]{2,4}$', '', slug)
    return slug or "—"


def make_order(source, title, url, desc="", customer="Заказчик", region="Россия",
               price_to=None, deadline=None, published=None,
               proc_type="Тендер", category="Металлообработка", platform="tender"):
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


def rss_to_orders(items, source, category, platform, proc_type="Тендер", limit=20):
    results = []
    for item in items[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or item.findtext("summary") or "").strip()
        pub = (item.findtext("pubDate") or item.findtext("published") or "")[:10]
        if not title or not link:
            continue
        if not is_real_tender_url(link, title):
            continue
        results.append(make_order(source, title, link, desc,
                                  published=pub, category=category,
                                  platform=platform, proc_type=proc_type))
    return results


# ─── Источники ────────────────────────────────────────────────────────────────

def src_metallportal(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("metallportal.com", f"/zakazi/rss/?search={enc}")
    return rss_to_orders(items, "metallportal.com", "Металлообработка", "service",
                         proc_type="Металлообработка")


def src_metalloobrabotchiki(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("metalloobrabotchiki.ru", f"/orders/rss/?q={enc}")
    return rss_to_orders(items, "metalloobrabotchiki.ru", "Металлообработка", "service",
                         proc_type="Металлообработка")


def src_fabrikant(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.fabrikant.ru", f"/trades/atom/?searchText={enc}&tradeType=purchase")
    return rss_to_orders(items, "fabrikant.ru", "Металлообработка", "tender",
                         proc_type="Тендер")


def src_b2b_center(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.b2b-center.ru", f"/rss/trade/?search={enc}&deal_type=buy")
    return rss_to_orders(items, "b2b-center.ru", "Металлообработка", "tender",
                         proc_type="Тендер")


def src_roseltorg(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.roseltorg.ru", f"/rss/procedures/?q={enc}")
    return rss_to_orders(items, "roseltorg.ru", "СМР (строительно-монтажные работы)", "tender",
                         proc_type="Тендер / Госзакупка")


def src_bicotender(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("bicotender.ru", f"/rss/?q={enc}")
    return rss_to_orders(items, "bicotender.ru", "Металлообработка", "tender",
                         proc_type="Тендер")


def src_tenders_ru(query):
    enc = urllib.parse.quote(query)
    items = fetch_rss("www.tenders.ru", f"/rss/goszakupki/?q={enc}")
    return rss_to_orders(items, "tenders.ru", "Металлообработка", "tender",
                         proc_type="Тендер / Госзакупка")


def src_zakupki_gov(query, limit=25):
    """API zakupki.gov.ru — возвращает только конкретные закупки с номером."""
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
            num = item.get("purchaseNumber", "")
            if not num:
                continue
            price = item.get("maxPrice")
            url = f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber={num}"
            order = make_order(
                "zakupki.gov.ru",
                (item.get("purchaseObjectInfo") or item.get("lotDescription") or "Закупка")[:120],
                url,
                (item.get("lotDescription") or "")[:300],
                customer=item.get("organizationName", "—"),
                region=item.get("regionName", "—"),
                price_to=float(price) if price else None,
                deadline=(item.get("applicsAcceptanceDateTo") or "")[:10] or None,
                published=(item.get("publishDate") or "")[:10] or None,
                proc_type="Тендер / Госзакупка",
                category="СМР (строительно-монтажные работы)" if is_smr else "Металлообработка",
                platform="tender",
            )
            order["external_id"] = num
            order["contact_info"] = item.get("contactInfo") or "Контакты через zakupki.gov.ru"
            results.append(order)
    except Exception:
        pass
    return results


def src_serper(query: str) -> list:
    """Поиск через Serper.dev только по проверенным тендерным площадкам."""
    api_key = os.environ.get("SERPER_API_KEY", "")
    if not api_key:
        return []

    # Только площадки, где URL конкретного тендера содержит числовой ID
    tender_sites = (
        "site:zakupki.gov.ru OR site:fabrikant.ru OR site:b2b-center.ru "
        "OR site:roseltorg.ru OR site:metallportal.com "
        "OR site:tender.pro OR site:zakupki.kontur.ru OR site:sberbank-ast.ru "
        "OR site:rts-tender.ru OR site:etp-ets.ru"
    )
    queries = [
        f"{query} тендер закупка {tender_sites}",
        f"{query} изготовление поставка {tender_sites}",
    ]

    results = []
    seen = set()

    for q in queries:
        try:
            payload = json.dumps({"q": q, "gl": "ru", "hl": "ru", "num": 10})
            conn = http.client.HTTPSConnection("google.serper.dev", timeout=10)
            conn.request("POST", "/search", payload, {
                "X-API-KEY": api_key,
                "Content-Type": "application/json"
            })
            res = conn.getresponse()
            data = json.loads(res.read().decode("utf-8", errors="replace"))
            conn.close()
            for item in data.get("organic", []):
                link = item.get("link", "")
                title_s = item.get("title", "")
                if not link or link in seen:
                    continue
                if not is_real_tender_url(link, title_s):
                    continue
                seen.add(link)
                source = item.get("displayLink", link)
                results.append(make_order(
                    source,
                    title_s[:120],
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
    """Финальная фильтрация через OpenAI — если OPENAI_API_KEY задан."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or not results:
        return results

    results_text = "\n\n".join([
        f"[{i+1}] {r['title']}\nСайт: {r['source']}\nСсылка: {r['url']}\nОписание: {r['description']}"
        for i, r in enumerate(results[:40])
    ])

    prompt = f"""Запрос: "{query}"

Результаты:
{results_text}

Оставь ТОЛЬКО конкретные тендеры/заявки/закупки с уникальным ID. Убери:
- страницы списков тендеров
- новости, статьи, обзоры
- общие страницы сайтов без конкретного тендера

Верни JSON: {{"keep": [номера], "categories": {{"номер": "токарные работы|тендер|металлообработка|подряд|другое"}}}}
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
        filtered += results[40:]
        return filtered
    except Exception:
        return results


# ─── Handler ──────────────────────────────────────────────────────────────────

SOURCES = [
    src_metallportal,
    src_metalloobrabotchiki,
    src_fabrikant,
    src_b2b_center,
    src_roseltorg,
    src_bicotender,
    src_tenders_ru,
    src_zakupki_gov,
    src_serper,
]


def handler(event: dict, context) -> dict:
    """Поиск конкретных тендеров. Каждый результат — один тендер с уникальным ID/номером."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите запрос"})}

    all_results = []
    seen_urls = set()

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

    # ИИ-фильтрация (если OPENAI_API_KEY задан)
    all_results = openai_filter(query, all_results)

    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": all_results,
            "total": len(all_results),
            "query": query,
        }, ensure_ascii=False),
    }