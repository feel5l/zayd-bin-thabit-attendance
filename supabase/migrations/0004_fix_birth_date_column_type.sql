-- birth_date in the source data is a Hijri calendar date (e.g. '12/07/1439'),
-- which Postgres's native DATE type cannot represent (Gregorian only, and
-- day/month values like 17/08 fail its MDY parsing regardless). Store it as
-- plain text, exactly as the app already does (Student.birthDate: string).
ALTER TABLE students ALTER COLUMN birth_date TYPE TEXT;
