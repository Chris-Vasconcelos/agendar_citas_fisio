migrate((app) => {
  // Atomic compare-and-swap in SQLite, including two simultaneous HTTP updates.
  for (const name of ['mina_patients', 'mina_appointments', 'mina_availability', 'mina_appointment_reminders']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new TextField({ name: 'write_version', max: 64 }));
    collection.fields.add(new TextField({ name: 'previous_version', max: 64 }));
    app.save(collection);
    app.db().newQuery(`UPDATE ${name} SET write_version=lower(hex(randomblob(16)))`).execute();
    app.db().newQuery(`CREATE TRIGGER ${name}_write_version BEFORE UPDATE ON ${name} BEGIN
      SELECT RAISE(ABORT,'mina_stale_write') WHERE NEW.previous_version != OLD.write_version
        OR length(NEW.write_version) != 36 OR NEW.write_version = OLD.write_version;
      END`).execute();
  }
}, (app) => {
  throw new Error('Restore a complete verified backup; do not remove write-version protection from clinical records.');
});
