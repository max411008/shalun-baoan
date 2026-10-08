#!/usr/bin/env python3
"""後台試算表 → 網站 content.json＋照片（由 GitHub Actions 定時跑）。

輸入：後台試算表（知道連結者可檢視）四個分頁的 CSV（最新消息第 5 欄＝該則照片的檔案ID，逗號分隔）、照片雲端檔（知道連結者可檢視）。
判定：_meta 的 version 跟現有 content.json 一樣就什麼都不做；不一樣才重建。
出口：content.json、img/u/<檔案ID>.jpg（大圖 1600px）與 <檔案ID>_t.jpg（縮圖 480px）；被刪的照片檔一併移除。
"""
import csv, io, json, os, pathlib, sys, urllib.parse, urllib.request

from PIL import Image, ImageOps

SS_ID = "1PyqEiOok9VLcnw8nVtFOAMvjy6TP8EaDR4WdsJN9iys"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content.json"
IMG = ROOT / "img" / "u"


def fetch(url, tries=3, want=None):
    last = None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
                ctype = r.headers.get("Content-Type", "")
                if want and want not in ctype:
                    raise RuntimeError(f"非預期內容 {ctype}（試算表還沒開放檢視、或照片不是公開？）")
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
    raise last


def tab(name):
    url = f"https://docs.google.com/spreadsheets/d/{SS_ID}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(name)}"
    rows = list(csv.reader(io.StringIO(fetch(url, want="text/csv").decode("utf-8"))))
    return rows[1:] if rows else []


def save_photo(fid):
    big, thumb = IMG / f"{fid}.jpg", IMG / f"{fid}_t.jpg"
    if big.exists() and thumb.exists():
        return True
    try:
        data = fetch(f"https://drive.google.com/uc?export=download&id={urllib.parse.quote(fid)}", want="image/")
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception as e:  # noqa: BLE001
        print(f"SKIP {fid}: {e}", file=sys.stderr)
        return False
    IMG.mkdir(parents=True, exist_ok=True)
    a = im.copy(); a.thumbnail((1600, 1600)); a.save(big, "JPEG", quality=82, optimize=True, progressive=True)
    b = im.copy(); b.thumbnail((480, 480)); b.save(thumb, "JPEG", quality=75, optimize=True, progressive=True)
    return True


def main():
    try:
        meta = tab("_meta")
    except Exception as e:  # noqa: BLE001
        print(f"SHEET_NOT_READY {e}")  # 後台還沒初始化：什麼都不動，等下一輪
        return
    version = meta[0][0].strip() if meta and meta[0] else ""
    old = json.loads(OUT.read_text("utf-8")) if OUT.exists() else {}
    if not version or version == old.get("version"):
        print(f"NO_CHANGE version={version or '-'}")
        return
    settings = {r[0]: r[2].strip() for r in tab("設定") if len(r) >= 3 and r[0]}
    news = [{"date": r[0].strip().lstrip("'"), "title": r[1].strip(), "body": r[2].strip(),
             "ids": [x.strip() for x in (r[4] if len(r) >= 5 else "").split(",") if x.strip()][:9]}
            for r in tab("最新消息") if len(r) >= 4 and r[1].strip() and r[3].strip() != "否"]
    news.sort(key=lambda n: n["date"], reverse=True)
    photos, keep = {}, set()
    for n in news:  # 最新消息的照片（每則最多 9 張，網站點進該則才顯示）
        n["photos"] = []
        for fid in n.pop("ids"):
            if save_photo(fid):
                keep.add(fid)
                n["photos"].append({"src": f"img/u/{fid}.jpg", "thumb": f"img/u/{fid}_t.jpg"})
    rows = [r for r in tab("照片") if len(r) >= 6 and r[0].strip()]
    rows.sort(key=lambda r: float(r[5] or 0))
    for r in rows:
        fid, sec, cap, show = r[0].strip(), r[1].strip(), r[2].strip(), r[4].strip() != "否"
        if not show:
            continue
        if save_photo(fid):
            keep.add(fid)
            photos.setdefault(sec, []).append({"src": f"img/u/{fid}.jpg", "thumb": f"img/u/{fid}_t.jpg", "caption": cap})
    if IMG.exists():
        for f in IMG.glob("*.jpg"):
            if f.stem.removesuffix("_t") not in keep:
                f.unlink()
    OUT.write_text(json.dumps({"version": version, "settings": settings, "news": news, "photos": photos},
                              ensure_ascii=False, indent=1), "utf-8")
    print(f"UPDATED version={version} news={len(news)} photos={len(keep)}")


if __name__ == "__main__":
    main()
