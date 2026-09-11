'use strict';
'require view';
'require form';
'require rpc';
'require ui';
'require uci';
'require dom';
'require uqr';

var callGetStatus  = rpc.declare({ object: 'luci.tgws', method: 'getStatus', expect: {} });
var callSetAction  = rpc.declare({ object: 'luci.tgws', method: 'setAction', params: ['action'], expect: {} });
var callGetLink    = rpc.declare({ object: 'luci.tgws', method: 'getLink', expect: {} });
var callGetReleases= rpc.declare({ object: 'luci.tgws', method: 'getReleases', expect: {} });
var callInstall    = rpc.declare({ object: 'luci.tgws', method: 'installVersion', params: ['version'], expect: {} });
var callGetLogs    = rpc.declare({ object: 'luci.tgws', method: 'getLogs', params: ['lines'], expect: {} });
var callGetWatchdogLogs = rpc.declare({ object: 'luci.tgws', method: 'getWatchdogLogs', params: ['lines'], expect: {} });
var callSetWatchdogAction = rpc.declare({ object: 'luci.tgws', method: 'setWatchdogAction', params: ['action'], expect: {} });
var callGenerateSecret = rpc.declare({ object: 'luci.tgws', method: 'generateSecret', expect: {} });

function mkBtn(text, action, cls, disabled) {
	var attrs = { 'class': 'btn cbi-button ' + (cls || 'cbi-button-action') };
	if (disabled)
		attrs.disabled = true;
	if (action)
		attrs.click = action;
	return E('button', attrs, text);
}

function notice(msg, cls) {
	cls = cls || 'success';
	ui.addNotification(null, E('p', msg), cls);
	var mc = document.getElementById('maincontent');
	if (mc && mc.scrollIntoView)
		mc.scrollIntoView({ behavior: 'smooth' });
}

function err(e) {
	notice(_('Error: %s').format(e && e.message ? e.message : String(e)), 'error');
}

function parseReleases(rd) {
	if (!rd.releases)
		return null;
	try {
		return JSON.parse(rd.releases);
	}
	catch (e) {
		return null;
	}
}

function statusBadge(label, active) {
	var running = typeof active === 'boolean' ? active : true;
	return E('span', {
		'class': 'ifacebadge' + (running ? ' ifacebadge-active' : ''),
		'style': 'font-size:12px; font-weight:700;'
	}, label);
}

function tgwsBadge(running) {
	return statusBadge(running ? _('TGWS Running') : _('TGWS Stopped'), running);
}

function tgwsAutostartBadge(enabled) {
	return statusBadge(enabled ? _('TGWS Auto-start enabled') : _('TGWS Auto-start disabled'), enabled);
}

function watchdogBadge(running) {
	return statusBadge(running ? _('Watchdog Running') : _('Watchdog Stopped'), running);
}

function watchdogAutostartBadge(enabled) {
	return statusBadge(enabled ? _('Watchdog Auto-start enabled') : _('Watchdog Auto-start disabled'), enabled);
}

var secretField = form.Value.extend({
	renderWidget: function(section_id, option_index, cfgvalue) {
		var value = (cfgvalue != null) ? cfgvalue : this.default;
		var widget = new ui.Textfield(value, {
			'id': this.cbid(section_id),
			'optional': this.optional || this.rmempty,
			'datatype': this.datatype,
			'placeholder': this.placeholder,
			'disabled': (this.readonly != null) ? this.readonly : this.map.readonly
		});
		var frame = widget.render();
		var input = frame.querySelector('input');
		var btn = E('button', {
			'class': 'btn cbi-button cbi-button-action',
			'click': L.bind(function(ev) {
				callGenerateSecret().then(function(res) {
					if (res.error) {
						err(res);
						return;
					}
					widget.setValue(res.secret);
				}).catch(err);
			}, this)
		}, _('Generate'));
		dom.append(frame, btn);
		return frame;
	}
});

