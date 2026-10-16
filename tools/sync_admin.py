#!/usr/bin/env python3
"""正式快照 → content.json、index.html、照片；草稿永遠不作為新版輸入。

舊後台尚未部署時，仍相容舊四分頁。新版以 _meta.version 最後一次成功
發佈的 _published chunks 為準；讀取失敗保留原站，不退回讀草稿。
HTML 唯一渲染來源為 blocks.js（同後台預覽）。Node.js 18+ / Python 3.10+。
"""
import copy
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

from PIL import Image, ImageOps

SS_ID = '1PyqEiOok9VLcnw8nVtFOAMvjy6TP8EaDR4WdsJN9iys'
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'content.json'
IMG = ROOT / 'img' / 'u'


def fetch(url, tries=3, want=None):
    last = None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as response:
                ctype = response.headers.get('Content-Type', '')
                if want and want not in ctype:
                    raise RuntimeError(f'非預期內容 {ctype}（試算表或照片未開放檢視？）')
                return response.read()
        except Exception as exc:
            last = exc
    raise last


def tab(name):
    url = f'https://docs.google.com/spreadsheets/d/{SS_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(name)}'
    rows = list(csv.reader(io.StringIO(fetch(url, want='text/csv').decode('utf-8'))))
    return rows[1:] if rows else []


def atomic_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as handle:
            tmp = handle.name
            handle.write(data)
        os.replace(tmp, path)
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)


def build_page(content, output_path=None):
    """Build with exactly the preview renderer, optionally writing one HTML file."""
    result = subprocess.run(
        ['node', '-e', "const R=require(process.argv[1]);let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(R.renderDocument(JSON.parse(s),{assetBase:''})));", str(ROOT / 'blocks.js')],
        input=json.dumps(content, ensure_ascii=False), text=True, capture_output=True, check=True,
    )
    if output_path is not None:
        target = Path(output_path)
        if not target.exists() or target.read_text('utf-8') != result.stdout:
            atomic_write(target, result.stdout)
    return result.stdout


def save_photo(fid, source=None):
    if not re.fullmatch(r'[A-Za-z0-9_-]{5,200}', fid):
        raise ValueError('照片檔案 ID 格式不正確')
    big, thumb = IMG / f'{fid}.jpg', IMG / f'{fid}_t.jpg'
    if big.exists() and thumb.exists():
        return True
    data = fetch(source or f'https://drive.google.com/uc?export=download&id={urllib.parse.quote(fid)}', want='image/')
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
    IMG.mkdir(parents=True, exist_ok=True)
    a = image.copy()
    a.thumbnail((1600, 1600))
    a.save(big, 'JPEG', quality=82, optimize=True, progressive=True)
    b = image.copy()
    b.thumbnail((480, 480))
    b.save(thumb, 'JPEG', quality=75, optimize=True, progressive=True)
    return True


def published_snapshot(version):
    rows = [r for r in tab('_published') if len(r) >= 3 and r[0].lstrip("'") == version]
    if not rows:
        raise ValueError('找不到本次正式快照；保留原網站')
    rows.sort(key=lambda r: int(r[1]))
    if [int(r[1]) for r in rows] != list(range(len(rows))):
        raise ValueError('正式快照不完整；保留原網站')
    content = json.loads(''.join(r[2] for r in rows))
    if str(content.get('version', '')).lstrip("'") != version:
        raise ValueError('正式快照版本不符')
    if not isinstance(content.get('blocks'), list) or not isinstance(content.get('settings'), dict):
        raise ValueError('正式快照欄位不完整')
    return content


def legacy_snapshot(version):
    """Only used while the old, one-column _meta backend is still deployed."""
    settings = {r[0]: r[2].strip() for r in tab('設定') if len(r) >= 3 and r[0]}
    news = [{'date': r[0].strip().lstrip("'"), 'title': r[1].strip(), 'body': r[2].strip(),
             'photos': [{'id': x.strip()} for x in (r[4] if len(r) >= 5 else '').split(',') if x.strip()][:9],
             'pin': len(r) >= 6 and r[5].strip() == '是'}
            for r in tab('最新消息') if len(r) >= 4 and r[1].strip() and r[3].strip() != '否']
    photos = {}
    rows = [r for r in tab('照片') if len(r) >= 6 and r[0].strip() and r[4].strip() != '否']
    rows.sort(key=lambda r: float(r[5] or 0))
    for r in rows:
        photos.setdefault(r[1].strip(), []).append({'id': r[0].strip(), 'caption': r[2].strip()})
    return {'version': version, 'settings': settings, 'news': news, 'photos': photos}


