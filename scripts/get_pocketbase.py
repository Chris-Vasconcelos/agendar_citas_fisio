"""Download the pinned official PocketBase release and verify its published SHA-256."""
import hashlib, pathlib, sys, urllib.request, zipfile
VERSION='0.40.6'
HASHES={
 'linux_amd64':'0e1f609158ed945f809f8a02ae012aa0427129c66ebb63c1aee76f2c0309373f',
 'windows_amd64':'33a2a1d255cadded77346fc7f5de37dca21ba4bad0d9cae0235a50b3b703d6d9',
}
def download(target, destination):
    name=f'pocketbase_{VERSION}_{target}.zip'
    destination=pathlib.Path(destination); destination.mkdir(parents=True,exist_ok=True)
    archive=destination/name
    urllib.request.urlretrieve(f'https://github.com/pocketbase/pocketbase/releases/download/v{VERSION}/{name}',archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=HASHES[target]:
        archive.unlink(); raise RuntimeError('PocketBase checksum mismatch')
    with zipfile.ZipFile(archive) as z:
        for name in ['pocketbase.exe' if target.startswith('windows') else 'pocketbase','LICENSE.md']:
            if name in z.namelist(): z.extract(name,destination)
    archive.unlink()
    exe=destination/('pocketbase.exe' if target.startswith('windows') else 'pocketbase')
    exe.chmod(0o755)
    return exe
if __name__=='__main__': print(download(sys.argv[1],sys.argv[2]))
