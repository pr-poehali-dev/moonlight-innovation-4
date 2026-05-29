"""
Поиск тендеров ТОЛЬКО через официальные API торговых площадок.
Каждый результат — один конкретный тендер с уникальным номером и прямой ссылкой.

Источники (официальные API, без Google/RSS-мусора):
- zakupki.gov.ru — госзакупки 44-ФЗ + 223-ФЗ (JSON API)
- tender.pro — коммерческие тендеры (public API)
- roseltorg.ru — электронные торги (API процедур)

DeepSeek (если DEEPSEEK_API_KEY задан) — финальная фильтрация + заполнение полей.
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json,text/xml,*/*",
}


def make_order(source, title, url, desc="", customer="Заказчик", region="Россия",
               external_id="", price_to=None, deadline=None, published=None,
               proc_type="Тендер", category="Металлообработка", platform="tender",
               contact=""):
    return {
        "id": 0,
        "external_id": external_id or "—",
        "source": source,
        "title": title[:200],
        "description": desc[:500],
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
        "contact_info": contact or f"Контакты на {source}",
        "payment_terms": "договорная",
        "category": category,
        "platform_type": platform,
        "url": url,
        "user_status": "Новый",
        "comments": "",
        "favorite": False,
        "archived": False,
    }


# ─── Источник 1: zakupki.gov.ru (официальный JSON API) ────────────────────────

def src_zakupki_gov(query, limit=30):
    """API госзакупок 44-ФЗ + 223-ФЗ. Возвращает только конкретные закупки с номером."""
    results = []
    is_smr = any(w in query.lower() for w in ["смр", "строит", "монтаж", "подряд", "ремонт"])
    try:
        params = urllib.parse.urlencode({
            "searchString": query,
            "morphology": "on",
            "pageNumber": "1",
            "pageSize": str(limit),
            "fz44": "on",
            "fz223": "on",
            "af": "on",  # активные закупки (приём заявок)
            "sortDirection": "false",
            "sortBy": "PUBLISH_DATE",
        })
        conn = http.client.HTTPSConnection("zakupki.gov.ru", timeout=15)
        conn.request("GET", f"/epz/order/extendedsearch/results.json?{params}", headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(700_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        for item in data.get("data", {}).get("list", [])[:limit]:
            num = item.get("purchaseNumber", "")
            obj_info = (item.get("purchaseObjectInfo") or item.get("lotDescription") or "").strip()
            if not num or not obj_info:
                continue
            price = item.get("maxPrice")
            url = f"https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber={num}"
            results.append(make_order(
                "zakupki.gov.ru",
                obj_info,
                url,
                (item.get("lotDescription") or obj_info),
                customer=item.get("organizationName", "—"),
                region=item.get("regionName", "—"),
                external_id=num,
                price_to=float(price) if price else None,
                deadline=(item.get("applicsAcceptanceDateTo") or "")[:10] or None,
                published=(item.get("publishDate") or "")[:10] or None,
                proc_type="Тендер / Госзакупка",
                category="СМР (строительно-монтажные работы)" if is_smr else "Металлообработка",
                platform="tender",
                contact=item.get("contactInfo") or "Контакты через zakupki.gov.ru",
            ))
    except Exception:
        pass
    return results


# ─── Источник 2: tender.pro (public API) ──────────────────────────────────────

def src_tender_pro(query, limit=25):
    """API tender.pro — коммерческие тендеры. Только конкретные лоты с tenderid."""
    results = []
    try:
        enc = urllib.parse.quote(query)
        conn = http.client.HTTPSConnection("www.tender.pro", timeout=15)
        conn.request("GET", f"/api/tender/search?q={enc}&limit={limit}&status=open", headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(500_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        items = data.get("tenders") or data.get("results") or data.get("data") or []
        is_smr = any(w in query.lower() for w in ["смр", "строит", "монтаж", "подряд", "ремонт"])
        for item in items[:limit]:
            tid = item.get("tenderid") or item.get("id")
            title = (item.get("name") or item.get("title") or "").strip()
            if not tid or not title:
                continue
            url = f"https://www.tender.pro/api/tender/{tid}/view_public"
            results.append(make_order(
                "tender.pro",
                title,
                url,
                (item.get("description") or title),
                customer=item.get("organization") or item.get("customer") or "Заказчик",
                region=item.get("region") or "Россия",
                external_id=f"№{tid}",
                price_to=float(item["price"]) if item.get("price") else None,
                deadline=(item.get("deadline") or "")[:10] or None,
                published=(item.get("published") or item.get("date") or "")[:10] or None,
                proc_type="Тендер",
                category="СМР (строительно-монтажные работы)" if is_smr else "Металлообработка",
                platform="tender",
            ))
    except Exception:
        pass
    return results


# ─── Источник 3: roseltorg.ru (API процедур) ──────────────────────────────────

def src_roseltorg(query, limit=25):
    """API roseltorg.ru — электронные торги. Только конкретные процедуры с ID."""
    results = []
    try:
        enc = urllib.parse.quote(query)
        conn = http.client.HTTPSConnection("www.roseltorg.ru", timeout=15)
        conn.request("GET", f"/api/procedures/search?query={enc}&limit={limit}", headers=HEADERS)
        res = conn.getresponse()
        raw = res.read(500_000).decode("utf-8", errors="replace")
        conn.close()
        data = json.loads(raw)
        items = data.get("procedures") or data.get("items") or data.get("data") or []
        is_smr = any(w in query.lower() for w in ["смр", "строит", "монтаж", "подряд", "ремонт"])
        for item in items[:limit]:
            pid = item.get("id") or item.get("procedureId")
            title = (item.get("name") or item.get("title") or "").strip()
            if not pid or not title:
                continue
            url = f"https://www.roseltorg.ru/procedure/{pid}"
            results.append(make_order(
                "roseltorg.ru",
                title,
                url,
                (item.get("description") or title),
                customer=item.get("organizer") or item.get("customer") or "Заказчик",
                region=item.get("region") or "Россия",
                external_id=f"№{pid}",
                price_to=float(item["price"]) if item.get("price") else None,
                deadline=(item.get("deadline") or item.get("endDate") or "")[:10] or None,
                published=(item.get("publishDate") or "")[:10] or None,
                proc_type="Тендер / Госзакупка",
                category="СМР (строительно-монтажные работы)" if is_smr else "Металлообработка",
                platform="tender",
            ))
    except Exception:
        pass
    return results


# ─── DeepSeek: фильтрация мусора + заполнение полей ───────────────────────────

def deepseek_filter(query: str, results: list) -> list:
    """ИИ оставляет только реальные тендеры по теме и уточняет категорию/тип работ."""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key or not results:
        return results

    items_text = "\n\n".join([
        f"[{i+1}] {r['title']}\nЗаказчик: {r['customer_name']}\nОписание: {r['description'][:200]}"
        for i, r in enumerate(results[:50])
    ])

    prompt = f"""Запрос пользователя: "{query}"

