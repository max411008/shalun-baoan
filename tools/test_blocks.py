#!/usr/bin/env python3
"""積木的離線回歸驗證；不讀雲端、不修改正式輸出。

執行：python3 publish/tools/test_blocks.py
基準為此功能開始前保存的 fixtures/legacy-index.html 與 legacy-content.json。
只使用 Python / Node 標準函式庫（產生器自身的照片處理依賴維持不變）。
"""

from __future__ import annotations

import copy
import contextlib
import importlib.util
import io
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from dataclasses import dataclass, field
from html.parser import HTMLParser


TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent
PROJECT = ROOT.parent
FIXTURES = TOOLS / "fixtures"
RENDERER = ROOT / "blocks.js"
BROWSER_RENDERER = PROJECT / "admin" / "block_renderer.html"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Element:
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list = field(default_factory=list)

    def findall(self, tag=None, **attrs):
        result = []
        if (tag is None or self.tag == tag) and all(self.attrs.get(k) == v for k, v in attrs.items()):
            result.append(self)
        for child in self.children:
            if isinstance(child, Element):
                result.extend(child.findall(tag, **attrs))
        return result

    def text(self, *, collapsed=True, hidden=False):
        """可閱讀文字；預設亦涵蓋使用者展開碑文後可讀取的全文。"""
        if self.tag in {"head", "style", "script", "template"}:
            return ""
        style = re.sub(r"\s+", "", self.attrs.get("style") or "").lower()
        if not hidden and ("hidden" in self.attrs or "display:none" in style or "visibility:hidden" in style):
            return ""
        children = self.children
        if self.tag == "details" and not collapsed and "open" not in self.attrs:
            children = [c for c in children if isinstance(c, Element) and c.tag == "summary"]
        return " ".join(c.text(collapsed=collapsed, hidden=hidden) if isinstance(c, Element) else c for c in children)


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, dict(attrs))
        self.stack[-1].children.append(element)
        if tag not in VOID:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Element(tag, dict(attrs)))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    @property
    def body(self):
        bodies = self.root.findall("body")
        return bodies[0] if bodies else self.root


def normalized(text):
    return re.sub(r"\s+", "", text)


JS_BRIDGE = r"""
const fs = require('fs'), vm = require('vm');
const renderer = require(process.argv[1]);
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
let result;
if (request.action === 'migrate') result = renderer.migrate(request.content);
else if (request.action === 'ensureOrg') result = renderer.ensureOrg(request.content);
else if (request.action === 'fromAdmin') result = renderer.fromAdmin(request.content);
else if (request.action === 'library') result = renderer.library;
else if (request.action === 'create') result = renderer.createBlock(request.content.style);
else if (request.action === 'preview') {
  const source = fs.readFileSync(process.argv[2], 'utf8')
    .replace(/^\s*<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');
  const sandbox = {}; vm.createContext(sandbox); vm.runInContext(source, sandbox);
  result = sandbox.BlockRenderer.renderDocument(request.content, request.options || {});
} else if (request.action === 'body') result = renderer.render(request.content);
else result = renderer.renderDocument(request.content, request.options || {});
process.stdout.write(JSON.stringify(result));
"""


def renderer(action, content, **options):
    completed = subprocess.run(
        ["node", "-e", JS_BRIDGE, str(RENDERER), str(BROWSER_RENDERER)],
        input=json.dumps({"action": action, "content": content, "options": options}, ensure_ascii=False),
        capture_output=True, text=True, check=False, cwd=PROJECT,
    )
    if completed.returncode:
        raise AssertionError(f"Node renderer failed:\n{completed.stderr}")
    return json.loads(completed.stdout)


def block(identifier, order, *, show=True, style="text", **fields):
    result = {"id": identifier, "order": order, "style": style,
              "title": f"標題 {identifier}", "subtitle": "", "body": f"內文 {identifier}",
              "photos": [], "show": show, "navTitle": f"選單 {identifier}", "data": {}}
    result.update(fields)
    return result


def backend_case(source):
    """重用既有記憶體 GAS harness，在未初始化的試算表執行獨立升級情境。"""
    harness = (TOOLS / "test_backend.js").read_text("utf-8")
    marker = "try {\n  context.setup_();"
    if harness.count(marker) != 1:
        raise AssertionError("找不到唯一的 GAS harness 初始化入口")
    completed = subprocess.run(["node", "-e", harness.split(marker, 1)[0] + source],
                               cwd=TOOLS, text=True, capture_output=True, check=False)
    if completed.returncode:
        raise AssertionError(completed.stdout + completed.stderr)
    return completed.stdout


class BlocksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.legacy_html = (FIXTURES / "legacy-index.html").read_text("utf-8")
        cls.legacy_content = json.loads((FIXTURES / "legacy-content.json").read_text("utf-8"))
        cls.migrated = copy.deepcopy(cls.legacy_content)
        cls.migrated["blocks"] = renderer("migrate", cls.legacy_content)
        cls.org_roster = json.loads((PROJECT / "materials-20261005" / "組織表_第八屆_職稱姓名.json").read_text("utf-8"))
        cls.org_groups = []
        for row in cls.org_roster:
            if not cls.org_groups or cls.org_groups[-1]["title"] != row["title"]:
                cls.org_groups.append({"title": row["title"], "names": []})
            cls.org_groups[-1]["names"].append(re.sub(r"(?<=林) +(?=生$)", "\u3000", row["name"]))
        spec = importlib.util.spec_from_file_location("sync_admin_for_block_test", TOOLS / "sync_admin.py")
        cls.generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.generator)

    def generated(self, content):
        return self.generator.build_page(copy.deepcopy(content))

    def test_01_hidden_blocks_and_navigation(self):
        """(a) 隱藏積木的標題、內文、照片及選單均不出現。"""
        content = {"settings": {}, "news": [], "photos": {}, "blocks": [
            block("visible", 1), block("hidden-block", 2, show=False, title="HIDDEN_TITLE_SENTINEL",
                  body="HIDDEN_BODY_SENTINEL", photos=[{"src": "hidden-sentinel.jpg", "caption": "HIDDEN_PHOTO_SENTINEL"}]),
        ]}
        doc = Document(self.generated(content)).body
        text = doc.text()
        self.assertIn("標題 visible", text)
        self.assertNotIn("HIDDEN_", text)
        self.assertFalse(doc.findall(id="hidden-block"))
        self.assertFalse(doc.findall("a", href="#hidden-block"))
        self.assertFalse(doc.findall("img", src="hidden-sentinel.jpg"))

    def test_02_order_matches_navigation(self):
        """(b) 不依輸入陣列位置，頁面與選單均按順序欄排序。"""
        blocks = [block("third", 30), block("hidden", 0, show=False), block("first", 10), block("second", 20)]
        doc = Document(self.generated({"blocks": blocks})).body
        ids = {"first", "second", "third", "hidden"}
        page_order = [e.attrs["id"] for e in doc.findall() if e.attrs.get("id") in ids]
        nav = doc.findall("nav")
        self.assertTrue(nav, "網站需要自動產生選單")
        nav_order = [a.attrs.get("href", "")[1:] for a in nav[0].findall("a")
                     if (a.attrs.get("href") or "").startswith("#")]
        self.assertEqual(page_order, ["first", "second", "third"])
        self.assertEqual(nav_order, page_order)

    def test_03_migration_preserves_legacy_readable_text(self):
        """(c) 新增組織表之外，遷移前後原文字與可展開全文一致。"""
        original = Document(self.legacy_html).body
        current = Document(self.generated(self.migrated)).body
        added = {item["id"] for item in self.migrated["blocks"] if item["style"] == "org"}
        def remove_org(node):
            node.children = [child for child in node.children if not isinstance(child, Element)
                             or (child.attrs.get("id") not in added and child.attrs.get("href") not in {"#" + key for key in added})]
            for child in node.children:
                if isinstance(child, Element):
                    remove_org(child)
        remove_org(current)
        for include_collapsed in (False, True):
            with self.subTest(include_collapsed_inscriptions=include_collapsed):
                self.assertEqual(normalized(current.text(collapsed=include_collapsed)),
                                 normalized(original.text(collapsed=include_collapsed)))

    def test_04_migration_preserves_photos_and_collapsible_inscriptions(self):
        """原照片順序、四篇摺疊碑文、原碑照片與完整轉錄均保留。"""
        original = Document(self.legacy_html).body
        current = Document(self.generated(self.migrated)).body
        self.assertEqual([e.attrs.get("src") for e in current.findall("img")],
                         [e.attrs.get("src") for e in original.findall("img")])
        old_steles = [d for d in original.findall("details") if "stele" in (d.attrs.get("class") or "").split()]
        new_steles = [d for d in current.findall("details") if "stele" in (d.attrs.get("class") or "").split()]
        self.assertEqual(len(old_steles), 4)
        self.assertEqual(len(new_steles), len(old_steles))
        for old, new in zip(old_steles, new_steles):
            self.assertEqual(normalized(new.text()), normalized(old.text()))
            self.assertTrue(new.findall("summary"))
            self.assertTrue(new.findall("pre"))
            self.assertEqual(new.findall("img")[0].attrs["src"], old.findall("img")[0].attrs["src"])
            self.assertNotIn("open", new.attrs, "碑文初始保持摺疊")

    def test_05_generator_and_browser_preview_are_identical(self):
        """正式產生器與後台實際載入的瀏覽器渲染器輸出完全一致。"""
        for content in (self.migrated, {"blocks": [block("preview", 1, body="草稿文字\n第二行 & <純文字>")]}):
            with self.subTest(block_count=len(content["blocks"])):
                public = self.generated(content)
                preview = renderer("preview", content, assetBase="")
                self.assertEqual(public, preview)
                self.assertEqual(public, renderer("document", content, assetBase=""))
        js = RENDERER.read_text("utf-8").strip()
        gas_js = (PROJECT / "admin" / "BlockRenderer.gs").read_text("utf-8").strip()
        browser_js = BROWSER_RENDERER.read_text("utf-8").strip()
        browser_js = re.sub(r"^<script[^>]*>\s*", "", browser_js)
        browser_js = re.sub(r"\s*</script>$", "", browser_js)
        self.assertEqual(js, gas_js, "GAS 遷移器須由同一份 renderer 產生")
        self.assertEqual(js, browser_js.strip(), "預覽須由同一份 renderer 產生")

    def test_06_missing_blocks_migrate_but_empty_blocks_stay_empty(self):
        """舊資料缺積木才遷移；明確刪光積木不能偷偷復活預設內容。"""
        missing = Document(self.generated(self.legacy_content)).body
        empty = Document(self.generated({**self.legacy_content, "blocks": []})).body
        self.assertTrue(missing.findall("section"))
        self.assertFalse(empty.findall("section"))
        self.assertFalse(empty.findall("nav")[0].findall("a") if empty.findall("nav") else [])

    def test_07_editing_is_immediate_in_preview(self):
        """草稿改字、移動、隱藏，下一次共用 renderer 呼叫立即反映。"""
        content = {"blocks": [block("one", 1), block("two", 2)]}
        before = renderer("preview", content, assetBase="")
        content["blocks"][0].update(title="即時修改的標題", body="即時修改的內文", order=3)
        after = renderer("preview", content, assetBase="")
        self.assertNotEqual(before, after)
        doc = Document(after).body
        self.assertIn("即時修改的標題", doc.text())
        self.assertIn("即時修改的內文", doc.text())
        self.assertLess(after.index('id="two"'), after.index('id="one"'))
        content["blocks"][0]["show"] = False
        self.assertNotIn("即時修改的標題", Document(renderer("preview", content, assetBase="")).body.text())

    def test_08_user_text_and_unsafe_urls_are_not_executable(self):
        """編輯文字會跳脫；照片與連結拒絕可執行協定；代號安全且唯一。"""
        attack = '<img src=x onerror="alert(1)">'
        content = {"blocks": [block('bad" onclick="alert(1)', 1, title=attack, body=attack),
                              block("duplicate", 2), block("duplicate", 3),
                              block("unsafe-photo", 4, style="gallery", photos=[
                                  {"src": "javascript:alert(1)", "thumb": "javascript:alert(2)", "caption": attack},
                                  {"src": "https://example.test/safe.jpg", "thumb": "https://example.test/thumb.jpg", "caption": "安全照片"},
                              ]), block("g-unsafe-photo", 5)]}
        doc = Document(self.generated(content)).body
        self.assertIn(attack, doc.text())
        ids = [e.attrs["id"] for e in doc.findall() if e.attrs.get("id")]
        self.assertEqual(len(ids), len(set(ids)), "重複代號不得導致重複 DOM id")
        for element in doc.findall():
            for key, value in element.attrs.items():
                self.assertFalse(key.lower().startswith("on"), f"禁止事件屬性：{key}")
                if key in {"href", "src"} and value:
                    self.assertFalse(re.match(r"\s*(javascript|vbscript|data):", value, re.I), value)

    def test_09_generator_can_write_an_isolated_output(self):
        """同一個實際產生器可寫入隔離輸出，測試不覆寫網站檔案。"""
        content = {"blocks": [block("test-output", 1)]}
        with tempfile.TemporaryDirectory(prefix="baoan-block-test-") as directory:
            output = pathlib.Path(directory) / "index.html"
            html = self.generator.build_page(copy.deepcopy(content), output_path=output)
            self.assertEqual(output.read_text("utf-8"), html)
            self.assertEqual(html, renderer("preview", content, assetBase=""))

    def test_10_backend_drafts_publication_and_data_preservation(self):
        """GAS 模擬：遷移不刪資料、草稿隔離、發佈快照、捨棄與版本衝突。"""
        completed = subprocess.run(["node", str(TOOLS / "test_backend.js")],
                                   cwd=PROJECT, text=True, capture_output=True, check=False)
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("PASS", completed.stdout)
        print("\n" + completed.stdout.strip())

    def test_11_style_specific_fields_and_photo_edits_are_rendered(self):
        """專用積木的進度、年表、神明、地圖、捐款、碑文和照片皆可改。"""
        content = copy.deepcopy(self.migrated)
        expected = []
        expected_sources = []
        for item in content["blocks"]:
            style = item["style"]
            item["show"] = True
            if style != "facts":
                item["title"] = f"EDIT_{style}_TITLE"
                expected.append(item["title"])
            if style not in {"hero", "facts"}:
                item["body"] = f"EDIT_{style}_BODY"
                expected.append(item["body"])
            data = item["data"]
            for key in list(data):
                if key in {"background", "photoSection", "mapQuery"} or not isinstance(data[key], str):
                    continue
                if style == "footer" and key not in {"chair", "address", "phone", "note"}:
                    continue
                data[key] = f"EDIT_{style}_{key}"
                expected.append(data[key])
            data["photoSection"] = ""
            for collection in ("items", "timeline", "entries"):
                for index, row in enumerate(data.get(collection, [])):
                    for key in list(row):
                        if key == "photo":
                            row[key] = f"https://example.test/edited-stele-{index}.jpg"
                            expected_sources.append(row[key])
                        else:
                            row[key] = f"EDIT_{style}_{index}_{key}"
                            expected.append(row[key])
            if style in {"hero", "newtemple", "deity", "gallery", "news", "stele"}:
                source = f"https://example.test/edited-{item['id']}.jpg"
                item["photos"] = [{"src": source, "thumb": source, "caption": ""}]
                expected_sources.append(source)
            if style == "address":
                data["mapQuery"] = "編輯後的地圖查詢地址"
        content["blocks"].append(block("donation-edit", 99, style="donation", data={
            "donationTitle": "EDIT_DONATION_TITLE", "bank": "EDIT_BANK", "accountName": "EDIT_ACCOUNT_NAME",
            "account": "EDIT_ACCOUNT", "note": "EDIT_DONATION_NOTE", "phone": "EDIT_DONATION_PHONE",
        }))
        expected.extend(content["blocks"][-1]["data"].values())
        html = self.generated(content)
        doc = Document(html).body
        for marker in expected:
            self.assertIn(marker, doc.text(), marker)
        sources = [image.attrs.get("src") for image in doc.findall("img")]
        for source in expected_sources:
            self.assertIn(source, sources)
        self.assertIn("%E7%B7%A8%E8%BC%AF%E5%BE%8C%E7%9A%84%E5%9C%B0%E5%9C%96", html)
        self.assertEqual(html, renderer("preview", content, assetBase=""))

    def test_12_admin_conversion_respects_settings_and_hidden_library_items(self):
        """後台資料轉換會即時更新地址地圖等設定，並過濾隱藏消息與照片。"""
        admin = {"content": self.migrated, "blocks": copy.deepcopy(self.migrated["blocks"]),
                 "settings": [{"key": key, "value": value} for key, value in self.legacy_content["settings"].items()],
                 "news": [{"title": "顯示公告", "body": "內文", "date": "2026-10-16", "show": True},
                          {"title": "不顯示公告", "show": False}],
                 "photos": [{"src": "https://example.test/show.jpg", "caption": "顯示照片", "section": "廟景", "show": True},
                            {"src": "https://example.test/hide.jpg", "caption": "不顯示照片", "section": "廟景", "show": False}]}
        for setting in admin["settings"]:
            if setting["key"] == "address":
                setting["value"] = "新廟正式地址（正式大殿）"
        content = renderer("fromAdmin", admin)
        address = next(b for b in content["blocks"] if b["style"] == "address")
        self.assertEqual(address["data"]["address"], "新廟正式地址（正式大殿）")
        self.assertEqual(address["data"]["mapLabel"], address["data"]["address"])
        self.assertEqual(address["data"]["mapQuery"], address["data"]["address"])
        self.assertEqual([n["title"] for n in content["news"]], ["顯示公告"])
        self.assertEqual([p["caption"] for p in content["photos"]["廟景"]], ["顯示照片"])
        doc = Document(self.generated(content)).body
        visit = doc.findall(id=address["id"])[0]
        self.assertNotIn("（臨時紅壇）", visit.text())
        self.assertIn("（正式大殿）", visit.text())

    def test_13_sync_reads_only_complete_published_snapshots(self):
        """新版抓取路徑只讀正式快照；缺 chunk 或版本不符即拒絕。"""
        content = {"version": "fake-publication", "settings": {}, "news": [], "photos": {},
                   "blocks": [block("published-only", 1)]}
        raw = json.dumps(content, ensure_ascii=False)
        rows = [[content["version"], index, raw[offset:offset + 70]]
                for index, offset in enumerate(range(0, len(raw), 70))]
        original_tab = self.generator.tab
        calls = []
        def fake_tab(name):
            calls.append(name)
            self.assertEqual(name, "_published", "不得讀取草稿或舊資料表")
            return rows
        self.generator.tab = fake_tab
        try:
            self.assertEqual(self.generator.published_snapshot(content["version"]), content)
            self.assertEqual(calls, ["_published"])
            rows.pop(1)
            with self.assertRaises(ValueError):
                self.generator.published_snapshot(content["version"])
            rows[:] = [[content["version"], 0, json.dumps({**content, "version": "wrong-version"})]]
            with self.assertRaises(ValueError):
                self.generator.published_snapshot(content["version"])
        finally:
            self.generator.tab = original_tab

    def test_14_actual_sync_main_uses_publication_and_rebuilds_without_drafts(self):
        """實跑 main：正式快照產出檔案；同版本重新建頁，均不讀任何草稿。"""
        content = {"version": "main-fake-publication", "settings": {}, "news": [], "photos": {},
                   "blocks": [block("third", 3), block("hidden-main", 0, show=False), block("first", 1)]}
        raw = json.dumps(content, ensure_ascii=False)
        rows = [[content["version"], index, raw[offset:offset + 70]]
                for index, offset in enumerate(range(0, len(raw), 70))]
        calls = []
        def fake_tab(name):
            calls.append(name)
            if name == "_meta":
                return [[content["version"], "draft-revision-never-fetched"]]
            if name == "_published":
                return rows
            raise AssertionError("禁止讀草稿或舊資料分頁：" + name)
        with tempfile.TemporaryDirectory(prefix="baoan-sync-main-") as directory:
            output_root = pathlib.Path(directory)
            (output_root / "blocks.js").write_text(RENDERER.read_text("utf-8"), "utf-8")
            output_json, output_html = output_root / "content.json", output_root / "index.html"
            output_json.write_text('{"version":"old-publication"}', "utf-8")
            output_html.write_text("原正式頁", "utf-8")
            with patch.multiple(self.generator, ROOT=output_root, OUT=output_json, IMG=output_root / "img/u", tab=fake_tab):
                with contextlib.redirect_stdout(io.StringIO()) as messages:
                    self.generator.main()
                self.assertIn("UPDATED", messages.getvalue())
                self.assertEqual(calls, ["_meta", "_published"])
                self.assertEqual(json.loads(output_json.read_text("utf-8")), content)
                doc = Document(output_html.read_text("utf-8")).body
                self.assertFalse(doc.findall(id="hidden-main"))
                ids = [e.attrs["id"] for e in doc.findall() if e.attrs.get("id") in {"first", "third"}]
                self.assertEqual(ids, ["first", "third"])
                calls.clear()
                output_html.write_text("過期的渲染結果", "utf-8")
                with contextlib.redirect_stdout(io.StringIO()) as messages:
                    self.generator.main()
                self.assertIn("NO_CHANGE", messages.getvalue())
                self.assertEqual(calls, ["_meta"])
                self.assertEqual(output_html.read_text("utf-8"), renderer("preview", content, assetBase=""))

    def test_15_sync_missing_or_incomplete_snapshot_preserves_both_outputs(self):
        """正式快照缺失／缺 chunk 不回退草稿，原正式 HTML 與 JSON 完全不變。"""
        for rows in ([], [["new-version", 0, '{"version":'], ["new-version", 2, '"new-version"}']]):
            with self.subTest(rows=len(rows)), tempfile.TemporaryDirectory(prefix="baoan-sync-failure-") as directory:
                output_root = pathlib.Path(directory)
                output_json, output_html = output_root / "content.json", output_root / "index.html"
                json_before, html_before = '{"version":"old-version"}', "不得改動的原正式頁"
                output_json.write_text(json_before, "utf-8")
                output_html.write_text(html_before, "utf-8")
                calls = []
                def fake_tab(name):
                    calls.append(name)
                    if name == "_meta":
                        return [["new-version", "draft-revision"]]
                    if name == "_published":
                        return rows
                    raise AssertionError("正式快照失敗不得回退草稿：" + name)
                with patch.multiple(self.generator, ROOT=output_root, OUT=output_json, IMG=output_root / "img/u", tab=fake_tab):
                    with self.assertRaises(ValueError):
                        self.generator.main()
                self.assertEqual(calls, ["_meta", "_published"])
                self.assertEqual(output_json.read_text("utf-8"), json_before)
                self.assertEqual(output_html.read_text("utf-8"), html_before)

    def test_16_drive_block_and_news_photos_are_localized_once(self):
        """積木與消息的 Drive 照片共用下載、正確改成本機檔名且不改輸入。"""
        fid = "DrivePhoto_12345"
        content = {"blocks": [block("this-is-a-block-id", 1, photos=[{"id": fid, "caption": "積木照片"}]),
                              block("inscription-localization", 2, style="stele", data={"entries": [
                                  {"title": "原碑照片", "photo": "https://drive.google.com/file/d/StelePhoto_abc123/view"},
                                  {"title": "相同原碑的縮圖網址", "photo": "https://drive.google.com/thumbnail?id=StelePhoto_abc123&sz=w1600"},
                              ]})],
                   "news": [{"title": "消息照片", "photos": [{"id": fid}]}],
                   "photos": {"廟景": [{"id": "SecondPhoto_67890", "caption": "廟景照片"}]}}
        before = copy.deepcopy(content)
        downloaded = []
        with patch.object(self.generator, "save_photo", side_effect=lambda photo_id: downloaded.append(photo_id) or True):
            localized, count = self.generator.localize_photos(content)
        self.assertEqual(downloaded, [fid, "StelePhoto_abc123", "SecondPhoto_67890"])
        self.assertEqual(count, 3)
        self.assertEqual(content, before, "產生正式資產不能改動呼叫端草稿")
        self.assertEqual(localized["blocks"][0]["photos"][0]["src"], f"img/u/{fid}.jpg")
        self.assertEqual(localized["news"][0]["photos"][0]["thumb"], f"img/u/{fid}_t.jpg")
        self.assertEqual(localized["blocks"][0]["id"], "this-is-a-block-id")
        self.assertEqual([entry["photo"] for entry in localized["blocks"][1]["data"]["entries"]],
                         ["img/u/StelePhoto_abc123.jpg", "img/u/StelePhoto_abc123.jpg"])
        self.assertEqual(localized["photos"]["廟景"][0]["src"], "img/u/SecondPhoto_67890.jpg")

    def test_17_unsorted_photo_library_matches_admin_preview_order(self):
        """舊照片陣列未排序、僅修改排序數字時，預覽與正式渲染仍完全相同。"""
        photos = [
            {"src": "https://example.test/third.jpg", "caption": "排序第三", "order": 30, "section": "廟景"},
            {"src": "https://example.test/hidden.jpg", "caption": "不可顯示", "order": 0, "section": "廟景", "show": False},
            {"src": "https://example.test/first.jpg", "caption": "排序第一", "order": 10, "section": "廟景"},
            {"src": "https://example.test/second.jpg", "caption": "排序第二", "order": 20, "section": "廟景"},
        ]
        content = {"settings": {}, "news": [], "photos": {"廟景": photos},
                   "blocks": [block("sorted-photos", 1, style="gallery", data={"photoSection": "廟景"})]}
        admin = {"content": content, "settings": [], "news": [], "photos": photos, "blocks": content["blocks"]}
        converted = renderer("fromAdmin", admin)
        public = self.generated(content)
        preview = renderer("preview", converted, assetBase="")
        self.assertEqual(public, preview)
        captions = [element.text() for element in Document(public).body.findall("figcaption")]
        self.assertEqual(captions, ["排序第一", "排序第二", "排序第三"])

    def test_18_every_style_renders_common_fields_and_multiple_photos(self):
        """積木庫每種樣式的標題、副標、內文及多張照片均真正顯示。"""
        library = renderer("library", {})
        self.assertGreaterEqual(len(library), 12)
        for kind in library:
            style = kind["style"]
            with self.subTest(style=style):
                item = renderer("create", {"style": style})
                item.update(id="common-fields", order=1, title=f"COMMON_{style}_TITLE",
                            subtitle=f"COMMON_{style}_SUBTITLE", body=f"COMMON_{style}_BODY")
                item.setdefault("data", {}).pop("photoSection", None)
                sources = [f"https://example.test/{style}-photo-{index}.jpg" for index in range(3)]
                item["photos"] = [{"src": source, "thumb": source, "caption": f"照片 {index}"}
                                  for index, source in enumerate(sources)]
                content = {"blocks": [item], "settings": {}, "photos": {}, "news": []}
                public = self.generated(content)
                doc = Document(public).body
                for field in ("title", "subtitle", "body"):
                    self.assertIn(item[field], doc.text(), f"{style} 的 {field} 不得默默忽略")
                self.assertEqual([image.attrs.get("src") for image in doc.findall("img")], sources,
                                 f"{style} 須顯示全部照片並保留順序")
                self.assertEqual(public, renderer("preview", content, assetBase=""))

    def test_19_preview_runtime_keeps_navigation_and_interactions_inside_draft(self):
        """實際執行共用 inline bind：預覽導覽不跳正式頁，照片展開與消息開關可用。"""
        content = {"blocks": [block("nav-target", 1),
                              block("photo-target", 2, style="gallery", photos=[
                                  {"src": f"https://example.test/photo-{index}.jpg", "caption": f"照片 {index}"}
                                  for index in range(13)]),
                              block("news-target", 3, style="news")],
                   "news": [{"title": "可開啟的公告", "date": "2026-10-16", "body": "完整公告內文",
                             "photos": [{"src": "https://example.test/news.jpg", "thumb": "https://example.test/news-thumb.jpg"}]}]}
        html = renderer("preview", content, assetBase="https://max411008.github.io/shalun-baoan/")
        doc = Document(html)
        self.assertEqual(doc.root.findall("base")[0].attrs["href"], "https://max411008.github.io/shalun-baoan/")
        payload = {"html": html,
                   "ids": [element.attrs["id"] for element in doc.body.findall() if element.attrs.get("id")],
                   "anchors": [anchor.attrs["href"] for anchor in doc.body.findall("a")
                               if (anchor.attrs.get("href") or "").startswith("#")],
                   "more": [button.attrs["data-more"] for button in doc.body.findall("button") if "data-more" in button.attrs],
                   "news": [button.attrs["data-news"] for button in doc.body.findall("button") if "data-news" in button.attrs]}
        script = r"""
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
function element(tag,attrs={}) {
  const classes=new Set(),node={tagName:tag.toUpperCase(),attrs,dataset:{},children:[],_text:'',
    classList:{add:value=>classes.add(value),contains:value=>classes.has(value)},
    getAttribute(key){return this.attrs[key]??null;},
    appendChild(child){this.children.push(child);return child;},
    scrollIntoView(options){this.scrolled=options;},
    showModal(){this.open=true;},close(){this.open=false;},
    querySelector(selector){assert.ok(this.parts&&this.parts[selector],selector);return this.parts[selector];}
  };
  Object.defineProperty(node,'id',{get(){return this.attrs.id;},set(value){this.attrs.id=value;}});
  Object.defineProperty(node,'textContent',{get(){return this._text+this.children.map(child=>child.textContent).join('');},
    set(value){this._text=String(value);this.children=[];}});
  Object.defineProperty(node,'innerHTML',{get(){return this._html||'';},set(value){
    this._html=value;
    assert.equal(this.tagName,'DIALOG','只需要解析實際消息 dialog 的靜態外框');
    this.parts={'.x':element('button'),'.hd':element('div'),'.bd':element('div')};
    this.children=Object.values(this.parts);
  }});
  return node;
}
const body=element('body'),targets=Object.fromEntries(input.ids.map(id=>[id,element('div',{id})]));
Object.values(targets).forEach(node=>body.appendChild(node));
const anchors=input.anchors.map(href=>element('a',{href}));
const more=input.more.map(id=>{const node=element('button');node.dataset.more=id;return node;});
const news=input.news.map(index=>{const node=element('button');node.dataset.news=index;return node;});
function find(node,id){if(node.id===id)return node;for(const child of node.children){const result=find(child,id);if(result)return result;}return null;}
const document={body,createElement:element,getElementById:id=>find(body,id),
  querySelectorAll(selector){if(selector==='a[href^="#"]')return anchors;if(selector==='[data-more]')return more;
    if(selector==='[data-news]')return news;throw new Error('unexpected selector '+selector);}};
const context={document};vm.createContext(context);
const scripts=[...input.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
assert.equal(scripts.length,1,'預覽只執行實際 renderDocument 產出的那支互動程式');
for(const source of scripts)new vm.Script(source).runInContext(context);
let prevented=false;
anchors.find(node=>node.getAttribute('href')==='#nav-target').onclick({preventDefault(){prevented=true;}});
assert.ok(prevented,'必須阻止 base URL 將錨點導到正式網站');
assert.equal(targets['nav-target'].scrolled.block,'start');
assert.equal(targets['nav-target'].scrolled.behavior,'smooth');
let brandPrevented=false;
anchors.find(node=>node.getAttribute('href')==='#').onclick({preventDefault(){brandPrevented=true;}});
assert.ok(brandPrevented);assert.ok(body.scrolled,'廟名回頂端也留在預覽');
assert.equal(more.length,1);more[0].onclick();
assert.ok(targets[more[0].dataset.more].classList.contains('all'));assert.equal(more[0].hidden,true);
assert.equal(news.length,1);news[0].onclick();
const dialog=document.getElementById('news-dlg');assert.ok(dialog.open);
assert.equal(dialog.querySelector('.hd').children[0].textContent,'2026-10-16');
assert.equal(dialog.querySelector('.hd').children[1].textContent,'可開啟的公告');
assert.equal(dialog.querySelector('.bd').children[0].textContent,'完整公告內文');
const picture=dialog.querySelector('.bd').children[1].children[0];
assert.equal(picture.href,'https://example.test/news.jpg');
assert.equal(picture.children[0].src,'https://example.test/news-thumb.jpg');
dialog.querySelector('.x').onclick();assert.equal(dialog.open,false);
news[0].onclick();assert.ok(dialog.open);dialog.onclick({target:dialog});assert.equal(dialog.open,false);
process.stdout.write('PASS preview navigation / gallery / news dialog');
"""
        completed = subprocess.run(["node", "-e", script], input=json.dumps(payload, ensure_ascii=False),
                                   cwd=PROJECT, text=True, capture_output=True, check=False)
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("PASS", completed.stdout)

    def test_20_embedded_admin_has_two_valid_scripts(self):
        """GAS include 展開後恰有兩個完整 script，避免 renderer 內的結尾標籤截斷後台。"""
        html = (PROJECT / "admin" / "admin.html").read_text("utf-8")
        html = re.sub(r"<\?!=\s*include_\('block_renderer'\);?\s*\?>",
                      lambda _: BROWSER_RENDERER.read_text("utf-8"), html)
        self.assertNotIn("<?", html, "應展開全部 GAS script include")
        scripts = Document(html).root.findall("script")
        self.assertEqual(len(scripts), 2)
        sources = ["".join(child for child in script.children if isinstance(child, str)) for script in scripts]
        completed = subprocess.run(["node", "-e", "const fs=require('fs'),vm=require('vm');JSON.parse(fs.readFileSync(0,'utf8')).forEach(s=>new vm.Script(s));process.stdout.write('PASS');"],
                                   input=json.dumps(sources, ensure_ascii=False), cwd=PROJECT,
                                   text=True, capture_output=True, check=False)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(completed.stdout, "PASS")

    def test_21_external_images_are_localized_once_with_resized_cached_files(self):
        """外部 http(s) 照片、消息與碑文皆下載為本機 JPEG／縮圖，重複 URL 只下載一次。"""
        source = "https://images.example.test/原圖?size=large&v=1"
        second_source = "http://images.example.test/second.png"
        content = {"blocks": [block("external-gallery", 1, style="gallery", photos=[
                                   {"id": "external-object-42", "src": source, "thumb": source, "caption": "外部照片"}, second_source]),
                              block("external-inscription", 2, style="stele", data={"entries": [
                                  {"title": "原碑", "photo": source}]})],
                   "news": [{"photos": [{"src": source, "thumb": source}]}],
                   "photos": {"廟景": [{"src": second_source}, "img/already-local.jpg"]},
                   "settings": {"link": source}, "body": source}
        before = copy.deepcopy(content)
        image_data = io.BytesIO()
        self.generator.Image.new("RGB", (2000, 1200), "white").save(image_data, "PNG")
        with tempfile.TemporaryDirectory(prefix="baoan-external-images-") as directory:
            image_root = pathlib.Path(directory) / "img/u"
            with patch.object(self.generator, "IMG", image_root), \
                 patch.object(self.generator, "fetch", return_value=image_data.getvalue()) as fetched:
                localized, count = self.generator.localize_photos(content)
                self.assertEqual(count, 2)
                self.assertEqual(fetched.call_args_list, [
                    unittest.mock.call(source, want="image/"),
                    unittest.mock.call(second_source, want="image/"),
                ])
                first = localized["blocks"][0]["photos"][0]
                self.assertEqual(first["id"], "external-object-42")
                self.assertRegex(first["src"], r"^img/u/url-[0-9a-f]{64}\.jpg$")
                self.assertEqual(first["thumb"], first["src"].replace(".jpg", "_t.jpg"))
                self.assertEqual(localized["news"][0]["photos"][0]["src"], first["src"])
                self.assertEqual(localized["blocks"][1]["data"]["entries"][0]["photo"], first["src"])
                second = localized["blocks"][0]["photos"][1]
                self.assertNotEqual(second, first["src"])
                self.assertEqual(localized["photos"]["廟景"][0]["src"], second)
                self.assertEqual(localized["photos"]["廟景"][1], "img/already-local.jpg")
                self.assertEqual(localized["settings"]["link"], source)
                self.assertEqual(localized["body"], source)
                for key, size in (("src", (1600, 960)), ("thumb", (480, 288))):
                    with self.generator.Image.open(image_root / pathlib.Path(first[key]).name) as image:
                        self.assertEqual(image.format, "JPEG")
                        self.assertEqual(image.size, size)
                fetched.reset_mock()
                self.assertEqual(self.generator.localize_photos(content), (localized, count))
                fetched.assert_not_called()
        self.assertEqual(content, before, "下載與改寫不得污染呼叫端資料")

    def test_22_external_image_failures_warn_and_do_not_stop_publication(self):
        """外部照片網路／解碼／網址失敗保留原值且各警告一次，正式同步仍完成。"""
        failed = "https://images.example.test/unavailable.jpg"
        invalid = "https://images.example.test/not-an-image"
        malformed = "https://[invalid-address"
        successful = "https://images.example.test/available.png"
        content = {"version": "external-failures", "settings": {}, "news": [], "photos": {},
                   "blocks": [block("external-failures", 1, style="gallery", photos=[
                       {"id": "external/missing-image", "src": failed, "thumb": failed},
                       {"id": "external/not-an-image", "src": invalid, "thumb": invalid},
                       {"src": successful, "thumb": successful},
                       {"id": "external/malformed", "src": malformed, "thumb": malformed}],
                       data={"entries": [{"photo": malformed}]})]}
        image_data = io.BytesIO()
        self.generator.Image.new("RGB", (32, 24), "white").save(image_data, "PNG")
        def fake_fetch(source, **kwargs):
            if source == failed:
                raise OSError("download unavailable")
            return b"not an image" if source == invalid else image_data.getvalue()
        def fake_tab(name):
            if name == "_meta":
                return [[content["version"], "draft-revision"]]
            self.assertEqual(name, "_published")
            return [[content["version"], 0, json.dumps(content, ensure_ascii=False)]]
        with tempfile.TemporaryDirectory(prefix="baoan-external-failure-") as directory:
            output_root = pathlib.Path(directory)
            (output_root / "blocks.js").write_text(RENDERER.read_text("utf-8"), "utf-8")
            output_json = output_root / "content.json"
            with patch.multiple(self.generator, ROOT=output_root, OUT=output_json,
                                IMG=output_root / "img/u", tab=fake_tab), \
                 patch.object(self.generator, "fetch", side_effect=fake_fetch) as fetched, \
                 contextlib.redirect_stdout(io.StringIO()) as messages:
                self.generator.main()
            output = messages.getvalue()
            self.assertEqual(output.count("WARN"), 3, output)
            self.assertIn(failed, output)
            self.assertIn(invalid, output)
            self.assertIn(malformed, output)
            self.assertIn("UPDATED version=external-failures blocks=1 photos=1", output)
            self.assertEqual(fetched.call_count, 3, "同一個失敗 URL 不應因 src／thumb 重複嘗試")
            saved = json.loads(output_json.read_text("utf-8"))
            photos = saved["blocks"][0]["photos"]
            self.assertEqual(photos[:2], content["blocks"][0]["photos"][:2])
            self.assertEqual(photos[3], content["blocks"][0]["photos"][3])
            self.assertEqual(saved["blocks"][0]["data"]["entries"][0]["photo"], malformed)
            self.assertTrue(photos[2]["src"].startswith("img/u/url-"))
            self.assertTrue((output_root / photos[2]["src"]).exists())
            html = (output_root / "index.html").read_text("utf-8")
            self.assertIn(failed, html)
            self.assertIn(invalid, html)
            self.assertIn(photos[2]["src"], html)

    def test_23_org_defaults_render_all_29_names_by_title(self):
        """組織表逐職稱顯示 29 人、任期與選單，主任獨立突出且二字姓名保留全形空格。"""
        self.assertEqual(len(self.org_roster), 29)
        self.assertTrue(all(set(row) == {"no", "title", "name"} for row in self.org_roster))
        library = next(item for item in renderer("library", {}) if item["style"] == "org")
        self.assertEqual(library["title"], "組織表")
        self.assertEqual(library["description"], "職稱與姓名名單")
        self.assertEqual(len(library["thumbnail"]), 1)
        item = renderer("create", {"style": "org"})
        self.assertEqual(item["title"], "管理委員會組織表")
        self.assertEqual(item["subtitle"], "第八屆")
        self.assertEqual(item["navTitle"], "組織")
        self.assertTrue(item["show"])
        self.assertEqual(item["data"], {"term": "任期 115年7月25日至119年7月24日", "groups": self.org_groups})
        public = self.generated({"blocks": [item]})
        self.assertEqual(public, renderer("preview", {"blocks": [item]}, assetBase=""))
        doc = Document(public).body
        section = doc.findall(id=item["id"])[0]
        self.assertIn("管理委員會組織表", section.text())
        self.assertIn("第八屆（任期 115年7月25日至119年7月24日）", section.text())
        groups = [node for node in section.findall() if "org-group" in (node.attrs.get("class") or "").split()]
        self.assertEqual(len(groups), len(self.org_groups))
        for group, expected in zip(groups, self.org_groups):
            self.assertEqual(group.findall("h3")[0].text().strip(), expected["title"])
            cards = [node for node in group.findall("li") if "org-name" in (node.attrs.get("class") or "").split()]
            self.assertEqual([node.text().strip() for node in cards], expected["names"])
        chairs = [node for node in groups if "org-chair" in (node.attrs.get("class") or "").split()]
        self.assertEqual(len(chairs), 1)
        self.assertIn("駱文章", chairs[0].text())
        self.assertIn("林\u3000生", public)
        self.assertNotIn("林  生", public)
        self.assertEqual(doc.findall("a", href="#" + item["id"])[0].text().strip(), "組織")
        item["data"] = {"term": "任期自訂文字", "groups": [{"title": "自訂職稱", "names": ["王小明", "陳小美"]}]}
        edited = Document(self.generated({"blocks": [item]})).body.text()
        for value in ("任期自訂文字", "自訂職稱", "王小明", "陳小美"):
            self.assertIn(value, edited)
        self.assertNotIn("駱文章", edited)

    def test_24_org_outputs_contain_only_term_titles_and_names(self):
        """組織表公開 JSON、GAS 基準與 HTML 不含個人的住址、電話或性別欄位。"""
        local = json.loads((ROOT / "content.json").read_text("utf-8"))
        gas_defaults = json.loads((PROJECT / "admin" / "block_defaults.html").read_text("utf-8"))
        for source, content in (("遷移預設", self.migrated), ("本機 content.json", local), ("GAS 預設", gas_defaults)):
            with self.subTest(source=source):
                items = [item for item in content["blocks"] if item["style"] == "org"]
                self.assertEqual(len(items), 1)
                item = items[0]
                self.assertEqual(set(item["data"]), {"term", "groups"})
                self.assertEqual(item["data"]["groups"], self.org_groups)
                self.assertTrue(all(set(group) == {"title", "names"} for group in item["data"]["groups"]))
                serialized = json.dumps(item, ensure_ascii=False)
                for private_field in ("住址", "電話", "性別", '"address"', '"phone"', '"gender"', '"sex"'):
                    self.assertNotIn(private_field, serialized)
                # 僅以虛構標記測試拒絕顯示額外個資欄位，不讀取原始含個資的名冊。
                dirty = copy.deepcopy(item)
                for private_field in ("address", "phone", "gender"):
                    dirty["data"][private_field] = "PRIVATE_" + private_field.upper()
                    dirty["data"]["groups"][0][private_field] = "PRIVATE_GROUP_" + private_field.upper()
                rendered = self.generated({"blocks": [dirty]})
                self.assertNotIn("PRIVATE_", rendered)
                section = Document(rendered).body.findall(id=item["id"])[0]
                for private_field in ("住址", "電話", "性別"):
                    self.assertNotIn(private_field, section.text())
                self.assertNotRegex(section.text(), r"0\d{1,3}[- ]\d{3,4}[- ]\d{3,4}")
        published_doc = Document((ROOT / "index.html").read_text("utf-8")).body
        local_org = next(item for item in local["blocks"] if item["style"] == "org")
        published_section = published_doc.findall(id=local_org["id"])[0]
        cards = [node for node in published_section.findall("li") if "org-name" in (node.attrs.get("class") or "").split()]
        self.assertEqual(len(cards), 29, "離線重建正式首頁也須已帶入完整名單")
        for private_field in ("住址", "電話", "性別"):
            self.assertNotIn(private_field, published_section.text())

    def test_25_org_insertion_preserves_existing_blocks_and_falls_back_before_footer(self):
        """補缺僅插入一份組織表，沿革後神明前；缺對應區塊時放頁尾前。"""
        migrated = self.migrated["blocks"]
        styles = [item["style"] for item in sorted(migrated, key=lambda item: item["order"])]
        self.assertEqual(styles.count("org"), 1)
        self.assertLess(styles.index("history"), styles.index("org"))
        self.assertLess(styles.index("org"), styles.index("deity"))
        scenarios = ([block("footer", 90, style="footer"), block("custom", 10)],
                     [block("deity", 60, style="deity"), block("history", 40, style="history"), block("footer", 90, style="footer")])
        for originals in scenarios:
            with self.subTest(styles=[item["style"] for item in originals]):
                upgraded = renderer("ensureOrg", originals)
                self.assertEqual([item for item in upgraded if item["style"] != "org"],
                                 sorted(originals, key=lambda item: item["order"]))
                order = [item["style"] for item in upgraded]
                self.assertEqual(order.count("org"), 1)
                self.assertLess(order.index("org"), order.index("footer"))
                if "history" in order:
                    self.assertEqual(order.index("org"), order.index("history") + 1)
                    self.assertLess(order.index("org"), order.index("deity"))
                self.assertEqual(renderer("ensureOrg", upgraded), upgraded)
        self.assertEqual(renderer("migrate", {"blocks": scenarios[0]}), scenarios[0],
                         "渲染既有正式快照不能順便升級其積木")
        customized = renderer("create", {"style": "org"})
        customized.update(title="廟方自訂的組織表", show=False, order=7,
                          data={"term": "自訂任期", "groups": [{"title": "自訂職稱", "names": ["自訂姓名"]}]})
        existing = [block("footer", 90, style="footer"), customized]
        self.assertEqual(renderer("ensureOrg", existing), existing,
                         "已有 org 時標題、隱藏狀態、姓名、任期及原陣列順序完整保留")

    def test_26_org_first_sheet_migration_and_existing_draft_upgrade_are_safe(self):
        """真正 GAS 首遷帶組織表；既有表只補草稿且保留正式版本與廟方修改，可重入。"""
        first = backend_case(r"""
assert.equal(sheets.has('積木'),false,'情境起始須為沒有積木分頁的舊表');
const first=clone(context.getData());
assert.equal(first.blocks.filter(block=>block.style==='org').length,1,'首次遷移草稿自動帶入組織表');
assert.equal(published().blocks.filter(block=>block.style==='org').length,1,'首次正式基準亦帶入組織表');
const counts=Object.fromEntries([...sheets].map(([name,sheet])=>[name,sheet.rows.length]));
const again=clone(context.getData());
assert.equal(again.draftRevision,first.draftRevision);
for(const [name,count] of Object.entries(counts))assert.equal(sheets.get(name).rows.length,count,name+'重開不能重寫');
assert.deepEqual(forbiddenCalls,[]);
process.stdout.write('PASS 首次遷移自動帶組織表且重開不重複');
""")
        self.assertIn("PASS", first)
        upgrade = backend_case(r"""
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-content.json'),'utf8'));
old.blocks=clone(context.BlockRenderer.migrate(old)).filter(block=>block.style!=='org');
old.blocks[0].title='廟方已改的主視覺';
old.blocks.find(block=>block.style==='deity').show=false;
old.blocks.find(block=>block.style==='history').body='廟方自行編輯的沿革';
old.settings.custom_org_upgrade='保留自訂設定';
old.news=[{title:'尚未發佈的新消息',body:'保留消息內文',show:false}];
const official=clone(old);official.blocks[0].title='既有正式主視覺';
const version='pre-org-publication',revision='pre-org-draft';
official.version=version;
sheets.set('積木',new Sheet('積木',[clone(context.BLOCK_HEADERS)]));
sheets.set('_draft',new Sheet('_draft',[['version','index','json']]));
sheets.set('_published',new Sheet('_published',[['version','index','json']]));
sheets.set('_meta',new Sheet('_meta',[['version','draftRevision'],[version,revision]]));
context.appendDraft_(revision,old);
context.appendSnapshot_('_published',version,official);
const before=clone(context.readDraft_(context.pointers_()));
const officialBefore=clone(published()),publicRows=clone(sheets.get('_published').rows);
const sourceRows=Object.fromEntries(['設定','最新消息','照片'].map(name=>[name,clone(sheets.get(name).rows)]));
const after=clone(context.getData());
assert.equal(after.blocks.filter(block=>block.style==='org').length,1);
assert.notEqual(after.draftRevision,revision,'補缺產生新的草稿版本');
assert.deepEqual(after.blocks.filter(block=>block.style!=='org'),before.blocks,'所有既有積木欄位含順序完整保留');
for(const key of ['settings','news','photos'])assert.deepEqual(after.content[key],before[key],key+'不可覆蓋廟方內容');
assert.equal(metaVersion(),version,'不動正式指標');
assert.deepEqual(published(),officialBefore,'不動既有正式快照內容');
assert.deepEqual(sheets.get('_published').rows,publicRows,'不可追加或改寫正式快照');
for(const [name,rows] of Object.entries(sourceRows))assert.deepEqual(sheets.get(name).rows.slice(0,rows.length),rows,name+'舊列完整保留');
const counts=Object.fromEntries([...sheets].map(([name,sheet])=>[name,sheet.rows.length]));
const again=clone(context.getData());
assert.equal(again.draftRevision,after.draftRevision,'重跑不再新增草稿');
for(const [name,count] of Object.entries(counts))assert.equal(sheets.get(name).rows.length,count,name+'重跑不增加列');
// 完成一次升級後，廟方自行改名／隱藏或刪除皆應受到尊重。
const changed=payload(again),org=changed.blocks.find(block=>block.style==='org');
org.title='廟方自行修改的組織表';org.show=false;org.data.groups[0].names=['廟方更新姓名'];
context.saveDraft(changed,again.draftRevision);
const kept=clone(context.getData());
assert.deepEqual(kept.blocks.find(block=>block.style==='org'),org,'既有組織表不能被預設覆寫');
const removed=payload(kept);removed.blocks=removed.blocks.filter(block=>block.style!=='org');
context.saveDraft(removed,kept.draftRevision);
assert.equal(context.getData().blocks.some(block=>block.style==='org'),false,'廟方刻意刪除後不重新補回');
assert.deepEqual(sheets.get('_published').rows,publicRows);
assert.deepEqual(forbiddenCalls,[]);
process.stdout.write('PASS 舊草稿只補缺一次；正式快照與廟方自訂內容完整保留');
""")
        self.assertIn("PASS", upgrade)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(BlocksTest)
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
