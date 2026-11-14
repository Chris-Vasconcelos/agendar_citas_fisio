migrate((app) => {
  // Isolated proof of concept; NEVER use production clinical data.
  const users = new Collection({
    type:"auth", name:"mina_operators", listRule:null,
    viewRule:"id = @request.auth.id", createRule:null, updateRule:null, deleteRule:null,
    authRule:"", manageRule:null,
    passwordAuth:{enabled:true,identityFields:["email"]},
    fields:[{name:"display_name",type:"text",max:120}]
  });
  app.save(users);

  const read = "owner = @request.auth.id && @request.auth.id != ''";
  const create = "@request.auth.id != '' && owner = @request.auth.id";
  const update = read + " && @request.body.owner:changed = false";
  const ownerField = {name:"owner",type:"relation",collectionId:users.id,required:true,maxSelect:1,cascadeDelete:false};

  const patients = new Collection({
    type:"base", name:"mina_patients", listRule:read,viewRule:read,
    createRule:create,updateRule:update,deleteRule:null,
    fields:[
      ownerField,
      {name:"full_name",type:"text",required:true,min:3,max:200},
      {name:"age",type:"number",required:true,min:0,max:120,onlyInt:true},
      {name:"phone",type:"text",required:true,min:7,max:32},
      {name:"email_address",type:"email"},
      {name:"allergies",type:"text",max:4000},
      {name:"previous_studies",type:"text",max:4000},
      {name:"family_history",type:"text",max:4000},
      {name:"consultation_reason",type:"text",required:true,min:3,max:4000},
      {name:"privacy_consent",type:"bool",required:true},
      {name:"privacy_consent_at",type:"date"},
      {name:"archived_at",type:"date"}
    ],
    indexes:["CREATE INDEX idx_mina_patient_owner_name ON mina_patients (owner,full_name)"]
  });
  app.save(patients);

  const appts = new Collection({
    type:"base",name:"mina_appointments",listRule:read,viewRule:read,
    createRule:create+" && patient.owner = @request.auth.id",
    updateRule:update+" && patient.owner = @request.auth.id",deleteRule:null,
    fields:[
      ownerField,
      {name:"patient",type:"relation",collectionId:patients.id,required:true,maxSelect:1,cascadeDelete:false},
      {name:"slot_number",type:"number",required:true,min:1,max:2,onlyInt:true},
      {name:"start_time",type:"date",required:true},
      {name:"end_time",type:"date",required:true},
      {name:"status",type:"select",required:true,maxSelect:1,values:["scheduled","completed","cancelled","no_show"]},
      {name:"patient_condition",type:"text",max:8000},
      {name:"treatment_notes",type:"text",max:8000},
      {name:"professional_name",type:"text",max:200}
    ],
    indexes:["CREATE INDEX idx_mina_appt_owner_start ON mina_appointments (owner,start_time)"]
  });
  app.save(appts);

  const avail = new Collection({
    type:"base",name:"mina_availability",listRule:read,viewRule:read,
    createRule:create,updateRule:update,deleteRule:null,
    fields:[
      ownerField,{name:"day_of_week",type:"number",required:true,min:0,max:6,onlyInt:true},
      {name:"start_time",type:"text",required:true},
      {name:"end_time",type:"text",required:true},
      {name:"slot_duration_minutes",type:"number",required:true,min:15,max:240,onlyInt:true},
      {name:"is_active",type:"bool"}
    ],
    indexes:["CREATE UNIQUE INDEX idx_mina_availability_owner_day ON mina_availability (owner,day_of_week)"]
  });
  app.save(avail);

  const docs = new Collection({
    type:"base",name:"mina_patient_documents",
    listRule:read,viewRule:read,
    createRule:create+" && patient.owner = @request.auth.id",
    updateRule:null,deleteRule:null,
    fields:[
      ownerField,
      {name:"patient",type:"relation",collectionId:patients.id,required:true,maxSelect:1,cascadeDelete:false},
      {name:"signed_consent",type:"file",required:true,maxSelect:1,
       maxSize:8388608,mimeTypes:["image/jpeg","image/png","image/webp"],protected:true},
      {name:"document_type",type:"select",required:true,maxSelect:1,values:["signed_consent"]}
    ]
  });
  app.save(docs);

  // Database triggers prevent race conditions, not just browser-side checks.
  for (const operation of ["INSERT","UPDATE"]) {
    const isUpdate=operation==="UPDATE";
    const other=isUpdate?"a.id != OLD.id AND ":"";
    const onAction=isUpdate?"UPDATE OF owner,patient,slot_number,start_time,end_time,status":"INSERT";
    app.db().newQuery(`
      CREATE TRIGGER mina_appointments_guard_${operation.toLowerCase()}
      BEFORE ${onAction} ON mina_appointments
      BEGIN
        SELECT RAISE(ABORT,'mina_invalid_appointment')
          WHERE NEW.start_time='' OR NEW.end_time='' OR NEW.start_time>=NEW.end_time OR NEW.slot_number NOT IN (1,2);
        SELECT RAISE(ABORT,'mina_patient_owner_mismatch') WHERE NOT EXISTS(
          SELECT 1 FROM mina_patients p WHERE p.id=NEW.patient AND p.owner=NEW.owner
        );
        SELECT RAISE(ABORT,'mina_slot_overlap') WHERE NEW.status!='cancelled' AND EXISTS(
          SELECT 1 FROM mina_appointments a WHERE ${other}a.owner=NEW.owner
            AND a.slot_number=NEW.slot_number AND a.status!='cancelled'
            AND NEW.start_time<a.end_time AND a.start_time<NEW.end_time
        );
        SELECT RAISE(ABORT,'mina_patient_overlap') WHERE NEW.status!='cancelled' AND EXISTS(
          SELECT 1 FROM mina_appointments a WHERE ${other}a.owner=NEW.owner
            AND a.patient=NEW.patient AND a.status!='cancelled'
            AND NEW.start_time<a.end_time AND a.start_time<NEW.end_time
        );
      END
    `).execute();
  }
  app.db().newQuery("CREATE TRIGGER mina_patients_no_delete BEFORE DELETE ON mina_patients BEGIN SELECT RAISE(ABORT,'mina_archive_instead'); END").execute();
  app.db().newQuery("CREATE TRIGGER mina_documents_no_delete BEFORE DELETE ON mina_patient_documents BEGIN SELECT RAISE(ABORT,'mina_document_immutable'); END").execute();
  app.db().newQuery("CREATE TRIGGER mina_patients_no_transfer BEFORE UPDATE OF owner ON mina_patients WHEN NEW.owner != OLD.owner BEGIN SELECT RAISE(ABORT,'mina_owner_immutable'); END").execute();
}, (app) => {
  for (const name of ["mina_patient_documents","mina_availability","mina_appointments","mina_patients","mina_operators"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  }
});