# luci-app-tgws-rs

> **Русский:** [README на русском](README.md)

LuCI web interface for **[tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs)** — a Telegram WebSocket proxy written in Rust.

The UI lets you manage the proxy right from the router web panel: status, settings (including Cloudflare / worker mode), software updates straight from the GitHub releases, logs and an automatic Cloudflare-domain watchdog.

![Overview](screenshots/overview.webp)

## Features

- **Status tab** — service running state, current version, quick Start / Stop / Restart / auto-start toggle
- **Settings** — host, port, secret (auto-generated with QR + `tg://proxy` link), connection link, DC IP overrides, buffer/pool tuning
- **Cloudflare mode** — custom proxy domain, built-in domain list, worker domain with automatic health toggle, connection balancing
- **Software Update** — checks the upstream GitHub repository and installs new releases directly to the router (**Rust binary is fetched separately**, see below), with version rollback
- **Logs** — live service log with time stamping, verbosity switch, watchdog log
- **Watchdog** — probes Cloudflare domains via cron, keeps only healthy ones, auto-restarts the service on regressions
- **Russian translation** included

## Requirements

- OpenWrt **25.x** (apk) or **24.x / 23.x** (opkg) — LuCI web interface
- **[tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs)** binary installed at `/usr/bin/tg-ws-proxy`

The LuCI package **does not include** the proxy binary itself — it is arch-specific
(mipsel / aarch64 / x86_64 / …) and is delivered by the upstream project.
It can be installed from the **Software Update** tab right in the web UI —
manual installation is optional (see [below](#installing-the-tg-ws-proxy-rs-binary)).

## Installation

### OpenWrt 25.x (apk)

Download the latest `.apk` from the [Releases page](../../releases) and run:

```sh
apk add --allow-untrusted ./luci-app-tgws-rs_1.1.0_1_all.apk
```

To also get the Russian localization, install the matching `luci-i18n-tgws-rs-ru` package (built alongside the main .apk).

### OpenWrt 24.x and older (opkg)

```sh
opkg install ./luci-app-tgws-rs_1.1.0-r1_all.ipk
opkg install ./luci-i18n-tgws-rs-ru_1.1.0-r1_all.ipk   # optional
```

After installation the **TG WS Proxy** entry appears under *LuCI → Services*.
Generate a secret (or import your existing one) in the Settings tab and enable the service.

## Installing the tg-ws-proxy-rs binary

The LuCI package works with the `/usr/bin/tg-ws-proxy` binary and does not
ship it. There are two ways to install it.

### Option 1 — via the "Software Update" tab (recommended)

No manual downloading:

1. Install this LuCI package (see above) — the binary is not required for that.
2. Open **LuCI → Services → TG WS Proxy → "Software Update"** tab.
3. Click **"Install the latest version"**: the UI detects the router
   architecture, downloads the newest release from the
   [author's repository](https://github.com/valnesfjord/tg-ws-proxy-rs/releases)
   and puts the binary into `/usr/bin/tg-ws-proxy`.

No SSH needed for this option.

### Option 2 — manually over SSH

Use this if you need a specific version or direct GitHub downloads from the
router work poorly.

1. **Log in to the router over SSH.** Which method works depends on the
   router's dropbear settings (`/etc/config/dropbear`, `PasswordAuth` /
   `RootPasswordAuth` options):

   - with the root **password**:
     ```sh
     ssh root@192.168.1.1
     ```
   - with an **SSH key** (if you set a key up; the root password may then be
     disabled):
     ```sh
     ssh -i ~/.ssh/id_rsa root@192.168.1.1
     ```

2. **Check the router architecture**:
   ```sh
   cat /etc/openwrt_release
   ```
   Look for the `DISTRIB_ARCH` line, e.g. `mipsel_24kc`, `aarch64_cortex-a53`
   or `x86_64`.

3. **Pick a version from the author**:
   [releases page](https://github.com/valnesfjord/tg-ws-proxy-rs/releases).
   The archive is named `tg-ws-proxy-<triplet>.tar.gz`, where `<triplet>`
   matches your architecture: `mipsel` → `mipsel-unknown-linux-musl`,
   `aarch64` → `aarch64-unknown-linux-musl`,
   `x86_64` → `x86_64-unknown-linux-musl`,
   `armv7` → `armv7-unknown-linux-musleabihf`.

4. **Download the archive** (example: release v2.3.3, mipsel architecture):
   ```sh
   curl -LO https://github.com/valnesfjord/tg-ws-proxy-rs/releases/download/v2.3.3/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz
   ```

5. **Upload it to the router, extract and install**:
   ```sh
   scp tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz root@192.168.1.1:/tmp/
   ssh root@192.168.1.1 'tar -xzf /tmp/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz -C /tmp && mv /tmp/tg-ws-proxy /usr/bin/tg-ws-proxy && chmod 755 /usr/bin/tg-ws-proxy'
   ```
   On Windows you can use PuTTY instead: `pscp -scp` (file upload) and `plink`
   (running commands).

The binary is now at `/usr/bin/tg-ws-proxy` — the Status tab will show its
version, and you can start the service.

## Screenshots

![Overview](screenshots/overview.webp)
![Settings](screenshots/settings.webp)
![Software Update](screenshots/update.webp)
![Logs](screenshots/logs.webp)

## Building from source

The packages are built automatically by GitHub Actions ([`.github/workflows/build.yml`](.github/workflows/build.yml))
on every `v*` tag — both OpenWrt 25 `.apk` and 23/24 `.ipk` are published to the
[Releases page](../../releases).

To build manually with the OpenWrt SDK:

```sh
# 1. clone the luci feed, place this package under package/luci-app-tgws-rs
# 2. in the SDK / buildroot:
./scripts/feeds install luci-app-tgws-rs
echo "CONFIG_PACKAGE_luci-app-tgws-rs=y" > .config
make defconfig
make package/luci-app-tgws-rs/compile
```

The package is arch-independent (`PKGARCH:=all`) — one file works for every router architecture.

## License

Apache-2.0 — see [LICENSE](LICENSE).

## About

This web UI was written with **vibecoding** (AI-assisted iterative coding, validated on real hardware).