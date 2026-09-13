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
manual installation is optional (see [Installation](#installation)).

## Installation

Install the LuCI package, then the proxy binary itself via the **"Software Update"** tab.

### 1. Install the web UI

Download fresh files from the [Releases page](../../releases).

**OpenWrt 25.x (apk):**

```sh
apk add --allow-untrusted ./luci-app-tgws-rs-1.1.2-r1.apk
apk add --allow-untrusted ./luci-i18n-tgws-rs-ru-0.apk   # Russian translation, optional
```

**OpenWrt 23.x / 24.x (ipk/opkg):**

```sh
opkg install ./luci-app-tgws-rs_1.1.2-r1_all.ipk
opkg install ./luci-i18n-tgws-rs-ru_0_all.ipk            # Russian translation, optional
```

Use the actual versions from the release in the commands.

After installation the **TG WS Proxy** entry appears under *LuCI → Services*.

### 2. Install the proxy binary

Open **LuCI → Services → TG WS Proxy → "Software Update"** and click **"Install the latest version"**. The UI detects the router architecture, downloads the matching release from the [author's repository](https://github.com/valnesfjord/tg-ws-proxy-rs/releases) and puts the binary into `/usr/bin/tg-ws-proxy`. SSH is not needed.

### 3. Enable the service

Generate a secret (or import your existing one) in the Settings tab and enable the service.

## Manual installation

Use this if you need a specific binary version or direct GitHub downloads from the router work poorly — install the binary manually, then the web UI.

### 1. Check the router architecture

```sh
cat /etc/openwrt_release
```

Look for the `DISTRIB_ARCH` line, e.g. `mipsel_24kc`, `aarch64_cortex-a53` or `x86_64`.

### 2. Download the binary for your architecture

Pick a version on the [author's releases page](https://github.com/valnesfjord/tg-ws-proxy-rs/releases). The archive is named `tg-ws-proxy-<triplet>.tar.gz`, where `<triplet>` matches your architecture:

| DISTRIB_ARCH | triplet in the archive name |
|---|---|
| `mipsel_24kc` | `mipsel-unknown-linux-musl` |
| `aarch64_cortex-a53` | `aarch64-unknown-linux-musl` |
| `x86_64` | `x86_64-unknown-linux-musl` |
| `armv7` | `armv7-unknown-linux-musleabihf` |

Example — release v2.3.3, mipsel architecture:

```sh
curl -LO https://github.com/valnesfjord/tg-ws-proxy-rs/releases/download/v2.3.3/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz
```

### 3. Upload to the router and extract

```sh
scp tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'tar -xzf /tmp/tg-ws-proxy-mipsel-unknown-linux-musl.tar.gz -C /tmp && mv /tmp/tg-ws-proxy /usr/bin/tg-ws-proxy && chmod 755 /usr/bin/tg-ws-proxy'
```

On Windows use PuTTY instead: `pscp -scp` (file upload) and `plink` (running commands).

### 4. Install the web UI

Install the LuCI package following the [Installation](#installation) section. If it is already installed — nothing else is needed: the Status tab will show the version, and you can start the service.

## How the watchdog works

Cloudflare domains for the proxy don't live forever: providers periodically
block them, and if the proxy relies on a single domain — the connection drops.
The watchdog handles this automatically:

- Every **check interval** (`watchdog_interval`, 60 minutes by default) it runs
  from cron and probes every Cloudflare domain in the list via
  `tg-ws-proxy --check`.
- **Healthy domains are saved** into `settings.cf_domain` (in "healthy first,
  fallback after" order, at most `watchdog_keep` entries) so the proxy
  load-balances across live domains.
- If the healthy set **changed or some domains started failing** — the watchdog
  restarts the service to restore connectivity.
- The **worker domain is probed separately**, and the "Use Cloudflare worker"
  flag is auto-toggled based on its availability (when "Watchdog manages
  worker" is enabled).
- If **all domains fail at once** — the config is left untouched (the last
  working set stays), so the proxy never ends up without any domain.

All of this is done by the `/usr/bin/tgws-watchdog` script; its activity is
written to a separate watchdog log (Logs tab), while the interval and limits
are configured in the Settings tab.

## Cloudflare Worker

A worker is a free piece of "edge code" on Cloudflare (URL of the form
`<name>.workers.dev`). It hides the WebSocket proxy behind Cloudflare's
infrastructure: no own domain needed, the router IP stays hidden, and blocks
of plain CDN domains by Telegram do not affect it.

### How to get it for free

1. Sign up at [Cloudflare](https://dash.cloudflare.com)
   (free plan = 100,000 requests per day, more than enough for a proxy).
2. In the dashboard: **Workers & Pages → Create → Create Worker → Deploy**.
3. Paste the worker code from the
   [tg-ws-proxy-rs](https://github.com/valnesfjord/tg-ws-proxy-rs) repository
   (the author ships a ready-made worker file) and save it.
4. Copy the `https://<name>.workers.dev` address and put it into the
   **"Cloudflare worker domain"** field in the Settings tab.

### Naming recommendation

The worker gets a public name `<whatever-you-picked>.workers.dev`, and it is
visible from the outside. To stay under the radar:

- **Avoid** words like `proxy`, `telegram`, `tunnel`, `vpn`, `ws` — such names
  are recognized instantly.
- Use a **neutral, everyday name**: `status`, `assets`, `cache`, `cdn-helper`,
  `geo-responder`, etc.
- Don't recreate the worker too often — frequent recreations look suspicious
  by themselves.

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

This web UI was written with **vibecoding** (AI-assisted iterative coding, validated on real hardware and OpenWrt 25.12.5).