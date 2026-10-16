#!/usr/bin/env node
'use strict';

// Execute the actual admin script with in-memory form controls; no GAS or browser dialogs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const renderer = require('../blocks.js');
const clone = value => JSON.parse(JSON.stringify(value));
const elements = new Map();
const unescapeHTML = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"})[entity]);
function formControls(html) {
  return Array.from(html.matchAll(/<input\b([^>]*)>|<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g), match => {
    const textarea = match[2] !== undefined;
    const attributes = {};
    for (const attribute of (textarea ? match[2] : match[1]).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[attribute[1]] = unescapeHTML(attribute[2] || '');
    const dataset = {};
    for (const [name, value] of Object.entries(attributes)) if (name.startsWith('data-')) {
      dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    return {dataset, type: textarea ? 'textarea' : attributes.type || 'text',
      value: textarea ? unescapeHTML(match[3] || '') : attributes.value || '',
      checked: 'checked' in attributes, disabled: 'disabled' in attributes,
      hasAttribute: name => name in attributes, focus() {}};
  });
}
function element(id) {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, {
      _html: '', _controls: [], textContent: '', value: '', children: [{}], style: {},
      get innerHTML() { return this._html; },
      set innerHTML(value) { this._html = value; this._controls = formControls(value); },
      listeners: {}, classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle(name, on) { on = on === undefined ? !classes.has(name) : on; on ? classes.add(name) : classes.delete(name); return on; },
      },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      querySelectorAll(selector) {
        const attribute = selector.match(/^\[([\w-]+)\]$/);
        return attribute ? this._controls.filter(control => control.hasAttribute(attribute[1])) : [];
      },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || {focus() {}}; },
      focus() {},
    });
  }
  return elements.get(id);
}
let context;
const document = {
  getElementById: element, activeElement: {focus() {}}, contains: () => true,
  addEventListener() {}, querySelector: () => null,
  querySelectorAll(selector) {
    if (selector === '#newsList [data-ni]') return context.D.news.map((news, i) => ({
      dataset: {ni: String(i)}, querySelector: name => ({
        '.nd': {value: news.date}, '.nt': {value: news.title}, '.nb': {value: news.body},
        '.ns': {checked: news.show !== false}, '.np': {checked: !!news.pin},
      })[name],
    }));
    if (selector === '#photoList .ph') return context.D.photos.map(photo => ({
      dataset: {id: photo.id}, querySelector: name => ({
        '.pc': {value: photo.caption}, '.psec': {value: photo.section},
        '.po': {value: photo.order}, '.pv': {checked: photo.show !== false},
      })[name],
    }));
    return [];
  },
};
const runner = {withSuccessHandler() { return this; }, withFailureHandler() { return this; }, getData() {}};
context = vm.createContext({
  console, document, window: {addEventListener() {}}, BlockRenderer: renderer,
  google: {script: {run: runner}}, setTimeout: () => 1, clearTimeout() {},
  confirm() { throw new Error('Deletion must use the custom confirmation modal'); },
});
const html = fs.readFileSync(path.resolve(__dirname, '../../admin/admin.html'), 'utf8');
const script = html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/)[1];
vm.runInContext(script, context, {filename: 'admin.html'});

function reset(blocks, news = [], photos = []) {
  context.D = clone({settings: [], sections: ['廟景'], blocks, news, photos, content: {}});
  context.selectedBlock = null;
  context.dirty = false;
  context.editVersion = 0;
  context.render();
}
const block = (id, style = 'gallery', data = {}) => ({id, order: 1, style, show: true, title: id, data, photos: []});
const photo = caption => ({src: 'https://example.test/' + caption + '.jpg', thumb: 'img/' + caption + '.jpg', caption});

