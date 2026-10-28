import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the delivered browser script with small DOM/event doubles. No network,
// publication credentials, browser automation or additional test packages needed.
const source = ts.transpileModule(readFileSync(new URL('../src/scripts/site.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
class NodeDouble {
  handlers = new Map(); attributes = new Map(); hidden = false; textContent = ''; value = ''; dataset = {};
  addEventListener(name, handler) { const list = this.handlers.get(name) ?? []; list.push(handler); this.handlers.set(name, list); }
  emit(name, event = {}) { for (const handler of this.handlers.get(name) ?? []) handler(event); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { this.focused = true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains(value) { return value === this; }
}
function browser({ reduced = false, query = '' } = {}) {
  const document = new NodeDouble(); document.documentElement = { classList: { add() {} } }; document.hidden = false;
  const preference = new NodeDouble(); preference.matches = reduced;
  const carousel = new NodeDouble(), controls = new NodeDouble(), pause = new NodeDouble(), status = new NodeDouble(), next = new NodeDouble(), prev = new NodeDouble();
  const slides = Array.from({ length: 4 }, (_, i) => { const node = new NodeDouble(); node.hidden = i !== 0; node.querySelector = () => ({ textContent: `Caption ${i + 1}` }); return node; });
  const dots = slides.map(() => new NodeDouble());
  carousel.querySelectorAll = selector => selector === '[data-slide]' ? slides : dots;
  carousel.querySelector = selector => ({ '[data-slide-controls]': controls, '[data-slide-pause]': pause, '[data-slide-status]': status, '[data-slide-next]': next, '[data-slide-prev]': prev })[selector];
  const form = new NodeDouble(), input = new NodeDouble(), count = new NodeDouble(), clear = new NodeDouble(), empty = new NodeDouble();
  form.dataset = { directorySearch: 'article-results', resultLabel: 'article' };
  const rows = ['digital transformation', 'clinical practice'].map(text => { const node = new NodeDouble(); node.dataset.searchText = text; return node; });
  form.querySelector = selector => ({ input, '[data-result-count]': count, '[data-clear-search]': clear })[selector] ?? null;
  form.parentElement = { querySelector: () => empty };
  document.getElementById = () => ({ querySelectorAll: () => rows });
  document.querySelectorAll = selector => selector === '[data-slideshow]' ? [carousel] : selector === '[data-directory-search]' ? [form] : [];
  const timers = new Map(); let timerId = 0;
  let observer;
  runInNewContext(source, {
    document, window: { location: { search: query }, matchMedia: () => preference },
    URLSearchParams, Node: NodeDouble, Element: NodeDouble,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
    IntersectionObserver: class { constructor(callback) { observer = callback; } observe() {} },
  });
  return { document, preference, carousel, controls, pause, status, next, prev, slides, dots, timers, form, input, count, clear, empty, rows,
    tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    visible(value) { observer([{ isIntersecting: value }]); },
  };
}
test('slideshow advances, wraps and pauses after manual selection', () => {
  const b = browser();
  assert.equal(b.controls.hidden, false); assert.equal(b.timers.size, 1);
  b.tick(); assert.equal(b.slides[1].hidden, false); assert.equal(b.status.textContent, '');
  b.prev.emit('click'); assert.equal(b.slides[0].hidden, false); assert.equal(b.timers.size, 0);
  b.prev.emit('click'); assert.equal(b.slides[3].hidden, false); assert.match(b.status.textContent, /Slide 4 of 4/);
  b.dots[2].emit('click'); assert.equal(b.slides[2].hidden, false);
  assert.equal(b.slides.filter(slide => !slide.hidden).length, 1);
});
test('slideshow respects reduced motion, interaction and page visibility', () => {
  const b = browser({ reduced: true }); assert.equal(b.timers.size, 0); assert.equal(b.pause.textContent, 'Play');
  b.pause.emit('click'); assert.equal(b.timers.size, 1);
  b.carousel.emit('pointerenter'); assert.equal(b.timers.size, 0);
  b.carousel.emit('pointerleave'); assert.equal(b.timers.size, 1);
  b.carousel.emit('focusin'); assert.equal(b.timers.size, 0);
  b.carousel.emit('focusout', { relatedTarget: null }); assert.equal(b.timers.size, 1);
  b.visible(false); assert.equal(b.timers.size, 0); b.visible(true); assert.equal(b.timers.size, 1);
  b.document.hidden = true; b.document.emit('visibilitychange'); assert.equal(b.timers.size, 0);
  let prevented = false; b.carousel.emit('keydown', { key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(b.slides[1].hidden, false);
});
test('homepage query reaches article filtering, supports no results and clears safely', () => {
  const b = browser({ query: '?q=DiGiTaL' });
  assert.equal(b.input.value, 'DiGiTaL'); assert.deepEqual(b.rows.map(row => row.hidden), [false, true]);
  b.input.value = '<script>'; b.input.emit('input'); assert.equal(b.empty.hidden, false); assert.match(b.count.textContent, /No matching articles/);
  b.clear.emit('click'); assert.equal(b.input.value, ''); assert.equal(b.empty.hidden, true); assert.equal(b.input.focused, true);
  assert.deepEqual(b.rows.map(row => row.hidden), [false, false]);
});
