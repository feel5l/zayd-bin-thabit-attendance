-- Fix teacher-22 phone/national-id hashes to match official 1448 roster.
-- Official phone: 0556009778 (was incorrectly seeded as 0508773700).
-- Hashes are SHA-256 of normalised Saudi digits / national id text.

UPDATE teachers
SET
  phone_hash = '94c8a760333befb3907a76a3554bd166e3cefecb1c42c4463a0299580f6ebe48',
  national_id_hash = 'b861eb5f2946c23831b98da7208e31e2303c81507be5af4ce946f4d753349905',
  display_name = 'أ. فيحان بن فالح جابر المري',
  subject = 'صعوبات تعلم',
  updated_at = now()
WHERE id = 'teacher-22'
  AND school_id = 'zbt-primary';

UPDATE teachers
SET
  display_name = 'أ. خليفة سعد القعيمي',
  updated_at = now()
WHERE id = 'teacher-24'
  AND school_id = 'zbt-primary';
