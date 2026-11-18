"""Pinned official Caddy binaries for private LAN HTTPS; development only."""
import hashlib
import pathlib
import sys
import tarfile
import urllib.request
import zipfile

VERSION = '2.10.2'
HASHES = {
    'windows_amd64': '9fd1ef9be5d9b05852b66ccc25f96f23d8651bcab20779861a745bdffa273722',
    'linux_amd64': '5c218bc34c9197369263da7e9317a83acdbd80ef45d94dca5eff76e727c67cdd',
}

def download(target, destination):
    destination = pathlib.Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    windows = target.startswith('windows')
    name = 'caddy.exe' if windows else 'caddy'
    extension = 'zip' if windows else 'tar.gz'
    archive = destination / f'caddy_{VERSION}_{target}.{extension}'
    urllib.request.urlretrieve(f'https://github.com/caddyserver/caddy/releases/download/v{VERSION}/{archive.name}', archive)
    try:
        if hashlib.sha256(archive.read_bytes()).hexdigest() != HASHES[target]:
            raise RuntimeError('Caddy checksum mismatch')
        if windows:
            with zipfile.ZipFile(archive) as source:
                for item in [name, 'LICENSE']:
                    (destination / (item if item == name else 'CADDY-LICENSE.txt')).write_bytes(source.read(item))
        else:
            with tarfile.open(archive) as source:
                for item in [name, 'LICENSE']:
                    with source.extractfile(item) as member:
                        (destination / (item if item == name else 'CADDY-LICENSE.txt')).write_bytes(member.read())
        (destination / name).chmod(0o755)
    finally:
        archive.unlink(missing_ok=True)
    return destination / name

if __name__ == '__main__':
    print(download(sys.argv[1], sys.argv[2]))
