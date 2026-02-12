-- チケット種別カラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_types JSONB DEFAULT '[]'::jsonb;

-- 予約テーブルにチケット名カラムを追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ticket_name TEXT;

-- 既存イベントにチケット種別を設定
UPDATE events
SET ticket_types = '[
  {"name": "EOメンバー(懇親会含む)", "price": 10000},
  {"name": "ゲスト(懇親会含む)", "price": 8000},
  {"name": "行政関係者（講演のみ参加）", "price": 0},
  {"name": "学生（講演のみ参加）", "price": 0},
  {"name": "学生（懇親会含む）", "price": 2000}
]'::jsonb
WHERE title LIKE '%EO North Japan%';