Список найденных тендеров:
{items_text}

Задача: оставь ТОЛЬКО те позиции, которые являются КОНКРЕТНЫМ тендером/закупкой/заказом по теме запроса (металлообработка, изготовление деталей, СМР, поставка оборудования и т.п.).
Убери: каталоги, списки, статьи, рекламу, нерелевантные позиции.

Для каждой оставленной позиции определи:
- "category": "Металлообработка" | "СМР (строительно-монтажные работы)" | "Горное оборудование" | "Другое"
- "proc_type": краткий тип работ (например "Токарные работы", "Изготовление деталей", "Поставка оборудования")

Верни строго JSON: {{"keep": [{{"n": номер, "category": "...", "proc_type": "..."}}]}}
Только JSON, без пояснений."""

    try:
        payload = json.dumps({
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        })
        conn = http.client.HTTPSConnection("api.deepseek.com", timeout=30)
        conn.request("POST", "/chat/completions", payload, {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        res = conn.getresponse()
        data = json.loads(res.read().decode("utf-8", errors="replace"))
        conn.close()
        parsed = json.loads(data["choices"][0]["message"]["content"])
        keep = parsed.get("keep", [])
        keep_map = {int(k["n"]): k for k in keep if "n" in k}
        filtered = []
        for i, r in enumerate(results[:50]):
            num = i + 1
            if num in keep_map:
                meta = keep_map[num]
                if meta.get("category"):
                    r["category"] = meta["category"]
                if meta.get("proc_type"):
                    r["processing_types"] = meta["proc_type"]
                filtered.append(r)
        # позиции 51+ оставляем без ИИ-проверки
        filtered += results[50:]
        return filtered
    except Exception:
        return results


# ─── Handler ──────────────────────────────────────────────────────────────────

SOURCES = [
    src_zakupki_gov,   # официальный API госзакупок — основной источник
    src_tender_pro,    # API коммерческих тендеров
    src_roseltorg,     # API электронных торгов
]


def handler(event: dict, context) -> dict:
    """Поиск тендеров через официальные API площадок. DeepSeek отсеивает мусор."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите запрос"})}

    all_results = []
    seen_urls = set()

    with ThreadPoolExecutor(max_workers=3) as ex:
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

    # ИИ-фильтрация через DeepSeek (если ключ задан)
    all_results = deepseek_filter(query, all_results)

    for i, r in enumerate(all_results):
        r["id"] = 1000 + i + 1

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({
            "results": all_results,
            "total": len(all_results),
            "query": query,
            "ai_filtered": bool(os.environ.get("DEEPSEEK_API_KEY")),
        }, ensure_ascii=False),
    }
