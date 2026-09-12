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
Его можно поставить из вкладки **«Обновление ПО»** прямо в интерфейсе —
ручная установка не обязательна (см. [ниже](#установка-бинарника-tg-ws-proxy-rs)).

## Установка

### OpenWrt 25.x (apk)

Скачайте свежий `.apk` со страницы [Releases](../../releases) и выполните:

```sh
apk add --allow-untrusted ./luci-app-tgws-rs_1.1.0_1_all.apk
```

Чтобы получить русскую локализацию, поставьте также подпакет `luci-i18n-tgws-rs-ru` (собирается вместе с основным .apk).

### OpenWrt 24.x и старше (opkg)

```sh
opkg install ./luci-app-tgws-rs_1.1.0-r1_all.ipk
opkg install ./luci-i18n-tgws-rs-ru_1.1.0-r1_all.ipk   # опционально
```

После установки в *LuCI → Services* появится пункт **TG WS Proxy**.
Сгенерируйте секрет (или импортируйте свой) во вкладке «Настройки» и включите службу.

## Установка бинарника tg-ws-proxy-rs

Пакет LuCI работает с бинарником `/usr/bin/tg-ws-proxy` и сам его не содержит.
Поставить бинарник можно двумя способами.

### Вариант 1 — через вкладку «Обновление ПО» (рекомендуется)

Вручную ничего качать не нужно:

1. Установите этот LuCI-пакет (см. выше) — бинарник при этом не нужен.
2. Откройте **LuCI → Services → TG WS Proxy → «Обновление ПО»**.
3. Нажмите **«Установить последнюю версию»**: интерфейс сам определит
   архитектуру роутера, скачает свежий релиз из
   [репозитория автора](https://github.com/valnesfjord/tg-ws-proxy-rs/releases)
   и положит бинарник в `/usr/bin/tg-ws-proxy`.

SSH для этого способа не требуется.

### Вариант 2 — вручную, по SSH

Подойдёт, если нужна конкретная версия или прямое скачивание с GitHub на
роутере работает плохо.

1. **Зайдите на роутер по SSH.** Как именно — зависит от настроек dropbear
   на роутере (`/etc/config/dropbear`, ключи `PasswordAuth` /
   `RootPasswordAuth`):

   - вход по **паролю** root:
     ```sh
     ssh root@192.168.1.1
     ```
   - вход по **SSH-ключу** (если ключ настроен; пароль root при этом может
     быть отключён):
     ```sh
     ssh -i ~/.ssh/id_rsa root@192.168.1.1
     ```

2. **Узнайте архитектуру роутера**:
   ```sh
   cat /etc/openwrt_release
   ```
   Нужна строка `DISTRIB_ARCH` — например `mipsel_24kc`, `aarch64_cortex-a53`
   или `x86_64`.

3. **Выберите версию у автора**:
   [страница релизов](https://github.com/valnesfjord/tg-ws-proxy-rs/releases).
   Архив называется `tg-ws-proxy-<triplet>.tar.gz`, где `<triplet>`
   соответствует вашей архитектуре: `mipsel` → `mipsel-unknown-linux-musl`,
   `aarch64` → `aarch64-unknown-linux-musl`,
   `x86_64` → `x86_64-unknown-linux-musl`,
   `armv7` → `armv7-unknown-linux-musleabihf`.

4. **Скачайте архив** (пример — релиз v2.3.3, архитектура mipsel):
   ```sh
   curl -LO https://github.com/valnesfjord/tg-ws-proxy-rs/releases/download/v2.3.3/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz
   ```

5. **Залейте на роутер, распакуйте и поставьте на место**:
   ```sh
   scp tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz root@192.168.1.1:/tmp/
   ssh root@192.168.1.1 'tar -xzf /tmp/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz -C /tmp && mv /tmp/tg-ws-proxy /usr/bin/tg-ws-proxy && chmod 755 /usr/bin/tg-ws-proxy'
   ```
   На Windows вместо `scp`/`ssh` можно использовать PuTTY: `pscp -scp`
   (загрузка файла) и `plink` (выполнение команды).

После этого бинарник лежит в `/usr/bin/tg-ws-proxy` — во вкладке «Статус»
появится номер версии, и службу можно запускать.

## Скриншоты

![Статус](screenshots/overview.webp)
![Настройки](screenshots/settings.webp)
![Обновление ПО](screenshots/update.webp)
![Логи](screenshots/logs.webp)

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
