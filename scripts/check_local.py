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
        if '--backup' in sys.argv:
            # Snapshot only after the server is fully stopped, including storage and settings.
            restored = pathlib.Path(tmp)/'restored'
            age_dir = pathlib.Path(os.environ['MINA_TEST_AGE_DIR']).resolve()
            suffix = '.exe' if os.name == 'nt' else ''
            env = dict(os.environ, MINA_TEST_RESTORED=str(restored))
            subprocess.run([os.environ.get('MINA_TEST_PWSH','pwsh'), '-NoProfile', '-File', str(ROOT/'scripts/test_backup.ps1'),
                '-Age', str(age_dir/('age'+suffix)), '-Keygen', str(age_dir/('age-keygen'+suffix)),
                '-SourceData', str(pathlib.Path(tmp)/'data')], cwd=ROOT, env=env, check=True)
            recovered = subprocess.Popen([str(exe), 'serve', '--http', '127.0.0.1:8090', '--dir', str(restored/'pb_data'),
                '--migrationsDir', str(restored/'pb_migrations'), '--publicDir', str(ROOT/'dist-local')], stdout=log, stderr=log)
            try:
                for _ in range(100):
                    try:
                        urllib.request.urlopen('http://127.0.0.1:8090/api/health', timeout=1); break
                    except Exception:
                        if recovered.poll() is not None: raise RuntimeError('Restored PocketBase stopped')
                        time.sleep(.1)
                else: raise RuntimeError('Restored PocketBase did not start')
                sys.path.insert(0, str(ROOT/'local/pocketbase'))
                from test_api import request, collection, OWNER_PASSWORD
                code, auth = request('POST','/api/collections/mina_operators/auth-with-password', {
                    'identity':'mina-owner-1@example.invalid','password':OWNER_PASSWORD})
                assert code == 200, 'Restored operator cannot sign in'
                code, patients = request('GET', collection('mina_patients'), token=auth['token'])
                assert code == 200 and patients['totalItems'] >= 3, 'Restored patients missing'
                code, docs = request('GET', collection('mina_patient_documents'), token=auth['token'])
                assert code == 200 and docs['totalItems'] >= 1, 'Restored photograph metadata missing'
                code, file_token = request('POST','/api/files/token', token=auth['token'])
                assert code == 200
                doc = docs['items'][0]
                url = 'http://127.0.0.1:8090/api/files/mina_patient_documents/' + doc['id'] + '/' + doc['signed_consent'] + '?token=' + file_token['token']
                with urllib.request.urlopen(url, timeout=5) as image:
                    assert image.read().startswith(b'\x89PNG'), 'Restored private photograph cannot be opened'
                if '--browser' in sys.argv:
                    code, appts = request('GET', collection('mina_appointments'), token=auth['token'])
                    assert code == 200 and any(a['treatment_notes'] == 'Tratamiento ficticio verificado por navegador.' for a in appts['items']), 'Restored clinical note missing'
                print('Restored PocketBase PASS: operator login, patient records, private photograph and clinical notes.')
            finally:
                recovered.terminate()
                try: recovered.wait(timeout=10)
                except subprocess.TimeoutExpired: recovered.kill(); recovered.wait()
