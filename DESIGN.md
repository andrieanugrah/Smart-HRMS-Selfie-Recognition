# Design Direction — Smart HRMS

## Identity

HRMS Indonesia dengan verifikasi wajah on-device. Karakter: presisi, teknis, tenang. Bukan "startup hype", bukan "enterprise kaku".

## Palette

- **Primary**: charcoal (`oklch(0.52 0.01 260)`) — alat kerja, bukan dekorasi.
- **Accent**: biometric cyan (`oklch(0.68 0.13 195)`) — satu titik fokus untuk data, status, dan CTA utama.
- **Surface**: canvas → background → card → elevated, 4 tingkat depth.
- **Semantic**: success/warning/danger/info, dipakai hanya untuk status nyata.

## Typography

- **Sans**: Geist Sans — bersih, modern, readable di UI padat.
- **Mono**: Geist Mono — dipakai untuk data, angka, spec, dan label teknis. Tidak untuk heading atau body.

## Dials

- **ENERGY 1** (Calm): tidak ada hero besar, tidak ada splash. Informasi dulu, dekorasi tidak pernah mengalahkan fungsi.
- **RHYTHM 2** (Balanced): section bervariasi — hero split, feature bento, alur list, portal cards, CTA center. Tidak monoton, tidak kacau.
- **MOTION 1** (Hover only): tidak ada scroll animation, tidak ada reveal. Hover state pada card dan button cukup.

## Motif

- **Precision radius**: `radius-lg` (0.625rem) default. Pill hanya untuk badge status.
- **Directional shadow**: shadow ke bawah-kanan, tidak ada glow kecuali pada CTA gradient (satu accent).
- **Data-forward**: angka dan spec selalu mono + tabular-nums. Label section selalu sans.
