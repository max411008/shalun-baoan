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
function element(id) {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, {
      innerHTML: '', textContent: '', value: '', children: [{}], style: {},
      listeners: {}, classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle(name, on) { on = on === undefined ? !classes.has(name) : on; on ? classes.add(name) : classes.delete(name); return on; },
      },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      querySelector() { return {focus() {}}; },
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
  context.D.blocks[0].show = false;
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
