import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  Lock,
  Monitor,
  Radio,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Video
} from 'lucide-react';
import { auth, googleProvider, OWNER_EMAIL } from '../lib/firebase';
import { ScrollProgressBar } from './MotionPrimitives';
import { ResilientImage } from './ResilientImage';
import { formatTierLabel, type CourseTrack, type PlanTier, type StudentProfile } from '../types';

interface LoginPageViewProps {
  initialTab: 'login' | 'register' | 'owner';
  preselectedPlan?: PlanTier;
  preselectedCourse?: string;
  courses: CourseTrack[];
  student: StudentProfile | null;
  isOwner: boolean;
  onBackHome: () => void;
  onStudentAuthenticated: (student: StudentProfile, token: string) => void;
  onStudentLogout: () => void;
}

export function LoginPageView({
  initialTab,
  preselectedPlan = 'pro',
  preselectedCourse = 'Class 12th Board & Science + CS',
  courses,
  student,
  isOwner,
  onBackHome,
  onStudentAuthenticated,
  onStudentLogout
}: LoginPageViewProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'owner'>(initialTab);

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register + OTP state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [targetExam, setTargetExam] = useState(preselectedCourse);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(preselectedPlan);
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState<'details' | 'otp'>('details');
  const [otpSessionId, setOtpSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMaskedTarget, setOtpMaskedTarget] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState<StudentProfile | null>(null);

  // Live top login clock
  const [nowClock, setNowClock] = useState(() => new Date());

  // Owner auth state
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Live countdown timer for next cohort batch
  const [secondsLeft, setSecondsLeft] = useState(2 * 86400 + 10 * 3600 + 15 * 60 + 19);

  useEffect(() => {
    setTab(initialTab);
    setSelectedPlan(preselectedPlan);
    if (preselectedCourse) setTargetExam(preselectedCourse);
    setRegStep('details');
    setRegError(null);
  }, [initialTab, preselectedPlan, preselectedCourse]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 86400));
      setNowClock(new Date());
      setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const selectedCourseObj = courses.find((c) => c.title === targetExam) || courses[0];

  function formatIstDateTime(isoOrDate: string | Date | undefined): string {
    if (!isoOrDate) return '';
    const dt = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  async function handleStudentLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const resp = await fetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: loginPassword })
      });
      const data = (await resp.json()) as {
        student?: StudentProfile;
        studentToken?: string;
        error?: string;
      };
      if (!resp.ok || !data.student || !data.studentToken) {
        setLoginError(data.error || 'Invalid Login ID or password.');
      } else {
        onStudentAuthenticated(data.student, data.studentToken);
        onBackHome();
      }
    } catch {
      setLoginError('Network error while signing in.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function requestRegistrationOtp() {
    setRegError(null);
    setRegLoading(true);
    try {
      const resp = await fetch('/api/students/register/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password: regPassword
        })
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        otpSessionId?: string;
        maskedTarget?: string;
        expiresInSeconds?: number;
        verificationCodePreview?: string;
        error?: string;
      };
      if (!resp.ok || !data.otpSessionId) {
        setRegError(data.error || 'Could not generate verification OTP.');
      } else {
        setOtpSessionId(data.otpSessionId);
        setOtpMaskedTarget(data.maskedTarget || email);
        setOtpExpiresIn(data.expiresInSeconds || 300);
        setResendCooldown(30);
        setOtpPreview(data.verificationCodePreview || null);
        setOtpCode('');
        setRegStep('otp');
      }
    } catch {
      setRegError('Network error while requesting OTP.');
    } finally {
      setRegLoading(false);
    }
  }

  async function handleStudentRegister(e: FormEvent) {
    e.preventDefault();
    if (regStep === 'details') {
      await requestRegistrationOtp();
      return;
    }

    setRegError(null);
    setRegLoading(true);
    try {
      const resp = await fetch('/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          targetExam,
          plan: selectedPlan,
          password: regPassword,
          otpSessionId,
          otp: otpCode.trim()
        })
      });
      const data = (await resp.json()) as {
        student?: StudentProfile;
        studentToken?: string;
        error?: string;
      };
      if (!resp.ok || !data.student || !data.studentToken) {
        setRegError(data.error || 'OTP verification or registration failed.');
      } else {
        setRegisteredStudent(data.student);
        onStudentAuthenticated(data.student, data.studentToken);
      }
    } catch {
      setRegError('Network error during OTP verification.');
    } finally {
      setRegLoading(false);
    }
  }

  async function handleOwnerGoogleSignIn() {
    setOwnerError(null);
    setOwnerLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = (result.user.email || '').toLowerCase();
      if (userEmail !== OWNER_EMAIL.toLowerCase()) {
        await signOut(auth);
        setOwnerError(
          `Access denied for ${result.user.email}. Only ${OWNER_EMAIL} has owner access.`
        );
      } else {
        onBackHome();
      }
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : 'Owner sign-in failed.');
    } finally {
      setOwnerLoading(false);
    }
  }

  function scrollToTopForm() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-[#061A23] text-slate-100">
      <ScrollProgressBar tone="cyan" />

      {/* Top Bar on Login Page (Includes Live Login Time at Top) */}
      <header className="border-b border-cyan-950/80 bg-[#061A23]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <motion.button
            type="button"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={onBackHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </motion.button>

          <div className="hidden md:flex items-center gap-2.5 text-xs text-cyan-200/90 font-mono tabular-nums whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#5AD1F0]" />
            <span>
              {student?.lastLoginAt
                ? `Login Time: ${formatIstDateTime(student.lastLoginAt)}`
                : `Portal Time: ${formatIstDateTime(nowClock)}`}
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg shrink-0">
            {[
              { id: 'login' as const, label: 'Login ID' },
              { id: 'register' as const, label: 'Register' },
              { id: 'owner' as const, label: 'Owner' }
            ].map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'login') setRegisteredStudent(null);
                    setRegStep('details');
                    setRegError(null);
                    setLoginError(null);
                    setTab(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'text-[#051820]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="auth-header-tab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-[#5AD1F0] rounded-md"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Section 1: Hero Split Login / Register Gate (Image 1 Layout) */}
      <section className="relative py-12 lg:py-16 bg-gradient-to-b from-[#07202B] via-[#061C26] to-[#05161E] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Brand Lockup, Top Login Time Strip, Bold Headline, Stacked Inputs + Cyan CTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-5"
          >
            {/* Top Login Time & Privacy Assurance Strip */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-cyan-200/90 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5AD1F0]" />
                {student?.lastLoginAt
                  ? `Last Login: ${formatIstDateTime(student.lastLoginAt)}`
                  : `Session Time: ${formatIstDateTime(nowClock)}`}
              </span>
              <span aria-hidden="true" className="text-cyan-600">·</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <Lock className="w-3.5 h-3.5" />
                Privacy Protected
              </span>
            </div>

            <div className="inline-block border border-cyan-400/50 px-4 py-2 rounded-md">
              <div className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300 uppercase">
                Radha Education
              </div>
              <div
                className="text-xl font-bold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                LIVE &amp; RECORDED PORTAL
              </div>
            </div>

            <p className="text-sm text-cyan-200/85 max-w-md">
              Class 10th, Class 12th Board Prep &amp; Computer Basic Training — OTP-verified registration, encrypted credentials, and owner-moderated classrooms.
            </p>

            <AnimatePresence mode="wait">
              <motion.h1
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight text-balance uppercase"
              >
                {tab === 'login'
                  ? 'Sign In With Your Student Login ID to Join Live Classes & Download PDFs'
                  : tab === 'register'
                    ? 'Register as a New Student to Generate Your Personal Login ID'
                    : 'Owner-Only Verification for Website Control, PDF Upload & Student Approval'}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* If Student Already Logged In */}
              {student && !registeredStudent && tab !== 'owner' ? (
                <motion.div
                  key="already-signed-in"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="p-5 rounded-xl bg-white/10 border border-cyan-400/40 space-y-4 max-w-md"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-200">Signed In Student</span>
                    <span className="font-semibold text-emerald-300">
                      {student.status === 'active' ? 'APPROVED & ACTIVE' : 'PENDING OWNER APPROVAL'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">{student.loginId}</div>
                  <div className="text-sm text-slate-200">
                    {student.fullName} · {formatTierLabel(student.plan)}
                  </div>
                  <div className="text-xs font-mono text-cyan-200/90 tabular-nums space-y-1 pt-1 border-t border-white/10">
                    <div>
                      Login Time: <span className="text-white">{formatIstDateTime(student.lastLoginAt || student.createdAt)}</span>
                    </div>
                    <div>
                      Privacy: <span className="text-emerald-300">{student.otpVerified ? 'OTP Verified' : 'Verified'} · {student.privacyMode !== false ? 'Identity Masked in Q&A' : 'Public Q&A Name'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onBackHome}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#5AD1F0] hover:bg-[#42C4E6] text-[#051820] text-sm font-bold cursor-pointer"
                    >
                      Enter Classroom
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={onStudentLogout}
                      className="py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium cursor-pointer"
                    >
                      Sign Out
                    </motion.button>
                  </div>
                </motion.div>
              ) : tab === 'login' ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStudentLogin}
                  className="space-y-3 max-w-md"
                >
                  <p className="text-xs font-semibold text-slate-200">
                    Enter your Student Login ID and Password below:
                  </p>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Student Login ID (e.g. TK-2601) or Email"
                    className="w-full px-4 py-3 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                  />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your account password"
                    className="w-full px-4 py-3 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                  />
                  {loginError && (
                    <p className="text-xs text-red-200 bg-red-950/70 border border-red-700 rounded-lg p-3">
                      {loginError}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={loginLoading}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 px-5 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loginLoading ? 'SIGNING IN...' : 'SIGN IN TO CLASSROOM'}
                  </motion.button>
                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5AD1F0]" />
                      Next Live Batch · Today 6:30 PM IST
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep('details');
                        setRegError(null);
                        setTab('register');
                      }}
                      className="text-[#5AD1F0] font-semibold hover:underline cursor-pointer"
                    >
                      New Student? Register + OTP
                    </button>
                  </div>
                </motion.form>
              ) : tab === 'register' && registeredStudent ? (
                <motion.div
                  key="register-success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28 }}
                  className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-500/40 max-w-md space-y-3"
                >
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OTP VERIFIED · STUDENT LOGIN ID GENERATED</span>
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">
                    {registeredStudent.loginId}
                  </div>
                  <p className="text-xs text-slate-200">
                    Registered for {registeredStudent.targetExam}. Status:{' '}
                    <strong className="text-white">
                      {registeredStudent.status === 'active' ? 'Approved & Active' : 'Pending Owner Approval'}
                    </strong>
                  </p>
                  <div className="text-xs font-mono text-emerald-200/90 tabular-nums">
                    Login Time: {formatIstDateTime(registeredStudent.lastLoginAt || registeredStudent.createdAt)}
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onBackHome}
                    className="w-full py-3 px-4 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-sm font-bold cursor-pointer"
                  >
                    GO TO HOME &amp; CLASSES
                  </motion.button>
                </motion.div>
              ) : tab === 'register' ? (
                <motion.form
                  key={`register-form-${regStep}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStudentRegister}
                  className="space-y-3 max-w-md"
                >
                  {regStep === 'details' ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          Step 1 of 2 · Batch Details &amp; Account Info
                        </span>
                        <span className="font-mono text-[#5AD1F0]">OTP Required</span>
                      </div>

                      {/* Animated Course Selection Pills inside Registration */}
                      {courses.length > 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            {courses.slice(0, 3).map((course) => {
                              const isSelected = targetExam === course.title;
                              const shortLabel = course.category;
                              return (
                                <motion.button
                                  key={course.id}
                                  type="button"
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => {
                                    setTargetExam(course.title);
                                    setSelectedPlan(course.requiredTier);
                                  }}
                                  className={`relative px-2.5 py-2 rounded-lg text-left border transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'border-[#5AD1F0] text-white'
                                      : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.span
                                      layoutId="register-course-active"
                                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                      className="absolute inset-0 bg-[#5AD1F0]/20 rounded-lg"
                                    />
                                  )}
                                  <div className="relative z-10 text-xs font-bold truncate">
                                    {shortLabel}
                                  </div>
                                  <div className="relative z-10 text-[11px] font-mono text-[#5AD1F0]">
                                    ₹{course.monthlyInr.toLocaleString('en-IN')}/mo
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>

                          {selectedCourseObj && (
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={selectedCourseObj.id}
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="px-3 py-2 rounded-lg bg-[#092835] border border-cyan-400/30 flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-cyan-100 truncate">
                                  {selectedCourseObj.title}
                                </span>
                                <span className="font-mono text-[#5AD1F0] shrink-0">
                                  {selectedCourseObj.scheduleLabel}
                                </span>
                              </motion.div>
                            </AnimatePresence>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                        />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone (+91...)"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                        />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address (for OTP Verification)"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={targetExam}
                          onChange={(e) => setTargetExam(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#092835] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                        >
                          {(courses.length > 0
                            ? courses.map((c) => c.title)
                            : [
                                'Class 10th Board Foundation',
                                'Class 12th Board & Science + CS',
                                'Computer Basic & Office Mastery'
                              ]
                          ).map((title) => (
                            <option key={title} value={title}>
                              {title}
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectedPlan}
                          onChange={(e) => setSelectedPlan(e.target.value as PlanTier)}
                          className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#092835] border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                        >
                          <option value="free">Free Demo</option>
                          <option value="foundation">Foundation</option>
                          <option value="pro">Cohort Pro</option>
                          <option value="scholar">Scholar 1:1</option>
                        </select>
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create Password (min 6 characters)"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-300/75 focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                      />
                      <div className="text-[11px] text-cyan-200/80 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Identity privacy enabled by default · Zero ad tracking.</span>
                      </div>
                      {regError && (
                        <p className="text-xs text-red-200 bg-red-950/70 border border-red-700 rounded-lg p-3">
                          {regError}
                        </p>
                      )}
                      <motion.button
                        type="submit"
                        disabled={regLoading}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 px-5 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {regLoading ? 'SENDING VERIFICATION OTP...' : 'SEND 6-DIGIT VERIFICATION OTP'}
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-300">
                          Step 2 of 2 · Verify 6-Digit OTP
                        </span>
                        <span className="font-mono text-[#5AD1F0] tabular-nums">
                          {String(Math.floor(otpExpiresIn / 60)).padStart(2, '0')}:
                          {String(otpExpiresIn % 60).padStart(2, '0')}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#092835] border border-cyan-400/35 space-y-2 text-xs">
                        <div className="text-slate-200">
                          Verification OTP sent for{' '}
                          <span className="font-mono text-white">{otpMaskedTarget}</span>
                        </div>
                        {otpPreview && (
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-cyan-900/70">
                            <span className="text-cyan-200">
                              Instant OTP Code:{' '}
                              <strong className="font-mono text-white tracking-widest">
                                {otpPreview}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setOtpCode(otpPreview)}
                              className="px-2.5 py-1 rounded bg-[#5AD1F0]/20 hover:bg-[#5AD1F0]/30 text-[#5AD1F0] font-semibold cursor-pointer"
                            >
                              Auto-Fill
                            </button>
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP (e.g. 482910)"
                        className="w-full px-4 py-3 text-center text-lg font-mono tracking-[0.4em] rounded-lg bg-white/10 border border-cyan-400/50 text-white placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-[#5AD1F0]"
                      />

                      {regError && (
                        <p className="text-xs text-red-200 bg-red-950/70 border border-red-700 rounded-lg p-3">
                          {regError}
                        </p>
                      )}

                      <motion.button
                        type="submit"
                        disabled={regLoading || otpCode.length !== 6}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 px-5 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {regLoading ? 'VERIFYING OTP...' : 'VERIFY OTP & GENERATE LOGIN ID'}
                      </motion.button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRegStep('details');
                            setRegError(null);
                          }}
                          className="text-slate-300 hover:text-white cursor-pointer"
                        >
                          ← Change Details
                        </button>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || regLoading}
                          onClick={() => requestRegistrationOtp()}
                          className="inline-flex items-center gap-1.5 text-[#5AD1F0] font-semibold disabled:opacity-50 hover:underline cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>
                            {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.form>
              ) : (
                <motion.div
                  key="owner-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4 max-w-md"
                >
                  <div className="p-4 rounded-xl bg-white/10 border border-cyan-400/30 text-xs text-slate-200 leading-relaxed">
                    Website management, PDF uploads, recorded video uploads, live class hosting, and student approval are locked strictly to{' '}
                    <span className="font-mono font-semibold text-white">{OWNER_EMAIL}</span>.
                  </div>
                  {ownerError && (
                    <p className="text-xs text-red-200 bg-red-950/70 border border-red-700 rounded-lg p-3">
                      {ownerError}
                    </p>
                  )}
                  {isOwner ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600 text-xs text-emerald-200">
                        Signed in as Owner ({OWNER_EMAIL}).
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onBackHome}
                        className="w-full py-3 px-4 rounded-lg bg-[#5AD1F0] text-[#051820] text-sm font-bold cursor-pointer"
                      >
                        OPEN OWNER CONSOLE ON HOME
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      disabled={ownerLoading}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOwnerGoogleSignIn}
                      className="w-full py-3.5 px-5 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-sm font-bold tracking-wide uppercase transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {ownerLoading ? 'VERIFYING GOOGLE ACCOUNT...' : 'SIGN IN AS OWNER (GOOGLE)'}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Column: Educator Portrait + Floating Subject Tiles (Image 1 Inspired) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative flex justify-center"
          >
            <div className="relative w-full max-w-md">
              <div className="rounded-2xl overflow-hidden border border-cyan-400/25 bg-[#0A2C3A] aspect-[4/5]">
                <ResilientImage
                  src="/src/assets/images/mentor_rohan_1794543792621.jpg"
                  alt="Radha Education lead faculty educator in studio"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061A23] via-transparent to-transparent" />
              </div>

              {/* Floating Academic Tiles */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B3040]/95 border border-cyan-400/35 shadow-lg absolute -left-6 top-14"
              >
                <Monitor className="w-4 h-4 text-[#5AD1F0]" />
                <span className="text-xs font-bold text-white">Computer Basic</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B3040]/95 border border-cyan-400/35 shadow-lg absolute -right-4 top-28"
              >
                <FileText className="w-4 h-4 text-[#5AD1F0]" />
                <span className="text-xs font-bold text-white">Class 12th PDFs</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B3040]/95 border border-cyan-400/35 shadow-lg absolute -left-4 bottom-16"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Class 10th Live</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: What You Will Access (4 Columns matching Image 1) */}
      <section className="py-16 border-t border-cyan-950/80 bg-[#051820]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold tracking-wide text-white uppercase mb-12">
            What You Access With Your Login ID
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Radio,
                title: 'Daily Live Classes',
                desc: 'Attend scheduled live batches for Class 10th, Class 12th, and Computer Basic with live doubt Q&A.'
              },
              {
                icon: Video,
                title: 'HD Recorded Videos',
                desc: 'Rewatch full recorded lectures anytime on any device with topic summaries and playback controls.'
              },
              {
                icon: FileText,
                title: 'Annotated Study PDFs',
                desc: 'Read inline or download chapter-wise board notes, sample papers, and Computer Basic practice sheets.'
              },
              {
                icon: ShieldCheck,
                title: 'Owner-Verified Access',
                desc: 'Every Student Login ID is verified directly by the institute owner for secure batch access.'
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  className="space-y-3"
                >
                  <Icon className="w-8 h-8 text-[#5AD1F0] mx-auto" />
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={scrollToTopForm}
            className="mt-10 px-8 py-3 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-xs font-bold tracking-wide uppercase cursor-pointer"
          >
            Sign In Or Register Now
          </motion.button>
        </div>
      </section>

      {/* Section 3: 01 / 02 / 03 Outlined Cards (Image 1 Inspired) */}
      <section className="py-16 border-t border-cyan-950/80 bg-[#061A23]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-wide text-white uppercase text-center mb-12">
            Who These Batches Are Built For
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Class 10th Board Students',
                body: 'seeking strong NCERT concept clarity in Mathematics & Science with weekly tests.'
              },
              {
                num: '02',
                title: 'Class 12th Science & CS Students',
                body: 'preparing for board exams with calculus, physics derivations, and Python/SQL labs.'
              },
              {
                num: '03',
                title: 'Computer Basic Learners',
                body: 'mastering Windows, MS Word, Excel formulas, PowerPoint, and internet skills from scratch.'
              }
            ].map((card, idx) => (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, borderColor: 'rgba(90, 209, 240, 0.9)' }}
                className="p-6 rounded-xl border border-cyan-400/50 bg-[#07212C] transition-colors"
              >
                <div className="text-2xl font-bold font-mono text-white mb-3">{card.num}</div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  <strong className="text-white">{card.title}</strong> {card.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Countdown Timer + CTA (Image 1 Bottom Section) */}
      <section className="py-16 border-t border-cyan-950/80 bg-[#05161E] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-lg font-bold tracking-wider text-white uppercase mb-8">
            Next Live Batch Enrollment Closes In...
          </h2>

          <div className="grid grid-cols-4 gap-4 max-w-md mx-auto mb-8">
            {[
              { label: 'Days', val: days },
              { label: 'Hours', val: hours },
              { label: 'Minutes', val: minutes },
              { label: 'Seconds', val: seconds }
            ].map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-3 rounded-xl bg-[#07212C]/70 border border-cyan-900/60"
              >
                <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-[#5AD1F0]">
                  {String(item.val).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-300 mt-1">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setTab('register');
                scrollToTopForm();
              }}
              className="px-7 py-3 rounded-lg bg-[#5AD1F0] hover:bg-[#43C3E5] text-[#051820] text-xs font-bold tracking-wide uppercase inline-flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Student</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setTab('login');
                scrollToTopForm();
              }}
              className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Student Login ID</span>
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
}
