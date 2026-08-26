import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { keysToCamel } from '../../utils/cache';
import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const PANEL_BG = 'rgba(68,7,19,0.58)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';

export default function PassVerification() {
  const { qrToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function verifyToken() {
      try {
        if (!qrToken) throw new Error('No QR token provided');

        // 1. Find QR Code
        const { data: qr, error: qrErr } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('qr_token', qrToken)
          .single();

        if (qrErr || !qr) throw new Error('Invalid or non-existent QR code');
        if (!qr.pass_registration_id) throw new Error('This QR code is not for a pass registration');

        // 2. Fetch Pass Registration
        const { data: reg, error: regErr } = await supabase
          .from('pass_registrations')
          .select('*, event_passes(name), events(name, start_date, end_date, date)')
          .eq('id', qr.pass_registration_id)
          .single();

        if (regErr || !reg) throw new Error('Pass registration not found');

        // 3. Validation Logic
        let isValid = reg.payment_status === 'approved' && reg.status !== 'rejected';
        let reason = '';

        if (reg.payment_status !== 'approved') {
          isValid = false;
          reason = `Payment status is ${reg.payment_status}`;
        } else if (reg.status === 'rejected') {
          isValid = false;
          reason = 'Pass registration was rejected';
        }

        // Date check
        const endDateStr = reg.events?.end_date || reg.events?.start_date || reg.events?.date;
        if (endDateStr) {
          const end = new Date(endDateStr);
          end.setHours(23, 59, 59, 999);
          const now = new Date();
          if (now > end) {
            isValid = false;
            reason = 'Event has already ended';
          }
        }

        setResult({
          valid: isValid,
          reason,
          reg: keysToCamel(reg),
        });

      } catch (e) {
        console.error(e);
        setResult({
          valid: false,
          reason: e.message || 'Verification failed',
        });
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [qrToken]);

  return (
    <div className="relative min-h-screen overflow-hidden text-[#F8F3EA] flex items-center justify-center p-4" style={{ backgroundColor: BG_COLOR }}>
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_SRC}
          alt=""
          className="w-full h-full object-cover grayscale brightness-[0.15]"
        />
        <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
      </div>

      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40" style={{ background: GLOW_GOLD }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-K74kR0C8RihW7cIuJ5xJpXwU6qH5X8.png"
              alt="MUNRYK Logo"
              className="h-16 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8F3EA]">Pass Verification</h1>
        </div>

        <div className="rounded-3xl border backdrop-blur-xl p-8 text-center" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
          {loading ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#B79143]/20 border-t-[#B79143] animate-spin mb-4" />
              <p className="text-[#B79143] uppercase tracking-widest text-sm font-semibold">Verifying Pass...</p>
            </div>
          ) : result?.valid ? (
            <div className="py-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">VALID PASS</h2>
              <div className="bg-black/30 rounded-xl p-4 mt-6 text-left border border-[rgba(183,145,67,0.1)]">
                <div className="mb-3">
                  <p className="text-[10px] text-[#B79143] uppercase tracking-wider mb-1">Pass Holder</p>
                  <p className="font-semibold text-lg">{result.reg?.fullName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-[#B79143] uppercase tracking-wider mb-1">Pass Type</p>
                    <p className="font-medium text-sm">{result.reg?.eventPasses?.name || 'Event Pass'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#B79143] uppercase tracking-wider mb-1">Event</p>
                    <p className="font-medium text-sm truncate">{result.reg?.events?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-500/30">
                ✕
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">INVALID PASS</h2>
              <p className="text-red-300/80 text-sm">{result?.reason}</p>
              
              {result?.reg && (
                <div className="bg-black/30 rounded-xl p-4 mt-6 text-left border border-red-500/20">
                  <div className="mb-2">
                    <p className="text-[10px] text-[#B79143] uppercase tracking-wider mb-1">Found Record For</p>
                    <p className="font-medium">{result.reg?.fullName}</p>
                  </div>
                  <p className="text-xs text-[#b89b84]">Payment Status: <span className="font-semibold">{result.reg?.paymentStatus}</span></p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
