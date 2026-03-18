# Swupper

Kaydir, boya, cozmece. Izgara uzerinde topu kaydirarak tum bos hucreleri boyadiginiz bir puzzle oyunu.

## Nasil Oynanir

- Topa bir yon verin (kaydirma, ok tuslari veya dokunmatik). Top duvara veya sinira carpayana kadar kayar.
- Gectigi tum bos hucreler turuncuya boyanir.
- Amac: Haritadaki tum bos hucreleri boyamak. Hamle sayisini dusurmeye calisin.

## Ozellikler

- **Seviyeler**: Zorluk artan levellar; her 10 levelda labirent buyur ve kurallar degisir.
- **Gunluk bulmaca**: Her gun ayni harita, tarih bazli seed.
- **Istatistikler**: Tamamlanan level sayisi, toplam hamle, en iyi seri.
- **Otomatik coz**: Cozulebilir haritalar uretilir; otomatik coz butonu cozum varsa calisir.
- **Ses**: Kayma, carpma, boyama ve kazanma sesleri (ayarlardan kapatilabilir).

## Calistirma

```bash
npm install
npm start
```

Tarayicida `http://localhost:3000` adresini acin. Sadece statik dosyalar kullanildigi icin herhangi bir statik sunucu (ornegin `npx serve .`) da kullanilabilir.

## Teknolojiler

- Vanilla JavaScript (ES moduller)
- Canvas 2D cizim
- localStorage (ilerleme, ayarlar, level seed’leri)
- Responsive layout

## Proje Yapisi

- `index.html` – Tek sayfa, ekranlar (ana sayfa, oyun, modallar)
- `js/game.js` – Ana giris noktasi, ekranlar, oyun dongusu, ses
- `js/state.js` – Oyun state (grid, top, hamle, animasyonlar)
- `js/renderer.js` – Canvas cizimi (kareler, top, partikuller, squash animasyonu)
- `js/movement.js` – Kayma yolu hesabi, hucre boyama
- `js/generator.js` – Labirent uretimi, cozulebilirlik kontrolu, seed denemesi
- `js/solver.js` – DFS ile cozum bulma (ipucu ve otomatik coz icin)
- `js/hints.js` – Ipucu ve otomatik coz kuyrugu
- `js/levels.js` – Level config, ilerleme, gunluk, seed saklama
- `js/input.js` – Swipe ve klavye girisleri
- `js/audio.js` – Web Audio sesleri
- `js/particles.js` – Carpisma partikulleri
- `js/constants.js` – Hucre tipleri, yonler
- `js/utils.js` – Easing (easeOutBack)
- `css/style.css` – Stiller

## Gizli Dev Menu

Ana sayfada logoya (SWUPPER) uc kez tiklayin. Seed, zorluk, levele atlama, ipucu ve otomatik coz testi icin panel acilir.

