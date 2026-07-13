import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { sendOtp, verifyOtp } from '../../../api/onboarding'
import { ApiError } from '../../../api/client'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useOaText } from './oaText'
import type { useAccountOpeningForm } from './useAccountOpeningForm'

type Ctl = ReturnType<typeof useAccountOpeningForm>

export function Step2WhatsappOtp({ ctl }: { ctl: Ctl }) {
  const { t } = useOaText()
  const { form, setField, otp, setOtp, sessionId } = ctl
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sendMutation = useMutation({
    mutationFn: () => sendOtp(sessionId, form.phone.trim()),
    onSuccess: (res) => {
      setError(null)
      setOtp({
        sent: true,
        verified: false,
        demoOtp: res.demo_otp ?? res.fallback_otp ?? null,
        sentPhone: form.phone.trim(),
      })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('err.generic')),
  })

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(sessionId, otp.sentPhone ?? form.phone.trim(), code.trim()),
    onSuccess: (res) => {
      setError(null)
      setOtp({ ...otp, verified: Boolean(res.verified) })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('err.generic')),
  })

  const handleSend = () => {
    if (!form.phone.trim()) {
      setError(t('err.phone_required'))
      return
    }
    sendMutation.mutate()
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
          💬
        </div>
        <h3 className="mt-3 text-lg font-extrabold text-gray-900">{t('p2.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('p2.desc')}</p>
      </div>

      {otp.verified ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
          <span>✓</span> {t('p2.verified')}
        </p>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={t('p2.phone')}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+237 6XX XXX XXX"
              />
            </div>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? t('p2.sending') : otp.sent ? t('p2.resend') : t('p2.send')}
            </Button>
          </div>

          {otp.sent && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600">{t('p2.sent')}</p>
              {otp.demoOtp && (
                <p className="rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-bold tracking-widest text-amber-800">
                  {t('p2.demo')}
                  {otp.demoOtp}
                </p>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={t('p2.code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="••••••"
                    className="tracking-[0.5em]"
                  />
                </div>
                <Button
                  variant="success"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending || code.length !== 6}
                >
                  {verifyMutation.isPending ? t('p2.verifying') : t('p2.verify')}
                </Button>
              </div>
            </div>
          )}
          <p className="text-center text-xs text-gray-400">{t('p2.skip_note')}</p>
        </>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {error}
        </p>
      )}
    </div>
  )
}
