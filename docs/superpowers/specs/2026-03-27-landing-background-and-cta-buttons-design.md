## Landing: Arka Plan Deseni + CTA Buton Arkaplanı

### Amaç
- **Göz yoran nokta desenini** daha yumuşak (daha düşük kontrast / daha seyrek) hale getirmek.
- Hero bölümündeki CTA butonlarda (özellikle `outline`) **arkaplanın hover beklemeden sürekli görünür** olmasını sağlamak.

### Kapsam
- **Sayfa**: `src/app/page.tsx` (landing)
- **Global stiller**: `src/app/globals.css` (`.bg-dots`)
- **UI primitive**: `src/components/ui/button.tsx` (`variant="outline"`)

### Tasarım Kararları
#### 1) Nokta deseni (arka plan)
- `.bg-dots` içindeki nokta rengi `var(--border)` yerine **daha düşük kontrastlı** bir tona çekilecek:
  - `color-mix(in oklab, var(--muted-foreground) 35%, transparent)` gibi.
- Desen yoğunluğu azaltılacak:
  - `background-size: 20px 20px` → **28px 28px**.
- Landing’deki overlay opaklığı düşürülecek:
  - `opacity-50` → **opacity-20** (yaklaşık).

#### 2) CTA buton arkaplanı (outline)
- `outline` varyantı `bg-transparent` yerine **varsayılan bir yüzey rengi** ile başlayacak:
  - `bg-[var(--card)]`
- Hover hâli mevcut hissi koruyacak:
  - `hover:bg-[var(--muted)]` devam eder.

### Başarı Kriterleri
- Landing’de arka plan deseni “parazitli” görünmez; metin/komponentlerle rekabet etmez.
- `View Demo` gibi `outline` butonlar **her zaman dolu bir yüzeye** sahiptir; hover sadece “lift/kontrast” etkisi verir.

