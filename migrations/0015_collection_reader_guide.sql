-- Reader's guide cards on the collection cover page
ALTER TABLE collections ADD COLUMN what_its_about TEXT;
ALTER TABLE collections ADD COLUMN who_its_for TEXT;
ALTER TABLE collections ADD COLUMN how_to_read_it TEXT;
ALTER TABLE collections ADD COLUMN readers_guide TEXT;