def localize_photos(content):
    """Copy published image assets. Retain old assets for safe rollback."""
    content = copy.deepcopy(content)
    seen = set()
    external = {}

    def store(fid, source=None):
        if fid not in seen:
            if not (save_photo(fid, source) if source else save_photo(fid)):
                raise RuntimeError(f'照片下載失敗：{fid}')
            seen.add(fid)

    def external_url(source, thumb=False):
        if not re.match(r'^https?://', source, re.I):
            return source
        if source not in external:
            fid = 'url-' + hashlib.sha256(source.encode('utf-8')).hexdigest()
            try:
                if urllib.parse.urlparse(source).hostname == 'drive.google.com':
                    return source
                store(fid, source)
                external[source] = fid
            except Exception as exc:
                external[source] = None
                print(f'WARN 外部照片下載失敗，保留原網址：{source} ({exc})')
        fid = external[source]
        return f'img/u/{fid}{"_t" if thumb else ""}.jpg' if fid else source

    def drive_id(source):
        try:
            parsed = urllib.parse.urlparse(source)
        except ValueError:
            return None
        if parsed.hostname != 'drive.google.com':
            return None
        query_id = urllib.parse.parse_qs(parsed.query).get('id', [None])[0]
        match = re.search(r'/file/d/([A-Za-z0-9_-]+)', parsed.path)
        return query_id or (match.group(1) if match else None)

    def has_external_source(value):
        source = value.get('src') or value.get('thumb')
        if not isinstance(source, str) or not re.match(r'^https?://', source, re.I):
            return False
        try:
            return urllib.parse.urlparse(source).hostname != 'drive.google.com'
        except ValueError:
            return True  # Let external_url warn and preserve a malformed URL.

    def walk(value, photo_list=False):
        if isinstance(value, dict):
            # Block IDs and IDs attached to external URLs are not Drive photo IDs.
            if value.get('id') and 'style' not in value and not has_external_source(value) and ('src' in value or 'thumb' in value or set(value) <= {'id', 'caption', 'show', 'order'}):
                fid = str(value['id'])
                store(fid)
                value.update(src=f'img/u/{fid}.jpg', thumb=f'img/u/{fid}_t.jpg')
            for key, item in value.items():
                # Inscription editors retain one original-photo URL per entry.
                if key in {'src', 'thumb', 'photo'} and isinstance(item, str):
                    fid = drive_id(item) if key == 'photo' else None
                    if fid:
                        store(fid)
                        value[key] = f'img/u/{fid}.jpg'
                    else:
                        value[key] = external_url(item, thumb=key == 'thumb')
                walk(item, photo_list or key == 'photos')
        elif isinstance(value, list):
            for index, item in enumerate(value):
                if photo_list and isinstance(item, str):
                    value[index] = external_url(item)
                else:
                    walk(item, photo_list)
    walk(content)
    return content, len(seen)


def main():
    old = json.loads(OUT.read_text('utf-8')) if OUT.exists() else {}
    try:
        meta = tab('_meta')
    except Exception as exc:
        print(f'SHEET_NOT_READY {exc}')
        return
    version = meta[0][0].strip().lstrip("'") if meta and meta[0] else ''
    if not version or version == old.get('version'):
        if old:
            build_page(old, ROOT / 'index.html')  # renderer updates need no new publication
        print(f'NO_CHANGE version={version or "-"}')
        return
    # Presence of the revision column marks the draft/published schema.
    modern = bool(meta and len(meta[0]) >= 2 and meta[0][1])
    content = published_snapshot(version) if modern else legacy_snapshot(version)
    content, count = localize_photos(content)
    page = build_page(content)  # finish all validation before touching current outputs
    atomic_write(ROOT / 'index.html', page)
    atomic_write(OUT, json.dumps(content, ensure_ascii=False, indent=1))
    print(f'UPDATED version={version} blocks={len(content.get("blocks", []))} photos={count}')


if __name__ == '__main__':
    main()
