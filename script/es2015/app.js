const ko = require('./libs/knockout-3.4.2');
const err = vl => { throw vl; };
const ajax = async url => await fetch(url).then(rs => rs.text());
const snake = vl => vl.replace(/[A-Z]/g, vl => `-${vl.toLowerCase()}`);
const checkProcedure = (name, vl) => {
	vl || err(name + ': invalid procedure');
	typeof vl === 'function' || err(name + ': procedure type error type is function');
};
const styleToObject = vl => {
	if(!vl) return {};
	if(typeof vl === 'object') return vl;
	return vl.split(';').reduce((re, wd) => {
		const [ky, vl] = wd.split(':');
		if(ky && vl) re[ky.trim()] = vl.trim();
		return re;
	}, {});
};
const objectToStyle = vl => {
	if(!vl) return '';
	if(typeof vl === 'string') return vl;
	return Object.entries(vl).reduce((re, [ky, vl]) => `${re} ${ky}:${vl};`, '');
};
const paramToObject = vl => {
	try {
		return JSON.parse([
			'{"',
			vl.replace(/=|&/g, v => ({'=':'":"', '&':'","'}[v])),
			'"}',
		].join(''));
	} catch(e) {
		return {};
	}
};

const _app = {};
const _svc = new Map();
const _viw = new Map();
const _pop = new Map();
const _com = new Map();


const Controller = class {
	constructor({con, name, proc}) {
		name || err('controller: invalid controller name');
		checkProcedure('controller', proc);

		this.con = con;
		this.name = name;
		this._bind = ko.observable();
		this._css = ko.observable();
		this._attr = ko.observable();
		this._style = ko.observable();
		proc(this);
	}
	onCreate(proc) {
		checkProcedure('onCreate', proc);
		this._create(proc);
		return this;
	}
	onLoad(proc) {
		checkProcedure('onLoad', proc);
		this._onload = proc;
		return this;
	}
	event(proc) {
		checkProcedure('event', proc);
		proc && proc(this._on = {});
		return this;
	}
	method(proc) {
		checkProcedure('method', proc);
		proc && proc(this._sub = {});
		return this;
	}

	get vo() { return this._outvo; }
	get on() { return this._on; }
	get sub() { return this._sub; }
	set html(vl) { this._html = Array.isArray(vl) ? vl.join('') : vl; }
	set template(vl) { this._tpl = vl; }
	set css(vl) { this._css(vl); }
	set attr(vl) { this._attr(vl); }
	set style(vl) { this._style(vl); }
	set focus(vl) {
		const target = typeof vl === 'string' ?
			this._self.querySelector(vl) :
			(vl.target || vl.currentTarget);
		target && target.focus();
	}

	// ----- private ----- //
	_create(proc) { proc && proc(this._invo = {}); }
	async _attach(prm) {
		this._self || err(`${this.name} is invalid DOM Object`);
		this._tpl && (this._html = this._html || await ajax(this._tpl) || '');
		this._html && (this._self.innerHTML = this._html);
		this._makeObserv();

		ko.cleanNode(this._self);
		ko.applyBindings({
			vo: this._invo,
			on: this._on,
			bind: this._bind,
		}, this._self);
		ko.applyBindingsToNode(this._self, {
			css: this._css,
			attr: this._attr,
			style: this._style,
		});

		this._onload && this._onload(prm);
		return new Promise((resolve) => { this._onclose = resolve; });
	}
	_makeObserv() {
		this._invo = this._invo || {};
		this._on = this._on || {};
		this._outvo = { array: {} };
		Object.entries(this._invo).forEach(([ky, vl]) => {
			ky === 'array' && err('vo object initialize err:: "array" keyword not used');
			const observ = Array.isArray(vl) ? ko.observableArray(vl) : ko.observable(vl);
			this._invo[ky] = observ;

			if(Array.isArray(vl)) this._outvo.array[ky] = observ;
			Object.defineProperty(this._outvo, ky, {
				set(v) { observ(v); },
				get() { return observ(); },
			});
		});
	}
};
const View = class extends Controller {
	_attach() {}
	_create(proc) {
		document.addEventListener('DOMContentLoaded', () => {
			super._create(proc);
			this._prm && this._invo && this.bind(this._prm);
		});
	}
	bind(prm) {
		if(!this._invo) return (this._prm = prm || true);
		if(this._bind() == undefined) {
			this._self = document.querySelector(`[data-app-view=${snake(this.name)}]`);
			this._self.setAttribute('data-bind', 'if:bind');
			super._attach(prm);
		} else {
			this._onload && this._onload(prm);			
		}
		this._bind(true);
		this._onbind && this._onbind(true);
	}
	unbind() {
		this._bind(false);
		this._onbind && this._onbind(false);
	}
	single(prm) {
		_viw.forEach((vl, ky) => {
			this.name === ky ? vl.bind(prm) : vl.unbind();
		});
	}
	onBind(proc) {
		checkProcedure('onBind', proc);
		this._onbind = proc;
	}
};
const Popup = class extends Controller {
	_attach() {}
	modal(prm) {
		if(document.querySelector(`[data-app-modal=${snake(this.name)}]`)) return;

		const {popup:{modal:{open}}} = _app.config;

		_app.modal.appendChild(_app.modalBG);
		this._self = _app.modal.appendChild(document.createElement('div'));
		this._self.setAttribute('data-app-modal', snake(this.name));
		this._openType = 'modal';
		open && this._style(styleToObject(open));
		return super._attach(prm);
	}
	modaless(prm) {
		const {popup:{modaless:{open}}} = _app.config;
		const self = document.querySelector(`[data-app-modaless=${snake(this.name)}]`);

		this._self = self || _app.modaless.appendChild(document.createElement('div'));
		self || this._self.setAttribute('data-app-modaless', snake(this.name));
		this._openType = 'modaless';
		open && this._style(styleToObject(open));
		return super._attach(prm);
	}
	close(prm) {
		const {popup} = _app.config;
		const close = popup[this._openType] && styleToObject(popup[this._openType].close);
		const target = _app[this._openType];
		const remove = () => {
			target.removeChild(this._self);
			if(this._openType == 'modal') {
				target.removeChild(_app.modalBG);
				target.lastChild && target.insertBefore(_app.modalBG, target.lastChild);
			}
			self.removeEventListener('animationend', remove);
		};

		close && this._style(close);
		if(close && close.animation) this._self.addEventListener('animationend', remove);
		else remove();
		this._onclose && this._onclose(prm);
	}
};
const Component = class Component extends Controller {
	set template(vl) { err('can not surpport template'); }
	_attach() {}
	_create(proc) {
		proc && proc(this._invo = {});

		this._html || err(`${this.name} is invalid template`);
		this._makeObserv();

		const _this = this;
		ko.components.register(snake(this.name), {
			template: this._html,
			viewModel: {
				createViewModel(prm, koInfo) {
					const {_invo, _on, _css, _attr, _style, _onload} = _this;
					ko.applyBindingsToNode(koInfo.element, {
						css: _css,
						attr: _attr,
						style: _style,
					});
					_onload && _onload(prm);
					return { vo:_invo, on:_on };
				},
			},
		});
	}
};

