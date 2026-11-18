"""Verify real TLS with an explicit temporary CA; never disables certificate validation."""
import json
import hashlib
import shutil
import os
import pathlib
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]

def check(caddy, snapshot=None, source_state=None):
    with tempfile.TemporaryDirectory(prefix='mina-https-') as temp:
        temp = pathlib.Path(temp)
        data = temp/'data'
        expected_ca = None
        if source_state:
            state = pathlib.Path(source_state)
            previous_roots = list(state.rglob('root.crt'))
            assert len(previous_roots) == 1, 'Restored CA missing or ambiguous'
            expected_ca = hashlib.sha256(previous_roots[0].read_bytes()).hexdigest()
            shutil.copytree(state, data)
        config = temp/'Caddyfile'
        command = ". './local/windows/Celular-Comun.ps1'; New-MinaCaddyConfig -Address 127.0.0.1 -Port 18443 -LoopbackTest"
        generated = subprocess.check_output([os.environ.get('MINA_TEST_PWSH','pwsh'),'-NoProfile','-Command',command],cwd=ROOT,text=True)
        config.write_text(generated,encoding='ascii')
        env = dict(os.environ, XDG_DATA_HOME=str(temp/'data'), XDG_CONFIG_HOME=str(temp/'config'))
        passed = False
        with (temp/'caddy.log').open('w+') as log:
            server = subprocess.Popen([str(pathlib.Path(caddy).resolve()),'run','--config',str(config),'--adapter','caddyfile'],env=env,stdout=log,stderr=log)
            try:
                for _ in range(100):
                    roots = list((temp/'data').rglob('root.crt'))
                    if roots:
                        context = ssl.create_default_context(cafile=str(roots[0]))
                        try:
                            urllib.request.urlopen('https://127.0.0.1:18443/api/health',context=context,timeout=1)
                            break
                        except OSError: pass
                    if server.poll() is not None: raise RuntimeError('HTTPS server exited')
                    time.sleep(.1)
                else: raise RuntimeError('HTTPS did not start')
                assert len(roots) == 1, 'Unexpected CA layout'
                for name in ['root.key', 'intermediate.key', 'intermediate.crt']:
                    assert (roots[0].parent/name).is_file(), 'Private CA state absent from configured storage'
                if expected_ca:
                    assert hashlib.sha256(roots[0].read_bytes()).hexdigest() == expected_ca, 'Restore silently generated a different CA'
                relative = roots[0].parent.relative_to(data).as_posix()
                print('CA storage PASS: public/private CA files under configured data root at '+relative+'; '+('original CA retained after restore.' if expected_ca else 'temporary test CA only.'))
                def request(path, body=None, token=None):
                    headers = {'Content-Type':'application/json'}
                    if token: headers['Authorization'] = token
                    req = urllib.request.Request('https://127.0.0.1:18443'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
                    try:
                        with urllib.request.urlopen(req,context=context,timeout=5) as response:
                            return response.status,response.read(),response.headers
                    except urllib.error.HTTPError as error:
                        return error.code,error.read(),error.headers
                # Trusting this specific CA must work; the default trust store must reject it.
                try:
                    urllib.request.urlopen('https://127.0.0.1:18443/api/health',timeout=3)
                except urllib.error.URLError as error:
                    assert isinstance(error.reason, ssl.SSLCertVerificationError), 'The negative TLS check failed for a reason other than certificate verification'
                else: raise AssertionError('Temporary CA unexpectedly trusted by default')
                code, content, headers = request('/')
                assert code == 200 and b'<div id="root">' in content
                assert headers['Cache-Control'] == 'no-store'
                for path in ['/_/','/api/collections','/api/collections/_superusers/auth-with-password','/api/settings','/api/backups','/api/logs','/api/crons']:
                    code, _, _ = request(path)
                    assert code == 404, (path,code)
                code, anonymous, _ = request('/api/collections/mina_patients/records')
                assert code == 200 and json.loads(anonymous)['totalItems'] == 0
                code, auth, _ = request('/api/collections/mina_operators/auth-with-password',{'identity':'mina-owner-1@example.invalid','password':'PrototypePassword_123456!'})
                assert code == 200
                token = json.loads(auth)['token']
                code, patients, _ = request('/api/collections/mina_patients/records',token=token)
                assert code == 200 and json.loads(patients)['totalItems'] >= 3
                code, docs, _ = request('/api/collections/mina_patient_documents/records',token=token)
                assert code == 200
                doc = json.loads(docs)['items'][0]
                path = '/api/files/mina_patient_documents/'+doc['id']+'/'+doc['signed_consent']
                assert request(path)[0] != 200, 'Private photograph exposed over HTTPS'
                code, file_token, _ = request('/api/files/token',{},token)
                assert code == 200
                code, photo, _ = request(path+'?token='+json.loads(file_token)['token'])
                assert code == 200 and photo.startswith(b'\x89PNG')
                passed = True
                print('HTTPS PASS: verified CA and IP, untrusted certificate rejection, original UI, anonymous denial, operator login, private photo and blocked administration.')
            except Exception:
                log.flush(); print((temp/'caddy.log').read_text(errors='replace')[-3000:]); raise
            finally:
                server.terminate()
                try: server.wait(timeout=10)
                except subprocess.TimeoutExpired: server.kill(); server.wait()
                if passed and snapshot: shutil.copytree(data, pathlib.Path(snapshot))

if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('caddy')
    parser.add_argument('--snapshot')
    parser.add_argument('--state')
    args=parser.parse_args()
    check(args.caddy, args.snapshot, args.state)
