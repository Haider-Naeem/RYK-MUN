import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/config";
import { useAuth } from "../../hooks/useAuth";
import Sidebar, { DelegateMobileBar, adminPadClass } from "../Shared/Sidebar";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { keysToCamel } from "../../utils/cache";

import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';
const PANEL_BG = 'rgba(68,7,19,0.58)';
const CARD_BG = 'rgba(68,7,19,0.35)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const BORDER_GOLD_LIGHT = 'rgba(183,145,67,0.08)';
const BORDER_GOLD_MEDIUM = 'rgba(183,145,67,0.28)';

export default function UserDashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    async function load() {
      try {
        const [
          { data: regs, error: rErr },
          { data: pays, error: pErr },
        ] = await Promise.all([
          supabase
            .from("registrations")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("payments")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false }),
        ]);

        if (rErr) throw rErr;
        if (pErr) throw pErr;

        setRegistrations(keysToCamel(regs || []));
        setPayments(keysToCamel(pays || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentUser]);

  const approved = payments.filter(
    (p) => p.status === "approved"
  ).length;

  const pending = payments.filter(
    (p) => p.status === "pending"
  ).length;

  const badgeClass = (status) =>
    status === "approved"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
      : status === "rejected"
      ? "bg-red-500/15 text-red-300 border border-red-400/30"
      : "bg-amber-500/15 text-amber-300 border border-amber-400/30";

  return (
    <div className="relative min-h-screen overflow-hidden text-[#F8F3EA]" style={{ backgroundColor: BG_COLOR }}>

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_SRC}
          alt=""
          className="w-full h-full object-cover grayscale brightness-[0.15]"
        />

        <div
          className="absolute inset-0"
          style={{ background: BG_GRADIENT }}
        />
      </div>

      {/* Glow Effects */}
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40"
        style={{ background: GLOW_GOLD }}
      />

      <div
        className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
        style={{ background: GLOW_RED }}
      />

      {/* Sidebar */}
      <Sidebar />
      <DelegateMobileBar />

      {/* Content */}
      <div className={`relative z-10 ${adminPadClass(userProfile)}`}>

        <div className="px-4 pb-10 pt-20 sm:px-6 lg:px-8 md:pt-8">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">
                Dashboard
              </p>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F8F3EA]">
                Welcome,{" "}
                <span className="text-[#B79143]">
                  {userProfile?.fullName?.split(" ")[0] || "Participant"}
                </span>
              </h1>
            </div>

            <button
              onClick={() => navigate("/register-event")}
              className="h-11 px-5 rounded-xl font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto"
              style={{
                background:
                  "linear-gradient(135deg,#8E6B2F,#B79143,#D7B46A)",
              }}
            >
              + Register Event
            </button>
          </div>

          {/* Stats - 2x2 on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">

            {[
              {
                label: "Total Registrations",
                value: registrations.length,
                sub: "events joined",
              },
              {
                label: "Approved Payments",
                value: approved,
                sub: "confirmed",
              },
              {
                label: "Pending Payments",
                value: pending,
                sub: "awaiting review",
              },
              {
                label: "Digital Cards",
                value: approved,
                sub: "active passes",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5"
                style={{ 
                  borderColor: BORDER_GOLD, 
                  backgroundColor: PANEL_BG 
                }}
              >
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143]">
                  {s.label}
                </div>

                <div className="mt-2 sm:mt-3 text-3xl sm:text-4xl font-bold text-[#F8F3EA]">
                  {s.value}
                </div>

                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#b89b84]">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Registrations */}
          <div 
            className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6 mb-8"
            style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
          >

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">

              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">
                  My Registrations
                </h2>

                <p className="text-sm text-[#b89b84] mt-1">
                  Your registered events and payment status.
                </p>
              </div>

              <button
                onClick={() => navigate("/my-payments")}
                className="rounded-xl border px-4 py-2 text-sm text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="grid place-items-center py-16">
                <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-16">

                <div className="text-6xl mb-4">
                  🎫
                </div>

                <h3 className="text-xl font-bold text-[#F8F3EA]">
                  No Registrations Yet
                </h3>

                <p className="text-[#b89b84] mt-3 text-sm">
                  Register for your first MUN event.
                </p>

                <button
                  onClick={() => navigate("/register-event")}
                  className="mt-6 h-11 px-5 rounded-xl font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background:
                      "linear-gradient(135deg,#8E6B2F,#B79143,#D7B46A)",
                  }}
                >
                  Register Now
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">

                  <table className="min-w-full text-sm">

                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Event
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Type
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Name
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Date
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Payment
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {registrations.map((reg) => (
                        <tr
                          key={reg.id}
                          className="border-b hover:bg-[rgba(183,145,67,0.04)] transition"
                          style={{ borderColor: BORDER_GOLD_LIGHT }}
                        >
                          <td className="py-4 pr-4 font-semibold text-[#F8F3EA]">
                            {reg.eventName || "—"}
                          </td>

                          <td className="py-4 pr-4">
                            <span 
                              className="rounded-lg border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]"
                              style={{ 
                                borderColor: 'rgba(183,145,67,0.25)', 
                                backgroundColor: 'rgba(183,145,67,0.08)' 
                              }}
                            >
                              {reg.type === "delegate"
                                ? "Delegate"
                                : "Sponsor"}
                            </span>
                          </td>

                          <td className="py-4 pr-4 text-[#d8c2a8]">
                            {reg.fullName ||
                              reg.companyName ||
                              "—"}
                          </td>

                          <td className="py-4 pr-4 text-[#b89b84]">
                            {formatDate(reg.createdAt)}
                          </td>

                          <td className="py-4 pr-4">
                            <span
                              className={`rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${badgeClass(
                                reg.paymentStatus || "pending"
                              )}`}
                            >
                              {reg.paymentStatus || "pending"}
                            </span>
                          </td>

                          <td className="py-4">
                            {reg.paymentStatus === "approved" ? (
                              <button
                                onClick={() =>
                                  navigate("/my-card", {
                                    state: { regId: reg.id },
                                  })
                                }
                                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 transition"
                              >
                                View Card
                              </button>
                            ) : (
                              <span className="text-[#8c6d62]">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - Visible only on mobile */}
                <div className="md:hidden space-y-4">
                  {registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="rounded-2xl border backdrop-blur-sm p-4 space-y-3"
                      style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-[#F8F3EA] text-base">
                          {reg.eventName || "—"}
                        </h3>
                        <span 
                          className="rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]"
                          style={{ 
                            borderColor: 'rgba(183,145,67,0.25)', 
                            backgroundColor: 'rgba(183,145,67,0.08)' 
                          }}
                        >
                          {reg.type === "delegate" ? "Delegate" : "Sponsor"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Name</p>
                          <p className="text-[#d8c2a8] truncate">
                            {reg.fullName || reg.companyName || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Date</p>
                          <p className="text-[#b89b84]">
                            {formatDate(reg.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div 
                        className="flex items-center justify-between pt-2 border-t"
                        style={{ borderColor: BORDER_GOLD_LIGHT }}
                      >
                        <span
                          className={`rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${badgeClass(
                            reg.paymentStatus || "pending"
                          )}`}
                        >
                          {reg.paymentStatus || "pending"}
                        </span>

                        {reg.paymentStatus === "approved" ? (
                          <button
                            onClick={() =>
                              navigate("/my-card", {
                                state: { regId: reg.id },
                              })
                            }
                            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 transition"
                          >
                            View Card
                          </button>
                        ) : (
                          <span className="text-[#8c6d62] text-xs">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Payments */}
          <div 
            className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6"
            style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
          >

            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#F8F3EA]">
                Payment History
              </h2>

              <p className="text-sm text-[#b89b84] mt-1">
                Recent payment transactions.
              </p>
            </div>

            {payments.length === 0 ? (
              <div className="py-10 text-sm text-[#b89b84]">
                No payment records found.
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">

                  <table className="min-w-full text-sm">

                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Event
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Type
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Method
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Amount
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Date
                        </th>

                        <th className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px]">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b hover:bg-[rgba(183,145,67,0.04)] transition"
                          style={{ borderColor: BORDER_GOLD_LIGHT }}
                        >
                          <td className="py-4 pr-4 font-semibold text-[#F8F3EA]">
                            {p.eventName || "—"}
                          </td>

                          <td className="py-4 pr-4 text-[#d8c2a8]">
                            {p.registrationType || "—"}
                          </td>

                          <td className="py-4 pr-4 text-[#b89b84]">
                            {p.paymentMethod || "—"}
                          </td>

                          <td className="py-4 pr-4 text-[#F8F3EA]">
                            {formatCurrency(p.amount)}
                          </td>

                          <td className="py-4 pr-4 text-[#b89b84]">
                            {formatDate(p.createdAt)}
                          </td>

                          <td className="py-4">
                            <span
                              className={`rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${badgeClass(
                                p.status
                              )}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>

                {/* Mobile Card View - Visible only on mobile */}
                <div className="md:hidden space-y-4">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border backdrop-blur-sm p-4 space-y-3"
                      style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-[#F8F3EA] text-base">
                          {p.eventName || "—"}
                        </h3>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] ${badgeClass(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Type</p>
                          <p className="text-[#d8c2a8]">
                            {p.registrationType || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Method</p>
                          <p className="text-[#b89b84]">
                            {p.paymentMethod || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Amount</p>
                          <p className="text-[#F8F3EA] font-medium">
                            {formatCurrency(p.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Date</p>
                          <p className="text-[#b89b84]">
                            {formatDate(p.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}