module.exports = class App {
	constructor() {
		_app.config = {};
		_app.style = document.createElement('style');
		_app.layer = document.createElement('div');
		_app.modalBG = document.createElement('div');
		_app.modaless = _app.layer.appendChild(document.createElement('div'));
		_app.modal = _app.layer.appendChild(document.createElement('div'));
		_app.modal.setAttribute('style', 'position:fixed; top:0; left:0; width:100%;');
		_app.modaless.setAttribute('style', 'position:fixed; top:0; left:0; width:100%;');

		// document ready
		document.addEventListener('DOMContentLoaded', () => {
			const {style, popup:{modal, modaless} = {}} = _app.config;
			document.body.appendChild(_app.layer);
			if(style) {
				document.head.insertBefore(_app.style, document.head.firstChild);
				_app.style.innerHTML = Array.isArray(style) ? style.join('') : style;
			}
			if(modal) {
				const {parent, background:{style, html} = {}} = modal;
				parent && _app.modal.setAttribute('style', objectToStyle(parent));
				style && _app.modalBG.setAttribute('style', objectToStyle(style));
				html && (_app.modalBG.innerHTML = Array.isArray(html) ? html.join('') : html);
			}
			if(modaless) {
				const {parent} = modaless;
				parent && _app.modaless.setAttribute('style', objectToStyle(parent));
			}
		});

		// debug service
		this.service('debug', () => {
			const local = /127.0.0.1|localhost/.test(location.hostname);
			const hash = paramToObject(location.hash.substr(1));

			return {
				log(ctrl, ...vl) {
					if(!console) return;
					if(!(local || 'debug' in hash)) return;
					if(!(ctrl instanceof Controller)) return console.log(ctrl, ...vl);

					if(document.documentMode) console.log(`${ctrl.con}::${ctrl.name}|`, ...vl);
					else console.log(`%c${ctrl.con}::${ctrl.name}|`, 'font-weight:bold', ...vl);
				},
				string(ctrl, ...vl) {
					if(!console) return;
					if(!(local || 'debug' in hash)) return;
					if(!(ctrl instanceof Controller)) return console.log(ctrl, JSON.stringify(vl, '', '  '));

					if(document.documentMode) console.log(`${ctrl.con}::${ctrl.name}|`, JSON.stringify(vl, '', '  '));
					else console.log(`%c${ctrl.con}::${ctrl.name}|`, 'font-weight:bold', JSON.stringify(vl, '', '  '));
				},
				err(ctrl, ...vl) {
					if(!console) return;
					if(!(local || 'debug' in hash)) return;
					if(!(ctrl instanceof Controller)) {
						if(document.documentMode) console.log('Error:', ctrl, ...vl);
						else console.log('%cError:', 'font-weight:bold;color:#f00;', ctrl, ...vl);
					} else {
						if(document.documentMode) console.log(`${ctrl.con}::${ctrl.name}|Error:`, ...vl);
						else console.log(`%c${ctrl.con}::${ctrl.name}|Error:`, 'font-weight:bold;color:#f00;', ...vl);
					}
				},
				break() {
					if(!(local || 'debug' in hash && hash.debug == 'break')) return;
					debugger;
				},
			};
		});
		// directive focus
		this.directive('focus', (listener) => {
			listener.init = el => {
				el.setAttribute('tabindex', '0');
				setTimeout(_=>el.focus(), 20);
			};
			return listener;
		});
		// default alert
		this.popup('modalAlert', ctrl => {
			ctrl.onCreate(vo => {
				vo.msg = '', vo.ok = '';
			}).onLoad(({msg, ok}) => {
				ctrl.vo.msg = msg, ctrl.vo.ok = ok;
			}).event(on => {
				on.ok = { click() { ctrl.close(); } };
			});
		});
		// default confirm
		this.popup('modalConfirm', ctrl => {
			ctrl.onCreate(vo => {
				vo.msg = '', vo.yes = '', vo.no = '';
			}).onLoad(({msg, yes, no}) => {
				ctrl.vo.msg = msg,
				ctrl.vo.yes = yes,
				ctrl.vo.no = no;
			}).event(on => {
				on.yes = { click() { ctrl.close(true); } };
				on.no = { click() { ctrl.close(false); } };
			});
		});
		// default toast
		this.popup('sheetToast', ctrl => {
			ctrl.onCreate(vo => {
				vo.msg = '';
			}).onLoad(({msg, time}) => {
				ctrl.vo.msg = msg;
				setTimeout(() => ctrl.close(), time);
			});
		});
	}

	service(name, proc) {
		if(!name) return err('invalid service name');
		if(!proc) return _svc.get(name);
		_svc.set(name, proc());
	}
	view(name, proc) {
		if(!name) return err('invalid view: name');
		if(!proc) return _viw.get(name);
		_viw.set(name, new View({ name, proc, con:'view' }));
	}
	popup(name, proc) {
		if(!name) return err('invalid popup: name');
		if(!proc) return _pop.get(name);
		_pop.set(name, new Popup({ name, proc, con:'pop' }));
	}
	component(name, proc) {
		if(!name) return err('invalid component: name');
		if(!proc) return _com.get(name);
		_com.set(name, new Component({ name, proc, con:'comp' }));
	}
	directive(name, proc) {
		// sample - el data-bind="format:{value:'##.##', data:vo.data}"
		// sample - procedure function(el, vl) { console.log(vl); }
		if(!name) return err('invalid directive: name, procedure');

		const val = (vl) => typeof vl === 'function' ? vl() : vl;
		const {init, update} = proc({});

		ko.bindingHandlers[name] = {
			init(el, vl) {
				init && init(el, val(vl()));
			}, 
			update(el, vl) {
				update && update(el, val(vl()));
			},
		};
	}
	alert(msg, ok) {
		const {alert:{template, html, btnOk='OK'}={}} = _app.config;
		const alert = this.popup('modalAlert');

		html || template || err('modalAlert invalid template');
		alert.template = template;
		alert.html = Array.isArray(html) ? html.join('') : html;
		return alert.modal({ msg, ok: ok || btnOk });
	}
	confirm(msg, yes, no) {
		const {confirm:{template, html, btnYes='YES', btnNo='NO'}={}} = _app.config;
		const confirm = this.popup('modalConfirm');

		html || template || err('modalConfirm invalid template');
		confirm.template = template;
		confirm.html = Array.isArray(html) ? html.join('') : html;
		return confirm.modal({ msg, yes: yes || btnYes, no: no || btnNo });
	}
	toast(msg, tm) {
		const {toast:{template, html, time=3000}={}} = _app.config;
		const toast = this.popup('sheetToast');

		toast.template = template;
		toast.html = Array.isArray(html) ? html.join('') : html;
		return toast.modaless({ msg, time: tm || time });
	}

	init(proc) { proc && proc(_app.config); }
	appendLayer(vl) { return _app.layer.appendChild(vl); }
	appendStyle(vl) { _app.style.innerHTML += vl; }
	get isMobile() {
		return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i
		.test(navigator.userAgent||navigator.vendor||window.opera);
	}
};
