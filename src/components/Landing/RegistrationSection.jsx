import { forwardRef, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import WizardNav from "./components/WizardNav";
import SummaryRow from "./components/SummaryRow";
import ProfileImagePicker from "./components/ProfileImagePicker";

const REGISTRATION_STEPS = [
  { id: 1, label: "Role",      icon: "🎯" },
  { id: 2, label: "Details",   icon: "📝" },
  { id: 3, label: "Committee", icon: "🏛️" },
  { id: 4, label: "Payment",   icon: "💳" },
];

const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-300 bg-[rgba(255,255,255,0.04)] border-[rgba(183,145,67,0.22)] text-[#F8F3EA] placeholder-[#8c6d62] focus:border-[#B79143] focus:ring-2 focus:ring-[rgba(183,145,67,0.15)]`;
const labelCls = `mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#B79143]`;

const RegistrationSection = forwardRef(({
  currentUser, showWizard, wizardSubmitted, wizardStep, selectedRole,
  regStatus, seatInfo, entryFee, wizardLoading,
  formData, setFormData, paymentData, setPaymentData,
  committees, selectedEvent,
  onRoleSelect, onValidateStep, onContinue, onSubmit, onReset,
  profileInputRef, receiptInputRef,
  onProfileImage, onReceiptFile,
  onRefreshSeats,
}, ref) => {
  const C = {
    gold: '#B79143', goldLight: '#D7B46A',
    textPrimary: '#F8F3EA', textSecondary: '#c9b29a', textMuted: '#b89b84', textDim: '#8c6d62',
    bgCard: 'rgba(59,10,20,0.58)', bgDark: 'rgba(15,5,10,0.92)',
    borderGold: 'rgba(183,145,67,0.18)', borderStrong: 'rgba(183,145,67,0.40)', borderFaint: 'rgba(183,145,67,0.12)',
    glowGold: 'rgba(183,145,67,0.16)',
    gradBtn: 'linear-gradient(135deg,#8E6B2F,#B79143,#D7B46A)',
    gradHero: 'linear-gradient(135deg,#8b1a1a,#B79143)',
    gradText: 'linear-gradient(90deg,#B79143,#D7B46A,#B79143)',
  };

  const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
  const isRegistrationOpen = !!(regStatus.open && hasDates && selectedEvent);

  const hasRefreshedSeats = useRef(false);
  
  useEffect(() => {
    if (wizardSubmitted && onRefreshSeats && !hasRefreshedSeats.current) {
      hasRefreshedSeats.current = true;
      onRefreshSeats();
    }
    if (!wizardSubmitted) {
      hasRefreshedSeats.current = false;
    }
  }, [wizardSubmitted, onRefreshSeats]);

  return (
    <section ref={ref} id="register"
      className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 pt-16 sm:pt-16 scroll-mt-5">
      <div className="max-w-5xl w-full mx-auto">
        <div className="text-center mb-4">
          <span className="inline-block text-[10px] tracking-[0.3em] uppercase border-b pb-1 mb-2"
            style={{ color: C.gold, borderColor: C.borderStrong }}>
            Registration
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: C.textPrimary }}>
            Secure Your Spot
          </h2>
        </div>

        {/* Status Cards - Reduced padding */}
        <div className="max-w-2xl mx-auto space-y-2 mb-3">
          {!hasDates && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-center text-xs text-amber-200">
              📅 Event dates are yet to be announced. Registration will open once dates are confirmed.
            </div>
          )}

          {hasDates && !regStatus.open && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-center text-xs text-amber-200">
              {regStatus.message || 'Registration is currently unavailable.'}
            </div>
          )}

          {seatInfo.isFull && seatInfo.totalSeats > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-center text-xs text-red-200">
              🚫 <strong>Delegate seats are fully booked.</strong> Sponsorship registration is still open.
            </div>
          )}

          {seatInfo.totalSeats > 0 && (
            <div className="rounded-lg border px-3 py-2 backdrop-blur-md transition-all duration-500"
              style={{ borderColor: C.borderGold, background: C.bgCard }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[0.65rem] uppercase tracking-wider font-bold" style={{ color: C.gold }}>
                  Live Seats
                </span>
                <span className={`text-xs font-bold transition-all duration-300 ${seatInfo.isFull ? 'text-red-400' : ''}`} 
                  style={{ color: seatInfo.isFull ? undefined : C.goldLight }}>
                  {seatInfo.totalFilled} / {seatInfo.totalSeats}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(183,145,67,0.1)' }}>
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${seatInfo.isFull ? 'bg-red-400' : ''}`}
                  style={{ 
                    width: `${seatInfo.pct}%`, 
                    background: seatInfo.isFull ? undefined : C.gradBtn,
                  }} />
              </div>
            </div>
          )}
        </div>

        {!currentUser && !showWizard && !wizardSubmitted && (
          <div className="rounded-2xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center"
            style={{ background: C.bgCard, borderColor: C.borderGold, boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 80px ${C.glowGold}` }}>
            <div className="text-4xl mb-4">
              {isRegistrationOpen ? '🎪' : '🔒'}
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: C.textPrimary }}>
              {isRegistrationOpen ? 'Ready to Join RYK MUN?' : 'Registration Not Open'}
            </h3>
            <p className="max-w-md mx-auto mb-4 text-sm" style={{ color: C.textSecondary }}>
              {isRegistrationOpen 
                ? 'Sign in or create an account to begin your registration.'
                : !hasDates 
                  ? 'Event dates will be announced soon. Please check back later.'
                  : !regStatus.open
                  ? regStatus.message || 'Registration is currently closed.'
                  : 'Registration is currently unavailable.'
              }
            </p>
            <button 
              onClick={() => {
                if (!isRegistrationOpen) {
                  toast.error(!hasDates 
                    ? 'Event dates are yet to be announced. Registration will open once dates are confirmed.'
                    : regStatus.message || 'Registration is not open yet.'
                  );
                  return;
                }
                onRoleSelect('wizard');
              }}
              disabled={!isRegistrationOpen}
              className={`inline-block text-white font-bold text-sm px-8 py-2.5 rounded-xl tracking-wide transition-all hover:-translate-y-0.5 ${!isRegistrationOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ background: C.gradBtn, boxShadow: `0 4px 24px ${C.glowGold}` }}>
              {isRegistrationOpen ? 'Sign In to Register →' : 'Registration Not Open Yet'}
            </button>
          </div>
        )}

        {(showWizard || wizardSubmitted || (currentUser && isRegistrationOpen)) && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 shadow-2xl"
            style={{ background: C.bgCard, borderColor: C.borderGold, boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 80px ${C.glowGold}` }}>

            {!isRegistrationOpen && !wizardSubmitted && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-center text-xs text-red-200">
                ⚠️ Registration is currently closed. 
                {!hasDates 
                  ? ' Event dates are yet to be announced.' 
                  : ` ${regStatus.message || 'You cannot proceed with registration at this time.'}`
                }
              </div>
            )}

            {/* Wizard Steps - Reduced */}
            {!wizardSubmitted && isRegistrationOpen && (
              <div className="mb-4 overflow-x-auto">
                <div className="flex items-center justify-between max-w-xl mx-auto min-w-[280px] px-1">
                  {REGISTRATION_STEPS.map((step, i) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm sm:text-base font-bold border-2 transition-all duration-500"
                          style={
                            wizardStep > step.id
                              ? { background: C.gradHero, borderColor: C.gold, color: '#fff' }
                              : wizardStep === step.id
                              ? { borderColor: C.gold, background: 'rgba(183,145,67,0.1)', color: C.gold }
                              : { borderColor: C.borderFaint, color: C.textDim }
                          }>
                          {wizardStep > step.id ? '✓' : step.icon}
                        </div>
                        <span className="mt-1 text-[0.55rem] sm:text-[0.6rem] font-bold uppercase tracking-[0.15em] transition-colors duration-300"
                          style={{ color: wizardStep >= step.id ? C.gold : C.textDim }}>
                          {step.label}
                        </span>
                      </div>
                      {i < REGISTRATION_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1 mb-4 sm:mb-5 rounded-full transition-all duration-700"
                          style={{ background: wizardStep > step.id ? C.gradText : C.borderFaint }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Role Selection - Reduced padding */}
            {wizardStep === 1 && !wizardSubmitted && isRegistrationOpen && (
              <div className="animate-fadeIn">
                <h3 className="text-base sm:text-lg font-bold text-center mb-4" style={{ color: C.textPrimary }}>
                  Choose Your Registration Type
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {[
                    { role: 'delegate', icon: '🧑‍💼', title: 'Delegate', desc: 'Join a committee, represent a nation, and engage in diplomatic debate.', disabled: seatInfo.isFull && seatInfo.totalSeats > 0 },
                    { role: 'sponsor', icon: '🏢', title: 'Sponsor', desc: 'Support the conference as an organizational partner and gain visibility.', disabled: false },
                  ].map(({ role, icon, title, desc, disabled }) => (
                    <button key={role}
                      onClick={() => onRoleSelect(role)}
                      className={`group rounded-xl border p-4 text-center transition-all duration-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                      style={{ borderColor: C.borderGold, background: C.bgDark }}>
                      <div className="text-3xl mb-2 transform transition-transform group-hover:scale-110 duration-300">{icon}</div>
                      <div className="text-base font-bold mb-1" style={{ color: C.textPrimary }}>{title}</div>
                      <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>{desc}</p>
                      {disabled ? (
                        <div className="mt-2 inline-block px-3 py-1 rounded-full border text-xs font-semibold text-red-300 border-red-400/40 bg-red-500/10">🚫 Seats Full</div>
                      ) : (
                        <div className="mt-2 inline-block px-3 py-1 rounded-full border text-xs font-semibold" style={{ borderColor: C.borderStrong, color: C.gold }}>Select Role →</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Personal Info - Reduced */}
            {wizardStep === 2 && !wizardSubmitted && isRegistrationOpen && (
              <div className="animate-fadeIn">
                <h3 className="text-base sm:text-lg font-bold text-center mb-4" style={{ color: C.textPrimary }}>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {[
                      { lbl: 'Full Name *',     ph: 'John Smith',       key: 'fullName', type: 'text'  },
                      { lbl: 'Email Address *', ph: 'john@example.com', key: 'email',    type: 'email' },
                      { lbl: 'Phone Number *',  ph: '+92 300 0000000',  key: 'phone',    type: 'text'  },
                    ].map(({ lbl, ph, key, type }) => (
                      <div key={key}>
                        <label className={labelCls}>{lbl}</label>
                        <input className={inputCls} type={type} placeholder={ph}
                          value={formData[key]}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <ProfileImagePicker
                        value={{ file: formData.profileImage, preview: formData.profilePreview }}
                        onChange={(file, preview) => setFormData({ ...formData, profileImage: file, profilePreview: preview })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CNIC</label>
                      <input className={inputCls} placeholder="XXXXX-XXXXXXX-X"
                        value={formData.cnic} onChange={e => setFormData({ ...formData, cnic: e.target.value })} />
                    </div>
                  </div>
                </div>
                <WizardNav onBack={() => onValidateStep('back')} onNext={() => onValidateStep(2)} />
              </div>
            )}

            {/* Step 3: Committee - Reduced */}
            {wizardStep === 3 && !wizardSubmitted && isRegistrationOpen && (
              <div className="animate-fadeIn">
                <h3 className="text-base sm:text-lg font-bold text-center mb-1" style={{ color: C.textPrimary }}>
                  {selectedRole === 'delegate' ? 'Select Your Committee' : 'Sponsorship Package'}
                </h3>
                <p className="text-center text-xs mb-4" style={{ color: C.textSecondary }}>
                  {selectedRole === 'delegate' ? 'Choose the committee where you want to make an impact.' : 'Select your preferred sponsorship level.'}
                </p>

                {selectedRole === 'delegate' ? (
                  <>
                    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                      {committees.length > 0 ? committees.map(c => (
                        <button key={c.id} onClick={() => setFormData({ ...formData, committee: c.id, countryPersonality: '' })}
                          className="rounded-lg border p-3 text-left transition-all duration-300"
                          style={{
                            borderColor: formData.committee === c.id ? C.gold : C.borderGold,
                            background: formData.committee === c.id
                              ? 'linear-gradient(135deg, rgba(183,145,67,0.12), rgba(139,26,26,0.08))'
                              : C.bgDark,
                          }}>
                          <div className="text-xs font-bold mb-0.5" style={{ color: C.gold }}>{c.abbr || c.name?.slice(0, 4)?.toUpperCase()}</div>
                          <div className="text-xs font-bold mb-1" style={{ color: C.textPrimary }}>{c.name}</div>
                          {c.topic && <div className="text-[0.6rem] leading-relaxed italic" style={{ color: C.textMuted }}>{c.topic}</div>}
                          {formData.committee === c.id && <div className="mt-2 text-xs font-bold" style={{ color: C.gold }}>✓ Selected</div>}
                        </button>
                      )) : (
                        <div className="col-span-full text-center py-8" style={{ color: C.textSecondary }}>Loading committees…</div>
                      )}
                    </div>

                    {formData.committee && (
                      <div className="max-w-lg mx-auto mb-1 animate-fadeIn">
                        <label className={labelCls}>
                          Country / Personality *
                        </label>
                        <input
                          className={inputCls}
                          type="text"
                          placeholder="e.g. United States, Angela Merkel, Elon Musk…"
                          value={formData.countryPersonality || ''}
                          onChange={e => setFormData({ ...formData, countryPersonality: e.target.value })}
                          required
                        />
                        <p className="mt-1 text-[0.6rem]" style={{ color: C.textDim }}>
                          Enter the country or personality you wish to represent.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="max-w-xl mx-auto space-y-2">
                    {selectedEvent?.sponsorPackages?.map?.((pkg, i) => (
                      <button key={i} onClick={() => setFormData({ ...formData, committee: pkg.name })}
                        className="w-full rounded-lg border p-3 flex justify-between items-center transition-all duration-300"
                        style={{
                          borderColor: formData.committee === pkg.name ? C.gold : C.borderGold,
                          background: formData.committee === pkg.name
                            ? 'linear-gradient(90deg, rgba(183,145,67,0.12), rgba(139,26,26,0.08))' : C.bgDark,
                        }}>
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-bold" style={{ color: C.textPrimary }}>{pkg.name}</div>
                          <div className="text-xs" style={{ color: C.textSecondary }}>{pkg.details}</div>
                        </div>
                        <div className="text-base font-bold" style={{ color: C.gold }}>PKR {pkg.amount?.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                )}
                <WizardNav 
                  onBack={() => onValidateStep('back')} 
                  onNext={() => {
                    if (selectedRole === 'delegate' && formData.committee && !formData.countryPersonality?.trim()) {
                      toast.error('Please enter the country or personality you wish to represent.');
                      return;
                    }
                    onContinue();
                  }} 
                  nextLabel="Continue to Payment →" 
                />
              </div>
            )}

            {/* Step 4: Payment - Reduced */}
            {wizardStep === 4 && !wizardSubmitted && isRegistrationOpen && (
              <div className="animate-fadeIn">
                <h3 className="text-base sm:text-lg font-bold text-center mb-4" style={{ color: C.textPrimary }}>
                  Complete Payment
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3"
                      style={{ background: 'linear-gradient(135deg, rgba(183,145,67,0.08), rgba(139,26,26,0.05))', borderColor: C.borderStrong }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gold }}>Registration Summary</h4>
                      <div className="space-y-1.5 text-xs">
                        <SummaryRow label="Role" value={selectedRole === 'delegate' ? '🧑‍💼 Delegate' : '🏢 Sponsor'} />
                        <SummaryRow label="Name" value={formData.fullName} />
                        {selectedRole === 'delegate' && formData.committee && (
                          <SummaryRow label="Committee" value={committees.find(c => c.id === formData.committee)?.name || 'Selected'} />
                        )}
                        {selectedRole === 'delegate' && formData.countryPersonality && (
                          <SummaryRow label="Country / Personality" value={formData.countryPersonality} />
                        )}
                        <div className="border-t pt-2 mt-2" style={{ borderColor: C.borderFaint }}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm" style={{ color: C.gold }}>Total Amount</span>
                            <span className="text-lg font-bold" style={{ color: C.goldLight }}>
                              PKR {Number(entryFee).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Payment Method</label>
                      <div className="grid gap-1.5">
                        {[
                          { key: 'bank',      label: 'Bank Transfer', icon: '🏦', detail: selectedEvent?.bankAccount,  name: selectedEvent?.bankName      },
                          { key: 'jazzcash',  label: 'JazzCash',      icon: '💛', detail: selectedEvent?.jazzCash,     name: selectedEvent?.jazzCashName  },
                          { key: 'easypaisa', label: 'EasyPaisa',     icon: '💚', detail: selectedEvent?.easyPaisa,    name: selectedEvent?.easyPaisaName },
                        ].filter(m => m.detail).map(m => (
                          <button key={m.key} onClick={() => setPaymentData({ ...paymentData, method: m })}
                            className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all duration-300"
                            style={{
                              borderColor: paymentData.method?.key === m.key ? C.gold : C.borderGold,
                              background: paymentData.method?.key === m.key
                                ? 'linear-gradient(90deg, rgba(183,145,67,0.08), rgba(139,26,26,0.04))' : C.bgDark,
                            }}>
                            <span className="text-lg">{m.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs" style={{ color: C.textPrimary }}>{m.label}</div>
                              {m.name && <div className="text-[0.6rem]" style={{ color: C.textMuted }}>{m.name}</div>}
                              <div className="text-[0.6rem] font-mono mt-0.5 truncate" style={{ color: C.goldLight }}>{m.detail}</div>
                            </div>
                            {paymentData.method?.key === m.key && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.gold }}><span className="text-white text-xs">✓</span></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Payment Screenshot *</label>
                      <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" onChange={onReceiptFile} />
                      {paymentData.receiptPreview ? (
                        <div>
                          <img src={paymentData.receiptPreview} alt="Receipt" className="w-full rounded-lg object-contain max-h-[160px]" style={{ border: `1px solid ${C.borderStrong}`, background: 'rgba(0,0,0,0.3)' }} />
                          <button onClick={() => { setPaymentData({ ...paymentData, receiptFile: null, receiptPreview: null }); if (receiptInputRef.current) receiptInputRef.current.value = ''; }}
                            className="mt-1 text-xs text-red-400 hover:text-red-300 transition-colors">Remove screenshot</button>
                        </div>
                      ) : (
                        <button onClick={() => receiptInputRef.current?.click()}
                          className="w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all hover:opacity-80"
                          style={{ borderColor: C.borderStrong, background: 'rgba(183,145,67,0.03)' }}>
                          <div className="text-2xl mb-1">📎</div>
                          <div className="text-sm font-semibold" style={{ color: C.gold }}>Upload Payment Receipt</div>
                          <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>JPG, PNG, or PDF</div>
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-200/90">
                      ⚠️ Your registration will be <strong>pending</strong> until admin verifies your payment.
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons - Minimized gap */}
                <div className="flex justify-between items-center mt-4">
                  <button onClick={() => onValidateStep('back')} className="text-sm px-3 py-1.5 transition-colors hover:opacity-80" style={{ color: C.textSecondary }}>← Back</button>
                  <button onClick={onSubmit} disabled={wizardLoading}
                    className="px-6 py-2.5 rounded-lg font-bold text-white text-sm tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: C.gradBtn, boxShadow: `0 4px 20px ${C.glowGold}` }}>
                    {wizardLoading
                      ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                      : 'Submit Registration ✦'}
                  </button>
                </div>
              </div>
            )}

            {/* Success State - Reduced */}
            {wizardSubmitted && (
              <div className="animate-fadeIn text-center py-6">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: C.gradBtn }} />
                  <div className="absolute inset-2 rounded-full border-2 opacity-40"
                    style={{ borderColor: C.gold }} />
                  <div className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,rgba(183,145,67,0.2),rgba(139,26,26,0.15))', border: `2px solid ${C.gold}` }}>
                    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
                      <path d="M11 21l6 6 12-13" stroke={C.goldLight} strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2" style={{ color: C.textPrimary }}>
                  Registration Submitted!
                </h3>
                <p className="max-w-sm mx-auto mb-2 text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                  Your registration is <strong style={{ color: C.goldLight }}>pending approval</strong>.
                </p>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-4 text-[0.6rem] font-bold uppercase tracking-widest"
                  style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  Awaiting Payment Verification
                </div>

                <div className="flex gap-2 justify-center items-center">
                  <button
                    onClick={onReset}
                    className="px-6 py-2 rounded-lg font-bold text-white text-sm tracking-wide transition-all duration-300 hover:-translate-y-0.5"
                    style={{ background: C.gradBtn }}>
                    ✓ OK
                  </button>
                  <button
                    onClick={() => window.location.href = '/my-payments'}
                    className="px-5 py-2 rounded-lg font-bold text-sm tracking-wide border-2 transition-all hover:opacity-80"
                    style={{ color: C.gold, borderColor: C.borderStrong }}>
                    View My Registrations
                  </button>
                  <button
                    onClick={onReset}
                    className="px-5 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-70"
                    style={{ color: C.textMuted }}>
                    Register Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

RegistrationSection.displayName = 'RegistrationSection';
export default RegistrationSection;