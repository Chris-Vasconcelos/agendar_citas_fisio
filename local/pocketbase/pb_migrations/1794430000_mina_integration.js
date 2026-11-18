migrate((app) => {
  // Additive migration: keep existing fictitious records and original migration intact.
  for (const name of ['mina_patients', 'mina_appointments', 'mina_availability', 'mina_patient_documents']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }));
    collection.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }));
    // PocketBase required number fields reject zero, which is valid for age and Sunday.
    if (name === 'mina_patients') collection.fields.getByName('age').required = false;
    if (name === 'mina_availability') {
      collection.fields.getByName('day_of_week').required = false;
      for (const field of ['start_time', 'end_time']) {
        collection.fields.getByName(field).pattern = '^([01][0-9]|2[0-3]):[0-5][0-9]$';
      }
    }
    app.save(collection);
  }
  for (const operation of ['INSERT', 'UPDATE']) {
    app.db().newQuery(`CREATE TRIGGER mina_availability_order_${operation.toLowerCase()}
      BEFORE ${operation} ON mina_availability BEGIN
      SELECT RAISE(ABORT,'mina_invalid_hours') WHERE NEW.start_time >= NEW.end_time;
      END`).execute();
  }
  const operators = app.findCollectionByNameOrId('mina_operators');
  const appointments = app.findCollectionByNameOrId('mina_appointments');
  const read = "@request.auth.id != '' && owner = @request.auth.id";
  app.save(new Collection({
    name: 'mina_appointment_reminders', type: 'base',
    listRule: read, viewRule: read,
    createRule: read + ' && appointment.owner = @request.auth.id',
    updateRule: read + ' && @request.body.owner:changed = false && @request.body.appointment:changed = false',
    deleteRule: null,
    fields: [
      { name: 'owner', type: 'relation', collectionId: operators.id, required: true, maxSelect: 1 },
      { name: 'appointment', type: 'relation', collectionId: appointments.id, required: true, maxSelect: 1 },
      { name: 'appointment_start_time', type: 'date', required: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['opened','confirmed_sent'] },
      { name: 'opened_at', type: 'date' }, { name: 'confirmed_at', type: 'date' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_mina_reminder_appointment ON mina_appointment_reminders (owner,appointment)'],
  }));
}, (app) => {
  // Do not roll back a clinical schema destructively. Restore a verified full backup instead.
  throw new Error('Restore a complete backup to roll back this migration.');
});
