ALTER TABLE pages ADD COLUMN theme TEXT NOT NULL DEFAULT 'default' CHECK (theme IN ('default', 'paper', 'terminal', 'midnight', 'rose', 'ocean'));