return view.extend({
	load: function() {
		return Promise.all([
			callGetStatus(),
			callGetReleases()
		]);
	},

	render: function(data) {
		var st = data[0];
		var h2badges = null;
		var updateVersion = null;

		var paintBadges = function(s) {
			if (!h2badges)
				return;
			dom.content(h2badges, [
				tgwsBadge(s.running),
				tgwsAutostartBadge(s.enabled),
				watchdogBadge(s.watchdog_enabled),
				watchdogAutostartBadge(s.watchdog_autostart)
			]);
		};

		var statusPanel = form.DummyValue.extend({
			renderWidget: function(section_id, option_id, cfgvalue) {
				var box = E('div', { 'id': 'tgws-status' });
				var paint = function(s) {
					paintBadges(s);
					var run = function() {
						callGetStatus().then(paint).catch(err);
					};
					var act = function(action) {
						return function() {
							callSetAction(action).then(run).catch(err);
						};
					};
					var wdAct = function(action) {
						return function() {
							callSetWatchdogAction(action).then(run).catch(err);
						};
					};
					var btns = [
						mkBtn(_('Start'), act('start'), 'cbi-button-positive important', s.running),
						' ',
						mkBtn(_('Stop'), act('stop'), 'cbi-button-negative important', !s.running),
						' ',
						mkBtn(_('Restart'), act('restart'), 'cbi-button-action important', !s.running),
						' ',
						mkBtn(s.enabled ? _('Disable auto-start') : _('Enable auto-start'), function() {
							callSetAction(s.enabled ? 'disable' : 'enable').then(run).catch(err);
						}, s.enabled ? 'cbi-button-negative' : 'cbi-button-positive')
					];
					var wdbtns = [
						mkBtn(_('Watchdog start'), wdAct('start'), 'cbi-button-positive important', s.watchdog_enabled),
						' ',
						mkBtn(_('Watchdog stop'), wdAct('stop'), 'cbi-button-negative important', !s.watchdog_enabled),
						' ',
						mkBtn(s.watchdog_autostart ? _('Watchdog stop autostart') : _('Watchdog enable autostart'), function() {
							callSetWatchdogAction(s.watchdog_autostart ? 'disable' : 'enable').then(run).catch(err);
						}, s.watchdog_autostart ? 'cbi-button-negative' : 'cbi-button-positive')
					];
					btns.push(' ', mkBtn(_('Show link & QR-code...'), function() {
						callGetLink().then(function(l) {
							var node = E('div');
							node.innerHTML = uqr.renderSVG(l.link, { pixelSize: 5, ecc: 'M' });
							var btn = E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Close'));
							ui.showModal(_('Proxy link'), [
								E('p', {}, E('code', l.link)),
								node,
								E('div', { 'class': 'button-row' }, btn)
							], 'cbi-modal');
						}).catch(err);
					}, 'cbi-button-action'));
					dom.content(box, [
						E('p', {}, btns),
						E('p', { 'style': 'margin-top:6px;' }, wdbtns)
					]);
				};
				paint(st);
				return box;
			}
		});

		var updatePanel = form.DummyValue.extend({
			renderWidget: function(section_id, option_id, cfgvalue) {
				var box = E('div', { 'id': 'tgws-update' });
				var PER_PAGE = 10;

				var STAGE_LABELS = {
					'download': _('Downloading %s'),
					'stop': _('Stopping current service'),
					'extract': _('Extracting archive'),
					'replace': _('Replacing binary with %s'),
					'restore': _('Restoring service state')
				};

				var renderSteps = function(res) {
					var list = res.steps || [];
					var items = list.map(function(st) {
						var mark = st.ok
							? E('span', { 'class': 'cbi-button-positive', 'style': 'margin-right:6px;' }, '✓')
							: E('span', { 'class': 'cbi-button-negative', 'style': 'margin-right:6px;' }, '✕');
					var label = (STAGE_LABELS[st.stage] || st.stage);
					if (st.stage === 'download' || st.stage === 'replace')
						label = label.format(st.detail || '');
					else if (st.stage === 'restore' && st.detail)
						label = label + ' — ' + st.detail;
					return E('p', { 'style': 'margin:.25em 0;' }, [ mark, label ]);
					});
					return items;
				};

				var paint = function(rd) {
					if (rd.error) {
						dom.content(box, [ E('p', E('span', { 'class': 'cbi-button-negative' }, _('Error')), ' ' + rd.error) ]);
						return;
					}
					var list = parseReleases(rd);
					if (!list) {
						dom.content(box, [ E('p', {}, _('Invalid release data')) ]);
						return;
					}
					var currentVer = (st.binary_version || st.version || '').replace(/^tg-ws-proxy\s*/, '').replace(/^v/, '').trim();

					var page = 0;
					var totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));

					var draw = function() {
						var start = page * PER_PAGE;
						var slice = list.slice(start, start + PER_PAGE);
						var rows = slice.map(function(rel) {
							var relVer = (rel.tag_name || '').replace(/^v/, '').trim();
							var notes = (rel.body || '').split('\n').slice(0, 10).join('\n');
							var installed = (relVer === currentVer);
							var btn = installed
								? mkBtn(_('Installed'), null, 'cbi-button-action', true)
								: mkBtn(_('Install'), function() {
									var dlg = ui.showModal(_('Software Update'), [
										E('p', { 'class': 'spinning' }, _('Installing %s...').format(rel.tag_name)),
										E('div', { 'id': 'tgws-update-progress' }),
										E('div', { 'class': 'right' }, E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Close')))
									], 'cbi-modal');
									callInstall(rel.tag_name).then(function(res) {
										var progress = document.getElementById('tgws-update-progress');
										if (progress)
											dom.content(progress, renderSteps(res));
										if (res.error) {
											setTimeout(function() { ui.hideModal(); notice(res.error, 'error'); }, 1200);
											return;
										}
										setTimeout(function() {
											ui.hideModal();
											notice(res.message || _('Update installed'), 'success');
											st.binary_version = '';
											st.version = rel.tag_name;
											callGetReleases().then(paint).catch(err);
											if (updateVersion)
												updateVersion();
										}, 1200);
									}).catch(function(e) {
										ui.hideModal();
										err(e);
									});
								}, 'cbi-button-positive');
							return E('tr', {
								'class': 'tr',
								'style': installed ? 'background: var(--background-color-medium);' : null
							}, [
								E('td', { 'class': 'td' }, E('strong', rel.tag_name)),
								E('td', { 'class': 'td' }, (rel.published_at || '').replace('T', ' ').replace('Z', '').replace(/\.\d+/, '')),
								E('td', { 'class': 'td' }, E('pre', { 'style': 'white-space:pre-wrap; font-family:monospace; margin:0;' }, notes)),
								E('td', { 'class': 'td cbi-section-actions' }, btn)
							]);
						});

						var table = E('table', { 'class': 'table cbi-section-table' }, [
							E('thead', { 'class': 'thead cbi-section-thead' }, E('tr', { 'class': 'tr cbi-section-table-titles anonymous' }, [
								E('th', { 'class': 'th' }, _('Version')),
								E('th', { 'class': 'th' }, _('Published')),
								E('th', { 'class': 'th' }, _('Release notes')),
								E('th', { 'class': 'th cbi-section-actions' }, '')
							])),
							E('tbody', { 'class': 'tbody cbi-section-tbody' }, rows)
						]);

						var prevBtn = mkBtn(_('Previous'), function() { if (page > 0) { page--; draw(); } }, 'cbi-button-action', page <= 0);
						var nextBtn = mkBtn(_('Next'), function() { if (page < totalPages - 1) { page++; draw(); } }, 'cbi-button-action', page >= totalPages - 1);
						var counter = E('span', { 'style': 'margin:0 10px; vertical-align:middle;' },
							_('Page %d of %d').format(page + 1, totalPages));

						dom.content(box, [
							E('div', { 'class': 'cbi-map-descr' }, rd.from_cache
								? _('Showing cached release list (no internet connection at last check).')
								: _('Latest releases from GitHub.')),
							table,
							E('div', { 'style': 'text-align:center; margin-top:6px;' }, [ prevBtn, counter, nextBtn ])
						]);
					};

					/* jump to the page containing the installed version */
					if (currentVer) {
						for (var i = 0; i < list.length; i++) {
							if ((list[i].tag_name || '').replace(/^v/, '').trim() === currentVer) {
								page = Math.floor(i / PER_PAGE);
								break;
							}
						}
					}
					draw();
				};
				callGetReleases().then(paint).catch(err);
				return box;
			}
		});

		var logSizeField = form.Value.extend({
			renderWidget: function(section_id, option_id, cfgvalue) {
				var value = (cfgvalue != null) ? String(cfgvalue) : '1048576';
				var choices = this.transformChoices() || {};
				var widget = new ui.Dropdown(value, choices, {
					id: this.cbid(section_id),
					sort: false,
					optional: false,
					create: true,
					custom_placeholder: this.placeholder || _('-- custom --'),
					disabled: (this.readonly != null) ? this.readonly : this.map.readonly
				});
				return widget.render();
			}
		});

		var watchdogLogPanel = form.DummyValue.extend({
			renderWidget: function(section_id, option_id, cfgvalue) {
				var box = E('div', { 'id': 'tgws-wdlog', 'style': 'width:100%' });
				var pre = E('pre', { 'style': 'white-space:pre-wrap; font-family:monospace; margin:0;' }, '');
				var load = function() {
					callGetWatchdogLogs(50).then(function(res) {
						dom.content(pre, res.logs || '');
					}).catch(err);
				};
				dom.content(box, [
					E('p', {}, mkBtn(_('Refresh watchdog log'), load, 'cbi-button-action')),
					pre
				]);
				load();
				return box;
			}
		});

		var logPanel = form.DummyValue.extend({
			renderWidget: function(section_id, option_id, cfgvalue) {
				var box = E('div', { 'id': 'tgws-log', 'style': 'width:100%' });
				var pre = E('pre', { 'style': 'white-space:pre-wrap; font-family:monospace; margin:0;' }, '');
				var load = function() {
					callGetLogs(50).then(function(res) {
						dom.content(pre, res.logs || '');
					}).catch(err);
				};
				dom.content(box, [
					E('p', {}, mkBtn(_('Refresh log'), load, 'cbi-button-action')),
					pre
				]);
				load();
				return box;
			}
		});

		var m = new form.Map('tgws', _('Telegram WebSocket Proxy'));
		var s = m.section(form.NamedSection, 'settings', _('Proxy'));

		s.tab('status', _('Status'));
		s.tab('settings', _('Settings'));
		s.tab('update', _('Software Update'));
		s.tab('logs', _('Logs'));

		var o;

		s.taboption('status', statusPanel, '__status__');

		o = s.taboption('settings', form.Value, 'host', _('Listen host'), _('Hostname or IP address to bind to.'));
		o.placeholder = '0.0.0.0';
		o = s.taboption('settings', form.Value, 'port', _('Listen port'), _('TCP port for incoming connections.'));
		o.placeholder = '1443';
		o.datatype = 'port';
		o = s.taboption('settings', secretField, 'secret', _('Secret'), _('Shared secret for proxy authentication.'));
		o.placeholder = 'your-secret-token';
		o = s.taboption('settings', form.TextValue, 'dc_ip', _('Datacenter IPs'), _('List of Telegram datacenter IPs, one per line.'));
		o.placeholder = '149.154.167.220\n149.154.167.221\n149.154.175.50';
		o = s.taboption('settings', form.Flag, 'hostname_link', _('Use router hostname in links'), _('Generate proxy links/QR with the router hostname instead of the LAN IP.'));
		o = s.taboption('settings', form.Value, 'link_host', _('Custom link host'), _('Override the hostname used in the proxy link.'));
		o.placeholder = 'openwrt.lan';
		o.depends('hostname_link', '1');
		o = s.taboption('settings', form.Flag, 'cf_enabled', _('Enable Cloudflare-proxied connection'), _('Route connections through Cloudflare.'));
		o = s.taboption('settings', form.Flag, 'cf_priority', _('Prefer Cloudflare connection'), _('Use the Cloudflare route as the primary one.'));
		o.depends('cf_enabled', '1');
		o = s.taboption('settings', form.Flag, 'default_domains', _('Use built-in Cloudflare domains'), _('Fetch and use the Cloudflare proxy domain list from GitHub (no domain setup needed).'));
		o.depends('cf_enabled', '1');
		o = s.taboption('settings', form.Flag, 'cf_balance', _('Balance connections across Cloudflare domains'), _('Round-robin across multiple Cloudflare proxy domains instead of always trying the same one first.'));
		o.depends('cf_enabled', '1');
		o = s.taboption('settings', form.Value, 'cf_domain', _('Cloudflare proxy domains (auto)'), _('Automatically filled by the watchdog from its health checks (healthy-then-fallback order). Read-only — to manage manually, stop the watchdog first.'));
		o.placeholder = 'yourdomain.com';
		o.readonly = true;
		o.depends('cf_enabled', '1');
		o = s.taboption('settings', form.Value, 'cf_worker_domain', _('Cloudflare worker domain'), _('The worker domain used for the Cloudflare route.'));
		o.depends('cf_enabled', '1');
		o.placeholder = 'tg-ws-proxy.example.workers.dev';
		o = s.taboption('settings', form.Value, 'buf_kb', _('Buffer size (KB)'), _('Socket buffer size in kilobytes.'));
		o.placeholder = '256';
		o.datatype = 'uinteger';
		o = s.taboption('settings', form.Value, 'pool_size', _('Connection pool size'), _('Number of simultaneous upstream connections.'));
		o.placeholder = '4';
		o.datatype = 'range(1,32)';

		s.taboption('update', updatePanel, '__update__');

		o = s.taboption('logs', form.Flag, 'verbose', _('Verbose logging'), _('Write detailed log output to the log file.'));
		o = s.taboption('logs', form.Value, 'log_file', _('Main log file'), _('Path to the log file used by the proxy.'));
		o.placeholder = '/var/log/tg-ws-proxy.log';
		o.depends('verbose', '1');
		o = s.taboption('logs', logPanel, '__logs__');
		o.depends('verbose', '1');
		o = s.taboption('logs', form.Flag, 'watchdog_log', _('Watchdog logging'), _('Keep a separate log file for the domain watchdog.'));
		o = s.taboption('logs', form.Value, 'watchdog_log_file', _('Watchdog log file'), _('Path to the watchdog log file. The file is created automatically on the first watchdog run.'));
		o.placeholder = '/var/log/tgws-watchdog.log';
		o.depends('watchdog_log', '1');
		o = s.taboption('logs', watchdogLogPanel, '__wdlog__');
		o.depends('watchdog_log', '1');
		o = s.taboption('logs', logSizeField, 'log_max_size', _('Max log file size'), _('Roughly how large a log file may grow before old lines are trimmed. You can type a custom byte value.'));
		o.value('262144', '256 KB');
		o.value('524288', '512 KB');
		o.value('1048576', '1 MB');
		o.value('2097152', '2 MB');
		o.value('5242880', '5 MB');
		o.value('10485760', '10 MB');
		o.default = '1048576';
		o.datatype = 'uinteger';

		return m.render().then(function(mapEl) {
			var h2 = mapEl.querySelector('h2[name="content"]');
			if (h2) {
				var verEl = E('span', { 'id': 'tgws-version', 'class': 'ifacebadge', 'style': 'font-size:12px; margin-left:6px;' });
				updateVersion = function() {
					var v = (st.binary_version || st.version || '').replace(/^tg-ws-proxy\s*/, '').trim();
					if (!v) { dom.content(verEl, ''); return; }
					if (!/^v/i.test(v))
						v = 'v' + v;
					dom.content(verEl, v);
				};
				dom.append(h2, verEl);
				h2badges = E('span', { 'class': 'pull-right', 'style': 'display:inline-flex; gap:4px;' });
				h2.appendChild(h2badges);
				updateVersion();
			}
			paintBadges(st);
			return mapEl;
		});
	}
});
