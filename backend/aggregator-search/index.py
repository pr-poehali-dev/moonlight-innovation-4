"""
Поиск заказов через открытые API без ключей:
- zakupki.gov.ru (официальный API госзакупок)
- metallportal.com (RSS)
- metalloobrabotchiki.ru (RSS)
"""
import json
import http.client
import urllib.parse
import xml.etree.ElementTree as ET

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def search_zakupki(query: str, limit: int = 20) -> list:
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
        conn.request(
            "GET",
            f"/epz/order/extendedsearch/results.json?{params}",
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        res = conn.getresponse()
        raw = res.read().decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        for item in data.get("data", {}).get("list", [])[:limit]:
            price = item.get("maxPrice")
            results.append({
                "id": 0,
                "external_id": item.get("purchaseNumber", "—"),
                "source": "zakupki.gov.ru",
                "title": (item.get("purchaseObjectInfo") or item.get("lotDescription") or "Закупка")[:120],
                "description": (item.get("lotDescription") or "")[:300],
                "customer_name": item.get("organizationName", "—"),
                "processing_types": "Тендер / Госзакупка",
                "materials": "—",
                "region": item.get("regionName", "—"),
                "price_from": None,
                "price_to": float(price) if price else None,
                "currency": "RUB",
                "deadline": (item.get("applicsAcceptanceDateTo") or "")[:10] or None,
                "published_at": (item.get("publishDate") or "")[:10] or None,
                "status": "active",
                "contact_info": item.get("contactInfo") or "Контакты через zakupki.gov.ru",
                "payment_terms": "по договору",
                "category": "СМР (строительно-монтажные работы)" if any(w in query.lower() for w in ["смр", "строит", "монтаж"]) else "Металлообработка",
                "platform_type": "tender",
                "url": f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber={item.get('purchaseNumber', '')}",
                "user_status": "Новый",
                "comments": "",
                "favorite": False,
                "archived": False,
            })
    except Exception:
        pass
    return results


def search_rss(host: str, path: str, source: str, category: str, platform_type: str, limit: int = 15) -> list:
    results = []
    try:
        conn = http.client.HTTPSConnection(host, timeout=10)
        conn.request("GET", path, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml,text/xml"})
        res = conn.getresponse()
        raw = res.read().decode("utf-8", errors="replace")
        conn.close()

        root = ET.fromstring(raw)
        channel = root.find("channel")
        if channel is None:
            return results

        for item in channel.findall("item")[:limit]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = (item.findtext("description") or "").strip()
            pub = (item.findtext("pubDate") or "")[:10]

            if not title:
                continue

            results.append({
                "id": 0,
                "external_id": link.split("/")[-1] or "—",
                "source": source,
                "title": title[:120],
                "description": desc[:300],
                "customer_name": "Заказчик",
                "processing_types": "Металлообработка",
                "materials": "Сталь",
                "region": "Россия",
                "price_from": None,
                "price_to": None,
                "currency": "RUB",
                "deadline": None,
                "published_at": pub or None,
                "status": "active",
                "contact_info": "Контакты на сайте",
                "payment_terms": "договорная",
                "category": category,
                "platform_type": platform_type,
                "url": link,
                "user_status": "Новый",
                "comments": "",
                "favorite": False,
                "archived": False,
            })
    except Exception:
        pass
    return results


def handler(event: dict, context) -> dict:
    """Поиск заказов через открытые API площадок без API-ключей."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()
    category = body.get("category", "all")

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите запрос"})}

    encoded = urllib.parse.quote(query)
    all_results = []

    # RSS metallportal.com
    all_results += search_rss(
        "metallportal.com", f"/zakazi/rss/?search={encoded}",
        "metallportal.com", "Металлообработка", "tender"
    )

    # RSS metalloobrabotchiki.ru
    all_results += search_rss(
        "metalloobrabotchiki.ru", f"/orders/rss/?q={encoded}",
        "metalloobrabotchiki.ru", "Металлообработка", "service"
    )

    # Госзакупки
    all_results += search_zakupki(query)

    # Нумерация с учётом существующих
    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({"results": all_results, "total": len(all_results), "query": query}, ensure_ascii=False),
    }
