"""
ИИ-агент поиска заказов на металлообработку, тендеров, горнодобывающего оборудования
и строительных подрядов на торговых площадках, досках объявлений и в соцсетях.
"""
import json
import os
import http.client
import urllib.parse


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

CATEGORIES = {
    "turning": "токарные фрезерные работы металлообработка",
    "tenders": "тендер госзакупки закупка металлообработка",
    "mining": "горнодобывающее оборудование запчасти ремонт",
    "construction": "строительный подряд субподряд монтаж",
}

SOURCES = [
    "avito.ru", "youla.ru", "zakupki.gov.ru", "tiu.ru",
    "pulscen.ru", "all.biz", "b2b-center.ru", "fabrikant.ru",
    "rusmet.ru", "metalplace.ru", "vk.com", "ok.ru",
]


def serper_search(query: str, num: int = 10) -> list:
    api_key = os.environ.get("SERPER_API_KEY", "")
    if not api_key:
        return []

    payload = json.dumps({"q": query, "gl": "ru", "hl": "ru", "num": num})
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }

    conn = http.client.HTTPSConnection("google.serper.dev")
    conn.request("POST", "/search", payload, headers)
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    conn.close()

    results = []
    for item in data.get("organic", []):
        results.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("displayLink", ""),
        })
    return results


def openai_analyze(query: str, raw_results: list) -> list:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or not raw_results:
        return raw_results

    results_text = "\n\n".join([
        f"[{i+1}] {r['title']}\nСайт: {r['source']}\nСсылка: {r['link']}\nОписание: {r['snippet']}"
        for i, r in enumerate(raw_results)
    ])

    prompt = f"""Ты — ассистент для поиска заказов на металлообработку, тендеров, поставок горнодобывающего оборудования и строительных подрядов.

Запрос пользователя: "{query}"

Найденные результаты из интернета:
{results_text}

Отфильтруй и отранжируй результаты — оставь только те, которые реально относятся к заказам, тендерам, объявлениям о работах или поставках. Убери новости, статьи, рекламу сервисов.

Верни JSON-массив объектов (максимум 12), каждый объект:
{{
  "title": "название объявления/тендера",
  "link": "ссылка",
  "source": "название сайта",
  "snippet": "краткое описание (1-2 предложения)",
  "category": "одно из: токарные работы | тендер | оборудование | подряд | другое",
  "relevance": "высокая | средняя | низкая"
}}

Верни ТОЛЬКО JSON-массив, без пояснений."""

    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    })

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    conn = http.client.HTTPSConnection("api.openai.com")
    conn.request("POST", "/v1/chat/completions", payload, headers)
    res = conn.getresponse()
    data = json.loads(res.read().decode("utf-8"))
    conn.close()

    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    if isinstance(parsed, list):
        return parsed
    for v in parsed.values():
        if isinstance(v, list):
            return v
    return raw_results


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    query = body.get("query", "").strip()
    category = body.get("category", "all")

    if not query:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Введите поисковый запрос"})}

    # Формируем поисковые запросы
    base = query
    if category != "all" and category in CATEGORIES:
        base = f"{query} {CATEGORIES[category]}"

    # Ищем по нескольким запросам для охвата разных площадок
    queries = [
        f"{base} заказ объявление",
        f"{base} тендер закупка site:zakupki.gov.ru OR site:b2b-center.ru OR site:fabrikant.ru",
        f"{base} avito OR юла OR tiu OR pulscen",
    ]

    all_results = []
    seen_links = set()

    for q in queries:
        items = serper_search(q, num=8)
        for item in items:
            if item["link"] not in seen_links:
                seen_links.add(item["link"])
                all_results.append(item)

    # ИИ фильтрует и ранжирует
    final = openai_analyze(query, all_results)

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({"results": final, "total": len(final), "query": query}, ensure_ascii=False),
    }
