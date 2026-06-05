// src/components/User/PaymentFlow.jsx
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const inputCls =
  'w-full rounded border border-gold/25 bg-black/40 px-4 py-3 text-sm text-gold-pale placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20';
const labelCls = 'mb-2 block text-[0.65rem] font-bold uppercase tracking-widest text-gold';

export default function PaymentFlow({ event, registrationType, onBack, onSubmit, loading, name }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileRef = useRef();

  const paymentMethods = [];
  if (event?.bankAccount)
    paymentMethods.push({
      key: 'bank',
      label: 'Bank Transfer',
      icon: '🏦',
      detail: event.bankAccount,
      detailLabel: 'Account Number',
    });
  if (event?.jazzCash)
    paymentMethods.push({
      key: 'jazzcash',
      label: 'JazzCash',
      icon: '💛',
      detail: event.jazzCash,
      detailLabel: 'JazzCash Number',
    });
  if (event?.easyPaisa)
    paymentMethods.push({
      key: 'easypaisa',
      label: 'EasyPaisa',
      icon: '💚',
      detail: event.easyPaisa,
      detailLabel: 'EasyPaisa Number',
    });

  if (paymentMethods.length === 0) {
    paymentMethods.push({
      key: 'bank',
      label: 'Bank Transfer',
      icon: '🏦',
      detail: 'Contact admin for payment details',
      detailLabel: 'Instructions',
    });
  }

  function handleReceiptSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function handleSubmit() {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    onSubmit({
      method: selectedMethod.label,
      receiptFile: receiptFile || null,
      amount: parseFloat(amount) || 0,
    });
  }

  const selected = paymentMethods.find(m => m.key === selectedMethod?.key);

  return (
    <div className="max-w-[640px] animate-fade-in">
      <h3 className="mb-2 text-base font-semibold text-gold-pale">💰 Payment</h3>
      <p className="mb-6 text-sm text-muted">
        Complete payment for <strong className="text-gold">{name}</strong> — {registrationType} registration at{' '}
        <strong className="text-gold">{event?.name}</strong>
      </p>

      <div className="mb-6">
        <label className={labelCls}>Select Payment Method</label>
        <div className="flex flex-col gap-3">
          {paymentMethods.map(method => {
            const active = selectedMethod?.key === method.key;
            return (
              <button
                type="button"
                key={method.key}
                onClick={() => setSelectedMethod(method)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition ${
                  active
                    ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(201,168,76,0.35)]'
                    : 'border-gold/25 hover:border-gold/50 hover:bg-gold/5'
                }`}
              >
                <span className="text-2xl">{method.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gold-pale">{method.label}</div>
                </div>
                {active && <span className="text-xl text-gold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedMethod && (
        <div className="mb-6 animate-fade-in rounded-lg border border-gold/20 bg-gold/10 p-4">
          <div className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-gold">{selected?.detailLabel}</div>
          <div className="font-mono text-lg tracking-wide text-gold-bright">{selected?.detail}</div>
          <p className="mt-2 text-xs text-muted">
            Please transfer the registration fee. You can upload the payment screenshot below (optional for now).
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className={labelCls}>Amount Paid (PKR)</label>
        <input className={inputCls} type="number" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      <div className="mb-6">
        <label className={labelCls}>
          Payment Screenshot / Receipt <span className="font-normal normal-case text-muted">(Optional)</span>
        </label>

        <input type="file" ref={fileRef} accept="image/*,application/pdf" onChange={handleReceiptSelect} className="hidden" />

        {receiptPreview ? (
          <div>
            <img
              src={receiptPreview}
              alt="Receipt"
              className="mt-2 max-h-[200px] max-w-full rounded border border-gold/30 object-contain"
            />
            <button
              type="button"
              className="mt-2 rounded-md border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10"
              onClick={() => {
                setReceiptFile(null);
                setReceiptPreview(null);
                fileRef.current.value = '';
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="mt-1 w-full cursor-pointer rounded-lg border-2 border-dashed border-gold/30 bg-black/20 p-8 text-center transition hover:border-gold/50 hover:bg-gold/5"
          >
            <div className="mb-2 text-3xl">📎</div>
            <div className="text-sm font-semibold text-gold">Upload Payment Receipt (Optional)</div>
            <div className="mt-2 text-xs text-muted">JPG, PNG, or PDF</div>
          </button>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        ⚠️ Your registration status will be <strong>&quot;Payment Pending&quot;</strong> until an admin reviews your payment (if receipt is
        provided).
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          type="button"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-maroon-deep transition hover:bg-gold-light disabled:opacity-50"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting…' : 'Submit Registration →'}
        </button>
      </div>
    </div>
  );
}
