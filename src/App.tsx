import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Clock, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { HomeHeroShowcase } from './components/HomeHeroShowcase';
import { LiveClassroomSection } from './components/LiveClassroomSection';
import { MobileAppBar } from './components/MobileAppBar';
import {
  AppMotionProvider,
  PageTransition,
  RevealSection,
  ScrollProgressBar,
  StaggerGrid,
  StaggerItem
} from './components/MotionPrimitives';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PdfVaultSection } from './components/PdfVaultSection';
import { PricingSection } from './components/PricingSection';
import { PrivacySecuritySection } from './components/PrivacySecuritySection';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RecordedLibrarySection } from './components/RecordedLibrarySection';
import { ResilientImage } from './components/ResilientImage';
import { TopNav } from './components/TopNav';

const LoginPageView = lazy(() =>
  import('./components/LoginPageView').then((m) => ({ default: m.LoginPageView }))
);
const OwnerAdminConsole = lazy(() =>
  import('./components/OwnerAdminConsole').then((m) => ({ default: m.OwnerAdminConsole }))
);
import {
  DEFAULT_COURSES,
  DEFAULT_LIVE_CLASSES,
  DEFAULT_PRICING_PLANS,
  DEFAULT_RECORDED_VIDEOS,
  DEFAULT_STUDY_PDFS,
  MENTORS,
  seedFirestoreIfEmpty,
  STUDENT_OUTCOMES
} from './data/seedData';
import { auth, db, handleFirestoreError, OperationType, OWNER_EMAIL } from './lib/firebase';
import {
  formatTierLabel,
  type CourseTrack,
  type LiveClassItem,
  type PlanTier,
  type PricingPlan,
  type RecordedVideoItem,
  type StudentProfile,
  type StudyPdfItem
} from './types';

const STUDENT_TOKEN_KEY = 'takshila_student_token';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-zinc-800 bg-[#14141B] rounded-sm p-6 text-center space-y-4">
            <h1
              className="text-xl font-extrabold uppercase tracking-wide text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Radha Education
            </h1>
            <p className="text-sm text-zinc-400">
              Something interrupted this view. Reload to continue safely.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-sm bg-[#E11D2E] hover:bg-[#BE123C] text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ViewFallback({ label }: { label: string }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-[#09090B]">
      <Loader2 className="w-4 h-4 animate-spin text-[#E11D2E]" />
      <span>{label}</span>
    </div>
  );
}

