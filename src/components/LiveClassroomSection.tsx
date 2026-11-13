import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Play, Radio, Send, Users, Clock, CheckCircle2 } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import {
  formatTierLabel,
  hasTierAccess,
  type LiveClassItem,
  type LiveDoubtItem,
  type PlanTier,
  type StudentProfile
} from '../types';

interface LiveClassroomSectionProps {
  classes: LiveClassItem[];
  student: StudentProfile | null;
  studentToken: string | null;
  isOwner: boolean;
  ownerToken: string | null;
  onOpenAuth: (tab: 'login' | 'register' | 'owner', preselectedPlan?: PlanTier) => void;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function LiveClassroomSection({
  classes,
  student,
  studentToken,
  isOwner,
  ownerToken,
  onOpenAuth
}: LiveClassroomSectionProps) {
  const subjects = ['All', ...Array.from(new Set(classes.map((c) => c.subject)))];
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [joinedIds, setJoinedIds] = useState<Record<string, boolean>>({});
  const [doubts, setDoubts] = useState<LiveDoubtItem[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [postingDoubt, setPostingDoubt] = useState(false);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const filteredClasses =
    selectedSubject === 'All'
      ? classes
      : classes.filter((c) => c.subject === selectedSubject);

  const activeClass =
    filteredClasses.find((c) => c.id === selectedClassId) ||
    filteredClasses[0] ||
    classes[0];

  useEffect(() => {
    if (activeClass && activeClass.id !== selectedClassId) {
      setSelectedClassId(activeClass.id);
    }
  }, [activeClass, selectedClassId]);

  const activeClassId = activeClass?.id || '';

  useEffect(() => {
    if (!activeClassId) return;
    let cancelled = false;
    setDoubts([]);
    setDoubtError(null);
    fetch(`/api/doubts/${encodeURIComponent(activeClassId)}`)
      .then((r) => r.json())
      .then((data: { doubts?: LiveDoubtItem[] }) => {
        if (!cancelled && Array.isArray(data.doubts)) {
          setDoubts(data.doubts);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeClassId]);

  if (!activeClass) return null;

  const isActiveStudent = student?.status === 'active';
  const canAccess = hasTierAccess(student?.plan, activeClass.requiredTier, Boolean(isActiveStudent), isOwner);
  const embedUrl = activeClass.streamUrl ? getYoutubeEmbedUrl(activeClass.streamUrl) : null;
  const hasJoined = Boolean(joinedIds[activeClass.id]);

  async function handlePostDoubt(e: FormEvent) {
    e.preventDefault();
    setDoubtError(null);
    if (!questionText.trim()) return;
    setPostingDoubt(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ownerToken) headers['Authorization'] = `Bearer ${ownerToken}`;
      if (studentToken) headers['x-student-token'] = studentToken;

      const resp = await fetch('/api/doubts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classId: activeClass.id,
          question: questionText.trim()
        })
      });
      const data = (await resp.json()) as { doubt?: LiveDoubtItem; error?: string };
      if (!resp.ok || !data.doubt) {
        setDoubtError(data.error || 'Could not post question.');
      } else {
        setDoubts((prev) => [data.doubt!, ...prev]);
        setQuestionText('');
      }
    } catch {
      setDoubtError('Network error while submitting doubt.');
    } finally {
      setPostingDoubt(false);
    }
  }

  async function handleOwnerReply(doubtId: string) {
    const reply = (replyDrafts[doubtId] || '').trim();
    if (!reply || !ownerToken) return;
    try {
      const resp = await fetch(`/api/doubts/${encodeURIComponent(doubtId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ reply })
      });
      const data = (await resp.json()) as { doubt?: LiveDoubtItem };
      if (resp.ok && data.doubt) {
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? data.doubt! : d)));
        setReplyDrafts((prev) => ({ ...prev, [doubtId]: '' }));
      }
    } catch {
      // ignore transient error
    }
  }

  return (
    <section id="live-classes" className="py-16 border-t border-zinc-800 bg-[#0E0E13] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
              01. Live Classroom &amp; Batch Schedule
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Attend Daily Live Classes &amp; Doubt Labs
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm self-start">
            {subjects.map((subject) => {
              const active = selectedSubject === subject;
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => setSelectedSubject(subject)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="live-subject-tab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-[#E11D2E] rounded-sm"
                    />
                  )}
                  <span className="relative z-10">{subject}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Stage: Active Live Classroom */}
          <div className="lg:col-span-8 border border-zinc-800 rounded-sm bg-[#14141B] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeClass.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  {canAccess && activeClass.streamUrl && embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={activeClass.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : canAccess && activeClass.streamUrl ? (
                    <video
                      src={activeClass.streamUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <ResilientImage
                        src="/src/assets/images/live_session_board_1794543792607.jpg"
                        alt={`Live classroom stage for ${activeClass.title}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/30" />
                    </>
                  )}

                  {(!canAccess || !activeClass.streamUrl) && (
                    <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-black/80 border border-zinc-800 text-xs font-semibold">
                          {activeClass.status === 'live' ? (
                            <>
                              <Radio className="w-3.5 h-3.5 text-[#E11D2E]" />
                              <span>LIVE STREAMING</span>
                            </>
                          ) : activeClass.status === 'upcoming' ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>UPCOMING SCHEDULE</span>
                            </>
                          ) : (
                            <span>SESSION ENDED</span>
                          )}
                        </div>
                        <span className="text-xs font-mono tabular-nums bg-black/80 border border-zinc-800 px-2.5 py-1 rounded-sm">
                          {formatTierLabel(activeClass.requiredTier)}
                        </span>
                      </div>

                      {!canAccess ? (
                        <div className="max-w-md bg-[#09090B]/95 border border-zinc-800 rounded-sm p-5">
                          <div className="flex items-center gap-2 text-[#E11D2E] text-xs font-bold uppercase tracking-wider mb-2">
                            <Lock className="w-4 h-4" />
                            <span>
                              {student && student.status === 'pending'
                                ? 'Account Pending Owner Approval'
                                : `Requires ${formatTierLabel(activeClass.requiredTier)} Access`}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 mb-4">
                            {student && student.status === 'pending'
                              ? `Your Login ID (${student.loginId}) is registered. Once the website owner approves your batch access, this live classroom unlocks automatically.`
                              : 'Sign in with your Student Login ID or register to attend live interactive sessions and ask doubts.'}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() => onOpenAuth('login')}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#E11D2E] hover:bg-[#C81929] text-white rounded-sm transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Student Login ID
                            </motion.button>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() =>
                                onOpenAuth(
                                  'register',
                                  activeClass.requiredTier === 'free' ? 'foundation' : activeClass.requiredTier
                                )
                              }
                              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white rounded-sm transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Register Account
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-zinc-300 mb-1">
                              {activeClass.subject} · {activeClass.instructor} · {activeClass.batchTime}
                            </p>
                            <h3
                              className="text-2xl sm:text-3xl font-extrabold uppercase text-white"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {activeClass.title}
                            </h3>
                          </div>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() =>
                              setJoinedIds((prev) => ({
                                ...prev,
                                [activeClass.id]: !prev[activeClass.id]
                              }))
                            }
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer ${
                              hasJoined
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#E11D2E] hover:bg-[#C81929] text-white'
                            }`}
                          >
                            {hasJoined ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Seat Active in Live Room</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                <span>{activeClass.status === 'live' ? 'Enter Live Classroom' : 'Reserve Live Seat'}</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Session Notes & Live Doubt Q&A */}
                <div className="p-6 space-y-6 bg-[#14141B]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                    <div>
                      <h3 className="text-lg font-bold text-white">{activeClass.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1">{activeClass.topicNotes}</p>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono tabular-nums shrink-0">
                      {activeClass.durationMinutes} min · {activeClass.seatsRemaining} seats left
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-white">
                        Live Class Doubt Queue ({doubts.length})
                      </h4>
                      <span className="text-xs text-zinc-400">
                        {isOwner
                          ? 'Owner Instructor Mode'
                          : student
                            ? `Signed in as ${student.loginId}`
                            : 'Sign in with Login ID to ask'}
                      </span>
                    </div>

                    <form onSubmit={handlePostDoubt} className="flex flex-col sm:flex-row gap-2 mb-4">
                      <input
                        type="text"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder={
                          student || isOwner
                            ? 'Ask an instructor doubt during this live class...'
                            : 'Sign in with your Student Login ID to post a doubt...'
                        }
                        disabled={(!student && !isOwner) || postingDoubt}
                        className="flex-1 px-3.5 py-2 text-sm bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E11D2E] disabled:opacity-60"
                      />
                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.96 }}
                        disabled={(!student && !isOwner) || postingDoubt || !questionText.trim()}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#E11D2E] hover:bg-[#C81929] text-white rounded-sm disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Ask Doubt</span>
                      </motion.button>
                    </form>

                    {doubtError && (
                      <p className="text-xs text-red-400 mb-3">{doubtError}</p>
                    )}

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {doubts.length === 0 ? (
                        <p className="text-sm text-zinc-500 py-3">
                          No doubts posted for this session yet. Ask the first concept question above.
                        </p>
                      ) : (
                        <AnimatePresence initial={false}>
                          {doubts.map((d) => (
                            <motion.div
                              key={d.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.24 }}
                              className="p-3.5 rounded-sm border border-zinc-800 bg-zinc-900/70"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1">
                                <span className="font-semibold text-zinc-200">
                                  {d.authorName} · <span className="font-mono text-[#E11D2E]">{d.authorBadge}</span>
                                </span>
                                <span className="font-mono tabular-nums">
                                  {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-200">{d.question}</p>
                              {d.reply && (
                                <div className="mt-2 pt-2 border-t border-zinc-800 text-sm text-zinc-200">
                                  <span className="font-semibold text-[#E11D2E]">Instructor Reply: </span>
                                  {d.reply}
                                </div>
                              )}
                              {isOwner && !d.reply && (
                                <div className="mt-2 flex gap-2">
                                  <input
                                    type="text"
                                    value={replyDrafts[d.id] || ''}
                                    onChange={(e) =>
                                      setReplyDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))
                                    }
                                    placeholder="Write instructor reply..."
                                    className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-700 text-white rounded-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleOwnerReply(d.id)}
                                    className="px-3 py-1.5 text-xs font-bold uppercase bg-[#E11D2E] text-white rounded-sm hover:bg-[#C81929] cursor-pointer"
                                  >
                                    Reply
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel: Live & Upcoming Batch List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Today &amp; Upcoming Batches
              </h3>
              <span className="text-xs text-zinc-400 font-mono tabular-nums">
                {filteredClasses.length} sessions
              </span>
            </div>

            {filteredClasses.map((cls) => {
              const selected = cls.id === activeClass.id;
              return (
                <motion.button
                  key={cls.id}
                  layout
                  type="button"
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`relative w-full text-left p-4 rounded-sm border transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#E11D2E] bg-[#1A1216]'
                      : 'border-zinc-800 bg-[#14141B] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1.5">
                    <span className="font-semibold text-zinc-300">
                      {cls.subject} · {formatTierLabel(cls.requiredTier)}
                    </span>
                    {cls.status === 'live' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#E11D2E]">
                        <Radio className="w-3 h-3" />
                        LIVE NOW
                      </span>
                    ) : cls.status === 'upcoming' ? (
                      <span className="font-semibold text-zinc-300">UPCOMING</span>
                    ) : (
                      <span className="font-medium text-zinc-500">ENDED</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{cls.title}</h4>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{cls.instructor}</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-zinc-400">
                      <Users className="w-3 h-3" />
                      {cls.seatsRemaining} left
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">{cls.batchTime}</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
