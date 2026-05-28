"""
Поиск заказов через открытые источники без API-ключей:
- zakupki.gov.ru (госзакупки 44-ФЗ + 223-ФЗ)
- metallportal.com (RSS)
- metalloobrabotchiki.ru (RSS)
- tenders.ru (RSS тендеры)
- tender.pro (открытый поиск)
- fabrikant.ru (RSS)
- b2b-center.ru (RSS)
- roseltorg.ru (RSS)
- bicotender.ru (RSS)
- zakupki.kontur.ru (RSS)
- rusmet.ru (RSS металл)
- pulscen.ru (RSS)
- tiu.ru (RSS)
"""
import json
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


def make_order(source, title, url, desc="", customer="Заказчик", region="Россия",
               price_to=None, deadline=None, published=None,
               proc_type="Металлообработка", category="Металлообработка", platform="tender"):
    return {
        "id": 0,
        "external_id": url.split("/")[-1] or source,
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


def rss_to_orders(items, source, category, platform, limit=15):
    results = []
    for item in items[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = (item.findtext("description") or "").strip()
        pub = (item.findtext("pubDate") or "")[:10]
        if not title or not link:
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


# ─── Handler ──────────────────────────────────────────────────────────────────

SOURCES = [
    src_metallportal,
    src_metalloobrabotchiki,
    src_rusmet,
    src_tiu,
    src_pulscen,
    src_fabrikant,
    src_b2b_center,
    src_roseltorg,
    src_bicotender,
    src_tenders_ru,
    src_zakupki_gov,
    src_all_biz,
    src_torgiplaza,
]


def handler(event: dict, context) -> dict:
    """Параллельный поиск заказов по 13 открытым источникам без API-ключей."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите запрос"})}

    all_results = []
    seen_urls = set()

    # Параллельный запрос ко всем источникам
    with ThreadPoolExecutor(max_workers=13) as ex:
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

    # Нумерация
    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({"results": all_results, "total": len(all_results), "query": query}, ensure_ascii=False),
    }
