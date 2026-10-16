#!/usr/bin/env node
'use strict';

// 在記憶體試算表執行真正的 Code.gs；不連 Google、不建立或刪除雲端資料。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const project = path.resolve(__dirname, '../..');
const clone = value => JSON.parse(JSON.stringify(value));
const initial = {
  '設定': [
    ['key', '項目', '內容'],
    ['hours', '開放時間', '每日 06:00 – 19:00'],
    ['phone', '電話', '03-383-6940'],
    ['address', '地址', '桃園市大園區沙崙里中央路 418 之一號（臨時紅壇）'],
    ['chair', '管理委員會主任委員', '駱文章'],
    ['lamp', '點燈服務', '光明燈、太歲燈'],
    ['nt_intro', '建新廟說明', '試算表既有且尚未發佈的新廟說明'],
    ['nt_progress', '建新廟進度', '試算表既有的新進度'],
    ['custom_legacy', '既有自訂資料', '必須保留的舊內容'],
    ['phone', '舊重複欄位', '亦不得刪除的另一個值'],
  ],
  '最新消息': [
    ['日期', '標題', '內容', '顯示', '照片', '置頂'],
    ['2026-10-01', '既有公告', '原始公告內容', '是', 'legacy-news-photo', '是'],
    ['2026-09-01', '既有隱藏公告', '仍須保留', '否', '', ''],
  ],
  '照片': [
    ['檔案ID', '區塊', '說明', '上傳時間', '顯示', '排序'],
    ['legacy-photo', '廟景', '舊照片說明', '2026-10-01', '是', 1],
    ['legacy-hidden-photo', '活動', '隱藏照片亦須保留', '2026-10-01', '否', 2],
  ],
  '_meta': [['version'], [JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/legacy-content.json'), 'utf8')).version]],
};

let forbiddenCalls = [], failNextWrite = '', activeEmail = 'editor@example.test', serial = 0;
const sheets = new Map();
const cellValue = value => typeof value === 'string' && value.startsWith("'") ? value.slice(1) : value;

class Range {
  constructor(sheet, row, col, rows = 1, cols = 1) { Object.assign(this, {sheet, row, col, rows, cols}); }
  getValues() {
    return Array.from({length: this.rows}, (_, i) => Array.from({length: this.cols}, (_, j) =>
      this.sheet.rows[this.row + i - 1]?.[this.col + j - 1] ?? ''));
  }
  getDisplayValues() { return this.getValues().map(row => row.map(String)); }
  getValue() { return this.getValues()[0][0]; }
  setValues(values) {
    assert.equal(values.length, this.rows, 'GAS setValues rows');
    if (failNextWrite === this.sheet.name) {
      failNextWrite = '';
      throw new Error('INJECTED_STORAGE_FAILURE');
    }
    values.forEach((row, i) => {
      assert.equal(row.length, this.cols, 'GAS setValues columns');
      while (this.sheet.rows.length < this.row + i) this.sheet.rows.push([]);
      row.forEach((value, j) => { this.sheet.rows[this.row + i - 1][this.col + j - 1] = cellValue(value); });
    });
    return this;
  }
  setValue(value) { return this.setValues([[value]]); }
  clearContent() { forbiddenCalls.push('clearContent:' + this.sheet.name); throw new Error('禁止清除既有資料'); }
  clear() { return this.clearContent(); }
  setNumberFormat() { return this; }
  setWrap() { return this; }
}

class Sheet {
  constructor(name, rows = []) { this.name = name; this.rows = clone(rows); }
  getName() { return this.name; }
  getLastRow() {
    for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i].some(v => v !== '' && v != null)) return i + 1;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)); }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getMaxColumns() { return Math.max(26, this.getLastColumn()); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  getRange(row, col, rows, cols) {
    if (typeof row === 'string') {
      const match = row.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      assert.ok(match, '支援的 A1 範圍：' + row);
      const column = letters => [...letters].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0);
      const firstColumn = column(match[1]), firstRow = Number(match[2]);
      return new Range(this, firstRow, firstColumn, match[4] ? Number(match[4]) - firstRow + 1 : 1,
        match[3] ? column(match[3]) - firstColumn + 1 : 1);
    }
    return new Range(this, row, col, rows, cols);
  }
  appendRow(row) { this.getRange(this.getLastRow() + 1, 1, 1, row.length).setValues([row]); return this; }
  setFrozenRows() { return this; }
  hideSheet() { return this; }
  insertRowsAfter() { return this; }
  insertColumnsAfter() { return this; }
  deleteRow() { forbiddenCalls.push('deleteRow:' + this.name); throw new Error('禁止刪除既有資料列'); }
  deleteRows() { return this.deleteRow(); }
  clearContents() { forbiddenCalls.push('clearContents:' + this.name); throw new Error('禁止清除既有分頁'); }
}

