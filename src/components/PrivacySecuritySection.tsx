import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  EyeOff,
  FileLock2,
  KeyRound,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck
} from 'lucide-react';
import type { StudentProfile } from '../types';

interface PrivacySecuritySectionProps {
  student: StudentProfile | null;
  studentToken: string | null;
  onStudentUpdated: (student: StudentProfile) => void;
  onStudentSignedOut: () => void;
  onOpenAuth: (tab: 'login' | 'register' | 'owner') => void;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(2, local.length - head.length))}@${domain}`;
}

function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '');
  if (!clean) return 'Not provided';
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-2)}`;
}

function formatLoginTime(iso: string | undefined): string {
  if (!iso) return 'Current Session';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Current Session';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function PrivacySecuritySection({
  student,
  studentToken,
  onStudentUpdated,
  onStudentSignedOut,
  onOpenAuth
}: PrivacySecuritySectionProps) {
  const [busyAction, setBusyAction] = useState<'privacy' | 'logoutAll' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleTogglePrivacyMode() {
    if (!student) return;
    setBusyAction('privacy');
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (studentToken) headers['x-student-token'] = studentToken;
      const nextPrivacy = !(student.privacyMode !== false);
      const resp = await fetch('/api/students/me/privacy', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ privacyMode: nextPrivacy })
      });
      const data = (await resp.json()) as { student?: StudentProfile; error?: string };
      if (!resp.ok || !data.student) {
        setErrorMessage(data.error || 'Could not update privacy preference.');
      } else {
        onStudentUpdated(data.student);
        setStatusMessage(
          nextPrivacy
            ? 'Live Q&A Identity Privacy enabled — your Login ID and full surname stay hidden.'
            : 'Full name enabled for Live Q&A doubts.'
        );
      }
    } catch {
      setErrorMessage('Network error while updating privacy settings.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOutAllDevices() {
    setBusyAction('logoutAll');
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (studentToken) headers['x-student-token'] = studentToken;
      await fetch('/api/students/logout-all', { method: 'POST', headers });
      onStudentSignedOut();
    } catch {
      setErrorMessage('Could not revoke active sessions.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteMyAccount() {
    setBusyAction('delete');
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (studentToken) headers['x-student-token'] = studentToken;
      const resp = await fetch('/api/students/me', { method: 'DELETE', headers });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        setErrorMessage(data.error || 'Account deletion failed.');
      } else {
        setConfirmDelete(false);
        onStudentSignedOut();
      }
    } catch {
      setErrorMessage('Network error while deleting student data.');
    } finally {
      setBusyAction(null);
    }
  }

  const pillars = [
    {
      icon: UserCheck,
      title: 'OTP-Verified Onboarding',
      desc: 'New student registrations verify via a time-limited 6-digit OTP with brute-force rate limiting before issuing a TK-26xx Login ID.'
    },
    {
      icon: EyeOff,
      title: 'Zero Ad Tracking & Masked Q&A',
      desc: 'No third-party ad pixels or behavioral profiling. Live classroom doubts mask student surnames and hide Login IDs by default.'
    },
    {
      icon: FileLock2,
      title: 'Private No-Index Media & PDFs',
      desc: 'Study PDFs and recorded lectures carry strict private no-store and noindex headers and require active student or owner auth.'
    },
    {
      icon: ShieldCheck,
      title: 'Owner-Exclusive Admin Lock',
      desc: 'All content uploads, fee changes, and student approvals are enforced server-side and in Firestore exclusively for the verified owner.'
    }
  ];

  return (
    <section id="privacy-security" className="py-16 border-t border-zinc-800 bg-[#0E0E13] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
            06. Website Privacy &amp; Security
          </p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built For Private, Verified Learning
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Every student credential is scrypt-hashed, session cookies are HTTP-only, and students control their classroom visibility and account data directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-5 rounded-sm bg-[#14141B] border border-zinc-800 space-y-2.5"
              >
                <Icon className="w-5 h-5 text-[#E11D2E]" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Interactive Student Privacy & Login Session Controls */}
        <div className="p-6 rounded-sm bg-[#14141B] border border-zinc-800">
          {student ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="text-xs font-semibold tracking-wider uppercase text-[#E11D2E]">
                    Active Student Privacy &amp; Session Vault
                  </div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {student.fullName} · <span className="font-mono text-[#E11D2E]">{student.loginId}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-zinc-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                    Login Time: {formatLoginTime(student.lastLoginAt || student.createdAt)}
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {student.otpVerified ? 'OTP Verified' : 'Account Verified'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-sm bg-[#09090B] border border-zinc-800">
                  <div className="text-zinc-500 uppercase tracking-wider mb-1">Masked Email</div>
                  <div className="font-mono text-zinc-200">{maskEmail(student.email)}</div>
                </div>
                <div className="p-3.5 rounded-sm bg-[#09090B] border border-zinc-800">
                  <div className="text-zinc-500 uppercase tracking-wider mb-1">Masked Phone</div>
                  <div className="font-mono text-zinc-200">{maskPhone(student.phone)}</div>
                </div>
                <div className="p-3.5 rounded-sm bg-[#09090B] border border-zinc-800">
                  <div className="text-zinc-500 uppercase tracking-wider mb-1">Live Q&amp;A Display</div>
                  <div className="font-mono text-white">
                    {student.privacyMode !== false ? 'Identity Protected (Masked)' : 'Full Name Visible'}
                  </div>
                </div>
              </div>

              {statusMessage && (
                <p className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800 rounded-sm p-3">
                  {statusMessage}
                </p>
              )}
              {errorMessage && (
                <p className="text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-sm p-3">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    disabled={busyAction !== null}
                    onClick={handleTogglePrivacyMode}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>
                      {student.privacyMode !== false
                        ? 'Q&A Identity Mask: ON'
                        : 'Q&A Identity Mask: OFF'}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    disabled={busyAction !== null}
                    onClick={handleSignOutAllDevices}
                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {busyAction === 'logoutAll' ? 'Revoking Sessions...' : 'Sign Out All Devices'}
                    </span>
                  </motion.button>
                </div>

                {!confirmDelete ? (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-700 rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete My Student Data</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-300 inline-flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Confirm permanent deletion?
                    </span>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={handleDeleteMyAccount}
                      className="px-3 py-1.5 text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white rounded-sm cursor-pointer"
                    >
                      {busyAction === 'delete' ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wide text-white">
                  Student Privacy Controls &amp; Session Timestamp
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Register with OTP verification or sign in with your Login ID to inspect your login timestamp, mask your Q&amp;A identity, or revoke all device sessions.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#E11D2E] hover:bg-[#C81929] text-white rounded-sm cursor-pointer whitespace-nowrap"
                >
                  Register + OTP
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-sm inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span>Student Login</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
