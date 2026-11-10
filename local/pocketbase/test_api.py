"""Disposable PocketBase API integration test. Fictitious data only."""
import json
import os
import urllib.error
import urllib.request
import unittest

BASE = "http://127.0.0.1:8090"
ADMIN_EMAIL = "admin@example.invalid"
ADMIN_PASSWORD = "TemporaryTestPassword_12345!"
OWNER_PASSWORD = "PrototypePassword_123456!"

def request(method,path,body=None,token=None):
    headers = {"Accept":"application/json"}
    if token: headers["Authorization"] = token
    if body is not None: headers["Content-Type"] = "application/json"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE+path,headers=headers,data=data,method=method)
    try:
        with urllib.request.urlopen(req,timeout=8) as res:
            return res.status,json.load(res)
    except urllib.error.HTTPError as e:
        try: payload=json.load(e)
        except Exception: payload={}
        return e.code,payload

def collection(name):
    return "/api/collections/"+name+"/records"

class LocalApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        code, admin = request("POST","/api/collections/_superusers/auth-with-password", {
          "identity":ADMIN_EMAIL,"password":ADMIN_PASSWORD})
        if code != 200: raise RuntimeError("Superuser login failed: "+str(code))
        supertoken=admin["token"]
        cls.tokens=[]
        cls.owners=[]
        for index in [1,2]:
            email="mina-owner-"+str(index)+"@example.invalid"
            code,user=request("POST",collection("mina_operators"),{
              "email":email,"password":OWNER_PASSWORD,"passwordConfirm":OWNER_PASSWORD
            },supertoken)
            if code != 200: raise RuntimeError("Operator creation failed: "+str(code)+" "+str(user))
            cls.owners.append(user["id"])
            code,login=request("POST","/api/collections/mina_operators/auth-with-password",{
              "identity":email,"password":OWNER_PASSWORD})
            if code != 200: raise RuntimeError("Operator login failed: "+str(code))
            cls.tokens.append(login["token"])
        cls.patients=[]
        for i in range(3):
            code,p=request("POST",collection("mina_patients"),{
              "owner":cls.owners[0],"full_name":"Paciente Ficticio Numero "+str(i+1),
              "age":25,"phone":"7220000001","consultation_reason":"Evaluación ficticia",
              "privacy_consent":True
            },cls.tokens[0])
            if code != 200: raise RuntimeError("Patient create failed: "+str(code)+" "+str(p))
            cls.patients.append(p["id"])
    def test_anonymous_cannot_list_or_create(self):
        code,data=request("GET",collection("mina_patients"))
        self.assertEqual(code,200)
        self.assertEqual(data["totalItems"],0)
        code,data=request("POST",collection("mina_operators"),{
          "email":"rogue@example.invalid","password":OWNER_PASSWORD,"passwordConfirm":OWNER_PASSWORD})
        self.assertNotEqual(code,200)
    def test_cross_owner_view_denied(self):
        code,_=request("GET",collection("mina_patients")+"/"+self.patients[0],token=self.tokens[1])
        self.assertNotEqual(code,200)
        code,data=request("GET",collection("mina_patients")+"?perPage=100",token=self.tokens[1])
        self.assertEqual(code,200)
        self.assertEqual(data["totalItems"],0)
    def test_cannot_create_patient_for_another_operator(self):
        code,_=request("POST",collection("mina_patients"),{
          "owner":self.owners[1],"full_name":"Ficticio Prohibido","age":25,
          "phone":"7220000001","consultation_reason":"Prueba","privacy_consent":True
        },self.tokens[0])
        self.assertNotEqual(code,200)
    def test_two_spaces_reject_overlap_and_cancel_releases(self):
        start="2026-12-09 15:00:00.000Z"
        end="2026-12-09 16:00:00.000Z"
        def book(patient,slot,s=start,e=end):
            return request("POST",collection("mina_appointments"),{
              "owner":self.owners[0],"patient":patient,"slot_number":slot,
              "start_time":s,"end_time":e,"status":"scheduled"
            },self.tokens[0])
        code,a=book(self.patients[0],1); self.assertEqual(code,200,a)
        code,b=book(self.patients[1],2); self.assertEqual(code,200,b)
        code,_=book(self.patients[2],1,"2026-12-09 15:30:00.000Z","2026-12-09 16:30:00.000Z")
        self.assertNotEqual(code,200)
        code,_=book(self.patients[0],2)
        self.assertNotEqual(code,200)
        code,_=request("PATCH",collection("mina_appointments")+"/"+b["id"],{
          "slot_number":1
        },self.tokens[0])
        self.assertNotEqual(code,200)
        code,_=request("PATCH",collection("mina_appointments")+"/"+a["id"],{
          "status":"cancelled"
        },self.tokens[0])
        self.assertEqual(code,200)
        code,_=book(self.patients[2],1)
        self.assertEqual(code,200)
    def test_no_patient_delete(self):
        code,_=request("DELETE",collection("mina_patients")+"/"+self.patients[0],token=self.tokens[0])
        self.assertNotEqual(code,200)

if __name__ == "__main__":
    unittest.main()