for (const [name, rows] of Object.entries(initial)) sheets.set(name, new Sheet(name, rows));
const spreadsheet = {
  getSheetByName: name => sheets.get(name) || null,
  insertSheet: name => { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet; },
  getSheets: () => [...sheets.values()],
  deleteSheet: sheet => { forbiddenCalls.push('deleteSheet:' + sheet.name); throw new Error('禁止刪除既有分頁'); },
};
const properties = new Map([['PHOTO_FOLDER', 'existing-photo-folder']]);
const folder = {getId: () => 'existing-photo-folder', setSharing: () => folder};
const file = {
  getEditors: () => [{getEmail: () => 'editor@example.test'}],
  getOwner: () => ({getEmail: () => 'owner@example.test'}),
  setSharing: () => file,
  setTrashed: () => { forbiddenCalls.push('setTrashed'); throw new Error('禁止刪除雲端照片'); },
};
const htmlOutput = content => ({getContent: () => content, setTitle() { return this; }, addMetaTag() { return this; }});
const context = {
  console,
  SpreadsheetApp: {openById: () => spreadsheet, flush() {}},
  DriveApp: {getFileById: () => file, getFolderById: () => folder, createFolder: () => folder,
    Access: {ANYONE_WITH_LINK: 'public'}, Permission: {VIEW: 'view'}},
  Session: {getActiveUser: () => ({getEmail: () => activeEmail})},
  LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
  PropertiesService: {getScriptProperties: () => ({getProperty: key => properties.get(key),
    setProperty: (key, value) => properties.set(key, value), deleteProperty: key => properties.delete(key)})},
  Utilities: {
    getUuid: () => String(++serial).padStart(8, '0') + '-mock-uuid',
    formatDate: date => date.toISOString().slice(0, 19),
    sleep() {},
  },
  HtmlService: {
    createHtmlOutputFromFile: name => htmlOutput(fs.readFileSync(path.join(project, 'admin', name + '.html'), 'utf8')),
    createHtmlOutput: htmlOutput,
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(project, 'admin/BlockRenderer.gs'), 'utf8'), context, {filename: 'BlockRenderer.gs'});
vm.runInContext(fs.readFileSync(path.join(project, 'admin/Code.gs'), 'utf8'), context, {filename: 'Code.gs'});

