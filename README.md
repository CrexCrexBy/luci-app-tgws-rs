# luci-app-tgws-rs

> **English:** [ReadMe in English](README.en.md)

LuCI-интерфейс для **[tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs)** — Telegram WebSocket-прокси, написанного на Rust.

Веб-морда позволяет управлять прокси прямо из панели роутера: статус, настройки (включая режимы Cloudflare / worker), обновление прямо из GitHub-релизов, логи и автономный ватчдог за Cloudflare-доменами.

![Обзор](screenshots/overview.webp)

## Возможности

- **Вкладка «Статус»** — состояние службы, текущая версия, кнопки Запуск / Остановка / Перезапуск / автозапуск
- **Настройки** — хост, порт, секрет (автогенерация с QR и ссылкой `tg://proxy`), ссылка подключения, переопределение DC-IP, тюнинг буфера/пула
- **Режим Cloudflare** — свой домен-прокси, встроенный список доменов, worker-домен с автоматическим переключением по здоровью, балансировка соединений
- **Обновление ПО** — проверяет upstream-репозиторий на GitHub и ставит новые релизы прямо на роутер (**Rust-бинарник подтягивается отдельно**, см. ниже), с откатом версии
- **Логи** — живой лог службы со временными метками, переключатель детализации, лог ватчдога
- **Ватчдог** — через cron прозванивает Cloudflare-домены, оставляет только здоровые, автоматически перезапускает службу при деградации
- **Есть русский перевод**

## Требования

- OpenWrt **25.x** (apk) или **24.x / 23.x** (opkg) — веб-интерфейс LuCI
- Бинарник **[tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs)** в `/usr/bin/tg-ws-proxy`

Пакет LuCI **не включает** сам бинарник прокси — он архи-специфичен
(mipsel / aarch64 / x86_64 / …) и поставляется upstream-проектом.
Ставьте его отдельно — из готового релиза или собранного из исходников.

## Установка

### OpenWrt 25.x (apk)

Скачайте свежий `.apk` со страницы [Releases](../../releases) и выполните:

```sh
apk add --allow-untrusted ./luci-app-tgws-rs_1.0.0_1_all.apk
```

Чтобы получить русскую локализацию, поставьте также подпакет `luci-i18n-tgws-rs-ru` (собирается вместе с основным .apk).

### OpenWrt 24.x и старше (opkg)

```sh
opkg install ./luci-app-tgws-rs_1.0.0-r1_all.ipk
opkg install ./luci-i18n-tgws-rs-ru_1.0.0-r1_all.ipk   # опционально
```

После установки в *LuCI → Services* появится пункт **TG WS Proxy**.
Сгенерируйте секрет (или импортируйте свой) во вкладке «Настройки» и включите службу.

## Скриншоты

![Статус](screenshots/overview.webp)
![Настройки](screenshots/settings.webp)
![Обновление ПО](screenshots/update.webp)
![Логи](screenshots/logs.webp)

<<<<<<< HEAD
![Status page](screenshots/overview.webp)
![Settings](screenshots/settings.webp)
![Software Update](screenshots/update.webp)
![Logs](screenshots/logs.webp)
=======
## Сборка из исходников
>>>>>>> 84c4b8e (README: RU main + EN separate with cross-links, webp screenshots)

Пакеты собираются автоматически в GitHub Actions ([`.github/workflows/build.yml`](.github/workflows/build.yml))
по каждому тегу `v*` — оба формата (OpenWrt 25 `.apk` и 23/24 `.ipk`) публикуются на
странице [Releases](../../releases).

Ручная сборка через OpenWrt SDK:

```sh
# 1. склонируйте feed luci, положите пакет в package/luci-app-tgws-rs
# 2. в SDK / buildroot:
./scripts/feeds install luci-app-tgws-rs
echo "CONFIG_PACKAGE_luci-app-tgws-rs=y" > .config
make defconfig
make package/luci-app-tgws-rs/compile
```

Пакет не зависит от архитектуры (`PKGARCH:=all`) — один файл подходит для любого роутера.

## Лицензия

<<<<<<< HEAD
Apache-2.0 — see [LICENSE](LICENSE).
=======
Apache-2.0 — см. [LICENSE](LICENSE).
>>>>>>> 84c4b8e (README: RU main + EN separate with cross-links, webp screenshots)
