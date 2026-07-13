import { useRef } from 'react'
import { runOcr } from '../../../api/onboarding'
import { Badge } from '../../../components/ui/Badge'
import { requiredDocumentsFor } from './constants'
import type { RequiredDocument } from './constants'
import { useOaText } from './oaText'
import type { CapturedDoc, DocOcrStatus, useAccountOpeningForm } from './useAccountOpeningForm'

type Ctl = ReturnType<typeof useAccountOpeningForm>

function ocrStatusView(status: DocOcrStatus, t: (k: string) => string) {
  switch (status) {
    case 'running':
      return <span className="text-xs text-gray-500">{t('p4.ocr_running')}</span>
    case 'done':
      return <span className="text-xs font-semibold text-emerald-600">{t('p4.ocr_done')}</span>
    case 'partial':
      return <span className="text-xs text-gray-500">{t('p4.ocr_partial')}</span>
    case 'error':
      return <span className="text-xs text-amber-600">{t('p4.ocr_error')}</span>
    default:
      return null
  }
}

function DocumentTile({
  doc,
  captured,
  onFile,
  t,
}: {
  doc: RequiredDocument
  captured: CapturedDoc | undefined
  onFile: (doc: RequiredDocument, file: File) => void
  t: (k: string) => string
}) {
  const { lang } = useOaText()
  const cameraRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(doc, file)
    e.target.value = ''
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{doc.label[lang]}</h4>
          <p className="mt-0.5 text-xs text-gray-500">{doc.hint[lang]}</p>
        </div>
        <Badge tone={doc.required ? 'red' : 'gray'}>
          {doc.required ? t('p4.required') : t('p4.optional')}
        </Badge>
      </div>

      {captured && (
        <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-gray-100">
          {captured.isImage ? (
            <img src={captured.previewUrl} alt={doc.label[lang]} className="h-40 w-full object-contain bg-gray-50" />
          ) : (
            <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-500">
              {captured.file.name}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handle}
        />
        <input ref={importRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-afriland px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-afriland-dark"
        >
          📷 {captured ? t('p4.replace') : t('p4.capture')}
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50"
        >
          📎 {t('p4.import')}
        </button>
        <span className="ml-auto">{ocrStatusView(captured?.ocrStatus ?? 'idle', t)}</span>
      </div>
    </div>
  )
}

export function Step4Documents({ ctl }: { ctl: Ctl }) {
  const { t } = useOaText()
  const { form, docs, setDoc, updateDocStatus, applyOcrFields, sessionId } = ctl

  const requiredDocs = form.account_type ? requiredDocumentsFor(form.account_type) : []

  const handleFile = async (doc: RequiredDocument, file: File) => {
    const isImage = file.type.startsWith('image/')
    const captured: CapturedDoc = {
      file,
      previewUrl: URL.createObjectURL(file),
      isImage,
      ocrStatus: doc.isIdentity && isImage ? 'running' : 'idle',
    }
    setDoc(doc.key, captured)

    // OCR + préremplissage pour les pièces d'identité uniquement.
    if (doc.isIdentity && isImage) {
      try {
        const documentType = form.identity_type || "Carte nationale d'identité"
        const result = await runOcr(file, documentType, form.account_type || 'INDIVIDUAL', sessionId)
        const applied = applyOcrFields(result.extracted_fields ?? {})
        updateDocStatus(doc.key, applied ? 'done' : 'partial')
      } catch {
        updateDocStatus(doc.key, 'error')
      }
    }
  }

  if (!form.account_type) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-700 ring-1 ring-inset ring-amber-100">
        {t('p4.no_account_type')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">{t('p4.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('p4.desc')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {requiredDocs.map((doc) => (
          <DocumentTile key={doc.key} doc={doc} captured={docs[doc.key]} onFile={handleFile} t={t} />
        ))}
      </div>
    </div>
  )
}