const payload = data => clone({settings: data.settings, news: data.news, photos: data.photos, blocks: data.blocks});
const canonical = data => clone({settings: data.settings, news: data.news, photos: data.photos, blocks: data.blocks});
const metaVersion = () => String(sheets.get('_meta').getRange(2, 1).getValue()).replace(/^'/, '');
function published() {
  const version = metaVersion();
  const sheet = sheets.get('_published');
  assert.ok(sheet, '正式資料分頁存在');
  const rows = sheet.getDataRange().getValues().slice(1).filter(row => String(row[0]) === version);
  assert.ok(rows.length, '正式指標必須有完整快照');
  rows.sort((a, b) => Number(a[1]) - Number(b[1]));
  return JSON.parse(rows.map(row => row[2]).join(''));
}

try {
  context.setup_();
  let data = clone(context.getData());
  assert.ok(data.blocks.length >= 8, '自動遷移現有區塊');
  assert.ok(data.draftRevision, '草稿版本存在');
  assert.ok(data.settings.some(setting => setting.key === 'custom_legacy' && setting.value === '必須保留的舊內容'));
  assert.ok(data.news.some(news => news.title === '既有隱藏公告'), '隱藏消息仍在草稿');
  assert.ok(data.photos.some(photo => photo.id === 'legacy-hidden-photo'), '隱藏照片仍在草稿');
  assert.equal(data.blocks.find(block => block.style === 'newtemple').body, '試算表既有且尚未發佈的新廟說明', '遷移必須真正套用現有設定而非直接沿用 defaults.blocks');
  assert.equal(data.blocks.find(block => block.style === 'newtemple').data.progress, '試算表既有的新進度');
  assert.equal(data.blocks.find(block => block.style === 'news').show, true, '有舊公告就啟用原消息區');
  const firstPublished = clone(published());
  const firstVersion = metaVersion();
  assert.notEqual(firstPublished.blocks.find(block => block.style === 'newtemple').body,
    data.blocks.find(block => block.style === 'newtemple').body, '版本相同時，舊表未發佈改動只進草稿，正式仍採現有基準');
  assert.equal(firstPublished.news.length, 0, '未按發佈的舊公告不可混入正式基準');
  for (const name of ['設定', '最新消息', '照片']) {
    assert.deepEqual(sheets.get(name).rows.slice(0, initial[name].length), initial[name], name + '原始資料不能重排、清空或刪除');
  }
  const firstRowCounts = Object.fromEntries([...sheets].map(([name, sheet]) => [name, sheet.rows.length]));
  context.setup_();
  const again = clone(context.getData());
  assert.equal(again.draftRevision, data.draftRevision, '再次初始化不可重跑遷移');
  for (const [name, count] of Object.entries(firstRowCounts)) assert.equal(sheets.get(name).rows.length, count, name + '重開不重複新增資料');
  console.log('PASS 遷移可重入；原設定（含重複與自訂列）、消息、照片完整保留');

  const originalNewsRows = sheets.get('最新消息').rows;
  const originalPhotoRows = sheets.get('照片').rows;
  sheets.get('最新消息').rows = [originalNewsRows[0]];
  sheets.get('照片').rows = [originalPhotoRows[0]];
  const emptyLegacy = context.legacyContent_(context.defaults_());
  assert.equal(context.BlockRenderer.migrate(emptyLegacy).find(block => block.style === 'news').show, false, '沒有消息與活動照片時保持原消息區隱藏');
  sheets.get('最新消息').rows = originalNewsRows;
  sheets.get('照片').rows = originalPhotoRows;
  const unicodeContent = {value: 'x'.repeat(29989) + '😀' + '碑文'};
  context.appendSnapshot_('_draft', 'emoji-boundary-test', unicodeContent);
  for (const row of sheets.get('_draft').rows.filter(row => row[0] === 'emoji-boundary-test')) {
    const chunk = row[2];
    assert.ok(!/[\uD800-\uDBFF]$/.test(chunk), 'snapshot chunk 不可截在 surrogate pair 中間');
    assert.ok(!/^[\uDC00-\uDFFF]/.test(chunk), 'snapshot chunk 不可從孤立低 surrogate 開始');
  }
  assert.deepEqual(clone(context.readSnapshot_('_draft', 'emoji-boundary-test')), unicodeContent);
  console.log('PASS 遷移套用舊設定、空消息保持隱藏；快照支援跨 chunk 的 emoji');

  const draft = payload(data);
  draft.blocks[0].title = '尚未發佈的主視覺';
  draft.settings.find(setting => setting.key === 'phone').value = '03-000-1111';
  draft.news[0].title = '尚未發佈的公告';
  const previousRevision = data.draftRevision;
  context.saveDraft(draft, previousRevision);
  data = clone(context.getData());
  assert.notEqual(data.draftRevision, previousRevision);
  assert.equal(data.blocks[0].title, '尚未發佈的主視覺');
  assert.equal(metaVersion(), firstVersion, '儲存草稿不改正式版本');
  assert.deepEqual(published(), firstPublished, '草稿文字、基本資料及消息不滲入正式快照');
  assert.throws(() => context.saveDraft(draft, previousRevision), /版本|更新|revision|衝突|重|舊/i, '舊版本儲存必須拒絕');
  console.log('PASS 草稿隔離；修改文字／基本資料／消息不影響正式，舊版本不能覆蓋');

  context.publish(data.draftRevision);
  const publicContent = clone(published());
  assert.equal(publicContent.blocks[0].title, '尚未發佈的主視覺');
  assert.equal(publicContent.settings.phone, '03-000-1111');
  assert.equal(publicContent.news[0].title, '尚未發佈的公告');
  assert.notEqual(metaVersion(), firstVersion);
  assert.throws(() => context.publish(previousRevision), /版本|更新|revision|衝突|重|舊/i, '過期版本不得發佈');
  console.log('PASS 發佈同時保存完整積木／設定／消息快照；過期版本不能發佈');

  data = clone(context.getData());
  const futureDraft = payload(data);
  futureDraft.blocks[0].title = '應被捨棄的標題';
  futureDraft.settings.find(setting => setting.key === 'phone').value = '03-999-9999';
  context.saveDraft(futureDraft, data.draftRevision);
  data = clone(context.getData());
  const publicVersion = metaVersion();
  context.discardDraft(data.draftRevision);
  data = clone(context.getData());
  assert.equal(data.blocks[0].title, publicContent.blocks[0].title);
  assert.equal(data.settings.find(setting => setting.key === 'phone').value, publicContent.settings.phone);
  assert.deepEqual(canonical(data.content), canonical(publicContent), '捨棄必須還原正式版全部內容');
  assert.equal(metaVersion(), publicVersion, '捨棄草稿不應改正式版本');
  console.log('PASS 捨棄草稿還原正式版全部內容');

  const preDraftFailure = data.draftRevision;
  const preDraftFailureContent = canonical(data.content);
  failNextWrite = '積木';
  const failedDraft = payload(data);
  failedDraft.blocks[0].title = '寫入失敗不應採用';
  assert.throws(() => context.saveDraft(failedDraft, data.draftRevision), /INJECTED_STORAGE_FAILURE/);
  data = clone(context.getData());
  assert.equal(data.draftRevision, preDraftFailure, '積木寫入失敗不切換草稿指標');
  assert.deepEqual(canonical(data.content), preDraftFailureContent, '寫入失敗不洩漏部分草稿');
  console.log('PASS 部分草稿寫入失敗時維持完整舊草稿');

  const preFailure = metaVersion();
  const preFailureSnapshot = clone(published());
  failNextWrite = '_published';
  assert.throws(() => context.publish(data.draftRevision), /INJECTED_STORAGE_FAILURE/);
  assert.equal(metaVersion(), preFailure, '快照寫入失敗不能先切正式指標');
  assert.deepEqual(published(), preFailureSnapshot);
  console.log('PASS 寫入失敗時正式版本與快照完整保留');

  data = clone(context.getData());
  const noNews = payload(data);
  noNews.news = [];
  noNews.blocks.filter(block => block.style === 'news').forEach(block => { block.show = false; });
  context.saveDraft(noNews, data.draftRevision);
  data = clone(context.getData());
  assert.equal(data.blocks.find(block => block.style === 'news').show, false, '零則消息仍保持隱藏');
  const firstNews = {date: '2026-10-16', title: '第一則新公告', body: '', show: true, pin: false, photos: []};
  context.saveNews([firstNews], data.draftRevision);
  data = clone(context.getData());
  assert.equal(data.blocks.find(block => block.style === 'news').show, true, '舊 saveNews RPC 從零新增首則消息會開啟消息積木');
  context.publish(data.draftRevision);
  assert.equal(published().blocks.find(block => block.style === 'news').show, true, '首次新增的消息積木在發佈快照中可見');

  const hiddenBlocks = clone(data.blocks);
  hiddenBlocks.filter(block => block.style === 'news').forEach(block => { block.show = false; });
  context.saveBlocks(hiddenBlocks, data.draftRevision);
  data = clone(context.getData());
  const moreNews = payload(data);
  moreNews.news.push({...firstNews, title: '第二則公告'});
  context.saveDraft(moreNews, data.draftRevision);
  data = clone(context.getData());
  assert.equal(data.blocks.find(block => block.style === 'news').show, false, '已有消息時新增及編輯不可解除手動隱藏');
  context.publish(data.draftRevision);
  context.publish(data.draftRevision);
  assert.equal(published().blocks.find(block => block.style === 'news').show, false, '發佈與再次發佈尊重手動隱藏');

  const resetNews = payload(data);
  resetNews.news = [];
  context.saveDraft(resetNews, data.draftRevision);
  data = clone(context.getData());
  const firstDraftNews = payload(data);
  firstDraftNews.news = [{...firstNews, title: ''}];
  firstDraftNews.blocks.push({...clone(firstDraftNews.blocks.find(block => block.style === 'news')), id: 'news-copy'});
  const otherBlocks = firstDraftNews.blocks.filter(block => block.style !== 'news');
  context.saveDraft(firstDraftNews, data.draftRevision);
  data = clone(context.getData());
  assert.ok(data.blocks.filter(block => block.style === 'news').every(block => block.show),
    'saveDraft 從零新增空白消息草稿也開啟全部 news 積木，即使 payload.blocks 原為隱藏');
  assert.deepEqual(data.blocks.filter(block => block.style !== 'news'), otherBlocks, '首則消息不改動其他積木');

  const beforeHandledNews = payload(data);
  beforeHandledNews.news = [];
  beforeHandledNews.blocks.filter(block => block.style === 'news').forEach(block => { block.show = false; });
  context.saveDraft(beforeHandledNews, data.draftRevision);
  data = clone(context.getData());
  const handledNews = payload(data);
  handledNews.news = [firstNews];
  handledNews.newsVisibilityHandled = true;
  context.saveDraft(handledNews, data.draftRevision);
  data = clone(context.getData());
  assert.ok(data.blocks.filter(block => block.style === 'news').every(block => !block.show),
    '編輯器首次新增已開啟後，使用者在首次儲存前手動隱藏也須保留');
  context.publish(data.draftRevision);
  assert.ok(published().blocks.filter(block => block.style === 'news').every(block => !block.show),
    '首次新增後手動隱藏的積木發佈時仍保持隱藏');
  assert.equal(Object.hasOwn(published(), 'newsVisibilityHandled'), false, '編輯器過渡旗標不可寫入正式資料格式');
  console.log('PASS 消息零則轉首則自動開啟積木；後續新增／編輯／發佈尊重手動隱藏');

  activeEmail = 'not-an-editor@example.test';
  assert.throws(() => context.getData(), /權限|editor|帳號|登入/i);
  assert.throws(() => context.saveDraft(payload(data), data.draftRevision), /權限|editor|帳號|登入/i);
  assert.throws(() => context.publish(data.draftRevision), /權限|editor|帳號|登入/i);
  assert.throws(() => context.discardDraft(data.draftRevision), /權限|editor|帳號|登入/i);
  assert.deepEqual(forbiddenCalls, [], '測試期間不得執行清除、刪列或刪雲端照片');
  console.log('PASS 未授權帳號無法讀寫草稿／發佈／捨棄；全程零刪除');
  require('./test_admin.js');
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}
