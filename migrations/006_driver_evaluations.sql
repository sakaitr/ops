-- Şöför Değerlendirmeleri
CREATE TABLE IF NOT EXISTS driver_evaluations (
  id TEXT PRIMARY KEY,
  evaluation_date TEXT NOT NULL,          -- YYYY-MM-DD
  driver_name TEXT NOT NULL,              -- Şöför adı soyadı (serbest metin)
  plate TEXT NOT NULL,                    -- Araç plakası
  vehicle_info TEXT,                      -- Araç bilgisi (marka/model vb.)
  route_text TEXT,                        -- Güzergah (serbest metin)
  company_id TEXT REFERENCES companies(id), -- Firma (opsiyonel)
  -- Değerlendirme kriterleri (1-5)
  score_punctuality INTEGER NOT NULL DEFAULT 3,    -- Dakiklik
  score_driving INTEGER NOT NULL DEFAULT 3,        -- Sürüş Davranışı
  score_communication INTEGER NOT NULL DEFAULT 3,  -- Yolcu İletişimi
  score_cleanliness INTEGER NOT NULL DEFAULT 3,    -- Araç Temizliği
  score_route_compliance INTEGER NOT NULL DEFAULT 3, -- Güzergah Uyumu
  score_appearance INTEGER NOT NULL DEFAULT 3,     -- Kıyafet & Görünüm
  notes TEXT,                             -- Genel notlar
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