export default function App() {
  const [courses, setCourses] = useState<CourseTrack[]>(DEFAULT_COURSES);
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING_PLANS);
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>(DEFAULT_LIVE_CLASSES);
  const [recordedVideos, setRecordedVideos] = useState<RecordedVideoItem[]>(DEFAULT_RECORDED_VIDEOS);
  const [studyPdfs, setStudyPdfs] = useState<StudyPdfItem[]>(DEFAULT_STUDY_PDFS);

  const [isOwner, setIsOwner] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [ownerLoginAt, setOwnerLoginAt] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [studentToken, setStudentToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STUDENT_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [pageView, setPageView] = useState<'home' | 'login'>('home');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'owner'>('login');
  const [preselectedPlan, setPreselectedPlan] = useState<PlanTier>('pro');
  const [preselectedCourse, setPreselectedCourse] = useState<string>('Class 12th Board & Science + CS');

  // Firebase Owner Auth listener (tracks automatic 1-hour ID token refreshes too)
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() && user.emailVerified) {
        const token = await user.getIdToken();
        setIsOwner(true);
        setOwnerToken(token);
        setOwnerLoginAt((prev) => prev || new Date().toISOString());
        seedFirestoreIfEmpty().catch(() => {});
      } else {
        if (user && user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
          await signOut(auth);
        }
        setIsOwner(false);
        setOwnerToken(null);
        setOwnerLoginAt(null);
      }
    });
    return () => unsub();
  }, []);

  // Load Student Login ID session
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (studentToken) headers['x-student-token'] = studentToken;
    fetch('/api/students/me', { headers })
      .then((r) => r.json())
      .then((data: { student?: StudentProfile | null }) => {
        if (data.student) {
          setStudent(data.student);
        } else {
          setStudent(null);
        }
      })
      .catch(() => {});
  }, [studentToken]);

  // Real-time Firestore subscriptions
  useEffect(() => {
    const unsubCourses = onSnapshot(
      query(collection(db, 'courses'), orderBy('order', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setCourses(snap.docs.map((d) => d.data() as CourseTrack));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'courses')
    );

    const unsubPlans = onSnapshot(
      query(collection(db, 'pricingPlans'), orderBy('order', 'asc')),
      (snap) => {
        if (!snap.empty) {
          setPlans(snap.docs.map((d) => d.data() as PricingPlan));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'pricingPlans')
    );

    const unsubLive = onSnapshot(
      collection(db, 'liveClasses'),
      (snap) => {
        if (!snap.empty) {
          setLiveClasses(snap.docs.map((d) => d.data() as LiveClassItem));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'liveClasses')
    );

    const unsubVideos = onSnapshot(
      collection(db, 'recordedVideos'),
      (snap) => {
        if (!snap.empty) {
          setRecordedVideos(snap.docs.map((d) => d.data() as RecordedVideoItem));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'recordedVideos')
    );

    const unsubPdfs = onSnapshot(
      collection(db, 'studyPdfs'),
      (snap) => {
        if (!snap.empty) {
          setStudyPdfs(snap.docs.map((d) => d.data() as StudyPdfItem));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'studyPdfs')
    );

    return () => {
      unsubCourses();
      unsubPlans();
      unsubLive();
      unsubVideos();
      unsubPdfs();
    };
  }, []);

  const liveCountBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of liveClasses) {
      map[item.subject] = (map[item.subject] || 0) + 1;
    }
    return map;
  }, [liveClasses]);

  const videoCountBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of recordedVideos) {
      map[item.subject] = (map[item.subject] || 0) + 1;
    }
    return map;
  }, [recordedVideos]);

  const pdfCountBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of studyPdfs) {
      map[item.subject] = (map[item.subject] || 0) + 1;
    }
    return map;
  }, [studyPdfs]);

  function openLoginPage(
    tab: 'login' | 'register' | 'owner' = 'login',
    plan: PlanTier = 'pro',
    courseTitle?: string
  ) {
    setAuthTab(tab);
    setPreselectedPlan(plan);
    if (courseTitle) setPreselectedCourse(courseTitle);
    setPageView('login');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleBackHome() {
    setPageView('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function formatTopLoginTime(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  function handleStudentAuthenticated(profile: StudentProfile, token: string) {
    setStudent(profile);
    setStudentToken(token);
    try {
      localStorage.setItem(STUDENT_TOKEN_KEY, token);
    } catch {
      // ignore storage failure
    }
  }

  function clearLocalStudentSession() {
    setStudent(null);
    setStudentToken(null);
    try {
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    } catch {
      // ignore
    }
  }

  async function handleStudentLogout() {
    await fetch('/api/students/logout', { method: 'POST' }).catch(() => {});
    clearLocalStudentSession();
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <AppErrorBoundary>
      <AppMotionProvider>
        <AnimatePresence mode="wait">
          {pageView === 'login' ? (
            <PageTransition viewKey="login-page">
              <Suspense fallback={<ViewFallback label="Loading secure portal..." />}>
                <LoginPageView
                  initialTab={authTab}
                  preselectedPlan={preselectedPlan}
                  preselectedCourse={preselectedCourse}
                  courses={courses}
                  student={student}
                  isOwner={isOwner}
                  onBackHome={handleBackHome}
                  onStudentAuthenticated={handleStudentAuthenticated}
                  onStudentLogout={handleStudentLogout}
                />
              </Suspense>
            </PageTransition>
          ) : (
          <PageTransition viewKey="home-page">
            <div id="top" className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
              <ScrollProgressBar tone="crimson" />

              <TopNav
                isOwner={isOwner}
                studentLoginId={student?.loginId || null}
                onOpenAuth={(t) => openLoginPage(t || 'login')}
                onScrollTo={scrollToSection}
              />

              <main className="flex-1">
                {/* Active Student / Owner Top Login Time & Privacy Strip */}
                {(student || isOwner) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-6xl mx-auto px-4 sm:px-6 pt-5"
                  >
                    <div className="px-4 py-3 rounded-sm border border-zinc-800 bg-[#14141B] flex flex-wrap items-center justify-between gap-4 text-sm">
                      {isOwner ? (
                        <div className="flex flex-wrap items-center gap-2 text-emerald-400 font-medium">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>
                            Owner Mode Active ({OWNER_EMAIL})
                          </span>
                          {ownerLoginAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 tabular-nums">
                                <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                                Login Time: {formatTopLoginTime(ownerLoginAt)}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-zinc-300">
                          <KeyRound className="w-4 h-4 text-[#E11D2E]" />
                          <span>
                            Signed in as <strong className="font-mono text-white">{student!.loginId}</strong> ({student!.fullName})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-300 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                            Login Time: {formatTopLoginTime(student!.lastLoginAt || student!.createdAt)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatTierLabel(student!.plan)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              student!.status === 'active'
                                ? 'font-semibold text-emerald-400'
                                : 'font-semibold text-amber-400'
                            }
                          >
                            {student!.status === 'active' ? 'Access Approved' : 'Pending Owner Approval'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => scrollToSection('privacy-security')}
                          className="text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                        >
                          Privacy Controls
                        </button>
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => scrollToSection('owner-console')}
                            className="text-xs font-bold uppercase tracking-wider text-[#E11D2E] hover:underline cursor-pointer"
                          >
                            Open Owner Console
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStudentLogout}
                            className="text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                          >
                            Sign Out
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Reference-Matched Obsidian + Crimson Hero with Course Slide & Detail Show */}
                <HomeHeroShowcase
                  courses={courses}
                  liveCountBySubject={liveCountBySubject}
                  videoCountBySubject={videoCountBySubject}
                  pdfCountBySubject={pdfCountBySubject}
                  onStartLearning={() => scrollToSection('live-classes')}
                  onOpenLogin={openLoginPage}
                />

                {/* 01. Live Classroom Section */}
                <RevealSection>
                  <LiveClassroomSection
                    classes={liveClasses}
                    student={student}
                    studentToken={studentToken}
                    isOwner={isOwner}
                    ownerToken={ownerToken}
                    onOpenAuth={(t, plan) => openLoginPage(t, plan)}
                  />
                </RevealSection>

                {/* 02. Recorded Class Video Library */}
                <RevealSection>
                  <RecordedLibrarySection
                    videos={recordedVideos}
                    student={student}
                    studentToken={studentToken}
                    isOwner={isOwner}
                    ownerToken={ownerToken}
                    onOpenAuth={(t, plan) => openLoginPage(t, plan)}
                  />
                </RevealSection>

                {/* 03. Study PDFs & Notes Vault */}
                <RevealSection>
                  <PdfVaultSection
                    pdfs={studyPdfs}
                    student={student}
                    studentToken={studentToken}
                    isOwner={isOwner}
                    ownerToken={ownerToken}
                    onOpenAuth={(t, plan) => openLoginPage(t, plan)}
                  />
                </RevealSection>

                {/* 04. Courses & Pricing Section */}
                <RevealSection>
                  <PricingSection
                    courses={courses}
                    plans={plans}
                    onSelectPlan={(tier, courseTitle) => openLoginPage('register', tier, courseTitle)}
                  />
                </RevealSection>

                {/* 05. Faculty & Verified Student Outcomes */}
                <RevealSection>
                  <section id="mentors" className="py-16 border-t border-zinc-800 bg-[#09090B]">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                      <div className="max-w-2xl mb-10">
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
                          05. Faculty &amp; Student Outcomes
                        </p>
                        <h2
                          className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          Taught by Dedicated Subject Specialists
                        </h2>
                      </div>

                      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {MENTORS.map((m) => (
                          <StaggerItem key={m.name}>
                            <motion.div
                              whileHover={{ y: -5 }}
                              transition={{ duration: 0.25 }}
                              className="border border-zinc-800 rounded-sm overflow-hidden bg-[#14141B] h-full"
                            >
                              <div className="aspect-square bg-zinc-900 overflow-hidden">
                                <ResilientImage
                                  src={m.image}
                                  alt={`${m.name} — ${m.role}`}
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                              </div>
                              <div className="p-5">
                                <h3 className="text-xl font-bold uppercase text-white">{m.name}</h3>
                                <p className="text-xs font-semibold text-[#E11D2E] mt-0.5">{m.role}</p>
                                <p className="text-xs text-zinc-400 mt-1">{m.credentials}</p>
                                <p className="text-sm text-zinc-300 mt-3 leading-relaxed">{m.bio}</p>
                              </div>
                            </motion.div>
                          </StaggerItem>
                        ))}
                      </StaggerGrid>

                      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-800">
                        {STUDENT_OUTCOMES.map((item) => (
                          <StaggerItem key={item.name}>
                            <motion.div
                              whileHover={{ y: -3 }}
                              className="p-5 rounded-sm border border-zinc-800 bg-[#14141B] h-full"
                            >
                              <div className="text-sm font-bold text-white">{item.name}</div>
                              <div className="text-xs text-zinc-400 mb-3">{item.cohort}</div>
                              <p className="text-xs text-zinc-400 mb-2">
                                <span className="font-semibold text-zinc-200">Before: </span>
                                {item.before}
                              </p>
                              <p className="text-sm text-zinc-200 font-medium">
                                <span className="font-semibold text-[#E11D2E]">Outcome: </span>
                                {item.outcome}
                              </p>
                            </motion.div>
                          </StaggerItem>
                        ))}
                      </StaggerGrid>
                    </div>
                  </section>
                </RevealSection>

                {/* 06. Website Privacy & Student Data Protection */}
                <RevealSection>
                  <PrivacySecuritySection
                    student={student}
                    studentToken={studentToken}
                    onStudentUpdated={(updated) => setStudent(updated)}
                    onStudentSignedOut={clearLocalStudentSession}
                    onOpenAuth={(t) => openLoginPage(t)}
                  />
                </RevealSection>

                {/* Owner-Only Admin Console (Strictly visible when snroy963197@gmail.com is verified) */}
                {isOwner && (
                  <RevealSection>
                    <Suspense fallback={<ViewFallback label="Loading owner console..." />}>
                      <OwnerAdminConsole
                        ownerToken={ownerToken}
                        courses={courses}
                        plans={plans}
                        liveClasses={liveClasses}
                        recordedVideos={recordedVideos}
                        studyPdfs={studyPdfs}
                      />
                    </Suspense>
                  </RevealSection>
                )}
              </main>

              {/* Quiet Footer */}
              <footer className="border-t border-zinc-800 bg-[#09090B] py-10 pb-24 md:pb-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <div
                      className="text-xl font-extrabold uppercase tracking-wide text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      RADHA EDUCATION
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Radha Education · Class 10th, Class 12th &amp; Computer Basic · Live Classes, Recorded Lectures &amp; PDFs · © 2026
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-zinc-400">
                    <PWAInstallButton showFallbackTrigger />
                    <button
                      type="button"
                      onClick={() => scrollToSection('privacy-security')}
                      className="hover:text-white cursor-pointer"
                    >
                      Privacy &amp; Security
                    </button>
                    <button
                      type="button"
                      onClick={() => openLoginPage('login')}
                      className="hover:text-white cursor-pointer"
                    >
                      Student Login ID
                    </button>
                    <button
                      type="button"
                      onClick={() => openLoginPage('register', 'pro')}
                      className="hover:text-white cursor-pointer"
                    >
                      New User Register
                    </button>
                    <button
                      type="button"
                      onClick={() => openLoginPage('owner')}
                      className="text-[#E11D2E] hover:underline font-semibold cursor-pointer"
                    >
                      Owner Access
                    </button>
                  </div>
                </div>
              </footer>

              <MobileAppBar
                isOwner={isOwner}
                studentLoginId={student?.loginId || null}
                onScrollTo={scrollToSection}
                onOpenAuth={(t) => openLoginPage(t || 'login')}
              />
            </div>
          </PageTransition>
        )}
      </AnimatePresence>
      <OfflineIndicator />
      </AppMotionProvider>
    </AppErrorBoundary>
  );
}
