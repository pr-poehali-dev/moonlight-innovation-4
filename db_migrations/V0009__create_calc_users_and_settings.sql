CREATE TABLE IF NOT EXISTS t_p28332968_moonlight_innovation.calc_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p28332968_moonlight_innovation.calc_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p28332968_moonlight_innovation.calc_users(id),
    settings_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);
