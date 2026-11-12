"""Build a portable Windows x64 package; no Node/Python needed on the consultorio PC."""
import pathlib, shutil, subprocess, tempfile
from get_pocketbase import download
from get_age import download as download_age
from get_caddy import download as download_caddy
ROOT=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='mina-package-') as temp:
    package=pathlib.Path(temp)/'MINA-Local'; package.mkdir()
    download('windows_amd64', package)
    download_age('windows-amd64', package)
    download_caddy('windows_amd64', package)
    shutil.copytree(ROOT/'dist-local',package/'web')
    shutil.copytree(ROOT/'local/pocketbase/pb_migrations',package/'pb_migrations')
    for path in (ROOT/'local/windows').iterdir():
        if path.is_file(): shutil.copy2(path,package/path.name)
    shutil.copy2(ROOT/'docs/mina-local-windows.md',package/'LEEME.md')
    import json
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    (package/'version.json').write_text(json.dumps({'commit':commit,'pocketbase':'0.40.6','age':'1.2.1','caddy':'2.10.2'},indent=2),encoding='utf-8')
    output=ROOT/'local-release'; output.mkdir(exist_ok=True)
    archive=shutil.make_archive(str(output/'MINA-Local-Windows-x64'),'zip',temp,'MINA-Local')
    print(archive)
