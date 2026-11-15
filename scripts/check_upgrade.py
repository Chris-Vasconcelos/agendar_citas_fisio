"""Upgrade the preceding schema with fictitious records; never uses installed data."""
import base64, hashlib, json, pathlib, shutil, subprocess, sys, tempfile, time, urllib.request, uuid
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'local/pocketbase'))
import test_api as api
api.BASE = 'http://127.0.0.1:8091'
exe = str(pathlib.Path(sys.argv[1]).resolve())
with tempfile.TemporaryDirectory(prefix='mina-schema-upgrade-') as temp:
    work=pathlib.Path(temp); data=work/'data'; old=work/'old-migrations'; old.mkdir()
    migrations=ROOT/'local/pocketbase/pb_migrations'
    for path in migrations.glob('*.js'):
        if path.name < '1794787200_write_versions.js': shutil.copy2(path, old/path.name)
    log=(work/'server.log').open('w+')
    def cli(folder,*command):
        subprocess.run([exe,'--dir',str(data),'--migrationsDir',str(folder),*command],stdout=log,stderr=log,check=True)
    def start(folder):
        p=subprocess.Popen([exe,'--dir',str(data),'--migrationsDir',str(folder),'serve','--http','127.0.0.1:8091'],stdout=log,stderr=log)
        for _ in range(100):
            if p.poll() is not None: raise RuntimeError('Upgrade fixture stopped')
            try: urllib.request.urlopen(api.BASE+'/api/health',timeout=1); return p
            except Exception: time.sleep(.1)
        p.terminate(); p.wait(); raise RuntimeError('Upgrade fixture did not start')
    def stop(p):
        p.terminate()
        try: p.wait(timeout=10)
        except subprocess.TimeoutExpired: p.kill(); p.wait()
    def create(name,body,token):
        code,record=api.request('POST',api.collection(name),body,token)
        assert code==200,(name,code,record)
        return record
    cli(old,'migrate','up');cli(old,'superuser','create',api.ADMIN_EMAIL,api.ADMIN_PASSWORD)
    server=start(old)
    try:
        code,admin=api.request('POST','/api/collections/_superusers/auth-with-password',{'identity':api.ADMIN_EMAIL,'password':api.ADMIN_PASSWORD});assert code==200
        operator=create('mina_operators',{'email':'upgrade@example.invalid','password':api.OWNER_PASSWORD,'passwordConfirm':api.OWNER_PASSWORD},admin['token'])
        code,login=api.request('POST','/api/collections/mina_operators/auth-with-password',{'identity':'upgrade@example.invalid','password':api.OWNER_PASSWORD});assert code==200
        token=login['token']; owner=operator['id']
        patient=create('mina_patients',{'owner':owner,'full_name':'Paciente Ficticio Actualizacion','age':0,'phone':'7225550188','consultation_reason':'Evaluacion ficticia','privacy_consent':True},token)
        appointment=create('mina_appointments',{'owner':owner,'patient':patient['id'],'slot_number':1,'start_time':'2032-01-04 16:00:00Z','end_time':'2032-01-04 17:00:00Z','status':'completed','treatment_notes':'Nota ficticia anterior a la actualizacion'},token)
        hours=create('mina_availability',{'owner':owner,'day_of_week':0,'start_time':'08:00','end_time':'13:00','slot_duration_minutes':60,'is_active':True},token)
        reminder=create('mina_appointment_reminders',{'owner':owner,'appointment':appointment['id'],'appointment_start_time':appointment['start_time'],'status':'confirmed_sent'},token)
        boundary='upgrade-'+uuid.uuid4().hex
        photo=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=')
        body=b''
        for key,value in {'owner':owner,'patient':patient['id'],'document_type':'signed_consent'}.items():
            body+=(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n').encode()
        body+=(f'--{boundary}\r\nContent-Disposition: form-data; name="signed_consent"; filename="before.png"\r\nContent-Type: image/png\r\n\r\n').encode()+photo+(f'\r\n--{boundary}--\r\n').encode()
        req=urllib.request.Request(api.BASE+api.collection('mina_patient_documents'),data=body,headers={'Authorization':token,'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
        with urllib.request.urlopen(req) as response: document=json.load(response)

    finally: stop(server)
    # The actual storage tree must survive migration, including arbitrary stored bytes.
    image=data/'storage'/'upgrade-test'/'photo.png'; image.parent.mkdir(parents=True,exist_ok=True)
    image.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII='))
    digest=hashlib.sha256(image.read_bytes()).hexdigest()
    cli(migrations,'migrate','up')
    server=start(migrations)
    try:
        for name,record,field in [('mina_patients',patient,'full_name'),('mina_appointments',appointment,'treatment_notes'),('mina_availability',hours,'day_of_week'),('mina_appointment_reminders',reminder,'status')]:
            code,current=api.request('GET',api.collection(name)+'/'+record['id'],token=token)
            assert code==200 and current[field]==record[field],(name,code,current)
            assert current['write_version']
        assert hashlib.sha256(image.read_bytes()).hexdigest()==digest
        code,stored=api.request('GET',api.collection('mina_patient_documents')+'/'+document['id'],token=token);assert code==200
        code,file_token=api.request('POST','/api/files/token',token=token);assert code==200
        with urllib.request.urlopen(api.BASE+'/api/files/mina_patient_documents/'+document['id']+'/'+stored['signed_consent']+'?token='+file_token['token']) as response: assert response.read()==photo

        path=api.collection('mina_patients')+'/'+patient['id']
        code,_=api.request('PATCH',path,{'phone':'7225550189','previous_version':'','write_version':str(uuid.uuid4())},token)
        assert code!=200,'Old client was allowed to overwrite a migrated record'
        code,current=api.request('GET',path,token=token);assert code==200
        code,saved=api.request('PATCH',path,{'phone':'7225550189','previous_version':current['write_version'],'write_version':str(uuid.uuid4())},token)
        assert code==200 and saved['phone']=='7225550189'
        print('Upgrade PASS: previous schema records/notes/Sunday/reminders/storage retained; versions backfilled; old write rejected and versioned edit accepted.')
    finally: stop(server);log.close()
