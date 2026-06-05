import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabase/config";
import { useAuth } from "../../hooks/useAuth";
import { uploadToR2 } from "../../utils/r2";
import { invalidateCollection, keysToCamel } from "../../utils/cache";
import toast from "react-hot-toast";
import Sidebar, { isAdminUser } from "../Shared/Sidebar";
import AuthModal from "../Auth/AuthModal";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import StatsSection from "./StatsSection";
import AboutSection from "./AboutSection";
import NewsSection from "./NewsSection";
import VenueSection from "./VenueSection";
import SponsorsSection from "./SponsorsSection";
import CommitteesSection from "./CommitteesSection";
import ScheduleSection from "./ScheduleSection";
import RegistrationSection from "./RegistrationSection";
import FooterSection from "./FooterSection";
import bk from "../../Assets/bk.webp";

const BG_SRC = bk;

const FALLBACK_COMMITTEES = [
  { name: "United Nations Security Council",     abbr: "UNSC",   topic: "Addressing the Use of Autonomous Weapons in Modern Conflicts" },
  { name: "United Nations Human Rights Council", abbr: "UNHRC",  topic: "Protection of Journalists in Conflict Zones"                  },
  { name: "World Health Organization",           abbr: "WHO",    topic: "Global Response to Emerging Infectious Diseases"              },
  { name: "General Assembly",                    abbr: "GA",     topic: "Sustainable Development and Climate Accountability"           },
  { name: "International Court of Justice",      abbr: "ICJ",    topic: "Sovereignty vs. Humanitarian Intervention"                   },
  { name: "Economic & Social Council",           abbr: "ECOSOC", topic: "Bridging the Global Digital Divide"                          },
];

function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatEventDateRange(ev) {
  if (!ev) return 'Dates coming soon';
  const start = ev.startDate || ev.date;
  const end = ev.endDate;
  if (!start) return 'Dates coming soon';
  const s = formatDisplayDate(start);
  if (!end || end === start) return s;
  return `${s} – ${formatDisplayDate(end)}`;
}

function buildTimeline(ev) {
  if (!ev) return [];
  const items = [];
  if (ev.registrationStartDate) items.push({ date: formatDisplayDate(ev.registrationStartDate), event: 'Registration Opens' });
  if (ev.registrationEndDate) items.push({ date: formatDisplayDate(ev.registrationEndDate), event: 'Registration Closes' });
  if (ev.cardAllotmentDate) items.push({ date: formatDisplayDate(ev.cardAllotmentDate), event: 'Digital Cards Allottment 🎫' });
  const start = ev.startDate || ev.date;
  if (start) {
    const end = ev.endDate && ev.endDate !== start ? ` – ${formatDisplayDate(ev.endDate)}` : '';
    items.push({ date: formatDisplayDate(start) + end, event: 'Conference Days' });
  }
  return items;
}

function getRegistrationStatus(ev) {
  if (!ev) return { open: false, message: 'No active event found.' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!ev.registrationStartDate) {
    return { open: false, message: 'Registration dates are not yet announced.' };
  }
  
  const start = new Date(ev.registrationStartDate + 'T00:00:00');
  if (today < start) {
    return { open: false, message: 'Registration has not opened yet.' };
  }
  
  if (ev.registrationEndDate) {
    const end = new Date(ev.registrationEndDate + 'T23:59:59');
    if (today > end) {
      return { open: false, message: 'Registration is closed.' };
    }
  }
  
  return { open: true };
}

function getSeatInfo(ev, comms) {
  if (ev?.totalSeats > 0) {
    const totalSeats  = ev.totalSeats;
    const totalFilled = ev.filledSeats || 0;
    const pct = Math.min(100, Math.round((totalFilled / totalSeats) * 100));
    return { totalSeats, totalFilled, pct, isFull: totalFilled >= totalSeats };
  }
  const totalSeats  = comms.reduce((s, c) => s + (c.totalSeats ?? c.seats ?? 0), 0);
  const totalFilled = comms.reduce((s, c) => s + (c.filledSeats || 0), 0);
  const pct = totalSeats > 0 ? Math.min(100, Math.round((totalFilled / totalSeats) * 100)) : 0;
  return { totalSeats, totalFilled, pct, isFull: totalSeats > 0 && totalFilled >= totalSeats };
}

