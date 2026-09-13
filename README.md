# luci-app-tgws-rs

> **English:** [ReadMe in English](README.en.md)

LuCI-интерфейс для **[tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs)** — Telegram WebSocket-прокси, написанного на Rust.

Веб-морда позволяет управлять прокси прямо из панели роутера: статус, настройки (включая режимы Cloudflare / worker), обновление прямо из GitHub-релизов, логи и автономный ватчдог за Cloudflare-доменами.

![Обзор](screenshots/overview.webp?v=1.1.2)

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
Его можно поставить из вкладки **«Обновление ПО»** прямо в интерфейсе —
ручная установка не обязательна (см. [Установка](#установка)).

## Установка

Поставьте LuCI-пакет, затем через вкладку **«Обновление ПО»** — сам бинарник прокси.

### 1. Установите вэбморду

Скачайте свежие файлы со страницы [Releases](../../releases).

**OpenWrt 25.x (apk):**

```sh
apk add --allow-untrusted ./luci-app-tgws-rs-1.1.2-r1.apk
apk add --allow-untrusted ./luci-i18n-tgws-rs-ru-0.apk   # русский перевод, опционально
```

**OpenWrt 24.x / 23.x (ipk/opkg):**

```sh
opkg install ./luci-app-tgws-rs_1.1.2-r1_all.ipk
opkg install ./luci-i18n-tgws-rs-ru_0_all.ipk    # русский перевод, опционально
```

Подставьте в командах актуальные версии из релиза.

После установки в *LuCI → Services* появится пункт **TG WS Proxy**.

### 2. Поставьте бинарник прокси

Откройте **LuCI → Services → TG WS Proxy → «Обновление ПО»** и нажмите **«Установить последнюю версию»**. Интерфейс сам определит архитектуру роутера, скачает нужный релиз из [репозитория автора](https://github.com/valnesfjord/tg-ws-proxy-rs/releases) и положит бинарник в `/usr/bin/tg-ws-proxy`. SSH не нужен.

### 3. Включите службу

Сгенерируйте секрет (или импортируйте свой) во вкладке «Настройки» и включите службу.

## Ручная установка

Если нужна конкретная версия бинарника или скачивание с GitHub на роутере плохо работает — поставьте бинарник вручную, а затем вэбморду.

### 1. Узнайте архитектуру роутера

```sh
cat /etc/openwrt_release
```

Нужна строка `DISTRIB_ARCH` — например `mipsel_24kc`, `aarch64_cortex-a53` или `x86_64`.

### 2. Скачайте бинарник под вашу архитектуру

На странице [релизов автора](https://github.com/valnesfjord/tg-ws-proxy-rs/releases) выберите версию. Архив называется `tg-ws-proxy-<triplet>.tar.gz`, где `<triplet>` соответствует вашей архитектуре:

| DISTRIB_ARCH | triplet в имени архива |
|---|---|
| `mipsel_24kc` | `mipsel-unknown-linux-musl` |
| `aarch64_cortex-a53` | `aarch64-unknown-linux-musl` |
| `x86_64` | `x86_64-unknown-linux-musl` |
| `armv7` | `armv7-unknown-linux-musleabihf` |

Пример — релиз v2.3.3, архитектура mipsel:

```sh
curl -LO https://github.com/valnesfjord/tg-ws-proxy-rs/releases/download/v2.3.3/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz
```

### 3. Залейте на роутер и распакуйте

```sh
scp tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'tar -xzf /tmp/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz -C /tmp && mv /tmp/tg-ws-proxy /usr/bin/tg-ws-proxy && chmod 755 /usr/bin/tg-ws-proxy'
```

На Windows вместо `scp`/`ssh` — PuTTY: `pscp -scp` (загрузка) и `plink` (команда).

### 4. Установите вэбморду

Поставьте LuCI-пакет по инструкции из раздела [Установка](#установка). Если он уже стоит — больше ничего делать не нужно: во вкладке «Статус» появится номер версии, и службу можно запускать.

## Скриншоты

![Статус](screenshots/overview.webp?v=1.1.2)
![Настройки](screenshots/settings.webp?v=1.1.2)
![Обновление ПО](screenshots/update.webp?v=1.1.2)
![Логи](screenshots/logs.webp?v=1.1.2)

## Сборка из исходников

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

Apache-2.0 — см. [LICENSE](LICENSE).

## О проекте

Веб-морда написана с помощью **vibecoding** (внеурочный ИИ-кодинг, итеративно, с проверкой на реальном железе).
