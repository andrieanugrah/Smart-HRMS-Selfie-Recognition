-- Helper untuk menghapus data biometrik (selfies) dan attendance lama.
-- Jalankan di Supabase SQL Editor.

-- 1. Fungsi Cleanup untuk tabel 'attendance' dan storage 'selfies'
CREATE OR REPLACE FUNCTION cleanup_old_data(days_threshold INT DEFAULT 90)
RETURNS void AS $$
DECLARE
    row RECORD;
BEGIN
    -- Ambil URL selfie yang sudah melewati batas waktu
    FOR row IN
        SELECT selfie_url
        FROM attendance
        WHERE created_at < NOW() - (days_threshold || ' days')::INTERVAL
        AND selfie_url IS NOT NULL
    LOOP
        -- Contoh cara menghapus dari storage (opsional: jika tidak perlu diaudit)
        -- DELETE FROM storage.objects WHERE name = (SPLIT_PART(row.selfie_url, '/', -1));
        NULL; -- Placeholder
    END LOOP;

    -- Hapus record attendance lama
    DELETE FROM attendance
    WHERE created_at < NOW() - (days_threshold || ' days')::INTERVAL;
    
    RAISE NOTICE 'Cleanup completed.';
END;
$$ LANGUAGE plpgsql;

-- 2. Untuk otomasi, gunakan pg_cron jika tersedia:
-- SELECT cron.schedule('cleanup-job', '0 0 * * *', 'SELECT cleanup_old_data(90)');
