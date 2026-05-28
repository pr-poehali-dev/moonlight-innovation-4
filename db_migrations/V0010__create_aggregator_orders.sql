CREATE TABLE IF NOT EXISTS t_p28332968_moonlight_innovation.aggregator_orders (
    id SERIAL PRIMARY KEY,
    external_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    customer_name TEXT NOT NULL DEFAULT '',
    processing_types TEXT NOT NULL DEFAULT '',
    materials TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    price_from NUMERIC,
    price_to NUMERIC,
    currency TEXT NOT NULL DEFAULT 'RUB',
    deadline DATE,
    published_at DATE,
    status TEXT NOT NULL DEFAULT 'active',
    contact_info TEXT NOT NULL DEFAULT '',
    payment_terms TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    platform_type TEXT NOT NULL DEFAULT 'tender',
    url TEXT NOT NULL DEFAULT '',
    user_status TEXT NOT NULL DEFAULT 'Новый',
    comments TEXT NOT NULL DEFAULT '',
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_orders_url ON t_p28332968_moonlight_innovation.aggregator_orders(url);
CREATE INDEX IF NOT EXISTS idx_aggregator_orders_archived ON t_p28332968_moonlight_innovation.aggregator_orders(archived);
CREATE INDEX IF NOT EXISTS idx_aggregator_orders_favorite ON t_p28332968_moonlight_innovation.aggregator_orders(favorite);
