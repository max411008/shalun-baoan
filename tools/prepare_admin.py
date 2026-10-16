#!/usr/bin/env python3
"""把唯一 renderer 同步成 GAS 可用檔案；僅寫本機，不連雲端。"""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
ADMIN = ROOT.parent / 'admin'


def main():
    source = (ROOT / 'blocks.js').read_text('utf-8')
    # Use the checked-in last public content as the first-run published baseline.
    content = json.loads((ROOT / 'content.json').read_text('utf-8'))
    blocks = subprocess.run(['node', '-e', "const R=require(process.argv[1]);let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.stringify(R.migrate(JSON.parse(s)))));", str(ROOT / 'blocks.js')], input=json.dumps(content, ensure_ascii=False), text=True, capture_output=True, check=True)
    content['blocks'] = json.loads(blocks.stdout)
    (ADMIN / 'BlockRenderer.gs').write_text(source, 'utf-8')
    (ADMIN / 'block_renderer.html').write_text('<script>\n' + source.replace('</script', '<\\/script') + '\n</script>\n', 'utf-8')
    (ADMIN / 'block_defaults.html').write_text(json.dumps(content, ensure_ascii=False, indent=1), 'utf-8')
    print('PREPARED admin/BlockRenderer.gs admin/block_renderer.html admin/block_defaults.html')


if __name__ == '__main__':
    main()
