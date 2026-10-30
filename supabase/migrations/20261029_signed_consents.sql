-- Run on a staging Supabase project first, after the patient ownership migration.
-- Storage bucket stays private; no public URLs are granted.
BEGIN;

CREATE TABLE IF NOT EXISTS public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  file_size bigint NOT NULL CHECK (file_size BETWEEN 1 AND 8388608),
  document_type text NOT NULL DEFAULT 'signed_consent' CHECK (document_type = 'signed_consent'),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (patient_id, user_id) REFERENCES public.patients (id, user_id) ON DELETE RESTRICT,
  CHECK (storage_path LIKE user_id::text || '/' || patient_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS patient_documents_owner_patient_idx
  ON public.patient_documents(user_id, patient_id, uploaded_at DESC);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_documents_select_own ON public.patient_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY patient_documents_insert_own ON public.patient_documents
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('patient-consents','patient-consents',false,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY patient_consents_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'patient-consents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = auth.uid()
    ));

CREATE POLICY patient_consents_upload_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-consents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = auth.uid()
    ));

-- Allow clean-up of an uploaded object only when the metadata insert failed.
-- Existing recorded consents cannot be deleted from the client.
CREATE POLICY patient_consents_cleanup_unrecorded ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'patient-consents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (SELECT 1 FROM public.patient_documents d
      WHERE d.storage_path = name AND d.user_id = auth.uid()));

COMMIT;
