"""Disposable real-server checks; also runs on Windows. Never uses an installed database."""
import os, pathlib, subprocess, sys, tempfile, time, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
exe = pathlib.Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='mina-check-') as tmp:
    args = [str(exe), '--dir', str(pathlib.Path(tmp)/'data'), '--migrationsDir', str(ROOT/'local/pocketbase/pb_migrations')]
    log_path = pathlib.Path(tmp)/'server.log'
    with log_path.open('w+') as log:
        subprocess.run(args + ['migrate', 'up'], stdout=log, stderr=log, check=True)
        subprocess.run(args + ['superuser', 'create', 'admin@example.invalid', 'TemporaryTestPassword_12345!'], stdout=log, stderr=log, check=True)
        server = subprocess.Popen(args + ['serve', '--http', '127.0.0.1:8090', '--publicDir', str(ROOT/'dist-local')], stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen('http://127.0.0.1:8090/api/health', timeout=1); break
                except Exception:
                    if server.poll() is not None: raise RuntimeError('PocketBase stopped')
                    time.sleep(.1)
            else: raise RuntimeError('PocketBase did not start')
            subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'local/pocketbase', '-p', 'test_*.py', '-v'], cwd=ROOT, check=True)
            if '--browser' in sys.argv:
                subprocess.run(['node', 'scripts/check_local_browser.cjs'], cwd=ROOT, check=True)
            print('Local integration checks passed.')
        except Exception:
            log.flush()
            print(log_path.read_text(errors='replace')[-5000:])
            raise
        finally:
            server.terminate()
            try: server.wait(timeout=10)
            except subprocess.TimeoutExpired: server.kill(); server.wait()