async function run() {
  reset([{...block('news', 'news'), show: false}, {...block('news-copy', 'news'), show: false},
    {...block('other'), show: false}]);
  context.addNews();
  assert.equal(context.D.news.length, 1);
  assert.deepEqual(Array.from(context.D.blocks, b => b.show), [true, true, false]);
  assert.doesNotMatch(element('blockList').innerHTML, /hidden-block[^]*?data-block-index="0"/);
  const firstVisibility = element('blockList').querySelectorAll('[data-block-show]')[0];
  firstVisibility.checked = false;
  element('blockList').listeners.change({target: firstVisibility});
  const firstSave = clone(context.payload());
  assert.equal(firstSave.newsVisibilityHandled, true, '首則消息已在畫面開啟，首次儲存也須保留隨後的手動隱藏');
  assert.equal(firstSave.blocks[0].show, false);
  context.addNews();
  context.updatePreview();
  assert.equal(context.D.blocks[0].show, false);
  assert.doesNotMatch(element('sitePreview').srcdoc, /<section id="news"/);
  console.log('PASS 後台首則消息開啟 news 積木；後續新增與預覽保留手動隱藏');

  reset([block('photos')]);
  assert.doesNotMatch(element('blockList').innerHTML, /askDeleteBlock|刪除/);
  context.selectBlock(0);
  const expanded = element('blockList').innerHTML;
  assert.equal((expanded.match(/askDeleteBlock/g) || []).length, 1);
  assert.ok(expanded.indexOf('askDeleteBlock') > expanded.indexOf('＋ 在這塊下方新增積木'));
  assert.match(expanded, /askDeleteBlock\(0\)[^]*?<\/button><\/p><\/div><\/article>$/);
  context.selectedBlock = null;
  context.renderBlocks();
  assert.doesNotMatch(element('blockList').innerHTML, /askDeleteBlock/);
  console.log('PASS 收合積木不含刪除入口；展開後刪除僅在編輯區最底部');

  reset([block('org', 'org', {term: '任期 115年7月25日至119年7月24日', groups: [
    {title: '主任委員', names: ['王大明']}, {title: '委員', names: ['林　生', '陳文正']},
  ]})]);
  context.selectBlock(0);
  let orgFields = element('blockList').querySelectorAll('[data-block-field]');
  const orgField = name => orgFields.find(control => control.dataset.blockField === name);
  assert.match(element('blockList').innerHTML, /任期文字|職稱與姓名|新增職稱/);
  assert.equal(orgField('data.groups.1.names').type, 'textarea');
  assert.equal(orgField('data.groups.1.names').value, '林　生\n陳文正');
  orgField('data.term').value = '任期更新';
  orgField('data.groups.1.title').value = '常務委員';
  const namesField = orgField('data.groups.1.names');
  namesField.value = '林　生、陳文正\n 黃大同 \n';
  element('blockList').listeners.input({target: namesField});
  assert.deepEqual(clone(context.D.blocks[0].data.groups[1].names), ['林　生', '陳文正', '黃大同']);
  const savedOrg = clone(context.payload()).blocks[0];
  assert.equal(savedOrg.data.term, '任期更新', '未觸發 input 的畫面值也須在儲存前擷取');
  assert.equal(savedOrg.data.groups[1].title, '常務委員');
  assert.deepEqual(savedOrg.data.groups[1].names, ['林　生', '陳文正', '黃大同']);
  context.moveArrayRow(0, 'data.groups', 1, -1);
  assert.equal(context.D.blocks[0].data.groups[0].title, '常務委員');
  context.addOrgGroup(0);
  orgFields = element('blockList').querySelectorAll('[data-block-field]');
  orgField('data.groups.2.title').value = '顧問';
  orgField('data.groups.2.names').value = '張大明、李文華';
  context.captureBlocks();
  assert.deepEqual(clone(context.D.blocks[0].data.groups[2]), {title: '顧問', names: ['張大明', '李文華']});
  context.removeArrayRow(0, 'data.groups', 2);
  element('confirmAction').onclick();
  assert.equal(context.D.blocks[0].data.groups.length, 2);
  reset([block('org-empty', 'org', {term: '', groups: []})]);
  context.selectBlock(0);
  assert.match(element('blockList').innerHTML, /新增職稱/);
  context.addOrgGroup(0);
  assert.deepEqual(clone(context.D.blocks[0].data.groups), [{title: '', names: []}]);
  assert.match(context.miniature('org'), />組<\/b>/);
  console.log('PASS 組織表具名表單、姓名陣列往返、草稿擷取、群組排序／新增／移除與空表新增');

  for (const field of ['timeline', 'entries']) {
    reset([block('items', 'history', {[field]: [{title: '保留此項', body: '原內容'}]})]);
    context.removeArrayRow(0, 'data.' + field, 0);
    assert.equal(context.D.blocks[0].data[field].length, 1);
    assert.equal(element('confirmModal').classList.contains('open'), true);
    assert.equal(element('confirmWhat').textContent, '保留此項');
    context.closeModal('confirmModal');
    assert.equal(context.D.blocks[0].data[field].length, 1);
    assert.equal(context.dirty, false);
    context.removeArrayRow(0, 'data.' + field, 0);
    element('confirmAction').onclick();
    assert.equal(context.D.blocks[0].data[field].length, 0);
    assert.equal(context.dirty, true);
  }
  reset([{...block('photos'), photos: [photo('保留照片')]}]);
  context.removeBlockPhoto(0, 0);
  context.closeModal('confirmModal');
  assert.equal(context.D.blocks[0].photos.length, 1);
  assert.equal(context.dirty, false);
  context.removeBlockPhoto(0, 0);
  element('confirmAction').onclick();
  assert.equal(context.D.blocks[0].photos.length, 0);
  reset([block('news', 'news')], [{date: '2026-10-16', title: '公告', body: '', show: true, photos: [photo('消息')]}]);
  context.delNewsPhoto(0, 0);
  context.closeModal('confirmModal');
  assert.equal(context.D.news[0].photos.length, 1);
  assert.equal(context.dirty, false);
  context.delNewsPhoto(0, 0);
  element('confirmAction').onclick();
  assert.equal(context.D.news[0].photos.length, 0);
  console.log('PASS 積木照片／消息照片／年表／碑文移除皆須自訂確認；取消保留原稿');

  const library = [
    {...photo('第二張'), id: 'b', section: '廟景', order: 2, show: true},
    {...photo('第一張'), id: 'a', section: '廟景', order: 1, show: true},
    {...photo('隱藏照片'), id: 'hidden', section: '廟景', order: 0, show: false},
  ];
  for (const style of ['gallery', 'newtemple']) {
    reset([{...block('linked', style, {photoSection: '廟景', note: '保留設定'}), photos: [photo('原有照片')]}], [], library);
    const linked = context.D.blocks[0];
    const initialLibrary = clone(context.D.photos);
    const effective = clone(context.blockPhotos(linked));
    let linkedHTML = context.renderBlockPhotos(linked, 0);
    assert.match(linkedHTML, /這塊的照片來自『照片』分頁，要改請到照片分頁/);
    assert.match(linkedHTML, /改成這塊自己管理照片/);
    assert.doesNotMatch(linkedHTML, /data-block-field|moveBlockPhoto|removeBlockPhoto|addBlockPhoto/);
    assert.match(linkedHTML, /input type="text" disabled/);
    // Even stale or direct editor calls cannot detach or mutate linked photos.
    context.moveBlockPhoto(0, 0, 1);
    context.removeBlockPhoto(0, 0);
    context.addBlockPhotoUrl(0);
    await context.addBlockPhotos(0, {files: [{}]});
    element('blockList').listeners.input({target: {
      type: 'text', value: '誤改', dataset: {bi: '0', blockField: 'photos.0.caption'},
      hasAttribute: name => name === 'data-block-field',
    }});
    assert.equal(linked.data.photoSection, '廟景');
    assert.equal(linked.photos[0].caption, '原有照片');
    assert.equal(context.dirty, false);
    context.detachBlockPhotos(0);
    assert.equal(linked.data.photoSection, '廟景');
    assert.equal(context.dirty, false);
    context.closeModal('confirmModal');
    assert.equal(linked.data.photoSection, '廟景');
    assert.equal(context.dirty, false);
    context.D.photos.find(p => p.id === 'a').caption = '分頁已更新';
    assert.ok(context.blockPhotos(linked).some(p => p.caption === '分頁已更新'));
    const atConfirmation = clone(context.blockPhotos(linked));
    context.detachBlockPhotos(0);
    assert.match(element('confirmNote').textContent, /複製.*解除連動/);
    element('confirmAction').onclick();
    assert.equal(linked.data.photoSection, undefined);
    assert.equal(linked.data.note, '保留設定');
    assert.deepEqual(clone(linked.photos), atConfirmation);
    assert.equal(linked.photos.length, effective.length);
    assert.doesNotMatch(context.renderBlockPhotos(linked, 0), /detachBlockPhotos|這塊的照片來自/);
    assert.match(context.renderBlockPhotos(linked, 0), /addBlockPhotoUrl|removeBlockPhoto/);
    const copied = linked.photos.find(p => p.id === 'a');
    copied.caption = '積木獨立修改';
    assert.equal(context.D.photos.find(p => p.id === 'a').caption, '分頁已更新');
    context.D.photos.find(p => p.id === 'a').caption = '分頁再次更新';
    assert.equal(copied.caption, '積木獨立修改');
    context.moveBlockPhoto(0, 0, 1);
    element('blockPhotoUrl0').value = 'https://example.test/new.jpg';
    context.addBlockPhotoUrl(0);
    assert.equal(linked.photos.at(-1).src, 'https://example.test/new.jpg');
    assert.equal(context.D.photos.length, initialLibrary.length);
  }
  console.log('PASS 連動照片維持唯讀；明確確認後複製目前排序並獨立管理，原照片清單不變');
}

module.exports = run().catch(error => { console.error(error.stack); process.exitCode = 1; });