export default function Landing() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState({ delegates: 0, committees: 0, days: 0, schools: 0 });
  const statsRef = useRef(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [wizardStep, setWizardStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardSubmitted, setWizardSubmitted] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', university: '',
    country: '', cnic: '', gender: '', committee: '',
    countryPersonality: '',
    profileImage: null, profilePreview: null,
  });
  const [paymentData, setPaymentData] = useState({
    method: null, receiptFile: null, receiptPreview: null,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [committees, setCommittees] = useState([]);
  const [news, setNews] = useState([]);

  const receiptInputRef = useRef();
  const profileInputRef = useRef();

  const sectionRefs = {
    home:       useRef(null),
    about:      useRef(null),
    news:       useRef(null),
    venue:      useRef(null),
    sponsors:   useRef(null),
    committees: useRef(null),
    schedule:   useRef(null),
    register:   useRef(null),
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: events } = await supabase.from('events').select('*').eq('status', 'active').limit(1);
        if (events?.length > 0) {
          const ev = keysToCamel([events[0]])[0];
          setSelectedEvent(ev);
          const { data: comms } = await supabase.from('committees').select('*').eq('event_id', ev.id);
          setCommittees(keysToCamel(comms || []));
        }
      } catch (err) { console.error('Failed to load event data:', err); }
    };
    load();
  }, []);

  useEffect(() => {
    if (currentUser && userProfile) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || userProfile.fullName || '',
        email:    prev.email    || userProfile.email    || currentUser.email || '',
        phone:    prev.phone    || userProfile.phone    || '',
      }));
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (userProfile && isAdminUser(userProfile)) {
      navigate('/admin', { replace: true });
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    if (!selectedEvent?.id) return;
    const channel = supabase
      .channel('landing-committees-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'committees' }, payload => {
        const updated = keysToCamel(payload.new);
        if (updated.eventId !== selectedEvent.id) return;
        setCommittees(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent?.id) return;
    const channel = supabase
      .channel('landing-event-seats-realtime')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'events',
        filter: `id=eq.${selectedEvent.id}`
      }, payload => {
        setSelectedEvent(keysToCamel(payload.new));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (location.state?.scrollToRegister) {
      if (!selectedEvent) {
        // No event, still show wizard for signup
        setShowWizard(true);
        setWizardStep(1);
        setTimeout(() => {
          sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          navigate(location.pathname, { replace: true, state: {} });
        }, 300);
        return;
      }
      
      const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
      const regStatus = getRegistrationStatus(selectedEvent);
      if (!hasDates || !regStatus.open) {
        // Allow signup even if registration closed
        setShowWizard(true);
        setWizardStep(1);
      } else {
        setShowWizard(true);
        setWizardStep(1);
      }
      setTimeout(() => {
        sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navigate(location.pathname, { replace: true, state: {} });
      }, 300);
    }
  }, [location.state?.scrollToRegister, navigate, location.pathname, selectedEvent]);

  useEffect(() => {
    if (!currentUser || !pendingAction || showAuthModal) return;
    
    // For wizard action, just open the wizard regardless of event
    if (pendingAction === 'wizard') {
      setShowWizard(true);
      setWizardStep(1);
      setPendingAction(null);
      setTimeout(() => {
        sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
      return;
    }
    
    // For delegate action, check event status
    if (pendingAction === 'delegate') {
      if (!selectedEvent) {
        toast.error('No active event found. You can still explore the website and create your profile.');
        setPendingAction(null);
        return;
      }
      const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
      const regStatus = getRegistrationStatus(selectedEvent);
      if (!hasDates || !regStatus.open) {
        toast.error('Registration is not open yet. Event dates or registration dates may not be announced.');
        setPendingAction(null);
        scrollTo('register');
        return;
      }
      setSelectedRole('delegate');
      setShowWizard(true);
      setWizardStep(2);
    } else if (pendingAction === 'continue') {
      setWizardStep(4);
    } else if (pendingAction === 'submit') {
      handleWizardSubmit();
    }
    setPendingAction(null);
    setTimeout(() => {
      sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }, [currentUser, showAuthModal, pendingAction, selectedEvent]);

  const scrollTo = useCallback((id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  }, []);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 50);
      const offset = 100;
      for (const [id, ref] of Object.entries(sectionRefs)) {
        if (!ref.current) continue;
        const { top, bottom } = ref.current.getBoundingClientRect();
        if (top - offset <= 0 && bottom - offset > 0) { setActiveNav(id); break; }
      }
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        anim('delegates', 500, 1200);
        anim('committees', 6, 600);
        anim('days', 3, 400);
        anim('schools', 50, 1000);
      }
    }, { threshold: 0.4 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const anim = (key, target, duration) => {
    const start = performance.now();
    const update = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(prev => ({ ...prev, [key]: Math.floor(e * target) }));
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  const refreshSeatInfo = useCallback(async () => {
    if (!selectedEvent?.id) return;
    try {
      const { data: freshEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', selectedEvent.id)
        .single();
      if (freshEvent) setSelectedEvent(keysToCamel(freshEvent));
      const { data: freshComms } = await supabase
        .from('committees')
        .select('*')
        .eq('event_id', selectedEvent.id);
      if (freshComms) setCommittees(keysToCamel(freshComms));
    } catch (error) {
      console.error('Failed to refresh seat info:', error);
    }
  }, [selectedEvent?.id]);

  const handleProfileImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData(prev => ({ ...prev, profileImage: file, profilePreview: URL.createObjectURL(file) }));
  };

  const handleReceiptFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPaymentData(prev => ({ ...prev, receiptFile: file, receiptPreview: URL.createObjectURL(file) }));
  };

  const openLogin = (action) => {
    // Allow login/signup even without active event
    if (action) setPendingAction(action);
    setShowAuthModal(true);
  };

  const handleApplyAsDelegate = () => {
    // If no event at all, still allow signup
    if (!selectedEvent) {
      if (currentUser) {
        toast.error('No active event found. Please check back later.');
      } else {
        openLogin('delegate');
      }
      return;
    }
    
    const currentSeatInfo = getSeatInfo(selectedEvent, committees);
    const regStatus = getRegistrationStatus(selectedEvent);
    const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
    
    if (!hasDates) {
      toast.error('Event dates are yet to be announced. Registration will open once dates are confirmed.');
      scrollTo('register');
      return;
    }
    
    if (!regStatus.open) {
      toast.error(regStatus.message || 'Registration is not open yet.');
      scrollTo('register');
      return;
    }
    
    if (currentSeatInfo.isFull && currentSeatInfo.totalSeats > 0) {
      toast.error('All delegate seats are filled. Sponsorship is still available.');
      scrollTo('register');
      return;
    }
    
    if (currentUser) {
      setSelectedRole('delegate');
      setShowWizard(true);
      setWizardStep(2);
      setTimeout(() => sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } else {
      openLogin('delegate');
    }
  };

  const handleRoleSelect = (role) => {
    if (role === 'wizard') {
      // Allow opening registration wizard for signup even without event
      if (currentUser) {
        setShowWizard(true);
        setWizardStep(1);
      } else {
        openLogin('wizard');
      }
    } else {
      setSelectedRole(role);
      setWizardStep(2);
    }
  };

  const handleValidateStep = (stepOrBack) => {
    if (stepOrBack === 'back') {
      setWizardStep(prev => Math.max(1, prev - 1));
      return;
    }
    if (stepOrBack === 2) {
      const { fullName, email, phone, profileImage } = formData;
      if (!fullName || !email || !phone) { toast.error('Name, email, phone required'); return false; }
      if (!profileImage) { toast.error('Profile photo required'); return false; }
      setWizardStep(3);
    }
  };

  const handleContinue = () => {
    if (wizardStep === 3 && !currentUser) { openLogin('continue'); return; }
    if (wizardStep < 4) {
      setWizardStep(prev => prev + 1);
      setTimeout(() => sectionRefs.register.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleWizardSubmit = async () => {
    if (!selectedEvent) {
      toast.error('No active event found. Cannot submit registration.');
      return;
    }
    
    const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
    const regStatus = getRegistrationStatus(selectedEvent);
    
    if (!hasDates || !regStatus.open) {
      toast.error(regStatus.message || 'Registration is not open.');
      return;
    }
    
    if (!paymentData.method)      { toast.error('Select a payment method'); return; }
    if (!paymentData.receiptFile) { toast.error('Payment screenshot required'); return; }
    if (!formData.profileImage)   { toast.error('Profile photo required'); return; }
    if (!currentUser)             { openLogin('submit'); return; }

    setWizardLoading(true);
    let seatClaimed = false;

    try {
      if (selectedRole === 'delegate') {
        if (!formData.committee) { toast.error('Please select a committee'); setWizardLoading(false); return; }

        const { data: granted, error: seatErr } = await supabase
          .rpc('increment_filled_seats', { committee_id: formData.committee });

        if (seatErr) throw seatErr;

        if (!granted) {
          await refreshSeatInfo();
          toast.error('Sorry, all seats just filled up. Please try again or contact the organizer.');
          return;
        }

        seatClaimed = true;
      }

      let receiptUrl = '';
      let profileUrl = '';

      try {
        [receiptUrl, profileUrl] = await Promise.all([
          uploadToR2(paymentData.receiptFile, `receipts/${currentUser.id}/${Date.now()}_receipt`),
          uploadToR2(formData.profileImage,   `profiles/${currentUser.id}/${Date.now()}_profile`),
        ]);
      } catch (uploadErr) {
        if (seatClaimed) {
          await supabase.rpc('release_filled_seat', { committee_id: formData.committee });
          await refreshSeatInfo();
        }
        throw uploadErr;
      }

      const entryFeeAmount = selectedRole === 'sponsor'
        ? (selectedEvent?.sponsorPackages?.find?.(p => p.name === formData.committee)?.amount || 0)
        : (selectedEvent?.entryFees || 0);

      const committee = committees.find(c => c.id === formData.committee);

      const { data: regData, error: regErr } = await supabase
        .from('registrations')
        .insert({
          user_id:            currentUser.id,
          event_id:           selectedEvent?.id,
          event_name:         selectedEvent?.name || '',
          type:               selectedRole,
          full_name:          formData.fullName,
          email:              formData.email,
          phone:              formData.phone,
          cnic:               formData.cnic,
          committee:          selectedRole === 'delegate' ? formData.committee : null,
          committee_name:     selectedRole === 'delegate'
                              ? (committee?.name || '')
                              : (formData.committee || ''),
          countryPersonality: formData.countryPersonality || null,
          image_url:          profileUrl,
          payment_status:     'pending',
        })
        .select()
        .single();

      if (regErr) {
        if (seatClaimed) {
          await supabase.rpc('release_filled_seat', { committee_id: formData.committee });
          await refreshSeatInfo();
        }
        throw regErr;
      }

      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          user_id:           currentUser.id,
          registration_id:   regData.id,
          event_id:          selectedEvent?.id,
          event_name:        selectedEvent?.name || '',
          registration_type: selectedRole,
          amount:            entryFeeAmount,
          payment_method:    paymentData.method?.label,
          receipt_url:       receiptUrl,
          status:            'pending',
        });

      if (payErr) throw payErr;

      invalidateCollection('registrations');
      invalidateCollection('payments');
      
      await refreshSeatInfo();
      
      setWizardSubmitted(true);
      toast.success('Registration submitted!');

    } catch (err) {
      toast.error(err.message || 'Registration failed');
      await refreshSeatInfo();
    } finally {
      setWizardLoading(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1); setSelectedRole(null);
    setFormData({
      fullName: currentUser ? (userProfile?.fullName || '') : '',
      email: currentUser ? (userProfile?.email || currentUser?.email || '') : '',
      phone: currentUser ? (userProfile?.phone || '') : '',
      university: '', country: '', cnic: '', gender: '', committee: '',
      countryPersonality: '',
      profileImage: null, profilePreview: null,
    });
    setPaymentData({ method: null, receiptFile: null, receiptPreview: null });
    setWizardSubmitted(false); setPendingAction(null); setWizardLoading(false);
    refreshSeatInfo();
  };

  const regStatus = getRegistrationStatus(selectedEvent);
  const seatInfo = getSeatInfo(selectedEvent, committees);
  const timeline = buildTimeline(selectedEvent);
  const heroDateLabel = formatEventDateRange(selectedEvent);
  const displayCommittees = committees.length > 0 ? committees : FALLBACK_COMMITTEES;
  const isAdmin = isAdminUser(userProfile);
  const showSidebar = isAdmin;

  const hasDates = !!(selectedEvent?.startDate || selectedEvent?.date);
  const isRegistrationOpen = !!(regStatus.open && hasDates && selectedEvent);

  const entryFee = selectedRole === 'sponsor'
    ? (selectedEvent?.sponsorPackages?.find?.(p => p.name === formData.committee)?.amount || 0)
    : (selectedEvent?.entryFees || 5000);

  return (
    <>
      {showSidebar && <Sidebar />}
      <div className={showSidebar ? 'md:ml-[272px]' : ''}>
        <div className="fixed inset-0 z-0">
          <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.18]" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(59,10,20,0.60) 0%, rgba(15,5,10,0.92) 100%)' }} />
        </div>
        <div className="fixed pointer-events-none z-0 w-[500px] h-[500px] rounded-full -top-[100px] -left-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(183,145,67,0.16) 0%, transparent 70%)' }} />
        <div className="fixed pointer-events-none z-0 w-[500px] h-[500px] rounded-full -bottom-[80px] -right-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(120,18,30,0.18) 0%, transparent 70%)' }} />

        <Navbar
          activeNav={activeNav}
          scrolled={scrolled}
          currentUser={currentUser}
          userProfile={userProfile}
          showSidebar={showSidebar}
          onNavigate={scrollTo}
          onRegister={() => openLogin('wizard')}
        />

        <HeroSection
          ref={sectionRefs.home}
          heroDateLabel={heroDateLabel}
          seatInfo={seatInfo}
          displayCommittees={displayCommittees}
          onApplyDelegate={handleApplyAsDelegate}
          onExploreCommittees={() => scrollTo('committees')}
          onScrollTo={() => scrollTo('about')}
          isRegistrationOpen={isRegistrationOpen}
          hasDates={hasDates}
        />

        <StatsSection ref={statsRef} count={count} />
        
        <AboutSection ref={sectionRefs.about} />

        <NewsSection 
          ref={sectionRefs.news}
          news={news}
        />

        <VenueSection
          ref={sectionRefs.venue}
          selectedEvent={selectedEvent}
          formatEventDateRange={formatEventDateRange}
        />

        <SponsorsSection ref={sectionRefs.sponsors} />

        <CommitteesSection
          ref={sectionRefs.committees}
          displayCommittees={displayCommittees}
        />

        <ScheduleSection
          ref={sectionRefs.schedule}
          timeline={timeline}
        />

        <RegistrationSection
          ref={sectionRefs.register}
          currentUser={currentUser}
          showWizard={showWizard}
          wizardSubmitted={wizardSubmitted}
          wizardStep={wizardStep}
          selectedRole={selectedRole}
          regStatus={regStatus}
          seatInfo={seatInfo}
          entryFee={entryFee}
          wizardLoading={wizardLoading}
          formData={formData}
          setFormData={setFormData}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          committees={committees}
          selectedEvent={selectedEvent}
          onRoleSelect={handleRoleSelect}
          onValidateStep={handleValidateStep}
          onContinue={handleContinue}
          onSubmit={handleWizardSubmit}
          onReset={resetWizard}
          profileInputRef={profileInputRef}
          receiptInputRef={receiptInputRef}
          onProfileImage={handleProfileImage}
          onReceiptFile={handleReceiptFile}
          onRefreshSeats={refreshSeatInfo}
        />

        <FooterSection onNavigate={scrollTo} />

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        `}</style>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAction(null);
        }}
        onAuthSuccess={() => {}}
        pendingAction={pendingAction}
      />
    </>
  );
}