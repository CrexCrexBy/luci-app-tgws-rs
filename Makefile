# luci-app-tgws-rs
# LuCI web interface for tg-ws-proxy-rs (Telegram WebSocket proxy)
# See /LICENSE for more information.
# This is free software, licensed under the Apache License, Version 2.0.

include $(TOPDIR)/rules.mk

LUCI_TITLE:=TG WS Proxy (LuCI web interface for tg-ws-proxy-rs)
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all
LUCI_DESCRIPTION:=LuCI web interface for the tg-ws-proxy-rs Telegram WebSocket proxy: \
	status and controls, settings (including Cloudflare worker mode), \
	software update from GitHub releases, logs and an auto domain watchdog.

PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=CrexCrexBy <11130582+CrexCrexBy@users.noreply.github.com>
PKG_VERSION:=1.1.2
PKG_RELEASE:=1

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature