"""Pinned official age binaries for portable encrypted backups (development only)."""
import hashlib
import pathlib
import sys
import tarfile
import urllib.request
import zipfile

VERSION = '1.2.1'
HASHES = {
    'windows-amd64': '46db0db71f146061f7c8fffa912cb806aef1bc8450e27a3abc1744f0591b89fb',
    'linux-amd64': '7df45a6cc87d4da11cc03a539a7470c15b1041ab2b396af088fe9990f7c79d50',
}

def download(target, destination):
    destination = pathlib.Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    windows = target.startswith('windows')
    extension = 'zip' if windows else 'tar.gz'
    archive = destination / f'age-v{VERSION}-{target}.{extension}'
    urllib.request.urlretrieve(f'https://github.com/FiloSottile/age/releases/download/v{VERSION}/{archive.name}', archive)
    try:
        if hashlib.sha256(archive.read_bytes()).hexdigest() != HASHES[target]:
            raise RuntimeError('age checksum mismatch')
        names = ['age.exe', 'age-keygen.exe'] if windows else ['age', 'age-keygen']
        if windows:
            with zipfile.ZipFile(archive) as source:
                for name in names:
                    (destination / name).write_bytes(source.read('age/' + name))
        else:
            with tarfile.open(archive) as source:
                for name in names:
                    with source.extractfile('age/' + name) as member:
                        (destination / name).write_bytes(member.read())
        for name in names:
            (destination / name).chmod(0o755)
    finally:
        archive.unlink(missing_ok=True)
    return destination / names[0]

if __name__ == '__main__':
    print(download(sys.argv[1], sys.argv[2]))
