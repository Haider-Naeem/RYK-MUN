import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { DelegateMobileBar, adminPadClass } from '../Shared/Sidebar';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cachedCollection, keysToCamel } from '../../utils/cache';
import toast from 'react-hot-toast';
import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';
const PANEL_BG = 'rgba(68,7,19,0.58)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const BORDER_GOLD_STRONG = 'rgba(183,145,67,0.3)';

// FIXED: Card validity check using event dates
function isCardValid(reg) {
  // Use the event dates that we fetched and merged
  const endDate = reg.eventEndDate || reg.eventStartDate;
  
  console.log('Card validation for', reg.id, ':', {
    eventEndDate: reg.eventEndDate,
    eventStartDate: reg.eventStartDate,
    eventName: reg.eventName
  });
  
  if (!endDate) {
    console.warn('No end date found for card:', reg.id);
    return true; // If no dates available, assume valid
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const isValid = now <= end;
  console.log('Card valid?', isValid, '| Now:', now.toISOString(), '| End:', end.toISOString());
  
  return isValid;
}

function formatDateStr(dateStr) {
  if (!dateStr) return '';
  // Handle various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Try manual parsing
    const sep = dateStr.includes('/') ? '/' : '-';
    const parts = dateStr.split(sep);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateRange(reg) {
  const s = reg.eventStartDate;
  const e = reg.eventEndDate;
  if (!s) return null;
  const start = formatDateStr(s);
  const end = e ? formatDateStr(e) : null;
  if (end && e !== s) return `${start} — ${end}`;
  return start;
}

export default function DigitalCard() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isDelegate = userProfile?.role !== 'admin';

  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [qrData, setQrData] = useState(undefined);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [b64Image, setB64Image] = useState(null);
  const [bgB64, setBgB64] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef();
  const qrCanvasRef = useRef();

  // Convert profile image URL to base64
  useEffect(() => {
    if (!selectedCard?.imageUrl) {
      setB64Image(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setB64Image(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setB64Image(null);
    img.src = selectedCard.imageUrl;
  }, [selectedCard?.imageUrl]);

  // Convert background image to base64 for card
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setBgB64(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setBgB64(null);
    img.src = BG_SRC;
  }, []);

  // FIXED: Fetch registrations AND event dates
  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      try {
        // Step 1: Fetch approved registrations
        const { data: regs, error: rErr } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('payment_status', 'approved');

        if (rErr) throw rErr;

        // Step 2: Get unique event IDs from registrations
        const eventIds = [...new Set(regs.map(r => r.event_id).filter(Boolean))];
        
        // Step 3: Fetch events to get dates
        let eventMap = {};
        if (eventIds.length > 0) {
          const { data: events, error: evtErr } = await supabase
            .from('events')
            .select('id, name, start_date, end_date, date')
            .in('id', eventIds);

          if (evtErr) throw evtErr;

          // Create event lookup map
          events.forEach(evt => {
            eventMap[evt.id] = {
              name: evt.name,
              startDate: evt.start_date || evt.date,
              endDate: evt.end_date,
            };
          });
        }

        // Step 4: Merge event dates into registrations
        const normalized = regs.map(reg => {
          const camelReg = keysToCamel(reg);
          const eventData = eventMap[reg.event_id] || {};
          
          return {
            ...camelReg,
            // Use event dates from fetched events (override if registration has its own)
            eventStartDate: camelReg.eventStartDate || eventData.startDate || null,
            eventEndDate: camelReg.eventEndDate || eventData.endDate || null,
            eventName: camelReg.eventName || eventData.name || 'Unknown Event',
          };
        });

        // Step 5: Fetch committees
        const comms = await cachedCollection('committees');
        
        setCards(normalized);
        setCommittees(comms);

        // Auto-select card
        const passedId = location.state?.regId;
        const auto = passedId 
          ? normalized.find(r => r.id === passedId) 
          : normalized.length === 1 
            ? normalized[0] 
            : null;
        
        if (auto) await doSelectCard(auto, comms);
      } catch (e) {
        console.error('Error loading cards:', e);
        toast.error('Failed to load digital cards');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  async function doSelectCard(reg, comms = committees) {
    setSelectedCard(reg);
    setQrData(undefined);
    try {
      const { data, error } = await supabase.from('qr_codes').select('*').eq('registration_id', reg.id);
      if (error) throw error;
      setQrData(data?.length > 0 ? keysToCamel(data[0]) : null);
    } catch (e) {
      console.error(e);
      setQrData(null);
    }
  }

  function getCommitteeName(reg) {
    if (reg.type !== 'delegate') return null;
    if (reg.committeeabbr) return reg.committeeabbr;
    if (!reg.committee) return null;
    const found = committees.find(c => c.id === reg.committee);
    return found?.abbr || reg.committee;
  }

  const displayName = selectedCard?.fullName || selectedCard?.companyName || 'Participant';
  const committeeName = selectedCard ? getCommitteeName(selectedCard) : null;
  const valid = selectedCard ? isCardValid(selectedCard) : true;
  const qrValue = qrData?.qrToken || 'MUNRYK-INVALID';
  const profileImage = selectedCard?.imageUrl || null;
  const padClass = adminPadClass(userProfile);

  async function saveAsImage() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      const cardElement = cardRef.current;

      const canvas = await html2canvas(cardElement, {
        scale: 4,
        backgroundColor: '#3A0810',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: function(clonedDoc, element) {
          // Find QR canvas in cloned document and replace with image
          const qrCanvas = element.querySelector('canvas');
          if (qrCanvas) {
            const qrImage = new Image();
            qrImage.src = qrCanvas.toDataURL('image/png');
            qrImage.style.width = '140px';
            qrImage.style.height = '140px';
            qrImage.style.display = 'inline-block';
            qrCanvas.parentElement.replaceChild(qrImage, qrCanvas);
          }

          // Fix any oklch colors
          const allElements = element.getElementsByTagName('*');
          for (let el of allElements) {
            const style = el.style;
            if (style.color && style.color.includes('oklch')) {
              style.color = '#FFFFFF';
            }
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
              style.backgroundColor = '#3A0810';
            }
            if (style.borderColor && style.borderColor.includes('oklch')) {
              style.borderColor = '#B79143';
            }
          }
        }
      });

      const link = document.createElement('a');
      link.download = `MUNRYK-Card-${displayName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card saved as image!');
    } catch (error) {
      console.error('Save Image Error:', error);
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }

  async function saveAsPDF() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      const cardElement = cardRef.current;

      const canvas = await html2canvas(cardElement, {
        scale: 4,
        backgroundColor: '#3A0810',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: function(clonedDoc, element) {
          const qrCanvas = element.querySelector('canvas');
          if (qrCanvas) {
            const qrImage = new Image();
            qrImage.src = qrCanvas.toDataURL('image/png');
            qrImage.style.width = '140px';
            qrImage.style.height = '140px';
            qrImage.style.display = 'inline-block';
            qrCanvas.parentElement.replaceChild(qrImage, qrCanvas);
          }

          const allElements = element.getElementsByTagName('*');
          for (let el of allElements) {
            const style = el.style;
            if (style.color && style.color.includes('oklch')) {
              style.color = '#FFFFFF';
            }
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
              style.backgroundColor = '#3A0810';
            }
            if (style.borderColor && style.borderColor.includes('oklch')) {
              style.borderColor = '#B79143';
            }
          }
        }
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 145] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 90, 145);
      pdf.save(`MUNRYK-Card-${displayName.replace(/\s+/g, '_')}.pdf`);
      toast.success('Card saved as PDF!');
    } catch (error) {
      console.error('Save PDF Error:', error);
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }

  // Card Component
  const CardComponent = () => (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        width: '300px',
        minHeight: '480px',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: '14px',
        border: `1.5px solid ${valid ? '#B79143' : '#525252'}`,
        padding: '20px',
        boxShadow: valid ? '0 16px 48px rgba(0,0,0,0.55)' : '0 16px 48px rgba(0,0,0,0.4)',
        backgroundImage: bgB64 ? `url(${bgB64})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: valid
            ? 'linear-gradient(160deg, rgba(58,8,16,0.85) 0%, rgba(107,15,26,0.8) 45%, rgba(74,10,18,0.85) 100%)'
            : 'linear-gradient(160deg, rgba(26,26,26,0.9) 0%, rgba(42,42,42,0.85) 45%, rgba(26,26,26,0.9) 100%)',
          borderRadius: '14px',
        }}
      />

      {/* Pattern overlay */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          borderRadius: '14px',
          background: 'repeating-linear-gradient(45deg, rgba(201,168,76,0.02) 0px, rgba(201,168,76,0.02) 1px, transparent 1px, transparent 10px)',
        }}
      />
      
      {/* Gold line top */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '3px',
          background: valid
            ? 'linear-gradient(90deg, transparent, #C9A84C 30%, #FFD700 50%, #C9A84C 70%, transparent)'
            : 'linear-gradient(90deg, transparent, #666 50%, transparent)',
          zIndex: 1,
        }}
      />

      {/* EXPIRED overlay */}
      {!valid && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}>
          <div style={{
            transform: 'rotate(-12deg)',
            borderRadius: '6px',
            border: '2px solid rgba(252,165,165,0.5)',
            padding: '12px 28px',
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#FFFFFF',
            backgroundColor: 'rgba(192,57,43,0.9)',
            boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
          }}>
            EXPIRED
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '14px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontWeight: 900,
            letterSpacing: '0.22em',
            color: valid ? '#D7B46A' : '#737373',
          }}>
            RYK MUN
          </div>
          <div style={{
            marginTop: '4px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${valid ? 'rgba(201,168,76,0.4)' : 'rgba(100,100,100,0.3)'}, transparent)`,
          }} />
        </div>

        {/* Profile Image */}
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          {b64Image ? (
            <img
              src={b64Image}
              alt={displayName}
              style={{
                display: 'inline-block',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: `2px solid ${valid ? '#C9A84C' : '#555'}`,
                objectFit: 'cover',
              }}
              crossOrigin="anonymous"
            />
          ) : profileImage ? (
            <img
              src={profileImage}
              alt={displayName}
              style={{
                display: 'inline-block',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: `2px solid ${valid ? '#C9A84C' : '#555'}`,
                objectFit: 'cover',
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{
              display: 'inline-flex',
              width: '140px',
              height: '140px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `2px solid ${valid ? '#B79143' : '#525252'}`,
              backgroundColor: valid ? 'rgba(183,145,67,0.1)' : 'rgba(38,38,38,0.3)',
              color: valid ? '#B79143' : '#737373',
              fontFamily: 'Cinzel, serif',
              fontSize: '48px',
            }}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Details Table */}
        <div style={{
          marginBottom: '14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(0,0,0,0.25)',
          padding: '10px 12px',
        }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              borderBottom: '1px solid rgba(183,145,67,0.1)',
              padding: '4px 0',
            }}
          >
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: valid ? '#B79143' : '#525252',
            }}>
              NAME
            </span>
            <span style={{
              maxWidth: '165px',
              textAlign: 'right',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              color: valid ? '#F8F3EA' : '#737373',
            }}>
              {displayName} ({selectedCard?.type === 'delegate' ? 'Delegate' : 'Sponsor'})
            </span>
          </div>

          {committeeName && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '4px 0',
              }}
            >
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: valid ? '#B79143' : '#525252',
              }}>
                COMMITTEE
              </span>
              <span style={{
                maxWidth: '165px',
                textAlign: 'right',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: valid ? '#F8F3EA' : '#737373',
              }}>
                {committeeName}
              </span>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            padding: '10px',
            boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
          }}>
            <QRCodeCanvas
              value={qrValue}
              size={140}
              bgColor="#ffffff"
              fgColor={valid ? '#3A0810' : '#666666'}
              level="H"
              includeMargin={false}
            />
          </div>
          <div style={{
            marginTop: '6px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '9px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: valid ? '#B79143' : '#525252',
          }}>
            {valid ? 'SCAN TO VERIFY' : 'CARD EXPIRED'}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${valid ? 'rgba(183,145,67,0.2)' : '#404040'}`,
          paddingTop: '10px',
          textAlign: 'center',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '9px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: valid ? '#B79143' : '#525252',
        }}>
          ◆ OFFICIAL DIGITAL PASS ◆
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative min-h-screen overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.15]" />
        <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
      </div>
      
      {/* Glow effects */}
      <div className="fixed -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: GLOW_GOLD }} />
      <div className="fixed bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: GLOW_RED }} />

      <Sidebar />
      <DelegateMobileBar />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-2 sm:px-5 py-20 sm:py-10">
        <div className="w-full max-w-6xl">
          {isDelegate && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-[#B79143] hover:text-[#F8F3EA] transition text-sm font-medium mb-4"
            >
              ← Back to Home
            </button>
          )}

          <div className="mb-8">
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Digital Pass</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">My Digital Cards</h1>
          </div>

          {loading ? (
            <div className="grid min-h-48 place-items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B79143]/30 border-t-[#B79143]" />
            </div>
          ) : cards.length === 0 ? (
            <div className="mx-auto max-w-md text-center rounded-2xl border backdrop-blur-xl p-6 sm:p-8"
              style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <div className="mb-4 text-5xl">🎫</div>
              <h3 className="mb-2 text-lg font-bold text-[#F8F3EA]">No Approved Cards Yet</h3>
              <p className="text-sm leading-relaxed text-[#b89b84]">Your digital card appears here after an admin approves your payment.</p>
              <button
                type="button"
                className="mt-6 rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10"
                style={{ borderColor: BORDER_GOLD_STRONG }}
                onClick={() => navigate('/my-payments')}
              >
                Check Payment Status
              </button>
            </div>
          ) : (
            <div>
              {cards.length > 1 && (
                <div className="mb-7">
                  <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]">Your Event Passes — select to view</div>
                  <div className="flex gap-3.5 overflow-x-auto pb-2">
                    {cards.map(card => {
                      const v = isCardValid(card);
                      const isActive = selectedCard?.id === card.id;
                      return (
                        <button
                          type="button"
                          key={card.id}
                          onClick={() => doSelectCard(card)}
                          className={`min-w-[200px] max-w-[220px] shrink-0 cursor-pointer rounded-xl border p-4 text-left transition-all duration-300 hover:scale-[1.02] ${
                            isActive
                              ? 'border-[#B79143] bg-[#B79143]/10 shadow-lg shadow-[#B79143]/10'
                              : 'border-[rgba(183,145,67,0.2)] hover:border-[#B79143]/40'
                          }`}
                          style={{ backgroundColor: isActive ? 'rgba(183,145,67,0.1)' : PANEL_BG }}
                        >
                          <div className="mb-2 text-sm font-bold text-[#F8F3EA]">{card.eventName}</div>
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase text-[#B79143]"
                              style={{ borderColor: 'rgba(183,145,67,0.3)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                              {card.type}
                            </span>
                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${
                              v
                                ? 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                                : 'border border-red-400/30 bg-red-500/15 text-red-300'
                            }`}>
                              {v ? 'Valid' : 'Expired'}
                            </span>
                          </div>
                          <div className="text-xs text-[#b89b84]">{card.fullName || card.companyName}</div>
                          {dateRange(card) && (
                            <div className="mt-1 text-xs text-[#b89b84]">📅 {dateRange(card)}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedCard ? (
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                  <div className="flex flex-col items-center gap-4 sm:items-start">
                    {qrData === undefined && (
                      <div className="flex w-full max-w-[300px] flex-col items-center py-12 rounded-2xl border backdrop-blur-xl"
                        style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#B79143]/30 border-t-[#B79143]" />
                        <p className="text-sm text-[#b89b84]">Checking card status…</p>
                      </div>
                    )}
                    {qrData === null && (
                      <div className="w-full max-w-[300px] text-center rounded-2xl border backdrop-blur-xl p-6"
                        style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                        <div className="mb-3 text-4xl">⏳</div>
                        <h3 className="mb-2 text-lg font-bold text-[#F8F3EA]">Card Not Yet Issued</h3>
                        <p className="m-0 text-sm leading-relaxed text-[#b89b84]">
                          Your payment is approved. An admin will generate your pass shortly.
                        </p>
                      </div>
                    )}
                    {qrData && (
                      <>
                        <CardComponent />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/20"
                            onClick={saveAsImage}
                            disabled={isExporting}
                          >
                            {isExporting ? '⏳ Saving...' : '📥 Save as Image'}
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10"
                            style={{ borderColor: BORDER_GOLD_STRONG }}
                            onClick={saveAsPDF}
                            disabled={isExporting}
                          >
                            {isExporting ? '⏳ Saving...' : '📄 Save as PDF'}
                          </button>
                        </div>
                      </>
                    )}
                    {qrData !== undefined && (
                      <div className="w-full max-w-[300px] text-sm rounded-2xl border backdrop-blur-xl p-5"
                        style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                        {qrData ? (
                          <>
                            <div className="mb-1.5 flex items-center gap-2">
                              <span>{valid ? '🟢' : '🔴'}</span>
                              <strong className={valid ? 'text-emerald-400' : 'text-red-400'}>
                                {valid ? 'Card Valid' : 'Card Expired'}
                              </strong>
                            </div>
                            <p className="mt-1.5 text-xs text-[#b89b84]">
                              QR: {qrData.isUsed ? '🔴 Already scanned' : '🟢 Not yet scanned'}
                            </p>
                            {selectedCard?.eventEndDate && (
                              <p className="mt-1 text-xs text-[#b89b84]">
                                📅 Expires: {formatDateStr(selectedCard.eventEndDate)}
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>🕐</span>
                            <span className="text-xs text-[#b89b84]">Card will appear once generated by an admin.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                cards.length > 0 && (
                  <div className="mx-auto max-w-lg text-center rounded-2xl border backdrop-blur-xl p-8"
                    style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                    <div className="mb-3 text-3xl">👆</div>
                    <p className="text-[#b89b84]">Select a card above to view it</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}