import json
import os
import boto3

ADMIN_LOGIN = "das-service@inbox.ru"
ADMIN_PASS = "autoremex2012"
S3_KEY = "aggregator/index.html"
BUCKET = "files"

DEFAULT_HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Агрегатор заказов — Металлообработка + СМР (расширенный поиск)</title>
    <style>
        :root { --primary: #d46b08; --primary-dark: #b85a06; --bg: #f5f5f5; --card-bg: #ffffff; --text: #1a1a1a; --text-secondary: #595959; --border: #e0e0e0; --shadow: 0 2px 8px rgba(0,0,0,0.08); --radius: 8px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f0f2f5; color: var(--text); line-height: 1.5; min-height: 100vh; display: flex; flex-direction: column; }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 0.75rem 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
        .header h1 { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .header-badge { background: rgba(255,255,255,0.15); padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
        .container { max-width: 100%; width: 100%; margin: 0 auto; padding: 1rem; flex: 1; display: flex; flex-direction: column; gap: 1rem; }
        .filters-panel { background: var(--card-bg); padding: 0.75rem 1rem; border-radius: var(--radius); box-shadow: var(--shadow); position: sticky; top: 60px; z-index: 9; }
        .filter-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-end; }
        .filter-group { display: flex; flex-direction: column; gap: 0.2rem; min-width: 100px; flex: 0 0 auto; }
        .filter-group label { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
        input, select, textarea { padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.8rem; background: white; transition: 0.2s; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(212,107,8,0.1); }
        .btn { background: var(--primary); color: white; border: none; padding: 0.35rem 0.8rem; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 0.2rem; white-space: nowrap; height: 30px; font-size: 0.8rem; }
        .btn:hover { background: var(--primary-dark); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .table-wrapper { background: var(--card-bg); border-radius: var(--radius); box-shadow: var(--shadow); overflow: auto; flex: 1; max-height: calc(100vh - 240px); }
        table { width: 100%; border-collapse: collapse; min-width: 900px; }
        th { background: #fafafa; padding: 0.5rem 0.4rem; text-align: left; font-weight: 600; color: var(--text-secondary); border-bottom: 2px solid var(--border); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2px; white-space: nowrap; position: sticky; top: 0; z-index: 8; }
        td { padding: 0.4rem 0.4rem; border-bottom: 1px solid var(--border); font-size: 0.75rem; vertical-align: middle; }
        tr { cursor: pointer; transition: background 0.15s; }
        tr:hover td { background: #fff7e6; }
        tr.favorite-row td { background: #fffbe6; }
        .source-badge { display: inline-block; padding: 0.15rem 0.4rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
        .status-badge { display: inline-block; padding: 0.15rem 0.4rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
        .status-new { background: #e6f7ff; color: #096dd9; } .status-work { background: #f6ffed; color: #389e0d; }
        .status-letter-sent { background: #fff7e6; color: #d48806; } .status-info-letter-sent { background: #f9f0ff; color: #722ed1; }
        .status-kp-sent { background: #fffbe6; color: #ad6800; } .status-negotiations { background: #f0f5ff; color: #2f54eb; }
        .status-order-received { background: #e6fffb; color: #08979c; } .status-rejected { background: #fff1f0; color: #cf1322; }
        .status-closed { background: #f5f5f5; color: #595959; }
        .comment-indicator { font-size: 0.7rem; color: var(--text-secondary); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .action-buttons { display: flex; gap: 0.15rem; }
        .action-btn { background: none; border: 1px solid var(--border); border-radius: 3px; padding: 0.15rem 0.35rem; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
        .action-btn:hover { background: #f0f0f0; }
        .action-btn.fav-active { color: #f59e0b; border-color: #f59e0b; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 0.3rem; margin-top: 0.75rem; position: sticky; bottom: 0; background: var(--card-bg); padding: 0.5rem 0; border-top: 1px solid var(--border); z-index: 7; }
        .pagination button { padding: 0.25rem 0.5rem; border: 1px solid var(--border); border-radius: 3px; background: white; cursor: pointer; font-size: 0.75rem; }
        .pagination button.active { background: var(--primary); color: white; border-color: var(--primary); }
        .pagination button:disabled { opacity: 0.5; cursor: default; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
        .modal-overlay.active { display: flex; }
        .modal { background: white; border-radius: 12px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2); padding: 1.25rem; position: relative; }
        .modal-close { position: absolute; top: 0.75rem; right: 0.75rem; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary); }
        .modal h2 { margin-bottom: 0.75rem; padding-right: 2rem; font-size: 1.1rem; }
        .detail-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 0.75rem; font-size: 0.85rem; }
        .detail-label { font-weight: 600; color: var(--text-secondary); }
        .detail-value { word-break: break-word; }
        .no-results { text-align: center; padding: 2rem; color: var(--text-secondary); }
        .source-link { color: var(--primary); font-weight: 500; text-decoration: none; }
        .source-link:hover { text-decoration: underline; }
        .contact-highlight { background: #fffbe6; padding: 0.3rem 0.6rem; border-radius: 4px; border-left: 3px solid #fa8c16; margin-top: 0.25rem; }
        .save-btn { background: var(--primary); color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem; }
        .save-btn:hover { background: var(--primary-dark); }
        .comment-textarea, .contact-textarea { width: 100%; padding: 0.35rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 0.8rem; resize: vertical; min-height: 50px; }
        .email-textarea { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 0.8rem; resize: vertical; min-height: 150px; }
        .button-group { display: flex; gap: 0.4rem; margin-top: 0.75rem; }

    </style>
</head>
<body>
    <div class="header">
        <h1>🏭 Заказы, тендеры, объявления · Металлообработка + СМР</h1>
        <span class="header-badge" id="totalOrdersBadge">Всего заказов: 0</span>
    </div>
    <div class="container">
        <div class="filters-panel">
            <div class="filter-row">
                <div class="filter-group" style="flex: 2 1 180px;"><label>🔍 Поиск</label><input type="text" id="searchInput" placeholder="Название, описание..."></div>
                <div class="filter-group"><label>Категория</label><select id="categoryFilter"><option value="">Все</option><option value="Металлообработка">Металлообработка</option><option value="СМР (строительно-монтажные работы)">СМР (строительно-монтажные работы)</option><option value="СМР и горное оборудование">СМР и горное оборудование</option></select></div>
                <div class="filter-group" style="flex: 2 1 180px; max-width: 180px;"><label>Источник</label><select id="sourceFilter" multiple size="1" style="width:100%;"></select></div>
                <div class="filter-group"><label>Тип площадки</label><select id="platformTypeFilter"><option value="">Все</option><option value="tender">🏛️ Тендерные площадки</option><option value="social">💬 Соцсети и мессенджеры</option><option value="service">🔧 Сервисы заказов</option></select></div>
                <div class="filter-group"><label>Обработка</label><select id="processingFilter" multiple size="1"></select></div>
                <div class="filter-group"><label>Материал</label><select id="materialFilter" multiple size="1"></select></div>
                <div class="filter-group"><label>Регион</label><select id="regionFilter" multiple size="1"></select></div>
                <div class="filter-group" style="max-width: 80px;"><label>Цена от</label><input type="number" id="priceFrom" placeholder="0"></div>
                <div class="filter-group" style="max-width: 80px;"><label>Цена до</label><input type="number" id="priceTo" placeholder="∞"></div>
                <div class="filter-group" style="max-width: 110px;"><label>Дедлайн с</label><input type="date" id="deadlineFrom"></div>
                <div class="filter-group" style="max-width: 110px;"><label>Дедлайн по</label><input type="date" id="deadlineTo"></div>
                <div class="filter-group" style="max-width: 130px;"><label>Статус</label><select id="userStatusFilter"><option value="">Все</option></select></div>
                <div class="filter-group" style="max-width: 120px;"><label>Режим</label><select id="viewModeFilter"><option value="all">Все</option><option value="favorites">Избранные</option><option value="archive">Архив</option></select></div>
                <button class="btn" id="searchNewBtn" style="background:#1677ff;">🔍 Поиск</button>
                <button class="btn" id="companySettingsBtn" style="background:#722ed1;">⚙️ Компания</button>
            </div>
        </div>
        <div class="table-wrapper">
            <table id="ordersTable">
                <thead>
                    <tr>
                        <th style="width:30px;">№</th>
                        <th style="width:70px;">Тип</th>
                        <th style="width:100px;">Источник</th><th>Заказ</th><th>Заказчик</th><th>Обработка</th><th>Материал</th><th>Регион</th><th>Цена</th><th>Статус</th><th>Комм.</th><th>Оплата</th><th>Конт.</th><th>Дедлайн</th><th>Опубл.</th><th>Действ.</th>
                    </tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
            <div id="noResults" class="no-results" style="display: none;">Заказы не найдены</div>
        </div>
        <div class="pagination" id="pagination"></div>
    </div>
    <div class="modal-overlay" id="modalOverlay"><div class="modal"><button class="modal-close" id="modalClose">&times;</button><h2 id="modalTitle"></h2><div class="detail-grid" id="modalDetails"></div></div></div>
    <div class="modal-overlay" id="emailModalOverlay"><div class="modal"><button class="modal-close" id="emailModalClose">&times;</button><h2>📧 Информационное письмо</h2><textarea id="emailText" class="email-textarea"></textarea><div class="button-group"><button class="btn" id="sendEmailBtn">Отправить через почту</button><button class="btn" id="copyEmailBtn" style="background:#52c41a;">📋 Скопировать</button></div></div></div>
    <div class="modal-overlay" id="kpModalOverlay"><div class="modal"><button class="modal-close" id="kpModalClose">&times;</button><h2>📊 Коммерческое предложение</h2><textarea id="kpText" class="email-textarea"></textarea><div class="button-group"><button class="btn" id="sendKpBtn">Отправить через почту</button><button class="btn" id="copyKpBtn" style="background:#52c41a;">📋 Скопировать</button></div></div></div>
    <div class="modal-overlay" id="companyModalOverlay"><div class="modal"><button class="modal-close" id="companyModalClose">&times;</button><h2>⚙️ Настройки вашей компании</h2><div style="display:flex; flex-direction:column; gap:0.5rem;"><div><label>Название компании:</label><input type="text" id="companyName" style="width:100%;"></div><div><label>Контактное лицо:</label><input type="text" id="companyContact" style="width:100%;"></div><div><label>Телефон:</label><input type="text" id="companyPhone" style="width:100%;"></div><div><label>Email:</label><input type="text" id="companyEmail" style="width:100%;"></div><div><label>Специализация (кратко):</label><input type="text" id="companySpecialization" style="width:100%;"></div><button class="btn" id="saveCompanySettings">💾 Сохранить</button></div></div></div>
    <div class="modal-overlay" id="contactsModalOverlay"><div class="modal"><button class="modal-close" id="contactsModalClose">&times;</button><h2>📇 Найденные контакты</h2><div id="contactsModalContent"></div></div></div>

    <script>
        const initialOrders = [
            { id: 1, external_id: 'Заявка 18957', source: 'metallportal.com', title: 'Вал отбора мощности', description: 'Палец сталь 18ХТГ + напыление Ni-Cr, втулки БрОФ10-1 или латунь Л63.', customer_name: 'Заказчик, Санкт-Петербург', processing_types: 'Металлообработка, Механическая обработка', materials: 'Сталь 18ХТГ, БрОФ10-1, Латунь Л63', region: 'Санкт-Петербург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-26', published_at: '2026-05-26', status: 'active', contact_info: 'Контакты скрыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi/val-otbora-moshchnosti' },
            { id: 2, external_id: 'Заявка 18956', source: 'metallportal.com', title: 'Изготовление изделий (лопатки, оси, крепления)', description: 'Лопатка WAD5 — 6 шт, Крепление 740695 — 2 шт.', customer_name: 'ООО "АКСЕЛЬ", Санкт-Петербург', processing_types: 'Металлообработка, Механическая обработка', materials: 'Сталь', region: 'Санкт-Петербург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-26', published_at: '2026-05-26', status: 'active', contact_info: 'ООО "АКСЕЛЬ"', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi/izgotovlenie-izdeliy-20260526120116' },
            { id: 3, external_id: 'Заявка 18970', source: 'metallportal.com', title: 'Шип калёный', description: 'Изготовление шипов из металла с последующей закалкой. 100 000 шт.', customer_name: 'Заказчик, Санкт-Петербург', processing_types: 'Металлообработка, Термообработка, Механическая обработка', materials: 'Сталь', region: 'Санкт-Петербург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-09-30', published_at: '2026-05-28', status: 'active', contact_info: 'Контакты скрыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi/ship-kalenyy-20260528065112' },
            { id: 4, external_id: 'Заявка 18961', source: 'metallportal.com', title: 'Пластины 355×265 и 355×300', description: 'Пластина 355×265 — 12 шт, Пластина 355×300 — 6 шт.', customer_name: 'Заказчик, Санкт-Петербург', processing_types: 'Металлообработка, Механическая обработка', materials: 'Сталь', region: 'Санкт-Петербург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-27', published_at: '2026-05-27', status: 'active', contact_info: 'Контакты скрыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi/plastiny-20247' },
            { id: 5, external_id: 'Тендер №3461110', source: 'tendermedia.ru', title: 'Стенд хранения электродов, Контейнеры Q=1т, Q=3т', description: 'Допускается предоставление ТКП на одну или несколько позиций.', customer_name: 'АО "Чепецкий механический завод"', processing_types: 'Изготовление металлоконструкций', materials: 'Сталь', region: 'Республика Удмуртия', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-11', published_at: '2026-05-28', status: 'active', contact_info: 'Контакты через tendermedia.ru', payment_terms: 'по договору', category: 'Металлообработка', platform_type: 'tender', url: 'https://tendermedia.ru/lot/show/60919981' },
            { id: 6, external_id: 'Закупка №1196211', source: 'tender.pro', title: 'Закупка запасных частей для дробильного оборудования по чертежам', description: 'ПАО "Комбинат Магнезит". Отсрочка платежа 90 дней.', customer_name: 'ПАО "Комбинат Магнезит"', processing_types: 'Изготовление запчастей по чертежам', materials: 'Сталь', region: 'Челябинская обл.', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-05-31', published_at: '2026-05-01', status: 'active', contact_info: 'Смоляков С.Б., ssmolyakov@magnezit.com', payment_terms: 'отсрочка 90 дней', category: 'Металлообработка', platform_type: 'tender', url: 'https://www.tender.pro/api/tender/1196211/view_public' },
            { id: 7, external_id: 'Тендер №32615784294', source: 'tendermedia.ru', title: 'Поставка запчастей для конусных дробилок КМД1200 и КСД1200', description: 'Запрос котировок. Втулки, броня, станина, вал-эксцентрик, шестерня, пружины.', customer_name: 'Заказчик, Красноярский край', processing_types: 'Изготовление запчастей, Механическая обработка', materials: 'Сталь, Бронза БрО5Ц5С5', region: 'Красноярский край', price_from: null, price_to: 18517274, currency: 'RUB', deadline: '2026-03-19', published_at: '2026-03-11', status: 'closed', contact_info: 'Контакты через tendermedia.ru', payment_terms: 'по договору', category: 'Металлообработка', platform_type: 'tender', url: 'https://tendermedia.ru/lot/show/59971201' },
            { id: 8, external_id: 'Заявка 1901', source: 'metallportal.com', title: 'Валики и втулки шлицевые', description: 'Изготовление по чертежам заказчика.', customer_name: 'Заказчик, Екатеринбург', processing_types: 'Металлообработка, Изготовление деталей', materials: 'Сталь', region: 'Екатеринбург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-12-01', published_at: '2026-05-27', status: 'active', contact_info: 'Контакты скрыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi' },
            { id: 9, external_id: 'Заявка 1897', source: 'metallportal.com', title: 'Обработка корпуса насоса', description: 'Материал: Белый чугун (А05). Вес детали 6300 кг.', customer_name: 'Заказчик', processing_types: 'Механическая обработка', materials: 'Белый чугун', region: 'Не указан', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-27', published_at: '2026-05-27', status: 'active', contact_info: 'Контакты скрыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://metallportal.com/zakazi' },
            { id: 10, external_id: 'Заказ №17582', source: 'metalloobrabotchiki.ru', title: 'Заготовка', description: 'Литьё металла, обработка давлением. 4 шт.', customer_name: 'Заказчик, г. Уфа', processing_types: 'Литьё металла, Обработка давлением, Изготовление деталей', materials: 'Сталь', region: 'Республика Башкортостан', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-05', published_at: '2026-05-20', status: 'active', contact_info: 'Контакты открыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://minsk.metalloobrabotchiki.ru/orders/17582' },
            { id: 11, external_id: 'Тендер №3459751', source: 'fabrikant.ru', title: 'Заточка инструмента', description: 'ТЗ № ИРС-ТО 4/858.', customer_name: 'ООО "ИжораРемСервис"', processing_types: 'Заточка инструмента', materials: '—', region: 'Санкт-Петербург', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-05-27', published_at: '2026-05-25', status: 'active', contact_info: '+7 (812) 702-05-72', payment_terms: 'по договору', category: 'Металлообработка', platform_type: 'tender', url: 'https://www.fabrikant.ru/trades/atom/PriceMonitoring/?action=view&id=981876' },
            { id: 40, external_id: 'Заказ №17564', source: 'metalloobrabotchiki.ru', title: 'Изготовление деталей по чертежам', description: 'Механическая обработка деталей по чертежам заказчика. 25 шт.', customer_name: 'Заказчик, Москва', processing_types: 'Механическая обработка, Изготовление деталей', materials: 'Сталь', region: 'Москва', price_from: null, price_to: null, currency: 'RUB', deadline: '2026-06-05', published_at: '2026-05-15', status: 'active', contact_info: 'Контакты открыты', payment_terms: 'договорная', category: 'Металлообработка', platform_type: 'tender', url: 'https://khabarovsk.metalloobrabotchiki.ru/orders/17564' },
            { id: 41, external_id: 'Тендер №32615980493', source: 'tendermedia.ru', title: 'Строительство выпуска очищенных сточных вод', description: 'Плановая сумма 793,6 млн ₽.', customer_name: 'ООО УК «РОСВОДОКАНАЛ»', processing_types: 'Проектно-изыскательские работы, Строительно-монтажные работы, Пуско-наладочные работы', materials: 'Бетон, Металлоконструкции', region: 'Москва', price_from: null, price_to: 793634274, currency: 'RUB', deadline: '2026-05-28', published_at: '2026-05-26', status: 'active', contact_info: 'Чемодурова О. Ю., o.chemodurova@rosvodokanal.ru', payment_terms: 'по договору', category: 'СМР (строительно-монтажные работы)', platform_type: 'tender', url: 'https://tendermedia.ru/lot/show/60902429' },
            { id: 42, external_id: 'Тендер №32615992697', source: 'tendermedia.ru', title: 'Ремонт фасадов зданий и сооружений энергообъектов', description: 'Плановая сумма 122 млн ₽.', customer_name: 'ПАО «Россети Московский регион»', processing_types: 'Ремонтно-строительные работы, Фасадные работы', materials: 'Краска, Штукатурка', region: 'Москва', price_from: null, price_to: 122000000, currency: 'RUB', deadline: '2026-06-03', published_at: '2026-05-25', status: 'active', contact_info: 'Терновая Т. Г., ternovayatg@rossetimr.ru', payment_terms: 'по договору', category: 'СМР (строительно-монтажные работы)', platform_type: 'tender', url: 'https://tendermedia.ru/lot/show/60886178' },
            { id: 43, external_id: 'Тендер №32616054505', source: 'zakupki.kontur.ru', title: 'Строительство "Мартовская ВЭС"', description: 'Начальная цена 7,84 млрд ₽.', customer_name: 'Не раскрыт', processing_types: 'Строительно-монтажные работы, Электромонтажные работы, Пусконаладочные работы', materials: 'Бетон, Металлоконструкции', region: 'Россия', price_from: null, price_to: 7841714108, currency: 'RUB', deadline: '2026-06-15', published_at: '2026-05-27', status: 'active', contact_info: 'Контакт скрыт', payment_terms: '223-ФЗ', category: 'СМР (строительно-монтажные работы)', platform_type: 'tender', url: 'https://zakupki.kontur.ru/32616054505' },
            { id: 56, external_id: 'Закупка №32616050001', source: 'tendermedia.ru', title: 'Монтаж и пусконаладка конвейерной линии', description: 'СМР по установке ленточного конвейера на обогатительной фабрике.', customer_name: 'ООО "Обогатительная фабрика №1"', processing_types: 'Строительно-монтажные работы', materials: 'Металлоконструкции, Резина', region: 'Кемеровская обл.', price_from: null, price_to: 12000000, currency: 'RUB', deadline: '2026-08-01', published_at: '2026-05-28', status: 'active', contact_info: 'Контакты через tendermedia.ru', payment_terms: 'аванс 30%', category: 'СМР и горное оборудование', platform_type: 'tender', url: 'https://tendermedia.ru/lot/show/60930002' },
        ];

        const userStatuses = ['Новый', 'В работе', 'Письмо отправлено', 'Информационное письмо отправлено', 'КП отправлено', 'Переговоры', 'Заказ получен', 'Отказ', 'Закрыт'];
        const PAGE_SIZE = 30;

        function loadOrders() {
            const saved = localStorage.getItem('metal_orders_data_v14');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.length < initialOrders.length) {
                        const merged = initialOrders.map(order => {
                            const existing = parsed.find(o => o.id === order.id);
                            if (existing) {
                                return { ...order, user_status: existing.user_status, comments: existing.comments, favorite: existing.favorite, archived: existing.archived, contact_info: existing.contact_info };
                            } else {
                                return { ...order, user_status: 'Новый', comments: '', favorite: false, archived: false };
                            }
                        });
                        saveOrders(merged);
                        return merged;
                    }
                    return parsed;
                } catch (e) {}
            }
            const initial = initialOrders.map(order => ({ ...order, user_status: 'Новый', comments: '', favorite: false, archived: false }));
            saveOrders(initial);
            return initial;
        }
        function saveOrders(data) { localStorage.setItem('metal_orders_data_v14', JSON.stringify(data || ordersData)); }
        let ordersData = loadOrders();

        const defaultCompanyInfo = {
            name: 'ООО "МеталлОбработкаПро"', contact: 'Иванов И.И.',
            phone: '+7(495)123-45-67', email: 'info@metallpro.ru',
            specialization: 'Токарная, фрезерная, лазерная резка, сварка'
        };
        function loadCompanyInfo() {
            const saved = localStorage.getItem('metal_company_info_v14');
            if (saved) try { return JSON.parse(saved); } catch (e) {}
            return { ...defaultCompanyInfo };
        }
        function saveCompanyInfo(info) { localStorage.setItem('metal_company_info_v14', JSON.stringify(info)); }
        let companyInfo = loadCompanyInfo();

        function getUniqueValues(key, split = false) {
            const set = new Set();
            ordersData.forEach(o => {
                const val = o[key];
                if (val) {
                    if (split) val.split(',').map(s => s.trim()).forEach(s => set.add(s));
                    else set.add(val);
                }
            });
            return Array.from(set).sort();
        }
        function populateSelect(id, values) {
            const sel = document.getElementById(id);
            sel.innerHTML = '';
            values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                sel.appendChild(opt);
            });
        }
        function refreshSelects() {
            populateSelect('sourceFilter', getUniqueValues('source'));
            populateSelect('processingFilter', getUniqueValues('processing_types', true));
            populateSelect('materialFilter', getUniqueValues('materials', true));
            populateSelect('regionFilter', getUniqueValues('region'));
            const sel = document.getElementById('userStatusFilter');
            sel.innerHTML = '<option value="">Все</option>';
            userStatuses.forEach(s => { const opt = document.createElement('option'); opt.value = s; opt.textContent = s; sel.appendChild(opt); });
        }
        refreshSelects();

        let currentPage = 1;
        function goToPage(page) { currentPage = page; renderTable(); }
        function renderPagination(totalPages) {
            const pagDiv = document.getElementById('pagination');
            if (totalPages <= 1) { pagDiv.innerHTML = ''; return; }
            let html = '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">‹</button>';
            for (let i = 1; i <= totalPages; i++) html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
            html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">›</button>';
            pagDiv.innerHTML = html;
        }

        function filterOrders() {
            const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
            const selectedCategory = document.getElementById('categoryFilter').value;
            const selectedPlatformType = document.getElementById('platformTypeFilter').value;
            const selSources = Array.from(document.getElementById('sourceFilter').selectedOptions).map(o => o.value);
            const selProc = Array.from(document.getElementById('processingFilter').selectedOptions).map(o => o.value);
            const selMat = Array.from(document.getElementById('materialFilter').selectedOptions).map(o => o.value);
            const selReg = Array.from(document.getElementById('regionFilter').selectedOptions).map(o => o.value);
            const priceFrom = Number(document.getElementById('priceFrom').value) || null;
            const priceTo = Number(document.getElementById('priceTo').value) || null;
            const deadlineFrom = document.getElementById('deadlineFrom').value;
            const deadlineTo = document.getElementById('deadlineTo').value;
            const userStatus = document.getElementById('userStatusFilter').value;
            const viewMode = document.getElementById('viewModeFilter').value;

            return ordersData.filter(order => {
                if (viewMode === 'favorites' && !order.favorite) return false;
                if (viewMode === 'archive' && !order.archived) return false;
                if (viewMode === 'all' && order.archived) return false;
                if (selectedCategory && order.category !== selectedCategory) return false;
                if (selectedPlatformType && order.platform_type !== selectedPlatformType) return false;
                if (searchText && !(order.title.toLowerCase().includes(searchText) || order.description.toLowerCase().includes(searchText) || order.customer_name.toLowerCase().includes(searchText))) return false;
                if (selSources.length && !selSources.includes(order.source)) return false;
                if (selProc.length) { const types = order.processing_types.split(',').map(s => s.trim()); if (!selProc.some(sp => types.includes(sp))) return false; }
                if (selMat.length) { const mats = order.materials.split(',').map(s => s.trim()); if (!selMat.some(sm => mats.includes(sm))) return false; }
                if (selReg.length && !selReg.includes(order.region)) return false;
                if (priceFrom || priceTo) { const pf = order.price_from, pt = order.price_to; if (priceFrom && (pt === null || pt < priceFrom)) return false; if (priceTo && (pf === null || pf > priceTo)) return false; }
                if (deadlineFrom && order.deadline < deadlineFrom) return false;
                if (deadlineTo && order.deadline > deadlineTo) return false;
                if (userStatus && order.user_status !== userStatus) return false;
                return true;
            });
        }

        function updateOrderStatus(orderId, newStatus) { const order = ordersData.find(o => o.id === orderId); if (order) { order.user_status = newStatus; saveOrders(); renderTable(); } }
        function updateOrderComments(orderId, newComments) { const order = ordersData.find(o => o.id === orderId); if (order) { order.comments = newComments; saveOrders(); renderTable(); } }
        function updateOrderContactInfo(orderId, newContactInfo) { const order = ordersData.find(o => o.id === orderId); if (order) { order.contact_info = newContactInfo; saveOrders(); renderTable(); } }
        function toggleFavorite(orderId) { const order = ordersData.find(o => o.id === orderId); if (order) { order.favorite = !order.favorite; saveOrders(); renderTable(); } }
        function toggleArchive(orderId) { const order = ordersData.find(o => o.id === orderId); if (order) { order.archived = !order.archived; saveOrders(); renderTable(); } }
        function deleteOrder(orderId) { if (!confirm('Удалить заказ навсегда?')) return; ordersData = ordersData.filter(o => o.id !== orderId); saveOrders(); renderTable(); }

        function formatPrice(order) {
            if (order.price_from && order.price_to) return order.price_from.toLocaleString() + ' – ' + order.price_to.toLocaleString() + ' ₽';
            if (order.price_from) return 'от ' + order.price_from.toLocaleString() + ' ₽';
            if (order.price_to) return 'до ' + order.price_to.toLocaleString() + ' ₽';
            return '—';
        }
        function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—'; }
        function getStatusClass(status) { const map = { 'Новый':'status-new', 'В работе':'status-work', 'Письмо отправлено':'status-letter-sent', 'Информационное письмо отправлено':'status-info-letter-sent', 'КП отправлено':'status-kp-sent', 'Переговоры':'status-negotiations', 'Заказ получен':'status-order-received', 'Отказ':'status-rejected', 'Закрыт':'status-closed' }; return map[status] || ''; }
        function escapeHtml(text) { const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}; return String(text).replace(/[&<>"']/g, m => map[m]); }
        function getPlatformTypeLabel(type) { const map = { 'tender': '🏛️ Тендер', 'social': '💬 Соцсеть', 'service': '🔧 Сервис' }; return map[type] || type; }
        function formatSource(src) { try { return new URL(src.startsWith('http') ? src : 'https://' + src).hostname.replace('www.', ''); } catch(e) { return src; } }

        function renderTable() {
            const filtered = filterOrders();
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            if (currentPage > totalPages) currentPage = totalPages || 1;
            const start = (currentPage - 1) * PAGE_SIZE;
            const pageItems = filtered.slice(start, start + PAGE_SIZE);

            const tbody = document.getElementById('tableBody');
            const noRes = document.getElementById('noResults');
            tbody.innerHTML = '';
            document.getElementById('totalOrdersBadge').textContent = 'Всего заказов: ' + filtered.length;

            if (pageItems.length === 0) {
                noRes.style.display = 'block';
            } else {
                noRes.style.display = 'none';
                pageItems.forEach((order, idx) => {
                    const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const statusClass = getStatusClass(order.user_status);
                    const row = tbody.insertRow();
                    if (order.favorite) row.classList.add('favorite-row');
                    row.setAttribute('data-id', order.id);
                    row.innerHTML =
                        '<td>' + globalIndex + '</td>' +
                        '<td><span class="source-badge">' + getPlatformTypeLabel(order.platform_type) + '</span></td>' +
                        '<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(order.source) + '">' + formatSource(order.source) + '</td>' +
                        '<td>' + escapeHtml(order.title) + '</td>' +
                        '<td>' + escapeHtml(order.customer_name) + '</td>' +
                        '<td>' + escapeHtml(order.processing_types) + '</td>' +
                        '<td>' + escapeHtml(order.materials) + '</td>' +
                        '<td>' + escapeHtml(order.region) + '</td>' +
                        '<td>' + formatPrice(order) + '</td>' +
                        '<td><span class="status-badge ' + statusClass + '">' + order.user_status + '</span><select onchange="updateOrderStatus(' + order.id + ', this.value)" style="margin-left:4px;">' + userStatuses.map(st => '<option ' + (order.user_status===st?'selected':'') + '>' + st + '</option>').join('') + '</select></td>' +
                        '<td class="comment-indicator" title="' + escapeHtml(order.comments || '') + '">' + (order.comments ? order.comments.substring(0,30)+'…' : '—') + '</td>' +
                        '<td>' + escapeHtml(order.payment_terms || '—') + '</td>' +
                        '<td>' + (order.contact_info && order.contact_info !== 'Контакты скрыты' && order.contact_info !== 'Контакты открыты' ? '📞 Есть' : '—') + '</td>' +
                        '<td>' + formatDate(order.deadline) + '</td>' +
                        '<td>' + formatDate(order.published_at) + '</td>' +
                        '<td><div class="action-buttons"><button class="action-btn ' + (order.favorite ? 'fav-active' : '') + '" onclick="event.stopPropagation(); toggleFavorite(' + order.id + ')" title="Избранное">⭐</button><button class="action-btn" onclick="event.stopPropagation(); toggleArchive(' + order.id + ')" title="В архив">📁</button><button class="action-btn" onclick="event.stopPropagation(); deleteOrder(' + order.id + ')" title="Удалить">🗑️</button></div></td>';
                    row.addEventListener('click', (e) => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return; openModal(order.id); });
                });
            }
            renderPagination(totalPages);
        }

        function openModal(orderId) {
            const order = ordersData.find(o => o.id === orderId);
            if (!order) return;
            document.getElementById('modalTitle').textContent = 'Процедура: ' + order.external_id;
            document.getElementById('modalDetails').innerHTML =
                '<div class="detail-label">Номер процедуры на площадке:</div><div class="detail-value"><strong>' + escapeHtml(order.external_id) + '</strong></div>' +
                '<div class="detail-label">Тип площадки:</div><div class="detail-value">' + getPlatformTypeLabel(order.platform_type) + '</div>' +
                '<div class="detail-label">Источник:</div><div class="detail-value">' + order.source + '</div>' +
                '<div class="detail-label">Статус:</div><div class="detail-value">' + (order.status === 'active' ? 'Активен' : order.status) + '</div>' +
                '<div class="detail-label">Название:</div><div class="detail-value">' + escapeHtml(order.title) + '</div>' +
                '<div class="detail-label">Заказчик:</div><div class="detail-value">' + escapeHtml(order.customer_name) + '</div>' +
                '<div class="detail-label">Вид обработки:</div><div class="detail-value">' + escapeHtml(order.processing_types) + '</div>' +
                '<div class="detail-label">Материалы:</div><div class="detail-value">' + escapeHtml(order.materials) + '</div>' +
                '<div class="detail-label">Регион:</div><div class="detail-value">' + escapeHtml(order.region) + '</div>' +
                '<div class="detail-label">Цена:</div><div class="detail-value">' + formatPrice(order) + '</div>' +
                '<div class="detail-label">Условия оплаты:</div><div class="detail-value"><strong>' + escapeHtml(order.payment_terms || '—') + '</strong></div>' +
                '<div class="detail-label">Дедлайн:</div><div class="detail-value">' + formatDate(order.deadline) + '</div>' +
                '<div class="detail-label">Опубликован:</div><div class="detail-value">' + formatDate(order.published_at) + '</div>' +
                '<div class="detail-label">Контакты:</div><div class="detail-value"><textarea id="modalContactInfo" class="contact-textarea">' + escapeHtml(order.contact_info || '') + '</textarea></div>' +
                '<div class="detail-label">Описание:</div><div class="detail-value">' + escapeHtml(order.description) + '</div>' +
                '<div class="detail-label">Статус обработки:</div><div class="detail-value"><select id="modalStatusSelect" style="width:100%;">' + userStatuses.map(st => '<option ' + (order.user_status === st ? 'selected' : '') + '>' + st + '</option>').join('') + '</select></div>' +
                '<div class="detail-label">Комментарий:</div><div class="detail-value"><textarea id="modalCommentText" class="comment-textarea">' + escapeHtml(order.comments || '') + '</textarea></div>' +
                '<div style="grid-column: 1 / -1; display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">' +
                    '<button class="btn" onclick="saveModalChanges(' + order.id + ')">💾 Сохранить</button>' +
                    '<button class="btn" onclick="openEmailModalFromModal(' + order.id + ')" style="background:#1677ff;">📧 Инфо-письмо</button>' +
                    '<button class="btn" onclick="openKpModalFromModal(' + order.id + ')" style="background:#52c41a;">📊 КП</button>' +
                    '<button class="btn" onclick="openContactsModalFromModal(' + order.id + ')" style="background:#eb2f96;">📇 Запросить контакты</button>' +
                '</div>' +
                (order.url ? '<div class="detail-label">Ссылка на площадку:</div><div class="detail-value"><a class="source-link" href="' + escapeHtml(order.url) + '" target="_blank">Открыть оригинал →</a></div>' : '');
            document.getElementById('modalOverlay').classList.add('active');
        }

        function saveModalChanges(orderId) { updateOrderStatus(orderId, document.getElementById('modalStatusSelect').value); updateOrderComments(orderId, document.getElementById('modalCommentText').value); updateOrderContactInfo(orderId, document.getElementById('modalContactInfo').value); closeModal(); }
        function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

        function openContactsModal(order) {
            const content = document.getElementById('contactsModalContent');
            if (order.contact_info && order.contact_info.trim() !== '' && order.contact_info !== 'Контакты открыты' && order.contact_info !== 'Контакт скрыт' && order.contact_info !== 'Контакты скрыты' && !order.contact_info.startsWith('Контакты через')) {
                content.innerHTML = '<p><strong>' + order.customer_name + '</strong></p><div class="contact-highlight">📞 ' + escapeHtml(order.contact_info) + '</div><p style="margin-top:0.5rem;">Контакты найдены заранее. Проверьте также:</p>';
            } else {
                content.innerHTML = '<p><strong>' + order.customer_name + '</strong></p><p>Контакты не найдены в базе. Попробуйте поискать в интернете.</p>';
            }
            const query = encodeURIComponent(order.customer_name + ' контакты телефон email');
            content.innerHTML += '<a class="source-link" href="https://www.google.com/search?q=' + query + '" target="_blank">🔍 Искать «' + escapeHtml(order.customer_name) + '» в Google</a>';
            document.getElementById('contactsModalOverlay').classList.add('active');
        }

        window.openEmailModalFromModal = function(orderId) {
            const order = ordersData.find(o => o.id === orderId);
            if (!order) return;
            const body = 'Здравствуйте' + (order.customer_name ? ', ' + order.customer_name : '') + '!\\n\\nМеня зовут ' + companyInfo.contact + ', представляю компанию ' + companyInfo.name + '.\\nНаша специализация: ' + companyInfo.specialization + '.\\n\\nМы готовы выполнить ваш заказ "' + order.title + '" (' + order.processing_types + ') в оговоренные сроки до ' + formatDate(order.deadline) + '.\\nМатериалы: ' + order.materials + '. Регион: ' + order.region + '.\\n\\nГотовы обсудить детали и предложить конкурентную цену. Контакты для связи:\\nТелефон: ' + companyInfo.phone + '\\nEmail: ' + companyInfo.email + '\\n\\nС уважением,\\n' + companyInfo.contact + '\\n' + companyInfo.name;
            document.getElementById('emailText').value = body;
            document.getElementById('emailModalOverlay').classList.add('active');
            document.getElementById('sendEmailBtn').onclick = () => { const recipient = order.contact_info ? (order.contact_info.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/) || [''])[0] : ''; window.location.href = 'mailto:' + recipient + '?subject=Предложение сотрудничества по процедуре ' + order.external_id + '&body=' + encodeURIComponent(body); };
            document.getElementById('copyEmailBtn').onclick = () => { navigator.clipboard.writeText(body).then(() => alert('Текст скопирован!')); };
        };

        window.openKpModalFromModal = function(orderId) {
            const order = ordersData.find(o => o.id === orderId);
            if (!order) return;
            const body = 'Уважаемый(ая) ' + (order.customer_name || 'заказчик') + '!\\n\\nНаша компания ' + companyInfo.name + ' готова предложить выполнение заказа "' + order.title + '".\\n\\nУслуги: ' + order.processing_types + '\\nМатериалы: ' + order.materials + '\\nРегион выполнения: ' + order.region + '\\nСрок изготовления: до ' + formatDate(order.deadline) + '\\n\\nЦена: ' + formatPrice(order) + ' (возможно изменение по итогам уточнения)\\nУсловия оплаты: ' + (order.payment_terms || 'обсуждаются') + '\\n\\nМы гарантируем высокое качество и соблюдение сроков. Контакты для связи:\\nТелефон: ' + companyInfo.phone + '\\nEmail: ' + companyInfo.email + '\\n\\nС уважением,\\n' + companyInfo.contact + '\\n' + companyInfo.name;
            document.getElementById('kpText').value = body;
            document.getElementById('kpModalOverlay').classList.add('active');
            document.getElementById('sendKpBtn').onclick = () => { const recipient = order.contact_info ? (order.contact_info.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/) || [''])[0] : ''; window.location.href = 'mailto:' + recipient + '?subject=Коммерческое предложение по процедуре ' + order.external_id + '&body=' + encodeURIComponent(body); };
            document.getElementById('copyKpBtn').onclick = () => { navigator.clipboard.writeText(body).then(() => alert('Текст КП скопирован!')); };
        };

        window.openContactsModalFromModal = function(orderId) { const order = ordersData.find(o => o.id === orderId); if (order) openContactsModal(order); };

        function openCompanySettings() {
            document.getElementById('companyName').value = companyInfo.name;
            document.getElementById('companyContact').value = companyInfo.contact;
            document.getElementById('companyPhone').value = companyInfo.phone;
            document.getElementById('companyEmail').value = companyInfo.email;
            document.getElementById('companySpecialization').value = companyInfo.specialization;
            document.getElementById('companyModalOverlay').classList.add('active');
        }
        function closeCompanyModal() { document.getElementById('companyModalOverlay').classList.remove('active'); }
        document.getElementById('saveCompanySettings').addEventListener('click', () => {
            companyInfo = { name: document.getElementById('companyName').value, contact: document.getElementById('companyContact').value, phone: document.getElementById('companyPhone').value, email: document.getElementById('companyEmail').value, specialization: document.getElementById('companySpecialization').value };
            saveCompanyInfo(companyInfo); closeCompanyModal(); alert('Настройки компании сохранены!');
        });

        document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; renderTable(); });
        document.getElementById('categoryFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('platformTypeFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('sourceFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('processingFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('materialFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('regionFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('priceFrom').addEventListener('input', () => { currentPage = 1; renderTable(); });
        document.getElementById('priceTo').addEventListener('input', () => { currentPage = 1; renderTable(); });
        document.getElementById('deadlineFrom').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('deadlineTo').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('userStatusFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('viewModeFilter').addEventListener('change', () => { currentPage = 1; renderTable(); });
        document.getElementById('companySettingsBtn').addEventListener('click', openCompanySettings);

        // ===== РЕАЛЬНЫЙ ПОИСК ПО ПЛОЩАДКАМ =====
        const SEARCH_API = 'https://functions.poehali.dev/63646839-5642-4afa-827b-d771c8294f21';

        // Запросы по всем трём категориям
        const AUTO_QUERIES = [
            { query: 'металлообработка токарные фрезерные работы изготовление деталей', category: 'all' },
            { query: 'металлообработка заказ тендер закупка запчасти', category: 'all' },
            { query: 'строительно-монтажные работы СМР подряд субподряд', category: 'all' },
            { query: 'строительство монтаж тендер закупка', category: 'all' },
            { query: 'горное оборудование горнодобывающее запчасти дробилка конвейер экскаватор', category: 'all' },
            { query: 'горное оборудование ремонт поставка тендер', category: 'all' },
        ];

        async function runSearch(queries) {
            const btn = document.getElementById('searchNewBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Ищу...';

            let totalAdded = 0;
            const existingUrls = new Set(ordersData.map(o => o.url));

            for (let i = 0; i < queries.length; i++) {
                const { query, category } = queries[i];
                btn.textContent = '⏳ ' + (i + 1) + '/' + queries.length + '...';
                try {
                    const res = await fetch(SEARCH_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, category }),
                    });
                    const data = await res.json();
                    const newOrders = data.results || [];
                    const added = newOrders.filter(o => o.url && !existingUrls.has(o.url));
                    added.forEach(o => existingUrls.add(o.url));
                    if (added.length > 0) {
                        ordersData = [...added, ...ordersData];
                        totalAdded += added.length;
                    }
                } catch (e) { /* пропускаем ошибку одного запроса */ }
            }

            saveOrders();
            refreshSelects();
            currentPage = 1;
            renderTable();
            btn.disabled = false;
            btn.textContent = '🔍 Поиск';

            if (totalAdded > 0) {
                alert('✅ Найдено и добавлено ' + totalAdded + ' новых тендеров и заявок!');
            } else {
                alert('Новых заказов не найдено — все уже есть в таблице.');
            }
        }

        document.getElementById('searchNewBtn').addEventListener('click', async () => {
            const manualQuery = document.getElementById('searchInput').value.trim();
            const category = document.getElementById('categoryFilter').value;

            if (manualQuery) {
                // Если введён текст — ищем по нему
                await runSearch([{ query: manualQuery, category: category || 'all' }]);
            } else {
                // Без текста — автоматический поиск по всем трём категориям
                await runSearch(AUTO_QUERIES);
            }
        });

        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
        document.getElementById('emailModalClose').addEventListener('click', () => document.getElementById('emailModalOverlay').classList.remove('active'));
        document.getElementById('emailModalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('emailModalOverlay')) document.getElementById('emailModalOverlay').classList.remove('active'); });
        document.getElementById('kpModalClose').addEventListener('click', () => document.getElementById('kpModalOverlay').classList.remove('active'));
        document.getElementById('kpModalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('kpModalOverlay')) document.getElementById('kpModalOverlay').classList.remove('active'); });
        document.getElementById('companyModalClose').addEventListener('click', closeCompanyModal);
        document.getElementById('companyModalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('companyModalOverlay')) closeCompanyModal(); });
        document.getElementById('contactsModalClose').addEventListener('click', () => document.getElementById('contactsModalOverlay').classList.remove('active'));
        document.getElementById('contactsModalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('contactsModalOverlay')) document.getElementById('contactsModalOverlay').classList.remove('active'); });

        renderTable();
    </script>
</body>
</html>"""


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def handler(event: dict, context) -> dict:
    """Агрегатор: загрузка и получение HTML-файла администратором."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        qs = event.get("queryStringParameters") or {}
        mode = qs.get("mode", "json")

        if mode == "page":
            # Всегда отдаём актуальный HTML с кодом поиска
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "text/html; charset=utf-8",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                },
                "body": DEFAULT_HTML,
            }

        # JSON-режим — для совместимости
        try:
            s3 = get_s3()
            obj = s3.get_object(Bucket=BUCKET, Key=S3_KEY)
            html = obj["Body"].read().decode("utf-8")
        except Exception:
            html = DEFAULT_HTML
        return {
            "statusCode": 200,
            "headers": {**cors, "Content-Type": "application/json"},
            "body": json.dumps({"html": html}),
        }

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "login":
            ok = body.get("login") == ADMIN_LOGIN and body.get("password") == ADMIN_PASS
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"ok": ok}),
            }

        if action == "upload":
            if body.get("login") != ADMIN_LOGIN or body.get("password") != ADMIN_PASS:
                return {
                    "statusCode": 403,
                    "headers": {**cors, "Content-Type": "application/json"},
                    "body": json.dumps({"error": "Не авторизован"}),
                }
            html_content = body.get("html", "")
            s3 = get_s3()
            s3.put_object(
                Bucket=BUCKET,
                Key=S3_KEY,
                Body=html_content.encode("utf-8"),
                ContentType="text/html; charset=utf-8",
            )
            return {
                "statusCode": 200,
                "headers": {**cors, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True}),
            }

    return {
        "statusCode": 400,
        "headers": {**cors, "Content-Type": "application/json"},
        "body": json.dumps({"error": "Неверный запрос"}),
    }